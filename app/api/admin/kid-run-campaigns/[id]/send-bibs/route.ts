import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { sendKidRunBibEmail } from "@/lib/kid-run-email";

async function authorize(campaignId: string) {
  const user = await getUserSession();
  if (user.role === "ADMIN") return;
  if (user.role === "MEMBER") { const access = await prisma.kidRunCampaignUser.findUnique({ where: { campaignId_userId: { campaignId, userId: user.id } } }); if (access) return; }
  throw new Error("FORBIDDEN");
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; await authorize(id);
    const body = await req.json().catch(() => ({})); const retryFailed = body.retryFailed === true;
    const unassigned = await prisma.kidRunParticipant.count({ where: { application: { campaignId: id, status: "CONFIRMED" }, category: { name: "__UNASSIGNED__" } } });
    if (unassigned) return NextResponse.json({ error: `Còn ${unassigned} runner chưa được xếp nhóm` }, { status: 409 });
    const issued = await prisma.$transaction(async (tx) => {
      const categories = await tx.kidRunRaceCategory.findMany({ where: { campaignId: id, isAvailable: true, name: { not: "__UNASSIGNED__" } }, orderBy: { sortOrder: "asc" } }); let issuedCount = 0;
      for (const category of categories) {
        const count = await tx.kidRunParticipant.count({ where: { categoryId: category.id, application: { status: "CONFIRMED" }, bibNumber: null } }); if (!count) continue;
        const allocation = await tx.$queryRaw<Array<{ startNumber: number }>>(Prisma.sql`UPDATE "kid_run_race_categories" SET "nextBibNumber" = "nextBibNumber" + ${count}, "updatedAt" = NOW() WHERE "id" = ${category.id} RETURNING "nextBibNumber" - ${count} AS "startNumber"`);
        const startNumber = Number(allocation[0].startNumber);
        await tx.$executeRaw(Prisma.sql`WITH numbered AS (SELECT participant."id", ROW_NUMBER() OVER (ORDER BY participant."createdAt", participant."id") - 1 AS offset FROM "kid_run_participants" participant INNER JOIN "kid_run_family_applications" application ON application."id" = participant."applicationId" WHERE participant."categoryId" = ${category.id} AND participant."bibNumber" IS NULL AND application."status" = 'CONFIRMED') UPDATE "kid_run_participants" participant SET "bibNumber" = ${category.bibPrefix} || LPAD((${startNumber} + numbered.offset)::TEXT, 4, '0'), "updatedAt" = NOW() FROM numbered WHERE participant."id" = numbered."id"`);
        issuedCount += count;
      } return issuedCount;
    }, { isolationLevel: "Serializable", timeout: 30000 });
    const emailWhere: any = { campaignId: id, status: "CONFIRMED", participants: { some: {}, every: { bibNumber: { not: null } } }, emailLogs: retryFailed ? { none: { type: "BIB_ANNOUNCEMENT", status: "SENT" }, some: { type: "BIB_ANNOUNCEMENT", status: "FAILED" } } : { none: { type: "BIB_ANNOUNCEMENT" } } };
    const applications = await prisma.kidRunFamilyApplication.findMany({ where: emailWhere, select: { id: true }, orderBy: { createdAt: "asc" }, take: 10 }); let sent = 0; let failed = 0;
    for (const application of applications) { try { await sendKidRunBibEmail(application.id); sent++; } catch (error) { console.error("Send Kid Run BIB email failed:", application.id, error); failed++; } }
    const remainingUnattempted = await prisma.kidRunFamilyApplication.count({ where: { campaignId: id, status: "CONFIRMED", participants: { some: {}, every: { bibNumber: { not: null } } }, emailLogs: { none: { type: "BIB_ANNOUNCEMENT" } } } });
    const failedRemaining = await prisma.kidRunFamilyApplication.count({ where: { campaignId: id, status: "CONFIRMED", emailLogs: { none: { type: "BIB_ANNOUNCEMENT", status: "SENT" }, some: { type: "BIB_ANNOUNCEMENT", status: "FAILED" } } } });
    return NextResponse.json({ success: true, issued, processed: applications.length, sent, failed, remainingUnattempted, failedRemaining });
  } catch (error: any) { return NextResponse.json({ error: error.message || "Không thể cấp và gửi BIB" }, { status: error.message === "FORBIDDEN" ? 403 : 500 }); }
}
