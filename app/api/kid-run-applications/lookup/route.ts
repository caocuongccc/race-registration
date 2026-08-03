import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyKidRunSecretCode } from "@/lib/kid-run-service";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const slug = String(body.slug || "");
  const lookup = String(body.lookup || "").trim().toLowerCase();
  const secretCode = String(body.secretCode || "").trim();
  const campaign = await prisma.kidRunCampaign.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!campaign) return NextResponse.json({ error: "Không tìm thấy chương trình" }, { status: 404 });
  const normalizedPhone = lookup.replace(/\D/g, "");
  const applications = await prisma.kidRunFamilyApplication.findMany({
    where: { campaignId: campaign.id, ...(lookup.includes("@") ? { email: lookup } : { phone: normalizedPhone }) },
    orderBy: { createdAt: "desc" },
    include: { participants: { orderBy: { createdAt: "asc" }, include: { category: true, shirts: true } } },
  });
  for (const application of applications) {
    if (await verifyKidRunSecretCode(secretCode, application.secretCodeHash)) {
      const { secretCodeHash: _secret, bibQrToken: _token, waiverAcceptedIp: _ip, waiverUserAgent: _ua, ...safe } = application;
      return NextResponse.json({ campaign, application: safe });
    }
  }
  return NextResponse.json({ error: "Thông tin tra cứu hoặc mã bí mật không đúng" }, { status: 404 });
}