import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Copy, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Smartphone, 
  QrCode,
  CheckCircle2,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../../services/deviceService';
import { formatCurrency, SupportedCurrency } from '../../services/currencyService';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromUser: string;
  toUser: string;
  amount: number;
  currency: SupportedCurrency;
  onMarkSettled: (from: string, to: string, amt: number) => void;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  fromUser,
  toUser,
  amount,
  currency,
  onMarkSettled
}) => {
  const sanitizedName = toUser.toLowerCase().replace(/[^a-z0-9]/g, '') || 'payee';
  const [upiId, setUpiId] = useState(`${sanitizedName}@okhdfcbank`);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  if (!isOpen) return null;

  // Standard Indian NPCI UPI deep-link URI specification
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(toUser)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`TripVerse Settlement: ${fromUser} to ${toUser}`)}`;
  
  // Safe QR Server URL
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(upiUri)}&color=0B2545&bgcolor=FFFFFF&margin=2`;

  const handleCopyUpi = () => {
    navigator.clipboard?.writeText(upiId);
    setCopiedUpi(true);
    triggerHaptic('light');
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyUpiLink = () => {
    navigator.clipboard?.writeText(upiUri);
    setCopiedLink(true);
    triggerHaptic('light');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConfirmSettlement = () => {
    setIsSettled(true);
    triggerHaptic('success');

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00D084', '#00B074', '#38BDF8', '#F59E0B']
      });
    } catch (e) {
      // safe fallback
    }

    setTimeout(() => {
      onMarkSettled(fromUser, toUser, amount);
      onClose();
      setIsSettled(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-scaleUp flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-[#0B2545] to-[#133966] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Instant UPI Payment</span>
              </div>
              <h3 className="text-base font-bold font-display">
                Settle Balance with {toUser}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* Amount Badge */}
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-center space-y-1">
            <span className="badge-caps text-emerald-700">Settlement Amount</span>
            <div className="text-3xl sm:text-4xl font-black font-display text-[#0B2545]">
              {formatCurrency(amount, currency)}
            </div>
            <div className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5 pt-1">
              <span className="font-bold text-slate-700">{fromUser}</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-bold text-slate-700">{toUser}</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col items-center justify-center space-y-3 shadow-inner">
            <div className="relative p-2 bg-white rounded-2xl border-2 border-emerald-500/30 shadow-md">
              <img 
                src={qrImageUrl} 
                alt="UPI Payment QR Code"
                className="w-52 h-52 object-contain rounded-xl"
                loading="eager"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-9 h-9 rounded-full bg-white shadow-lg p-1.5 flex items-center justify-center border border-slate-200">
                  <span className="text-[10px] font-black font-display text-[#00B074]">UPI</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium text-center">
              Scan with any UPI App: Google Pay, PhonePe, Paytm, BHIM, or Navi
            </p>
          </div>

          {/* UPI ID Field with 1-click copy */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Payee UPI ID:</span>
              <span className="text-[10px] text-slate-400 font-normal">Editable if different</span>
            </label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={upiId} 
                onChange={e => setUpiId(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="e.g. mobile@upi or name@okaxis"
              />
              <button
                type="button"
                onClick={handleCopyUpi}
                className={`px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  copiedUpi 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* 1-Click Launch on Mobile UPI Apps */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Direct Mobile Pay:</span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={upiUri}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 transition-colors"
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>Open in UPI App</span>
              </a>

              <button
                type="button"
                onClick={handleCopyUpiLink}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center gap-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedLink ? 'Link Copied' : 'Copy UPI Link'}</span>
              </button>
            </div>
          </div>

          {/* Mark as Settled CTA */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleConfirmSettlement}
              disabled={isSettled}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                isSettled
                  ? 'bg-emerald-600 text-white'
                  : 'bg-trip-gradient hover:bg-trip-gradient-hover text-white active:scale-95'
              }`}
            >
              {isSettled ? (
                <>
                  <CheckCircle2 className="w-4 h-4 animate-bounce" />
                  <span>Settlement Marked as Paid!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>I Have Paid • Mark as Settled</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Encrypted NPCI UPI Standard • Zero platform commission</span>
          </div>

        </div>

      </div>
    </div>
  );
};
