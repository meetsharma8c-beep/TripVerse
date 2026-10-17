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
        className="w-full max-w-md space-y-5 rounded-[32px] border border-[#E2EBE1] bg-white p-5 shadow-2xl sm:p-6"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#2D5A3D]">Suggested settlement</p>
            <h2 id="settlement-details-title" className="mt-1 text-lg font-bold text-[#152A1C]">
              Payment is handled outside TripVerse
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settlement details"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-[#EAF0E9] hover:text-[#152A1C] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="rounded-2xl bg-[#F4F6F2] p-4 text-center border border-[#E2EBE1]">
          <p className="text-xs text-[#5A7362]">Suggested amount</p>
          <p className="mt-1 text-3xl font-black text-[#152A1C]">{formatCurrency(amount, currency)}</p>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-[#152A1C]">
            {fromUser}
            <ArrowRight className="h-4 w-4 text-[#2D5A3D]" />
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
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full btn-liquid-primary px-4 py-2 text-sm font-bold text-white cursor-pointer"
        >
          Close
          <ExternalLink className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
};
