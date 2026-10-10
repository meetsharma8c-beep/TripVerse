import React from 'react';
import { ArrowRight, ExternalLink, X } from 'lucide-react';
import { formatCurrency, SupportedCurrency } from '../../services/currencyService';

interface UpiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromUser: string;
  toUser: string;
  amount: number;
  currency: SupportedCurrency;
}

export const UpiPaymentModal: React.FC<UpiPaymentModalProps> = ({
  isOpen,
  onClose,
  fromUser,
  toUser,
  amount,
  currency
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settlement-details-title"
        className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Suggested settlement</p>
            <h2 id="settlement-details-title" className="mt-1 text-lg font-bold text-[#0B2545]">
              Payment is handled outside TripVerse
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settlement details"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-xs text-slate-500">Suggested amount</p>
          <p className="mt-1 text-3xl font-black text-[#0B2545]">{formatCurrency(amount, currency)}</p>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700">
            {fromUser}
            <ArrowRight className="h-4 w-4 text-emerald-700" />
            {toUser}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          TripVerse does not create payment requests, generate recipient UPI IDs or QR codes, process payments, or
          verify transfers. Confirm the recipient’s payment details with them directly and use your own trusted payment
          app. Record a settlement in TripVerse only after the travelers confirm it.
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#0B2545] px-4 py-2 text-sm font-bold text-white hover:bg-[#133966]"
        >
          Close
          <ExternalLink className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
};
