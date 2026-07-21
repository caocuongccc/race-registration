import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeMerchLookup } from "@/lib/merch-order-service";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const identifier = normalizeMerchLookup(String(body.identifier || ""));
  const secretCode = String(body.secretCode || "").trim();
  if (!identifier)
    return NextResponse.json(
      { error: "Vui lòng nhập email hoặc số điện thoại" },
      { status: 400 },
    );
  if (!secretCode) return NextResponse.json({ requiresCode: true });
  if (!/^\d{6}$/.test(secretCode))
    return NextResponse.json(
      { error: "Mã bí mật không hợp lệ" },
      { status: 400 },
    );

  const where = identifier.includes("@")
    ? { email: identifier }
    : { phone: identifier };
  const candidates = await prisma.merchOrder.findMany({
    where,
    include: { campaign: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const matched = [];
  for (const order of candidates) {
    if (await compare(secretCode, order.secretCodeHash)) matched.push(order);
  }
  if (!matched.length)
    return NextResponse.json(
      { error: "Thông tin hoặc mã bí mật chưa đúng" },
      { status: 404 },
    );
  return NextResponse.json({
    orders: matched.map(({ secretCodeHash: _hash, ...order }) => order),
  });
}
