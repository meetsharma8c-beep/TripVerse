import React, { useState, useEffect } from 'react';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { Destination } from '../../types/trip';
import { Star, ArrowRight, Sparkles, Compass, Bookmark, Calendar } from 'lucide-react';
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

  useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

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

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Section Header (Matching Reference Image Screen 1) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D5A3D] mb-1">
            <Compass className="w-4 h-4" />
            <span>{t('dest.curatedEscapes')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-[#152A1C] tracking-tight">
            {t('dest.inspiringDestinations')}
          </h2>
          <p className="text-sm text-[#57685D] mt-1">
            {t('dest.budgetTested')}
          </p>
        </div>

        <button
          onClick={onViewAllExplore}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#2D5A3D] hover:text-[#244931] transition-colors group cursor-pointer self-start sm:self-auto"
        >
          <span>{t('dest.seeAll')}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {/* Category Pills with 44px touch targets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center ${
              activeCategory === cat.id
                ? 'bg-[#2D5A3D] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-[#DCE7DB] hover:border-[#2D5A3D] hover:bg-[#F4F6F2]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Destination Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((dest, idx) => {
          const isSaved = savedItemIds.includes(dest.id);

          return (
            <ScrollReveal
              key={dest.id}
              delayMs={(idx % 4) * 55}
              className="group bg-white rounded-3xl overflow-hidden border border-[#E2EBE1] shadow-sm hover:shadow-xl hover:border-[#2D5A3D] card-elevate flex flex-col"
            >
              {/* Image Container with bleed, dark gradient & action arrow (Matching Reference Image) */}
              <div 
                role="button"
                tabIndex={0}
                aria-label={`View itinerary and details for ${dest.name}`}
                className="relative h-64 sm:h-72 overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
                onClick={() => onSelectDestination(dest)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectDestination(dest);
                  }
                }}
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={handleImageError}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                {/* Top badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-extrabold text-[#152A1C] shadow-xs">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{dest.rating}</span>
                      <span className="text-[10px] text-[#2D5A3D] font-bold">{t('dest.curated')}</span>
                    </span>

                    <span className="flex items-center gap-1 bg-emerald-950/70 text-emerald-300 border border-emerald-400/30 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider shadow-xs">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>3D</span>
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSaved(dest.id);
                    }}
                    className={`p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
                      isSaved 
                        ? 'bg-[#2D5A3D] text-white shadow-md' 
                        : 'bg-white/90 text-slate-700 hover:bg-white'
                    }`}
                    aria-label={t('dest.save')}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                  </button>
                </div>

                {/* Bottom of Image: Frosted Glass Caption with Name, State & Reference Circular Arrow Button */}
                <div className="absolute bottom-3 left-3 right-3 p-3 rounded-2xl bg-black/40 backdrop-blur-md border border-white/20 flex items-end justify-between gap-2 text-white shadow-lg">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold font-display leading-tight truncate">{dest.name}</h3>
                    <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
                      {dest.country && dest.country !== 'India' ? `${dest.state ? `${dest.state}, ` : ''}${dest.country}` : dest.state}
                    </p>
                  </div>

                  {/* Circular White Arrow Button (Matching Reference Image) */}
                  <div 
                    className="w-8 h-8 rounded-full bg-white text-[#152A1C] flex items-center justify-center shadow-md shrink-0 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all"
                    title={`View ${dest.name}`}
                  >
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[#57685D] line-clamp-2 leading-relaxed mb-3 text-pretty">
                    {dest.description}
                  </p>

                  <div className="py-2.5 px-3 rounded-2xl bg-[#F4F6F2] border border-[#E2EBE1] text-xs mb-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] uppercase font-bold text-[#57685D] block tracking-wider">
                          {t('dest.typicalCost')}
                        </span>
                        <span className="font-extrabold text-[#152A1C] text-sm font-display truncate block">
                          {t('dest.from')}{formatCurrency(dest.startBudget, currency)}
                          <span className="text-[11px] font-normal text-[#57685D] ml-0.5 font-sans">{t('dest.perPerson')}</span>
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] uppercase font-bold text-[#57685D] block tracking-wider">{t('dest.idealWindow')}</span>
                        <span className="font-bold text-[#2D5A3D] text-xs flex items-center justify-end gap-1">
                          <Calendar className="w-3 h-3 text-[#2D5A3D] shrink-0" />
                          <span>{dest.bestTime || dest.recommendedDuration}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-medium text-[#57685D] pt-1.5 border-t border-[#E2EBE1]/80">
                      <span>{t('dest.suggested')} {dest.recommendedDuration}</span>
                      <span className="text-[#2D5A3D] font-bold">{t('dest.customizable')}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2EBE1]">
                  <button
                    onClick={() => onSelectDestination(dest)}
                    className="py-2.5 px-3 rounded-xl bg-[#E8EFE7] hover:bg-[#DCE7DB] text-[#2D5A3D] font-bold text-xs transition-all active:scale-95 text-center whitespace-nowrap truncate cursor-pointer"
                  >
                    {t('dest.exploreDetails')}
                  </button>

                  <button
                    onClick={() => onPlanTripForDestination(dest.name)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-xs transition-all active:scale-95 whitespace-nowrap truncate cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t('dest.planTrip')}</span>
                  </button>
                </div>
              </div>

            </ScrollReveal>
          );
        })}
      </div>

    </section>
  );
};
