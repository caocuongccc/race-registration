import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "challenge_session";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

interface ChallengeSessionPayload {
  userId: string;
  issuedAt: number;
  expiresAt: number;
}

function signature(encoded: string, secret: string): string {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createChallengeSessionToken(userId: string, secret: string, now = Date.now()): string {
  const payload: ChallengeSessionPayload = {
    userId,
    issuedAt: now,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyChallengeSessionToken(token: string, secret: string, now = Date.now()): ChallengeSessionPayload {
  const [encoded, receivedSignature] = token.split(".");
  if (!encoded || !receivedSignature) throw new Error("Challenge session không hợp lệ");
  const expected = Buffer.from(signature(encoded, secret));
  const received = Buffer.from(receivedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("Challenge session không hợp lệ");
  }
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ChallengeSessionPayload;
  if (!payload.userId || now < payload.issuedAt || now >= payload.expiresAt) {
    throw new Error("Challenge session đã hết hạn");
  }
  return payload;
}

export function setChallengeSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearChallengeSessionCookie(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}

export function readChallengeSession(request: NextRequest, secret: string): ChallengeSessionPayload {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) throw new Error("UNAUTHORIZED");
  try { return verifyChallengeSessionToken(token, secret); } catch { throw new Error("UNAUTHORIZED"); }
}

