'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Bot,
  Check,
  Crown,
  Home,
  PartyPopper,
  Play,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  UserPlus,
  WandSparkles,
  X,
} from 'lucide-react';
import { BattleHeader, EventTimeline, RoundTimeline, ScoreBoard, SpeechFeed } from '@/components/battle';
import { AuthLoadingScreen, Button, Input } from '@/components/ui';
import { useAuth } from '@/hooks';
import { useBattleStream } from '@/hooks/useBattleStream';
import { useBattleStore } from '@/store/battle-store';
import type { BattleGameDetail, BattleRoundSummary, BattleScoreItem } from '@/types/battle';
import { getRandomPersona } from '@/lib/constants/personas';

interface BattleDetailResponse {
  code: number;
  data?: BattleGameDetail;
  message?: string;
}

interface BattleMutationResponse {
  code: number;
  data?: {
    game: BattleGameDetail['game'];
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

function mapScoresFromGame(game: BattleGameDetail['game']): BattleScoreItem[] {
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

export default function BattleRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const { user, isAuthenticated, isLoading, login } = useAuth();
  const currentGame = useBattleStore((state) => state.currentGame);
  const events = useBattleStore((state) => state.events);
  const connectionStatus = useBattleStore((state) => state.connectionStatus);
  const setGameDetail = useBattleStore((state) => state.setGameDetail);
  const setCurrentGame = useBattleStore((state) => state.setCurrentGame);
  const setScores = useBattleStore((state) => state.setScores);
  const setCurrentResult = useBattleStore((state) => state.setCurrentResult);
  const clearEvents = useBattleStore((state) => state.clearEvents);
  const resetBattle = useBattleStore((state) => state.resetBattle);

  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [addingBot, setAddingBot] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startingStream, setStartingStream] = useState(false);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [rounds, setRounds] = useState<BattleRoundSummary[]>([]);
  const [showChampionModal, setShowChampionModal] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ shareUrl: string; copyText: string } | null>(null);
  const [showItemFx, setShowItemFx] = useState(false);
  const [lastItemEventAt, setLastItemEventAt] = useState('');
  const [copied, setCopied] = useState(false);
  const [showChampionBurst, setShowChampionBurst] = useState(false);
  const [showReconnectHint, setShowReconnectHint] = useState(false);
  const prevStatusRef = useRef<'waiting' | 'active' | 'finished' | null>(null);
  const itemFxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const championBurstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isHost = useMemo(() => {
    if (!currentGame || !user) {
      return false;
    }
    return currentGame.hostUserId === user.id;
  }, [currentGame, user]);

  const isInGame = useMemo(() => {
    if (!currentGame || !user) {
      return false;
    }
    return currentGame.agents.some((agent) => agent.userId === user.id);
  }, [currentGame, user]);

  useBattleStream({
    gameId,
    enabled: streamEnabled,
  });

  const canStart =
    !!currentGame &&
    isHost &&
    currentGame.status === 'waiting' &&
    currentGame.agents.length >= 2 &&
    !starting &&
    !startingStream;

  const isWaitingStatus = currentGame?.status === 'waiting';

  const refreshDetail = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/battle/${gameId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = (await response.json()) as BattleDetailResponse;

      if (!response.ok || payload.code !== 0 || !payload.data) {
        if (response.status === 404) {
          setError('房间状态正在同步，请稍后自动重试…');
        } else {
          setError(payload.message ?? '获取大逃杀房间失败');
        }
        return;
      }

      setGameDetail(payload.data);
      setCurrentGame(payload.data.game);
      setScores(mapScoresFromGame(payload.data.game));
      setRounds(payload.data.rounds ?? []);

      setTopic((prev) => prev || payload.data?.game.topic || prev);

      if (payload.data.result) {
        setCurrentResult(payload.data.result);
      }
    } catch (fetchError) {
      console.error('Fetch battle detail failed:', fetchError);
      setError('获取房间详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [gameId, isAuthenticated, setCurrentGame, setCurrentResult, setGameDetail, setScores]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void refreshDetail();
  }, [isAuthenticated, refreshDetail]);

  useEffect(() => {
    if (!isAuthenticated || !isInGame || !isWaitingStatus) {
      return;
    }

    const timer = setInterval(() => {
      void refreshDetail();
    }, 1200);

    return () => {
      clearInterval(timer);
    };
  }, [isAuthenticated, isInGame, isWaitingStatus, refreshDetail]);

  useEffect(() => {
    return () => {
      resetBattle();
    };
  }, [resetBattle]);

  const connectStream = useCallback(async () => {
    setStreamEnabled(true);
  }, []);

  const handleJoin = useCallback(async () => {
    if (!isAuthenticated) {
      login(`/battle/${gameId}`);
      return;
    }

    setJoining(true);
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

      const payload = (await response.json()) as BattleMutationResponse;
      if (!response.ok || payload.code !== 0) {
        setError(payload.message ?? '加入房间失败');
        return;
      }

      if (payload.data?.game) {
        setCurrentGame(payload.data.game);
        setScores(mapScoresFromGame(payload.data.game));
      }
    } catch (joinError) {
      console.error('Join battle room failed:', joinError);
      setError('加入房间失败，请稍后重试');
    } finally {
      setJoining(false);
    }
  }, [gameId, isAuthenticated, login, setCurrentGame, setScores]);

  const handleAddBot = useCallback(async () => {
    if (!currentGame) {
      return;
    }

    setAddingBot(true);
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
          asBot: true,
          botCount: 1,
        }),
      });

      const payload = (await response.json()) as BattleMutationResponse;
      if (!response.ok || payload.code !== 0) {
        setError(payload.message ?? '添加机器人失败');
        return;
      }

      if (payload.data?.game) {
        setCurrentGame(payload.data.game);
        setScores(mapScoresFromGame(payload.data.game));
      }
    } catch (botError) {
      console.error('Add battle bot failed:', botError);
      setError('添加机器人失败，请稍后重试');
    } finally {
      setAddingBot(false);
    }
  }, [currentGame, gameId, setCurrentGame, setScores]);

  const handleStart = useCallback(async () => {
    if (!topic.trim()) {
      setError('请先输入本场主题');
      return;
    }

    setStarting(true);
    setError(null);
    try {
      const response = await fetch(`/api/battle/${gameId}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const payload = (await response.json()) as BattleMutationResponse;
      if (!response.ok || payload.code !== 0) {
        setError(payload.message ?? '开局失败');
        return;
      }

      if (payload.data?.game) {
        setCurrentGame(payload.data.game);
        setScores(mapScoresFromGame(payload.data.game));
      }

      setShareResult(null);
      setShowChampionModal(false);
      clearEvents();
      setRounds([]);

      setStartingStream(true);
      await connectStream();
    } catch (startError) {
      console.error('Start battle failed:', startError);
      setError('开局失败，请稍后重试');
    } finally {
      setStarting(false);
      setStartingStream(false);
    }
  }, [clearEvents, connectStream, gameId, setCurrentGame, setScores, topic]);

  const handleResetGame = useCallback(async () => {
    if (!isHost || !currentGame || currentGame.status !== 'finished') {
      return;
    }

    setStartingStream(true);
    setError(null);
    try {
      const response = await fetch(`/api/battle/${gameId}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: 'reset', reset: true }),
      });
      const payload = (await response.json()) as BattleMutationResponse;
      if (!response.ok || payload.code !== 0 || !payload.data?.game) {
        setError(payload.message ?? '重开失败');
        return;
      }

      clearEvents();
      setRounds([]);
      setShareResult(null);
      setTopic('');
      setShowChampionModal(false);
      setCurrentGame(payload.data.game);
      setScores(mapScoresFromGame(payload.data.game));
      setStreamEnabled(true);
    } catch (resetError) {
      console.error('Reset battle failed:', resetError);
      setError('重开失败，请稍后再试');
    } finally {
      setStartingStream(false);
    }
  }, [clearEvents, currentGame, gameId, isHost, setCurrentGame, setScores]);

  const handleShareBattle = useCallback(async (options?: { openImmediately?: boolean }) => {
    if (!currentGame || currentGame.status !== 'finished') {
      return;
    }

    if (options?.openImmediately && shareResult?.shareUrl) {
      const parsed = new URL(shareResult.shareUrl);
      router.push(parsed.pathname);
      return;
    }

    setSharing(true);
    setError(null);
    try {
      const response = await fetch(`/api/battle/${gameId}/share`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${currentGame.topic ?? '嘴强王者'} · 战报`,
        }),
      });

      const payload = (await response.json()) as {
        code: number;
        data?: { shareUrl: string; copyText: string };
        message?: string;
      };

      if (!response.ok || payload.code !== 0 || !payload.data) {
        setError(payload.message ?? '生成分享失败');
        return;
      }

      setShareResult({
        shareUrl: payload.data.shareUrl,
        copyText: payload.data.copyText,
      });

      if (options?.openImmediately) {
        const parsed = new URL(payload.data.shareUrl);
        router.push(parsed.pathname);
      }

      try {
        await navigator.clipboard.writeText(payload.data.copyText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        // ignore clipboard failure
      }
    } catch (shareError) {
      console.error('Share battle failed:', shareError);
      setError('生成分享失败，请稍后再试');
    } finally {
      setSharing(false);
    }
  }, [currentGame, gameId, router, shareResult?.shareUrl]);

  useEffect(() => {
    if (!currentGame) {
      return;
    }

    if (!isInGame || currentGame.status !== 'active') {
      return;
    }

    if (!streamEnabled) {
      void connectStream();
    }
  }, [connectStream, currentGame, isInGame, streamEnabled]);

  useEffect(() => {
    if (!currentGame) {
      prevStatusRef.current = null;
      return;
    }

    if (prevStatusRef.current === 'active' && currentGame.status === 'finished') {
      setShowChampionModal(true);
      setShowChampionBurst(true);
      if (championBurstTimerRef.current) {
        clearTimeout(championBurstTimerRef.current);
      }
      championBurstTimerRef.current = setTimeout(() => {
        setShowChampionBurst(false);
        championBurstTimerRef.current = null;
      }, 2600);
    }
    prevStatusRef.current = currentGame.status;
  }, [currentGame]);

  useEffect(() => {
    if (!currentGame) {
      return;
    }

    if (currentGame.status !== 'active' && streamEnabled) {
      setStreamEnabled(false);
    }
  }, [currentGame, streamEnabled]);

  useEffect(() => {
    if (!currentGame || currentGame.status !== 'active') {
      setShowReconnectHint(false);
      return;
    }

    if (connectionStatus !== 'disconnected' && connectionStatus !== 'error') {
      setShowReconnectHint(false);
      return;
    }

    const hintTimer = setTimeout(() => {
      setShowReconnectHint(true);
    }, 1200);

    const retryTimer = setInterval(() => {
      void refreshDetail();
    }, 1800);

    return () => {
      clearTimeout(hintTimer);
      clearInterval(retryTimer);
    };
  }, [connectionStatus, currentGame, refreshDetail]);

  useEffect(() => {
    const latestItemEvent = [...events]
      .reverse()
      .find((event) => event.type === 'battle:item_bought');
    if (!latestItemEvent) {
      return;
    }

    if (latestItemEvent.timestamp === lastItemEventAt) {
      return;
    }

    const actions = Array.isArray(latestItemEvent.data.actions) ? latestItemEvent.data.actions : [];
    const hasRealItem = actions.some((row) => {
      if (!row || typeof row !== 'object') {
        return false;
      }
      const itemName = (row as Record<string, unknown>).itemName;
      return typeof itemName === 'string' && itemName.trim().length > 0;
    });

    setLastItemEventAt(latestItemEvent.timestamp);
    if (!hasRealItem) {
      return;
    }

    if (itemFxTimerRef.current) {
      clearTimeout(itemFxTimerRef.current);
    }
    setShowItemFx(true);
    itemFxTimerRef.current = setTimeout(() => {
      setShowItemFx(false);
      itemFxTimerRef.current = null;
    }, 1300);
  }, [events, lastItemEventAt]);

  useEffect(() => {
    return () => {
      if (itemFxTimerRef.current) {
        clearTimeout(itemFxTimerRef.current);
      }
      if (championBurstTimerRef.current) {
        clearTimeout(championBurstTimerRef.current);
      }
    };
  }, []);

  const connectionStatusText = useMemo(() => {
    if (currentGame?.status === 'finished') {
      return 'finished';
    }

    if (showReconnectHint && connectionStatus === 'disconnected' && currentGame?.status === 'active') {
      return 'reconnecting';
    }

    if (showReconnectHint && connectionStatus === 'error' && currentGame?.status === 'active') {
      return 'reconnecting';
    }

    return connectionStatus;
  }, [connectionStatus, currentGame?.status, showReconnectHint]);

  const connectionToneClass =
    connectionStatusText === 'connected'
      ? 'text-emerald-600'
      : connectionStatusText === 'reconnecting'
        ? 'text-amber-600'
        : connectionStatusText === 'finished'
          ? 'text-cyan-600'
          : 'text-slate-600';

  const connectionStatusLabelMap: Record<string, string> = {
    idle: '待机',
    connecting: '连接中',
    connected: '已连接',
    reconnecting: '重连中',
    error: '连接异常',
    disconnected: '已断开',
    finished: '对局结束',
  };

  if (isLoading) {
    return <AuthLoadingScreen title="正在同步战局身份" description="已为你保留房间连接，马上进入。" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="battle-light-bg min-h-screen text-slate-900 flex items-center justify-center px-4">
        <div className="battle-panel p-6 w-full max-w-xl">
          <h1 className="text-xl font-bold text-slate-900">请先登录后进入房间</h1>
          <p className="text-sm text-slate-600 mt-2">你需要登录后才能加入或创建 Battle 房间。</p>
          <div className="flex gap-3 mt-5">
            <Button onClick={() => login(`/battle/${gameId}`)}>去登录</Button>
            <Link href="/battle">
              <Button variant="outline">返回大厅</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="battle-light-bg min-h-screen text-slate-900 overflow-x-hidden">
      <div className="absolute inset-0 grid-dots opacity-[0.08] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none premium-scanline" />
      {showChampionBurst ? (
        <div className="champion-burst pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
          <div className="champion-burst-core">
            <PartyPopper className="w-8 h-8" />
            冠军诞生！
          </div>
        </div>
      ) : null}
      {showItemFx ? (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center pt-20">
          <div className="item-fx-pill">
            <WandSparkles className="w-4 h-4" />
            道具已发动
          </div>
        </div>
      ) : null}

      <header className="relative z-20 border-b border-indigo-200/70 bg-white/70 backdrop-blur-xl shadow-[0_8px_28px_rgba(59,130,246,0.12)]">
        <div className="container-center py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div>
              <div className="font-semibold tracking-wide text-gradient-arc">嘴强王者 · 对战房间</div>
              <div className="text-xs text-slate-600">房间 ID：{gameId}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/battle" className="inline-flex">
              <Button
                variant="outline"
                size="sm"
                className="border-indigo-200 bg-white text-slate-700 hover:bg-indigo-50"
              >
                <Home className="w-4 h-4 mr-1" />返回大厅
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              className="border-indigo-200 bg-white text-slate-700 hover:bg-indigo-50"
              isLoading={loading}
              onClick={() => void refreshDetail()}
            >
              <RotateCcw className="w-4 h-4 mr-1" />刷新
            </Button>
            {currentGame?.status === 'finished' ? (
              <Button size="sm" onClick={() => router.push(`/battle/${gameId}/result`)}>
                <Trophy className="w-4 h-4 mr-1" />查看结果
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="relative z-10 container-center py-8 space-y-5">
        {error ? (
          <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 text-sm shadow-sm">
            {error}
          </div>
        ) : null}

        {!currentGame ? (
          <section className="battle-panel p-5 text-sm text-slate-700">正在加载房间信息...</section>
        ) : (
          <>
            <BattleHeader game={currentGame} />

            <section className="battle-panel game-surface glow-ring p-5 space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm text-slate-700">连接状态：</span>
                <span
                  className={`text-sm font-medium rounded-full px-2 py-0.5 ${connectionToneClass} ${connectionStatusText === 'connected' ? 'holo-border pulse-live' : ''}`}
                >
                  {connectionStatusLabelMap[connectionStatusText] ?? connectionStatusText}
                </span>
                {!isInGame ? (
                  <Button size="sm" isLoading={joining} onClick={() => void handleJoin()}>
                    <UserPlus className="w-4 h-4 mr-1" />加入房间
                  </Button>
                ) : null}
                {isHost && currentGame.status === 'waiting' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-indigo-200 bg-white text-slate-700 hover:bg-indigo-50"
                    isLoading={addingBot}
                    onClick={() => void handleAddBot()}
                    disabled={currentGame.agents.length >= currentGame.maxAgents}
                  >
                    <Bot className="w-4 h-4 mr-1" />补 1 个机器人
                  </Button>
                ) : null}
                {isHost && currentGame.status === 'active' ? (
                  <Button size="sm" disabled>
                    对局进行中
                  </Button>
                ) : null}
                {isHost && currentGame.status === 'finished' ? (
                  <Button size="sm" isLoading={startingStream} onClick={() => void handleResetGame()}>
                    重新开始
                  </Button>
                ) : null}
              </div>

              {isHost && currentGame.status === 'waiting' ? (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-end">
                  <Input
                    label="本场主题"
                    placeholder="例如：2026最离谱的打工现场"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    maxLength={120}
                  />
                  <Button disabled={!canStart} isLoading={starting} onClick={() => void handleStart()}>
                    <Play className="w-4 h-4 mr-1" />开始大逃杀
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-slate-700">
                  主题：{currentGame.topic ?? '房主尚未设置'}
                </div>
              )}

              {currentGame.status === 'finished' ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" isLoading={sharing} onClick={() => void handleShareBattle()}>
                    <Share2 className="w-4 h-4 mr-1" />分享战报
                  </Button>
                  {copied ? (
                    <span className="inline-flex items-center rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs text-cyan-700">
                      <Check className="w-3.5 h-3.5 mr-1" />分享文案已复制
                    </span>
                  ) : null}
                  {shareResult ? (
                    <a
                      href={shareResult.shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-100"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />查看分享页
                    </a>
                  ) : null}
                </div>
              ) : null}
            </section>

            <ScoreBoard agents={currentGame.agents} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
              <SpeechFeed events={events} />
              <RoundTimeline events={events} rounds={rounds} />
              <EventTimeline events={events} />
            </div>
          </>
        )}
      </div>

      {showChampionModal && currentGame?.status === 'finished' ? (
        <div className="fixed inset-0 z-50 bg-indigo-950/35 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="champion-modal champion-modal-light w-full max-w-md rounded-2xl border border-amber-300/45 bg-white/95 p-6 shadow-[0_24px_80px_rgba(79,70,229,0.32)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-amber-700 inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />本局已结束
                </div>
                <div className="mt-1 text-2xl font-bold text-slate-900 inline-flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-300" />冠军：{currentGame.winnerName ?? '未知'}
                </div>
                <div className="mt-2 text-sm text-slate-600">主题：{currentGame.topic ?? '-'}</div>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white w-8 h-8 hover:bg-slate-50"
                onClick={() => setShowChampionModal(false)}
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => router.push(`/battle/${gameId}/result`)}>
                <Trophy className="w-4 h-4 mr-1" />查看完整结算
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleShareBattle({ openImmediately: true })}
                isLoading={sharing}
              >
                <Share2 className="w-4 h-4 mr-1" />分享战报
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
