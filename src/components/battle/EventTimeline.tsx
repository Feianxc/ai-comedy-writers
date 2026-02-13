'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Swords } from 'lucide-react';
import type { BattleEventRecord } from '@/types/battle';

interface EventTimelineProps {
  events: BattleEventRecord[];
}

const AUTO_SCROLL_THRESHOLD = 24;

function isNearBottom(element: HTMLElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= AUTO_SCROLL_THRESHOLD;
}

function getEventLabel(type: string): string {
  const map: Record<string, string> = {
    'battle:state_sync': '状态同步',
    'battle:talent_selected': '天赋已选',
    'battle:round_start': '回合开始',
    'battle:event_announced': '轮次事件',
    'battle:item_bought': '道具声明',
    'battle:speech_turn': '轮到发言',
    'battle:speech_start': '开始发言',
    'battle:speech_complete': '发言完成',
    'battle:rating_result': '互评结果',
    'battle:topic_penalty': '偏题惩罚',
    'battle:repeat_penalty': '复读惩罚',
    'battle:score_update': '笑点结算',
    'battle:pressure_applied': '后期加压',
    'battle:elimination': '淘汰',
    'battle:round_end': '回合结束',
    'battle:game_over': '对局结束',
    'battle:error': '对局异常',
  };

  return map[type] ?? type;
}

function summarizeEvent(event: BattleEventRecord): string {
  const data = event.data;

  if (event.type === 'battle:speech_complete') {
    const agentName = typeof data.agentName === 'string' ? data.agentName : '某选手';
    const content = typeof data.content === 'string' ? data.content : '';
    return `${agentName}：${content}`;
  }

  if (event.type === 'battle:event_announced') {
    const eventObj = (data.event ?? {}) as Record<string, unknown>;
    const name = typeof eventObj.name === 'string' ? eventObj.name : '未知事件';
    const description = typeof eventObj.description === 'string' ? eventObj.description : '';
    return `${name}${description ? ` · ${description}` : ''}`;
  }

  if (event.type === 'battle:rating_result') {
    const from = typeof data.fromAgentName === 'string' ? data.fromAgentName : '某人';
    const target = typeof data.targetAgentName === 'string' ? data.targetAgentName : '某人';
    const delta = typeof data.delta === 'number' ? data.delta : 0;
    return `${from} 评价 ${target}：${delta >= 0 ? '+' : ''}${delta}`;
  }

  if (event.type === 'battle:topic_penalty') {
    const agentName = typeof data.agentName === 'string' ? data.agentName : '某选手';
    const penalty = typeof data.penalty === 'number' ? data.penalty : 0;
    return `${agentName} 偏离主题，扣分 ${penalty}`;
  }

  if (event.type === 'battle:repeat_penalty') {
    const agentName = typeof data.agentName === 'string' ? data.agentName : '某选手';
    const penalty = typeof data.penalty === 'number' ? data.penalty : 0;
    const similarity = typeof data.similarity === 'number' ? data.similarity : null;
    return `${agentName} 复读惩罚 -${penalty}${similarity ? `（相似度${Math.round(similarity * 100)}%）` : ''}`;
  }

  if (event.type === 'battle:score_update') {
    const round = typeof data.round === 'number' ? data.round : null;
    return round ? `第 ${round} 轮笑点更新` : '笑点更新';
  }

  if (event.type === 'battle:round_start') {
    const round = typeof data.round === 'number' ? data.round : null;
    return round ? `第 ${round} 轮开始` : '回合开始';
  }

  if (event.type === 'battle:round_end') {
    const round = typeof data.round === 'number' ? data.round : null;
    return round ? `第 ${round} 轮结束` : '回合结束';
  }

  if (event.type === 'battle:pressure_applied') {
    const round = typeof data.round === 'number' ? data.round : null;
    const penalty = typeof data.penalty === 'number' ? data.penalty : 0;
    return `${round ? `第 ${round} 轮` : '当前轮'}全员额外 -${penalty}`;
  }

  if (event.type === 'battle:elimination') {
    const agentName = typeof data.agentName === 'string' ? data.agentName : '某选手';
    return `${agentName} 已淘汰`;
  }

  if (event.type === 'battle:game_over') {
    const result = (data.result ?? {}) as Record<string, unknown>;
    const winnerName = typeof result.winnerName === 'string' ? result.winnerName : '未知';
    return `冠军：${winnerName}`;
  }

  return '';
}

export function EventTimeline({ events }: EventTimelineProps) {
  const visibleEvents = useMemo(
    () => events.filter((event) => event.type !== 'battle:speech_token'),
    [events]
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!autoFollow) return;
    container.scrollTop = container.scrollHeight;
  }, [autoFollow, visibleEvents.length]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    setAutoFollow(isNearBottom(container));
  };

  return (
    <section className="battle-panel p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-600" />系统事件流
        </div>
        <div className="text-xs text-slate-600">{autoFollow ? '自动跟随最新' : '已暂停自动跟随'}</div>
      </div>

      {visibleEvents.length === 0 ? (
        <div className="text-sm text-slate-600">等待事件推送...</div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="space-y-2 max-h-[520px] overflow-auto pr-1"
        >
          {visibleEvents.map((event, index) => {
            const summary = summarizeEvent(event);
            return (
              <div
                key={`${event.timestamp}_${index}`}
                className="rounded-lg border border-indigo-100 bg-white px-3 py-2 hover:border-fuchsia-300/35 transition-colors"
              >
                <div className="text-xs text-cyan-700 inline-flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5" />{getEventLabel(event.type)}
                </div>
                {summary ? <div className="text-xs text-slate-700 mt-1">{summary}</div> : null}
                <div className="text-[11px] text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
