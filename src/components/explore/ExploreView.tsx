import React, { useState, useEffect, useMemo, useRef } from 'react';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { Destination, UserProfile } from '../../types/trip';
import { Search, Compass, Star, Sparkles, Bookmark, Crown, ArrowRight, Copy } from 'lucide-react';
import { COMMUNITY_ITINERARIES, CreatorItinerary } from '../../services/communityItinerariesService';
import { triggerHaptic } from '../../services/deviceService';
import confetti from 'canvas-confetti';
import { handleImageError, synthesizeDestination } from '../../utils/destinationImages';
import { isValidPlaceQuery } from '../../utils/routeResolver';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { resolveGlobalDestination } from '../../services/globalLocationResolver';
import { DestinationDetailModal } from './DestinationDetailModal';
import { ScrollReveal } from '../common/ScrollReveal';
import { LiquidChip, LiquidSearchDock } from '../ui/liquid';

interface ExploreViewProps {
  onPlanTripForDestination: (destName: string) => void;
  savedItemIds: string[];
  onToggleSaved: (id: string) => void;
  userProfile?: UserProfile;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onPlanTripForDestination,
  savedItemIds,
  onToggleSaved,
  userProfile
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [activeModalDest, setActiveModalDest] = useState<Destination | null>(null);
  const [liveResolvedDest, setLiveResolvedDest] = useState<Destination | null>(null);
  const [isResolvingGlobal, setIsResolvingGlobal] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());
  const filterSectionRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleSelectTag = (tagId: string) => {
    setSelectedTag(tagId);
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (gridRect && (gridRect.top < 88 || gridRect.top > window.innerHeight * 0.9)) {
      window.requestAnimationFrame(() => {
        filterSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const handleCloneCreatorItinerary = (itinerary: CreatorItinerary, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('success');
    try {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#2D5A3D', '#D4AF37', '#10B981']
      });
    } catch {}
    onPlanTripForDestination(itinerary.destination);
  };

  useEffect(() => {
    let isCurrent = true;
    const trimmed = searchQuery.trim();
    // Always clear stale async destination immediately when the query changes
    setLiveResolvedDest(null);
    if (!isValidPlaceQuery(trimmed)) {
      setIsResolvingGlobal(false);
      return;
    }

    const hasExactCatalog = POPULAR_DESTINATIONS.some(
      d => d.name.toLowerCase().includes(trimmed.toLowerCase()) ||
           d.state.toLowerCase().includes(trimmed.toLowerCase())
    );
    if (hasExactCatalog) {
      setIsResolvingGlobal(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsResolvingGlobal(true);
      try {
        const globalInfo = await resolveGlobalDestination(trimmed);
        if (!isCurrent) return;
        const baseSynth = synthesizeDestination(
          globalInfo.name || trimmed,
          globalInfo.coordinates,
          undefined,
          globalInfo.state !== 'Region' ? globalInfo.state : globalInfo.country
        );
        setLiveResolvedDest({
          ...baseSynth,
          name: globalInfo.name || baseSynth.name,
          state: globalInfo.state !== 'Region' ? globalInfo.state : baseSynth.state,
          country: globalInfo.country || baseSynth.country,
          description: globalInfo.description || baseSynth.description,
          image: globalInfo.image || baseSynth.image,
          coordinates: globalInfo.coordinates || baseSynth.coordinates,
          popularActivities: globalInfo.highlights?.length > 0 ? globalInfo.highlights : baseSynth.popularActivities
        });
      } catch {
        // Fallback to synchronous synthesis
      } finally {
        if (isCurrent) setIsResolvingGlobal(false);
      }
    }, 280);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  // Compute smart recommendations personalized for the user's travel style & budget
  const recommendedDestinations = useMemo(() => {
    const style = userProfile?.travelerStyle?.toLowerCase() || 'explorer';
    const food = userProfile?.foodPreference?.toLowerCase() || '';

    return [...POPULAR_DESTINATIONS].sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      if (style.includes('budget') || style.includes('backpacker')) {
        if (a.startBudget <= 10000) scoreA += 3;
        if (b.startBudget <= 10000) scoreB += 3;
      } else if (style.includes('luxury')) {
        if (a.category === 'heritage' || a.category === 'beach') scoreA += 3;
        if (b.category === 'heritage' || b.category === 'beach') scoreB += 3;
      } else if (style.includes('adventure')) {
        if (a.category === 'adventure' || a.category === 'mountain') scoreA += 3;
        if (b.category === 'adventure' || b.category === 'mountain') scoreB += 3;
      }
      if (food.includes('veg') && (a.category === 'heritage' || a.category === 'spiritual')) scoreA += 1;
      if (food.includes('veg') && (b.category === 'heritage' || b.category === 'spiritual')) scoreB += 1;
      return scoreB - scoreA;
    }).slice(0, 3);
  }, [userProfile]);

  const filterTabs = [
    { id: 'all', label: t('cat.all') },
    { id: 'trending', label: t('cat.trending') },
    { id: 'budget', label: t('cat.budget') },
    { id: 'weekend', label: t('cat.weekend') },
    { id: 'roadtrip', label: t('cat.roadtrip') },
    { id: 'heritage', label: t('cat.culture') },
    { id: 'mountain', label: t('cat.snowValleys') },
    { id: 'beach', label: t('cat.beaches') },
    { id: 'nature', label: t('cat.nature') },
    { id: 'spiritual', label: t('cat.spiritual') },
    { id: 'adventure', label: t('cat.adventure') },
  ];

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filtered = POPULAR_DESTINATIONS.filter(dest => {
    const matchesSearch = !normalizedSearch ||
                          dest.name.toLowerCase().includes(normalizedSearch) ||
                          dest.state.toLowerCase().includes(normalizedSearch) ||
                          dest.tagline.toLowerCase().includes(normalizedSearch);

    if (!matchesSearch) return false;

    if (selectedTag === 'all') return true;
    if (selectedTag === 'trending') return dest.rating >= 4.8;
    if (selectedTag === 'budget') return dest.startBudget <= 10000;
    if (selectedTag === 'weekend') return dest.recommendedDuration.includes('2 - 3') || dest.recommendedDuration.includes('3') || dest.category === 'weekend';
    if (selectedTag === 'roadtrip') return dest.category === 'roadtrip' || dest.category === 'heritage';
    if (selectedTag === 'heritage') return dest.category === 'heritage';
    if (selectedTag === 'mountain') return dest.category === 'mountain';
    if (selectedTag === 'beach') return dest.category === 'beach';
    if (selectedTag === 'nature') return dest.category === 'nature';
    if (selectedTag === 'spiritual') return dest.category === 'spiritual';
    if (selectedTag === 'adventure') return dest.category === 'adventure';

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Cinematic Smoked-Glass Atlas Banner with Topographic Contours */}
      <div className="bg-gradient-to-br from-[#102317] via-[#1E422B] to-[#152A1C] rounded-[32px] p-6 sm:p-10 text-white shadow-[0_24px_60px_-14px_rgba(21,42,28,0.45)] border border-white/15 liquid-rim relative overflow-hidden">
        {/* Delicate Topographic Contour SVG Overlay */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 w-[440px] h-[320px] text-emerald-200/[0.09]"
          viewBox="0 0 440 320"
          fill="none"
        >
          <path d="M20 280 C120 190, 210 250, 310 140 S 400 70, 430 20" stroke="currentColor" strokeWidth="1.5" />
          <path d="M60 300 C160 215, 240 270, 345 165 S 415 95, 440 55" stroke="currentColor" strokeWidth="1.5" />
          <path d="M100 315 C200 240, 275 285, 375 190 S 430 125, 450 90" stroke="currentColor" strokeWidth="1.5" />
          <path d="M40 240 C150 120, 260 180, 380 80" stroke="currentColor" strokeWidth="2" className="liquid-route-trace" />
        </svg>

        <div className="max-w-2xl relative z-10 space-y-3.5">
          <span className="glass-clear-dark inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-200 px-3 py-1 rounded-full">
            <Compass className="w-3.5 h-3.5 text-emerald-300" />
            <span>{t('explore.discoveryBadge')}</span>
          </span>
          <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight leading-[1.06]">
            {t('explore.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[#DCEAD9] font-normal leading-relaxed max-w-xl">
            {t('explore.subtitle')}
          </p>

          {/* Optical Capsule Search Dock */}
          <div className="pt-2">
            <LiquidSearchDock className="py-1.5 pr-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Search className="w-5 h-5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('explore.searchPlaceholder')}
                  className="w-full py-2 bg-transparent text-[#152A1C] dark:text-white placeholder:text-[#57685D] dark:placeholder:text-slate-400 font-semibold text-sm focus:outline-none border-0 ring-0 shadow-none"
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="min-h-0 px-3 py-1.5 rounded-full glass-clear text-xs font-bold text-[#2D5A3D] dark:text-emerald-300 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </LiquidSearchDock>
          </div>
        </div>

        {/* Soft ambient emerald mist glow */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-400/15 to-transparent pointer-events-none" />
      </div>

      {/* Filter Tabs with Clear Scroll Affordance */}
      <div ref={filterSectionRef} className="relative scroll-mt-20 sm:scroll-mt-24">
        <div className="liquid-scroll-mask flex items-center gap-2 overflow-x-auto px-1 py-1.5 pb-3 scrollbar-none">
          {filterTabs.map(tab => (
            <LiquidChip
              key={tab.id}
              active={selectedTag === tab.id}
              onClick={() => handleSelectTag(tab.id)}
            >
              {tab.label}
            </LiquidChip>
          ))}
        </div>
      </div>

      {/* Personalized Recommendations Section */}
      {selectedTag === 'all' && !searchQuery.trim() && recommendedDestinations.length > 0 && (
        <div className="glass-frosted liquid-rim rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#2D5A3D] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display text-[#152A1C] dark:text-white">
                  {t('explore.recommendedStyle')}
                </h3>
                <p className="text-xs text-[#5A7362] dark:text-slate-400">
                  {t('explore.tailoredTo', { style: userProfile?.travelerStyle || 'explorer' })}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#2D5A3D] dark:text-emerald-300 bg-[#E8EFE7] dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-[#8EA78D]/30 dark:border-emerald-800/40 self-start sm:self-auto">
              {t('explore.styleMatch')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedDestinations.map(dest => {
              const isSaved = savedItemIds.includes(dest.id);
              return (
                <div
                  key={`rec-${dest.id}`}
                  onClick={() => setActiveModalDest(dest)}
                  className="bg-white dark:bg-slate-900/60 rounded-2xl p-3 border border-[#E2EBE1] dark:border-slate-800 hover:border-[#2D5A3D] dark:hover:border-emerald-600 hover:shadow-[0_8px_25px_rgba(45,90,61,0.08)] transition-all duration-200 flex gap-3.5 items-center cursor-pointer group"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 relative">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      decoding="async"
                      onError={handleImageError}
                    />
                    <span className="absolute bottom-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1 rounded flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                      <span>{dest.rating}</span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[#152A1C] dark:text-white truncate group-hover:text-[#2D5A3D] dark:group-hover:text-emerald-400 transition-colors">
                        {dest.name}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSaved(dest.id);
                        }}
                        className={`p-1 rounded-full ${isSaved ? 'text-[#2D5A3D]' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-[#2D5A3D]' : ''}`} />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#5A7362] truncate">{dest.tagline}</p>
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="font-bold text-[#2D5A3D] text-xs">
                        From {formatCurrency(dest.startBudget, currency)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanTripForDestination(dest.name);
                        }}
                        className="text-[10px] font-bold text-[#2D5A3D] bg-[#EAF0E9] hover:bg-[#DCE7DB] px-2.5 py-1 rounded-lg border border-[#DCE7DB] transition-colors"
                      >
                        Plan
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Featured Creator Playbooks & Community Itineraries */}
      {selectedTag === 'all' && !searchQuery.trim() && (
        <div className="bg-gradient-to-br from-[#122B1E] via-[#1A3D2B] to-[#0E2419] text-white rounded-3xl p-5 sm:p-6 border border-emerald-500/30 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                <Crown className="w-4 h-4 fill-slate-950" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-amber-200">
                  Creator Playbooks & Verified Itineraries
                </h3>
                <p className="text-xs text-emerald-200/80">
                  Pre-crafted journeys by local explorers and the Founder. 1-click clone to your trips.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-400/20 border border-amber-300/40 px-3 py-1 rounded-full self-start sm:self-auto">
              Ready to Clone
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {COMMUNITY_ITINERARIES.map(itinerary => (
              <div
                key={itinerary.id}
                className="bg-black/30 backdrop-blur-md rounded-2xl overflow-hidden border border-emerald-500/20 hover:border-amber-400/50 transition-all flex flex-col justify-between group shadow-xs"
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={itinerary.coverImage}
                    alt={itinerary.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    {itinerary.isFounder && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-slate-950 flex items-center gap-0.5 shadow-xs">
                        <Crown className="w-3 h-3 fill-slate-950" />
                        VIP FOUNDER
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/75 text-emerald-300">
                      {itinerary.durationDays} Days
                    </span>
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-left">
                    <span className="text-[10px] text-amber-300 font-mono block">{itinerary.vibe}</span>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{itinerary.title}</h4>
                  </div>
                </div>

                <div className="p-3 space-y-2.5 flex-1 flex flex-col justify-between text-left">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span className="flex items-center gap-1">
                        <span>{itinerary.avatar}</span>
                        <strong className="text-white">{itinerary.author}</strong>
                      </span>
                      <span className="text-amber-300 font-bold">★ {itinerary.rating}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {itinerary.highlights.join(' • ')}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-300">
                      ~{itinerary.estimatedCost}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCloneCreatorItinerary(itinerary, e)}
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Clone Itinerary</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destination Grid */}
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((dest, idx) => {
          const isSaved = savedItemIds.includes(dest.id);

          return (
            <ScrollReveal
              key={dest.id}
              delayMs={(idx % 4) * 55}
              className="tv-cv-card bg-white dark:bg-[#0C1523] rounded-[28px] overflow-hidden border border-[#E2EBE1] dark:border-slate-800 shadow-[0_4px_20px_rgba(45,90,61,0.05)] hover:shadow-[0_16px_36px_rgba(45,90,61,0.12)] hover:border-[#2D5A3D] dark:hover:border-emerald-600 card-elevate flex flex-col justify-between group cursor-pointer"
            >
              <div 
                role="button"
                tabIndex={0}
                aria-label={`View details for ${dest.name}`}
                onClick={() => setActiveModalDest(dest)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveModalDest(dest);
                  }
                }}
                className="flex-1 flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
              >
              <div>
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={handleImageError}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 px-2.5 py-1 rounded-full text-xs font-extrabold text-[#152A1C] dark:text-white shadow-xs">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{dest.rating}</span>
                    </span>

                    <button
                      type="button"
                      aria-label={isSaved ? `Remove ${dest.name} from saved` : `Save ${dest.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSaved(dest.id);
                      }}
                      className={`w-10 h-10 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all shadow-xs liquid-press cursor-pointer ${
                        isSaved ? 'bg-[#2D5A3D] text-white' : 'bg-white/95 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isSaved ? 'fill-white' : ''}`} />
                    </button>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-black/45 backdrop-blur-md border border-white/20 flex items-end justify-between gap-2 text-white shadow-lg">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold font-display truncate leading-tight">{dest.name}</h3>
                      <p className="text-xs text-white/80 font-medium truncate mt-0.5">{dest.state || dest.tagline}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-[11px] font-bold text-white bg-[#2D5A3D]/90 px-2.5 py-1 rounded-full border border-white/20 shadow-xs">
                        {formatCurrency(dest.startBudget, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#F4F6F2] dark:bg-slate-900/60 border border-[#E2EBE1] dark:border-slate-800 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="badge-caps text-[#5A7362] dark:text-slate-400 block">{t('dest.typicalCost')}</span>
                      <span className="font-bold text-[#152A1C] dark:text-white text-xs font-display truncate block">
                        {t('dest.from')}{formatCurrency(dest.startBudget, currency)}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="badge-caps text-[#5A7362] dark:text-slate-400 block">{t('dest.idealWindow')}</span>
                      <span className="font-semibold text-[#152A1C] dark:text-slate-300 text-xs">{dest.bestTime}</span>
                    </div>
                  </div>

                  {/* Popular Activities Tag Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {dest.popularActivities.slice(0, 2).map(act => (
                      <span key={act} className="text-[10px] font-semibold text-[#5A7362] dark:text-slate-300 bg-[#EAF0E9] dark:bg-slate-800 border border-[#DCE7DB] dark:border-slate-700 px-2 py-0.5 rounded-full truncate max-w-[130px]">
                        {act}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModalDest(dest);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-[#F4F6F2] dark:bg-slate-800/80 hover:bg-[#EAF0E9] dark:hover:bg-slate-700 text-[#152A1C] dark:text-slate-200 border border-[#E2EBE1] dark:border-slate-700 font-bold text-xs transition-colors text-center whitespace-nowrap truncate cursor-pointer"
                >
                  {t('dest.exploreDetails')}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlanTripForDestination(dest.name);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl btn-liquid-primary text-white font-bold text-xs shadow-xs transition-all active:scale-95 whitespace-nowrap truncate cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t('dest.planTrip')}</span>
                </button>
              </div>
              </div>

            </ScrollReveal>
          );
        })}

        {filtered.length === 0 && searchQuery.trim().length > 0 && (() => {
          const trimmed = searchQuery.trim();
          if (!isValidPlaceQuery(trimmed)) {
            return (
              <div className="col-span-full py-12 text-center space-y-3 liquid-glass rounded-3xl p-6">
                <Compass className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">
                  No matching destinations found
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Enter a valid city, state, country, or landmark name (e.g. Kyoto, Goa, New Jersey, Swiss Alps).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold hover:bg-[#234730] transition-colors cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            );
          }
          const synthesized = liveResolvedDest || synthesizeDestination(trimmed);
          const isSaved = savedItemIds.includes(synthesized.id);
          return (
            <div className="col-span-full bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 rounded-3xl p-6 sm:p-8 border border-emerald-200/80 shadow-md">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div 
                  onClick={() => setActiveModalDest(synthesized)}
                  className="relative w-full md:w-72 h-52 rounded-2xl overflow-hidden flex-shrink-0 shadow-md cursor-pointer group"
                >
                  <img
                    src={synthesized.image}
                    alt={synthesized.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={handleImageError}
                  />
                  <div className="absolute top-2.5 left-2.5 bg-[#2D5A3D] text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3" />
                    <span>{isResolvingGlobal ? 'Discovering Global Spot...' : 'Global AI Destination'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSaved(synthesized.id);
                    }}
                    className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all shadow-xs ${
                      isSaved ? 'bg-[#2D5A3D] text-white' : 'bg-white/90 text-slate-700 hover:bg-white'
                    }`}
                    title={isSaved ? 'Saved' : 'Save Destination'}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
                  </button>
                </div>

                <div className="space-y-3 flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                      {synthesized.country && synthesized.country !== 'Worldwide'
                        ? `${synthesized.state ? `${synthesized.state}, ` : ''}${synthesized.country}`
                        : 'Worldwide Destination Detected'}
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {synthesized.coordinates.lat.toFixed(4)}°, {synthesized.coordinates.lng.toFixed(4)}°
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Ready for AI Itinerary</span>
                  </div>

                  <h3 className="text-2xl font-display font-black text-[#0B2545]">
                    Plan a Trip to {synthesized.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                    {synthesized.description}
                  </p>

                  {/* Spot Highlights */}
                  {synthesized.popularActivities && synthesized.popularActivities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {synthesized.popularActivities.slice(0, 5).map((act, idx) => (
                        <span key={idx} className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                          {act}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 pt-1">
                    <span>Est. Budget: <strong className="text-[#2D5A3D] font-display">{formatCurrency(synthesized.startBudget, currency)}</strong>/person</span>
                    <span>Duration: <strong>{synthesized.recommendedDuration}</strong></span>
                    <span>Best Season: <strong>{synthesized.bestTime}</strong></span>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveModalDest(synthesized)}
                      className="px-5 py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#152A1C] dark:text-white border border-slate-300 dark:border-slate-700 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
                    >
                      Explore {synthesized.name} Guide
                    </button>
                    <button
                      type="button"
                      onClick={() => onPlanTripForDestination(synthesized.name)}
                      className="px-6 py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Complete Itinerary for {synthesized.name}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {filtered.length === 0 && searchQuery.trim().length === 0 && (
          <div className="col-span-full py-12 text-center space-y-3">
            <Compass className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">No destinations in this category</h4>
            <p className="text-xs text-slate-400">Try selecting another filter or search any destination name.</p>
            <button
              onClick={() => handleSelectTag('all')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
            >
              Show All Places
            </button>
          </div>
        )}
      </div>

      {/* Destination Detail Modal */}
      <DestinationDetailModal
        destination={activeModalDest}
        isOpen={!!activeModalDest}
        onClose={() => setActiveModalDest(null)}
        onPlanTrip={(destName) => {
          setActiveModalDest(null);
          onPlanTripForDestination(destName);
        }}
        isSaved={activeModalDest ? savedItemIds.includes(activeModalDest.id) : false}
        onToggleSaved={onToggleSaved}
      />

    </div>
  );
};
