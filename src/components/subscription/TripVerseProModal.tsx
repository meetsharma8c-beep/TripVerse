import React, { useState } from 'react';
import { 
  Crown, 
  Sparkles, 
  Check, 
  X, 
  Zap, 
  ShieldCheck, 
  Clock, 
  Compass, 
  Radio, 
  RefreshCw,
  Award,
  ChevronRight,
  Flame,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { AuthUser, UserSubscriptionQuota } from '../../types/auth';
import { 
  upgradeUserToPro, 
  downgradeUserToFree, 
  getUserSubscriptionQuota 
} from '../../services/authService';
import { triggerHaptic } from '../../services/deviceService';
import confetti from 'canvas-confetti';

interface TripVerseProModalProps {
  isOpen: boolean;
  currentUser?: AuthUser | null;
  onClose: () => void;
  onSubscribed?: () => void;
  title?: string;
  subtitle?: string;
}

export const TripVerseProModal: React.FC<TripVerseProModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onSubscribed,
  title = 'Elevate to TripVerse Pro',
  subtitle = 'Unlock Unlimited Trips & 30 Hours / Week of Dedicated ConCode AI Co-Pilot'
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const quota: UserSubscriptionQuota = getUserSubscriptionQuota(currentUser);
  const isPro = quota.isPro;
  const tripsUsed = Math.min(3, Math.max(0, quota.freeTripsTotal - quota.freeTripsRemaining));

  const handleUpgrade = async () => {
    setIsProcessing(true);
    triggerHaptic('medium');
    try {
      await upgradeUserToPro(currentUser, billingCycle === 'annual' ? 365 : 30);
      setSuccessMessage('Welcome to TripVerse Pro! 30h/week AI Co-Pilot & Unlimited Trips Activated!');
      triggerHaptic('success');
      try {
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#F59E0B', '#10B981', '#2D5A3D', '#38BDF8', '#EAB308']
        });
      } catch {}

      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        if (onSubscribed) onSubscribed();
        onClose();
      }, 1600);
    } catch (e) {
      console.error('Upgrade error:', e);
      setIsProcessing(false);
    }
  };

  const handleDowngrade = async () => {
    setIsProcessing(true);
    triggerHaptic('light');
    try {
      await downgradeUserToFree(currentUser);
      setSuccessMessage('Switched back to Free Tier for testing.');
      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        if (onSubscribed) onSubscribed();
      }, 1200);
    } catch {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-xl max-h-[94vh] overflow-y-auto rounded-[32px] bg-white dark:bg-[#0E1726] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-slate-800 flex flex-col"
      >
        {/* Top Luxury Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#08150F] via-[#142C1E] to-[#254A34] text-white p-6 sm:p-8 rounded-t-[32px]">
          
          {/* Ambient Lighting Orbs */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white backdrop-blur-xs transition-all cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-1 flex items-start gap-4">
            {/* Glowing Crown Icon */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-[0_0_30px_rgba(245,158,11,0.45)] shrink-0 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#0E1E16] flex items-center justify-center">
                <Crown className="w-8 h-8 text-amber-400 fill-amber-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[11px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>{isPro ? 'VIP Active Member' : 'All-Access Pass'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">
                  <Zap className="w-3 h-3" />
                  <span>30h/Week AI Facility</span>
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white leading-tight">
                {isPro ? 'TripVerse Pro Active' : title}
              </h2>
              <p className="mt-1 text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-7 space-y-6">

          {/* Success Notification */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-sm font-bold flex items-center gap-2.5 animate-in zoom-in-95 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Free Tier Journey Progress (3 Free Trips Tracker) */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-900/60 dark:to-emerald-950/20 border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {isPro ? 'Your Pro Quota Status' : '3 Free Trip Planning Trial'}
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                isPro 
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700' 
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
              }`}>
                {isPro ? (
                  <>
                    <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-current" />
                    <span>PRO ACTIVE</span>
                  </>
                ) : (
                  <span>{quota.freeTripsRemaining} TRIPS LEFT</span>
                )}
              </span>
            </div>

            {/* 3-Step Journey Visualizer */}
            <div className="grid grid-cols-4 gap-2 pt-1 text-center">
              {[1, 2, 3].map((stepNum) => {
                const isUsed = tripsUsed >= stepNum;
                const isCurrent = tripsUsed === stepNum - 1 && !isPro;

                return (
                  <div 
                    key={stepNum} 
                    className={`p-3 rounded-2xl border transition-all ${
                      isUsed
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : isCurrent
                          ? 'bg-white dark:bg-slate-800 border-[#2D5A3D] dark:border-emerald-500 shadow-md ring-2 ring-[#2D5A3D]/15'
                          : 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {isUsed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <span className={`w-5 h-5 rounded-full text-xs font-extrabold flex items-center justify-center ${
                          isCurrent 
                            ? 'bg-[#2D5A3D] text-white shadow-xs' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {stepNum}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Trip #{stepNum}</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {isUsed ? 'Completed' : isCurrent ? 'Available Now' : 'Upcoming'}
                    </div>
                  </div>
                );
              })}

              {/* Step 4: Pro Unlimited */}
              <div className={`p-3 rounded-2xl border transition-all ${
                isPro 
                  ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 border-amber-300 dark:border-amber-700 shadow-sm' 
                  : 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex justify-center mb-1">
                  <Crown className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <div className="text-[11px] font-black text-amber-900 dark:text-amber-300">TripVerse Pro</div>
                <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                  {isPro ? 'Active ∞' : '∞ Unlimited'}
                </div>
              </div>
            </div>

            {/* Quota Description Banner */}
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-normal">
              {isPro
                ? 'Your Pro Membership gives you unlimited trip plannings and 30 hours per week of high-speed ConCode AI Brain & Navigation HUD processing.'
                : quota.freeTripsRemaining === 0 
                  ? 'You have used all 3 free trips. Upgrade to TripVerse Pro to plan infinite adventures without limits.'
                  : `You have ${quota.freeTripsRemaining} free trip planning opportunit${quota.freeTripsRemaining === 1 ? 'y' : 'ies'} remaining. Upgrade anytime for unlimited access.`
              }
            </p>
          </div>

          {/* Interactive Billing Cycle Toggle */}
          {!isPro && (
            <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-white dark:bg-slate-700 text-[#0B2545] dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Annual (₹3,999/yr)</span>
                <span className="px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 text-[10px] font-black uppercase">
                  Save 33%
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-[#0B2545] dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Monthly (₹499/mo)</span>
              </button>
            </div>
          )}

          {/* Pro Feature Highlights (Grid of 4 Luxury Benefit Cards) */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Everything Included in TripVerse Pro
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3 hover:border-emerald-400/50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-[#2D5A3D] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Unlimited Trip Plannings</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                    Generate and save endless custom multi-day vacations across India & worldwide.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-3 hover:border-amber-400/50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 dark:text-amber-300">30 Hours / Week AI Facility</h4>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-0.5 leading-snug">
                    Full access to ConCode AI Multi-Turn Brain & Turn-by-Turn Live Navigation HUD.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3 hover:border-blue-400/50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Live Dynamic Re-planning</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                    Instant route rerouting for bad monsoon weather, delayed transit, or road closures.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3 hover:border-teal-400/50 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Offline Travel Booklets</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                    Export high-resolution printable PDF travel guides with emergency SOS contacts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & CTA Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-teal-500/10 dark:from-amber-950/30 dark:via-emerald-950/30 dark:to-teal-950/30 border border-amber-300/60 dark:border-amber-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-[#0B2545] dark:text-white font-display">
                  {billingCycle === 'annual' ? '₹3,999' : '₹499'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {billingCycle === 'annual' ? '/year (₹333/mo)' : '/month'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-[10px] font-black uppercase">
                  {billingCycle === 'annual' ? 'BEST VALUE' : 'FLEXIBLE'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Includes full 30h/week dedicated AI compute • Cancel anytime
              </p>
            </div>

            {isPro ? (
              <button
                type="button"
                onClick={handleDowngrade}
                disabled={isProcessing}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Switch to Free Tier (Test)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={isProcessing}
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-[#2D5A3D] to-[#1E3E2A] hover:opacity-95 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/30 hover:shadow-xl transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>{isProcessing ? 'Activating Pro...' : 'Activate TripVerse Pro'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

        {/* Modal Footer with Security and Guarantee */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 rounded-b-[32px] text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Bank-Grade Encryption • Instant Cloud Quota Sync</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold cursor-pointer"
          >
            Continue with Free Tier
          </button>
        </div>
      </div>
    </div>
  );
};
