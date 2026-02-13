'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bot, Crown, PlayCircle, RefreshCw, Users } from 'lucide-react';
import { AuthLoadingScreen, Button, Input } from '@/components/ui';
import { PersonaSelector } from '@/components/business';
import { useAuth } from '@/hooks';
import { HOT_TOPICS } from '@/lib/constants';
import type { AIPersona } from '@/types';
import type { RoomMessage, RoomScoreItem, RoomSessionResult, RoomSnapshot } from '@/types/room';

interface RoomDetailResponse {
  code: number;
  data?: {
    room: RoomSnapshot;
    messages: RoomMessage[];
    result: RoomSessionResult | null;
  };
  message?: string;
}

interface RoomStreamEvent {
  type: string;
  data: Record<string, unknown>;
}

const DEFAULT_PERSONA_ID = 'toxic';

function getStatusMeta(status: RoomSnapshot['status']): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  if (status === 'waiting') {
    return {
      label: '等待中',
      badgeClass: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10',
      dotClass: 'bg-emerald-400',
    };
  }

  if (status === 'active') {
    return {
      label: '进行中',
      badgeClass: 'text-amber-300 border-amber-400/25 bg-amber-400/10',
      dotClass: 'bg-amber-400',
    };
  }

  return {
    label: '已结束',
    badgeClass: 'text-slate-300 border-slate-400/25 bg-slate-400/10',
    dotClass: 'bg-slate-400',
  };
}

export default function RoomDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const roomId = params.id;

  const { user, isAuthenticated, isLoading, login } = useAuth();

  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [result, setResult] = useState<RoomSessionResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [addingBots, setAddingBots] = useState(false);
  const [starting, setStarting] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const [topic, setTopic] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [liveRound, setLiveRound] = useState<number | null>(null);
  const [liveSpeaker, setLiveSpeaker] = useState('');
  const [liveContent, setLiveContent] = useState('');
  const [liveEvent, setLiveEvent] = useState('');
  const [liveScoreboard, setLiveScoreboard] = useState<RoomScoreItem[]>([]);
  const [liveToolLogs, setLiveToolLogs] = useState<string[]>([]);
  const [liveGhostLogs, setLiveGhostLogs] = useState<string[]>([]);

  const [selectedPersona, setSelectedPersona] = useState<AIPersona | null>(null);
  const streamStartedRef = useRef(false);
  const currentMessageRef = useRef<{
    round: number;
    role: string;
    participantId: string;
    content: string;
  } | null>(null);

  const isHost = useMemo(() => {
    if (!room || !user) return false;
    return room.hostUserId === user.id;
  }, [room, user]);

  const isInRoom = useMemo(() => {
    if (!room || !user) return false;
    return room.participants.some((participant) => participant.userId === user.id);
  }, [room, user]);

  const refreshRoom = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const payload = (await response.json()) as RoomDetailResponse;

      if (!response.ok || payload.code !== 0 || !payload.data) {
        setError(payload.message ?? '获取房间详情失败');
        return;
      }

      setRoom(payload.data.room);
      setMessages(payload.data.messages);
      setResult(payload.data.result);

      if (!topic && payload.data.room.topic) {
        setTopic(payload.data.room.topic);
      }
    } catch (fetchError) {
      console.error('Fetch room detail failed:', fetchError);
      setError('获取房间详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, roomId, topic]);

  useEffect(() => {
    if (!selectedPersona) {
      setSelectedPersona({
        id: DEFAULT_PERSONA_ID,
        name: '毒舌老哥',
        archetype: 'toxic',
        style: { tone: '毒舌', length: 'medium', emoji: false, meme: false },
        signature: ['就这？'],
      });
    }
  }, [selectedPersona]);

  useEffect(() => {
    if (!isAuthenticated || !roomId) {
      return;
    }
    void refreshRoom();
  }, [isAuthenticated, roomId, refreshRoom]);

  useEffect(() => {
    if (!isAuthenticated || !isInRoom || room?.status !== 'waiting') {
      return;
    }

    const timer = setInterval(() => {
      void refreshRoom();
    }, 1200);

    return () => {
      clearInterval(timer);
    };
  }, [isAuthenticated, isInRoom, refreshRoom, room?.status]);

  const handleJoin = useCallback(async () => {
    if (!isAuthenticated) {
      login(`/rooms/${roomId}`);
      return;
    }

    setJoining(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ personaId: selectedPersona?.id ?? DEFAULT_PERSONA_ID }),
      });
      const payload = (await response.json()) as { code: number; message?: string };

      if (!response.ok || payload.code !== 0) {
        setError(payload.message ?? '加入房间失败');
        return;
      }

      await refreshRoom();
    } catch (joinError) {
      console.error('Join room failed:', joinError);
      setError('加入房间失败，请稍后重试');
    } finally {
      setJoining(false);
    }
  }, [isAuthenticated, login, refreshRoom, roomId, selectedPersona?.id]);

  const handleAddBots = useCallback(async () => {
    setAddingBots(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomId}/bots`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: 1 }),
      });
      const payload = (await response.json()) as { code: number; message?: string };

      if (!response.ok || payload.code !== 0) {
        setError(payload.message ?? '添加机器人失败');
        return;
      }

      await refreshRoom();
    } catch (botError) {
      console.error('Add bot failed:', botError);
      setError('添加机器人失败，请稍后重试');
    } finally {
      setAddingBots(false);
    }
  }, [refreshRoom, roomId]);

  const handleStart = useCallback(async () => {
    if (!topic.trim()) {
      setError('请先输入本场主题');
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const response = await fetch(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const payload = (await response.json()) as { code: number; message?: string };

      if (!response.ok || payload.code !== 0) {
        setError(payload.message ?? '开局失败');
        return;
      }

      await refreshRoom();
    } catch (startError) {
      console.error('Start room failed:', startError);
      setError('开局失败，请稍后重试');
    } finally {
      setStarting(false);
    }
  }, [refreshRoom, roomId, topic]);

  const startStream = useCallback(async () => {
    if (!roomId || streaming) return;

    setStreaming(true);
    setLiveRound(null);
    setLiveSpeaker('');
    setLiveContent('');
    setLiveEvent('');
    setLiveToolLogs([]);
    setLiveGhostLogs([]);
    currentMessageRef.current = null;

    try {
      const response = await fetch(`/api/rooms/${roomId}/stream`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? '流式连接失败');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processEvent = (rawEvent: string) => {
        const lines = rawEvent.split('\n');
        let type = 'message';
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith('event:')) {
            type = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        }

        if (dataLines.length === 0) return;

        let data: Record<string, unknown> = {};
        try {
          data = JSON.parse(dataLines.join('\n')) as Record<string, unknown>;
        } catch {
          data = {};
        }

        const event: RoomStreamEvent = { type, data };

        if (event.type === 'round_start') {
          setLiveRound(typeof event.data.round === 'number' ? event.data.round : null);
          setLiveToolLogs([]);
          setLiveGhostLogs([]);
          return;
        }

        if (event.type === 'round_event') {
          const emoji = typeof event.data.emoji === 'string' ? event.data.emoji : '🎉';
          const eventName = typeof event.data.eventName === 'string' ? event.data.eventName : '轮次事件';
          const effect = typeof event.data.effect === 'string' ? event.data.effect : '';
          setLiveEvent(`${emoji} ${eventName}${effect ? ` · ${effect}` : ''}`);
          return;
        }

        if (event.type === 'tool_action') {
          const detail = typeof event.data.detail === 'string' ? event.data.detail : '';
          if (detail) {
            setLiveToolLogs((prev) => [detail, ...prev].slice(0, 8));
          }
          return;
        }

        if (event.type === 'ghost_action') {
          const detail = typeof event.data.detail === 'string' ? event.data.detail : '';
          if (detail) {
            setLiveGhostLogs((prev) => [detail, ...prev].slice(0, 8));
          }
          return;
        }

        if (event.type === 'score_update') {
          const scores = Array.isArray(event.data.scores)
            ? (event.data.scores as RoomScoreItem[])
            : [];
          setLiveScoreboard(scores);
          return;
        }

        if (event.type === 'message_start') {
          const round = typeof event.data.round === 'number' ? event.data.round : 0;
          const role = typeof event.data.role === 'string' ? event.data.role : '匿名选手';
          const participantId =
            typeof event.data.participantId === 'string' ? event.data.participantId : `temp_${role}`;

          currentMessageRef.current = { round, role, participantId, content: '' };
          setLiveSpeaker(role);
          setLiveContent('');
          return;
        }

        if (event.type === 'token') {
          const token = typeof event.data.content === 'string' ? event.data.content : '';
          if (!token) return;

          setLiveContent((prev) => prev + token);
          if (currentMessageRef.current) {
            currentMessageRef.current.content += token;
          }
          return;
        }

        if (event.type === 'message_complete') {
          const round =
            typeof event.data.round === 'number'
              ? event.data.round
              : currentMessageRef.current?.round ?? 1;
          const role =
            typeof event.data.role === 'string'
              ? event.data.role
              : currentMessageRef.current?.role ?? '匿名选手';
          const participantId =
            typeof event.data.participantId === 'string'
              ? event.data.participantId
              : currentMessageRef.current?.participantId ?? `temp_${role}`;
          const content =
            typeof event.data.content === 'string'
              ? event.data.content
              : currentMessageRef.current?.content ?? '';

          if (content) {
            setMessages((prev) => {
              const withoutSame = prev.filter(
                (item) => !(item.round === round && item.participantId === participantId)
              );

              const newMessage: RoomMessage = {
                id: `temp_${round}_${participantId}`,
                round,
                participantId,
                role,
                content,
                isBot: typeof event.data.isBot === 'boolean' ? event.data.isBot : false,
                isHost: typeof event.data.isHost === 'boolean' ? event.data.isHost : false,
                timestamp: new Date().toISOString(),
              };

              return [...withoutSame, newMessage].sort((left, right) => {
                if (left.round !== right.round) {
                  return left.round - right.round;
                }
                return Date.parse(left.timestamp) - Date.parse(right.timestamp);
              });
            });
          }

          setLiveSpeaker('');
          setLiveContent('');
          currentMessageRef.current = null;
          return;
        }

        if (event.type === 'done') {
          const doneData = event.data;
          const doneResult: RoomSessionResult = {
            sessionId:
              typeof doneData.sessionId === 'string'
                ? doneData.sessionId
                : `session_${Date.now()}`,
            topic: typeof doneData.topic === 'string' ? doneData.topic : topic,
            participants: Array.isArray(doneData.participants)
              ? doneData.participants.filter((item): item is string => typeof item === 'string')
              : [],
            messages: Array.isArray(doneData.messages) ? (doneData.messages as RoomMessage[]) : [],
            completedAt:
              typeof doneData.completedAt === 'string'
                ? doneData.completedAt
                : new Date().toISOString(),
            totalRounds:
              typeof doneData.totalRounds === 'number' ? doneData.totalRounds : undefined,
            winnerId: typeof doneData.winnerId === 'string' ? doneData.winnerId : undefined,
            winnerName: typeof doneData.winnerName === 'string' ? doneData.winnerName : undefined,
            scores: Array.isArray(doneData.scores)
              ? (doneData.scores as RoomScoreItem[])
              : undefined,
          };

          setResult(doneResult);
          if (doneResult.messages.length > 0) {
            setMessages(doneResult.messages);
          }
          return;
        }

        if (event.type === 'error') {
          const message =
            typeof event.data.message === 'string' ? event.data.message : '流式对局异常中断';
          setError(message);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const normalized = buffer.replace(/\r\n/g, '\n');
        const chunks = normalized.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          processEvent(chunk);
        }
      }

      await refreshRoom();
    } catch (streamError) {
      console.error('Room stream failed:', streamError);
      setError(streamError instanceof Error ? streamError.message : '流式对局失败');
    } finally {
      setStreaming(false);
      setLiveContent('');
      setLiveSpeaker('');
      currentMessageRef.current = null;
      streamStartedRef.current = false;
    }
  }, [refreshRoom, roomId, streaming, topic]);

  useEffect(() => {
    if (!isAuthenticated || !isInRoom || room?.status !== 'active') {
      return;
    }

    if (streaming || streamStartedRef.current) {
      return;
    }

    streamStartedRef.current = true;
    void startStream();
  }, [isAuthenticated, isInRoom, room?.status, roomId, startStream, streaming]);

  const groupedMessages = useMemo(() => {
    const bucket = new Map<number, RoomMessage[]>();
    for (const message of messages) {
      const list = bucket.get(message.round) ?? [];
      list.push(message);
      bucket.set(message.round, list);
    }

    const sortedRounds = Array.from(bucket.keys()).sort((left, right) => left - right);
    return sortedRounds.map((round) => ({
      round,
      messages: (bucket.get(round) ?? []).sort(
        (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp)
      ),
    }));
  }, [messages]);

  const statusMeta = room ? getStatusMeta(room.status) : null;
  const displayScoreboard = result?.scores?.length ? result.scores : liveScoreboard;

  if (isLoading) {
    return <AuthLoadingScreen title="正在同步房间身份" description="会话校验完成后自动进入。" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="premium-bg min-h-screen text-slate-100 flex items-center justify-center px-4">
        <div className="glass-card-premium w-full max-w-md p-8 text-center glow-ring">
          <h1 className="text-lg font-bold mb-3">请先登录</h1>
          <p className="text-sm text-slate-300 mb-6">登录后才能进入房间查看与参赛。</p>
          <Button onClick={() => login(`/rooms/${roomId}`)} isLoading={isLoading}>
            立即登录
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="premium-bg min-h-screen text-slate-100">
      <div className="absolute inset-0 grid-dots opacity-[0.08] pointer-events-none" />

      <header className="relative z-20 border-b border-white/10 bg-slate-950/35 backdrop-blur-xl">
        <div className="container-center py-4 flex items-center justify-between">
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => router.push('/')}
            aria-label="返回大厅"
          >
            <ArrowLeft className="w-5 h-5 text-slate-200" />
          </button>

          <div className="text-center">
            <div className="font-semibold text-white">{room?.name ?? '房间详情'}</div>
            <div className="text-xs text-slate-300/80">
              {statusMeta ? `状态：${statusMeta.label}` : '加载中'}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => void refreshRoom()} isLoading={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="relative z-10 container-center py-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-200 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {room && (
          <section className="glass-card-premium game-surface p-5 shine-sweep">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="inline-flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {room.participants.length}/{room.maxParticipants}
                </span>
                <span>轮次：{room.rounds}</span>
                <span>房主：{room.hostName}</span>
                {room.topic ? <span>主题：{room.topic}</span> : null}
              </div>

              {statusMeta ? (
                <span className={`text-xs px-2 py-1 rounded-full border ${statusMeta.badgeClass}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${statusMeta.dotClass}`} />
                  {statusMeta.label}
                </span>
              ) : null}
            </div>

            <div className="rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Array.from({ length: room.maxParticipants }).map((_, index) => {
                  const participant = room.participants[index];
                  return (
                    <div
                      key={`seat_${index}`}
                      className="rounded-lg border border-emerald-200/20 bg-slate-950/45 px-2 py-3 text-center"
                    >
                      <div className="text-xs text-slate-100 mb-1">
                        {participant ? participant.displayName : '空位'}
                      </div>
                      <div className="text-[11px] text-slate-300/70">
                        {participant ? participant.personaLabel : '-'}
                      </div>
                      <div className="mt-1 flex justify-center">
                        {participant?.isBot ? <Bot className="w-3.5 h-3.5 text-slate-300/80" /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {room?.status === 'waiting' && (
          <section className="glass-card-premium game-surface p-5 space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold">等待区</div>

            {!isInRoom && (
              <div className="rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-200 text-sm px-3 py-2">
                你还未加入该房间，请先加入。
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-slate-100 mb-2">设置你的人设（加入前生效）</h3>
              <PersonaSelector
                selected={selectedPersona?.id}
                onSelect={setSelectedPersona}
                disabled={joining || starting || streaming}
                theme="dark"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleJoin} isLoading={joining} disabled={isInRoom || streaming}>
                加入房间
              </Button>

              <Button
                variant="outline"
                onClick={handleAddBots}
                isLoading={addingBots}
                disabled={!isHost || streaming || room.participants.length >= room.maxParticipants}
              >
                <Bot className="w-4 h-4 mr-2" />
                添加机器人
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
              <Input
                label="本场主题"
                placeholder={HOT_TOPICS[0]?.title ?? '比如：年会画饼'}
                value={topic}
                maxLength={120}
                onChange={(event) => setTopic(event.target.value)}
                disabled={!isHost || streaming}
              />

              <div className="flex items-end">
                <Button
                  onClick={handleStart}
                  isLoading={starting || streaming}
                  disabled={!isHost || !isInRoom || room.participants.length < 2}
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  开始吐槽大赛
                </Button>
              </div>
            </div>
          </section>
        )}

        {(room?.status === 'active' || room?.status === 'finished' || messages.length > 0) && (
          <section className="glass-card-premium game-surface p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">对局舞台</h2>
              {room?.status === 'active' && !streaming ? (
                <Button size="sm" variant="outline" onClick={() => void startStream()}>
                  继续加载流
                </Button>
              ) : null}
            </div>

            {liveEvent && (
              <div className="mb-3 rounded-lg border border-indigo-300/25 bg-indigo-400/10 text-indigo-100 px-3 py-2 text-sm speaker-wave">
                {liveEvent}
              </div>
            )}

            {displayScoreboard.length > 0 && (
              <div className="mb-4 rounded-xl border border-white/10 bg-slate-900/40 p-3">
                <div className="text-xs text-slate-300 mb-2">笑点榜（生存淘汰赛）</div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {displayScoreboard.map((item) => (
                    <div
                      key={`score_${item.participantId}`}
                      className={`rounded-lg border px-3 py-2 ${
                        item.isAlive
                          ? 'border-emerald-400/25 bg-emerald-500/10'
                          : 'border-slate-400/20 bg-slate-600/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm text-slate-100 truncate">{item.role}</div>
                        {item.isAlive ? (
                          <span className="text-[11px] text-emerald-200">存活</span>
                        ) : (
                          <span className="text-[11px] text-slate-300">幽灵</span>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white flex items-center gap-1">
                        <Crown className="w-3.5 h-3.5 text-amber-300" />
                        {item.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(liveToolLogs.length > 0 || liveGhostLogs.length > 0) && (
              <div className="mb-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
                <div className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3">
                  <div className="text-xs text-cyan-100 mb-1">道具声明</div>
                  <div className="space-y-1 text-xs text-cyan-50/95">
                    {liveToolLogs.length === 0 ? (
                      <div>本轮暂无道具动作</div>
                    ) : (
                      liveToolLogs.map((row, index) => <div key={`tool_${index}`}>{row}</div>)
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-purple-300/20 bg-purple-400/10 p-3">
                  <div className="text-xs text-purple-100 mb-1">幽灵行动</div>
                  <div className="space-y-1 text-xs text-purple-50/95">
                    {liveGhostLogs.length === 0 ? (
                      <div>本轮暂无幽灵行动</div>
                    ) : (
                      liveGhostLogs.map((row, index) => <div key={`ghost_${index}`}>{row}</div>)
                    )}
                  </div>
                </div>
              </div>
            )}

            {streaming && (
              <div className="mb-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-300">
                {liveRound ? `第 ${liveRound} 轮` : '准备中'} ·{' '}
                {liveSpeaker ? `${liveSpeaker} 正在输出...` : '等待发言...'}
              </div>
            )}

            {groupedMessages.length === 0 && !streaming ? (
              <div className="text-center text-slate-300/75 py-10">暂无发言，开局后会实时展示。</div>
            ) : (
              <div className="space-y-6">
                {groupedMessages.map((round) => (
                  <div key={round.round}>
                    <div className="text-sm font-semibold text-slate-100 mb-3">第 {round.round} 轮</div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                      {round.messages.map((message) => (
                        <div
                          key={`${message.id}_${message.round}`}
                          className="rounded-xl border border-white/10 bg-slate-900/45 px-4 py-3"
                        >
                          <div className="text-xs text-slate-300/80 mb-1">
                            {message.role}
                            {message.isBot ? ' · 机器人' : ''}
                            {message.isHost ? ' · 房主' : ''}
                          </div>
                          <div className="text-sm text-slate-100 leading-relaxed">{message.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {streaming && liveContent && (
              <div className="mt-4 rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-3">
                <div className="text-xs text-blue-200 mb-1">{liveSpeaker || '当前选手'}</div>
                <div className="text-sm text-blue-100 leading-relaxed">
                  {liveContent}
                  <span className="inline-block w-2 h-4 bg-blue-300 animate-pulse ml-1" />
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
