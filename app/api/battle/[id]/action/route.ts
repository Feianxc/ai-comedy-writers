import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/api-auth';
import {
  preloadBattleGame,
  flushBattleGame,
  setBattleAgentTalent,
  setBattleAgentItem,
  BattleStoreError,
} from '@/lib/battle/store';

const actionBodySchema = z.object({
  agentId: z.string().trim().min(1),
  action: z.enum(['select_talent', 'buy_item', 'audience_item', 'sync', 'noop']),
  data: z.record(z.string(), z.unknown()).optional(),
});

function handleBattleError(error: unknown): Response {
  if (error instanceof BattleStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Battle action API error:', error);
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

  const parsed = actionBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, error: 'INVALID_BODY', message: '请求参数不合法' },
      { status: 400 }
    );
  }

  try {
    await preloadBattleGame(id);

    if (parsed.data.action === 'select_talent') {
      const talentId = typeof parsed.data.data?.talentId === 'string' ? parsed.data.data.talentId : '';
      const talentName =
        typeof parsed.data.data?.talentName === 'string' ? parsed.data.data.talentName : '未命名天赋';
      const talentDescription =
        typeof parsed.data.data?.talentDescription === 'string'
          ? parsed.data.data.talentDescription
          : null;
      if (!talentId) {
        return NextResponse.json(
          { code: 400, error: 'INVALID_TALENT', message: '缺少 talentId' },
          { status: 400 }
        );
      }

      const game = setBattleAgentTalent(
        id,
        parsed.data.agentId,
        talentId,
        talentName,
        talentDescription
      );
      await flushBattleGame(id);
      return NextResponse.json({ code: 0, data: { game } });
    }

    if (parsed.data.action === 'buy_item' || parsed.data.action === 'audience_item') {
      const itemId = typeof parsed.data.data?.itemId === 'string' ? parsed.data.data.itemId : null;
      const itemName = typeof parsed.data.data?.itemName === 'string' ? parsed.data.data.itemName : null;
      const itemDescription =
        typeof parsed.data.data?.itemDescription === 'string' ? parsed.data.data.itemDescription : null;
      const scoreDelta =
        typeof parsed.data.data?.scoreDelta === 'number' ? Math.trunc(parsed.data.data.scoreDelta) : 0;
      const game = setBattleAgentItem(
        id,
        parsed.data.agentId,
        itemId,
        itemName,
        itemDescription,
        scoreDelta
      );
      await flushBattleGame(id);
      return NextResponse.json({ code: 0, data: { game } });
    }

    return NextResponse.json({
      code: 0,
      data: {
        ok: true,
      },
    });
  } catch (error) {
    return handleBattleError(error);
  }
}
