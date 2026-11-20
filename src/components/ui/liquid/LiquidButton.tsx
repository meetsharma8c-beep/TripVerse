import React, { useCallback } from 'react';
import { Loader2 } from 'lucide-react';

export type LiquidButtonVariant = 'accent' | 'clear' | 'frosted' | 'elevated' | 'ghost';
export type LiquidButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LiquidButtonVariant;
  size?: LiquidButtonSize;
  loading?: boolean;
  interactiveSheen?: boolean;
}

const VARIANT_STYLES: Record<LiquidButtonVariant, string> = {
  accent: 'glass-accent liquid-rim text-white font-bold',
  clear: 'glass-clear liquid-rim text-[#152A1C] dark:text-slate-100 font-semibold',
  frosted: 'glass-frosted liquid-rim text-[#152A1C] dark:text-slate-100 font-semibold',
  elevated: 'glass-elevated liquid-rim text-[#152A1C] dark:text-slate-100 font-semibold',
  ghost:
    'bg-transparent hover:bg-white/60 dark:hover:bg-white/10 text-[#152A1C] dark:text-slate-200 font-semibold border border-transparent',
};

const SIZE_STYLES: Record<LiquidButtonSize, string> = {
  sm: 'min-h-0 h-8 px-3 text-xs gap-1.5 rounded-full',
  md: 'h-10 px-4 text-xs sm:text-sm gap-2 rounded-full',
  lg: 'h-12 px-6 text-sm gap-2 rounded-full',
  icon: 'min-h-0 w-9 h-9 p-0 rounded-full',
};

export const LiquidButton: React.FC<LiquidButtonProps> = ({
  variant = 'accent',
  size = 'md',
  loading = false,
  interactiveSheen = true,
  className = '',
  disabled,
  onPointerMove,
  children,
  type = 'button',
  ...rest
}) => {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (interactiveSheen && !disabled) {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      }
      onPointerMove?.(e);
    },
    [interactiveSheen, disabled, onPointerMove]
  );

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onPointerMove={handlePointerMove}
      className={[
        'inline-flex items-center justify-center whitespace-nowrap select-none cursor-pointer liquid-press focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A3D]/45 dark:focus-visible:ring-emerald-400/50 disabled:opacity-55 disabled:pointer-events-none',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        interactiveSheen ? 'liquid-sheen' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
};
