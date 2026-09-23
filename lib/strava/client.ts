const STRAVA_BASE_URL = "https://www.strava.com";

export interface StravaAthlete {
  id: number;
  firstname?: string;
  lastname?: string;
  profile?: string;
}

export interface StravaTokenResponse {
  token_type: string;
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: StravaAthlete;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strava API ${response.status}: ${body.slice(0, 500)}`);
  }
  return response.json() as Promise<T>;
}

export function buildStravaAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("/oauth/authorize", STRAVA_BASE_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("approval_prompt", "auto");
  url.searchParams.set("scope", "read,activity:read_all");
  url.searchParams.set("state", input.state);
  return url.toString();
}

export async function exchangeStravaAuthorizationCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
}): Promise<StravaTokenResponse> {
  const response = await fetch(`${STRAVA_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  return parseResponse<StravaTokenResponse>(response);
}

export async function refreshStravaAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<StravaTokenResponse> {
  const response = await fetch(`${STRAVA_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  return parseResponse<StravaTokenResponse>(response);
}

export async function getStravaActivity<T = unknown>(activityId: string, accessToken: string): Promise<T> {
  const response = await fetch(`${STRAVA_BASE_URL}/api/v3/activities/${encodeURIComponent(activityId)}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function getStravaActivityStreams<T = unknown>(
  activityId: string,
  accessToken: string,
  keys: string[],
): Promise<T> {
  const url = new URL(`/api/v3/activities/${encodeURIComponent(activityId)}/streams`, STRAVA_BASE_URL);
  url.searchParams.set("keys", keys.join(","));
  url.searchParams.set("key_by_type", "true");
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  return parseResponse<T>(response);
}
export interface StravaRateLimit {
  shortLimit: number | null;
  dailyLimit: number | null;
  shortUsage: number | null;
  dailyUsage: number | null;
}

function readRateLimit(response: Response): StravaRateLimit {
  const limits = response.headers.get("x-ratelimit-limit")?.split(",").map(Number) ?? [];
  const usage = response.headers.get("x-ratelimit-usage")?.split(",").map(Number) ?? [];
  return { shortLimit: limits[0] ?? null, dailyLimit: limits[1] ?? null, shortUsage: usage[0] ?? null, dailyUsage: usage[1] ?? null };
}

export async function listStravaAthleteActivities<T = unknown>(input: { accessToken: string; after: Date; before: Date; page: number; perPage?: number }): Promise<{ activities: T[]; rateLimit: StravaRateLimit }> {
  const url = new URL("/api/v3/athlete/activities", STRAVA_BASE_URL);
  url.searchParams.set("after", String(Math.floor(input.after.getTime() / 1000)));
  url.searchParams.set("before", String(Math.floor(input.before.getTime() / 1000)));
  url.searchParams.set("page", String(input.page));
  url.searchParams.set("per_page", String(Math.min(100, input.perPage ?? 100)));
  const response = await fetch(url, { headers: { authorization: `Bearer ${input.accessToken}` }, cache: "no-store" });
  const limits = readRateLimit(response);
  return { activities: await parseResponse<T[]>(response), rateLimit: limits };
}
