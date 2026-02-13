import { nanoid } from 'nanoid';
import { getBattleConfig } from '@/lib/battle/config-loader';
import type {
  BattleAgent,
  BattleEventRecord,
  BattleGameDetail,
  BattleGameSnapshot,
  BattleGameStatus,
  BattlePhase,
  BattleResult,
  BattleRoundSummary,
  BattleSpeech,
} from '@/types/battle';
import { getAllPersonas } from '@/lib/prompts/persona-prompts';
import { prisma } from '@/lib/db';

const WAITING_GAME_TTL_MS = 6 * 60 * 60 * 1000;
const ACTIVE_GAME_TTL_MS = 2 * 60 * 60 * 1000;
const FINISHED_GAME_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_BATTLE_STREAM_EVENT_LOG = 1800;
const BATTLE_STATE_TABLE = 'battle_state_store';
const BATTLE_STATE_SAVE_DEBOUNCE_MS = 280;

interface BattleStateRow {
  game_id: string;
  payload: unknown;
  updated_at: string;
}

const globalBattleStateTable = globalThis as typeof globalThis & {
  __aiComedyBattleStateTableReady?: Promise<void>;
};

const globalBattlePersistState = globalThis as typeof globalThis & {
  __aiComedyBattlePersistQueue?: Map<string, Promise<void>>;
  __aiComedyBattlePersistTimer?: Map<string, ReturnType<typeof setTimeout>>;
};

const persistQueue = globalBattlePersistState.__aiComedyBattlePersistQueue ?? new Map<string, Promise<void>>();
if (!globalBattlePersistState.__aiComedyBattlePersistQueue) {
  globalBattlePersistState.__aiComedyBattlePersistQueue = persistQueue;
}

const persistTimers =
  globalBattlePersistState.__aiComedyBattlePersistTimer ?? new Map<string, ReturnType<typeof setTimeout>>();
if (!globalBattlePersistState.__aiComedyBattlePersistTimer) {
  globalBattlePersistState.__aiComedyBattlePersistTimer = persistTimers;
}

function ensureBattleStateTable(): Promise<void> {
  if (!globalBattleStateTable.__aiComedyBattleStateTableReady) {
    globalBattleStateTable.__aiComedyBattleStateTableReady = prisma
      .$executeRawUnsafe(
        `
          CREATE TABLE IF NOT EXISTS ${BATTLE_STATE_TABLE} (
            game_id TEXT PRIMARY KEY,
            payload JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `
      )
      .then(() => undefined)
      .catch((error) => {
        globalBattleStateTable.__aiComedyBattleStateTableReady = undefined;
        throw error;
      });
  }

  return globalBattleStateTable.__aiComedyBattleStateTableReady;
}

interface BattleStreamEventEntry {
  seq: number;
  event: BattleEventRecord;
}

interface BattleStreamState {
  runId: string | null;
  running: boolean;
  nextSeq: number;
  events: BattleStreamEventEntry[];
}

interface StoredBattleGame {
  snapshot: BattleGameSnapshot;
  speeches: BattleSpeech[];
  rounds: BattleRoundSummary[];
  result: BattleResult | null;
  stream: BattleStreamState;
  updatedAtMs: number;
}

interface BattleStoreState {
  games: Map<string, StoredBattleGame>;
}

interface CreateGameInput {
  hostUserId: string;
  hostName: string;
  hostPersonaId: string;
  hostPersonaLabel: string;
  gameName?: string;
  maxAgents: 3 | 5 | 7;
}

interface JoinGameInput {
  userId: string;
  displayName: string;
  personaId: string;
  personaLabel: string;
}

interface StartGameInput {
  gameId: string;
  hostUserId: string;
  topic: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sanitizeMaxAgents(value: number): 3 | 5 | 7 {
  if (value <= 3) return 3;
  if (value <= 5) return 5;
  return 7;
}

function normalizeGameName(value: string | undefined): string {
  const name = value?.trim();
  return name ? name.slice(0, 40) : '嘴强王者房间';
}

function resolvePersona(personaId: string, fallbackLabel = '榛樿浜鸿'): {
  personaId: string;
  personaLabel: string;
} {
  const normalizedId = personaId.startsWith('persona_') ? personaId.replace(/^persona_/, '') : personaId;
  const all = getAllPersonas();
  const found = all.find((item) => item.id === normalizedId);
  if (found) {
    return {
      personaId: `persona_${found.id}`,
      personaLabel: found.name,
    };
  }

  return {
    personaId,
    personaLabel: fallbackLabel,
  };
}

function getTtl(status: BattleGameStatus): number {
  if (status === 'waiting') return WAITING_GAME_TTL_MS;
  if (status === 'active') return ACTIVE_GAME_TTL_MS;
  return FINISHED_GAME_TTL_MS;
}

const globalBattleStore = globalThis as typeof globalThis & {
  __aiComedyBattleStore?: BattleStoreState;
};

const store = globalBattleStore.__aiComedyBattleStore ?? { games: new Map<string, StoredBattleGame>() };
if (!globalBattleStore.__aiComedyBattleStore) {
  globalBattleStore.__aiComedyBattleStore = store;
}

export class BattleStoreError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'BattleStoreError';
    this.code = code;
    this.status = status;
  }
}

function toStoredBattleGame(value: unknown): StoredBattleGame | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const row = value as Partial<StoredBattleGame>;
  if (!row.snapshot || !row.snapshot.id) {
    return null;
  }

  try {
    const normalized = clone(row) as StoredBattleGame;
    normalized.updatedAtMs = Date.parse(normalized.snapshot.updatedAt);
    if (!Number.isFinite(normalized.updatedAtMs)) {
      normalized.updatedAtMs = Date.now();
    }

    if (!normalized.stream) {
      normalized.stream = {
        runId: null,
        running: false,
        nextSeq: 1,
        events: [],
      };
    }

    if (!Array.isArray(normalized.stream.events)) {
      normalized.stream.events = [];
    }

    if (typeof normalized.stream.nextSeq !== 'number' || normalized.stream.nextSeq <= 0) {
      normalized.stream.nextSeq = normalized.stream.events.length + 1;
    }

    return normalized;
  } catch {
    return null;
  }
}

async function hydrateBattleGame(gameId: string): Promise<StoredBattleGame | null> {
  const inMemory = store.games.get(gameId) ?? null;
  const loaded = await loadBattleState(gameId);
  if (!loaded) {
    return inMemory;
  }

  if (!inMemory) {
    store.games.set(gameId, loaded);
    return loaded;
  }

  const loadedUpdatedAt = Date.parse(loaded.snapshot.updatedAt);
  const memoryUpdatedAt = Date.parse(inMemory.snapshot.updatedAt);

  if (!Number.isFinite(memoryUpdatedAt) || loadedUpdatedAt >= memoryUpdatedAt) {
    store.games.set(gameId, loaded);
    return loaded;
  }

  return inMemory;
}

async function persistBattleState(game: StoredBattleGame): Promise<void> {
  const payload = clone({
    snapshot: game.snapshot,
    speeches: game.speeches,
    rounds: game.rounds,
    result: game.result,
    stream: game.stream,
  });

  await ensureBattleStateTable();
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO ${BATTLE_STATE_TABLE} (game_id, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (game_id)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
      WHERE (
        COALESCE(${BATTLE_STATE_TABLE}.payload #>> '{snapshot,updatedAt}', '')
        <=
        COALESCE(EXCLUDED.payload #>> '{snapshot,updatedAt}', '')
      )
    `,
    game.snapshot.id,
    JSON.stringify(payload)
  );
}

function enqueueBattlePersist(gameId: string): Promise<void> {
  const previous = persistQueue.get(gameId) ?? Promise.resolve();
  const current = previous
    .catch(() => undefined)
    .then(async () => {
      const game = store.games.get(gameId);
      if (!game) {
        return;
      }

      await persistBattleState(game);
    })
    .catch((error) => {
      console.warn('Persist battle state failed, fallback to memory only:', error);
    });

  persistQueue.set(gameId, current);
  return current;
}

type SaveMode = 'debounced' | 'immediate' | 'none';

function saveBattleState(game: StoredBattleGame, mode: SaveMode = 'debounced'): void {
  if (mode === 'none') {
    return;
  }

  const gameId = game.snapshot.id;

  if (mode === 'immediate') {
    const timer = persistTimers.get(gameId);
    if (timer) {
      clearTimeout(timer);
      persistTimers.delete(gameId);
    }

    void enqueueBattlePersist(gameId);
    return;
  }

  const existingTimer = persistTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    persistTimers.delete(gameId);
    void enqueueBattlePersist(gameId);
  }, BATTLE_STATE_SAVE_DEBOUNCE_MS);

  persistTimers.set(gameId, timer);
}

async function loadBattleState(gameId: string): Promise<StoredBattleGame | null> {
  try {
    await ensureBattleStateTable();

    const rows = await prisma.$queryRawUnsafe<BattleStateRow[]>(
      `SELECT game_id, payload, updated_at FROM ${BATTLE_STATE_TABLE} WHERE game_id = $1 LIMIT 1`,
      gameId
    );

    if (rows.length === 0) {
      return null;
    }

    return toStoredBattleGame(rows[0].payload);
  } catch (error) {
    console.warn('Load battle state from db failed, fallback to memory only:', error);
    return null;
  }
}

function getStoredGame(gameId: string): StoredBattleGame {
  const game = store.games.get(gameId);
  if (!game) {
    throw new BattleStoreError('GAME_NOT_FOUND', '游戏不存在或已过期', 404);
  }
  return game;
}

function touch(game: StoredBattleGame, options?: { persist?: SaveMode }) {
  const now = nowIso();
  game.snapshot.updatedAt = now;
  game.updatedAtMs = Date.parse(now);
  saveBattleState(game, options?.persist ?? 'debounced');
}

function resetStreamState(game: StoredBattleGame): void {
  game.stream.runId = null;
  game.stream.running = false;
  game.stream.nextSeq = 1;
  game.stream.events = [];
}

function buildRoundSummaryFromStreamEvents(game: StoredBattleGame): BattleRoundSummary[] {
  const roundMap = new Map<
    number,
    {
      round: number;
      eventId: string;
      eventName: string;
      eventDescription?: string | null;
      eliminations: string[];
      eliminationNames: string[];
      speeches: Array<{ agentId: string; agentName: string; content: string }>;
      ratings: Array<{
        fromAgentId: string;
        fromAgentName: string;
        targetAgentId: string;
        targetAgentName: string;
        delta: number;
      }>;
      penalties: Array<{
        type: 'topic' | 'repeat' | 'pressure';
        agentId?: string;
        agentName?: string;
        value: number;
        reason?: string | null;
      }>;
      goldenLine: {
        agentId: string;
        agentName: string;
        content: string;
        reason?: string | null;
      } | null;
    }
  >();

  const ensureRound = (round: number) => {
    const normalizedRound = Math.max(1, Math.trunc(round));
    const existing = roundMap.get(normalizedRound);
    if (existing) {
      return existing;
    }

    const created = {
      round: normalizedRound,
      eventId: 'event_unknown',
      eventName: '未命名事件',
      eventDescription: null,
      eliminations: [],
      eliminationNames: [],
      speeches: [],
      ratings: [],
      penalties: [],
      goldenLine: null,
    };

    roundMap.set(normalizedRound, created);
    return created;
  };

  for (const entry of game.stream.events) {
    const event = entry.event;
    const data = event.data ?? {};
    const round = typeof data.round === 'number' ? data.round : null;

    if (!round && event.type !== 'battle:pressure_applied') {
      continue;
    }

    const row = ensureRound(round ?? (game.snapshot.currentRound || 1));

    if (event.type === 'battle:event_announced') {
      const eventObj = (data.event ?? {}) as Record<string, unknown>;
      row.eventId = typeof eventObj.id === 'string' ? eventObj.id : row.eventId;
      row.eventName = typeof eventObj.name === 'string' ? eventObj.name : row.eventName;
      row.eventDescription =
        typeof eventObj.description === 'string' ? eventObj.description : row.eventDescription;
      continue;
    }

    if (event.type === 'battle:speech_complete') {
      const agentId = typeof data.agentId === 'string' ? data.agentId : '';
      const agentName = typeof data.agentName === 'string' ? data.agentName : '未知选手';
      const content = typeof data.content === 'string' ? data.content : '';
      if (agentId && content.trim()) {
        row.speeches.push({ agentId, agentName, content });
      }
      continue;
    }

    if (event.type === 'battle:rating_result') {
      const fromAgentId = typeof data.fromAgentId === 'string' ? data.fromAgentId : '';
      const fromAgentName = typeof data.fromAgentName === 'string' ? data.fromAgentName : '未知选手';
      const targetAgentId = typeof data.targetAgentId === 'string' ? data.targetAgentId : '';
      const targetAgentName =
        typeof data.targetAgentName === 'string' ? data.targetAgentName : '未知选手';
      const delta = typeof data.delta === 'number' ? data.delta : 0;
      if (targetAgentId) {
        row.ratings.push({ fromAgentId, fromAgentName, targetAgentId, targetAgentName, delta });
      }
      continue;
    }

    if (event.type === 'battle:topic_penalty') {
      const value = typeof data.penalty === 'number' ? data.penalty : 0;
      if (value > 0) {
        row.penalties.push({
          type: 'topic',
          agentId: typeof data.agentId === 'string' ? data.agentId : undefined,
          agentName: typeof data.agentName === 'string' ? data.agentName : undefined,
          value,
          reason: typeof data.reason === 'string' ? data.reason : '偏离主题',
        });
      }
      continue;
    }

    if (event.type === 'battle:repeat_penalty') {
      const value = typeof data.penalty === 'number' ? data.penalty : 0;
      if (value > 0) {
        row.penalties.push({
          type: 'repeat',
          agentId: typeof data.agentId === 'string' ? data.agentId : undefined,
          agentName: typeof data.agentName === 'string' ? data.agentName : undefined,
          value,
          reason: typeof data.reason === 'string' ? data.reason : '检测到复读',
        });
      }
      continue;
    }

    if (event.type === 'battle:pressure_applied') {
      const value = typeof data.penalty === 'number' ? data.penalty : 0;
      if (value > 0) {
        row.penalties.push({
          type: 'pressure',
          value,
          reason: '回合压力机制',
        });
      }
      continue;
    }

    if (event.type === 'battle:elimination') {
      const agentId = typeof data.agentId === 'string' ? data.agentId : '';
      const agentName = typeof data.agentName === 'string' ? data.agentName : '';
      if (agentId && !row.eliminations.includes(agentId)) {
        row.eliminations.push(agentId);
      }
      if (agentName && !row.eliminationNames.includes(agentName)) {
        row.eliminationNames.push(agentName);
      }
      continue;
    }

    if (event.type === 'battle:round_end') {
      const eliminationIds = Array.isArray(data.eliminations)
        ? data.eliminations.filter((item): item is string => typeof item === 'string')
        : [];
      for (const eliminationId of eliminationIds) {
        if (!row.eliminations.includes(eliminationId)) {
          row.eliminations.push(eliminationId);
        }
      }
    }
  }

  const built = Array.from(roundMap.values())
    .sort((left, right) => left.round - right.round)
    .map((row) => {
      if (!row.goldenLine && row.speeches.length > 0) {
        const bestSpeech = row.speeches
          .slice()
          .sort((left, right) => right.content.length - left.content.length)[0];
        if (bestSpeech) {
          row.goldenLine = {
            agentId: bestSpeech.agentId,
            agentName: bestSpeech.agentName,
            content: bestSpeech.content,
            reason: '历史回放自动生成',
          };
        }
      }

      return {
        round: row.round,
        eventId: row.eventId,
        eventName: row.eventName,
        eventDescription: row.eventDescription,
        eliminations: row.eliminations,
        eliminationNames: row.eliminationNames,
        speeches: row.speeches,
        ratings: row.ratings,
        penalties: row.penalties,
        goldenLine: row.goldenLine,
      } satisfies BattleRoundSummary;
    });

  return built;
}

function ensureHostAgent(input: {
  hostUserId: string;
  hostName: string;
  hostPersonaId: string;
  hostPersonaLabel: string;
}): BattleAgent {
  return {
    id: `agt_${nanoid(10)}`,
    userId: input.hostUserId,
    displayName: input.hostName,
    personaId: input.hostPersonaId,
    personaLabel: input.hostPersonaLabel,
    isBot: false,
    isHost: true,
    role: 'player',
    score: getBattleConfig().initialScore,
    talentId: null,
    talentName: null,
    talentDescription: null,
    itemId: null,
    itemName: null,
    itemDescription: null,
    isAlive: true,
    eliminatedAtRound: null,
    joinedAt: nowIso(),
  };
}

export function pruneBattleGames() {
  const now = Date.now();
  for (const [id, game] of store.games.entries()) {
    const ttl = getTtl(game.snapshot.status);
    if (now - game.updatedAtMs > ttl) {
      const timer = persistTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        persistTimers.delete(id);
      }
      persistQueue.delete(id);
      store.games.delete(id);
    }
  }
}

export function createBattleGame(input: CreateGameInput): BattleGameSnapshot {
  pruneBattleGames();
  const createdAt = nowIso();
  const maxAgents = sanitizeMaxAgents(input.maxAgents);
  const maxRounds = getBattleConfig().maxRounds[maxAgents];

  const snapshot: BattleGameSnapshot = {
    id: `battle_${nanoid(10)}`,
    name: normalizeGameName(input.gameName),
    status: 'waiting',
    phase: 'lobby',
    topic: null,
    maxAgents,
    maxRounds,
    currentRound: 0,
    hostUserId: input.hostUserId,
    hostName: input.hostName,
    agents: [
      ensureHostAgent({
        hostUserId: input.hostUserId,
        hostName: input.hostName,
        hostPersonaId: input.hostPersonaId,
        hostPersonaLabel: input.hostPersonaLabel,
      }),
    ],
    winnerId: null,
    winnerName: null,
    createdAt,
    updatedAt: createdAt,
    startedAt: null,
    endedAt: null,
  };

  store.games.set(snapshot.id, {
    snapshot,
    speeches: [],
    rounds: [],
    result: null,
    stream: {
      runId: null,
      running: false,
      nextSeq: 1,
      events: [],
    },
    updatedAtMs: Date.parse(createdAt),
  });

  const created = store.games.get(snapshot.id);
  if (created) {
    saveBattleState(created, 'immediate');
  }

  return clone(snapshot);
}

export function listBattleGames(): BattleGameSnapshot[] {
  pruneBattleGames();
  return Array.from(store.games.values())
    .map((item) => item.snapshot)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .map((item) => clone(item));
}

export async function listBattleGamesAsync(): Promise<BattleGameSnapshot[]> {
  pruneBattleGames();

  try {
    await ensureBattleStateTable();
    const rows = await prisma.$queryRawUnsafe<BattleStateRow[]>(
      `SELECT game_id, payload, updated_at FROM ${BATTLE_STATE_TABLE} ORDER BY updated_at DESC LIMIT 200`
    );

    for (const row of rows) {
      const game = toStoredBattleGame(row.payload);
      if (game?.snapshot?.id) {
        const inMemory = store.games.get(game.snapshot.id);
        if (!inMemory) {
          store.games.set(game.snapshot.id, game);
          continue;
        }

        const memoryUpdatedAt = Date.parse(inMemory.snapshot.updatedAt);
        const dbUpdatedAt = Date.parse(game.snapshot.updatedAt);
        if (!Number.isFinite(memoryUpdatedAt) || dbUpdatedAt >= memoryUpdatedAt) {
          store.games.set(game.snapshot.id, game);
        }
      }
    }
  } catch (error) {
    console.warn('List battle states from db failed, fallback to memory only:', error);
  }

  return listBattleGames();
}

export async function preloadBattleGame(gameId: string): Promise<boolean> {
  const loaded = await hydrateBattleGame(gameId);
  return Boolean(loaded);
}

export async function flushBattleGame(gameId: string): Promise<void> {
  const game = store.games.get(gameId);
  if (!game) {
    return;
  }

  const timer = persistTimers.get(gameId);
  if (timer) {
    clearTimeout(timer);
    persistTimers.delete(gameId);
  }

  await enqueueBattlePersist(gameId);
}

export function getBattleGame(gameId: string): BattleGameSnapshot {
  pruneBattleGames();
  const game = getStoredGame(gameId);
  touch(game, { persist: 'none' });
  return clone(game.snapshot);
}

export function getBattleGameDetail(gameId: string): BattleGameDetail {
  pruneBattleGames();
  const game = getStoredGame(gameId);
  touch(game, { persist: 'none' });

  if ((game.rounds.length === 0 || game.rounds.every((round) => !round.speeches?.length)) && game.stream.events.length > 0) {
    const rebuilt = buildRoundSummaryFromStreamEvents(game);
    if (rebuilt.length > 0) {
      game.rounds = rebuilt;
      saveBattleState(game, 'immediate');
    }
  }

  return {
    game: clone(game.snapshot),
    speeches: clone(game.speeches),
    rounds: clone(game.rounds),
    result: game.result ? clone(game.result) : null,
  };
}

export function joinBattleGame(gameId: string, input: JoinGameInput): BattleGameSnapshot {
  pruneBattleGames();
  const game = getStoredGame(gameId);

  if (game.snapshot.status !== 'waiting') {
    throw new BattleStoreError('GAME_NOT_JOINABLE', '游戏已开始或结束，不能加入', 409);
  }

  const persona = resolvePersona(input.personaId, input.personaLabel);

  const existing = game.snapshot.agents.find((agent) => agent.userId === input.userId);
  if (existing) {
    existing.displayName = input.displayName;
    existing.personaId = persona.personaId;
    existing.personaLabel = persona.personaLabel;
    touch(game);
    return clone(game.snapshot);
  }

  if (game.snapshot.agents.length >= game.snapshot.maxAgents) {
    throw new BattleStoreError('GAME_FULL', '娓告垙浜烘暟宸叉弧', 409);
  }

  game.snapshot.agents.push({
    id: `agt_${nanoid(10)}`,
    userId: input.userId,
    displayName: input.displayName,
    personaId: persona.personaId,
    personaLabel: persona.personaLabel,
    isBot: false,
    isHost: false,
    role: 'player',
    score: getBattleConfig().initialScore,
    talentId: null,
    talentName: null,
    talentDescription: null,
    itemId: null,
    itemName: null,
    itemDescription: null,
    isAlive: true,
    eliminatedAtRound: null,
    joinedAt: nowIso(),
  });

  touch(game);
  return clone(game.snapshot);
}

export function addBattleBots(gameId: string, hostUserId: string, count: number): BattleGameSnapshot {
  pruneBattleGames();
  const game = getStoredGame(gameId);

  if (game.snapshot.hostUserId !== hostUserId) {
    throw new BattleStoreError('FORBIDDEN', '仅房主可添加机器人', 403);
  }

  if (game.snapshot.status !== 'waiting') {
    throw new BattleStoreError('GAME_NOT_EDITABLE', '游戏已开始，不能添加机器人', 409);
  }

  const toAdd = Math.max(0, Math.min(8, Math.trunc(count)));
  if (toAdd === 0) {
    return clone(game.snapshot);
  }

  const slots = game.snapshot.maxAgents - game.snapshot.agents.length;
  if (slots <= 0) {
    throw new BattleStoreError('GAME_FULL', '娓告垙浜烘暟宸叉弧', 409);
  }

  const actual = Math.min(toAdd, slots);
  const existedBotCount = game.snapshot.agents.filter((agent) => agent.isBot).length;

  const botPersonaIds = ['toxic', 'sarcastic', 'data', 'meme', 'deadpan'];

  for (let index = 0; index < actual; index += 1) {
    const botIndex = existedBotCount + index;
    const persona = resolvePersona(botPersonaIds[botIndex % botPersonaIds.length], 'AI选手');

    game.snapshot.agents.push({
      id: `agt_${nanoid(10)}`,
      userId: null,
      displayName: `机器人${botIndex + 1}`,
      personaId: persona.personaId,
      personaLabel: persona.personaLabel,
      isBot: true,
      isHost: false,
      role: 'player',
      score: getBattleConfig().initialScore,
      talentId: null,
      talentName: null,
      talentDescription: null,
      itemId: null,
      itemName: null,
      itemDescription: null,
      isAlive: true,
      eliminatedAtRound: null,
      joinedAt: nowIso(),
    });
  }

  touch(game);
  return clone(game.snapshot);
}

export function startBattleGame(input: StartGameInput): BattleGameSnapshot {
  pruneBattleGames();
  const game = getStoredGame(input.gameId);

  if (game.snapshot.hostUserId !== input.hostUserId) {
    throw new BattleStoreError('FORBIDDEN', '仅房主可开始游戏', 403);
  }

  if (game.snapshot.status !== 'waiting') {
    throw new BattleStoreError('GAME_ALREADY_STARTED', '游戏已开始或已结束', 409);
  }

  if (game.snapshot.agents.length < 2) {
    throw new BattleStoreError('INSUFFICIENT_AGENTS', '至少需要 2 名玩家', 409);
  }

  const topic = input.topic.trim().slice(0, 120);
  if (!topic) {
    throw new BattleStoreError('INVALID_TOPIC', '璇峰厛杈撳叆鏈満涓婚', 400);
  }

  game.snapshot.topic = topic;
  game.snapshot.status = 'active';
  game.snapshot.phase = 'talent_selection';
  game.snapshot.currentRound = 0;
  game.snapshot.startedAt = nowIso();
  game.snapshot.endedAt = null;
  resetStreamState(game);

  touch(game, { persist: 'immediate' });
  return clone(game.snapshot);
}

export function beginBattleRun(gameId: string): { runId: string; started: boolean } {
  const game = getStoredGame(gameId);

  if (game.snapshot.status !== 'active') {
    throw new BattleStoreError('GAME_NOT_ACTIVE', '游戏尚未开始或已结束', 409);
  }

  if (game.stream.running && game.stream.runId) {
    return {
      runId: game.stream.runId,
      started: false,
    };
  }

  resetStreamState(game);
  game.stream.running = true;
  game.stream.runId = `run_${nanoid(10)}`;
  touch(game, { persist: 'immediate' });

  return {
    runId: game.stream.runId,
    started: true,
  };
}

export function appendBattleStreamEvent(gameId: string, event: BattleEventRecord): number {
  const game = getStoredGame(gameId);
  const entry: BattleStreamEventEntry = {
    seq: game.stream.nextSeq,
    event: clone(event),
  };

  game.stream.nextSeq += 1;
  game.stream.events.push(entry);

  if (game.stream.events.length > MAX_BATTLE_STREAM_EVENT_LOG) {
    game.stream.events.splice(0, game.stream.events.length - MAX_BATTLE_STREAM_EVENT_LOG);
  }

  touch(game);
  return entry.seq;
}

export function listBattleStreamEvents(
  gameId: string,
  afterSeq = 0,
  maxCount = 200
): BattleStreamEventEntry[] {
  const game = getStoredGame(gameId);

  const events = game.stream.events
    .filter((row) => row.seq > afterSeq)
    .slice(0, Math.max(1, Math.trunc(maxCount)));

  return events.map((row) => ({
    seq: row.seq,
    event: clone(row.event),
  }));
}

export function getBattleRunState(gameId: string): {
  runId: string | null;
  running: boolean;
  latestSeq: number;
  status: BattleGameStatus;
} {
  const game = getStoredGame(gameId);

  return {
    runId: game.stream.runId,
    running: game.stream.running,
    latestSeq: Math.max(0, game.stream.nextSeq - 1),
    status: game.snapshot.status,
  };
}

export function endBattleRun(gameId: string, input?: { runId?: string }): void {
  const game = getStoredGame(gameId);

  if (input?.runId && game.stream.runId !== input.runId) {
    return;
  }

  game.stream.running = false;
  game.stream.runId = null;
  touch(game, { persist: 'immediate' });
}

export function updateBattlePhase(gameId: string, phase: BattlePhase): BattleGameSnapshot {
  const game = getStoredGame(gameId);
  game.snapshot.phase = phase;
  touch(game);
  return clone(game.snapshot);
}

export function updateBattleRound(gameId: string, round: number): BattleGameSnapshot {
  const game = getStoredGame(gameId);
  game.snapshot.currentRound = round;
  touch(game);
  return clone(game.snapshot);
}

export function setBattleAgentTalent(
  gameId: string,
  agentId: string,
  talentId: string,
  talentName: string,
  talentDescription: string | null = null
): BattleGameSnapshot {
  const game = getStoredGame(gameId);
  const agent = game.snapshot.agents.find((item) => item.id === agentId);
  if (!agent) {
    throw new BattleStoreError('AGENT_NOT_FOUND', '选手不存在', 404);
  }

  agent.talentId = talentId;
  agent.talentName = talentName;
  agent.talentDescription = talentDescription;
  touch(game);
  return clone(game.snapshot);
}

export function setBattleAgentItem(
  gameId: string,
  agentId: string,
  itemId: string | null,
  itemName: string | null,
  itemDescription: string | null = null,
  scoreDelta = 0
): BattleGameSnapshot {
  const game = getStoredGame(gameId);
  const agent = game.snapshot.agents.find((item) => item.id === agentId);
  if (!agent) {
    throw new BattleStoreError('AGENT_NOT_FOUND', '选手不存在', 404);
  }

  agent.itemId = itemId;
  agent.itemName = itemName;
  agent.itemDescription = itemDescription;
  const minScore = getBattleConfig().eliminationThreshold;
  agent.score = Math.max(minScore, Math.trunc(agent.score + scoreDelta));
  touch(game);
  return clone(game.snapshot);
}

export function updateBattleAgentScore(
  gameId: string,
  agentId: string,
  score: number,
  options?: { role?: 'player' | 'audience'; isAlive?: boolean; eliminatedAtRound?: number | null }
): BattleGameSnapshot {
  const game = getStoredGame(gameId);
  const agent = game.snapshot.agents.find((item) => item.id === agentId);
  if (!agent) {
    throw new BattleStoreError('AGENT_NOT_FOUND', '选手不存在', 404);
  }

  const minScore = getBattleConfig().eliminationThreshold;
  agent.score = Math.max(minScore, Math.trunc(score));
  if (options?.role) {
    agent.role = options.role;
  }
  if (typeof options?.isAlive === 'boolean') {
    agent.isAlive = options.isAlive;
  }
  if (typeof options?.eliminatedAtRound !== 'undefined') {
    agent.eliminatedAtRound = options.eliminatedAtRound;
  }

  touch(game);
  return clone(game.snapshot);
}

export function appendBattleSpeech(
  gameId: string,
  input: Omit<BattleSpeech, 'id' | 'createdAt'>
): BattleSpeech {
  const game = getStoredGame(gameId);
  const speech: BattleSpeech = {
    id: `sp_${nanoid(12)}`,
    round: input.round,
    agentId: input.agentId,
    agentName: input.agentName,
    content: input.content,
    createdAt: nowIso(),
  };

  game.speeches.push(speech);
  touch(game, { persist: 'immediate' });
  return clone(speech);
}

export function appendBattleRoundSummary(
  gameId: string,
  summary: BattleRoundSummary
): BattleRoundSummary {
  const game = getStoredGame(gameId);
  game.rounds.push(summary);
  touch(game, { persist: 'immediate' });
  return clone(summary);
}

export function resetBattleGame(input: { gameId: string; hostUserId: string }): BattleGameSnapshot {
  pruneBattleGames();
  const game = getStoredGame(input.gameId);

  if (game.snapshot.hostUserId !== input.hostUserId) {
    throw new BattleStoreError('FORBIDDEN', '浠呮埧涓诲彲閲嶅紑瀵瑰眬', 403);
  }

  const now = nowIso();
  game.snapshot.status = 'waiting';
  game.snapshot.phase = 'lobby';
  game.snapshot.topic = null;
  game.snapshot.currentRound = 0;
  game.snapshot.winnerId = null;
  game.snapshot.winnerName = null;
  game.snapshot.startedAt = null;
  game.snapshot.endedAt = null;

  game.speeches = [];
  game.rounds = [];
  game.result = null;
  resetStreamState(game);

  for (const agent of game.snapshot.agents) {
    agent.score = getBattleConfig().initialScore;
    agent.talentId = null;
    agent.talentName = null;
    agent.talentDescription = null;
    agent.itemId = null;
    agent.itemName = null;
    agent.itemDescription = null;
    agent.isAlive = true;
    agent.eliminatedAtRound = null;
    agent.role = 'player';
    if (!agent.joinedAt) {
      agent.joinedAt = now;
    }
  }

  touch(game, { persist: 'immediate' });
  return clone(game.snapshot);
}

export function finishBattleGame(
  gameId: string,
  input: Omit<BattleResult, 'completedAt'>
): BattleGameSnapshot {
  const game = getStoredGame(gameId);

  game.snapshot.status = 'finished';
  game.snapshot.phase = 'game_over';
  game.snapshot.winnerId = input.winnerId;
  game.snapshot.winnerName = input.winnerName;
  game.snapshot.endedAt = nowIso();
  game.result = {
    ...input,
    completedAt: nowIso(),
  };
  game.stream.running = false;
  game.stream.runId = null;

  touch(game, { persist: 'immediate' });
  return clone(game.snapshot);
}

export function getBattleResult(gameId: string): BattleResult | null {
  const game = getStoredGame(gameId);
  touch(game, { persist: 'none' });
  return game.result ? clone(game.result) : null;
}

