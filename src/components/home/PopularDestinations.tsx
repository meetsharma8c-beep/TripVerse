import React, { useState, useEffect, useRef, useCallback } from 'react';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { Destination } from '../../types/trip';
import { Star, ArrowRight, Sparkles, Compass, Bookmark, Calendar, Clock } from 'lucide-react';
import { handleImageError } from '../../utils/destinationImages';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { ScrollReveal } from '../common/ScrollReveal';

interface PopularDestinationsProps {
  onSelectDestination: (dest: Destination) => void;
  onPlanTripForDestination: (destName: string) => void;
  savedItemIds: string[];
  onToggleSaved: (id: string) => void;
  onViewAllExplore: () => void;
}

export const PopularDestinations: React.FC<PopularDestinationsProps> = ({
  onSelectDestination,
  onPlanTripForDestination,
  savedItemIds,
  onToggleSaved,
  onViewAllExplore
}) => {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());
  const filterStripRef = useRef<HTMLDivElement>(null);
  const [scrollFadeEdge, setScrollFadeEdge] = useState<'none' | 'right' | 'left'>('none');

  useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  const updateFilterFade = useCallback(() => {
    const el = filterStripRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 4) {
      setScrollFadeEdge('none');
      return;
    }

    const isRtl = getComputedStyle(el).direction === 'rtl';
    const remaining = maxScroll - Math.abs(el.scrollLeft);
    setScrollFadeEdge(remaining > 6 ? (isRtl ? 'left' : 'right') : 'none');
  }, []);

  useEffect(() => {
    updateFilterFade();
    window.addEventListener('resize', updateFilterFade, { passive: true });
    return () => window.removeEventListener('resize', updateFilterFade);
  }, [updateFilterFade]);

  const categories = [
    { id: 'all', label: t('cat.all') },
    { id: 'heritage', label: t('cat.culture') },
    { id: 'mountain', label: t('cat.mountains') },
    { id: 'nature', label: t('cat.nature') },
    { id: 'beach', label: t('cat.beaches') },
    { id: 'adventure', label: t('cat.adventure') },
    { id: 'spiritual', label: t('cat.spiritual') }
  ];

  const filtered = activeCategory === 'all'
    ? POPULAR_DESTINATIONS
    : POPULAR_DESTINATIONS.filter(d => d.category === activeCategory);

  const filterMaskStyle =
    scrollFadeEdge === 'right'
      ? {
          maskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent 100%)',
        }
      : scrollFadeEdge === 'left'
      ? {
          maskImage: 'linear-gradient(to left, black 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to left, black 88%, transparent 100%)',
        }
      : undefined;

  return (
    <section
      aria-labelledby="inspiring-destinations-heading"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D5A3D] mb-1">
            <Compass className="w-4 h-4 shrink-0" />
            <span>{t('dest.curatedEscapes')}</span>
          </div>
          <h2
            id="inspiring-destinations-heading"
            className="text-2xl sm:text-3xl font-display font-black text-[#152A1C] tracking-tight"
          >
            {t('dest.inspiringDestinations')}
          </h2>
          <p className="text-sm text-[#57685D] dark:text-slate-400 mt-1">
            {t('dest.budgetTested')}
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAllExplore}
          className="min-h-0 inline-flex items-center gap-1.5 py-1.5 text-sm font-bold text-[#2D5A3D] hover:text-[#244931] transition-colors group cursor-pointer self-start sm:self-auto"
        >
          <span>{t('dest.seeAll')}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Sticky Category Filter Bar (Positioned cleanly beneath sticky Navbar) */}
      <div className="sticky top-[calc(3.5rem+max(0.25rem,env(safe-area-inset-top,0px)))] sm:top-[calc(4rem+max(0.25rem,env(safe-area-inset-top,0px)))] xl:top-[calc(4.5rem+max(0.25rem,env(safe-area-inset-top,0px)))] z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 py-2.5 mb-5 sm:mb-6 bg-[#F8FAFC]/85 dark:bg-[#070C16]/85 backdrop-blur-md transition-colors">
        <div
          ref={filterStripRef}
          onScroll={updateFilterFade}
          role="group"
          aria-label="Destination categories"
          style={filterMaskStyle}
          className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5"
        >
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setActiveCategory(cat.id)}
                className={`min-h-[44px] py-2.5 px-4 rounded-full text-xs sm:text-sm whitespace-nowrap shrink-0 flex items-center justify-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4631]/40 dark:focus-visible:ring-emerald-400/50 active:scale-95 ${
                  isSelected
                    ? 'bg-[#1E4631] dark:bg-[#2A6040] text-white font-semibold shadow-xs'
                    : 'bg-slate-100/95 hover:bg-slate-200/95 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-medium'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Destination Grid (1 col mobile, 2 cols tablet, 3 cols laptop, 4 cols desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
        {filtered.map((dest, idx) => {
          const isSaved = savedItemIds.includes(dest.id);
          const regionLabel =
            dest.country && dest.country !== 'India'
              ? `${dest.state ? `${dest.state}, ` : ''}${dest.country}`
              : dest.state;

          return (
            <ScrollReveal
              key={dest.id}
              delayMs={(idx % 4) * 55}
              className="h-full"
            >
              <article
                onClick={() => onSelectDestination(dest)}
                className="group h-full flex flex-col bg-white dark:bg-[#0E1726] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#E2EBE1] dark:border-white/10 shadow-2xs hover:shadow-xl hover:border-[#2D5A3D]/60 dark:hover:border-emerald-500/40 card-elevate cursor-pointer"
              >
                {/* Top Photo Area (~55-60% card weight) */}
                <div className="relative h-52 sm:h-auto sm:aspect-[4/3] w-full overflow-hidden bg-slate-200 dark:bg-slate-800 shrink-0">
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    loading="lazy"
                    onError={handleImageError}
                  />
                  {/* Subtle top vignette for badge legibility over bright skies */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/10"
                  />

                  {/* Top-left Frosted Rating & 3D Pills */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 bg-white/85 dark:bg-slate-900/75 backdrop-blur-md text-[#152A1C] dark:text-slate-100 text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs border border-white/40 dark:border-white/10">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span>{dest.rating}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 bg-black/45 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/15">
                      <Sparkles className="w-2.5 h-2.5 shrink-0" />
                      <span>3D</span>
                    </span>
                  </div>

                  {/* Top-right Save / Bookmark Action */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSaved(dest.id);
                    }}
                    aria-label={t('dest.save')}
                    aria-pressed={isSaved}
                    className={`min-h-0 absolute top-3 right-3 w-10 h-10 sm:w-[42px] sm:h-[42px] flex items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                      isSaved
                        ? 'bg-[#1E4631] dark:bg-[#2A6040] text-white shadow-md'
                        : 'bg-white/85 dark:bg-slate-900/75 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 border border-white/40 dark:border-white/10 shadow-xs'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Bottom Card Content Area */}
                <div className="flex-1 flex flex-col p-4 sm:p-5">
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDestination(dest);
                      }}
                      className="min-h-0 block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4631]/40 dark:focus-visible:ring-emerald-400/50 rounded-md cursor-pointer"
                    >
                      <h3 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-snug truncate group-hover:text-[#1E4631] dark:group-hover:text-emerald-400 transition-colors">
                        {dest.name}
                      </h3>
                    </button>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      {regionLabel}
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2.5 leading-relaxed text-pretty">
                      {dest.description}
                    </p>
                  </div>

                  {/* Metadata & Bottom Action Row pinned cleanly for uniform card heights */}
                  <div className="mt-auto pt-3">
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 py-2 border-t border-b border-slate-100 dark:border-slate-800/80">
                      <span className="inline-flex items-center gap-1 min-w-0 truncate">
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{dest.recommendedDuration}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 min-w-0 truncate">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{dest.bestTime || dest.recommendedDuration}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2.5 pt-3">
                      <div className="min-w-0 leading-tight">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                          {t('dest.from')}
                        </span>
                        <div className="flex items-baseline gap-0.5 truncate">
                          <span className="text-[15px] sm:text-base font-extrabold text-[#1E4631] dark:text-emerald-400 font-display tracking-tight">
                            {formatCurrency(dest.startBudget, currency)}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                            {t('dest.perPerson')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlanTripForDestination(dest.name);
                        }}
                        className="group/cta shrink-0 inline-flex items-center gap-1.5 bg-[#1E4631] hover:bg-[#153122] dark:bg-[#2A6040] dark:hover:bg-[#31704B] text-white text-[11px] sm:text-xs font-semibold px-3.5 py-2 min-h-[38px] sm:min-h-[40px] rounded-xl shadow-xs transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E4631]/40 dark:focus-visible:ring-emerald-400/50 cursor-pointer whitespace-nowrap"
                      >
                        <span>{t('dest.planTrip')}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};
