import { prisma } from "@/lib/prisma";

type RetryOptions = {
  origin: string;
  overrideCode?: string;
  source: "admin" | "cron";
};

function parsePayload(payload: string) {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getReplayPayload(payload: any) {
  return payload?.webhookData || payload?.payload?.webhookData || payload;
}

function getNextRetryAt(retryCount: number, maxRetries: number) {
  if (retryCount >= maxRetries) return null;

  const delaysInMinutes = [5, 15, 60, 180, 360];
  const delay =
    delaysInMinutes[Math.min(retryCount, delaysInMinutes.length - 1)] || 360;

  return new Date(Date.now() + delay * 60 * 1000);
}

export async function replaySepayWebhookLog(logId: string, options: RetryOptions) {
  const log = await prisma.webhookLog.findUnique({
    where: { id: logId },
  });

  if (!log || log.provider !== "sepay") {
    throw new Error("Webhook log not found");
  }

  const overrideCode = options.overrideCode?.trim();
  const parsedPayload = parsePayload(log.payload);
  const replayPayload = getReplayPayload(parsedPayload);

  if (!replayPayload || typeof replayPayload !== "object") {
    throw new Error("Webhook payload is invalid");
  }

  const nextPayload = {
    ...replayPayload,
    ...(overrideCode ? { code: overrideCode } : {}),
  };

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-webhook-retry": options.source,
  };

  if (process.env.SEPAY_WEBHOOK_SECRET) {
    headers.authorization = `Bearer ${process.env.SEPAY_WEBHOOK_SECRET}`;
  }

  const replayRes = await fetch(`${options.origin}/api/webhook/sepay`, {
    method: "POST",
    headers,
    body: JSON.stringify(nextPayload),
  });
  const result = await replayRes.json().catch(() => null);
  const success = Boolean(replayRes.ok && result?.success);
  const nextRetryCount = log.retryCount + 1;
  const hasRetriesLeft = nextRetryCount < log.maxRetries;
  const nextRetryAt = success
    ? null
    : getNextRetryAt(nextRetryCount, log.maxRetries);

  await prisma.$transaction([
    prisma.webhookLog.update({
      where: { id: log.id },
      data: {
        retryCount: nextRetryCount,
        lastRetryAt: new Date(),
        retryable: !success && hasRetriesLeft && Boolean(nextRetryAt),
        nextRetryAt,
      },
    }),
    prisma.webhookLog.create({
      data: {
        provider: "sepay",
        event: "payment.retry",
        status: success ? "SUCCESS" : "FAILED",
        eventId: log.eventId,
        retrySourceId: log.id,
        errorMessage: success
          ? undefined
          : result?.error || result?.message || "Retry failed",
        payload: JSON.stringify({
          sourceLogId: log.id,
          source: options.source,
          overrideCode: overrideCode || null,
          replayPayload: nextPayload,
          result,
        }),
      },
    }),
  ]);

  return {
    success,
    result,
    retryCount: nextRetryCount,
    nextRetryAt,
  };
}

export function getInitialWebhookRetryAt() {
  return getNextRetryAt(0, 5);
}
