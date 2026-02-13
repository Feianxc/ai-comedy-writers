import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { RoomStreamService } from '@/lib/room-stream-service';
import { RoomStoreError } from '@/lib/room-store';

function buildErrorResponse(error: unknown): Response {
  if (error instanceof RoomStoreError) {
    return NextResponse.json(
      {
        code: error.status,
        error: error.code,
        message: error.message,
      },
      { status: error.status }
    );
  }

  console.error('Room stream API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '房间流式服务异常' },
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

  const params = await context.params;
  const roomId = params.id;

  try {
    const streamService = new RoomStreamService();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          const roomStream = streamService.createRoomStream({
            roomId,
            requesterUserId: auth.session.user.id,
          });

          for await (const event of roomStream) {
            sendEvent(event.type, event.data);
            if (event.type === 'done' || event.type === 'error') {
              break;
            }
          }
        } catch (error) {
          console.error('Room stream error:', error);
          const storeError =
            error instanceof RoomStoreError
              ? error
              : new RoomStoreError('ROOM_STREAM_FAILED', '流式房间服务失败', 500);

          sendEvent('error', {
            code: storeError.status,
            error: storeError.code,
            message: storeError.message,
          });
        } finally {
          controller.close();
        }
      },
      cancel() {
        // client disconnected
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return buildErrorResponse(error);
  }
}

