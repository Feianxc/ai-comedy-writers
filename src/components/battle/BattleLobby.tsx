'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import type { BattleGameSnapshot } from '@/types/battle';

interface BattleLobbyProps {
  games: BattleGameSnapshot[];
  isAuthenticated: boolean;
  creating: boolean;
  joiningId: string | null;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onCreate: (payload: { name?: string; maxAgents: 3 | 5 | 7 }) => Promise<void>;
  onJoin: (gameId: string) => Promise<void>;
}

export function BattleLobby(props: BattleLobbyProps) {
  const {
    games,
    isAuthenticated,
    creating,
    joiningId,
    loading,
    onRefresh,
    onCreate,
    onJoin,
  } = props;

  const [name, setName] = useState('');
  const [maxAgents, setMaxAgents] = useState<3 | 5 | 7>(5);

  return (
    <div className="space-y-5">
      <section className="battle-panel game-surface glow-ring p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">创建大逃杀房间</h2>

        {!isAuthenticated ? (
          <div className="text-sm text-amber-700">请先登录后再创建房间</div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Input
            label="房间名（可选）"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={40}
            placeholder="比如：今晚大逃杀"
          />
          <div>
            <label className="block text-sm text-slate-700 mb-2">人数</label>
            <select
              value={String(maxAgents)}
              onChange={(event) => setMaxAgents(Number(event.target.value) as 3 | 5 | 7)}
              className="w-full rounded-xl border border-indigo-100 bg-white text-slate-800 px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
            >
              <option value="3">3 人局</option>
              <option value="5">5 人局</option>
              <option value="7">7 人局</option>
            </select>
          </div>
        </div>

        <Button
          isLoading={creating}
          disabled={!isAuthenticated || creating}
          onClick={() =>
            void onCreate({
              name: name.trim() || undefined,
              maxAgents,
            })
          }
        >
          创建大逃杀房间
        </Button>
      </section>

      <section className="battle-panel game-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">房间列表</h2>
          <Button variant="outline" size="sm" isLoading={loading} onClick={() => void onRefresh()}>
            刷新
          </Button>
        </div>

        {games.length === 0 ? (
          <div className="text-sm text-slate-600">暂无房间，先创建一个吧。</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {games.map((game) => (
              <article
                key={game.id}
                className="rounded-xl border border-indigo-100 bg-white/90 px-4 py-3 hover:border-cyan-300/50 hover:bg-cyan-50/45 transition-colors shine-sweep"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="text-sm font-semibold text-slate-900">{game.name}</div>
                  <div className="text-xs text-slate-500">{game.status}</div>
                </div>

                <div className="text-xs text-slate-600 mb-3">
                  人数：{game.agents.length}/{game.maxAgents} · 轮次上限：{game.maxRounds}
                </div>

                <Button
                  size="sm"
                  isLoading={joiningId === game.id}
                  onClick={() => void onJoin(game.id)}
                >
                  加入房间
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
