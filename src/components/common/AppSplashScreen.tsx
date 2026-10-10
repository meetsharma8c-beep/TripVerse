import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { triggerHaptic, hideNativeSplashScreen } from '../../services/deviceService';
import { BrandIconMark } from './Logo';

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDuration?: number;
  initialPlatform?: 'ios' | 'android';
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onFinish,
  minDuration = 800
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // 1. Light tactile feedback on launch
    triggerHaptic('light');

    // 2. Smoothly dissolve native Capacitor splash screen into web splash
    hideNativeSplashScreen(300);

    const timer = setTimeout(() => {
      setIsExiting(true);
      hideNativeSplashScreen(350);

      const finishTimer = setTimeout(() => {
        if (onFinishRef.current) onFinishRef.current();
      }, 380);

      return () => clearTimeout(finishTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration]);

  const handleDismiss = () => {
    if (isExiting) return;
    triggerHaptic('light');
    setIsExiting(true);
    hideNativeSplashScreen(300);
    setTimeout(() => {
      if (onFinishRef.current) onFinishRef.current();
    }, 320);
  };

  const isDarkMode = typeof document !== 'undefined' && (
    document.documentElement.classList.contains('dark') ||
    (() => {
      try {
        return localStorage.getItem('tripverse_theme') === 'dark';
      } catch {
        return false;
      }
    })()
  );

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer overflow-hidden transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting
          ? 'opacity-0 scale-105 blur-[10px] pointer-events-none'
          : 'opacity-100 scale-100 blur-0'
      }`}
      style={{
        background: isDarkMode ? '#070C16' : '#FFFFFF',
        willChange: 'transform, opacity, filter',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
      role="dialog"
      aria-label="TripVerse Opening"
    >
      {/* 1. Subtle, Warm Luxury Emerald Ambient Bloom */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className="w-[380px] sm:w-[480px] h-[380px] sm:h-[480px] rounded-full blur-[70px] animate-[tvAuraBreath_2.4s_ease-in-out_infinite]"
          style={{
            background: isDarkMode
              ? 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(5,150,105,0.08) 50%, rgba(7,12,22,0) 75%)'
              : 'radial-gradient(circle, rgba(45,90,61,0.16) 0%, rgba(56,107,73,0.06) 50%, rgba(255,255,255,0) 75%)'
          }}
        />
      </div>

      {/* 2. Central Brand Mark & Identity */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 -mt-4 animate-[tvSplashPop_0.5s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Elevated Icon Plate */}
        <div className="relative mb-5">
          <div className={`w-28 h-28 sm:w-32 sm:h-32 p-4 sm:p-5 rounded-[28px] sm:rounded-[32px] flex items-center justify-center ${
            isDarkMode 
              ? 'bg-[#0E1726] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)]' 
              : 'bg-white shadow-[0_20px_50px_-10px_rgba(45,90,61,0.2),0_0_0_1px_rgba(45,90,61,0.08)]'
          }`}>
            <BrandIconMark className="w-full h-full" idPrefix="splash" />
          </div>

          {/* Micro Flight Pin Sparkle */}
          <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-tr from-[#2D5A3D] to-[#386B49] text-white shadow-md flex items-center justify-center border-2 ${
            isDarkMode ? 'border-[#0E1726]' : 'border-white'
          }`}>
            <Sparkles className="w-3.5 h-3.5 animate-spin [animation-duration:9s]" />
          </div>
        </div>

        {/* Brand Name Typography */}
        <div className={`flex items-center justify-center tracking-tight font-display font-black text-3xl sm:text-4xl ${
          isDarkMode ? 'text-[#F8FAFC]' : 'text-[#0B2545]'
        }`}>
          <span>Trip</span>
          <span className={isDarkMode ? 'text-[#34D399]' : 'text-[#2D5A3D]'}>Verse</span>
        </div>

        {/* Tagline */}
        <p className={`text-xs sm:text-sm font-semibold mt-1.5 tracking-wide ${
          isDarkMode ? 'text-[#94A3B8]' : 'text-slate-500'
        }`}>
          Plan Smarter. Travel Further.
        </p>

        {/* 3. Whisper-Quiet Liquid Indicator */}
        <div className={`mt-7 w-28 sm:w-32 h-1 rounded-full overflow-hidden p-0.5 border shadow-inner ${
          isDarkMode ? 'bg-[#162338] border-white/10' : 'bg-slate-100 border-slate-200/60'
        }`}>
          <div className="h-full rounded-full bg-gradient-to-r from-[#2D5A3D] via-[#386B49] to-[#2D5A3D] animate-[tvSplashShimmer_1.1s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* 4. Bottom Safe Area Indicator */}
      <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center justify-center pointer-events-none opacity-50">
        <div className={`w-28 h-1 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
      </div>

      <style>{`
        @keyframes tvSplashPop {
          0% {
            opacity: 0.8;
            transform: scale(0.96) translateY(6px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes tvAuraBreath {
          0%, 100% {
            transform: scale(0.95);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.08);
            opacity: 1;
          }
        }
        @keyframes tvSplashShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};
