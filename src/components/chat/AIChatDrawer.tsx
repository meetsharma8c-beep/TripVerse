import React, { useState, useRef, useEffect, useCallback, Suspense, lazy } from 'react';
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
import { inferArgonStateFromText, parseConCodeStreamResponse, ArgonState, ARGON_STATE_THEME } from '../argon/argon.types';
const Landmark3DViewer = lazy(() => import('../common/Landmark3DViewer').then(m => ({ default: m.Landmark3DViewer })));
import { X, Send, Sparkles, Bot, User, Check, RefreshCw, Activity, Coins, Utensils, Copy, Trash2, Calendar, Clock, Sun, Sunset, ArrowRight, TrendingDown, Crown, Shield, Users, Compass, Mic, MicOff, FileText, Plane, Camera } from 'lucide-react';
import { scanTravelImage, VisualScanResult } from '../../services/visualAiScannerService';
import { triggerHaptic } from '../../services/deviceService';
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

function getChatStorageKey(): string {
  const user = getCurrentUser();
  return user?.uid ? `tripverse_chat_u_${user.uid}` : 'tripverse_chat_guest';
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
        <strong key={`${match.index}-b`} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`${match.index}-c`} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-emerald-800 font-semibold">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`${match.index}-i`} className="italic text-slate-800">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[') && token.includes('](') && token.endsWith(')')) {
      const linkText = token.slice(1, token.indexOf(']('));
      const linkHref = token.slice(token.indexOf('](') + 2, -1);
      parts.push(
        <a
          key={`${match.index}-a`}
          href={linkHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 underline font-semibold hover:text-emerald-700"
        >
          {linkText}
        </a>
      );
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
        <div key={key} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-[11px] border-collapse min-w-[280px]">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200">
                {tableHeaderCells.map((th, thIdx) => (
                  <th key={thIdx} className="px-3 py-1.5 font-bold text-slate-800">
                    {parseInlineTokens(th.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 text-slate-700">
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
        <h4 key={`h3-${i}`} className="font-bold text-slate-900 text-xs sm:text-sm mt-2 mb-0.5 flex items-center gap-1.5">
          {parseInlineTokens(trimmed.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${i}`} className="font-black text-slate-900 text-sm mt-2 mb-0.5">
          {parseInlineTokens(trimmed.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={`h1-${i}`} className="font-black text-slate-900 text-base mt-2.5 mb-1">
          {parseInlineTokens(trimmed.slice(2))}
        </h2>
      );
      continue;
    }

    // Bullet point checks
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      const content = trimmed.replace(/^[*\-•]\s+/, '');
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-1.5 text-slate-700 py-0.5">
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
        <div key={`num-${i}`} className="flex items-start gap-1.5 text-slate-700 py-0.5">
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 mt-0.5 shrink-0">
            {numMatch[1]}
          </span>
          <span className="flex-1 min-w-0 break-words">{parseInlineTokens(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-slate-700 leading-relaxed break-words">
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setUploadedImage(reader.result);
          triggerHaptic('light');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Active day tab state for structured itinerary cards
  const [activeItineraryDay, setActiveItineraryDay] = useState<Record<string, number>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const cleanTripDest = (trip?.destination && trip.destination !== 'Custom Spot' ? trip.destination : (trip?.name || 'your destination')).split(',')[0].trim();

  const getInitialMessages = (): ChatMessage[] => {
    try {
      const storage = getChatStorage();
      if (storage) {
        const key = getChatStorageKey();
        const saved = storage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}

    return [
      {
        id: 'welcome-1',
        sender: 'ai',
        text: `[STATE:idle] Hi there! I'm your ConCode travel companion. Whether you have a destination in mind or just a weekend and a rough budget, I'd love to help you map it out. Where shall we begin?`,
        timestamp: 'Just now',
        engine: 'concode_brain',
        guild: 'fullstack',
        confidence: 0.99,
        actionButtons: [
          { label: 'Plan a 5-day trip to Dubai', action: 'PLAN_DUBAI', primary: true },
          { label: 'What will this trip approximately cost?', action: 'CHECK_BUDGET' },
          { label: 'Make Day 3 cheaper', action: 'MAKE_CHEAPER' },
          { label: 'Rainy-day alternative', action: 'RAINY_DAY_ALT' },
          { label: 'Get Directions', action: 'START_NAV' }
        ]
      }
    ];
  };

  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [quota, setQuota] = useState(() => getUserSubscriptionQuota());
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useModalBehavior(isOpen, onClose);

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
      alert(t('Voice dictation is supported in Chrome, Safari, and Chromium-based browsers.'));
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
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

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
          setInputQuery(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[VoiceInput] Speech recognition notice:', event.error);
        setIsListening(false);
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

  // Reload messages when switching accounts or signing in/out
  useEffect(() => {
    const handleAuthChange = () => {
      setMessages(getInitialMessages());
    };
    window.addEventListener('tripverse_auth_state_change', handleAuthChange);
    return () => window.removeEventListener('tripverse_auth_state_change', handleAuthChange);
  }, []);

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

  // Save messages to user-scoped storage tier
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const storage = getChatStorage();
        if (storage) {
          storage.setItem(getChatStorageKey(), JSON.stringify(messages.slice(-20)));
        }
      } catch {}
    }
  }, [messages]);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleClearChat = () => {
    resetBrainSession();
    resetConcodeSession();
    const storage = getChatStorage();
    if (storage) {
      storage.removeItem(getChatStorageKey());
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

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    triggerHaptic('light');
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    const currentImage = uploadedImage;
    if ((!query.trim() && !currentImage) || isProcessing) return;

    if (!quota.isPro && quota.weeklyAssistantMinutesRemaining <= 0) {
      if (onOpenProModal) onOpenProModal();
      return;
    }

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
    consumeAssistantMinute(1);

    try {
      if (currentImage) {
        // Run multimodal visual AI scan
        const scanResult = await scanTravelImage(currentImage, query);
        let summaryText = '';
        if (scanResult.type === 'landmark') {
          summaryText = `📸 **Visual Landmark Identification: ${scanResult.name}**\n\n📍 **Location:** ${scanResult.city}, ${scanResult.country}\n🏛️ **Architecture:** ${scanResult.architecturalStyle}\n⏱️ **Recommended Duration:** ${scanResult.suggestedDuration}\n🎟️ **Entry Fee:** ${scanResult.entryFee}\n☀️ **Best Time to Visit:** ${scanResult.bestTimeToVisit}\n\n${scanResult.description}`;
        } else if (scanResult.type === 'ticket') {
          summaryText = `🎫 **Boarding Pass & Booking Verified**\n\n✈️ **Carrier:** ${scanResult.carrier}\n🏷️ **Booking Ref / PNR:** ${scanResult.bookingRef}\n🛫 **Route:** ${scanResult.origin} ➔ ${scanResult.destination}\n⏰ **Departure:** ${scanResult.departureTime}\n💺 **Seat / Room:** ${scanResult.seatOrRoom}`;
        } else {
          summaryText = `🍽️ **Culinary Identification: ${scanResult.dishName}**\n\n🍜 **Cuisine:** ${scanResult.cuisine} (${scanResult.region})\n😋 **Flavor Profile:** ${scanResult.flavorProfile}\n🏷️ **Dietary:** ${scanResult.dietaryTags.join(', ')}\n💰 **Average Price:** ${scanResult.averagePrice}\n\n${scanResult.description}`;
        }

        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: summaryText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          engine: 'concode_brain',
          confidence: 0.98,
          visualScanResult: scanResult,
          actionButtons: scanResult.type === 'landmark' ? [
            {
              label: `➕ Add ${scanResult.name} to Day 1`,
              action: 'add_activity',
              payload: { day: 1, title: scanResult.name, description: scanResult.description, cost: 0 },
              primary: true
            },
            {
              label: `🌐 View 3D Landmark`,
              action: 'view_3d',
              payload: { landmark: scanResult.name }
            }
          ] : undefined
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        const response = await processTravelCoPilotQuery(query, trip);

        setMessages(prev => [...prev, response.message]);

        if (response.updatedTrip) {
          onUpdateTrip(response.updatedTrip);
        }
        if (response.appAction && onAppAction) {
          onAppAction(response.appAction);
        }
      }
    } catch (e) {
      console.error('Error processing query:', e);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: 'ConCode AI encountered a temporary issue. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          engine: 'concode_brain'
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleActionButton = (action: string, payload?: any) => {
    const switchToTripSection = (subTab: string) => {
      if (onAppAction) {
        onAppAction({ type: 'SWITCH_TAB', payload: { tab: 'trips', subTab } });
      }
      onClose();
    };

    if (action === 'PLAN_DUBAI') {
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
      window.open(flightUrl, '_blank', 'noopener,noreferrer');
    } else if (action === 'TRANSPORT_DEALS' || action === 'VIEW_DEALS') {
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

  if (!isOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="AI Travel Assistant"
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end items-end sm:items-stretch"
    >
      
      <div className="w-full sm:max-w-md md:max-w-lg bg-white dark:bg-slate-900 h-[92dvh] sm:h-full max-h-[100dvh] rounded-t-3xl sm:rounded-none sm:rounded-l-3xl shadow-[0_-10px_40px_rgba(16,185,129,0.12)] sm:shadow-[-12px_0_40px_rgba(16,185,129,0.16)] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 overflow-hidden border-t sm:border-t-0 sm:border-l border-emerald-500/20 dark:border-emerald-500/25">
        
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300/80 dark:bg-slate-700 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Unified Luxury ConCode AI Header */}
        <div className="relative px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#0C2415] via-[#163D25] to-[#0E2818] text-white flex items-center justify-between border-b border-emerald-500/20 shadow-[0_4px_24px_rgba(16,185,129,0.18)] shrink-0 overflow-hidden">
          {/* Subtle Ambient Radial Glow Behind Avatar */}
          <div 
            className="pointer-events-none absolute -left-6 -top-6 w-32 h-32 rounded-full blur-2xl opacity-40 transition-all duration-700"
            style={{ backgroundColor: ARGON_STATE_THEME[argonHeaderState].ledHex }}
          />

          <div className="relative z-10 flex items-center gap-3">
            {/* Living 3D Avatar (100% Unboxed & Borderless) */}
            <div className="relative flex items-center justify-center shrink-0">
              <ArgonAvatar
                state={argonHeaderState}
                size="sm"
                className="w-12 h-12 sm:w-13 sm:h-13 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-105"
              />
              <span
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0E2818] transition-colors duration-300 pointer-events-none"
                style={{
                  backgroundColor: ARGON_STATE_THEME[argonHeaderState].ledHex,
                  boxShadow: `0 0 10px ${ARGON_STATE_THEME[argonHeaderState].ledGlowRgba}`
                }}
              />
            </div>

            <div>
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
                    className="text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400/30 to-yellow-400/30 hover:from-amber-400/40 hover:to-yellow-400/40 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-300/40 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title={t('TripVerse VIP Founder Active • Lifetime Unlimited Trips & Full ConCode Brain')}
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-300" />
                    <span>VIP Founder • 30h Pro</span>
                  </button>
                ) : quota.isPro ? (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="text-[9px] font-black uppercase tracking-wider bg-amber-400/25 hover:bg-amber-400/35 text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    title={t('TripVerse Pro Active (30 Hours/Week Full ConCode Facility)')}
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-300" />
                    <span>{quota.weeklyQuotaHoursFormatted} / 30h Pro</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30 cursor-pointer transition-colors flex items-center gap-1"
                    title={t('Free Explorer Tier • Upgrade to Pro for 30h/week Facility')}
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>{quota.weeklyAssistantMinutesRemaining}m Free</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-emerald-100/80 font-medium flex items-center gap-1.5 mt-0.5">
                <span>{ARGON_STATE_THEME[argonHeaderState].badgeLabel}</span>
                <span className="opacity-40">•</span>
                <span className="text-emerald-300 font-semibold">
                  {brainStatus.latencyMs ? `${brainStatus.latencyMs}ms live` : 'Real-time Intelligence'}
                </span>
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-2 rounded-xl text-emerald-100/70 hover:text-red-300 hover:bg-white/10 transition-colors cursor-pointer"
              title={t('Clear Conversation History')}
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={refreshBrainHealth}
              disabled={isCheckingBrain}
              className="p-2 rounded-xl text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={t('Refresh AI Status')}
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingBrain ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-emerald-100/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Scenario Chips Carousel */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-[#F4F7F3] via-white to-[#F4F7F3] dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 border-b border-emerald-950/5 dark:border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 shadow-2xs">
          {scenarioChips.map(chip => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSendMessage(chip.prompt)}
              className="text-[11px] px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-emerald-500/15 dark:border-emerald-500/20 text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap hover:border-emerald-500/50 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:shadow-[0_2px_12px_rgba(16,185,129,0.14)] transition-all flex items-center gap-1.5 flex-shrink-0 shadow-2xs cursor-pointer active:scale-95"
            >
              {chip.icon && <chip.icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-gradient-to-b from-[#F7FAF5] via-[#F3F6F1] to-[#ECF2EB] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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

                <div className="max-w-[92%] sm:max-w-[85%] min-w-0 flex-1 space-y-2">
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
                      <img src={msg.imageUrl} alt="Uploaded attachment" className="w-full max-h-48 object-cover" />
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`p-4 sm:p-4.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed overflow-hidden break-words ${
                    isAi
                      ? 'bg-white/95 dark:bg-slate-800/95 backdrop-blur-md text-slate-800 dark:text-slate-100 rounded-tl-xs border border-emerald-500/15 dark:border-emerald-500/20 shadow-[0_6px_28px_rgba(16,185,129,0.08)]'
                      : 'bg-gradient-to-br from-[#1E4D34] via-[#245D3F] to-[#2D6E4B] text-white font-medium rounded-tr-xs shadow-md shadow-emerald-950/20'
                  }`}>
                    {isAi ? (
                      <FormattedAIMessage text={parsed.cleanText} />
                    ) : (
                      <div className="whitespace-pre-line break-words leading-relaxed">{msg.text}</div>
                    )}
                  </div>

                  {/* Interactive Structured Itinerary Card */}
                  {msg.structuredItinerary && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-3.5 space-y-3 overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#0B2545] min-w-0">
                          <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="truncate">
                            {msg.structuredItinerary.destination || trip.destination || 'Destination'} — {msg.structuredItinerary.durationDays || msg.structuredItinerary.days?.length || trip.durationDays} Days
                          </span>
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
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
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                                currentSelectedDay === dNum
                                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-2 text-[11px]">
                            <div className="flex items-center justify-between font-bold text-slate-800 gap-2">
                              <span className="truncate">{selectedDay.title || `Day ${currentSelectedDay} Experience`}</span>
                              <span className="text-emerald-700 font-extrabold shrink-0">₹{dayCost.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="space-y-1.5 text-slate-600">
                              <div className="flex items-start gap-1.5">
                                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="break-words min-w-0"><strong className="text-slate-700">Morning:</strong> {morningText}</div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <div className="break-words min-w-0"><strong className="text-slate-700">Afternoon:</strong> {afternoonText}</div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <Sunset className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                                <div className="break-words min-w-0"><strong className="text-slate-700">Evening:</strong> {eveningText}</div>
                              </div>
                              <div className="flex items-start gap-1.5 pt-1 border-t border-slate-200/60 text-emerald-800">
                                <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
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
                      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-3.5 space-y-3 overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>Budget Allocation</span>
                          </span>
                          <span className="text-xs font-black text-emerald-700">
                            ₹{total.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Stacked Progress Bar */}
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                          <div style={{ width: `${Math.min(100, (transport / total) * 100)}%` }} className="bg-sky-500" title="Flights & Transit" />
                          <div style={{ width: `${Math.min(100, (stays / total) * 100)}%` }} className="bg-indigo-500" title="Hotels & Stays" />
                          <div style={{ width: `${Math.min(100, (food / total) * 100)}%` }} className="bg-emerald-500" title="Food & Dining" />
                          <div style={{ width: `${Math.min(100, (activities / total) * 100)}%` }} className="bg-amber-500" title="Activities" />
                          <div style={{ width: `${Math.min(100, (buffer / total) * 100)}%` }} className="bg-purple-400" title="Buffer" />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-lg bg-sky-50 text-sky-900 border border-sky-100 min-w-0">
                            <span className="block text-[10px] text-sky-600 font-semibold truncate">Transit</span>
                            <span className="font-bold truncate block">₹{transport.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-100 min-w-0">
                            <span className="block text-[10px] text-indigo-600 font-semibold truncate">Stays</span>
                            <span className="font-bold truncate block">₹{stays.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100 min-w-0">
                            <span className="block text-[10px] text-emerald-600 font-semibold truncate">Dining</span>
                            <span className="font-bold truncate block">₹{food.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-100 min-w-0">
                            <span className="block text-[10px] text-amber-600 font-semibold truncate">Tickets</span>
                            <span className="font-bold truncate block">₹{activities.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 italic">
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
                            key={primaryBtn.label}
                            onClick={() => handleActionButton(primaryBtn.action, primaryBtn.payload)}
                            className="w-full px-4 py-3 rounded-2xl text-xs font-bold text-left transition-all duration-200 shadow-[0_8px_25px_rgba(16,185,129,0.22)] hover:shadow-[0_10px_32px_rgba(16,185,129,0.32)] cursor-pointer active:scale-98 flex items-center justify-between group gap-2.5 bg-gradient-to-r from-[#18442D] via-[#245D3F] to-[#18442D] text-white border border-emerald-400/30 backdrop-blur-md"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center shrink-0">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse shrink-0" />
                              </div>
                              <span className="break-words min-w-0 font-bold">{primaryBtn.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] text-emerald-100 font-bold shrink-0 uppercase tracking-wider group-hover:bg-white/20 transition-all">
                              <span>Action</span>
                              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                            </div>
                          </button>
                        )}
                        {secondaryBtns.length > 0 && (
                          <div className={`grid ${secondaryBtns.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-2`}>
                            {secondaryBtns.map((btn) => (
                              <button
                                key={btn.label}
                                onClick={() => handleActionButton(btn.action, btn.payload)}
                                className="px-3.5 py-2.5 rounded-xl text-[11px] font-semibold text-left transition-all duration-200 cursor-pointer active:scale-98 flex items-center justify-between group gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-emerald-500/20 dark:border-emerald-500/25 shadow-[0_4px_16px_rgba(16,185,129,0.08)] hover:shadow-[0_6px_22px_rgba(16,185,129,0.20)] hover:border-emerald-500/50 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/50 text-slate-700 dark:text-slate-200"
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
              <div className="px-4 py-3 bg-white/95 dark:bg-slate-850/95 border border-slate-200/80 rounded-2xl rounded-tl-xs text-xs text-slate-700 dark:text-slate-200 font-semibold shadow-[0_4px_20px_rgba(20,50,30,0.06)] flex items-center gap-2.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" />
                <span>ConCode AI reasoning travel schedule & budget...</span>
                <span className="flex gap-1 ml-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar - Elevated Floating Glass Capsule with Soft Blurred Emerald Glow */}
        <div className="p-3 sm:p-4 pb-safe bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-emerald-950/10 dark:border-white/10 shrink-0">
          {/* Uploaded Image Preview Chip */}
          {uploadedImage && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <img src={uploadedImage} alt="Preview" className="w-8 h-8 rounded-lg object-cover border border-emerald-400" />
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
          <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-emerald-500/25 dark:border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.12)] focus-within:border-emerald-500/60 focus-within:shadow-[0_0_25px_rgba(16,185,129,0.25)] rounded-2xl px-3 py-1.5 transition-all">
            <Compass className="w-4 h-4 text-emerald-600/70 dark:text-emerald-400/70 shrink-0 hidden sm:block" />
            <input
              type="text"
              placeholder={isListening ? t('Listening to your voice...') : t('Ask anything (e.g. Plan a 5-day trip to Dubai)...')}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 py-1.5 bg-transparent border-0 text-base sm:text-sm focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium"
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
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
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
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
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
              onClick={() => handleSendMessage()}
              disabled={(!inputQuery.trim() && !uploadedImage) || isProcessing}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#18442D] via-[#245D3F] to-[#18442D] hover:from-[#1E5237] hover:to-[#225C3C] text-white flex items-center justify-center shadow-sm shadow-emerald-950/20 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
              aria-label={t('Send Message')}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1 pt-1.5 select-none font-medium">
            <span>Press Enter ↵ to send • Voice enabled</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 inline-block" />
              ConCode 2.0 Live
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
};
