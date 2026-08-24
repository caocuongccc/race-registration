import { NextRequest, NextResponse } from "next/server";
import { buildStravaAuthorizationUrl } from "@/lib/strava/client";
import { getStravaServerConfig } from "@/lib/strava/config";
import { createStravaOAuthState } from "@/lib/strava/oauth-state";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const config = getStravaServerConfig();
    const { state, nonce } = createStravaOAuthState(
      config.oauthStateSecret,
      request.nextUrl.searchParams.get("returnTo"),
    );
    const authorizationUrl = buildStravaAuthorizationUrl({
      clientId: config.STRAVA_CLIENT_ID,
      redirectUri: config.STRAVA_REDIRECT_URI,
      state,
    });
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set("strava_oauth_nonce", nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/strava/oauth/callback",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    console.error("Cannot start Strava OAuth", error);
    return NextResponse.json(
      { error: "Strava chưa được cấu hình đầy đủ" },
      { status: 503 },
    );
  }
}
