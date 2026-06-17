import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { replaySepayWebhookLog } from "@/lib/sepay-webhook-retry";

function isAuthorized(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = req.headers.get("x-cron-secret");
  const querySecret = req.nextUrl.searchParams.get("token");
  return (
    token === cronSecret ||
    headerSecret === cronSecret ||
    querySecret === cronSecret
  );
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "10", 10), 1),
    50,
  );

  const logs = await prisma.webhookLog.findMany({
    where: {
      provider: "sepay",
      retryable: true,
      status: "FAILED",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  const results = [];
  for (const log of logs) {
    try {
      const result = await replaySepayWebhookLog(log.id, {
        origin: req.nextUrl.origin,
        source: "cron",
      });
      results.push({ id: log.id, success: result.success });
    } catch (error: any) {
      await prisma.webhookLog.update({
        where: { id: log.id },
        data: {
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
          retryable: false,
          errorMessage: error.message || "Cron retry failed",
        },
      });
      results.push({
        id: log.id,
        success: false,
        error: error.message || "Cron retry failed",
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
