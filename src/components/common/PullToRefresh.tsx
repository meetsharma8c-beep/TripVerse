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
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [refreshState, setRefreshState] = useState<'idle' | 'pulling' | 'ready' | 'refreshing' | 'success'>('idle');

  const startX = useRef<number>(0);
  const startY = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);
  const canPullRef = useRef<boolean>(false);
  const hasTriggeredReadyHaptic = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if viewport is at the very top across all browsers
  const isAtTop = () => {
    if (typeof window === 'undefined') return true;
    const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    return scrollY <= 1;
  };

  const executeRefresh = useCallback(async () => {
    setRefreshState('refreshing');
    setPullDistance(52); // Resting position while refreshing
    triggerHaptic('light');

    const startTime = Date.now();
    try {
      await onRefresh();
    } catch (err) {
      console.warn('[PullToRefresh] Refresh notice:', err);
    } finally {
      // Ensure refresh indicator shows for at least 750ms for satisfying feedback
      const elapsed = Date.now() - startTime;
      const minDuration = 750;
      const remaining = Math.max(0, minDuration - elapsed);

      setTimeout(() => {
        setRefreshState('success');
        triggerHaptic('success');

        // Smoothly hide after success confirmation
        setTimeout(() => {
          setPullDistance(0);
          setTimeout(() => {
            setRefreshState('idle');
            isPullingRef.current = false;
            canPullRef.current = false;
          }, 320);
        }, 550);
      }, remaining);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return;

    const onTouchStart = (e: TouchEvent) => {
      // Only single finger touch when not already refreshing
      if (e.touches.length !== 1 || refreshState === 'refreshing') return;

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
      if (!canPullRef.current || e.touches.length !== 1 || refreshState === 'refreshing') return;

      // If page has scrolled down even 2px, immediately disengage
      if (!isAtTop()) {
        canPullRef.current = false;
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setPullDistance(0);
          setRefreshState('idle');
        }
        return;
      }

      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      const deltaX = clientX - startX.current;
      const deltaY = clientY - startY.current;

      // 1. If swiping UP (scrolling down into content) or mostly horizontal swipe:
      // Cancel pull-to-refresh immediately so native browser touch scrolling is 100% free and unhindered
      if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
        canPullRef.current = false;
        if (isPullingRef.current) {
          isPullingRef.current = false;
          setPullDistance(0);
          setRefreshState('idle');
        }
        return;
      }

      // 2. User is intentionally pulling DOWN at the top of the screen
      if (deltaY > 8) {
        // Prevent browser's duplicate native pull-to-refresh spinner only during active custom pull
        if (e.cancelable) {
          e.preventDefault();
        }
        isPullingRef.current = true;

        // Apple-style logarithmic elastic resistance curve
        const pullProgress = deltaY - 8;
        const dampedDistance = Math.min(
          maxPullDownDistance,
          Math.pow(pullProgress, 0.85) * 0.82
        );
        setPullDistance(dampedDistance);

        if (dampedDistance >= pullDownThreshold) {
          if (!hasTriggeredReadyHaptic.current) {
            triggerHaptic('medium');
            hasTriggeredReadyHaptic.current = true;
          }
          setRefreshState('ready');
        } else {
          hasTriggeredReadyHaptic.current = false;
          setRefreshState('pulling');
        }
      }
    };

    const onTouchEnd = () => {
      if (!canPullRef.current && !isPullingRef.current) return;

      if (isPullingRef.current && refreshState === 'ready') {
        executeRefresh();
      } else {
        setPullDistance(0);
        setRefreshState('idle');
      }

      isPullingRef.current = false;
      canPullRef.current = false;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [disabled, refreshState, executeRefresh, pullDownThreshold, maxPullDownDistance]);

  // Visual metrics
  const progressRatio = Math.min(1, pullDistance / pullDownThreshold);
  const strokeDash = Math.min(100, Math.round(progressRatio * 100));
  const rotationDegrees = Math.min(180, progressRatio * 180);
  const indicatorOpacity = refreshState === 'idle' ? 0 : Math.min(1, Math.max(0, pullDistance / 24));
  const dropOffset = Math.min(68, pullDistance * 0.72);

  return (
    <div ref={containerRef} className="relative w-full min-h-screen">
      {/* Floating Apple/Android Liquid Pull-to-Refresh Indicator */}
      <div
        className="fixed top-[74px] left-0 right-0 z-50 flex justify-center pointer-events-none transition-transform"
        style={{
          transform: `translateY(${dropOffset}px)`,
          opacity: indicatorOpacity,
          transition: refreshState === 'refreshing' || refreshState === 'idle' 
            ? 'transform 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.25), opacity 0.25s ease' 
            : 'none',
        }}
        aria-live="polite"
      >
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-full shadow-xl border backdrop-blur-xl transition-all duration-200 transform ${
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
                {/* SVG Progress Ring */}
                <svg className="w-5 h-5 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className={refreshState === 'ready' ? 'text-emerald-700/40' : 'text-slate-200'}
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={refreshState === 'ready' ? 'text-white' : 'text-[#2D5A3D]'}
                    strokeDasharray={`${strokeDash}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                {/* Rotating Directional Arrow */}
                <div
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-150"
                  style={{ transform: `rotate(${rotationDegrees}deg)` }}
                >
                  <ArrowDown className={`w-3 h-3 ${refreshState === 'ready' ? 'text-white' : 'text-slate-600'}`} />
                </div>
              </>
            )}
          </div>

          {/* Dynamic Status Text */}
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

      {/* Main Content with Apple-grade fluid elastic shift */}
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance * 0.48}px)` : 'none',
          transition: pullDistance === 0 ? 'transform 0.32s cubic-bezier(0.18, 0.89, 0.32, 1.25)' : 'none',
          willChange: pullDistance > 0 ? 'transform' : 'auto'
        }}
      >
        {children}
      </div>
    </div>
  );
};
