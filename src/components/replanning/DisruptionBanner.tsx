import React from 'react';
import { DisruptionAlert } from '../../types/replanning';
import { AlertTriangle, RotateCcw, ArrowRight, X, ShieldAlert, Sparkles } from 'lucide-react';

interface DisruptionBannerProps {
  disruption: DisruptionAlert;
  onOpenReplanning: () => void;
  onDismiss?: () => void;
}

export const DisruptionBanner: React.FC<DisruptionBannerProps> = ({
  disruption,
  onOpenReplanning,
  onDismiss
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-4 sm:p-5 text-white shadow-xl shadow-red-500/20 border border-red-400/40 mb-6 animate-in slide-in-from-top duration-300">
      {/* Background ambient glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner border border-white/30 animate-pulse">
            <AlertTriangle className="w-6 h-6 text-amber-200" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white">
                Trip Disruption Detected
              </span>
              <span className="text-[11px] font-semibold text-rose-100">
                {disruption.carrierOrSource || 'Travel Network'} • {disruption.timestamp}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mt-1 leading-snug">
              {disruption.title}
            </h3>

            <p className="text-xs text-rose-100 mt-0.5 line-clamp-1 sm:line-clamp-2">
              {disruption.details}
            </p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenReplanning}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-rose-700 font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Review & Replan Trip</span>
            <ArrowRight className="w-3.5 h-3.5 text-rose-600" />
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss banner"
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
