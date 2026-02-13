import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { RoastMessage, RoastSession } from '@/types';
import type { BattleShareReplay } from '@/types/battle';

function toRoastMessages(value: unknown): RoastMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const messages: RoastMessage[] = [];
  for (const item of value) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      const row = item as Record<string, unknown>;
      if (typeof row.role !== 'string' || typeof row.content !== 'string') {
        continue;
      }

      messages.push({
        role: row.role,
        content: row.content,
        isUser: typeof row.isUser === 'boolean' ? row.isUser : undefined,
      });
  }

  return messages;
}

function parseBattleReplay(value: unknown): BattleShareReplay | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const replay = value as Partial<BattleShareReplay>;
  if (replay.type !== 'battle_replay') {
    return null;
  }
  if (typeof replay.gameId !== 'string' || typeof replay.winnerName !== 'string') {
    return null;
  }

  return replay as BattleShareReplay;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        {
          code: 400,
          error: 'INVALID_PARAM',
          message: '无效的分享ID',
        },
        { status: 400 }
      );
    }

    const share = await prisma.shareCard.findUnique({
      where: { shortCode: id },
      include: {
        session: true,
        user: {
          select: {
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json(
        {
          code: 404,
          error: 'NOT_FOUND',
          message: '分享不存在',
        },
        { status: 404 }
      );
    }

    if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        {
          code: 410,
          error: 'EXPIRED',
          message: '分享已过期',
        },
        { status: 410 }
      );
    }

    await prisma.shareCard.update({
      where: { id: share.id },
      data: { viewCount: { increment: 1 } },
    });

    const session: RoastSession = {
      id: share.session.id,
      topic: share.session.topic,
      userId: share.session.userId,
      userAgent: {
        id: share.session.userAgentId,
        displayName:
          (share.session.userAgentConfig as Record<string, unknown>)?.displayName as string
            ?? share.user.displayName,
        bio: (share.session.userAgentConfig as Record<string, unknown>)?.bio as string | undefined,
        interests: (share.session.userAgentConfig as Record<string, unknown>)?.interests as string[] | undefined,
        avatar: (share.session.userAgentConfig as Record<string, unknown>)?.avatar as string | undefined,
      },
      round1: toRoastMessages(share.session.round1),
      round2: toRoastMessages(share.session.round2),
      participants: share.session.participants,
      createdAt: share.session.createdAt,
      imageUrl: share.imageUrl,
    };

    const userAgentConfig = share.session.userAgentConfig as Record<string, unknown>;
    const battleReplay = parseBattleReplay(userAgentConfig.battleReplay);

    return NextResponse.json({
      code: 0,
      data: {
        id: share.id,
        shortCode: share.shortCode,
        session,
        battleReplay,
        creator: {
          displayName: share.user.displayName,
          avatar: share.user.avatar ?? undefined,
        },
        viewCount: share.viewCount + 1,
      },
    });
  } catch (error) {
    console.error('Share get API error:', error);
    return NextResponse.json(
      {
        code: 500,
        error: 'FETCH_FAILED',
        message: '获取分享失败',
      },
      { status: 500 }
    );
  }
}
