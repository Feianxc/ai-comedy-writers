import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * 退出登录，清除 session cookie
 */
export async function POST() {
  const response = NextResponse.json({ code: 0, data: { success: true } });
  response.cookies.delete("next-auth.session-token");
  response.cookies.delete("__Secure-next-auth.session-token");
  return response;
}
