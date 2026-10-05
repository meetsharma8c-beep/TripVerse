import React, { useState } from 'react';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  MapPin,
  Users,
  Wallet,
  Car,
  Bed,
  Utensils,
  Navigation,
  Check,
  Zap,
  Trees,
  Palette,
  ShoppingBag,
  Music,
  Sun,
  Landmark,
  Camera,
  Flame,
  Crown,
  Briefcase,
  Bike,
  Bus,
  Train,
  Plane,
  Home,
  Building,
  Building2,
  Leaf,
  UtensilsCrossed,
  Salad,
  ChefHat,
  Coffee,
  Clock,
  Award,
  User,
  Crosshair,
  Loader2,
  ShieldCheck,
  LucideIcon
} from 'lucide-react';
import { TravelPreference, TravelerType, TransportMode, AccommodationType, FoodPreference, Priority } from '../../types/trip';
import { PlannerInput } from '../../services/plannerEngine';
import { GenerationLoader } from './GenerationLoader';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { searchLocations, resolvePreciseLocationSync, PreciseLocation } from '../../services/locationService';

interface PlannerWizardProps {
  initialDestination?: string;
  initialDuration?: number;
  initialTravelers?: number;
  initialBudget?: number;
  onClose: () => void;
  onTripGenerated: (tripInput: PlannerInput) => void;
}

export const PlannerWizard: React.FC<PlannerWizardProps> = ({
  initialDestination = '',
  initialDuration = 3,
  initialTravelers = 3,
  initialBudget = 8000,
  onClose,
  onTripGenerated
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 9;

  // Step 1: Destination
  const [origin, setOrigin] = useState('Ahmedabad, Gujarat');
  const [destination, setDestination] = useState(initialDestination);

  // Precision Spot Search & Geocoding State
  const [selectedPreciseSpot, setSelectedPreciseSpot] = useState<PreciseLocation | null>(() =>
    initialDestination.trim() ? resolvePreciseLocationSync(initialDestination) : null
  );
  const [destSuggestions, setDestSuggestions] = useState<PreciseLocation[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isDetectingOrigin, setIsDetectingOrigin] = useState(false);

  // Debounced search for destination input
  React.useEffect(() => {
    if (!destination || destination.trim().length < 2) {
      setDestSuggestions([]);
      setIsSearchingDest(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const results = await searchLocations(destination);
        setDestSuggestions(results);
        const exact = results.find(
          r => r.name.toLowerCase() === destination.toLowerCase().trim() ||
            destination.toLowerCase().trim().includes(r.name.toLowerCase())
        );
        if (exact) {
          setSelectedPreciseSpot(exact);
        } else if (!selectedPreciseSpot || selectedPreciseSpot.name.toLowerCase() !== destination.toLowerCase().trim()) {
          setSelectedPreciseSpot(resolvePreciseLocationSync(destination));
        }
      } catch {
        // fallback to sync resolver
        setSelectedPreciseSpot(resolvePreciseLocationSync(destination));
      } finally {
        setIsSearchingDest(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [destination]);

  const handleSelectSpot = (spot: PreciseLocation) => {
    setDestination(spot.name);
    setSelectedPreciseSpot(spot);
    setShowDestDropdown(false);
  };

  const handleUseCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsDetectingOrigin(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (res.ok) {
              const data = await res.json();
              const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'My Location';
              const state = data.address?.state || '';
              setOrigin(`${city}${state ? `, ${state}` : ''}`);
            } else {
              setOrigin('Current Location (GPS)');
            }
          } catch {
            setOrigin('Current Location (GPS)');
          } finally {
            setIsDetectingOrigin(false);
          }
        },
        () => {
          setIsDetectingOrigin(false);
          setOrigin('Ahmedabad, Gujarat');
        },
        { timeout: 8000 }
      );
    }
  };

  // Step 2: Duration
  const [duration, setDuration] = useState<number>(initialDuration);

  // Step 3: Travelers
  const [travelerType, setTravelerType] = useState<TravelerType>('friends');
  const [travelersCount, setTravelersCount] = useState<number>(initialTravelers);

  // Step 4: Budget
  const [budgetMode, setBudgetMode] = useState<'per_person' | 'total'>('total');
  const [budgetAmount, setBudgetAmount] = useState<number>(initialBudget);
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  React.useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  // Step 5: Travel Preferences
  const [preferences, setPreferences] = useState<TravelPreference[]>([
    'culture',
    'nature',
    'historical',
    'food',
    'budget'
  ]);

  // Step 6: Transportation
  const [transportMode, setTransportMode] = useState<TransportMode>('car');

  // Step 7: Accommodation
  const [accommodationType, setAccommodationType] = useState<AccommodationType>('budget');

  // Step 8: Food
  const [foodPreference, setFoodPreference] = useState<FoodPreference>('veg');

  // Step 9: Comfort Priorities
  const [priorities, setPriorities] = useState<Priority[]>(['budget', 'experience', 'comfort']);

  // Loading state
  const [isGenerating, setIsGenerating] = useState(false);

  const togglePreference = (pref: TravelPreference) => {
    if (preferences.includes(pref)) {
      setPreferences(preferences.filter(p => p !== pref));
    } else {
      setPreferences([...preferences, pref]);
    }
  };

  const togglePriority = (p: Priority) => {
    if (priorities.includes(p)) {
      if (priorities.length > 1) {
        setPriorities(priorities.filter(x => x !== p));
      }
    } else {
      setPriorities([...priorities, p]);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Trigger AI Generation
      setIsGenerating(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinalSubmit = () => {
    const input: PlannerInput = {
      origin,
      destinationName: destination,
      durationDays: duration,
      travelersCount,
      travelerType,
      budgetMode,
      budgetAmount,
      preferences,
      transportMode,
      accommodationType,
      foodPreference,
      priorities,
      destinationCoords: selectedPreciseSpot?.coordinates,
      preciseLocation: selectedPreciseSpot || undefined
    };
    onTripGenerated(input);
  };

  // Preference catalog
  const preferenceOptions: Array<{ id: TravelPreference; label: string; icon: LucideIcon }> = [
    { id: 'adventure', label: 'Adventure & Thrill', icon: Zap },
    { id: 'nature', label: 'Nature & Scenic', icon: Trees },
    { id: 'culture', label: 'Culture & Art', icon: Palette },
    { id: 'food', label: 'Food & Culinary', icon: Utensils },
    { id: 'shopping', label: 'Local Shopping', icon: ShoppingBag },
    { id: 'nightlife', label: 'Nightlife & Clubs', icon: Music },
    { id: 'relaxation', label: 'Relaxation & Spa', icon: Sun },
    { id: 'historical', label: 'Historical Places', icon: Landmark },
    { id: 'photography', label: 'Photography Spots', icon: Camera },
    { id: 'spiritual', label: 'Spiritual & Temples', icon: Flame },
    { id: 'luxury', label: 'Luxury Experience', icon: Crown },
    { id: 'budget', label: 'Budget Friendly', icon: Wallet }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">

      {isGenerating && (
        <GenerationLoader
          destinationName={destination}
          transportMode={transportMode}
          onComplete={handleFinalSubmit}
        />
      )}

      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-trip-gradient text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B2545]">TripVerse AI Trip Planner</h2>
              <span className="text-xs text-slate-500 font-semibold">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Line */}
        <div className="w-full bg-slate-100 h-1.5">
          <div
            className="bg-trip-gradient h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Content Area */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">

          {/* STEP 1: DESTINATION */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step 1 — Journey Endpoints</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">Where do you want to go?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  TripVerse can plan a trip for <strong>any precise spot anywhere</strong> — from major metropolises to mountain hamlets, historic forts, remote beaches, or hidden forest viewpoints worldwide.
                </p>
              </div>

              <div className="space-y-4">
                {/* Starting From (Origin) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Starting From (Origin)
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isDetectingOrigin}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${isDetectingOrigin ? 'animate-spin text-emerald-500' : ''}`} />
                      <span>{isDetectingOrigin ? 'Detecting GPS...' : 'Use My Current Location'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Navigation className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="e.g. Ahmedabad, Gujarat"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm focus:bg-white focus:outline-none focus:border-[#00B074] focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>

                {/* Primary Destination with Autocomplete */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Primary Destination or Specific Spot
                    </label>
                    {selectedPreciseSpot && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Precise GPS Active</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#00B074] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        setShowDestDropdown(true);
                      }}
                      onFocus={() => setShowDestDropdown(true)}
                      placeholder="Type any spot (e.g. Mansarovar in Jaipur, Polo Forest, Chopta)..."
                      className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm focus:bg-white focus:outline-none focus:border-[#00B074] focus:ring-4 focus:ring-emerald-500/10 text-slate-900 shadow-xs"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {isSearchingDest ? (
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      ) : destination.trim().length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDestination('');
                            setSelectedPreciseSpot(null);
                            setDestSuggestions([]);
                          }}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showDestDropdown && destSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3.5 py-2 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Matching Precise Spots & Cities</span>
                        <span>OpenStreetMap Geocoded</span>
                      </div>
                      {destSuggestions.map((spot) => {
                        const IconComponent =
                          spot.spotType === 'temple' ? Flame :
                            spot.spotType === 'nature' || spot.category === 'nature' ? Trees :
                              spot.spotType === 'monument' || spot.category === 'heritage' ? Landmark :
                                spot.spotType === 'hill_station' || spot.category === 'mountain' ? Sun :
                                  spot.spotType === 'beach' || spot.category === 'beach' ? Sun :
                                    MapPin;

                        return (
                          <button
                            key={spot.id}
                            type="button"
                            onClick={() => handleSelectSpot(spot)}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50/70 transition-colors flex items-start gap-3 cursor-pointer group"
                          >
                            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-emerald-500 group-hover:text-white text-slate-600 flex items-center justify-center shrink-0 transition-colors">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[#0B2545] group-hover:text-emerald-700">
                                  {spot.name}
                                </span>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {spot.state || spot.country}
                                </span>
                                <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                                  {spot.coordinates.lat.toFixed(2)}°N, {spot.coordinates.lng.toFixed(2)}°E
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {spot.fullName}
                              </p>
                              {spot.highlights && spot.highlights.length > 0 && (
                                <p className="text-[11px] text-emerald-600 font-medium truncate mt-0.5">
                                  ✨ {spot.highlights.slice(0, 2).join(' • ')}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Verified Precise Spot Card */}
                {selectedPreciseSpot && (
                  <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-50/90 via-white to-slate-50 border border-emerald-300/80 shadow-xs space-y-2.5 animate-in fade-in">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#0B2545]">
                              {selectedPreciseSpot.name}
                            </h4>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {selectedPreciseSpot.state}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500 font-medium">
                            GPS: {selectedPreciseSpot.coordinates.lat.toFixed(4)}°N, {selectedPreciseSpot.coordinates.lng.toFixed(4)}°E
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded-md border border-slate-200">
                        {selectedPreciseSpot.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {selectedPreciseSpot.tagline || selectedPreciseSpot.fullName}
                    </p>

                    {/* Highlights tags */}
                    {selectedPreciseSpot.highlights && selectedPreciseSpot.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedPreciseSpot.highlights.slice(0, 3).map((hl, i) => (
                          <span key={i} className="text-[10px] font-semibold bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md shadow-2xs">
                            📍 {hl}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>AI will dynamically calculate real highway routes, fuel/tolls, and activities for this spot.</span>
                    </div>
                  </div>
                )}

                {/* Popular Quick Select */}
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-2">Featured Hotspots & Micro-Destinations:</span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { name: 'Polo Forest', label: 'Polo Forest' },
                        { name: 'Chopta', label: 'Chopta (Tungnath)', highlight: true },
                        { name: 'Dhanushkodi', label: 'Dhanushkodi' },
                        { name: 'Gokarna', label: 'Gokarna', highlight: true },
                        { name: 'Statue of Unity', label: 'Statue of Unity' },
                        { name: 'Modhera', label: 'Modhera Sun Temple' },
                        { name: 'Mount Abu', label: 'Mount Abu' },
                        { name: 'Kasol', label: 'Kasol' },
                        { name: 'Spiti Valley', label: 'Spiti Valley' },
                        { name: 'Hampi', label: 'Hampi' },
                        { name: 'Varkala', label: 'Varkala' },
                        { name: 'Udaipur', label: 'Udaipur' },
                        { name: 'Manali', label: 'Manali' },
                        { name: 'Goa', label: 'Goa' }
                      ] as { name: string; label: string; highlight?: boolean }[]
                    ).map(item => (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setDestination(item.name);
                          setSelectedPreciseSpot(resolvePreciseLocationSync(item.name));
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1 ${destination.toLowerCase() === item.name.toLowerCase()
                            ? 'bg-[#00B074] text-white border-[#00B074] shadow-xs'
                            : item.highlight
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                          }`}
                      >
                        {item.highlight && <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DURATION */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step 2 — Trip Duration</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">How long is your trip?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  TripVerse balances daily driving time with sightseeing so you never feel exhausted.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { days: 1, label: '1 Day', sub: 'Express day out' },
                  { days: 2, label: '2 Days', sub: 'Weekend recharge' },
                  { days: 3, label: '3 Days', sub: 'Sweet spot escape' },
                  { days: 4, label: '4 Days', sub: 'Deep exploration' },
                  { days: 5, label: '5 Days', sub: 'Full holiday' },
                  { days: 7, label: '1 Week', sub: 'Epic road expedition' },
                ].map(item => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setDuration(item.days)}
                    className={`p-4 rounded-2xl border text-left transition-all ${duration === item.days
                        ? 'border-[#00B074] bg-emerald-50/70 shadow-xs scale-[1.02]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                  >
                    <span className="text-lg font-black text-[#0B2545] block">{item.label}</span>
                    <span className="text-xs text-slate-500 font-medium">{item.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: TRAVELERS */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step 3 — Travelers</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">Who are you traveling with?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  We optimize room sharing, transport splitting, and suitable stops based on your group.
                </p>
              </div>

              {/* Group Type Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'solo', label: 'Solo Traveler', icon: User },
                  { id: 'couple', label: 'Couple', icon: Users },
                  { id: 'friends', label: 'Group of Friends', icon: Users },
                  { id: 'family', label: 'Family Trip', icon: Home },
                  { id: 'business', label: 'Business / Workation', icon: Briefcase }
                ].map(type => {
                  const TypeIcon = type.icon;
                  const isSelected = travelerType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setTravelerType(type.id as TravelerType);
                        if (type.id === 'solo') setTravelersCount(1);
                        if (type.id === 'couple') setTravelersCount(2);
                        if (type.id === 'friends' && travelersCount < 3) setTravelersCount(3);
                      }}
                      className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-2 ${isSelected
                          ? 'border-[#00B074] bg-emerald-50/70 text-slate-900 font-bold'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                    >
                      <TypeIcon className={`w-5 h-5 ${isSelected ? 'text-[#00B074]' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-semibold">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Number of People Counter */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  Exact Number of Travelers
                </label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setTravelersCount(Math.max(1, travelersCount - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-lg active:scale-95"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-xl font-black text-[#0B2545]">{travelersCount}</span>
                    <span className="text-xs text-slate-500 font-medium ml-1.5">
                      {travelersCount === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTravelersCount(Math.min(15, travelersCount + 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center text-lg active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BUDGET */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step 4 — Budget Target</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">What is your total budget?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  TripVerse guarantees your generated itinerary will stay strictly within this limit.
                </p>
              </div>

              {/* Budget Toggle: Total vs Per Person */}
              <div className="flex bg-slate-100 p-1 rounded-2xl max-w-sm">
                <button
                  type="button"
                  onClick={() => setBudgetMode('total')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${budgetMode === 'total' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-600'
                    }`}
                >
                  Total Group Budget
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetMode('per_person')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${budgetMode === 'per_person' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-600'
                    }`}
                >
                  Per Person Budget
                </button>
              </div>

              {/* Budget Display Card */}
              <div className="p-6 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 rounded-2xl border border-emerald-200/80 text-center">
                <span className="badge-caps text-[#00B074] block">
                  {budgetMode === 'total' ? 'Total Group Budget' : 'Budget Per Person'}
                </span>
                <div className="text-4xl sm:text-5xl font-black text-[#0B2545] font-display my-2">
                  {formatCurrency(budgetAmount, currency)}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold text-pretty">
                  {budgetMode === 'total'
                    ? `Equal to approx ${formatCurrency(Math.round(budgetAmount / Math.max(1, travelersCount)), currency)} per person for ${travelersCount} travelers.`
                    : `Total for ${travelersCount} travelers: ${formatCurrency(budgetAmount * travelersCount, currency)}.`}
                </p>
              </div>

              {/* Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={budgetMode === 'total' ? 3000 : 1500}
                  max={budgetMode === 'total' ? 60000 : 25000}
                  step={500}
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00B074]"
                />
                <div className="flex justify-between text-[10px] sm:text-xs font-semibold text-slate-400 gap-1 flex-wrap sm:flex-nowrap">
                  <span className="truncate">{formatCurrency(budgetMode === 'total' ? 3000 : 1500, currency)} (Budget)</span>
                  <span className="hidden xs:inline">{formatCurrency(budgetMode === 'total' ? 15000 : 7000, currency)}</span>
                  <span className="hidden sm:inline">{formatCurrency(budgetMode === 'total' ? 30000 : 15000, currency)}</span>
                  <span className="truncate">{formatCurrency(budgetMode === 'total' ? 60000 : 25000, currency)}+</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: TRAVEL PREFERENCES */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="badge-caps text-[#00B074]">Step 5 — Travel Style</span>
                <h3 className="text-xl sm:text-2xl font-bold font-display text-[#0B2545] mt-1">What experiences excite you?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Select as many as you like. We will blend attractions according to these vibes.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {preferenceOptions.map(opt => {
                  const isSelected = preferences.includes(opt.id);
                  const PrefIcon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => togglePreference(opt.id)}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all min-w-0 ${isSelected
                          ? 'border-[#00B074] bg-emerald-50 text-slate-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                    >
                      <PrefIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#00B074]' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-semibold truncate min-w-0 flex-1">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#00B074] ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: TRANSPORTATION */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step 6 — Transportation Mode</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">How do you prefer to travel?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  For road trips (Car/Bike), we calculate fuel, tolls, and automatic highway break stops.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'car', label: 'Car / Road Trip', icon: Car, desc: 'Flexible with break stops' },
                  { id: 'bike', label: 'Motorbike / Rider', icon: Bike, desc: 'Thrill & scenic curves' },
                  { id: 'bus', label: 'Volvo / Sleeper Bus', icon: Bus, desc: 'Budget & overnight' },
                  { id: 'train', label: 'Express Train', icon: Train, desc: 'Comfort & scenery' },
                  { id: 'flight', label: 'Flight', icon: Plane, desc: 'Fastest arrival' },
                  { id: 'any', label: 'Best AI Recommendation', icon: Sparkles, desc: 'Optimal for budget' },
                ].map(t => {
                  const Icon = t.icon;
                  const isSelected = transportMode === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTransportMode(t.id as TransportMode)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${isSelected
                          ? 'border-[#00B074] bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-[#00B074]' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block">{t.label}</span>
                      <span className="text-[11px] text-slate-500">{t.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 rounded-2xl text-xs text-slate-700">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#00B074] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-900 block font-bold">AI Best Deal Hunter Activated</strong>
                  <span className="text-slate-500 text-[11px]">
                    After generating your itinerary, our AI will instantly unlock the #1 best verified deal & promo code for your selected mode of transportation.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: ACCOMMODATION */}
          {currentStep === 7 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step 7 — Accommodation</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">Where would you like to stay?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  All properties are pre-screened for cleanliness, safety ratings, and verified reviews.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'hostel', label: 'Backpacker Hostel', icon: Building, desc: 'Social Dorms' },
                  { id: 'budget', label: 'Budget Hotel / Haveli', icon: Bed, desc: 'Private & Cost-Effective' },
                  { id: 'homestay', label: 'Local Homestay', icon: Home, desc: 'Warm hosts & home food' },
                  { id: '3star', label: '3-Star Comfort Hotel', icon: Building2, desc: 'AC & complimentary breakfast' },
                  { id: '4star', label: '4-Star Boutique Resort', icon: Sparkles, desc: 'Pool, views & fine dining' },
                  { id: '5star', label: '5-Star Luxury Palace', icon: Crown, desc: 'Royal luxury & heritage' },
                ].map(acc => {
                  const Icon = acc.icon;
                  const isSelected = accommodationType === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setAccommodationType(acc.id as AccommodationType)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${isSelected
                          ? 'border-[#00B074] bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-[#00B074]' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block">{acc.label}</span>
                      <span className="text-[11px] text-slate-500">{acc.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 8: FOOD */}
          {currentStep === 8 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step 8 — Dining & Food</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">What are your dietary preferences?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  We verify kitchen hygiene standards and match local culinary delicacies.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'veg', label: 'Pure Vegetarian', icon: Leaf, desc: 'Verified 100% veg kitchens' },
                  { id: 'nonveg', label: 'Non-Vegetarian', icon: UtensilsCrossed, desc: 'Local meat & seafood treats' },
                  { id: 'vegan', label: 'Vegan / Plant Based', icon: Salad, desc: 'Dairy-free friendly spots' },
                  { id: 'local', label: 'Authentic Regional Food', icon: ChefHat, desc: 'Famous thalis & staples' },
                  { id: 'street', label: 'Street Food Explorer', icon: Coffee, desc: 'Chaat, kachori & snacks' },
                  { id: 'any', label: 'Any / Balanced Mix', icon: Utensils, desc: 'Flexible foodie' },
                ].map(food => {
                  const Icon = food.icon;
                  const isSelected = foodPreference === food.id;
                  return (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => setFoodPreference(food.id as FoodPreference)}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${isSelected
                          ? 'border-[#00B074] bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-[#00B074]' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block">{food.label}</span>
                      <span className="text-[11px] text-slate-500">{food.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 9: COMFORT PRIORITIES */}
          {currentStep === 9 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step 9 — Core Priority</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">What matters most to you?</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Select your top priority. The AI algorithm will balance trade-offs in your favor.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'budget', label: 'Budget First', icon: Wallet, desc: 'Maximize savings, avoid premium markups, prioritize value.' },
                  { id: 'time', label: 'Time Optimization', icon: Clock, desc: 'Fastest routes, minimize waiting, efficient transit.' },
                  { id: 'comfort', label: 'Maximum Comfort', icon: Bed, desc: 'Higher rated stays, AC cabs, relaxed leisurely pace.' },
                  { id: 'experience', label: 'Unforgettable Experience', icon: Award, desc: 'Prime spots, unique cultural events, scenic vistas.' },
                ].map(p => {
                  const isSelected = priorities.includes(p.id as Priority);
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePriority(p.id as Priority)}
                      className={`p-4 rounded-2xl border text-left transition-all ${isSelected
                          ? 'border-[#00B074] bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-[#00B074]' : 'text-slate-400'}`} />
                        {isSelected && <Check className="w-4 h-4 text-[#00B074]" />}
                      </div>
                      <span className="text-sm font-bold text-slate-900 block">{p.label}</span>
                      <span className="text-xs text-slate-500 mt-0.5 block">{p.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors ${currentStep === 1
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-slate-200/70'
              }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            {currentStep === totalSteps ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Trip with AI</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
