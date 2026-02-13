export type BattleGameStatus = 'waiting' | 'active' | 'finished';

export type BattlePhase =
  | 'lobby'
  | 'talent_selection'
  | 'round_start'
  | 'shop_phase'
  | 'speech_phase'
  | 'round_end'
  | 'game_over';

export type BattleRole = 'player' | 'audience';

export type BattleRatingLevel = 'epic' | 'funny' | 'meh' | 'boring';

export interface BattleTalent {
  id: string;
  name: string;
  description: string;
  category: 'attack' | 'defense' | 'special';
}

export interface BattleItem {
  id: string;
  name: string;
  price: number;
  description: string;
  audienceOnly?: boolean;
}

export interface BattleRoundEvent {
  id: string;
  name: string;
  category: 'buff' | 'debuff' | 'chaos';
  description: string;
}

export interface BattleAgent {
  id: string;
  userId: string | null;
  displayName: string;
  personaId: string;
  personaLabel: string;
  isBot: boolean;
  isHost: boolean;
  role: BattleRole;
  score: number;
  talentId: string | null;
  talentName: string | null;
  talentDescription: string | null;
  itemId: string | null;
  itemName: string | null;
  itemDescription: string | null;
  isAlive: boolean;
  eliminatedAtRound: number | null;
  joinedAt: string;
}

export interface BattleSpeech {
  id: string;
  round: number;
  agentId: string;
  agentName: string;
  content: string;
  createdAt: string;
}

export interface BattleRatingResult {
  targetAgentId: string;
  targetAgentName: string;
  counts: Record<BattleRatingLevel, number>;
  averageDelta: number;
}

export interface BattleRoundSummary {
  round: number;
  eventId: string;
  eventName: string;
  eventDescription?: string | null;
  eliminations: string[];
  eliminationNames?: string[];
  speeches?: Array<{
    agentId: string;
    agentName: string;
    content: string;
  }>;
  ratings?: Array<{
    fromAgentId: string;
    fromAgentName: string;
    targetAgentId: string;
    targetAgentName: string;
    delta: number;
  }>;
  penalties?: Array<{
    type: 'topic' | 'repeat' | 'pressure';
    agentId?: string;
    agentName?: string;
    value: number;
    reason?: string | null;
  }>;
  goldenLine?: {
    agentId: string;
    agentName: string;
    content: string;
    reason?: string | null;
  } | null;
}

export interface BattleScoreItem {
  agentId: string;
  agentName: string;
  score: number;
  role: BattleRole;
  isAlive: boolean;
}

export interface BattleResult {
  gameId: string;
  topic: string;
  winnerId: string;
  winnerName: string;
  totalRounds: number;
  scores: BattleScoreItem[];
  speeches: BattleSpeech[];
  completedAt: string;
}

export interface BattleShareReplay {
  type: 'battle_replay';
  gameId: string;
  title: string;
  topic: string;
  winnerId: string;
  winnerName: string;
  totalRounds: number;
  scores: BattleScoreItem[];
  rounds: BattleRoundSummary[];
  speeches: BattleSpeech[];
  generatedAt: string;
}

export interface BattleGameSnapshot {
  id: string;
  name: string;
  status: BattleGameStatus;
  phase: BattlePhase;
  topic: string | null;
  maxAgents: 3 | 5 | 7;
  maxRounds: number;
  currentRound: number;
  hostUserId: string;
  hostName: string;
  agents: BattleAgent[];
  winnerId: string | null;
  winnerName: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface BattleGameDetail {
  game: BattleGameSnapshot;
  speeches: BattleSpeech[];
  rounds: BattleRoundSummary[];
  result: BattleResult | null;
}

export type BattleActionType =
  | 'select_talent'
  | 'buy_item'
  | 'audience_item'
  | 'sync'
  | 'noop';

export interface BattleActionPayload {
  gameId: string;
  agentId?: string;
  action: BattleActionType;
  data?: Record<string, unknown>;
}

export interface BattleConfig {
  initialScore: number;
  eliminationThreshold: number;
  maxRounds: {
    3: number;
    5: number;
    7: number;
  };
  ratings: Record<BattleRatingLevel, number>;
  talents: BattleTalent[];
  playerItems: BattleItem[];
  audienceItems: BattleItem[];
  events: BattleRoundEvent[];
  topics: string[];
}

export interface BattleEventRecord {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}
