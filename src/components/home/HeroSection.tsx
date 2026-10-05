import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Wallet,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Compass,
  Loader2,
  X,
  Flame,
  Trees,
  Landmark,
  Sun,
  Info,
  ShieldCheck
} from 'lucide-react';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { searchLocations, resolvePreciseLocationSync, PreciseLocation } from '../../services/locationService';
import { Trip } from '../../types/trip';
import { InteractivePhoneDevice } from './InteractivePhoneDevice';

interface HeroSectionProps {
  activeTrip?: Trip | null;
  onQuickPlan: (params: {
    destination: string;
    duration: number;
    travelers: number;
    budget: number;
  }) => void;
  onExplore: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  activeTrip,
  onQuickPlan,
  onExplore,
}) => {
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState(3);
  const [travelers, setTravelers] = useState(3);
  const [budget, setBudget] = useState(8000);
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  // Location suggestions state
  const [suggestions, setSuggestions] = useState<PreciseLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGuaranteeModal, setShowGuaranteeModal] = useState(false);

  useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  // Debounced search for hero destination input
  useEffect(() => {
    if (!destination || destination.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(destination);
        setSuggestions(results);
      } catch {
        // ignore
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [destination]);

  const quickDests: { name: string; label: string; isHighlight?: boolean }[] = [
    { name: 'Polo Forest', label: 'Polo Forest' },
    { name: 'Chopta', label: 'Chopta', isHighlight: true },
    { name: 'Dhanushkodi', label: 'Dhanushkodi' },
    { name: 'Gokarna', label: 'Gokarna', isHighlight: true },
    { name: 'Spiti Valley', label: 'Spiti Valley' },
    { name: 'Udaipur', label: 'Udaipur' },
    { name: 'Manali', label: 'Manali' },
    { name: 'Goa', label: 'Goa' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickPlan({
      destination: destination.trim() || 'Udaipur',
      duration,
      travelers,
      budget,
    });
  };

  return (
    <section className="relative overflow-hidden pt-4 pb-12 sm:pb-16 lg:pb-20">
      {/* Background soft gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-100/40 via-teal-50/20 to-transparent pointer-events-none -z-10 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Sub-greeting & Pill Tag */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[#00B074] text-xs sm:text-sm font-bold shadow-2xs mb-4">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 animate-pulse" />
            <span className="whitespace-nowrap">AI-Powered Travel Intelligence</span>
            <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-slate-600 font-medium hidden sm:inline">"Plan the journey, not just the destination."</span>
          </div>

          <p className="badge-caps text-emerald-600 mb-2">
            Where will you go next?
          </p>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-[#0B2545] tracking-tight leading-[1.1] mb-4 text-balance">
            Your Next Adventure <span className="text-trip-gradient">Awaits</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed text-pretty mb-3">
            Let AI plan your perfect trip — within your budget, with the best stays, food, and verified highway break stops.
          </p>

          {/* Real Travel Photography Showcase Pills */}
          <div className="flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap pt-1">
            {[
              { name: 'Udaipur', state: 'Rajasthan', img: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=400&q=80', tag: 'Lakes & Havelis' },
              { name: 'Manali', state: 'Himachal', img: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=400&q=80', tag: 'Snow & Passes' },
              { name: 'Goa', state: 'Coastal NH-66', img: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=80', tag: 'Sun & Shacks' },
              { name: 'Rishikesh', state: 'Uttarakhand', img: '/images/destinations/rishikesh.jpg', tag: 'Ganga & Rafting' }
            ].map(spot => (
              <button
                key={spot.name}
                type="button"
                onClick={() => {
                  setDestination(spot.name);
                }}
                className="group flex items-center gap-2 p-1.5 pr-3.5 rounded-full bg-white/90 hover:bg-white border border-slate-200/90 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all cursor-pointer min-h-[44px]"
              >
                <img
                  src={spot.img}
                  alt={spot.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="text-left">
                  <span className="text-xs font-extrabold text-[#0B2545] block leading-tight group-hover:text-[#00B074]">
                    {spot.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium block leading-tight">
                    {spot.tag}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Two-Column Grid: Hero Card + Mobile App Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">

          {/* Left Column: Interactive Planning Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200/90 relative">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Smart Travel Setup</span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0B2545]">Plan in 30 Seconds</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuaranteeModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 min-h-[44px] rounded-full border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                title="Click to learn about the TripVerse Budget Guarantee"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Budget-Guaranteed</span>
                <Info className="w-3.5 h-3.5 text-emerald-500 opacity-80" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Field 1: Destination with Precision Autocomplete */}
              <div className="relative">
                <label 
                  htmlFor="hero-destination-input"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#00B074]" />
                    <span>Destination or Specific Spot</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    Any Spot Worldwide
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="hero-destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Enter spot or route (e.g. Udaipur, Manali, Chopta, Goa, Hallstatt)..."
                    className="w-full pl-4 pr-10 py-3 sm:py-3.5 min-h-[44px] rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold placeholder:text-slate-500 focus:bg-white focus:outline-none focus:border-[#00B074] focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm sm:text-base"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                    ) : destination.trim().length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDestination('');
                          setSuggestions([]);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
                        aria-label="Clear destination input"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto animate-in fade-in">
                    <div className="px-3 py-1.5 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span>Matching Spots</span>
                      <span>Verified GPS</span>
                    </div>
                    {suggestions.map((spot) => {
                      const IconComp =
                        spot.spotType === 'temple' ? Flame :
                          spot.spotType === 'nature' ? Trees :
                            spot.spotType === 'monument' ? Landmark :
                              spot.spotType === 'beach' ? Sun :
                                MapPin;

                      return (
                        <button
                          key={spot.id}
                          type="button"
                          onClick={() => {
                            setDestination(spot.name);
                            setShowDropdown(false);
                          }}
                          className="w-full px-3.5 py-3 text-left hover:bg-emerald-50 transition-colors flex items-center gap-2.5 cursor-pointer group min-h-[44px]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-emerald-500 group-hover:text-white text-slate-600 flex items-center justify-center shrink-0">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-[#0B2545] group-hover:text-emerald-700">
                                {spot.name}
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/60">
                                {spot.state}
                              </span>
                              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                                {spot.coordinates.lat.toFixed(2)}°, {spot.coordinates.lng.toFixed(2)}°
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 truncate mt-0.5">{spot.fullName}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Destination Pills (44px min height for ergonomic tapping) */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span className="text-xs font-bold text-slate-500">Popular:</span>
                  {quickDests.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setDestination(item.name);
                        setShowDropdown(false);
                      }}
                      className={`min-h-[44px] px-3.5 py-2 rounded-full border transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold ${
                        destination.toLowerCase() === item.name.toLowerCase()
                          ? 'bg-[#00B074] text-white border-[#00B074] shadow-xs'
                          : item.isHighlight
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:border-emerald-500'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                      }`}
                    >
                      {item.isHighlight && <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid 2-cols: Duration & Travelers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Field 2: Duration */}
                <div>
                  <label 
                    htmlFor="hero-duration-select"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#00B074]" />
                    <span>Trip Duration</span>
                  </label>
                  <select
                    id="hero-duration-select"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    aria-label="Trip Duration in Days"
                    className="w-full px-3.5 py-3 min-h-[44px] rounded-2xl bg-slate-50 border border-slate-300 text-slate-800 font-semibold focus:bg-white focus:outline-none focus:border-[#00B074] focus:ring-4 focus:ring-emerald-500/10 text-sm cursor-pointer"
                  >
                    <option value={1}>1 Day (Express Day Trip)</option>
                    <option value={2}>2 Days (Weekend Getaway)</option>
                    <option value={3}>3 Days (Optimal Escape)</option>
                    <option value={4}>4 Days (Deep Exploration)</option>
                    <option value={5}>5 Days (Complete Holiday)</option>
                    <option value={7}>1 Week (Extended Journey)</option>
                  </select>
                </div>

                {/* Field 3: Travelers */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#00B074]" />
                    <span>Travelers</span>
                  </label>
                  <div className="flex items-center justify-between px-3 py-1.5 min-h-[44px] rounded-2xl bg-slate-50 border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-300 text-slate-800 font-extrabold text-base hover:bg-slate-100 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      aria-label="Decrease traveler count"
                    >
                      -
                    </button>
                    <span className="font-bold text-slate-800 text-sm px-2">
                      {travelers} {travelers === 1 ? 'Traveler (Solo)' : travelers === 2 ? 'Travelers (Couple)' : 'Friends/Family'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.min(12, travelers + 1))}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-300 text-slate-800 font-extrabold text-base hover:bg-slate-100 active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      aria-label="Increase traveler count"
                    >
                      +
                    </button>
                  </div>
                </div>

              </div>

              {/* Field 4: Budget with Slider AND Exact Number Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label 
                    htmlFor="hero-budget-slider"
                    className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#00B074]" />
                    <span>Total Group Budget</span>
                  </label>
                  
                  {/* Direct Exact Budget Input */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Exact:</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        id="hero-exact-budget"
                        min={1000}
                        max={100000}
                        step={500}
                        value={budget}
                        onChange={(e) => setBudget(Math.max(1000, Number(e.target.value)))}
                        aria-label="Type exact total budget"
                        className="w-28 px-3 py-1 text-right font-extrabold text-[#00B074] bg-emerald-50/90 border border-emerald-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      (~{formatCurrency(Math.round(budget / Math.max(1, travelers)), currency)}/p)
                    </span>
                  </div>
                </div>

                <input
                  id="hero-budget-slider"
                  type="range"
                  min={2000}
                  max={50000}
                  step={500}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  aria-label="Total Group Budget Slider"
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#00B074]"
                />

                <div className="flex justify-between text-xs sm:text-sm font-bold text-slate-600 pt-0.5 gap-1">
                  <span>{formatCurrency(2000, currency)} (Budget)</span>
                  <span className="hidden xs:inline">{formatCurrency(10000, currency)}</span>
                  <span className="hidden sm:inline">{formatCurrency(25000, currency)}</span>
                  <span>{formatCurrency(50000, currency)}+ (Comfort)</span>
                </div>
              </div>

              {/* Submit CTA Pill Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="btn-liquid-primary flex-1 min-h-[52px] flex items-center justify-center gap-2 py-4 px-6 rounded-full text-white font-display font-bold text-base shadow-xl shadow-emerald-500/30 group"
                >
                  <Sparkles className="w-5 h-5 text-emerald-100 shrink-0" />
                  <span className="whitespace-nowrap">Plan My Trip (Instant AI)</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={onExplore}
                  className="btn-liquid-glass min-h-[52px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-slate-800 font-bold text-sm whitespace-nowrap"
                >
                  <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Explore Destinations</span>
                </button>
              </div>

            </form>

            {/* Budget Guarantee Explanatory Modal */}
            {showGuaranteeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#00B074] flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#0B2545]">TripVerse Budget Guarantee</h3>
                        <p className="text-xs text-slate-500">100% Transparency • Zero Hidden Surcharges</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGuaranteeModal(false)}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      aria-label="Close Budget Guarantee modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    <p>
                      Every TripVerse itinerary is generated with real-world financial precision so you never run out of funds on the highway:
                    </p>
                    <ul className="space-y-2 pt-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Verified NHAI Toll Tariffs:</strong> Real FastTag plaza rates are pre-calculated for your exact highway route.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Live Mileage & Fuel Costs:</strong> Computed based on state fuel taxes and your vehicle type (Petrol/Diesel/EV).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Partner Price Protection:</strong> If verified highway tolls or hotel rack rates exceed our estimate on your travel dates, TripVerse credits the difference.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowGuaranteeModal(false)}
                      className="w-full py-3 min-h-[44px] rounded-2xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                    >
                      Got it, thanks!
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Real figure, shape and functionality of a real smartphone */}
          <div className="lg:col-span-5 flex justify-center">
            <InteractivePhoneDevice currency={currency} activeTrip={activeTrip} onQuickPlan={onQuickPlan} />
          </div>

        </div>

      </div>
    </section>
  );
};
