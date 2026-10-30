import React, { useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  Compass, 
  CheckCircle2, 
  ShieldCheck,
  Check
} from 'lucide-react';

interface GuestPlannerRestrictedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignUp?: () => void;
  onOpenSignIn: () => void;
  prefilledDestination?: string;
}

export const GuestPlannerRestrictedModal: React.FC<GuestPlannerRestrictedModalProps> = ({
  isOpen,
  onClose,
  onOpenSignUp,
  onOpenSignIn,
  prefilledDestination
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTriggerSignUp = () => {
    onClose();
    if (onOpenSignUp) {
      onOpenSignUp();
    } else {
      onOpenSignIn();
    }
  };

  const handleTriggerSignIn = () => {
    onClose();
    onOpenSignIn();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-restricted-title"
        className="bg-white dark:bg-[#0C1523] rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0C1523]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-sm">
              <Lock className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Trip<span className="text-[#2D5A3D]">Verse</span> Access Control
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Visual Icon Badge */}
          <div className="text-center space-y-2">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#2D5A3D]/20 via-amber-500/20 to-[#2D5A3D]/10 flex items-center justify-center text-[#2D5A3D] shadow-inner">
                <Sparkles className="w-8 h-8 animate-pulse text-[#2D5A3D]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#0C1523]">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>

            <h3 id="guest-restricted-title" className="text-xl sm:text-2xl font-black text-[#0B2545] dark:text-white">
              Sign Up to Use the AI Trip Planner
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {prefilledDestination ? (
                <>
                  Ready to plan your trip to <strong className="text-slate-800 dark:text-slate-200">{prefilledDestination}</strong>?
                  Guest Mode is explore-only. Create your free account in seconds to generate and customize your AI itinerary!
                </>
              ) : (
                <>
                  You are currently exploring TripVerse in <strong className="text-slate-800 dark:text-slate-200">Guest Mode</strong>.
                  AI Day-by-Day smart itinerary planning requires a free registered account.
                </>
              )}
            </p>
          </div>

          {/* Feature Matrix Comparison Card */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 p-4 space-y-3">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                What you can do in Guest Mode:
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Explore all destinations, attractions, and road trips</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>View highway amenities, food stops & EV stations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Browse live flight, hotel, and transport deals</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Unlocked with Free Registered Account:</span>
              </span>
              <div className="grid grid-cols-1 gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                  <span>1-Click AI Day-by-Day Smart Itinerary Generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                  <span>Personalized Budget, Travel Style & Route Optimization</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                  <span>Permanent Cloud Sync across phone and computer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleTriggerSignUp}
              className="w-full py-3.5 px-4 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#A8C5AC]" />
              <span>Sign Up to Unlock AI Planner (Free)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <div className="text-center pt-0.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={handleTriggerSignIn}
                  className="text-[#2D5A3D] dark:text-[#68B684] font-bold hover:underline cursor-pointer ml-1"
                >
                  Sign In
                </button>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer text-center"
            >
              Continue Exploring App as Guest
            </button>
          </div>

          {/* Trust footer */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>100% Free • Sign up with Google, Email, or Mobile OTP • Instant Access</span>
          </div>
        </div>
      </div>
    </div>
  );
};
