import React from 'react';
import { cn } from '@/lib/utils';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  gradient?: {
    from: string;
    to: string;
  };
  borderColor?: string;
  className?: string;
}

const sizes: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const borderColors: Record<string, string> = {
  white: 'border-white',
  gray: 'border-gray-200',
  transparent: 'border-transparent',
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      size = 'md',
      fallback,
      gradient,
      borderColor = 'white',
      className,
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);

    const getDisplayChar = (): string => {
      if (fallback) return fallback;
      if (alt && alt.length > 0) return alt[0].toUpperCase();
      if (name && name.length > 0) return name[0].toUpperCase();
      return '';
    };

    const borderColorClass = borderColors[borderColor] || borderColors.white;

    if (src && !imageError) {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-full object-cover bg-gray-100 border-2 shadow-sm overflow-hidden',
            sizes[size],
            borderColorClass,
            className
          )}
        >
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    if (gradient) {
      return (
        <div
          ref={ref}
          className={cn(
            'rounded-full flex items-center justify-center text-white font-bold shadow-sm',
            sizes[size],
            `bg-gradient-to-br ${gradient.from} ${gradient.to}`,
            className
          )}
        >
          {getDisplayChar()}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium',
          sizes[size],
          className
        )}
      >
        {getDisplayChar()}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
