import { useModalBehavior } from '../../hooks/useModalBehavior';
import React, { useState, useEffect, useMemo } from 'react';
import { Trip, CurrencyCode } from '../../types/trip';
import { DisruptionAlert, DisruptionType, ReplanOption } from '../../types/replanning';
import {
  generateDisruptionForTrip,
  getDefaultDisruptionReasonForTrip,
  getCancellationPolicy,
  getReplanOptions,
  buildCustomDateReplanOption,
  enrichReplanOptionsWithLiveWeather,
  applyReplanToTrip,
} from '../../services/replanningService';
import { formatCurrency, getActiveCurrency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import {
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Home,
  RotateCcw,
  Receipt,
  Bot,
  MapPin,
  Calendar,
  Wallet,
  ChevronRight,
  Plane,
  CloudRain,
  Train,
  Car,
  AlertOctagon,
  Briefcase,
  UserCheck,
  ExternalLink,
  Umbrella,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface TripReplanningModalProps {
  trip: Trip;
  isOpen: boolean;
  initialReason?: DisruptionType;
  initialScreen?: 1 | 2 | 3 | 4 | 5 | 'refund';
  onClose: () => void;
  onApplyReplannedTrip: (updatedTrip: Trip) => void;
  onOpenChatWithQuery?: (query: string) => void;
  onViewMap?: () => void;
}

type ReplanTabId = 'alternate_dates' | 'switch_transport' | 'indoor_weather_swap' | 'new_destination';

export const TripReplanningModal: React.FC<TripReplanningModalProps> = ({
  trip,
  isOpen,
  initialReason,
  initialScreen = 2,
  onClose,
  onApplyReplannedTrip,
  onOpenChatWithQuery,
  onViewMap,
}) => {
  const { t } = useLanguage();
  const [currency] = useState<CurrencyCode>(getActiveCurrency());
  const defaultReason = initialReason || getDefaultDisruptionReasonForTrip(trip);
  const [selectedReason, setSelectedReason] = useState<DisruptionType>(defaultReason);

  // Map legacy initialScreen=1 cleanly onto screen 2 (genuine action selector; no fake phone mockup)
  const normalizeScreen = (s?: 1 | 2 | 3 | 4 | 5 | 'refund'): 2 | 3 | 4 | 5 | 'refund' =>
    s === 1 ? 2 : s || 2;
  const [screen, setScreen] = useState<2 | 3 | 4 | 5 | 'refund'>(() => normalizeScreen(initialScreen));
  const [hasAppliedReplan, setHasAppliedReplan] = useState(false);

  // Active disruption scenario
  const [disruption, setDisruption] = useState<DisruptionAlert>(() =>
    generateDisruptionForTrip(trip, defaultReason)
  );

  // Replan options & live Open-Meteo weather cache
  const replanData = useMemo(() => getReplanOptions(trip, selectedReason), [trip, selectedReason]);
  const [replanTab, setReplanTab] = useState<ReplanTabId>('alternate_dates');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [selectedReplanOption, setSelectedReplanOption] = useState<ReplanOption | null>(
    () => replanData.alternateDates[0] || replanData.newDestinations[0] || null
  );
  const [liveWeatherByOptionId, setLiveWeatherByOptionId] = useState<Record<string, string>>({});
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  const customDateOption = useMemo(() => {
    if (!customStartDate || !/^\d{4}-\d{2}-\d{2}$/.test(customStartDate)) return null;
    return buildCustomDateReplanOption(trip, customStartDate);
  }, [trip, customStartDate]);

  useEffect(() => {
    if (isOpen) {
      const resolvedReason = initialReason || getDefaultDisruptionReasonForTrip(trip);
      setScreen(normalizeScreen(initialScreen));
      setSelectedReason(resolvedReason);
      setDisruption(generateDisruptionForTrip(trip, resolvedReason));
      setHasAppliedReplan(false);
      setCustomStartDate('');
      setLiveWeatherByOptionId({});
      const freshOptions = getReplanOptions(trip, resolvedReason);
      if (resolvedReason === 'weather_alert' && freshOptions.weatherSwapOption) {
        setReplanTab('indoor_weather_swap');
        setSelectedReplanOption(freshOptions.weatherSwapOption);
      } else if (
        (resolvedReason === 'train_cancellation' || resolvedReason === 'flight_cancellation') &&
        freshOptions.transportSwitches.length > 0
      ) {
        setReplanTab('switch_transport');
        setSelectedReplanOption(freshOptions.transportSwitches[0]);
      } else {
        setReplanTab('alternate_dates');
        setSelectedReplanOption(freshOptions.alternateDates[0] || freshOptions.newDestinations[0] || null);
      }
    }
  }, [isOpen, initialScreen, initialReason, trip]);

  // Fetch genuine live Open-Meteo weather when Screen 4 (Replan Options) is open
  useEffect(() => {
    if (!isOpen || screen !== 4) return;
    let isMounted = true;
    const targets: ReplanOption[] = [
      ...replanData.alternateDates,
      ...replanData.newDestinations,
      ...(customDateOption ? [customDateOption] : []),
    ];
    const missing = targets.filter((opt) => !liveWeatherByOptionId[opt.id]);
    if (missing.length === 0) return;

    setIsLoadingWeather(true);
    enrichReplanOptionsWithLiveWeather(missing)
      .then((results) => {
        if (isMounted) {
          setLiveWeatherByOptionId((prev) => ({ ...prev, ...results }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingWeather(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, screen, replanData, customDateOption, liveWeatherByOptionId]);

  const refundInfo = useMemo(() => getCancellationPolicy(trip, disruption), [trip, disruption]);

  useModalBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const getTabOptions = (tab: ReplanTabId, data = replanData): ReplanOption[] => {
    if (tab === 'alternate_dates') {
      return customDateOption ? [customDateOption, ...data.alternateDates] : data.alternateDates;
    }
    if (tab === 'switch_transport') return data.transportSwitches;
    if (tab === 'indoor_weather_swap') return data.weatherSwapOption ? [data.weatherSwapOption] : [];
    return data.newDestinations;
  };

  const activeTabOptions = getTabOptions(replanTab);

  const handleReasonChange = (reason: DisruptionType) => {
    setSelectedReason(reason);
    const newDisrupt = generateDisruptionForTrip(trip, reason);
    setDisruption(newDisrupt);
    const newOptions = getReplanOptions(trip, reason);
    if (reason === 'weather_alert' && newOptions.weatherSwapOption) {
      setReplanTab('indoor_weather_swap');
      setSelectedReplanOption(newOptions.weatherSwapOption);
    } else if (
      (reason === 'train_cancellation' || reason === 'flight_cancellation') &&
      newOptions.transportSwitches.length > 0
    ) {
      setReplanTab('switch_transport');
      setSelectedReplanOption(newOptions.transportSwitches[0]);
    } else {
      setReplanTab('alternate_dates');
      setSelectedReplanOption(newOptions.alternateDates[0] || newOptions.newDestinations[0] || null);
    }
  };

  const handleSelectTab = (tab: ReplanTabId) => {
    setReplanTab(tab);
    const opts = getTabOptions(tab);
    if (opts.length > 0) {
      setSelectedReplanOption(opts[0]);
    }
  };

  const handleCustomDateChange = (isoDate: string) => {
    setCustomStartDate(isoDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const opt = buildCustomDateReplanOption(trip, isoDate);
      setSelectedReplanOption(opt);
    }
  };

  const handleConfirmReplan = () => {
    if (!selectedReplanOption) return;
    const updated = applyReplanToTrip(trip, selectedReplanOption);
    onApplyReplannedTrip(updated);
    setHasAppliedReplan(true);
    setScreen(5);

    import('canvas-confetti')
      .then(({ default: fireConfetti }) => {
        fireConfetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.5 },
          colors: ['#2D5A3D', '#10B981', '#3B82F6', '#F59E0B'],
        });
      })
      .catch(() => {});
  };

  const renderTransportIcon = (mode?: string) => {
    if (mode === 'train') return <Train className="w-4 h-4 text-[#2D5A3D]" />;
    if (mode === 'flight') return <Plane className="w-4 h-4 text-[#2D5A3D]" />;
    return <Car className="w-4 h-4 text-[#2D5A3D]" />;
  };

  const minDateIso = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Top App Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EAF0E9] dark:bg-emerald-950 flex items-center justify-center text-[#2D5A3D] dark:text-emerald-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0B2545] dark:text-white leading-tight">
                {t('Smart Trip Replanning')}
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Live Open-Meteo weather • Real date shifts, mode switches & indoor swaps')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean 3-Step Progress Bar (Step 3 unlocks only after applying a real replan) */}
        <div className="bg-slate-100/90 dark:bg-slate-900 px-3 sm:px-5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-semibold text-slate-500 shrink-0">
          <button
            type="button"
            onClick={() => setScreen(2)}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              screen === 2 || screen === 3 || screen === 'refund'
                ? 'bg-white dark:bg-slate-800 text-[#0B2545] dark:text-white font-bold shadow-xs ring-1 ring-slate-300 dark:ring-slate-700'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-[9px] font-black">
              1
            </span>
            <span>{t('What Happened')}</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">›</span>
          <button
            type="button"
            onClick={() => setScreen(4)}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              screen === 4
                ? 'bg-white dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-300 font-bold shadow-xs ring-1 ring-[#8EA78D]/50'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#EAF0E9] dark:bg-emerald-950 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center text-[9px] font-black">
              2
            </span>
            <span>{t('Smart Replan Options')}</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">›</span>
          <button
            type="button"
            disabled={!hasAppliedReplan}
            onClick={() => {
              if (hasAppliedReplan) setScreen(5);
            }}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
              screen === 5
                ? 'bg-white dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-300 font-bold shadow-xs ring-1 ring-[#8EA78D]/50 cursor-pointer'
                : hasAppliedReplan
                  ? 'hover:text-slate-900 dark:hover:text-white cursor-pointer'
                  : 'opacity-45 cursor-not-allowed'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-[#EAF0E9] dark:bg-emerald-950 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center text-[9px] font-black">
              3
            </span>
            <span>{t('Itinerary Updated')}</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {/* SCREEN 2: CHOOSE REASON / ACTION */}
          {screen === 2 && (
            <div className="space-y-6">
              {/* Scenario Summary Banner */}
              <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                      Active Trip: {trip.origin} → {trip.destination.split(',')[0]}
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-semibold capitalize">
                      {trip.transportMode || 'road'} transit
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-200/80 mt-1 leading-relaxed">
                    {disruption.details}
                  </p>
                </div>
              </div>

              {/* Reason Selector Pills */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  What changed in your trip?
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'train_cancellation', label: 'Train Cancelled / Delayed', icon: Train },
                    { id: 'flight_cancellation', label: 'Flight Cancelled', icon: Plane },
                    { id: 'weather_alert', label: 'Severe Weather / Rain', icon: CloudRain },
                    { id: 'official_change', label: 'Dates / Work Changed', icon: Briefcase },
                    { id: 'personal_emergency', label: 'Personal Change', icon: UserCheck },
                    { id: 'natural_disaster', label: 'Local Advisory', icon: AlertOctagon },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedReason === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleReasonChange(item.id as DisruptionType)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Cards */}
              <div>
                <h3 className="text-base font-bold text-[#0B2545] dark:text-white mb-3">
                  {t('How would you like to recover your trip?')}
                </h3>

                <div className="grid grid-cols-1 gap-3.5">
                  {/* Primary Option: Smart Replan Engine */}
                  <button
                    type="button"
                    onClick={() => setScreen(4)}
                    className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-[#2D5A3D]/50 bg-[#EAF0E9]/60 dark:bg-emerald-950/35 hover:bg-[#EAF0E9] dark:hover:bg-emerald-950/55 hover:border-[#2D5A3D] transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-[#2D5A3D] text-white flex items-center justify-center shadow-md shadow-[#2D5A3D]/25 group-hover:scale-105 transition-transform shrink-0">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            Smart Replan My Itinerary
                          </span>
                          <span className="text-[10px] uppercase font-extrabold bg-white dark:bg-emerald-900 text-[#2D5A3D] dark:text-emerald-200 px-2 py-0.5 rounded-full border border-[#8EA78D]/40">
                            Live Weather &amp; Pricing
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                          Shift exact dates, switch transport mode ({trip.transportMode === 'train' ? 'Rail → Flight/Car' : 'alternate transit'}), activate Indoor Rain Shield, or pick a nearby destination.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#2D5A3D] dark:text-emerald-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>

                  {/* Option 2: Emergency Stay Search */}
                  <button
                    type="button"
                    onClick={() => setScreen(3)}
                    className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:border-[#2D5A3D]/50 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0">
                        <Home className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-sm sm:text-base text-[#0B2545] dark:text-white">
                          Find Emergency Stay Nearby
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Search live rooms near {trip.destination.split(',')[0]} on Booking.com or Google Maps.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>

                  {/* Option 3: Mode-Aware Refund / TDR / Cancellation Steps */}
                  <button
                    type="button"
                    onClick={() => setScreen('refund')}
                    className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:border-blue-400 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-sm sm:text-base text-[#0B2545] dark:text-white">
                          {trip.transportMode === 'train'
                            ? 'Rail TDR & Refund Checklist'
                            : trip.transportMode === 'flight'
                              ? 'Airline Waiver & Refund Checklist'
                              : 'Hotel & Cancellation Checklist'}
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Step-by-step refund and date-change guidance tailored for your {trip.transportMode || 'planned'} trip.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>
                </div>
              </div>

              {/* Footer: Ask ConCode AI */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Want custom advice?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenChatWithQuery) {
                      onOpenChatWithQuery(
                        `My ${trip.transportMode || 'planned'} trip to ${trip.destination} is affected due to ${selectedReason.replace('_', ' ')}. What are my best options?`
                      );
                    }
                  }}
                  className="text-xs font-bold text-[#2D5A3D] dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>Ask ConCode AI Co-Pilot</span>
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: EMERGENCY STAY ASSISTANCE */}
          {screen === 3 && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => setScreen(2)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 mb-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Options</span>
                </button>
                <h3 className="text-xl font-bold text-[#0B2545] dark:text-white">Emergency Stay</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Direct external searches for real-time tonight availability in {trip.destination.split(',')[0]}.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
                  {t('TripVerse does not hold private hotel inventory. Use the verified search links below to check live tonight availability, safety reviews, and free-cancellation terms directly with booking providers.')}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <a
                    href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(trip.destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[52px] items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white hover:border-[#2D5A3D] hover:bg-[#EAF0E9] dark:hover:bg-emerald-950/40"
                  >
                    Search stays on Booking.com
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hotels near ${trip.destination}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[52px] items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-bold text-slate-800 dark:text-white hover:border-[#2D5A3D] hover:bg-[#EAF0E9] dark:hover:bg-emerald-950/40"
                  >
                    Find stays on Google Maps
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 4: GENUINE SMART REPLAN OPTIONS */}
          {screen === 4 && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <button
                    type="button"
                    onClick={() => setScreen(2)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 mb-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <h3 className="text-xl font-bold text-[#0B2545] dark:text-white">Smart Replan Options</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real market pricing &amp; live Open-Meteo weather. Your expenses, photos, and reviews stay safe.
                  </p>
                </div>
                {isLoadingWeather && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800 shrink-0">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Live weather…
                  </span>
                )}
              </div>

              {/* 4 Genuine Replan Strategy Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectTab('alternate_dates')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    replanTab === 'alternate_dates'
                      ? 'bg-white dark:bg-slate-800 text-[#0B2545] dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Shift Dates</span>
                </button>
                {replanData.transportSwitches.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectTab('switch_transport')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      replanTab === 'switch_transport'
                        ? 'bg-white dark:bg-slate-800 text-[#0B2545] dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {renderTransportIcon(trip.transportMode === 'train' ? 'flight' : 'train')}
                    <span className="truncate">Switch Mode</span>
                  </button>
                )}
                {replanData.weatherSwapOption && (
                  <button
                    type="button"
                    onClick={() => handleSelectTab('indoor_weather_swap')}
                    className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      replanTab === 'indoor_weather_swap'
                        ? 'bg-white dark:bg-slate-800 text-[#0B2545] dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Umbrella className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Rain Shield</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSelectTab('new_destination')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    replanTab === 'new_destination'
                      ? 'bg-white dark:bg-slate-800 text-[#0B2545] dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">New City</span>
                </button>
              </div>

              {/* Custom Exact Start Date Picker on Shift Dates tab */}
              {replanTab === 'alternate_dates' && (
                <div className="p-3.5 rounded-2xl border border-[#DCE7DB] dark:border-emerald-900/50 bg-[#F8FAF7] dark:bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <label
                      htmlFor="replan-custom-date"
                      className="text-xs font-bold text-[#152A1C] dark:text-emerald-200 block"
                    >
                      Pick an exact new start date
                    </label>
                    <span className="text-[11px] text-[#57685D] dark:text-slate-400">
                      Shifts all {trip.durationDays} days cleanly without losing your stops
                    </span>
                  </div>
                  <input
                    id="replan-custom-date"
                    type="date"
                    min={minDateIso}
                    value={customStartDate}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-[#DCE7DB] dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-[#152A1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
                  />
                </div>
              )}

              {/* Original Baseline Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                    {renderTransportIcon(trip.transportMode)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800 dark:text-white truncate">
                        {trip.destination.split(',')[0]} (Current)
                      </span>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-bold capitalize">
                        {trip.transportMode || 'road'}
                      </span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                      {trip.durationDays} Days {trip.startDate ? `• Starts ${trip.startDate}` : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-700 dark:text-slate-200 block">
                    {formatCurrency(trip.estimatedTotal || trip.totalBudget, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400">Current estimate</span>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-3">
                {activeTabOptions.map((opt) => {
                  const isSelected = selectedReplanOption?.id === opt.id;
                  const weatherLabel = liveWeatherByOptionId[opt.id] || opt.weatherCondition;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedReplanOption(opt)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                        isSelected
                          ? 'border-[#2D5A3D] bg-[#EAF0E9]/50 dark:bg-emerald-950/30 ring-2 ring-[#2D5A3D]/25 shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={opt.image}
                          alt={opt.title}
                          loading="lazy"
                          decoding="async"
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-[#0B2545] dark:text-white">
                              {opt.title}
                            </h4>
                            {opt.isRecommended && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF0E9] dark:bg-emerald-950 text-[#2D5A3D] dark:text-emerald-300 border border-[#8EA78D]/30">
                                Recommended
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-[#2D5A3D] dark:text-emerald-400 block mt-0.5">
                            {opt.datesLabel} • {weatherLabel}
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                            {opt.recommendationReason}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                        <span className="text-sm sm:text-base font-extrabold text-[#0B2545] dark:text-white">
                          {formatCurrency(opt.estimatedCost, currency)}
                        </span>
                        <span
                          className={`text-[11px] font-bold ${
                            opt.costDelta > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-[#2D5A3D] dark:text-emerald-400'
                          }`}
                        >
                          {opt.costDelta === 0
                            ? 'Same budget'
                            : opt.costDelta > 0
                              ? `+${formatCurrency(opt.costDelta, currency)}`
                              : `${formatCurrency(Math.abs(opt.costDelta), currency)} lower`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Replan Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenChatWithQuery && selectedReplanOption) {
                      onOpenChatWithQuery(
                        `Help me compare my current ${trip.destination} plan vs "${selectedReplanOption.title}".`
                      );
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                  <span>Ask AI</span>
                </button>

                <button
                  type="button"
                  disabled={!selectedReplanOption}
                  onClick={handleConfirmReplan}
                  className="px-6 py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-[#2D5A3D]/25 active:scale-95 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  <span>Apply Smart Replan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 5: FINAL CONFIRMATION */}
          {screen === 5 && selectedReplanOption && (
            <div className="space-y-6 text-center py-4">
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#1E3E2B] via-[#2D5A3D] to-[#386B49] text-white flex items-center justify-center mx-auto shadow-xl shadow-[#2D5A3D]/25 ring-8 ring-[#EAF0E9] dark:ring-emerald-950/60 animate-in zoom-in">
                {selectedReplanOption.type === 'indoor_weather_swap' ? (
                  <Umbrella className="w-11 h-11 text-white" />
                ) : selectedReplanOption.newTransportMode === 'train' ||
                  (!selectedReplanOption.newTransportMode && trip.transportMode === 'train') ? (
                  <Train className="w-11 h-11 text-white" />
                ) : selectedReplanOption.newTransportMode === 'car' ? (
                  <Car className="w-11 h-11 text-white" />
                ) : (
                  <Plane className="w-11 h-11 text-white -rotate-12" />
                )}
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white text-[#2D5A3D] flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-5 h-5 fill-[#EAF0E9] text-[#2D5A3D]" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] dark:text-white tracking-tight">
                  Itinerary Replanned &amp; Synced
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                  Your TripVerse itinerary, dates, and budget have been updated and saved to your account. Remember to confirm any ticket/hotel changes with your external provider.
                </p>
              </div>

              <div className="bg-slate-50/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 max-w-md mx-auto text-left space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                    <span>Applied Change</span>
                  </span>
                  <span className="text-sm font-bold text-[#0B2545] dark:text-white text-right">
                    {selectedReplanOption.title}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                    <span>Schedule</span>
                  </span>
                  <span className="text-sm font-bold text-[#0B2545] dark:text-white">
                    {selectedReplanOption.datesLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                    <span>Updated Budget Estimate</span>
                  </span>
                  <span className="text-lg font-black text-[#2D5A3D] dark:text-emerald-400">
                    {formatCurrency(selectedReplanOption.estimatedCost, currency)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-[#2D5A3D]/25 active:scale-95 transition-all cursor-pointer"
                >
                  View Updated Itinerary
                </button>

                {onViewMap && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewMap();
                    }}
                    className="px-6 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    View on Map
                  </button>
                )}
              </div>
            </div>
          )}

          {/* VIEW: CANCELLATION & REFUND SUPPORT */}
          {screen === 'refund' && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => setScreen(2)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 mb-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Options</span>
                </button>
                <h3 className="text-xl font-bold text-[#0B2545] dark:text-white">
                  {trip.transportMode === 'train'
                    ? 'Rail TDR & Refund Steps'
                    : trip.transportMode === 'flight'
                      ? 'Airline Waiver & Refund Steps'
                      : 'Cancellation & Refund Steps'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  TripVerse cannot access external bookings — follow these steps directly with your carrier or hotel.
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
                No external ticket has been cancelled automatically. Refund amounts and change waivers are determined by your carrier’s fare rules.
              </div>

              <div>
                <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider block mb-2">
                  Recommended Steps
                </span>
                <div className="space-y-2">
                  {refundInfo.claimSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="w-5 h-5 rounded-full bg-[#EAF0E9] dark:bg-emerald-950 text-[#2D5A3D] dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px] border border-[#8EA78D]/30">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setScreen(4)}
                  className="px-5 py-2.5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md shadow-[#2D5A3D]/25 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Open Smart Replan Options →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
