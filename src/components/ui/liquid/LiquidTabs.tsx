import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface LiquidChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: React.ReactNode;
}

export const LiquidChip: React.FC<LiquidChipProps> = ({
  active = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) => (
  <button
    type={type}
    aria-pressed={active}
    className={[
      'min-h-[40px] sm:min-h-[44px] py-2 px-4 rounded-full text-xs sm:text-sm whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-1.5 cursor-pointer liquid-press focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5A3D]/45 dark:focus-visible:ring-emerald-400/50',
      active
        ? 'glass-accent liquid-rim text-white font-semibold'
        : 'glass-frosted liquid-rim liquid-sheen text-[#152A1C] dark:text-slate-200 hover:text-[#2D5A3D] dark:hover:text-emerald-300 font-medium',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {children}
  </button>
);

export interface LiquidTabItem {
  id: string;
  label: string;
  badge?: string;
}

export interface LiquidTabsProps {
  items: LiquidTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
}

/**
 * Morphing Liquid Glass tab bar with a sliding optical pill indicator that smoothly
 * tracks the active tab's bounds using spring physics.
 */
export const LiquidTabs: React.FC<LiquidTabsProps> = ({
  items,
  activeId,
  onSelect,
  ariaLabel = 'Tabs',
  className = '',
  buttonClassName = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const updateIndicator = () => {
    const activeEl = tabRefs.current[activeId];
    const containerEl = containerRef.current;
    if (!activeEl || !containerEl) {
      setIndicator((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    setIndicator({
      left: activeEl.offsetLeft,
      width: activeEl.offsetWidth,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    updateIndicator();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, items.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', updateIndicator, { passive: true });
    return () => window.removeEventListener('resize', updateIndicator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center gap-0.5 p-1 rounded-full glass-frosted liquid-rim ${className}`}
    >
      {/* Sliding optical glass pill indicator (GPU-composited translate3d) */}
      {indicator.ready && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-white/95 dark:bg-emerald-950/85 border border-[#C8DAC6]/90 dark:border-emerald-400/35 shadow-[0_6px_16px_-4px_rgba(45,90,61,0.20),inset_0_1px_0_rgba(255,255,255,0.95)] dark:shadow-[0_6px_16px_-4px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.16)]"
          style={{
            width: `${indicator.width}px`,
            transform: `translate3d(${indicator.left}px, 0, 0)`,
            transition: 'transform 0.32s var(--lg-spring), width 0.32s var(--lg-spring)',
            willChange: 'transform, width',
          }}
        />
      )}

      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[item.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(item.id)}
            className={[
              'min-h-0 relative z-10 flex items-center gap-1.5 px-2.5 xl:px-3.5 py-1.5 rounded-full text-[11.5px] xl:text-[13px] 2xl:text-sm font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer liquid-press',
              isActive
                ? 'text-[#152A1C] dark:text-emerald-300'
                : 'text-[#4A5D52] dark:text-slate-300 hover:text-[#152A1C] dark:hover:text-white',
              buttonClassName,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span>{item.label}</span>
            {item.badge && (
              <span className="text-[9px] xl:text-[10px] font-bold px-1.5 py-0.5 rounded-full glass-accent text-white leading-none">
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
