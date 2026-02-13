import { NextRequest, NextResponse } from 'next/server';
import { SessionPayload, verifyToken } from '@/lib/session';
import { ALL_SESSION_COOKIES } from '@/lib/session-cookie';

type ApiAuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse };

function getCandidateSessionTokens(request: NextRequest): string[] {
  const tokens: string[] = [];

  for (const cookieName of ALL_SESSION_COOKIES) {
    const value = request.cookies.get(cookieName)?.value;
    if (value) {
      tokens.push(value);
    }
  }

  return tokens;
}

export async function requireApiAuth(
  request: NextRequest
): Promise<ApiAuthResult> {
  const candidateTokens = getCandidateSessionTokens(request);

  if (candidateTokens.length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { code: 401, error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      ),
    };
  }

  for (const token of candidateTokens) {
    const session = await verifyToken(token);
    if (!session) {
      continue;
    }

    if (session.expiresAt && session.expiresAt < Date.now()) {
      continue;
    }

    return { ok: true, session };
  }

  return {
    ok: false,
    response: NextResponse.json(
      { code: 401, error: 'INVALID_TOKEN', message: '登录已失效，请重新登录' },
      { status: 401 }
    ),
  };
}

