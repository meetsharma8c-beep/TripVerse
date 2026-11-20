import React, { useEffect, useState } from 'react';

export interface LiquidNavbarProps {
  children: React.ReactNode;
  className?: string;
  condenseOffset?: number;
}

/**
 * Floating, detached Liquid Glass pill navigation bar that smoothly condenses
 * when the user scrolls down the page.
 */
export const LiquidNavbar: React.FC<LiquidNavbarProps> = ({
  children,
  className = '',
  condenseOffset = 24,
}) => {
  const [isCondensed, setIsCondensed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      setIsCondensed(window.scrollY > condenseOffset);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [condenseOffset]);

  return (
    <div
      data-condensed={isCondensed ? 'true' : 'false'}
      className={[
        'glass-elevated liquid-rim glass-refractive rounded-full transition-all duration-300',
        isCondensed ? 'py-1 px-2.5 xl:px-3.5 shadow-[0_18px_44px_-10px_rgba(21,42,28,0.26)]' : 'py-1.5 px-3 xl:px-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
};
