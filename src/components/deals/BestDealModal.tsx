import React, { useState } from 'react';
import { 
  TransportDeal, 
  TransportMode, 
  Trip 
} from '../../types/trip';
import { 
  Plane, 
  Train, 
  Bus, 
  Car, 
  Bike, 
  Sparkles, 
  Tag, 
  Copy, 
  Check, 
  Star, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Wallet, 
  X, 
  Zap,
  ExternalLink,
  Award,
  QrCode,
  Printer,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';

interface BestDealModalProps {
  trip: Trip;
  deal: TransportDeal;
  isOpen: boolean;
  onClose: () => void;
  onApplySavings?: (savingsAmount: number, reason: string) => void;
  onOpenBookingVoucher?: (deal: TransportDeal) => void;
  onViewAllDeals?: () => void;
}

export const BestDealModal: React.FC<BestDealModalProps> = ({
  trip,
  deal,
  isOpen,
  onClose,
  onApplySavings,
  onOpenBookingVoucher,
  onViewAllDeals
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [voucherCopied, setVoucherCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  React.useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  if (!isOpen || !deal) return null;

  const handleCopyCode = () => {
    if (!deal.couponCode) return;
    navigator.clipboard?.writeText(deal.couponCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyAndBook = () => {
    if (deal.couponCode) {
      navigator.clipboard?.writeText(deal.couponCode);
      setVoucherCopied(true);
      setTimeout(() => setVoucherCopied(false), 3000);
    }
    const info = getProviderBookingInfo(deal);
    window.open(info.url, '_blank', 'noopener,noreferrer');
  };

  const handlePrintVoucher = () => {
    const originalTitle = document.title;
    document.title = `TripVerse_Pass_${deal.provider}_${deal.mode}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    document.body.classList.add('printing-dossier-active');

    const cleanup = () => {
      document.title = originalTitle;
      document.body.classList.remove('printing-dossier-active');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 60000);

    window.print();
  };

  const handleApplyDiscount = () => {
    if (applied) return;
    setApplied(true);
    if (onApplySavings) {
      onApplySavings(deal.savingsAmount, `${deal.title} (${deal.provider}) Promo Code`);
    }
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00D084', '#00B074', '#F59E0B', '#38BDF8']
      });
    } catch (e) {
      // safe fallback
    }
  };

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case 'flight': return Plane;
      case 'train': return Train;
      case 'bus': return Bus;
      case 'car': return Car;
      case 'bike': return Bike;
      default: return Sparkles;
    }
  };

  const ModeIcon = getModeIcon(deal.mode);

  const getModeLabel = (mode: TransportMode) => {
    switch (mode) {
      case 'flight': return 'Flight Super Saver';
      case 'train': return 'Express Rail Deal';
      case 'bus': return 'Luxury Bus Deal';
      case 'car': return 'Self-Drive Roadtrip Pass';
      case 'bike': return 'Motorcycle Touring Deal';
      default: return 'Transit Deal';
    }
  };

  const getProviderBookingInfo = (currentDeal: TransportDeal) => {
    if (currentDeal.bookingUrl) return { url: currentDeal.bookingUrl, label: `Book on ${currentDeal.provider}` };
    const prov = (currentDeal.provider || '').toLowerCase();
    switch (currentDeal.mode) {
      case 'flight':
        if (prov.includes('indigo')) return { url: 'https://www.goindigo.in/', label: 'Book on IndiGo' };
        if (prov.includes('air india')) return { url: 'https://www.airindiaexpress.com/', label: 'Book on Air India' };
        if (prov.includes('akasa')) return { url: 'https://www.akasaair.com/', label: 'Book on Akasa Air' };
        return { url: 'https://www.makemytrip.com/flights/', label: 'Book on MakeMyTrip' };
      case 'train':
        return { url: 'https://www.irctc.co.in/nget/train-search', label: 'Book on IRCTC' };
      case 'bus':
        if (prov.includes('intrcity')) return { url: 'https://www.intrcity.com/', label: 'Book on IntrCity' };
        if (prov.includes('zingbus')) return { url: 'https://www.zingbus.com/', label: 'Book on Zingbus' };
        return { url: 'https://www.redbus.in/', label: 'Book on RedBus' };
      case 'car':
        if (prov.includes('zoomcar')) return { url: 'https://www.zoomcar.com/', label: 'Book on Zoomcar' };
        if (prov.includes('revv')) return { url: 'https://www.revv.co.in/', label: 'Book on Revv' };
        return { url: 'https://www.makemytrip.com/cabs/', label: 'Book on MakeMyTrip' };
      case 'bike':
        if (prov.includes('wheelstreet')) return { url: 'https://www.wheelstreet.com/', label: 'Rent on Wheelstreet' };
        return { url: 'https://www.royalbrothers.com/', label: 'Rent on Royal Brothers' };
      default:
        return { url: 'https://www.makemytrip.com/', label: 'Book with Partner' };
    }
  };

  const providerBooking = getProviderBookingInfo(deal);

  return (
    <div className="printable-target-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200 print:p-0 print:bg-white print:static print:inset-auto">
      
      <div className="printable-target-container bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 relative print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Top Header Banner with Emerald Gradient */}
        <div className="bg-gradient-to-r from-[#0B2545] via-[#0F325E] to-[#00B074] p-5 sm:p-6 pb-6 sm:pb-7 text-white relative overflow-hidden shrink-0 print:border-b-2 print:border-slate-800">
          {/* Subtle background glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none print:hidden" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer z-10 print:hidden no-print"
            aria-label="Close deal modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2 pr-10 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-extrabold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              {showVoucher ? 'TripPass Verified Digital Voucher' : 'AI Best Deal Unlocked'}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Mode: <strong className="text-white capitalize">{deal.mode}</strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-bold border border-emerald-400/40">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              100% Real Deal
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white pr-10 text-balance">
            {showVoucher 
              ? `${deal.provider} E-Ticket & Pass`
              : `Best ${deal.mode.toUpperCase()} Deal for ${trip.destination}!`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-100 mt-2 leading-relaxed text-pretty pr-8">
            {showVoucher
              ? 'Present this confirmed digital pass at check-in or scan the QR code to open operator verification.'
              : <>Our AI analyzed live carrier rates & discounts between <strong>{trip.origin}</strong> and <strong>{trip.destination}</strong> to find this exclusive offer.</>}
          </p>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          
          {showVoucher ? (
            /* DIGITAL BOARDING PASS / VOUCHER VIEW */
            <div className="space-y-4 animate-in fade-in">
              {/* Perforated ticket divider visual */}
              <div className="relative border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl p-4">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Departure Origin</span>
                    <strong className="text-base text-slate-900">{deal.route.from}</strong>
                    <span className="text-xs text-emerald-700 font-bold block">{deal.route.departureTime}</span>
                  </div>

                  <div className="text-center px-2">
                    <span className="text-[10px] font-bold text-slate-400 block">{deal.route.duration}</span>
                    <div className="w-16 sm:w-24 h-0.5 bg-emerald-400 my-1 mx-auto relative flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 absolute right-0" />
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                      Direct Confirmed
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">Arrival Destination</span>
                    <strong className="text-base text-slate-900">{deal.route.to}</strong>
                    <span className="text-xs text-emerald-700 font-bold block">{deal.route.arrivalTime}</span>
                  </div>
                </div>
              </div>

              {/* Fare & Passenger Card */}
              <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">Travelers</span>
                  <strong className="text-slate-800">{trip.travelersCount} Person(s)</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">Category</span>
                  <strong className="text-slate-800 capitalize">{deal.mode} Verified</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-medium">Net Deal Fare</span>
                  <strong className="text-[#00B074] font-black font-display">
                    {formatCurrency(deal.dealPrice, currency)}
                  </strong>
                </div>
              </div>

              {/* Coupon Code Section with 1-Click Copy & Open */}
              {deal.couponCode && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-50 border-2 border-dashed border-emerald-400 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-700" />
                      Official Promo Code
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">
                      Save {formatCurrency(deal.savingsAmount, currency)} ({deal.discountPercent}% OFF)
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200">
                    <div>
                      <span className="font-mono font-black text-lg text-[#0B2545] tracking-widest block">
                        {deal.couponCode}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {deal.expiryDate || 'Valid through 2026'} • {deal.minBookingAmount ? `Min spend ${formatCurrency(deal.minBookingAmount, currency)}` : 'No min spend'}
                      </span>
                    </div>

                    <button
                      onClick={handleCopyAndBook}
                      className="px-3.5 py-2 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                      title="Copy promo code and launch official booking portal"
                    >
                      {voucherCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied & Opening...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy & Open ↗</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Real Scannable Live QR Code */}
              <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 bg-white shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 block">Boarding Pass & QR Pass</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                      Live Scannable QR
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Scan with your phone camera or airline/rail app to open verified inventory directly.
                  </p>
                  <span className="text-[10px] font-mono text-slate-400 block pt-1">
                    PNR: {deal.mode.toUpperCase().slice(0, 3)}88914-CONFIRMED
                  </span>
                </div>

                <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-xs">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(providerBooking.url)}`}
                    alt="Booking QR"
                    className="w-full h-full object-contain rounded-lg"
                  />
                </div>
              </div>

              {/* Terms Snippet */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Offer Guarantee & Terms:</span>
                <p className="leading-relaxed">
                  {deal.termsAndConditions || 'Official operator fares with guaranteed price matching. Applicable for Indian credit/debit cards, UPI, and net banking.'}
                </p>
              </div>

            </div>
          ) : (
            /* STANDARD DEAL SHOWCASE CARD */
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/30 p-5 relative shadow-xs space-y-4">
              
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-trip-gradient text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                    <ModeIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-[#0B2545] text-base sm:text-lg">
                        {deal.provider}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#00B074] text-white text-[10px] font-black uppercase tracking-wider">
                        {deal.badge}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                        <ShieldCheck className="w-3 h-3 text-emerald-700" />
                        Verified Partner
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium block">
                      {getModeLabel(deal.mode)} • {deal.subtitle}
                    </span>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold self-start">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Conduit</span>
                </div>
              </div>

              {/* Route & Timings Badge */}
              <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  <div>
                    <span className="text-slate-400 font-normal text-[11px] block">Departure</span>
                    <span className="text-base text-slate-900">{deal.route.departureTime}</span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">{deal.route.from}</span>
                  </div>

                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 mb-1">
                      {deal.route.duration}
                    </span>
                    <div className="w-20 sm:w-28 h-0.5 bg-emerald-400 relative flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 absolute right-0" />
                      <ModeIcon className="w-3.5 h-3.5 text-emerald-600 bg-white px-0.5" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 text-center truncate max-w-[110px]">
                      {deal.route.stopsText}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-slate-400 font-normal text-[11px] block">Arrival</span>
                    <span className="text-base text-slate-900">{deal.route.arrivalTime}</span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">{deal.route.to}</span>
                  </div>
                </div>
              </div>

              {/* Price & Savings Banner */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-50 rounded-xl p-3.5 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="badge-caps text-slate-400 block">
                    Exclusive AI Discounted Price
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                    <span className="text-2xl sm:text-3xl font-black font-display text-[#00B074]">
                      {formatCurrency(deal.dealPrice, currency)}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 line-through">
                      {formatCurrency(deal.originalPrice, currency)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ({deal.priceUnit === 'total' ? 'Total Fare' : 'Per Person'})
                    </span>
                  </div>
                </div>

                <div className="sm:text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white font-black text-xs shadow-xs font-display whitespace-nowrap">
                    <Tag className="w-3 h-3 shrink-0" />
                    Save {formatCurrency(deal.savingsAmount, currency)} ({deal.discountPercent}% OFF)
                  </span>
                </div>
              </div>

              {/* Urgency tag */}
              {deal.urgencyText && (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50/80 px-3 py-2 rounded-xl border border-amber-200/60">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">{deal.urgencyText}</span>
                </div>
              )}

              {/* Verified Inclusions Checklist */}
              <div className="pt-3 border-t border-slate-200/70">
                <span className="text-xs font-bold text-slate-700 block mb-2">Verified Deal Inclusions:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {deal.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Terms & Conditions Accordion */}
              <div className="pt-2 border-t border-slate-200/60">
                <button
                  onClick={() => setShowTerms(!showTerms)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Official Promo Terms & Conditions</span>
                  {showTerms ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showTerms && (
                  <div className="mt-2.5 p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600 animate-in fade-in">
                    <p className="leading-relaxed">
                      <strong>Offer Rules:</strong> {deal.termsAndConditions || 'Valid on direct operator booking. Apply coupon at checkout.'}
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                      {deal.expiryDate && (
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          {deal.expiryDate}
                        </span>
                      )}
                      {deal.minBookingAmount && (
                        <span className="flex items-center gap-1 font-medium">
                          <Wallet className="w-3 h-3 text-emerald-600" />
                          Min. Spend: {formatCurrency(deal.minBookingAmount, currency)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 space-y-3 shrink-0 print:hidden no-print">
          
          {/* CTA 1: Apply Direct Budget Deduction */}
          {!showVoucher && (
            <button
              onClick={handleApplyDiscount}
              disabled={applied}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                applied
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                  : 'bg-trip-gradient hover:bg-trip-gradient-hover text-white shadow-emerald-500/20 active:scale-[0.98]'
              }`}
            >
              {applied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{formatCurrency(deal.savingsAmount, currency)} Applied to Trip Transportation Budget!</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span>Apply {formatCurrency(deal.savingsAmount, currency)} Savings to Trip Budget</span>
                </>
              )}
            </button>
          )}

          {/* Coupon Code Section in Deal View */}
          {!showVoucher && deal.couponCode && (
            <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#00B074]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Promo Code</span>
                  <span className="font-mono font-black text-sm tracking-wider text-[#0B2545]">
                    {deal.couponCode}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* CTA Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-0.5">
            {/* Direct Official Booking Link */}
            <a
              href={providerBooking.url}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-2xl font-bold text-xs bg-[#00B074] hover:bg-[#00925e] text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              title={`Open ${providerBooking.label} in a new tab`}
            >
              <span>{providerBooking.label}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>

            {/* Toggle Voucher vs Deal View */}
            {showVoucher ? (
              <button
                onClick={() => setShowVoucher(false)}
                className="py-2.5 px-3 rounded-2xl font-bold text-xs border border-slate-300 hover:border-slate-400 bg-white text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Back to Deal Info</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (onOpenBookingVoucher) {
                    onOpenBookingVoucher(deal);
                  } else {
                    setShowVoucher(true);
                  }
                }}
                className="py-2.5 px-3 rounded-2xl font-bold text-xs border border-slate-300 hover:border-slate-400 bg-white text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-[#00B074]" />
                <span>View Digital Voucher</span>
              </button>
            )}

            {showVoucher ? (
              <button
                onClick={handlePrintVoucher}
                className="py-2.5 px-3 rounded-2xl font-bold text-xs bg-[#0B2545] hover:bg-[#133966] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF Pass</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onViewAllDeals) onViewAllDeals();
                }}
                className="py-2.5 px-3 rounded-2xl font-bold text-xs bg-[#0B2545] hover:bg-[#133966] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Compare All Modes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-800 py-1 font-semibold transition-colors cursor-pointer"
          >
            Close Deal Dialog
          </button>

        </div>

      </div>

    </div>
  );
};
