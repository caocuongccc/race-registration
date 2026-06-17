import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";

function parsePayload(payload: string) {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getPayloadValue(payload: any, key: string) {
  return payload?.[key] ?? payload?.webhookData?.[key] ?? payload?.result?.[key] ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserSession();
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "50", 10), 1),
      100,
    );
    const status = searchParams.get("status") || undefined;
    const event = searchParams.get("event") || undefined;
    const eventId = searchParams.get("eventId") || undefined;
    const search = searchParams.get("search") || undefined;

    const where: any = {
      provider: "sepay",
    };

    if (status && status !== "all") where.status = status;
    if (event && event !== "all") where.event = event;
    if (eventId && eventId !== "all") where.eventId = eventId;
    if (search) {
      where.OR = [
        { event: { contains: search, mode: "insensitive" } },
        { status: { contains: search, mode: "insensitive" } },
        { payload: { contains: search, mode: "insensitive" } },
        { errorMessage: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total] = await prisma.$transaction([
      prisma.webhookLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.webhookLog.count({ where }),
    ]);

    const eventIds = Array.from(
      new Set(logs.map((log) => log.eventId).filter(Boolean)),
    ) as string[];
    const events = eventIds.length
      ? await prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, name: true },
        })
      : [];
    const eventNameById = new Map(events.map((item) => [item.id, item.name]));

    return NextResponse.json({
      logs: logs.map((log) => {
        const payload = parsePayload(log.payload);
        const webhookData = payload?.webhookData || payload;

        return {
          id: log.id,
          event: log.event,
          eventId: log.eventId,
          eventName: log.eventId ? eventNameById.get(log.eventId) || null : null,
          status: log.status,
          errorMessage: log.errorMessage,
          createdAt: log.createdAt,
          rawPayload: log.payload,
          code: getPayloadValue(payload, "code"),
          content: getPayloadValue(payload, "content"),
          transactionId: getPayloadValue(payload, "id") || getPayloadValue(payload, "transactionId"),
          registrationId: getPayloadValue(payload, "registrationId"),
          amount: getPayloadValue(payload, "transferAmount") || getPayloadValue(payload, "amount"),
          accountNumber: webhookData?.accountNumber || null,
          subAccount: webhookData?.subAccount || null,
          bank: webhookData?.gateway || webhookData?.bankAbbreviation || null,
          retryable: log.retryable,
          retryCount: log.retryCount,
          maxRetries: log.maxRetries,
          nextRetryAt: log.nextRetryAt,
          lastRetryAt: log.lastRetryAt,
          retrySourceId: log.retrySourceId,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.error("Failed to fetch webhook logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhook logs" },
      { status: 500 },
    );
  }
}
