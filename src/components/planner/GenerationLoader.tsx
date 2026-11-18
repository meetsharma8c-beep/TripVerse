import React, { useEffect, useState, useMemo } from 'react';
import { CheckCircle2, Sparkles, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';

import { TransportMode } from '../../types/trip';
import { useLanguage } from '../../services/languageService';

interface GenerationLoaderProps {
  onComplete: () => void;
  destinationName: string;
  transportMode?: TransportMode;
}

export const GenerationLoader: React.FC<GenerationLoaderProps> = ({
  onComplete,
  destinationName,
  transportMode = 'car'
}) => {
  const { t } = useLanguage();

  const getModeStepText = (mode: TransportMode) => {
    switch (mode) {
      case 'flight':
        return t('Analyzing flight corridors & international transit...');
      case 'train':
        return t('Analyzing railway lines & express schedules...');
      case 'bus':
        return t('Preparing a bus travel estimate...');
      case 'car':
        return t('Estimating your highway driving itinerary...');
      case 'bike':
        return t('Preparing a scenic motorcycle rider route...');
      default:
        return t('Preparing transit estimates...');
    }
  };

  const steps = useMemo(() => [
    t('Connecting to ConCode AI Brain on GPU...'),
    t('Analyzing your traveler choices & constraints...'),
    getModeStepText(transportMode),
    t('Customizing food trails & dining preferences...'),
    t('Accessing original destination & landmark photos...'),
    t('Curating verified local hotels & stay photography...'),
    t('Scheduling day-by-day timing & activities...'),
    t('Optimizing budget allocation across your trip...'),
    t('Finalizing personalized journey blueprint...')
  ], [transportMode, t]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          // Trigger confetti
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#386B49', '#2D5A3D', '#0B2545', '#38BDF8']
            });
          } catch {
            // ignore if confetti fails
          }
          setTimeout(() => {
            onComplete();
          }, 800);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(interval);
  }, [onComplete, steps.length]);

  const progressPct = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md px-4">
      <div className="liquid-glass-surface rounded-[30px] p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Animated Kinetic Route Arc */}
        <div className="relative mx-auto mb-5 w-48 h-16 flex items-center justify-center">
          <svg viewBox="0 0 200 64" className="w-full h-full overflow-visible" aria-hidden="true">
            <path
              d="M 16 48 Q 100 4 184 48"
              fill="none"
              stroke="rgba(45, 90, 61, 0.22)"
              strokeWidth="3"
              strokeDasharray="5 5"
            />
            <path
              d="M 16 48 Q 100 4 184 48"
              fill="none"
              stroke="#2D5A3D"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="220"
              strokeDashoffset={Math.max(0, 220 - Math.round((progressPct / 100) * 220))}
              className="transition-all duration-300 ease-out"
            />
            <circle cx="16" cy="48" r="5" fill="#2D5A3D" />
            <circle cx="184" cy="48" r="6" fill="#10B981" />
          </svg>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-trip-gradient text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-tv-float">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <h3 className="text-xl sm:text-2xl font-display font-black text-[#0B2545] tracking-tight">
          {t('ConCode AI is creating your journey...')}
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
          {t('Tailoring genuine experience for')} <span className="font-bold text-slate-800">{destinationName}</span>
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden">
          <div 
            className="bg-trip-gradient h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Animated Step List */}
        <div className="space-y-2.5 text-left mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
          {steps.map((step, idx) => {
            const isFinished = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div 
                key={step} 
                className={`flex items-center gap-3 text-xs sm:text-sm transition-all duration-200 ${
                  isFinished 
                    ? 'text-emerald-700 font-semibold' 
                    : isCurrent 
                    ? 'text-[#0B2545] font-bold scale-[1.02]' 
                    : 'text-slate-400 opacity-60'
                }`}
              >
                {isFinished ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#2D5A3D] border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0" />
                )}
                <span className="truncate">{step}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
          <Compass className="w-4 h-4 text-emerald-500 animate-spin" />
          <span>{t('Optimizing routes, pitstops and expenses...')}</span>
        </div>

      </div>
    </div>
  );
};
