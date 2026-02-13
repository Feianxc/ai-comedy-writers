'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { BattleEventRecord, BattleRoundSummary } from '@/types/battle';

interface RoundTimelineProps {
  events: BattleEventRecord[];
  rounds: BattleRoundSummary[];
}

interface RoundTimelineItem {
  round: number;
  eventName: string;
  eventDescription: string;
  speeches: Array<{ agentName: string; content: string }>;
  ratings: Array<{ from: string; target: string; delta: number }>;
  topicPenalties: Array<{ agentName: string; penalty: number }>;
  repeatPenalties: Array<{ agentName: string; penalty: number; similarity?: number | null }>;
  eliminations: string[];
  pressurePenalty: number | null;
}

const AUTO_SCROLL_THRESHOLD = 24;

function isNearBottom(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= AUTO_SCROLL_THRESHOLD;
}

function buildRoundMap(events: BattleEventRecord[], rounds: BattleRoundSummary[]): RoundTimelineItem[] {
  const roundMap = new Map<number, RoundTimelineItem>();

  const ensureRound = (round: number) => {
    const normalizedRound = Math.max(1, round);
    const existing = roundMap.get(normalizedRound);
    if (existing) return existing;

    const fromSummary = rounds.find((item) => item.round === normalizedRound);
    const created: RoundTimelineItem = {
      round: normalizedRound,
      eventName: fromSummary?.eventName ?? '未公布事件',
      eventDescription: fromSummary?.eventDescription ?? '',
      speeches: [],
      ratings: [],
      topicPenalties: [],
      repeatPenalties: [],
      eliminations: [],
      pressurePenalty: null,
    };
    roundMap.set(normalizedRound, created);
    return created;
  };

  for (const event of events) {
    const round = typeof event.data.round === 'number' ? event.data.round : null;
    if (!round) continue;

    const row = ensureRound(round);

    if (event.type === 'battle:event_announced') {
      const eventData = (event.data.event ?? {}) as Record<string, unknown>;
      const name = typeof eventData.name === 'string' ? eventData.name : null;
      const description = typeof eventData.description === 'string' ? eventData.description : '';
      if (name) {
        row.eventName = name;
      }
      row.eventDescription = description;
      continue;
    }

    if (event.type === 'battle:speech_complete') {
      const agentName = typeof event.data.agentName === 'string' ? event.data.agentName : '未知选手';
      const content = typeof event.data.content === 'string' ? event.data.content : '';
      row.speeches.push({ agentName, content });
      continue;
    }

    if (event.type === 'battle:rating_result') {
      const from = typeof event.data.fromAgentName === 'string' ? event.data.fromAgentName : '未知';
      const target = typeof event.data.targetAgentName === 'string' ? event.data.targetAgentName : '未知';
      const delta = typeof event.data.delta === 'number' ? event.data.delta : 0;
      row.ratings.push({ from, target, delta });
      continue;
    }

    if (event.type === 'battle:topic_penalty') {
      const agentName = typeof event.data.agentName === 'string' ? event.data.agentName : '未知选手';
      const penalty = typeof event.data.penalty === 'number' ? event.data.penalty : 0;
      row.topicPenalties.push({ agentName, penalty });
      continue;
    }

    if (event.type === 'battle:repeat_penalty') {
      const agentName = typeof event.data.agentName === 'string' ? event.data.agentName : '未知选手';
      const penalty = typeof event.data.penalty === 'number' ? event.data.penalty : 0;
      const similarity = typeof event.data.similarity === 'number' ? event.data.similarity : null;
      row.repeatPenalties.push({ agentName, penalty, similarity });
      continue;
    }

    if (event.type === 'battle:elimination') {
      const agentName = typeof event.data.agentName === 'string' ? event.data.agentName : '未知选手';
      row.eliminations.push(agentName);
      continue;
    }

    if (event.type === 'battle:pressure_applied') {
      const penalty = typeof event.data.penalty === 'number' ? event.data.penalty : null;
      row.pressurePenalty = penalty;
    }
  }

  for (const summary of rounds) {
    const row = ensureRound(summary.round);
    if (!row.eventName || row.eventName === '未公布事件') {
      row.eventName = summary.eventName;
    }
    if (!row.eventDescription && summary.eventDescription) {
      row.eventDescription = summary.eventDescription;
    }
  }

  return Array.from(roundMap.values()).sort((left, right) => left.round - right.round);
}

export function RoundTimeline({ events, rounds }: RoundTimelineProps) {
  const timeline = useMemo(() => buildRoundMap(events, rounds), [events, rounds]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!autoFollow) return;
    container.scrollTop = container.scrollHeight;
  }, [autoFollow, timeline.length]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    setAutoFollow(isNearBottom(container));
  };

  return (
    <section className="battle-panel p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm font-semibold text-slate-900">轮次时间轴</div>
        <div className="text-xs text-slate-600">{autoFollow ? '自动跟随最新' : '已暂停自动跟随'}</div>
      </div>

      {timeline.length === 0 ? (
        <div className="text-sm text-slate-600">等待首轮开始...</div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="space-y-3 max-h-[520px] overflow-auto pr-1"
        >
          {timeline.map((item) => (
            <article
              key={item.round}
              className="rounded-2xl border border-indigo-100 bg-white/95 p-3 hover:border-violet-300/35 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-cyan-700">第 {item.round} 轮</div>
                <div className="text-xs text-slate-600">事件：{item.eventName}</div>
              </div>

              {item.eventDescription ? (
                <div className="mt-2 text-xs text-slate-700 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1">
                  事件效果：{item.eventDescription}
                </div>
              ) : null}

              {item.pressurePenalty ? (
                <div className="mt-2 text-xs text-rose-700 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1">
                  后期加压：全员额外 -{item.pressurePenalty}
                </div>
              ) : null}

              <div className="mt-2 text-xs text-slate-700">
                发言数：{item.speeches.length} · 互评数：{item.ratings.length}
                {item.eliminations.length > 0 ? ` · 淘汰：${item.eliminations.join('、')}` : ' · 淘汰：无'}
              </div>

              {item.topicPenalties.length > 0 || item.repeatPenalties.length > 0 ? (
                <div className="mt-2 text-xs text-rose-700 space-y-1">
                  {item.topicPenalties.map((row, index) => (
                    <div key={`topic_${item.round}_${row.agentName}_${index}`}>
                      {row.agentName} 偏题扣分 -{row.penalty}
                    </div>
                  ))}
                  {item.repeatPenalties.map((row, index) => (
                    <div key={`repeat_${item.round}_${row.agentName}_${index}`}>
                      {row.agentName} 复读扣分 -{row.penalty}
                      {typeof row.similarity === 'number'
                        ? `（相似度${Math.round(row.similarity * 100)}%）`
                        : ''}
                    </div>
                  ))}
                </div>
              ) : null}

              {item.speeches.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {item.speeches.slice(-2).map((speech, index) => (
                    <div key={`${item.round}_${speech.agentName}_${index}`} className="text-xs text-slate-600">
                      <span className="text-cyan-700">{speech.agentName}</span>：{speech.content}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
