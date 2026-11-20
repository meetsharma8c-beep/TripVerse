import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'scale' | 'none';
  threshold?: number;
}

type RevealCallback = (isInitialFrame: boolean) => void;

let sharedObserver: IntersectionObserver | null = null;
const observedCallbacks = new Map<Element, RevealCallback>();
const initialObserveTimestamps = new WeakMap<Element, number>();

function getSharedIntersectionObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return null;
  }
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        const now = performance.now();
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = observedCallbacks.get(entry.target);
            if (cb) {
              const registeredAt = initialObserveTimestamps.get(entry.target) ?? 0;
              const isInitialFrame = now - registeredAt < 64;
              observedCallbacks.delete(entry.target);
              sharedObserver?.unobserve(entry.target);
              cb(isInitialFrame);
            }
          }
        }
      },
      { threshold: 0.01, rootMargin: '180px 0px 180px 0px' }
    );
  }
  return sharedObserver;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
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
    if (isVisible) return;
    const node = ref.current;
    if (!node) return;

    const observer = getSharedIntersectionObserver();
    if (!observer) {
      setIsVisible(true);
      setHasSettled(true);
      return;
    }

    initialObserveTimestamps.set(node, performance.now());
    observedCallbacks.set(node, (isInitialFrame) => {
      setIsVisible(true);
      if (isInitialFrame) {
        setHasSettled(true);
      }
    });
    observer.observe(node);

    return () => {
      observedCallbacks.delete(node);
      observer.unobserve(node);
    };
  }, [isVisible]);

  const hiddenStyle =
    direction === 'scale'
      ? 'opacity-0 scale-[0.97] translate-y-2'
      : direction === 'up'
      ? 'opacity-0 translate-y-3'
      : 'opacity-0';

  const effectiveDelay = delayMs > 0 && !hasSettled ? Math.min(delayMs, 120) : 0;

  return (
    <div
      ref={ref}
      onTransitionEnd={(e) => {
        if (e.target === ref.current && isVisible && !hasSettled) {
          setHasSettled(true);
        }
      }}
      style={effectiveDelay > 0 ? { transitionDelay: `${effectiveDelay}ms` } : undefined}
      className={`${
        hasSettled
          ? 'opacity-100'
          : `transition-[opacity,transform] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:transform-none ${
              isVisible ? 'opacity-100 translate-y-0 scale-100' : hiddenStyle
            }`
      } ${className}`}
    >
      {children}
    </div>
  );
};
