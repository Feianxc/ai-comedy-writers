import { NextResponse } from "next/server";
import {
  APP_SESSION_COOKIE,
  APP_SESSION_COOKIE_SECURE,
  LEGACY_SESSION_COOKIES,
} from "@/lib/session-cookie";

/**
 * POST /api/auth/logout
 * 退出登录，清除 session cookie
 */
export async function POST() {
  const response = NextResponse.json({ code: 0, data: { success: true } });

  response.cookies.delete(APP_SESSION_COOKIE);
  response.cookies.delete(APP_SESSION_COOKIE_SECURE);
  for (const cookieName of LEGACY_SESSION_COOKIES) {
    response.cookies.delete(cookieName);
  }

  return response;
}
