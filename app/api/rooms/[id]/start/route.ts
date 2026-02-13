import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/api-auth';
import { RoomStoreError, startRoom } from '@/lib/room-store';
import { RoomStreamService } from '@/lib/room-stream-service';

const startRoomBodySchema = z.object({
  topic: z.string().trim().min(1).max(120),
});

function handleRoomError(error: unknown): Response {
  if (error instanceof RoomStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Start room API error:', error);
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

  const parsed = startRoomBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, error: 'INVALID_BODY', message: '请求参数不合法' },
      { status: 400 }
    );
  }

  try {
    const room = startRoom({
      roomId: params.id,
      hostUserId: auth.session.user.id,
      topic: parsed.data.topic,
    });

    const streamService = new RoomStreamService();
    void (async () => {
      try {
        const stream = streamService.createRoomStream({
          roomId: params.id,
          requesterUserId: auth.session.user.id,
          forceRun: true,
        });

        for await (const event of stream) {
          if (event.type === 'done' || event.type === 'error') {
            break;
          }
        }
      } catch (runError) {
        console.error('Room auto-run failed after start:', runError);
      }
    })();

    return NextResponse.json({
      code: 0,
      data: { room },
    });
  } catch (error) {
    return handleRoomError(error);
  }
}
