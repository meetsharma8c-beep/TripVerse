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

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

function getTopmostDialogContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"], [aria-modal="true"]')
  ).filter((el) => el.offsetParent !== null || window.getComputedStyle(el).position === 'fixed');
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
}

/**
 * Shared modal behaviour: locks background page scrolling (on html rather than body so
 * position: sticky headers stay anchored, with touchmove boundary guards for iOS PWA/Safari),
 * traps keyboard focus inside the active dialog, restores focus on close,
 * and optionally closes on Escape. Reference-counted so nested overlays are safe.
 */
export function useModalBehavior(
  isOpen: boolean,
  onClose?: () => void,
  containerRef?: React.RefObject<HTMLElement | null>
) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

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
      if (e.key === 'Escape' && closeRef.current) {
        closeRef.current();
        return;
      }

      // WCAG 2.1 keyboard focus trap for open modal dialogs
      if (e.key === 'Tab') {
        const container = containerRef?.current || getTopmostDialogContainer();
        if (!container) return;

        const focusables = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || !container.contains(active) || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!active || !container.contains(active) || active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
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
      // Restore keyboard focus to the element that triggered the modal
      if (previouslyFocused && typeof previouslyFocused.focus === 'function' && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen, containerRef]);
}
