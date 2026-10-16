import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trip, ChatMessage, StructuredItinerary, AIChatBudgetBreakdown } from '../../types/trip';
import { processTravelCoPilotQuery, AIAppAction } from '../../services/aiAssistant';
import { 
  checkBrainStatus, 
  BrainStatus, 
  GUILD_LABELS, 
  resetBrainSession 
} from '../../services/concodeBrainService';
import { resetConcodeSession } from '../../services/concodeSession';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Check, 
  RefreshCw,
  Zap,
  Activity,
  ShieldCheck,
  Fuel,
  Camera,
  Coins,
  RotateCcw,
  CloudSun,
  Utensils,
  Navigation,
  FileText,
  Briefcase,
  Copy,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Sun,
  Sunset,
  ArrowRight,
  TrendingDown,
  Settings,
  Crown
} from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';
import { ConcodeBrainConfigModal } from './ConcodeBrainConfigModal';
import { getUserSubscriptionQuota } from '../../services/authService';

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
      const content = trimmed.replace(/^[\*\-•]\s+/, '');
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
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

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
        text: `Hello! I'm your **TripVerse ConCode AI Co-Pilot**.\n\nI can draft itineraries, adjust suggested schedules and budgets, and hand your route off to an external navigation app. Place and route details should be checked with providers before you travel.\n\nWhat would you like to explore?`,
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

  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const quota = getUserSubscriptionQuota();
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const hasHandledInitialQuery = useRef(false);
  useEffect(() => {
    if (isOpen) {
      refreshBrainHealth();
      if (initialQuery && !hasHandledInitialQuery.current) {
        hasHandledInitialQuery.current = true;
        handleSendMessage(initialQuery);
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

  if (!isOpen) return null;

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
        text: `Conversation cleared. I'm ready for your next travel adventure! What would you like to plan?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        engine: 'concode_brain',
        guild: 'fullstack',
        actionButtons: [
          { label: 'Plan a 5-day trip to Dubai', action: 'PLAN_DUBAI', primary: true },
          { label: 'I have ₹1,00,000 budget', action: 'BUDGET_1LAKH' },
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
    if (!query.trim() || isProcessing) return;

    triggerHaptic('light');

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setIsProcessing(true);

    try {
      const response = await processTravelCoPilotQuery(query, trip);

      setMessages(prev => [...prev, response.message]);

      if (response.updatedTrip) {
        onUpdateTrip(response.updatedTrip);
      }
      if (response.appAction && onAppAction) {
        onAppAction(response.appAction);
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
      handleSendMessage('I have ₹1,00,000');
    } else if (action === 'BUDGET_50K') {
      handleSendMessage('I have ₹50,000');
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
    } else if (action === 'SAFETY_CHECK') {
      switchToTripSection('safety');
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
    } else if (action === 'OPEN_PRINT') {
      if (onAppAction) onAppAction({ type: 'OPEN_MODAL', payload: { modal: 'print' } });
      onClose();
    } else if (action === 'OPEN_SHARE') {
      if (onAppAction) onAppAction({ type: 'OPEN_MODAL', payload: { modal: 'share' } });
      onClose();
    } else if (action === 'OPEN_BOOKING') {
      if (onAppAction) onAppAction({ type: 'OPEN_MODAL', payload: { modal: 'booking' } });
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

  const scenarioChips = [
    { label: '5-Day Dubai', prompt: 'Plan a 5-day trip to Dubai' },
    { label: 'Budget ₹1 Lakh', prompt: 'I have ₹1,00,000' },
    { label: 'Food & Arch', prompt: 'I like food and architecture' },
    { label: 'Day 3 Cheaper', prompt: 'Make Day 3 cheaper' },
    { label: 'Remove Museum', prompt: 'Remove the museum' },
    { label: 'Rainy Day Alt', prompt: 'Give me a rainy-day alternative' },
    { label: 'Cost Breakdown', prompt: 'What will this trip approximately cost?' },
    { label: 'Save Itinerary', prompt: 'Save this itinerary' },
    { label: 'Get Directions', prompt: 'Get directions to my destination' },
    { label: 'PDF Guide', prompt: 'Print official travel guide and offline itinerary' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end items-end sm:items-stretch">
      
      <div className="w-full sm:max-w-md md:max-w-lg bg-white h-[92dvh] sm:h-full max-h-[100dvh] rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 overflow-hidden">
        
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Chat Drawer Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0B2545] to-[#133966] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-trip-gradient flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-sm">TripVerse AI Co-Pilot</h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 text-emerald-300 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                  CONCODE
                </span>
                {quota.isPro ? (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="text-[9px] font-black uppercase tracking-wider bg-amber-400/25 hover:bg-amber-400/35 text-amber-300 px-1.5 py-0.5 rounded border border-amber-300/30 flex items-center gap-0.5 cursor-pointer transition-colors"
                    title="TripVerse Pro Active (30 Hours/Week Full ConCode Facility)"
                  >
                    <Crown className="w-2.5 h-2.5 fill-amber-300" />
                    <span>30h/Wk Facility</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/30 cursor-pointer transition-colors flex items-center gap-1"
                    title="Free Explorer Tier • Upgrade to Pro for 30h/week Facility"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>Free Demo • Upgrade</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-300 font-medium flex items-center gap-1">
                <span>Travel Intelligence Layer</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Context-Aware
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Configure Kaggle GPU Brain Endpoint"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-300 hover:bg-white/10 transition-colors cursor-pointer"
              title="Clear Conversation History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={refreshBrainHealth}
              disabled={isCheckingBrain}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Refresh AI Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBrain ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-1 cursor-pointer"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONCODE model status */}
        <div className="px-3 py-1.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI Engine:</span>
            <span className="text-slate-300 font-mono text-[10px]">
              {brainStatus.online ? (brainStatus.gpu || 'Kaggle GPU') : 'Offline Rules Fallback'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              brainStatus.online 
                ? 'bg-[#2D5A3D] hover:bg-[#244931] text-white' 
                : 'bg-amber-600/90 hover:bg-amber-500 text-white'
            }`}
            title="Click to configure or test Kaggle GPU connection"
          >
            <span className={`w-1.5 h-1.5 rounded-full bg-white ${brainStatus.online ? 'animate-pulse' : ''}`} />
            <span>
              {brainStatus.online 
                ? `ConCode Online ${brainStatus.latencyMs ? `(${brainStatus.latencyMs}ms)` : ''}` 
                : 'Configure GPU'}
            </span>
            <Settings className="w-2.5 h-2.5 opacity-80" />
          </button>
        </div>

        {/* Quick Scenario Chips */}
        <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {scenarioChips.map(chip => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleSendMessage(chip.prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-semibold whitespace-nowrap hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 transition-all flex items-center gap-1 flex-shrink-0 shadow-2xs cursor-pointer active:scale-95"
            >
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Message Stream */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => {
            const isAi = msg.sender === 'ai';
            const guildInfo = msg.guild ? GUILD_LABELS[msg.guild] : null;
            const currentSelectedDay = activeItineraryDay[msg.id] || 1;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isAi ? '' : 'flex-row-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isAi ? 'bg-trip-gradient text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                }`}>
                  {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className="max-w-[90%] sm:max-w-[85%] min-w-0 flex-1 space-y-2">
                  {/* AI Metadata Badge */}
                  {isAi && (
                    <div className="flex items-center justify-between gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                          <span>{msg.engine === 'offline' ? 'OFFLINE GUIDANCE' : 'CONCODE'}</span>
                          {msg.engine !== 'offline' && guildInfo && <span>• {guildInfo.label}</span>}
                        </span>
                        {msg.confidence && (
                          <span className="text-slate-400 font-semibold truncate">
                            {Math.round(msg.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 shrink-0 cursor-pointer"
                        title="Copy message"
                      >
                        {copiedMsgId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  {/* Modification Pill Badge (if present) */}
                  {msg.modificationBadge && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs animate-in fade-in flex-wrap">
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{msg.modificationBadge.label}</span>
                      <span className="text-[10px] text-emerald-700 font-normal">({msg.modificationBadge.detail})</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`p-3 sm:p-3.5 rounded-2xl text-xs leading-relaxed overflow-hidden break-words shadow-xs ${
                    isAi
                      ? 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/80'
                      : 'bg-[#2D5A3D] text-white font-medium rounded-tr-xs'
                  }`}>
                    {isAi ? (
                      <FormattedAIMessage text={msg.text} />
                    ) : (
                      <div className="whitespace-pre-line break-words">{msg.text}</div>
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
                          ₹{Number(String(msg.structuredItinerary.totalCost ?? (msg.structuredItinerary as any).total_cost ?? 0).replace(/[^0-9.-]+/g, '') || 0).toLocaleString('en-IN')} Budget
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

                  {/* Action Buttons if provided by AI */}
                  {msg.actionButtons && msg.actionButtons.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {msg.actionButtons.map((btn) => (
                        <button
                          key={btn.label}
                          onClick={() => handleActionButton(btn.action, btn.payload)}
                          className={`px-3 py-2 rounded-xl text-[11px] font-bold text-left transition-all shadow-2xs cursor-pointer active:scale-98 flex items-center justify-between group gap-2 ${
                            btn.primary
                              ? 'bg-trip-gradient hover:bg-trip-gradient-hover text-white shadow-emerald-500/20 shadow-sm'
                              : 'bg-white border border-emerald-300 text-[#2D5A3D] hover:bg-emerald-50'
                          }`}
                        >
                          <span className="break-words min-w-0">{btn.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-slate-400 block px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isProcessing && (
            <div className="flex items-center gap-2.5 animate-in fade-in">
              <div className="w-8 h-8 rounded-full bg-trip-gradient text-white flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-xs text-xs text-slate-600 font-medium shadow-2xs flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
                <span>ConCode AI reasoning travel schedule & budget...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-3.5 pb-safe bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Ask anything (e.g. Plan a 5-day trip to Dubai)..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-base sm:text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 font-medium"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isProcessing}
            className="w-10 h-10 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white flex items-center justify-center shadow-xs transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Kaggle Brain Configuration Modal */}
        <ConcodeBrainConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSaved={refreshBrainHealth}
        />

      </div>
    </div>
  );
};
