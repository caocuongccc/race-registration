import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { encryptBankAccount } from "@/lib/encryption";

async function requireAdmin() {
  const user = await getUserSession();
  if (user.role !== "ADMIN" && user.role !== "MEMBER") throw new Error("FORBIDDEN");
  return user;
}

export async function GET() {
  try {
    await requireAdmin();
    const campaigns = await prisma.merchCampaign.findMany({
      include: { _count: { select: { styles: true, orders: true } } },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({
      campaigns: campaigns.map(
        ({
          bankName: _name,
          bankAccount: _account,
          bankHolder: _holder,
          bankCode: _code,
          ...campaign
        }) => campaign,
      ),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "FORBIDDEN" ? 403 : 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    const body = await req.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "")
      .trim()
      .toLowerCase();
    const year = Number(body.year);
    if (!name || !/^[a-z0-9-]+$/.test(slug) || !Number.isInteger(year)) {
      return NextResponse.json(
        { error: "Tên, slug hoặc năm không hợp lệ" },
        { status: 400 },
      );
    }
    const bankData =
      body.bankAccount && body.bankCode && body.bankHolder
        ? encryptBankAccount({
            accountNumber: body.bankAccount,
            bankCode: body.bankCode,
            accountName: body.bankHolder,
            bankName: body.bankName || body.bankCode,
          })
        : null;
    const campaign = await prisma.merchCampaign.create({
      data: {
        name,
        slug,
        year,
        description: String(body.description || "").trim() || null,
        status: "DRAFT",
        isPublished: false,
        requireOnlinePayment: body.requireOnlinePayment !== false,
        bankName: bankData?.bankNameEncrypted || null,
        bankAccount: bankData?.accountNumberEncrypted || null,
        bankHolder: bankData?.accountNameEncrypted || null,
        bankCode: bankData?.bankCodeEncrypted || null,
        contactEmail: String(body.contactEmail || "").trim() || null,
        contactPhone: String(body.contactPhone || "").trim() || null,
        createdById: user.id,
      },
    });
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    const duplicate = error.code === "P2002";
    return NextResponse.json(
      { error: duplicate ? "Slug đã được sử dụng" : error.message },
      { status: duplicate ? 400 : 500 },
    );
  }
}
