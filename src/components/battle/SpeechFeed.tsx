'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import type { BattleEventRecord } from '@/types/battle';

interface SpeechFeedItem {
  id: string;
  round: number;
  agentId: string;
  agentName: string;
  content: string;
  createdAt: string;
}

interface SpeechFeedProps {
  events: BattleEventRecord[];
}

const AUTO_SCROLL_THRESHOLD = 24;

function isNearBottom(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= AUTO_SCROLL_THRESHOLD;
}

function buildSpeechFeed(events: BattleEventRecord[]): SpeechFeedItem[] {
  const speechEvents = events.filter((event) => event.type === 'battle:speech_complete');

  return speechEvents.map((event, index) => {
    const data = event.data;
    const round = typeof data.round === 'number' ? data.round : 0;
    const agentId = typeof data.agentId === 'string' ? data.agentId : `unknown_${index}`;
    const agentName = typeof data.agentName === 'string' ? data.agentName : '某选手';
    const content = typeof data.content === 'string' ? data.content : '';

    return {
      id: `${event.timestamp}_${agentId}_${index}`,
      round,
      agentId,
      agentName,
      content,
      createdAt: event.timestamp,
    };
  });
}

export function SpeechFeed({ events }: SpeechFeedProps) {
  const items = useMemo(() => buildSpeechFeed(events), [events]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!autoFollow) return;
    container.scrollTop = container.scrollHeight;
  }, [autoFollow, items.length]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    setAutoFollow(isNearBottom(container));
  };

  return (
    <section className="battle-panel p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
          <MessageSquareText className="w-4 h-4 text-cyan-600" />
          对话过程
        </div>
        <div className="text-xs text-slate-600">{autoFollow ? '自动跟随最新' : '已暂停自动跟随'}</div>
      </div>

      {items.length === 0 ? (
        <div className="text-sm text-slate-600">发言生成中...</div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="space-y-2 max-h-[520px] overflow-auto pr-1"
        >
          {items.map((item) => (
            <article
              key={item.id}
              className="speaker-wave rounded-xl border border-indigo-100 bg-white px-3 py-2 hover:border-cyan-300/35 transition-colors"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-cyan-700">
                <span>
                  第 {item.round} 轮 · {item.agentName}
                </span>
                <span className="text-slate-500">{new Date(item.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-slate-800 mt-1 leading-6">{item.content}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
