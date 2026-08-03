import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyKidRunSecretCode } from "@/lib/kid-run-service";
export async function POST(req: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const body = await req.json();
  const secret = String(body.secretCode || "");
  const application = await prisma.kidRunFamilyApplication.findUnique({ where: { publicCode: code.toUpperCase() }, select: { secretCodeHash: true, shirtPaymentStatus: true, shirtPaymentDate: true } });
  if (!application || !(await verifyKidRunSecretCode(secret, application.secretCodeHash))) return NextResponse.json({ error: "Không có quyền tra cứu" }, { status: 403 });
  return NextResponse.json({ shirtPaymentStatus: application.shirtPaymentStatus, shirtPaymentDate: application.shirtPaymentDate });
}