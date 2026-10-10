import React, { useState, useEffect } from 'react';
import { Trip, ItineraryActivity, LocalFoodGem, HiddenGem } from '../../types/trip';
import { fetchGenuineDestinationGems, DestinationGems } from '../../services/localGemsService';
import { triggerHaptic } from '../../services/deviceService';
import { getStoredCurrency, formatCurrency, Currency } from '../../services/currencyService';
import confetti from 'canvas-confetti';
import { 
  Utensils, 
  Sparkles, 
  MapPin, 
  Star, 
  Plus, 
  Check, 
  Compass, 
  Clock, 
  Eye, 
  Leaf, 
  Coffee,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

interface LocalGemsViewProps {
  trip: Trip;
  onAddActivity: (dayNumber: number, activity: Partial<ItineraryActivity>) => void;
}

export function LocalGemsView({ trip, onAddActivity }: LocalGemsViewProps) {
  const [gemsData, setGemsData] = useState<DestinationGems>({
    destination: trip.destination,
    foodGems: [],
    hiddenGems: [],
    isLiveGenerated: false
  });
  const [isLoadingGems, setIsLoadingGems] = useState(true);
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency());
  const [activeTab, setActiveTab] = useState<'food' | 'secret'>('food');
  const [vegOnly, setVegOnly] = useState(false);
  const [targetDay, setTargetDay] = useState<number>(1);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingGems(true);
    fetchGenuineDestinationGems(trip.destination, {
      coordinates: trip.destinationDetails?.coordinates,
      foodPreference: trip.preferences?.join(', ')
    }).then(data => {
      if (isMounted) {
        setGemsData(data);
        setIsLoadingGems(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [trip.destination, trip.destinationDetails?.coordinates]);

  const handleRefreshGems = async () => {
    triggerHaptic('medium');
    setIsLoadingGems(true);
    try {
      const freshData = await fetchGenuineDestinationGems(trip.destination, {
        forceFresh: true,
        coordinates: trip.destinationDetails?.coordinates,
        foodPreference: trip.preferences?.join(', ')
      });
      setGemsData(freshData);
    } finally {
      setIsLoadingGems(false);
    }
  };

  useEffect(() => {
    const handleCurrency = () => setCurrency(getStoredCurrency());
    window.addEventListener('tripverse_currency_change', handleCurrency);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrency);
  }, []);

  const handleAddGemToItinerary = (gem: LocalFoodGem | HiddenGem, isFood: boolean) => {
    triggerHaptic('success');
    setAddedIds(prev => [...prev, gem.id]);

    const title = 'dish' in gem ? `${gem.name}: ${gem.dish}` : gem.title;
    const type = isFood ? 'food' : 'viewpoint';
    const estimatedCost = 'pricePerPerson' in gem ? gem.pricePerPerson * trip.travelersCount : 150;

    onAddActivity(targetDay, {
      title,
      type,
      location: gem.location,
      estimatedCost,
      travelTimeMin: 20,
      distanceKm: 3.5,
      description: 'whySpecial' in gem ? gem.whySpecial : gem.description,
      tag: isFood ? 'Local Dining' : 'Secret Gem',
      coordinates: gem.coordinates || { lat: 24.5854, lng: 73.7125 },
      isCustom: true
    });

    try {
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#386B49', '#F59E0B', '#38BDF8']
      });
    } catch (e) {}
  };

  const filteredFood = vegOnly 
    ? gemsData.foodGems.filter(f => f.isVegetarian) 
    : gemsData.foodGems;

  return (
    <div className="space-y-6">
      
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#102E54] to-[#1E3A8A] rounded-3xl p-6 sm:p-8 text-white shadow-md border border-slate-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Live AI Regional Discovery</span>
              </span>
              <button
                type="button"
                onClick={handleRefreshGems}
                disabled={isLoadingGems}
                className="text-[10px] font-bold text-slate-200 hover:text-white bg-white/15 hover:bg-white/25 px-2.5 py-0.5 rounded-full border border-white/25 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                title="Re-scan destination for new authentic hidden spots"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${isLoadingGems ? 'animate-spin' : ''}`} />
                <span>{isLoadingGems ? 'Scanning AI...' : 'Discover Fresh Gems'}</span>
              </button>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display mt-2">
              Culinary Trails & Hidden Spots • {gemsData.destination}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Authentic heritage food stalls, legendary neighborhood dhabas, and secret viewpoints tailored specifically to {gemsData.destination}.
            </p>
          </div>

          {/* Target Day Selector for 1-Click Addition */}
          <div className="bg-white/10 p-3 rounded-2xl border border-white/15 backdrop-blur-xs flex items-center gap-2.5 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-300">Add stops to:</span>
            <select
              value={targetDay}
              onChange={e => setTargetDay(parseInt(e.target.value))}
              className="bg-[#0B2545] text-white border border-emerald-400/50 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none"
            >
              {trip.itinerary.map(day => (
                <option key={day.dayNumber} value={day.dayNumber}>
                  Day {day.dayNumber} ({day.theme.slice(0, 18)}...)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sub-Switch: Food Trails vs Secret Spots */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10 flex-wrap">
          <button
            onClick={() => {
              setActiveTab('food');
              triggerHaptic('light');
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'food'
                ? 'bg-emerald-500 text-slate-900 shadow-md font-extrabold'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Legendary Food & Dhabas ({gemsData.foodGems.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('secret');
              triggerHaptic('light');
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'secret'
                ? 'bg-emerald-500 text-slate-900 shadow-md font-extrabold'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Hidden Viewpoints & Secret Gems ({gemsData.hiddenGems.length})</span>
          </button>

          {activeTab === 'food' && (
            <button
              onClick={() => {
                setVegOnly(!vegOnly);
                triggerHaptic('light');
              }}
              className={`w-full sm:w-auto sm:ml-auto px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center sm:justify-start gap-1.5 border transition-all cursor-pointer ${
                vegOnly
                  ? 'bg-emerald-400/30 border-emerald-400 text-emerald-300'
                  : 'bg-white/5 border-white/20 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>100% Pure Vegetarian</span>
            </button>
          )}
        </div>
      </div>

      {/* FOOD TRAILS LIST */}
      {isLoadingGems && filteredFood.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
          {[1, 2, 3, 4].map(idx => (
            <div key={idx} className="bg-white rounded-3xl h-80 border border-slate-200/90 p-4 flex flex-col justify-between">
              <div className="h-44 bg-slate-100 rounded-2xl w-full" />
              <div className="space-y-2 mt-4">
                <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                <div className="h-3 bg-slate-100 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'food' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredFood.map(food => {
            const isAdded = addedIds.includes(food.id);

            return (
              <div
                key={food.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Photo Banner */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={food.image}
                      alt={food.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider">
                        {food.category.replace('_', ' ')}
                      </span>
                      {food.isVegetarian && (
                        <span className="px-2 py-0.5 rounded-lg bg-[#2D5A3D] text-white text-[10px] font-bold flex items-center gap-1">
                          <Leaf className="w-2.5 h-2.5" /> Pure Veg
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-base font-bold font-display min-w-0 flex-1 truncate drop-shadow-sm">{food.name}</h4>
                        <div className="flex items-center gap-1 bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md text-xs font-semibold shrink-0">
                          <Star className="w-3 h-3 fill-current" /> {food.rating}
                        </div>
                      </div>
                      <div className="text-xs text-emerald-300 font-semibold truncate">{food.dish}</div>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed text-pretty">
                      {food.whySpecial}
                    </p>

                    <div className="bg-amber-50/70 border border-amber-200/70 p-3 rounded-2xl">
                      <span className="text-[10px] uppercase font-semibold text-amber-800 flex items-center gap-1.5 mb-0.5">
                        <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                        <span>Must-Order Special</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-800 line-clamp-1">{food.mustTry}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{food.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end min-w-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{food.bestTimeToVisit}</span>
                      </div>
                    </div>

                    {/* Genuine Direct Actions: Maps & Zomato */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(food.name + ' ' + food.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                        title="Open in Google Maps"
                      >
                        <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span>Maps Directions</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>

                      <a
                        href={`https://www.zomato.com/search?q=${encodeURIComponent(food.name + ' ' + gemsData.destination)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                        title="View menu & reviews on Zomato"
                      >
                        <Utensils className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>Zomato</span>
                        <ExternalLink className="w-2.5 h-2.5 text-rose-400" />
                      </a>

                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 ml-auto">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Suggested listing · verify details
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-medium text-slate-400 block tracking-wider">Avg Cost</span>
                    <span className="text-sm font-semibold text-[#0B2545] truncate block">
                      ~{formatCurrency(food.pricePerPerson, currency)} <span className="text-[10px] font-normal text-slate-500">/ person</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleAddGemToItinerary(food, true)}
                    disabled={isAdded}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-[#2D5A3D] hover:bg-[#244931] text-white shadow-xs active:scale-95'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added to Day {targetDay}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Day {targetDay}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECRET GEMS LIST */}
      {activeTab === 'secret' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {gemsData.hiddenGems.map(gem => {
            const isAdded = addedIds.includes(gem.id);

            return (
              <div
                key={gem.id}
                className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={gem.image}
                      alt={gem.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-lg bg-sky-950/80 text-sky-200 text-[10px] font-bold uppercase tracking-wider border border-sky-400/30">
                        {gem.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-base font-bold font-display min-w-0 flex-1 truncate drop-shadow-sm">{gem.title}</h4>
                        <div className="flex items-center gap-1 bg-amber-400 text-slate-900 px-2 py-0.5 rounded-md text-xs font-semibold shrink-0">
                          <Star className="w-3 h-3 fill-current" /> {gem.rating}
                        </div>
                      </div>
                      <div className="text-xs text-slate-300 font-medium truncate">{gem.location}</div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {gem.description}
                    </p>

                    <div className="bg-sky-50/70 border border-sky-200/70 p-3 rounded-2xl">
                      <span className="text-[10px] uppercase font-semibold text-sky-800 flex items-center gap-1.5 mb-0.5">
                        <Sparkles className="w-3 h-3 text-sky-600 shrink-0" />
                        <span>Local Insider Tip</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-800">{gem.insiderTip}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                        Crowd: {gem.crowdLevel.replace('_', ' ')}
                      </span>
                      <span>Best: {gem.bestTimeOfDay}</span>
                    </div>

                    {/* Genuine Direct Actions: Maps & Locus Verification */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gem.title + ' ' + gem.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                        title="Open in Google Maps"
                      >
                        <Compass className="w-3 h-3 text-sky-600 shrink-0" />
                        <span>Maps Directions</span>
                        <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                      </a>

                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 ml-auto">
                        <ShieldCheck className="w-3 h-3 text-sky-600" />
                        Secret Scenic Locus
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Free Natural Landmark</span>

                  <button
                    onClick={() => handleAddGemToItinerary(gem, false)}
                    disabled={isAdded}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isAdded
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                        : 'bg-[#2D5A3D] hover:bg-[#244931] text-white shadow-xs active:scale-95'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Added to Day {targetDay}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add to Day {targetDay}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
