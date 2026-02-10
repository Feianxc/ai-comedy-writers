import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/services/ai-service';
import { GenerateRoastRequest, RoastSession } from '@/types';
import { requireApiAuth } from '@/lib/api-auth';

/**
 * POST /api/generate
 * 批量生成吐槽会话
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request);
    if (!authResult.ok) {
      return authResult.response;
    }
    const body: GenerateRoastRequest = await request.json();

    // 验证请求
    if (!body.topic || typeof body.topic !== 'string') {
      return NextResponse.json(
        { code: 400, error: 'Invalid topic', message: '话题不能为空' },
        { status: 400 }
      );
    }

    if (!body.userAgent || !body.userAgent.displayName) {
      return NextResponse.json(
        { code: 400, error: 'Invalid userAgent', message: '用户信息不完整' },
        { status: 400 }
      );
    }

    // 初始化AI服务
    const aiService = new AIService();

    // 生成吐槽会话
    const session: RoastSession = await aiService.generateRoast({
      topic: body.topic,
      userAgent: body.userAgent,
      userPersona: body.userPersona,
    });

    return NextResponse.json({
      code: 0,
      data: session,
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      {
        code: 500,
        error: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : '生成失败',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate
 * 健康检查
 */
export async function GET() {
  try {
    const aiService = new AIService();
    const isHealthy = await aiService.healthCheck();

    return NextResponse.json({
      code: 0,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { code: 500, error: 'HEALTH_CHECK_FAILED', message: '健康检查失败' },
      { status: 500 }
    );
  }
}
