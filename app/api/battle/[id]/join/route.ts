import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/api-auth';
import {
  preloadBattleGame,
  flushBattleGame,
  joinBattleGame,
  addBattleBots,
  BattleStoreError,
} from '@/lib/battle/store';

const joinBodySchema = z.object({
  personaId: z.string().trim().min(1).max(50),
  personaLabel: z.string().trim().min(1).max(50).optional(),
  asBot: z.boolean().optional(),
  botCount: z.number().int().min(1).max(8).optional(),
});

function handleBattleError(error: unknown): Response {
  if (error instanceof BattleStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Battle join API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '鏈嶅姟绻佸繖锛岃绋嶅悗鍐嶈瘯' },
    { status: 500 }
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 400, error: 'INVALID_JSON', message: '璇锋眰浣?JSON 鏍煎紡閿欒' },
      { status: 400 }
    );
  }

  const parsed = joinBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, error: 'INVALID_BODY', message: '请求参数不合法' },
      { status: 400 }
    );
  }

  const user = auth.session.user;

  try {
    await preloadBattleGame(id);

    const personaLabel = parsed.data.personaLabel ?? '榛樿浜鸿';
    if (parsed.data.asBot) {
      const game = addBattleBots(id, user.id, parsed.data.botCount ?? 1);
      await flushBattleGame(id);
      return NextResponse.json({
        code: 0,
        data: { game },
      });
    }

    const game = joinBattleGame(id, {
      userId: user.id,
      displayName: user.displayName,
      personaId: parsed.data.personaId,
      personaLabel,
    });
    await flushBattleGame(id);

    return NextResponse.json({
      code: 0,
      data: { game },
    });
  } catch (error) {
    return handleBattleError(error);
  }
}


