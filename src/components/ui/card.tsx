import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  clickable?: boolean;
  className?: string;
  onClick?: () => void;
}

const variants: Record<'default' | 'elevated' | 'outlined', string> = {
  default: 'bg-white rounded-3xl shadow-sm border border-gray-100',
  elevated: 'bg-white rounded-3xl shadow-md border-0',
  outlined: 'bg-white rounded-3xl border-2 border-gray-200 shadow-none',
};

const paddings: Record<'none' | 'sm' | 'md' | 'lg', string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      className,
      onClick,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          variants[variant],
          paddings[padding],
          hoverable && 'hover:shadow-md hover:border-gray-200 transition-all',
          clickable && 'cursor-pointer active:scale-[0.98] transition-transform',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
