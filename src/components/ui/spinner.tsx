import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'blue' | 'gray' | 'red' | 'green';
  className?: string;
}

const sizes: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
};

const colorClasses: Record<'orange' | 'blue' | 'gray' | 'red' | 'green', string> = {
  orange: 'border-orange-200 border-t-orange-500',
  blue: 'border-blue-200 border-t-blue-500',
  gray: 'border-gray-200 border-t-gray-500',
  red: 'border-red-200 border-t-red-500',
  green: 'border-green-200 border-t-green-500',
};

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ size = 'md', color = 'orange', className }, ref) => {
    return (
      <div ref={ref} className={cn('inline-block', className)} role="status">
        <svg
          className={cn(
            'rounded-full animate-spin',
            sizes[size],
            colorClasses[color]
          )}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <span className="sr-only">Loading...</span>
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';
