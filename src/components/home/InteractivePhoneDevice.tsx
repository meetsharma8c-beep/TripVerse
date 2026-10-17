import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Battery, 
  MapPin, 
  Navigation, 
  Sparkles, 
  Calendar, 
  Compass, 
  Volume2, 
  Power, 
  ChevronRight, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  Fuel, 
  Star,
  CheckCircle2,
  Send,
  Flashlight,
  Camera,
  Layers,
  Flame,
  Bot
} from 'lucide-react';
import { Trip } from '../../types/trip';
import { formatCurrency, SupportedCurrency } from '../../services/currencyService';
import { triggerHaptic } from '../../services/deviceService';
import { queryConcodeBrain } from '../../services/concodeBrainService';

interface InteractivePhoneDeviceProps {
  currency: SupportedCurrency;
  activeTrip?: Trip | null;
  onQuickPlan: (params: {
    destination: string;
    duration: number;
    travelers: number;
    budget: number;
  }) => void;
}

type PhoneAppScreen = 'overview' | 'navigation' | 'itinerary' | 'assistant';

export const InteractivePhoneDevice: React.FC<InteractivePhoneDeviceProps> = ({
  currency,
  activeTrip,
  onQuickPlan
}) => {

  const [activeScreen, setActiveScreen] = useState<PhoneAppScreen>('overview');
  const [isLocked, setIsLocked] = useState(false);
  const [isDynamicIslandExpanded, setIsDynamicIslandExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState('9:41');
  const [miniChatInput, setMiniChatInput] = useState('');
  const [miniChatMessages, setMiniChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your AI Travel Co-Pilot. Ask me about routes, highway break stops, hotel stays, or local food.' }
  ]);
  const [volumeLevel, setVolumeLevel] = useState(70);
  const [showVolumeHUD, setShowVolumeHUD] = useState(false);

  // Live ticking clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours % 12 || 12}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const handlePowerButton = () => {
    triggerHaptic('light');
    setIsLocked(prev => !prev);
    setIsDynamicIslandExpanded(false);
  };

  const handleVolumeUp = () => {
    triggerHaptic('light');
    setVolumeLevel(prev => Math.min(100, prev + 10));
    setShowVolumeHUD(true);
    setTimeout(() => setShowVolumeHUD(false), 1500);
  };

  const handleVolumeDown = () => {
    triggerHaptic('light');
    setVolumeLevel(prev => Math.max(0, prev - 10));
    setShowVolumeHUD(true);
    setTimeout(() => setShowVolumeHUD(false), 1500);
  };

  const heroTripContext: any = activeTrip || {
    id: 'preview-journey',
    name: 'Your Next Journey',
    destination: 'Enter Destination',
    origin: 'Your Origin',
    durationDays: 3,
    travelersCount: 2,
    totalBudget: 10000,
    itinerary: [],
    breakStops: []
  };


  const handleMiniChatSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!miniChatInput.trim()) return;

    triggerHaptic('light');
    const userText = miniChatInput;
    setMiniChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setMiniChatInput('');

    try {
      const brainRes = await queryConcodeBrain(userText, heroTripContext);
      setMiniChatMessages(prev => [...prev, { sender: 'ai', text: brainRes.response }]);
      triggerHaptic('success');
    } catch (_) {
      setMiniChatMessages(prev => [...prev, { sender: 'ai', text: 'ConCode AI Co-Pilot synchronized. How can I adjust your Udaipur route?' }]);
    }
  };

  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[360px] mx-auto select-none">
      
      {/* Ambient Floor Glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-emerald-500/20 via-teal-400/20 to-blue-500/20 rounded-[60px] blur-2xl -z-10 opacity-70 transform rotate-1" />

      {/* External Physical Phone Hardware Chassis */}
      <div className="relative bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-[11px] rounded-[52px] shadow-[0_30px_70px_-15px_rgba(11,37,69,0.45),0_0_0_1px_rgba(255,255,255,0.12),0_10px_20px_rgba(0,0,0,0.5)] border-[2.5px] border-slate-700/80">

        {/* Physical Side Buttons (Left: Action, Vol Up, Vol Down) */}
        {/* Action Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setIsDynamicIslandExpanded(prev => !prev);
          }}
          title="Action Button: Toggle Live Dynamic Island"
          className="absolute -left-[6px] top-28 w-[4.5px] h-7 bg-slate-600 hover:bg-emerald-500 active:bg-emerald-400 rounded-l-sm transition-colors cursor-pointer"
        />
        {/* Volume Up */}
        <button
          onClick={handleVolumeUp}
          title="Volume Up"
          className="absolute -left-[6px] top-40 w-[4.5px] h-12 bg-slate-600 hover:bg-slate-400 active:scale-95 rounded-l-sm transition-all cursor-pointer"
        />
        {/* Volume Down */}
        <button
          onClick={handleVolumeDown}
          title="Volume Down"
          className="absolute -left-[6px] top-56 w-[4.5px] h-12 bg-slate-600 hover:bg-slate-400 active:scale-95 rounded-l-sm transition-all cursor-pointer"
        />

        {/* Physical Side Button (Right: Power / Screen Lock) */}
        <button
          onClick={handlePowerButton}
          title="Power Button: Lock/Unlock Phone"
          className="absolute -right-[6px] top-36 w-[4.5px] h-16 bg-slate-600 hover:bg-emerald-400 active:bg-emerald-500 rounded-r-sm transition-colors cursor-pointer shadow-xs"
        />

        {/* Subtle Titanium Edge Bevel */}
        <div className="relative rounded-[42px] overflow-hidden bg-black border-[3px] border-slate-950 shadow-inner">

          {/* Glass Reflection Sheen Layer */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] z-30 rounded-[40px]" />

          {/* Volume HUD Overlay */}
          {showVolumeHUD && (
            <div className="absolute left-2.5 top-32 z-40 bg-slate-900/90 backdrop-blur-md px-2 py-3 rounded-2xl border border-white/10 flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-150">
              <Volume2 className="w-3.5 h-3.5 text-white" />
              <div className="w-1.5 h-16 bg-slate-700 rounded-full overflow-hidden flex flex-col justify-end">
                <div style={{ height: `${volumeLevel}%` }} className="w-full bg-white rounded-full transition-all" />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SCREEN STATE 1: LOCK SCREEN                                    */}
          {/* ============================================================== */}
          {isLocked ? (
            <div className="relative h-[600px] flex flex-col justify-between p-6 text-white overflow-hidden bg-cover bg-center animate-in fade-in duration-300"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80")'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/80" />

              {/* Status Bar */}
              <div className="relative z-10 flex items-center justify-between text-[11px] font-semibold tracking-tight text-white/90 pt-1">
                <span>{currentTime}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold">5G</span>
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Lock Screen Clock & Date */}
              <div className="relative z-10 text-center mt-8 space-y-1">
                <p className="text-xs font-medium text-emerald-300 uppercase tracking-widest">Saturday, September 26</p>
                <h1 className="text-6xl font-light tracking-tighter font-display drop-shadow-md">{currentTime}</h1>
              </div>

              {/* Illustrative notification widget */}
              <div 
                onClick={() => setIsLocked(false)}
                className="relative z-10 bg-white/20 hover:bg-white/25 backdrop-blur-xl border border-white/25 p-3 rounded-2xl shadow-lg cursor-pointer transition-all active:scale-95 space-y-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                    <Navigation className="w-3 h-3 animate-spin text-emerald-300" />
                    <span>Live GPS Guidance</span>
                  </div>
                  <span className="text-emerald-300 font-semibold">Active</span>
                </div>
                <p className="text-xs font-bold text-white leading-tight">Ahmedabad → Udaipur Express Route</p>
                <p className="text-[11px] text-white/80">Tap to open live journey HUD & highway stops</p>
              </div>

              {/* Bottom Quick Actions (Flashlight & Camera) */}
              <div className="relative z-10 flex items-center justify-between px-3 pb-4">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xs">
                  <Flashlight className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setIsLocked(false);
                    }}
                    className="text-[11px] font-semibold text-white/90 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    Swipe up to unlock
                  </button>
                  <div className="w-32 h-1 bg-white/70 rounded-full mx-auto mt-2" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-xs">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
            </div>
          ) : (
            // ==============================================================
            // SCREEN STATE 2: ACTIVE SMARTPHONE APPLICATION                   
            // ==============================================================
            <div className="relative h-[600px] flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans">

              {/* Status Bar */}
              <div className="relative z-20 px-6 pt-3 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-tight text-white drop-shadow-sm">
                <span className="font-bold">{currentTime}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-bold tracking-wider opacity-90">5G</span>
                  <Wifi className="w-3 h-3" />
                  <div className="flex items-center gap-0.5">
                    <span className="text-[9px] font-mono">88%</span>
                    <Battery className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Real Dynamic Island Pill */}
              <div 
                onClick={() => {
                  triggerHaptic('light');
                  setIsDynamicIslandExpanded(prev => !prev);
                }}
                className={`absolute top-2.5 left-1/2 -translate-x-1/2 bg-black text-white rounded-full z-30 transition-all duration-300 flex items-center justify-between cursor-pointer border border-white/10 shadow-md ${
                  isDynamicIslandExpanded ? 'w-72 h-12 px-3.5' : 'w-24 h-6 px-2'
                }`}
              >
                {/* Camera Lens dot */}
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 rounded-full bg-blue-900/60" />
                </div>

                {isDynamicIslandExpanded ? (
                  <div className="flex items-center justify-between w-full ml-2 text-[10px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                      <span className="font-bold text-emerald-300 truncate">NH48 Highway Route</span>
                    </div>
                    <span className="font-mono text-white/80 shrink-0">Shamlaji Exit</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[8px] text-emerald-400 font-bold pr-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>HUD Live</span>
                  </div>
                )}
              </div>

              {/* Phone App Content Area */}
              <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col">

                {/* APP VIEW 1: OVERVIEW (Matching exact photo requested by user) */}
                {activeScreen === 'overview' && (
                  <div className="flex-1 flex flex-col animate-in fade-in duration-200">
                    
                    {/* Scenic Mountain Lake Hero Image Header */}
                    <div className="relative h-52 shrink-0 overflow-hidden -mt-8">
                      <img
                        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                        alt="Travel mountain landscape"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent" />

                      {/* Brand Tag */}
                      <div className="absolute top-12 left-4 z-10">
                        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md">
                          <span className="font-display font-black text-xs text-[#152A1C]">
                            Trip<span className="text-[#2D5A3D]">Verse</span>
                          </span>
                        </div>
                      </div>

                      {/* Title & Tagline inside picture */}
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>AI Journey Planner</span>
                        </p>
                        <h3 className="text-lg font-black leading-tight font-display mt-0.5">Your Next Adventure Awaits</h3>
                        <p className="text-[11px] text-slate-200 mt-0.5 font-medium">Best stays, food & break stops within budget.</p>
                      </div>
                    </div>

                    {/* Content Cards */}
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        
                        {/* Card 1: Route & Price Pill */}
                        <div className="p-3.5 bg-white rounded-2xl border border-[#E2EBE1] shadow-xs space-y-1.5 hover:border-[#2D5A3D] transition-colors">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-extrabold text-slate-900 text-sm font-display truncate">
                              {activeTrip ? `${activeTrip.origin.split(',')[0]} → ${activeTrip.destination.split(',')[0]}` : 'Configure Your Journey'}
                            </span>
                            {activeTrip ? (
                              <span className="font-black text-[#2D5A3D] bg-[#EAF0E9] px-2.5 py-0.5 rounded-full text-xs font-display shrink-0 border border-[#8EA78D]/40">
                                {formatCurrency(activeTrip.estimatedTotal || activeTrip.totalBudget, currency)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                Ready
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            {activeTrip ? (
                              <>
                                <span>{activeTrip.durationDays} Days</span>
                                <span>•</span>
                                <span>{activeTrip.travelersCount} Travelers</span>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold bg-emerald-50/60 px-1.5 py-0.2 rounded">Real Stored Plan</span>
                              </>
                            ) : (
                              <span>Set your destination and budget to activate your HUD</span>
                            )}
                          </div>
                        </div>

                        {/* Card 2: Recommended Highway Stop Pill */}
                        {activeTrip && activeTrip.breakStops && activeTrip.breakStops.length > 0 ? (
                          <div 
                            onClick={() => setActiveScreen('navigation')}
                            className="p-3 bg-emerald-50/80 hover:bg-emerald-100/70 rounded-2xl border border-emerald-200 flex items-center justify-between gap-2 cursor-pointer transition-all shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                              <span className="font-bold text-slate-800 text-xs truncate">
                                Stop: {activeTrip.breakStops[0].name}
                              </span>
                            </div>
                            <span className="text-[11px] font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs shrink-0">
                              Listing
                            </span>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center gap-2 text-slate-600 text-xs">
                            <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Select origin & destination to load verified highway stops</span>
                          </div>
                        )}

                      </div>

                      {/* Primary Green CTA */}
                      <button
                        onClick={() => onQuickPlan({
                          destination: activeTrip?.destination || 'Udaipur',
                          duration: activeTrip?.durationDays || 3,
                          travelers: activeTrip?.travelersCount || 2,
                          budget: activeTrip?.totalBudget || 8000
                        })}
                        className="w-full py-3.5 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-display font-extrabold text-sm shadow-md hover:shadow-lg hover:shadow-emerald-500/25 text-center active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>{activeTrip ? 'View Active Journey Plan' : 'Draft a Trip Plan'}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>

                    </div>

                  </div>
                )}

                {/* APP VIEW 2: illustrative navigation handoff */}
                {activeScreen === 'navigation' && (
                  <div className="flex-1 flex flex-col p-3.5 space-y-3 bg-slate-900 text-white animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                        <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Live Route Navigation</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">GPS Active</span>
                    </div>

                    {/* Speedometer & Compass */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Speed</span>
                        <p className="text-3xl font-black font-display text-emerald-400">96</p>
                        <span className="text-[10px] text-slate-400 font-mono">km/h</span>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Next Exit</span>
                        <p className="text-3xl font-black font-display text-sky-400">12</p>
                        <span className="text-[10px] text-slate-400 font-mono">km away</span>
                      </div>
                    </div>

                    {/* Next Turn Instruction Card */}
                    <div className="p-3 bg-emerald-950/60 rounded-2xl border border-emerald-500/40 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <ArrowRight className="w-4 h-4" />
                        <span>Exit in 1.4 km: Shamlaji Food Court</span>
                      </div>
                      <p className="text-[11px] text-slate-300">Example place listing · facilities not confirmed.</p>
                    </div>

                    <button
                      onClick={() => setActiveScreen('overview')}
                      className="mt-auto py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center cursor-pointer transition-colors"
                    >
                      ← Back to Journey Card
                    </button>
                  </div>
                )}

                {/* APP VIEW 3: DAY-WISE TIMELINE */}
                {activeScreen === 'itinerary' && (
                  <div className="flex-1 flex flex-col p-3.5 space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-[#E2EBE1] pb-2">
                      <h4 className="font-extrabold text-xs text-[#152A1C] font-display">Udaipur 3-Day Highlights</h4>
                      <span className="text-[10px] font-bold text-[#2D5A3D] bg-[#EAF0E9] px-2 py-0.5 rounded">Example schedule</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-[#E2EBE1] shadow-2xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Day 1: Lake Pichola Sunset</span>
                          <span className="text-emerald-600">₹2,800</span>
                        </div>
                        <p className="text-[11px] text-slate-500">City Palace boat cruise & rooftop Mewari dinner.</p>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Day 2: Royal Heritage Trail</span>
                          <span className="text-emerald-600">₹3,200</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Jagdish Temple, Saheliyon Ki Bari & artisan shopping.</p>
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Day 3: Sajjangarh Viewpoint</span>
                          <span className="text-emerald-600">₹1,850</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Monsoon Palace panoramic overlook & return drive.</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveScreen('overview')}
                      className="mt-auto py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs text-center cursor-pointer transition-colors"
                    >
                      ← Back to Overview
                    </button>
                  </div>
                )}

                {/* APP VIEW 4: CONCODE AI MINI ASSISTANT */}
                {activeScreen === 'assistant' && (
                  <div className="flex-1 flex flex-col p-3 bg-white animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-purple-700">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>ConCode AI Mini Co-Pilot</span>
                      </div>
                      <span className="text-[9px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">Online</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
                      {miniChatMessages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl text-[11px] leading-relaxed ${
                            m.sender === 'ai'
                              ? 'bg-purple-50 text-purple-950 border border-purple-100'
                              : 'bg-emerald-600 text-white ml-auto max-w-[85%]'
                          }`}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleMiniChatSubmit} className="mt-2 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                      <input
                        type="text"
                        placeholder="Ask AI inside phone..."
                        value={miniChatInput}
                        onChange={e => setMiniChatInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-purple-300 border border-slate-200"
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 active:scale-95 cursor-pointer shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}

              </div>

              {/* Functional Phone Bottom Navigation Bar */}
              <div className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 py-2 flex items-center justify-between shrink-0 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveScreen('overview');
                  }}
                  className={`flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    activeScreen === 'overview' ? 'text-[#2D5A3D]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Phone Overview App"
                >
                  <Compass className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Trip</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveScreen('navigation');
                  }}
                  className={`flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    activeScreen === 'navigation' ? 'text-cyan-500' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Illustrative directions screen"
                >
                  <Navigation className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Directions demo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveScreen('itinerary');
                  }}
                  className={`flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    activeScreen === 'itinerary' ? 'text-[#2D5A3D]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Phone Day-Wise Itinerary App"
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-[9px] font-bold">Days</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setActiveScreen('assistant');
                  }}
                  className={`flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    activeScreen === 'assistant' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title="Phone ConCode AI App"
                >
                  <Bot className="w-4 h-4" />
                  <span className="text-[9px] font-bold">AI Chat</span>
                </button>
              </div>

              {/* iOS Home Indicator Bar */}
              <div 
                onClick={() => {
                  triggerHaptic('light');
                  setActiveScreen('overview');
                }}
                className="bg-white py-1.5 flex justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                title="Tap to return Home"
              >
                <div className="w-28 h-1 bg-slate-400/80 rounded-full" />
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Floating Interactive Device Hints */}
      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] font-bold text-slate-500 text-center">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Tap screen apps or buttons
        </span>
        <span>•</span>
        <button
          onClick={handlePowerButton}
          className="text-slate-600 hover:text-emerald-700 underline cursor-pointer"
        >
          {isLocked ? 'Tap to Unlock' : 'Press Side Key to Lock'}
        </button>
      </div>

    </div>
  );
};
