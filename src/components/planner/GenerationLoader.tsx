import React, { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles, Compass } from 'lucide-react';
import confetti from 'canvas-confetti';

import { TransportMode } from '../../types/trip';

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
  const getModeStepText = (mode: TransportMode) => {
    switch (mode) {
      case 'flight':
        return 'Preparing flight budget estimate';
      case 'train':
        return 'Preparing train budget estimate';
      case 'bus':
        return 'Preparing a bus travel estimate';
      case 'car':
        return 'Estimating your driving itinerary';
      case 'bike':
        return 'Preparing a motorcycle trip estimate';
      default:
        return 'Preparing travel estimates';
    }
  };

  const steps = [
    'Connecting to ConCode AI Brain on GPU...',
    'Analyzing your traveler choices & constraints...',
    getModeStepText(transportMode),
    'Customizing food trails & dining preferences...',
    'Curating signature landmarks & viewpoints...',
    'Scheduling day-by-day timing & activities...',
    'Optimizing budget allocation across your trip...',
    'Finalizing personalized journey blueprint...'
  ];

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
          } catch (e) {
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
  }, [onComplete]);

  const progressPct = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center relative overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Top brand icon with pulsing effect */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-trip-gradient text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
          <Sparkles className="w-8 h-8" />
        </div>

        <h3 className="text-xl sm:text-2xl font-display font-black text-[#0B2545] tracking-tight">
          ConCode AI is creating your journey...
        </h3>
        
        <p className="text-xs sm:text-sm text-slate-500 mt-1 mb-6">
          Tailoring genuine experience for <span className="font-bold text-slate-800">{destinationName}</span>
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
          <span>Optimizing routes, pitstops and expenses...</span>
        </div>

      </div>
    </div>
  );
};
