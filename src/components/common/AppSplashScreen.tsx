import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { triggerHaptic, hideNativeSplashScreen } from '../../services/deviceService';
import { BrandIconMark } from './Logo';

interface AppSplashScreenProps {
  onFinish?: () => void;
  isAppReady?: boolean;
  statusMessage?: string;
  targetProgress?: number;
  initialPlatform?: 'ios' | 'android';
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onFinish,
  isAppReady = false,
  statusMessage = 'Initializing travel intelligence...',
  targetProgress = 20,
  initialPlatform
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(15);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const onFinishRef = useRef(onFinish);
  const hasFinishedRef = useRef(false);
  const mountTimeRef = useRef(Date.now());

  // Minimum display threshold (800ms) to ensure the opening feels velvety smooth
  // without any jarring 1-frame flashes on instantaneous cached loads.
  const MIN_DISPLAY_MS = 800;
  // Safety timeout: Ensure app never hangs even on constrained devices or slow networks
  const MAX_TIMEOUT_MS = 2800;

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsExiting(true);
    triggerHaptic('light');

    // Smoothly dissolve native Capacitor splash screen into the web app
    hideNativeSplashScreen(350);

    setTimeout(() => {
      if (onFinishRef.current) {
        onFinishRef.current();
      }
    }, 450);
  };

  // Cross-device video autoplay initialization
  useEffect(() => {
    triggerHaptic('light');
    hideNativeSplashScreen(300);

    const video = videoRef.current;
    if (video) {
      // Direct DOM property enforcement required for Safari iOS & Android WebViews
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.controls = false;
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoLoaded(true);
          })
          .catch((err) => {
            // Low-power mode or background policy: graceful poster fallback without error
            console.log('[App Loading] Silent background video fallback active:', err);
            // If autoplay is blocked by browser/OS, immediately unmount the video
            // so no paused video frame or native play icon is ever displayed to the user.
            setVideoLoaded(false);
            setVideoError(true);
          });
      }
    }
  }, []);

  // Smooth genuine loading progress interpolation towards real app ready target
  useEffect(() => {
    const desiredProgress = isAppReady ? 100 : Math.max(15, targetProgress);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= desiredProgress) {
          return prev;
        }
        // Smoothly accelerate towards desired target
        const step = Math.max(1, Math.round((desiredProgress - prev) * 0.25));
        return Math.min(desiredProgress, prev + step);
      });
    }, 25);

    return () => clearInterval(interval);
  }, [isAppReady, targetProgress]);

  // Genuine completion trigger: Dismiss when app reports ready and progress has completed
  useEffect(() => {
    if (!isAppReady || progress < 100 || hasFinishedRef.current) return;

    const elapsed = Date.now() - mountTimeRef.current;
    const remainingMin = Math.max(0, MIN_DISPLAY_MS - elapsed);

    const finishTimer = setTimeout(() => {
      handleFinish();
    }, remainingMin + 150);

    return () => clearTimeout(finishTimer);
  }, [isAppReady, progress]);

  // Safety ceiling timeout
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, MAX_TIMEOUT_MS);

    return () => clearTimeout(safetyTimer);
  }, []);

  return (
    <div
      role="dialog"
      aria-label="TripVerse Loading"
      tabIndex={0}
      className={`fixed inset-0 z-[9999] w-full max-w-[100vw] h-full max-h-[100dvh] flex flex-col justify-between select-none overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] bg-[#070C16] text-white ${
        isExiting
          ? 'opacity-0 scale-105 blur-[12px] pointer-events-none'
          : 'opacity-100 scale-100 blur-0'
      }`}
      style={{
        willChange: 'transform, opacity, filter',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* 1. Cross-Device Ambient Video & Instant Poster Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#070C16]">
        {/* Instant high-res poster prevents blank flash */}
        <img
          src="/videos/app-opening-poster.jpg"
          alt="TripVerse opening visual"
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-opacity duration-700 ${
            videoLoaded && !videoError ? 'opacity-0' : 'opacity-100 scale-100'
          }`}
          loading="eager"
        />

        {/* Ambient background video (muted, looping, playsInline, strictly no native controls or play icons) */}
        {!videoError && (
          <video
            ref={videoRef}
            src="/videos/app-opening.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            // @ts-ignore iOS & Android webview specific attributes
            webkit-playsinline="true"
            x5-playsinline="true"
            x5-video-player-type="h5"
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => {
              setVideoLoaded(false);
              setVideoError(true);
            }}
            width={1280}
            height={720}
            className={`w-full h-full object-cover pointer-events-none select-none transition-opacity duration-700 ${
              videoLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Subtle, Warm Luxury Emerald & Dark Gradient Vignettes */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070C16]/90 via-[#070C16]/40 to-[#070C16]/80 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(7,12,22,0.7)_100%)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[500px] h-[340px] sm:h-[500px] rounded-full bg-emerald-500/15 blur-[90px] pointer-events-none animate-pulse [animation-duration:3s]" />
      </div>

      {/* 2. Top Spacer (Safe area compliant for iOS Dynamic Island / notch) */}
      <div className="relative z-20 w-full pt-[max(env(safe-area-inset-top,1rem),1.25rem)]" />

      {/* 3. Center Brand Showcase & Professional Loading Sequence */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto my-auto animate-in fade-in zoom-in-95 duration-700">
        {/* Elevated Frosted Glass Brand Mark Plate */}
        <div className="relative mb-5 sm:mb-6">
          <div className="w-22 h-22 sm:w-28 sm:h-28 p-4 sm:p-5 rounded-[26px] sm:rounded-[30px] bg-black/60 backdrop-blur-xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.3)] flex items-center justify-center">
            <BrandIconMark className="w-full h-full" idPrefix="splash-pro" />
          </div>

          {/* Micro Flight Sparkle Badge */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg flex items-center justify-center border-2 border-[#070C16]">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin [animation-duration:8s]" />
          </div>
        </div>

        {/* Brand Name Typography */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-white mb-2 drop-shadow-md">
          Trip<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Verse</span>
        </h1>

        {/* Tagline */}
        <p className="text-xs sm:text-sm text-slate-300/90 font-medium tracking-wide max-w-sm drop-shadow mb-8">
          Plan Smarter. Travel Further.
        </p>

        {/* Professional Minimalist Loading Bar */}
        <div className="w-48 sm:w-56 h-1 rounded-full bg-white/15 overflow-hidden backdrop-blur-md p-0.25 border border-white/10 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-150 ease-out shadow-[0_0_12px_rgba(52,211,153,0.8)]"
            style={{ width: `${Math.max(8, progress)}%` }}
          />
        </div>

        {/* Genuine Live Loading Status */}
        <p className="text-[11px] sm:text-xs text-slate-300/85 font-medium tracking-wider mt-3 uppercase transition-all duration-300">
          {statusMessage}
        </p>
      </div>

      {/* 4. Bottom Safe Area Indicator */}
      <div className="relative z-20 w-full pb-[max(env(safe-area-inset-bottom,1rem),1.5rem)] flex items-center justify-center">
        <div className="w-24 h-1 rounded-full bg-white/20" />
      </div>
    </div>
  );
};
