import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_TTL_MS = 10 * 60 * 1000;

interface OAuthStatePayload {
  nonce: string;
  issuedAt: number;
  returnTo: string;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/challenges";
  }
  return returnTo;
}

export function createStravaOAuthState(
  secret: string,
  returnTo?: string | null,
): { state: string; nonce: string } {
  const payload: OAuthStatePayload = {
    nonce: randomBytes(24).toString("base64url"),
    issuedAt: Date.now(),
    returnTo: safeReturnTo(returnTo),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return { state: `${encoded}.${sign(encoded, secret)}`, nonce: payload.nonce };
}

export function verifyStravaOAuthState(
  state: string,
  cookieNonce: string,
  secret: string,
  now = Date.now(),
): OAuthStatePayload {
  const [encoded, receivedSignature] = state.split(".");
  if (!encoded || !receivedSignature) throw new Error("OAuth state không hợp lệ");

  const expectedSignature = sign(encoded, secret);
  const received = Buffer.from(receivedSignature);
  const expected = Buffer.from(expectedSignature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new Error("Chữ ký OAuth state không hợp lệ");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as OAuthStatePayload;
  if (!payload.nonce || payload.nonce !== cookieNonce) throw new Error("OAuth nonce không khớp");
  if (!Number.isFinite(payload.issuedAt) || now - payload.issuedAt > STATE_TTL_MS || now < payload.issuedAt) {
    throw new Error("OAuth state đã hết hạn");
  }
  return { ...payload, returnTo: safeReturnTo(payload.returnTo) };
}

