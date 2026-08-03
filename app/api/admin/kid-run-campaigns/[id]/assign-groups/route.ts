import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

async function authorize(campaignId: string) {
  const user = await getUserSession();
  if (user.role === "ADMIN") return;
  if (user.role === "MEMBER") { const access = await prisma.kidRunCampaignUser.findUnique({ where: { campaignId_userId: { campaignId, userId: user.id } } }); if (access) return; }
  throw new Error("FORBIDDEN");
}

export async function POST(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; await authorize(id);
    const categories = await prisma.kidRunRaceCategory.findMany({ where: { campaignId: id, isAvailable: true, name: { not: "__UNASSIGNED__" } }, orderBy: { sortOrder: "asc" } });
    if (!categories.length) return NextResponse.json({ error: "Chưa cấu hình nhóm tuổi để xếp runner" }, { status: 400 });
    const participants = await prisma.kidRunParticipant.findMany({ where: { application: { campaignId: id, status: "CONFIRMED" }, bibNumber: null }, select: { id: true, fullName: true, birthYear: true }, orderBy: [{ birthYear: "desc" }, { createdAt: "asc" }] });
    const assignments = new Map<string, string[]>(); const invalid: Array<{ fullName: string; birthYear: number; reason: string }> = [];
    for (const participant of participants) {
      const matches = categories.filter((category) => participant.birthYear >= category.minBirthYear && participant.birthYear <= category.maxBirthYear);
      if (matches.length !== 1) { invalid.push({ fullName: participant.fullName, birthYear: participant.birthYear, reason: matches.length ? "Năm sinh nằm trong nhiều nhóm" : "Năm sinh chưa có nhóm" }); continue; }
      assignments.set(matches[0].id, [...(assignments.get(matches[0].id) || []), participant.id]);
    }
    if (invalid.length) return NextResponse.json({ error: `Còn ${invalid.length} runner chưa thể xếp nhóm`, invalid: invalid.slice(0, 30) }, { status: 409 });
    await prisma.$transaction([...assignments.entries()].map(([categoryId, ids]) => prisma.kidRunParticipant.updateMany({ where: { id: { in: ids } }, data: { categoryId } })));
    return NextResponse.json({ success: true, assigned: participants.length, groups: categories.map((category) => ({ id: category.id, name: category.name, count: assignments.get(category.id)?.length || 0 })) });
  } catch (error: any) { return NextResponse.json({ error: error.message || "Không thể xếp nhóm" }, { status: error.message === "FORBIDDEN" ? 403 : 500 }); }
}
