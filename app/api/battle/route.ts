import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/api-auth';
import {
  createBattleGame,
  listBattleGamesAsync,
  BattleStoreError,
} from '@/lib/battle/store';

const createBattleBodySchema = z.object({
  name: z.string().trim().max(40).optional(),
  maxAgents: z.union([z.literal(3), z.literal(5), z.literal(7)]),
  personaId: z.string().trim().min(1).max(50),
  personaLabel: z.string().trim().min(1).max(50).optional(),
});

function handleBattleError(error: unknown): Response {
  if (error instanceof BattleStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Battle API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '服务繁忙，请稍后再试' },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const games = await listBattleGamesAsync();
    return NextResponse.json({
      code: 0,
      data: {
        games,
        total: games.length,
      },
    });
  } catch (error) {
    return handleBattleError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 400, error: 'INVALID_JSON', message: '请求体 JSON 格式错误' },
      { status: 400 }
    );
  }

  const parsed = createBattleBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, error: 'INVALID_BODY', message: '请求参数不合法' },
      { status: 400 }
    );
  }

  const user = auth.session.user;
  const personaLabel = parsed.data.personaLabel ?? '默认人设';

  try {
    const game = createBattleGame({
      hostUserId: user.id,
      hostName: user.displayName,
      hostPersonaId: parsed.data.personaId,
      hostPersonaLabel: personaLabel,
      gameName: parsed.data.name,
      maxAgents: parsed.data.maxAgents,
    });

    return NextResponse.json({
      code: 0,
      data: { game },
    });
  } catch (error) {
    return handleBattleError(error);
  }
}
