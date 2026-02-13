import fs from 'node:fs';
import path from 'node:path';
import type {
  BattleConfig,
  BattleItem,
  BattleRatingLevel,
  BattleRoundEvent,
  BattleTalent,
} from '@/types/battle';

interface RawConfig {
  balance?: {
    base?: {
      initialHP?: number;
      eliminationThreshold?: number;
      maxRounds?: number;
    };
    ratings?: Record<BattleRatingLevel, { value?: number }>;
    scaling?: {
      '3players'?: { maxRounds?: number };
      '5players'?: { maxRounds?: number };
      '7players'?: { maxRounds?: number };
    };
  };
  talents?: Array<{
    id?: string;
    name?: string;
    description?: string;
    category?: 'attack' | 'defense' | 'special';
  }>;
  items?: {
    player?: Array<{ id?: string; name?: string; price?: number; description?: string }>;
    audience?: Array<{ id?: string; name?: string; description?: string }>;
  };
  events?: {
    buff?: Array<{ id?: string; name?: string; description?: string }>;
    debuff?: Array<{ id?: string; name?: string; description?: string }>;
    chaos?: Array<{ id?: string; name?: string; description?: string }>;
  };
  topics?: Array<{ title?: string }>;
}

const DEFAULT_RATINGS: Record<BattleRatingLevel, number> = {
  epic: 15,
  funny: 5,
  meh: -5,
  boring: -15,
};

let cachedConfig: BattleConfig | null = null;

function safeReadJson(filePath: string): RawConfig {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as RawConfig;
  } catch (error) {
    console.error('Battle config load failed, fallback to default config:', error);
    return {};
  }
}

function mapTalents(raw: RawConfig): BattleTalent[] {
  const rows = raw.talents ?? [];
  if (rows.length === 0) {
    return [
      { id: 'venomous', name: '毒舌', description: '炸场时额外加成', category: 'attack' },
      { id: 'thickSkin', name: '厚脸皮', description: '降低无聊惩罚', category: 'defense' },
      { id: 'gambler', name: '赌徒', description: '评价倍率波动', category: 'special' },
    ];
  }

  return rows
    .filter((row): row is Required<Pick<BattleTalent, 'id' | 'name' | 'description' | 'category'>> =>
      typeof row.id === 'string' &&
      typeof row.name === 'string' &&
      typeof row.description === 'string' &&
      (row.category === 'attack' || row.category === 'defense' || row.category === 'special')
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
    }));
}

function mapItems(raw: RawConfig): { playerItems: BattleItem[]; audienceItems: BattleItem[] } {
  const playerItems = (raw.items?.player ?? [])
    .filter(
      (row): row is { id: string; name: string; price: number; description: string } =>
        typeof row.id === 'string' &&
        typeof row.name === 'string' &&
        typeof row.price === 'number' &&
        typeof row.description === 'string'
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      description: row.description,
      audienceOnly: false,
    }));

  const audienceItems = (raw.items?.audience ?? [])
    .filter(
      (row): row is { id: string; name: string; description: string } =>
        typeof row.id === 'string' &&
        typeof row.name === 'string' &&
        typeof row.description === 'string'
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      price: 0,
      description: row.description,
      audienceOnly: true,
    }));

  return {
    playerItems:
      playerItems.length > 0
        ? playerItems
        : [
            { id: 'shield', name: '护盾', price: 15, description: '免疫一次无聊惩罚', audienceOnly: false },
            { id: 'callout', name: '点名', price: 20, description: '指定回应，不回应额外扣分', audienceOnly: false },
            { id: 'steal', name: '窃取', price: 25, description: '偷取目标笑点', audienceOnly: false },
          ],
    audienceItems,
  };
}

function mapEvents(raw: RawConfig): BattleRoundEvent[] {
  const buff = (raw.events?.buff ?? []).map((row) => ({
    id: row.id ?? `buff_${Math.random()}`,
    name: row.name ?? '增益事件',
    description: row.description ?? '',
    category: 'buff' as const,
  }));
  const debuff = (raw.events?.debuff ?? []).map((row) => ({
    id: row.id ?? `debuff_${Math.random()}`,
    name: row.name ?? '减益事件',
    description: row.description ?? '',
    category: 'debuff' as const,
  }));
  const chaos = (raw.events?.chaos ?? []).map((row) => ({
    id: row.id ?? `chaos_${Math.random()}`,
    name: row.name ?? '混乱事件',
    description: row.description ?? '',
    category: 'chaos' as const,
  }));

  const all = [...buff, ...debuff, ...chaos];
  return all.length > 0
    ? all
    : [
        { id: 'laugh_rain', name: '笑点雨', description: '全员+10', category: 'buff' },
        { id: 'strict_review', name: '严苛评审', description: '负面评价更痛', category: 'debuff' },
        { id: 'reverse_world', name: '反转世界', description: '评价反转', category: 'chaos' },
      ];
}

function mapRatings(raw: RawConfig): Record<BattleRatingLevel, number> {
  const ratings = raw.balance?.ratings;
  return {
    epic: ratings?.epic?.value ?? DEFAULT_RATINGS.epic,
    funny: ratings?.funny?.value ?? DEFAULT_RATINGS.funny,
    meh: ratings?.meh?.value ?? DEFAULT_RATINGS.meh,
    boring: ratings?.boring?.value ?? DEFAULT_RATINGS.boring,
  };
}

function mapMaxRounds(raw: RawConfig): { 3: number; 5: number; 7: number } {
  const scaling = raw.balance?.scaling;
  const defaultRound = raw.balance?.base?.maxRounds ?? 16;
  return {
    3: scaling?.['3players']?.maxRounds ?? Math.max(8, Math.trunc(defaultRound * 0.75)),
    5: scaling?.['5players']?.maxRounds ?? defaultRound,
    7: scaling?.['7players']?.maxRounds ?? Math.max(16, Math.trunc(defaultRound * 1.2)),
  };
}

function buildConfig(raw: RawConfig): BattleConfig {
  const { playerItems, audienceItems } = mapItems(raw);

  const configuredThreshold =
    typeof raw.balance?.base?.eliminationThreshold === 'number'
      ? raw.balance.base.eliminationThreshold
      : -40;

  return {
    initialScore: raw.balance?.base?.initialHP ?? 80,
    eliminationThreshold: configuredThreshold,
    maxRounds: mapMaxRounds(raw),
    ratings: mapRatings(raw),
    talents: mapTalents(raw),
    playerItems,
    audienceItems,
    events: mapEvents(raw),
    topics: (raw.topics ?? [])
      .map((row) => row.title)
      .filter((title): title is string => typeof title === 'string' && title.trim().length > 0),
  };
}

export function getBattleConfig(): BattleConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(process.cwd(), '游戏模式设计与重构', 'AI吐槽大逃杀-config.json');
  const rawConfig = safeReadJson(configPath);
  cachedConfig = buildConfig(rawConfig);
  return cachedConfig;
}

export function resetBattleConfigCache() {
  cachedConfig = null;
}
