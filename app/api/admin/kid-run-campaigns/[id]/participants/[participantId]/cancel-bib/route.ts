import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; participantId: string }> },
) {
  try {
    const user = await getUserSession();
    const { id, participantId } = await context.params;
    if (user.role !== "ADMIN" && user.role !== "MEMBER")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (user.role === "MEMBER") {
      const access = await prisma.kidRunCampaignUser.findUnique({
        where: { campaignId_userId: { campaignId: id, userId: user.id } },
      });
      if (!access)
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reason = String((await req.json().catch(() => ({}))).reason || "")
      .trim()
      .slice(0, 500);
    if (!reason)
      return NextResponse.json(
        { error: "Vui lòng nhập lý do hủy BIB" },
        { status: 400 },
      );

    const result = await prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<
          Array<{ id: string; categoryId: string; bibNumber: string | null }>
        >(Prisma.sql`
          SELECT participant."id", participant."categoryId", participant."bibNumber"
          FROM "kid_run_participants" participant
          JOIN "kid_run_family_applications" application
            ON application."id" = participant."applicationId"
          WHERE participant."id" = ${participantId}
            AND application."campaignId" = ${id}
          FOR UPDATE
        `);
        const participant = rows[0];
        if (!participant) throw new Error("Không tìm thấy BIB");

        const cancelled = await tx.$executeRaw(Prisma.sql`
          UPDATE "kid_run_participants"
          SET "bibStatus" = 'CANCELLED'::"KidRunBibStatus",
              "bibCancelledAt" = NOW(),
              "bibCancelledBy" = ${user.email},
              "bibCancelReason" = ${reason},
              "updatedAt" = NOW()
          WHERE "id" = ${participant.id}
            AND "bibStatus" = 'ACTIVE'::"KidRunBibStatus"
        `);
        if (!cancelled) return { alreadyCancelled: true, participant };

        await tx.kidRunRaceCategory.update({
          where: { id: participant.categoryId },
          data: { remainingBibCount: { increment: 1 } },
        });
        await tx.kidRunCampaign.update({
          where: { id },
          data: { remainingBibCount: { increment: 1 } },
        });
        return { alreadyCancelled: false, participant };
      },
      { isolationLevel: "Serializable", timeout: 15000 },
    );

    return NextResponse.json({
      success: true,
      alreadyCancelled: result.alreadyCancelled,
      bibNumber: result.participant.bibNumber,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không hủy được BIB" },
      { status: 400 },
    );
  }
}
