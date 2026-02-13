import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/api-auth';
import { getRoom, getRoomMessages, getRoomResult, RoomStoreError } from '@/lib/room-store';

function handleRoomError(error: unknown): Response {
  if (error instanceof RoomStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Room detail API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '服务器繁忙，请稍后再试' },
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
  const requesterId = auth.session.user.id;

  try {
    const room = getRoom(roomId);
    const self = room.participants.find((participant) => participant.userId === requesterId);

    if (!self) {
      return NextResponse.json(
        { code: 403, error: 'FORBIDDEN', message: '你不在该房间中，无法查看详情' },
        { status: 403 }
      );
    }

    const messages = getRoomMessages(roomId);
    const result = getRoomResult(roomId);

    return NextResponse.json({
      code: 0,
      data: {
        room,
        messages,
        result,
      },
    });
  } catch (error) {
    return handleRoomError(error);
  }
}

