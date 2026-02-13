'use client';

import { Crown, Sparkles, Swords, Users } from 'lucide-react';
import type { BattleGameSnapshot } from '@/types/battle';

interface BattleHeaderProps {
  game: BattleGameSnapshot;
}

export function BattleHeader({ game }: BattleHeaderProps) {
  const phaseLabelMap: Record<BattleGameSnapshot['phase'], string> = {
    lobby: '等待中',
    talent_selection: '天赋分配',
    round_start: '回合开始',
    shop_phase: '道具声明',
    speech_phase: '发言阶段',
    round_end: '回合结算',
    game_over: '对局结束',
  };

  const statusLabelMap: Record<BattleGameSnapshot['status'], string> = {
    waiting: '未开始',
    active: '进行中',
    finished: '已结束',
  };

  const phaseToneClass = game.status === 'finished' ? 'text-amber-700' : 'text-indigo-600';
  const isLive = game.status === 'active';

  return (
    <header className="battle-panel game-surface glow-ring p-4 border border-indigo-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs text-cyan-700 inline-flex items-center gap-1">
            <Swords className="w-3.5 h-3.5" />
            嘴强王者 · Battle 模式
          </div>
          <div className="text-lg font-semibold text-slate-900 mt-1">{game.name}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-700">状态：{statusLabelMap[game.status]}</div>
          <div
            className={`text-xs inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${phaseToneClass} ${isLive ? 'holo-border pulse-live' : ''}`}
          >
            <Sparkles className="w-3 h-3" />阶段：{phaseLabelMap[game.phase]}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-700">
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-white px-2 py-1">
          <Users className="w-3.5 h-3.5" />
          人数 {game.agents.length}/{game.maxAgents}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-white px-2 py-1">
          回合 {game.currentRound}/{game.maxRounds}
        </span>
        {game.winnerName ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-50 px-2 py-1 text-amber-700">
            <Crown className="w-3.5 h-3.5" />
            胜者：{game.winnerName}
          </span>
        ) : null}
      </div>
    </header>
  );
}
