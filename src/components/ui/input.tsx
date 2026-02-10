import React from 'react';
import { cn } from '@/lib/utils';
import { InputState } from '@/types';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  state?: InputState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

const states: Record<InputState, string> = {
  default: 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100',
  error: 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100',
  success: 'border-green-400 focus:border-green-500 focus:ring-2 focus:ring-green-100',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      state = error ? 'error' : 'default',
      leftIcon,
      rightIcon,
      containerClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className={containerClassName}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full px-4 py-3 rounded-2xl border outline-none transition-all bg-white text-gray-800 placeholder:text-gray-400',
              'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
              states[state],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            disabled={disabled}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
