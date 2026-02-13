import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/api-auth';
import { addBots, RoomStoreError } from '@/lib/room-store';

const addBotsBodySchema = z.object({
  count: z.number().int().min(1).max(8),
});

function handleRoomError(error: unknown): Response {
  if (error instanceof RoomStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Add bots API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '服务器繁忙，请稍后再试' },
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

  const params = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 400, error: 'INVALID_JSON', message: '请求体 JSON 格式错误' },
      { status: 400 }
    );
  }

  const parsed = addBotsBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, error: 'INVALID_BODY', message: '请求参数不合法' },
      { status: 400 }
    );
  }

  try {
    const room = addBots(params.id, auth.session.user.id, parsed.data.count);
    return NextResponse.json({
      code: 0,
      data: { room },
    });
  } catch (error) {
    return handleRoomError(error);
  }
}

