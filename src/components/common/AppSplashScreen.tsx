import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Compass } from 'lucide-react';
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
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(18);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const onFinishRef = useRef(onFinish);
  const hasFinishedRef = useRef(false);
  const [initialMountTime] = useState(() => Date.now());
  const mountTimeRef = useRef(initialMountTime);

  // Crisp 1.5s–2.0s total opening window: feels intentional and fluid without delaying the user
  const MIN_DISPLAY_MS = 1050;
  const MAX_TIMEOUT_MS = 2100;

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const handleFinish = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsExiting(true);
    triggerHaptic('light');

    hideNativeSplashScreen(300);

    setTimeout(() => {
      if (onFinishRef.current) {
        onFinishRef.current();
      }
    }, 520);
  };

  // Cross-device video autoplay initialization
  useEffect(() => {
    triggerHaptic('light');
    hideNativeSplashScreen(250);

    const video = videoRef.current;
    if (video) {
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
          .catch(() => {
            setVideoLoaded(false);
            setVideoError(true);
          });
      }
    }
  }, []);

  // Smooth genuine loading progress interpolation towards real app ready target
  useEffect(() => {
    const desiredProgress = isAppReady ? 100 : Math.max(22, targetProgress);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= desiredProgress) return prev;
        const step = Math.max(2, Math.round((desiredProgress - prev) * 0.28));
        return Math.min(desiredProgress, prev + step);
      });
    }, 24);

    return () => clearInterval(interval);
  }, [isAppReady, targetProgress]);

  // Genuine completion trigger: Dismiss when app reports ready and progress has completed
  useEffect(() => {
    if (!isAppReady || progress < 100 || hasFinishedRef.current) return;

    const elapsed = Date.now() - mountTimeRef.current;
    const remainingMin = Math.max(0, MIN_DISPLAY_MS - elapsed);

    const finishTimer = setTimeout(() => {
      handleFinish();
    }, remainingMin + 120);

    return () => clearTimeout(finishTimer);
  }, [isAppReady, progress]);

  // Safety ceiling timeout
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, MAX_TIMEOUT_MS);

    return () => clearTimeout(safetyTimer);
  }, []);

  // Orbital SVG ring stroke calculation
  const circleRadius = 64;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (Math.min(100, Math.max(12, progress)) / 100) * circleCircumference;

  return (
    <div
      role="dialog"
      aria-label="TripVerse Opening"
      onClick={handleFinish}
      className={`fixed inset-0 z-[9999] w-full max-w-[100vw] h-full max-h-[100dvh] flex flex-col justify-between select-none overflow-hidden bg-[#070C16] text-white transition-[opacity,transform] duration-550 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity motion-reduce:duration-200 ${
        isExiting || progress >= 98
          ? 'pointer-events-none'
          : 'cursor-pointer'
      } ${
        isExiting
          ? 'opacity-0 scale-[1.035] motion-reduce:scale-100'
          : 'opacity-100 scale-100'
      }`}
      style={{
        willChange: 'transform, opacity',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
    >
      {/* 1. Cross-Device Ambient Video & Ken Burns Horizon Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#070C16]">
        <img
          src="/videos/app-opening-poster.jpg"
          alt="TripVerse scenic horizon"
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none transition-[opacity,transform] duration-[2200ms] ease-out tv-splash-kenburns ${
            videoLoaded && !videoError ? 'opacity-0' : 'opacity-85'
          }`}
          loading="eager"
        />

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
            className={`w-full h-full object-cover pointer-events-none select-none transition-opacity duration-700 tv-splash-kenburns ${
              videoLoaded ? 'opacity-85' : 'opacity-0'
            }`}
          />
        )}

        {/* Multi-layered Emerald & Deep Forest Atmospheric Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070C16]/80 via-[#0A1812]/55 to-[#070C16]/95 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(45,90,61,0.18)_0%,rgba(7,12,22,0.82)_75%)] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[460px] h-[300px] sm:h-[460px] rounded-full bg-emerald-500/18 blur-[85px] pointer-events-none tv-splash-aura-pulse" />
      </div>

      {/* 2. Top Safe Area Header Pill */}
      <div className="relative z-20 w-full pt-[max(env(safe-area-inset-top,1rem),1.5rem)] flex justify-center px-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.07] backdrop-blur-md border border-white/12 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300/90 shadow-sm tv-stagger-1">
          <Compass className="w-3 h-3 text-emerald-400 animate-spin [animation-duration:10s]" />
          <span>AI Route &amp; Journey Intelligence</span>
        </div>
      </div>

      {/* 3. Center Brand Showcase & Orbital Route Ring */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto my-auto">
        {/* Orbital Route Progress Ring + Elevated Glass Squircle Mark */}
        <div className="relative mb-6 flex items-center justify-center w-36 h-36 sm:w-40 sm:h-40 tv-splash-logo-reveal">
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
            viewBox="0 0 144 144"
          >
            <defs>
              <linearGradient id="tv-orbital-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#10B981" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#2D5A3D" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            {/* Subtle outer compass track */}
            <circle
              cx="72"
              cy="72"
              r={circleRadius}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1.5"
              strokeDasharray="3 5"
            />
            {/* Animated progress arc */}
            <circle
              cx="72"
              cy="72"
              r={circleRadius}
              fill="none"
              stroke="url(#tv-orbital-grad)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset] duration-200 ease-out"
            />
          </svg>

          {/* Elevated Frosted Glass Brand Mark Plate */}
          <div className="relative w-24 h-24 sm:w-27 sm:h-27 p-4 sm:p-5 rounded-[28px] sm:rounded-[30px] bg-[#0B1622]/75 backdrop-blur-xl border border-white/20 shadow-[0_24px_56px_rgba(0,0,0,0.75),0_0_40px_rgba(16,185,129,0.26),inset_0_1px_1.5px_rgba(255,255,255,0.28)] flex items-center justify-center">
            <BrandIconMark className="w-full h-full" idPrefix="splash-pro" />
          </div>

          {/* Micro Flight Sparkle Badge */}
          <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-gradient-to-tr from-[#2D5A3D] via-emerald-500 to-teal-300 text-white shadow-[0_4px_14px_rgba(16,185,129,0.5)] flex items-center justify-center border-2 border-[#070C16]">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Brand Name Typography with Staggered Reveal */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black tracking-tight text-white mb-2 drop-shadow-md tv-stagger-1">
          Trip<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-200">Verse</span>
        </h1>

        {/* Tagline */}
        <p className="text-xs sm:text-sm text-emerald-100/80 font-medium tracking-[0.06em] max-w-xs drop-shadow mb-8 tv-stagger-2">
          Plan Smarter. Travel Further.
        </p>

        {/* Luminous Route Progress Bar */}
        <div className="w-48 sm:w-56 h-1.5 rounded-full bg-white/12 overflow-hidden backdrop-blur-md p-[1px] border border-white/10 shadow-inner tv-stagger-3">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2D5A3D] via-emerald-400 to-teal-200 transition-all duration-150 ease-out shadow-[0_0_14px_rgba(52,211,153,0.85)]"
            style={{ width: `${Math.max(12, progress)}%` }}
          />
        </div>

        {/* Genuine Live Loading Status */}
        <p className="text-[11px] text-slate-300/80 font-semibold tracking-[0.12em] mt-3 uppercase transition-opacity duration-300 tv-stagger-3">
          {statusMessage}
        </p>
      </div>

      {/* 4. Bottom Safe Area Indicator */}
      <div className="relative z-20 w-full pb-[max(env(safe-area-inset-bottom,1rem),1.5rem)] flex flex-col items-center justify-center gap-2">
        <div className="w-24 h-1 rounded-full bg-white/20" />
      </div>
    </div>
  );
};
