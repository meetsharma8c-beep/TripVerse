import React, { useState, useEffect } from 'react';
import { Trip, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, formatCurrency } from '../../services/currencyService';
import { 
  Users, 
  Calendar, 
  Wallet, 
  Sparkles, 
  Share2, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  MessageSquareQuote,
  TrendingDown,
  Navigation,
  Compass,
  RotateCcw,
  Camera,
  Star,
  ShieldCheck
} from 'lucide-react';

interface TripHeaderProps {
  trip: Trip;
  onOpenChat: () => void;
  onOpenShare: () => void;
  onOptimizeBudget: () => void;
  onExportTrip?: () => void;
  onOpenLiveNav?: () => void;
  onOpenDeals?: () => void;
  onOpenPrintDossier?: () => void;
  onOpenReplanning?: () => void;
  onOpenMemories?: () => void;
  onOpenReview?: () => void;
  onOpenBooking?: () => void;
  onOpenCollaboration?: () => void;
}

export const TripHeader: React.FC<TripHeaderProps> = ({
  trip,
  onOpenChat,
  onOpenShare,
  onOptimizeBudget,
  onOpenLiveNav,
  onOpenPrintDossier,
  onOpenReplanning,
  onOpenMemories,
  onOpenReview,
  onOpenBooking,
  onOpenCollaboration
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
  const difference = Math.abs(trip.totalBudget - trip.estimatedTotal);
  const budgetUsagePercent = Math.min(100, Math.round((trip.estimatedTotal / Math.max(1, trip.totalBudget)) * 100));

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Top Banner: Title and Metadata */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#00B074] border border-emerald-200/80 inline-flex items-center gap-1.5 shrink-0">
            <Compass className="w-3.5 h-3.5 text-[#00B074]" />
            <span>TripVerse AI Itinerary</span>
          </span>
          <span className="text-xs font-serif italic text-emerald-800">
            {trip.origin} → {trip.destination}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#0B2545] tracking-tight">
          {trip.name}
        </h1>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-600 font-normal flex-wrap">
          <span className="flex items-center gap-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-[#00B074]" />
            <span className="font-semibold text-slate-800">{trip.durationDays} Days Expedition</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <Users className="w-4 h-4 text-[#00B074]" />
            <span className="font-semibold text-slate-800">{trip.travelersCount} Explorers</span>
            <span className="text-slate-500 capitalize">({trip.travelerType})</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="capitalize font-medium text-slate-700">{trip.routeType} scenic route</span>
          </span>
        </div>

        {/* Clean, Non-overlapping Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3.5 border-t border-slate-100">
          {/* Primary Trip Features */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live Turn-by-Turn GPS Guidance Button */}
            {onOpenLiveNav && (
              <button
                onClick={onOpenLiveNav}
                className="flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95 group"
                title="Start Real-time Turn-by-Turn GPS Co-Pilot"
              >
                <Navigation className="w-3.5 h-3.5 animate-pulse text-white" />
                <span>Start Live Guide</span>
              </button>
            )}

            {/* Trip Replanning Action */}
            {onOpenReplanning && (
              <button
                onClick={onOpenReplanning}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs sm:text-sm border border-rose-200/90 transition-all cursor-pointer active:scale-95 group"
                title="Handle flight/train cancellations, emergency stays & complete trip replanning"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-500 group-hover:-rotate-90 transition-transform" />
                <span>Trip Replanning</span>
              </button>
            )}

            {/* AI Travel Assistant Trigger */}
            <button
              onClick={onOpenChat}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#00B074] font-medium text-xs sm:text-sm border border-emerald-200/80 transition-all cursor-pointer active:scale-95 group"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-spin" />
              <span>AI Assistant</span>
            </button>

            {/* Photo Memories Scrapbook Trigger */}
            {onOpenMemories && (
              <button
                onClick={onOpenMemories}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs sm:text-sm border border-slate-200 transition-all cursor-pointer active:scale-95 group"
                title="Trip Photo Scrapbook & Memories"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500 group-hover:scale-110 transition-transform" />
                <span>Memories</span>
                {trip.photos && trip.photos.length > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#00B074] text-white">
                    {trip.photos.length}
                  </span>
                )}
              </button>
            )}

            {/* Post-Trip Review / Rating Trigger */}
            {onOpenReview && (
              <button
                onClick={onOpenReview}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 text-amber-800 font-medium text-xs sm:text-sm border border-amber-200/80 transition-all cursor-pointer active:scale-95 group"
                title={trip.review ? `Rated ${trip.review.rating} Stars` : "Rate & Review Trip"}
              >
                <Star className={`w-3.5 h-3.5 ${trip.review ? 'text-amber-500 fill-amber-500' : 'text-amber-500'}`} />
                <span>{trip.review ? `${trip.review.rating}.0 Rated` : 'Review Trip'}</span>
              </button>
            )}
          </div>

          {/* Export & Utilities */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Collaborate with Friends */}
            {onOpenCollaboration && (
              <button
                onClick={onOpenCollaboration}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#00B074] font-bold text-xs border border-emerald-200/80 transition-all cursor-pointer active:scale-95 group shadow-2xs"
                title="Plan together in real-time with friends"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Collaborate</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
              title="Share Trip"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share</span>
            </button>

            {/* Print PDF Travel Guide */}
            {onOpenPrintDossier && (
              <button
                onClick={onOpenPrintDossier}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
                title="Print or Save as PDF Dossier"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>PDF Guide</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Budget Comparison Card (USP from Section 9 & 13) */}
      <div className={`p-5 rounded-2xl border transition-all ${
        isOverBudget 
          ? 'bg-red-50/70 border-red-200 text-red-900' 
          : 'bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-50 border-emerald-200/80 text-slate-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isOverBudget ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-[#00B074]'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Budget: {formatCurrency(trip.totalBudget, currency)}
                </span>
                <span className="text-xs font-bold text-slate-400 hidden sm:inline">|</span>
                <span className="text-xs font-bold text-slate-500">
                  Estimated: <strong className="text-slate-900">{formatCurrency(trip.estimatedTotal, currency)}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {isOverBudget ? (
                  <span className="flex items-center gap-1 text-sm font-extrabold text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-pretty">Your current plan is {formatCurrency(difference, currency)} over budget.</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm font-extrabold text-[#00B074]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="text-pretty">Remaining Safety Buffer: {formatCurrency(difference, currency)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions: Reserve Package & Optimize Budget */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onOpenBooking && (
              <button
                type="button"
                onClick={onOpenBooking}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                title="Lock in this rate & book verified package"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Reserve & Lock Rate</span>
              </button>
            )}

            <button
              onClick={onOptimizeBudget}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 shrink-0 ${
                isOverBudget 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-trip-gradient hover:bg-trip-gradient-hover text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Optimize Budget</span>
            </button>
          </div>

        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              isOverBudget ? 'bg-red-500' : 'bg-[#00B074]'
            }`}
            style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
          />
        </div>

        {/* Breakdown chips */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600 flex-wrap">
          <span>Transport: <strong>{formatCurrency(trip.budgetBreakdown.transportation, currency)}</strong></span>
          <span>Stay: <strong>{formatCurrency(trip.budgetBreakdown.accommodation, currency)}</strong></span>
          <span>Food: <strong>{formatCurrency(trip.budgetBreakdown.food, currency)}</strong></span>
          <span>Activities: <strong>{formatCurrency(trip.budgetBreakdown.activities, currency)}</strong></span>
          <span>Buffer: <strong>{formatCurrency(trip.budgetBreakdown.miscellaneous, currency)}</strong></span>
        </div>
      </div>

      {/* AI Rationale Quote */}
      {trip.aiRationale && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600">
          <MessageSquareQuote className="w-4 h-4 text-[#00B074] flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-800">TripVerse AI Rationale:</strong> {trip.aiRationale}
          </p>
        </div>
      )}

    </div>
  );
};
