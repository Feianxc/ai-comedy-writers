import { nanoid } from 'nanoid';
import { AIService } from '@/lib/services/ai-service';
import {
  appendRoomStreamEvent,
  appendRoomMessage,
  beginRoomRun,
  endRoomRun,
  finishRoom,
  getRoom,
  getRoomMessages,
  getRoomRunState,
  getRoomResult,
  listRoomStreamEvents,
  RoomStoreError,
} from '@/lib/room-store';
import type {
  RoomMessage,
  RoomParticipant,
  RoomScoreItem,
  RoomSessionResult,
  RoomSnapshot,
} from '@/types/room';

interface RoomStreamRequest {
  roomId: string;
  requesterUserId: string;
  forceRun?: boolean;
}

type RoomStreamEventType =
  | 'open'
  | 'room_info'
  | 'round_start'
  | 'round_event'
  | 'tool_action'
  | 'message_start'
  | 'token'
  | 'message_complete'
  | 'rating_summary'
  | 'ghost_action'
  | 'score_update'
  | 'round_end'
  | 'done'
  | 'error';

interface RoomStreamEvent {
  type: RoomStreamEventType;
  data: unknown;
}

interface BaseAIService {
  generateStream(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<string>;
}

type RatingType = 'blast' | 'funny' | 'meh' | 'boring';
type ToolType = 'shield' | 'callout' | 'steal' | 'none';
type RoundEventType =
  | 'laugh_rain'
  | 'double_happy'
  | 'laugh_tax'
  | 'strict_review'
  | 'anonymous_review'
  | 'reverse_world';
type GhostActionType = 'curse' | 'bless';

interface BattleParticipantState {
  participant: RoomParticipant;
  score: number;
  alive: boolean;
  ghost: boolean;
  shieldActive: boolean;
  scoreGainMultiplier: number;
  scoreLossMultiplier: number;
}

interface ToolPlan {
  actorId: string;
  type: ToolType;
  targetId?: string;
}

interface GhostPlan {
  actorId: string;
  type: GhostActionType;
  targetId: string;
}

interface RatingRecord {
  fromId: string;
  toId: string;
  type: RatingType;
}

const INITIAL_SCORE = 100;
const ELIMINATION_SCORE = 0;
const TOOL_COST: Record<Exclude<ToolType, 'none'>, number> = {
  shield: 15,
  callout: 20,
  steal: 25,
};
const TOOL_STEAL_VALUE = 15;
const CALLOUT_EXTRA_PENALTY = 15;

const EVENT_META: Record<RoundEventType, { emoji: string; name: string; effect: string }> = {
  laugh_rain: { emoji: '🟢', name: '笑点雨', effect: '全员 +10' },
  double_happy: { emoji: '🟢', name: '双倍快乐', effect: '正面评价翻倍' },
  laugh_tax: { emoji: '🔴', name: '笑点税', effect: '全员 -10' },
  strict_review: { emoji: '🔴', name: '严苛评审', effect: '无聊评价翻倍' },
  anonymous_review: { emoji: '🟣', name: '匿名评价', effect: '评价不显示来源' },
  reverse_world: { emoji: '🟣', name: '反转世界', effect: '评价效果反转' },
};

const RATING_SCORE_BASE: Record<RatingType, number> = {
  blast: 15,
  funny: 5,
  meh: -5,
  boring: -15,
};

const MAX_ROUNDS_SAFE_GUARD = 12;
const STREAM_TIMEOUT_MS = 25_000;
const SUBSCRIBER_POLL_MS = 240;
const SUBSCRIBER_WAIT_TIMEOUT_MS = 60_000;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mapToScoreBoard(states: Map<string, BattleParticipantState>): RoomScoreItem[] {
  return Array.from(states.values())
    .map((state) => ({
      participantId: state.participant.id,
      role: state.participant.displayName,
      score: Math.round(state.score),
      isAlive: state.alive,
      isGhost: state.ghost,
    }))
    .sort((left, right) => right.score - left.score);
}

function getAliveStates(states: Map<string, BattleParticipantState>): BattleParticipantState[] {
  return Array.from(states.values()).filter((state) => state.alive);
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRoundEvent(round: number): RoundEventType {
  const eventList: RoundEventType[] = [
    'laugh_rain',
    'double_happy',
    'laugh_tax',
    'strict_review',
    'anonymous_review',
    'reverse_world',
  ];

  return eventList[(round - 1) % eventList.length];
}

function chooseTool(
  actor: BattleParticipantState,
  aliveStates: BattleParticipantState[]
): ToolPlan {
  if (!actor.alive) {
    return { actorId: actor.participant.id, type: 'none' };
  }

  const selfId = actor.participant.id;
  const opponents = aliveStates.filter((item) => item.participant.id !== selfId);
  if (opponents.length === 0) {
    return { actorId: selfId, type: 'none' };
  }

  if (actor.score >= 60 && actor.score <= 120) {
    if (actor.score >= TOOL_COST.steal + 20 && Math.random() < 0.35) {
      const target = opponents.sort((a, b) => b.score - a.score)[0];
      return { actorId: selfId, type: 'steal', targetId: target.participant.id };
    }

    if (actor.score >= TOOL_COST.callout + 20 && Math.random() < 0.25) {
      const target = pickRandom(opponents);
      return { actorId: selfId, type: 'callout', targetId: target.participant.id };
    }
  }

  if (actor.score <= 45 && actor.score >= TOOL_COST.shield && Math.random() < 0.6) {
    return { actorId: selfId, type: 'shield' };
  }

  return { actorId: selfId, type: 'none' };
}

function chooseGhostAction(
  ghost: BattleParticipantState,
  states: Map<string, BattleParticipantState>
): GhostPlan | null {
  if (!ghost.ghost) {
    return null;
  }

  const alive = getAliveStates(states);
  if (alive.length === 0) {
    return null;
  }

  const shouldBless = Math.random() < 0.5;
  if (shouldBless) {
    const weakest = alive.sort((a, b) => a.score - b.score)[0];
    return {
      actorId: ghost.participant.id,
      type: 'bless',
      targetId: weakest.participant.id,
    };
  }

  const strongest = alive.sort((a, b) => b.score - a.score)[0];
  return {
    actorId: ghost.participant.id,
    type: 'curse',
    targetId: strongest.participant.id,
  };
}

function roundEffectForRating(value: number, eventType: RoundEventType): number {
  let changed = value;

  if (eventType === 'double_happy' && value > 0) {
    changed = value * 2;
  }

  if (eventType === 'strict_review' && value < 0 && value <= -15) {
    changed = value * 2;
  }

  if (eventType === 'reverse_world') {
    changed = changed * -1;
  }

  return changed;
}

function chooseRatingTypeForTarget(targetScore: number): RatingType {
  if (targetScore >= 120) {
    return Math.random() < 0.5 ? 'meh' : 'boring';
  }
  if (targetScore <= 35) {
    return Math.random() < 0.4 ? 'funny' : 'blast';
  }

  const pool: RatingType[] = ['blast', 'funny', 'meh', 'boring'];
  return pickRandom(pool);
}

function ensureNotNegativeScore(value: number): number {
  return Math.max(0, Math.round(value));
}

function buildRoastPrompt(input: {
  room: RoomSnapshot;
  speaker: BattleParticipantState;
  round: number;
  aliveStates: BattleParticipantState[];
  eventType: RoundEventType;
  history: RoomMessage[];
  announcedTool?: ToolPlan;
}): string {
  const others = input.aliveStates
    .filter((item) => item.participant.id !== input.speaker.participant.id)
    .map((item) => `${item.participant.displayName}(笑点${ensureNotNegativeScore(item.score)})`)
    .join('、');

  const event = EVENT_META[input.eventType];
  const toolHint =
    input.announcedTool && input.announcedTool.type !== 'none'
      ? `你本轮宣布道具：${input.announcedTool.type}${input.announcedTool.targetId ? `，目标ID=${input.announcedTool.targetId}` : ''}`
      : '你本轮未使用道具';

  const recent = input.history
    .slice(-6)
    .map((item) => `${item.role}: ${item.content}`)
    .join('\n');

  return [
    `你是吐槽房间中的选手「${input.speaker.participant.displayName}」。`,
    `当前主题：${input.room.topic ?? ''}`,
    `当前轮次：第${input.round}轮。`,
    `轮次事件：${event.emoji}${event.name}（${event.effect}）。`,
    `你当前笑点：${ensureNotNegativeScore(input.speaker.score)}。`,
    `场上存活选手：${others || '暂无其他选手'}。`,
    toolHint,
    '要求：输出 1 句中文吐槽（30-90字），要有梗、有攻击性但不违规，必须@至少1个在场选手。',
    '只输出台词内容，不要解释，不要加前缀。',
    recent ? `最近发言：\n${recent}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function cleanContent(content: string): string {
  return content
    .trim()
    .replace(/^["'“”]|["'“”]$/g, '')
    .replace(/\n+/g, ' ')
    .slice(0, 280);
}

function fallbackLine(speaker: BattleParticipantState, roomTopic: string): string {
  return `@全场 ${roomTopic}这题我接了：${speaker.participant.displayName}状态拉满，谁来接招？`;
}

export class RoomStreamService {
  private aiService: AIService;

  constructor() {
    this.aiService = new AIService();
  }

  private getProvider(): BaseAIService {
    return this.aiService.getProviderService();
  }

  private async nextWithTimeout(
    iterator: AsyncIterator<string>,
    timeoutMs: number
  ): Promise<IteratorResult<string>> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('STREAM_STEP_TIMEOUT')), timeoutMs);

      iterator
        .next()
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private async *withTimeout(stream: AsyncIterable<string>): AsyncGenerator<string> {
    const iterator = stream[Symbol.asyncIterator]();

    try {
      while (true) {
        const next = await this.nextWithTimeout(iterator, STREAM_TIMEOUT_MS);
        if (next.done) {
          return;
        }
        yield next.value;
      }
    } finally {
      if (typeof iterator.return === 'function') {
        try {
          await iterator.return();
        } catch {
          // ignore iterator close errors
        }
      }
    }
  }

  private ensureReadableRoom(roomId: string, requesterUserId: string): RoomSnapshot {
    const room = getRoom(roomId);

    const self = room.participants.find((item) => item.userId === requesterUserId);
    if (!self) {
      throw new RoomStoreError('FORBIDDEN', '你不在该房间中，无法观看对局', 403);
    }

    if (room.status === 'waiting') {
      throw new RoomStoreError('ROOM_NOT_STARTED', '房间尚未开始', 409);
    }

    return room;
  }

  private buildInitialStates(room: RoomSnapshot): Map<string, BattleParticipantState> {
    const map = new Map<string, BattleParticipantState>();

    for (const participant of room.participants) {
      map.set(participant.id, {
        participant: clone(participant),
        score: INITIAL_SCORE,
        alive: true,
        ghost: false,
        shieldActive: false,
        scoreGainMultiplier: 1,
        scoreLossMultiplier: 1,
      });
    }

    return map;
  }

  private applyRoundGlobalEvent(states: Map<string, BattleParticipantState>, event: RoundEventType): void {
    if (event === 'laugh_rain') {
      for (const state of states.values()) {
        if (state.alive) {
          state.score += 10;
        }
      }
      return;
    }

    if (event === 'laugh_tax') {
      for (const state of states.values()) {
        if (state.alive) {
          state.score -= 10;
        }
      }
    }
  }

  private applyTool(
    states: Map<string, BattleParticipantState>,
    plan: ToolPlan
  ): { detail: string; calloutMapUpdate?: Map<string, string> } {
    const actor = states.get(plan.actorId);
    if (!actor || !actor.alive || plan.type === 'none') {
      return { detail: `${actor?.participant.displayName ?? '选手'} 未使用道具` };
    }

    if (plan.type === 'shield') {
      if (actor.score < TOOL_COST.shield) {
        return { detail: `${actor.participant.displayName} 想用护盾但笑点不足` };
      }

      actor.score -= TOOL_COST.shield;
      actor.shieldActive = true;
      return { detail: `${actor.participant.displayName} 使用了护盾（-15，本轮免疫“无聊”）` };
    }

    if (!plan.targetId) {
      return { detail: `${actor.participant.displayName} 道具目标无效` };
    }

    const target = states.get(plan.targetId);
    if (!target || !target.alive) {
      return { detail: `${actor.participant.displayName} 的道具目标不存在或已淘汰` };
    }

    if (plan.type === 'callout') {
      if (actor.score < TOOL_COST.callout) {
        return { detail: `${actor.participant.displayName} 想用点名但笑点不足` };
      }

      actor.score -= TOOL_COST.callout;
      const calloutMap = new Map<string, string>();
      calloutMap.set(target.participant.id, actor.participant.id);
      return {
        detail: `${actor.participant.displayName} 点名 ${target.participant.displayName} 必须回应，未回应额外-15`,
        calloutMapUpdate: calloutMap,
      };
    }

    if (plan.type === 'steal') {
      if (actor.score < TOOL_COST.steal) {
        return { detail: `${actor.participant.displayName} 想用窃取但笑点不足` };
      }

      actor.score -= TOOL_COST.steal;
      const amount = Math.min(TOOL_STEAL_VALUE, Math.max(0, target.score));
      target.score -= amount;
      actor.score += amount;

      return {
        detail: `${actor.participant.displayName} 对 ${target.participant.displayName} 发动窃取（净转移${amount}）`,
      };
    }

    return { detail: `${actor.participant.displayName} 未使用道具` };
  }

  private async *runRoomEngine(room: RoomSnapshot): AsyncGenerator<RoomStreamEvent> {
    // replay/initial sync is handled by createRoomStream()

    let provider: BaseAIService | null = null;
    try {
      provider = this.getProvider();
    } catch (providerError) {
      console.warn('Room stream provider unavailable, fallback mode enabled:', providerError);
    }
    const allMessages: RoomMessage[] = [];
    const states = this.buildInitialStates(room);

    const maxRounds = Math.max(2, Math.min(MAX_ROUNDS_SAFE_GUARD, room.rounds * 2));

    let round = 1;
    while (getAliveStates(states).length > 1 && round <= maxRounds) {
      const aliveAtRoundStart = getAliveStates(states);
      if (aliveAtRoundStart.length <= 1) {
        break;
      }

      for (const state of states.values()) {
        state.shieldActive = false;
        state.scoreGainMultiplier = 1;
        state.scoreLossMultiplier = 1;
      }

      const roundEvent = pickRoundEvent(round);
      const roundEventMeta = EVENT_META[roundEvent];

      const roundStartEvent: RoomStreamEvent = { type: 'round_start', data: { round } };
      appendRoomStreamEvent(room.id, roundStartEvent);
      yield roundStartEvent;

      const roundEventPayload: RoomStreamEvent = {
        type: 'round_event',
        data: {
          round,
          eventType: roundEvent,
          eventName: roundEventMeta.name,
          emoji: roundEventMeta.emoji,
          effect: roundEventMeta.effect,
        },
      };
      appendRoomStreamEvent(room.id, roundEventPayload);
      yield roundEventPayload;

      this.applyRoundGlobalEvent(states, roundEvent);

      const calloutTargets = new Map<string, string>();
      const plannedTools = new Map<string, ToolPlan>();
      for (const actor of aliveAtRoundStart) {
        const aliveNow = getAliveStates(states);
        const plan = chooseTool(actor, aliveNow);
        plannedTools.set(actor.participant.id, plan);
        const applied = this.applyTool(states, plan);

        if (applied.calloutMapUpdate) {
          for (const [key, value] of applied.calloutMapUpdate.entries()) {
            calloutTargets.set(key, value);
          }
        }

        const toolActionEvent: RoomStreamEvent = {
          type: 'tool_action',
          data: {
            round,
            actorId: actor.participant.id,
            actorName: actor.participant.displayName,
            toolType: plan.type,
            targetId: plan.targetId,
            detail: applied.detail,
          },
        };
        appendRoomStreamEvent(room.id, toolActionEvent);
        yield toolActionEvent;
      }

      const roundMessages = new Map<string, string>();

      for (const speaker of getAliveStates(states)) {
        const messageStartEvent: RoomStreamEvent = {
          type: 'message_start',
          data: {
            round,
            role: speaker.participant.displayName,
            participantId: speaker.participant.id,
            isBot: speaker.participant.isBot,
            isHost: speaker.participant.isHost,
          },
        };
        appendRoomStreamEvent(room.id, messageStartEvent);
        yield messageStartEvent;

        const prompt = buildRoastPrompt({
          room,
          speaker,
          round,
          aliveStates: getAliveStates(states),
          eventType: roundEvent,
          history: allMessages,
          announcedTool: plannedTools.get(speaker.participant.id),
        });

        let content = '';
        if (provider) {
          try {
            const stream = provider.generateStream('', prompt, { temperature: 0.88, maxTokens: 220 });
            for await (const token of this.withTimeout(stream)) {
              content += token;
              const tokenEvent: RoomStreamEvent = {
                type: 'token',
                data: {
                  round,
                  role: speaker.participant.displayName,
                  participantId: speaker.participant.id,
                  content: token,
                  isBot: speaker.participant.isBot,
                  isHost: speaker.participant.isHost,
                },
              };
              appendRoomStreamEvent(room.id, tokenEvent);
              yield tokenEvent;
            }
          } catch (error) {
            console.error('Roast stream token failed, fallback used:', error);
          }
        }

        const finalContent = cleanContent(content) || fallbackLine(speaker, room.topic ?? '这个话题');
        const persisted = appendRoomMessage({
          roomId: room.id,
          round,
          participantId: speaker.participant.id,
          role: speaker.participant.displayName,
          content: finalContent,
          isBot: speaker.participant.isBot,
          isHost: speaker.participant.isHost,
        });

        allMessages.push(persisted);
        roundMessages.set(speaker.participant.id, finalContent);

        const messageCompleteEvent: RoomStreamEvent = {
          type: 'message_complete',
          data: {
            round,
            role: speaker.participant.displayName,
            participantId: speaker.participant.id,
            content: finalContent,
            isBot: speaker.participant.isBot,
            isHost: speaker.participant.isHost,
          },
        };
        appendRoomStreamEvent(room.id, messageCompleteEvent);
        yield messageCompleteEvent;
      }

      const ratingRecords: RatingRecord[] = [];
      for (const rater of getAliveStates(states)) {
        for (const target of getAliveStates(states)) {
          if (rater.participant.id === target.participant.id) {
            continue;
          }

          const chosenType = chooseRatingTypeForTarget(target.score);
          ratingRecords.push({
            fromId: rater.participant.id,
            toId: target.participant.id,
            type: chosenType,
          });
        }
      }

      for (const record of ratingRecords) {
        const target = states.get(record.toId);
        if (!target || !target.alive) {
          continue;
        }

        if (record.type === 'boring' && target.shieldActive) {
          continue;
        }

        let delta = RATING_SCORE_BASE[record.type];
        delta = roundEffectForRating(delta, roundEvent);

        if (delta > 0) {
          delta *= target.scoreGainMultiplier;
        } else {
          delta *= target.scoreLossMultiplier;
        }

        target.score += delta;
      }

      for (const [targetId, sourceId] of calloutTargets.entries()) {
        const source = states.get(sourceId);
        const target = states.get(targetId);

        if (!source || !target || !target.alive) {
          continue;
        }

        const text = roundMessages.get(targetId) ?? '';
        const requiredMention = `@${source.participant.displayName}`;
        if (!text.includes(requiredMention)) {
          target.score -= CALLOUT_EXTRA_PENALTY;
        }
      }

      for (const ghost of Array.from(states.values()).filter((item) => item.ghost)) {
        const plan = chooseGhostAction(ghost, states);
        if (!plan) {
          continue;
        }

        const target = states.get(plan.targetId);
        if (!target || !target.alive) {
          continue;
        }

        if (plan.type === 'curse') {
          target.scoreGainMultiplier = 0.5;
        } else {
          target.scoreGainMultiplier = 1.5;
        }

        const ghostEvent: RoomStreamEvent = {
          type: 'ghost_action',
          data: {
            round,
            actorId: ghost.participant.id,
            actorName: ghost.participant.displayName,
            actionType: plan.type,
            targetId: target.participant.id,
            targetName: target.participant.displayName,
            detail:
              plan.type === 'curse'
                ? `${ghost.participant.displayName} 诅咒 ${target.participant.displayName}（本轮收益减半）`
                : `${ghost.participant.displayName} 祝福 ${target.participant.displayName}（本轮收益+50%）`,
          },
        };
        appendRoomStreamEvent(room.id, ghostEvent);
        yield ghostEvent;
      }

      for (const state of states.values()) {
        if (state.alive && state.score <= ELIMINATION_SCORE) {
          state.alive = false;
          state.ghost = true;
          state.score = 0;
        } else {
          state.score = ensureNotNegativeScore(state.score);
        }

        state.scoreGainMultiplier = 1;
        state.scoreLossMultiplier = 1;
      }

      const scoreboard = mapToScoreBoard(states);
      const ratingSummaryEvent: RoomStreamEvent = {
        type: 'rating_summary',
        data: {
          round,
          totalRatings: ratingRecords.length,
          anonymous: roundEvent === 'anonymous_review',
        },
      };
      appendRoomStreamEvent(room.id, ratingSummaryEvent);
      yield ratingSummaryEvent;

      const scoreUpdateEvent: RoomStreamEvent = {
        type: 'score_update',
        data: {
          round,
          scores: scoreboard,
        },
      };
      appendRoomStreamEvent(room.id, scoreUpdateEvent);
      yield scoreUpdateEvent;

      const roundEndEvent: RoomStreamEvent = {
        type: 'round_end',
        data: {
          round,
          alive: scoreboard.filter((item) => item.isAlive).length,
          ghosts: scoreboard.filter((item) => item.isGhost).length,
        },
      };
      appendRoomStreamEvent(room.id, roundEndEvent);
      yield roundEndEvent;

      round += 1;
    }

    const finalScoreboard = mapToScoreBoard(states);
    const winner = finalScoreboard.find((item) => item.isAlive) ?? finalScoreboard[0];

    const resultPayload: Omit<RoomSessionResult, 'completedAt'> = {
      sessionId: `room_session_${nanoid(10)}`,
      topic: room.topic ?? '',
      participants: room.participants.map((item) => item.displayName),
      messages: allMessages,
      totalRounds: Math.max(1, round - 1),
      winnerId: winner?.participantId,
      winnerName: winner?.role,
      scores: finalScoreboard,
    };

    finishRoom(room.id, resultPayload);
    const doneResult = getRoomResult(room.id);

    const doneEvent: RoomStreamEvent = {
      type: 'done',
      data:
        doneResult ?? {
          ...resultPayload,
          completedAt: new Date().toISOString(),
        },
    };
    appendRoomStreamEvent(room.id, doneEvent);
    yield doneEvent;
  }

  async *createRoomStream(request: RoomStreamRequest): AsyncGenerator<RoomStreamEvent> {
    const room = this.ensureReadableRoom(request.roomId, request.requesterUserId);
    const existedResult = getRoomResult(room.id);
    const history = getRoomMessages(room.id);

    const streamId = `room_stream_${nanoid(10)}`;
    yield { type: 'open', data: { streamId, roomId: room.id, status: room.status } };
    yield {
      type: 'room_info',
      data: {
        room,
        replay: room.status === 'finished' && history.length > 0,
      },
    };

    if (room.status === 'finished' && history.length > 0) {
      let currentRound = -1;
      for (const message of history) {
        if (message.round !== currentRound) {
          currentRound = message.round;
          yield { type: 'round_start', data: { round: currentRound, replay: true } };
        }

        yield {
          type: 'message_start',
          data: {
            round: message.round,
            role: message.role,
            participantId: message.participantId,
            isBot: message.isBot,
            isHost: message.isHost,
            replay: true,
          },
        };
        yield {
          type: 'token',
          data: {
            content: message.content,
            role: message.role,
            round: message.round,
            participantId: message.participantId,
            replay: true,
          },
        };
        yield {
          type: 'message_complete',
          data: {
            round: message.round,
            role: message.role,
            content: message.content,
            participantId: message.participantId,
            replay: true,
          },
        };
      }

      yield {
        type: 'done',
        data: existedResult ?? {
          sessionId: `room_session_${nanoid(10)}`,
          topic: room.topic ?? '',
          participants: room.participants.map((item) => item.displayName),
          messages: history,
          completedAt: new Date().toISOString(),
          totalRounds: room.rounds,
        },
      };
      return;
    }

    const run = beginRoomRun(room.id, request.forceRun ?? true);
    if (!run.started) {
      let cursor = Math.max(0, getRoomRunState(room.id).latestSeq - 40);
      let idleSince = Date.now();

      while (true) {
        const rows = listRoomStreamEvents(room.id, cursor, 120);
        if (rows.length > 0) {
          for (const row of rows) {
            cursor = row.seq;
            yield row.event as RoomStreamEvent;
            if (row.event.type === 'done' || row.event.type === 'error') {
              return;
            }
          }
          idleSince = Date.now();
        }

        const state = getRoomRunState(room.id);
        if (!state.running) {
          if (state.status === 'finished') {
            const finalResult = getRoomResult(room.id);
            if (finalResult) {
              yield {
                type: 'done',
                data: finalResult,
              };
            }
            return;
          }

          if (Date.now() - idleSince > SUBSCRIBER_WAIT_TIMEOUT_MS) {
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, SUBSCRIBER_POLL_MS));
      }
    }

    try {
      for await (const event of this.runRoomEngine(room)) {
        yield event;
      }
    } catch (error) {
      const roomError =
        error instanceof RoomStoreError
          ? error
          : new RoomStoreError('ROOM_STREAM_FAILED', '流式房间服务失败', 500);

      const errorEvent: RoomStreamEvent = {
        type: 'error',
        data: {
          code: roomError.status,
          error: roomError.code,
          message: roomError.message,
        },
      };
      appendRoomStreamEvent(room.id, errorEvent);
      yield errorEvent;
    } finally {
      endRoomRun(room.id, { runId: run.runId ?? undefined });
    }
  }
}
