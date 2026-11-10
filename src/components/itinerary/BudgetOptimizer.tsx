import React, { useState, useEffect, useMemo } from 'react';
import { Trip, BudgetBreakdown, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, formatCurrency, syncLiveExchangeRates } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { evaluateLiveMarketPrices } from '../../services/liveMarketPricingService';
import { TrendingDown, Sparkles, Check, Car, Bed, Utensils, Ticket, Shield, Plane, Zap, ExternalLink, AlertTriangle } from 'lucide-react';

interface BudgetOptimizerProps {
  trip: Trip;
  onApplySavings: (savingsAmount: number, category: keyof BudgetBreakdown, reason: string) => void;
}

export const BudgetOptimizer: React.FC<BudgetOptimizerProps> = ({
  trip,
  onApplySavings
}) => {
  const { t } = useLanguage();
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());

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

  const isOverBudget = trip.estimatedTotal > trip.totalBudget;
  const buffer = trip.totalBudget - trip.estimatedTotal;

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

  // AI Savings Suggestions catalog
  const [appliedTips, setAppliedTips] = useState<Record<string, boolean>>({});

  const suggestions = [
    ...(trip.transitPassRoi && trip.transitPassRoi.netSavings > 0 ? [{
      id: 'tip-transit-pass',
      category: 'transportation' as keyof BudgetBreakdown,
      savings: trip.transitPassRoi.netSavings,
      title: `${trip.transitPassRoi.passName} Arbitrage`,
      desc: `Save ~${formatCurrency(trip.transitPassRoi.netSavings, currency)} vs individual transit taps. Includes ${trip.transitPassRoi.coverageAreas.join(', ')} (${trip.transitPassRoi.validityDuration}). Buy at ${trip.transitPassRoi.purchaseLocation}.`
    }] : []),
    ...(trip.taxFreeGuidance && trip.taxFreeGuidance.refundPercentage > 0 ? [{
      id: 'tip-tax-free',
      category: 'miscellaneous' as keyof BudgetBreakdown,
      savings: Math.round(trip.totalBudget * 0.04),
      title: `${trip.taxFreeGuidance.refundPercentage}% Instant Tax-Free Retail Refund`,
      desc: `Claim ${trip.taxFreeGuidance.refundPercentage}% instant sales tax exemption at checkout on purchases over ${trip.taxFreeGuidance.currency} ${trip.taxFreeGuidance.minimumThresholdAmount.toLocaleString()} by presenting your physical passport.`
    }] : []),
    {
      id: 'tip-hotel',
      category: 'accommodation' as keyof BudgetBreakdown,
      savings: 700,
      title: 'Compare accommodation options',
      desc: `Compare properties and confirm availability, facilities, and prices directly. Any displayed savings are estimates, not quotes.`
    },
    {
      id: 'tip-transport',
      category: 'transportation' as keyof BudgetBreakdown,
      savings: 300,
      title: 'Review the estimated driving budget',
      desc: `Fuel, tolls, and driving costs vary by route and date. Check current route and toll information before travel.`
    },
    {
      id: 'tip-dining',
      category: 'food' as keyof BudgetBreakdown,
      savings: 250,
      title: 'Compare dining options',
      desc: 'Search current place listings and confirm menus and prices directly with venues before visiting.'
    }
  ];

  const handleApplyTip = (tip: typeof suggestions[0]) => {
    setAppliedTips(prev => ({ ...prev, [tip.id]: true }));
    onApplySavings(tip.savings, tip.category, tip.title);
  };

  const breakdown = trip.budgetBreakdown || {
    transportation: 0,
    accommodation: 0,
    food: 0,
    activities: 0,
    miscellaneous: 0
  };

  const categories = [
    { key: 'transportation' as keyof BudgetBreakdown, label: t('Transportation'), amount: Number(breakdown.transportation) || 0, icon: Car, color: '#0284C7' },
    { key: 'accommodation' as keyof BudgetBreakdown, label: t('Stay & Hotels'), amount: Number(breakdown.accommodation) || 0, icon: Bed, color: '#8B5CF6' },
    { key: 'food' as keyof BudgetBreakdown, label: t('Food & Dining'), amount: Number(breakdown.food) || 0, icon: Utensils, color: '#2D5A3D' },
    { key: 'activities' as keyof BudgetBreakdown, label: t('Attractions & Sightseeing'), amount: Number(breakdown.activities) || 0, icon: Ticket, color: '#F59E0B' },
    { key: 'miscellaneous' as keyof BudgetBreakdown, label: t('Buffer & Emergency'), amount: Number(breakdown.miscellaneous) || 0, icon: Shield, color: '#64748B' },
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

        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
            isOverBudget 
              ? 'bg-rose-50 text-rose-700 border-rose-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
          }`}>
            {isOverBudget ? t('Budget Exceeded') : t('Under Budget')}
          </span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">{t('On-Ground Budget')}</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-display truncate">
            {formatCurrency(trip.totalBudget, currency)}
          </div>
          <span className="text-[11px] text-slate-500 truncate block">
            {formatCurrency(Math.round(trip.totalBudget / Math.max(1, trip.travelersCount)), currency)} {t('/person')} (excl. flights)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">{t('Estimated Expenses')}</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-display truncate">
            {formatCurrency(trip.estimatedTotal, currency)}
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

      {/* 6-VERTICAL REAL-TIME MARKET PRICE INTELLIGENCE */}
      <div className="p-4 sm:p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-400">
                Live Market Price Intelligence (6-Vertical Real-Time Index)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Real-time route pricing for {liveMarketReport.originCity} ({liveMarketReport.originAirportCode}) ↔ {liveMarketReport.gatewayAirportName} ({liveMarketReport.gatewayAirportCode})
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

        {/* Smart Nearby Hub Arbitrage Callout */}
        {liveMarketReport.smartHubArbitrage && (
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
                All-In Total (with {liveMarketReport.smartHubArbitrage ? `${liveMarketReport.smartHubArbitrage.hubCode} Hub Flights` : `${liveMarketReport.originAirportCode} Flights`})
              </span>
              <span className="text-[10px] text-sky-400 font-bold">
                {liveMarketReport.smartHubArbitrage
                  ? `Saves ${formatCurrency(liveMarketReport.smartHubArbitrage.totalGroupSavings, currency)} vs ${liveMarketReport.originAirportCode}`
                  : 'Flights + Full Ground Route'}
              </span>
            </div>
            <span className="text-base font-black text-emerald-400">
              {formatCurrency(liveMarketReport.totalWithSmartHubFlightsINR, currency)}
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
            const pct = Math.round((c.amount / Math.max(1, trip.estimatedTotal)) * 100);
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
