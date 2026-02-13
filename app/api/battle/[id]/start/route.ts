import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/api-auth';
import {
  preloadBattleGame,
  flushBattleGame,
  resetBattleGame,
  startBattleGame,
  BattleStoreError,
} from '@/lib/battle/store';
import { BattleStreamService } from '@/lib/battle/stream-service';

const startBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
  reset: z.boolean().optional(),
});

function handleBattleError(error: unknown): Response {
  if (error instanceof BattleStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Battle start API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '服务繁忙，请稍后再试' },
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
      { code: 400, error: 'INVALID_JSON', message: '请求体 JSON 格式错误' },
      { status: 400 }
    );
  }

  const parsed = startBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, error: 'INVALID_BODY', message: '请求参数不合法' },
      { status: 400 }
    );
  }

  try {
    await preloadBattleGame(id);

    if (parsed.data.reset) {
      const game = resetBattleGame({
        gameId: id,
        hostUserId: auth.session.user.id,
      });
      await flushBattleGame(id);

      return NextResponse.json({
        code: 0,
        data: { game },
      });
    }

    const game = startBattleGame({
      gameId: id,
      hostUserId: auth.session.user.id,
      topic: parsed.data.topic,
    });
    await flushBattleGame(id);

    const streamService = new BattleStreamService();
    void (async () => {
      try {
        await streamService.startBattleRun({
          gameId: id,
          requesterUserId: auth.session.user.id,
          forceRun: true,
        });
      } catch (runError) {
        console.error('Battle auto-run failed after start:', runError);
      }
    })();

    return NextResponse.json({
      code: 0,
      data: { game },
    });
  } catch (error) {
    return handleBattleError(error);
  }
}
