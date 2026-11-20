import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trip, CurrencyCode } from '../../types/trip';
import { ArrowRight, Bed, Bus, Car, ExternalLink, Plane, Train, X, Star, CheckCircle2, Clock, Tag, Ticket, MapPin, ShieldCheck, Sparkles, CreditCard, QrCode, Download } from 'lucide-react';
import { formatCurrency } from '../../services/currencyService';
import { buildHotelBookingUrl } from '../../services/hotelService';
import { buildFlightBookingUrl, buildTrainBookingUrl, buildBusBookingUrl, buildCabBookingUrl } from '../../services/dealService';
import { TripPaymentGatewayModal } from '../payment/TripPaymentGatewayModal';
import { getBookingForTrip, BookingRecord, generateTicketReceiptText } from '../../services/paymentGatewayService';
import { triggerHaptic } from '../../services/deviceService';
import { useLanguage } from '../../services/languageService';
import { evaluateLiveMarketPrices } from '../../services/liveMarketPricingService';

interface TripBookingCheckoutModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  currency: CurrencyCode;
  onNavigateToPasses?: () => void;
}

export const TripBookingCheckoutModal: React.FC<TripBookingCheckoutModalProps> = ({
  trip,
  isOpen,
  onClose,
  currency,
  onNavigateToPasses
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'hotels' | 'transport' | 'activities'>('all');
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [gatewayParams, setGatewayParams] = useState<{
    amount?: number;
    packageType: 'full_package' | 'hotel_only' | 'transit_only';
    title: string;
  }>({
    packageType: 'full_package',
    title: 'TripVerse Complete Package Checkout'
  });

  const [existingBooking, setExistingBooking] = useState<BookingRecord | null>(() => trip?.id ? getBookingForTrip(trip.id) : null);
  const [prevTripId, setPrevTripId] = useState(trip?.id);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (trip?.id !== prevTripId || isOpen !== prevIsOpen) {
    setPrevTripId(trip?.id);
    setPrevIsOpen(isOpen);
    setExistingBooking(trip?.id ? getBookingForTrip(trip.id) : null);
  }

  // Declarative download anchor ref (zero manual DOM manipulation, top-level hook)
  const downloadAnchorRef = useRef<HTMLAnchorElement>(null);
  const travelers = Math.max(1, trip?.travelersCount || 1);

  // Evaluate genuine real-time market pricing index across all verticals
  const liveMarket = useMemo(() => {
    if (!trip) return null;
    return evaluateLiveMarketPrices({
      origin: trip.origin || 'Mumbai',
      destination: trip.destination,
      durationDays: trip.durationDays || 3,
      travelersCount: travelers,
      startDate: trip.startDate,
      accommodationType: trip.accommodationType,
      transportMode: trip.transportMode,
      originCoords: trip.originCoordinates,
      destCoords: trip.destinationDetails?.coordinates
    });
  }, [
    trip,
    travelers
  ]);

  if (!isOpen || !trip || !liveMarket) return null;

  const destination = trip.destination.split(',')[0].trim();
  const origin = (trip.origin || 'City Center').split(',')[0].trim();
  const tripCountry = (trip.destinationDetails?.country || '').toLowerCase();
  const isIndiaRoute = tripCountry === 'india' || ['udaipur', 'goa', 'manali', 'jaipur', 'kerala', 'ladakh', 'rishikesh', 'varanasi', 'mumbai', 'delhi', 'vadodara', 'pavagadh'].some(k => destination.toLowerCase().includes(k));

  // Compute travel dates
  const today = new Date();
  const startDateStr = trip.startDate
    ? trip.startDate.split('T')[0]
    : new Date(today.getTime() + 86400000 * 3).toISOString().split('T')[0];
  const startObj = new Date(startDateStr);
  const endDateStr = new Date(startObj.getTime() + 86400000 * trip.durationDays).toISOString().split('T')[0];

  // Selected Hotel details
  const hotel = trip.selectedHotel;
  const hotelLinks = buildHotelBookingUrl(destination, hotel?.name || `${destination} Hotel`, startDateStr, endDateStr, travelers);
  
  // Transport Deep-links
  const flightLinks = buildFlightBookingUrl(origin, destination, startDateStr);
  const trainLink = buildTrainBookingUrl(origin, destination, startDateStr);
  const busLink = buildBusBookingUrl(origin, destination);
  const cabLinks = buildCabBookingUrl(origin, destination);

  // Best Deal
  const bestTransport = trip.bestTransportDeal || trip.transportDeals?.[0];

  const nights = Math.max(0, trip.durationDays - 1);
  const rooms = Math.ceil(travelers / 2);

  // Calibrated real-time market amounts
  const effectiveStayCost = nights === 0
    ? 0
    : hotel?.nightlyRate
      ? hotel.nightlyRate * nights * rooms
      : (liveMarket.hotelTotalGroupINR || trip.budgetBreakdown?.accommodation || 9500);

  const effectiveTransportCost = bestTransport
    ? (bestTransport.priceUnit === 'per_person' ? bestTransport.dealPrice * travelers : bestTransport.dealPrice)
    : trip.transportMode === 'flight'
    ? (liveMarket.smartHubArbitrage
        ? liveMarket.smartHubArbitrage.hubRoundTripPerPerson * travelers + liveMarket.smartHubArbitrage.groundTransferToHubCost
        : liveMarket.flightTotalGroupINR)
    : trip.transportMode === 'train'
    ? liveMarket.trainTotalGroupINR
    : trip.transportMode === 'car' || trip.transportMode === 'bike'
    ? liveMarket.roadTripFuelAndTollsINR
    : (liveMarket.localTransitTotalGroupINR || trip.budgetBreakdown?.transportation || 6500);

  const effectiveDiningCost = liveMarket.diningTotalGroupINR || trip.budgetBreakdown?.food || 4200;
  const effectiveActivitiesCost = liveMarket.attractionsTotalGroupINR || trip.budgetBreakdown?.activities || 3200;
  const effectiveBufferCost = Math.round((effectiveTransportCost + effectiveStayCost + effectiveDiningCost + effectiveActivitiesCost) * 0.05);

  const effectiveLiveTotal = effectiveTransportCost + effectiveStayCost + effectiveDiningCost + effectiveActivitiesCost + effectiveBufferCost;

  const estimateItems = [
    { label: 'Transport', amount: effectiveTransportCost, icon: Plane, color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300' },
    { label: 'Stays & Lodging', amount: effectiveStayCost, icon: Bed, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300' },
    { label: 'Local Dining', amount: effectiveDiningCost, icon: Tag, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' },
    { label: 'Activities & Entry', amount: effectiveActivitiesCost, icon: Ticket, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' },
    { label: 'Safety Buffer', amount: effectiveBufferCost, icon: ShieldCheck, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' }
  ];

  // Open Gateway with specific package
  const openGateway = (
    packageType: 'full_package' | 'hotel_only' | 'transit_only',
    amount?: number,
    title?: string
  ) => {
    triggerHaptic('medium');
    setGatewayParams({
      packageType,
      amount,
      title: title || `TripVerse Checkout • ${destination}`
    });
    setIsGatewayOpen(true);
  };

  const handleBookingConfirmed = (booking: BookingRecord) => {
    setExistingBooking(booking);
  };

  // Download existing invoice via React ref
  const handleDownloadInvoice = () => {
    if (!existingBooking || !downloadAnchorRef.current) return;
    triggerHaptic('light');
    const text = generateTicketReceiptText(existingBooking, currency);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = downloadAnchorRef.current;
    anchor.href = url;
    anchor.download = `TripVerse_Tax_Invoice_${existingBooking.id}.txt`;
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-slate-950/80 p-2 sm:p-4 md:p-6 backdrop-blur-md overflow-y-auto overscroll-contain"
        onClick={onClose}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-options-title"
          className="my-auto flex max-h-[92dvh] sm:max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0C1523] shadow-2xl transition-all"
          onClick={event => event.stopPropagation()}
        >
          {/* Smart Space-Efficient Header: Zero Clipping, High Contrast */}
          <header className="shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-900 px-4 py-3 sm:px-5 sm:py-3.5 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-400/30">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="booking-options-title" className="text-sm sm:text-base font-black text-white truncate">
                    Book Trip • {destination}
                  </h2>
                  <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/20">
                    {trip.durationDays}D / {trip.durationDays - 1}N • {travelers} Traveler{travelers > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate">
                  {origin} → {destination} • Direct Payment Gateway (UPI, Cards, NetBanking) & Partners
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="text-right hidden xs:block">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-tight">Total</span>
                <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                  {formatCurrency(effectiveLiveTotal, currency)}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close booking options"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Smart Segmented Tab Navigation Bar */}
          <div className="shrink-0 bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 px-3 py-2 sm:px-4">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Essentials', icon: Sparkles, count: undefined },
                { id: 'hotels', label: 'Selected Hotel', icon: Bed, count: hotel ? '1 Match' : undefined },
                { id: 'transport', label: 'Flights & Trains', icon: Plane, count: 'Live Deals' },
                { id: 'activities', label: 'Tours & Passes', icon: Ticket, count: undefined }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveTab(tab.id as any);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-slate-700/70'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`} />
                    <span>{t(tab.label)}</span>
                    {tab.count && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {t(tab.count)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Body: Prioritizes Actionable Important Information */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-800 dark:text-slate-200">

            {/* TAB 1: ALL ESSENTIALS & COMPLETE DIRECT CHECKOUT */}
            {activeTab === 'all' && (
              <>
                {/* Confirmed Booking Banner (If Already Paid) */}
                {existingBooking && (
                  <div className="rounded-2xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-emerald-950/60 dark:via-teal-950/40 dark:to-slate-900 dark:border-emerald-600 p-3.5 sm:p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-200/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                              {t('Booking Confirmed & Paid')}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-mono font-bold">PNR: {existingBooking.pnr}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                            Booking #{existingBooking.id} • {existingBooking.paymentMethod}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Total: {formatCurrency(existingBooking.amount, currency)} • Hotel Voucher: {existingBooking.hotelVoucher}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadInvoice}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          <span>{t('Tax Invoice')}</span>
                        </button>
                        {onNavigateToPasses && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigateToPasses();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-900 transition-colors cursor-pointer shadow-sm"
                          >
                            <span>Passes Hub</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Payment Gateway Hero Card */}
                <div className="rounded-2xl border border-emerald-400/60 dark:border-emerald-500/40 bg-gradient-to-r from-emerald-950 via-[#0E3A2F] to-[#0B2545] p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
                  <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-400/30">
                          <Sparkles className="w-3 h-3 text-emerald-300" />
                          Complete Package
                        </span>
                        <span className="text-[10px] text-emerald-200/90 flex items-center gap-1">
                          <QrCode className="w-3 h-3" /> Dynamic 5-Min UPI QR • Cards • NetBanking
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        Book Your Complete {destination} Package
                      </h3>
                      <p className="text-xs text-slate-200/90 max-w-lg leading-relaxed">
                        Includes verified stay, flight/train deals, local activities & 24/7 travel concierge. 1-click in-app payment.
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Est. Cost</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                          {formatCurrency(effectiveLiveTotal, currency)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openGateway('full_package', effectiveLiveTotal, `Complete ${destination} Trip Package`)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-xs px-4 py-2.5 transition-all shadow-md cursor-pointer active:scale-98"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-emerald-950" />
                        <span>Proceed to Payment Gateway</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Calibrated Trip Budget Chips */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Estimated Expense Breakdown</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{startDateStr} to {endDateStr}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {estimateItems.map(item => (
                      <div key={item.label} className="rounded-xl bg-white dark:bg-slate-800/80 p-2.5 border border-slate-200/70 dark:border-slate-700/80 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                          <item.icon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                          <span className="text-[10px] font-bold uppercase truncate">{item.label}</span>
                        </div>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block truncate font-mono">
                          {formatCurrency(item.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Shortcuts for Hotel and Transit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Hotel Quick Preview */}
                  {hotel ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900/80 hover:border-emerald-300 dark:hover:border-emerald-500 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                          <span className="flex items-center gap-1.5">
                            <Bed className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                            {hotel.name}
                          </span>
                          <span className="text-emerald-800 dark:text-emerald-400 font-mono font-black">{formatCurrency(effectiveStayCost, currency)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{hotel.address || hotel.neighborhood} • {nights}N / {rooms}R</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveTab('hotels')}
                          className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          View Hotel Details →
                        </button>
                        <button
                          type="button"
                          onClick={() => openGateway('hotel_only', effectiveStayCost, `Stay at ${hotel.name}`)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-300 border border-transparent dark:border-emerald-800/80 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Book Stay ({formatCurrency(effectiveStayCost, currency)})
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Transit Quick Preview */}
                  {bestTransport ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-white dark:bg-slate-900/80 hover:border-emerald-300 dark:hover:border-emerald-500 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                          <span className="flex items-center gap-1.5">
                            <Plane className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                            {bestTransport.title}
                          </span>
                          <span className="text-emerald-800 dark:text-emerald-400 font-mono font-black">{formatCurrency(effectiveTransportCost, currency)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{origin} → {destination} • {travelers} Pax</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setActiveTab('transport')}
                          className="text-xs font-bold text-emerald-800 dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          View Transport Deals →
                        </button>
                        <button
                          type="button"
                          onClick={() => openGateway('transit_only', effectiveTransportCost, `${bestTransport.title} Transit`)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-300 border border-transparent dark:border-emerald-800/80 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          Book Seats ({formatCurrency(effectiveTransportCost, currency)})
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </>
            )}

            {/* TAB 2: SELECTED HOTEL (FOCUSED DIRECTLY ON STAY) */}
            {activeTab === 'hotels' && (
              <div className="space-y-4">
                {hotel ? (
                  <div className="space-y-4">
                    {/* Hotel Action Banner */}
                    <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-900 to-[#0B2545] p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                          Verified Accommodation Match
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                          {hotel.name}
                        </h3>
                        <p className="text-xs text-slate-200">
                          {trip.durationDays - 1} Nights • Stay Total: {formatCurrency(effectiveStayCost, currency)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openGateway('hotel_only', effectiveStayCost, `Stay at ${hotel.name}`)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-4 py-2 text-xs font-black transition-all shadow-sm cursor-pointer shrink-0"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Instant Book Stay ({formatCurrency(effectiveStayCost, currency)})</span>
                      </button>
                    </div>

                    {/* Detailed Hotel Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden shadow-xs">
                      <div className="p-4 flex flex-col sm:flex-row gap-4">
                        {hotel.image && (
                          <img
                            src={hotel.image}
                            alt={hotel.name}
                            className="w-full sm:w-48 h-36 object-cover rounded-xl shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-base font-bold text-slate-900 dark:text-white">{hotel.name}</h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{hotel.address || hotel.neighborhood}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-center justify-end gap-1 text-amber-500 text-xs font-bold">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span>{hotel.userRating}</span>
                                <span className="text-slate-400 font-normal">({hotel.reviewCount})</span>
                              </div>
                              <span className="text-sm font-black text-emerald-800 dark:text-emerald-400 block mt-0.5 font-mono">
                                ₹{hotel.nightlyRate.toLocaleString('en-IN')}<span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">/night</span>
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {hotel.amenities.map(am => (
                              <span key={am} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                {am}
                              </span>
                            ))}
                          </div>

                          <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            ✓ {hotel.cancellationPolicy}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                            <a
                              href={hotel.bookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <span>Booking.com Official</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                            {hotel.googleHotelsUrl && (
                              <a
                                href={hotel.googleHotelsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                              >
                                <span>Google Hotels Rates</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-6 text-center">
                    <Bed className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Find Stays in {destination}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                      Explore top-rated resorts, luxury hotels and authentic villas for {trip.durationDays} days.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <a
                        href={hotelLinks.bookingDotCom}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition-colors"
                      >
                        Search on Booking.com
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: FLIGHTS & TRAINS (FOCUSED DIRECTLY ON TRANSIT) */}
            {activeTab === 'transport' && (
              <div className="space-y-4">
                {bestTransport && (
                  <div className="rounded-2xl border border-emerald-300/80 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="rounded-full bg-emerald-200/90 dark:bg-emerald-900/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                        {bestTransport.badge || 'Recommended Option'}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-300 font-mono">
                        ₹{bestTransport.dealPrice.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({bestTransport.priceUnit.replace('_', ' ')})</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{bestTransport.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{bestTransport.subtitle}</p>

                    <div className="mt-2.5 flex items-center gap-4 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Departure</span>
                        <span className="font-bold">{bestTransport.route.departureTime}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{bestTransport.route.duration}</span>
                        <span>•</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">Arrival</span>
                        <span className="font-bold">{bestTransport.route.arrivalTime}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openGateway('transit_only', effectiveTransportCost, `${bestTransport.title} Transit`)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-900 transition-colors cursor-pointer shadow-2xs"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Book Seats with Gateway</span>
                      </button>

                      <a
                        href={bestTransport.bookingUrl || flightLinks.googleFlights}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Google Flights
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                      <a
                        href={trainLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <Train className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                        IRCTC Trains
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Transport Options Grid */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <a
                    href={flightLinks.googleFlights}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Plane className="w-5 h-5 text-sky-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Google Flights Live Prices</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{origin} → {destination}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                  </a>

                  <a
                    href={trainLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Train className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">
                          {isIndiaRoute ? 'IRCTC Indian Railways' : 'Global Rail & High-Speed Trains'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isIndiaRoute ? 'Live seat quota & tatkal booking' : 'Trainline / Eurail / JR Pass / Amtrak reservations'}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                  </a>

                  <a
                    href={busLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Bus className="w-5 h-5 text-rose-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">
                          {isIndiaRoute ? 'redBus Sleeper & Express' : 'FlixBus & Intercity Coaches'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isIndiaRoute ? 'Overnight air-conditioned buses' : 'Direct intercity express coach tickets'}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                  </a>

                  <a
                    href={cabLinks.zoomcar}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Car className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">
                          {isIndiaRoute ? 'Zoomcar Self-Drive' : 'Rentalcars.com & Self-Drive'}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">Self-drive vehicle rental in {destination}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                  </a>
                </div>
              </div>
            )}

            {/* TAB 4: TOURS & ENTRY PASSES (FOCUSED DIRECTLY ON ACTIVITIES) */}
            {activeTab === 'activities' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-900 to-[#0B2545] p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block">
                      Curated Experiences & Passes
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                      Skip-The-Line Sightseeing in {destination}
                    </h3>
                    <p className="text-xs text-slate-200">
                      Activities Total: {formatCurrency(effectiveActivitiesCost, currency)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openGateway('full_package', effectiveActivitiesCost, `${destination} Entry Passes & Tours`)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-4 py-2 text-xs font-black transition-all shadow-sm cursor-pointer shrink-0"
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Book Passes ({formatCurrency(effectiveActivitiesCost, currency)})</span>
                  </button>
                </div>

                {/* Itinerary Highlights */}
                {trip.itinerary && trip.itinerary.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/60 dark:bg-slate-900/60">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Planned Itinerary Attractions</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {trip.itinerary.flatMap((day, dayIdx) => 
                        day.activities.slice(0, 2).map((act, actIdx) => (
                          <div key={`${dayIdx}-${actIdx}`} className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase block">Day {day.dayNumber} • {act.time}</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">{act.title}</span>
                            {act.description && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{act.description}</p>}
                          </div>
                        ))
                      ).slice(0, 4)}
                    </div>
                  </div>
                )}

                {/* Direct Passes Providers */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <a
                    href={`https://www.viator.com/searchResults/all?text=${encodeURIComponent(destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-colors bg-white dark:bg-slate-900/80 shadow-2xs"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">Viator (TripAdvisor) Experiences</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Skip-the-line monument passes & guided day tours</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                  </a>

                  <a
                    href={`https://www.getyourguide.com/s/?q=${encodeURIComponent(destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 transition-colors bg-white dark:bg-slate-900/80 shadow-2xs"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">GetYourGuide Mobile Passes</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Instant digital tickets & priority access</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                  </a>
                </div>
              </div>
            )}

          </div>

          {/* Space-Efficient Bottom Action Bar */}
          <footer className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 px-4 py-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
              <span className="truncate">TripVerse Buyer Protection • 100% Refund Guarantee</span>
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'hotels' && hotel) {
                    openGateway('hotel_only', effectiveStayCost, `Stay at ${hotel.name}`);
                  } else if (activeTab === 'transport' && bestTransport) {
                    openGateway('transit_only', effectiveTransportCost, `${bestTransport.title} Transit`);
                  } else if (activeTab === 'activities') {
                    openGateway('full_package', effectiveActivitiesCost, `${destination} Entry Passes & Tours`);
                  } else {
                    openGateway('full_package', effectiveLiveTotal, `Complete ${destination} Trip Package`);
                  }
                }}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-900 transition-colors shadow-sm cursor-pointer active:scale-98"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-300" />
                <span>
                  {activeTab === 'hotels' ? 'Checkout Stay' :
                   activeTab === 'transport' ? 'Checkout Transport' :
                   activeTab === 'activities' ? 'Checkout Passes' :
                   'Proceed to Gateway'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </footer>
        </section>
      </div>

      {/* TRIP PAYMENT GATEWAY MODAL EMBED */}
      {isGatewayOpen && (
        <TripPaymentGatewayModal
          trip={trip}
          isOpen={isGatewayOpen}
          onClose={() => setIsGatewayOpen(false)}
          currency={currency}
          customAmount={gatewayParams.amount}
          packageType={gatewayParams.packageType}
          customTitle={gatewayParams.title}
          onBookingSuccess={handleBookingConfirmed}
          onNavigateToPasses={onNavigateToPasses}
        />
      )}
      {/* Declarative hidden anchor for invoice file download */}
      <a ref={downloadAnchorRef} className="hidden" aria-hidden="true" tabIndex={-1} />
    </>
  );
};
