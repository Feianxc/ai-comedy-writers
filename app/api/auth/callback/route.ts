import { NextRequest, NextResponse } from "next/server";
import { verifyState } from "@/lib/csrf";
import { exchangeCodeForToken, SecondMeClient } from "@/lib/secondme-api";
import { signToken } from "@/lib/session";

const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * GET /api/auth/callback
 * OAuth回调处理端点
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log("[OAuth Callback] params:", {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      url: request.nextUrl.pathname + request.nextUrl.search,
    });

    if (error) {
      const errorDescription = searchParams.get("error_description") ?? "Authorization failed";
      console.error("[OAuth Callback] OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(errorDescription)}`, NEXTAUTH_URL)
      );
    }

    if (!code) {
      console.error("[OAuth Callback] Missing code parameter");
      return NextResponse.redirect(
        new URL("/?error=missing_code", NEXTAUTH_URL)
      );
    }

    // State 验证 - 从 cookie 读取
    const storedState = request.cookies.get("oauth_state")?.value;
    console.log("[OAuth Callback] state check:", {
      hasUrlState: !!state,
      hasCookieState: !!storedState,
      stateMatch: state === storedState,
    });

    // 如果有 state 且 cookie 也有，做验证；否则跳过（兼容 Second Me 不返回 state 的情况）
    let redirectUrl = "/experience";
    if (state && storedState) {
      if (state === storedState) {
        const stateResult = verifyState(state);
        if (stateResult.valid && stateResult.redirectUrl?.startsWith("/")) {
          redirectUrl = stateResult.redirectUrl;
        }
      } else {
        console.warn("[OAuth Callback] State mismatch, proceeding anyway");
      }
    }

    // 用 code 换取 access token
    console.log("[OAuth Callback] Exchanging code for token...");
    const tokenResponse = await exchangeCodeForToken(code);
    console.log("[OAuth Callback] Token exchange success, expires_in:", tokenResponse.expires_in);

    // 获取用户信息
    console.log("[OAuth Callback] Fetching user info...");
    const client = new SecondMeClient(tokenResponse.access_token);
    const user = await client.getCurrentUser();
    console.log("[OAuth Callback] User info received:", { id: user.id, name: user.display_name });

    // 创建 session
    const sessionToken = await signToken({
      user: {
        id: user.id,
        displayName: user.display_name,
        bio: user.bio,
        image: user.avatar,
        interests: user.interests,
      },
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    });

    console.log("[OAuth Callback] Session created, redirecting to:", redirectUrl);
    const response = NextResponse.redirect(new URL(redirectUrl, NEXTAUTH_URL));

    response.cookies.set("next-auth.session-token", sessionToken, {
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
    const errorMessage = error instanceof Error ? error.message : "Authentication failed";
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(errorMessage)}`, NEXTAUTH_URL)
    );
  }
}
