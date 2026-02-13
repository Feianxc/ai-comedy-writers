import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { requireApiAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

const shareRequestSchema = z.object({
  sessionId: z.string().trim().min(1),
  session: z
    .object({
      id: z.string().trim().min(1),
      topic: z.string().trim().min(1),
      userId: z.string().trim().min(1),
      userAgent: z
        .object({
          displayName: z.string().trim().min(1),
          id: z.string().trim().min(1).optional(),
          bio: z.string().optional(),
          interests: z.array(z.string()).optional(),
          avatar: z.string().optional(),
        })
        .passthrough(),
      userPersona: z
        .object({
          id: z.string().trim().min(1),
          name: z.string().trim().min(1),
          archetype: z.string().trim().min(1),
          style: z
            .object({
              tone: z.string().trim().min(1),
              length: z.enum(['short', 'medium', 'long']),
              emoji: z.boolean(),
              meme: z.boolean(),
            })
            .passthrough(),
          signature: z.array(z.string()),
        })
        .optional(),
      round1: z.array(z.unknown()),
      round2: z.array(z.unknown()),
      participants: z.array(z.string()),
      createdAt: z.union([z.string(), z.date()]),
      imageUrl: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

function sanitizeJsonArray(value: unknown): Prisma.InputJsonValue {
  if (!Array.isArray(value)) {
    return [] as Prisma.InputJsonArray;
  }

  return value as Prisma.InputJsonArray;
}

async function ensureSession(params: {
  userId: string;
  sessionId: string;
  session?: z.infer<typeof shareRequestSchema>['session'];
}): Promise<string> {
  const { userId, sessionId, session } = params;

  const existing = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true },
  });

  if (existing) {
    if (existing.userId !== userId) {
      throw new Error('FORBIDDEN_SESSION');
    }
    return existing.id;
  }

  if (!session) {
    throw new Error('SESSION_NOT_FOUND');
  }

  const created = await prisma.session.create({
    data: {
      topic: session.topic,
      userId,
      userAgentId: session.userAgent.id ?? userId,
      userAgentConfig: {
        displayName: session.userAgent.displayName,
        bio: session.userAgent.bio,
        interests: session.userAgent.interests,
        avatar: session.userAgent.avatar,
        archetype: session.userPersona?.archetype ?? 'toxic',
      },
      round1: sanitizeJsonArray(session.round1),
      round2: sanitizeJsonArray(session.round2),
      participants: Array.isArray(session.participants) ? session.participants : [],
      isPublic: true,
      createdAt: new Date(session.createdAt),
    },
  });

  return created.id;
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request);
    if (!authResult.ok) {
      return authResult.response;
    }

    const body = await request.json();
    const parsed = shareRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: 400, error: 'INVALID_PAYLOAD', message: '请求参数不合法' },
        { status: 400 }
      );
    }

    const { sessionId, session } = parsed.data;
    const userId = authResult.session.user.id;
    const realSessionId = await ensureSession({ userId, sessionId, session });

    const appUrl =
      process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
    if (!appUrl) {
      return NextResponse.json(
        { code: 500, error: 'MISSING_APP_URL', message: '服务端缺少 APP_URL 配置' },
        { status: 500 }
      );
    }

    const shortCode = nanoid(8);
    const shareUrl = `${appUrl}/share/${shortCode}`;
    const imageUrl = `/api/share/${shortCode}/image`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const shareCard = await prisma.shareCard.create({
      data: {
        sessionId: realSessionId,
        userId,
        shortCode,
        shareUrl,
        imageUrl,
        expiresAt,
      },
      select: {
        shortCode: true,
        shareUrl: true,
        imageUrl: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      code: 0,
      data: {
        shareUrl: shareCard.shareUrl,
        shortCode: shareCard.shortCode,
        imageUrl: shareCard.imageUrl,
        expiresAt: shareCard.expiresAt?.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'FORBIDDEN_SESSION') {
        return NextResponse.json(
          { code: 403, error: 'FORBIDDEN', message: '无权分享该会话' },
          { status: 403 }
        );
      }

      if (error.message === 'SESSION_NOT_FOUND') {
        return NextResponse.json(
          { code: 404, error: 'SESSION_NOT_FOUND', message: '会话不存在，请先完成生成' },
          { status: 404 }
        );
      }
    }

    console.error('Share create API error:', error);
    return NextResponse.json(
      {
        code: 500,
        error: 'CREATE_FAILED',
        message: '创建分享失败',
      },
      { status: 500 }
    );
  }
}
