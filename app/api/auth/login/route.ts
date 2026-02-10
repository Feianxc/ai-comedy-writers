import { NextRequest, NextResponse } from "next/server";
import { generateState } from "@/lib/csrf";

const SECOND_ME_CLIENT_ID = process.env.SECOND_ME_CLIENT_ID;
const SECOND_ME_OAUTH_URL = process.env.SECOND_ME_OAUTH_URL ?? "https://go.second.me/oauth/";
const NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * GET /api/auth/login
 * OAuth登录跳转端点
 * 生成state参数并重定向到Second Me授权页面
 */
/**
 * 验证redirect_url是否安全
 * 只允许相对路径（以/开头）或空值
 */
function isValidRedirectUrl(url: string | null): boolean {
  if (url === null || url === "") {
    return true;
  }
  // 只允许相对路径，防止开放重定向攻击
  return url.startsWith("/");
}

export async function GET(request: NextRequest) {
  try {
    const rawRedirectUrl = request.nextUrl.searchParams.get("redirect_url");

    // 验证redirect_url安全性
    if (!isValidRedirectUrl(rawRedirectUrl)) {
      return NextResponse.json(
        { error: "INVALID_REDIRECT_URL", message: "Invalid redirect URL" },
        { status: 400 }
      );
    }

    const state = generateState(rawRedirectUrl ?? undefined);

    const authUrl = new URL(SECOND_ME_OAUTH_URL);
    authUrl.searchParams.set("client_id", SECOND_ME_CLIENT_ID ?? "");
    authUrl.searchParams.set("redirect_uri", `${NEXTAUTH_URL}/api/auth/callback`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "user.info user.info.shades chat");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());

    // 在cookie中保存state用于验证
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 5 * 60, // 5分钟
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
