import { create } from 'zustand';
import type {
  BattleEventRecord,
  BattleGameDetail,
  BattleGameSnapshot,
  BattleResult,
  BattleScoreItem,
} from '@/types/battle';

interface BattleStoreState {
  games: BattleGameSnapshot[];
  currentGame: BattleGameSnapshot | null;
  currentResult: BattleResult | null;
  scores: BattleScoreItem[];
  events: BattleEventRecord[];
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

  setGames: (games: BattleGameSnapshot[]) => void;
  setCurrentGame: (game: BattleGameSnapshot | null) => void;
  setGameDetail: (detail: BattleGameDetail) => void;
  setCurrentResult: (result: BattleResult | null) => void;
  setScores: (scores: BattleScoreItem[]) => void;
  addEvent: (event: BattleEventRecord) => void;
  setConnectionStatus: (status: BattleStoreState['connectionStatus']) => void;
  clearEvents: () => void;
  resetBattle: () => void;
}

const MAX_EVENTS = 400;

export const useBattleStore = create<BattleStoreState>()((set) => ({
  games: [],
  currentGame: null,
  currentResult: null,
  scores: [],
  events: [],
  connectionStatus: 'idle',

  setGames: (games) => set({ games }),
  setCurrentGame: (game) => set({ currentGame: game }),

  setGameDetail: (detail) =>
    set({
      currentGame: detail.game,
      currentResult: detail.result,
    }),

  setCurrentResult: (result) => set({ currentResult: result }),
  setScores: (scores) => set({ scores }),

  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event].slice(-MAX_EVENTS),
    })),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  clearEvents: () =>
    set({
      events: [],
      connectionStatus: 'idle',
    }),

  resetBattle: () =>
    set({
      currentGame: null,
      currentResult: null,
      scores: [],
      events: [],
      connectionStatus: 'idle',
    }),
}));
