import React, { useState, useEffect, useMemo } from 'react';
import { Trip, CurrencyCode } from '../../types/trip';
import {
  ArrowRight,
  Bed,
  Bus,
  Car,
  ExternalLink,
  Plane,
  Train,
  X,
  Star,
  CheckCircle2,
  Clock,
  Tag,
  Ticket,
  MapPin,
  ShieldCheck,
  Sparkles,
  Download,
  BookmarkCheck,
  Trash2
} from 'lucide-react';
import { formatCurrency } from '../../services/currencyService';
import { buildHotelBookingUrl } from '../../services/hotelService';
import { buildFlightBookingUrl, buildTrainBookingUrl, buildBusBookingUrl, buildCabBookingUrl } from '../../services/dealService';
import {
  getRealTripBookingRefs,
  saveRealTripBookingRefs,
  clearRealTripBookingRefs,
  generatePassWalletSummaryText,
  RealTripBookingRefs
} from '../../services/paymentGatewayService';
import { triggerHaptic, saveOrShareFile } from '../../services/deviceService';
import { useLanguage } from '../../services/languageService';
import { evaluateLiveMarketPrices } from '../../services/liveMarketPricingService';
import { handleImageError } from '../../utils/destinationImages';

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
  const [savedRefs, setSavedRefs] = useState<RealTripBookingRefs | null>(() =>
    trip?.id ? getRealTripBookingRefs(trip.id) : null
  );
  const [isEditingRefs, setIsEditingRefs] = useState(false);
  const [transitProviderInput, setTransitProviderInput] = useState('');
  const [transitPnrInput, setTransitPnrInput] = useState('');
  const [seatOrCoachInput, setSeatOrCoachInput] = useState('');
  const [hotelNameInput, setHotelNameInput] = useState('');
  const [hotelConfirmationInput, setHotelConfirmationInput] = useState('');
  const [refsFeedback, setRefsFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!trip?.id || !isOpen) return;
    const current = getRealTripBookingRefs(trip.id);
    setSavedRefs(current);
    setTransitProviderInput(current?.transitProvider || trip.bestTransportDeal?.provider || '');
    setTransitPnrInput(current?.transitPnr || '');
    setSeatOrCoachInput(current?.seatOrCoach || '');
    setHotelNameInput(current?.hotelName || trip.selectedHotel?.name || '');
    setHotelConfirmationInput(current?.hotelConfirmationCode || '');
    setRefsFeedback(null);
    setIsEditingRefs(false);
  }, [trip?.id, trip?.bestTransportDeal?.provider, trip?.selectedHotel?.name, isOpen]);

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
  }, [trip, travelers]);

  if (!isOpen || !trip || !liveMarket) return null;

  const destination = (trip.destination || 'Destination').split(',')[0].trim();
  const origin = (trip.origin || 'Origin').split(',')[0].trim();
  const tripCountry = (trip.destinationDetails?.country || '').toLowerCase();
  const isIndiaRoute =
    tripCountry === 'india' ||
    [
      'udaipur',
      'goa',
      'manali',
      'jaipur',
      'kerala',
      'ladakh',
      'rishikesh',
      'varanasi',
      'mumbai',
      'delhi',
      'vadodara',
      'pavagadh',
      'ahmedabad',
      'bengaluru',
      'hyderabad',
      'chennai',
      'kolkata'
    ].some(k => destination.toLowerCase().includes(k));

  const nights = Math.max(0, trip.durationDays - 1);
  const rooms = Math.ceil(travelers / 2);

  // Compute travel dates safely in local ISO calendar format
  const today = new Date();
  const fallbackStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
  const toLocalIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const startDateStr = trip.startDate ? trip.startDate.split('T')[0] : toLocalIso(fallbackStart);
  const startParts = startDateStr.split('-').map(Number);
  const startObj =
    startParts.length === 3 && startParts.every(Number.isFinite)
      ? new Date(startParts[0], startParts[1] - 1, startParts[2])
      : fallbackStart;
  const checkOutObj = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate() + Math.max(1, nights));
  const endDateStr = toLocalIso(checkOutObj);

  // Selected Hotel details & Official Partner Deep-links
  const hotel = trip.selectedHotel;
  const hotelLinks = buildHotelBookingUrl(
    destination,
    hotel?.name || `${destination} Hotel`,
    startDateStr,
    endDateStr,
    travelers
  );

  // Transport Official Partner Deep-links
  const flightLinks = buildFlightBookingUrl(origin, destination, startDateStr);
  const trainLink = buildTrainBookingUrl(origin, destination, startDateStr);
  const busLink = buildBusBookingUrl(origin, destination);
  const cabLinks = buildCabBookingUrl(origin, destination);
  const viatorUrl = `https://www.viator.com/searchResults/all?text=${encodeURIComponent(destination)}`;
  const getYourGuideUrl = `https://www.getyourguide.com/s/?q=${encodeURIComponent(destination)}`;

  // Best Deal
  const bestTransport = trip.bestTransportDeal || trip.transportDeals?.[0];

  // Calibrated real-time market estimates
  const effectiveStayCost =
    nights === 0
      ? 0
      : hotel?.nightlyRate
        ? hotel.nightlyRate * nights * rooms
        : liveMarket.hotelTotalGroupINR || trip.budgetBreakdown?.accommodation || 9500;

  const effectiveTransportCost = bestTransport
    ? bestTransport.priceUnit === 'per_person'
      ? bestTransport.dealPrice * travelers
      : bestTransport.dealPrice
    : trip.transportMode === 'flight'
      ? liveMarket.smartHubArbitrage
        ? liveMarket.smartHubArbitrage.hubRoundTripPerPerson * travelers +
          liveMarket.smartHubArbitrage.groundTransferToHubCost
        : liveMarket.flightTotalGroupINR
      : trip.transportMode === 'train'
        ? liveMarket.trainTotalGroupINR
        : trip.transportMode === 'car' || trip.transportMode === 'bike'
          ? liveMarket.roadTripFuelAndTollsINR
          : liveMarket.localTransitTotalGroupINR || trip.budgetBreakdown?.transportation || 6500;

  const effectiveDiningCost = liveMarket.diningTotalGroupINR || trip.budgetBreakdown?.food || 4200;
  const effectiveActivitiesCost = liveMarket.attractionsTotalGroupINR || trip.budgetBreakdown?.activities || 3200;
  const effectiveBufferCost = Math.round(
    (effectiveTransportCost + effectiveStayCost + effectiveDiningCost + effectiveActivitiesCost) * 0.05
  );

  const effectiveLiveTotal =
    effectiveTransportCost + effectiveStayCost + effectiveDiningCost + effectiveActivitiesCost + effectiveBufferCost;

  const primaryTransitPartnerUrl =
    trip.transportMode === 'train'
      ? trainLink
      : trip.transportMode === 'bus'
        ? busLink
        : trip.transportMode === 'car' || trip.transportMode === 'bike'
          ? cabLinks.zoomcar
          : bestTransport?.bookingUrl || flightLinks.googleFlights;

  const primaryTransitPartnerLabel =
    trip.transportMode === 'train'
      ? isIndiaRoute
        ? 'Search IRCTC Trains'
        : 'Search Rail Tickets'
      : trip.transportMode === 'bus'
        ? isIndiaRoute
          ? 'Search redBus Coaches'
          : 'Search FlixBus Coaches'
        : trip.transportMode === 'car' || trip.transportMode === 'bike'
          ? isIndiaRoute
            ? 'Rent on Zoomcar'
            : 'Search Self-Drive Rentals'
          : 'Search Google Flights';

  const primaryHotelPartnerUrl = hotel?.bookingUrl || hotelLinks.bookingDotCom;

  const estimateItems = [
    { label: 'Transport', amount: effectiveTransportCost, icon: Plane },
    { label: nights === 0 ? 'Same-Day (0N)' : 'Stays & Lodging', amount: effectiveStayCost, icon: Bed },
    { label: 'Local Dining', amount: effectiveDiningCost, icon: Tag },
    { label: 'Activities & Entry', amount: effectiveActivitiesCost, icon: Ticket },
    { label: 'Safety Buffer', amount: effectiveBufferCost, icon: ShieldCheck }
  ];

  const handleSaveOfficialRefs = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    const updated = saveRealTripBookingRefs({
      tripId: trip.id,
      transitProvider: transitProviderInput,
      transitPnr: transitPnrInput,
      seatOrCoach: seatOrCoachInput,
      hotelName: hotelNameInput,
      hotelConfirmationCode: hotelConfirmationInput
    });
    setSavedRefs(updated);
    setIsEditingRefs(false);
    setRefsFeedback(
      updated
        ? 'Saved to your offline Digital Boarding Pass.'
        : 'Cleared saved booking references.'
    );
  };

  const handleClearRefs = () => {
    triggerHaptic('light');
    clearRealTripBookingRefs(trip.id);
    setSavedRefs(null);
    setTransitPnrInput('');
    setSeatOrCoachInput('');
    setHotelConfirmationInput('');
    setIsEditingRefs(false);
    setRefsFeedback('Removed saved booking references.');
  };

  const handleExportPassSummary = () => {
    if (!savedRefs) return;
    triggerHaptic('light');
    const text = generatePassWalletSummaryText(trip, savedRefs);
    void saveOrShareFile({
      filename: `TripVerse_Pass_Summary_${destination.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
      content: text,
      mimeType: 'text/plain;charset=utf-8',
      title: `Offline Pass Summary • ${destination}`,
      text
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-[#09140D]/80 p-2 sm:p-4 md:p-6 backdrop-blur-md overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-options-title"
        className="my-auto flex max-h-[92dvh] sm:max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-[#DCE6DA] dark:border-emerald-900/40 bg-[#F8FAF7] dark:bg-[#0D1711] shadow-[0_24px_64px_rgba(12,28,18,0.45)] transition-all"
        onClick={event => event.stopPropagation()}
      >
        {/* Deep Forest Liquid Glass Header */}
        <header className="shrink-0 flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#102317] via-[#1D3E29] to-[#152A1C] px-4 py-3.5 sm:px-5 sm:py-4 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-400/15 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-300/25">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="booking-options-title" className="text-sm sm:text-base font-display font-bold text-white truncate">
                  {t('Book Flights, Trains & Stays')} • {destination}
                </h2>
                <span className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-200 border border-white/15">
                  {nights > 0 ? `${trip.durationDays}D / ${nights}N` : 'Same-Day Trip'} • {travelers} Traveler{travelers > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/80 truncate">
                {origin} → {destination} • Direct Official Carrier & Hotel Links (Zero Markup)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right hidden xs:block">
              <span className="text-[10px] text-emerald-200/70 uppercase font-semibold block leading-tight">
                Market Est.
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
                {formatCurrency(effectiveLiveTotal, currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close booking options"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-emerald-100 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Segmented Tab Navigation Bar */}
        <div className="shrink-0 bg-[#EEF3ED] dark:bg-[#122118] border-b border-[#DCE6DA] dark:border-emerald-900/40 px-3 py-2 sm:px-4">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Essentials', icon: Sparkles, count: savedRefs ? 'PNR Saved' : undefined },
              { id: 'hotels', label: 'Selected Hotel', icon: Bed, count: nights === 0 ? '0 Nights' : hotel ? '1 Match' : undefined },
              { id: 'transport', label: 'Flights & Trains', icon: Plane, count: 'Official Links' },
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
                    setActiveTab(tab.id as 'all' | 'hotels' | 'transport' | 'activities');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#2D5A3D] text-white shadow-xs'
                      : 'bg-white/85 dark:bg-[#172A1E] text-[#4A6352] dark:text-emerald-100/80 hover:bg-white dark:hover:bg-[#1E3527] hover:text-[#152A1C] dark:hover:text-white border border-[#DCE6DA] dark:border-emerald-800/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-200' : 'text-[#5A7362] dark:text-emerald-300/70'}`} />
                  <span>{t(tab.label)}</span>
                  {tab.count && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#E2EBE1] dark:bg-emerald-900/60 text-[#2D5A3D] dark:text-emerald-200'
                      }`}
                    >
                      {t(tab.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-[#152A1C] dark:text-slate-100">
          {/* TAB 1: ALL ESSENTIALS & OFFICIAL PARTNER HUB */}
          {activeTab === 'all' && (
            <>
              {/* Official Partner Direct Checkout Hero */}
              <div className="rounded-2xl border border-[#2D5A3D]/30 dark:border-emerald-700/40 bg-gradient-to-br from-[#152A1C] via-[#1F3F2B] to-[#2D5A3D] p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-300/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-200 border border-emerald-300/30">
                        <ShieldCheck className="w-3 h-3 text-emerald-200" />
                        Official Carrier & Hotel Portals
                      </span>
                      <span className="text-[10px] text-emerald-100/85">
                        Pre-filled for {startDateStr} • {travelers} {travelers === 1 ? 'Adult' : 'Adults'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-display font-bold text-white">
                      Book Directly with Official Providers for {destination}
                    </h3>
                    <p className="text-xs text-emerald-100/85 max-w-lg leading-relaxed">
                      TripVerse never adds hidden booking markups or holds third-party ticket funds. Book directly on your airline, railway, or hotel portal, then save your official PNR below for offline pass access.
                    </p>
                  </div>

                  <div className="shrink-0 flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-200/80 block">
                        Est. Trip Budget
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-200 font-mono">
                        {formatCurrency(effectiveLiveTotal, currency)}
                      </span>
                    </div>
                    <div className="flex flex-wrap sm:justify-end gap-2 w-full sm:w-auto">
                      <a
                        href={primaryTransitPartnerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#EAF0E9] hover:bg-white text-[#152A1C] font-extrabold text-xs px-3.5 py-2.5 transition-all shadow-sm"
                      >
                        <span>{primaryTransitPartnerLabel}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#2D5A3D]" />
                      </a>
                      {nights > 0 && (
                        <a
                          href={primaryHotelPartnerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-bold text-xs px-3.5 py-2.5 transition-all"
                        >
                          <span>Booking.com Stays</span>
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Offline Official PNR & Hotel Confirmation Wallet */}
              <div className="rounded-2xl border border-[#DCE6DA] dark:border-emerald-900/50 bg-white dark:bg-[#132219] p-4 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#EAF0E9] dark:bg-emerald-950/80 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shrink-0">
                      {savedRefs ? <CheckCircle2 className="w-5 h-5" /> : <BookmarkCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-[#152A1C] dark:text-white">
                          Official PNR & Hotel Confirmation Wallet
                        </h4>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#EAF0E9] dark:bg-emerald-950 text-[#2D5A3D] dark:text-emerald-300">
                          {savedRefs ? 'Saved Offline' : 'Optional'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5A7362] dark:text-slate-400">
                        {savedRefs
                          ? 'Pinned to your Trip Passes Hub for instant offline lookup during check-in.'
                          : 'Booked on IndiGo, IRCTC, or Booking.com? Save your real confirmation code here.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {savedRefs && !isEditingRefs && (
                      <button
                        type="button"
                        onClick={handleExportPassSummary}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-800 bg-[#F8FAF7] dark:bg-[#1A2E22] px-3 py-1.5 text-xs font-bold text-[#2D5A3D] dark:text-emerald-200 hover:bg-[#EAF0E9] transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export Summary</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setIsEditingRefs(prev => !prev);
                        setRefsFeedback(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      <span>{isEditingRefs ? 'Cancel' : savedRefs ? 'Edit PNR / Ref' : 'Add Official PNR'}</span>
                    </button>
                  </div>
                </div>

                {refsFeedback && (
                  <p className="text-xs font-semibold text-[#2D5A3D] dark:text-emerald-300 bg-[#EAF0E9]/80 dark:bg-emerald-950/60 px-3 py-2 rounded-xl">
                    ✓ {refsFeedback}
                  </p>
                )}

                {savedRefs && !isEditingRefs && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {savedRefs.transitPnr && (
                      <div className="rounded-xl bg-[#F4F6F2] dark:bg-[#182B20] border border-[#DCE6DA] dark:border-emerald-900/50 px-3 py-2.5">
                        <span className="text-[10px] font-bold uppercase text-[#5A7362] dark:text-emerald-300/70 block">
                          Saved Carrier PNR {savedRefs.transitProvider ? `• ${savedRefs.transitProvider}` : ''}
                        </span>
                        <span className="text-sm font-mono font-black text-[#152A1C] dark:text-white">
                          {savedRefs.transitPnr}
                          {savedRefs.seatOrCoach ? ` • Seat/Coach ${savedRefs.seatOrCoach}` : ''}
                        </span>
                      </div>
                    )}
                    {savedRefs.hotelConfirmationCode && (
                      <div className="rounded-xl bg-[#F4F6F2] dark:bg-[#182B20] border border-[#DCE6DA] dark:border-emerald-900/50 px-3 py-2.5">
                        <span className="text-[10px] font-bold uppercase text-[#5A7362] dark:text-emerald-300/70 block">
                          Saved Stay Confirmation {savedRefs.hotelName ? `• ${savedRefs.hotelName}` : ''}
                        </span>
                        <span className="text-sm font-mono font-black text-[#152A1C] dark:text-white">
                          {savedRefs.hotelConfirmationCode}
                        </span>
                      </div>
                    )}
                    {onNavigateToPasses && (
                      <div className="sm:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onNavigateToPasses();
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D5A3D] dark:text-emerald-300 hover:underline cursor-pointer"
                        >
                          <span>View on Digital Boarding Pass</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {isEditingRefs && (
                  <form onSubmit={handleSaveOfficialRefs} className="space-y-3 pt-2 border-t border-[#E6EEE5] dark:border-emerald-900/40">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#5A7362] dark:text-slate-400 block mb-1">
                          Carrier / Airline / Rail
                        </label>
                        <input
                          type="text"
                          value={transitProviderInput}
                          onChange={e => setTransitProviderInput(e.target.value)}
                          placeholder="e.g. IndiGo / IRCTC"
                          maxLength={60}
                          className="w-full rounded-xl border border-[#DCE6DA] dark:border-emerald-800/70 bg-[#F8FAF7] dark:bg-[#0D1711] px-3 py-2 text-xs font-medium text-[#152A1C] dark:text-white focus:outline-none focus:border-[#2D5A3D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#5A7362] dark:text-slate-400 block mb-1">
                          Official Flight / Train PNR
                        </label>
                        <input
                          type="text"
                          value={transitPnrInput}
                          onChange={e => setTransitPnrInput(e.target.value)}
                          placeholder="e.g. AB4K9X or 2849102938"
                          maxLength={32}
                          className="w-full rounded-xl border border-[#DCE6DA] dark:border-emerald-800/70 bg-[#F8FAF7] dark:bg-[#0D1711] px-3 py-2 text-xs font-mono font-bold uppercase text-[#152A1C] dark:text-white focus:outline-none focus:border-[#2D5A3D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#5A7362] dark:text-slate-400 block mb-1">
                          Seat / Coach / Gate
                        </label>
                        <input
                          type="text"
                          value={seatOrCoachInput}
                          onChange={e => setSeatOrCoachInput(e.target.value)}
                          placeholder="e.g. 14A or B2-34"
                          maxLength={24}
                          className="w-full rounded-xl border border-[#DCE6DA] dark:border-emerald-800/70 bg-[#F8FAF7] dark:bg-[#0D1711] px-3 py-2 text-xs font-mono font-semibold uppercase text-[#152A1C] dark:text-white focus:outline-none focus:border-[#2D5A3D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#5A7362] dark:text-slate-400 block mb-1">
                          Booked Hotel / Property Name
                        </label>
                        <input
                          type="text"
                          value={hotelNameInput}
                          onChange={e => setHotelNameInput(e.target.value)}
                          placeholder={hotel?.name || `Hotel in ${destination}`}
                          maxLength={80}
                          className="w-full rounded-xl border border-[#DCE6DA] dark:border-emerald-800/70 bg-[#F8FAF7] dark:bg-[#0D1711] px-3 py-2 text-xs font-medium text-[#152A1C] dark:text-white focus:outline-none focus:border-[#2D5A3D]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-[#5A7362] dark:text-slate-400 block mb-1">
                          Hotel Confirmation Number
                        </label>
                        <input
                          type="text"
                          value={hotelConfirmationInput}
                          onChange={e => setHotelConfirmationInput(e.target.value)}
                          placeholder="e.g. Booking.com #4920183"
                          maxLength={40}
                          className="w-full rounded-xl border border-[#DCE6DA] dark:border-emerald-800/70 bg-[#F8FAF7] dark:bg-[#0D1711] px-3 py-2 text-xs font-mono font-bold text-[#152A1C] dark:text-white focus:outline-none focus:border-[#2D5A3D]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {savedRefs ? (
                        <button
                          type="button"
                          onClick={handleClearRefs}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Clear Saved Refs</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#5A7362] dark:text-slate-400">
                          Stored privately on your device for offline check-in.
                        </span>
                      )}
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Save to Boarding Pass</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Calibrated Trip Market Estimate Chips */}
              <div className="rounded-2xl border border-[#DCE6DA] dark:border-emerald-900/40 bg-[#F4F6F2] dark:bg-[#122017] p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#152A1C] dark:text-slate-200">
                    Calibrated Market Cost Breakdown (Estimate)
                  </span>
                  <span className="text-[11px] text-[#5A7362] dark:text-slate-400">
                    {nights > 0 ? `${startDateStr} to ${endDateStr}` : `${startDateStr} • Same-Day`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {estimateItems.map(item => (
                    <div
                      key={item.label}
                      className="rounded-xl bg-white dark:bg-[#182A1F] p-2.5 border border-[#DCE6DA] dark:border-emerald-900/40 shadow-2xs"
                    >
                      <div className="flex items-center gap-1.5 text-[#5A7362] dark:text-emerald-300/80 mb-1">
                        <item.icon className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase truncate">{item.label}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-[#152A1C] dark:text-white block truncate font-mono">
                        {formatCurrency(item.amount, currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Shortcuts for Hotel and Transit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {hotel && nights > 0 ? (
                  <div className="rounded-2xl border border-[#DCE6DA] dark:border-emerald-900/40 p-3.5 bg-white dark:bg-[#132219] hover:border-[#8EA78D] transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-[#152A1C] dark:text-slate-100 mb-1">
                        <span className="flex items-center gap-1.5 truncate">
                          <Bed className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{hotel.name}</span>
                        </span>
                        <span className="text-[#2D5A3D] dark:text-emerald-300 font-mono font-black shrink-0 ml-2">
                          Est. {formatCurrency(effectiveStayCost, currency)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5A7362] dark:text-slate-400 truncate">
                        {hotel.address || hotel.neighborhood} • {nights}N / {rooms}R
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#EBF1EA] dark:border-emerald-900/40">
                      <button
                        type="button"
                        onClick={() => setActiveTab('hotels')}
                        className="text-xs font-bold text-[#2D5A3D] dark:text-emerald-300 hover:underline cursor-pointer"
                      >
                        Compare Stay Rates →
                      </button>
                      <a
                        href={hotel.bookingUrl || hotelLinks.bookingDotCom}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EAF0E9] dark:bg-emerald-950 hover:bg-[#DCE7DA] text-[#152A1C] dark:text-emerald-200 font-bold text-[11px] transition-colors"
                      >
                        <span>Booking.com</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : null}

                {bestTransport ? (
                  <div className="rounded-2xl border border-[#DCE6DA] dark:border-emerald-900/40 p-3.5 bg-white dark:bg-[#132219] hover:border-[#8EA78D] transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-[#152A1C] dark:text-slate-100 mb-1">
                        <span className="flex items-center gap-1.5 truncate">
                          <Plane className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                          <span className="truncate">{bestTransport.title}</span>
                        </span>
                        <span className="text-[#2D5A3D] dark:text-emerald-300 font-mono font-black shrink-0 ml-2">
                          Est. {formatCurrency(effectiveTransportCost, currency)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5A7362] dark:text-slate-400 truncate">
                        {origin} → {destination} • {travelers} Pax
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[#EBF1EA] dark:border-emerald-900/40">
                      <button
                        type="button"
                        onClick={() => setActiveTab('transport')}
                        className="text-xs font-bold text-[#2D5A3D] dark:text-emerald-300 hover:underline cursor-pointer"
                      >
                        All Carrier Links →
                      </button>
                      <a
                        href={primaryTransitPartnerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EAF0E9] dark:bg-emerald-950 hover:bg-[#DCE7DA] text-[#152A1C] dark:text-emerald-200 font-bold text-[11px] transition-colors"
                      >
                        <span>Check Live Fares</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}

          {/* TAB 2: SELECTED HOTEL */}
          {activeTab === 'hotels' && (
            <div className="space-y-4">
              {nights === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#C7D8C5] dark:border-emerald-800/60 bg-white dark:bg-[#132219] p-6 text-center space-y-2">
                  <Bed className="w-8 h-8 text-[#2D5A3D] dark:text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-[#152A1C] dark:text-white">
                    Same-Day Trip (0 Overnight Stays Needed)
                  </h4>
                  <p className="text-xs text-[#5A7362] dark:text-slate-400 max-w-md mx-auto">
                    Your {destination} plan is a 1-day excursion, so ₹0 is allocated to overnight hotels. Need a day-use room or decide to stay the night? Search live availability below.
                  </p>
                  <div className="pt-2 flex flex-wrap justify-center gap-2">
                    <a
                      href={hotelLinks.bookingDotCom}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D5A3D] px-4 py-2 text-xs font-bold text-white hover:bg-[#244931] transition-colors"
                    >
                      <span>Search Booking.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={hotelLinks.googleHotels}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-800 bg-[#F8FAF7] dark:bg-[#192D21] px-4 py-2 text-xs font-bold text-[#152A1C] dark:text-emerald-100"
                    >
                      <span>Google Hotels</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : hotel ? (
                <div className="space-y-4">
                  {/* Hotel Partner Banner */}
                  <div className="rounded-2xl border border-[#2D5A3D]/30 bg-gradient-to-r from-[#152A1C] to-[#2D5A3D] p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">
                        Curated Accommodation Match
                      </span>
                      <h3 className="text-sm sm:text-base font-display font-bold text-white mt-0.5">
                        {hotel.name}
                      </h3>
                      <p className="text-xs text-emerald-100/85">
                        {nights} {nights === 1 ? 'Night' : 'Nights'} • {rooms} {rooms === 1 ? 'Room' : 'Rooms'} • Est. Total: {formatCurrency(effectiveStayCost, currency)}
                      </p>
                    </div>
                    <a
                      href={hotel.bookingUrl || hotelLinks.bookingDotCom}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#EAF0E9] hover:bg-white text-[#152A1C] px-4 py-2 text-xs font-extrabold transition-all shadow-sm shrink-0"
                    >
                      <span>Check Live Rooms on Booking.com</span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    </a>
                  </div>

                  {/* Detailed Hotel Card */}
                  <div className="rounded-2xl border border-[#DCE6DA] dark:border-emerald-900/40 bg-white dark:bg-[#132219] overflow-hidden shadow-xs">
                    <div className="p-4 flex flex-col sm:flex-row gap-4">
                      {hotel.image && (
                        <img
                          src={hotel.image}
                          alt={hotel.name}
                          onError={e => handleImageError(e)}
                          className="w-full sm:w-48 h-36 object-cover rounded-xl shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-bold text-[#152A1C] dark:text-white">{hotel.name}</h4>
                            <p className="text-xs text-[#5A7362] dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-[#8EA78D] shrink-0" />
                              <span className="truncate">{hotel.address || hotel.neighborhood}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-1 text-amber-500 text-xs font-bold">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{hotel.userRating}</span>
                              <span className="text-slate-400 font-normal">({hotel.starRating}★ Tier)</span>
                            </div>
                            <span className="text-sm font-black text-[#2D5A3D] dark:text-emerald-300 block mt-0.5 font-mono">
                              Est. {formatCurrency(hotel.nightlyRate, currency)}
                              <span className="text-[10px] text-[#5A7362] dark:text-slate-400 font-normal">/night</span>
                            </span>
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {hotel.amenities.map(am => (
                            <span
                              key={am}
                              className="rounded-md bg-[#F4F6F2] dark:bg-[#1B3023] px-2 py-0.5 text-[10px] font-semibold text-[#2D5A3D] dark:text-emerald-200"
                            >
                              {am}
                            </span>
                          ))}
                        </div>

                        <p className="mt-2 text-xs text-[#2D5A3D] dark:text-emerald-300 font-medium">
                          ✓ {hotel.cancellationPolicy}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2.5 border-t border-[#EBF1EA] dark:border-emerald-900/40">
                          <a
                            href={hotel.bookingUrl || hotelLinks.bookingDotCom}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] px-3.5 py-1.5 text-xs font-bold text-white transition-colors"
                          >
                            <span>Booking.com Official</span>
                            <ExternalLink className="w-3 h-3 text-emerald-200" />
                          </a>
                          <a
                            href={hotel.googleHotelsUrl || hotelLinks.googleHotels}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-800 bg-[#F8FAF7] dark:bg-[#192D21] px-3 py-1.5 text-xs font-bold text-[#152A1C] dark:text-emerald-100 hover:bg-[#EAF0E9] transition-colors"
                          >
                            <span>Google Hotels Live Rates</span>
                            <ExternalLink className="w-3 h-3 text-[#5A7362]" />
                          </a>
                          <a
                            href={hotel.agodaUrl || hotelLinks.agoda}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-800 bg-[#F8FAF7] dark:bg-[#192D21] px-3 py-1.5 text-xs font-bold text-[#152A1C] dark:text-emerald-100 hover:bg-[#EAF0E9] transition-colors"
                          >
                            <span>Agoda Deals</span>
                            <ExternalLink className="w-3 h-3 text-[#5A7362]" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#C7D8C5] dark:border-emerald-800/60 bg-white dark:bg-[#132219] p-6 text-center">
                  <Bed className="w-8 h-8 text-[#2D5A3D] dark:text-emerald-400 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-[#152A1C] dark:text-white">Find Verified Stays in {destination}</h4>
                  <p className="text-xs text-[#5A7362] dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Compare live room inventory and free-cancellation rates for {startDateStr} to {endDateStr}.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <a
                      href={hotelLinks.bookingDotCom}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D5A3D] px-4 py-2 text-xs font-bold text-white hover:bg-[#244931] transition-colors"
                    >
                      <span>Search on Booking.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={hotelLinks.googleHotels}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-800 bg-[#F8FAF7] dark:bg-[#192D21] px-4 py-2 text-xs font-bold text-[#152A1C] dark:text-emerald-100"
                    >
                      <span>Compare on Google Hotels</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FLIGHTS & TRAINS */}
          {activeTab === 'transport' && (
            <div className="space-y-4">
              {bestTransport && (
                <div className="rounded-2xl border border-[#C7D8C5] dark:border-emerald-800/60 bg-[#EAF0E9]/70 dark:bg-[#14261B] p-4 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="rounded-full bg-[#2D5A3D] px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
                      {bestTransport.badge || 'Recommended Route'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#152A1C] dark:text-emerald-200 font-mono">
                      Est. {formatCurrency(bestTransport.dealPrice, currency)}{' '}
                      <span className="text-[10px] text-[#5A7362] dark:text-slate-400 font-normal">
                        ({bestTransport.priceUnit.replace('_', ' ')})
                      </span>
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-[#152A1C] dark:text-white">{bestTransport.title}</h4>
                  <p className="text-xs text-[#5A7362] dark:text-slate-300">{bestTransport.subtitle}</p>

                  <div className="mt-2.5 flex items-center gap-4 text-xs text-[#152A1C] dark:text-slate-200 bg-white dark:bg-[#0D1711] p-2.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-900/50">
                    <div>
                      <span className="text-[10px] text-[#5A7362] dark:text-slate-400 block uppercase font-bold">
                        Typical Window
                      </span>
                      <span className="font-bold">{bestTransport.route.departureTime}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#5A7362]">
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{bestTransport.route.duration}</span>
                      <span>•</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#5A7362] dark:text-slate-400 block uppercase font-bold">
                        Est. Arrival
                      </span>
                      <span className="font-bold">{bestTransport.route.arrivalTime}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={bestTransport.bookingUrl || flightLinks.googleFlights}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] px-3.5 py-1.5 text-xs font-bold text-white transition-colors"
                    >
                      <span>Search Google Flights</span>
                      <ExternalLink className="w-3 h-3 text-emerald-200" />
                    </a>
                    <a
                      href={flightLinks.skyscanner}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-800 bg-white dark:bg-[#192D21] px-3.5 py-1.5 text-xs font-bold text-[#152A1C] dark:text-emerald-100 hover:bg-[#F4F6F2] transition-colors"
                    >
                      <span>Skyscanner</span>
                      <ExternalLink className="w-3 h-3 text-[#5A7362]" />
                    </a>
                    <a
                      href={trainLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-800 bg-white dark:bg-[#192D21] px-3.5 py-1.5 text-xs font-bold text-[#152A1C] dark:text-emerald-100 hover:bg-[#F4F6F2] transition-colors"
                    >
                      <Train className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                      <span>{isIndiaRoute ? 'IRCTC Trains' : 'Global Rail'}</span>
                      <ExternalLink className="w-3 h-3 text-[#5A7362]" />
                    </a>
                  </div>
                </div>
              )}

              {/* Official Transport Providers Grid */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <a
                  href={flightLinks.googleFlights}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE6DA] dark:border-emerald-900/40 bg-white dark:bg-[#132219] p-3.5 hover:border-[#2D5A3D] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Plane className="w-5 h-5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-[#152A1C] dark:text-white block">
                        Google Flights Live Fares
                      </span>
                      <span className="text-[11px] text-[#5A7362] dark:text-slate-400">
                        {origin} → {destination} • Direct airline links
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#5A7362] shrink-0" />
                </a>

                <a
                  href={trainLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE6DA] dark:border-emerald-900/40 bg-white dark:bg-[#132219] p-3.5 hover:border-[#2D5A3D] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Train className="w-5 h-5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-[#152A1C] dark:text-white block">
                        {isIndiaRoute ? 'IRCTC Official Indian Railways' : 'Global Rail & High-Speed Trains'}
                      </span>
                      <span className="text-[11px] text-[#5A7362] dark:text-slate-400">
                        {isIndiaRoute ? 'Official seat quota & e-ticket booking' : 'Trainline / Eurail / JR / Amtrak'}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#5A7362] shrink-0" />
                </a>

                <a
                  href={busLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE6DA] dark:border-emerald-900/40 bg-white dark:bg-[#132219] p-3.5 hover:border-[#2D5A3D] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Bus className="w-5 h-5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-[#152A1C] dark:text-white block">
                        {isIndiaRoute ? 'redBus Sleeper & Intercity' : 'FlixBus & Intercity Coaches'}
                      </span>
                      <span className="text-[11px] text-[#5A7362] dark:text-slate-400">
                        {isIndiaRoute ? 'Verified AC Volvo & sleeper operators' : 'Direct intercity coach reservations'}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#5A7362] shrink-0" />
                </a>

                <a
                  href={cabLinks.zoomcar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE6DA] dark:border-emerald-900/40 bg-white dark:bg-[#132219] p-3.5 hover:border-[#2D5A3D] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Car className="w-5 h-5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-[#152A1C] dark:text-white block">
                        {isIndiaRoute ? 'Zoomcar Self-Drive Rentals' : 'Rentalcars.com & Self-Drive'}
                      </span>
                      <span className="text-[11px] text-[#5A7362] dark:text-slate-400">
                        Self-drive SUVs & sedans in {destination}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#5A7362] shrink-0" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 4: TOURS & ENTRY PASSES */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#2D5A3D]/30 bg-gradient-to-r from-[#152A1C] to-[#2D5A3D] p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">
                    Official Monument Tickets & Guided Tours
                  </span>
                  <h3 className="text-sm sm:text-base font-display font-bold text-white mt-0.5">
                    Skip-The-Line Sightseeing in {destination}
                  </h3>
                  <p className="text-xs text-emerald-100/85">
                    Estimated Activities Budget: {formatCurrency(effectiveActivitiesCost, currency)}
                  </p>
                </div>
                <a
                  href={viatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#EAF0E9] hover:bg-white text-[#152A1C] px-4 py-2 text-xs font-extrabold transition-all shadow-sm shrink-0"
                >
                  <Ticket className="w-3.5 h-3.5 text-[#2D5A3D]" />
                  <span>Browse Passes on Viator</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#2D5A3D]" />
                </a>
              </div>

              {trip.itinerary && trip.itinerary.length > 0 && (
                <div className="rounded-2xl border border-[#DCE6DA] dark:border-emerald-900/40 p-3.5 bg-[#F4F6F2] dark:bg-[#122017]">
                  <span className="text-xs font-bold text-[#152A1C] dark:text-slate-200 block mb-2">
                    Planned Itinerary Attractions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {trip.itinerary
                      .flatMap((day, dayIdx) =>
                        day.activities.slice(0, 2).map((act, actIdx) => (
                          <div
                            key={`${dayIdx}-${actIdx}`}
                            className="p-2.5 rounded-xl bg-white dark:bg-[#182A1F] border border-[#DCE6DA] dark:border-emerald-900/40 shadow-2xs"
                          >
                            <span className="text-[10px] font-bold text-[#2D5A3D] dark:text-emerald-300 uppercase block">
                              Day {day.dayNumber} • {act.time}
                            </span>
                            <span className="text-xs font-bold text-[#152A1C] dark:text-white block truncate">
                              {act.title}
                            </span>
                            {act.description && (
                              <p className="text-[11px] text-[#5A7362] dark:text-slate-400 truncate mt-0.5">
                                {act.description}
                              </p>
                            )}
                          </div>
                        ))
                      )
                      .slice(0, 4)}
                  </div>
                </div>
              )}

              <div className="grid gap-2.5 sm:grid-cols-2">
                <a
                  href={viatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE6DA] dark:border-emerald-900/40 p-3.5 hover:border-[#2D5A3D] transition-colors bg-white dark:bg-[#132219] shadow-2xs"
                >
                  <div>
                    <span className="text-xs font-bold text-[#152A1C] dark:text-white block">
                      Viator (Tripadvisor) Experiences
                    </span>
                    <span className="text-[11px] text-[#5A7362] dark:text-slate-400">
                      Official monument tickets & verified local guides
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#5A7362] shrink-0" />
                </a>

                <a
                  href={getYourGuideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#DCE6DA] dark:border-emerald-900/40 p-3.5 hover:border-[#2D5A3D] transition-colors bg-white dark:bg-[#132219] shadow-2xs"
                >
                  <div>
                    <span className="text-xs font-bold text-[#152A1C] dark:text-white block">
                      GetYourGuide Mobile Passes
                    </span>
                    <span className="text-[11px] text-[#5A7362] dark:text-slate-400">
                      Instant QR entry passes & flexible cancellation
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#5A7362] shrink-0" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Honest Official-Partner Footer */}
        <footer className="shrink-0 flex items-center justify-between gap-3 border-t border-[#DCE6DA] dark:border-emerald-900/40 bg-[#EEF3ED] dark:bg-[#111F16] px-4 py-3">
          <p className="text-[11px] text-[#4A6352] dark:text-slate-400 flex items-center gap-1.5 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
            <span className="truncate">
              Bookings complete directly on official airline, rail & hotel sites • Zero TripVerse markup
            </span>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={
                activeTab === 'hotels'
                  ? primaryHotelPartnerUrl
                  : activeTab === 'activities'
                    ? viatorUrl
                    : primaryTransitPartnerUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-[#2D5A3D] px-4 py-2 text-xs font-bold text-white hover:bg-[#244931] transition-colors shadow-xs"
            >
              <span>
                {activeTab === 'hotels'
                  ? 'Open Booking.com'
                  : activeTab === 'activities'
                    ? 'Open Viator Passes'
                    : primaryTransitPartnerLabel}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-200" />
            </a>
          </div>
        </footer>
      </section>
    </div>
  );
};
