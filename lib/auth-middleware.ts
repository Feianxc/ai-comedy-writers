import { NextRequest, NextResponse } from "next/server";
import { verifyToken, SessionPayload } from "./session";

/**
 * 认证中间件 - 验证用户身份
 * @returns SessionPayload 如果认证成功，NextResponse 如果认证失败
 */
export async function requireAuth(request: NextRequest): Promise<
  | NextResponse
  | SessionPayload
> {
  // 检查两种可能的 cookie 名称（开发环境和生产环境）
  const sessionToken = request.cookies.get("next-auth.session-token")?.value
    ?? request.cookies.get("__Secure-next-auth.session-token")?.value;

  if (!sessionToken) {
    return NextResponse.json(
      { code: 401, error: "Unauthorized", message: "请先登录" },
      { status: 401 }
    );
  }

  const payload = await verifyToken(sessionToken);
  if (!payload) {
    return NextResponse.json(
      { code: 401, error: "Invalid token", message: "登录已过期，请重新登录" },
      { status: 401 }
    );
  }

  return payload;
}
