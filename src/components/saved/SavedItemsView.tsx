import React, { useState } from 'react';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { HIGHWAY_BREAK_STOPS } from '../../data/highwayFacilities';
import { Trip, Destination } from '../../types/trip';
import { Bookmark, Trash2, Sparkles, Star, Compass } from 'lucide-react';
import { handleImageError, synthesizeDestination } from '../../utils/destinationImages';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { resolveGlobalDestination } from '../../services/globalLocationResolver';
import { LiquidCard, LiquidTabs, LiquidButton } from '../ui/liquid';

interface SavedItemsViewProps {
  savedItemIds: string[];
  trips: Trip[];
  onToggleSaved: (id: string) => void;
  onSelectTrip: (tripId: string) => void;
  onPlanTripForDestination: (destName: string) => void;
  onSelectDestination?: (dest: Destination) => void;
}

export const SavedItemsView: React.FC<SavedItemsViewProps> = ({
  savedItemIds,
  onToggleSaved,
  onPlanTripForDestination,
  onSelectDestination
}) => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<'all' | 'destinations' | 'breakstops'>('all');
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  React.useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  const [enrichedCustomDestinations, setEnrichedCustomDestinations] = useState<Record<string, Destination>>({});

  const savedBreakStops = HIGHWAY_BREAK_STOPS.filter(bs => savedItemIds.includes(bs.id));
  const savedCatalogDestinations = POPULAR_DESTINATIONS.filter(d => savedItemIds.includes(d.id));

  // Reconstruct any saved worldwide/custom destination ID (e.g., dest-reykjavik, dest-queenstown)
  const customDestinationIds = savedItemIds.filter(
    id =>
      !POPULAR_DESTINATIONS.some(d => d.id === id) &&
      !HIGHWAY_BREAK_STOPS.some(bs => bs.id === id)
  );

  React.useEffect(() => {
    let cancelled = false;
    customDestinationIds.forEach(id => {
      if (enrichedCustomDestinations[id]) return;
      const rawName = id
        .replace(/^(dest|custom|osm|wiki)-/i, '')
        .split('-')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (!rawName) return;
      resolveGlobalDestination(rawName)
        .then(resolved => {
          if (cancelled || !resolved) return;
          setEnrichedCustomDestinations(prev => ({
            ...prev,
            [id]: {
              ...synthesizeDestination(resolved.name, resolved),
              id
            }
          }));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [savedItemIds.join(',')]);

  const savedCustomDestinations: Destination[] = customDestinationIds.map(id => {
    if (enrichedCustomDestinations[id]) return enrichedCustomDestinations[id];
    const rawName = id
      .replace(/^(dest|custom|osm|wiki)-/i, '')
      .split('-')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      ...synthesizeDestination(rawName || id),
      id
    };
  });

  const savedDestinations = [...savedCatalogDestinations, ...savedCustomDestinations];
  const totalSaved = savedDestinations.length + savedBreakStops.length;

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
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 block">Stops</span>
              <span className="text-base font-black font-display text-[#2D5A3D] dark:text-emerald-400 tabular-nums">{savedBreakStops.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Morphing Category Tabs */}
      <div className="overflow-x-auto scrollbar-none pb-1">
        <LiquidTabs
          items={[
            { id: 'all', label: `${t('saved.allItems')} (${totalSaved})` },
            { id: 'destinations', label: `${t('saved.destinations')} (${savedDestinations.length})` },
            { id: 'breakstops', label: `${t('saved.breakstops')} (${savedBreakStops.length})` },
          ]}
          activeId={activeCategory}
          onSelect={(id) => setActiveCategory(id as any)}
          ariaLabel="Filter saved items"
        />
      </div>

      {totalSaved === 0 ? (
        <div className="relative glass-frosted liquid-rim liquid-topo-wash rounded-[32px] p-8 sm:p-12 overflow-hidden animate-fade-in">
          <div className="max-w-xl mx-auto text-center space-y-6 relative z-10">
            {/* Layered Floating Glass Postcard Silhouettes */}
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
              <LiquidButton variant="accent" size="lg" onClick={() => onPlanTripForDestination('Paris')}>
                <Compass className="w-4 h-4 text-emerald-200" />
                <span>{t('saved.planTrip')}</span>
              </LiquidButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Render Destinations */}
          {(activeCategory === 'all' || activeCategory === 'destinations') &&
            savedDestinations.map(dest => (
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
                          onClick={() => onToggleSaved(dest.id)}
                          className="min-h-0 p-2 rounded-full glass-clear liquid-press text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Remove from saved"
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
            savedBreakStops.map(bs => (
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
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                      <div className="absolute top-2.5 right-2.5">
                        <button
                          type="button"
                          onClick={() => onToggleSaved(bs.id)}
                          className="min-h-0 p-2 rounded-full glass-clear liquid-press text-rose-600 dark:text-rose-400 cursor-pointer"
                          title="Remove from saved"
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
                    Added to active highway stops
                  </div>
                </div>
              </LiquidCard>
            ))}

        </div>
      )}

    </div>
  );
};
