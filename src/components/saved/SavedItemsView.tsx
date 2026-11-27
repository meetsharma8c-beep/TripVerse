import React, { useState, useMemo } from 'react';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { HIGHWAY_BREAK_STOPS } from '../../data/highwayFacilities';
import { Trip, Destination, BreakStop } from '../../types/trip';
import { Bookmark, Trash2, Sparkles, Star, Compass, Route, RotateCcw, ArrowRight } from 'lucide-react';
import { handleImageError, synthesizeDestination } from '../../utils/destinationImages';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { resolveGlobalDestination } from '../../services/globalLocationResolver';
import { triggerHaptic } from '../../services/deviceService';
import { LiquidCard, LiquidTabs, LiquidButton } from '../ui/liquid';

interface SavedItemsViewProps {
  savedItemIds: string[];
  trips: Trip[];
  onToggleSaved: (id: string) => void;
  onSelectTrip: (tripId: string) => void;
  onPlanTripForDestination: (destName: string) => void;
  onSelectDestination?: (dest: Destination) => void;
  onExplore?: () => void;
}

export const SavedItemsView: React.FC<SavedItemsViewProps> = ({
  savedItemIds,
  trips,
  onToggleSaved,
  onSelectTrip,
  onPlanTripForDestination,
  onSelectDestination,
  onExplore
}) => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<'all' | 'itineraries' | 'destinations' | 'breakstops'>('all');
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());
  const [recentlyRemoved, setRecentlyRemoved] = useState<{ id: string; label: string } | null>(null);

  React.useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  React.useEffect(() => {
    if (!recentlyRemoved) return;
    const timer = window.setTimeout(() => setRecentlyRemoved(null), 6500);
    return () => window.clearTimeout(timer);
  }, [recentlyRemoved]);

  const [enrichedCustomDestinations, setEnrichedCustomDestinations] = useState<Record<string, Destination>>({});

  // 1. Saved Itineraries (bookmarked from Trip Detail)
  const savedTrips = useMemo(
    () => trips.filter((tr) => savedItemIds.includes(tr.id)),
    [trips, savedItemIds]
  );

  // 2. Saved Break Stops (both static catalog & live Geoapify stops across user trips)
  const allKnownBreakStops = useMemo(() => {
    const map = new Map<string, BreakStop>();
    HIGHWAY_BREAK_STOPS.forEach((bs) => map.set(bs.id, bs));
    trips.forEach((tr) => {
      (tr.breakStops || []).forEach((bs) => {
        if (bs?.id && !map.has(bs.id)) {
          map.set(bs.id, bs);
        }
      });
    });
    return Array.from(map.values());
  }, [trips]);

  const savedBreakStops = useMemo(
    () => allKnownBreakStops.filter((bs) => savedItemIds.includes(bs.id)),
    [allKnownBreakStops, savedItemIds]
  );

  // 3. Saved Catalog & Custom Worldwide Destinations (strictly excluding trip-* or breakstop IDs)
  const savedCatalogDestinations = useMemo(
    () => POPULAR_DESTINATIONS.filter((d) => savedItemIds.includes(d.id)),
    [savedItemIds]
  );

  const customDestinationIds = useMemo(
    () =>
      savedItemIds.filter(
        (id) =>
          !id.startsWith('trip-') &&
          !trips.some((tr) => tr.id === id) &&
          !POPULAR_DESTINATIONS.some((d) => d.id === id) &&
          !allKnownBreakStops.some((bs) => bs.id === id)
      ),
    [savedItemIds, trips, allKnownBreakStops]
  );

  React.useEffect(() => {
    let cancelled = false;
    customDestinationIds.forEach((id) => {
      if (enrichedCustomDestinations[id]) return;
      const rawName = id
        .replace(/^(dest|custom|osm|wiki)-/i, '')
        .split('-')
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (!rawName) return;
      resolveGlobalDestination(rawName)
        .then((resolved) => {
          if (cancelled || !resolved) return;
          const baseSynth = synthesizeDestination(
            resolved.name || rawName,
            resolved.coordinates,
            undefined,
            resolved.state !== 'Region' ? resolved.state : resolved.country
          );
          setEnrichedCustomDestinations((prev) => ({
            ...prev,
            [id]: {
              ...baseSynth,
              id,
              name: resolved.name || baseSynth.name,
              state: resolved.state !== 'Region' ? resolved.state : baseSynth.state,
              country: resolved.country || baseSynth.country,
              description: resolved.description || baseSynth.description,
              image: resolved.image || baseSynth.image,
              coordinates: resolved.coordinates || baseSynth.coordinates,
              popularActivities:
                resolved.highlights && resolved.highlights.length > 0
                  ? resolved.highlights
                  : baseSynth.popularActivities,
            },
          }));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [customDestinationIds.join(',')]);

  const savedCustomDestinations: Destination[] = customDestinationIds.map((id) => {
    if (enrichedCustomDestinations[id]) return enrichedCustomDestinations[id];
    const rawName = id
      .replace(/^(dest|custom|osm|wiki)-/i, '')
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      ...synthesizeDestination(rawName || id),
      id,
    };
  });

  const savedDestinations = [...savedCatalogDestinations, ...savedCustomDestinations];
  const totalSaved = savedTrips.length + savedDestinations.length + savedBreakStops.length;

  const handleRemoveWithUndo = (id: string, label: string) => {
    triggerHaptic('warning');
    setRecentlyRemoved({ id, label });
    onToggleSaved(id);
  };

  const handleUndoRemove = () => {
    if (!recentlyRemoved) return;
    triggerHaptic('success');
    if (!savedItemIds.includes(recentlyRemoved.id)) {
      onToggleSaved(recentlyRemoved.id);
    }
    setRecentlyRemoved(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Editorial Curated Vault Header */}
      <div className="relative glass-frosted liquid-rim liquid-topo-wash rounded-[30px] p-6 sm:p-8 overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2D5A3D] dark:text-emerald-400">
              <Bookmark className="w-3.5 h-3.5" />
              <span>{t('saved.bookmarks')}</span>
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-black text-[#152A1C] dark:text-white tracking-tight">
              {t('saved.title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#57685D] dark:text-slate-300 font-medium max-w-xl">
              {t('saved.subtitle')}
            </p>
          </div>

          <div className="glass-clear liquid-rim rounded-2xl px-4 py-2.5 flex items-center gap-4 text-xs self-start sm:self-auto">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Places</span>
              <span className="text-base font-black font-display text-[#152A1C] dark:text-white tabular-nums">{savedDestinations.length}</span>
            </div>
            <span className="h-7 w-px bg-[#DCE7DB] dark:bg-white/10" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Trips</span>
              <span className="text-base font-black font-display text-[#2D5A3D] dark:text-emerald-400 tabular-nums">{savedTrips.length}</span>
            </div>
            <span className="h-7 w-px bg-[#DCE7DB] dark:bg-white/10" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Stops</span>
              <span className="text-base font-black font-display text-[#2D5A3D] dark:text-emerald-400 tabular-nums">{savedBreakStops.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inline Undo Recovery Banner */}
      {recentlyRemoved && (
        <div
          role="status"
          className="glass-elevated liquid-rim rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm animate-fade-in"
        >
          <span className="font-semibold text-[#152A1C] dark:text-slate-100 truncate">
            Removed <strong>{recentlyRemoved.label}</strong> from your Saved Vault.
          </span>
          <button
            type="button"
            onClick={handleUndoRemove}
            className="min-h-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2D5A3D] hover:bg-[#244931] text-white text-xs font-bold shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Morphing Category Tabs */}
      <div className="overflow-x-auto scrollbar-none pb-1">
        <LiquidTabs
          items={[
            { id: 'all', label: `${t('saved.allItems')} (${totalSaved})` },
            ...(savedTrips.length > 0 ? [{ id: 'itineraries', label: `Itineraries (${savedTrips.length})` }] : []),
            { id: 'destinations', label: `${t('saved.destinations')} (${savedDestinations.length})` },
            { id: 'breakstops', label: `${t('saved.breakstops')} (${savedBreakStops.length})` },
          ]}
          activeId={activeCategory === 'itineraries' && savedTrips.length === 0 ? 'all' : activeCategory}
          onSelect={(id) => setActiveCategory(id as any)}
          ariaLabel="Filter saved items"
        />
      </div>

      {totalSaved === 0 ? (
        <div className="relative glass-frosted liquid-rim liquid-topo-wash rounded-[32px] p-8 sm:p-12 overflow-hidden animate-fade-in">
          <div className="max-w-xl mx-auto text-center space-y-6 relative z-10">
            <div className="relative h-28 flex items-center justify-center">
              <div className="w-20 h-24 rounded-2xl glass-clear liquid-rim -rotate-12 -mr-5 shadow-md flex items-end p-2">
                <span className="w-full h-2 rounded-full bg-[#2D5A3D]/25 dark:bg-emerald-400/25" />
              </div>
              <div className="w-24 h-28 rounded-2xl glass-elevated liquid-rim z-10 flex flex-col items-center justify-center gap-1.5 text-[#2D5A3D] dark:text-emerald-300 shadow-xl">
                <Bookmark className="w-8 h-8 stroke-[1.8]" />
                <span className="text-[9px] font-black uppercase tracking-widest">Vault</span>
              </div>
              <div className="w-20 h-24 rounded-2xl glass-clear liquid-rim rotate-12 -ml-5 shadow-md flex items-end p-2">
                <span className="w-full h-2 rounded-full bg-[#2D5A3D]/25 dark:bg-emerald-400/25" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-display font-black text-[#152A1C] dark:text-white tracking-tight">
                {t('saved.emptyTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-[#57685D] dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                {t('saved.emptySubtitle')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {['Paris', 'Kyoto', 'Manali', 'Santorini'].map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => onPlanTripForDestination(city)}
                  className="min-h-0 glass-clear liquid-rim liquid-press px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#152A1C] dark:text-slate-200 hover:text-[#2D5A3D] dark:hover:text-emerald-300 cursor-pointer"
                >
                  Plan {city} →
                </button>
              ))}
            </div>

            <div>
              <LiquidButton
                variant="accent"
                size="lg"
                onClick={() => {
                  if (onExplore) {
                    onExplore();
                  } else {
                    onPlanTripForDestination('Udaipur');
                  }
                }}
              >
                <Compass className="w-4 h-4 text-emerald-200" />
                <span>{t('saved.planTrip')}</span>
              </LiquidButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Render Bookmarked Itineraries */}
          {(activeCategory === 'all' || activeCategory === 'itineraries') &&
            savedTrips.map((tr) => (
              <LiquidCard
                key={tr.id}
                outerRadius={28}
                innerPadding={8}
                className="flex flex-col justify-between group cursor-pointer"
                onClick={() => onSelectTrip(tr.id)}
              >
                <div>
                  <div className="p-2 pb-0">
                    <div className="relative h-44 liquid-concentric-inner overflow-hidden">
                      <img
                        src={
                          tr.destinationDetails?.image ||
                          'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80'
                        }
                        alt={tr.destination}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                      <div className="absolute top-2.5 right-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveWithUndo(tr.id, tr.name);
                          }}
                          className="min-h-0 p-2 rounded-full glass-clear liquid-press text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Remove itinerary from saved"
                          aria-label={`Remove ${tr.name} from saved`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="glass-clear-dark inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300 px-2.5 py-0.5 rounded-full mb-1">
                          <Route className="w-3 h-3" />
                          <span>Saved Itinerary • {tr.durationDays}d</span>
                        </span>
                        <h4 className="text-lg font-bold font-display truncate drop-shadow-md">{tr.name}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <p className="text-xs text-[#57685D] dark:text-slate-300 truncate">
                      {tr.origin} → {tr.destination} • {tr.travelersCount} {tr.travelersCount === 1 ? 'traveler' : 'travelers'}
                    </p>
                    <span className="text-xs font-extrabold text-[#2D5A3D] dark:text-emerald-400 block font-display tabular-nums">
                      Est. {formatCurrency(tr.estimatedTotal || tr.totalBudget, currency)}
                    </span>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <LiquidButton
                    variant="accent"
                    size="sm"
                    className="w-full py-2.5 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTrip(tr.id);
                    }}
                  >
                    <span>Open Itinerary</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </LiquidButton>
                </div>
              </LiquidCard>
            ))}

          {/* Render Destinations */}
          {(activeCategory === 'all' || activeCategory === 'destinations') &&
            savedDestinations.map((dest) => (
              <LiquidCard
                key={dest.id}
                outerRadius={28}
                innerPadding={8}
                className="flex flex-col justify-between group"
              >
                <div>
                  <div className="p-2 pb-0">
                    <div className="relative h-44 liquid-concentric-inner overflow-hidden">
                      <img
                        src={dest.image}
                        alt={dest.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                      <div className="absolute top-2.5 right-2.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveWithUndo(dest.id, dest.name)}
                          className="min-h-0 p-2 rounded-full glass-clear liquid-press text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Remove from saved"
                          aria-label={`Remove ${dest.name} from saved`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="glass-clear-dark inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-300 px-2 py-0.5 rounded-full mb-1">
                          Destination
                        </span>
                        <h4 className="text-lg font-bold font-display truncate drop-shadow-md">{dest.name}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-xs text-[#57685D] dark:text-slate-300 line-clamp-2 text-pretty">{dest.description}</p>
                    <span className="text-xs font-extrabold text-[#2D5A3D] dark:text-emerald-400 block font-display tabular-nums">
                      Starting from {formatCurrency(dest.startBudget, currency)}
                    </span>
                  </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <LiquidButton
                    variant="frosted"
                    size="sm"
                    className="w-full py-2.5 h-auto"
                    onClick={() => onSelectDestination?.(dest)}
                  >
                    Explore Details
                  </LiquidButton>

                  <LiquidButton
                    variant="accent"
                    size="sm"
                    className="w-full py-2.5 h-auto"
                    onClick={() => onPlanTripForDestination(dest.name)}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Plan Trip</span>
                  </LiquidButton>
                </div>
              </LiquidCard>
            ))}

          {/* Render Break Stops */}
          {(activeCategory === 'all' || activeCategory === 'breakstops') &&
            savedBreakStops.map((bs) => (
              <LiquidCard
                key={bs.id}
                outerRadius={28}
                innerPadding={8}
                className="flex flex-col justify-between group"
              >
                <div>
                  <div className="p-2 pb-0">
                    <div className="relative h-44 liquid-concentric-inner overflow-hidden">
                      <img
                        src={bs.image}
                        alt={bs.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={handleImageError}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                      <div className="absolute top-2.5 right-2.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveWithUndo(bs.id, bs.name)}
                          className="min-h-0 p-2 rounded-full glass-clear liquid-press text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Remove from saved"
                          aria-label={`Remove ${bs.name} from saved`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <span className="glass-clear-dark inline-block text-[10px] uppercase font-bold text-emerald-300 px-2 py-0.5 rounded-full mb-1">
                          Highway Break Stop
                        </span>
                        <h4 className="text-lg font-bold font-display">{bs.name}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-xs text-[#57685D] dark:text-slate-300 line-clamp-2">{bs.description}</p>
                    <div className="flex items-center gap-2 text-xs text-[#2D5A3D] dark:text-emerald-400 font-semibold tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{bs.rating} / 5.0 • {bs.detourDistanceKm} km detour</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="glass-clear rounded-xl text-xs text-[#2D5A3D] dark:text-emerald-300 font-semibold text-center py-2">
                    Saved Highway Waypoint
                  </div>
                </div>
              </LiquidCard>
            ))}
        </div>
      )}
    </div>
  );
};
