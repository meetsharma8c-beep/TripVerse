import React, { useState, useEffect, useMemo } from 'react';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { Destination, UserProfile } from '../../types/trip';
import { 
  Search, 
  Compass, 
  Star, 
  MapPin, 
  Calendar, 
  Wallet, 
  Sparkles, 
  ArrowRight,
  Bookmark,
  X,
  Check,
  Plus
} from 'lucide-react';
import { handleImageError, synthesizeDestination } from '../../utils/destinationImages';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { DestinationDetailModal } from './DestinationDetailModal';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [activeModalDest, setActiveModalDest] = useState<Destination | null>(null);
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

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
        if (a.startBudget <= 3500) scoreA += 3;
        if (b.startBudget <= 3500) scoreB += 3;
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
    { id: 'all', label: 'All Places' },
    { id: 'trending', label: 'Trending' },
    { id: 'budget', label: 'Budget Getaways' },
    { id: 'weekend', label: 'Weekend Escapes' },
    { id: 'roadtrip', label: 'Road Trips' },
    { id: 'heritage', label: 'Royal & Historical' },
    { id: 'mountain', label: 'Snow & Valleys' },
    { id: 'beach', label: 'Beaches & Chill' },
    { id: 'nature', label: 'Nature & Hills' },
    { id: 'spiritual', label: 'Spiritual & Sacred' },
    { id: 'adventure', label: 'Adventure & Rafting' },
  ];

  const filtered = POPULAR_DESTINATIONS.filter(dest => {
    const matchesSearch = dest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dest.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          dest.tagline.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedTag === 'all') return true;
    if (selectedTag === 'trending') return dest.rating >= 4.8;
    if (selectedTag === 'budget') return dest.startBudget <= 4000;
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
      
      {/* Search and Header Banner */}
      <div className="bg-gradient-to-r from-[#152A1C] via-[#2D5A3D] to-[#1B3624] rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#A8C7A5]">
            TripVerse Destination Discovery
          </span>
          <h1 className="text-2xl sm:text-4xl font-display font-bold tracking-tight leading-tight">
            Explore Handpicked Getaways
          </h1>
          <p className="text-xs sm:text-sm text-[#E8EFE7] font-normal leading-relaxed">
            Discover verified routes, estimated road trip budgets, and authentic experiences tailored for travelers seeking nature, culture, and adventure.
          </p>

          {/* Search Input */}
          <div className="pt-2 relative">
            <Search className="w-5 h-5 text-[#8EA78D] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by destination (e.g. Bali, Kyoto, Udaipur, Manali)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-[#152A1C] placeholder:text-[#5A7362] font-semibold text-sm focus:outline-none focus:ring-4 focus:ring-[#8EA78D]/30 shadow-md"
            />
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#8EA78D]/20 to-transparent pointer-events-none" />
      </div>

      {/* Filter Tabs with Clear Scroll Affordance */}
      <div className="relative">
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTag(tab.id)}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                selectedTag === tab.id
                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                  : 'bg-white text-[#5A7362] border border-[#E2EBE1] hover:border-[#8EA78D] hover:bg-[#F8FAF7]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Right Fade & Scroll Hint */}
        <div className="absolute right-0 top-0 bottom-3 w-10 bg-gradient-to-l from-[#F4F6F2] to-transparent pointer-events-none md:hidden" />
      </div>

      {/* Personalized Recommendations Section */}
      {selectedTag === 'all' && !searchQuery.trim() && recommendedDestinations.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#E2EBE1] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#2D5A3D] text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold font-display text-[#152A1C]">
                  Recommended for Your Style
                </h3>
                <p className="text-xs text-[#5A7362]">
                  Tailored to your {userProfile?.travelerStyle || 'explorer'} profile & budget preference
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#2D5A3D] bg-[#E8EFE7] px-3 py-1 rounded-full border border-[#8EA78D]/30 self-start sm:self-auto">
              98% AI Match
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recommendedDestinations.map(dest => {
              const isSaved = savedItemIds.includes(dest.id);
              return (
                <div
                  key={`rec-${dest.id}`}
                  onClick={() => setActiveModalDest(dest)}
                  className="bg-white rounded-2xl p-3 border border-[#E2EBE1] hover:border-[#2D5A3D] hover:shadow-[0_8px_25px_rgba(45,90,61,0.08)] transition-all duration-200 flex gap-3.5 items-center cursor-pointer group"
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
                      <h4 className="font-bold text-sm text-[#152A1C] truncate group-hover:text-[#2D5A3D] transition-colors">
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

      {/* Destination Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filtered.map(dest => {
          const isSaved = savedItemIds.includes(dest.id);

          return (
            <div
              key={dest.id}
              className="bg-white rounded-[28px] overflow-hidden border border-[#E2EBE1] shadow-[0_4px_20px_rgba(45,90,61,0.05)] hover:shadow-[0_16px_36px_rgba(45,90,61,0.12)] hover:border-[#2D5A3D] transition-all duration-300 flex flex-col justify-between group cursor-pointer"
              onClick={() => setActiveModalDest(dest)}
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
                    <span className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-extrabold text-[#152A1C] shadow-xs">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{dest.rating}</span>
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSaved(dest.id);
                      }}
                      className={`p-2 rounded-full backdrop-blur-md transition-all shadow-xs ${
                        isSaved ? 'bg-[#2D5A3D] text-white' : 'bg-white/90 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
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
                  <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-[#F4F6F2] border border-[#E2EBE1] gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="badge-caps text-[#5A7362] block">Est. Budget</span>
                      <span className="font-bold text-[#152A1C] text-xs font-display truncate block">
                        From {formatCurrency(dest.startBudget, currency)}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="badge-caps text-[#5A7362] block">Best Time</span>
                      <span className="font-semibold text-[#152A1C] text-xs">{dest.bestTime}</span>
                    </div>
                  </div>

                  {/* Popular Activities Tag Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {dest.popularActivities.slice(0, 2).map(act => (
                      <span key={act} className="text-[10px] font-semibold text-[#5A7362] bg-[#EAF0E9] border border-[#DCE7DB] px-2 py-0.5 rounded-full truncate max-w-[130px]">
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
                  className="py-2.5 px-3 rounded-xl bg-[#F4F6F2] hover:bg-[#EAF0E9] text-[#152A1C] border border-[#E2EBE1] font-bold text-xs transition-colors text-center whitespace-nowrap truncate cursor-pointer"
                >
                  Explore Details
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
                  <span className="truncate">Plan Trip</span>
                </button>
              </div>

            </div>
          );
        })}

        {filtered.length === 0 && searchQuery.trim().length > 0 && (() => {
          const synthesized = synthesizeDestination(searchQuery);
          return (
            <div className="col-span-full bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 rounded-3xl p-6 sm:p-8 border border-emerald-200/80 shadow-md">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-full md:w-72 h-48 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
                  <img
                    src={synthesized.image}
                    alt={synthesized.name}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                  <div className="absolute top-2 left-2 bg-[#2D5A3D] text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                    <Sparkles className="w-3 h-3" />
                    <span>AI Tailored Destination</span>
                  </div>
                </div>

                <div className="space-y-3 flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                      Precise Location Detected
                    </span>
                    <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {synthesized.coordinates.lat.toFixed(4)}°N, {synthesized.coordinates.lng.toFixed(4)}°E
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Ready for AI Itinerary</span>
                  </div>

                  <h3 className="text-2xl font-display font-black text-[#0B2545]">
                    Plan a Trip to {synthesized.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {synthesized.description}
                  </p>

                  {/* Spot Highlights */}
                  {synthesized.popularActivities && synthesized.popularActivities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {synthesized.popularActivities.slice(0, 3).map((act, idx) => (
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

                  <div className="pt-2">
                    <button
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
            <Compass className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-700">No destinations in this category</h4>
            <p className="text-xs text-slate-400">Try selecting another filter or search any destination name.</p>
            <button
              onClick={() => setSelectedTag('all')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
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
