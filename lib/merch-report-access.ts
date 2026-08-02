import { createHmac, timingSafeEqual } from "node:crypto";

function getReportSecret() {
  const secret = process.env.MERCH_REPORT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "MERCH_REPORT_SECRET hoặc NEXTAUTH_SECRET chưa được cấu hình",
    );
  }
  return secret;
}

export function createMerchReportToken(campaignId: string) {
  return createHmac("sha256", getReportSecret())
    .update("merch-report:" + campaignId)
    .digest("base64url")
    .slice(0, 32);
}

export function verifyMerchReportToken(campaignId: string, token: string) {
  if (!token) return false;
  const expected = createMerchReportToken(campaignId);
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);
  return (
    expectedBuffer.length === tokenBuffer.length &&
    timingSafeEqual(expectedBuffer, tokenBuffer)
  );
}
