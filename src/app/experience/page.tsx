'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessageBubble } from '@/components/business';
import { apiClient } from '@/lib/api';
import { useStore } from '@/store';
import { ArrowLeft, Share2 } from 'lucide-react';
import type { RoastMessage, AIPersona } from '@/types';

function ExperienceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSession, setCurrentSession, isGenerating, setIsGenerating } = useStore();

  const topic = searchParams.get('topic') || '';
  const personaId = searchParams.get('personaId') || undefined;

  const [messages, setMessages] = useState<Array<{ round: number; msgs: RoastMessage[] }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topic) return;

    const abortController = new AbortController();
    let currentRound = 1;
    let currentSpeaker = '';
    let currentContent = '';
    const roundMessages: Record<number, RoastMessage[]> = { 1: [], 2: [] };

    const generate = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        await apiClient.streamRoast(
          {
            topic,
            userAgent: {
              id: 'user',
              displayName: '我的AI',
            },
            userPersona: personaId
              ? ({
                  id: personaId,
                  name: '',
                  archetype: 'toxic',
                  style: { tone: '', length: 'medium', emoji: false, meme: false },
                  signature: [],
                } satisfies AIPersona)
              : undefined,
          },
          {
            signal: abortController.signal,
            onEvent: (event) => {
              const data =
                typeof event.data === 'object' && event.data !== null
                  ? (event.data as Record<string, unknown>)
                  : {};

              if (event.type === 'start') {
                if (typeof data.round === 'number') {
                  currentRound = data.round;
                }
                return;
              }

              if (event.type === 'participant') {
                currentSpeaker =
                  typeof data.name === 'string'
                    ? data.name
                    : typeof data.role === 'string'
                      ? data.role
                      : '';
                currentContent = '';
                return;
              }

              if (event.type === 'token') {
                const token = typeof data.content === 'string' ? data.content : '';
                currentContent += token;

                setMessages((prev) => {
                  const roundIdx = Math.max(currentRound - 1, 0);
                  const next = prev.length
                    ? [...prev]
                    : [
                        { round: 1, msgs: [] as RoastMessage[] },
                        { round: 2, msgs: [] as RoastMessage[] },
                      ];

                  const targetRound = next[roundIdx] ?? {
                    round: currentRound,
                    msgs: [] as RoastMessage[],
                  };
                  next[roundIdx] = targetRound;

                  const lastMsg = targetRound.msgs[targetRound.msgs.length - 1];
                  if (lastMsg && lastMsg.role === currentSpeaker) {
                    targetRound.msgs = targetRound.msgs.map((msg, msgIdx) =>
                      msgIdx === targetRound.msgs.length - 1
                        ? { ...msg, content: currentContent }
                        : msg
                    );
                  } else {
                    targetRound.msgs = [
                      ...targetRound.msgs,
                      {
                        role: currentSpeaker,
                        content: currentContent,
                        isUser: currentSpeaker === '我的AI',
                      },
                    ];
                  }

                  return next;
                });
                return;
              }

              if (event.type === 'round_end') {
                currentContent = '';
                return;
              }

              if (event.type === 'done') {
                const sessionId =
                  typeof data.sessionId === 'string' ? data.sessionId : `session_${Date.now()}`;
                const participants = Array.isArray(data.participants)
                  ? data.participants.filter((item): item is string => typeof item === 'string')
                  : [];

                setCurrentSession({
                  id: sessionId,
                  topic,
                  userId: 'user',
                  userAgent: { displayName: '我的AI' },
                  userPersona: {
                    id: personaId || 'toxic',
                    name: '毒舌老哥',
                    archetype: 'toxic',
                    style: { tone: '毒舌', length: 'medium', emoji: false, meme: false },
                    signature: ['毒舌'],
                  },
                  round1: roundMessages[1],
                  round2: roundMessages[2],
                  participants,
                  createdAt: new Date(),
                });
                setIsGenerating(false);
                return;
              }

              if (event.type === 'error') {
                const message =
                  typeof data.message === 'string'
                    ? data.message
                    : typeof data.error === 'string'
                      ? data.error
                      : '连接中断，请重试';
                setError(message);
                setIsGenerating(false);
              }
            },
          }
        );
      } catch (err) {
        if (abortController.signal.aborted) return;
        setError(err instanceof Error ? err.message : '生成失败');
        setIsGenerating(false);
      }
    };

    void generate();

    return () => {
      abortController.abort();
    };
  }, [topic, personaId, setCurrentSession, setIsGenerating]);

  const handleShare = () => {
    if (currentSession) {
      router.push(`/result?sessionId=${currentSession.id}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50">
      {/* 顶部栏 */}
      <header className="container-center py-4 flex items-center justify-between">
        <button onClick={handleBack} className="p-2 hover:bg-white/50 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-semibold text-gray-800">#{topic}</h1>
        <button
          onClick={handleShare}
          disabled={!currentSession}
          className="p-2 hover:bg-white/50 rounded-full disabled:opacity-50"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      {/* 消息区域 */}
      <div className="container-center py-6 pb-24">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {messages.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">AI们正在准备发言...</p>
          </div>
        )}

        {messages.map((round) => (
          <div key={round.round} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${round.round === 1 ? 'bg-blue-500' : 'bg-purple-500'}`}>
                {round.round}
              </span>
              <span className="text-sm font-medium text-gray-600">
                {round.round === 1 ? '第一轮：初见锋芒' : '第二轮：火力全开'}
              </span>
            </div>
            <div className="space-y-4">
              {round.msgs.map((msg, idx) => (
                <MessageBubble key={`${round.round}-${idx}`} message={msg} />
              ))}
            </div>
          </div>
        ))}

        {isGenerating && messages.length > 0 && (
          <div className="flex justify-center">
            <div className="w-2 h-4 bg-gray-400 animate-pulse" />
          </div>
        )}
      </div>
    </main>
  );
}

export default function ExperiencePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </main>
    }>
      <ExperienceContent />
    </Suspense>
  );
}
