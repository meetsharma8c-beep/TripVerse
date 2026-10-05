import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trip, ChatMessage, StructuredItinerary, AIChatBudgetBreakdown } from '../../types/trip';
import { processTravelCoPilotQuery, CoPilotEngine, AIAppAction } from '../../services/aiAssistant';
import { loadGeminiApiKey, saveGeminiApiKey } from '../../services/storageService';
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
  Key, 
  Check, 
  Cpu, 
  RefreshCw,
  Zap,
  Activity,
  ShieldCheck,
  Fuel,
  Camera,
  Coins,
  RotateCcw,
  ExternalLink,
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
  TrendingDown
} from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

interface AIChatDrawerProps {
  trip: Trip;
  isOpen: boolean;
  initialQuery?: string;
  onClose: () => void;
  onUpdateTrip: (updatedTrip: Trip) => void;
  onOpenReplanning?: (screen?: 1 | 2 | 3 | 4 | 5 | 'refund') => void;
  onAppAction?: (action: AIAppAction) => void;
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

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  trip,
  isOpen,
  initialQuery,
  onClose,
  onUpdateTrip,
  onOpenReplanning,
  onAppAction
}) => {
  const [apiKey, setApiKey] = useState<string>(loadGeminiApiKey());
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState(apiKey);
  const [isSavedKey, setIsSavedKey] = useState(false);

  // Engine state
  const [selectedEngine, setSelectedEngine] = useState<CoPilotEngine>('concode_brain');
  const [brainStatus, setBrainStatus] = useState<BrainStatus>({ online: false });
  const [isCheckingBrain, setIsCheckingBrain] = useState(false);

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
        text: `Hello! I'm your **TripVerse ConCode AI Co-Pilot**.\n\nI can plan end-to-end itineraries worldwide (e.g. Dubai, Japan, Europe, India), adapt schedules in real-time, optimize budgets, or guide your road trip with verified GPS pitstops.\n\nWhat would you like to explore?`,
        timestamp: 'Just now',
        engine: 'concode_brain',
        guild: 'fullstack',
        confidence: 0.99,
        actionButtons: [
          { label: '✈️ Plan a 5-day trip to Dubai', action: 'PLAN_DUBAI', primary: true },
          { label: '💳 What will this trip approximately cost?', action: 'CHECK_BUDGET' },
          { label: '📉 Make Day 3 cheaper', action: 'MAKE_CHEAPER' },
          { label: '☔ Rainy-day alternative', action: 'CHECK_WEATHER' },
          { label: '🧭 Start Turn-by-Turn GPS', action: 'START_NAV' }
        ]
      }
    ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reload messages when switching accounts or signing in/out
  useEffect(() => {
    const handleAuthChange = () => {
      setMessages(getInitialMessages());
    };
    window.addEventListener('tripverse_auth_state_change', handleAuthChange);
    return () => window.removeEventListener('tripverse_auth_state_change', handleAuthChange);
  }, []);

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

  const refreshBrainHealth = useCallback(async () => {
    setIsCheckingBrain(true);
    try {
      const status = await checkBrainStatus();
      setBrainStatus(status);
      if (status.online) {
        setSelectedEngine('concode_brain');
      } else if (apiKey.trim()) {
        setSelectedEngine('gemini');
      } else {
        setSelectedEngine('offline');
      }
    } finally {
      setIsCheckingBrain(false);
    }
  }, [apiKey]);

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

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveGeminiApiKey(tempKeyInput);
    setApiKey(tempKeyInput.trim());
    setIsSavedKey(true);
    triggerHaptic('success');
    setTimeout(() => {
      setIsSavedKey(false);
      setShowKeyConfig(false);
    }, 1500);
  };

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
          { label: '✈️ Plan a 5-day trip to Dubai', action: 'PLAN_DUBAI', primary: true },
          { label: '💳 I have ₹1,00,000 budget', action: 'BUDGET_1LAKH' },
          { label: '🍽️ I like food and architecture', action: 'PREF_FOOD_ARCH' },
          { label: '🧭 Start GPS Navigation', action: 'START_NAV' }
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
      const response = await processTravelCoPilotQuery(query, trip, {
        engine: selectedEngine,
        apiKey: apiKey
      });

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
      handleSendMessage('Give me a rainy-day alternative');
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
    } else if (action === 'VIEW_ROUTE') {
      if (onAppAction) onAppAction({ type: 'SWITCH_TAB', payload: { tab: 'trips', subTab: 'route' } });
      onClose();
    } else if (action === 'VIEW_ITINERARY') {
      if (onAppAction) onAppAction({ type: 'SWITCH_TAB', payload: { tab: 'trips', subTab: 'itinerary' } });
      onClose();
    } else if (action === 'VIEW_EXPENSES') {
      if (onAppAction) onAppAction({ type: 'SWITCH_TAB', payload: { tab: 'trips', subTab: 'expenses' } });
      onClose();
    } else {
      handleSendMessage(action);
    }
  };

  const scenarioChips = [
    { label: '✈️ 5-Day Dubai', prompt: 'Plan a 5-day trip to Dubai' },
    { label: '💳 Budget ₹1 Lakh', prompt: 'I have ₹1,00,000' },
    { label: '🍽️ Food & Arch', prompt: 'I like food and architecture' },
    { label: '📉 Day 3 Cheaper', prompt: 'Make Day 3 cheaper' },
    { label: '🏛️ Remove Museum', prompt: 'Remove the museum' },
    { label: '☔ Rainy Day Alt', prompt: 'Give me a rainy-day alternative' },
    { label: '💳 Cost Breakdown', prompt: 'What will this trip approximately cost?' },
    { label: '💾 Save Itinerary', prompt: 'Save this itinerary' },
    { label: '🧭 Start GPS', prompt: 'Start live turn-by-turn GPS navigation' },
    { label: '📄 PDF Guide', prompt: 'Print official travel guide and offline itinerary' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end items-end sm:items-stretch">
      
      <div className="w-full sm:max-w-md bg-white h-[88vh] sm:h-full rounded-t-3xl sm:rounded-none shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 overflow-hidden">
        
        {/* Mobile Pull Handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto my-1.5 sm:hidden shrink-0" />

        {/* Chat Drawer Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0B2545] to-[#133966] text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-trip-gradient flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm">TripVerse AI Co-Pilot</h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-white/10 text-emerald-300 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1">
                  CONCODE
                </span>
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
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-300 hover:bg-white/10 transition-colors"
              title="Clear Conversation History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={refreshBrainHealth}
              disabled={isCheckingBrain}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Refresh AI Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBrain ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                showKeyConfig || apiKey.trim()
                  ? 'text-emerald-300 bg-white/10'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Configure Optional Gemini Cloud Key"
            >
              <Key className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-1"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Engine Selector Bar */}
        <div className="px-3 py-1.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 text-[11px]">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Engine:</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setSelectedEngine('concode_brain')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
                selectedEngine === 'concode_brain'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              CONCODE AI
            </button>

            <button
              onClick={() => setSelectedEngine('gemini')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${
                selectedEngine === 'gemini'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gemini
            </button>

            <button
              onClick={() => setSelectedEngine('offline')}
              className={`px-2 py-0.5 rounded-md font-semibold text-[10px] transition-all cursor-pointer ${
                selectedEngine === 'offline'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Offline
            </button>
          </div>
        </div>

        {/* API Key Configuration Dropdown */}
        {showKeyConfig && (
          <form onSubmit={handleSaveApiKey} className="p-3 bg-slate-900 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                Optional Google Gemini Key
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={tempKeyInput}
                onChange={e => setTempKeyInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-[#00B074] hover:bg-[#00925e] text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                {isSavedKey ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{isSavedKey ? 'Saved' : 'Connect'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              ConCode AI works directly in-browser with multi-turn memory without needing any external key.
            </p>
          </form>
        )}

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

                <div className="max-w-[88%] space-y-2">
                  {/* AI Metadata Badge */}
                  {isAi && (
                    <div className="flex items-center justify-between gap-1.5 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <span>CONCODE</span>
                          {guildInfo && <span>• {guildInfo.label}</span>}
                        </span>
                        {msg.confidence && (
                          <span className="text-slate-400 font-semibold">
                            {Math.round(msg.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        title="Copy message"
                      >
                        {copiedMsgId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}

                  {/* Modification Pill Badge (if present) */}
                  {msg.modificationBadge && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs animate-in fade-in">
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{msg.modificationBadge.label}</span>
                      <span className="text-[10px] text-emerald-700 font-normal">({msg.modificationBadge.detail})</span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    isAi
                      ? 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/80 shadow-xs'
                      : 'bg-[#00B074] text-white font-medium rounded-tr-xs shadow-xs'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Interactive Structured Itinerary Card */}
                  {msg.structuredItinerary && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-[#0B2545]">
                          <Calendar className="w-4 h-4 text-emerald-500" />
                          <span>{msg.structuredItinerary.destination} — {msg.structuredItinerary.durationDays} Days</span>
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          ₹{msg.structuredItinerary.totalCost?.toLocaleString('en-IN')} Budget
                        </span>
                      </div>

                      {/* Day Selector Pills */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                        {msg.structuredItinerary.days.map((d) => (
                          <button
                            key={d.dayNumber}
                            type="button"
                            onClick={() => setActiveItineraryDay(prev => ({ ...prev, [msg.id]: d.dayNumber }))}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              currentSelectedDay === d.dayNumber
                                ? 'bg-[#00B074] text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Day {d.dayNumber}
                          </button>
                        ))}
                      </div>

                      {/* Active Day Detail */}
                      {(() => {
                        const selectedDay = msg.structuredItinerary.days.find(d => d.dayNumber === currentSelectedDay) || msg.structuredItinerary.days[0];
                        if (!selectedDay) return null;

                        return (
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-2 text-[11px]">
                            <div className="flex items-center justify-between font-bold text-slate-800">
                              <span>{selectedDay.title}</span>
                              <span className="text-emerald-700 font-extrabold">₹{selectedDay.cost.toLocaleString('en-IN')}</span>
                            </div>

                            <div className="space-y-1.5 text-slate-600">
                              <div className="flex items-start gap-1.5">
                                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                <div><strong className="text-slate-700">Morning:</strong> {selectedDay.morning}</div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <div><strong className="text-slate-700">Afternoon:</strong> {selectedDay.afternoon}</div>
                              </div>
                              <div className="flex items-start gap-1.5">
                                <Sunset className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                                <div><strong className="text-slate-700">Evening:</strong> {selectedDay.evening}</div>
                              </div>
                              <div className="flex items-start gap-1.5 pt-1 border-t border-slate-200/60 text-emerald-800">
                                <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <div><strong>Dining:</strong> {selectedDay.food}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Interactive Budget Breakdown Card */}
                  {msg.budgetBreakdown && (
                    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-3.5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-[#0B2545] flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          Budget Allocation
                        </span>
                        <span className="text-xs font-black text-emerald-700">
                          ₹{msg.budgetBreakdown.total.toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Stacked Progress Bar */}
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                        <div style={{ width: `${(msg.budgetBreakdown.transport / msg.budgetBreakdown.total) * 100}%` }} className="bg-sky-500" title="Flights & Transit" />
                        <div style={{ width: `${(msg.budgetBreakdown.stays / msg.budgetBreakdown.total) * 100}%` }} className="bg-indigo-500" title="Hotels & Stays" />
                        <div style={{ width: `${(msg.budgetBreakdown.food / msg.budgetBreakdown.total) * 100}%` }} className="bg-emerald-500" title="Food & Dining" />
                        <div style={{ width: `${(msg.budgetBreakdown.activities / msg.budgetBreakdown.total) * 100}%` }} className="bg-amber-500" title="Activities" />
                        <div style={{ width: `${(msg.budgetBreakdown.buffer / msg.budgetBreakdown.total) * 100}%` }} className="bg-purple-400" title="Buffer" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-lg bg-sky-50 text-sky-900 border border-sky-100">
                          <span className="block text-[10px] text-sky-600 font-semibold">✈️ Flights / Transit</span>
                          <span className="font-bold">₹{msg.budgetBreakdown.transport.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-100">
                          <span className="block text-[10px] text-indigo-600 font-semibold">🏨 Stays & Resorts</span>
                          <span className="font-bold">₹{msg.budgetBreakdown.stays.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100">
                          <span className="block text-[10px] text-emerald-600 font-semibold">🍽️ Food & Dining</span>
                          <span className="font-bold">₹{msg.budgetBreakdown.food.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-900 border border-amber-100">
                          <span className="block text-[10px] text-amber-600 font-semibold">🎟️ Activities & Tickets</span>
                          <span className="font-bold">₹{msg.budgetBreakdown.activities.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 italic">
                        * Realistic estimates based on current season. Excludes personal luxury shopping.
                      </div>
                    </div>
                  )}

                  {/* Action Buttons if provided by AI */}
                  {msg.actionButtons && msg.actionButtons.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-1">
                      {msg.actionButtons.map((btn) => (
                        <button
                          key={btn.label}
                          onClick={() => handleActionButton(btn.action, btn.payload)}
                          className={`px-3 py-2 rounded-xl text-[11px] font-bold text-left transition-all shadow-2xs cursor-pointer active:scale-98 flex items-center justify-between group ${
                            btn.primary
                              ? 'bg-trip-gradient hover:bg-trip-gradient-hover text-white shadow-emerald-500/20 shadow-sm'
                              : 'bg-white border border-emerald-300 text-[#00B074] hover:bg-emerald-50'
                          }`}
                        >
                          <span>{btn.label}</span>
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
              <div className="w-8 h-8 rounded-full bg-trip-gradient text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-2xl rounded-tl-xs text-xs text-slate-600 font-medium shadow-2xs flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>ConCode AI reasoning travel schedule & budget...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 pb-safe bg-white border-t border-slate-200 flex items-center gap-2">
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
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400 font-medium"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isProcessing}
            className="w-10 h-10 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white flex items-center justify-center shadow-xs transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
