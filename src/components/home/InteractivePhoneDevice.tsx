import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import { Trip } from '../../types/trip';
import { formatCurrency, SupportedCurrency } from '../../services/currencyService';
import { triggerHaptic } from '../../services/deviceService';
import { queryConcodeBrain } from '../../services/concodeBrainService';
import { useLanguage } from '../../services/languageService';

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

type PhoneAppScreen = 'overview' | 'navigation' | 'itinerary' | 'assistant' | 'camera';
type TitaniumFinish = 'natural' | 'black' | 'desert' | 'white';

export const InteractivePhoneDevice: React.FC<InteractivePhoneDeviceProps> = ({
  currency,
  activeTrip,
  onQuickPlan
}) => {
  const { t } = useLanguage();

  const [activeScreen, setActiveScreen] = useState<PhoneAppScreen>('overview');
  const [isLocked, setIsLocked] = useState(false);
  const [isDynamicIslandExpanded, setIsDynamicIslandExpanded] = useState(false);
  const [dynamicIslandNotification, setDynamicIslandNotification] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState('9:41');
  const [miniChatInput, setMiniChatInput] = useState('');
  const [miniChatMessages, setMiniChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hello! I am your AI Travel Co-Pilot. Ask me about routes, highway break stops, hotel stays, or local food.' }
  ]);
  const [volumeLevel, setVolumeLevel] = useState(75);
  const [showVolumeHUD, setShowVolumeHUD] = useState(false);
  const [isSilentMode, setIsSilentMode] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  
  // iPhone 16 Pro Max Titanium Colorway Finish
  const [titaniumFinish, setTitaniumFinish] = useState<TitaniumFinish>('natural');

  // iPhone 16 Pro Max Camera Control State
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

  // iPhone 16 Pro Max Camera Control Click
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
    } catch {
      setMiniChatMessages(prev => [...prev, { sender: 'ai', text: 'ConCode AI Co-Pilot synchronized. How can I adjust your journey route?' }]);
    }
  };

  // Titanium Color Finish Styling Configs (iPhone 16 Pro Max Official Palette)
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

  return (
    <div className="relative w-full max-w-[360px] sm:max-w-[380px] mx-auto select-none transition-all duration-300">
      
      {/* Ambient Radial Floor Reflection */}
      <div 
        className={`absolute -inset-6 bg-gradient-to-tr ${finishStyles.accentGlow} rounded-[64px] blur-3xl -z-10 opacity-70 transform rotate-1 transition-all duration-500`}
      />

      {/* ============================================================== */}
      {/* iPHONE 16 PRO MAX PHYSICAL TITANIUM CHASSIS                    */}
      {/* ============================================================== */}
      <div className={`relative bg-gradient-to-b ${finishStyles.outerBand} p-[5px] rounded-[52px] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.14),0_12px_24px_rgba(0,0,0,0.6)] border-[2px] ${finishStyles.rimBorder} ${finishStyles.specularRing}`}>

        {/* --- Antenna Line Bands (Precision Apple RF Insets) --- */}
        {/* Left Edge Antenna Lines */}
        <div className="absolute -left-[2px] top-12 w-[2px] h-[3px] bg-slate-700/80 rounded-xs pointer-events-none" />
        <div className="absolute -left-[2px] bottom-16 w-[2px] h-[3px] bg-slate-700/80 rounded-xs pointer-events-none" />
        {/* Right Edge Antenna Lines */}
        <div className="absolute -right-[2px] top-12 w-[2px] h-[3px] bg-slate-700/80 rounded-xs pointer-events-none" />
        <div className="absolute -right-[2px] bottom-16 w-[2px] h-[3px] bg-slate-700/80 rounded-xs pointer-events-none" />

        {/* --- PHYSICAL BUTTONS: LEFT SIDE --- */}
        {/* 1. Action Button (Upper Left) */}
        <button
          onClick={handleActionButton}
          title="Action Button: Toggle Silent Mode / Dynamic Island Alert"
          className={`absolute -left-[6.5px] top-[90px] w-[4.5px] h-7 bg-gradient-to-r ${finishStyles.buttonBg} hover:brightness-125 active:scale-95 rounded-l-xs border-y border-l transition-all cursor-pointer shadow-xs`}
        />
        {/* 2. Volume Up Button */}
        <button
          onClick={handleVolumeUp}
          title="Volume Up"
          className={`absolute -left-[6.5px] top-[134px] w-[4.5px] h-12 bg-gradient-to-r ${finishStyles.buttonBg} hover:brightness-125 active:scale-95 rounded-l-xs border-y border-l transition-all cursor-pointer shadow-xs`}
        />
        {/* 3. Volume Down Button */}
        <button
          onClick={handleVolumeDown}
          title="Volume Down"
          className={`absolute -left-[6.5px] top-[196px] w-[4.5px] h-12 bg-gradient-to-r ${finishStyles.buttonBg} hover:brightness-125 active:scale-95 rounded-l-xs border-y border-l transition-all cursor-pointer shadow-xs`}
        />

        {/* --- PHYSICAL BUTTONS: RIGHT SIDE --- */}
        {/* 4. Side (Power / Siri) Button */}
        <button
          onClick={handlePowerButton}
          title="Side Button: Lock/Unlock Phone"
          className={`absolute -right-[6.5px] top-[138px] w-[4.5px] h-16 bg-gradient-to-l ${finishStyles.buttonBg} hover:brightness-125 active:scale-95 rounded-r-xs border-y border-r transition-all cursor-pointer shadow-xs`}
        />

        {/* 5. NEW iPhone 16 Pro Max Camera Control Button (Lower Right) */}
        <button
          onClick={handleCameraControlButton}
          title="Camera Control: Tactile Sapphire Sensor (iPhone 16 Pro Max exclusive)"
          className={`absolute -right-[5.5px] bottom-[115px] w-[3.5px] h-14 bg-gradient-to-l from-slate-900 to-slate-800 hover:brightness-125 active:scale-95 rounded-r-xs border-y border-r ${finishStyles.cameraControlBorder} transition-all cursor-pointer shadow-xs`}
        />

        {/* Top Micro-slit Earpiece Speaker */}
        <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-14 h-[2px] bg-[#0c0d10] rounded-full z-40 shadow-[inset_0_1px_1px_rgba(0,0,0,0.9)]" />

        {/* ============================================================== */}
        {/* BORDER REDUCTION STRUCTURE (1.15mm Ultra-Thin Display OLED)     */}
        {/* ============================================================== */}
        <div className="relative rounded-[48px] overflow-hidden bg-black border-[2.5px] border-black shadow-[inset_0_0_4px_rgba(0,0,0,0.9)]">

          {/* Ceramic Shield Glass Specular Edge Sheen */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.08] z-30 rounded-[46px]" />

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
          {/* SCREEN STATE 1: iOS 18 LOCK SCREEN                             */}
          {/* ============================================================== */}
          {isLocked ? (
            <div 
              className="relative h-[680px] flex flex-col justify-between p-6 text-white overflow-hidden bg-cover bg-center animate-in fade-in duration-300 font-sans"
              style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80")'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/85" />

              {/* iOS 18 Status Bar (Lock Screen) */}
              <div className="relative z-10 flex items-center justify-between text-white pt-1">
                <span className="font-semibold text-[13px] tracking-tight drop-shadow-md">{currentTime}</span>
                <div className="flex items-center gap-1.5 drop-shadow-md">
                  {/* Graduated 4-bar cellular signal */}
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

              {/* iOS 18 Centered Dynamic Island Pill (Compact Idle) */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[116px] h-[32px] bg-black rounded-full z-30 flex items-center justify-between px-2.5 shadow-xl border border-white/[0.08]">
                {/* Camera Lens */}
                <div className="w-2.5 h-2.5 rounded-full bg-[#0a0d16] border border-[#1e2538] flex items-center justify-center shrink-0">
                  <span className="w-1 h-1 rounded-full bg-blue-500/50" />
                </div>
                {/* FaceID Sensor */}
                <div className="w-2 h-2 rounded-full bg-[#050505] shrink-0" />
              </div>

              {/* iOS 18 Depth Effect Clock & Date */}
              <div className="relative z-10 text-center mt-10 space-y-0.5">
                <p className="text-[11px] font-semibold text-emerald-300 uppercase tracking-widest drop-shadow-md">
                  Saturday, September 26
                </p>
                <h1 className="text-7xl font-extralight tracking-tighter drop-shadow-2xl font-sans">
                  {currentTime}
                </h1>
              </div>

              {/* Live Activity Lock Screen Widget */}
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

              {/* Bottom Quick Actions (Flashlight & Camera) */}
              <div className="relative z-10 flex items-center justify-between px-3 pb-2">
                {/* Flashlight Button */}
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

                {/* Home Indicator Swipe Prompt */}
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

                {/* Camera Quick Button */}
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
            // SCREEN STATE 2: ACTIVE iOS 18 SMARTPHONE APPLICATION           
            // ==============================================================
            <div className="relative h-[680px] flex flex-col bg-slate-50 text-slate-900 overflow-hidden font-sans">

              {/* Status Bar Backdrop Scrim Gradient for 100% Contrast */}
              <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none z-20" />

              {/* ============================================================ */}
              {/* iOS 18 STATUS BAR (Left Time, Right 5G / Signal / Battery)   */}
              {/* ============================================================ */}
              <div className="relative z-30 px-6 pt-3 pb-1 flex items-center justify-between text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {/* Left Side: Time & Location Indicator */}
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[12px] tracking-tight">{currentTime}</span>
                  <Navigation className="w-2.5 h-2.5 fill-white text-white rotate-45 opacity-90 ml-0.5" />
                </div>

                {/* Right Side: Graduated Signal Bars, 5G, Wi-Fi, Precision Battery */}
                <div className="flex items-center gap-1.5">
                  {/* Graduated 4-bar cellular signal */}
                  <div className="flex items-end gap-[1.5px] h-2.5" title="Cellular 5G (4 bars)">
                    <span className="w-[2.5px] h-[3px] bg-white rounded-xs" />
                    <span className="w-[2.5px] h-[5px] bg-white rounded-xs" />
                    <span className="w-[2.5px] h-[7px] bg-white rounded-xs" />
                    <span className="w-[2.5px] h-[9.5px] bg-white rounded-xs" />
                  </div>
                  <span className="text-[9px] font-black tracking-wider opacity-95">5G</span>
                  <Wifi className="w-3 h-3 text-white opacity-95" />
                  {/* Precision iOS Battery Capsule */}
                  <div className="flex items-center gap-1" title="Battery 88%">
                    <span className="text-[9px] font-bold font-mono tracking-tight text-white opacity-95">88%</span>
                    <div className="relative w-[19px] h-[9.5px] rounded-[3px] border border-white/90 p-[1px] flex items-center">
                      <div className="h-full w-[88%] bg-white rounded-[1.5px]" />
                      <div className="absolute -right-[2.5px] top-1/2 -translate-y-1/2 w-[1.5px] h-[3.5px] bg-white/90 rounded-r-[1px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================ */}
              {/* REAL APPLE DYNAMIC ISLAND PILL (iOS 18 Specification)         */}
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
                {/* Hardware TrueDepth Camera Lens with Multi-Coated Sapphire Reflection */}
                <div className="w-3 h-3 rounded-full bg-[#0a0d16] border border-[#1b2234] flex items-center justify-center shrink-0 relative">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 relative">
                    <span className="w-0.5 h-0.5 rounded-full bg-white absolute top-0.5 right-0.5" />
                  </span>
                </div>

                {/* State A: Action Button Notification Overlay */}
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
                  /* State B: Expanded Live Activity Card (Turn-by-Turn Route Guidance) */
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
                  /* State C: Compact Live Activity Wings (Sleek Apple Pro Style) */
                  <div className="flex items-center justify-between w-full ml-1.5 pr-0.5">
                    {/* Compact Left Wing Indicator */}
                    <div className="flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                    </div>
                    {/* Compact Right Wing Indicator */}
                    <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-400">
                      <span>12 km</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================ */}
              {/* PHONE APPLICATION CONTENT AREA                               */}
              {/* ============================================================ */}
              <div className="flex-1 overflow-y-auto scrollbar-none flex flex-col">

                {/* ---------------------------------------------------------- */}
                {/* VIEW 1: OVERVIEW (Matching exact photo requested by user)   */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'overview' && (
                  <div className="flex-1 flex flex-col animate-in fade-in duration-200">
                    
                    {/* Scenic Mountain Lake Hero Image Header */}
                    <div className="relative h-64 shrink-0 overflow-hidden -mt-10">
                      <img
                        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                        alt="Scenic travel mountain landscape"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/45 to-transparent" />

                      {/* Header Brand Tag with Strict Invariance Protection */}
                      <div className="absolute top-14 left-4 z-10">
                        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg border border-white/40">
                          <span className="font-display font-black text-xs text-[#152A1C] notranslate">
                            Trip<span className="text-[#2D5A3D]">Verse</span>
                          </span>
                        </div>
                      </div>

                      {/* Title & Tagline inside picture */}
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>{t('AI Journey Planner')}</span>
                        </p>
                        <h3 className="text-xl font-black leading-tight font-display mt-0.5 drop-shadow-md">
                          {t('Your Next Adventure Awaits')}
                        </h3>
                        <p className="text-[11px] text-slate-200 mt-0.5 font-medium">
                          {t('Best stays, food & break stops within budget.')}
                        </p>
                      </div>
                    </div>

                    {/* Content Cards Container */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        
                        {/* Card 1: Route & Price Pill */}
                        <div className="p-4 bg-white rounded-2xl border border-[#E2EBE1] shadow-xs space-y-2 hover:border-[#2D5A3D] transition-colors">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="font-extrabold text-slate-900 text-sm font-display truncate">
                              {activeTrip ? `${activeTrip.origin.split(',')[0]} → ${activeTrip.destination.split(',')[0]}` : t('Configure Your Journey')}
                            </span>
                            {activeTrip ? (
                              <span className="font-black text-[#2D5A3D] bg-[#EAF0E9] px-2.5 py-1 rounded-full text-xs font-display shrink-0 border border-[#8EA78D]/40">
                                {formatCurrency(activeTrip.estimatedTotal || activeTrip.totalBudget, currency)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                {t('Ready')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            {activeTrip ? (
                              <>
                                <span>{activeTrip.durationDays} {t('Days')}</span>
                                <span>•</span>
                                <span>{activeTrip.travelersCount} {t('Travelers')}</span>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold bg-emerald-50/60 px-1.5 py-0.2 rounded">{t('Real Stored Plan')}</span>
                              </>
                            ) : (
                              <span>{t('Set your destination and budget to activate your HUD')}</span>
                            )}
                          </div>
                        </div>

                        {/* Card 2: Recommended Highway Stop Pill */}
                        {activeTrip && activeTrip.breakStops && activeTrip.breakStops.length > 0 ? (
                          <div 
                            onClick={() => setActiveScreen('navigation')}
                            className="p-3.5 bg-emerald-50/80 hover:bg-emerald-100/70 rounded-2xl border border-emerald-200 flex items-center justify-between gap-2 cursor-pointer transition-all shadow-2xs"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                              <span className="font-bold text-slate-800 text-xs truncate">
                                {t('Stop')}: {activeTrip.breakStops[0].name}
                              </span>
                            </div>
                            <span className="text-[11px] font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs shrink-0">
                              {t('Listing')}
                            </span>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-slate-100/80 rounded-2xl border border-slate-200 flex items-center gap-2.5 text-slate-600 text-xs">
                            <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{t('Select origin & destination to load verified highway stops')}</span>
                          </div>
                        )}

                      </div>

                      {/* Primary Green CTA Button */}
                      <button
                        onClick={() => onQuickPlan({
                          destination: activeTrip?.destination || 'Udaipur',
                          duration: activeTrip?.durationDays || 3,
                          travelers: activeTrip?.travelersCount || 2,
                          budget: activeTrip?.totalBudget || 8000,
                          budgetMode: 'total'
                        })}
                        className="w-full py-4 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-display font-extrabold text-sm shadow-md hover:shadow-lg hover:shadow-emerald-500/25 text-center active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                        <span>{activeTrip ? t('View Active Journey Plan') : t('Draft a Trip Plan')}</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </button>

                    </div>

                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* VIEW 2: LIVE ROUTE NAVIGATION GPS HUD                      */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'navigation' && (
                  <div className="flex-1 flex flex-col p-4 space-y-3.5 bg-slate-900 text-white animate-in fade-in duration-200 pt-10">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                        <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>{t('Live Route Navigation')}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                        {t('GPS Active')}
                      </span>
                    </div>

                    {/* Speedometer & Next Exit Distance */}
                    <div className="grid grid-cols-2 gap-2.5 text-center">
                      <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('Speed')}</span>
                        <p className="text-3xl font-black font-display text-emerald-400">96</p>
                        <span className="text-[10px] text-slate-400 font-mono">km/h</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-800 border border-slate-700">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{t('Next Exit')}</span>
                        <p className="text-3xl font-black font-display text-sky-400">12</p>
                        <span className="text-[10px] text-slate-400 font-mono">{t('km away')}</span>
                      </div>
                    </div>

                    {/* Next Turn Instruction Card */}
                    <div className="p-3.5 bg-emerald-950/60 rounded-2xl border border-emerald-500/40 text-xs space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-emerald-300">
                        <ArrowRight className="w-4 h-4" />
                        <span>Exit in 1.4 km: Shamlaji Food Court</span>
                      </div>
                      <p className="text-[11px] text-slate-300">Verified rest stop · refueling & food facilities active.</p>
                    </div>

                    <button
                      onClick={() => setActiveScreen('overview')}
                      className="mt-auto py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center cursor-pointer transition-colors"
                    >
                      ← {t('Back to Journey Card')}
                    </button>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* VIEW 3: DAY-WISE ITINERARY HIGHLIGHTS                      */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'itinerary' && (
                  <div className="flex-1 flex flex-col p-4 space-y-3 animate-in fade-in duration-200 pt-10">
                    <div className="flex items-center justify-between border-b border-[#E2EBE1] pb-2.5">
                      <h4 className="font-extrabold text-xs text-[#152A1C] font-display">Udaipur 3-Day Highlights</h4>
                      <span className="text-[10px] font-bold text-[#2D5A3D] bg-[#EAF0E9] px-2 py-0.5 rounded">
                        Live Schedule
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-[#E2EBE1] shadow-2xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Day 1: Lake Pichola Sunset</span>
                          <span className="text-emerald-600 font-mono">₹2,800</span>
                        </div>
                        <p className="text-[11px] text-slate-500">City Palace boat cruise & rooftop Mewari dinner.</p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Day 2: Royal Heritage Trail</span>
                          <span className="text-emerald-600 font-mono">₹3,200</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Jagdish Temple, Saheliyon Ki Bari & artisan shopping.</p>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Day 3: Sajjangarh Viewpoint</span>
                          <span className="text-emerald-600 font-mono">₹1,850</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Monsoon Palace panoramic overlook & return drive.</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveScreen('overview')}
                      className="mt-auto py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs text-center cursor-pointer transition-colors"
                    >
                      ← {t('Back to Overview')}
                    </button>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* VIEW 4: CONCODE AI MINI CO-PILOT ASSISTANT                 */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'assistant' && (
                  <div className="flex-1 flex flex-col p-4 bg-white animate-in fade-in duration-200 pt-10">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-purple-700">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>{t('ConCode AI Mini Co-Pilot')}</span>
                      </div>
                      <span className="text-[9px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                        {t('Online')}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 text-xs pr-1">
                      {miniChatMessages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl text-[11px] leading-relaxed ${
                            m.sender === 'ai'
                              ? 'bg-purple-50 text-purple-950 border border-purple-100'
                              : 'bg-emerald-600 text-white ml-auto max-w-[85%]'
                          }`}
                        >
                          {m.text}
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleMiniChatSubmit} className="mt-2.5 flex items-center gap-1.5 pt-2.5 border-t border-slate-100">
                      <input
                        type="text"
                        placeholder={t('Ask AI inside phone...')}
                        value={miniChatInput}
                        onChange={e => setMiniChatInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-100 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-purple-300 border border-slate-200"
                      />
                      <button
                        type="submit"
                        className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 active:scale-95 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* VIEW 5: iPHONE 16 PRO MAX REALISTIC CAMERA & CONTROL HUD    */}
                {/* ---------------------------------------------------------- */}
                {activeScreen === 'camera' && (
                  <div className="flex-1 flex flex-col bg-black text-white animate-in fade-in duration-200 relative pt-10">
                    
                    {/* Camera Viewfinder Scene with Framing Grid */}
                    <div className="relative flex-1 overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80" 
                        alt="Camera viewfinder scene"
                        style={{
                          transform: `scale(${cameraZoom === 0.5 ? 0.9 : cameraZoom === 2 ? 1.4 : cameraZoom === 5 ? 2.1 : 1}) ${cameraLensFlipped ? 'scaleX(-1)' : ''}`,
                          transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)'
                        }}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* iOS Camera 3x3 Composition Grid Overlay */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-r border-b border-white" />
                        <div className="border-b border-white" />
                        <div className="border-r border-white" />
                        <div className="border-r border-white" />
                        <div />
                      </div>

                      {/* iPhone 16 Pro Max Camera Control Optical Zoom Dial */}
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

                    {/* Camera Control Bottom Controls Bar */}
                    <div className="bg-black px-6 py-4 flex items-center justify-between shrink-0 border-t border-white/10">
                      {/* Photo Thumbnail */}
                      <button
                        onClick={() => setActiveScreen('overview')}
                        className="w-10 h-10 rounded-xl overflow-hidden border border-white/30 cursor-pointer active:scale-95 transition-all shadow-md"
                        title="Return to TripVerse"
                      >
                        <img 
                          src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=120&q=80" 
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </button>

                      {/* Authentic iOS Shutter Button */}
                      <button
                        onClick={handleShutterClick}
                        className="w-16 h-16 rounded-full border-[3px] border-white p-1 flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-xl"
                        title="Capture Photo"
                      >
                        <div className="w-full h-full bg-white rounded-full active:bg-slate-300 transition-colors" />
                      </button>

                      {/* Lens Flip Button */}
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
              {/* FUNCTIONAL PHONE BOTTOM NAVIGATION BAR                       */}
              {/* ============================================================ */}
              {activeScreen !== 'camera' && (
                <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-lg">
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
                    <span className="text-[9px] font-bold">{t('Trip')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveScreen('navigation');
                    }}
                    className={`flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                      activeScreen === 'navigation' ? 'text-cyan-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Illustrative directions screen"
                  >
                    <Navigation className="w-4 h-4" />
                    <span className="text-[9px] font-bold">{t('Directions demo')}</span>
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
                    <span className="text-[9px] font-bold">{t('Days')}</span>
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
                    <span className="text-[9px] font-bold">{t('AI Chat')}</span>
                  </button>
                </div>
              )}

              {/* ============================================================ */}
              {/* REALISTIC iOS HOME INDICATOR BAR                             */}
              {/* ============================================================ */}
              <div 
                onClick={() => {
                  triggerHaptic('light');
                  setActiveScreen('overview');
                }}
                className={`py-2 flex justify-center cursor-pointer transition-colors ${
                  activeScreen === 'camera' || activeScreen === 'navigation' ? 'bg-black' : 'bg-white'
                }`}
                title="Home Indicator: Tap to return Home"
              >
                <div className={`w-32 h-[4px] rounded-full transition-colors ${
                  activeScreen === 'camera' || activeScreen === 'navigation' ? 'bg-white/80' : 'bg-slate-900/80'
                }`} />
              </div>

            </div>
          )}

        </div>

      </div>

      {/* ============================================================== */}
      {/* iPHONE 16 PRO MAX COLOR FINISH & INTERACTION CONTROL DECK      */}
      {/* ============================================================== */}
      <div className="mt-4 flex flex-col items-center gap-2">
        {/* Titanium Finish Swatches */}
        <div className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mr-1">
            iPhone 16 Pro Max
          </span>
          {(['natural', 'black', 'desert', 'white'] as TitaniumFinish[]).map((finish) => {
            const colors = {
              natural: 'bg-[#a39b91]',
              black: 'bg-[#282a2d]',
              desert: 'bg-[#c7af93]',
              white: 'bg-[#e2e8f0]'
            };
            const labels = {
              natural: 'Natural Titanium',
              black: 'Black Titanium',
              desert: 'Desert Titanium',
              white: 'White Titanium'
            };
            return (
              <button
                key={finish}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setTitaniumFinish(finish);
                }}
                title={labels[finish]}
                className={`w-4 h-4 rounded-full ${colors[finish]} border border-slate-400/60 transition-all cursor-pointer ${
                  titaniumFinish === finish ? 'ring-2 ring-emerald-500 scale-125' : 'opacity-70 hover:opacity-100'
                }`}
              />
            );
          })}
        </div>

        {/* Interactive Device Hardware Shortcuts */}
        <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-slate-500 text-center flex-wrap">
          <button
            onClick={handleCameraControlButton}
            className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <Camera className="w-3 h-3 text-emerald-600" />
            <span>{t('Camera Control')}</span>
          </button>
          <span>•</span>
          <button
            onClick={handleActionButton}
            className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            <span>{t('Action Button')}</span>
          </button>
          <span>•</span>
          <button
            onClick={handlePowerButton}
            className="text-slate-600 hover:text-emerald-700 underline cursor-pointer"
          >
            {isLocked ? t('Tap to Unlock') : t('Lock Screen')}
          </button>
        </div>
      </div>

    </div>
  );
};
