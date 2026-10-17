import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  Check, 
  X, 
  ShieldCheck, 
  Compass, 
  ChevronRight,
  CheckCircle2,
  Lock,
  Zap,
  MapPin,
  CloudRain,
  FileText
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
  title = 'Travel Without Limits with',
  subtitle = 'Unlock unlimited AI itineraries, real-time monsoon detours, and a dedicated 30h/week AI travel co-pilot.'
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
      setSuccessMessage('Welcome to TripVerse Pro! VIP privileges activated.');
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
      }, 1400);
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

  const perks = [
    {
      icon: Zap,
      title: 'Unlimited AI Trips',
      desc: 'Zero generation or saving limits'
    },
    {
      icon: Compass,
      title: '30h / Wk AI Brain',
      desc: 'High-speed live Co-Pilot reasoning'
    },
    {
      icon: CloudRain,
      title: 'Dynamic Detours',
      desc: 'Monsoon, transit & road alerts'
    },
    {
      icon: FileText,
      title: 'Offline PDF Passes',
      desc: 'Printable guides & SOS contacts'
    }
  ];

  return (
    <div className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      
      {/* 
        Outer modal card:
        - overflow-hidden strictly guarantees rounded-[30px] sm:rounded-[36px] without native scrollbars breaking corners!
        - my-auto ensures centered floating on large screens and smooth complete scrolling on tiny viewports.
      */}
      <div 
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[480px] rounded-[30px] sm:rounded-[36px] overflow-hidden bg-white dark:bg-[#0E1726] shadow-[0_30px_100px_rgba(21,42,28,0.32),0_0_0_1px_rgba(226,235,225,0.7)] dark:shadow-[0_30px_100px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col font-sans transition-all my-auto"
      >

        {/* ─── HERO HEADER: Emerald & Deep Pine Horizon ─── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#112316] via-[#1A3824] to-[#2D5A3D] text-white p-6 sm:p-7">
          
          {/* Subtle Ambient Decorative Glows */}
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-emerald-400/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
          
          {/* Subtle Geometric Luxury Watermark */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08)_0%,transparent_70%)] pointer-events-none" />

          {/* Close Button - Smooth Frosted Glass Pill */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer z-10 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-1 space-y-2.5">
            {/* VIP Pass Gold Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400/20 to-emerald-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold tracking-wide shadow-xs">
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>{isPro ? 'VIP PASS ACTIVE' : 'TRIPVERSE VIP PASS'}</span>
            </div>

            {/* Editorial Headline */}
            <h2 className="text-2xl sm:text-[26px] font-display font-extrabold tracking-tight text-white leading-tight">
              {title} <span className="font-serif italic font-normal text-emerald-300">TripVerse Pro</span>
            </h2>

            <p className="text-emerald-100/80 text-xs leading-relaxed max-w-[390px]">
              {subtitle}
            </p>
          </div>
        </div>

        {/* ─── MODAL BODY: Compact, Single-Fold Luxury Experience ─── */}
        <div className="p-5 sm:p-6 space-y-4 bg-[#F8FAF7] dark:bg-[#0E1726]">

          {/* Success Notification */}
          {successMessage && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 shadow-2xs animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Explorer Trial Status - Crisp Integrated Banner */}
          <div className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-800 flex items-center justify-between text-xs shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-medium text-[#152A1C] dark:text-slate-200 truncate text-[11px]">
                {isPro ? 'Unlimited Trips & 30h AI Co-Pilot Active' : `${quota.freeTripsRemaining} of 3 Free Explorer Trips Available`}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase shrink-0 ${
              isPro 
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300' 
                : 'bg-[#E8EFE7] text-[#2D5A3D] dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              {isPro ? 'ACTIVE' : 'TRIAL'}
            </span>
          </div>

          {/* Side-by-Side Dual Plan Selection Cards (Annual vs Monthly) */}
          {!isPro && (
            <div className="grid grid-cols-2 gap-3">
              {/* Annual Plan Card */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setBillingCycle('annual');
                }}
                className={`relative p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                  billingCycle === 'annual'
                    ? 'bg-white dark:bg-slate-900 border-2 border-[#2D5A3D] shadow-[0_6px_20px_rgba(45,90,61,0.14)] ring-1 ring-[#2D5A3D]/20'
                    : 'bg-white/80 dark:bg-slate-900/60 border border-[#E2EBE1] dark:border-slate-800 hover:border-[#2D5A3D]/50 opacity-80 hover:opacity-100'
                }`}
              >
                {/* Popular / Best Value Badge */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#2D5A3D] text-white text-[9px] font-extrabold uppercase tracking-wide">
                    Save 33%
                  </span>
                  {billingCycle === 'annual' && (
                    <div className="w-4 h-4 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#5A7362] dark:text-slate-400">
                    Annual Pass
                  </div>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-2xl font-display font-black text-[#152A1C] dark:text-white">
                      {formattedAnnualPerMonth}
                    </span>
                    <span className="text-[10px] text-[#5A7362] dark:text-slate-400 font-medium">/ mo</span>
                  </div>
                  <div className="text-[10px] text-[#2D5A3D] dark:text-emerald-400 font-semibold mt-1">
                    {formattedAnnual} billed yearly
                  </div>
                </div>
              </button>

              {/* Monthly Plan Card */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setBillingCycle('monthly');
                }}
                className={`relative p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                  billingCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 border-2 border-[#2D5A3D] shadow-[0_6px_20px_rgba(45,90,61,0.14)] ring-1 ring-[#2D5A3D]/20'
                    : 'bg-white/80 dark:bg-slate-900/60 border border-[#E2EBE1] dark:border-slate-800 hover:border-[#2D5A3D]/50 opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#E8EFE7] text-[#2D5A3D] dark:bg-slate-800 dark:text-emerald-300 text-[9px] font-bold uppercase tracking-wide">
                    Flexible
                  </span>
                  {billingCycle === 'monthly' && (
                    <div className="w-4 h-4 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#5A7362] dark:text-slate-400">
                    Monthly Pass
                  </div>
                  <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className="text-2xl font-display font-black text-[#152A1C] dark:text-white">
                      {formattedMonthly}
                    </span>
                    <span className="text-[10px] text-[#5A7362] dark:text-slate-400 font-medium">/ mo</span>
                  </div>
                  <div className="text-[10px] text-[#5A7362] dark:text-slate-400 font-medium mt-1">
                    Billed every month
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* 4 Core VIP Privileges Grid (Compact 2x2) */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#5A7362] dark:text-slate-400 px-1">
              Included with TripVerse Pro
            </div>

            <div className="grid grid-cols-2 gap-2">
              {perks.map((perk, idx) => {
                const IconComponent = perk.icon;
                return (
                  <div 
                    key={idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-[#E2EBE1] dark:border-slate-800 flex items-start gap-2 shadow-2xs"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#E8EFE7] dark:bg-emerald-950/70 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[#152A1C] dark:text-slate-100 truncate">
                        {perk.title}
                      </div>
                      <div className="text-[10px] text-[#5A7362] dark:text-slate-400 leading-tight truncate">
                        {perk.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Action Button (Above the fold, liquid emerald) */}
          <div className="pt-1 space-y-2">
            {isPro ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-center text-xs font-bold text-[#2D5A3D] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  ✓ Your TripVerse Pro membership is active
                </div>
                <button
                  type="button"
                  onClick={handleDowngrade}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Switch back to Free Tier (Developer Test)
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={isProcessing}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#1E3B27] via-[#2D5A3D] to-[#234730] hover:brightness-105 text-white font-display font-bold text-sm shadow-[0_8px_30px_rgba(45,90,61,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-75"
              >
                <Crown className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
                <span className="truncate">
                  {isProcessing 
                    ? 'Activating Pro Pass...' 
                    : `Upgrade to Pro — ${billingCycle === 'annual' ? formattedAnnual : formattedMonthly}`}
                </span>
                <ChevronRight className="w-4 h-4 ml-0.5 shrink-0" />
              </button>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#5A7362] dark:text-slate-400 text-center">
              <Lock className="w-3 h-3 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
              <span>100% Risk-Free • Instant Access • Cancel Anytime</span>
            </div>
          </div>

        </div>

        {/* ─── MODAL FOOTER: Crisp, Clean Security Lock ─── */}
        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-t border-[#E2EBE1] dark:border-slate-800 flex items-center justify-between text-xs text-[#5A7362] dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400" />
            <span className="text-[11px]">Bank-grade 256-bit encryption</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold text-[#152A1C] dark:text-slate-200 hover:text-[#2D5A3D] dark:hover:text-emerald-300 transition-colors cursor-pointer"
          >
            Continue Browsing
          </button>
        </div>

      </div>
    </div>
  );
};

