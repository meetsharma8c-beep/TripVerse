// src/components/argon/ArgonFloatingWidget.tsx
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { ARGON_STATE_THEME, ArgonState, ProactiveHint } from './argon.types';

const ConCode3DAvatar = lazy(() =>
  import('./ConCode3DAvatar').then((m) => ({ default: m.ConCode3DAvatar }))
);

const AvatarOrbFallback: React.FC<{ ledHex: string; ledGlowRgba: string }> = ({
  ledHex,
  ledGlowRgba,
}) => (
  <div
    className="w-12 h-12 sm:w-18 sm:h-18 lg:w-26 lg:h-26 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-500/90 via-teal-600/90 to-slate-900/95 border border-white/30 shadow-[0_10px_24px_rgba(15,23,42,0.3)]"
    aria-hidden="true"
  >
    <span
      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full animate-pulse"
      style={{ backgroundColor: ledHex, boxShadow: `0 0 16px ${ledGlowRgba}` }}
    />
  </div>
);

export interface ArgonFloatingWidgetProps {
  onOpenChat: () => void;
  onOpenChatWithQuery?: (query: string) => void;
  isChatOpen?: boolean;
  destinationName?: string;
  className?: string;
}

export const ArgonFloatingWidget: React.FC<ArgonFloatingWidgetProps> = ({
  onOpenChat,
  onOpenChatWithQuery,
  isChatOpen = false,
  destinationName,
  className = '',
}) => {
  const [argonState, setArgonState] = useState<ArgonState>('idle');
  const [hintIndex, setHintIndex] = useState(0);
  const [showHintBubble, setShowHintBubble] = useState(true);
  const [isPwaBannerVisible, setIsPwaBannerVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.dataset.scrollLocked === 'true'
  );
  const [isDocked, setIsDocked] = useState(false);
  const [shouldLoad3D, setShouldLoad3D] = useState(false);

  // Defer loading the Three.js 3D mascot bundle until browser is idle so FCP/LCP stay fast
  useEffect(() => {
    if (shouldLoad3D) return;
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
        .requestIdleCallback(() => setShouldLoad3D(true), { timeout: 2500 });
      return () => {
        (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
      };
    }
    const timer = setTimeout(() => setShouldLoad3D(true), 1200);
    return () => clearTimeout(timer);
  }, [shouldLoad3D]);

  // Coordinate visibility with open modals & PWA install banner so corner widgets never collide
  useEffect(() => {
    const onPwaVisibility = (e: Event) => {
      const detail = (e as CustomEvent<{ visible?: boolean }>).detail;
      setIsPwaBannerVisible(Boolean(detail?.visible));
    };
    window.addEventListener('tripverse-pwa-banner-visibility', onPwaVisibility);

    let observer: MutationObserver | null = null;
    if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        setIsModalOpen(document.documentElement.dataset.scrollLocked === 'true');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scroll-locked'] });
    }

    return () => {
      window.removeEventListener('tripverse-pwa-banner-visibility', onPwaVisibility);
      observer?.disconnect();
    };
  }, []);

  const dynamicHints: ProactiveHint[] = [
    {
      id: 'welcome',
      text: 'Hi! I’m ConCode, your AI Co-Pilot 👋',
      mobileText: 'Hi! I’m ConCode 👋',
      actionPrompt: 'Hi ConCode! How can you help me plan my next trip?',
      emotion: 'excited',
    },
    {
      id: 'explore',
      text: 'Welcome to TripVerse! Where to next? ✈️',
      mobileText: 'Where to next? ✈️',
      actionPrompt: 'Help me discover top trending destinations for my vacation.',
      emotion: 'idle',
    },
    ...(destinationName ? [{
      id: 'trip-context',
      text: `Need ideas for ${destinationName.split(',')[0]}? 🗺️`,
      mobileText: `${destinationName.split(',')[0]} ideas? 🗺️`,
      actionPrompt: `Give me top recommendations and hidden gems for ${destinationName}.`,
      emotion: 'excited' as ArgonState,
    }] : []),
    {
      id: 'ask-anything',
      text: 'Ask me anything about travel! 🌍',
      mobileText: 'Ask me anything! 🌍',
      actionPrompt: 'What makes you unique as my AI travel co-pilot?',
      emotion: 'idle',
    },
    {
      id: 'custom-itinerary',
      text: 'Need an instant custom itinerary? 🗺️',
      mobileText: 'Custom itinerary? 🗺️',
      actionPrompt: 'Plan an amazing personalized multi-day trip for me.',
      emotion: 'thinking',
    },
    {
      id: 'hidden-gems',
      text: 'Discover hidden gems & local food 🍜',
      mobileText: 'Hidden gems & food 🍜',
      actionPrompt: 'Suggest verified hidden gems and authentic local food.',
      emotion: 'excited',
    },
    {
      id: 'budget-opt',
      text: 'Optimize your travel budget ₹',
      mobileText: 'Optimize budget ₹',
      actionPrompt: 'Optimize our trip budget and suggest verified stays.',
      emotion: 'idle',
    },
  ];

  const currentHint = dynamicHints[hintIndex] || dynamicHints[0];
  const activeTheme = ARGON_STATE_THEME[argonState];

  // Rotate proactive hints every 9 seconds when chat is closed
  useEffect(() => {
    if (isChatOpen) return;
    const timer = setInterval(() => {
      setHintIndex((prev) => (prev + 1) % dynamicHints.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [isChatOpen, dynamicHints.length]);

  // When chat or a blocking modal opens, or PWA banner occupies the bottom-right slot, hide launcher to prevent overlap
  if (isChatOpen || isModalOpen || isPwaBannerVisible) return null;

  const handleHintClick = (hint: ProactiveHint) => {
    if (onOpenChatWithQuery) {
      onOpenChatWithQuery(hint.actionPrompt);
    } else {
      onOpenChat();
    }
  };

  // When docked to edge, render a compact non-intrusive pill so cards (e.g. Weather) stay 100% unobstructed on mobile
  if (isDocked) {
    return (
      <div
        className={`fixed z-[41] tv-hide-short-landscape select-none ${className}`}
        style={{
          bottom: 'calc(4.85rem + env(safe-area-inset-bottom, 0px))',
          right: 'calc(0.5rem + env(safe-area-inset-right, 0px))',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setIsDocked(false);
            onOpenChat();
          }}
          className="min-h-0 flex items-center gap-1.5 rounded-full bg-[#2D5A3D]/95 text-white px-3 py-2 text-xs font-bold shadow-lg border border-white/25 backdrop-blur-md cursor-pointer active:scale-95 transition-transform"
          aria-label="Expand ConCode AI Co-Pilot"
          title="Open ConCode AI Co-Pilot"
        >
          <span
            className="h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: activeTheme.ledHex }}
          />
          <span>AI</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed z-[41] tv-hide-short-landscape flex flex-col items-end gap-2 select-none ${className}`}
      style={{
        bottom: 'calc(4.65rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(0.5rem + env(safe-area-inset-right, 0px))',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label="ConCode AI Co-Pilot"
    >
      {/* Quick Minimize / Dock pill on mobile so the 3D mascot never permanently obscures underlying cards */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsDocked(true);
        }}
        aria-label="Minimize AI mascot to compact button"
        title="Minimize mascot"
        className="min-h-0 lg:opacity-0 lg:hover:opacity-100 focus:opacity-100 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-300 w-5 h-5 flex items-center justify-center text-[11px] font-bold shadow-xs cursor-pointer transition-opacity -mb-2 mr-1 z-30"
      >
        −
      </button>
      {/* Proactive Speech Bubble - Shown on desktop (lg+) to avoid covering mobile & landscape hero controls */}
      {showHintBubble && (
        <div className="hidden lg:flex group relative items-center gap-2 rounded-2xl border border-emerald-900/10 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-[0_8px_24px_rgba(30,58,47,0.14)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 max-w-[340px] whitespace-nowrap">
          <span
            className="h-2 w-2 shrink-0 rounded-full animate-pulse"
            style={{ backgroundColor: ARGON_STATE_THEME[currentHint.emotion].ledHex }}
          />
          <button
            type="button"
            onClick={() => handleHintClick(currentHint)}
            className="text-left hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer truncate"
          >
            {currentHint.text}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHintBubble(false);
            }}
            aria-label="Dismiss hint"
            className="min-h-0 ml-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer shrink-0 text-xs leading-none"
          >
            ✕
          </button>
          {/* Speech Pointer Triangle */}
          <div className="absolute -bottom-1 right-10 h-3 w-3 rotate-45 border-b border-r border-emerald-900/10 dark:border-slate-700 bg-white dark:bg-slate-900" />
        </div>
      )}

      {/* Floating Interactive Character (100% Unboxed & Borderless, Mobile & Touch Optimized) */}
      <button
        type="button"
        onClick={onOpenChat}
        onMouseEnter={() => setArgonState('excited')}
        onMouseLeave={() => setArgonState('idle')}
        className="group relative flex flex-col items-center bg-transparent border-0 p-0 shadow-none outline-none cursor-pointer focus:outline-none transition-transform duration-300 hover:scale-110 active:scale-95 touch-manipulation"
        title="Chat with ConCode (TripVerse AI Co-Pilot)"
        aria-label="Open ConCode AI Travel Assistant"
      >
        <div className="relative">
          {shouldLoad3D ? (
            <Suspense fallback={<AvatarOrbFallback ledHex={activeTheme.ledHex} ledGlowRgba={activeTheme.ledGlowRgba} />}>
              <ConCode3DAvatar
                emotion={argonState}
                size="lg"
                className="w-12 h-12 sm:w-18 sm:h-18 lg:w-26 lg:h-26 drop-shadow-[0_10px_18px_rgba(15,23,42,0.28)] dark:drop-shadow-[0_12px_22px_rgba(0,0,0,0.7)]"
              />
            </Suspense>
          ) : (
            <AvatarOrbFallback ledHex={activeTheme.ledHex} ledGlowRgba={activeTheme.ledGlowRgba} />
          )}

          {/* Micro Status Beacon Orbiting ConCode */}
          <span
            className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border-2 border-white dark:border-slate-900 transition-colors duration-300 z-20 pointer-events-none"
            style={{
              backgroundColor: activeTheme.ledHex,
              boxShadow: `0 0 12px ${activeTheme.ledGlowRgba}`,
            }}
          />
        </div>

        {/* 3D Contact Elevation Ground Shadow Beneath ConCode */}
        <div
          className="mt-0.5 h-1.5 sm:h-2 w-10 sm:w-16 rounded-full bg-slate-900/25 dark:bg-black/50 blur-xs transition-all duration-300 group-hover:scale-75 group-hover:opacity-40"
          aria-hidden="true"
        />
      </button>
    </div>
  );
};
