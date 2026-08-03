import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { encryptBankAccount } from "@/lib/encryption";

export async function GET() {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN" && user.role !== "MEMBER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const campaigns = await prisma.kidRunCampaign.findMany({
      where: user.role === "MEMBER" ? { users: { some: { userId: user.id } } } : undefined,
      include: { _count: { select: { applications: true, categories: true, shirtStyles: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ campaigns: campaigns.map(({ bankName: _a, bankAccount: _b, bankHolder: _c, bankCode: _d, ...item }) => item) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const name = String(body.name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();
    const eventDate = new Date(body.eventDate);
    const location = String(body.location || "").trim();
    if (!name || !/^[a-z0-9-]+$/.test(slug) || Number.isNaN(eventDate.getTime()) || !location) {
      return NextResponse.json({ error: "Tên, slug, ngày tổ chức hoặc địa điểm không hợp lệ" }, { status: 400 });
    }
    const bankData = body.bankAccount && body.bankCode && body.bankHolder ? encryptBankAccount({
      accountNumber: String(body.bankAccount), bankCode: String(body.bankCode), accountName: String(body.bankHolder), bankName: String(body.bankName || body.bankCode),
    }) : null;
    const campaign = await prisma.kidRunCampaign.create({
      data: {
        name, slug, eventDate, location,
        description: String(body.description || "").trim() || null,
        requireOnlinePayment: body.requireOnlinePayment !== false,
        bankName: bankData?.bankNameEncrypted || null,
        bankAccount: bankData?.accountNumberEncrypted || null,
        bankHolder: bankData?.accountNameEncrypted || null,
        bankCode: bankData?.bankCodeEncrypted || null,
        contactEmail: String(body.contactEmail || "").trim() || null,
        contactPhone: String(body.contactPhone || "").trim() || null,
        shirtBuyerNote: "Đăng ký áo là tự nguyện. Áo chỉ được ghi nhận sau khi có email xác nhận thanh toán thành công.",
        createdById: user.id,
        users: { create: { userId: user.id } },
      },
    });
    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.code === "P2002" ? "Slug đã được sử dụng" : error.message }, { status: error.code === "P2002" ? 400 : 500 });
  }
}