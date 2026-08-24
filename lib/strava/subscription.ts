const BASE_URL = "https://www.strava.com/api/v3/push_subscriptions";

export interface StravaSubscription {
  id: number;
  application_id: number;
  callback_url: string;
  created_at: string;
  updated_at: string;
}

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`Strava subscription API ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response.json() as Promise<T>;
}

export async function listStravaSubscriptions(clientId: string, clientSecret: string): Promise<StravaSubscription[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  return responseJson(await fetch(url, { cache: "no-store" }));
}

export async function createStravaSubscription(input: { clientId: string; clientSecret: string; callbackUrl: string; verifyToken: string }): Promise<{ id: number }> {
  return responseJson(await fetch(BASE_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: input.clientId, client_secret: input.clientSecret, callback_url: input.callbackUrl, verify_token: input.verifyToken }),
    cache: "no-store",
  }));
}

