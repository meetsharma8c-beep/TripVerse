import React, { useState, useEffect, useMemo } from 'react';
import { Trip } from '../../types/trip';
import { MapPin, ArrowRight, Share2, Trash2, Sparkles, Clock, Camera, Star, Compass, Route } from 'lucide-react';
import { handleImageError } from '../../utils/destinationImages';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { LiquidCard, LiquidTabs, LiquidButton } from '../ui/liquid';

interface MyTripsViewProps {
  trips: Trip[];
  activeTripId: string;
  onSelectTrip: (tripId: string) => void;
  onOpenPlanner: () => void;
  onDeleteTrip: (tripId: string) => void;
  onShareTrip: (trip: Trip) => void;
  onOpenMemories?: (trip: Trip) => void;
  onOpenReview?: (trip: Trip) => void;
}

export const MyTripsView: React.FC<MyTripsViewProps> = ({
  trips,
  activeTripId,
  onSelectTrip,
  onOpenPlanner,
  onDeleteTrip,
  onShareTrip,
  onOpenMemories,
  onOpenReview
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'draft'>('all');
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  const tabs = [
    { id: 'all', label: t('trips.all') },
    { id: 'upcoming', label: t('trips.upcoming') },
    { id: 'ongoing', label: t('trips.ongoing') },
    { id: 'completed', label: t('trips.completed') },
    { id: 'draft', label: t('trips.draft') },
  ];

  const filteredTrips = activeTab === 'all'
    ? trips
    : trips.filter(tr => tr.status === activeTab);

  const portfolioStats = useMemo(() => {
    const totalKm = trips.reduce((acc, tr) => acc + Math.round(tr.routeDetails?.distanceKm || tr.durationDays * 65), 0);
    const totalDays = trips.reduce((acc, tr) => acc + (tr.durationDays || 0), 0);
    return { totalKm, totalDays };
  }, [trips]);

  const getStatusBadge = (status: Trip['status']) => {
    switch (status) {
      case 'upcoming':
        return { label: t('trips.upcoming'), dot: 'bg-emerald-400', text: 'text-emerald-900 dark:text-emerald-200' };
      case 'ongoing':
        return { label: t('trips.ongoing'), dot: 'bg-sky-400', text: 'text-sky-900 dark:text-sky-200' };
      case 'completed':
        return { label: t('trips.completed'), dot: 'bg-slate-400', text: 'text-slate-800 dark:text-slate-200' };
      case 'draft':
        return { label: t('trips.draft'), dot: 'bg-amber-400', text: 'text-amber-900 dark:text-amber-200' };
    }
  };

  const featuredTrip = filteredTrips.length > 0
    ? filteredTrips.find(tr => tr.id === activeTripId) || filteredTrips[0]
    : null;
  const remainingTrips = featuredTrip
    ? filteredTrips.filter(tr => tr.id !== featuredTrip.id)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      
      {/* Editorial Topographic Portfolio Banner */}
      <div className="relative glass-frosted liquid-rim liquid-topo-wash rounded-[30px] p-6 sm:p-8 overflow-hidden">
        {/* Subtle Decorative Topographic Contour SVG */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-10 w-80 h-64 text-[#2D5A3D]/[0.07] dark:text-emerald-300/[0.08]"
          viewBox="0 0 320 240"
          fill="none"
        >
          <path d="M20 210 C80 140, 140 190, 220 110 S 290 50, 310 20" stroke="currentColor" strokeWidth="1.5" />
          <path d="M50 230 C110 165, 165 205, 245 130 S 300 75, 320 45" stroke="currentColor" strokeWidth="1.5" />
          <path d="M85 240 C140 185, 190 220, 265 150 S 310 100, 325 75" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="245" cy="92" r="46" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" />
        </svg>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2D5A3D] dark:text-emerald-400">
              <Compass className="w-3.5 h-3.5" />
              <span>{t('trips.portfolio')}</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-[#152A1C] dark:text-white tracking-tight leading-[1.08]">
              {t('trips.title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#57685D] dark:text-slate-300 leading-relaxed max-w-xl">
              {t('trips.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="glass-clear liquid-rim rounded-2xl px-4 py-2.5 flex items-center gap-4 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Journeys</span>
                <span className="text-base font-black font-display text-[#152A1C] dark:text-white tabular-nums">{trips.length}</span>
              </div>
              <span className="h-7 w-px bg-[#DCE7DB] dark:bg-white/10" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Days</span>
                <span className="text-base font-black font-display text-[#152A1C] dark:text-white tabular-nums">{portfolioStats.totalDays}</span>
              </div>
              <span className="h-7 w-px bg-[#DCE7DB] dark:bg-white/10" />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Mapped</span>
                <span className="text-base font-black font-display text-[#2D5A3D] dark:text-emerald-400 tabular-nums">{portfolioStats.totalKm.toLocaleString()} km</span>
              </div>
            </div>

            <LiquidButton variant="accent" size="lg" onClick={onOpenPlanner}>
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>{t('trips.planNew')}</span>
            </LiquidButton>
          </div>
        </div>
      </div>

      {/* Morphing Liquid Glass Filter Tabs */}
      <div className="overflow-x-auto scrollbar-none pb-1">
        <LiquidTabs
          items={tabs}
          activeId={activeTab}
          onSelect={(id) => setActiveTab(id as any)}
          ariaLabel="Filter journeys by status"
        />
      </div>

      {/* Empty State or Asymmetric Editorial Portfolio */}
      {filteredTrips.length === 0 ? (
        <div className="relative glass-frosted liquid-rim liquid-topo-wash rounded-[32px] p-8 sm:p-12 overflow-hidden animate-fade-in">
          <div className="max-w-2xl mx-auto text-center space-y-6 relative z-10">
            {/* Animated Expedition Route Arc Illustration */}
            <div className="relative mx-auto max-w-md h-24 flex items-center justify-between px-4">
              <svg
                aria-hidden="true"
                className="absolute inset-x-10 top-1/2 -translate-y-1/2 w-[calc(100%-5rem)] h-16 pointer-events-none"
                viewBox="0 0 320 64"
                fill="none"
              >
                <path
                  d="M 8 44 C 90 -6, 230 -6, 312 44"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-[#2D5A3D]/55 dark:text-emerald-400/60 liquid-route-trace"
                  strokeLinecap="round"
                />
              </svg>

              <div className="relative z-10 w-12 h-12 rounded-2xl glass-elevated liquid-rim flex items-center justify-center text-[#2D5A3D] dark:text-emerald-300">
                <Compass className="w-6 h-6" />
              </div>

              <div className="relative z-10 -mt-8 px-3 py-1 rounded-full glass-clear liquid-rim text-[10px] font-bold uppercase tracking-widest text-[#2D5A3D] dark:text-emerald-300">
                Ready to Plot
              </div>

              <div className="relative z-10 w-12 h-12 rounded-2xl glass-accent liquid-rim flex items-center justify-center text-white">
                <MapPin className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-display font-black text-[#152A1C] dark:text-white tracking-tight">
                {trips.length === 0 ? (
                  <>
                    Your atlas is{' '}
                    <span className="font-serif italic font-normal text-[#2D5A3D] dark:text-emerald-400">wide open.</span>
                  </>
                ) : (
                  'No journeys in this filter'
                )}
              </h3>
              <p className="text-xs sm:text-sm text-[#57685D] dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                {trips.length === 0
                  ? t('trips.emptySubtitle')
                  : 'Switch tabs above or plot a brand new AI-curated route with live highway stops and budget tracking.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {['Himalayan Alpine Loop', 'Amalfi Coastal Drive', 'Kyoto Heritage Trail'].map((idea) => (
                <button
                  key={idea}
                  type="button"
                  onClick={onOpenPlanner}
                  className="min-h-0 glass-clear liquid-rim liquid-press px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#152A1C] dark:text-slate-200 hover:text-[#2D5A3D] dark:hover:text-emerald-300 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Route className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                  <span>{idea}</span>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <LiquidButton variant="accent" size="lg" onClick={onOpenPlanner}>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>{t('trips.planNew')}</span>
              </LiquidButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Asymmetric Featured Active Journey Spread */}
          {featuredTrip && (() => {
            const badge = getStatusBadge(featuredTrip.status);
            const totalActivities = featuredTrip.itinerary?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0;
            return (
              <LiquidCard
                outerRadius={30}
                innerPadding={10}
                className="grid grid-cols-1 lg:grid-cols-12 group cursor-pointer"
                onClick={() => onSelectTrip(featuredTrip.id)}
              >
                <div className="lg:col-span-6 p-2.5">
                  <div className="relative h-60 sm:h-72 lg:h-full min-h-[240px] liquid-concentric-inner overflow-hidden bg-slate-200 dark:bg-slate-800">
                    <img
                      src={featuredTrip.destinationDetails?.image || 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=1000&q=80'}
                      alt={featuredTrip.destination}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      loading="eager"
                      onError={handleImageError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
                      <span className={`glass-clear inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${badge.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareTrip(featuredTrip);
                          }}
                          className="min-h-0 p-2 rounded-full glass-clear liquid-press text-[#152A1C] dark:text-slate-100 cursor-pointer"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === featuredTrip.id ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full glass-clear border border-rose-400/50"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                                onDeleteTrip(featuredTrip.id);
                              }}
                              className="min-h-0 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(null);
                              }}
                              className="min-h-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-[#152A1C] dark:text-slate-200 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(featuredTrip.id);
                            }}
                            className="min-h-0 p-2 rounded-full glass-clear liquid-press text-rose-600 dark:text-rose-400 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
                        Featured Active Route • {featuredTrip.origin} →
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight drop-shadow-md truncate">
                        {featuredTrip.name}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 p-5 sm:p-7 flex flex-col justify-between gap-5">
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="glass-clear liquid-rim rounded-2xl p-3 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Duration</span>
                        <span className="text-sm sm:text-base font-black font-display text-[#152A1C] dark:text-white tabular-nums truncate block">
                          {featuredTrip.durationDays}d • {featuredTrip.travelersCount}p
                        </span>
                      </div>
                      <div className="glass-clear liquid-rim rounded-2xl p-3 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Est. Budget</span>
                        <span className="text-sm sm:text-base font-black font-display text-[#2D5A3D] dark:text-emerald-400 tabular-nums truncate block">
                          {formatCurrency(featuredTrip.estimatedTotal, currency)}
                        </span>
                      </div>
                      <div className="glass-clear liquid-rim rounded-2xl p-3 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Pit Stops</span>
                        <span className="text-sm sm:text-base font-black font-display text-[#152A1C] dark:text-white tabular-nums truncate block">
                          {featuredTrip.breakStops.length} Stops
                        </span>
                      </div>
                    </div>

                    {totalActivities > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#57685D] dark:text-slate-400">Itinerary Readiness</span>
                          <span className="font-bold text-[#2D5A3D] dark:text-emerald-400 tabular-nums">{totalActivities} Curated Stops</span>
                        </div>
                        <div className="w-full bg-[#E2EBE1] dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2D5A3D] via-emerald-500 to-[#2D5A3D] liquid-progress-bar"
                            style={{ width: featuredTrip.status === 'completed' ? '100%' : featuredTrip.status === 'ongoing' ? '72%' : '48%' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <LiquidButton
                      variant="accent"
                      size="md"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrip(featuredTrip.id);
                      }}
                    >
                      <span>Open Itinerary &amp; Map</span>
                      <ArrowRight className="w-4 h-4" />
                    </LiquidButton>

                    {onOpenMemories && (
                      <LiquidButton
                        variant="frosted"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMemories(featuredTrip);
                        }}
                      >
                        <Camera className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400" />
                        <span>Memories</span>
                      </LiquidButton>
                    )}

                    {onOpenReview && (
                      <LiquidButton
                        variant="frosted"
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReview(featuredTrip);
                        }}
                      >
                        <Star className={`w-4 h-4 ${featuredTrip.review ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
                        <span>{featuredTrip.review ? `${featuredTrip.review.rating}.0` : 'Review'}</span>
                      </LiquidButton>
                    )}
                  </div>
                </div>
              </LiquidCard>
            );
          })()}

          {/* Remaining Journeys Grid */}
          {remainingTrips.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {remainingTrips.map((trip) => {
                const badge = getStatusBadge(trip.status);
                const totalActivities = trip.itinerary?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0;

                return (
                  <LiquidCard
                    key={trip.id}
                    outerRadius={28}
                    innerPadding={8}
                    className="flex flex-col justify-between group cursor-pointer"
                    onClick={() => onSelectTrip(trip.id)}
                  >
                    <div>
                      <div className="p-2 pb-0">
                        <div className="relative h-44 liquid-concentric-inner overflow-hidden">
                          <img
                            src={trip.destinationDetails?.image || 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=800&q=80'}
                            alt={trip.destination}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            decoding="async"
                            onError={handleImageError}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                            <span className={`glass-clear inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${badge.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onShareTrip(trip);
                                }}
                                className="min-h-0 p-1.5 rounded-full glass-clear liquid-press text-[#152A1C] dark:text-slate-100 cursor-pointer"
                                title="Share"
                              >
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteId === trip.id ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full glass-clear border border-rose-400/50"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteId(null);
                                      onDeleteTrip(trip.id);
                                    }}
                                    className="min-h-0 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDeleteId(null);
                                    }}
                                    className="min-h-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-[#152A1C] dark:text-slate-200 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteId(trip.id);
                                  }}
                                  className="min-h-0 p-1.5 rounded-full glass-clear liquid-press text-rose-600 dark:text-rose-400 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <p className="text-[11px] font-semibold text-emerald-300 drop-shadow-sm truncate">{trip.origin} →</p>
                            <h3 className="font-bold text-lg leading-tight font-display drop-shadow-md truncate">{trip.name}</h3>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3.5">
                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          <div className="glass-clear rounded-xl p-2.5 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Duration</span>
                            <span className="font-bold text-[#152A1C] dark:text-slate-100 tabular-nums truncate block">
                              {trip.durationDays}d • {trip.travelersCount} Pax
                            </span>
                          </div>
                          <div className="glass-clear rounded-xl p-2.5 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Est. Cost</span>
                            <span className="font-extrabold text-[#2D5A3D] dark:text-emerald-400 font-display tabular-nums truncate block">
                              {formatCurrency(trip.estimatedTotal, currency)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#57685D] dark:text-slate-400">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{trip.breakStops.length} Break Stops</span>
                          </span>
                          <span className="font-semibold text-[#2D5A3D] dark:text-emerald-400 tabular-nums">
                            {totalActivities} Stops
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 pt-0 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {onOpenMemories && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenMemories(trip);
                            }}
                            className="min-h-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl glass-clear liquid-press text-[#2D5A3D] dark:text-emerald-300 font-bold text-xs cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Memories</span>
                          </button>
                        )}
                        {onOpenReview && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenReview(trip);
                            }}
                            className="min-h-0 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl glass-clear liquid-press text-amber-800 dark:text-amber-300 font-bold text-xs cursor-pointer"
                          >
                            <Star className={`w-3.5 h-3.5 ${trip.review ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
                            <span>{trip.review ? `${trip.review.rating}.0 ★` : 'Review'}</span>
                          </button>
                        )}
                      </div>

                      <LiquidButton
                        variant="accent"
                        size="md"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrip(trip.id);
                        }}
                      >
                        <span>Open Itinerary &amp; Map</span>
                        <ArrowRight className="w-4 h-4" />
                      </LiquidButton>
                    </div>
                  </LiquidCard>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
