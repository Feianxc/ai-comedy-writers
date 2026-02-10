import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { requireApiAuth } from '@/lib/api-auth';

/**
 * POST /api/share
 * 创建分享
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { code: 400, error: 'Invalid sessionId', message: '会话ID不能为空' },
        { status: 400 }
      );
    }

    // 生成短码
    const shortCode = nanoid(8);
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shortCode}`;

    // 生成分享卡片图片URL（模拟）
    const imageUrl = `/api/share/${shortCode}/image`;

    return NextResponse.json({
      code: 0,
      data: {
        shareUrl,
        shortCode,
        imageUrl,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天
      },
    });
  } catch (error) {
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
