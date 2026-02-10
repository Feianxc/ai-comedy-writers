import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/session";

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("next-auth.session-token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { code: 401, error: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(sessionToken);

    if (!payload) {
      return NextResponse.json(
        { code: 401, error: "INVALID_TOKEN", message: "Invalid session token" },
        { status: 401 }
      );
    }

    // 检查token是否过期
    if (payload.expiresAt && payload.expiresAt < Date.now()) {
      return NextResponse.json(
        { code: 401, error: "TOKEN_EXPIRED", message: "Session has expired" },
        { status: 401 }
      );
    }

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
