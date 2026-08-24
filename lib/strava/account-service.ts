import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StravaAthlete, StravaTokenResponse } from "./client";
import { encryptStravaToken } from "./token-crypto";

function displayName(athlete: StravaAthlete): string {
  return [athlete.firstname, athlete.lastname].filter(Boolean).join(" ").trim()
    || `Strava Athlete ${athlete.id}`;
}

export async function saveStravaAccount(input: {
  token: StravaTokenResponse;
  encryptionKey: string;
  scopes: string[];
}): Promise<{ userId: string; isNewUser: boolean }> {
  const athlete = input.token.athlete;
  if (!athlete?.id) throw new Error("Strava không trả về thông tin vận động viên");

  const stravaAthleteId = BigInt(String(athlete.id));
  const accountData = {
    accessTokenEncrypted: encryptStravaToken(input.token.access_token, input.encryptionKey),
    refreshTokenEncrypted: encryptStravaToken(input.token.refresh_token, input.encryptionKey),
    tokenExpiresAt: new Date(input.token.expires_at * 1000),
    scopes: [...new Set(input.scopes.filter(Boolean))],
    disconnectedAt: null,
    lastSyncError: null,
  } satisfies Omit<Prisma.ChallengeStravaAccountUpdateInput, "user">;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.challengeStravaAccount.findUnique({
      where: { stravaAthleteId },
      select: { userId: true },
    });

    if (existing) {
      await tx.challengeUser.update({
        where: { id: existing.userId },
        data: {
          displayName: displayName(athlete),
          avatarUrl: athlete.profile || null,
          status: "ACTIVE",
        },
      });
      await tx.challengeStravaAccount.update({
        where: { stravaAthleteId },
        data: accountData,
      });
      return { userId: existing.userId, isNewUser: false };
    }

    const user = await tx.challengeUser.create({
      data: {
        displayName: displayName(athlete),
        avatarUrl: athlete.profile || null,
        stravaAccount: {
          create: {
            stravaAthleteId,
            ...accountData,
          },
        },
      },
      select: { id: true },
    });
    return { userId: user.id, isNewUser: true };
  });
}

