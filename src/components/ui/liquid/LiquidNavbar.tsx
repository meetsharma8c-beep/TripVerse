import React, { useEffect, useRef, useState } from 'react';

export interface LiquidNavbarProps {
  children: React.ReactNode;
  className?: string;
  condenseOffset?: number;
}

/**
 * Floating, detached Liquid Glass pill navigation bar that smoothly condenses
 * when the user scrolls down the page with rAF-throttled threshold detection.
 */
export const LiquidNavbar: React.FC<LiquidNavbarProps> = ({
  children,
  className = '',
  condenseOffset = 24,
}) => {
  const [isCondensed, setIsCondensed] = useState(false);
  const lastCondensedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId: number | null = null;

    const evaluate = () => {
      rafId = null;
      const next = window.scrollY > condenseOffset;
      if (next !== lastCondensedRef.current) {
        lastCondensedRef.current = next;
        setIsCondensed(next);
      }
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(evaluate);
      }
    };

    evaluate();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [condenseOffset]);

  return (
    <div
      data-condensed={isCondensed ? 'true' : 'false'}
      className={[
        'glass-elevated liquid-rim glass-refractive rounded-full transition-[transform,box-shadow,background-color] duration-200 ease-out py-1.5 px-3 xl:px-4',
        isCondensed ? 'shadow-[0_18px_44px_-10px_rgba(21,42,28,0.26)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
};
