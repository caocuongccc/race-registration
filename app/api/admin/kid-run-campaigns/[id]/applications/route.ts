import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

function normalizeDuplicateName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

  const [applications, total, duplicateSource] = await Promise.all([
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
    prisma.kidRunFamilyApplication.findMany({
      where: { campaignId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        guardianName: true,
        participants: {
          select: {
            fullName: true,
            category: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const rowNumberById = new Map(
    duplicateSource.map((application, index) => [application.id, index + 1]),
  );
  const duplicateGroups = new Map<string, typeof duplicateSource>();
  for (const application of duplicateSource) {
    const childNames = application.participants
      .map((participant) => normalizeDuplicateName(participant.fullName))
      .sort();
    const key = `${normalizeDuplicateName(application.guardianName)}||${childNames.join("||")}`;
    duplicateGroups.set(key, [...(duplicateGroups.get(key) || []), application]);
  }
  const duplicateInfoById = new Map<string, any>();
  for (const group of duplicateGroups.values()) {
    if (group.length < 2) continue;
    const categoryLabels = group.map((application) =>
      [...new Set(application.participants.map((participant) => participant.category.name))]
        .sort()
        .join(", "),
    );
    const differentCategories = new Set(categoryLabels).size > 1;
    group.forEach((application, groupIndex) => {
      duplicateInfoById.set(application.id, {
        rowNumber: rowNumberById.get(application.id),
        duplicateRows: group
          .filter((item) => item.id !== application.id)
          .map((item) => rowNumberById.get(item.id)),
        categories: categoryLabels[groupIndex],
        duplicateCategories: categoryLabels.filter((_, index) => index !== groupIndex),
        differentCategories,
      });
    });
  }
  const applicationsWithDuplicateInfo = applications.map((application) => ({
    ...application,
    duplicateInfo: duplicateInfoById.get(application.id) || null,
  }));

  let summary: any = undefined;
  if (includeSummary) {
    const [applicationSummary, shirtCount, participantCount, unassignedCount, issuedBibCount, bibEmailSentCount, activeBibCount, collectedBibCount] =
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
        prisma.kidRunParticipant.count({
          where: {
            application: { campaignId: id, status: "CONFIRMED" },
            bibStatus: "ACTIVE",
            bibNumber: { not: null },
          },
        }),
        prisma.kidRunParticipant.count({
          where: {
            application: { campaignId: id, status: "CONFIRMED" },
            bibStatus: "ACTIVE",
            bibNumber: { not: null },
            bibCollectedAt: { not: null },
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
      activeBibs: activeBibCount,
      collectedBibs: collectedBibCount,
    };
  }

  return NextResponse.json({
    applications: applicationsWithDuplicateInfo,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
    summary,
  });
}