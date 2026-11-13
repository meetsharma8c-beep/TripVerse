import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wifi, 
  Battery, 
  Navigation, 
  Sparkles, 
  Calendar, 
  Compass, 
  Volume2, 
  ArrowRight, 
  Send, 
  Flashlight, 
  Camera, 
  Bot,
  BellOff,
  Bell,
  RotateCw,
  Home,
  Briefcase,
  Bookmark,
  Search,
  MapPin,
  Star,
  QrCode,
  Ticket,
  ShieldCheck,
  Coffee,
  UtensilsCrossed,
  Fuel,
  ChevronRight
} from 'lucide-react';
import { Trip } from '../../types/trip';
import { formatCurrency, SupportedCurrency } from '../../services/currencyService';
import { triggerHaptic } from '../../services/deviceService';
import { queryConcodeBrain } from '../../services/concodeBrainService';
import { useLanguage } from '../../services/languageService';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { HighwayConnector, BrandIconMark } from '../common/Logo';

interface InteractivePhoneDeviceProps {
  currency: SupportedCurrency;
  activeTrip?: Trip | null;
  onQuickPlan: (params: {
    destination: string;
    duration: number;
    travelers: number;
    budget: number;
    budgetMode?: 'total' | 'per_person';
  }) => void;
}

type PhoneAppScreen = 'home' | 'itinerary' | 'navigation' | 'chat' | 'bookings' | 'camera';
type TitaniumFinish = 'natural' | 'black' | 'desert' | 'white';

export const InteractivePhoneDevice: React.FC<InteractivePhoneDeviceProps> = ({
  currency,
  activeTrip,
  onQuickPlan
}) => {
  const { t } = useLanguage();

  const [activeScreen, setActiveScreen] = useState<PhoneAppScreen>('home');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isDynamicIslandExpanded, setIsDynamicIslandExpanded] = useState(false);
  const [dynamicIslandNotification, setDynamicIslandNotification] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('9:41');
  
  // Interactive mini-planner inside the phone
  const [quickDestination, setQuickDestination] = useState('Udaipur');
  const [quickDuration, setQuickDuration] = useState(3);
  const [quickTravelers, setQuickTravelers] = useState(2);
  
  // AI Co-Pilot chat messages inside phone
  const [miniChatInput, setMiniChatInput] = useState('');
  const [miniChatMessages, setMiniChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your TripVerse AI Co-Pilot. Ask me about routes, highway stops, local food, or budget stays.' }
  ]);
  
  const [volumeLevel, setVolumeLevel] = useState(75);
  const [showVolumeHUD, setShowVolumeHUD] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  
  // Titanium Colorway Finish (Defaulted to Black Titanium)
  const titaniumFinish: TitaniumFinish = 'black';

  // Camera Control State
  const [cameraZoom, setCameraZoom] = useState<number>(1);
  const [isCameraFlashing, setIsCameraFlashing] = useState(false);
  const [cameraLensFlipped, setCameraLensFlipped] = useState(false);

  // Live ticking clock with standard 12-hour format
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

  const handleActionButton = () => {
    triggerHaptic('medium');
    setIsSilentMode(prev => {
      const next = !prev;
      setDynamicIslandNotification(next ? 'Silent Mode On' : 'Silent Mode Off');
      setTimeout(() => setDynamicIslandNotification(null), 2500);
      return next;
    });
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

  const handleCameraControlButton = () => {
    triggerHaptic('heavy');
    setIsCameraFlashing(true);
    setTimeout(() => setIsCameraFlashing(false), 200);
    if (isLocked) {
      setIsLocked(false);
    }
    setActiveScreen('camera');
  };

  const handleShutterClick = () => {
    triggerHaptic('heavy');
    setIsCameraFlashing(true);
    setTimeout(() => setIsCameraFlashing(false), 180);
  };

  const heroTripContext: any = activeTrip || {
    id: 'preview-journey',
    name: 'Udaipur Heritage Explorer',
    destination: quickDestination || 'Udaipur',
    origin: 'Ahmedabad',
    durationDays: quickDuration,
    travelersCount: quickTravelers,
    totalBudget: 8500,
    itinerary: [],
    breakStops: [
      {
        id: 'stop-1',
        name: 'Shamlaji Highway Plaza (NH48)',
        category: 'Food & Fuel Plaza',
        rating: 4.8,
        distanceFromOriginKm: 125,
        facilities: ['EV Fast Charger', 'Clean Washrooms', 'Pure Veg Restaurant', '24/7 Petrol']
      }
    ]
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
    } catch {
      setMiniChatMessages(prev => [...prev, { sender: 'ai', text: 'TripVerse AI Co-Pilot synchronized. How can I adjust your journey route?' }]);
    }
  };

  const handleTriggerQuickPlan = (dest: string = quickDestination, days: number = quickDuration, travelers: number = quickTravelers, budget: number = 8500) => {
    triggerHaptic('medium');
    onQuickPlan({
      destination: dest,
      duration: days,
      travelers: travelers,
      budget: budget,
      budgetMode: 'total'
    });
  };

  // Titanium Color Finish Styling Configs
  const finishStyles = {
    natural: {
      name: 'Natural Titanium',
      outerBand: 'from-[#423f3b] via-[#2a2826] to-[#1a1918]',
      rimBorder: 'border-[#5e5852]',
      specularRing: 'ring-1 ring-[#a39b91]/35',
      buttonBg: 'from-[#4d4843] to-[#302d2a] border-[#6b645b]/70',
      cameraControlBorder: 'border-[#8c8275]',
      accentGlow: 'from-[#a39b91]/20 via-[#423f3b]/10 to-transparent'
    },
    black: {
      name: 'Black Titanium',
      outerBand: 'from-[#282a2d] via-[#141517] to-[#0a0b0c]',
      rimBorder: 'border-[#3f434a]',
      specularRing: 'ring-1 ring-[#5a606a]/30',
      buttonBg: 'from-[#343840] to-[#1c1e22] border-[#4d535e]/70',
      cameraControlBorder: 'border-[#555b66]',
      accentGlow: 'from-slate-500/15 via-slate-800/10 to-transparent'
    },
    desert: {
      name: 'Desert Titanium',
      outerBand: 'from-[#4d4135] via-[#2f271f] to-[#1c1612]',
      rimBorder: 'border-[#7a6854]',
      specularRing: 'ring-1 ring-[#c7af93]/40',
      buttonBg: 'from-[#5e5040] to-[#3a3026] border-[#8a755f]/70',
      cameraControlBorder: 'border-[#b89e82]',
      accentGlow: 'from-amber-600/20 via-orange-950/10 to-transparent'
    },
    white: {
      name: 'White Titanium',
      outerBand: 'from-[#575a5e] via-[#35383c] to-[#1e2023]',
      rimBorder: 'border-[#949ba6]',
      specularRing: 'ring-1 ring-[#e2e8f0]/45',
      buttonBg: 'from-[#6c717a] to-[#42464d] border-[#a0a8b5]/70',
      cameraControlBorder: 'border-[#cbd5e1]',
      accentGlow: 'from-slate-300/25 via-slate-600/10 to-transparent'
    }
  }[titaniumFinish];

  // Curated popular destinations from actual app data
  const phoneFeaturedDestinations = POPULAR_DESTINATIONS.slice(0, 4);

  // Day timeline activities preview (reflects real active trip if present, or flexible template)
  const activeItineraryDays = (activeTrip?.itinerary && activeTrip.itinerary.length > 0)
    ? activeTrip.itinerary
    : null;

  interface PhonePreviewActivity {
    time: string;
    title: string;
    cat: string;
    cost: number;
    rating: number;
  }

  const currentActivities: PhonePreviewActivity[] = useMemo(() => {
    if (activeItineraryDays && activeItineraryDays[selectedDayIndex]) {
      return activeItineraryDays[selectedDayIndex].activities.map(a => ({
        time: a.time,
        title: a.title,
        cat: a.type === 'food' ? 'Dining' : a.type === 'attraction' ? 'Sight' : a.type === 'hotel' ? 'Stay' : 'Highlight',
        cost: a.estimatedCost,
        rating: 4.8
      }));
    }
    const fallbackDays: PhonePreviewActivity[][] = [
      [
        { time: 'Morning', title: 'Arrival & Scenic Exploration', cat: 'Explorer', cost: 400, rating: 4.8 },
        { time: 'Midday', title: 'Authentic Regional Dining', cat: 'Dining', cost: 550, rating: 4.9 },
        { time: 'Golden Hour', title: 'Iconic Sunset Vista & Photos', cat: 'Scenic', cost: 200, rating: 4.9 }
      ],
      [
        { time: 'Morning', title: 'Heritage Citadel & Architecture Walk', cat: 'Culture', cost: 300, rating: 4.8 },
        { time: 'Afternoon', title: 'Local Artisan Bazaar Exploration', cat: 'Shopping', cost: 450, rating: 4.7 },
        { time: 'Evening', title: 'Open-Air Starlight Courtyard Dinner', cat: 'Dining', cost: 650, rating: 4.9 }
      ],
      [
        { time: 'Morning', title: 'Botanical Gardens & Viewpoint', cat: 'Nature', cost: 150, rating: 4.6 },
        { time: 'Midday', title: 'Celebratory Farewell Lunch', cat: 'Dining', cost: 600, rating: 4.9 },
        { time: 'Evening', title: 'Scenic Return Transit Journey', cat: 'Transit', cost: 750, rating: 4.8 }
      ]
    ];
    return fallbackDays[selectedDayIndex] || fallbackDays[0];
  }, [activeItineraryDays, selectedDayIndex]);

  return (
    <div className="relative w-full max-w-[360px] sm:max-w-[380px] mx-auto select-none transition-all duration-300">
      
      {/* Ambient Radial Floor Glow (Symmetrical & Non-Rotated) */}
      <div 
        className={`absolute -inset-4 bg-gradient-to-tr ${finishStyles.accentGlow} rounded-[56px] blur-2xl -z-10 opacity-60 transition-all duration-500 pointer-events-none`}
      />

      {/* ============================================================== */}
      {/* PHYSICAL TITANIUM CHASSIS (Concentric 50px Continuous Curvature) */}
      {/* ============================================================== */}
      <div className={`relative bg-gradient-to-b ${finishStyles.outerBand} p-[4px] rounded-[50px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.12),0_10px_20px_rgba(0,0,0,0.5)] border-[2px] ${finishStyles.rimBorder} ${finishStyles.specularRing}`}>

        {/* --- Physical Buttons: Left Side --- */}
        {/* Action Button */}
        <button
          onClick={handleActionButton}
          title="Action Button: Toggle Silent Mode"
          className={`absolute -left-[5px] top-[86px] w-[3.5px] h-7 bg-gradient-to-r ${finishStyles.buttonBg} hover:brightness-125 active:scale-95 rounded-l-xs border-y border-l transition-all cursor-pointer shadow-xs`}
        />
        {/* Volume Up */}
        <button
          onClick={handleVolumeUp}
          title="Volume Up"
          className={`absolute -left-[5px] top-[128px] w-[3.5px] h-12 bg-gradient-to-r ${finishStyles.buttonBg} hover:brightness-125 active:scale-95 rounded-l-xs border-y border-l transition-all cursor-pointer shadow-xs`}
        />
        {/* Volume Down */}
        <button
          onClick={handleVolumeDown}
          title="Volume Down"
          className={`absolute -left-[5px] top-[188px] w-[3.5px] h-12 bg-gradient-to-r ${finishStyles.buttonBg} hover:brightness-125 active:scale-95 rounded-l-xs border-y border-l transition-all cursor-pointer shadow-xs`}
        />

        {/* --- Physical Buttons: Right Side --- */}
        {/* Side / Power Button */}
        <button
          onClick={handlePowerButton}
          title="Power Button: Lock/Unlock"
          className={`absolute -right-[5px] top-[132px] w-[3.5px] h-16 bg-gradient-to-l ${finishStyles.buttonBg} hover:brightness-125 active:scale-95 rounded-r-xs border-y border-r transition-all cursor-pointer shadow-xs`}
        />

        {/* Camera Control Button (Lower Right) */}
        <button
          onClick={handleCameraControlButton}
          title="Camera Control: Tactile Sapphire Sensor"
          className={`absolute -right-[4.5px] bottom-[110px] w-[3px] h-14 bg-gradient-to-l from-slate-900 to-slate-800 hover:brightness-125 active:scale-95 rounded-r-xs border-y border-r ${finishStyles.cameraControlBorder} transition-all cursor-pointer shadow-xs`}
        />

        {/* Top Micro-slit Earpiece Speaker */}
        <div className="absolute top-[2.5px] left-1/2 -translate-x-1/2 w-14 h-[2px] bg-[#0c0d10] rounded-full z-40 shadow-[inset_0_1px_1px_rgba(0,0,0,0.9)]" />

        {/* ============================================================== */}
        {/* ULTRA-THIN 1.15mm OLED DISPLAY (Concentric 46px Curvature)    */}
        {/* ============================================================== */}
        <div 
          className="relative rounded-[46px] overflow-hidden bg-white dark:bg-slate-950 border-[2px] border-black shadow-[inset_0_0_4px_rgba(0,0,0,0.9)] isolate"
          style={{ WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
        >

          {/* Glass Edge Sheen */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.08] z-30 rounded-[44px]" />

          {/* Flashlight Active Beam Simulation */}
          {flashlightOn && isLocked && (
            <div className="pointer-events-none absolute inset-0 bg-amber-100/10 mix-blend-screen z-20 animate-pulse" />
          )}

          {/* Camera Shutter Flash Effect */}
          {isCameraFlashing && (
            <div className="pointer-events-none absolute inset-0 bg-white z-50 animate-out fade-out duration-150" />
          )}

          {/* iOS Volume Slider HUD (Left Edge Overlay) */}
          {showVolumeHUD && (
            <div className="absolute left-2.5 top-36 z-40 bg-black/85 backdrop-blur-xl px-2 py-3 rounded-2xl border border-white/10 flex flex-col items-center gap-2 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
              <Volume2 className="w-3.5 h-3.5 text-white" />
              <div className="w-1.5 h-16 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end">
                <div style={{ height: `${volumeLevel}%` }} className="w-full bg-white rounded-full transition-all" />
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SCREEN STATE 1: LOCK SCREEN                                    */}
          {/* ============================================================== */}
          {isLocked ? (
            <div 
              className="relative h-[680px] flex flex-col justify-between p-6 text-white overflow-hidden bg-cover bg-center animate-in fade-in duration-300 font-sans"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80")'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/85" />

              {/* Status Bar */}
              <div className="relative z-10 flex items-center justify-between text-white pt-1">
                <span className="font-semibold text-[13px] tracking-tight drop-shadow-md">{currentTime}</span>
                <div className="flex items-center gap-1.5 drop-shadow-md">
                  <div className="flex items-end gap-[1.5px] h-2.5">
                    <span className="w-[2px] h-[3px] bg-white rounded-xs" />
                    <span className="w-[2px] h-[5px] bg-white rounded-xs" />
                    <span className="w-[2px] h-[7px] bg-white rounded-xs" />
                    <span className="w-[2px] h-[9px] bg-white rounded-xs" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider">5G</span>
                  <Wifi className="w-3 h-3 text-white" />
                  <div className="relative w-[18px] h-[9px] rounded-[3px] border border-white/90 p-[1px] flex items-center">
                    <div className="h-full w-[88%] bg-white rounded-[1px]" />
                    <div className="absolute -right-[2.5px] top-1/2 -translate-y-1/2 w-[1.5px] h-[3px] bg-white/90 rounded-r-[1px]" />
                  </div>
                </div>
              </div>

              {/* Dynamic Island (Compact Idle) */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[116px] h-[32px] bg-black rounded-full z-30 flex items-center justify-between px-2.5 shadow-xl border border-white/[0.08]">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0a0d16] border border-[#1e2538] flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 rounded-full bg-blue-500/50" />
                </div>
                <div className="w-2 h-2 rounded-full bg-[#050505] shrink-0" />
              </div>

              {/* Clock & Date */}
              <div className="relative z-10 text-center mt-10 space-y-0.5">
                <p className="text-[11px] font-semibold text-emerald-300 uppercase tracking-widest drop-shadow-md">
                  Saturday, September 26
                </p>
                <h1 className="text-7xl font-extralight tracking-tighter drop-shadow-2xl font-sans">
                  {currentTime}
                </h1>
              </div>

              {/* Lock Screen Live Activity Widget */}
              <div 
                onClick={() => setIsLocked(false)}
                className="relative z-10 bg-black/50 hover:bg-black/60 backdrop-blur-2xl border border-white/20 p-3.5 rounded-3xl shadow-2xl cursor-pointer transition-all active:scale-[0.98] space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>{t('Live GPS Guidance')}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {t('Active')}
                  </span>
                </div>
                <p className="text-xs font-bold text-white leading-tight">Ahmedabad → Udaipur Express Route</p>
                <p className="text-[11px] text-white/75">{t('Tap to open live journey HUD & highway stops')}</p>
              </div>

              {/* Bottom Quick Actions */}
              <div className="relative z-10 flex items-center justify-between px-3 pb-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('medium');
                    setFlashlightOn(prev => !prev);
                  }}
                  className={`w-11 h-11 rounded-full backdrop-blur-xl flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90 ${
                    flashlightOn ? 'bg-white text-black shadow-white/30' : 'bg-black/40 text-white border border-white/15'
                  }`}
                >
                  <Flashlight className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setIsLocked(false);
                    }}
                    className="text-[11px] font-semibold text-white/90 hover:text-emerald-300 transition-colors cursor-pointer drop-shadow-md"
                  >
                    {t('Swipe up to unlock')}
                  </button>
                  <div className="w-32 h-[4px] bg-white/80 rounded-full mx-auto mt-2 shadow-xs" />
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic('heavy');
                    setIsLocked(false);
                    setActiveScreen('camera');
                  }}
                  className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-white/15 flex items-center justify-center text-white transition-all cursor-pointer shadow-lg active:scale-90"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            // ==============================================================
            // SCREEN STATE 2: ACTUAL TRIPVERSE APPLICATION INTERFACE         
            // ==============================================================
            <div className="relative h-[680px] flex flex-col bg-[#F4F6F2] dark:bg-slate-950 text-[#152A1C] dark:text-slate-100 overflow-hidden font-sans">

              {/* Top Status Area Scrim */}
              <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/50 via-black/15 to-transparent pointer-events-none z-20" />

              {/* ============================================================ */}
              {/* STATUS BAR                                                   */}
              {/* ============================================================ */}
              <div className="relative z-30 px-6 pt-3 pb-1 flex items-center justify-between text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[12px] tracking-tight">{currentTime}</span>
                  <Navigation className="w-2.5 h-2.5 fill-white text-white rotate-45 opacity-90 ml-0.5" />
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-end gap-[1.5px] h-2.5">
                    <span className="w-[2.5px] h-[3px] bg-white rounded-xs" />
                    <span className="w-[2.5px] h-[5px] bg-white rounded-xs" />
                    <span className="w-[2.5px] h-[7px] bg-white rounded-xs" />
                    <span className="w-[2.5px] h-[9.5px] bg-white rounded-xs" />
                  </div>
                  <span className="text-[9px] font-black tracking-wider opacity-95">5G</span>
                  <Wifi className="w-3 h-3 text-white opacity-95" />
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold font-mono tracking-tight text-white opacity-95">88%</span>
                    <div className="relative w-[19px] h-[9.5px] rounded-[3px] border border-white/90 p-[1px] flex items-center">
                      <div className="h-full w-[88%] bg-white rounded-[1.5px]" />
                      <div className="absolute -right-[2.5px] top-1/2 -translate-y-1/2 w-[1.5px] h-[3.5px] bg-white/90 rounded-r-[1px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* DYNAMIC ISLAND PILL                                          */}
              {/* ============================================================ */}
              <div 
                onClick={() => {
                  triggerHaptic('light');
                  setIsDynamicIslandExpanded(prev => !prev);
                }}
                className={`absolute top-2.5 left-1/2 -translate-x-1/2 bg-black text-white rounded-full z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between cursor-pointer border border-white/[0.08] shadow-2xl ${
                  isDynamicIslandExpanded 
                    ? 'w-[328px] h-[74px] rounded-[38px] p-3.5' 
                    : 'w-[118px] h-[33px] px-2.5'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-[#0a0d16] border border-[#1e2538] flex items-center justify-center shrink-0 relative">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 relative">
                    <span className="w-0.5 h-0.5 rounded-full bg-white absolute top-0.5 right-0.5" />
                  </span>
                </div>

                {dynamicIslandNotification && !isDynamicIslandExpanded ? (
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-white px-1 animate-in fade-in">
                    {isSilentMode ? (
                      <BellOff className="w-3 h-3 text-rose-400 shrink-0" />
                    ) : (
                      <Bell className="w-3 h-3 text-emerald-400 shrink-0" />
                    )}
                    <span className="truncate">{dynamicIslandNotification}</span>
                  </div>
                ) : isDynamicIslandExpanded ? (
                  <div className="flex flex-col justify-between w-full ml-2 text-[10px] space-y-1 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span className="font-extrabold text-emerald-300">NH48 Highway Route</span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        18 min ETA
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/90 text-[11px] pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-semibold text-white">Exit in 1.4 km: Shamlaji Rest Stop</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">96 km/h</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full ml-1.5 pr-0.5">
                    <div className="flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400">
                      <span>12 km</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================ */}
              {/* ACTUAL TRIPVERSE APP HEADER BAR                              */}
              {/* ============================================================ */}
              {activeScreen !== 'camera' && (
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 pt-4 pb-2.5 border-b border-[#E2EBE1] dark:border-slate-800 flex items-center justify-between shrink-0 shadow-2xs z-10">
                  {/* TripVerse Actual Brand Logo */}
                  <div 
                    onClick={() => setActiveScreen('home')}
                    className="flex items-center gap-1.5 cursor-pointer notranslate"
                  >
                    <BrandIconMark className="w-5 h-5 shrink-0" idPrefix="phone-header" />
                    <img
                      src="/tripverse-title.png?v=17"
                      alt="TripVerse"
                      className="h-3.5 w-auto object-contain dark:hidden notranslate select-none pointer-events-none"
                      loading="eager"
                    />
                    <img
                      src="/tripverse-title-dark.png?v=17"
                      alt="TripVerse"
                      className="h-3.5 w-auto object-contain hidden dark:block notranslate select-none pointer-events-none"
                      loading="eager"
                    />
                  </div>

                  {/* Header Actions: Currency & Notifications */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#2D5A3D] dark:text-emerald-400 bg-[#EAF0E9] dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-[#8EA78D]/30 font-mono">
                      {currency}
                    </span>
                    <button 
                      onClick={() => setActiveScreen('chat')}
                      className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200 transition-colors relative"
                      title="AI Co-Pilot"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full absolute top-1 right-1" />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* APP CONTENT AREA                                             */}
              {/* ============================================================ */}
              <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col">

                {/* ---------------------------------------------------------- */}
                {/* 1. ACTUAL TRIPVERSE HOME & EXPLORE SCREEN                  */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'home' && (
                  <div className="flex-1 p-3.5 space-y-3.5 animate-in fade-in duration-200">
                    
                    {/* Quick Journey Planner Widget (Actual App Planner) */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-[#E2EBE1] dark:border-slate-800 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>{t('AI Journey Planner')}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">Instant AI</span>
                      </div>

                      {/* Destination Input Pill */}
                      <div className="flex items-center gap-2 bg-[#F4F6F2] dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-[#E2EBE1] dark:border-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                        <input
                          type="text"
                          value={quickDestination}
                          onChange={(e) => setQuickDestination(e.target.value)}
                          placeholder="Where do you want to go?"
                          className="bg-transparent text-xs font-bold text-slate-800 dark:text-white w-full focus:outline-none"
                        />
                      </div>

                      {/* Quick Filter Destination Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                        {['Udaipur', 'Goa', 'Manali', 'Kyoto', 'Paris'].map((city) => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setQuickDestination(city);
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                              quickDestination === city
                                ? 'bg-[#2D5A3D] text-white shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>

                      {/* Duration & Travelers Steppers */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#F4F6F2] dark:bg-slate-800/60 p-2 rounded-xl border border-[#E2EBE1] dark:border-slate-700 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-500">Days</span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <button
                              type="button"
                              onClick={() => setQuickDuration(prev => Math.max(1, prev - 1))}
                              className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs">{quickDuration}</span>
                            <button
                              type="button"
                              onClick={() => setQuickDuration(prev => Math.min(14, prev + 1))}
                              className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="bg-[#F4F6F2] dark:bg-slate-800/60 p-2 rounded-xl border border-[#E2EBE1] dark:border-slate-700 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-500">People</span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <button
                              type="button"
                              onClick={() => setQuickTravelers(prev => Math.max(1, prev - 1))}
                              className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-xs">{quickTravelers}</span>
                            <button
                              type="button"
                              onClick={() => setQuickTravelers(prev => Math.min(10, prev + 1))}
                              className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Primary Green Action Button */}
                      <button
                        type="button"
                        onClick={() => handleTriggerQuickPlan(quickDestination, quickDuration, quickTravelers, 8500)}
                        className="w-full py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-display font-extrabold text-xs shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{t('Draft a Trip Plan')}</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                      </button>
                    </div>

                    {/* Popular Curated Destinations (Actual App Gallery) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-0.5">
                        <span className="text-xs font-black font-display text-[#152A1C] dark:text-white">
                          Trending Destinations
                        </span>
                        <span className="text-[10px] font-bold text-[#2D5A3D] dark:text-emerald-400">
                          {phoneFeaturedDestinations.length} Curated
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {phoneFeaturedDestinations.map((dest) => (
                          <div
                            key={dest.id}
                            onClick={() => {
                              triggerHaptic('light');
                              handleTriggerQuickPlan(dest.name, 4, 2, dest.startBudget);
                            }}
                            className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-[#E2EBE1] dark:border-slate-800 shadow-2xs hover:border-[#2D5A3D] transition-all cursor-pointer group"
                          >
                            <div className="relative h-20 overflow-hidden">
                              <img
                                src={dest.image}
                                alt={dest.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                              <div className="absolute top-1.5 right-1.5 bg-black/50 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5 text-[9px] text-amber-300 font-bold">
                                <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                                <span>{dest.rating}</span>
                              </div>
                              <span className="absolute bottom-1.5 left-2 text-white font-extrabold text-xs drop-shadow-sm">
                                {dest.name}
                              </span>
                            </div>
                            <div className="p-2 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">From</span>
                              <span className="text-[11px] font-extrabold text-[#2D5A3D] dark:text-emerald-400 font-mono">
                                {formatCurrency(dest.startBudget, currency)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Highway Pitstops Highlight Banner */}
                    <div 
                      onClick={() => setActiveScreen('navigation')}
                      className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#2D5A3D] flex items-center justify-center text-white shrink-0">
                          <Fuel className="w-4 h-4 text-emerald-300" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-[#152A1C] dark:text-white leading-tight">Verified Highway Pitstops</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Clean washrooms, EV fast chargers & food</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                    </div>

                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 2. ACTUAL TRIPVERSE ITINERARY & TIMELINE VIEW               */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'itinerary' && (
                  <div className="flex-1 p-3.5 space-y-3 animate-in fade-in duration-200">
                    
                    {/* Itinerary Header Banner */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-[#E2EBE1] dark:border-slate-800 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                          {activeTrip ? 'Active Journey' : 'Featured Route'}
                        </span>
                        <span className="text-xs font-black text-[#2D5A3D] dark:text-emerald-400 font-mono">
                          {formatCurrency(activeTrip?.estimatedTotal || 8500, currency)}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-display font-black text-sm text-[#152A1C] dark:text-white">
                          {activeTrip ? activeTrip.destination : 'Udaipur Heritage & Lakes'}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {activeTrip ? activeTrip.origin : 'Ahmedabad'} → {activeTrip ? activeTrip.destination : 'Udaipur'} • 3 Days • 2 Travelers
                        </p>
                      </div>

                      {/* Quick Action Pills */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveScreen('navigation')}
                          className="flex-1 py-1.5 rounded-lg bg-[#2D5A3D] text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Live Route</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveScreen('bookings')}
                          className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Ticket className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Passes</span>
                        </button>
                      </div>
                    </div>

                    {/* Day Selection Tabs */}
                    <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-800/80 p-1 rounded-xl">
                      {(activeItineraryDays ? activeItineraryDays.map((_, idx) => `Day ${idx + 1}`) : ['Day 1', 'Day 2', 'Day 3']).map((day, idx) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setSelectedDayIndex(idx);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selectedDayIndex === idx
                              ? 'bg-white dark:bg-slate-900 text-[#2D5A3D] dark:text-emerald-400 shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>

                    {/* Timeline Activity Cards */}
                    <div className="space-y-2">
                      {currentActivities.map((act, i) => (
                        <div
                          key={i}
                          className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-[#E2EBE1] dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="font-mono font-semibold text-[#2D5A3D] dark:text-emerald-400">{act.time}</span>
                              <span>•</span>
                              <span>{act.cat}</span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate mt-0.5">
                              {act.title}
                            </p>
                          </div>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono shrink-0">
                            {formatCurrency(act.cost, currency)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Verified Pitstop Card */}
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-[#E2EBE1] dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                          <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Shamlaji Highway Plaza (NH48)</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                          ★ 4.8
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        EV Charger • Clean Washrooms • Pure Veg Dining
                      </p>
                    </div>

                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 3. ACTUAL LIVE ROUTE NAVIGATION GPS HUD                    */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'navigation' && (
                  <div className="flex-1 flex flex-col p-3.5 space-y-3 bg-slate-900 text-white animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                        <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Live Route Navigation</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        GPS Active
                      </span>
                    </div>

                    {/* Speedometer & Next Exit */}
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

                    {/* Turn-by-Turn Card */}
                    <div className="p-3.5 bg-emerald-950/70 rounded-2xl border border-emerald-500/40 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                        <span>Exit in 1.4 km: Shamlaji Rest Stop</span>
                      </div>
                      <p className="text-[11px] text-slate-300">NH48 Highway · Verified EV Fast Charger & Food</p>
                    </div>

                    {/* Route Progress Bar */}
                    <div className="p-3 bg-slate-800/80 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Ahmedabad</span>
                        <span className="text-emerald-400 font-bold">68% Done</span>
                        <span>Udaipur</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="w-[68%] h-full bg-emerald-400 rounded-full" />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveScreen('itinerary')}
                      className="mt-auto py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center cursor-pointer transition-colors"
                    >
                      ← Back to Itinerary
                    </button>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 4. ACTUAL CONCODE AI MINI CO-PILOT CHAT                    */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'chat' && (
                  <div className="flex-1 flex flex-col p-3 bg-white dark:bg-slate-900 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-[#2D5A3D] dark:text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>TripVerse AI Co-Pilot</span>
                      </div>
                      <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        Online
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
                      {miniChatMessages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-2xl text-[11px] leading-relaxed ${
                            m.sender === 'ai'
                              ? 'bg-[#EAF0E9] dark:bg-slate-800 text-[#152A1C] dark:text-slate-100 border border-[#8EA78D]/30'
                              : 'bg-[#2D5A3D] text-white ml-auto max-w-[85%]'
                          }`}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>

                    {/* Suggestions Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
                      {['Best cafes in Udaipur', 'Vegetarian highway food', 'Sunset spots'].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            setMiniChatInput(q);
                          }}
                          className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full whitespace-nowrap text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200"
                        >
                          {q}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleMiniChatSubmit} className="mt-1 flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <input
                        type="text"
                        placeholder="Ask AI inside phone..."
                        value={miniChatInput}
                        onChange={e => setMiniChatInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-700 border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        type="submit"
                        className="p-2 rounded-xl bg-[#2D5A3D] text-white hover:bg-[#244931] active:scale-95 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 5. ACTUAL TRIP PASSES & BOOKINGS VIEW                      */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'bookings' && (
                  <div className="flex-1 p-3.5 space-y-3 bg-[#F4F6F2] dark:bg-slate-950 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black font-display text-[#152A1C] dark:text-white">
                        Digital Passes & Tickets
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                        Confirmed
                      </span>
                    </div>

                    {/* Flight / Train Boarding Ticket */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-[#E2EBE1] dark:border-slate-800 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#2D5A3D] dark:text-emerald-400 font-mono">PNR: TV-849201</span>
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded">
                          Express Pass
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-black text-slate-800 dark:text-white font-display">AMD</p>
                          <p className="text-[10px] text-slate-400">Ahmedabad</p>
                        </div>
                        <div className="flex flex-col items-center gap-0.5 px-3">
                          <span className="text-[9px] text-slate-400 font-mono">3h 45m</span>
                          <div className="w-16 h-[1.5px] bg-emerald-400 rounded-full" />
                          <Navigation className="w-3 h-3 text-[#2D5A3D] rotate-90" />
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-slate-800 dark:text-white font-display">UDR</p>
                          <p className="text-[10px] text-slate-400">Udaipur</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div className="text-[10px] text-slate-500">
                          <p className="font-bold text-slate-800 dark:text-slate-200">Verified Traveler</p>
                          <p>Seat 14A • Class AC-1</p>
                        </div>
                        <QrCode className="w-7 h-7 text-slate-800 dark:text-white" />
                      </div>
                    </div>

                    {/* Verified Hotel Voucher */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 border border-[#E2EBE1] dark:border-slate-800 shadow-2xs space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800 dark:text-white">Lakeview Heritage Haveli</span>
                        <span className="text-emerald-600 font-mono font-bold">2 Nights</span>
                      </div>
                      <p className="text-[10px] text-slate-500">Deluxe Lakeview Suite • Breakfast Included</p>
                    </div>

                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 6. CAMERA VIEWFINDER (Camera Control)                      */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'camera' && (
                  <div className="flex-1 flex flex-col bg-black text-white animate-in fade-in duration-200 relative">
                    <div className="relative flex-1 overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" 
                        alt="Camera scene"
                        style={{
                          transform: `scale(${cameraZoom === 0.5 ? 0.9 : cameraZoom === 2 ? 1.4 : cameraZoom === 5 ? 2.1 : 1}) ${cameraLensFlipped ? 'scaleX(-1)' : ''}`,
                          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)'
                        }}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* 3x3 Grid */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div />
                      </div>

                      {/* Zoom Dials */}
                      <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-2 z-20">
                        <div className="bg-black/60 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/20 flex items-center gap-2 shadow-xl">
                          {[0.5, 1, 2, 5].map((zoom) => (
                            <button
                              key={zoom}
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setCameraZoom(zoom);
                              }}
                              className={`w-7 h-7 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer flex items-center justify-center ${
                                cameraZoom === zoom
                                  ? 'bg-amber-400 text-black shadow-md scale-110'
                                  : 'text-white/80 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              {zoom === 0.5 ? '.5' : `${zoom}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Camera Controls */}
                    <div className="bg-black px-6 py-4 flex items-center justify-between shrink-0 border-t border-white/10">
                      <button
                        onClick={() => setActiveScreen('home')}
                        className="w-10 h-10 rounded-xl overflow-hidden border border-white/30 cursor-pointer active:scale-95 transition-all shadow-md notranslate"
                        title="Return to TripVerse"
                      >
                        <img 
                          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=120&q=80" 
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </button>

                      <button
                        onClick={handleShutterClick}
                        className="w-16 h-16 rounded-full border-[3px] border-white p-1 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xl"
                        title="Capture Photo"
                      >
                        <div className="w-full h-full bg-white rounded-full active:bg-slate-300 transition-colors" />
                      </button>

                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          setCameraLensFlipped(prev => !prev);
                        }}
                        className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
                        title="Flip Camera Lens"
                      >
                        <RotateCw className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                )}

              </div>

              {/* ============================================================ */}
              {/* ACTUAL TRIPVERSE BOTTOM NAVIGATION BAR                       */}
              {/* ============================================================ */}
              {activeScreen !== 'camera' && (
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-[#E2EBE1] dark:border-slate-800 px-3 py-1 flex items-center justify-between shrink-0 shadow-lg z-10">
                  {/* Tab 1: Home */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveScreen('home');
                    }}
                    className={`flex flex-col items-center py-1 px-2 transition-all cursor-pointer ${
                      activeScreen === 'home' ? 'text-[#2D5A3D] dark:text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5">{t('Explore')}</span>
                    {activeScreen === 'home' && <span className="w-1 h-1 bg-[#2D5A3D] dark:bg-emerald-400 rounded-full mt-0.5" />}
                  </button>

                  {/* Tab 2: Itinerary */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveScreen('itinerary');
                    }}
                    className={`flex flex-col items-center py-1 px-2 transition-all cursor-pointer ${
                      activeScreen === 'itinerary' ? 'text-[#2D5A3D] dark:text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5">{t('Itinerary')}</span>
                    {activeScreen === 'itinerary' && <span className="w-1 h-1 bg-[#2D5A3D] dark:bg-emerald-400 rounded-full mt-0.5" />}
                  </button>

                  {/* Center Floating AI Plan Button */}
                  <button
                    type="button"
                    onClick={() => handleTriggerQuickPlan()}
                    className="relative -top-2 flex flex-col items-center justify-center cursor-pointer group active:scale-95"
                    title="Plan with AI"
                  >
                    <div className="w-10 h-10 rounded-full bg-trip-gradient flex items-center justify-center shadow-md shadow-emerald-700/30 border-2 border-white dark:border-slate-800 text-white">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>
                    <span className="text-[8px] font-extrabold text-[#2D5A3D] dark:text-emerald-400 mt-0.5">
                      AI Plan
                    </span>
                  </button>

                  {/* Tab 3: Bookings / Passes */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveScreen('bookings');
                    }}
                    className={`flex flex-col items-center py-1 px-2 transition-all cursor-pointer ${
                      activeScreen === 'bookings' ? 'text-[#2D5A3D] dark:text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Ticket className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5">Passes</span>
                    {activeScreen === 'bookings' && <span className="w-1 h-1 bg-[#2D5A3D] dark:bg-emerald-400 rounded-full mt-0.5" />}
                  </button>

                  {/* Tab 4: AI Co-Pilot */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveScreen('chat');
                    }}
                    className={`flex flex-col items-center py-1 px-2 transition-all cursor-pointer ${
                      activeScreen === 'chat' ? 'text-[#2D5A3D] dark:text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Bot className="w-4 h-4" />
                    <span className="text-[9px] mt-0.5">Co-Pilot</span>
                    {activeScreen === 'chat' && <span className="w-1 h-1 bg-[#2D5A3D] dark:bg-emerald-400 rounded-full mt-0.5" />}
                  </button>
                </div>
              )}

              {/* ============================================================ */}
              {/* iOS HOME INDICATOR BAR                                       */}
              {/* ============================================================ */}
              <div 
                onClick={() => {
                  triggerHaptic('light');
                  setActiveScreen('home');
                }}
                className={`py-1.5 flex justify-center cursor-pointer transition-colors ${
                  activeScreen === 'camera' || activeScreen === 'navigation' ? 'bg-black' : 'bg-white dark:bg-slate-900'
                }`}
                title="Tap to return Home"
              >
                <div className={`w-32 h-[4px] rounded-full transition-colors ${
                  activeScreen === 'camera' || activeScreen === 'navigation' ? 'bg-white/80' : 'bg-slate-900/80 dark:bg-white/80'
                }`} />
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ============================================================== */}
      {/* MINIMALIST HARDWARE CONTROLS                                   */}
      {/* ============================================================== */}
      <div className="mt-3 flex items-center justify-center gap-4 text-slate-500">
        {/* Minimalist interactive shortcuts */}
        <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-500">
          <button
            onClick={handleCameraControlButton}
            className="flex items-center gap-1 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <Camera className="w-3 h-3 text-emerald-600" />
            <span>Camera</span>
          </button>
          <span>•</span>
          <button
            onClick={handlePowerButton}
            className="hover:text-emerald-700 underline cursor-pointer"
          >
            {isLocked ? 'Unlock' : 'Lock'}
          </button>
        </div>
      </div>

    </div>
  );
};
