'use client';

import { Crown, Ghost, Shield, Sparkles, Sword, UserRound } from 'lucide-react';
import type { BattleAgent } from '@/types/battle';

interface ScoreBoardProps {
  agents: BattleAgent[];
}

function getRoleLabel(agent: BattleAgent): string {
  if (!agent.isAlive || agent.role === 'audience') {
    return '亡灵';
  }
  return '在场';
}

function getRoleClass(agent: BattleAgent): string {
  if (!agent.isAlive || agent.role === 'audience') {
    return 'border-violet-300/60 bg-violet-50 text-violet-700';
  }
  return 'border-emerald-300/60 bg-emerald-50 text-emerald-700';
}

function getScoreClass(score: number): string {
  if (score >= 120) return 'text-amber-200';
  if (score <= 20) return 'text-rose-200';
  return 'text-cyan-100';
}

export function ScoreBoard({ agents }: ScoreBoardProps) {
  const sortedAgents = agents
    .slice()
    .sort((left, right) => right.score - left.score || left.displayName.localeCompare(right.displayName));

  const topScore = sortedAgents[0]?.score ?? 0;

  if (sortedAgents.length === 0) {
    return (
      <section className="battle-panel p-4">
        <div className="text-sm text-slate-600">暂无选手数据</div>
      </section>
    );
  }

  return (
    <section className="battle-panel p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm font-semibold text-slate-900">选手状态栏</div>
        <div className="text-xs text-slate-600">按笑点高低实时排序</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        {sortedAgents.map((agent, index) => {
          const isWinnerLike = index === 0;
          const isActiveLeader = isWinnerLike && topScore > 0 && agent.isAlive;

          return (
            <article
              key={agent.id}
              className={`game-surface rounded-2xl border px-4 py-3 transition-all duration-300 ${
                agent.isAlive
                  ? 'border-indigo-100 bg-white/95 hover:border-cyan-300/40 hover:bg-cyan-50/45'
                  : 'border-indigo-100/80 bg-slate-50/70'
              } ${
                isWinnerLike && topScore > 0
                  ? 'ring-1 ring-amber-300/45 shadow-[0_0_24px_rgba(251,191,36,0.25)]'
                  : ''
              } ${isActiveLeader ? 'shine-sweep holo-border pulse-live' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900 truncate">{agent.displayName}</div>
                    {isWinnerLike ? <Crown className="w-4 h-4 text-amber-300" /> : null}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 truncate">{agent.personaLabel}</div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-lg font-bold ${getScoreClass(agent.score)}`}>{agent.score}</div>
                  <div className="text-[11px] text-slate-600">笑点值</div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${getRoleClass(agent)}`}
                >
                  {agent.role === 'audience' || !agent.isAlive ? (
                    <Ghost className="w-3 h-3" />
                  ) : (
                    <UserRound className="w-3 h-3" />
                  )}
                  {getRoleLabel(agent)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/55 bg-white px-2 py-0.5 text-slate-700">
                  <Sparkles className="w-3 h-3" />
                  {agent.isBot ? 'AI选手' : '真人选手'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <div className="battle-panel-soft px-3 py-2">
                  <div className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    天赋
                  </div>
                  <div className="text-xs text-slate-900 mt-1">
                    {agent.talentName ?? '未选择'}
                  </div>
                  {agent.talentDescription ? (
                    <div className="text-[11px] text-slate-600 mt-1 leading-5">{agent.talentDescription}</div>
                  ) : null}
                </div>

                <div className="battle-panel-soft px-3 py-2">
                  <div className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                    {agent.itemId === 'shield' ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <Sword className="w-3 h-3" />
                    )}
                    道具
                  </div>
                  <div className="text-xs text-slate-900 mt-1">{agent.itemName ?? '本轮未使用'}</div>
                  {agent.itemDescription ? (
                    <div className="text-[11px] text-slate-600 mt-1 leading-5">{agent.itemDescription}</div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
