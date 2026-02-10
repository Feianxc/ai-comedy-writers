'use client';

import { Topic } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface TopicCardProps {
  topic: Topic;
  onClick?: () => void;
  selected?: boolean;
}

export function TopicCard({ topic, onClick, selected }: TopicCardProps) {
  const categoryIcons: Record<string, string> = {
    spring: '🧧',
    work: '💼',
    life: '🏠',
    love: '💕',
    tech: '💻',
  };

  return (
    <Card
      onClick={onClick}
      className={`
        p-4 cursor-pointer transition-all duration-200 hover:shadow-md
        ${selected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
      `}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{categoryIcons[topic.category] || '💬'}</span>
          <span className="font-medium">{topic.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {topic.isHot && (
            <Badge variant="solid" className="text-xs">
              🔥 热门
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {topic.hot}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
