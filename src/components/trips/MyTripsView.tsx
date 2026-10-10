import React, { useState, useEffect } from 'react';
import { Trip } from '../../types/trip';
import { 
  Calendar, 
  Users, 
  Wallet, 
  MapPin, 
  ArrowRight, 
  Share2, 
  Trash2, 
  Plus, 
  Sparkles,
  CheckCircle2,
  Clock,
  Camera,
  Star
} from 'lucide-react';
import { handleImageError } from '../../utils/destinationImages';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';

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
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'ongoing' | 'completed' | 'draft'>('all');
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  const tabs = [
    { id: 'all', label: 'All Trips' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'ongoing', label: 'Ongoing' },
    { id: 'completed', label: 'Completed' },
    { id: 'draft', label: 'Drafts' },
  ];

  const filteredTrips = activeTab === 'all'
    ? trips
    : trips.filter(t => t.status === activeTab);

  const getStatusBadge = (status: Trip['status']) => {
    switch (status) {
      case 'upcoming':
        return { label: 'Upcoming', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'ongoing':
        return { label: 'In Progress', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'completed':
        return { label: 'Completed', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'draft':
        return { label: 'Draft', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">Your Travel Portfolio</span>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#152A1C] tracking-tight">
            My Trips & Itineraries
          </h1>
          <p className="text-xs sm:text-sm text-[#5A7362] mt-0.5 font-medium">
            Manage your past and upcoming AI journeys with budget tracking.
          </p>
        </div>

        <button
          onClick={onOpenPlanner}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#2D5A3D] hover:bg-[#234730] text-white font-bold text-xs sm:text-sm shadow-[0_4px_16px_rgba(45,90,61,0.2)] active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-300" />
          <span>Plan New Trip</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2EBE1] pb-3 overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#2D5A3D] text-white shadow-xs'
                : 'bg-white text-[#5A7362] border border-[#E2EBE1] hover:border-[#8EA78D] hover:bg-[#F8FAF7]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trip Cards Grid */}
      {filteredTrips.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E2EBE1] p-8 space-y-5 shadow-xs max-w-md mx-auto animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center mx-auto shadow-inner border border-[#8EA78D]/30">
            <MapPin className="w-9 h-9 stroke-[1.8]" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold font-display text-[#152A1C]">
              {trips.length === 0 ? "No trips yet." : "No trips in this category"}
            </h3>
            <p className="text-xs text-[#5A7362] max-w-xs mx-auto leading-relaxed">
              {trips.length === 0 
                ? "Create your first trip to start planning." 
                : "No saved journeys found for the selected filter."}
            </p>
          </div>
          <button
            onClick={onOpenPlanner}
            className="px-6 py-2.5 rounded-2xl bg-[#2D5A3D] hover:bg-[#234730] text-white font-bold text-xs shadow-md shadow-[#2D5A3D]/20 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Plan a New Trip with AI</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
            const badge = getStatusBadge(trip.status);
            const isSelected = trip.id === activeTripId;
            const totalActivities = trip.itinerary?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0;

            return (
              <div
                key={trip.id}
                className={`bg-white rounded-3xl overflow-hidden border transition-all duration-200 flex flex-col justify-between group ${
                  isSelected 
                    ? 'border-emerald-400 shadow-md ring-2 ring-emerald-500/20' 
                    : 'border-slate-200/90 hover:border-slate-300 hover:shadow-lg'
                }`}
              >
                <div>
                  {/* Top Image Banner */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={trip.destinationDetails?.image || 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=800&q=80'}
                      alt={trip.destination}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      onError={handleImageError}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.8 rounded-full border backdrop-blur-md bg-white/90 ${badge.bg}`}>
                          {badge.label}
                        </span>

                        {trip.review && (
                          <span className="text-[10px] font-bold px-2 py-0.8 rounded-full border border-amber-300 backdrop-blur-md bg-amber-500/90 text-white flex items-center gap-1 shadow-2xs">
                            <Star className="w-3 h-3 fill-white" />
                            <span>{trip.review.rating}.0</span>
                          </span>
                        )}

                        {trip.photos && trip.photos.length > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.8 rounded-full border border-emerald-300 backdrop-blur-md bg-[#2D5A3D]/90 text-white flex items-center gap-1 shadow-2xs">
                            <Camera className="w-3 h-3" />
                            <span>{trip.photos.length} Photos</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareTrip(trip);
                          }}
                          className="p-1.5 rounded-full bg-white/85 hover:bg-white text-slate-700 backdrop-blur-md transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        {trips.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete trip "${trip.name}"?`)) {
                                onDeleteTrip(trip.id);
                              }
                            }}
                            className="p-1.5 rounded-full bg-white/85 hover:bg-red-50 hover:text-red-600 text-slate-700 backdrop-blur-md transition-colors"
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

                  {/* Body Info */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                        <span className="badge-caps text-slate-400 block">Duration & Team</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {trip.durationDays} Days • {trip.travelersCount} Pax
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0">
                        <span className="badge-caps text-slate-400 block">Est. Cost</span>
                        <span className="font-extrabold text-[#2D5A3D] font-display truncate block">
                          {formatCurrency(trip.estimatedTotal, currency)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar for Activities / Itinerary */}
                    {totalActivities > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-500">Plan Completeness</span>
                          <span className="font-bold text-[#2D5A3D]">{totalActivities} Activities</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-trip-gradient h-full rounded-full transition-all duration-500"
                            style={{ width: trip.status === 'completed' ? '100%' : trip.status === 'ongoing' ? '70%' : '40%' }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{trip.breakStops.length} Break Stops</span>
                      </div>
                      {trip.photos && trip.photos.length > 0 ? (
                        <span className="text-emerald-700 font-medium">{trip.photos.length} Memories Saved</span>
                      ) : (
                        <span className="text-slate-400">Ready to travel</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action CTAs */}
                <div className="p-5 pt-0 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {onOpenMemories && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMemories(trip);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#E8EFE7] hover:bg-[#dce7db] text-[#2D5A3D] font-bold text-xs border border-[#8EA78D]/30 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Memories</span>
                      </button>
                    )}
                    {onOpenReview && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenReview(trip);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition-colors cursor-pointer"
                      >
                        <Star className={`w-3.5 h-3.5 ${trip.review ? 'fill-amber-500 text-amber-500' : 'text-amber-500'}`} />
                        <span>{trip.review ? `${trip.review.rating}.0 Star` : 'Review'}</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => onSelectTrip(trip.id)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#234730] text-white font-bold text-xs transition-colors cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <span>Open Itinerary & Map</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
