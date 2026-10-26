import { useEffect, useRef } from 'react';

let lockCount = 0;
let savedOverflow = '';

/**
 * Shared modal behaviour: locks background (body) scrolling while open and
 * optionally closes on Escape. Reference-counted so nested modals are safe.
 */
export function useModalBehavior(isOpen: boolean, onClose?: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;
    if (lockCount++ === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeRef.current) closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (--lockCount === 0) document.body.style.overflow = savedOverflow;
    };
  }, [isOpen]);
}
