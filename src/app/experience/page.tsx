'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Share2 } from 'lucide-react';
import { MessageBubble } from '@/components/business';
import { apiClient } from '@/lib/api';
import { useStore } from '@/store';
import type { AIPersona, RoastMessage } from '@/types';

interface StreamRoundBlock {
  round: number;
  msgs: RoastMessage[];
}

function ExperienceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSession, setCurrentSession, isGenerating, setIsGenerating } = useStore();

  const topic = searchParams.get('topic') || '';
  const personaId = searchParams.get('personaId') || undefined;

  const [messages, setMessages] = useState<StreamRoundBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedPersona = useMemo<AIPersona | undefined>(() => {
    if (!personaId) return undefined;

    return {
      id: personaId,
      name: '毒舌老哥',
      archetype: 'toxic',
      style: { tone: '毒舌', length: 'medium', emoji: false, meme: false },
      signature: ['毒舌'],
    };
  }, [personaId]);

  useEffect(() => {
    if (!topic) {
      setError('缺少话题参数，请返回首页重新选择。');
      return;
    }

    const abortController = new AbortController();
    let currentRound = 1;
    let currentSpeaker = '';
    let currentIsUser = false;
    let currentContent = '';
    const roundMessages: Record<number, RoastMessage[]> = { 1: [], 2: [] };

    setMessages([]);
    setCurrentSession(null);

    const upsertRoundMessage = (round: number, message: RoastMessage) => {
      setMessages((prev) => {
        const next = prev.length
          ? prev.map((block) => ({ ...block, msgs: [...block.msgs] }))
          : [
              { round: 1, msgs: [] as RoastMessage[] },
              { round: 2, msgs: [] as RoastMessage[] },
            ];

        let block = next.find((item) => item.round === round);
        if (!block) {
          block = { round, msgs: [] };
          next.push(block);
        }

        const lastIndex = block.msgs.length - 1;
        const last = block.msgs[lastIndex];
        if (last && last.role === message.role) {
          block.msgs[lastIndex] = message;
        } else {
          block.msgs.push(message);
        }

        return next.sort((a, b) => a.round - b.round);
      });
    };

    const finalizeCurrentMessage = () => {
      if (!currentSpeaker || !currentContent.trim()) {
        currentContent = '';
        return;
      }

      const message: RoastMessage = {
        role: currentSpeaker,
        content: currentContent,
        isUser: currentIsUser,
      };

      roundMessages[currentRound].push(message);
      upsertRoundMessage(currentRound, message);
      currentContent = '';
    };

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
            userPersona: selectedPersona,
          },
          {
            signal: abortController.signal,
            onEvent: (event) => {
              const data =
                typeof event.data === 'object' && event.data !== null
                  ? (event.data as Record<string, unknown>)
                  : {};

              if (event.type === 'round_start' || event.type === 'start') {
                finalizeCurrentMessage();
                if (typeof data.round === 'number') {
                  currentRound = data.round;
                }
                return;
              }

              if (event.type === 'message_start' || event.type === 'participant') {
                finalizeCurrentMessage();
                currentSpeaker =
                  typeof data.role === 'string'
                    ? data.role
                    : typeof data.name === 'string'
                      ? data.name
                      : '';
                currentIsUser =
                  typeof data.isUser === 'boolean' ? data.isUser : currentSpeaker === '我的AI';
                currentContent = '';
                return;
              }

              if (event.type === 'token') {
                const token = typeof data.content === 'string' ? data.content : '';
                if (!token) return;

                if (!currentSpeaker) {
                  currentSpeaker =
                    typeof data.role === 'string'
                      ? data.role
                      : typeof data.name === 'string'
                        ? data.name
                        : '匿名AI';
                  currentIsUser =
                    typeof data.isUser === 'boolean' ? data.isUser : currentSpeaker === '我的AI';
                }

                currentContent += token;
                upsertRoundMessage(currentRound, {
                  role: currentSpeaker,
                  content: currentContent,
                  isUser: currentIsUser,
                });
                return;
              }

              if (event.type === 'message_complete') {
                const role = typeof data.role === 'string' ? data.role : currentSpeaker;
                const content = typeof data.content === 'string' ? data.content : currentContent;
                const isUser =
                  typeof data.isUser === 'boolean' ? data.isUser : currentIsUser || role === '我的AI';

                if (role && content.trim()) {
                  const message: RoastMessage = { role, content, isUser };
                  roundMessages[currentRound].push(message);
                  upsertRoundMessage(currentRound, message);
                }

                currentContent = '';
                return;
              }

              if (event.type === 'round_end') {
                finalizeCurrentMessage();
                return;
              }

              if (event.type === 'done') {
                finalizeCurrentMessage();

                const sessionId =
                  typeof data.sessionId === 'string' ? data.sessionId : `session_${Date.now()}`;
                const participants = Array.isArray(data.participants)
                  ? data.participants.filter((item): item is string => typeof item === 'string')
                  : [];

                const round1FromEvent = Array.isArray(data.round1)
                  ? (data.round1 as RoastMessage[])
                  : roundMessages[1];
                const round2FromEvent = Array.isArray(data.round2)
                  ? (data.round2 as RoastMessage[])
                  : roundMessages[2];

                setCurrentSession({
                  id: sessionId,
                  topic,
                  userId: 'user',
                  userAgent: { displayName: '我的AI' },
                  userPersona: selectedPersona,
                  round1: round1FromEvent,
                  round2: round2FromEvent,
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
      setIsGenerating(false);
    };
  }, [topic, selectedPersona, setCurrentSession, setIsGenerating]);

  const handleShare = () => {
    if (!currentSession) return;
    router.push(`/result?sessionId=${currentSession.id}`);
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50">
      <header className="container-center py-4 flex items-center justify-between">
        <button onClick={handleBack} className="p-2 hover:bg-white/50 rounded-full" aria-label="返回首页">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-semibold text-gray-800">#{topic || '未选择话题'}</h1>
        <button
          onClick={handleShare}
          disabled={!currentSession}
          className="p-2 hover:bg-white/50 rounded-full disabled:opacity-50"
          aria-label="查看结果页"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      <div className="container-center py-6 pb-24">
        {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">{error}</div>}

        {!topic && !error && (
          <div className="text-center py-12 text-gray-500">参数缺失，请返回首页重新开始。</div>
        )}

        {topic && messages.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">AI们正在准备发言...</p>
          </div>
        )}

        {messages.map((round) => (
          <div key={round.round} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${
                  round.round === 1 ? 'bg-blue-500' : 'bg-purple-500'
                }`}
              >
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
    <Suspense
      fallback={
        <main className="min-h-screen bg-gradient-to-br from-orange-50 to-violet-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        </main>
      }
    >
      <ExperienceContent />
    </Suspense>
  );
}
