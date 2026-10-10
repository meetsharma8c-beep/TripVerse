import React, { useState } from 'react';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { HIGHWAY_BREAK_STOPS } from '../../data/highwayFacilities';
import { Trip, Destination, BreakStop } from '../../types/trip';
import { 
  Bookmark, 
  MapPin, 
  Coffee, 
  Trash2, 
  Sparkles, 
  ArrowRight,
  Star,
  ExternalLink,
  Compass
} from 'lucide-react';
import { handleImageError } from '../../utils/destinationImages';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';

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
  trips,
  onToggleSaved,
  onSelectTrip,
  onPlanTripForDestination,
  onSelectDestination
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'destinations' | 'breakstops'>('all');
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  React.useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  const savedDestinations = POPULAR_DESTINATIONS.filter(d => savedItemIds.includes(d.id));
  const savedBreakStops = HIGHWAY_BREAK_STOPS.filter(bs => savedItemIds.includes(bs.id));

  const totalSaved = savedDestinations.length + savedBreakStops.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">Your Travel Bookmarks</span>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#152A1C] tracking-tight">
            Saved Places & Pitstops
          </h1>
          <p className="text-xs sm:text-sm text-[#5A7362] mt-0.5 font-medium">
            Quickly access your bookmarked destinations, highway food stops, and stays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#E8EFE7] text-[#2D5A3D] border border-[#8EA78D]/30">
            {totalSaved} Saved Items
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2EBE1] pb-3">
        {[
          { id: 'all', label: `All Items (${totalSaved})` },
          { id: 'destinations', label: `Destinations (${savedDestinations.length})` },
          { id: 'breakstops', label: `Highway Stops (${savedBreakStops.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === tab.id
                ? 'bg-[#2D5A3D] text-white shadow-xs'
                : 'bg-white text-[#5A7362] border border-[#E2EBE1] hover:border-[#8EA78D] hover:bg-[#F8FAF7]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {totalSaved === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E2EBE1] p-8 space-y-5 shadow-xs max-w-md mx-auto animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center mx-auto shadow-inner border border-[#8EA78D]/30">
            <Bookmark className="w-9 h-9 stroke-[1.8]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold font-display text-[#152A1C]">Your Travel Wishlist is Empty</h3>
            <p className="text-xs text-[#5A7362] max-w-xs mx-auto leading-relaxed">
              Explore destinations and save places you want to check out on a future trip.
            </p>
          </div>
          <button
            onClick={() => onPlanTripForDestination('Udaipur')}
            className="px-6 py-2.5 rounded-2xl bg-[#2D5A3D] hover:bg-[#234730] text-white font-bold text-xs shadow-md shadow-[#2D5A3D]/20 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-300" />
            <span>Discover Top Destinations</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Render Destinations */}
          {(activeCategory === 'all' || activeCategory === 'destinations') &&
            savedDestinations.map(dest => (
              <div
                key={dest.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={dest.image}
                      alt={dest.name}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => onToggleSaved(dest.id)}
                        className="p-2 rounded-full bg-white/90 text-red-600 hover:bg-white transition-colors"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="badge-caps text-emerald-300 block">Destination</span>
                      <h4 className="text-lg font-bold font-display truncate drop-shadow-md">{dest.name}</h4>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-xs text-slate-600 line-clamp-2 text-pretty">{dest.description}</p>
                    <span className="text-xs font-bold text-slate-800 block font-display">
                      Starting from {formatCurrency(dest.startBudget, currency)}
                    </span>
                  </div>
                </div>

                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectDestination?.(dest)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors text-center whitespace-nowrap truncate cursor-pointer"
                  >
                    Explore Details
                  </button>

                  <button
                    type="button"
                    onClick={() => onPlanTripForDestination(dest.name)}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-xs transition-all active:scale-95 whitespace-nowrap truncate cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Plan Trip</span>
                  </button>
                </div>
              </div>
            ))}

          {/* Render Break Stops */}
          {(activeCategory === 'all' || activeCategory === 'breakstops') &&
            savedBreakStops.map(bs => (
              <div
                key={bs.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={bs.image}
                      alt={bs.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => onToggleSaved(bs.id)}
                        className="p-2 rounded-full bg-white/90 text-red-600 hover:bg-white transition-colors"
                        title="Remove from saved"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <span className="text-[10px] uppercase font-bold text-emerald-300">Highway Break Stop</span>
                      <h4 className="text-lg font-bold font-display">{bs.name}</h4>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-xs text-slate-600 line-clamp-2">{bs.description}</p>
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{bs.rating} / 5.0 • {bs.detourDistanceKm} km detour</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="text-xs text-slate-400 font-medium text-center py-1">
                    Added to active highway stops
                  </div>
                </div>
              </div>
            ))}

        </div>
      )}

    </div>
  );
};
