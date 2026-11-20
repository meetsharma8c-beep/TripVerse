import React, { useCallback } from 'react';

export interface LiquidInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  wrapperClassName?: string;
}

export const LiquidInput: React.FC<LiquidInputProps> = ({
  leadingIcon,
  trailingAction,
  wrapperClassName = '',
  className = '',
  ...rest
}) => (
  <div
    className={[
      'glass-frosted liquid-rim rounded-full flex items-center gap-2.5 px-4 py-2 transition-all focus-within:ring-4 focus-within:ring-[#2D5A3D]/18 dark:focus-within:ring-emerald-400/20 focus-within:border-[#2D5A3D]/60 dark:focus-within:border-emerald-400/50',
      wrapperClassName,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {leadingIcon && <span className="shrink-0 text-[#57685D] dark:text-slate-400">{leadingIcon}</span>}
    <input
      className={[
        'w-full bg-transparent text-sm sm:text-base font-semibold text-[#152A1C] dark:text-slate-100 placeholder:text-[#57685D]/75 dark:placeholder:text-slate-400 focus:outline-none border-0 ring-0 shadow-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ backgroundColor: 'transparent' }}
      {...rest}
    />
    {trailingAction && <span className="shrink-0">{trailingAction}</span>}
  </div>
);

export interface LiquidSearchDockProps extends React.HTMLAttributes<HTMLDivElement> {
  refractive?: boolean;
  children: React.ReactNode;
}

export const LiquidSearchDock: React.FC<LiquidSearchDockProps> = ({
  refractive = true,
  className = '',
  onPointerMove,
  children,
  ...rest
}) => {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      onPointerMove?.(e);
    },
    [onPointerMove]
  );

  return (
    <div
      onPointerMove={handlePointerMove}
      className={[
        'glass-elevated liquid-rim liquid-sheen rounded-full p-2 pl-4 sm:pl-6 flex items-center justify-between gap-2.5 transition-all duration-300 focus-within:ring-4 focus-within:ring-[#2D5A3D]/18 dark:focus-within:ring-emerald-400/22 focus-within:border-[#2D5A3D]/60 dark:focus-within:border-emerald-400/50',
        refractive ? 'glass-refractive' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
};
