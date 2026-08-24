import { NextRequest, NextResponse } from "next/server";
import { saveStravaAccount } from "@/lib/strava/account-service";
import { exchangeStravaAuthorizationCode } from "@/lib/strava/client";
import { getStravaServerConfig } from "@/lib/strava/config";
import { verifyStravaOAuthState } from "@/lib/strava/oauth-state";
import { createChallengeSessionToken, setChallengeSessionCookie } from "@/lib/strava/session";

export const runtime = "nodejs";

function redirectWithStatus(
  request: NextRequest,
  returnTo: string,
  status: string,
): NextResponse {
  const url = new URL(returnTo, request.nextUrl.origin);
  url.searchParams.set("strava", status);
  const response = NextResponse.redirect(url);
  response.cookies.delete("strava_oauth_nonce");
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  const nonce = request.cookies.get("strava_oauth_nonce")?.value;

  if (!state || !nonce)
    return redirectWithStatus(request, "/challenges", "invalid_state");

  let returnTo = "/challenges";
  try {
    const config = getStravaServerConfig();
    const verifiedState = verifyStravaOAuthState(
      state,
      nonce,
      config.oauthStateSecret,
    );
    returnTo = verifiedState.returnTo;
    if (oauthError || !code)
      return redirectWithStatus(request, returnTo, "cancelled");

    const token = await exchangeStravaAuthorizationCode({
      clientId: config.STRAVA_CLIENT_ID,
      clientSecret: config.STRAVA_CLIENT_SECRET,
      code,
    });
    const scopes = (request.nextUrl.searchParams.get("scope") ?? "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);
    const account = await saveStravaAccount({
      token,
      encryptionKey: config.STRAVA_TOKEN_ENCRYPTION_KEY,
      scopes,
    });
    const response = redirectWithStatus(request, returnTo, "connected");
    setChallengeSessionCookie(response, createChallengeSessionToken(account.userId, config.oauthStateSecret));
    return response;
  } catch (error) {
    console.error("Strava OAuth callback failed", error);
    return redirectWithStatus(request, returnTo, "error");
  }
}
