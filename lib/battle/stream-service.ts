import { AIService } from '@/lib/services/ai-service';
import { getBattleConfig } from '@/lib/battle/config-loader';
import {
  ANTI_AI_STYLE_RULES,
  COMEDY_DENSITY_RULES,
  PHILOSOPHY_LOGIC_PROTOCOL,
  ROAST_WRITING_PROTOCOL,
} from '@/lib/prompt-style';
import {
  appendBattleStreamEvent,
  appendBattleRoundSummary,
  appendBattleSpeech,
  beginBattleRun,
  endBattleRun,
  flushBattleGame,
  finishBattleGame,
  getBattleGame,
  getBattleRunState,
  getBattleResult,
  listBattleStreamEvents,
  setBattleAgentItem,
  setBattleAgentTalent,
  updateBattleAgentScore,
  updateBattlePhase,
  updateBattleRound,
  BattleStoreError,
} from '@/lib/battle/store';
import type {
  BattleAgent,
  BattleEventRecord,
  BattleGameSnapshot,
  BattleRatingLevel,
  BattleRoundEvent,
  BattleScoreItem,
  BattleSpeech,
} from '@/types/battle';

interface BaseAIService {
  generateStream(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): AsyncIterable<string>;
}

interface CreateBattleStreamInput {
  gameId: string;
  requesterUserId: string;
  forceRun?: boolean;
}

interface BattleRoundContext {
  round: number;
  event: BattleRoundEvent;
  speakingOrder: string[];
}

const STREAM_TIMEOUT_MS = 25_000;
const SUBSCRIBER_POLL_MS = 240;
const SUBSCRIBER_WAIT_TIMEOUT_MS = 30 * 60_000;

function mapToScoreBoard(game: BattleGameSnapshot): BattleScoreItem[] {
  return game.agents
    .map((agent) => ({
      agentId: agent.id,
      agentName: agent.displayName,
      score: agent.score,
      role: agent.role,
      isAlive: agent.isAlive,
    }))
    .sort((left, right) => right.score - left.score);
}

function getPlayers(game: BattleGameSnapshot): BattleAgent[] {
  return game.agents.filter((agent) => agent.role === 'player');
}

function getAlivePlayers(game: BattleGameSnapshot): BattleAgent[] {
  return game.agents.filter((agent) => agent.role === 'player' && agent.isAlive);
}

function pickRoundEvent(round: number): BattleRoundEvent {
  const config = getBattleConfig();
  const list = config.events;
  if (list.length === 0) {
    return {
      id: 'event_default',
      name: '平稳轮次',
      category: 'buff',
      description: '无额外效果',
    };
  }

  return list[(round - 1) % list.length];
}

function buildSpeechPrompt(input: {
  agent: BattleAgent;
  game: BattleGameSnapshot;
  round: number;
  event: BattleRoundEvent;
}): string {
  const others = input.game.agents
    .filter((row) => row.id !== input.agent.id && row.role === 'player')
    .map((row) => `${row.displayName}(笑点${row.score})`)
    .join('、');

  return [
    `你是 ${input.agent.displayName}（${input.agent.personaLabel}）。`,
    `当前主题：${input.game.topic ?? ''}`,
    `当前轮次：第${input.round}轮。`,
    `当前事件：${input.event.name}（${input.event.description}）。`,
    `你当前笑点：${input.agent.score}。`,
    `其他在场选手：${others || '无'}。`,
    ROAST_WRITING_PROTOCOL,
    PHILOSOPHY_LOGIC_PROTOCOL,
    ANTI_AI_STYLE_RULES,
    COMEDY_DENSITY_RULES,
    '你要像真人吐槽，不要写“我理解这个主题是...”这种解释型开头。',
    '如果主题陌生，可基于常识推断，但必须直接输出台词，不做方法说明。',
    '禁止把“笑点系统/规则”当主内容，必须围绕主题对象、场景、矛盾来吐槽。',
    '请输出 1-2 句，35-110 字中文吐槽，必须 @ 至少 1 名在场选手。',
    '至少包含 1 个具体细节（对象/动作/数字/场景）。',
    '结尾留一句短金句（8-20字）。',
    '只输出最终吐槽内容，不要任何解释。',
    '严禁输出英文、分析过程、思维链、角色标签、XML/HTML 标签。',
    '禁止输出 Tone/Reasoning/Analysis/Topic 等字段。',
    '禁止使用 Markdown 列表、标题、加粗符号。',
  ].join('\n');
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim();
}

function normalizeForRepeat(text: string): string {
  return text
    .toLowerCase()
    .replace(/@[\u4e00-\u9fff\w-]+/g, ' ')
    .replace(/我理解[^。！？!?]{0,40}(主题|话题)[^。！？!?]{0,40}[。！？!?]?/g, ' ')
    .replace(/(这个|该)(主题|话题)[^。！？!?]{0,40}[。！？!?]?/g, ' ')
    .replace(/先说结论[^。！？!?]{0,30}[。！？!?]?/g, ' ')
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim();
}

function buildCharacterNgrams(text: string, n = 2): Set<string> {
  const grams = new Set<string>();
  if (text.length < n) {
    if (text.length > 0) {
      grams.add(text);
    }
    return grams;
  }

  for (let index = 0; index <= text.length - n; index += 1) {
    grams.add(text.slice(index, index + n));
  }

  return grams;
}

function calcJaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }

  const union = left.size + right.size - intersection;
  if (union <= 0) {
    return 0;
  }

  return intersection / union;
}

function splitTopicKeywords(topic: string): string[] {
  const raw = topic
    .toLowerCase()
    .split(/[\s，。！？；、,.;:：\/\\\-]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const uniq = Array.from(new Set(raw));
  return uniq.filter((item) => {
    const cjk = (item.match(/[\u4e00-\u9fff]/g) ?? []).length;
    if (cjk >= 2) return true;
    return item.length >= 4;
  });
}

function isTopicFocused(content: string, topic: string): boolean {
  const normalizedContent = normalizeForCompare(content);
  const normalizedTopic = normalizeForCompare(topic);
  if (!normalizedContent || !normalizedTopic) {
    return true;
  }

  if (normalizedContent.includes(normalizedTopic)) {
    return true;
  }

  const keywords = splitTopicKeywords(topic);
  if (keywords.length === 0) {
    return true;
  }

  const hitCount = keywords.reduce((sum, keyword) => {
    const normalized = normalizeForCompare(keyword);
    if (!normalized) {
      return sum;
    }
    return normalizedContent.includes(normalized) ? sum + 1 : sum;
  }, 0);

  return hitCount >= Math.max(1, Math.ceil(keywords.length / 3));
}

function detectRepeatSimilarity(content: string, recentContents: string[]): number {
  const normalizedCurrent = normalizeForRepeat(content);
  if (!normalizedCurrent || normalizedCurrent.length < 10) {
    return 0;
  }

  const currentNgrams = buildCharacterNgrams(normalizedCurrent, 2);

  let maxSimilarity = 0;
  for (const candidate of recentContents) {
    const normalizedCandidate = normalizeForRepeat(candidate);
    if (!normalizedCandidate || normalizedCandidate.length < 10) {
      continue;
    }

    if (normalizedCurrent === normalizedCandidate) {
      return 1;
    }

    const candidateNgrams = buildCharacterNgrams(normalizedCandidate, 2);
    const jaccard = calcJaccardSimilarity(currentNgrams, candidateNgrams);

    const shorter = Math.min(normalizedCurrent.length, normalizedCandidate.length);
    const longer = Math.max(normalizedCurrent.length, normalizedCandidate.length);
    const coverage = longer > 0 ? shorter / longer : 0;
    const containsRelation =
      normalizedCurrent.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedCurrent);

    const score = containsRelation ? Math.max(jaccard, coverage * 0.96) : jaccard;
    if (score > maxSimilarity) {
      maxSimilarity = score;
    }
  }

  return maxSimilarity;
}

function cleanContent(content: string): string {
  let normalized = content.trim();

  const hardStopMarkers = ['</speaker>', '<speaker>', '(Tone:', '(Reasoning:', 'Reasoning:', 'Tone:'];
  for (const marker of hardStopMarkers) {
    const idx = normalized.indexOf(marker);
    if (idx >= 0) {
      normalized = normalized.slice(0, idx);
    }
  }

  normalized = normalized
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/^\s*\d+[\.|、]\s*/g, '')
    .replace(/\([^)]*(reasoning|analysis|tone|style)[^)]*\)/gi, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^["'“”`]+|["'“”`]+$/g, '')
    .trim();

  if (!normalized) {
    return '';
  }

  normalized = normalized
    .replace(/^(speaker|assistant|model)\s*[:：]\s*/i, '')
    .replace(/\s*\/?\s*speaker\s*$/i, '')
    .trim();

  const lower = normalized.toLowerCase();
  const analysisSignals = ['identify the user', 'core request', 'analysis:', 'reasoning:', 'topic:', 'tone:'];
  for (const signal of analysisSignals) {
    const idx = lower.indexOf(signal);
    if (idx > 0) {
      normalized = normalized.slice(0, idx).trim();
      break;
    }
  }

  const cjkCount = (normalized.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const latinCount = (normalized.match(/[A-Za-z]/g) ?? []).length;
  if (latinCount >= 24 && cjkCount <= 10) {
    return '';
  }

  return normalized.slice(0, 220);
}

function fallbackLine(agent: BattleAgent, topic: string): string {
  return `@全场 ${topic}这题我来一句：${agent.displayName} 状态在线，别怂继续。`;
}

function calculateRatingDelta(level: BattleRatingLevel): number {
  return getBattleConfig().ratings[level];
}

function getNegativeMultiplierByRound(round: number): number {
  if (round >= 16) return 2;
  if (round >= 12) return 1.5;
  if (round >= 8) return 1.2;
  return 1;
}

function getRoundPressurePenalty(round: number): number {
  if (round >= 16) return 6;
  if (round >= 12) return 4;
  if (round >= 8) return 2;
  return 0;
}

function applyRatingDeltaWithRoundRules(input: {
  level: BattleRatingLevel;
  round: number;
  target: BattleAgent;
  eventId: string;
}): number {
  let delta = calculateRatingDelta(input.level);
  const eventId = input.eventId.toLowerCase();

  if (eventId.includes('reverse')) {
    delta = -delta;
  }

  if (
    delta > 0 &&
    (eventId.includes('double') || eventId.includes('hottopic') || eventId.includes('hot_topic'))
  ) {
    delta *= 2;
  }

  if (input.level === 'boring' && (eventId.includes('strict') || eventId.includes('harsh'))) {
    delta *= 2;
  }

  if (delta > 0 && input.target.score >= 120) {
    delta = Math.max(1, Math.round(delta * 0.5));
  }

  if (delta > 0 && input.target.score <= 15) {
    delta += 3;
  }

  if (delta < 0) {
    delta = Math.round(delta * getNegativeMultiplierByRound(input.round));
  }

  return Math.trunc(delta);
}

function chooseRating(target: BattleAgent): BattleRatingLevel {
  if (target.score >= 120) {
    return Math.random() < 0.5 ? 'meh' : 'boring';
  }
  if (target.score <= 20) {
    return Math.random() < 0.6 ? 'funny' : 'epic';
  }

  const options: BattleRatingLevel[] = ['epic', 'funny', 'meh', 'boring'];
  return options[Math.floor(Math.random() * options.length)];
}

function getSpeakingOrder(game: BattleGameSnapshot): string[] {
  return getAlivePlayers(game)
    .slice()
    .sort((left, right) => left.score - right.score)
    .map((agent) => agent.id);
}

function makeRoundContext(game: BattleGameSnapshot, round: number): BattleRoundContext {
  return {
    round,
    event: pickRoundEvent(round),
    speakingOrder: getSpeakingOrder(game),
  };
}

export class BattleStreamService {
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
      const timer = setTimeout(() => reject(new Error('BATTLE_STREAM_TIMEOUT')), timeoutMs);
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
        if (next.done) return;
        yield next.value;
      }
    } finally {
      if (typeof iterator.return === 'function') {
        try {
          await iterator.return();
        } catch {
          // ignore close errors
        }
      }
    }
  }

  private ensureReadableGame(gameId: string, requesterUserId: string): BattleGameSnapshot {
    const game = getBattleGame(gameId);
    const inGame = game.agents.some((agent) => agent.userId === requesterUserId);
    if (!inGame) {
      throw new BattleStoreError('FORBIDDEN', '你不在该游戏房间中', 403);
    }

    if (game.status === 'waiting') {
      throw new BattleStoreError('GAME_NOT_STARTED', '游戏尚未开始', 409);
    }

    return game;
  }

  private applyRoundEvent(gameId: string, event: BattleRoundEvent) {
    const game = getBattleGame(gameId);

    if (event.id === 'decay' || event.id === 'laugh_tax') {
      for (const agent of getAlivePlayers(game)) {
        updateBattleAgentScore(gameId, agent.id, agent.score - 5);
      }
      return;
    }

    if (event.id === 'bonusRound' || event.id === 'laugh_rain') {
      for (const agent of getAlivePlayers(game)) {
        updateBattleAgentScore(gameId, agent.id, agent.score + 5);
      }
    }
  }

  private applyEliminationByThreshold(input: {
    gameId: string;
    round: number;
    phase: 'after_rating' | 'after_pressure';
  }): void {
    const threshold = getBattleConfig().eliminationThreshold;
    const snapshot = getBattleGame(input.gameId);
    const alivePlayers = snapshot.agents.filter((agent) => agent.isAlive && agent.role === 'player');

    if (alivePlayers.length === 0) {
      return;
    }

    let toEliminate = alivePlayers.filter((agent) => agent.score <= threshold);
    if (toEliminate.length === 0) {
      return;
    }

    // 避免同一轮全员同时淘汰，保留一名“最后生还者”进入下一轮。
    if (toEliminate.length === alivePlayers.length && alivePlayers.length > 1) {
      const survivor = alivePlayers
        .slice()
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }
          return Date.parse(left.joinedAt) - Date.parse(right.joinedAt);
        })[0];

      if (survivor) {
        const survivorScore = Math.max(threshold + 1, survivor.score);
        updateBattleAgentScore(input.gameId, survivor.id, survivorScore);
        toEliminate = toEliminate.filter((agent) => agent.id !== survivor.id);

        appendBattleStreamEvent(input.gameId, {
          type: 'battle:last_stand',
          data: {
            round: input.round,
            phase: input.phase,
            survivorAgentId: survivor.id,
            survivorAgentName: survivor.displayName,
            survivorScore,
            threshold,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }

    for (const row of toEliminate) {
      updateBattleAgentScore(input.gameId, row.id, threshold, {
        isAlive: false,
        eliminatedAtRound: input.round,
      });

      appendBattleStreamEvent(input.gameId, {
        type: 'battle:elimination',
        data: {
          round: input.round,
          phase: input.phase,
          agentId: row.id,
          agentName: row.displayName,
          threshold,
          game: getBattleGame(input.gameId),
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  private autoAssignTalents(gameId: string): Array<{
    agentId: string;
    talentId: string;
    talentName: string;
    talentDescription: string;
  }> {
    const game = getBattleGame(gameId);
    const talents = getBattleConfig().talents;
    const selected: Array<{
      agentId: string;
      talentId: string;
      talentName: string;
      talentDescription: string;
    }> = [];

    for (const [index, agent] of getPlayers(game).entries()) {
      const talent = talents[index % Math.max(1, talents.length)] ?? {
        id: 'talent_default',
        name: '普通人设',
        description: '无额外效果',
        category: 'special' as const,
      };

      setBattleAgentTalent(gameId, agent.id, talent.id, talent.name, talent.description);
      selected.push({
        agentId: agent.id,
        talentId: talent.id,
        talentName: talent.name,
        talentDescription: talent.description,
      });
    }

    return selected;
  }

  private autoBuyItems(gameId: string): Array<{
    agentId: string;
    itemId: string | null;
    itemName: string | null;
    itemDescription: string | null;
  }> {
    const game = getBattleGame(gameId);
    const items = getBattleConfig().playerItems;
    const actions: Array<{
      agentId: string;
      itemId: string | null;
      itemName: string | null;
      itemDescription: string | null;
    }> = [];

    for (const agent of getAlivePlayers(game)) {
      const affordable = items.filter((item) => item.price < agent.score && agent.score - item.price > 0);
      if (affordable.length === 0 || Math.random() < 0.45) {
        setBattleAgentItem(gameId, agent.id, null, null, null, 0);
        actions.push({ agentId: agent.id, itemId: null, itemName: null, itemDescription: null });
        continue;
      }

      const item = affordable[Math.floor(Math.random() * affordable.length)];
      setBattleAgentItem(gameId, agent.id, item.id, item.name, item.description, -item.price);
      actions.push({
        agentId: agent.id,
        itemId: item.id,
        itemName: item.name,
        itemDescription: item.description,
      });
    }

    return actions;
  }

  private collectReplaySpeeches(gameId: string, limit = 80): BattleSpeech[] {
    const rows = listBattleStreamEvents(gameId, 0, 4000);
    const speeches: BattleSpeech[] = [];

    for (const row of rows) {
      if (row.event.type !== 'battle:speech_complete') {
        continue;
      }

      const data = row.event.data;
      const round = typeof data.round === 'number' ? data.round : 0;
      const agentId = typeof data.agentId === 'string' ? data.agentId : '';
      const agentName = typeof data.agentName === 'string' ? data.agentName : '未知选手';
      const content = typeof data.content === 'string' ? data.content : '';

      if (!agentId || !content.trim()) {
        continue;
      }

      speeches.push({
        id: `replay_${row.seq}`,
        round,
        agentId,
        agentName,
        content,
        createdAt: row.event.timestamp,
      });
    }

    return speeches.slice(-Math.max(1, limit));
  }

  private buildRecentSpeechWindowBeforeCurrent(
    gameId: string,
    currentSpeakerId: string,
    currentRound: number
  ): {
    globalRecent: string[];
    selfRecent: string[];
  } {
    const rows = listBattleStreamEvents(gameId, 0, 3000)
      .filter((row) => row.event.type === 'battle:speech_complete')
      .slice(-28);

    const globalRecent: string[] = [];
    const selfRecent: string[] = [];

    for (const row of rows) {
      const payload = row.event.data;
      const round = typeof payload.round === 'number' ? payload.round : 0;
      const content = typeof payload.content === 'string' ? payload.content.trim() : '';
      if (!content) {
        continue;
      }

      if (round > currentRound) {
        continue;
      }

      globalRecent.push(content);
      if (payload.agentId === currentSpeakerId) {
        selfRecent.push(content);
      }
    }

    return {
      globalRecent,
      selfRecent,
    };
  }

  private pickRoundGoldenLine(input: {
    round: number;
    eventId: string;
    topic: string;
    speeches: Array<{ agentId: string; agentName: string; content: string }>;
    ratings: Array<{ targetAgentId: string; delta: number }>;
  }): {
    agentId: string;
    agentName: string;
    content: string;
    reason: string;
  } | null {
    if (input.speeches.length === 0) {
      return null;
    }

    const scoreMap = new Map<string, number>();
    for (const rating of input.ratings) {
      const current = scoreMap.get(rating.targetAgentId) ?? 0;
      scoreMap.set(rating.targetAgentId, current + rating.delta);
    }

    const ranked = input.speeches
      .map((speech) => {
        const normalizedLen = Math.min(40, speech.content.length) / 40;
        const topicBonus = isTopicFocused(speech.content, input.topic) ? 0.12 : 0;
        const scoreDelta = scoreMap.get(speech.agentId) ?? 0;
        const composite = scoreDelta + normalizedLen + topicBonus;
        return { speech, composite, scoreDelta };
      })
      .sort((left, right) => {
        if (right.composite !== left.composite) {
          return right.composite - left.composite;
        }
        return right.speech.content.length - left.speech.content.length;
      });

    const winner = ranked[0];
    if (!winner) {
      return null;
    }

    const reason =
      winner.scoreDelta > 0
        ? `本轮带动评分 +${winner.scoreDelta}`
        : winner.scoreDelta < 0
          ? `虽然承压 ${winner.scoreDelta}，但表达最有记忆点`
          : '表达完整且贴合主题';

    return {
      agentId: winner.speech.agentId,
      agentName: winner.speech.agentName,
      content: winner.speech.content,
      reason,
    };
  }

  private async runBattleCore(gameId: string, runId: string): Promise<void> {
    const game = getBattleGame(gameId);

    try {
      updateBattlePhase(game.id, 'talent_selection');
      const talentSelections = this.autoAssignTalents(game.id);
      const talentEvent: BattleEventRecord = {
        type: 'battle:talent_selected',
        data: { selections: talentSelections, game: getBattleGame(game.id) },
        timestamp: new Date().toISOString(),
      };
      appendBattleStreamEvent(game.id, talentEvent);

      let provider: BaseAIService | null = null;
      try {
        provider = this.getProvider();
      } catch (providerError) {
        console.warn('Battle stream provider unavailable, fallback mode enabled:', providerError);
      }
      const finalGame = getBattleGame(game.id);
      const maxRounds = finalGame.maxRounds;

      for (let round = 1; round <= maxRounds; round += 1) {
        const current = getBattleGame(game.id);
        const alivePlayers = getAlivePlayers(current);
        if (alivePlayers.length <= 1) {
          break;
        }

        updateBattleRound(game.id, round);
        updateBattlePhase(game.id, 'round_start');

        const context = makeRoundContext(getBattleGame(game.id), round);
        this.applyRoundEvent(game.id, context.event);

        const roundStartEvent: BattleEventRecord = {
          type: 'battle:round_start',
          data: {
            round,
            speakingOrder: context.speakingOrder,
            game: getBattleGame(game.id),
          },
          timestamp: new Date().toISOString(),
        };
        appendBattleStreamEvent(game.id, roundStartEvent);

        const announceEvent: BattleEventRecord = {
          type: 'battle:event_announced',
          data: {
            round,
            event: context.event,
            game: getBattleGame(game.id),
          },
          timestamp: new Date().toISOString(),
        };
        appendBattleStreamEvent(game.id, announceEvent);

        updateBattlePhase(game.id, 'shop_phase');
        const boughtItems = this.autoBuyItems(game.id);
        const itemEvent: BattleEventRecord = {
          type: 'battle:item_bought',
          data: {
            round,
            actions: boughtItems,
            game: getBattleGame(game.id),
          },
          timestamp: new Date().toISOString(),
        };
        appendBattleStreamEvent(game.id, itemEvent);

        updateBattlePhase(game.id, 'speech_phase');
        const roundSpeeches: Array<{ agentId: string; agentName: string; content: string }> = [];
        const roundRatings: Array<{
          fromAgentId: string;
          fromAgentName: string;
          targetAgentId: string;
          targetAgentName: string;
          delta: number;
        }> = [];
        const roundPenalties: Array<{
          type: 'topic' | 'repeat' | 'pressure';
          agentId?: string;
          agentName?: string;
          value: number;
          reason?: string | null;
        }> = [];
        for (const agentId of context.speakingOrder) {
          const loopGame = getBattleGame(game.id);
          const speaker = loopGame.agents.find((agent) => agent.id === agentId && agent.isAlive);
          if (!speaker) continue;

          const turnEvent: BattleEventRecord = {
            type: 'battle:speech_turn',
            data: {
              round,
              agentId: speaker.id,
              agentName: speaker.displayName,
            },
            timestamp: new Date().toISOString(),
          };
          appendBattleStreamEvent(game.id, turnEvent);

          let content = '';
          const prompt = buildSpeechPrompt({
            agent: speaker,
            game: loopGame,
            round,
            event: context.event,
          });

          const startEvent: BattleEventRecord = {
            type: 'battle:speech_start',
            data: {
              round,
              agentId: speaker.id,
              agentName: speaker.displayName,
            },
            timestamp: new Date().toISOString(),
          };
          appendBattleStreamEvent(game.id, startEvent);

          if (provider) {
            try {
              const stream = provider.generateStream('', prompt, { temperature: 0.9, maxTokens: 220 });
              for await (const token of this.withTimeout(stream)) {
                content += token;
                const tokenEvent: BattleEventRecord = {
                  type: 'battle:speech_token',
                  data: {
                    round,
                    agentId: speaker.id,
                    token,
                  },
                  timestamp: new Date().toISOString(),
                };
                appendBattleStreamEvent(game.id, tokenEvent);
              }
            } catch (error) {
              console.error('Battle speech stream failed, fallback used:', error);
            }
          }

          const finalContent = cleanContent(content) || fallbackLine(speaker, loopGame.topic ?? '这个话题');
          const recentWindow = this.buildRecentSpeechWindowBeforeCurrent(game.id, speaker.id, round);
          const hasEnoughGlobalHistory = recentWindow.globalRecent.length >= 3;
          const hasEnoughSelfHistory = recentWindow.selfRecent.length >= 1;

          let similarityAgainstAll = 0;
          let similarityAgainstSelf = 0;
          if (round > 1 && (hasEnoughGlobalHistory || hasEnoughSelfHistory)) {
            similarityAgainstAll = detectRepeatSimilarity(finalContent, recentWindow.globalRecent);
            similarityAgainstSelf = detectRepeatSimilarity(finalContent, recentWindow.selfRecent);
          }

          appendBattleSpeech(game.id, {
            round,
            agentId: speaker.id,
            agentName: speaker.displayName,
            content: finalContent,
          });
          roundSpeeches.push({
            agentId: speaker.id,
            agentName: speaker.displayName,
            content: finalContent,
          });

          const completeEvent: BattleEventRecord = {
            type: 'battle:speech_complete',
            data: {
              round,
              agentId: speaker.id,
              agentName: speaker.displayName,
              content: finalContent,
            },
            timestamp: new Date().toISOString(),
          };
          appendBattleStreamEvent(game.id, completeEvent);

          const topic = loopGame.topic ?? '';
          if (topic && !isTopicFocused(finalContent, topic)) {
            const offTopicPenalty = 8;
            const beforePenalty = getBattleGame(game.id).agents.find((row) => row.id === speaker.id);
            if (beforePenalty) {
              const beforeScore = beforePenalty.score;
              updateBattleAgentScore(game.id, speaker.id, beforeScore - offTopicPenalty);

              appendBattleStreamEvent(game.id, {
                type: 'battle:topic_penalty',
                data: {
                  round,
                  agentId: speaker.id,
                  agentName: speaker.displayName,
                  penalty: offTopicPenalty,
                  reason: '偏离主题',
                  beforeScore,
                  afterScore: beforeScore - offTopicPenalty,
                },
                timestamp: new Date().toISOString(),
              });

              roundPenalties.push({
                type: 'topic',
                agentId: speaker.id,
                agentName: speaker.displayName,
                value: offTopicPenalty,
                reason: '偏离主题',
              });
            }
          }

          const repeatThresholdGlobal = 0.86;
          const repeatThresholdSelf = 0.82;
          const triggerByGlobal = similarityAgainstAll >= repeatThresholdGlobal;
          const triggerBySelf = similarityAgainstSelf >= repeatThresholdSelf;
          const repeatSimilarity = Math.max(similarityAgainstAll, similarityAgainstSelf);

          if (triggerByGlobal || triggerBySelf) {
            const repeatPenalty = repeatSimilarity >= 0.95 ? 12 : 8;
            const beforePenalty = getBattleGame(game.id).agents.find((row) => row.id === speaker.id);
            if (beforePenalty) {
              const beforeScore = beforePenalty.score;
              updateBattleAgentScore(game.id, speaker.id, beforeScore - repeatPenalty);

              appendBattleStreamEvent(game.id, {
                type: 'battle:repeat_penalty',
                data: {
                  round,
                  agentId: speaker.id,
                  agentName: speaker.displayName,
                  penalty: repeatPenalty,
                  similarity: Number(repeatSimilarity.toFixed(2)),
                  similarityAgainstAll: Number(similarityAgainstAll.toFixed(2)),
                  similarityAgainstSelf: Number(similarityAgainstSelf.toFixed(2)),
                  reason: triggerBySelf && !triggerByGlobal ? '检测到自我复读' : '检测到高相似复读',
                  beforeScore,
                  afterScore: beforeScore - repeatPenalty,
                },
                timestamp: new Date().toISOString(),
              });

              roundPenalties.push({
                type: 'repeat',
                agentId: speaker.id,
                agentName: speaker.displayName,
                value: repeatPenalty,
                reason: triggerBySelf && !triggerByGlobal ? '检测到自我复读' : '检测到高相似复读',
              });
            }
          }

          const currentAfterSpeech = getBattleGame(game.id);
          for (const target of getAlivePlayers(currentAfterSpeech)) {
            if (target.id === speaker.id) continue;

            const level = chooseRating(target);
            const delta = applyRatingDeltaWithRoundRules({
              level,
              round,
              target,
              eventId: context.event.id,
            });
            updateBattleAgentScore(game.id, target.id, target.score + delta);

            const ratingEvent: BattleEventRecord = {
              type: 'battle:rating_result',
              data: {
                round,
                fromAgentId: speaker.id,
                fromAgentName: speaker.displayName,
                targetAgentId: target.id,
                targetAgentName: target.displayName,
                level,
                delta,
                eventId: context.event.id,
              },
              timestamp: new Date().toISOString(),
            };
            appendBattleStreamEvent(game.id, ratingEvent);

            roundRatings.push({
              fromAgentId: speaker.id,
              fromAgentName: speaker.displayName,
              targetAgentId: target.id,
              targetAgentName: target.displayName,
              delta,
            });
          }

          this.applyEliminationByThreshold({
            gameId: game.id,
            round,
            phase: 'after_rating',
          });

          const scoreEvent: BattleEventRecord = {
            type: 'battle:score_update',
            data: {
              round,
              scores: mapToScoreBoard(getBattleGame(game.id)),
              game: getBattleGame(game.id),
            },
            timestamp: new Date().toISOString(),
          };
          appendBattleStreamEvent(game.id, scoreEvent);
        }

        const pressurePenalty = getRoundPressurePenalty(round);
        if (pressurePenalty > 0) {
          const beforePressure = getBattleGame(game.id);
          const affectedAgentIds: string[] = [];

          for (const alive of getAlivePlayers(beforePressure)) {
            updateBattleAgentScore(game.id, alive.id, alive.score - pressurePenalty);
            affectedAgentIds.push(alive.id);
          }

          const pressureEvent: BattleEventRecord = {
            type: 'battle:pressure_applied',
            data: {
              round,
              penalty: pressurePenalty,
              affectedAgentIds,
              game: getBattleGame(game.id),
            },
            timestamp: new Date().toISOString(),
          };
          appendBattleStreamEvent(game.id, pressureEvent);

          roundPenalties.push({
            type: 'pressure',
            value: pressurePenalty,
            reason: '回合压力机制',
          });
        }

        this.applyEliminationByThreshold({
          gameId: game.id,
          round,
          phase: 'after_pressure',
        });

        const scoreEvent: BattleEventRecord = {
          type: 'battle:score_update',
          data: {
            round,
            scores: mapToScoreBoard(getBattleGame(game.id)),
            game: getBattleGame(game.id),
          },
          timestamp: new Date().toISOString(),
        };
        appendBattleStreamEvent(game.id, scoreEvent);

        updateBattlePhase(game.id, 'round_end');
        const afterRound = getBattleGame(game.id);
        const eliminations = afterRound.agents
          .filter((agent) => agent.eliminatedAtRound === round)
          .map((agent) => agent.id);

        const eliminationNames = afterRound.agents
          .filter((agent) => agent.eliminatedAtRound === round)
          .map((agent) => agent.displayName);

        const goldenLine = this.pickRoundGoldenLine({
          round,
          eventId: context.event.id,
          topic: afterRound.topic ?? '',
          speeches: roundSpeeches,
          ratings: roundRatings.map((item) => ({ targetAgentId: item.targetAgentId, delta: item.delta })),
        });

        appendBattleRoundSummary(game.id, {
          round,
          eventId: context.event.id,
          eventName: context.event.name,
          eventDescription: context.event.description,
          eliminations,
          eliminationNames,
          speeches: roundSpeeches,
          ratings: roundRatings,
          penalties: roundPenalties,
          goldenLine,
        });

        const roundEndEvent: BattleEventRecord = {
          type: 'battle:round_end',
          data: {
            round,
            eliminations,
            game: getBattleGame(game.id),
          },
          timestamp: new Date().toISOString(),
        };
        appendBattleStreamEvent(game.id, roundEndEvent);

        const alive = getAlivePlayers(getBattleGame(game.id));
        if (alive.length <= 1) {
          break;
        }
      }

      const doneGame = getBattleGame(game.id);
      const finalScores = mapToScoreBoard(doneGame);
      const playableScores = finalScores.filter((item) => {
        const agent = doneGame.agents.find((row) => row.id === item.agentId);
        return agent?.role === 'player';
      });
      const aliveCandidates = doneGame.agents
        .filter((agent) => agent.isAlive && agent.role === 'player')
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }
          return Date.parse(left.joinedAt) - Date.parse(right.joinedAt);
        });

      const winner =
        aliveCandidates[0]
          ? playableScores.find((row) => row.agentId === aliveCandidates[0].id) ?? playableScores[0]
          : playableScores[0] ?? finalScores[0];

      finishBattleGame(game.id, {
        gameId: game.id,
        topic: doneGame.topic ?? '',
        winnerId: winner?.agentId ?? doneGame.agents[0]?.id ?? 'unknown',
        winnerName: winner?.agentName ?? doneGame.agents[0]?.displayName ?? '未知选手',
        totalRounds: doneGame.currentRound,
        scores: finalScores,
        speeches: this.collectReplaySpeeches(game.id),
      });

      updateBattlePhase(game.id, 'game_over');
      const result = getBattleResult(game.id);
      const finalGameSnapshot = getBattleGame(game.id);
      const finalScoreBoard = mapToScoreBoard(finalGameSnapshot);

      const doneEvent: BattleEventRecord = {
        type: 'battle:game_over',
        data: {
          result,
          game: finalGameSnapshot,
          scores: finalScoreBoard,
        },
        timestamp: new Date().toISOString(),
      };
      appendBattleStreamEvent(game.id, doneEvent);
      await flushBattleGame(game.id);
    } catch (error) {
      const battleError =
        error instanceof BattleStoreError
          ? error
          : new BattleStoreError('BATTLE_STREAM_FAILED', '流式执行失败', 500);
      const errorEvent: BattleEventRecord = {
        type: 'battle:error',
        data: {
          code: battleError.status,
          error: battleError.code,
          message: battleError.message,
        },
        timestamp: new Date().toISOString(),
      };
      appendBattleStreamEvent(game.id, errorEvent);
      await flushBattleGame(game.id);
    } finally {
      endBattleRun(game.id, { runId });
      await flushBattleGame(game.id);
    }
  }

  async startBattleRun(input: CreateBattleStreamInput): Promise<{ runId: string; started: boolean }> {
    const game = this.ensureReadableGame(input.gameId, input.requesterUserId);
    if (game.status === 'finished') {
      return {
        runId: '',
        started: false,
      };
    }

    const run = beginBattleRun(game.id);
    if (run.started) {
      void this.runBattleCore(game.id, run.runId);
    }

    return run;
  }

  async *createBattleStream(
    input: CreateBattleStreamInput
  ): AsyncGenerator<BattleEventRecord, void, unknown> {
    const game = this.ensureReadableGame(input.gameId, input.requesterUserId);

    yield {
      type: 'battle:state_sync',
      data: {
        game,
        replay: game.status === 'finished',
      },
      timestamp: new Date().toISOString(),
    };

    if (game.status === 'finished') {
      const result = getBattleResult(game.id);
      if (result) {
        yield {
          type: 'battle:game_over',
          data: {
            result,
            game,
            scores: mapToScoreBoard(game),
          },
          timestamp: new Date().toISOString(),
        };
      }
      return;
    }

    if (input.forceRun) {
      await this.startBattleRun(input);
    } else {
      const state = getBattleRunState(game.id);
      if (!state.running) {
        await this.startBattleRun(input);
      }
    }

    let cursor = Math.max(0, getBattleRunState(game.id).latestSeq - 40);
    let idleSince = Date.now();
    let lastAutoStartAttemptAt = 0;

    while (true) {
      const rows = listBattleStreamEvents(game.id, cursor, 120);
      if (rows.length > 0) {
        for (const row of rows) {
          cursor = row.seq;
          yield row.event;
          if (row.event.type === 'battle:game_over' || row.event.type === 'battle:error') {
            return;
          }
        }
        idleSince = Date.now();
      }

      const state = getBattleRunState(game.id);
      if (!state.running) {
        if (state.status === 'finished') {
          const finalGame = getBattleGame(game.id);
          const finalResult = getBattleResult(game.id);
          if (finalResult) {
            yield {
              type: 'battle:game_over',
              data: {
                result: finalResult,
                game: finalGame,
                scores: mapToScoreBoard(finalGame),
              },
              timestamp: new Date().toISOString(),
            };
          }
          return;
        }

        if (state.status === 'active') {
          const now = Date.now();
          if (now - lastAutoStartAttemptAt >= 2_000) {
            lastAutoStartAttemptAt = now;
            await this.startBattleRun({
              gameId: input.gameId,
              requesterUserId: input.requesterUserId,
            });
          }
          idleSince = now;
        }

        if (state.status === 'waiting') {
          idleSince = Date.now();
        }

        if (
          state.status !== 'waiting' &&
          state.status !== 'active' &&
          Date.now() - idleSince > SUBSCRIBER_WAIT_TIMEOUT_MS
        ) {
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, SUBSCRIBER_POLL_MS));
    }
  }
}
