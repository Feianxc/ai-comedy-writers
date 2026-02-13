import { NextRequest, NextResponse } from "next/server";
import { verifyStateStrict } from "@/lib/csrf";
import { exchangeCodeForToken, SecondMeClient } from "@/lib/secondme-api";
import { signToken } from "@/lib/session";
import {
  APP_SESSION_COOKIE,
  APP_SESSION_COOKIE_SECURE,
  LEGACY_SESSION_COOKIES,
} from "@/lib/session-cookie";
import { prisma } from "@/lib/db";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const SAFE_REDIRECT_REGEX = /^\/(?!\/).*/;

function isValidRedirectUrl(url: string | undefined): url is string {
  return typeof url === "string" && SAFE_REDIRECT_REGEX.test(url);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      const errorDescription = searchParams.get("error_description") ?? "Authorization failed";
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(errorDescription)}`, NEXTAUTH_URL)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL("/?error=missing_code", NEXTAUTH_URL));
    }

    const storedState = request.cookies.get("oauth_state")?.value;
    if (!state || !storedState) {
      const response = NextResponse.redirect(new URL("/?error=invalid_state", NEXTAUTH_URL));
      response.cookies.delete("oauth_state");
      return response;
    }

    const stateResult = verifyStateStrict(state, storedState);
    if (!stateResult.valid) {
      const response = NextResponse.redirect(new URL("/?error=invalid_state", NEXTAUTH_URL));
      response.cookies.delete("oauth_state");
      return response;
    }

    let redirectUrl = "/experience";
    if (isValidRedirectUrl(stateResult.redirectUrl)) {
      redirectUrl = stateResult.redirectUrl;
    }

    const tokenResponse = await exchangeCodeForToken(code);
    const client = new SecondMeClient(tokenResponse.access_token);
    const user = await client.getCurrentUser();
    const tokenExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

    const persistedUser = await prisma.user.upsert({
      where: { secondmeUserId: user.id },
      update: {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt,
        displayName: user.display_name,
        bio: user.bio ?? null,
        avatar: user.avatar ?? null,
        interests: user.interests ?? [],
        lastLoginAt: new Date(),
      },
      create: {
        secondmeUserId: user.id,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenExpiresAt,
        displayName: user.display_name,
        bio: user.bio ?? null,
        avatar: user.avatar ?? null,
        interests: user.interests ?? [],
        lastLoginAt: new Date(),
      },
      select: {
        id: true,
        secondmeUserId: true,
        displayName: true,
        bio: true,
        avatar: true,
        interests: true,
      },
    });

    const sessionToken = await signToken({
      user: {
        id: persistedUser.id,
        secondmeUserId: persistedUser.secondmeUserId,
        displayName: persistedUser.displayName,
        bio: persistedUser.bio ?? undefined,
        image: persistedUser.avatar ?? undefined,
        interests: persistedUser.interests,
      },
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: tokenExpiresAt.getTime(),
    });

    const response = NextResponse.redirect(new URL(redirectUrl, NEXTAUTH_URL));
    const secureCookieName = process.env.NODE_ENV === "production"
      ? APP_SESSION_COOKIE_SECURE
      : APP_SESSION_COOKIE;

    for (const legacyName of LEGACY_SESSION_COOKIES) {
      response.cookies.delete(legacyName);
    }

    response.cookies.delete(APP_SESSION_COOKIE);
    response.cookies.delete(APP_SESSION_COOKIE_SECURE);
    response.cookies.set(secureCookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    response.cookies.delete("oauth_state");

    return response;
  } catch (error) {
    console.error("[OAuth Callback] FATAL ERROR:", error);
    return NextResponse.redirect(new URL("/?error=authentication_failed", NEXTAUTH_URL));
  }
}
