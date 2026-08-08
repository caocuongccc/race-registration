import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUserSession();
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const [users, assigned] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MEMBER" },
      select: { id: true, name: true, email: true },
      orderBy: { email: "asc" },
    }),
    prisma.kidRunCampaignUser.findMany({
      where: { campaignId: id },
      select: { userId: true },
    }),
  ]);
  return NextResponse.json({
    users,
    assignedUserIds: assigned.map((item) => item.userId),
  });
}
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUserSession();
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const body = await req.json();
  const userId = String(body.userId || "");
  await prisma.kidRunCampaignUser.upsert({
    where: { campaignId_userId: { campaignId: id, userId } },
    create: { campaignId: id, userId },
    update: {},
  });
  return NextResponse.json({ success: true });
}
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUserSession();
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  const userId = req.nextUrl.searchParams.get("userId") || "";
  await prisma.kidRunCampaignUser.deleteMany({
    where: { campaignId: id, userId },
  });
  return NextResponse.json({ success: true });
}
