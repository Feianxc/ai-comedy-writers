import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { getBattleGameDetail, preloadBattleGame, BattleStoreError } from '@/lib/battle/store';

function handleBattleError(error: unknown): Response {
  if (error instanceof BattleStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Battle detail API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '服务繁忙，请稍后再试' },
    { status: 500 }
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  const userId = auth.session.user.id;

  try {
    await preloadBattleGame(id);
    const detail = getBattleGameDetail(id);
    const inGame = detail.game.agents.some((agent) => agent.userId === userId);
    if (!inGame) {
      return NextResponse.json(
        { code: 403, error: 'FORBIDDEN', message: '你不在该游戏中，无法查看详情' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      code: 0,
      data: detail,
    });
  } catch (error) {
    return handleBattleError(error);
  }
}
