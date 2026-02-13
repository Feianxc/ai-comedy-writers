'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords } from 'lucide-react';
import { Button } from '@/components/ui';
import { BattleLobby } from '@/components/battle';
import { useAuth } from '@/hooks';
import { useBattleStore } from '@/store/battle-store';
import type { BattleGameSnapshot } from '@/types/battle';
import { getRandomPersona } from '@/lib/constants/personas';

interface BattleListResponse {
  code: number;
  data?: {
    games: BattleGameSnapshot[];
    total: number;
  };
  message?: string;
}

interface BattleCreateResponse {
  code: number;
  data?: {
    game: BattleGameSnapshot;
  };
  message?: string;
}

function pickRandomPersonaPayload(): { personaId: string; personaLabel: string } {
  const persona = getRandomPersona();
  return {
    personaId: persona.id,
    personaLabel: persona.name,
  };
}

export default function BattlePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, login } = useAuth();
  const games = useBattleStore((state) => state.games);
  const setGames = useBattleStore((state) => state.setGames);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userName = useMemo(() => user?.displayName ?? '游客', [user?.displayName]);

  const fetchGames = useCallback(async () => {
    if (!isAuthenticated) {
      setGames([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/battle', {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = (await response.json()) as BattleListResponse;

      if (!response.ok || payload.code !== 0 || !payload.data) {
        setError(payload.message ?? '获取大逃杀房间失败');
        setGames([]);
        return;
      }

      setGames(payload.data.games);
    } catch (fetchError) {
      console.error('Fetch battle games failed:', fetchError);
      setError('获取大逃杀房间失败，请稍后重试');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setGames]);

  useEffect(() => {
    void fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const timer = setInterval(() => {
      void fetchGames();
    }, 1800);

    return () => {
      clearInterval(timer);
    };
  }, [fetchGames, isAuthenticated]);

  const handleCreate = useCallback(
    async (payload: { name?: string; maxAgents: 3 | 5 | 7 }) => {
      if (!isAuthenticated) {
        login('/battle');
        return;
      }

      setCreating(true);
      setError(null);

      try {
        const personaPayload = pickRandomPersonaPayload();
        const response = await fetch('/api/battle', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...payload,
            personaId: personaPayload.personaId,
            personaLabel: personaPayload.personaLabel,
          }),
        });

        const result = (await response.json()) as BattleCreateResponse;
        if (!response.ok || result.code !== 0 || !result.data?.game) {
          setError(result.message ?? '创建大逃杀房间失败');
          return;
        }

        router.push(`/battle/${result.data.game.id}`);
      } catch (createError) {
        console.error('Create battle game failed:', createError);
        setError('创建大逃杀房间失败，请稍后重试');
      } finally {
        setCreating(false);
      }
    },
    [isAuthenticated, login, router]
  );

  const handleJoin = useCallback(
    async (gameId: string) => {
      if (!isAuthenticated) {
        login(`/battle/${gameId}`);
        return;
      }

      setJoiningId(gameId);
      setError(null);

      try {
        const personaPayload = pickRandomPersonaPayload();
        const response = await fetch(`/api/battle/${gameId}/join`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personaId: personaPayload.personaId,
            personaLabel: personaPayload.personaLabel,
          }),
        });

        const payload = (await response.json()) as { code: number; message?: string };
        if (!response.ok || payload.code !== 0) {
          setError(payload.message ?? '加入大逃杀房间失败');
          return;
        }

        router.push(`/battle/${gameId}`);
      } catch (joinError) {
        console.error('Join battle game failed:', joinError);
        setError('加入大逃杀房间失败，请稍后重试');
      } finally {
        setJoiningId(null);
      }
    },
    [isAuthenticated, login, router]
  );

  return (
    <main className="battle-light-bg min-h-screen text-slate-900">
      <div className="absolute inset-0 grid-dots opacity-[0.08] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none premium-scanline" />

      <header className="relative z-20 border-b border-indigo-200/70 bg-white/75 backdrop-blur-xl shadow-[0_8px_28px_rgba(59,130,246,0.12)]">
        <div className="container-center py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="font-semibold tracking-wide text-gradient-arc">嘴强王者大厅</div>
              <div className="text-xs text-slate-600">Battle Mode · 即开即战</div>
            </div>
          </div>

          {!isAuthenticated ? (
            <Button isLoading={isLoading} onClick={() => login('/battle')}>
              登录后进入
            </Button>
          ) : (
            <div className="text-sm text-slate-700">欢迎，{userName}</div>
          )}
        </div>
      </header>

      <div className="relative z-10 container-center py-8 space-y-4">
        <section className="battle-panel game-surface p-6 glow-ring shine-sweep">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-rose-300/35 bg-rose-50 text-rose-700 mb-3">
                <Swords className="w-3.5 h-3.5" />
                Battle Royale MVP
              </div>
              <h1 className="text-2xl font-bold text-slate-900">嘴强王者 · 房间制吐槽生存战</h1>
              <p className="text-sm text-slate-700 mt-2">
                创建房间、邀请玩家/机器人、设置主题后直接开打。
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div>当前房间：{games.length}</div>
              <div className="mt-1">已支持最大 7 人局</div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm shadow-sm">
            {error}
          </div>
        ) : null}

        <BattleLobby
          games={games}
          isAuthenticated={isAuthenticated}
          creating={creating}
          joiningId={joiningId}
          loading={loading}
          onRefresh={fetchGames}
          onCreate={handleCreate}
          onJoin={handleJoin}
        />
      </div>
    </main>
  );
}
