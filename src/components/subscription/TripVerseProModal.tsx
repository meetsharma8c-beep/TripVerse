import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  Check, 
  X, 
  Zap, 
  ShieldCheck, 
  Compass, 
  Radio, 
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  Lock,
  Star
} from 'lucide-react';
import { AuthUser, UserSubscriptionQuota } from '../../types/auth';
import { 
  upgradeUserToPro, 
  downgradeUserToFree, 
  getUserSubscriptionQuota 
} from '../../services/authService';
import { getActiveCurrency, formatCurrency } from '../../services/currencyService';
import { CurrencyCode } from '../../types/trip';
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
  title = 'Plan Without Limits with',
  subtitle = 'Unlock unlimited AI trip generations, live weather re-routing, and dedicated 30 hours/week ConCode AI travel co-pilot.'
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());

  useEffect(() => {
    const handleCurrencyEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CurrencyCode>;
      if (customEvent.detail) {
        setCurrency(customEvent.detail);
      }
    };
    window.addEventListener('tripverse_currency_change', handleCurrencyEvent);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrencyEvent);
  }, []);

  if (!isOpen) return null;

  const quota: UserSubscriptionQuota = getUserSubscriptionQuota(currentUser);
  const isPro = quota.isPro;

  // Base pricing in INR, dynamically converted to user's currency
  const monthlyPriceINR = 499;
  const annualPriceINR = 3999;
  const annualPerMonthINR = Math.round(annualPriceINR / 12);

  const formattedMonthly = formatCurrency(monthlyPriceINR, currency);
  const formattedAnnual = formatCurrency(annualPriceINR, currency);
  const formattedAnnualPerMonth = formatCurrency(annualPerMonthINR, currency);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    triggerHaptic('medium');
    try {
      await upgradeUserToPro(currentUser, billingCycle === 'annual' ? 365 : 30);
      setSuccessMessage('Welcome to TripVerse Pro! Unlimited trips and 30h/week AI Co-Pilot activated.');
      triggerHaptic('success');
      try {
        confetti({
          particleCount: 110,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#2D5A3D', '#D4AF37', '#10B981', '#E8EFE7', '#F59E0B']
        });
      } catch {}

      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        if (onSubscribed) onSubscribed();
        onClose();
      }, 1500);
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
      setSuccessMessage('Switched back to Free Tier.');
      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        if (onSubscribed) onSubscribed();
      }, 1000);
    } catch {
      setIsProcessing(false);
    }
  };

  const features = [
    {
      title: 'Unlimited AI Trip Plannings',
      desc: 'Create and save endless custom multi-day vacation itineraries without monthly caps.'
    },
    {
      title: '30h / Week Dedicated AI Brain',
      desc: 'High-speed multi-turn ConCode AI reasoning for live itinerary updates, local food gems, and rest stops.'
    },
    {
      title: 'Dynamic Weather & Road Re-routing',
      desc: 'Instant detour adjustments for monsoon weather alerts, transit delays, or road maintenance.'
    },
    {
      title: 'High-Resolution Offline Dossiers',
      desc: 'Export beautiful printable PDF travel guides with verified emergency SOS contacts and booking details.'
    },
    {
      title: 'Group Collaboration & Live Sync',
      desc: 'Invite travel companions to view, vote, and co-edit itineraries with real-time cloud synchronization.'
    }
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-[32px] bg-white dark:bg-[#0E1726] shadow-[0_25px_80px_rgba(45,90,61,0.22)] border border-[#E2EBE1] dark:border-slate-800 flex flex-col font-sans"
      >
        {/* Top Organic Sage & Emerald Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#152A1C] via-[#1E3E2A] to-[#2D5A3D] text-white p-6 sm:p-8 rounded-t-[32px]">
          
          {/* Subtle Ambient Decorative Glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-1 space-y-3">
            {/* VIP Pass Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-xs font-bold shadow-xs">
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>{isPro ? 'VIP Membership Active' : 'TripVerse Pro Pass'}</span>
            </div>

            {/* Editorial Headline */}
            <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-white leading-tight">
              {title} <span className="font-serif italic font-normal text-emerald-300">TripVerse Pro</span>
            </h2>

            <p className="text-emerald-100/85 text-xs sm:text-sm leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 space-y-5 bg-[#F4F6F2]/40 dark:bg-[#0E1726]">

          {/* Success Message Banner */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-xs animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Trial Status Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#E8EFE7] dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#152A1C] dark:text-slate-100 truncate">
                  {isPro ? 'Unlimited Trips Activated' : `${quota.freeTripsRemaining} of 3 Free Trips Available`}
                </div>
                <div className="text-[11px] text-[#5A7362] dark:text-slate-400 truncate">
                  {isPro ? '30h/week ConCode AI Co-Pilot Active' : 'Full-feature explorer trial'}
                </div>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
              isPro 
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300' 
                : 'bg-[#E8EFE7] text-[#2D5A3D] dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              {isPro ? 'ACTIVE' : 'TRIAL'}
            </span>
          </div>

          {/* Billing Cycle Pill Toggle */}
          {!isPro && (
            <div className="p-1 rounded-2xl bg-[#E8EFE7] dark:bg-slate-800 border border-[#DCE7DB] dark:border-slate-700 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setBillingCycle('annual');
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-white dark:bg-slate-700 text-[#152A1C] dark:text-white shadow-xs'
                    : 'text-[#5A7362] dark:text-slate-400 hover:text-[#152A1C]'
                }`}
              >
                <span>Annual Plan</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#2D5A3D] text-white text-[9px] font-black uppercase">
                  Save 33%
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setBillingCycle('monthly');
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-[#152A1C] dark:text-white shadow-xs'
                    : 'text-[#5A7362] dark:text-slate-400 hover:text-[#152A1C]'
                }`}
              >
                <span>Monthly Plan</span>
              </button>
            </div>
          )}

          {/* Pricing Highlight Card */}
          {!isPro && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#5A7362] dark:text-slate-400">
                  {billingCycle === 'annual' ? 'Billed annually' : 'Flexible billing'}
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-3xl font-display font-black text-[#152A1C] dark:text-white">
                    {billingCycle === 'annual' ? formattedAnnualPerMonth : formattedMonthly}
                  </span>
                  <span className="text-xs text-[#5A7362] dark:text-slate-400 font-medium">/ month</span>
                </div>
                <div className="text-[11px] text-[#2D5A3D] dark:text-emerald-400 font-semibold mt-0.5">
                  {billingCycle === 'annual' 
                    ? `${formattedAnnual} total per year • Cancel anytime` 
                    : `${formattedMonthly} charged monthly • Cancel anytime`}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E8EFE7] dark:bg-emerald-950 text-[#2D5A3D] dark:text-emerald-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>VIP Access</span>
                </span>
              </div>
            </div>
          )}

          {/* Features Checklist */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A7362] dark:text-slate-400 px-1">
              What’s Included in Pro
            </h3>

            <div className="space-y-2.5">
              {features.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-800 flex items-start gap-3 shadow-2xs"
                >
                  <div className="w-6 h-6 rounded-full bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-[#152A1C] dark:text-slate-100">{item.title}</h4>
                    <p className="text-[11px] text-[#5A7362] dark:text-slate-400 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            {isPro ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center text-xs font-bold text-[#2D5A3D] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✓ Your TripVerse Pro membership is active
                </div>
                <button
                  type="button"
                  onClick={handleDowngrade}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Switch back to Free Tier (Developer Test)
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={isProcessing}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#2D5A3D] hover:bg-[#234730] text-white font-display font-bold text-sm shadow-[0_8px_30px_rgba(45,90,61,0.28)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-75"
              >
                <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>
                  {isProcessing 
                    ? 'Activating Pro...' 
                    : `Upgrade to Pro — ${billingCycle === 'annual' ? formattedAnnual : formattedMonthly}`}
                </span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}

            <div className="flex items-center justify-center gap-2 text-[11px] text-[#5A7362] dark:text-slate-400 text-center mt-2.5">
              <Lock className="w-3 h-3 text-[#2D5A3D]" />
              <span>100% Risk-Free • Instant Activation • Cancel Anytime</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-[#E2EBE1] dark:border-slate-800 rounded-b-[32px] flex items-center justify-between text-xs text-[#5A7362] dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2D5A3D]" />
            <span>Bank-grade security</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#152A1C] dark:text-slate-200 hover:underline cursor-pointer"
          >
            Continue Browsing
          </button>
        </div>

      </div>
    </div>
  );
};
