import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Compass, ShieldCheck, Plane, Check } from 'lucide-react';
import { getDeviceInfo, triggerHaptic } from '../../services/deviceService';
import { BrandIconMark } from './Logo';

export type SplashPlatform = 'ios' | 'android';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDuration?: number; // duration in ms (default ~2000ms)
  initialPlatform?: SplashPlatform;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onFinish,
  minDuration = 2000,
  initialPlatform
}) => {
  const [phase, setPhase] = useState<'enter' | 'ready' | 'exit'>('enter');
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Initializing travel engine...');
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);
  
  // Platform selection: detect real device, allow explicit override via prop or URL query param
  const [activePlatform, setActivePlatform] = useState<SplashPlatform>(() => {
    if (initialPlatform) return initialPlatform;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const forced = params.get('platform') || params.get('os');
      if (forced === 'ios' || forced === 'iphone') return 'ios';
      if (forced === 'android') return 'android';
    }
    const info = getDeviceInfo();
    return info.platform === 'ios' ? 'ios' : 'android';
  });

  useEffect(() => {
    // Listen for custom replay events that may specify platform
    const handleReplayEvent = (e: any) => {
      if (e.detail?.platform) {
        setActivePlatform(e.detail.platform);
      }
    };
    window.addEventListener('tripverse-show-splash', handleReplayEvent);
    return () => window.removeEventListener('tripverse-show-splash', handleReplayEvent);
  }, []);

  useEffect(() => {
    // Trigger initial subtle haptic
    triggerHaptic('light');

    // Progress bar animation timeline
    const startTime = performance.now();
    let animationFrameId: number;
    let exitTimer: any = null;
    let finishTimer: any = null;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / (minDuration - 350)) * 100));
      setProgress(pct);

      if (elapsed > 400 && elapsed < 900) {
        setStatusText(activePlatform === 'ios' ? 'Connecting to Apple CoreLocation & Routes...' : 'Syncing Google Play Services & Navigation...');
      } else if (elapsed >= 900 && elapsed < 1450) {
        setStatusText('Mapping verified highway food & fuel stops...');
      } else if (elapsed >= 1450) {
        setStatusText('Ready for takeoff!');
      }

      if (elapsed < minDuration - 250) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        setPhase('ready');
        triggerHaptic('success');

        // Smooth exit phase
        exitTimer = setTimeout(() => {
          setPhase('exit');
          finishTimer = setTimeout(() => {
            if (onFinishRef.current) onFinishRef.current();
          }, 380);
        }, 220);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (exitTimer) clearTimeout(exitTimer);
      if (finishTimer) clearTimeout(finishTimer);
    };
  }, [minDuration, activePlatform]);

  const handleSkip = (e: React.MouseEvent) => {
    // Don't skip if clicking platform toggle
    if ((e.target as HTMLElement).closest('.splash-platform-toggle')) return;
    
    triggerHaptic('light');
    setPhase('exit');
    setTimeout(() => {
      if (onFinishRef.current) onFinishRef.current();
    }, 280);
  };

  const isIos = activePlatform === 'ios';

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between select-none cursor-pointer overflow-hidden transition-all duration-[350ms] ease-out ${
        phase === 'exit'
          ? isIos
            ? 'opacity-0 scale-110 pointer-events-none'
            : 'opacity-0 scale-95 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
      style={{
        background: isIos
          ? 'radial-gradient(140% 110% at 50% 10%, #113868 0%, #0B2545 55%, #051429 100%)'
          : 'radial-gradient(130% 100% at 50% 12%, #0E3E61 0%, #08213D 50%, #041224 100%)'
      }}
      role="dialog"
      aria-label={`TripVerse Opening Animation (${isIos ? 'iPhone iOS' : 'Android'})`}
    >
      {/* 1. Atmospheric Ambient Lighting & Particle Dust */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Pulsing Aurora Core */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 rounded-full blur-[90px] transition-all duration-700 ${
            isIos ? 'bg-emerald-500/25 animate-pulse' : 'bg-teal-400/25 animate-pulse'
          }`}
        />
        
        {/* Secondary Bloom */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-cyan-400/15 blur-[75px]" />

        {/* Ambient Grid / Particle Accent */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Android Material Ripple Wave */}
        {!isIos && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full border border-emerald-400/20 animate-ping [animation-duration:3s]" />
        )}
      </div>

      {/* 2. Top Header & Device Status Simulation with Liquid Pill Capsule */}
      <div className="w-full pt-4 sm:pt-6 px-5 flex items-center justify-between z-20">
        {/* Dynamic Island Liquid Capsule - Premium Experience for both iOS and Android */}
        <div className="px-4 py-1.5 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl shadow-lg flex items-center gap-2.5 transition-transform duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          <span className="text-[11px] font-semibold text-white/95 tracking-tight flex items-center gap-1">
            <span>TripVerse Live Activity</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-medium">GPS Ready</span>
        </div>

        {/* Right Controls: Platform Mode Switcher & Skip Hint */}
        <div className="flex items-center gap-2.5">
          <div className="splash-platform-toggle flex items-center bg-black/40 border border-white/15 rounded-full p-0.5 backdrop-blur-md text-[10px] font-semibold">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePlatform('ios');
                triggerHaptic('light');
              }}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                isIos
                  ? 'bg-white/25 text-white shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Preview iOS Opening Experience"
            >
               iOS
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePlatform('android');
                triggerHaptic('light');
              }}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                !isIos
                  ? 'bg-emerald-500/35 text-emerald-300 shadow-xs font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Preview Android Opening Experience"
            >
              🤖 Android
            </button>
          </div>

          <span className="text-[11px] font-medium text-slate-400/80 hover:text-slate-200 transition-colors">
            Tap to skip
          </span>
        </div>
      </div>

      {/* 3. Center Cinematic Logo Mark & Brand Presentation */}
      <div className="flex flex-col items-center justify-center z-10 px-4 text-center my-auto">
        {/* Logo Mark Container with Native Style */}
        <div className="relative mb-6 group">
          {/* Subtle Outer Glow */}
          <div className="absolute -inset-4 rounded-3xl blur-2xl transition-all duration-700 bg-gradient-to-tr from-emerald-500/35 via-teal-400/25 to-cyan-400/20" />

          {/* Elevated Brand Mark Plate (Cupertino Liquid Glass for all platforms) */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 p-5 sm:p-6 flex items-center justify-center transition-all duration-500 group-hover:scale-105 rounded-[32px] bg-gradient-to-b from-white/20 via-white/10 to-white/5 backdrop-blur-2xl border border-white/35 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1.5px_1.5px_rgba(255,255,255,0.45)]">
            {/* The Authentic Exact Brand Mark - Razor-sharp pure vector */}
            <BrandIconMark className="w-full h-full" idPrefix="splash" />
          </div>

          {/* Micro Flight Accent Badge */}
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full shadow-lg flex items-center justify-center border-2 bg-gradient-to-tr from-emerald-500 to-teal-400 border-[#0B2545]">
            <Sparkles className="w-3.5 h-3.5 text-white animate-spin [animation-duration:8s]" />
          </div>
        </div>

        {/* Typography: "TripVerse" */}
        <div className="flex items-center justify-center tracking-tight font-black text-3xl sm:text-4xl text-white drop-shadow-md">
          <span className="text-white">Trip</span>
          <span className="text-[#00D287] ml-0.5">Verse</span>
        </div>

        {/* Tagline & Native Subtitle */}
        <p className="text-xs sm:text-sm font-semibold text-slate-300 mt-1 tracking-wide">
          Plan Smarter. Travel Further.
        </p>

        <div className="mt-1 text-[11px] font-bold text-emerald-400/90 tracking-wider uppercase flex items-center gap-1.5 justify-center">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>{isIos ? ' Optimized for iOS & iPadOS' : '🤖 Optimized for Android • Liquid Native UI'}</span>
        </div>

        {/* Feature Badges with Soft Stagger */}
        <div className="flex items-center gap-2 mt-4 text-[11px] font-medium text-slate-300/85">
          <span className="flex items-center gap-1 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
            <Compass className="w-3 h-3 text-emerald-400" /> Smart Routes
          </span>
          <span className="text-slate-500">•</span>
          <span className="flex items-center gap-1 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
            <Plane className="w-3 h-3 text-teal-400" /> Highway Breaks
          </span>
          <span className="text-slate-500">•</span>
          <span className="flex items-center gap-1 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
            <ShieldCheck className="w-3 h-3 text-emerald-400" /> Offline Ready
          </span>
        </div>
      </div>

      {/* 4. Bottom Native Loading Bar & Native Safe Area Bars */}
      <div className="w-full max-w-xs sm:max-w-sm px-6 pb-6 sm:pb-8 z-10 flex flex-col items-center">
        {/* Dynamic Status message */}
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-300 tracking-wide text-center">
          {progress >= 100 ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <Check className="w-3.5 h-3.5" /> Ready for takeoff!
            </span>
          ) : (
            <span className="animate-pulse">{statusText}</span>
          )}
        </div>

        {/* Progress Track (Universal Liquid Pill Bar with Glow) */}
        <div className="w-full h-2 bg-white/15 rounded-full border border-white/20 p-0.5 backdrop-blur-md overflow-hidden shadow-inner transition-all">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 transition-all duration-150 ease-out shadow-[0_0_14px_rgba(0,210,135,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Floating Safe-Area Gesture Pill Bar */}
        <div className="mt-6 flex flex-col items-center">
          <div className="w-36 h-1 rounded-full bg-white/40 shadow-sm" />
          <span className="text-[10px] font-medium text-slate-400/80 mt-2 tracking-widest uppercase">
            Swipe up or tap to enter
          </span>
        </div>
      </div>
    </div>
  );
};

