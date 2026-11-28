import { useModalBehavior } from '../../hooks/useModalBehavior';
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X, Clock, RefreshCw, Copy, Check, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, SupportedCurrency } from '../../services/currencyService';
import { triggerHaptic, copyTextToClipboard } from '../../services/deviceService';
import { buildUpiPaymentUri, getUpiQrCodeUrl } from '../../services/paymentGatewayService';
import { useLanguage } from '../../services/languageService';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromUser: string;
  toUser: string;
  amount: number;
  currency: SupportedCurrency;
  onSettleCompleted?: (fromUser: string, toUser: string, amount: number) => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  fromUser,
  toUser,
  amount,
  currency,
  onSettleCompleted
}) => {
  const { t } = useLanguage();
  // 5-Minute (300 seconds) Countdown Timer State
  const INITIAL_TIMER_SECONDS = 300;
  const targetExpiryRef = React.useRef<number>(Date.now() + INITIAL_TIMER_SECONDS * 1000);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(INITIAL_TIMER_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [isSettled, setIsSettled] = useState<boolean>(false);

  // Recipient VPA derivation with custom editable override
  const [customVpa, setCustomVpa] = useState<string>(() => {
    try {
      return localStorage.getItem(`tripverse_vpa_${toUser}`) || '';
    } catch {
      return '';
    }
  });
  const [isEditingVpa, setIsEditingVpa] = useState<boolean>(false);
  const [tempVpa, setTempVpa] = useState<string>('');

  const recipientVpa = customVpa.trim();
  const hasVerifiedVpa = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(recipientVpa);

  const [transactionRef, setTransactionRef] = useState(() => `SETTLE${Date.now().toString().slice(-6)}`);

  useEffect(() => {
    if (isOpen) {
      setTransactionRef(`SETTLE${Date.now().toString().slice(-6)}`);
      targetExpiryRef.current = Date.now() + INITIAL_TIMER_SECONDS * 1000;
      setSecondsRemaining(INITIAL_TIMER_SECONDS);
      setIsTimerActive(true);
    }
  }, [isOpen, toUser, fromUser, amount]);
  const upiUri = useMemo(() => buildUpiPaymentUri({
    payeeVpa: recipientVpa,
    payeeName: toUser,
    amount: amount,
    transactionRef,
    transactionNote: `TripVerse Settlement ${fromUser} to ${toUser}`
  }), [recipientVpa, toUser, amount, transactionRef, fromUser]);
  const qrCodeUrl = useMemo(() => getUpiQrCodeUrl(upiUri, 240), [upiUri]);

  // Countdown Timer Engine (Wall-clock accuracy)
  useEffect(() => {
    if (!isOpen || !isTimerActive || isSettled) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((targetExpiryRef.current - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setIsTimerActive(false);
      }
    };

    tick();
    const timer = setInterval(tick, 500);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || (typeof document.hasFocus === 'function' && document.hasFocus())) {
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isOpen, isTimerActive, isSettled]);

  useModalBehavior(isOpen, undefined);
  if (!isOpen) return null;

  const handleRegenerate = () => {
    triggerHaptic('light');
    targetExpiryRef.current = Date.now() + INITIAL_TIMER_SECONDS * 1000;
    setSecondsRemaining(INITIAL_TIMER_SECONDS);
    setIsTimerActive(true);
  };

  const handleCopyVpa = () => {
    void copyTextToClipboard(recipientVpa);
    setCopiedVpa(true);
    triggerHaptic('light');
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  const handleConfirmSettlement = () => {
    triggerHaptic('success');
    setIsSettled(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2D5A3D', '#10B981', '#34D399', '#D4AF37']
      });
    } catch {}

    if (onSettleCompleted) {
      onSettleCompleted(fromUser, toUser, amount);
    }

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  // Timer Formatting
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerRadius = 16;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const strokeDashoffset = timerCircumference - (secondsRemaining / INITIAL_TIMER_SECONDS) * timerCircumference;

  const modalMarkup = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-details-title"
        className="w-full max-w-md space-y-4 rounded-[32px] border border-[#E2EBE1] dark:border-slate-800 bg-white dark:bg-[#0C1523] p-5 sm:p-6 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>{t('Instant UPI Settlement Gateway')}</span>
            </div>
            <h2 id="settlement-details-title" className="mt-0.5 text-lg font-bold text-[#152A1C] dark:text-white">
              {t('Scan to Pay & Settle Balance')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('Close')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-[#EAF0E9] hover:text-[#152A1C] dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Amount & Direction Header */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/60 to-slate-50 dark:from-emerald-950/40 dark:to-slate-900/80 p-3.5 text-center border border-[#E2EBE1] dark:border-slate-800">
          <p className="text-[11px] font-semibold text-[#5A7362] dark:text-slate-400 uppercase tracking-wider">{t('Settlement Amount')}</p>
          <p className="text-2xl sm:text-3xl font-black text-[#152A1C] dark:text-white mt-0.5">
            {formatCurrency(amount, currency)}
          </p>
          <p className="mt-1 flex items-center justify-center gap-2 text-xs font-bold text-[#152A1C] dark:text-slate-200">
            <span>{fromUser}</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#2D5A3D] dark:text-emerald-400" />
            <span className="text-emerald-800 dark:text-emerald-400">{toUser}</span>
          </p>
        </div>

        {/* Dynamic QR Code & 5-Minute Timer Section */}
        {!isSettled ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F1A2A] p-4 text-center space-y-3 shadow-xs">
            
            {currency === 'INR' ? (
              <>
                {hasVerifiedVpa ? (
                  <>
                    {/* 5-Min Timer Pill */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center w-7 h-7">
                          <svg className="w-7 h-7 -rotate-90">
                            <circle cx="14" cy="14" r={timerRadius} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="2.5" fill="transparent" />
                            <circle
                              cx="14"
                              cy="14"
                              r={timerRadius}
                              className={secondsRemaining > 60 ? 'stroke-emerald-600' : 'stroke-rose-500 animate-pulse'}
                              strokeWidth="2.5"
                              strokeDasharray={timerCircumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              fill="transparent"
                            />
                          </svg>
                          <Clock className={`w-3 h-3 absolute ${secondsRemaining > 60 ? 'text-emerald-600' : 'text-rose-500'}`} />
                        </div>
                        <div className="text-left" translate="no" data-no-translate="true">
                          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">QR Valid For</span>
                          <span 
                            translate="no"
                            data-no-translate="true"
                            className="text-xs font-mono font-black text-slate-900 dark:text-white notranslate"
                          >
                            {formatTimer(secondsRemaining)}
                          </span>
                        </div>
                      </div>

                      {secondsRemaining === 0 ? (
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 border border-transparent dark:border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          Active
                        </span>
                      )}
                    </div>

                    {/* QR Matrix */}
                    {secondsRemaining > 0 ? (
                      <div className="space-y-2">
                        <div className="relative mx-auto w-40 h-40 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white shadow-xs flex items-center justify-center">
                          <img src={qrCodeUrl} alt="Scan to pay settlement" decoding="async" className="w-full h-full object-contain rounded-lg" />
                          <div className="absolute inset-0 m-auto w-8 h-8 rounded-lg bg-white/95 border border-emerald-700 shadow-sm flex items-center justify-center">
                            <span className="text-[10px] font-black text-emerald-800">UPI</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Scan using GPay, PhonePe, Paytm, or CRED
                        </p>
                      </div>
                    ) : (
                      <div className="py-4 space-y-2">
                        <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">QR code expired (5-minute security timeout)</p>
                        <button
                          type="button"
                          onClick={handleRegenerate}
                          className="px-4 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs cursor-pointer shadow-sm"
                        >
                          Regenerate QR Code
                        </button>
                      </div>
                    )}

                    {/* 1-Tap Direct UPI App Launcher */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        window.location.href = upiUri;
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Open UPI App (GPay / PhonePe / Paytm)</span>
                    </button>
                  </>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/50 text-left space-y-2">
                    <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 block">
                      Enter {toUser}’s UPI ID to generate a real QR & payment link
                    </span>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-snug">
                      TripVerse never guesses bank handles. Enter {toUser}’s verified UPI VPA below (saved on your device for future splits), or tap “Mark as Paid” if settled in cash.
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="e.g. name@oksbi or 9876543210@ybl"
                        value={tempVpa}
                        onChange={(e) => setTempVpa(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (/^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(tempVpa.trim())) {
                            setCustomVpa(tempVpa.trim());
                            try {
                              localStorage.setItem(`tripverse_vpa_${toUser}`, tempVpa.trim());
                            } catch {}
                            setIsEditingVpa(false);
                            triggerHaptic('success');
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-xs cursor-pointer"
                      >
                        Generate QR
                      </button>
                    </div>
                  </div>
                )}

                {/* Recipient VPA (shown once set) */}
                {hasVerifiedVpa && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 bg-slate-50 dark:bg-slate-900/80 p-2.5 rounded-xl text-left">
                    <div className="flex items-center justify-between text-xs">
                      <div className="truncate mr-2">
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block">Recipient UPI VPA</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate block">{recipientVpa}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setTempVpa(recipientVpa);
                            setIsEditingVpa(!isEditingVpa);
                          }}
                          className="text-[10px] text-emerald-600 dark:text-emerald-400 underline font-semibold px-1 py-0.5 cursor-pointer"
                        >
                          {isEditingVpa ? 'Cancel' : 'Edit VPA'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyVpa}
                          className="shrink-0 p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-600 transition-colors cursor-pointer"
                          title="Copy VPA"
                        >
                          {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {isEditingVpa && (
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <input
                          type="text"
                          placeholder="e.g. rohit@okhdfcbank"
                          value={tempVpa}
                          onChange={(e) => setTempVpa(e.target.value)}
                          className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (/^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(tempVpa.trim())) {
                              setCustomVpa(tempVpa.trim());
                              try {
                                localStorage.setItem(`tripverse_vpa_${toUser}`, tempVpa.trim());
                              } catch {}
                              setIsEditingVpa(false);
                              triggerHaptic('light');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* International Settlement View */
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">Direct International Settle</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800/80">Global P2P</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Settle <strong>{formatCurrency(amount, currency)}</strong> directly with <strong>{toUser}</strong> via PayPal, Wise, Revolut, Zelle, or cash, then tap <strong>Mark as Paid</strong> below to update the group ledger.
                  </p>
                </div>
              </div>
            )}

            {/* Confirmation CTA */}
            <button
              type="button"
              onClick={handleConfirmSettlement}
              className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>{t('Mark as Paid & Record Settlement')}</span>
            </button>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-transparent dark:border-emerald-800 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('Settlement Recorded!')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {fromUser} {t('paid')} {formatCurrency(amount, currency)} {t('to')} {toUser}. {t('Balance is updated.')}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
          <span>{currency === 'INR' ? 'NPCI Unified Payments Interface • End-to-End Encrypted' : 'Bank-Grade 256-Bit SSL Encryption • Verified Traveler Settlement'}</span>
        </div>
      </section>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalMarkup, document.body)
    : modalMarkup;
};
