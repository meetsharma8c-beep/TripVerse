import React, { useState, useEffect } from 'react';
import { BrandIconMark } from './Logo';
import { 
  Download, 
  X, 
  Share, 
  PlusSquare, 
  Sparkles, 
  CheckCircle2, 
  WifiOff, 
  Zap 
} from 'lucide-react';
import { 
  canInstallPWA, 
  promptPWAInstall, 
  isIos, 
  isStandalone, 
  triggerHaptic 
} from '../../services/deviceService';

const DISMISS_STORAGE_KEY = 'tripverse_pwa_dismissed_until';
const SNOOZE_DAYS = 5;

export const PwaInstallPrompt: React.FC = () => {
  const [canPrompt, setCanPrompt] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(true);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [isIosDevice, setIsIosDevice] = useState<boolean>(false);

  useEffect(() => {
    // Check if already running standalone or native
    const installed = isStandalone();
    setIsInstalled(installed);
    const ios = isIos();
    setIsIosDevice(ios);

    if (installed) return;

    // Track user session count
    const sessionKey = 'tripverse_user_sessions_count';
    const activeSessionKey = 'tripverse_session_active';
    let sessionCount = parseInt(localStorage.getItem(sessionKey) || '0', 10);
    if (!sessionStorage.getItem(activeSessionKey)) {
      sessionStorage.setItem(activeSessionKey, '1');
      sessionCount += 1;
      localStorage.setItem(sessionKey, sessionCount.toString());
    }

    // Check if user previously snoozed the banner
    const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);
    const isSnoozed = dismissedUntil && Date.now() < parseInt(dismissedUntil, 10);

    // Initial availability check
    setCanPrompt(canInstallPWA());

    // Listen for custom event from deviceService
    const handleCanInstall = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setCanPrompt(Boolean(customEvent.detail));
    };

    window.addEventListener('tripverse-can-install', handleCanInstall);

    const handleOpenInstall = () => {
      handleInstallClick();
    };
    window.addEventListener('tripverse-open-install', handleOpenInstall);

    // Listen for plan generated event - show prompt only when user has engaged with the product!
    const handleTripCreated = () => {
      // Flag is set by App.tsx scoped per user; here just trigger banner show
      if (!isSnoozed && !isStandalone()) {
        setTimeout(() => {
          setShowBanner(true);
        }, 1200);
      }
    };
    window.addEventListener('tripverse_trip_created', handleTripCreated);

    // Auto-show if returning user (2nd+ visit). Do not rely on unscoped plan_generated key.
    const isReturningUser = sessionCount >= 2;

    if (!isSnoozed && isReturningUser) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 12000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('tripverse-can-install', handleCanInstall);
        window.removeEventListener('tripverse-open-install', handleOpenInstall);
        window.removeEventListener('tripverse_trip_created', handleTripCreated);
      };
    }

    return () => {
      window.removeEventListener('tripverse-can-install', handleCanInstall);
      window.removeEventListener('tripverse-open-install', handleOpenInstall);
      window.removeEventListener('tripverse_trip_created', handleTripCreated);
    };
  }, []);

  const handleDismiss = () => {
    setShowBanner(false);
    triggerHaptic('light');
    const snoozeTime = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_STORAGE_KEY, snoozeTime.toString());
  };

  const handleInstallClick = async () => {
    triggerHaptic('medium');

    if (isIosDevice) {
      // iOS Safari requires manual "Add to Home Screen"
      setShowIosModal(true);
      return;
    }

    if (canInstallPWA()) {
      const outcome = await promptPWAInstall();
      if (outcome === 'accepted') {
        setShowBanner(false);
        setIsInstalled(true);
      }
    } else {
      // Fallback modal or explanation for desktop/other browsers
      setShowIosModal(true);
    }
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Bottom Banner (Mobile & Desktop) */}
      {showBanner && (
        <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="relative overflow-hidden rounded-2xl bg-[#0B2545]/95 backdrop-blur-xl border border-[#2D5A3D]/40 p-4 shadow-2xl text-white">
            
            {/* Ambient forest green background glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#2D5A3D]/25 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start gap-3.5">
              {/* App Icon */}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-xl bg-white p-2 flex items-center justify-center shadow-md border border-slate-200">
                  <BrandIconMark className="w-full h-full" idPrefix="pwa-drawer" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#2D5A3D] border-2 border-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-2.5 h-2.5 text-white" />
                </span>
              </div>

              {/* Text Copy */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-white tracking-tight">Install TripVerse</h4>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#2D5A3D]/30 text-[#A3B8A2] border border-[#2D5A3D]/40">
                    Free
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                  Full-screen trip planning with saved itineraries and printable guides. Directions open in an external maps app.
                </p>

                {/* Benefits Pills */}
                <div className="flex items-center gap-2 mt-2 text-[11px] text-[#A3B8A2] font-medium">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-[#8EA78D]" /> 0s Load
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-[#8EA78D]" /> Offline Mode
                  </span>
                </div>
              </div>

              {/* Close / Dismiss Button with 44x44px ergonomic touch target */}
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons with 44px minimum height */}
            <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="btn-liquid-primary flex-1 flex items-center justify-center gap-2 py-3 px-4 min-h-[44px] rounded-full text-white font-bold text-xs shadow-lg shadow-[#2D5A3D]/30"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>{isIosDevice ? 'Add to iPhone / iPad' : 'Install Free App'}</span>
              </button>
              
              <button
                onClick={handleDismiss}
                className="btn-liquid-glass py-3 px-4 min-h-[44px] rounded-full text-slate-200 bg-white/10 hover:bg-white/20 border-white/20 text-xs font-semibold"
              >
                Not Now
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. Guided Installation Modal (for iOS Safari & generic browsers) */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl text-slate-900 animate-in zoom-in-95 duration-200">
            
            {/* Close Button */}
            <button
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with App Logo */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl p-2.5 bg-white shadow-xl shadow-slate-200/80 mb-3 flex items-center justify-center border border-slate-200">
                <BrandIconMark className="w-full h-full" idPrefix="pwa-modal" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {isIosDevice ? 'Install on iPhone / iPad' : 'Install TripVerse App'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
                Install in 3 simple taps. 100% free with no App Store download or account needed!
              </p>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="mt-5 space-y-3">
              
              {/* Step 1 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                  1
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-slate-800">
                    Tap the Share button
                  </p>
                  <p className="text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    Look at the bottom toolbar in Safari for 
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold border border-blue-200">
                      <Share className="w-3 h-3" /> Share
                    </span>
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-[#2D5A3D] text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                  2
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-slate-800">
                    Select "Add to Home Screen"
                  </p>
                  <p className="text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    Scroll down the options list and tap 
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#EAF0E9] text-[#2D5A3D] font-bold border border-[#8EA78D]/30">
                      <PlusSquare className="w-3 h-3" /> Add to Home Screen
                    </span>
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="w-7 h-7 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-xs">
                  3
                </div>
                <div className="flex-1 text-xs">
                  <p className="font-bold text-slate-800">
                    Tap "Add" in Top Right
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    TripVerse will appear on your phone home screen just like a native app!
                  </p>
                </div>
              </div>

            </div>

            {/* Feature Highlights */}
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                <span>Full Screen (No URL bar)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                <span>Works Offline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                <span>Lightweight (~10MB)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                <span>Automatic Updates</span>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => {
                setShowIosModal(false);
                handleDismiss();
              }}
              className="mt-5 w-full py-3 rounded-2xl bg-[#0B2545] text-white font-bold text-xs shadow-md active:scale-98 transition-all cursor-pointer"
            >
              Got It, I'll Add It!
            </button>

          </div>
        </div>
      )}
    </>
  );
};
