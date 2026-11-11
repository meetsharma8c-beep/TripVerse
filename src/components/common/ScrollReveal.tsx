import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'scale' | 'none';
  threshold?: number;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
  threshold = 0.08
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return true;
    }
    return false;
  });
  const [hasSettled, setHasSettled] = useState<boolean>(() => isVisible);

  useEffect(() => {
    if (!isVisible || hasSettled) return;
    const timer = window.setTimeout(() => setHasSettled(true), 650);
    return () => window.clearTimeout(timer);
  }, [isVisible, hasSettled]);

  useEffect(() => {
    if (isVisible) return;
    const node = ref.current;
    if (!node) return;

    const isNearViewport = () => {
      const rect = node.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.top <= window.innerHeight + 160 &&
        rect.bottom >= -160
      );
    };

    if (isNearViewport()) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: Math.min(threshold, 0.01), rootMargin: '160px 0px 160px 0px' }
    );

    observer.observe(node);
    const rafId = window.requestAnimationFrame(() => {
      if (isNearViewport()) {
        setIsVisible(true);
        observer.disconnect();
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [isVisible, threshold]);

  const hiddenStyle =
    direction === 'scale'
      ? 'opacity-0 scale-[0.96] translate-y-2'
      : direction === 'up'
      ? 'opacity-0 translate-y-4'
      : 'opacity-0';

  return (
    <div
      ref={ref}
      onTransitionEnd={(e) => {
        if (e.target === ref.current && isVisible && !hasSettled) {
          setHasSettled(true);
        }
      }}
      style={delayMs > 0 && !hasSettled ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={`${
        hasSettled
          ? 'opacity-100'
          : `transition-[opacity,transform] duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] motion-reduce:transition-none motion-reduce:transform-none ${
              isVisible ? 'opacity-100 translate-y-0 scale-100' : hiddenStyle
            }`
      } ${className}`}
    >
      {children}
    </div>
  );
};
