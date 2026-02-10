import React from 'react';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface TypingIndicatorProps {
  role: string;
  color?: string;
  gradient?: { from: string; to: string };
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  role,
  gradient,
  className,
}) => {
  return (
    <div className={cn('flex gap-3 mb-4', className)}>
      <Avatar
        size="md"
        fallback={role[0]}
        gradient={gradient || { from: 'bg-gray-400', to: 'bg-gray-600' }}
      />
      <div className="flex-1">
        <div className="text-xs text-gray-400 mb-1">{role} 正在思考...</div>
        <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1 items-center">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
