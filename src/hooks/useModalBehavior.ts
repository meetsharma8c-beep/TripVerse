import { useEffect, useRef } from 'react';

let lockCount = 0;
let savedHtmlOverflow = '';
let savedHtmlOverscroll = '';
let removeTouchGuard: (() => void) | null = null;

function isScrollableAxis(styleValue: string): boolean {
  return styleValue === 'auto' || styleValue === 'scroll';
}

function findScrollableAncestor(target: EventTarget | null, axis: 'y' | 'x'): HTMLElement | null {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    if (axis === 'y') {
      if (isScrollableAxis(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
        return node as HTMLElement;
      }
    } else if (isScrollableAxis(style.overflowX) && node.scrollWidth > node.clientWidth + 1) {
      return node as HTMLElement;
    }
    node = node.parentElement;
  }
  return null;
}

function installTouchScrollGuard(): () => void {
  let startX = 0;
  let lastY = 0;

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;

    const targetEl = e.target instanceof Element ? e.target : null;
    if (targetEl?.closest('input[type="range"], [data-allow-touch]')) {
      return;
    }

    const touch = e.touches[0];
    const dy = touch.clientY - lastY;
    const dx = Math.abs(touch.clientX - startX);
    lastY = touch.clientY;

    // Allow intentional horizontal swipes inside horizontally scrollable controls (e.g., chip bars/carousels)
    if (dx > Math.abs(dy) && findScrollableAncestor(e.target, 'x')) {
      return;
    }

    const scroller = findScrollableAncestor(e.target, 'y');
    if (!scroller) {
      if (e.cancelable) e.preventDefault();
      return;
    }

    // Prevent iOS rubber-band overscroll at top/bottom bounds from chaining into window scroll
    const atTop = scroller.scrollTop <= 0 && dy > 0;
    const atBottom =
      scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 && dy < 0;
    if ((atTop || atBottom) && e.cancelable) {
      e.preventDefault();
    }
  };

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });

  return () => {
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
  };
}

/**
 * Shared modal behaviour: locks background page scrolling (on html rather than body so
 * position: sticky headers stay anchored, with touchmove boundary guards for iOS PWA/Safari)
 * and optionally closes on Escape. Reference-counted so nested overlays are safe.
 */
export function useModalBehavior(isOpen: boolean, onClose?: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    if (lockCount++ === 0) {
      const root = document.documentElement;
      savedHtmlOverflow = root.style.overflow;
      savedHtmlOverscroll = root.style.overscrollBehaviorY;
      root.style.overflow = 'hidden';
      root.style.overscrollBehaviorY = 'none';
      root.dataset.scrollLocked = 'true';
      removeTouchGuard = installTouchScrollGuard();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (--lockCount === 0) {
        const root = document.documentElement;
        root.style.overflow = savedHtmlOverflow;
        root.style.overscrollBehaviorY = savedHtmlOverscroll;
        delete root.dataset.scrollLocked;
        removeTouchGuard?.();
        removeTouchGuard = null;
      }
    };
  }, [isOpen]);
}
