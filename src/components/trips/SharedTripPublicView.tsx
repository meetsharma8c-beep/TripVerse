import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Sparkles,
  Copy,
  Check,
  ArrowLeft,
  Train,
  Plane,
  Car,
  Bus,
  Clock,
  Share2,
  Compass,
} from 'lucide-react';
import { SharedTripDocument, CloneTripCustomizations } from '../../services/sharedTripService';
import { evaluateLiveMarketPrices } from '../../services/liveMarketPricingService';
import { formatCurrency, getActiveCurrency } from '../../services/currencyService';
import { copyTextToClipboard, triggerHaptic } from '../../services/deviceService';

interface SharedTripPublicViewProps {
  sharedDoc: SharedTripDocument;
  onCloneTrip: (sharedDoc: SharedTripDocument, customizations?: CloneTripCustomizations) => void;
  onGoHome: () => void;
}

export const SharedTripPublicView: React.FC<SharedTripPublicViewProps> = ({
  sharedDoc,
  onCloneTrip,
  onGoHome,
}) => {
  const { trip } = sharedDoc;
  const currency = getActiveCurrency();
  const [copied, setCopied] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [customOrigin, setCustomOrigin] = useState(trip.origin || 'Mumbai');
  const [customTravelers, setCustomTravelers] = useState(Math.max(1, trip.travelersCount || 2));

  const isCustomized =
    customOrigin.trim().toLowerCase() !== (trip.origin || '').trim().toLowerCase() ||
    customTravelers !== (trip.travelersCount || 2);

  const previewBudgetInr = React.useMemo(() => {
    if (!isCustomized) return trip.estimatedTotal || trip.totalBudget;
    const m = evaluateLiveMarketPrices({
      origin: customOrigin.trim() || trip.origin || 'Mumbai',
      destination: trip.destination,
      durationDays: trip.durationDays || 3,
      travelersCount: customTravelers,
      startDate: trip.startDate,
      accommodationType: trip.accommodationType,
      transportMode: trip.transportMode
    });
    const tCost =
      trip.transportMode === 'flight'
        ? m.flightTotalGroupINR
        : trip.transportMode === 'train'
        ? m.trainTotalGroupINR
        : trip.transportMode === 'car' || trip.transportMode === 'bike'
        ? m.roadTripFuelAndTollsINR
        : m.localTransitTotalGroupINR;
    const sCost = Math.max(0, (trip.durationDays || 3) - 1) === 0 ? 0 : m.hotelTotalGroupINR;
    return Math.round((tCost + sCost + m.diningTotalGroupINR + m.attractionsTotalGroupINR) * 1.06);
  }, [isCustomized, customOrigin, customTravelers, trip]);

  const ModeIcon =
    trip.transportMode === 'train'
      ? Train
      : trip.transportMode === 'flight'
        ? Plane
        : trip.transportMode === 'bus'
          ? Bus
          : Car;

  const handleCopyShareUrl = () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://trip-verse.com/share/${sharedDoc.shareId}`;
    void copyTextToClipboard(url);
    triggerHaptic('light');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClone = () => {
    setIsCloning(true);
    triggerHaptic('success');
    onCloneTrip(sharedDoc, {
      customOrigin: customOrigin.trim() || trip.origin,
      customTravelers
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-700 text-xs font-bold text-[#152A1C] dark:text-slate-200 hover:bg-[#F4F6F2] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore TripVerse</span>
        </button>

        <button
          type="button"
          onClick={handleCopyShareUrl}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-700 text-xs font-bold text-[#2D5A3D] dark:text-emerald-400 hover:bg-[#EAF0E9] transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
        </button>
      </div>

      {/* Hero Summary Card */}
      <div className="rounded-[32px] overflow-hidden bg-gradient-to-br from-[#152A1C] via-[#1E3E2B] to-[#2D5A3D] text-white p-6 sm:p-8 shadow-xl border border-white/10 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-200 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Shared by {sharedDoc.ownerName}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 text-white/90 text-[11px] font-semibold capitalize">
            <ModeIcon className="w-3.5 h-3.5 text-emerald-300" />
            <span>{trip.transportMode || 'car'} journey</span>
          </span>
        </div>

        <div>
          <p className="text-xs sm:text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>{trip.origin} → {trip.destination}</span>
          </p>
          <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight mt-1">
            {trip.name}
          </h1>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-white/10 rounded-2xl p-4 border border-white/10">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Duration
            </span>
            <p className="text-base sm:text-lg font-black font-display mt-0.5">{trip.durationDays} Days</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold flex items-center gap-1">
              <Users className="w-3 h-3" /> Travelers
            </span>
            <p className="text-base sm:text-lg font-black font-display mt-0.5">{customTravelers} Pax</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold">
              {isCustomized ? 'Re-Priced Est.' : 'Est. Budget'}
            </span>
            <p className="text-base sm:text-lg font-black font-display text-emerald-300 mt-0.5 truncate">
              {formatCurrency(previewBudgetInr, currency)}
            </p>
          </div>
        </div>

        {/* Customize Origin & Group Size Before Cloning */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-black/20 rounded-2xl p-3.5 border border-white/10">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-emerald-200 block mb-1">
              Departing From (Your City)
            </label>
            <input
              type="text"
              value={customOrigin}
              onChange={(e) => setCustomOrigin(e.target.value)}
              placeholder="e.g. Delhi, Bengaluru, Mumbai"
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-xs font-semibold text-white placeholder:text-white/50 focus:outline-none focus:border-emerald-300"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-emerald-200 block mb-1">
              Your Group Size
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCustomTravelers(c => Math.max(1, c - 1))}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm cursor-pointer"
              >
                −
              </button>
              <span className="flex-1 text-center text-xs font-bold text-white">
                {customTravelers} {customTravelers === 1 ? 'Traveler' : 'Travelers'}
              </span>
              <button
                type="button"
                onClick={() => setCustomTravelers(c => Math.min(20, c + 1))}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Primary Viral CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <button
            type="button"
            disabled={isCloning}
            onClick={handleClone}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-[#0B2518] font-display font-black text-sm sm:text-base shadow-lg transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60"
          >
            <Copy className="w-4 h-4" />
            <span>
              {isCloning
                ? 'Cloning & Re-Pricing...'
                : isCustomized
                ? `Clone & Re-Price From ${customOrigin.trim() || trip.origin}`
                : 'Clone & Customize This Trip Free'}
            </span>
          </button>
        </div>
      </div>

      {/* Day-by-Day Read-Only Itinerary */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D5A3D] dark:text-emerald-400">
          <Compass className="w-4 h-4" />
          <span>Full Day-by-Day Itinerary ({trip.itinerary?.length || 0} Days)</span>
        </div>

        {(trip.itinerary || []).map((day) => (
          <section
            key={day.dayNumber}
            className="rounded-3xl bg-white dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4 tv-cv-card"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#2D5A3D] dark:text-emerald-400">
                  Day {day.dayNumber}
                </span>
                <h2 className="text-lg font-display font-bold text-[#152A1C] dark:text-slate-100 mt-0.5">
                  {day.title || day.theme}
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                {day.activities?.length || 0} stops
              </span>
            </div>

            <div className="space-y-3">
              {(day.activities || []).map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F8FAF7] dark:bg-slate-800/60 border border-[#E8EFE7] dark:border-slate-700/60"
                >
                  <div className="shrink-0 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-700 text-[11px] font-bold text-[#2D5A3D] dark:text-emerald-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{act.time || 'Flexible'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#152A1C] dark:text-slate-100">
                      {act.title}
                    </h3>
                    {act.location && (
                      <p className="text-xs text-[#5A7362] dark:text-slate-400 mt-0.5 truncate">
                        {act.location}
                      </p>
                    )}
                    {act.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {act.description}
                      </p>
                    )}
                  </div>
                  {act.estimatedCost > 0 && (
                    <span className="shrink-0 text-xs font-bold text-[#2D5A3D] dark:text-emerald-400">
                      {formatCurrency(act.estimatedCost, currency)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
