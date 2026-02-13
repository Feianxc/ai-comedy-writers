import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireApiAuth } from '@/lib/api-auth';
import { createRoom, listRooms, RoomStoreError } from '@/lib/room-store';

const createRoomBodySchema = z.object({
  name: z.string().trim().max(40).optional(),
  maxParticipants: z.number().int().min(2).max(8),
  rounds: z.number().int().min(1).max(5).optional(),
  personaId: z.string().trim().min(1).max(50),
});

function handleRoomError(error: unknown): Response {
  if (error instanceof RoomStoreError) {
    return NextResponse.json(
      { code: error.status, error: error.code, message: error.message },
      { status: error.status }
    );
  }

  console.error('Rooms API error:', error);
  return NextResponse.json(
    { code: 500, error: 'INTERNAL_SERVER_ERROR', message: '服务器繁忙，请稍后再试' },
    { status: 500 }
  );
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const rooms = listRooms();
    return NextResponse.json({
      code: 0,
      data: {
        rooms,
        total: rooms.length,
      },
    });
  } catch (error) {
    return handleRoomError(error);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 400, error: 'INVALID_JSON', message: '请求体 JSON 格式错误' },
      { status: 400 }
    );
  }

  const parsed = createRoomBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 400, error: 'INVALID_BODY', message: '请求参数不合法' },
      { status: 400 }
    );
  }

  const user = auth.session.user;

  try {
    const room = createRoom({
      hostUserId: user.id,
      hostName: user.displayName,
      hostBio: user.bio,
      hostInterests: user.interests,
      roomName: parsed.data.name,
      maxParticipants: parsed.data.maxParticipants,
      rounds: parsed.data.rounds ?? 2,
      personaId: parsed.data.personaId,
    });

    return NextResponse.json({
      code: 0,
      data: { room },
    });
  } catch (error) {
    return handleRoomError(error);
  }
}

