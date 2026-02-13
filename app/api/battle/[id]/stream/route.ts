import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { BattleStreamService } from '@/lib/battle/stream-service';
import { preloadBattleGame, BattleStoreError } from '@/lib/battle/store';

function buildErrorResponse(error: unknown): Response {
  if (error instanceof BattleStoreError) {
    return NextResponse.json(
      {
        code: error.status,
        error: error.code,
        message: error.message,
      },
      { status: error.status }
    );
  }

  console.error('Battle stream API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '大逃杀流式服务异常' },
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

  try {
    await preloadBattleGame(id);

    const streamService = new BattleStreamService();
    const encoder = new TextEncoder();

    try {
      const preview = streamService.createBattleStream({
        gameId: id,
        requesterUserId: auth.session.user.id,
      });
      const first = await preview.next();
      if (!first.done && first.value.type === 'battle:error') {
        const data = first.value.data;
        const status =
          typeof data.code === 'number' && data.code >= 100 && data.code < 600 ? data.code : 409;
        return NextResponse.json(
          {
            code: status,
            error: data.error ?? 'BATTLE_STREAM_ERROR',
            message: data.message ?? '流式连接失败',
          },
          { status }
        );
      }
      if (typeof preview.return === 'function') {
        await preview.return();
      }
    } catch (previewError) {
      if (previewError instanceof BattleStoreError) {
        return NextResponse.json(
          {
            code: previewError.status,
            error: previewError.code,
            message: previewError.message,
          },
          { status: previewError.status }
        );
      }
      throw previewError;
    }

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const keepAliveTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: keep-alive ${Date.now()}\n\n`));
          } catch {
            // noop
          }
        }, 15_000);

        try {
          const eventStream = streamService.createBattleStream({
            gameId: id,
            requesterUserId: auth.session.user.id,
          });

          for await (const event of eventStream) {
            sendEvent(event.type, event.data);
            if (event.type === 'battle:game_over' || event.type === 'battle:error') {
              break;
            }
          }
        } catch (error) {
          console.error('Battle stream runtime error:', error);
          const battleError =
            error instanceof BattleStoreError
              ? error
              : new BattleStoreError('BATTLE_STREAM_FAILED', '流式执行失败', 500);

          sendEvent('battle:error', {
            code: battleError.status,
            error: battleError.code,
            message: battleError.message,
          });
        } finally {
          clearInterval(keepAliveTimer);
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
