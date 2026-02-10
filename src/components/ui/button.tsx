import React from 'react';
import { cn } from '@/lib/utils';
import { ButtonVariant, ButtonSize } from '@/types';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-orange-500 hover:bg-orange-600 text-white font-medium',
  secondary: 'bg-white border-2 border-gray-200 hover:border-orange-300 text-gray-700 font-medium',
  text: 'text-orange-500 hover:text-orange-600 font-medium',
  ghost: 'hover:bg-gray-100 text-gray-700',
  outline: 'border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium',
  danger: 'bg-red-500 hover:bg-red-600 text-white font-medium',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-4 text-sm rounded-full',
  md: 'h-11 px-6 text-base rounded-full',
  lg: 'h-13 px-8 text-lg rounded-full',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          variant === 'primary' && 'shadow-sm hover:shadow',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
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
        )}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
