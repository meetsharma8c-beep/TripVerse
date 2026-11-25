import React, { useState, useEffect, useMemo } from 'react';
import { Trip, BudgetBreakdown, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, formatCurrency, syncLiveExchangeRates } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { evaluateLiveMarketPrices } from '../../services/liveMarketPricingService';
import { fetchLiveMarketQuotes, LiveMarketQuoteResult } from '../../services/liveMarketQuoteService';
import {
  computeTripBudgetFloors,
  FormalBudgetVerification,
  verifyTripBudgetLocally,
  verifyTripBudgetWithApex
} from '../../services/budgetFormalVerifier';
import { TrendingDown, Sparkles, Check, Car, Bed, Utensils, Ticket, Shield, Plane, Zap, ExternalLink, AlertTriangle, ShieldCheck, TrainFront, Wallet } from 'lucide-react';

interface BudgetOptimizerProps {
  trip: Trip;
  onApplySavings: (savingsAmount: number, category: keyof BudgetBreakdown, reason: string) => void;
  onSwitchTransportMode?: (newMode: 'train' | 'bus', newTransportCost: number, savings: number) => void;
}

export const BudgetOptimizer: React.FC<BudgetOptimizerProps> = ({
  trip,
  onApplySavings,
  onSwitchTransportMode
}) => {
  const { t } = useLanguage();
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());
  const [liveQuotes, setLiveQuotes] = useState<LiveMarketQuoteResult | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchLiveMarketQuotes({
      origin: trip.origin || '',
      destination: trip.destination || '',
      startDate: trip.startDate,
      durationDays: trip.durationDays || 3,
      travelersCount: trip.travelersCount || 2,
      transportMode: trip.transportMode,
      originCoords: trip.routeDetails?.originCoordinates,
      destCoords: trip.destinationDetails?.coordinates,
    }).then((res) => {
      if (isMounted) setLiveQuotes(res);
    });
    return () => {
      isMounted = false;
    };
  }, [
    trip.origin,
    trip.destination,
    trip.startDate,
    trip.durationDays,
    trip.travelersCount,
    trip.transportMode,
    trip.routeDetails?.originCoordinates,
    trip.destinationDetails?.coordinates,
  ]);

  useEffect(() => {
    const handleCurrencyEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CurrencyCode>;
      if (customEvent.detail) {
        setCurrency(customEvent.detail);
      }
    };
    window.addEventListener('tripverse_currency_change', handleCurrencyEvent);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrencyEvent);
  }, []);

  useEffect(() => {
    syncLiveExchangeRates().catch(() => {});
  }, []);

  const liveMarketReport = useMemo(() => {
    return evaluateLiveMarketPrices({
      origin: trip.origin || 'Mumbai',
      destination: trip.destination,
      durationDays: trip.durationDays || 5,
      travelersCount: trip.travelersCount || 2,
      startDate: trip.startDate,
      accommodationType: trip.accommodationType,
      transportMode: trip.transportMode
    });
  }, [trip.origin, trip.destination, trip.durationDays, trip.travelersCount, trip.startDate, trip.accommodationType, trip.transportMode]);

  const travelers = Math.max(1, trip.travelersCount || 1);
  const duration = Math.max(1, trip.durationDays || 3);
  const nights = Math.max(1, duration - 1);
  const rooms = Math.ceil(travelers / 2);
  const mode = trip.transportMode || 'car';
  const isFlightMode = mode === 'flight';
  const isTrainMode = mode === 'train';
  const isRoadMode = mode === 'car' || mode === 'bike';

  // Benchmark market figures (6-vertical seasonal model)
  const marketStayCost = trip.selectedHotel?.nightlyRate
    ? trip.selectedHotel.nightlyRate * nights * rooms
    : (liveMarketReport?.hotelTotalGroupINR || 9500);

  const marketTransportCost = isFlightMode
    ? (liveMarketReport.smartHubArbitrage
        ? liveMarketReport.smartHubArbitrage.hubRoundTripPerPerson * travelers + liveMarketReport.smartHubArbitrage.groundTransferToHubCost
        : liveMarketReport.flightTotalGroupINR)
    : isTrainMode
    ? liveMarketReport.trainTotalGroupINR
    : isRoadMode
    ? liveMarketReport.roadTripFuelAndTollsINR
    : (liveMarketReport.localTransitTotalGroupINR || 6500);

  const marketFoodCost = liveMarketReport.diningTotalGroupINR || 4200;
  const marketActivitiesCost = liveMarketReport.attractionsTotalGroupINR || 3200;
  const marketBufferCost = Math.round((marketTransportCost + marketStayCost + marketFoodCost + marketActivitiesCost) * 0.05);

  // Anchor displayed expenses directly to trip.budgetBreakdown so 1-Click Apply Savings
  // and hotel/mode edits genuinely update the KPI cards, progress bars, and saved trip state.
  const hasBreakdown = Boolean(
    trip.budgetBreakdown &&
    (trip.budgetBreakdown.transportation > 0 ||
      trip.budgetBreakdown.accommodation > 0 ||
      trip.budgetBreakdown.food > 0)
  );

  const liveStayCost = hasBreakdown ? Math.max(0, trip.budgetBreakdown.accommodation) : marketStayCost;
  const liveTransportCost = hasBreakdown ? Math.max(0, trip.budgetBreakdown.transportation) : marketTransportCost;
  const liveFoodCost = hasBreakdown ? Math.max(0, trip.budgetBreakdown.food) : marketFoodCost;
  const liveActivitiesCost = hasBreakdown ? Math.max(0, trip.budgetBreakdown.activities) : marketActivitiesCost;
  const liveBufferCost = hasBreakdown ? Math.max(0, trip.budgetBreakdown.miscellaneous) : marketBufferCost;

  const liveTotalExpenses = liveTransportCost + liveStayCost + liveFoodCost + liveActivitiesCost + liveBufferCost;

  const isOverBudget = liveTotalExpenses > trip.totalBudget;
  const buffer = trip.totalBudget - liveTotalExpenses;

  const activeBreakdownForProof: BudgetBreakdown = useMemo(() => ({
    transportation: liveTransportCost,
    accommodation: liveStayCost,
    food: liveFoodCost,
    activities: liveActivitiesCost,
    miscellaneous: liveBufferCost
  }), [liveTransportCost, liveStayCost, liveFoodCost, liveActivitiesCost, liveBufferCost]);

  const localProof = useMemo(
    () => verifyTripBudgetLocally(trip.totalBudget, activeBreakdownForProof, computeTripBudgetFloors(trip, liveQuotes)),
    [trip, activeBreakdownForProof, liveQuotes]
  );
  const [formalProof, setFormalProof] = useState<FormalBudgetVerification>(localProof);

  useEffect(() => {
    setFormalProof(localProof);
    let active = true;
    verifyTripBudgetWithApex({ ...trip, budgetBreakdown: activeBreakdownForProof }, liveQuotes).then((verified) => {
      if (active) setFormalProof(verified);
    });
    return () => { active = false; };
  }, [localProof, trip, activeBreakdownForProof, liveQuotes]);

  const handleApplyProvenRebalance = () => {
    if (!formalProof.isSatisfiable || formalProof.status !== 'REBALANCE_AVAILABLE') return;
    const keys: Array<keyof BudgetBreakdown> = ['transportation', 'accommodation', 'food', 'activities', 'miscellaneous'];
    keys.forEach((key) => {
      const currentVal = activeBreakdownForProof[key];
      const targetVal = formalProof.witness[key];
      const reduction = Math.max(0, Math.round(currentVal - targetVal));
      if (reduction > 0) {
        onApplySavings(reduction, key, 'CONCODE APEX Formal Budget Rebalance');
      }
    });
  };

  // Persist applied optimization tips per trip so re-opening doesn't double-apply
  const appliedStorageKey = `tripverse_budget_tips_${trip.id}`;
  const [appliedTips, setAppliedTips] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(appliedStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(appliedStorageKey);
      setAppliedTips(raw ? JSON.parse(raw) : {});
    } catch {
      setAppliedTips({});
    }
  }, [appliedStorageKey]);

  // Compute genuine, trip-derived savings levers from real hotel options, transport mode, and actual category spend
  const suggestions = useMemo(() => {
    const items: Array<{
      id: string;
      category: keyof BudgetBreakdown;
      savings: number;
      title: string;
      desc: string;
    }> = [];

    if (trip.transitPassRoi && trip.transitPassRoi.netSavings > 0) {
      items.push({
        id: 'tip-transit-pass',
        category: 'transportation',
        savings: Math.min(trip.transitPassRoi.netSavings, Math.max(100, liveTransportCost - 400)),
        title: `${trip.transitPassRoi.passName} Arbitrage`,
        desc: `Save ~${formatCurrency(trip.transitPassRoi.netSavings, currency)} vs individual transit taps. Includes ${trip.transitPassRoi.coverageAreas.join(', ')} (${trip.transitPassRoi.validityDuration}). Buy at ${trip.transitPassRoi.purchaseLocation}.`
      });
    }

    if (trip.taxFreeGuidance && trip.taxFreeGuidance.refundPercentage > 0) {
      items.push({
        id: 'tip-tax-free',
        category: 'miscellaneous',
        savings: Math.min(Math.round(trip.totalBudget * 0.04), Math.max(100, liveBufferCost)),
        title: `${trip.taxFreeGuidance.refundPercentage}% Instant Tax-Free Retail Refund`,
        desc: `Claim ${trip.taxFreeGuidance.refundPercentage}% instant sales tax exemption at checkout on purchases over ${trip.taxFreeGuidance.currency} ${trip.taxFreeGuidance.minimumThresholdAmount.toLocaleString()} by presenting your physical passport.`
      });
    }

    // 1. Accommodation lever: compare real cheaper hotel option if present, else 12% stay optimization
    if (liveStayCost > 800) {
      const selectedRate = trip.selectedHotel?.nightlyRate || 0;
      const cheaperHotel = (trip.hotelOptions || [])
        .filter(h => h.id !== trip.selectedHotel?.id && h.nightlyRate > 0 && (selectedRate === 0 || h.nightlyRate < selectedRate))
        .sort((a, b) => a.nightlyRate - b.nightlyRate)[0];

      if (cheaperHotel && selectedRate > cheaperHotel.nightlyRate) {
        const realHotelSavings = Math.min(
          Math.round((selectedRate - cheaperHotel.nightlyRate) * nights * rooms),
          Math.max(300, liveStayCost - 400)
        );
        if (realHotelSavings >= 200) {
          items.push({
            id: 'tip-hotel',
            category: 'accommodation',
            savings: realHotelSavings,
            title: `Switch Stay to ${cheaperHotel.name}`,
            desc: `Save ${formatCurrency(selectedRate - cheaperHotel.nightlyRate, currency)}/night across ${nights} night${nights > 1 ? 's' : ''} (${rooms} room${rooms > 1 ? 's' : ''}) vs ${trip.selectedHotel?.name || 'current stay'}. Confirm live room rates before booking.`
          });
        }
      } else {
        const staySavings = Math.min(Math.max(300, Math.round(liveStayCost * 0.12)), Math.max(200, liveStayCost - 400));
        items.push({
          id: 'tip-hotel',
          category: 'accommodation',
          savings: staySavings,
          title: 'Optimize Stay with Direct Property Booking',
          desc: `Booking directly or choosing a well-rated guesthouse ~12% below your current ${formatCurrency(liveStayCost, currency)} stay allocation reduces lodging spend without cutting nights.`
        });
      }
    }

    // 2. Mode-aware Transport lever (never recommends "driving budget" on Train or Flight trips!)
    if (liveTransportCost > 600) {
      if (isFlightMode && liveMarketReport.smartHubArbitrage && liveMarketReport.smartHubArbitrage.totalGroupSavings > 0) {
        const hubSave = Math.min(liveMarketReport.smartHubArbitrage.totalGroupSavings, Math.max(300, liveTransportCost - 400));
        items.push({
          id: 'tip-transport',
          category: 'transportation',
          savings: hubSave,
          title: `Use ${liveMarketReport.smartHubArbitrage.hubCode} Smart Airport Hub`,
          desc: liveMarketReport.smartHubArbitrage.explanation
        });
      } else if (isTrainMode) {
        const railSave = Math.min(Math.max(200, Math.round(liveTransportCost * 0.12)), Math.max(150, liveTransportCost - 400));
        items.push({
          id: 'tip-transport',
          category: 'transportation',
          savings: railSave,
          title: 'Book Advance IRCTC / Rail Coach Tier (Avoid Tatkal)',
          desc: `Reserving 3AC / Chair Car seats early instead of last-minute dynamic or Tatkal fares typically saves ~12% on your ${formatCurrency(liveTransportCost, currency)} rail budget.`
        });
      } else if (isRoadMode) {
        const roadSave = Math.min(Math.max(200, Math.round(liveTransportCost * 0.12)), Math.max(150, liveTransportCost - 400));
        items.push({
          id: 'tip-transport',
          category: 'transportation',
          savings: roadSave,
          title: 'Optimize Highway Fuel, FASTag & Return Route',
          desc: `Steady highway cruising, pre-loaded FASTag tolls, and efficient route clustering can cut ~12% from your ${formatCurrency(liveTransportCost, currency)} fuel & toll estimate.`
        });
      } else if (isFlightMode) {
        const airSave = Math.min(Math.max(400, Math.round(liveTransportCost * 0.10)), Math.max(200, liveTransportCost - 400));
        items.push({
          id: 'tip-transport',
          category: 'transportation',
          savings: airSave,
          title: 'Target Mid-Week / Red-Eye Airfare Windows',
          desc: `Flexible departure windows and carry-on-only fares typically trim ~10% from your ${formatCurrency(liveTransportCost, currency)} flight allocation.`
        });
      } else {
        const transitSave = Math.min(Math.max(150, Math.round(liveTransportCost * 0.12)), Math.max(150, liveTransportCost - 400));
        items.push({
          id: 'tip-transport',
          category: 'transportation',
          savings: transitSave,
          title: 'Use Direct Express & Local Transit Passes',
          desc: `Combining point-to-point express coaches with day passes trims ~12% off your ${formatCurrency(liveTransportCost, currency)} transit budget.`
        });
      }
    }

    // 3. Dining lever derived from actual trip dining spend
    if (liveFoodCost > 600) {
      const diningSave = Math.min(Math.max(150, Math.round(liveFoodCost * 0.15)), Math.max(150, liveFoodCost - 400));
      items.push({
        id: 'tip-dining',
        category: 'food',
        savings: diningSave,
        title: 'Swap 1 Hotel Meal/Day for Local Eateries',
        desc: `Dining at authentic neighborhood eateries or regional thali spots instead of hotel restaurants typically saves ~15% on your ${formatCurrency(liveFoodCost, currency)} food budget.`
      });
    }

    return items;
  }, [
    trip.transitPassRoi,
    trip.taxFreeGuidance,
    trip.totalBudget,
    trip.selectedHotel,
    trip.hotelOptions,
    liveStayCost,
    liveTransportCost,
    liveFoodCost,
    liveBufferCost,
    nights,
    rooms,
    currency,
    isFlightMode,
    isTrainMode,
    isRoadMode,
    liveMarketReport.smartHubArbitrage
  ]);

  const handleApplyTip = (tip: typeof suggestions[0]) => {
    if (appliedTips[tip.id]) return;
    const nextApplied = { ...appliedTips, [tip.id]: true };
    setAppliedTips(nextApplied);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(appliedStorageKey, JSON.stringify(nextApplied));
      } catch {}
    }
    onApplySavings(tip.savings, tip.category, tip.title);
  };

  const categories = [
    { key: 'transportation' as keyof BudgetBreakdown, label: t('Transportation'), amount: liveTransportCost, icon: Car, color: '#0284C7' },
    { key: 'accommodation' as keyof BudgetBreakdown, label: t('Stay & Hotels'), amount: liveStayCost, icon: Bed, color: '#8B5CF6' },
    { key: 'food' as keyof BudgetBreakdown, label: t('Food & Dining'), amount: liveFoodCost, icon: Utensils, color: '#2D5A3D' },
    { key: 'activities' as keyof BudgetBreakdown, label: t('Attractions & Sightseeing'), amount: liveActivitiesCost, icon: Ticket, color: '#F59E0B' },
    { key: 'miscellaneous' as keyof BudgetBreakdown, label: t('Buffer & Emergency'), amount: liveBufferCost, icon: Shield, color: '#64748B' },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2D5A3D] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('AI Cost Intelligence')}</span>
          </div>
          <h2 className="text-xl font-bold text-[#0B2545]">{t('Budget Optimizer')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('Real-time constraint reasoning that balances route costs, stays, and dining in')} {currency}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            title={formalProof.remediationGuidance}
            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full border ${
              formalProof.status === 'PROVEN_SAT'
                ? 'bg-teal-50 text-teal-800 border-teal-200/80'
                : formalProof.status === 'REBALANCE_AVAILABLE'
                  ? 'bg-amber-50 text-amber-800 border-amber-200/80'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {formalProof.status === 'PROVEN_SAT'
              ? (formalProof.solverEngine === 'concode_apex_z3_smt' ? 'Math-Verified · Z3 SMT' : 'Math-Verified Budget')
              : formalProof.status === 'REBALANCE_AVAILABLE'
                ? 'Rebalance Proven'
                : 'Budget Floor Conflict'}
          </span>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
            isOverBudget 
              ? 'bg-rose-50 text-rose-700 border-rose-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
          }`}>
            {isOverBudget ? t('Budget Exceeded') : t('Under Budget')}
          </span>
        </div>
      </div>

      {/* Formal Budget Proof / Rebalance Notice */}
      {formalProof.status !== 'PROVEN_SAT' && (
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${
          formalProof.status === 'REBALANCE_AVAILABLE'
            ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
            : 'bg-rose-50/70 border-rose-200 text-rose-950'
        }`}>
          <div className="flex items-start gap-2.5 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <div className="font-bold">
                {formalProof.solverEngine === 'concode_apex_z3_smt'
                  ? 'CONCODE v4.0 APEX Z3 SMT Proof'
                  : 'Exact Budget Constraint Solver'}
              </div>
              <p className="opacity-90 mt-0.5">{formalProof.remediationGuidance}</p>
            </div>
          </div>
          {formalProof.status === 'REBALANCE_AVAILABLE' && (
            <button
              type="button"
              onClick={handleApplyProvenRebalance}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2D5A3D] text-white hover:bg-[#1f422b] transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Apply Proven Rebalance
            </button>
          )}
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            {isFlightMode ? t('On-Ground Budget') : t('Target Trip Budget')}
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-display truncate">
            {formatCurrency(trip.totalBudget, currency)}
          </div>
          <span className="text-[11px] text-slate-500 truncate block">
            {formatCurrency(Math.round(trip.totalBudget / Math.max(1, trip.travelersCount)), currency)} {t('/person')} {isFlightMode ? '(excl. flights)' : `(${mode} trip)`}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">{t('Estimated Expenses')}</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-display truncate">
            {formatCurrency(liveTotalExpenses, currency)}
          </div>
          <span className="text-[11px] text-slate-500 truncate block">
            {trip.durationDays} {t('Days')} • {trip.travelersCount} {t('Travelers')}
          </span>
        </div>

        <div className={`p-4 rounded-2xl border min-w-0 ${
          isOverBudget 
            ? 'bg-rose-50 border-rose-200 text-rose-900' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <span className="text-xs font-bold uppercase tracking-wider block opacity-75">
            {isOverBudget ? t('Budget Deficit') : t('Remaining Savings')}
          </span>
          <div className={`text-2xl font-black mt-1 font-display truncate ${isOverBudget ? 'text-rose-600' : 'text-[#2D5A3D]'}`}>
            {isOverBudget ? `-${formatCurrency(Math.abs(buffer), currency)}` : `+${formatCurrency(buffer, currency)}`}
          </div>
          <span className="text-[11px] font-semibold opacity-80 truncate block">
            {isOverBudget ? t('Action required: Apply 1-click savings below') : t('Healthy buffer preserved')}
          </span>
        </div>

      </div>

      {/* Daily On-Ground Purchasing Power + 1-Click Mode Recovery */}
      {(() => {
        const onGroundPoolINR = Math.max(0, trip.totalBudget - liveTransportCost - liveStayCost);
        const dailyPerPersonGroundINR = Math.round(onGroundPoolINR / (duration * travelers));
        const railAltCost = liveMarketReport.trainTotalGroupINR || Math.round(liveTransportCost * 0.25);
        const railSavings = Math.max(0, liveTransportCost - railAltCost);
        const airfareSharePct = trip.totalBudget > 0 ? Math.round((liveTransportCost / trip.totalBudget) * 100) : 0;
        const showRailRecovery = isFlightMode && airfareSharePct >= 52 && railSavings >= 3000;

        return (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#2D5A3D]/10 text-[#2D5A3D] flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">
                    {t('Daily On-Ground Spend Power')}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {formatCurrency(onGroundPoolINR, currency)} {t('left for meals, sights & local rides after')} {liveQuotes?.isLiveMarket ? t('live transit & stay') : t('transit & stay')}
                  </p>
                </div>
              </div>
              <div className="sm:text-right shrink-0">
                <span className="text-lg sm:text-xl font-black text-[#0B2545] tabular-nums">
                  {formatCurrency(dailyPerPersonGroundINR, currency)}
                </span>
                <span className="text-xs font-semibold text-slate-500"> / {t('person')} / {t('day')}</span>
              </div>
            </div>

            {showRailRecovery && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-sky-50/80 border border-sky-200 text-sky-950">
                <div className="flex items-start gap-3 text-xs leading-relaxed">
                  <TrainFront className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm">
                      Airfare uses {airfareSharePct}% of your budget — Switch to Rail &amp; unlock {formatCurrency(railSavings, currency)}
                    </div>
                    <p className="text-sky-900/80 mt-0.5">
                      Switching from flight ({formatCurrency(liveTransportCost, currency)}) to train ({formatCurrency(railAltCost, currency)}) frees {formatCurrency(railSavings, currency)} for better hotels and dining.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onSwitchTransportMode) {
                      onSwitchTransportMode('train', railAltCost, railSavings);
                    } else {
                      onApplySavings(railSavings, 'transportation', 'Switched from Flight to Rail');
                    }
                  }}
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white transition-colors cursor-pointer"
                >
                  <TrainFront className="w-3.5 h-3.5" />
                  Switch to Train &amp; Save {formatCurrency(railSavings, currency)}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* 6-VERTICAL REAL-TIME MARKET PRICE INTELLIGENCE */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400">
                {liveQuotes?.isLiveMarket
                  ? 'Live Google Flights & Hotels Feed + 6-Vertical Breakdown'
                  : 'Estimated Cost Breakdown (6-Vertical Seasonal Model)'}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {isFlightMode
                ? `Seasonal route pricing for ${liveMarketReport.originCity} (${liveMarketReport.originAirportCode}) ↔ ${liveMarketReport.gatewayAirportName} (${liveMarketReport.gatewayAirportCode})`
                : isTrainMode
                ? `Seasonal rail & ground pricing for ${liveMarketReport.originCity} ↔ ${trip.destination.split(',')[0]} (Train Journey)`
                : isRoadMode
                ? `Seasonal road & ground pricing for ${liveMarketReport.originCity} ↔ ${trip.destination.split(',')[0]} (${mode === 'bike' ? 'Motorbike' : 'Self-Drive'} Journey)`
                : `Seasonal transit & ground pricing for ${liveMarketReport.originCity} ↔ ${trip.destination.split(',')[0]}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {liveMarketReport.seasonBadge}
            </span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
              {liveMarketReport.lastSyncedLabel}
            </span>
          </div>
        </div>

        {/* Real-Time Amadeus Live Flight & Hotel Quotes Callout (Rendered Only When Live API Returns Real Quotes) */}
        {liveQuotes?.isLiveMarket && (
          <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-400/50 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                {liveQuotes.provider === 'google_live_serpapi'
                  ? 'Live Google Flights & Hotels Market Inventory'
                  : `Live Market Inventory (${liveQuotes.environment === 'production' ? 'Production GDS' : 'Live Feed'})`}
              </span>
              <span className="text-[10px] font-mono text-emerald-200/80">
                Synced {new Date(liveQuotes.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {liveQuotes.flights?.bestOffer && (
                <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Lowest Live Round-Trip Fare</span>
                  <div className="text-base font-black text-emerald-300 mt-0.5">
                    {formatCurrency(liveQuotes.flights.bestOffer.totalGroupAmount, currency)}
                  </div>
                  <span className="text-[11px] text-slate-300">
                    {liveQuotes.flights.bestOffer.carrierName} • {liveQuotes.flights.bestOffer.stops === 0 ? 'Nonstop' : `${liveQuotes.flights.bestOffer.stops} stop`} {liveQuotes.flights.bestOffer.duration ? `• ${liveQuotes.flights.bestOffer.duration}` : ''}
                  </span>
                </div>
              )}
              {liveQuotes.hotels[0] && (
                <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Lowest Live Available Hotel</span>
                  <div className="text-base font-black text-emerald-300 mt-0.5">
                    {formatCurrency(liveQuotes.hotels[0].nightlyRatePerRoom, currency)}/night
                  </div>
                  <span className="text-[11px] text-slate-300 truncate block">
                    {liveQuotes.hotels[0].name} ({liveQuotes.hotels[0].roomCategory})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Smart Nearby Hub Arbitrage Callout (only relevant for flight trips) */}
        {isFlightMode && liveMarketReport.smartHubArbitrage && (
          <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0 fill-emerald-400" />
                <span className="text-xs font-black uppercase tracking-wide text-emerald-300">
                  Smart Airport Hub Swap: Save {formatCurrency(liveMarketReport.smartHubArbitrage.totalGroupSavings, currency)} Total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={liveMarketReport.smartHubArbitrage.hubGoogleFlightsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors flex items-center gap-1 shadow-sm"
                >
                  <span>{liveMarketReport.smartHubArbitrage.hubCode} Google Flights</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={liveMarketReport.smartHubArbitrage.originGoogleFlightsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center gap-1"
                >
                  <span>{liveMarketReport.smartHubArbitrage.originCode} Baseline</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              {liveMarketReport.smartHubArbitrage.explanation}
            </p>
          </div>
        )}

        {/* 6-Vertical Itemized List */}
        <div className="divide-y divide-slate-800 text-xs">
          {liveMarketReport.lineItems.map((item) => {
            const badgeClasses =
              item.statusTone === 'surge'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : item.statusTone === 'savings'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : item.statusTone === 'warning'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : 'bg-sky-500/20 text-sky-300 border-sky-500/30';

            return (
              <div key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-100">{item.itemTitle}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeClasses}`}>
                      {item.statusLabel}
                    </span>
                    {!item.isIncludedInGroundBudget && (
                      <span className="text-[10px] font-semibold text-amber-300/90">
                        • Booked separately from ground budget
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{item.subtitle}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`font-black text-sm block ${item.id === 'smart_hub' ? 'text-emerald-400' : 'text-white'}`}>
                    {formatCurrency(item.totalGroupAmountINR, currency)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    ~{formatCurrency(item.amountPerPersonINR, currency)}/pax
                  </span>
                  {item.bookingUrl && (
                    <a
                      href={item.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-emerald-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                    >
                      <span>{item.bookingProvider || 'Check Live'}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totals Comparison Footer */}
        <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-800/90 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">Live On-Ground Market Cost</span>
              <span className="text-[10px] text-emerald-400 font-bold">Stays + Local Cabs + Permits + Meals</span>
            </div>
            <span className="text-base font-black text-white">
              {formatCurrency(liveMarketReport.recommendedGroundBudgetINR, currency)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/90 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">
                {isFlightMode
                  ? `All-In Total (with ${liveMarketReport.smartHubArbitrage ? `${liveMarketReport.smartHubArbitrage.hubCode} Hub Flights` : `${liveMarketReport.originAirportCode} Flights`})`
                  : isTrainMode
                  ? 'All-In Total (Train + Ground)'
                  : isRoadMode
                  ? 'All-In Total (Fuel/Tolls + Ground)'
                  : 'All-In Total (Transit + Ground)'}
              </span>
              <span className="text-[10px] text-sky-400 font-bold">
                {isFlightMode
                  ? (liveMarketReport.smartHubArbitrage
                      ? `Saves ${formatCurrency(liveMarketReport.smartHubArbitrage.totalGroupSavings, currency)} vs ${liveMarketReport.originAirportCode}`
                      : 'Flights + Full Ground Route')
                  : isTrainMode
                  ? 'Rail Tickets + Stays, Meals & Local Transfers'
                  : isRoadMode
                  ? 'Fuel, FASTag Tolls + Full Ground Route'
                  : 'Intercity Transit + Full Ground Route'}
              </span>
            </div>
            <span className="text-base font-black text-emerald-400">
              {formatCurrency(
                isFlightMode
                  ? liveMarketReport.totalWithSmartHubFlightsINR
                  : liveMarketReport.recommendedGroundBudgetINR + marketTransportCost,
                currency
              )}
            </span>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          {t('Itemized Category Breakdown')}
        </h3>

        <div className="space-y-3">
          {categories.map((c) => {
            const pct = Math.round((c.amount / Math.max(1, liveTotalExpenses)) * 100);
            const CategoryIcon = c.icon;

            return (
              <div key={c.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-2">
                    <CategoryIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.label}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-normal">({pct}%)</span>
                    <span className="text-slate-900 font-extrabold">
                      {formatCurrency(c.amount, currency)}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${pct}%`,
                      backgroundColor: c.color 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Recommendations for Cost Reduction */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-[#2D5A3D] shrink-0" />
            <h3 className="text-sm font-bold text-[#0B2545]">
              {t('AI 1-Click Optimization Suggestions')}
            </h3>
          </div>
          <span className="text-xs font-bold text-[#2D5A3D] shrink-0">
            {t('Total Potential Savings:')} {formatCurrency(suggestions.reduce((acc, s) => acc + s.savings, 0), currency)}
          </span>
        </div>

        <div className="space-y-3">
          {suggestions.map((tip) => {
            const isApplied = appliedTips[tip.id] ?? false;

            return (
              <div
                key={tip.id}
                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#2D5A3D] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                      {t('Save')} {formatCurrency(tip.savings, currency)}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 min-w-0">{t(tip.title)}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed text-pretty">{t(tip.desc)}</p>
                </div>

                <button
                  onClick={() => handleApplyTip(tip)}
                  disabled={isApplied}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isApplied
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-trip-gradient hover:bg-trip-gradient-hover text-white active:scale-95 shadow-xs cursor-pointer'
                  }`}
                >
                  {isApplied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{t('Applied')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('Apply Savings')}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
