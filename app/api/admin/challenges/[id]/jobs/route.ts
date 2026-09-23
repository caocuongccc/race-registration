import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/event-permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await getUserSession(); if (admin.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id: eventId } = await context.params; const status = request.nextUrl.searchParams.get("status");
  const jobs = await prisma.challengeJob.findMany({ where: { eventId, ...(status ? { status: status as any } : {}) }, orderBy: { createdAt: "desc" }, take: 100 });
  const counts = await prisma.challengeJob.groupBy({ by: ["status"], where: { eventId }, _count: true });
  return NextResponse.json({ jobs, counts: Object.fromEntries(counts.map((item) => [item.status, item._count])) });
}

