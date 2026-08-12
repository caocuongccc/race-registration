import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUserSession();
  if (user.role !== "ADMIN" && user.role !== "MEMBER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await context.params;
  if (user.role === "MEMBER") {
    const access = await prisma.kidRunCampaignUser.findUnique({
      where: { campaignId_userId: { campaignId: id, userId: user.id } },
    });
    if (!access)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const requestedPageSize = Number(req.nextUrl.searchParams.get("pageSize"));
  const pageSize = [10, 20, 50].includes(requestedPageSize)
    ? requestedPageSize
    : 20;
  const search = String(req.nextUrl.searchParams.get("search") || "").trim();
  const includeSummary = req.nextUrl.searchParams.get("includeSummary") === "1";
  const where: any = {
    campaignId: id,
    ...(search
      ? {
          OR: [
            { publicCode: { contains: search, mode: "insensitive" } },
            { guardianName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            {
              participants: {
                some: {
                  OR: [
                    { fullName: { contains: search, mode: "insensitive" } },
                    { bibNumber: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const [applications, total] = await Promise.all([
    prisma.kidRunFamilyApplication.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        participants: {
          include: { category: true, shirts: true },
          orderBy: { createdAt: "asc" },
        },
        shirts: true,
        emailLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true, recipientEmail: true, errorMessage: true },
        },
      },
    }),
    prisma.kidRunFamilyApplication.count({ where }),
  ]);

  let summary: any = undefined;
  if (includeSummary) {
    const [applicationSummary, shirtCount, participantCount, unassignedCount, issuedBibCount, bibEmailSentCount] =
      await Promise.all([
        prisma.kidRunFamilyApplication.aggregate({
          where: { campaignId: id },
          _count: true,
        }),
        prisma.kidRunParticipantShirt.aggregate({
          where: { application: { campaignId: id, shirtPaymentStatus: "PAID" } },
          _sum: { quantity: true, totalPrice: true },
        }),
        prisma.kidRunParticipant.count({
          where: { application: { campaignId: id, status: "CONFIRMED" } },
        }),
        prisma.kidRunParticipant.count({
          where: {
            application: { campaignId: id, status: "CONFIRMED" },
            category: { name: "__UNASSIGNED__" },
          },
        }),
        prisma.kidRunParticipant.count({
          where: {
            application: { campaignId: id, status: "CONFIRMED" },
            bibNumber: { not: null },
          },
        }),
        prisma.kidRunEmailLog.count({
          where: {
            application: { campaignId: id },
            type: "BIB_ANNOUNCEMENT",
            status: "SENT",
          },
        }),
      ]);
    summary = {
      applications: applicationSummary._count,
      selectedShirts: shirtCount._sum.quantity || 0,
      paidShirtRevenue: shirtCount._sum.totalPrice || 0,
      participants: participantCount,
      unassigned: unassignedCount,
      issuedBibs: issuedBibCount,
      bibEmailsSent: bibEmailSentCount,
    };
  }

  return NextResponse.json({
    applications,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    summary,
  });
}