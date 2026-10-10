import React, { useState, useEffect } from 'react';
import { Trip, BudgetBreakdown, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, formatCurrency } from '../../services/currencyService';
import { 
  Wallet, 
  TrendingDown, 
  Sparkles, 
  Check, 
  Car, 
  Bed, 
  Utensils, 
  Ticket, 
  Shield 
} from 'lucide-react';

interface BudgetOptimizerProps {
  trip: Trip;
  onApplySavings: (savingsAmount: number, category: keyof BudgetBreakdown, reason: string) => void;
}

export const BudgetOptimizer: React.FC<BudgetOptimizerProps> = ({
  trip,
  onApplySavings
}) => {
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

  // AI Savings Suggestions catalog
  const [appliedTips, setAppliedTips] = useState<Record<string, boolean>>({});

  const suggestions = [
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
    { key: 'transportation' as keyof BudgetBreakdown, label: 'Transportation', amount: Number(breakdown.transportation) || 0, icon: Car, color: '#0284C7' },
    { key: 'accommodation' as keyof BudgetBreakdown, label: 'Stay & Hotels', amount: Number(breakdown.accommodation) || 0, icon: Bed, color: '#8B5CF6' },
    { key: 'food' as keyof BudgetBreakdown, label: 'Food & Dining', amount: Number(breakdown.food) || 0, icon: Utensils, color: '#2D5A3D' },
    { key: 'activities' as keyof BudgetBreakdown, label: 'Attractions & Sightseeing', amount: Number(breakdown.activities) || 0, icon: Ticket, color: '#F59E0B' },
    { key: 'miscellaneous' as keyof BudgetBreakdown, label: 'Buffer & Emergency', amount: Number(breakdown.miscellaneous) || 0, icon: Shield, color: '#64748B' },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2D5A3D] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Cost Intelligence • CONCODE DB Guild</span>
          </div>
          <h2 className="text-xl font-bold text-[#0B2545]">Budget Optimizer</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time constraint reasoning that balances route costs, stays, and dining in {currency}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
            isOverBudget 
              ? 'bg-rose-50 text-rose-700 border-rose-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
          }`}>
            {isOverBudget ? 'Budget Exceeded' : 'Under Budget'}
          </span>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Total Budget</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-display truncate">
            {formatCurrency(trip.totalBudget, currency)}
          </div>
          <span className="text-[11px] text-slate-500 truncate block">
            {formatCurrency(Math.round(trip.totalBudget / Math.max(1, trip.travelersCount)), currency)} per traveler
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Estimated Expenses</span>
          <div className="text-2xl font-black text-slate-900 mt-1 font-display truncate">
            {formatCurrency(trip.estimatedTotal, currency)}
          </div>
          <span className="text-[11px] text-slate-500 truncate block">
            Across {trip.durationDays} days & {trip.travelersCount} travelers
          </span>
        </div>

        <div className={`p-4 rounded-2xl border min-w-0 ${
          isOverBudget 
            ? 'bg-rose-50 border-rose-200 text-rose-900' 
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <span className="text-xs font-bold uppercase tracking-wider block opacity-75">
            {isOverBudget ? 'Budget Deficit' : 'Remaining Savings'}
          </span>
          <div className={`text-2xl font-black mt-1 font-display truncate ${isOverBudget ? 'text-rose-600' : 'text-[#2D5A3D]'}`}>
            {isOverBudget ? `-${formatCurrency(Math.abs(buffer), currency)}` : `+${formatCurrency(buffer, currency)}`}
          </div>
          <span className="text-[11px] font-semibold opacity-80 truncate block">
            {isOverBudget ? 'Action required: Apply 1-click savings below' : 'Healthy buffer preserved'}
          </span>
        </div>

      </div>

      {/* Category Expense Breakdown */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Itemized Category Breakdown
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
              AI 1-Click Optimization Suggestions
            </h3>
          </div>
          <span className="text-xs font-bold text-[#2D5A3D] shrink-0">
            Total Potential Savings: {formatCurrency(1250, currency)}
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
                      Save {formatCurrency(tip.savings, currency)}
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 min-w-0">{tip.title}</h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed text-pretty">{tip.desc}</p>
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
                      <span>Applied</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Apply Savings</span>
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
