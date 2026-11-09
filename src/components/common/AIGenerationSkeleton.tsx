import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, Car, Bed, Coffee, CheckCircle2 } from 'lucide-react';
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
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 text-center animate-in zoom-in-95">
        
        {/* Animated Brand Glow Icon */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-emerald-400 animate-ping opacity-25" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#2D5A3D] to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <Sparkles className="w-10 h-10 animate-spin-slow" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#2D5A3D] text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI Route & Highway Engine</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black font-display text-[#0B2545]">
            Crafting Your {destination || 'Custom'} Journey
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
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
                    ? 'bg-emerald-50/80 border-[#2D5A3D] shadow-xs'
                    : isDone
                      ? 'bg-slate-50 border-slate-200 opacity-90'
                      : 'bg-white border-slate-100 opacity-40'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-[#2D5A3D] text-white animate-pulse'
                    : isDone
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400'
                }`}>
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 leading-tight">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {step.desc}
                  </p>
                </div>

                {isCurrent && (
                  <span className="w-4 h-4 border-2 border-[#2D5A3D] border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom indicator */}
        <p className="text-[11px] text-slate-400 font-medium italic">
          TripVerse plans the whole road trip in ~30 seconds with 100% budget accuracy.
        </p>

      </div>
    </div>
  );
};
