import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, SessionPayload } from './session';
import { ALL_SESSION_COOKIES } from './session-cookie';

/**
 * 认证中间件 - 校验用户身份
 */
export async function requireAuth(
  request: NextRequest
): Promise<NextResponse | SessionPayload> {
  let sessionToken: string | undefined;

  for (const cookieName of ALL_SESSION_COOKIES) {
    const cookieValue = request.cookies.get(cookieName)?.value;
    if (cookieValue) {
      sessionToken = cookieValue;
      break;
    }
  }

  if (!sessionToken) {
    return NextResponse.json(
      { code: 401, error: 'UNAUTHORIZED', message: '请先登录' },
      { status: 401 }
    );
  }

  const payload = await verifyToken(sessionToken);
  if (!payload) {
    return NextResponse.json(
      { code: 401, error: 'INVALID_TOKEN', message: '登录已失效，请重新登录' },
      { status: 401 }
    );
  }

  return payload;
}

