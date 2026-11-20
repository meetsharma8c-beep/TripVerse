import React, { useCallback } from 'react';
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
  onPointerMove,
  children,
  ...rest
}) => {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (interactiveSheen && e.pointerType === 'mouse') {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      }
      onPointerMove?.(e);
    },
    [interactiveSheen, onPointerMove]
  );

  return (
    <Component
      onPointerMove={handlePointerMove}
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
