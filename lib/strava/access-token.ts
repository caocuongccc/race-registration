import { prisma } from "@/lib/prisma";
import { refreshStravaAccessToken } from "./client";
import { getStravaServerConfig } from "./config";
import { decryptStravaToken, encryptStravaToken } from "./token-crypto";

const REFRESH_EARLY_MS = 5 * 60_000;

export interface ValidStravaAccess {
  userId: string;
  accessToken: string;
}

export async function getValidStravaAccessToken(
  stravaAthleteId: string,
  now = new Date(),
): Promise<ValidStravaAccess> {
  const athleteId = BigInt(stravaAthleteId);
  const account = await prisma.challengeStravaAccount.findUnique({
    where: { stravaAthleteId: athleteId },
    select: {
      userId: true,
      accessTokenEncrypted: true,
      refreshTokenEncrypted: true,
      tokenExpiresAt: true,
      disconnectedAt: true,
    },
  });
  if (!account) throw new Error(`Không tìm thấy tài khoản Strava ${stravaAthleteId}`);
  if (account.disconnectedAt) throw new Error("Tài khoản Strava đã ngắt kết nối");

  const config = getStravaServerConfig();
  if (account.tokenExpiresAt.getTime() > now.getTime() + REFRESH_EARLY_MS) {
    return {
      userId: account.userId,
      accessToken: decryptStravaToken(
        account.accessTokenEncrypted,
        config.STRAVA_TOKEN_ENCRYPTION_KEY,
      ),
    };
  }

  const refreshed = await refreshStravaAccessToken({
    clientId: config.STRAVA_CLIENT_ID,
    clientSecret: config.STRAVA_CLIENT_SECRET,
    refreshToken: decryptStravaToken(
      account.refreshTokenEncrypted,
      config.STRAVA_TOKEN_ENCRYPTION_KEY,
    ),
  });
  await prisma.challengeStravaAccount.update({
    where: { stravaAthleteId: athleteId },
    data: {
      accessTokenEncrypted: encryptStravaToken(
        refreshed.access_token,
        config.STRAVA_TOKEN_ENCRYPTION_KEY,
      ),
      refreshTokenEncrypted: encryptStravaToken(
        refreshed.refresh_token,
        config.STRAVA_TOKEN_ENCRYPTION_KEY,
      ),
      tokenExpiresAt: new Date(refreshed.expires_at * 1000),
      lastSyncedAt: now,
      lastSyncError: null,
    },
  });
  return { userId: account.userId, accessToken: refreshed.access_token };
}

