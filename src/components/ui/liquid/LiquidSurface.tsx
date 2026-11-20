import React, { useCallback } from 'react';

export type LiquidVariant = 'clear' | 'frosted' | 'elevated' | 'accent';
export type LiquidRadius = 'sm' | 'md' | 'lg' | 'pill';

export interface LiquidSurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  variant?: LiquidVariant;
  radius?: LiquidRadius;
  smoked?: boolean;
  interactiveSheen?: boolean;
  rim?: boolean;
  refractive?: boolean;
  children?: React.ReactNode;
}

const VARIANT_CLASSES: Record<LiquidVariant, string> = {
  clear: 'glass-clear',
  frosted: 'glass-frosted',
  elevated: 'glass-elevated',
  accent: 'glass-accent',
};

const RADIUS_CLASSES: Record<LiquidRadius, string> = {
  sm: 'rounded-2xl',
  md: 'rounded-3xl',
  lg: 'rounded-[28px]',
  pill: 'rounded-full',
};

export const LiquidSurface: React.FC<LiquidSurfaceProps> = ({
  as: Component = 'div',
  variant = 'frosted',
  radius = 'md',
  smoked = false,
  interactiveSheen = true,
  rim = true,
  refractive = false,
  className = '',
  onPointerMove,
  children,
  ...rest
}) => {
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (interactiveSheen) {
        const rect = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
      }
      onPointerMove?.(e);
    },
    [interactiveSheen, onPointerMove]
  );

  const surfaceClass = smoked && variant === 'clear' ? 'glass-clear-dark' : VARIANT_CLASSES[variant];

  return (
    <Component
      onPointerMove={handlePointerMove}
      className={[
        surfaceClass,
        RADIUS_CLASSES[radius],
        rim ? 'liquid-rim' : '',
        interactiveSheen ? 'liquid-sheen' : '',
        refractive ? 'glass-refractive' : '',
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
