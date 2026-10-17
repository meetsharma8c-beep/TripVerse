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
  ShieldCheck,
  Search,
  BookOpen,
  Mic
} from 'lucide-react';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { searchLocations, PreciseLocation } from '../../services/locationService';
import { Trip, Destination } from '../../types/trip';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
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
  onOpenPlanner?: () => void;
  onSelectDestination?: (dest: Destination) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  activeTrip,
  onQuickPlan,
  onExplore,
  onOpenPlanner,
  onSelectDestination
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

  // Mobile Inspiring Destinations Carousel state (Matching Reference Image Screen 1)
  const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const featuredDestinations = POPULAR_DESTINATIONS.slice(0, 3);

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const cardWidth = 156;
    const newIndex = Math.min(2, Math.max(0, Math.round(scrollLeft / cardWidth)));
    setCarouselActiveIndex(newIndex);
  };

  const scrollCarouselToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const cardWidth = 156;
    carouselRef.current.scrollTo({
      left: index * cardWidth,
      behavior: 'smooth'
    });
    setCarouselActiveIndex(index);
  };

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
    <section className="relative overflow-hidden pt-2 pb-12 sm:pb-16 lg:pb-20">
      {/* Background soft sage gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-[#E2EBE1]/60 via-[#EAF0E9]/30 to-transparent pointer-events-none -z-10 blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* PRIMARY HERO HEADER (Matching Reference Image Screen 1) */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8EFE7] border border-[#DCE7DB] text-[#2D5A3D] text-xs font-bold shadow-2xs mb-4">
            <Sparkles className="w-4 h-4 text-[#2D5A3D] shrink-0 animate-pulse" />
            <span>AI-Powered Travel Planning Made Effortless</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-[#152A1C] dark:text-slate-100 tracking-tight leading-[1.1] mb-3 text-balance">
            Your Journey,<br className="hidden sm:inline" />
            <span className="font-serif italic font-normal text-[#2D5A3D] dark:text-[#34D399]">Intelligently </span>Planned.
          </h1>

          <p className="text-base sm:text-lg text-[#57685D] max-w-2xl font-normal leading-relaxed text-pretty mb-6">
            AI-powered travel planning made effortless. Plan custom day-by-day itineraries, highway pit stops, and budget-optimized routes.
          </p>

          {/* Serene Ethereal Landscape Visual (Matching Reference Image Screen 1 Hero Artwork) */}
          <div className="relative rounded-[32px] overflow-hidden border border-[#E2EBE1] shadow-[0_12px_40px_rgba(45,90,61,0.08)] bg-[#EAF0E9] group">
            <img
              src="/images/hero-nature-serene.jpg"
              alt="Serene nature landscape with misty mountains, lake, and pagoda"
              className="w-full h-60 sm:h-72 md:h-84 lg:h-96 object-cover object-center transition-transform duration-700 group-hover:scale-[1.01]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Floating Pill Search Bar (Matching Reference Image Screen 1) */}
          <div className="relative max-w-2xl mx-auto -mt-7 sm:-mt-8 z-30 px-2 sm:px-4">
            <form onSubmit={handleSubmit} className="relative">
              <div className="bg-white rounded-full p-2 pl-4 sm:pl-6 shadow-[0_12px_36px_-6px_rgba(45,90,61,0.20)] border border-[#E2EBE1] flex items-center justify-between gap-2.5 transition-all focus-within:ring-4 focus-within:ring-[#2D5A3D]/15 focus-within:border-[#2D5A3D]">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Search className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    id="hero-floating-destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Where do you want to go?"
                    className="w-full bg-transparent dark:bg-transparent text-sm sm:text-base font-semibold text-[#152A1C] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none border-0 ring-0 focus:ring-0 shadow-none"
                    style={{ backgroundColor: 'transparent' }}
                  />
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 text-[#2D5A3D] animate-spin shrink-0" />
                  ) : destination.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDestination('');
                        setSuggestions([]);
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#2D5A3D] hover:bg-[#244931] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#2D5A3D]/30 active:scale-95 transition-all cursor-pointer"
                  aria-label="Search destination"
                  title="Search destination"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute left-2 right-2 sm:left-4 sm:right-4 top-full mt-2 bg-white rounded-3xl border border-[#E2EBE1] shadow-2xl z-50 overflow-hidden divide-y divide-[#E2EBE1] max-h-60 overflow-y-auto animate-in fade-in">
                  <div className="px-4 py-2 bg-[#F4F6F2] text-[11px] font-bold uppercase tracking-wider text-[#57685D] flex items-center justify-between">
                    <span>Suggested Places</span>
                    <span>Verified Geocoding</span>
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
                        className="w-full px-4 py-3 text-left hover:bg-[#E8EFE7] transition-colors flex items-center gap-3 cursor-pointer group min-h-[44px]"
                      >
                        <div className="w-8 h-8 rounded-xl bg-[#E8EFE7] text-[#2D5A3D] group-hover:bg-[#2D5A3D] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#152A1C] truncate">
                            {spot.name}
                          </div>
                          <div className="text-xs text-[#57685D] truncate">
                            {spot.state || spot.country || 'Worldwide destination'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </form>
          </div>

          {/* Inspiring Destinations Carousel (Matching Reference Image Screen 1 for Mobile) */}
          <div className="mt-8 sm:mt-10 lg:hidden">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-base font-display font-bold text-[#152A1C]">
                Inspiring Destinations
              </h3>
              <button
                type="button"
                onClick={onExplore}
                className="text-xs font-bold text-[#2D5A3D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>See all</span>
              </button>
            </div>

            {/* Horizontal Snap Carousel */}
            <div 
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-4 px-4"
            >
              {featuredDestinations.map((dest) => (
                <div
                  key={dest.id}
                  onClick={() => {
                    if (onSelectDestination) {
                      onSelectDestination(dest);
                    } else {
                      onQuickPlan({
                        destination: dest.name,
                        duration: 3,
                        travelers: 2,
                        budget: dest.startBudget
                      });
                    }
                  }}
                  className="w-36 sm:w-44 h-48 sm:h-56 rounded-3xl overflow-hidden relative shrink-0 snap-start shadow-md border border-[#E2EBE1] cursor-pointer group active:scale-98 transition-transform"
                >
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                  
                  {/* Bottom details */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-1 text-white">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold font-display truncate drop-shadow-md">{dest.name}</h4>
                      <p className="text-[11px] text-white/80 font-medium truncate drop-shadow-sm">{dest.state}</p>
                    </div>
                    {/* Circular White Arrow Button */}
                    <div className="w-6 h-6 rounded-full bg-white text-[#152A1C] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Dots (Matching Reference Image Screen 1) */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              {featuredDestinations.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollCarouselToIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    carouselActiveIndex === idx
                      ? 'w-4 bg-[#2D5A3D]'
                      : 'w-1.5 bg-[#CBD5E1]'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Quick Actions Grid (Matching Reference Image Screen 1) */}
          <div className="mt-8 sm:mt-12">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#57685D]">
                Quick Actions
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {/* 1. AI Itinerary */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenPlanner) onOpenPlanner();
                }}
                className="flex flex-col items-center justify-center p-2.5 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] shadow-xs hover:shadow-md transition-all group cursor-pointer text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all shadow-2xs">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#152A1C] truncate w-full">AI Itinerary</span>
              </button>

              {/* 2. Smart Route */}
              <button
                type="button"
                onClick={() => {
                  onQuickPlan({
                    destination: destination.trim() || 'Udaipur',
                    duration,
                    travelers,
                    budget
                  });
                }}
                className="flex flex-col items-center justify-center p-2.5 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] shadow-xs hover:shadow-md transition-all group cursor-pointer text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all shadow-2xs">
                  <Compass className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#152A1C] truncate w-full">Smart Route</span>
              </button>

              {/* 3. Budget Plan */}
              <button
                type="button"
                onClick={() => setShowGuaranteeModal(true)}
                className="flex flex-col items-center justify-center p-2.5 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] shadow-xs hover:shadow-md transition-all group cursor-pointer text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all shadow-2xs">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#152A1C] truncate w-full">Budget Plan</span>
              </button>

              {/* 4. Travel Guide */}
              <button
                type="button"
                onClick={onExplore}
                className="flex flex-col items-center justify-center p-2.5 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] shadow-xs hover:shadow-md transition-all group cursor-pointer text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all shadow-2xs">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#152A1C] truncate w-full">Travel Guide</span>
              </button>
            </div>
          </div>

          {/* AI Teaser Card with 3D Robot Mascot (Matching Reference Image Screen 1) */}
          <div
            onClick={() => {
              if (onOpenPlanner) onOpenPlanner();
            }}
            className="mt-6 rounded-3xl bg-[#EAF0E9] border border-[#DCE6DA] p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-[#2D5A3D] hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white text-[#2D5A3D] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-[#2D5A3D]" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-[#152A1C] leading-snug">
                  Let AI craft your perfect trip
                </h4>
                <p className="text-xs text-[#57685D] mt-0.5">
                  Personalized. Optimized. Unforgettable.
                </p>
              </div>
            </div>
            <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white p-1 shadow-xs border border-white group-hover:scale-105 transition-transform">
              <img
                src="/images/ai-robot-mascot.jpg"
                alt="TripVerse AI Travel Mascot"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>

        </div>

        {/* Two-Column Grid: Interactive Setup Card + Live Device Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto mt-6">

          {/* Left Column: Interactive Planning Setup Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-[#2D5A3D]/5 border border-[#E2EBE1] relative">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E2EBE1] flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">Trip Parameters</span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#152A1C]">Plan in 30 Seconds</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuaranteeModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A3D] bg-[#E8EFE7] hover:bg-[#DCE7DB] px-3.5 py-2 min-h-[44px] rounded-full border border-[#DCE7DB] transition-all cursor-pointer shadow-2xs"
                title="Learn how TripVerse budget estimates work"
              >
                <CheckCircle2 className="w-4 h-4 text-[#2D5A3D] shrink-0" />
                <span>Budget Estimates</span>
                <Info className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Field 1: Destination with Precision Autocomplete */}
              <div className="relative">
                <label 
                  htmlFor="hero-planner-destination-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#152A1C] mb-1.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Destination or Specific Spot</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#2D5A3D] bg-[#EAF0E9] px-2.5 py-0.5 rounded-full border border-[#DCE7DB]">
                    Any Spot Worldwide
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="hero-planner-destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Enter spot or route (e.g. Udaipur, Manali, Chopta, Goa, Hallstatt)..."
                    className="w-full pl-4 pr-10 py-3 sm:py-3.5 min-h-[44px] rounded-2xl bg-[#F4F6F2] border border-[#DCE7DB] text-[#152A1C] font-semibold placeholder:text-[#57685D] focus:bg-white focus:outline-none focus:border-[#2D5A3D] focus:ring-4 focus:ring-[#2D5A3D]/10 transition-all text-sm sm:text-base"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 text-[#2D5A3D] animate-spin" />
                    ) : destination.trim().length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDestination('');
                          setSuggestions([]);
                        }}
                        className="text-slate-400 hover:text-[#152A1C] p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
                        aria-label="Clear destination input"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Autocomplete Dropdown */}
                {showDropdown && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-[#E2EBE1] shadow-2xl z-50 overflow-hidden divide-y divide-[#E2EBE1] max-h-60 overflow-y-auto animate-in fade-in">
                    <div className="px-3 py-1.5 bg-[#F4F6F2] text-[11px] font-bold uppercase tracking-wider text-[#57685D] flex items-center justify-between">
                      <span>Matching Spots</span>
                      <span>Map search result</span>
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
                          className="w-full px-3.5 py-3 text-left hover:bg-[#E8EFE7] transition-colors flex items-center gap-2.5 cursor-pointer group min-h-[44px]"
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#E8EFE7] group-hover:bg-[#2D5A3D] group-hover:text-white text-[#2D5A3D] flex items-center justify-center shrink-0 transition-colors">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-[#152A1C] group-hover:text-[#2D5A3D]">
                                {spot.name}
                              </span>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F4F6F2] text-[#57685D] border border-[#E2EBE1]">
                                {spot.state}
                              </span>
                              <span className="text-[11px] font-mono text-[#2D5A3D] bg-[#E8EFE7] px-1.5 py-0.5 rounded border border-[#DCE7DB]">
                                {spot.coordinates.lat.toFixed(2)}°, {spot.coordinates.lng.toFixed(2)}°
                              </span>
                            </div>
                            <p className="text-xs text-[#57685D] truncate mt-0.5">{spot.fullName}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Quick Destination Pills (44px min height for ergonomic tapping) */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span className="text-xs font-bold text-[#57685D]">Popular:</span>
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
                          ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-xs'
                          : item.isHighlight
                            ? 'bg-[#E8EFE7] text-[#2D5A3D] border-[#DCE7DB] hover:border-[#2D5A3D]'
                            : 'bg-white text-slate-700 border-[#DCE7DB] hover:border-[#2D5A3D] hover:bg-[#F4F6F2]'
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
                    className="block text-xs font-bold uppercase tracking-wider text-[#152A1C] mb-1.5 flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Trip Duration</span>
                  </label>
                  <select
                    id="hero-duration-select"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    aria-label="Trip Duration in Days"
                    className="w-full px-3.5 py-3 min-h-[44px] rounded-2xl bg-[#F4F6F2] border border-[#DCE7DB] text-[#152A1C] font-semibold focus:bg-white focus:outline-none focus:border-[#2D5A3D] focus:ring-4 focus:ring-[#2D5A3D]/10 text-sm cursor-pointer"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#152A1C] mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Travelers</span>
                  </label>
                  <div className="flex items-center justify-between px-3 py-1.5 min-h-[44px] rounded-2xl bg-[#F4F6F2] border border-[#DCE7DB]">
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.max(1, travelers - 1))}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-[#DCE7DB] text-[#152A1C] font-extrabold text-base hover:bg-[#EAF0E9] active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      aria-label="Decrease traveler count"
                    >
                      -
                    </button>
                    <span className="font-bold text-[#152A1C] text-sm px-2">
                      {travelers} {travelers === 1 ? 'Traveler (Solo)' : travelers === 2 ? 'Travelers (Couple)' : 'Friends/Family'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTravelers(Math.min(12, travelers + 1))}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-[#DCE7DB] text-[#152A1C] font-extrabold text-base hover:bg-[#EAF0E9] active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
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
                    className="text-xs font-bold uppercase tracking-wider text-[#152A1C] flex items-center gap-1.5"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Total Group Budget</span>
                  </label>
                  
                  {/* Direct Exact Budget Input */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#57685D]">Exact:</span>
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
                        className="w-28 px-3 py-1 text-right font-extrabold text-[#2D5A3D] bg-[#E8EFE7] border border-[#DCE7DB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
                      />
                    </div>
                    <span className="text-xs font-medium text-[#57685D]">
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
                  className="w-full h-2.5 bg-[#DCE7DB] rounded-lg appearance-none cursor-pointer accent-[#2D5A3D]"
                />

                <div className="flex justify-between text-xs sm:text-sm font-bold text-[#57685D] pt-0.5 gap-1">
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
                  className="btn-liquid-primary flex-1 min-h-[52px] flex items-center justify-center gap-2 py-4 px-6 rounded-full text-white font-display font-bold text-base shadow-xl shadow-[#2D5A3D]/25 group"
                >
                  <Sparkles className="w-5 h-5 text-emerald-100 shrink-0" />
                  <span className="whitespace-nowrap">Plan My Trip (Instant AI)</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={onExplore}
                  className="btn-liquid-glass min-h-[52px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-[#152A1C] font-bold text-sm whitespace-nowrap"
                >
                  <Compass className="w-4 h-4 text-[#2D5A3D] shrink-0" />
                  <span>Explore Destinations</span>
                </button>
              </div>

            </form>

            {/* Budget Guarantee Explanatory Modal */}
            {showGuaranteeModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E2EBE1] space-y-4 animate-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2EBE1]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#152A1C]">About budget estimates</h3>
                        <p className="text-xs text-[#57685D]">Planning guidance, not a price guarantee</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGuaranteeModal(false)}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      aria-label="Close budget estimate information"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm text-[#57685D] leading-relaxed">
                    <p>
                      TripVerse creates planning estimates from your trip details. Actual costs may differ:
                    </p>
                    <ul className="space-y-2 pt-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#2D5A3D] shrink-0 mt-0.5" />
                        <span><strong>Road cost estimates:</strong> Toll and fuel costs are not live quotes. Check current rates on your selected route before travelling.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#2D5A3D] shrink-0 mt-0.5" />
                        <span><strong>Fuel estimates:</strong> These are not live fuel prices or vehicle-specific guarantees. Check current rates before travel.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#2D5A3D] shrink-0 mt-0.5" />
                        <span><strong>Planning estimates:</strong> Trip budgets and transport costs are estimates, not live quotes or guaranteed prices. Confirm rates with providers before booking.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowGuaranteeModal(false)}
                      className="w-full py-3 min-h-[44px] rounded-2xl bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
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
