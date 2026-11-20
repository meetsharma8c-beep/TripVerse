import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowDown, RefreshCw, Check, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  pullDownThreshold?: number;
  maxPullDownDistance?: number;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  disabled = false,
  pullDownThreshold = 65,
  maxPullDownDistance = 115
}) => {
  // Only discrete state transitions trigger React renders (idle -> pulling -> ready -> refreshing -> success).
  // Per-pixel pull motion is driven directly on GPU-composited refs inside rAF for zero-re-render 120fps scrolling.
  const [refreshState, setRefreshState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing' | 'success'>('idle');

  const refreshStateRef = useRef<'idle' | 'pulling' | 'ready' | 'refreshing' | 'success'>('idle');
  const pullDistanceRef = useRef<number>(0);
  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const canPullRef = useRef<boolean>(false);
  const hasTriggeredReadyHaptic = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  const indicatorWrapRef = useRef<HTMLDivElement>(null);
  const contentWrapRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const progressArcRef = useRef<SVGPathElement>(null);

  const updateState = useCallback((next: 'idle' | 'pulling' | 'ready' | 'refreshing' | 'success') => {
    if (refreshStateRef.current !== next) {
      refreshStateRef.current = next;
      setRefreshState(next);
    }
  }, []);

  const applyPullTransforms = useCallback(
    (distance: number, animateSnap: boolean) => {
      pullDistanceRef.current = distance;
      const indicatorEl = indicatorWrapRef.current;
      const contentEl = contentWrapRef.current;
      const arrowEl = arrowRef.current;
      const arcEl = progressArcRef.current;

      const progressRatio = Math.min(1, distance / pullDownThreshold);
      const dropOffset = Math.min(68, distance * 0.72);
      const indicatorOpacity = distance <= 0 && refreshStateRef.current === 'idle'
        ? 0
        : Math.min(1, Math.max(0, distance / 24));

      if (indicatorEl) {
        indicatorEl.style.transition = animateSnap
          ? 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.25), opacity 0.22s ease'
          : 'none';
        indicatorEl.style.transform = `translate3d(0, ${dropOffset}px, 0)`;
        indicatorEl.style.opacity = String(indicatorOpacity);
      }

      if (contentEl) {
        contentEl.style.transition = animateSnap
          ? 'transform 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.25)'
          : 'none';
        contentEl.style.transform = distance > 0 ? `translate3d(0, ${distance * 0.48}px, 0)` : 'none';
        contentEl.style.willChange = distance > 0 ? 'transform' : 'auto';
      }

      if (arrowEl) {
        arrowEl.style.transform = `rotate(${Math.min(180, progressRatio * 180)}deg)`;
      }

      if (arcEl) {
        arcEl.setAttribute('stroke-dasharray', `${Math.min(100, Math.round(progressRatio * 100))}, 100`);
      }
    },
    [pullDownThreshold]
  );

  // Check if viewport is at the very top across all browsers
  const isAtTop = () => {
    if (typeof window === 'undefined') return true;
    const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return scrollY <= 1;
  };

  const executeRefresh = useCallback(async () => {
    updateState('refreshing');
    applyPullTransforms(52, true);
    triggerHaptic('light');

    const startTime = Date.now();
    try {
      await onRefresh();
    } catch (err) {
      console.warn('[PullToRefresh] Refresh notice:', err);
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 750 - elapsed);

      setTimeout(() => {
        updateState('success');
        triggerHaptic('success');

        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 350);
      }, remaining);
    }
  }, [onRefresh, updateState, applyPullTransforms]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const scheduleVisualUpdate = (distance: number, animateSnap: boolean) => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        applyPullTransforms(distance, animateSnap);
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (
        e.touches.length !== 1 ||
        refreshStateRef.current === 'refreshing' ||
        document.documentElement.dataset.scrollLocked === 'true'
      ) {
        canPullRef.current = false;
        isPullingRef.current = false;
        return;
      }

      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[aria-modal="true"], #mobile-navigation-drawer')) {
        canPullRef.current = false;
        isPullingRef.current = false;
        return;
      }

      if (isAtTop()) {
        startX.current = e.touches[0].clientX;
        startY.current = e.touches[0].clientY;
        canPullRef.current = true;
        isPullingRef.current = false;
        hasTriggeredReadyHaptic.current = false;
      } else {
        canPullRef.current = false;
        isPullingRef.current = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!canPullRef.current || e.touches.length !== 1 || refreshStateRef.current === 'refreshing') return;

      if (!isAtTop()) {
        canPullRef.current = false;
        if (isPullingRef.current) {
          isPullingRef.current = false;
          updateState('idle');
          scheduleVisualUpdate(0, true);
        }
        return;
      }

      const deltaX = e.touches[0].clientX - startX.current;
      const deltaY = e.touches[0].clientY - startY.current;

      // Disengage immediately on upward scroll or horizontal swipe so native scrolling is never impeded
      if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
        canPullRef.current = false;
        if (isPullingRef.current) {
          isPullingRef.current = false;
          updateState('idle');
          scheduleVisualUpdate(0, true);
        }
        return;
      }

      if (deltaY > 8) {
        isPullingRef.current = true;

        const pullProgress = deltaY - 8;
        const dampedDistance = Math.min(
          maxPullDownDistance,
          Math.pow(pullProgress, 0.85) * 0.82
        );
        scheduleVisualUpdate(dampedDistance, false);

        if (dampedDistance >= pullDownThreshold) {
          if (!hasTriggeredReadyHaptic.current) {
            triggerHaptic('medium');
            hasTriggeredReadyHaptic.current = true;
          }
          updateState('ready');
        } else {
          hasTriggeredReadyHaptic.current = false;
          updateState('pulling');
        }
      }
    };

    const onTouchEnd = () => {
      if (!canPullRef.current && !isPullingRef.current) return;

      if (isPullingRef.current && refreshStateRef.current === 'ready') {
        void executeRefresh();
      } else {
        updateState('idle');
        scheduleVisualUpdate(0, true);
      }

      isPullingRef.current = false;
      canPullRef.current = false;
    };

    // All touch listeners are 100% passive so iOS WKWebView & Android Chrome keep scrolling on the GPU compositor thread
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, executeRefresh, pullDownThreshold, maxPullDownDistance, updateState, applyPullTransforms]);

  return (
    <div className="relative w-full min-h-[100dvh]">
      {/* Floating Apple/Android Liquid Pull-to-Refresh Indicator */}
      <div
        ref={indicatorWrapRef}
        className="fixed top-[74px] left-0 right-0 z-50 flex justify-center pointer-events-none"
        style={{
          transform: 'translate3d(0, 0px, 0)',
          opacity: 0,
        }}
        aria-live="polite"
      >
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full shadow-xl border backdrop-blur-md transition-[background-color,color,border-color,transform] duration-200 ${
            refreshState === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/35 scale-105'
              : refreshState === 'ready'
              ? 'bg-[#2D5A3D] text-white border-[#244931] shadow-emerald-500/30 scale-105'
              : refreshState === 'refreshing'
              ? 'bg-white/95 text-slate-800 border-slate-200/90 shadow-slate-900/10 scale-100'
              : 'bg-white/95 text-slate-700 border-slate-200/90 shadow-slate-900/8'
          }`}
          style={{
            boxShadow: refreshState === 'ready' || refreshState === 'success'
              ? '0 12px 28px -4px rgba(0, 176, 116, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.5)'
              : '0 10px 25px -4px rgba(11, 37, 69, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.8)'
          }}
        >
          {/* Circular Progress Arc & Icon */}
          <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
            {refreshState === 'refreshing' ? (
              <RefreshCw className="w-4 h-4 text-[#2D5A3D] animate-spin" />
            ) : refreshState === 'success' ? (
              <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-emerald-600">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className={refreshState === 'ready' ? 'text-emerald-700/40' : 'text-slate-200'}
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    ref={progressArcRef}
                    className={refreshState === 'ready' ? 'text-white' : 'text-[#2D5A3D]'}
                    strokeDasharray="0, 100"
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                <div
                  ref={arrowRef}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <ArrowDown className={`w-3 h-3 ${refreshState === 'ready' ? 'text-white' : 'text-slate-600'}`} />
                </div>
              </>
            )}
          </div>

          <span className="text-xs font-bold tracking-tight">
            {refreshState === 'pulling' && 'Pull down to refresh'}
            {refreshState === 'ready' && 'Release to refresh'}
            {refreshState === 'refreshing' && 'Updating TripVerse...'}
            {refreshState === 'success' && 'TripVerse Updated!'}
          </span>

          {refreshState === 'refreshing' && (
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse ml-0.5" />
          )}
        </div>
      </div>

      {/* Main Content with GPU-composited elastic shift (zero React re-renders while dragging) */}
      <div ref={contentWrapRef}>
        {children}
      </div>
    </div>
  );
};
