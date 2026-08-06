import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { encryptBankAccount } from "@/lib/encryption";
import { getKidRunBankAccount } from "@/lib/kid-run-service";

async function authorize(id: string) {
  const user = await getUserSession();
  if (user.role === "ADMIN") return user;
  if (user.role === "MEMBER") {
    const access = await prisma.kidRunCampaignUser.findUnique({
      where: { campaignId_userId: { campaignId: id, userId: user.id } },
    });
    if (access) return user;
  }
  throw new Error("FORBIDDEN");
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await authorize(id);
    const campaign = await prisma.kidRunCampaign.findUnique({
      where: { id },
      include: {
        categories: { orderBy: { sortOrder: "asc" } },
        waivers: { orderBy: { createdAt: "desc" } },
        shirtStyles: {
          orderBy: { sortOrder: "asc" },
          include: { variants: { orderBy: { sortOrder: "asc" } } },
        },
        _count: { select: { applications: true } },
      },
    });
    if (!campaign)
      return NextResponse.json(
        { error: "Không tìm thấy chương trình" },
        { status: 404 },
      );
    const bankInfo = await getKidRunBankAccount(id);
    const {
      bankName: _a,
      bankAccount: _b,
      bankHolder: _c,
      bankCode: _d,
      ...safe
    } = campaign;
    return NextResponse.json({ campaign: { ...safe, bankInfo } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await authorize(id);
    const body = await req.json();
    const bankData =
      body.bankAccount && body.bankCode && body.bankHolder
        ? encryptBankAccount({
            accountNumber: String(body.bankAccount),
            bankCode: String(body.bankCode),
            accountName: String(body.bankHolder),
            bankName: String(body.bankName || body.bankCode),
          })
        : null;
    const registeredBibCount = await prisma.kidRunParticipant.count({
      where: { application: { campaignId: id, status: "CONFIRMED" } },
    });
    const bibCapacity = Math.max(
      1,
      Math.min(100000, Number(body.bibCapacity) || 150),
    );
    const remainingBibCount = Math.max(0, bibCapacity - registeredBibCount);
    const campaign = await prisma.kidRunCampaign.update({
      where: { id },
      data: {
        name: String(body.name || "").trim(),
        slug: String(body.slug || "")
          .trim()
          .toLowerCase(),
        description: String(body.description || "").trim() || null,
        eventDate: new Date(body.eventDate),
        location: String(body.location || "").trim(),
        status: body.status,
        isPublished: body.isPublished === true,
        requireOnlinePayment: body.requireOnlinePayment !== false,
        heroImageUrl: String(body.heroImageUrl || "").trim() || null,
        bibPickupNote: String(body.bibPickupNote || "").trim() || null,
        shirtBuyerNote: String(body.shirtBuyerNote || "").trim() || null,
        contactEmail: String(body.contactEmail || "").trim() || null,
        contactPhone: String(body.contactPhone || "").trim() || null,
        maxChildrenPerApplication: Math.max(
          1,
          Math.min(10, Number(body.maxChildrenPerApplication) || 5),
        ),
        bibCapacity,
        remainingBibCount,
        allowRegistration:
          body.allowRegistration === true && remainingBibCount > 0,
        ...(bankData
          ? {
              bankName: bankData.bankNameEncrypted,
              bankAccount: bankData.accountNumberEncrypted,
              bankHolder: bankData.accountNameEncrypted,
              bankCode: bankData.bankCodeEncrypted,
            }
          : {}),
      },
    });

    if (Array.isArray(body.categories)) {
      for (let index = 0; index < body.categories.length; index++) {
        const item = body.categories[index];
        const categoryBibCapacity = Math.max(1, Number(item.bibCapacity) || 50);
        const registeredInCategory = item.id
          ? await prisma.kidRunParticipant.count({
              where: {
                categoryId: item.id,
                application: { status: "CONFIRMED" },
              },
            })
          : 0;
        const data = {
          name: String(item.name || "").trim(),
          minBirthYear: Number(item.minBirthYear),
          maxBirthYear: Number(item.maxBirthYear),
          distanceLabel: String(item.distanceLabel || "").trim(),
          bibPrefix: String(item.bibPrefix || "")
            .trim()
            .toUpperCase(),
          bibStart: Number(item.bibStart) || 1,
          bibCapacity: categoryBibCapacity,
          remainingBibCount: Math.max(
            0,
            categoryBibCapacity - registeredInCategory,
          ),
          isAvailable: item.isAvailable !== false,
          sortOrder: index,
        };
        if (
          !data.name ||
          !data.distanceLabel ||
          !data.bibPrefix ||
          data.minBirthYear > data.maxBirthYear
        )
          throw new Error(`Nhóm tuổi ${index + 1} không hợp lệ`);
        if (item.id)
          await prisma.kidRunRaceCategory.update({
            where: { id: item.id },
            data,
          });
        else
          await prisma.kidRunRaceCategory.create({
            data: { ...data, campaignId: id, nextBibNumber: data.bibStart },
          });
      }
    }

    const categoryTotals = await prisma.kidRunRaceCategory.aggregate({
      where: {
        campaignId: id,
        isAvailable: true,
        name: { not: "__UNASSIGNED__" },
      },
      _sum: { bibCapacity: true, remainingBibCount: true },
    });
    await prisma.kidRunCampaign.update({
      where: { id },
      data: {
        bibCapacity: categoryTotals._sum.bibCapacity || bibCapacity,
        remainingBibCount: categoryTotals._sum.remainingBibCount || 0,
      },
    });

    if (body.waiver?.title && body.waiver?.content && body.waiver?.version) {
      const existing = await prisma.kidRunWaiver.findUnique({
        where: {
          campaignId_version: {
            campaignId: id,
            version: String(body.waiver.version),
          },
        },
      });
      if (existing) {
        await prisma.kidRunWaiver.update({
          where: { id: existing.id },
          data: {
            title: String(body.waiver.title),
            content: String(body.waiver.content),
            isActive: true,
          },
        });
      } else {
        await prisma.kidRunWaiver.updateMany({
          where: { campaignId: id, isActive: true },
          data: { isActive: false },
        });
        await prisma.kidRunWaiver.create({
          data: {
            campaignId: id,
            title: String(body.waiver.title),
            content: String(body.waiver.content),
            version: String(body.waiver.version),
            isActive: true,
          },
        });
      }
    }

    await prisma.kidRunRaceCategory.upsert({
      where: { campaignId_name: { campaignId: id, name: "__UNASSIGNED__" } },
      create: {
        campaignId: id,
        name: "__UNASSIGNED__",
        minBirthYear: 1900,
        maxBirthYear: 2100,
        bibCapacity: 0,
        remainingBibCount: 0,
        distanceLabel: "BTC phân nhóm sau",
        bibPrefix: "__TMP__",
        bibStart: 1,
        nextBibNumber: 1,
        sortOrder: -1,
      },
      update: { isAvailable: true },
    });

    if (campaign.status === "OPEN" && campaign.allowRegistration) {
      const waiverCount = await prisma.kidRunWaiver.count({
        where: { campaignId: id, isActive: true },
      });
      if (!waiverCount) {
        await prisma.kidRunCampaign.update({
          where: { id },
          data: { allowRegistration: false },
        });
        throw new Error("Cần cấu hình một bản miễn trừ trước khi mở đăng ký");
      }
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.code === "P2002"
            ? "Slug, tên nhóm hoặc prefix BIB đã tồn tại"
            : error.message,
      },
      { status: error.message === "FORBIDDEN" ? 403 : 400 },
    );
  }
}
