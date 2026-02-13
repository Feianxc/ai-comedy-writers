import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/api-auth';
import { getBattleGameDetail, preloadBattleGame, BattleStoreError } from '@/lib/battle/store';
import { prisma } from '@/lib/db';
import type { BattleShareReplay } from '@/types/battle';
import type { Prisma } from '@prisma/client';

const shareBodySchema = z.object({
  title: z.string().trim().max(80).optional(),
});

function buildShareText(input: {
  topic: string;
  winnerName: string;
  rounds: number;
  speeches: Array<{ round: number; agentName: string; content: string }>;
}): string {
  const header = `【嘴强王者战报】\n主题：${input.topic}\n冠军：${input.winnerName}\n总回合：${input.rounds}\n`;
  const lines = input.speeches
    .slice(0, 80)
    .map((speech) => `第${speech.round}轮 ${speech.agentName}：${speech.content}`)
    .join('\n');
  return `${header}\n${lines}`;
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

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = shareBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, error: 'INVALID_BODY', message: '请求参数不合法' },
      { status: 400 }
    );
  }

  try {
    await preloadBattleGame(id);
    const detail = getBattleGameDetail(id);
    const isParticipant = detail.game.agents.some((agent) => agent.userId === auth.session.user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { code: 403, error: 'FORBIDDEN', message: '你不是该房间参与者' },
        { status: 403 }
      );
    }

    if (detail.game.status !== 'finished' || !detail.result) {
      return NextResponse.json(
        { code: 409, error: 'GAME_NOT_FINISHED', message: '对局尚未结束，无法分享' },
        { status: 409 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.session.user.id },
      select: { id: true, displayName: true, avatar: true },
    });

    if (!user) {
      return NextResponse.json(
        { code: 404, error: 'USER_NOT_FOUND', message: '用户不存在' },
        { status: 404 }
      );
    }

    const sharePayload: BattleShareReplay = {
      type: 'battle_replay',
      gameId: detail.game.id,
      title: parsed.data.title ?? `${detail.game.topic ?? '嘴强王者'} · 战报`,
      topic: detail.game.topic ?? '',
      winnerId: detail.result.winnerId,
      winnerName: detail.result.winnerName,
      totalRounds: detail.result.totalRounds,
      scores: detail.result.scores,
      rounds: detail.rounds,
      speeches: detail.speeches,
      generatedAt: new Date().toISOString(),
    };

    const shortCode = `b${id.slice(-5)}${Date.now().toString(36).slice(-4)}`;
    const shareUrl = `${request.nextUrl.origin}/share/${shortCode}`;

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        topic: sharePayload.topic || sharePayload.title,
        userAgentId: 'battle_system',
        userAgentConfig: {
          displayName: user.displayName,
          bio: 'Battle Share',
          interests: ['battle', 'replay', sharePayload.winnerName],
          avatar: user.avatar,
          battleReplay: sharePayload as unknown as Prisma.InputJsonValue,
        } as Prisma.InputJsonValue,
        participants: detail.game.agents.map((agent) => agent.displayName),
        round1: detail.speeches
          .filter((speech) => speech.round <= Math.max(1, Math.ceil(sharePayload.totalRounds / 2)))
          .map((speech) => ({
            role: speech.agentName,
            content: speech.content,
            round: speech.round,
          })),
        round2: detail.speeches
          .filter((speech) => speech.round > Math.max(1, Math.ceil(sharePayload.totalRounds / 2)))
          .map((speech) => ({
            role: speech.agentName,
            content: speech.content,
            round: speech.round,
          })),
        isPublic: true,
      },
    });

    await prisma.shareCard.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        imageUrl: '/battle-share.png',
        shareUrl,
        shortCode,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      code: 0,
      data: {
        shareUrl,
        shareCode: shortCode,
        copyText: buildShareText({
          topic: sharePayload.topic,
          winnerName: sharePayload.winnerName,
          rounds: sharePayload.totalRounds,
          speeches: detail.speeches,
        }),
      },
    });
  } catch (error) {
    if (error instanceof BattleStoreError) {
      return NextResponse.json(
        { code: error.status, error: error.code, message: error.message },
        { status: error.status }
      );
    }

    console.error('Battle share API error:', error);
    return NextResponse.json(
      { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '分享生成失败' },
      { status: 500 }
    );
  }
}
