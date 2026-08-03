import { after, NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSepayQR } from "@/lib/sepay-service";
import {
  buildKidRunTransferContent,
  createKidRunPublicCode,
  createKidRunQrToken,
  createKidRunSecretCode,
  formatKidRunBib,
  getKidRunBankAccount,
  hashKidRunSecretCode,
} from "@/lib/kid-run-service";
import { sendKidRunRegistrationEmail } from "@/lib/kid-run-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^0\d{9}$/;

type ChildInput = {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  schoolClub?: string;
  shirtVariantId?: string | null;
};

type AdditionalShirtInput = {
  variantId?: string;
  quantity?: number;
};

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const body = await req.json();
    const guardianName = String(body.guardianName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").replace(/\D/g, "");
    const notes = String(body.notes || "").trim() || null;
    const children: ChildInput[] = Array.isArray(body.children) ? body.children : [];
    const additionalShirtInputs: AdditionalShirtInput[] = Array.isArray(body.additionalShirts) ? body.additionalShirts : [];

    if (!guardianName || !EMAIL_RE.test(email) || !PHONE_RE.test(phone)) {
      return NextResponse.json({ error: "Vui lòng nhập đúng họ tên phụ huynh, email và số điện thoại" }, { status: 400 });
    }

    const campaign = await prisma.kidRunCampaign.findUnique({
      where: { slug },
      include: {
        categories: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } },
        waivers: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!campaign || !campaign.isPublished || campaign.status !== "OPEN" || !campaign.allowRegistration) {
      return NextResponse.json({ error: "Chương trình hiện chưa mở đăng ký" }, { status: 403 });
    }
    if (!children.length || children.length > campaign.maxChildrenPerApplication) {
      return NextResponse.json({ error: `Mỗi hồ sơ cần từ 1 đến ${campaign.maxChildrenPerApplication} bé` }, { status: 400 });
    }
    const waiver = campaign.waivers[0];
    if (!waiver || body.waiverId !== waiver.id || body.waiverAccepted !== true || body.waiverViewed !== true) {
      return NextResponse.json({ error: "Vui lòng xem và đồng ý điều khoản miễn trừ trách nhiệm" }, { status: 400 });
    }

    const resolvedChildren = children.map((child, index) => {
      const fullName = String(child.fullName || "").trim();
      const dateText = String(child.dateOfBirth || "");
      const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const gender: "MALE" | "FEMALE" | null = child.gender === "FEMALE" ? "FEMALE" : child.gender === "MALE" ? "MALE" : null;
      if (!fullName || !match || !gender) throw new Error(`Thông tin của bé ${index + 1} chưa đầy đủ`);
      const birthYear = Number(match[1]);
      const dateOfBirth = new Date(`${dateText}T00:00:00.000Z`);
      if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth.getUTCFullYear() !== birthYear) {
        throw new Error(`Ngày sinh của bé ${index + 1} không hợp lệ`);
      }
      const category = campaign.categories.find(
        (item) => birthYear >= item.minBirthYear && birthYear <= item.maxBirthYear,
      );
      if (!category) throw new Error(`Năm sinh ${birthYear} chưa thuộc nhóm tuổi nào của chương trình`);
      return {
        fullName,
        dateOfBirth,
        birthYear,
        gender,
        schoolClub: String(child.schoolClub || "").trim() || null,
        shirtVariantId: child.shirtVariantId ? String(child.shirtVariantId) : null,
        category,
      };
    });

    const additionalByVariant = new Map<string, number>();
    for (const item of additionalShirtInputs) {
      const variantId = String(item.variantId || "").trim();
      const quantity = Number(item.quantity);
      if (!variantId || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new Error("Thông tin áo người lớn mua thêm không hợp lệ");
      }
      additionalByVariant.set(variantId, (additionalByVariant.get(variantId) || 0) + quantity);
    }
    const additionalShirts = [...additionalByVariant].map(([variantId, quantity]) => ({ variantId, quantity }));
    if (additionalShirts.reduce((sum, item) => sum + item.quantity, 0) > 20) {
      throw new Error("Mỗi hồ sơ chỉ được đăng ký tối đa 20 áo mua thêm");
    }

    const variantIds = [...new Set([
      ...resolvedChildren.map((child) => child.shirtVariantId).filter(Boolean) as string[],
      ...additionalShirts.map((item) => item.variantId),
    ])];
    const variants = variantIds.length
      ? await prisma.kidRunShirtVariant.findMany({
          where: { id: { in: variantIds }, isAvailable: true, style: { campaignId: campaign.id, isAvailable: true } },
          include: { style: true },
        })
      : [];
    if (variants.length !== variantIds.length) throw new Error("Một lựa chọn áo không còn khả dụng");
    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    for (const item of additionalShirts) {
      const variant = variantMap.get(item.variantId);
      if (!variant || variant.style.category === "KID") {
        throw new Error("Áo mua thêm cho phụ huynh phải là mẫu Nam hoặc Nữ");
      }
    }
    const childShirtAmount = resolvedChildren.reduce((sum, child) => {
      const variant = child.shirtVariantId ? variantMap.get(child.shirtVariantId) : null;
      if (variant && variant.style.category !== "KID") {
        throw new Error("Áo chọn trong thông tin bé phải là mẫu trẻ em");
      }
      return sum + (variant?.style.price || 0);
    }, 0);
    const additionalShirtAmount = additionalShirts.reduce((sum, item) => {
      const variant = variantMap.get(item.variantId)!;
      return sum + variant.style.price * item.quantity;
    }, 0);
    const shirtTotalAmount = childShirtAmount + additionalShirtAmount;

    const publicCode = createKidRunPublicCode();
    const secretCode = createKidRunSecretCode();
    const secretCodeHash = await hashKidRunSecretCode(secretCode);
    const bibQrToken = createKidRunQrToken();
    const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const applicationId = await prisma.$transaction(async (tx) => {
      const application = await tx.kidRunFamilyApplication.create({
        data: {
          campaignId: campaign.id,
          publicCode,
          secretCodeHash,
          guardianName,
          email,
          phone,
          notes,
          bibQrToken,
          waiverId: waiver.id,
          waiverVersion: waiver.version,
          waiverAcceptedAt: new Date(),
          waiverAcceptedIp: forwardedFor,
          waiverUserAgent: req.headers.get("user-agent"),
          mediaConsent: body.mediaConsent === true,
          shirtTotalAmount,
          shirtPaymentStatus: shirtTotalAmount > 0 ? "PENDING" : "NOT_REQUIRED",
        },
      });

      let firstParticipantId: string | null = null;
      for (const child of resolvedChildren) {
        const rows = await tx.$queryRaw<Array<{ allocated: number }>>(Prisma.sql`
          UPDATE "kid_run_race_categories"
          SET "nextBibNumber" = "nextBibNumber" + 1, "updatedAt" = NOW()
          WHERE "id" = ${child.category.id}
          RETURNING "nextBibNumber" - 1 AS allocated
        `);
        if (!rows[0]) throw new Error(`Không thể cấp BIB cho nhóm ${child.category.name}`);
        const participant = await tx.kidRunParticipant.create({
          data: {
            applicationId: application.id,
            categoryId: child.category.id,
            fullName: child.fullName,
            dateOfBirth: child.dateOfBirth,
            birthYear: child.birthYear,
            gender: child.gender,
            schoolClub: child.schoolClub,
            bibNumber: formatKidRunBib(child.category.bibPrefix, Number(rows[0].allocated)),
          },
        });
        if (!firstParticipantId) firstParticipantId = participant.id;
        if (child.shirtVariantId) {
          const variant = variantMap.get(child.shirtVariantId)!;
          await tx.kidRunParticipantShirt.create({
            data: {
              applicationId: application.id,
              participantId: participant.id,
              styleId: variant.styleId,
              variantId: variant.id,
              styleName: variant.style.name,
              category: variant.style.category,
              type: variant.style.type,
              size: variant.size,
              unitPrice: variant.style.price,
              totalPrice: variant.style.price,
            },
          });
        }
      }
      for (const item of additionalShirts) {
        const variant = variantMap.get(item.variantId)!;
        await tx.kidRunParticipantShirt.create({
          data: {
            applicationId: application.id,
            participantId: firstParticipantId!,
            styleId: variant.styleId,
            variantId: variant.id,
            styleName: variant.style.name,
            category: variant.style.category,
            type: variant.style.type,
            size: variant.size,
            quantity: item.quantity,
            unitPrice: variant.style.price,
            totalPrice: variant.style.price * item.quantity,
          },
        });
      }
      return application.id;
    }, { isolationLevel: "Serializable", timeout: 15000 });

    const application = await prisma.kidRunFamilyApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        participants: { orderBy: { createdAt: "asc" }, include: { category: true, shirts: true } },
        shirts: true,
      },
    });

    let payment: null | { qrPaymentUrl: string; transferContent: string; bankInfo: any } = null;
    if (shirtTotalAmount > 0) {
      const bankInfo = await getKidRunBankAccount(campaign.id);
      if (bankInfo) {
        const transferContent = buildKidRunTransferContent(publicCode, bankInfo.bankCode);
        payment = {
          transferContent,
          bankInfo,
          qrPaymentUrl: generateSepayQR(bankInfo.accountNumber, bankInfo.bankCode, shirtTotalAmount, transferContent, bankInfo.accountName),
        };
      }
    }

    after(async () => {
      try {
        await sendKidRunRegistrationEmail(applicationId, secretCode);
      } catch (error) {
        console.error("Kid Run registration email failed:", error);
      }
    });

    const {
      secretCodeHash: _secretCodeHash,
      bibQrToken: _bibQrToken,
      waiverAcceptedIp: _waiverAcceptedIp,
      waiverUserAgent: _waiverUserAgent,
      ...publicApplication
    } = application;
    return NextResponse.json({ success: true, application: publicApplication, secretCode, payment });
  } catch (error: any) {
    console.error("Create Kid Run application error:", error);
    return NextResponse.json({ error: error.message || "Không thể tạo hồ sơ Kid Run" }, { status: 400 });
  }
}