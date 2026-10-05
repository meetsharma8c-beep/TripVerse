import React, { useState, useEffect } from 'react';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { Destination } from '../../types/trip';
import { Star, ArrowRight, Sparkles, Compass, Bookmark } from 'lucide-react';
import { handleImageError } from '../../utils/destinationImages';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';

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
    { id: 'all', label: 'All Places' },
    { id: 'heritage', label: 'Culture & Royal' },
    { id: 'mountain', label: 'Mountains & Snow' },
    { id: 'nature', label: 'Nature & Hills' },
    { id: 'beach', label: 'Beaches & Chill' },
    { id: 'adventure', label: 'River & Thrill' },
    { id: 'spiritual', label: 'Spiritual & Sacred' }
  ];

  const filtered = activeCategory === 'all'
    ? POPULAR_DESTINATIONS
    : POPULAR_DESTINATIONS.filter(d => d.category === activeCategory);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#00B074] mb-1">
            <Compass className="w-4 h-4" />
            <span>Curated Indian Getaways</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-[#0B2545] tracking-tight">
            Popular Destinations
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Budget-tested routes with highway rest stops and handpicked heritage stays.
          </p>
        </div>

        <button
          onClick={onViewAllExplore}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#00B074] hover:text-[#009663] transition-colors group cursor-pointer self-start sm:self-auto"
        >
          <span>See All Destinations</span>
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
                ? 'bg-[#00B074] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Destination Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map((dest) => {
          const isSaved = savedItemIds.includes(dest.id);

          return (
            <div
              key={dest.id}
              className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col"
            >
              {/* Image Container */}
              <div className="relative h-56 overflow-hidden">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={handleImageError}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* Top badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-extrabold text-slate-800 shadow-xs">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{dest.rating}</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Verified</span>
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSaved(dest.id);
                    }}
                    className={`p-2.5 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
                      isSaved 
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'bg-white/90 text-slate-700 hover:bg-white'
                    }`}
                    aria-label="Save destination"
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                  </button>
                </div>

                {/* Bottom of Image: Name and Tagline */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="text-xl font-bold font-display leading-tight truncate drop-shadow-md">{dest.name}</h3>
                  <p className="text-xs text-emerald-300 font-semibold mt-0.5 truncate drop-shadow-sm">{dest.tagline}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3 text-pretty">
                    {dest.description}
                  </p>

                  <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100 text-xs mb-4 gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">
                        Est. Budget (Stays + Route)
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm font-display truncate block">
                        {formatCurrency(dest.startBudget, currency)}
                        <span className="text-[11px] font-normal text-slate-500 ml-0.5 font-sans">/person</span>
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider">Duration</span>
                      <span className="font-bold text-slate-800 text-xs">{dest.recommendedDuration}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => onSelectDestination(dest)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors text-center whitespace-nowrap truncate cursor-pointer"
                  >
                    Explore Details
                  </button>

                  <button
                    onClick={() => onPlanTripForDestination(dest.name)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-xs transition-all active:scale-95 whitespace-nowrap truncate cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Plan Trip</span>
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </section>
  );
};
