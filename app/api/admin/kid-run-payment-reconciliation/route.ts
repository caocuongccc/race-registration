import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/event-permissions";
import { replaySepayWebhookLog } from "@/lib/sepay-webhook-retry";
import { extractKidRunCodeFromTransferContent } from "@/lib/payment-content";

const CAMPAIGN_ID = "cmsctqc1n0001um4g4sqqqwwm";

function parsePayload(payload: string) {
  try { return JSON.parse(payload); } catch { return null; }
}
function replayPayload(payload: any) {
  return payload?.webhookData || payload?.payload?.webhookData || payload;
}
const applicationSelect = {
  id: true, publicCode: true, guardianName: true, email: true, phone: true,
  shirtTotalAmount: true, createdAt: true,
  participants: { select: { id: true, fullName: true, bibNumber: true } },
  shirts: { select: { id: true, styleName: true, size: true, quantity: true, totalPrice: true } },
} as const;

export async function GET() {
  const user = await getUserSession();
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const logs = await prisma.webhookLog.findMany({
    where: { provider: "sepay", event: "payment.parse", status: "NO_ORDER_CODE", retrySourceId: null },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  const parsedLogs = logs.map((log) => {
    const payload = replayPayload(parsePayload(log.payload));
    const amount = Number(payload?.transferAmount || payload?.amount || 0);
    const transactionId = String(payload?.id || payload?.transactionId || "");
    const content = String(payload?.content || payload?.description || "");
    const detectedCode = extractKidRunCodeFromTransferContent(payload?.code) || extractKidRunCodeFromTransferContent(content);
    return { log, payload, amount, transactionId, content, detectedCode };
  }).filter((item) => item.payload && item.amount > 0 && item.transactionId);
  const processedTransactionIds = new Set((await prisma.kidRunPayment.findMany({
    where: { application: { campaignId: CAMPAIGN_ID }, transactionId: { in: parsedLogs.map((item) => item.transactionId) } },
    select: { transactionId: true },
  })).map((item) => item.transactionId).filter(Boolean) as string[]);
  const pendingApplications = await prisma.kidRunFamilyApplication.findMany({
    where: { campaignId: CAMPAIGN_ID, shirtPaymentStatus: "PENDING", shirtTotalAmount: { in: [...new Set(parsedLogs.map((item) => item.amount))] } },
    select: applicationSelect, orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    campaignId: CAMPAIGN_ID,
    transactions: parsedLogs.filter((item) => !processedTransactionIds.has(item.transactionId)).map((item) => {
      const exactMatch = item.detectedCode ? pendingApplications.find((application) => application.publicCode === item.detectedCode) : undefined;
      return {
        id: item.log.id, createdAt: item.log.createdAt, amount: item.amount,
        transactionId: item.transactionId,
        bank: item.payload.gateway || item.payload.bankAbbreviation || "",
        accountNumber: item.payload.accountNumber || "", content: item.content,
        detectedCode: item.detectedCode,
        matchType: exactMatch ? "EXACT_CODE" : "AMOUNT_ONLY",
        candidates: exactMatch ? [exactMatch] : pendingApplications.filter((application) => application.shirtTotalAmount === item.amount),
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserSession();
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const logId = String(body.logId || "");
  const applicationId = String(body.applicationId || "");
  const application = await prisma.kidRunFamilyApplication.findFirst({
    where: { id: applicationId, campaignId: CAMPAIGN_ID, shirtPaymentStatus: "PENDING" },
    select: { publicCode: true, shirtTotalAmount: true },
  });
  if (!application) return NextResponse.json({ error: "Hồ sơ không còn ở trạng thái chờ thanh toán" }, { status: 400 });
  const sourceLog = await prisma.webhookLog.findFirst({
    where: { id: logId, provider: "sepay", event: "payment.parse", status: "NO_ORDER_CODE" },
  });
  if (!sourceLog) return NextResponse.json({ error: "Không tìm thấy webhook" }, { status: 404 });
  const payload = replayPayload(parsePayload(sourceLog.payload));
  const amount = Number(payload?.transferAmount || payload?.amount || 0);
  if (amount !== application.shirtTotalAmount) return NextResponse.json({ error: "Số tiền webhook không khớp tổng tiền áo hồ sơ" }, { status: 400 });
  const result = await replaySepayWebhookLog(sourceLog.id, { origin: req.nextUrl.origin, overrideCode: application.publicCode, source: "admin" });
  if (!result.success) return NextResponse.json({ error: result.result?.error || result.result?.message || "Retry thất bại" }, { status: 400 });
  return NextResponse.json({ success: true, publicCode: application.publicCode });
}