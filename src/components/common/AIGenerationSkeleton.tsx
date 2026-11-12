import React, { useState, useEffect } from 'react';
import { ShieldCheck, Car, Bed, Coffee, CheckCircle2 } from 'lucide-react';
import { formatCurrency, getActiveCurrency } from '../../services/currencyService';

interface AIGenerationSkeletonProps {
  destination: string;
  duration: number;
  travelers: number;
  budget: number;
}

export const AIGenerationSkeleton: React.FC<AIGenerationSkeletonProps> = ({
  destination,
  duration,
  travelers,
  budget
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const currency = getActiveCurrency();

  const steps = [
    {
      title: 'Synthesizing Optimal Global Route & Transit',
      desc: `Evaluating flight corridors, rail links, and scenic drives to ${destination}...`,
      icon: Car
    },
    {
      title: 'Resolving Local Landmarks & Geographic Coordinates',
      desc: 'Retrieving verified sightseeing highlights, operating hours, and regional transit...',
      icon: ShieldCheck
    },
    {
      title: 'Curating Authentic Dining & Scenic Pitstops',
      desc: 'Selecting top-rated local culinary experiences and rest stops along your route...',
      icon: Coffee
    },
    {
      title: 'Optimizing Stays & Multi-Currency Day Itinerary',
      desc: `Ensuring total spend fits comfortably within your ${formatCurrency(budget, currency)} budget...`,
      icon: Bed
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(prev => Math.min(steps.length - 1, prev + 1));
    }, 450);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200/90 dark:border-slate-800 space-y-6 text-center animate-in zoom-in-95">
        
        {/* Creative Free-Floating Animated TripVerse Logo (Zero App-Icon Box) */}
        <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
          {/* Concentric Geospatial Radar Waves */}
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 dark:bg-emerald-500/25 animate-tv-radar pointer-events-none" />
          <div 
            className="absolute inset-2 rounded-full bg-teal-400/25 dark:bg-teal-500/30 animate-tv-radar pointer-events-none" 
            style={{ animationDelay: '0.8s' }} 
          />

          {/* Primary Orbital Waypoint Ring with Orbiting Flight Marker */}
          <div className="absolute inset-0 w-full h-full animate-tv-orbit pointer-events-none">
            <svg viewBox="0 0 112 112" className="w-full h-full overflow-visible">
              <circle
                cx="56"
                cy="56"
                r="50"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                className="text-emerald-400/40 dark:text-emerald-400/35"
              />
              {/* Orbiting Flight Waypoint Marker */}
              <g transform="translate(56, 6)">
                <circle cx="0" cy="0" r="5" className="fill-emerald-400 shadow-md" />
                <circle cx="0" cy="0" r="2.2" fill="#FFFFFF" />
              </g>
            </svg>
          </div>

          {/* Counter-Rotating Secondary Route Ring */}
          <div className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] animate-tv-orbit-reverse pointer-events-none">
            <svg viewBox="0 0 96 96" className="w-full h-full overflow-visible">
              <circle
                cx="48"
                cy="48"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="2 7"
                className="text-teal-400/30 dark:text-teal-300/25"
              />
              <g transform="translate(48, 92)">
                <circle cx="0" cy="0" r="3.5" className="fill-amber-400" />
                <circle cx="0" cy="0" r="1.3" fill="#FFFFFF" />
              </g>
            </svg>
          </div>

          {/* Ambient Behind-the-Logo Soft Radial Glow */}
          <div className="absolute inset-2 rounded-full bg-emerald-500/25 dark:bg-emerald-400/20 blur-xl pointer-events-none" />

          {/* Pure Floating TripVerse Logo (Zero Box / Zero App Icon) */}
          <div className="relative w-22 h-22 flex items-center justify-center animate-tv-float">
            <img
              src="/tripverse-mark.png?v=16"
              srcSet="/tripverse-mark.png?v=16 1x, /tripverse-mark@2x.png?v=16 2x, /tripverse-mark@3x.png?v=16 3x"
              alt="TripVerse Logo"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_8px_18px_rgba(45,90,61,0.28)] dark:drop-shadow-[0_8px_22px_rgba(16,185,129,0.4)]"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
              draggable={false}
              loading="eager"
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-[#2D5A3D] dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Route & Highway Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black font-display text-[#0B2545] dark:text-white">
            Crafting Your {destination || 'Custom'} Journey
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {duration} Days • {travelers} Explorers • Budget: {formatCurrency(budget, currency)}
          </p>
        </div>

        {/* Stepped Progress List */}
        <div className="space-y-3 text-left">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = idx < stepIndex;
            const isCurrent = idx === stepIndex;

            return (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center gap-3 ${
                  isCurrent
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-[#2D5A3D] dark:border-emerald-500/60 shadow-xs'
                    : isDone
                      ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 opacity-90'
                      : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-40'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-[#2D5A3D] dark:bg-emerald-600 text-white animate-pulse'
                    : isDone
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {step.desc}
                  </p>
                </div>

                {isCurrent && (
                  <span className="w-4 h-4 border-2 border-[#2D5A3D] dark:border-emerald-400 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom indicator */}
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic">
          TripVerse plans the whole road trip in ~30 seconds with 100% budget accuracy.
        </p>

      </div>
    </div>
  );
};
