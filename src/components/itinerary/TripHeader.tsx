import React, { useState, useEffect } from 'react';
import { Trip, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, formatCurrency } from '../../services/currencyService';
import { resolveDestinationImage, handleImageError } from '../../utils/destinationImages';
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
  ShieldCheck,
  MapPin,
  Leaf,
  ChevronRight,
  Edit3,
  Bed,
  Clock,
  Ticket
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
  onNavigateToRoute?: () => void;
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
  onOpenCollaboration,
  onNavigateToRoute
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

  // Calculate total distance in km from itinerary activities or default estimate
  const calculatedDistance = trip.itinerary?.reduce((acc, day) => {
    return acc + (day.activities?.reduce((sum, act) => sum + (act.distanceKm || 0), 0) || 0);
  }, 0) || 0;
  const totalDistanceKm = calculatedDistance > 0 ? Math.round(calculatedDistance) : Math.round(trip.durationDays * 35 + 24);

  // Carbon savings calculation based on optimized routing and transit
  const co2SavedKg = Math.max(8, Math.round(totalDistanceKm * 0.12 + (trip.breakStops?.length || 1) * 2));

  // Destination image preview
  const destinationImg = resolveDestinationImage(trip.destination);

  // Format date range (e.g. "12–18 May")
  const formatDateRange = () => {
    if (!trip.startDate) return `${trip.durationDays} Days • ${Math.max(1, trip.durationDays - 1)} Nights`;
    try {
      const start = new Date(trip.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + (trip.durationDays - 1));
      const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
      const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
      if (startMonth === endMonth) {
        return `${trip.durationDays} Days • ${Math.max(1, trip.durationDays - 1)} Nights • ${start.getDate()}–${end.getDate()} ${startMonth}`;
      }
      return `${trip.durationDays} Days • ${Math.max(1, trip.durationDays - 1)} Nights • ${start.getDate()} ${startMonth}–${end.getDate()} ${endMonth}`;
    } catch {
      return `${trip.durationDays} Days • ${Math.max(1, trip.durationDays - 1)} Nights`;
    }
  };

  return (
    <div className="space-y-4 font-sans">
      
      {/* Reference Screen 2: Top Destination & Travelers Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E2EBE1] shadow-[0_4px_24px_rgba(45,90,61,0.05)]">
        <div className="flex items-start justify-between gap-4">
          
          {/* Destination Details */}
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#152A1C] tracking-tight truncate">
                {trip.destination}
              </h1>
              <span className="p-1.5 rounded-full text-[#2D5A3D] bg-[#E8EFE7] hover:bg-[#d9e5d8] transition-colors cursor-pointer" title="Trip Destination">
                <Edit3 className="w-3.5 h-3.5" />
              </span>
            </div>

            <p className="text-xs sm:text-sm text-[#5A7362] font-medium">
              {formatDateRange()}
            </p>

            {/* Travelers Avatar Stack matching Reference Image */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex -space-x-2 overflow-hidden items-center">
                <img
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Traveler 1"
                />
                <img
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                  alt="Traveler 2"
                />
                <img
                  className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
                  alt="Traveler 3"
                />
                {trip.travelersCount > 3 && (
                  <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#E8EFE7] text-[#2D5A3D] font-bold text-[10px] ring-2 ring-white">
                    +{trip.travelersCount - 3}
                  </span>
                )}
                {trip.travelersCount <= 3 && (
                  <span className="flex items-center justify-center h-7 w-7 rounded-full bg-[#E8EFE7] text-[#2D5A3D] font-bold text-[10px] ring-2 ring-white">
                    +{trip.travelersCount}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#5A7362] font-medium capitalize">
                {trip.travelerType} group
              </span>
            </div>

            {/* Pacing & Verified Stay Badges */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {trip.pacing && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#2D5A3D] bg-[#E8EFE7] px-2.5 py-0.5 rounded-full border border-[#8EA78D]/30">
                  <Clock className="w-3 h-3 text-[#2D5A3D]" />
                  {trip.pacing.replace('_', ' ')} Pace
                </span>
              )}
              {trip.selectedHotel && (
                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 cursor-pointer transition-colors"
                  title="Click to view stay & booking options"
                >
                  <Bed className="w-3 h-3 text-emerald-700" />
                  <span>Stay: {trip.selectedHotel.name} ({trip.selectedHotel.starRating}★)</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Destination Thumbnail Photo */}
          <div className="shrink-0">
            <div className="w-20 h-20 sm:w-28 sm:h-24 rounded-2xl overflow-hidden shadow-sm border border-[#E2EBE1] bg-[#E8EFE7]">
              <img
                src={destinationImg}
                alt={trip.destination}
                onError={(e) => handleImageError(e)}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          </div>

        </div>
      </div>

      {/* Reference Screen 2: Signature "AI Route Optimized" Card */}
      <div className="bg-white rounded-3xl p-5 border border-[#E2EBE1] shadow-[0_4px_24px_rgba(45,90,61,0.06)] space-y-4">
        
        {/* Top Header & Route Diagram */}
        <div className="flex items-center justify-between gap-4">
          
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[#2D5A3D]" />
              </div>
              <h2 className="font-display font-bold text-sm sm:text-base text-[#152A1C] truncate">
                AI Route Optimized
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-[#5A7362] leading-tight">
              Best time to visit • Less travel time • Scenic • Budget friendly
            </p>
          </div>

          {/* Interactive Route Vector with Pins */}
          <button
            onClick={onNavigateToRoute || onOpenLiveNav}
            className="flex items-center gap-1.5 p-2 rounded-2xl hover:bg-[#F4F6F2] transition-colors text-[#2D5A3D] cursor-pointer shrink-0 group"
            title="View Route Map and Directions"
          >
            <div className="relative w-16 h-8 sm:w-20 sm:h-9 flex items-center justify-center">
              {/* Dotted bezier curve */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 80 36" fill="none">
                <path
                  d="M 6 26 C 24 6, 56 32, 74 12"
                  stroke="#8EA78D"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
                <circle cx="6" cy="26" r="4.5" fill="#2D5A3D" />
                <circle cx="6" cy="26" r="2" fill="white" />
                <circle cx="74" cy="12" r="4.5" fill="#2D5A3D" />
                <circle cx="74" cy="12" r="2" fill="white" />
              </svg>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8EA78D] group-hover:text-[#2D5A3D] group-hover:translate-x-0.5 transition-all" />
          </button>

        </div>

        {/* 3 Metric Pills matching Reference Screen 2 */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
          
          {/* Distance */}
          <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-[#F8FAF7] border border-[#E2EBE1]">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shrink-0">
              <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2D5A3D]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#5A7362] block leading-tight font-medium">Distance</span>
              <span className="text-xs sm:text-sm font-bold text-[#152A1C] truncate block">
                {totalDistanceKm} km
              </span>
            </div>
          </div>

          {/* Est. Cost */}
          <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-[#F8FAF7] border border-[#E2EBE1]">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2D5A3D]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#5A7362] block leading-tight font-medium">Est. Cost</span>
              <span className="text-xs sm:text-sm font-bold text-[#152A1C] truncate block">
                {formatCurrency(trip.estimatedTotal, currency)}
              </span>
            </div>
          </div>

          {/* CO2 Saved */}
          <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-[#F8FAF7] border border-[#E2EBE1]">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shrink-0">
              <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2D5A3D]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-[#5A7362] block leading-tight font-medium">CO₂ Saved</span>
              <span className="text-xs sm:text-sm font-bold text-[#152A1C] truncate block">
                {co2SavedKg} kg
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Left Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenLiveNav && (
            <button
              onClick={onOpenLiveNav}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#234730] text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95"
              title="Open directions in a navigation app"
            >
              <Navigation className="w-3.5 h-3.5 animate-pulse text-white" />
              <span>Get Directions</span>
            </button>
          )}

          {onOpenReplanning && (
            <button
              onClick={onOpenReplanning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs sm:text-sm border border-rose-200 transition-all cursor-pointer active:scale-95"
              title="Handle flight/train cancellations, emergency stays & complete trip replanning"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              <span>Trip Replanning</span>
            </button>
          )}

          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E8EFE7] hover:bg-[#dce7db] text-[#2D5A3D] font-medium text-xs sm:text-sm border border-[#8EA78D]/30 transition-all cursor-pointer active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>AI Assistant</span>
          </button>

          {onOpenMemories && (
            <button
              onClick={onOpenMemories}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F4F6F2] text-slate-700 font-medium text-xs sm:text-sm border border-[#E2EBE1] transition-all cursor-pointer active:scale-95"
              title="Trip Photo Scrapbook & Memories"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              <span>Memories</span>
              {trip.photos && trip.photos.length > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#2D5A3D] text-white">
                  {trip.photos.length}
                </span>
              )}
            </button>
          )}

          {onOpenReview && (
            <button
              onClick={onOpenReview}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50/70 hover:bg-amber-100 text-amber-800 font-medium text-xs sm:text-sm border border-amber-200 transition-all cursor-pointer active:scale-95"
              title={trip.review ? `Rated ${trip.review.rating} Stars` : "Rate & Review Trip"}
            >
              <Star className={`w-3.5 h-3.5 ${trip.review ? 'text-amber-500 fill-amber-500' : 'text-amber-500'}`} />
              <span>{trip.review ? `${trip.review.rating}.0 Rated` : 'Review'}</span>
            </button>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenCollaboration && (
            <button
              onClick={onOpenCollaboration}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#E8EFE7] hover:bg-[#dce7db] text-[#2D5A3D] font-bold text-xs border border-[#8EA78D]/30 transition-all cursor-pointer active:scale-95"
              title="Plan together in real-time with friends"
            >
              <Users className="w-3.5 h-3.5 text-[#2D5A3D]" />
              <span>Collaborate</span>
              <span className="w-2 h-2 rounded-full bg-[#2D5A3D] animate-pulse" />
            </button>
          )}

          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F4F6F2] text-slate-700 font-medium text-xs border border-[#E2EBE1] transition-colors cursor-pointer"
            title="Share Trip"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Share</span>
          </button>

          {onOpenPrintDossier && (
            <button
              onClick={onOpenPrintDossier}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F4F6F2] text-slate-700 font-medium text-xs border border-[#E2EBE1] transition-colors cursor-pointer"
              title="Print or Save as PDF Dossier"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>PDF Guide</span>
            </button>
          )}
        </div>
      </div>

      {/* Budget Card */}
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${
        isOverBudget 
          ? 'bg-red-50/70 border-red-200 text-red-900' 
          : 'bg-[#F8FAF7] border-[#E2EBE1] text-[#152A1C]'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isOverBudget ? 'bg-red-100 text-red-600' : 'bg-[#E8EFE7] text-[#2D5A3D]'
            }`}>
              <Wallet className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5A7362]">
                  Total Budget: {formatCurrency(trip.totalBudget, currency)}
                </span>
                <span className="text-xs font-bold text-slate-300 hidden sm:inline">|</span>
                <span className="text-xs font-bold text-[#5A7362]">
                  Estimated: <strong className="text-[#152A1C]">{formatCurrency(trip.estimatedTotal, currency)}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {isOverBudget ? (
                  <span className="flex items-center gap-1 text-sm font-extrabold text-red-600">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Your current plan is {formatCurrency(difference, currency)} over budget.</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-sm font-bold text-[#2D5A3D]">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Remaining Safety Buffer: {formatCurrency(difference, currency)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onOpenBooking && (
              <button
                type="button"
                onClick={onOpenBooking}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#152A1C] hover:bg-[#234730] text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Review verified stay, live flights/trains, and ticket booking options"
              >
                <Ticket className="w-4 h-4 text-emerald-400" />
                <span>Book Tickets & Stays</span>
              </button>
            )}

            <button
              onClick={onOptimizeBudget}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95 shrink-0 ${
                isOverBudget 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-[#2D5A3D] hover:bg-[#234730] text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              <span>Optimize Budget</span>
            </button>
          </div>

        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#E2EBE1] rounded-full h-2 overflow-hidden">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              isOverBudget ? 'bg-red-500' : 'bg-[#2D5A3D]'
            }`}
            style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
          />
        </div>

        {/* Breakdown chips */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[#E2EBE1] text-xs text-[#5A7362] flex-wrap">
          <span>Transport: <strong className="text-[#152A1C]">{formatCurrency(trip.budgetBreakdown.transportation, currency)}</strong></span>
          <span>Stay: <strong className="text-[#152A1C]">{formatCurrency(trip.budgetBreakdown.accommodation, currency)}</strong></span>
          <span>Food: <strong className="text-[#152A1C]">{formatCurrency(trip.budgetBreakdown.food, currency)}</strong></span>
          <span>Activities: <strong className="text-[#152A1C]">{formatCurrency(trip.budgetBreakdown.activities, currency)}</strong></span>
          <span>Buffer: <strong className="text-[#152A1C]">{formatCurrency(trip.budgetBreakdown.miscellaneous, currency)}</strong></span>
        </div>
      </div>

      {/* AI Rationale Quote */}
      {trip.aiRationale && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E2EBE1] text-xs text-[#5A7362]">
          <MessageSquareQuote className="w-4 h-4 text-[#2D5A3D] shrink-0 mt-0.5" />
          <p className="leading-relaxed flex-1">
            <strong className="text-[#152A1C]">TripVerse AI Rationale:</strong> {trip.aiRationale}
          </p>
        </div>
      )}

    </div>
  );
};

