'use client';

import { RoastMessage } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export interface MessageBubbleProps {
  message: RoastMessage;
  showAvatar?: boolean;
}

const getRoleGradientClass = (role: string): string => {
  const gradientMap: Record<string, string> = {
    '毒舌老哥': 'bg-gradient-to-br from-red-400 to-red-600',
    '阴阳大师': 'bg-gradient-to-br from-purple-400 to-purple-600',
    '数据帝': 'bg-gradient-to-br from-sky-400 to-sky-600',
    '热梗王': 'bg-gradient-to-br from-yellow-400 to-yellow-500',
    '冷面评委': 'bg-gradient-to-br from-slate-400 to-slate-600',
    '吐槽大师': 'bg-gradient-to-br from-orange-400 to-orange-600',
  };
  return gradientMap[role] || 'bg-gradient-to-br from-gray-400 to-gray-600';
};

export function MessageBubble({ message, showAvatar = true }: MessageBubbleProps) {
  const isUser = message.isUser ?? false;
  const bgColor = isUser ? getRoleGradientClass(message.role) : 'bg-gray-100';
  const textColor = isUser ? 'text-white' : 'text-gray-900';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {showAvatar && (
        <Avatar
          name={message.role}
          className={`shrink-0 ${isUser ? 'order-2' : 'order-1'} w-10 h-10`}
        />
      )}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`${bgColor} ${textColor} rounded-2xl px-4 py-3 shadow-sm`}>
          {isUser && (
            <Badge variant="solid" className="mb-2 text-xs bg-white/20">
              我的AI
            </Badge>
          )}
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.mentions && message.mentions.length > 0 && (
          <span className="text-xs text-gray-500">
            @{message.mentions.join(', @')}
          </span>
        )}
      </div>
    </div>
  );
}
