import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request);

    if (!authResult.ok) {
      return authResult.response;
    }

    const payload = authResult.session;

    return NextResponse.json({
      code: 0,
      data: {
        user: payload.user,
        expiresIn: payload.expiresAt ? Math.floor((payload.expiresAt - Date.now()) / 1000) : undefined,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json(
      { code: 500, error: "UNKNOWN_ERROR", message: "Failed to get user info" },
      { status: 500 }
    );
  }
}
