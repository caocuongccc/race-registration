import { z } from "zod";

const stravaServerConfigSchema = z.object({
  STRAVA_CLIENT_ID: z.string().min(1),
  STRAVA_CLIENT_SECRET: z.string().min(1),
  STRAVA_REDIRECT_URI: z.string().url(),
  STRAVA_WEBHOOK_VERIFY_TOKEN: z.string().min(24),
  STRAVA_TOKEN_ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/),
  STRAVA_OAUTH_STATE_SECRET: z.string().min(32).optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),
});

export type StravaServerConfig = z.infer<typeof stravaServerConfigSchema> & {
  oauthStateSecret: string;
};

let cachedConfig: StravaServerConfig | null = null;

export function getStravaServerConfig(): StravaServerConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = stravaServerConfigSchema.parse(process.env);
  const oauthStateSecret = parsed.STRAVA_OAUTH_STATE_SECRET ?? parsed.NEXTAUTH_SECRET;
  if (!oauthStateSecret) {
    throw new Error("STRAVA_OAUTH_STATE_SECRET hoặc NEXTAUTH_SECRET phải được cấu hình");
  }

  cachedConfig = { ...parsed, oauthStateSecret };
  return cachedConfig;
}

export function clearStravaConfigCacheForTests(): void {
  cachedConfig = null;
}

