import React, { useState, useEffect } from 'react';
import { Trip, PackingItem, WeatherForecast } from '../../types/trip';
import { fetchLiveDestinationWeather, getDestinationWeather } from '../../services/weatherService';
import { loadTripPacking, saveTripPacking } from '../../services/storageService';
import { generateSmartPackingList } from '../../services/packingService';
import { resolveDestinationImage, handleImageError } from '../../utils/destinationImages';
import { triggerHaptic, saveOrShareFile } from '../../services/deviceService';
import {
  ArrowLeft,
  Bell,
  MoreVertical,
  Plane,
  Car,
  Train,
  Bus,
  ChevronRight,
  Sun,
  CloudSun,
  CloudRain,
  CheckCircle2,
  Circle,
  Download,
  Share2,
  ExternalLink,
  BookmarkCheck
} from 'lucide-react';
import {
  getRealTripBookingRefs,
  generatePassWalletSummaryText,
  RealTripBookingRefs
} from '../../services/paymentGatewayService';
import { resolveTransitContext } from '../../services/transportFeasibilityEngine';
import { useLanguage } from '../../services/languageService';

interface TripPassesHubViewProps {
  trip: Trip;
  onBack?: () => void;
  onOpenBookingModal?: () => void;
  onOpenPacking?: () => void;
  onExportTrip?: () => void;
  onOpenShare?: () => void;
  onOpenNotifications?: () => void;
}

export const TripPassesHubView: React.FC<TripPassesHubViewProps> = ({
  trip,
  onBack,
  onOpenBookingModal,
  onOpenPacking,
  onExportTrip,
  onOpenShare,
  onOpenNotifications
}) => {
  const { t } = useLanguage();
  // Live weather forecast
  const [weather, setWeather] = useState<WeatherForecast>(() =>
    getDestinationWeather(trip.destination, trip.durationDays)
  );

  // Genuine user-entered carrier PNR & hotel confirmation references
  const [savedRefs, setSavedRefs] = useState<RealTripBookingRefs | null>(() =>
    getRealTripBookingRefs(trip.id)
  );

  useEffect(() => {
    setSavedRefs(getRealTripBookingRefs(trip.id));
    const handleRefsUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ tripId: string; refs: RealTripBookingRefs | null }>;
      if (customEvent.detail && customEvent.detail.tripId === trip.id) {
        setSavedRefs(customEvent.detail.refs);
      } else {
        setSavedRefs(getRealTripBookingRefs(trip.id));
      }
    };
    window.addEventListener('tripverse_real_pass_updated', handleRefsUpdate);
    return () => window.removeEventListener('tripverse_real_pass_updated', handleRefsUpdate);
  }, [trip.id]);

  // Packing list state
  const [packingItems, setPackingItems] = useState<PackingItem[]>(() => {
    const saved = loadTripPacking(trip.id);
    if (saved && saved.length > 0) return saved;
    return generateSmartPackingList(trip);
  });

  // Synchronize packing items when active trip changes
  useEffect(() => {
    const saved = loadTripPacking(trip.id);
    if (saved && saved.length > 0) {
      setPackingItems(saved);
    } else {
      setPackingItems(generateSmartPackingList(trip));
    }
  }, [trip]);

  useEffect(() => {
    let isMounted = true;
    fetchLiveDestinationWeather(
      trip.destination,
      trip.durationDays,
      undefined,
      trip.destinationDetails?.coordinates
    )
      .then(liveWeather => {
        if (isMounted) {
          setWeather(liveWeather);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [trip.destination, trip.durationDays, trip.destinationDetails?.coordinates]);

  const togglePackingItem = (itemId: string) => {
    triggerHaptic('light');
    const updated = packingItems.map(item =>
      item.id === itemId ? { ...item, isPacked: !item.isPacked } : item
    );
    setPackingItems(updated);
    saveTripPacking(trip.id, updated);
  };

  // Derive genuine IATA / Indian Railways station hub codes
  const KNOWN_HUB_CODES: Record<string, string> = {
    vadodara: 'BDQ',
    baroda: 'BDQ',
    mathura: 'MTJ',
    vrindavan: 'MTJ',
    agra: 'AGC',
    ahmedabad: 'AMD',
    mumbai: 'BOM',
    bombay: 'BOM',
    delhi: 'DEL',
    'new delhi': 'DEL',
    bengaluru: 'BLR',
    bangalore: 'BLR',
    hyderabad: 'HYD',
    chennai: 'MAA',
    kolkata: 'CCU',
    pune: 'PNQ',
    jaipur: 'JAI',
    udaipur: 'UDR',
    goa: 'GOI',
    kochi: 'COK',
    surat: 'STV',
    rajkot: 'HSR',
    bhopal: 'BHO',
    indore: 'IDR',
    chandigarh: 'IXC',
    lucknow: 'LKO',
    varanasi: 'VNS',
    amritsar: 'ATQ',
    srinagar: 'SXR',
    leh: 'IXL',
    manali: 'KUU',
    shimla: 'SLV',
    rishikesh: 'DED',
    haridwar: 'HW',
    'new jersey': 'EWR',
    newark: 'EWR',
    'jersey city': 'EWR',
    'new york': 'JFK',
    london: 'LHR',
    paris: 'CDG',
    tokyo: 'HND',
    kyoto: 'KIX',
    osaka: 'KIX',
    dubai: 'DXB',
    'abu dhabi': 'AUH',
    singapore: 'SIN',
    bangkok: 'BKK',
    bali: 'DPS',
    rome: 'FCO',
    zurich: 'ZRH',
    amsterdam: 'AMS',
    seoul: 'ICN',
    sydney: 'SYD',
    toronto: 'YYZ'
  };

  const getCityCode = (locationName: string, fallbackCode?: string) => {
    const cleanCity = (locationName || '').split(',')[0].trim();
    const lower = cleanCity.toLowerCase();
    if (KNOWN_HUB_CODES[lower]) return KNOWN_HUB_CODES[lower];
    for (const [key, code] of Object.entries(KNOWN_HUB_CODES)) {
      if (lower.includes(key)) return code;
    }
    if (fallbackCode && fallbackCode.length >= 2 && fallbackCode.length <= 4) {
      return fallbackCode.toUpperCase();
    }
    const letters = cleanCity.toUpperCase().replace(/[^A-Z]/g, '');
    return letters.length >= 3 ? letters.slice(0, 3) : 'HUB';
  };

  const originTransitCtx = resolveTransitContext(trip.origin || '', trip.routeDetails?.originCoordinates);
  const destTransitCtx = resolveTransitContext(
    trip.destination || '',
    trip.destinationDetails?.coordinates || trip.routeDetails?.destinationCoordinates
  );
  const isTrainMode = trip.transportMode === 'train';
  const originCode = getCityCode(
    trip.origin,
    isTrainMode ? originTransitCtx.primaryRailwayStation?.code : originTransitCtx.primaryAirport?.code
  );
  const destinationCode = getCityCode(
    trip.destination,
    isTrainMode ? destTransitCtx.primaryRailwayStation?.code : destTransitCtx.primaryAirport?.code
  );

  const nights = Math.max(0, trip.durationDays - 1);

  // Format dates
  const formatDateHeader = () => {
    if (!trip.startDate) {
      return nights === 0
        ? `${trip.durationDays} Day • Same-Day Trip`
        : `${trip.durationDays} Days • ${nights} ${nights === 1 ? 'Night' : 'Nights'}`;
    }
    try {
      const start = new Date(trip.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + Math.max(0, trip.durationDays - 1));
      const startStr = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const endStr = end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      return nights === 0 ? `${endStr} • Same-Day` : `${startStr} – ${endStr}`;
    } catch {
      return `${trip.durationDays} Days Journey`;
    }
  };

  // Completed items calculations
  const totalActivities = trip.itinerary?.reduce((acc, d) => acc + (d.activities?.length || 0), 0) || 1;
  const completedActivities =
    trip.itinerary?.reduce((acc, d) => acc + (d.activities?.filter(a => a.completed)?.length || 0), 0) || 0;
  const packedCount = packingItems.filter(i => i.isPacked).length;
  const totalPackingCount = packingItems.length || 1;

  // Genuine composite progress percentage (starts truthfully at 0% with no artificial floor)
  const tripProgressPercent = Math.min(
    100,
    Math.max(
      0,
      Math.round(((completedActivities / totalActivities) * 0.5 + (packedCount / totalPackingCount) * 0.5) * 100)
    )
  );

  // Weather metrics
  const todayWeather = weather.forecastDays?.[0];
  const currentTemp = todayWeather ? Math.round(todayWeather.tempC) : 26;
  const weatherCondition = todayWeather?.condition || 'Partly Cloudy';
  const weatherHigh = todayWeather ? Math.round(todayWeather.maxTempC) : currentTemp + 4;
  const weatherLow = todayWeather ? Math.round(todayWeather.minTempC) : currentTemp - 3;

  // Hotel accommodation finding (use user-saved hotel name, selectedHotel, or itinerary hotel — never fabricate)
  const stayActivity =
    trip.itinerary?.[0]?.activities?.find(a => a.type === 'hotel') ||
    trip.itinerary?.[1]?.activities?.find(a => a.type === 'hotel');
  const hotelName =
    savedRefs?.hotelName ||
    trip.selectedHotel?.name ||
    stayActivity?.title ||
    (nights === 0 ? 'Same-Day Trip (No Hotel Needed)' : 'Accommodation Not Selected Yet');
  const hotelThumbnail = resolveDestinationImage(
    savedRefs?.hotelName || trip.selectedHotel?.name || trip.destination || 'Destination',
    'nature'
  );

  const routeDurationLabel =
    trip.bestTransportDeal?.route?.duration ||
    (trip.routeDetails?.durationHours ? `~${Math.round(trip.routeDetails.durationHours * 10) / 10}h` : 'Est. Transit');

  // SVG circular progress calculation
  const circleRadius = 26;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (tripProgressPercent / 100) * circleCircumference;

  const hasSavedPnr = Boolean(savedRefs?.transitPnr);
  const hasAnySavedRef = Boolean(savedRefs);

  const handleExportSavedRefs = () => {
    if (!savedRefs) return;
    triggerHaptic('light');
    const destinationClean = (trip.destination || 'Trip').split(',')[0].trim().replace(/[^a-zA-Z0-9]/g, '_');
    const text = generatePassWalletSummaryText(trip, savedRefs);
    void saveOrShareFile({
      filename: `TripVerse_Pass_Summary_${destinationClean}.txt`,
      content: text,
      mimeType: 'text/plain;charset=utf-8',
      title: `Offline Pass Summary • ${(trip.destination || 'Trip').split(',')[0]}`,
      text
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 font-sans pb-24">
      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white dark:bg-[#132219] border border-[#E2EBE1] dark:border-emerald-900/50 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shadow-xs hover:bg-[#F8FAF7] dark:hover:bg-[#192D21] transition-all cursor-pointer active:scale-95"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#152A1C] dark:text-white tracking-tight">
              Trip to {(trip.destination || 'Destination').split(',')[0]}
            </h1>
            <p className="text-xs text-[#5A7362] dark:text-emerald-200/70 font-medium">
              {formatDateHeader()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#132219] border border-[#E2EBE1] dark:border-emerald-900/50 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shadow-xs hover:bg-[#F8FAF7] dark:hover:bg-[#192D21] transition-all cursor-pointer"
            title="Notifications"
            aria-label="Open notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenShare}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#132219] border border-[#E2EBE1] dark:border-emerald-900/50 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shadow-xs hover:bg-[#F8FAF7] dark:hover:bg-[#192D21] transition-all cursor-pointer"
            title="Trip Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Saved Official Carrier PNR / Hotel Confirmation Banner */}
      {savedRefs ? (
        <div className="rounded-2xl border border-[#C7D8C5] dark:border-emerald-800/60 bg-gradient-to-r from-[#EAF0E9] via-[#F4F6F2] to-white dark:from-[#152A1C] dark:via-[#132419] dark:to-[#0F1B13] p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#2D5A3D] text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-[#152A1C] dark:text-emerald-200 bg-white/80 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-[#DCE6DA] dark:border-emerald-800">
                  {t('Saved Offline Reference')}
                </span>
                {savedRefs.transitPnr && (
                  <span className="text-[11px] font-mono font-bold text-[#152A1C] dark:text-white truncate">
                    PNR: {savedRefs.transitPnr}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#5A7362] dark:text-slate-300 truncate mt-0.5">
                {savedRefs.transitProvider ? `${savedRefs.transitProvider} • ` : ''}
                {savedRefs.hotelConfirmationCode
                  ? `Hotel Conf: ${savedRefs.hotelConfirmationCode}`
                  : 'Tap Edit to add hotel confirmation'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleExportSavedRefs}
              className="px-2.5 py-1.5 rounded-xl border border-[#DCE6DA] dark:border-emerald-800 bg-white dark:bg-[#192D21] text-[#152A1C] dark:text-emerald-200 text-xs font-bold hover:bg-[#F8FAF7] transition-colors cursor-pointer"
            >
              {t('Export')}
            </button>
            {onOpenBookingModal && (
              <button
                type="button"
                onClick={onOpenBookingModal}
                className="px-2.5 py-1.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold hover:bg-[#244931] transition-colors cursor-pointer"
              >
                {t('Edit')}
              </button>
            )}
          </div>
        </div>
      ) : (
        onOpenBookingModal && (
          <button
            type="button"
            onClick={onOpenBookingModal}
            className="w-full text-left rounded-2xl border border-dashed border-[#C7D8C5] dark:border-emerald-800/60 bg-[#F8FAF7] dark:bg-[#122017] hover:bg-[#EAF0E9]/70 dark:hover:bg-[#17291E] p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#EAF0E9] dark:bg-emerald-950 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shrink-0">
                <BookmarkCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#152A1C] dark:text-white block truncate">
                  Already booked on IndiGo, IRCTC, or Booking.com?
                </span>
                <span className="text-[11px] text-[#5A7362] dark:text-slate-400 block truncate">
                  Tap to save your real carrier PNR & hotel confirmation offline
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#5A7362] dark:text-emerald-300 shrink-0" />
          </button>
        )
      )}

      {/* Signature Boarding Pass Card */}
      <div className="rounded-3xl bg-white dark:bg-[#111E16] border border-[#E2EBE1] dark:border-emerald-900/50 shadow-[0_8px_32px_rgba(45,90,61,0.08)] overflow-hidden">
        {/* Forest Green Top Banner */}
        <div className="bg-gradient-to-r from-[#152A1C] via-[#244931] to-[#2D5A3D] px-6 py-4 flex items-center justify-between text-white">
          <span className="text-[11px] font-mono tracking-widest uppercase text-white/95 font-bold truncate pr-2">
            {hasSavedPnr
              ? `SAVED PASS • PNR ${savedRefs?.transitPnr}`
              : 'TRANSIT & ROUTE SUMMARY (ESTIMATE)'}
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs shrink-0">
            <span>{hasSavedPnr ? 'PNR Saved' : 'Unbooked Plan'}</span>
            {trip.transportMode === 'train' ? (
              <Train className="w-3.5 h-3.5 text-emerald-200" />
            ) : trip.transportMode === 'bus' ? (
              <Bus className="w-3.5 h-3.5 text-emerald-200" />
            ) : trip.transportMode === 'car' || trip.transportMode === 'bike' ? (
              <Car className="w-3.5 h-3.5 text-emerald-200" />
            ) : (
              <Plane className="w-3.5 h-3.5 text-emerald-200 transform rotate-45" />
            )}
          </div>
        </div>

        {/* Departure & Arrival Routing */}
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            {/* Origin */}
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider text-[#5A7362] dark:text-emerald-300/70 font-semibold block truncate max-w-[100px]">
                {(trip.origin || 'Origin').split(',')[0]}
              </span>
              <span className="text-3xl sm:text-4xl font-display font-black text-[#152A1C] dark:text-white tracking-tight block">
                {originCode}
              </span>
              <span className="text-xs font-bold text-[#152A1C] dark:text-slate-200 block">
                {trip.bestTransportDeal?.route?.departureTime || 'Flexible Dep.'}
              </span>
              <span className="text-[10px] text-[#8EA78D] font-medium block">
                {trip.startDate
                  ? new Date(trip.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                  : 'Day 1'}
              </span>
            </div>

            {/* Transit Path & Duration */}
            <div className="flex-1 flex flex-col items-center justify-center px-3 min-w-0">
              <span className="text-[11px] font-bold text-[#5A7362] dark:text-emerald-200/80 tracking-wide mb-1.5 whitespace-nowrap">
                {routeDurationLabel}
              </span>
              <div className="relative w-full h-8 flex items-center justify-center my-0.5">
                <div className="w-full border-t-2 border-dashed border-[#8EA78D]/40" />
                <div className="absolute w-8 h-8 rounded-full bg-[#E8EFE7] dark:bg-[#1B3123] border-2 border-white dark:border-[#111E16] text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shadow-xs">
                  {trip.transportMode === 'flight' ? (
                    <Plane className="w-4 h-4 transform rotate-90" />
                  ) : trip.transportMode === 'train' ? (
                    <Train className="w-4 h-4" />
                  ) : trip.transportMode === 'bus' ? (
                    <Bus className="w-4 h-4" />
                  ) : (
                    <Car className="w-4 h-4" />
                  )}
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[#8EA78D] mt-1.5 capitalize whitespace-nowrap">
                {trip.routeType ? `${trip.routeType} transit` : `${trip.transportMode || 'planned'} transit`}
              </span>
            </div>

            {/* Destination */}
            <div className="space-y-0.5 text-right">
              <span className="text-[11px] uppercase tracking-wider text-[#5A7362] dark:text-emerald-300/70 font-semibold block truncate max-w-[100px]">
                {(trip.destination || 'Destination').split(',')[0]}
              </span>
              <span className="text-3xl sm:text-4xl font-display font-black text-[#152A1C] dark:text-white tracking-tight block">
                {destinationCode}
              </span>
              <span className="text-xs font-bold text-[#152A1C] dark:text-slate-200 block">
                {trip.bestTransportDeal?.route?.arrivalTime || 'Est. Arrival'}
              </span>
              <span className="text-[10px] text-[#8EA78D] font-medium block">
                {trip.startDate
                  ? new Date(trip.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
                  : 'Day 1'}
              </span>
            </div>
          </div>
        </div>

        {/* Signature Perforated Cutout Divider */}
        <div className="relative flex items-center my-1">
          <div className="w-5 h-5 rounded-full bg-[#F4F6F2] dark:bg-[#0B140E] -ml-2.5 shadow-inner" />
          <div className="flex-1 border-t-2 border-dashed border-[#E2EBE1] dark:border-emerald-900/50" />
          <div className="w-5 h-5 rounded-full bg-[#F4F6F2] dark:bg-[#0B140E] -mr-2.5 shadow-inner" />
        </div>

        {/* Lower Boarding Pass Details & Visual Matrix */}
        <div className="p-6 pt-4 flex items-center justify-between gap-4">
          <div className="grid grid-cols-3 gap-4 flex-1 min-w-0">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">
                {hasSavedPnr ? 'Official PNR' : 'Carrier / Route'}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#152A1C] dark:text-white block truncate font-mono">
                {hasSavedPnr
                  ? savedRefs?.transitPnr
                  : trip.bestTransportDeal?.provider || `${(trip.transportMode || 'car').toUpperCase()} Route`}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">
                {savedRefs?.seatOrCoach ? 'Seat / Coach' : 'Mode'}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#152A1C] dark:text-white block capitalize truncate">
                {savedRefs?.seatOrCoach || trip.transportMode || 'Car'}
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">Travelers</span>
              <span className="text-xs sm:text-sm font-extrabold text-[#152A1C] dark:text-white block truncate">
                {hasSavedPnr ? `${trip.travelersCount} Pax (Saved)` : `${trip.travelersCount} Pax (Plan)`}
              </span>
            </div>
          </div>

          <div className="shrink-0 p-2 rounded-2xl bg-[#F8FAF7] dark:bg-[#172A1E] border border-[#E2EBE1] dark:border-emerald-800/60 shadow-2xs">
            <svg className="w-14 h-14" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect width="56" height="56" rx="8" fill="transparent" />
              <rect x="6" y="6" width="14" height="14" rx="3" stroke="#2D5A3D" strokeWidth="2.5" />
              <rect x="10" y="10" width="6" height="6" fill="#2D5A3D" rx="1" />
              <rect x="36" y="6" width="14" height="14" rx="3" stroke="#2D5A3D" strokeWidth="2.5" />
              <rect x="40" y="10" width="6" height="6" fill="#2D5A3D" rx="1" />
              <rect x="6" y="36" width="14" height="14" rx="3" stroke="#2D5A3D" strokeWidth="2.5" />
              <rect x="10" y="40" width="6" height="6" fill="#2D5A3D" rx="1" />
              <rect x="24" y="8" width="4" height="4" fill="#2D5A3D" rx="1" />
              <rect x="28" y="16" width="4" height="4" fill="#2D5A3D" rx="1" />
              <rect x="24" y="24" width="8" height="8" fill="#2D5A3D" rx="2" />
              <rect x="36" y="24" width="4" height="4" fill="#2D5A3D" rx="1" />
              <rect x="44" y="28" width="4" height="4" fill="#2D5A3D" rx="1" />
              <rect x="24" y="36" width="4" height="8" fill="#2D5A3D" rx="1" />
              <rect x="32" y="44" width="8" height="4" fill="#2D5A3D" rx="1" />
              <rect x="44" y="40" width="4" height="6" fill="#2D5A3D" rx="1" />
            </svg>
          </div>
        </div>
      </div>

      {/* Hotel Stay Card */}
      <div
        onClick={onOpenBookingModal}
        className="rounded-3xl bg-white dark:bg-[#111E16] p-4 border border-[#E2EBE1] dark:border-emerald-900/50 shadow-[0_4px_20px_rgba(45,90,61,0.05)] flex items-center justify-between gap-3 cursor-pointer hover:border-[#8EA78D] transition-all group"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border border-[#E2EBE1] dark:border-emerald-900/50 bg-[#E8EFE7] dark:bg-[#172A1E]">
            <img
              src={hotelThumbnail}
              alt={hotelName}
              onError={e => handleImageError(e)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">{t('Hotel')}</span>
              {savedRefs?.hotelConfirmationCode && (
                <span className="text-[9px] font-mono font-bold text-[#152A1C] dark:text-emerald-200 bg-[#EAF0E9] dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  Conf: {savedRefs.hotelConfirmationCode}
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-sm sm:text-base text-[#152A1C] dark:text-white truncate block">
              {hotelName}
            </h3>
            <p className="text-xs text-[#5A7362] dark:text-slate-400 font-medium truncate">
              {nights === 0
                ? 'Same-Day Excursion • 0 Overnight Stays'
                : `${formatDateHeader()} • ${nights} ${nights === 1 ? t('Night') : t('Nights')}`}
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#F8FAF7] dark:bg-[#172A1E] text-[#8EA78D] group-hover:text-[#2D5A3D] dark:group-hover:text-emerald-300 group-hover:bg-[#E8EFE7] flex items-center justify-center shrink-0 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Dual Cards: Weather & Trip Progress Ring */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Column 1: Live Destination Weather */}
        <div className="rounded-3xl bg-white dark:bg-[#111E16] p-4 sm:p-5 border border-[#E2EBE1] dark:border-emerald-900/50 shadow-[0_4px_20px_rgba(45,90,61,0.05)] space-y-2">
          <span className="text-[11px] font-semibold text-[#5A7362] dark:text-emerald-300/80 block truncate">
            {t('Weather in')} {trip.destination.split(',')[0]}
          </span>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-3xl sm:text-4xl font-display font-black text-[#152A1C] dark:text-white">
              {currentTemp}°
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E8EFE7] dark:bg-[#172A1E] text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shrink-0">
              {weatherCondition.toLowerCase().includes('rain') ? (
                <CloudRain className="w-4 h-4" />
              ) : weatherCondition.toLowerCase().includes('cloud') ? (
                <CloudSun className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#152A1C] dark:text-slate-200 block truncate">
              {weatherCondition}
            </span>
            <span className="text-[11px] text-[#8EA78D] font-medium block">
              H: {weatherHigh}° L: {weatherLow}°
            </span>
          </div>
        </div>

        {/* Column 2: Trip Progress Circular Ring Gauge */}
        <div className="rounded-3xl bg-white dark:bg-[#111E16] p-4 sm:p-5 border border-[#E2EBE1] dark:border-emerald-900/50 shadow-[0_4px_20px_rgba(45,90,61,0.05)] space-y-2">
          <span className="text-[11px] font-semibold text-[#5A7362] dark:text-emerald-300/80 block">
            Trip Progress
          </span>
          <div className="flex items-center gap-3 pt-0.5">
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r={circleRadius}
                  stroke="#E8EFE7"
                  strokeWidth="6"
                  fill="none"
                  className="dark:opacity-20"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={circleRadius}
                  stroke="#2D5A3D"
                  strokeWidth="6"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-[#E8EFE7] dark:bg-[#172A1E] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#2D5A3D] dark:bg-emerald-400" />
                </div>
              </div>
            </div>

            <div className="space-y-0.5 min-w-0">
              <span className="text-lg sm:text-xl font-display font-black text-[#152A1C] dark:text-white block">
                {tripProgressPercent}%
              </span>
              <span className="text-[11px] text-[#8EA78D] font-medium block">
                {t('Completed')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Packing Checklist Progress Card */}
      <div className="rounded-3xl bg-white dark:bg-[#111E16] p-5 border border-[#E2EBE1] dark:border-emerald-900/50 shadow-[0_4px_20px_rgba(45,90,61,0.05)] space-y-3.5">
        <div
          onClick={onOpenPacking}
          className="flex items-center justify-between gap-2 cursor-pointer group"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm sm:text-base text-[#152A1C] dark:text-white">
                {t('Packing Checklist')}
              </h3>
              <span className="text-xs font-semibold text-[#8EA78D]">
                {packedCount} {t('of')} {packingItems.length} {t('packed')}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8EA78D] group-hover:text-[#2D5A3D] group-hover:translate-x-0.5 transition-all" />
        </div>

        <div className="w-full bg-[#E8EFE7] dark:bg-[#1B3123] rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-[#2D5A3D] dark:bg-emerald-400 transition-all duration-500"
            style={{ width: `${Math.round((packedCount / Math.max(1, packingItems.length)) * 100)}%` }}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {packingItems.slice(0, 4).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => togglePackingItem(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                item.isPacked
                  ? 'bg-[#E8EFE7] dark:bg-emerald-950 text-[#2D5A3D] dark:text-emerald-200 border-[#8EA78D]/40 font-semibold'
                  : 'bg-white dark:bg-[#172A1E] text-slate-600 dark:text-slate-300 border-[#E2EBE1] dark:border-emerald-900/50 hover:border-[#8EA78D]'
              }`}
            >
              {item.isPacked ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-300" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-500" />
              )}
              <span className="truncate max-w-[140px]">{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="pt-2 flex items-center gap-3">
        {!hasAnySavedRef && onOpenBookingModal ? (
          <button
            type="button"
            onClick={onOpenBookingModal}
            className="flex-1 py-4 px-6 rounded-full bg-[#2D5A3D] hover:bg-[#234730] text-white font-display font-bold text-sm sm:text-base shadow-[0_8px_30px_rgba(45,90,61,0.25)] flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-95"
          >
            <ExternalLink className="w-4 h-4 text-emerald-200" />
            <span>{t('Book Flights, Trains & Stays')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              if (onOpenBookingModal) {
                onOpenBookingModal();
              } else if (onExportTrip) {
                onExportTrip();
              }
            }}
            className="flex-1 py-4 px-6 rounded-full bg-[#2D5A3D] hover:bg-[#234730] text-white font-display font-bold text-sm sm:text-base shadow-[0_8px_30px_rgba(45,90,61,0.25)] flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>{t('Manage Saved PNR & Official Links')}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenShare}
          className="w-13 h-13 rounded-full bg-white dark:bg-[#132219] border border-[#E2EBE1] dark:border-emerald-900/50 text-[#2D5A3D] dark:text-emerald-300 shadow-[0_4px_16px_rgba(45,90,61,0.1)] flex items-center justify-center hover:bg-[#F8FAF7] transition-all cursor-pointer active:scale-95 shrink-0"
          title="Share Pass"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
