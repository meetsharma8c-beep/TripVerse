import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { useLanguage } from '../../services/languageService';

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
  useModalBehavior(isOpen, onClose);
  const { t } = useLanguage();

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

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

  return createPortal(
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overscroll-contain overflow-y-auto animate-in fade-in duration-200"
      style={{
        minHeight: '100dvh',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))'
      }}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-restricted-title"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-[#0C1523] rounded-2xl sm:rounded-3xl max-w-[440px] w-full shadow-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col min-h-0 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        style={{
          maxHeight: 'min(92dvh, calc(100dvh - 1.5rem))'
        }}
      >
        {/* Sticky Top Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#0C1523] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
              Trip<span className="text-[#2D5A3D]">Verse</span> Access Control
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-3.5 overflow-y-auto overscroll-contain flex-1 min-h-0">
          {/* Visual Icon Badge & Title */}
          <div className="text-center space-y-1.5">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-[#2D5A3D]/20 via-amber-500/15 to-[#2D5A3D]/10 flex items-center justify-center text-[#2D5A3D] shadow-inner">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#2D5A3D]" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-[#0C1523]">
                <Lock className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            <h3 id="guest-restricted-title" className="text-base sm:text-xl font-black text-[#0B2545] dark:text-white leading-snug">
              {t('Sign Up to Use the AI Trip Planner')}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              {prefilledDestination ? (
                <>
                  {t('Ready to plan your trip to')} <strong className="text-slate-800 dark:text-slate-200">{prefilledDestination}</strong>?{' '}
                  {t('Guest Mode is explore-only. Create your free account in seconds to generate and customize your AI itinerary!')}
                </>
              ) : (
                <>
                  {t('You are currently exploring TripVerse in')} <strong className="text-slate-800 dark:text-slate-200">{t('Guest Mode')}</strong>.{' '}
                  {t('AI Day-by-Day smart itinerary planning requires a free registered account.')}
                </>
              )}
            </p>
          </div>

          {/* Feature Matrix Comparison Card */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 p-3 space-y-2.5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                {t('What you can do in Guest Mode:')}
              </span>
              <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{t('Explore all destinations, attractions, and road trips')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{t('View highway amenities, food stops & EV stations')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{t('Browse live flight, hotel, and transport deals')}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/90 dark:border-slate-800 pt-2 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block flex items-center gap-1">
                <Lock className="w-3 h-3 shrink-0" />
                <span>{t('Unlocked with Free Registered Account:')}</span>
              </span>
              <div className="grid grid-cols-1 gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                  <span>{t('1-Click AI Day-by-Day Smart Itinerary Generation')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                  <span>{t('Personalized Budget, Travel Style & Route Optimization')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                  <span>{t('Permanent Cloud Sync across phone and computer')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom Actions Footer - Always visible and accessible */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-[#0C1523]/95 backdrop-blur-xs space-y-2 shrink-0">
          <button
            type="button"
            onClick={handleTriggerSignUp}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#A8C5AC] shrink-0" />
            <span>{t('Sign Up to Unlock AI Planner (Free)')}</span>
            <ArrowRight className="w-4 h-4 ml-0.5 shrink-0" />
          </button>

          <div className="flex items-center justify-between gap-2 pt-0.5 px-1">
            <button
              type="button"
              onClick={onClose}
              className="py-1 px-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold text-[11px] transition-colors cursor-pointer text-left"
            >
              {t('Continue as Guest')}
            </button>

            <button
              type="button"
              onClick={handleTriggerSignIn}
              className="py-1 px-2 text-[#2D5A3D] dark:text-[#68B684] font-bold hover:underline cursor-pointer text-right text-[11px]"
            >
              {t('Already registered? Sign In')}
            </button>
          </div>

          {/* Trust footer */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 text-center pt-0.5">
            <ShieldCheck className="w-3 h-3 text-[#2D5A3D] shrink-0" />
            <span>{t('100% Free • Sign up in 10s • Instant Access')}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
