import { nanoid } from 'nanoid';
import { getPersonaById } from '@/lib/prompts/persona-prompts';
import type {
  RoomMessage,
  RoomParticipant,
  RoomSessionResult,
  RoomSnapshot,
} from '@/types/room';

const WAITING_ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const ACTIVE_ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const FINISHED_ROOM_TTL_MS = 60 * 60 * 1000;
const MAX_ROOM_STREAM_EVENT_LOG = 1800;
const BOT_PERSONA_IDS = ['meme', 'sarcastic', 'deadpan', 'data', 'toxic'];
const BOT_NAME_POOL = ['梗王', '吐槽王', '冷面评委', '数据君', '阴阳怪气'];

interface RoomStreamEventRecord {
  type: string;
  data: unknown;
}

interface RoomStreamEventEntry {
  seq: number;
  event: RoomStreamEventRecord;
}

interface RoomStreamState {
  runId: string | null;
  running: boolean;
  nextSeq: number;
  events: RoomStreamEventEntry[];
}

interface StoredRoom {
  snapshot: RoomSnapshot;
  messages: RoomMessage[];
  result: RoomSessionResult | null;
  stream: RoomStreamState;
  updatedAtMs: number;
}

interface RoomStoreState {
  rooms: Map<string, StoredRoom>;
}

interface CreateRoomInput {
  hostUserId: string;
  hostName: string;
  hostBio?: string;
  hostInterests?: string[];
  roomName?: string;
  maxParticipants: number;
  rounds: number;
  personaId: string;
}

interface JoinRoomInput {
  userId: string;
  displayName: string;
  bio?: string;
  interests?: string[];
  personaId: string;
}

interface StartRoomInput {
  roomId: string;
  hostUserId: string;
  topic: string;
}

interface AppendMessageInput {
  roomId: string;
  round: number;
  participantId: string;
  role: string;
  content: string;
  isBot: boolean;
  isHost: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeRoomName(name: string | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return '欢乐吐槽房';
  }

  return trimmed.slice(0, 40);
}

function normalizeTopic(topic: string): string {
  return topic.trim().slice(0, 120);
}

function resolvePersona(personaId: string): { personaId: string; personaLabel: string } {
  const normalizedId = personaId.startsWith('persona-')
    ? personaId.replace(/^persona-/, '')
    : personaId;

  const persona = getPersonaById(normalizedId);
  if (persona) {
    return { personaId: persona.id, personaLabel: persona.name };
  }

  const fallback = getPersonaById('toxic');
  return {
    personaId: fallback?.id ?? 'toxic',
    personaLabel: fallback?.name ?? '默认吐槽手',
  };
}

function sanitizeMaxParticipants(value: number): number {
  if (!Number.isFinite(value)) {
    return 4;
  }

  return Math.max(2, Math.min(Math.floor(value), 8));
}

function sanitizeRounds(value: number): number {
  if (!Number.isFinite(value)) {
    return 2;
  }

  return Math.max(1, Math.min(Math.floor(value), 5));
}

function createParticipantId(): string {
  return `ptc_${nanoid(10)}`;
}

function createRoomId(): string {
  return `room_${nanoid(10)}`;
}

function createMessageId(): string {
  return `msg_${nanoid(12)}`;
}

function getRoomTtl(room: RoomSnapshot): number {
  if (room.status === 'waiting') {
    return WAITING_ROOM_TTL_MS;
  }

  if (room.status === 'active') {
    return ACTIVE_ROOM_TTL_MS;
  }

  return FINISHED_ROOM_TTL_MS;
}

function buildBotName(index: number): string {
  const base = BOT_NAME_POOL[index % BOT_NAME_POOL.length];
  const suffix = Math.floor(index / BOT_NAME_POOL.length) + 1;
  return `${base}${suffix}`;
}

function makeHostParticipant(input: CreateRoomInput): RoomParticipant {
  const persona = resolvePersona(input.personaId);
  return {
    id: createParticipantId(),
    userId: input.hostUserId,
    displayName: input.hostName,
    bio: input.hostBio,
    interests: input.hostInterests,
    personaId: persona.personaId,
    personaLabel: persona.personaLabel,
    isBot: false,
    isHost: true,
    joinedAt: nowIso(),
  };
}

function updateRoomTimestamp(room: StoredRoom): void {
  const now = nowIso();
  room.snapshot.updatedAt = now;
  room.updatedAtMs = Date.parse(now);
}

function resetRoomStreamState(room: StoredRoom): void {
  room.stream.runId = null;
  room.stream.running = false;
  room.stream.nextSeq = 1;
  room.stream.events = [];
}

function createStoreState(): RoomStoreState {
  return { rooms: new Map<string, StoredRoom>() };
}

const globalRoomStore = globalThis as typeof globalThis & {
  __aiComedyRoomStore?: RoomStoreState;
};

const roomStore = globalRoomStore.__aiComedyRoomStore ?? createStoreState();
if (!globalRoomStore.__aiComedyRoomStore) {
  globalRoomStore.__aiComedyRoomStore = roomStore;
}

export class RoomStoreError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'RoomStoreError';
    this.code = code;
    this.status = status;
  }
}

function getStoredRoom(roomId: string): StoredRoom {
  const room = roomStore.rooms.get(roomId);
  if (!room) {
    throw new RoomStoreError('ROOM_NOT_FOUND', '房间不存在或已过期', 404);
  }

  return room;
}

export function pruneRooms(): void {
  const now = Date.now();

  for (const [roomId, room] of roomStore.rooms.entries()) {
    const ttl = getRoomTtl(room.snapshot);
    if (now - room.updatedAtMs > ttl) {
      roomStore.rooms.delete(roomId);
    }
  }
}

export function createRoom(input: CreateRoomInput): RoomSnapshot {
  pruneRooms();

  const createdAt = nowIso();
  const host = makeHostParticipant(input);

  const snapshot: RoomSnapshot = {
    id: createRoomId(),
    name: normalizeRoomName(input.roomName),
    status: 'waiting',
    topic: null,
    maxParticipants: sanitizeMaxParticipants(input.maxParticipants),
    rounds: sanitizeRounds(input.rounds),
    hostUserId: input.hostUserId,
    hostName: input.hostName,
    participants: [host],
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    endedAt: null,
  };

  roomStore.rooms.set(snapshot.id, {
    snapshot,
    messages: [],
    result: null,
    stream: {
      runId: null,
      running: false,
      nextSeq: 1,
      events: [],
    },
    updatedAtMs: Date.parse(createdAt),
  });

  return deepClone(snapshot);
}

export function listRooms(): RoomSnapshot[] {
  pruneRooms();

  const snapshots = Array.from(roomStore.rooms.values())
    .map((room) => room.snapshot)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return deepClone(snapshots);
}

export function getRoom(roomId: string): RoomSnapshot {
  pruneRooms();
  const room = getStoredRoom(roomId);
  updateRoomTimestamp(room);
  return deepClone(room.snapshot);
}

export function getRoomMessages(roomId: string): RoomMessage[] {
  pruneRooms();
  const room = getStoredRoom(roomId);
  updateRoomTimestamp(room);
  return deepClone(room.messages);
}

export function getRoomResult(roomId: string): RoomSessionResult | null {
  pruneRooms();
  const room = getStoredRoom(roomId);
  updateRoomTimestamp(room);
  return room.result ? deepClone(room.result) : null;
}

export function getParticipantByUserId(roomId: string, userId: string): RoomParticipant | null {
  pruneRooms();
  const room = getStoredRoom(roomId);
  updateRoomTimestamp(room);
  const participant = room.snapshot.participants.find((item) => item.userId === userId) ?? null;
  return participant ? deepClone(participant) : null;
}

export function joinRoom(roomId: string, input: JoinRoomInput): RoomSnapshot {
  pruneRooms();
  const room = getStoredRoom(roomId);

  if (room.snapshot.status !== 'waiting') {
    throw new RoomStoreError('ROOM_NOT_JOINABLE', '房间已开始或已结束，无法加入', 409);
  }

  const existing = room.snapshot.participants.find((participant) => participant.userId === input.userId);
  if (existing) {
    const persona = resolvePersona(input.personaId);
    existing.displayName = input.displayName;
    existing.bio = input.bio;
    existing.interests = input.interests;
    existing.personaId = persona.personaId;
    existing.personaLabel = persona.personaLabel;
    updateRoomTimestamp(room);
    return deepClone(room.snapshot);
  }

  if (room.snapshot.participants.length >= room.snapshot.maxParticipants) {
    throw new RoomStoreError('ROOM_FULL', '房间人数已满', 409);
  }

  const persona = resolvePersona(input.personaId);
  room.snapshot.participants.push({
    id: createParticipantId(),
    userId: input.userId,
    displayName: input.displayName,
    bio: input.bio,
    interests: input.interests,
    personaId: persona.personaId,
    personaLabel: persona.personaLabel,
    isBot: false,
    isHost: false,
    joinedAt: nowIso(),
  });

  updateRoomTimestamp(room);
  return deepClone(room.snapshot);
}

export function addBots(roomId: string, hostUserId: string, count: number): RoomSnapshot {
  pruneRooms();
  const room = getStoredRoom(roomId);

  if (room.snapshot.hostUserId !== hostUserId) {
    throw new RoomStoreError('FORBIDDEN', '只有房主可以添加机器人', 403);
  }

  if (room.snapshot.status !== 'waiting') {
    throw new RoomStoreError('ROOM_NOT_EDITABLE', '房间已开始，不能再添加机器人', 409);
  }

  const requested = Math.max(0, Math.min(Math.floor(count), 8));
  if (requested === 0) {
    return deepClone(room.snapshot);
  }

  const remainingSlots = room.snapshot.maxParticipants - room.snapshot.participants.length;
  if (remainingSlots <= 0) {
    throw new RoomStoreError('ROOM_FULL', '房间人数已满，无法添加机器人', 409);
  }

  const actualCount = Math.min(requested, remainingSlots);
  const existingBotCount = room.snapshot.participants.filter((participant) => participant.isBot).length;

  for (let index = 0; index < actualCount; index += 1) {
    const botIndex = existingBotCount + index;
    const personaId = BOT_PERSONA_IDS[botIndex % BOT_PERSONA_IDS.length];
    const persona = resolvePersona(personaId);

    room.snapshot.participants.push({
      id: createParticipantId(),
      userId: null,
      displayName: buildBotName(botIndex),
      personaId: persona.personaId,
      personaLabel: persona.personaLabel,
      isBot: true,
      isHost: false,
      joinedAt: nowIso(),
    });
  }

  updateRoomTimestamp(room);
  return deepClone(room.snapshot);
}

export function startRoom(input: StartRoomInput): RoomSnapshot {
  pruneRooms();
  const room = getStoredRoom(input.roomId);

  if (room.snapshot.hostUserId !== input.hostUserId) {
    throw new RoomStoreError('FORBIDDEN', '只有房主可以开始比赛', 403);
  }

  if (room.snapshot.status !== 'waiting') {
    throw new RoomStoreError('ROOM_ALREADY_STARTED', '房间已开始或已结束', 409);
  }

  if (room.snapshot.participants.length < 2) {
    throw new RoomStoreError('INSUFFICIENT_PARTICIPANTS', '至少需要 2 名参赛者', 409);
  }

  const topic = normalizeTopic(input.topic);
  if (!topic) {
    throw new RoomStoreError('INVALID_TOPIC', '请先输入本场吐槽主题', 400);
  }

  room.snapshot.topic = topic;
  room.snapshot.status = 'active';
  room.snapshot.startedAt = nowIso();
  room.snapshot.endedAt = null;
  resetRoomStreamState(room);

  updateRoomTimestamp(room);
  return deepClone(room.snapshot);
}

export function beginRoomRun(
  roomId: string,
  allowStart = true
): { runId: string | null; started: boolean } {
  const room = getStoredRoom(roomId);

  if (room.snapshot.status !== 'active') {
    throw new RoomStoreError('ROOM_NOT_ACTIVE', '房间尚未开始或已结束', 409);
  }

  if (room.stream.running && room.stream.runId) {
    return {
      runId: room.stream.runId,
      started: false,
    };
  }

  if (!allowStart) {
    return {
      runId: null,
      started: false,
    };
  }

  resetRoomStreamState(room);
  room.stream.running = true;
  room.stream.runId = `room_run_${nanoid(10)}`;
  updateRoomTimestamp(room);

  return {
    runId: room.stream.runId,
    started: true,
  };
}

export function appendRoomStreamEvent(roomId: string, event: RoomStreamEventRecord): number {
  const room = getStoredRoom(roomId);
  const entry: RoomStreamEventEntry = {
    seq: room.stream.nextSeq,
    event: deepClone(event),
  };

  room.stream.nextSeq += 1;
  room.stream.events.push(entry);

  if (room.stream.events.length > MAX_ROOM_STREAM_EVENT_LOG) {
    room.stream.events.splice(0, room.stream.events.length - MAX_ROOM_STREAM_EVENT_LOG);
  }

  updateRoomTimestamp(room);
  return entry.seq;
}

export function listRoomStreamEvents(
  roomId: string,
  afterSeq = 0,
  maxCount = 200
): RoomStreamEventEntry[] {
  const room = getStoredRoom(roomId);

  const rows = room.stream.events
    .filter((entry) => entry.seq > afterSeq)
    .slice(0, Math.max(1, Math.trunc(maxCount)));

  return rows.map((entry) => ({
    seq: entry.seq,
    event: deepClone(entry.event),
  }));
}

export function getRoomRunState(roomId: string): {
  runId: string | null;
  running: boolean;
  latestSeq: number;
  status: RoomSnapshot['status'];
} {
  const room = getStoredRoom(roomId);
  return {
    runId: room.stream.runId,
    running: room.stream.running,
    latestSeq: Math.max(0, room.stream.nextSeq - 1),
    status: room.snapshot.status,
  };
}

export function endRoomRun(roomId: string, input?: { runId?: string }): void {
  const room = getStoredRoom(roomId);

  if (input?.runId && room.stream.runId !== input.runId) {
    return;
  }

  room.stream.running = false;
  room.stream.runId = null;
  updateRoomTimestamp(room);
}

export function appendRoomMessage(input: AppendMessageInput): RoomMessage {
  const room = getStoredRoom(input.roomId);

  const message: RoomMessage = {
    id: createMessageId(),
    round: input.round,
    participantId: input.participantId,
    role: input.role,
    content: input.content,
    isBot: input.isBot,
    isHost: input.isHost,
    timestamp: nowIso(),
  };

  room.messages.push(message);
  updateRoomTimestamp(room);
  return deepClone(message);
}

export function finishRoom(roomId: string, result: Omit<RoomSessionResult, 'completedAt'>): RoomSnapshot {
  const room = getStoredRoom(roomId);

  room.snapshot.status = 'finished';
  room.snapshot.endedAt = nowIso();
  room.result = {
    ...result,
    completedAt: nowIso(),
  };
  room.stream.running = false;
  room.stream.runId = null;

  updateRoomTimestamp(room);
  return deepClone(room.snapshot);
}
