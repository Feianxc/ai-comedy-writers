import { NextRequest, NextResponse } from 'next/server';
import { SessionPayload, verifyToken } from '@/lib/session';

const SESSION_COOKIE_NAMES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
] as const;

type ApiAuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

function getSessionToken(request: NextRequest): string | undefined {
  for (const cookieName of SESSION_COOKIE_NAMES) {
    const cookieValue = request.cookies.get(cookieName)?.value;
    if (cookieValue) {
      return cookieValue;
    }
  }

  return undefined;
}

export async function requireApiAuth(
  request: NextRequest
): Promise<ApiAuthResult> {
  const sessionToken = getSessionToken(request);

  if (!sessionToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { code: 401, error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      ),
    };
  }

  const session = await verifyToken(sessionToken);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json(
        { code: 401, error: 'INVALID_TOKEN', message: '登录已失效，请重新登录' },
        { status: 401 }
      ),
    };
  }

  if (session.expiresAt && session.expiresAt < Date.now()) {
    return {
      ok: false,
      response: NextResponse.json(
        { code: 401, error: 'TOKEN_EXPIRED', message: '登录已过期，请重新登录' },
        { status: 401 }
      ),
    };
  }

  return { ok: true, session };
}
