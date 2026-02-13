'use client';

import { AIPersona } from '@/types';
import { PERSONAS } from '@/lib/constants';
import { Avatar } from '@/components/ui/avatar';

const getPersonaGradientClass = (from: string | undefined, to: string | undefined): string => {
  if (!from || !to) return 'bg-gradient-to-br from-gray-400 to-gray-600';
  const gradientMap: Record<string, string> = {
    'red-400-red-600': 'bg-gradient-to-br from-red-400 to-red-600',
    'purple-400-purple-600': 'bg-gradient-to-br from-purple-400 to-purple-600',
    'sky-400-sky-600': 'bg-gradient-to-br from-sky-400 to-sky-600',
    'yellow-400-yellow-500': 'bg-gradient-to-br from-amber-500 to-amber-700',
    'slate-400-slate-600': 'bg-gradient-to-br from-slate-400 to-slate-600',
  };
  const key = `${from}-${to}`;
  return gradientMap[key] || 'bg-gradient-to-br from-gray-400 to-gray-600';
};

export interface PersonaSelectorProps {
  selected?: string | null;
  onSelect?: (persona: AIPersona) => void;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

export function PersonaSelector({
  selected,
  onSelect,
  disabled,
  theme = 'light',
}: PersonaSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {PERSONAS.map((persona) => {
        const isSelected = selected === persona.id;
        const selectedBgClass = isSelected
          ? getPersonaGradientClass(persona.gradientFrom, persona.gradientTo)
          : '';

        const unselectedClass =
          theme === 'dark'
            ? 'bg-slate-900/85 hover:bg-slate-900 border border-slate-500/45 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
            : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-800';

        const toneTextClass =
          theme === 'dark' ? 'text-slate-200/90' : 'text-gray-500';

        const hoverClass =
          theme === 'dark' && !isSelected
            ? 'hover:border-cyan-300/45 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_12px_30px_rgba(2,132,199,0.16)]'
            : '';

        return (
          <button
            key={persona.id}
            onClick={() => onSelect?.(persona)}
            disabled={disabled}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200
              ${isSelected
                ? `${selectedBgClass} text-white shadow-lg scale-105`
                : unselectedClass
              }
              ${hoverClass}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Avatar
              name={persona.name}
              className={isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : ''}
            />
            <span className="text-sm font-medium">{persona.name}</span>
            <span className={`text-xs ${isSelected ? 'opacity-90' : toneTextClass}`}>
              {persona.style.tone}
            </span>
          </button>
        );
      })}
    </div>
  );
}
