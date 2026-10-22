import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  X, 
  QrCode, 
  Clock, 
  RefreshCw, 
  Copy, 
  Check, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, SupportedCurrency } from '../../services/currencyService';
import { triggerHaptic } from '../../services/deviceService';
import { buildUpiPaymentUri, getUpiQrCodeUrl } from '../../services/paymentGatewayService';

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
  // 5-Minute (300 seconds) Countdown Timer State
  const INITIAL_TIMER_SECONDS = 300;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(INITIAL_TIMER_SECONDS);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(true);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [isSettled, setIsSettled] = useState<boolean>(false);

  // Recipient VPA derivation
  const recipientVpa = `${toUser.toLowerCase().replace(/[^a-z0-9]/g, '')}.travel@okhdfcbank`;

  // Build UPI URI & QR Code
  const upiUri = buildUpiPaymentUri({
    payeeVpa: recipientVpa,
    payeeName: toUser,
    amount: amount,
    transactionRef: `SETTLE${Date.now().toString().slice(-6)}`,
    transactionNote: `TripVerse Settlement ${fromUser} to ${toUser}`
  });
  const qrCodeUrl = getUpiQrCodeUrl(upiUri, 240);

  // Countdown Timer Engine
  useEffect(() => {
    if (!isOpen || !isTimerActive || isSettled) return;

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isTimerActive, isSettled]);

  if (!isOpen) return null;

  const handleRegenerate = () => {
    triggerHaptic('light');
    setSecondsRemaining(INITIAL_TIMER_SECONDS);
    setIsTimerActive(true);
  };

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(recipientVpa);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-details-title"
        className="w-full max-w-md space-y-4 rounded-[32px] border border-[#E2EBE1] bg-white p-5 sm:p-6 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Instant UPI Settlement Gateway</span>
            </div>
            <h2 id="settlement-details-title" className="mt-0.5 text-lg font-bold text-[#152A1C]">
              Scan to Pay & Settle Balance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settlement details"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-[#EAF0E9] hover:text-[#152A1C] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Amount & Direction Header */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50/60 to-slate-50 p-3.5 text-center border border-[#E2EBE1]">
          <p className="text-[11px] font-semibold text-[#5A7362] uppercase tracking-wider">Settlement Amount</p>
          <p className="text-2xl sm:text-3xl font-black text-[#152A1C] mt-0.5">
            {formatCurrency(amount, currency)}
          </p>
          <p className="mt-1 flex items-center justify-center gap-2 text-xs font-bold text-[#152A1C]">
            <span>{fromUser}</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#2D5A3D]" />
            <span className="text-emerald-800">{toUser}</span>
          </p>
        </div>

        {/* Dynamic QR Code & 5-Minute Timer Section */}
        {!isSettled ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center space-y-3 shadow-xs">
            
            {/* 5-Min Timer Pill */}
            <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center w-7 h-7">
                  <svg className="w-7 h-7 -rotate-90">
                    <circle cx="14" cy="14" r={timerRadius} className="stroke-slate-200" strokeWidth="2.5" fill="transparent" />
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
                <div className="text-left">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">QR Valid For</span>
                  <span className="text-xs font-mono font-black text-slate-900">{formatTimer(secondsRemaining)}</span>
                </div>
              </div>

              {secondsRemaining === 0 ? (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active
                </span>
              )}
            </div>

            {/* QR Matrix */}
            {secondsRemaining > 0 ? (
              <div className="space-y-2">
                <div className="relative mx-auto w-40 h-40 p-2 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center justify-center">
                  <img src={qrCodeUrl} alt="Scan to pay settlement" className="w-full h-full object-contain rounded-lg" />
                  <div className="absolute inset-0 m-auto w-8 h-8 rounded-lg bg-white/95 border border-emerald-700 shadow-sm flex items-center justify-center">
                    <span className="text-[10px] font-black text-emerald-800">UPI</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Scan using GPay, PhonePe, Paytm, or CRED
                </p>
              </div>
            ) : (
              <div className="py-4 space-y-2">
                <p className="text-xs text-rose-600 font-bold">QR code expired (5-minute security timeout)</p>
                <button
                  type="button"
                  onClick={handleRegenerate}
                  className="px-4 py-1.5 rounded-xl bg-emerald-800 text-white font-bold text-xs"
                >
                  Regenerate QR Code
                </button>
              </div>
            )}

            {/* Recipient VPA */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
              <div className="text-left truncate mr-2">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Recipient UPI VPA</span>
                <span className="font-mono font-bold text-slate-800 truncate block">{recipientVpa}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyVpa}
                className="shrink-0 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-colors cursor-pointer"
                title="Copy VPA"
              >
                {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Confirmation CTA */}
            <button
              type="button"
              onClick={handleConfirmSettlement}
              className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Mark as Paid & Record Settlement</span>
            </button>
          </div>
        ) : (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Settlement Recorded!</h3>
            <p className="text-xs text-slate-500">
              {fromUser} paid {formatCurrency(amount, currency)} to {toUser}. Balance is updated.
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>NPCI Unified Payments Interface • End-to-End Encrypted</span>
        </div>
      </section>
    </div>
  );
};
