import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { Trip, ChatMessage } from '../../types/trip';
import { processTravelCoPilotQuery, AIAppAction } from '../../services/aiAssistant';
import { 
  checkBrainStatus, 
  BrainStatus, 
  GUILD_LABELS, 
  resetBrainSession 
} from '../../services/concodeBrainService';
import { resetConcodeSession, clearTravelerMemoryRing } from '../../services/concodeSession';
import { ArgonAvatar } from '../argon/ArgonAvatar';
const ConCode3DAvatar = lazy(() => import('../argon/ConCode3DAvatar').then(m => ({ default: m.ConCode3DAvatar })));
import { preparePromptForConCode } from '../../services/concode/normalizeUserPrompt';
import { inferArgonStateFromText, parseConCodeStreamResponse, ArgonState, ARGON_STATE_THEME } from '../argon/argon.types';
const Landmark3DViewer = lazy(() => import('../common/Landmark3DViewer').then(m => ({ default: m.Landmark3DViewer })));
import { X, Send, Sparkles, Bot, User, Check, RefreshCw, Activity, Coins, Utensils, Copy, Trash2, Calendar, Clock, Sun, Sunset, ArrowRight, TrendingDown, Crown, Shield, Users, Compass, Mic, MicOff, FileText, Plane, Camera, Headphones, Pause, Play, Square } from 'lucide-react';
import { scanTravelImage, VisualScanResult } from '../../services/visualAiScannerService';
import { startAudioTour, pauseAudioTour, resumeAudioTour, stopAudioTour, setAudioTourListener, AudioTourState } from '../../services/audioTourService';
import { triggerHaptic, openExternalUrl } from '../../services/deviceService';
import { getUserSubscriptionQuota, consumeAssistantMinute } from '../../services/authService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { formatCurrency, getActiveCurrency, CURRENCIES } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';

interface AIChatDrawerProps {
  trip: Trip;
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onOpenReplanning?: (screen?: 1 | 2 | 3 | 4 | 5 | 'refund') => void;
  onAppAction?: (action: AIAppAction) => void;
  onOpenProModal?: () => void;
}

import { getCurrentUser } from '../../services/authService';

function getChatStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  const user = getCurrentUser();
  return user?.uid ? window.localStorage : window.sessionStorage;
}

function getChatStorageKey(tripId?: string): string {
  const user = getCurrentUser();
  const base = user?.uid ? `tripverse_chat_u_${user.uid}` : 'tripverse_chat_guest';
  const cleanTripId = (tripId || '').trim();
  return cleanTripId ? `${base}_t_${cleanTripId}` : base;
}

const VOICE_LOCALE_MAP: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ar: 'ar-SA',
  it: 'it-IT',
  pt: 'pt-BR'
};

function compressImageDataUrl(dataUrl: string, maxDim = 960, quality = 0.78): Promise<string> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round((img.width || maxDim) * scale));
        const height = Math.max(1, Math.round((img.height || maxDim) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function isSafeMarkdownHref(rawHref: string): boolean {
  const trimmed = rawHref.trim();
  return /^https?:\/\//i.test(trimmed) || (trimmed.startsWith('/') && !trimmed.startsWith('//'));
}

function parseInlineTokens(content: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*|\[.*?\]\(.*?\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`${match.index}-b`} className="font-bold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`${match.index}-c`} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 font-mono text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`${match.index}-i`} className="italic text-slate-800 dark:text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkText = token.slice(1, token.indexOf(']('));
      const linkHref = token.slice(token.indexOf('](') + 2, -1);
      if (isSafeMarkdownHref(linkHref)) {
        parts.push(
          <a
            key={`${match.index}-a`}
            href={linkHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 dark:text-emerald-400 underline font-semibold hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            {linkText}
          </a>
        );
      } else {
        parts.push(
          <span key={`${match.index}-a`} className="font-semibold text-emerald-700 dark:text-emerald-300">
            {linkText}
          </span>
        );
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [content];
}

const FormattedAIMessage: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableHeaderCells: string[] = [];
  let tableRows: string[][] = [];

  const flushTable = (key: string) => {
    if (tableHeaderCells.length > 0) {
      elements.push(
        <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 shadow-2xs">
          <table className="w-full text-left text-[11px] border-collapse min-w-[280px]">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                {tableHeaderCells.map((th, thIdx) => (
                  <th key={thIdx} className="px-3 py-1.5 font-bold text-slate-800 dark:text-slate-100">
                    {parseInlineTokens(th.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 text-slate-700 dark:text-slate-300">
                      {parseInlineTokens(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeaderCells = [];
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block check
    if (trimmed.startsWith('```')) {
      if (inTable) flushTable(`table-${i}`);
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${i}`} className="my-2 rounded-xl bg-slate-900 text-slate-100 p-3 font-mono text-[11px] overflow-x-auto border border-slate-800 shadow-inner">
            {codeBlockLang && (
              <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 border-b border-slate-800 pb-1">
                {codeBlockLang}
              </div>
            )}
            <pre className="whitespace-pre">{codeBlockLines.join('\n')}</pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Markdown Table check
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      const isDivider = cells.every(c => /^:?-+:?$/.test(c));
      if (!inTable) {
        inTable = true;
        tableHeaderCells = cells;
        tableRows = [];
      } else if (isDivider) {
        // Divider row, skip adding as data row
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(`table-${i}`);
    }

    // Blank line
    if (!trimmed) {
      elements.push(<div key={`sp-${i}`} className="h-1.5" />);
      continue;
    }

    // Heading checks
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${i}`} className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm mt-2 mb-0.5 flex items-center gap-1.5">
          {parseInlineTokens(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="font-black text-slate-900 dark:text-white text-sm mt-2 mb-0.5">
          {parseInlineTokens(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="font-black text-slate-900 dark:text-white text-base mt-2.5 mb-1">
          {parseInlineTokens(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet point checks
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.replace(/^[*\-•]\s+/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-200 py-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
          <span className="flex-1 min-w-0 break-words">{parseInlineTokens(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered list checks
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={`num-${i}`} className="flex items-start gap-1.5 text-slate-700 dark:text-slate-200 py-0.5">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 mt-0.5 shrink-0">
            {numMatch[1]}
          </span>
          <span className="flex-1 min-w-0 break-words">{parseInlineTokens(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-slate-700 dark:text-slate-200 leading-relaxed break-words">
        {parseInlineTokens(rawLine)}
      </p>
    );
  }

  if (inTable) {
    flushTable('table-end');
  }

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <div key="code-unclosed" className="my-2 rounded-xl bg-slate-900 text-slate-100 p-3 font-mono text-[11px] overflow-x-auto border border-slate-800">
        <pre className="whitespace-pre">{codeBlockLines.join('\n')}</pre>
      </div>
    );
  }

  return <div className="space-y-1 text-xs leading-relaxed">{elements}</div>;
};

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  trip,
  isOpen,
  initialQuery,
  onClose,
  onUpdateTrip,
  onOpenReplanning,
  onAppAction,
  onOpenProModal
}) => {
  const [brainStatus, setBrainStatus] = useState<BrainStatus>({ online: false });
  const [isCheckingBrain, setIsCheckingBrain] = useState(false);
  const [is3DViewerOpen, setIs3DViewerOpen] = useState(false);
  const [viewer3DLandmark, setViewer3DLandmark] = useState('Heritage Landmark');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [chatNotice, setChatNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input immediately so re-selecting the same file always triggers onChange
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setChatNotice('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setChatNotice('Image is too large (max 12 MB). Please choose a smaller photo.');
      return;
    }
    setChatNotice(null);
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const compressed = await compressImageDataUrl(reader.result);
        setUploadedImage(compressed);
        triggerHaptic('light');
      }
    };
    reader.readAsDataURL(file);
  };

  // Active day tab state for structured itinerary cards
  const [activeItineraryDay, setActiveItineraryDay] = useState<Record<string, number>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  // Audio Tour Guide State
  const [audioTour, setAudioTour] = useState<AudioTourState>({
    isPlaying: false,
    isPaused: false,
    currentLandmark: null,
    playbackRate: 1.0
  });

  useEffect(() => {
    setAudioTourListener((state) => {
      setAudioTour(state);
    });
    return () => {
      setAudioTourListener(null);
    };
  }, []);

  const cleanTripDest = (trip?.destination && trip.destination !== 'Custom Spot' ? trip.destination : (trip?.name || 'your destination')).split(',')[0].trim();

  const getInitialMessages = useCallback((): ChatMessage[] => {
    try {
      const storage = getChatStorage();
      if (storage) {
        const key = getChatStorageKey(trip?.id);
        const saved = storage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}

    const hasDestination = Boolean(trip.destination && trip.destination !== 'Custom Spot' && trip.destination.trim());
    const destName = (trip.destination || '').split(',')[0].trim();
    const hasActivities = Boolean(trip.itinerary && trip.itinerary.length > 0 && trip.itinerary[0]?.activities?.length > 0);

    let welcomeText = `[STATE:idle] Hi there! I'm your ConCode travel companion. Whether you have a destination in mind or just a weekend and a rough budget, I'd love to help you map it out. Where shall we begin?`;

    if (hasDestination && hasActivities) {
      const transitPhrase =
        trip.transportMode === 'train'
          ? 'station transfers, rail timings'
          : trip.transportMode === 'flight'
            ? 'airport transfers, flight logistics'
            : 'verified pitstops';
      welcomeText = `[STATE:excited] Welcome back! Your itinerary for ${destName} is looking great. Whenever you feel ready, I can line up ${transitPhrase}, budget checks, or weather forecasts—no rush at all.`;
    } else if (hasDestination) {
      welcomeText = `[STATE:listening] Heading to ${destName}? I can help map out your day-by-day pacing, budget allocation, and routes. Where would you like to start?`;
    }

    return [
      {
        id: 'welcome-1',
        sender: 'ai',
        text: welcomeText,
        timestamp: 'Just now',
        engine: 'concode_brain',
        guild: 'fullstack',
        confidence: 0.99,
        actionButtons: [
          {
            label: hasDestination ? `Plan a 5-day trip to ${destName}` : 'Plan a 5-day trip to Dubai',
            action: hasDestination ? 'PLAN_ACTIVE_DEST' : 'PLAN_DUBAI',
            payload: hasDestination ? { destination: destName } : undefined,
            primary: true
          },
          { label: 'What will this trip approximately cost?', action: 'CHECK_BUDGET' },
          { label: 'Make Day 3 cheaper', action: 'MAKE_CHEAPER' },
          { label: 'Rainy-day alternative', action: 'RAINY_DAY_ALT' },
          { label: 'Get Directions', action: 'START_NAV' }
        ]
      }
    ];
  }, [trip?.id, trip?.destination, trip?.itinerary]);

  const { language, t } = useLanguage();
  const lastLoadedScopeKeyRef = useRef<string>(getChatStorageKey(trip?.id));
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages());
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quota, setQuota] = useState(() => getUserSubscriptionQuota());
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const voicePrefixRef = useRef<string>('');
  const isSendingRef = useRef(false);
  const activeRequestIdRef = useRef(0);
  const supportsVoice = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useModalBehavior(isOpen, onClose);

  // Cancel any in-flight request side-effects if the user closes the drawer
  useEffect(() => {
    if (!isOpen && isSendingRef.current) {
      activeRequestIdRef.current += 1;
      isSendingRef.current = false;
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e) {}
    };
  }, []);

  const toggleListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setChatNotice(t('Voice dictation is supported in Chrome, Safari, and Chromium-based browsers.'));
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
      triggerHaptic();
      return;
    }

    try {
      setChatNotice(null);
      voicePrefixRef.current = inputQuery.trim();
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = VOICE_LOCALE_MAP[language] || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        triggerHaptic();
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          const prefix = voicePrefixRef.current;
          setInputQuery(prefix ? `${prefix} ${transcript.trim()}` : transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceInput] Speech recognition notice:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setChatNotice('Microphone permission was blocked. Allow mic access in browser settings to use voice input.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('[VoiceInput] Start failed:', err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    const handleQuota = () => setQuota(getUserSubscriptionQuota());
    window.addEventListener('tripverse_quota_updated', handleQuota);
    window.addEventListener('tripverse_auth_state_change', handleQuota);
    return () => {
      window.removeEventListener('tripverse_quota_updated', handleQuota);
      window.removeEventListener('tripverse_auth_state_change', handleQuota);
    };
  }, []);

  // Reload scoped chat history ONLY when the actual user UID or active trip ID changes
  // (NEVER on quota/profile updates for the same user or itinerary edits on the same trip, which previously wiped live AI replies!)
  const getInitialMessagesRef = useRef(getInitialMessages);
  useEffect(() => {
    getInitialMessagesRef.current = getInitialMessages;
  });

  useEffect(() => {
    const nextScopeKey = getChatStorageKey(trip?.id);
    if (nextScopeKey !== lastLoadedScopeKeyRef.current) {
      lastLoadedScopeKeyRef.current = nextScopeKey;
      setMessages(getInitialMessagesRef.current());
    }
  }, [trip?.id]);

  useEffect(() => {
    const handleAuthChange = () => {
      const nextScopeKey = getChatStorageKey(trip?.id);
      if (nextScopeKey !== lastLoadedScopeKeyRef.current) {
        lastLoadedScopeKeyRef.current = nextScopeKey;
        setMessages(getInitialMessagesRef.current());
      }
    };
    window.addEventListener('tripverse_auth_state_change', handleAuthChange);
    return () => window.removeEventListener('tripverse_auth_state_change', handleAuthChange);
  }, [trip?.id]);

  const refreshBrainHealth = useCallback(async () => {
    setIsCheckingBrain(true);
    try {
      const status = await checkBrainStatus();
      setBrainStatus(status);
    } finally {
      setIsCheckingBrain(false);
    }
  }, []);

  // Listen for ConCode endpoint config updates
  useEffect(() => {
    const handleConfigUpdate = () => {
      refreshBrainHealth();
    };
    window.addEventListener('tripverse_concode_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('tripverse_concode_config_updated', handleConfigUpdate);
  }, [refreshBrainHealth]);

  // Save messages to user+trip-scoped storage tier (strip large base64 data URLs to prevent 5MB localStorage overflow)
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const storage = getChatStorage();
        if (storage) {
          const compact = messages.slice(-20).map((m) =>
            m.imageUrl && m.imageUrl.startsWith('data:image/') && m.imageUrl.length > 30_000
              ? { ...m, imageUrl: undefined }
              : m
          );
          storage.setItem(getChatStorageKey(trip?.id), JSON.stringify(compact));
        }
      } catch {}
    }
  }, [messages, trip?.id]);

  const handleSendMessageRef = useRef<(textToSend?: string) => Promise<void>>(async () => {});

  const hasHandledInitialQuery = useRef(false);
  useEffect(() => {
    if (isOpen) {
      refreshBrainHealth();
      if (initialQuery && !hasHandledInitialQuery.current) {
        hasHandledInitialQuery.current = true;
        handleSendMessageRef.current(initialQuery);
      }
    } else {
      hasHandledInitialQuery.current = false;
    }
  }, [isOpen, initialQuery, refreshBrainHealth]);

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return;
    const container = scrollRef.current;
    const latestMsg = messages[messages.length - 1];

    const rafId = window.requestAnimationFrame(() => {
      if (!container) return;

      // When the AI finishes replying, scroll to the START (top) of that reply so the user reads from the beginning
      if (!isProcessing && latestMsg?.sender === 'ai' && messages.length > 1) {
        const msgNodes = container.querySelectorAll<HTMLElement>('[data-msg-id]');
        const latestNode = Array.from(msgNodes).find((el) => el.dataset.msgId === latestMsg.id);
        if (latestNode) {
          const containerRect = container.getBoundingClientRect();
          const nodeRect = latestNode.getBoundingClientRect();
          const targetTop = Math.max(0, container.scrollTop + (nodeRect.top - containerRect.top) - 12);
          container.scrollTo({
            top: targetTop,
            behavior: 'smooth',
          });
          return;
        }
      }

      // While user is sending or AI is thinking, scroll to bottom so the spinner is visible
      container.scrollTo({
        top: container.scrollHeight,
        behavior: messages.length <= 2 ? 'auto' : 'smooth',
      });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen, messages, isProcessing]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [inputQuery]);

  const handleClearChat = () => {
    resetBrainSession();
    resetConcodeSession();
    const storage = getChatStorage();
    if (storage) {
      storage.removeItem(getChatStorageKey(trip?.id));
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('tripverse_chat_guest');
      sessionStorage.removeItem('tripverse_concode_chat_history_v2');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tripverse_chat_guest');
      localStorage.removeItem('tripverse_concode_chat_history_v2');
    }
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: `[STATE:idle] Conversation cleared. I'm ready for your next travel adventure! What would you like to plan?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        engine: 'concode_brain',
        guild: 'fullstack',
        actionButtons: [
          { label: 'Plan a 5-day trip to Dubai', action: 'PLAN_DUBAI', primary: true },
          { label: `Budget: ${formatCurrency(100000)}`, action: 'BUDGET_1LAKH' },
          { label: 'I like food and architecture', action: 'PREF_FOOD_ARCH' },
          { label: 'Get Directions', action: 'START_NAV' }
        ]
      }
    ]);
    triggerHaptic('light');
  };

  const handleCopyMessage = async (id: string, text: string) => {
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      // Fallback for restricted WebViews / non-HTTPS contexts
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        copied = document.execCommand('copy');
        document.body.removeChild(el);
      } catch {
        copied = false;
      }
    }
    if (copied) {
      setCopiedMsgId(id);
      triggerHaptic('light');
      setTimeout(() => setCopiedMsgId(null), 2000);
    } else {
      setChatNotice('Could not copy to clipboard — please select and copy the message text manually.');
    }
  };

  const handleStopGenerating = () => {
    activeRequestIdRef.current += 1;
    isSendingRef.current = false;
    setIsProcessing(false);
    setChatNotice('Stopped AI generation. Your free quota was not charged.');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    const currentImage = uploadedImage;
    if ((!query.trim() && !currentImage) || isProcessing || isSendingRef.current) return;

    if (!quota.isPro && quota.weeklyAssistantMinutesRemaining <= 0) {
      if (onOpenProModal) onOpenProModal();
      return;
    }

    isSendingRef.current = true;
    const reqId = ++activeRequestIdRef.current;
    setChatNotice(null);
    triggerHaptic('light');

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query || (currentImage ? 'Analyze this travel photo / booking ticket' : ''),
      imageUrl: currentImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setUploadedImage(null);
    setIsProcessing(true);

    try {
      if (currentImage) {
        // Run multimodal visual AI scan
        const scanResult = await scanTravelImage(currentImage, query);
        if (activeRequestIdRef.current !== reqId) return;
        let summaryText = '';
        if (scanResult.type === 'landmark') {
          const sourceNote = scanResult.source === 'prompt_match' ? ' _(Matched from your note)_' : '';
          summaryText = `📸 **Visual Landmark Identification: ${scanResult.name}**${sourceNote}\n\n📍 **Location:** ${scanResult.city}, ${scanResult.country}\n🏛️ **Architecture:** ${scanResult.architecturalStyle}\n⏱️ **Recommended Duration:** ${scanResult.suggestedDuration}\n🎟️ **Entry Fee:** ${scanResult.entryFee}\n☀️ **Best Time to Visit:** ${scanResult.bestTimeToVisit}\n\n${scanResult.description}`;
        } else if (scanResult.type === 'ticket') {
          summaryText = `🎫 **Boarding Pass & Booking Extracted**\n\n✈️ **Carrier:** ${scanResult.carrier}\n🏷️ **Booking Ref / PNR:** ${scanResult.bookingRef}\n🛫 **Route:** ${scanResult.origin} ➔ ${scanResult.destination}\n⏰ **Departure:** ${scanResult.departureTime}\n💺 **Seat / Room:** ${scanResult.seatOrRoom}`;
        } else if (scanResult.type === 'food') {
          summaryText = `🍽️ **Culinary Identification: ${scanResult.dishName}**\n\n🍜 **Cuisine:** ${scanResult.cuisine} (${scanResult.region})\n😋 **Flavor Profile:** ${scanResult.flavorProfile}\n🏷️ **Dietary:** ${scanResult.dietaryTags.join(', ')}\n💰 **Average Price:** ${scanResult.averagePrice}\n\n${scanResult.description}`;
        } else {
          summaryText = `📷 **${scanResult.title}**\n\n${scanResult.guidance}`;
        }

        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: summaryText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          engine: 'concode_brain',
          confidence: scanResult.type === 'unverified' ? undefined : (scanResult.type === 'landmark' ? scanResult.confidence : 0.92),
          visualScanResult: scanResult,
          actionButtons: scanResult.type === 'landmark' ? [
            {
              label: `➕ Add ${scanResult.name} to Day 1`,
              action: 'add_activity',
              payload: { day: 1, title: scanResult.name, description: scanResult.description, cost: 0 },
              primary: true
            },
            {
              label: `🎧 Listen to Audio Tour`,
              action: 'audio_tour',
              payload: { landmark: scanResult.name }
            },
            {
              label: `🌐 View 3D Landmark`,
              action: 'view_3d',
              payload: { landmark: scanResult.name }
            }
          ] : undefined
        };

        setMessages(prev => [...prev, aiMessage]);
        consumeAssistantMinute(1);
      } else {
        const preparedQuery = preparePromptForConCode(query);
        const streamMsgId = `stream-${Date.now()}`;
        let hasStreamedBubble = false;
        let lastStreamUpdate = 0;

        const upsertStreamBubble = (text: string) => {
          if (activeRequestIdRef.current !== reqId) return;
          const now = Date.now();
          if (hasStreamedBubble && now - lastStreamUpdate < 45) return;
          lastStreamUpdate = now;
          const liveMsg: ChatMessage = {
            id: streamMsgId,
            sender: 'ai',
            text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            engine: 'concode_brain'
          };
          if (!hasStreamedBubble) {
            hasStreamedBubble = true;
            setMessages(prev => [...prev, liveMsg]);
          } else {
            setMessages(prev => prev.map(m => (m.id === streamMsgId ? liveMsg : m)));
          }
        };

        const response = await processTravelCoPilotQuery(preparedQuery, trip, {
          onToken: (accumulated) => {
            if (accumulated.trim()) upsertStreamBubble(accumulated);
          }
        });
        if (activeRequestIdRef.current !== reqId) return;

        const safeAiMsg: ChatMessage = response?.message?.text
          ? response.message
          : {
              id: `ai-${Date.now()}`,
              sender: 'ai',
              text: `[STATE:idle] I received your message — let me know how I can help with your ${cleanTripDest} trip!`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              engine: 'concode_brain'
            };

        if (hasStreamedBubble) {
          setMessages(prev => prev.map(m => (m.id === streamMsgId ? safeAiMsg : m)));
        } else {
          setMessages(prev => [...prev, safeAiMsg]);
        }
        consumeAssistantMinute(1);

        if (response.updatedTrip) {
          onUpdateTrip(response.updatedTrip);
        }
        if (response.appAction && onAppAction) {
          onAppAction(response.appAction);
        }
      }
    } catch (e) {
      if (activeRequestIdRef.current !== reqId) return;
      console.error('Error processing query:', e);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: 'ConCode AI encountered a temporary issue. Your quota was not deducted — please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          engine: 'concode_brain'
        }
      ]);
    } finally {
      if (activeRequestIdRef.current === reqId) {
        isSendingRef.current = false;
        setIsProcessing(false);
      }
    }
  };

  const handleActionButton = (action: string, payload?: any) => {
    const switchToTripSection = (subTab: string) => {
      if (onAppAction) {
        onAppAction({ type: 'SWITCH_TAB', payload: { tab: 'trip-detail', subTab } });
      }
      onClose();
    };

    if (action === 'add_activity' && payload?.title) {
      const targetDayNum = Math.max(1, Number(payload.day) || 1);
      const existingDays = Array.isArray(trip?.itinerary) ? trip.itinerary : [];
      if (existingDays.length === 0) {
        setChatNotice('Create or open a trip first before adding landmarks to an itinerary.');
        return;
      }
      const targetDay = existingDays.find(d => d.dayNumber === targetDayNum) || existingDays[0];
      const normalizedTitle = String(payload.title).trim().toLowerCase();
      if (targetDay.activities.some(a => (a.title || '').trim().toLowerCase() === normalizedTitle)) {
        setChatNotice(`"${payload.title}" is already scheduled on Day ${targetDay.dayNumber}.`);
        return;
      }
      const newActivity = {
        id: `act-ai-${Date.now()}`,
        dayNumber: targetDay.dayNumber,
        time: '02:00 PM',
        title: String(payload.title).trim(),
        type: 'attraction' as const,
        location: trip.destination || String(payload.title).trim(),
        estimatedCost: Math.max(0, Number(payload.cost) || 0),
        travelTimeMin: 15,
        distanceKm: 2,
        description: String(payload.description || 'Added via ConCode Visual Landmark Scanner.'),
        coordinates:
          trip.destinationDetails?.coordinates ||
          trip.routeDetails?.destinationCoordinates ||
          targetDay.activities[0]?.coordinates ||
          { lat: 0, lng: 0 },
        tag: 'AI Scanner',
        completed: false,
        isCustom: true
      };
      const updatedItinerary = existingDays.map(d =>
        d.dayNumber === targetDay.dayNumber
          ? {
              ...d,
              activities: [...d.activities, newActivity],
              dayEstimatedCost: (d.dayEstimatedCost || 0) + newActivity.estimatedCost
            }
          : d
      );
      onUpdateTrip({ ...trip, itinerary: updatedItinerary });
      triggerHaptic('success');
      setMessages(prev => [
        ...prev,
        {
          id: `ai-add-${Date.now()}`,
          sender: 'ai',
          text: `[STATE:excited] Added **${newActivity.title}** to **Day ${targetDay.dayNumber}** of your ${cleanTripDest} itinerary.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          engine: 'concode_brain',
          actionButtons: [{ label: 'View Itinerary', action: 'VIEW_ITINERARY', primary: true }]
        }
      ]);
      return;
    }

    if (action === 'PLAN_ACTIVE_DEST') {
      const targetDest = payload?.destination || cleanTripDest || 'Dubai';
      handleSendMessage(`Plan a 5-day trip to ${targetDest}`);
    } else if (action === 'PLAN_DUBAI') {
      handleSendMessage('Plan a 5-day trip to Dubai');
    } else if (action === 'BUDGET_1LAKH') {
      handleSendMessage(`I have a budget of ${formatCurrency(100000)}`);
    } else if (action === 'BUDGET_50K') {
      handleSendMessage(`I have a budget of ${formatCurrency(50000)}`);
    } else if (action === 'PREF_FOOD_ARCH') {
      handleSendMessage('I like food and architecture');
    } else if (action === 'PREF_ADVENTURE') {
      handleSendMessage('I like adventure and desert safari');
    } else if (action === 'PREF_RELAXED') {
      handleSendMessage('I prefer relaxed coastal pace');
    } else if (action === 'GENERATE_NOW') {
      handleSendMessage('Generate itinerary now');
    } else if (action === 'CHECK_BUDGET') {
      handleSendMessage('What will this trip approximately cost?');
    } else if (action === 'MAKE_CHEAPER') {
      handleSendMessage('Make Day 3 cheaper');
    } else if (action === 'CHECK_WEATHER') {
      switchToTripSection('packing');
    } else if (action === 'RAINY_DAY_ALT') {
      handleSendMessage('Give me a rainy-day alternative');
    } else if (action === 'VIEW_DEALS') {
      switchToTripSection('deals');
    } else if (action === 'VIEW_PACKING') {
      switchToTripSection('packing');
    } else if (action === 'SAFETY_CHECK' || action === 'VIEW_SAFETY') {
      switchToTripSection('safety');
    } else if (action === 'OPEN_3D_VIEWER') {
      const dest = cleanTripDest || 'Manali';
      const landmark = dest.toLowerCase().includes('manali')
        ? 'Hadimba Temple & Solang'
        : dest.toLowerCase().includes('dubai')
          ? 'Burj Khalifa Spire'
          : dest.toLowerCase().includes('jaipur')
            ? 'Amer Fort Citadel'
            : `${dest} Landmark`;
      setViewer3DLandmark(landmark);
      setIs3DViewerOpen(true);
    } else if (action === 'RESET_BRAIN') {
      clearTravelerMemoryRing();
      handleClearChat();
    } else if (action === 'OPEN_REPLANNING') {
      onClose();
      if (onOpenReplanning) onOpenReplanning(4);
    } else if (action === 'OPEN_EMERGENCY_STAY') {
      onClose();
      if (onOpenReplanning) onOpenReplanning(3);
    } else if (action === 'OPEN_REFUND_INFO') {
      onClose();
      if (onOpenReplanning) onOpenReplanning('refund');
    } else if (action === 'START_NAV') {
      if (onAppAction) onAppAction({ type: 'START_NAVIGATION' });
      onClose();
    } else if (action === 'audio_tour' || action === 'START_AUDIO_TOUR') {
      const landmark = payload?.landmark || cleanTripDest || 'Eiffel Tower';
      startAudioTour(landmark, cleanTripDest);
      triggerHaptic('success');
    } else if (action === 'STOP_AUDIO_TOUR') {
      stopAudioTour();
      triggerHaptic('light');
    } else if (action === 'view_3d') {
      const landmark = payload?.landmark || cleanTripDest || 'Eiffel Tower';
      setViewer3DLandmark(landmark);
      setIs3DViewerOpen(true);
      triggerHaptic('light');
    } else if (action === 'OPEN_PRINT' || action === 'PRINT_GUIDE') {
      if (onAppAction) onAppAction({ type: 'OPEN_MODAL', payload: { modal: 'print' } });
      onClose();
    } else if (action === 'OPEN_SHARE') {
      if (onAppAction) onAppAction({ type: 'OPEN_MODAL', payload: { modal: 'share' } });
      onClose();
    } else if (action === 'OPEN_BOOKING') {
      if (onAppAction) onAppAction({ type: 'OPEN_MODAL', payload: { modal: 'booking' } });
      onClose();
    } else if (action === 'SEARCH_FLIGHTS') {
      const origin = trip.origin || 'Delhi';
      const dest = trip.destination || 'Dubai';
      const flightUrl = `https://www.google.com/travel/flights?q=flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(dest)}`;
      openExternalUrl(flightUrl);
    } else if (action === 'TRANSPORT_DEALS') {
      if (onAppAction) onAppAction({ type: 'OPEN_MODAL', payload: { modal: 'deals' } });
      onClose();
    } else if (action === 'VIEW_ROUTE') {
      switchToTripSection('route');
    } else if (action === 'VIEW_ITINERARY') {
      switchToTripSection('itinerary');
    } else if (action === 'VIEW_EXPENSES') {
      switchToTripSection('expenses');
    } else {
      handleSendMessage(action);
    }
  };

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  const scenarioChips = [
    { label: 'Export PDF Guide', icon: FileText, prompt: 'Download and export official printable PDF travel guide dossier' },
    { label: 'Live Weather', icon: Sun, prompt: 'What is the live weather forecast, temperature, and packing guide?' },
    { label: 'Flight Routes', icon: Plane, prompt: 'Find best flight routes, airport codes, and airfare options' },
    { label: '3D Landmark Tour', icon: Sparkles, prompt: 'Show me an interactive 3D WebGL tour of the landmark' },
    { label: 'Safety Radar', icon: Shield, prompt: 'What are the tourist scams and safety tips for my destination?' },
    { label: 'Flight Delayed', icon: Clock, prompt: 'My flight was delayed 3 hours, please replan Day 1' },
    { label: 'Group Consensus', icon: Users, prompt: 'Plan a group trip with mixed preferences (adventure and food)' },
    { label: 'Memory Ring', icon: Compass, prompt: 'What do you remember in my travel profile memory ring?' },
    { label: '5-Day Dubai', prompt: 'Plan a 5-day trip to Dubai' },
    { label: `Budget ${formatCurrency(100000)}`, prompt: `I have a budget of ${formatCurrency(100000)}` },
    { label: 'Food & Arch', prompt: 'I like food and architecture' },
    { label: 'Day 3 Cheaper', prompt: 'Make Day 3 cheaper' },
    { label: 'Rainy Day Alt', prompt: 'Give me a rainy-day alternative' },
    { label: 'Cost Breakdown', prompt: 'What will this trip approximately cost?' },
    { label: 'Save Itinerary', prompt: 'Save this itinerary' },
    { label: 'Get Directions', prompt: 'Get directions to my destination' }
  ];

  const latestAiMsg = [...messages].reverse().find(m => m.sender === 'ai');
  const parsedLatestAi = latestAiMsg ? parseConCodeStreamResponse(latestAiMsg.text) : null;

  const argonHeaderState: ArgonState = isProcessing
    ? 'thinking'
    : inputQuery.trim()
    ? 'listening'
    : parsedLatestAi
    ? parsedLatestAi.state
    : 'idle';

  const glassRectCacheRef = useRef<WeakMap<HTMLElement, DOMRect>>(new WeakMap());
  const glassSheenRafRef = useRef<number | null>(null);

  const handleGlassPointerMove = (e: React.MouseEvent<HTMLElement>) => {
    if (typeof window !== 'undefined' && !window.matchMedia?.('(hover: hover)').matches) return;
    const el = e.currentTarget;
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (glassSheenRafRef.current === null) {
      glassSheenRafRef.current = window.requestAnimationFrame(() => {
        glassSheenRafRef.current = null;
        let rect = glassRectCacheRef.current.get(el);
        if (!rect) {
          rect = el.getBoundingClientRect();
          glassRectCacheRef.current.set(el, rect);
        }
        el.style.setProperty('--mouse-x', `${clientX - rect.left}px`);
        el.style.setProperty('--mouse-y', `${clientY - rect.top}px`);
      });
    }
  };

  if (!isOpen) return null;

  const drawerMarkup = (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="AI Travel Assistant"
      onClick={onClose}
      className="fixed inset-0 z-[95] overflow-hidden overscroll-contain liquid-chat-backdrop flex justify-end items-end sm:items-stretch"
    >
      
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md md:max-w-lg liquid-chat-shell liquid-rim h-[92dvh] sm:h-[calc(100dvh-1.5rem)] sm:my-3 sm:mr-3 max-h-[var(--visual-viewport-height,100dvh)] rounded-t-[34px] sm:rounded-[32px] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 overflow-hidden"
      >
        
        {/* Mobile Liquid Glass Pull Handle */}
        <div className="w-11 h-1.5 bg-slate-400/45 dark:bg-white/25 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Unified Optical Smoked-Emerald Liquid Glass Header */}
        <div
          onMouseEnter={(e) => { glassRectCacheRef.current.set(e.currentTarget, e.currentTarget.getBoundingClientRect()); }}
          onMouseMove={handleGlassPointerMove}
          onMouseLeave={(e) => { glassRectCacheRef.current.delete(e.currentTarget); }}
          className="liquid-chat-header liquid-sheen px-4 sm:px-5 py-3.5 text-white flex items-center justify-between gap-2 shrink-0 overflow-hidden"
        >
          {/* Delicate Topographic Contour SVG Overlay for Editorial Depth */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-8 w-52 h-36 text-emerald-200/[0.11]"
            viewBox="0 0 220 140"
            fill="none"
          >
            <path d="M10 120 C60 80, 110 105, 165 55 S 205 25, 218 10" stroke="currentColor" strokeWidth="1.4" />
            <path d="M35 132 C85 92, 130 116, 182 68 S 212 38, 224 22" stroke="currentColor" strokeWidth="1.2" />
            <path d="M0 95 C55 55, 105 78, 155 32" stroke="currentColor" strokeWidth="1" />
          </svg>

          {/* Subtle Ambient Radial Glow Behind Avatar */}
          <div 
            className="pointer-events-none absolute -left-6 -top-6 w-36 h-36 rounded-full blur-2xl opacity-45 transition-all duration-700"
            style={{ backgroundColor: ARGON_STATE_THEME[argonHeaderState].ledHex }}
          />

          <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
            {/* Living 3D Avatar (100% Unboxed & Borderless, lazy-loaded so Three.js doesn't delay drawer open) */}
            <div className="relative flex items-center justify-center shrink-0">
              <Suspense
                fallback={
                  <ArgonAvatar
                    state={argonHeaderState}
                    size="sm"
                    className="w-12 h-12 sm:w-13 sm:h-13"
                  />
                }
              >
                <ConCode3DAvatar
                  emotion={argonHeaderState}
                  isSpeaking={Boolean(audioTour.isPlaying || argonHeaderState === 'speaking')}
                  size="sm"
                  className="w-12 h-12 sm:w-13 sm:h-13 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-105"
                />
              </Suspense>
              <span
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0E2818] transition-colors duration-300 pointer-events-none"
                style={{
                  backgroundColor: ARGON_STATE_THEME[argonHeaderState].ledHex,
                  boxShadow: `0 0 10px ${ARGON_STATE_THEME[argonHeaderState].ledGlowRgba}`
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>ConCode AI</span>
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Co-Pilot
                </span>
                {quota.isFounder ? (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="min-h-0 text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400/30 to-yellow-400/30 hover:from-amber-400/40 hover:to-yellow-400/40 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-300/40 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title={t('TripVerse VIP Founder Active • Lifetime Unlimited Trips & Full ConCode Brain')}
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-300" />
                    <span>VIP Founder • 30h Pro</span>
                  </button>
                ) : quota.isPro ? (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="min-h-0 text-[9px] font-black uppercase tracking-wider bg-amber-400/25 hover:bg-amber-400/35 text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title={t('TripVerse Pro Active (30 Hours/Week Full ConCode Facility)')}
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-300" />
                    <span>{quota.weeklyQuotaHoursFormatted} / 30h Pro</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="min-h-0 text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 cursor-pointer transition-colors flex items-center gap-1"
                    title={t('Free Explorer Tier • Upgrade to Pro for 30h/week Facility')}
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>{quota.weeklyAssistantMinutesRemaining}m Free</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-emerald-100/80 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                <span>{ARGON_STATE_THEME[argonHeaderState].badgeLabel}</span>
                <span className="opacity-40">•</span>
                <span className="text-emerald-300 font-semibold truncate">
                  {brainStatus.latencyMs ? `${brainStatus.latencyMs}ms live` : 'Real-time Intelligence'}
                </span>
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleClearChat}
              className="min-h-0 p-2 rounded-xl liquid-chat-icon-btn text-emerald-100/85 hover:text-rose-200 cursor-pointer active:scale-95"
              title={t('Clear Conversation History')}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={refreshBrainHealth}
              disabled={isCheckingBrain}
              className="min-h-0 p-2 rounded-xl liquid-chat-icon-btn text-emerald-100/85 hover:text-white cursor-pointer active:scale-95"
              title={t('Refresh AI Status')}
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingBrain ? 'animate-spin text-emerald-300' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="min-h-0 p-2 rounded-xl liquid-chat-icon-btn text-emerald-100/85 hover:text-white cursor-pointer active:scale-95"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Live Audio Tour HUD Bar */}
        {audioTour.isPlaying && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 border-b border-emerald-500/30 flex items-center justify-between text-white animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <Headphones className="w-4 h-4 text-emerald-300 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span className="text-xs font-bold text-emerald-200 truncate block">
                    Audio Tour: {audioTour.currentLandmark}
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 block font-mono">
                  {audioTour.isPaused ? 'Paused' : 'Playing Narration via ConCode'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  if (audioTour.isPaused) {
                    resumeAudioTour();
                  } else {
                    pauseAudioTour();
                  }
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title={audioTour.isPaused ? 'Resume Audio' : 'Pause Audio'}
              >
                {audioTour.isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  stopAudioTour();
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-rose-300 hover:text-white cursor-pointer transition-colors"
                title="Stop Audio Tour"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Scenario Chips Carousel — Liquid Glass Pills */}
        <div
          className="liquid-chat-chip-bar px-3.5 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 pr-8"
          style={{
            maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)',
          }}
        >
          {scenarioChips.map(chip => (
            <button
              key={chip.label}
              type="button"
              disabled={isProcessing}
              onClick={() => handleSendMessage(chip.prompt)}
              className="min-h-0 liquid-chat-chip text-[11px] px-3 py-1.5 rounded-full text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95 disabled:opacity-45 disabled:pointer-events-none"
            >
              {chip.icon && <chip.icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Message Stream — Organic Liquid Caustic Mesh */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 liquid-chat-stream">
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            const parsed = isAi
              ? parseConCodeStreamResponse(msg.text)
              : { state: 'idle' as ArgonState, cleanText: msg.text };
            const guildInfo = msg.guild ? GUILD_LABELS[msg.guild] : null;
            const currentSelectedDay = activeItineraryDay[msg.id] || 1;

            return (
              <div
                key={msg.id}
                data-msg-id={msg.id}
                className={`flex items-start gap-2.5 sm:gap-3 ${isAi ? '' : 'flex-row-reverse'}`}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center flex-shrink-0 pt-0.5">
                  {isAi ? (
                    <div className="relative">
                      <ArgonAvatar
                        state={parsed.state}
                        size="sm"
                        className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className={isAi ? 'max-w-[92%] sm:max-w-[85%] min-w-0 flex-1 space-y-2' : 'max-w-[85%] sm:max-w-[78%] min-w-0 flex flex-col items-end space-y-1.5'}>
                  {/* AI Metadata Pill */}
                  {isAi && (
                    <div className="flex items-center justify-between gap-1.5 text-[11px] px-1">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/90 dark:border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1.5 shrink-0 text-[10px] tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{msg.engine === 'offline' ? 'OFFLINE GUIDANCE' : 'CONCODE AI'}</span>
                          {msg.engine !== 'offline' && guildInfo && <span>• {guildInfo.label}</span>}
                        </span>
                        {msg.confidence && (
                          <span className="text-slate-400 dark:text-slate-500 font-medium text-[10px]">
                            {Math.round(msg.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyMessage(msg.id, parsed.cleanText)}
                        className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-1 shrink-0 cursor-pointer rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
                        title="Copy message"
                      >
                        {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Modification Pill Badge (if present) */}
                  {msg.modificationBadge && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-2xs animate-in fade-in flex-wrap">
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{msg.modificationBadge.label}</span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-normal">({msg.modificationBadge.detail})</span>
                    </div>
                  )}

                  {/* Attached Image Thumbnail */}
                  {msg.imageUrl && (
                    <div className="mb-2 max-w-xs rounded-2xl overflow-hidden border border-emerald-500/30 shadow-md">
                      <img src={msg.imageUrl} alt="Uploaded attachment" loading="lazy" decoding="async" className="w-full max-h-48 object-cover" />
                    </div>
                  )}

                  {/* Optical Liquid Glass Message Bubble */}
                  <div className={`p-3.5 sm:p-4 text-xs sm:text-[13px] leading-relaxed overflow-hidden break-words liquid-rim ${
                    isAi
                      ? 'w-full liquid-chat-bubble-ai text-slate-800 dark:text-slate-100 rounded-[22px] rounded-tl-[6px]'
                      : 'w-fit ml-auto liquid-chat-bubble-user text-white font-medium rounded-[22px] rounded-tr-[6px]'
                  }`}>
                    {isAi ? (
                      <FormattedAIMessage text={parsed.cleanText} />
                    ) : (
                      <div className="whitespace-pre-line break-words leading-relaxed">{msg.text}</div>
                    )}
                  </div>

                  {/* Interactive Structured Itinerary Card */}
                  {msg.structuredItinerary && Array.isArray(msg.structuredItinerary.days) && msg.structuredItinerary.days.length > 0 && (
                    <div className="liquid-chat-card liquid-rim rounded-[22px] p-3.5 space-y-3 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2.5 gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#0B2545] dark:text-slate-100 min-w-0">
                          <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="truncate">
                            {msg.structuredItinerary.destination || trip.destination || 'Destination'} — {msg.structuredItinerary.durationDays || msg.structuredItinerary.days?.length || trip.durationDays} Days
                          </span>
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shrink-0">
                          {formatCurrency(Number(String(msg.structuredItinerary.totalCost ?? (msg.structuredItinerary as any).total_cost ?? 0).replace(/[^0-9.-]+/g, '') || 0))} Budget
                        </span>
                      </div>

                      {/* Day Selector Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {msg.structuredItinerary.days.map((d, dIdx) => {
                          const dNum = d.dayNumber ?? (d as any).day_number ?? (d as any).day ?? (dIdx + 1);
                          return (
                            <button
                              key={dNum}
                              type="button"
                              onClick={() => setActiveItineraryDay(prev => ({ ...prev, [msg.id]: dNum }))}
                              className={`min-h-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                                currentSelectedDay === dNum
                                  ? 'bg-[#2D5A3D] dark:bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              Day {dNum}
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Day Detail */}
                      {(() => {
                        const days = msg.structuredItinerary.days;
                        if (!Array.isArray(days) || days.length === 0) return null;
                        const selectedDay = days.find((d, idx) => (d.dayNumber ?? (d as any).day_number ?? (d as any).day ?? (idx + 1)) === currentSelectedDay) || days[0];
                        if (!selectedDay) return null;

                        const dayCost = Number(String(selectedDay.cost ?? (selectedDay as any).estimatedCost ?? (selectedDay as any).estimated_cost ?? 0).replace(/[^0-9.-]+/g, '')) || 0;
                        const morningText = selectedDay.morning || (selectedDay as any).morning_activity || 'Scenic local sightseeing';
                        const afternoonText = selectedDay.afternoon || (selectedDay as any).afternoon_activity || 'Afternoon experience & attractions';
                        const eveningText = selectedDay.evening || (selectedDay as any).evening_activity || 'Sunset views & local exploration';
                        const diningText = selectedDay.food || (selectedDay as any).dining || (selectedDay as any).meals || 'Authentic dining';

                        return (
                          <div className="bg-slate-50 dark:bg-slate-900/75 rounded-xl p-3 border border-slate-200/60 dark:border-slate-700/70 space-y-2 text-[11px]">
                            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100 gap-2">
                              <span className="truncate">{selectedDay.title || `Day ${currentSelectedDay} Experience`}</span>
                              <span className="text-emerald-700 dark:text-emerald-300 font-extrabold shrink-0">{formatCurrency(dayCost)}</span>
                            </div>

                            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
                              <div className="flex items-start gap-1.5">
                                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="break-words min-w-0"><strong className="text-slate-700 dark:text-slate-100">Morning:</strong> {morningText}</div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <div className="break-words min-w-0"><strong className="text-slate-700 dark:text-slate-100">Afternoon:</strong> {afternoonText}</div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <Sunset className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                                <div className="break-words min-w-0"><strong className="text-slate-700 dark:text-slate-100">Evening:</strong> {eveningText}</div>
                              </div>
                              <div className="flex items-start gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/70 text-emerald-800 dark:text-emerald-300">
                                <Utensils className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                <div className="break-words min-w-0"><strong>Dining:</strong> {diningText}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Interactive Budget Breakdown Card */}
                  {msg.budgetBreakdown && (() => {
                    const total = Number(String(msg.budgetBreakdown.total || 0).replace(/[^0-9.-]+/g, '')) || 1;
                    const transport = Number(String(msg.budgetBreakdown.transport || 0).replace(/[^0-9.-]+/g, '')) || 0;
                    const stays = Number(String(msg.budgetBreakdown.stays || 0).replace(/[^0-9.-]+/g, '')) || 0;
                    const food = Number(String(msg.budgetBreakdown.food || 0).replace(/[^0-9.-]+/g, '')) || 0;
                    const activities = Number(String(msg.budgetBreakdown.activities || 0).replace(/[^0-9.-]+/g, '')) || 0;
                    const buffer = Number(String(msg.budgetBreakdown.buffer || 0).replace(/[^0-9.-]+/g, '')) || 0;

                    return (
                      <div className="liquid-chat-card liquid-rim rounded-[22px] p-3.5 space-y-3 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2">
                          <span className="text-xs font-bold text-[#0B2545] dark:text-slate-100 flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Budget Allocation</span>
                          </span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                            {formatCurrency(total)}
                          </span>
                        </div>

                        {/* Stacked Progress Bar */}
                        <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex shadow-inner">
                          <div style={{ width: `${Math.min(100, (transport / total) * 100)}%` }} className="bg-sky-500" title="Flights & Transit" />
                          <div style={{ width: `${Math.min(100, (stays / total) * 100)}%` }} className="bg-indigo-500" title="Hotels & Stays" />
                          <div style={{ width: `${Math.min(100, (food / total) * 100)}%` }} className="bg-emerald-500" title="Food & Dining" />
                          <div style={{ width: `${Math.min(100, (activities / total) * 100)}%` }} className="bg-amber-500" title="Activities" />
                          <div style={{ width: `${Math.min(100, (buffer / total) * 100)}%` }} className="bg-purple-400" title="Buffer" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 border border-sky-100 dark:border-sky-800/50 min-w-0">
                            <span className="block text-[10px] text-sky-600 dark:text-sky-300 font-semibold truncate">Transit</span>
                            <span className="font-bold truncate block">{formatCurrency(transport)}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-800/50 min-w-0">
                            <span className="block text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold truncate">Stays</span>
                            <span className="font-bold truncate block">{formatCurrency(stays)}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-800/50 min-w-0">
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-300 font-semibold truncate">Dining</span>
                            <span className="font-bold truncate block">{formatCurrency(food)}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-100 dark:border-amber-800/50 min-w-0">
                            <span className="block text-[10px] text-amber-600 dark:text-amber-300 font-semibold truncate">Tickets</span>
                            <span className="font-bold truncate block">{formatCurrency(activities)}</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 dark:text-slate-400 italic">
                          * Realistic estimates based on seasonal averages. Excludes personal shopping.
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action Buttons if provided by AI - Intelligent Hero + 2-Column Grid */}
                  {msg.actionButtons && msg.actionButtons.length > 0 && (() => {
                    const primaryBtn = msg.actionButtons.find((b) => b.primary);
                    const secondaryBtns = msg.actionButtons.filter((b) => !b.primary);
                    return (
                      <div className="pt-2.5 space-y-2">
                        {primaryBtn && (
                          <button
                            key={`${primaryBtn.action}-primary`}
                            type="button"
                            disabled={isProcessing}
                            onMouseMove={handleGlassPointerMove}
                            onClick={() => handleActionButton(primaryBtn.action, primaryBtn.payload)}
                            className="w-full px-4 py-3 rounded-[20px] text-xs font-bold text-left transition-all duration-200 cursor-pointer active:scale-98 flex items-center justify-between group gap-2.5 liquid-chat-bubble-user liquid-rim liquid-sheen text-white disabled:opacity-50 disabled:pointer-events-none"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center shrink-0">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse shrink-0" />
                              </div>
                              <span className="break-words min-w-0 font-bold">{primaryBtn.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/12 border border-white/20 text-[10px] text-emerald-100 font-bold shrink-0 uppercase tracking-wider group-hover:bg-white/22 transition-all">
                              <span>Action</span>
                              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                            </div>
                          </button>
                        )}
                        {secondaryBtns.length > 0 && (
                          <div className={`grid ${secondaryBtns.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-2`}>
                            {secondaryBtns.map((btn, btnIdx) => (
                              <button
                                key={`${btn.action}-${btnIdx}`}
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleActionButton(btn.action, btn.payload)}
                                className="px-3.5 py-2.5 rounded-2xl text-[11px] font-semibold text-left cursor-pointer active:scale-98 flex items-center justify-between group gap-2 liquid-chat-chip text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:pointer-events-none"
                              >
                                <span className="truncate">{btn.label}</span>
                                <ArrowRight className="w-3 h-3 text-emerald-600/70 dark:text-emerald-400/70 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <span className="text-[10px] text-slate-400 block px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-3 animate-in fade-in duration-200 py-1">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-[#163D25] to-[#2D6E4B] text-white flex items-center justify-center shadow-md shadow-emerald-950/20 shrink-0 border border-emerald-400/30">
                <Sparkles className="w-4 h-4 text-emerald-300 animate-spin" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-900 animate-ping" />
              </div>
              <div className="px-4 py-3 liquid-chat-bubble-ai liquid-rim rounded-[20px] rounded-tl-[6px] text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center gap-2.5 flex-wrap">
                <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" />
                <span>ConCode AI reasoning travel schedule & budget...</span>
                <span className="flex gap-1 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                </span>
                <button
                  type="button"
                  onClick={handleStopGenerating}
                  className="min-h-0 ml-auto px-2.5 py-1 rounded-full bg-rose-500/10 dark:bg-rose-500/20 border border-rose-300/60 dark:border-rose-500/40 text-rose-700 dark:text-rose-200 text-[10px] font-bold hover:bg-rose-500/20 cursor-pointer transition-colors"
                >
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar - Floating Optical Liquid Glass Capsule Dock */}
        <div className="liquid-chat-dock p-3 sm:p-4 pb-safe shrink-0">
          {/* Inline Liquid Glass Notice Banner (replaces raw alert() & surfaces photo/clipboard/voice feedback) */}
          {chatNotice && (
            <div
              role="status"
              className="mb-2 px-3 py-2 rounded-xl bg-amber-50/95 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 animate-in fade-in"
            >
              <span className="leading-snug">{chatNotice}</span>
              <button
                type="button"
                onClick={() => setChatNotice(null)}
                aria-label="Dismiss notice"
                className="min-h-0 px-1 text-amber-700 dark:text-amber-300 hover:text-amber-950 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
          )}
          {/* Uploaded Image Preview Chip */}
          {uploadedImage && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <img src={uploadedImage} alt="Preview" decoding="async" className="w-8 h-8 rounded-lg object-cover border border-emerald-400" />
                <span className="text-emerald-800 dark:text-emerald-200 font-semibold text-[11px]">
                  📸 Photo attached — ConCode ready to scan
                </span>
              </div>
              <button
                type="button"
                onClick={() => setUploadedImage(null)}
                className="p-1 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {isListening && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between animate-pulse">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Listening... Speak your travel question
              </span>
              <button
                type="button"
                onClick={toggleListening}
                className="text-[10px] underline hover:text-rose-900 cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
          <div
            onMouseMove={handleGlassPointerMove}
            className="liquid-chat-composer liquid-rim liquid-sheen flex items-end gap-1.5 rounded-[24px] px-3.5 py-2"
          >
            <Compass className="w-4 h-4 text-emerald-600/70 dark:text-emerald-400/70 shrink-0 hidden sm:block mb-2.5" />
            <textarea
              ref={textareaRef}
              rows={1}
              aria-label={t('Ask ConCode AI')}
              placeholder={isListening ? t('Listening to your voice...') : t('Ask anything (e.g. Plan a 5-day trip to Dubai)...')}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 py-2 bg-transparent border-0 text-base sm:text-sm focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium resize-none max-h-28 overflow-y-auto leading-snug"
            />
            {/* Hidden File Input for Camera/Photo Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {/* Visual Scanner / Camera Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`min-h-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                uploadedImage
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40'
              }`}
              title={t('Visual Scanner: Upload landmark photo, ticket, or menu')}
              aria-label={t('Upload Image')}
            >
              <Camera className="w-4 h-4" />
            </button>
            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`min-h-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30 ring-2 ring-rose-400'
                  : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40'
              }`}
              title={isListening ? t('Stop Listening') : t('Voice Input (Dictate prompt)')}
              aria-label={isListening ? t('Stop Listening') : t('Voice Input')}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={(!inputQuery.trim() && !uploadedImage) || isProcessing}
              className="min-h-0 w-10 h-10 rounded-full liquid-chat-bubble-user liquid-rim text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
              aria-label={t('Send Message')}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1 pt-1.5 select-none font-medium">
            <span>Enter ↵ to send • {supportsVoice ? 'Voice ready' : 'Text & Photo AI'}</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 inline-block" />
              ConCode AI
            </span>
          </div>
        </div>

        {/* Interactive 3D WebGL Landmark Viewer */}
        {is3DViewerOpen && (
          <Suspense fallback={null}>
            <Landmark3DViewer
              landmarkName={viewer3DLandmark}
              destination={cleanTripDest}
              isOpen={is3DViewerOpen}
              onClose={() => setIs3DViewerOpen(false)}
            />
          </Suspense>
        )}

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerMarkup, document.body) : drawerMarkup;
};
