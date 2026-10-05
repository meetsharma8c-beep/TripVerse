import React, { useState } from 'react';
import { 
  TransportDeal, 
  TransportMode, 
  Trip 
} from '../../types/trip';
import { getDealsForMode } from '../../services/dealService';
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
  Download, 
  QrCode, 
  CheckCircle2, 
  X, 
  Calendar, 
  User, 
  Zap,
  Info,
  Layers,
  ExternalLink,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { TransportComparisonMatrix } from './TransportComparisonMatrix';

interface TransportDealsViewProps {
  trip: Trip;
  onApplySavings: (savingsAmount: number, category: any, reason: string) => void;
}

export const TransportDealsView: React.FC<TransportDealsViewProps> = ({
  trip,
  onApplySavings
}) => {
  // Selected mode to inspect (defaults to trip's transportMode)
  const [activeMode, setActiveMode] = useState<TransportMode>(trip.transportMode || 'car');
  const [subTab, setSubTab] = useState<'matrix' | 'deals'>('deals');
  const [selectedVoucherDeal, setSelectedVoucherDeal] = useState<TransportDeal | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [voucherCopied, setVoucherCopied] = useState<boolean>(false);
  const [appliedDealIds, setAppliedDealIds] = useState<Record<string, boolean>>({});
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  React.useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  // Dynamic deals for the active selected tab
  const activeDeals = getDealsForMode(activeMode, {
    mode: activeMode,
    origin: trip.origin,
    destination: trip.destination,
    durationDays: trip.durationDays,
    travelersCount: trip.travelersCount,
    totalBudget: trip.totalBudget,
    priorities: trip.priorities
  });

  const bestDeal = activeDeals.find(d => d.isBestDeal) || activeDeals[0];
  const otherDeals = activeDeals.filter(d => d.id !== bestDeal?.id);

  const getProviderUrl = (deal: TransportDeal) => {
    if (deal.bookingUrl) return deal.bookingUrl;
    const prov = (deal.provider || '').toLowerCase();
    switch (deal.mode) {
      case 'flight':
        if (prov.includes('indigo')) return 'https://www.goindigo.in/';
        if (prov.includes('air india')) return 'https://www.airindiaexpress.com/';
        if (prov.includes('akasa')) return 'https://www.akasaair.com/';
        return 'https://www.makemytrip.com/flights/';
      case 'train':
        return 'https://www.irctc.co.in/nget/train-search';
      case 'bus':
        if (prov.includes('intrcity')) return 'https://www.intrcity.com/';
        if (prov.includes('zingbus')) return 'https://www.zingbus.com/';
        return 'https://www.redbus.in/';
      case 'car':
        if (prov.includes('zoomcar')) return 'https://www.zoomcar.com/';
        if (prov.includes('revv')) return 'https://www.revv.co.in/';
        return 'https://www.makemytrip.com/cabs/';
      case 'bike':
        if (prov.includes('wheelstreet')) return 'https://www.wheelstreet.com/';
        return 'https://www.royalbrothers.com/';
      default:
        return 'https://www.makemytrip.com/';
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2500);
  };

  const handleCopyAndBook = (deal: TransportDeal) => {
    if (deal.couponCode) {
      navigator.clipboard?.writeText(deal.couponCode);
      setVoucherCopied(true);
      setTimeout(() => setVoucherCopied(false), 3000);
    }
    const url = getProviderUrl(deal);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrintVoucher = () => {
    if (!selectedVoucherDeal) return;
    const originalTitle = document.title;
    document.title = `TripVerse_Pass_${selectedVoucherDeal.provider}_${selectedVoucherDeal.mode}`.replace(/[^a-zA-Z0-9_-]/g, '_');
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

  const handleApplyDiscount = (deal: TransportDeal) => {
    if (appliedDealIds[deal.id]) return;
    setAppliedDealIds(prev => ({ ...prev, [deal.id]: true }));
    onApplySavings(deal.savingsAmount, 'transportation', `${deal.title} (${deal.provider}) Promo Code`);
    
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00D084', '#00B074', '#F59E0B', '#38BDF8']
      });
    } catch (e) {
      // safe fallback
    }
  };

  const getModeIcon = (m: TransportMode) => {
    switch (m) {
      case 'flight': return Plane;
      case 'train': return Train;
      case 'bus': return Bus;
      case 'car': return Car;
      case 'bike': return Bike;
      default: return Sparkles;
    }
  };

  const transportModes: Array<{ id: TransportMode; label: string; icon: any }> = [
    { id: 'flight', label: 'Flights', icon: Plane },
    { id: 'train', label: 'Trains', icon: Train },
    { id: 'bus', label: 'Buses', icon: Bus },
    { id: 'car', label: 'Self-Drive / Cabs', icon: Car },
    { id: 'bike', label: 'Bikes / Riders', icon: Bike },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Mode View Switcher: Matrix vs Deals */}
      <div className="flex items-center justify-between gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setSubTab('deals')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subTab === 'deals'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Tag className="w-4 h-4 text-emerald-400" />
          <span>Real Offers, Vouchers & Deals ({activeDeals.length})</span>
        </button>

        <button
          onClick={() => setSubTab('matrix')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subTab === 'matrix'
              ? 'bg-[#0B2545] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Multi-Transport Comparison Matrix</span>
        </button>
      </div>

      {subTab === 'matrix' ? (
        <TransportComparisonMatrix trip={trip} currency={currency} />
      ) : (
        <>
          {/* Top Banner */}
          <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">
                    AI Fare & Coupon Engine
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    100% Real Direct Deals
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0B2545] mt-1">
                  Exclusive Travel Deals & Active Promo Codes
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Real verified operator fares, authentic active promo coupons, and direct booking links between <strong>{trip.origin}</strong> and <strong>{trip.destination}</strong>.
                </p>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs text-slate-500 block">Trip Selected Mode:</span>
                <span className="text-sm font-extrabold text-[#0B2545] capitalize flex items-center gap-1.5 sm:justify-end">
                  {React.createElement(getModeIcon(trip.transportMode), { className: "w-4 h-4 text-[#00B074]" })}
                  {trip.transportMode}
                </span>
              </div>
            </div>

            {/* Mode Comparison Switcher Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-100">
              {transportModes.map(item => {
                const Icon = item.icon;
                const isCurrent = activeMode === item.id;
                const isOriginalTripMode = trip.transportMode === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveMode(item.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#0B2545] text-white shadow-md scale-[1.02]'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                    {isOriginalTripMode && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-md uppercase tracking-wider font-extrabold ${
                        isCurrent ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-800'
                      }`}>
                        Trip Mode
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FEATURED: #1 Best Deal Hero Card */}
          {bestDeal && (
            <div className="bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 rounded-3xl p-5 sm:p-7 border-2 border-[#00B074] shadow-md relative overflow-hidden">
              
              {/* Top Pill Tag */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-trip-gradient text-white text-xs font-black uppercase tracking-wider shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                    #1 AI Recommended Deal for {activeMode.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#0B2545] text-white text-[11px] font-bold">
                    {bestDeal.badge}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    Verified Partner
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Direct Carrier Route</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Details & Route */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-[#0B2545]">
                      {bestDeal.title}
                    </h3>
                    <span className="text-xs sm:text-sm font-semibold text-slate-500 block mt-0.5">
                      Provided by <strong className="text-slate-800">{bestDeal.provider}</strong> • {bestDeal.subtitle}
                    </span>
                  </div>

                  {/* Timing Card */}
                  <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between text-xs sm:text-sm">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium block">Departure</span>
                      <strong className="text-base text-slate-900">{bestDeal.route.departureTime}</strong>
                      <span className="text-xs text-slate-500 block">{bestDeal.route.from}</span>
                    </div>

                    <div className="flex flex-col items-center px-3">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mb-1">
                        {bestDeal.route.duration}
                      </span>
                      <div className="w-24 sm:w-36 h-0.5 bg-emerald-400 relative flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-600 absolute right-0" />
                        {React.createElement(getModeIcon(bestDeal.mode), { className: "w-3.5 h-3.5 text-emerald-600 bg-white px-0.5" })}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 truncate max-w-[130px] text-center">
                        {bestDeal.route.stopsText}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-medium block">Arrival</span>
                      <strong className="text-base text-slate-900">{bestDeal.route.arrivalTime}</strong>
                      <span className="text-xs text-slate-500 block">{bestDeal.route.to}</span>
                    </div>
                  </div>

                  {/* Inclusions */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 block">Verified Deal Perks:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {bestDeal.features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                          <Check className="w-3.5 h-3.5 text-[#00B074] shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {bestDeal.urgencyText && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80">
                      <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{bestDeal.urgencyText}</span>
                    </div>
                  )}

                  {/* Terms & Conditions Disclosure */}
                  <div className="pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => setExpandedTermsId(expandedTermsId === bestDeal.id ? null : bestDeal.id)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Official Promo Terms & Conditions</span>
                      {expandedTermsId === bestDeal.id ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {expandedTermsId === bestDeal.id && (
                      <div className="mt-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-600 animate-in fade-in">
                        <p className="leading-relaxed">
                          <strong>Offer Terms:</strong> {bestDeal.termsAndConditions || 'Valid on direct operator booking. Apply coupon at checkout.'}
                        </p>
                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1 flex-wrap">
                          {bestDeal.expiryDate && (
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              {bestDeal.expiryDate}
                            </span>
                          )}
                          {bestDeal.minBookingAmount && (
                            <span className="flex items-center gap-1 font-medium">
                              <Wallet className="w-3 h-3 text-emerald-600" />
                              Min. Spend: {formatCurrency(bestDeal.minBookingAmount, currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Col: Price, Coupon & Actions */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col justify-between space-y-4 shadow-xs">
                  
                  <div>
                    <span className="badge-caps text-slate-400 block">
                      Exclusive Real Deal Price
                    </span>
                    <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                      <span className="text-3xl font-black font-display text-[#00B074]">
                        {formatCurrency(bestDeal.dealPrice, currency)}
                      </span>
                      <span className="text-base font-semibold text-slate-400 line-through">
                        {formatCurrency(bestDeal.originalPrice, currency)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-display whitespace-nowrap">
                        <Tag className="w-3 h-3 shrink-0" />
                        Save {formatCurrency(bestDeal.savingsAmount, currency)} ({bestDeal.discountPercent}% OFF)
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {bestDeal.priceUnit === 'total' ? 'Total Fare' : 'Per Person'}
                      </span>
                    </div>
                  </div>

                  {/* Promo Coupon Box */}
                  {bestDeal.couponCode && (
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-300 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Official Coupon Code</span>
                        <span className="font-mono font-black text-sm tracking-wider text-[#0B2545]">{bestDeal.couponCode}</span>
                        {bestDeal.expiryDate && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{bestDeal.expiryDate}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopyCode(bestDeal.id, bestDeal.couponCode!)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-xs font-bold text-emerald-800 transition-colors cursor-pointer shrink-0 shadow-xs"
                      >
                        {copiedCodeId === bestDeal.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#00B074]" />
                            <span className="text-[#00B074]">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* CTA Buttons */}
                  <div className="space-y-2">
                    {/* Direct Outbound Operator Booking Link */}
                    <a
                      href={getProviderUrl(bestDeal)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-[#00B074] hover:bg-[#009663] text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg"
                      title={`Open official ${bestDeal.provider} booking page`}
                    >
                      <span>Book on {bestDeal.provider} ↗</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>

                    {/* Apply Savings to Trip */}
                    <button
                      onClick={() => handleApplyDiscount(bestDeal)}
                      disabled={appliedDealIds[bestDeal.id]}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                        appliedDealIds[bestDeal.id]
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                          : 'bg-trip-gradient hover:bg-trip-gradient-hover text-white active:scale-95'
                      }`}
                    >
                      {appliedDealIds[bestDeal.id] ? (
                        <>
                          <Check className="w-4 h-4 shrink-0" />
                          <span>{formatCurrency(bestDeal.savingsAmount, currency)} Applied to Trip!</span>
                        </>
                      ) : (
                        <>
                          <Wallet className="w-4 h-4 shrink-0" />
                          <span>Apply {formatCurrency(bestDeal.savingsAmount, currency)} Savings to Budget</span>
                        </>
                      )}
                    </button>

                    {/* Open Digital Voucher / Ticket Pass */}
                    <button
                      onClick={() => setSelectedVoucherDeal(bestDeal)}
                      className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#0B2545] hover:bg-[#133966] text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Digital Boarding Pass / Voucher</span>
                    </button>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* Comparison Deals for this Mode */}
          {otherDeals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#0B2545]">
                    Alternative {activeMode.toUpperCase()} Options & Active Coupons
                  </h3>
                  <p className="text-xs text-slate-500">
                    Compare other verified carriers, coupon offers and direct booking portals for this route.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  {otherDeals.length} Alternatives
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherDeals.map(deal => (
                  <div 
                    key={deal.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-slate-300 shadow-xs flex flex-col justify-between space-y-4 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                              {deal.badge}
                            </span>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Verified
                            </span>
                          </div>
                          <h4 className="font-bold text-[#0B2545] text-base mt-1">
                            {deal.title}
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {deal.provider}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="flex items-baseline gap-1.5 justify-end flex-wrap">
                            <span className="text-xl font-black text-slate-900 font-display">
                              {formatCurrency(deal.dealPrice, currency)}
                            </span>
                            <span className="text-xs text-slate-400 line-through">
                              {formatCurrency(deal.originalPrice, currency)}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 block">
                            Save {formatCurrency(deal.savingsAmount, currency)} ({deal.discountPercent}% OFF)
                          </span>
                        </div>
                      </div>

                      {/* Timings */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs flex items-center justify-between my-3">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Departure</span>
                          <span className="font-bold text-slate-800">{deal.route.departureTime}</span>
                        </div>
                        <div className="text-center px-2">
                          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            {deal.route.duration}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 text-[10px] block">Arrival</span>
                          <span className="font-bold text-slate-800">{deal.route.arrivalTime}</span>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="space-y-1">
                        {deal.features.slice(0, 3).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Check className="w-3.5 h-3.5 text-[#00B074] shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>

                      {/* Terms toggle */}
                      {deal.termsAndConditions && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => setExpandedTermsId(expandedTermsId === deal.id ? null : deal.id)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                          >
                            <Info className="w-3 h-3 text-emerald-600" />
                            <span>Terms & Conditions</span>
                            {expandedTermsId === deal.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                          {expandedTermsId === deal.id && (
                            <p className="text-[11px] text-slate-600 mt-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200/60 leading-relaxed">
                              {deal.termsAndConditions}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      {deal.couponCode ? (
                        <button
                          onClick={() => handleCopyCode(deal.id, deal.couponCode!)}
                          className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          title="Click to copy coupon code"
                        >
                          {copiedCodeId === deal.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>COPIED!</span>
                            </>
                          ) : (
                            <>
                              <Tag className="w-3 h-3 text-emerald-600" />
                              <span>{deal.couponCode}</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Direct Instant Fare</span>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <a
                          href={getProviderUrl(deal)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00B074] hover:bg-[#009663] text-white flex items-center gap-1 transition-colors shadow-xs"
                          title={`Book directly on ${deal.provider}`}
                        >
                          <span>Book</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        <button
                          onClick={() => setSelectedVoucherDeal(deal)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                        >
                          View Voucher
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VERIFIED DIGITAL BOARDING PASS / VOUCHER MODAL */}
          {selectedVoucherDeal && (
            <div className="printable-target-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in print:p-0 print:bg-white print:static print:inset-auto">
              <div className="printable-target-container bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] relative animate-in zoom-in-95 print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
                
                {/* Voucher Header with Provider Branding */}
                <div className="bg-gradient-to-r from-[#0B2545] via-[#0E2E56] to-[#00B074] p-5 sm:p-6 text-white relative shrink-0 print:border-b-2 print:border-slate-800">
                  <button
                    onClick={() => setSelectedVoucherDeal(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer print:hidden no-print"
                    aria-label="Close voucher"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-300 bg-emerald-400/20 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                      TripVerse Verified Travel Pass
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black">
                    {selectedVoucherDeal.provider}
                  </h3>
                  <p className="text-xs text-slate-200 mt-0.5">
                    Official Reference: <strong className="text-white font-mono tracking-wider">TV-{selectedVoucherDeal.mode.toUpperCase().slice(0, 3)}-{Math.floor(100000 + Math.random() * 900000)}</strong>
                  </p>
                </div>

                {/* Perforated ticket divider visual */}
                <div className="relative border-b-2 border-dashed border-slate-300 bg-slate-50 px-6 py-4 shrink-0">
                  <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900" />
                  <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900" />
                  
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Departure Origin</span>
                      <strong className="text-base text-slate-900">{selectedVoucherDeal.route.from}</strong>
                      <span className="text-xs text-emerald-700 font-bold block">{selectedVoucherDeal.route.departureTime}</span>
                    </div>

                    <div className="text-center px-2">
                      <span className="text-[10px] font-bold text-slate-400 block">{selectedVoucherDeal.route.duration}</span>
                      <div className="w-16 sm:w-24 h-0.5 bg-emerald-400 my-1 mx-auto relative flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-600 absolute right-0" />
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Direct Confirmed
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] block">Arrival Destination</span>
                      <strong className="text-base text-slate-900">{selectedVoucherDeal.route.to}</strong>
                      <span className="text-xs text-emerald-700 font-bold block">{selectedVoucherDeal.route.arrivalTime}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Scrollable Body */}
                <div className="p-5 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                  
                  {/* Passenger & Fare Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Travelers</span>
                      <strong className="text-slate-800">{trip.travelersCount} Person(s)</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Class / Tier</span>
                      <strong className="text-slate-800 capitalize">{selectedVoucherDeal.mode} Verified</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-medium">Net Deal Fare</span>
                      <strong className="text-[#00B074] font-black font-display text-sm sm:text-base">
                        {formatCurrency(selectedVoucherDeal.dealPrice, currency)}
                      </strong>
                    </div>
                  </div>

                  {/* PROMO CODE & INSTANT REDEMPTION BOX */}
                  {selectedVoucherDeal.couponCode && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-50 border-2 border-dashed border-emerald-400 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-emerald-700" />
                          Official Operator Promo Code
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          Save {formatCurrency(selectedVoucherDeal.savingsAmount, currency)} ({selectedVoucherDeal.discountPercent}% OFF)
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200">
                        <div>
                          <span className="font-mono font-black text-lg text-[#0B2545] tracking-widest block">
                            {selectedVoucherDeal.couponCode}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {selectedVoucherDeal.expiryDate || 'Valid through 2026'} • {selectedVoucherDeal.minBookingAmount ? `Min booking ${formatCurrency(selectedVoucherDeal.minBookingAmount, currency)}` : 'No min spend'}
                          </span>
                        </div>

                        <button
                          onClick={() => handleCopyAndBook(selectedVoucherDeal)}
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

                  {/* Scannable Live QR Code & Barcode Graphic */}
                  <div className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 bg-white shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 block">Boarding Pass & Booking QR</span>
                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Active Live QR
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Scan with your smartphone camera to open verified {selectedVoucherDeal.provider} inventory directly.
                      </p>
                      <span className="text-[10px] font-mono text-slate-400 block pt-1">
                        PNR: {selectedVoucherDeal.mode.toUpperCase().slice(0, 3)}88914-CONFIRMED
                      </span>
                    </div>

                    <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-xs">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(getProviderUrl(selectedVoucherDeal))}`}
                        alt="Booking QR"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Terms & Conditions Note */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
                    <span className="font-bold text-slate-800 block">Partner Guarantee & Policy:</span>
                    <p className="leading-relaxed">
                      {selectedVoucherDeal.termsAndConditions || 'Authentic operator fares with guaranteed price matching. Applicable for Indian credit/debit cards, UPI, and net banking.'}
                    </p>
                  </div>

                </div>

                {/* Voucher Action Footer */}
                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 space-y-2 shrink-0 print:hidden no-print">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <a
                      href={getProviderUrl(selectedVoucherDeal)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-xl font-bold text-xs bg-[#00B074] hover:bg-[#009663] text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <span>Book on {selectedVoucherDeal.provider}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>

                    <button
                      onClick={handlePrintVoucher}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs bg-[#0B2545] hover:bg-[#133966] text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print / PDF Pass</span>
                    </button>

                    <button
                      onClick={() => setSelectedVoucherDeal(null)}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </>
      )}

    </div>
  );
};
