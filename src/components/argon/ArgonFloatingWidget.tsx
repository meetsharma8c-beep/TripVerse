// src/components/argon/ArgonFloatingWidget.tsx
import React, { useState, useEffect } from 'react';
import { ArgonAvatar } from './ArgonAvatar';
import { ARGON_STATE_THEME, ArgonState, ProactiveHint } from './argon.types';

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

  // When chat opens, hide corner launcher to avoid overlap with chat drawer
  if (isChatOpen) return null;

  const handleHintClick = (hint: ProactiveHint) => {
    if (onOpenChatWithQuery) {
      onOpenChatWithQuery(hint.actionPrompt);
    } else {
      onOpenChat();
    }
  };

  return (
    <div
      className={`fixed z-40 flex flex-col items-end gap-2.5 select-none ${className}`}
      style={{
        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(1rem + env(safe-area-inset-right, 0px))',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label="ConCode AI Co-Pilot"
    >
      {/* Proactive Speech Bubble - Compact & Proportional on Mobile */}
      {showHintBubble && (
        <div className="group relative flex items-center gap-1.5 sm:gap-2.5 rounded-xl sm:rounded-2xl border border-emerald-900/10 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-[0_8px_24px_rgba(30,58,47,0.14)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 max-w-[210px] sm:max-w-[340px] whitespace-nowrap">
          <span
            className="h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0 rounded-full animate-pulse"
            style={{ backgroundColor: ARGON_STATE_THEME[currentHint.emotion].ledHex }}
          />
          <button
            type="button"
            onClick={() => handleHintClick(currentHint)}
            className="text-left hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer truncate"
          >
            <span className="sm:hidden">{currentHint.mobileText || currentHint.text}</span>
            <span className="hidden sm:inline">{currentHint.text}</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowHintBubble(false);
            }}
            aria-label="Dismiss hint"
            className="ml-0.5 sm:ml-1 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 cursor-pointer shrink-0 text-[10px] sm:text-xs leading-none"
          >
            ✕
          </button>
          {/* Speech Pointer Triangle */}
          <div className="absolute -bottom-1 right-6 sm:right-10 h-2.5 w-2.5 sm:h-3 sm:w-3 rotate-45 border-b border-r border-emerald-900/10 dark:border-slate-700 bg-white dark:bg-slate-900" />
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
          <ArgonAvatar
            state={argonState}
            size="lg"
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 drop-shadow-[0_12px_22px_rgba(15,23,42,0.3)] dark:drop-shadow-[0_14px_24px_rgba(0,0,0,0.7)]"
          />

          {/* Micro Status Beacon Orbiting ConCode */}
          <span
            className="absolute top-2 right-2 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 transition-colors duration-300 z-20 pointer-events-none"
            style={{
              backgroundColor: activeTheme.ledHex,
              boxShadow: `0 0 12px ${activeTheme.ledGlowRgba}`,
            }}
          />
        </div>

        {/* 3D Contact Elevation Ground Shadow Beneath ConCode */}
        <div
          className="mt-0.5 h-2 w-14 sm:w-16 rounded-full bg-slate-900/25 dark:bg-black/50 blur-xs transition-all duration-300 group-hover:scale-75 group-hover:opacity-40"
          aria-hidden="true"
        />
      </button>
    </div>
  );
};
