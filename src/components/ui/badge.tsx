import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'solid' | 'outline' | 'subtle';
  color?: string;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

const sizes: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-xs',
};

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  (
    {
      children,
      variant = 'solid',
      color = 'gray',
      size = 'sm',
      icon,
      className,
    },
    ref
  ) => {
    const baseClasses = 'rounded-full font-medium inline-flex items-center gap-1';

    // 使用预设颜色映射，避免动态拼接
    const colorMap: Record<string, { solid: string; outline: string; subtle: string }> = {
      orange: { solid: 'bg-orange-500 text-white', outline: 'border border-orange-500 text-orange-600', subtle: 'bg-orange-100 text-orange-700' },
      red: { solid: 'bg-red-500 text-white', outline: 'border border-red-500 text-red-600', subtle: 'bg-red-100 text-red-700' },
      purple: { solid: 'bg-purple-500 text-white', outline: 'border border-purple-500 text-purple-600', subtle: 'bg-purple-100 text-purple-700' },
      sky: { solid: 'bg-sky-500 text-white', outline: 'border border-sky-500 text-sky-600', subtle: 'bg-sky-100 text-sky-700' },
      yellow: { solid: 'bg-yellow-500 text-white', outline: 'border border-yellow-500 text-yellow-600', subtle: 'bg-yellow-100 text-yellow-700' },
      slate: { solid: 'bg-slate-500 text-white', outline: 'border border-slate-500 text-slate-600', subtle: 'bg-slate-100 text-slate-700' },
      gray: { solid: 'bg-gray-500 text-white', outline: 'border border-gray-500 text-gray-600', subtle: 'bg-gray-100 text-gray-700' },
    };

    const colors = colorMap[color] || colorMap.gray;

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          sizes[size],
          colors[variant],
          className
        )}
      >
        {icon}
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';
