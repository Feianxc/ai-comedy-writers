import { NextRequest, NextResponse } from "next/server";
import { generateState } from "@/lib/csrf";

const SECOND_ME_CLIENT_ID = process.env.SECOND_ME_CLIENT_ID;
const SECOND_ME_OAUTH_URL = process.env.SECOND_ME_OAUTH_URL ?? "https://go.second.me/oauth/";
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const SAFE_REDIRECT_REGEX = /^\/(?!\/).*/;

function isValidRedirectUrl(url: string | null): boolean {
  if (!url) {
    return true;
  }

  return SAFE_REDIRECT_REGEX.test(url);
}

export async function GET(request: NextRequest) {
  try {
    if (!SECOND_ME_CLIENT_ID) {
      return NextResponse.json(
        { error: "SERVER_MISCONFIGURED", message: "OAuth client_id is not configured" },
        { status: 500 }
      );
    }

    const rawRedirectUrl = request.nextUrl.searchParams.get("redirect_url");

    if (!isValidRedirectUrl(rawRedirectUrl)) {
      return NextResponse.json(
        { error: "INVALID_REDIRECT_URL", message: "Invalid redirect URL" },
        { status: 400 }
      );
    }

    const state = generateState(rawRedirectUrl ?? undefined);

    const authUrl = new URL(SECOND_ME_OAUTH_URL);
    authUrl.searchParams.set("client_id", SECOND_ME_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", `${NEXTAUTH_URL}/api/auth/callback`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "user.info user.info.shades chat");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());

    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "LOGIN_FAILED", message: "Failed to initiate login" },
      { status: 500 }
    );
  }
}

