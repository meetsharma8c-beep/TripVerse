import React, { useCallback, useRef } from 'react';
import { LiquidVariant } from './LiquidSurface';

export interface LiquidCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  variant?: LiquidVariant;
  hoverLift?: boolean;
  interactiveSheen?: boolean;
  outerRadius?: number;
  innerPadding?: number;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<LiquidVariant, string> = {
  clear: 'glass-clear',
  frosted: 'glass-frosted',
  elevated: 'glass-elevated',
  accent: 'glass-accent',
};

/**
 * Concentric Liquid Glass Card: exposes `--lg-outer-r` and `--lg-pad` so child elements
 * using `.liquid-concentric-inner` compute exact concentric curvature (`outerRadius - padding`).
 * Uses cached pointer-enter bounding rects + rAF throttling so mouse hover never thrashes layout.
 */
export const LiquidCard: React.FC<LiquidCardProps> = ({
  as: Component = 'article',
  variant = 'frosted',
  hoverLift = true,
  interactiveSheen = true,
  outerRadius = 28,
  innerPadding = 8,
  className = '',
  style,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  children,
  ...rest
}) => {
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (interactiveSheen && e.pointerType === 'mouse') {
        rectRef.current = e.currentTarget.getBoundingClientRect();
      }
      onPointerEnter?.(e);
    },
    [interactiveSheen, onPointerEnter]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (interactiveSheen && e.pointerType === 'mouse') {
        const el = e.currentTarget;
        const clientX = e.clientX;
        const clientY = e.clientY;
        if (rafRef.current === null) {
          rafRef.current = window.requestAnimationFrame(() => {
            rafRef.current = null;
            const rect = rectRef.current || el.getBoundingClientRect();
            rectRef.current = rect;
            el.style.setProperty('--mouse-x', `${clientX - rect.left}px`);
            el.style.setProperty('--mouse-y', `${clientY - rect.top}px`);
          });
        }
      }
      onPointerMove?.(e);
    },
    [interactiveSheen, onPointerMove]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      rectRef.current = null;
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onPointerLeave?.(e);
    },
    [onPointerLeave]
  );

  return (
    <Component
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          '--lg-outer-r': `${outerRadius}px`,
          '--lg-pad': `${innerPadding}px`,
          borderRadius: `${outerRadius}px`,
          ...style,
        } as React.CSSProperties
      }
      className={[
        VARIANT_CLASSES[variant],
        'liquid-rim overflow-hidden',
        interactiveSheen ? 'liquid-sheen' : '',
        hoverLift ? 'liquid-card-hover' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Component>
  );
};
