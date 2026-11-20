import React, { useState, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { LiquidSearchDock } from '../ui/liquid';
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
  BookOpen
} from 'lucide-react';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { searchLocations, PreciseLocation } from '../../services/locationService';
import { Trip, Destination } from '../../types/trip';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { ScrollReveal } from '../common/ScrollReveal';

const InteractivePhoneDevice = lazy(() =>
  import('./InteractivePhoneDevice').then((m) => ({ default: m.InteractivePhoneDevice }))
);

interface HeroSectionProps {
  activeTrip?: Trip | null;
  onQuickPlan?: (params: {
    destination?: string;
    duration?: number;
    travelers?: number;
    budget?: number;
    budgetMode?: 'total' | 'per_person';
  }) => void;
  onExplore: () => void;
  onOpenPlanner?: (params?: {
    destination?: string;
    duration?: number;
    travelers?: number;
    budget?: number;
    budgetMode?: 'per_person' | 'total';
  }) => void;
  onSelectDestination?: (dest: Destination) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  activeTrip,
  onQuickPlan,
  onExplore,
  onOpenPlanner,
  onSelectDestination
}) => {
  const { t } = useLanguage();
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState(3);
  const [travelers, setTravelers] = useState(3);
  const [budgetMode, setBudgetMode] = useState<'total' | 'per_person'>('total');
  const [budget, setBudget] = useState(8000);
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());
  const [heroVideoError, setHeroVideoError] = useState(false);
  const [heroVideoPlaying, setHeroVideoPlaying] = useState(false);
  const heroVideoRef = React.useRef<HTMLVideoElement>(null);

  // Seamless automated loop playback across all OS & Low Power Mode (iOS/Android/macOS/Windows)
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video || heroVideoError) return;

    // Respect Data Saver (cellular roaming) and Reduced Motion accessibility settings
    const conn = (navigator as any)?.connection;
    const isDataSaver = Boolean(conn?.saveData || /^(?:slow-2g|2g)$/i.test(conn?.effectiveType || ''));
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (isDataSaver || prefersReducedMotion) {
      setHeroVideoPlaying(false);
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.controls = false;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('autoplay', '');

    const attemptAutoPlay = () => {
      if (!video || heroVideoError) return;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setHeroVideoPlaying(true);
          })
          .catch(() => {
            // If iOS Low Power Mode or strict battery saver blocks HTML5 video autoplay,
            // keep heroVideoPlaying false so the <video> stays hidden (never showing a native play button)
            // while the continuous Ken Burns poster animation runs underneath.
            setHeroVideoPlaying(false);
          });
      }
    };

    attemptAutoPlay();

    const handleVisibilityOrTouch = () => {
      if (document.visibilityState === 'visible' && video.paused) {
        attemptAutoPlay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrTouch, { passive: true });
    window.addEventListener('touchstart', handleVisibilityOrTouch, { passive: true, once: true });
    window.addEventListener('click', handleVisibilityOrTouch, { passive: true, once: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrTouch);
      window.removeEventListener('touchstart', handleVisibilityOrTouch);
      window.removeEventListener('click', handleVisibilityOrTouch);
    };
  }, [heroVideoError]);

  // Location suggestions state
  const [suggestions, setSuggestions] = useState<PreciseLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFloatingDropdown, setShowFloatingDropdown] = useState(false);
  const [showPlannerDropdown, setShowPlannerDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [plannerHighlightedIndex, setPlannerHighlightedIndex] = useState(-1);
  const [showGuaranteeModal, setShowGuaranteeModal] = useState(false);

  const floatingSearchRef = React.useRef<HTMLDivElement>(null);
  const plannerSearchRef = React.useRef<HTMLDivElement>(null);

  // Click outside to dismiss autocomplete dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (floatingSearchRef.current && !floatingSearchRef.current.contains(target)) {
        setShowFloatingDropdown(false);
      }
      if (plannerSearchRef.current && !plannerSearchRef.current.contains(target)) {
        setShowPlannerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setHighlightedIndex(-1);
    setPlannerHighlightedIndex(-1);
  }, [suggestions]);

  // Mobile Inspiring Destinations Carousel state (Matching Reference Image Screen 1)
  const [carouselActiveIndex, setCarouselActiveIndex] = useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const featuredDestinations = POPULAR_DESTINATIONS.slice(0, 3);

  const getCardStep = () => {
    if (!carouselRef.current) return 156;
    const firstCard = carouselRef.current.firstElementChild as HTMLElement | null;
    if (!firstCard) return 156;
    const cardRect = firstCard.getBoundingClientRect();
    const nextCard = firstCard.nextElementSibling as HTMLElement | null;
    if (nextCard) {
      const nextRect = nextCard.getBoundingClientRect();
      const step = nextRect.left - cardRect.left;
      if (step > 0) return step;
    }
    return cardRect.width + 12;
  };

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const step = getCardStep();
    const newIndex = Math.min(featuredDestinations.length - 1, Math.max(0, Math.round(scrollLeft / step)));
    setCarouselActiveIndex(newIndex);
  };

  const scrollCarouselToIndex = (index: number) => {
    if (!carouselRef.current) return;
    const cards = carouselRef.current.children;
    if (cards[index]) {
      (cards[index] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });
      setCarouselActiveIndex(index);
      return;
    }
    const step = getCardStep();
    carouselRef.current.scrollTo({
      left: index * step,
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

  // Debounced search for hero destination input with stale-response guard
  useEffect(() => {
    let isCurrent = true;

    if (!destination || destination.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(destination);
        if (isCurrent) {
          setSuggestions(results);
        }
      } catch {
        // ignore
      } finally {
        if (isCurrent) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [destination]);

  const quickDests: { name: string; label: string }[] = [
    { name: 'Paris', label: 'Paris' },
    { name: 'Tokyo', label: 'Tokyo' },
    { name: 'Santorini', label: 'Santorini' },
    { name: 'Bali', label: 'Bali' },
    { name: 'New York City', label: 'New York' },
    { name: 'Swiss Alps', label: 'Swiss Alps' },
    { name: 'Dubai', label: 'Dubai' },
    { name: 'Udaipur', label: 'Udaipur' },
    { name: 'Goa', label: 'Goa' }
  ];

  const handleSelectFloatingSuggestion = (spot: PreciseLocation) => {
    setDestination(spot.name);
    setShowFloatingDropdown(false);
    setShowPlannerDropdown(false);
    setHighlightedIndex(-1);
    const planParams = {
      destination: spot.name,
      duration,
      travelers,
      budget,
      budgetMode,
    };
    if (onOpenPlanner) {
      onOpenPlanner(planParams);
    } else if (onQuickPlan) {
      onQuickPlan(planParams);
    }
  };

  const handleFloatingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showFloatingDropdown) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setShowFloatingDropdown(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowFloatingDropdown(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectFloatingSuggestion(suggestions[highlightedIndex]);
      }
    }
  };

  const handlePlannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPlannerDropdown) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setShowPlannerDropdown(true);
        setPlannerHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPlannerHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPlannerHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowPlannerDropdown(false);
      setPlannerHighlightedIndex(-1);
    } else if (e.key === 'Enter') {
      if (plannerHighlightedIndex >= 0 && suggestions[plannerHighlightedIndex]) {
        e.preventDefault();
        const selected = suggestions[plannerHighlightedIndex];
        setDestination(selected.name);
        setShowPlannerDropdown(false);
        setPlannerHighlightedIndex(-1);
      }
    }
  };

  const handleFloatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetDest =
      showFloatingDropdown && highlightedIndex >= 0 && suggestions[highlightedIndex]
        ? suggestions[highlightedIndex].name
        : destination.trim();

    if (targetDest) {
      setDestination(targetDest);
    }
    setShowFloatingDropdown(false);
    setHighlightedIndex(-1);
    const planParams = {
      destination: targetDest || undefined,
      duration,
      travelers,
      budget,
      budgetMode,
    };
    if (onOpenPlanner) {
      onOpenPlanner(planParams);
    } else if (onQuickPlan) {
      onQuickPlan(planParams);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPlannerDropdown(false);
    setShowFloatingDropdown(false);
    setPlannerHighlightedIndex(-1);
    const targetDest =
      showPlannerDropdown && plannerHighlightedIndex >= 0 && suggestions[plannerHighlightedIndex]
        ? suggestions[plannerHighlightedIndex].name
        : destination.trim();

    if (targetDest) {
      setDestination(targetDest);
    }
    const planParams = {
      destination: targetDest || undefined,
      duration,
      travelers,
      budget,
      budgetMode,
    };
    if (onOpenPlanner) {
      onOpenPlanner(planParams);
    } else if (onQuickPlan) {
      onQuickPlan(planParams);
    }
  };

  const solarContext = (() => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 10) {
      return {
        label: 'Morning Mist Window',
        aura: 'from-teal-200/45 via-[#E2EBE1]/35 to-transparent dark:from-teal-900/35 dark:via-emerald-950/20',
        dot: 'bg-teal-400',
      };
    }
    if (hr >= 10 && hr < 16) {
      return {
        label: 'Peak Daylight Routes',
        aura: 'from-[#DCEBDB]/65 via-[#EAF0E9]/35 to-transparent dark:from-emerald-900/30 dark:via-slate-900/20',
        dot: 'bg-emerald-500',
      };
    }
    if (hr >= 16 && hr < 19) {
      return {
        label: 'Golden Hour Window',
        aura: 'from-amber-200/45 via-[#EAF0E9]/30 to-transparent dark:from-amber-900/25 dark:via-emerald-950/20',
        dot: 'bg-amber-400',
      };
    }
    return {
      label: 'Night Travel & Safe Stays',
      aura: 'from-emerald-900/18 via-slate-200/30 to-transparent dark:from-emerald-950/45 dark:via-slate-900/35',
      dot: 'bg-emerald-400',
    };
  })();

  return (
    <section className="relative overflow-hidden pt-2 pb-12 sm:pb-16 lg:pb-20">
      {/* Adaptive Solar-Synchronized Ambient Aura Wash */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b ${solarContext.aura} pointer-events-none -z-10 blur-3xl transition-colors duration-1000`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* PRIMARY HERO HEADER (Matching Reference Image Screen 1) */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8EFE7] dark:bg-emerald-950/60 border border-[#DCE7DB] dark:border-emerald-800/60 text-[#2D5A3D] dark:text-emerald-300 text-xs font-bold shadow-2xs mb-4 tv-stagger-1">
            <Sparkles className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400 shrink-0 animate-pulse" />
            <span>AI-Powered Travel Planning Made Effortless</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-black text-[#152A1C] dark:text-slate-100 tracking-tight leading-[1.08] mb-3.5 text-balance tv-stagger-1">
            Your Journey,{' '}<br className="hidden sm:inline" />
            <span className="font-serif italic font-normal text-[#2D5A3D] dark:text-[#34D399]">Intelligently </span>Planned.
          </h1>

          <p className="text-base sm:text-lg text-[#57685D] dark:text-slate-300 max-w-2xl font-normal leading-relaxed text-pretty mb-6 tv-stagger-2">
            AI-powered travel planning made effortless. Plan custom day-by-day itineraries, highway pit stops, and budget-optimized routes.
          </p>

          {/* Serene Dynamic Landscape Visual */}
          <div className="relative rounded-[32px] overflow-hidden border border-white/70 dark:border-white/10 shadow-[0_24px_60px_-14px_rgba(45,90,61,0.2)] dark:shadow-[0_24px_60px_-14px_rgba(0,0,0,0.65)] bg-[#EAF0E9] dark:bg-slate-900 group tv-stagger-2 h-60 sm:h-72 md:h-84 lg:h-96">
            {/* Ambient Live Telemetry Floating Pill (Solar Window & Route Readiness) */}
            <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2 pointer-events-none">
              <div className="glass-clear liquid-rim pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#152A1C] dark:text-slate-100">
                <span className={`w-2 h-2 rounded-full ${solarContext.dot} animate-pulse shrink-0`} />
                <span>{solarContext.label}</span>
                {activeTrip?.destination && (
                  <span className="hidden sm:inline font-serif italic font-normal text-[#2D5A3D] dark:text-emerald-300 border-l border-slate-300/60 dark:border-white/15 pl-2">
                    Active: {activeTrip.destination.split(',')[0]}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onExplore}
                className="min-h-0 pointer-events-auto glass-clear liquid-rim liquid-press hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#2D5A3D] dark:text-emerald-300 hover:scale-[1.03] cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{t('hero.exploreDestinations')}</span>
              </button>
            </div>
            {/* Continuous automated Ken Burns scenic animation (also guarantees zero play icon if OS battery saver blocks video) */}
            <img
              src="/videos/app-opening-poster.jpg"
              alt="Serene nature landscape with misty mountains and lake"
              className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none tv-hero-ambient-loop"
              loading="eager"
            />

            {/* Ambient Cross-Device Video Scenery — only visible while actively playing so iOS Low Power Mode never overlays a Play button */}
            {!heroVideoError && (
              <video
                ref={heroVideoRef}
                src="/videos/app-opening.mp4"
                autoPlay
                loop
                muted
                playsInline
                controls={false}
                // @ts-ignore
                webkit-playsinline="true"
                x5-playsinline="true"
                x5-video-player-type="h5"
                preload="metadata"
                disablePictureInPicture
                disableRemotePlayback
                onPlaying={() => setHeroVideoPlaying(true)}
                onPause={() => {
                  // Immediately resume if paused by system or hide to prevent play button overlay
                  const v = heroVideoRef.current;
                  if (v) {
                    v.muted = true;
                    v.play().catch(() => setHeroVideoPlaying(false));
                  }
                }}
                onEnded={() => {
                  const v = heroVideoRef.current;
                  if (v) {
                    v.currentTime = 0;
                    v.play().catch(() => {});
                  }
                }}
                onError={() => {
                  setHeroVideoPlaying(false);
                  setHeroVideoError(true);
                }}
                width={1280}
                height={720}
                className={`tv-ambient-video relative z-10 w-full h-full object-cover object-center pointer-events-none select-none transition-opacity duration-500 ${
                  heroVideoPlaying ? 'opacity-100' : 'opacity-0'
                }`}
              />
            )}
            <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none select-none" />
          </div>

          {/* Floating Liquid Glass Capsule Search Dock */}
          <div ref={floatingSearchRef} className="relative max-w-2xl mx-auto -mt-7 sm:-mt-8 z-30 px-2 sm:px-4 tv-stagger-3">
            <form onSubmit={handleFloatingSubmit} className="relative">
              <LiquidSearchDock>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Search className="w-5 h-5 text-[#57685D] dark:text-slate-400 shrink-0" />
                  <input
                    id="hero-floating-destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setShowFloatingDropdown(true);
                    }}
                    onFocus={() => setShowFloatingDropdown(true)}
                    onKeyDown={handleFloatingKeyDown}
                    placeholder={t('hero.searchPlaceholder')}
                    className="w-full bg-transparent dark:bg-transparent text-sm sm:text-base font-semibold text-[#152A1C] dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none border-0 ring-0 focus:ring-0 shadow-none"
                    style={{ backgroundColor: 'transparent' }}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={showFloatingDropdown}
                    aria-controls="hero-floating-search-dropdown"
                  />
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400 animate-spin shrink-0" />
                  ) : destination.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDestination('');
                        setSuggestions([]);
                        setShowFloatingDropdown(false);
                      }}
                      className="min-h-0 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      aria-label={t('hero.clearSearch')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>

                <button
                  type="submit"
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full glass-accent liquid-rim liquid-press text-white flex items-center justify-center shrink-0 cursor-pointer"
                  aria-label={t('hero.searchDestination')}
                  title={t('hero.searchDestination')}
                >
                  <Search className="w-5 h-5" />
                </button>
              </LiquidSearchDock>

              {/* Autocomplete Dropdown */}
              {showFloatingDropdown && (suggestions.length > 0 || isSearching || destination.trim().length >= 2) && (
                <div 
                  id="hero-floating-search-dropdown"
                  role="listbox"
                  className="absolute left-2 right-2 sm:left-4 sm:right-4 top-full mt-2 glass-elevated liquid-rim rounded-3xl z-50 overflow-hidden divide-y divide-[#E2EBE1]/70 dark:divide-slate-800/80 max-h-72 overflow-y-auto animate-in fade-in"
                >
                  <div className="px-4 py-2 bg-[#F4F6F2] dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 flex items-center justify-between">
                    <span>{t('hero.suggestedPlaces')}</span>
                    <span>{t('hero.verifiedGeocoding')}</span>
                  </div>

                  {suggestions.map((spot, index) => {
                    const isSelected = highlightedIndex === index;
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
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => handleSelectFloatingSuggestion(spot)}
                        className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-3 cursor-pointer group min-h-[52px] ${
                          isSelected
                            ? 'bg-[#E8EFE7] dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-400'
                            : 'hover:bg-[#E8EFE7]/60 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        {spot.image ? (
                          <img
                            src={spot.image}
                            alt={spot.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#DCE7DB] dark:border-slate-700"
                            loading="lazy"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#2D5A3D] text-white'
                              : 'bg-[#E8EFE7] dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-400 group-hover:bg-[#2D5A3D] group-hover:text-white'
                          }`}>
                            <IconComp className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-[#152A1C] dark:text-slate-100 truncate flex items-center gap-2">
                            <span>{spot.name}</span>
                            {spot.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E8EFE7] dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-400 font-medium capitalize shrink-0">
                                {spot.category}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#57685D] dark:text-slate-400 truncate">
                            {spot.state ? `${spot.state}, ` : ''}{spot.country || 'Worldwide destination'}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#2D5A3D] dark:group-hover:text-emerald-400 shrink-0 transition-colors" />
                      </button>
                    );
                  })}

                  {isSearching && suggestions.length === 0 && (
                    <div className="px-4 py-4 text-center text-xs text-[#57685D] dark:text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2D5A3D] dark:text-emerald-400" />
                      <span>Searching destinations worldwide...</span>
                    </div>
                  )}

                  {!isSearching && suggestions.length === 0 && destination.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowFloatingDropdown(false);
                        const planParams = {
                          destination: destination.trim(),
                          duration,
                          travelers,
                          budget,
                          budgetMode,
                        };
                        if (onOpenPlanner) {
                          onOpenPlanner(planParams);
                        } else if (onQuickPlan) {
                          onQuickPlan(planParams);
                        }
                      }}
                      className="w-full px-4 py-3.5 text-left hover:bg-[#E8EFE7]/60 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#2D5A3D]/10 dark:bg-emerald-950/40 text-[#2D5A3D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-[#152A1C] dark:text-slate-100 truncate">
                          Plan trip for "{destination.trim()}"
                        </div>
                        <div className="text-xs text-[#57685D] dark:text-slate-400">
                          AI will craft a custom itinerary for any destination worldwide
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Inspiring Destinations Carousel (Matching Reference Image Screen 1 for Mobile) */}
          <div className="mt-8 sm:mt-10 lg:hidden">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-base font-display font-bold text-[#152A1C]">
                {t('hero.inspiringDestinations')}
              </h3>
              <button
                type="button"
                onClick={onExplore}
                className="text-xs font-bold text-[#2D5A3D] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{t('hero.seeAll')}</span>
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
                  role="button"
                  tabIndex={0}
                  aria-label={`Explore ${dest.name}`}
                  onClick={() => {
                    if (onSelectDestination) {
                      onSelectDestination(dest);
                    } else if (onOpenPlanner) {
                      onOpenPlanner({
                        destination: dest.name,
                      });
                    } else if (onQuickPlan) {
                      onQuickPlan({
                        destination: dest.name,
                      });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (onSelectDestination) {
                        onSelectDestination(dest);
                      } else if (onOpenPlanner) {
                        onOpenPlanner({
                          destination: dest.name,
                        });
                      } else if (onQuickPlan) {
                        onQuickPlan({
                          destination: dest.name,
                        });
                      }
                    }
                  }}
                  className="w-36 sm:w-44 h-48 sm:h-56 rounded-3xl overflow-hidden relative shrink-0 snap-start shadow-md border border-[#E2EBE1] cursor-pointer group active:scale-98 transition-transform focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
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
                      <p className="text-[11px] text-white/80 font-medium truncate drop-shadow-sm">
                        {dest.country && dest.country !== 'India' ? `${dest.state ? `${dest.state}, ` : ''}${dest.country}` : dest.state}
                      </p>
                    </div>
                    {/* Circular White Arrow Button */}
                    <div className="w-6 h-6 rounded-full bg-white text-[#152A1C] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Dots (Guaranteed Crisp & Horizontal across all Mobile / Touch OS) */}
            <div className="flex items-center justify-center gap-1 mt-2.5">
              {featuredDestinations.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  data-indicator="true"
                  onClick={() => scrollCarouselToIndex(idx)}
                  className="p-2 min-h-0 min-w-0 border-0 bg-transparent flex items-center justify-center cursor-pointer focus:outline-none"
                  aria-label={`Go to slide ${idx + 1}`}
                  aria-current={carouselActiveIndex === idx ? 'true' : 'false'}
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 pointer-events-none ${
                      carouselActiveIndex === idx
                        ? 'w-6 bg-[#2D5A3D]'
                        : 'w-2 bg-[#CBD5E1] hover:bg-slate-400'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions Grid (Matching Reference Image Screen 1) */}
          <div className="mt-8 sm:mt-12 tv-stagger-4">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#57685D]">
                {t('hero.quickActions')}
              </h3>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {/* 1. AI Itinerary */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenPlanner) onOpenPlanner();
                }}
                className="card-elevate flex flex-col items-center justify-center p-2.5 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] shadow-xs group cursor-pointer text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all duration-300 shadow-2xs">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#152A1C] truncate w-full">{t('hero.aiItinerary')}</span>
              </button>

              {/* 2. Smart Route */}
              <button
                type="button"
                onClick={() => {
                  const planParams = {
                    destination: destination.trim() || undefined,
                    duration,
                    travelers,
                    budget,
                    budgetMode
                  };
                  if (onOpenPlanner) {
                    onOpenPlanner(planParams);
                  } else if (onQuickPlan) {
                    onQuickPlan(planParams);
                  }
                }}
                className="card-elevate flex flex-col items-center justify-center p-2.5 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] shadow-xs group cursor-pointer text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all duration-300 shadow-2xs">
                  <Compass className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#152A1C] truncate w-full">{t('hero.smartRoute')}</span>
              </button>

              {/* 3. Budget Plan */}
              <button
                type="button"
                onClick={() => setShowGuaranteeModal(true)}
                className="card-elevate flex flex-col items-center justify-center p-2.5 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] shadow-xs group cursor-pointer text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all duration-300 shadow-2xs">
                  <Wallet className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#152A1C] truncate w-full">{t('hero.budgetPlan')}</span>
              </button>

              {/* 4. Travel Guide */}
              <button
                type="button"
                onClick={onExplore}
                className="card-elevate flex flex-col items-center justify-center p-2.5 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] shadow-xs group cursor-pointer text-center"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-1.5 sm:mb-2.5 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all duration-300 shadow-2xs">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-sm font-bold text-[#152A1C] truncate w-full">{t('hero.travelGuide')}</span>
              </button>
            </div>
          </div>

          {/* AI Teaser Card with 3D Robot Mascot (Matching Reference Image Screen 1) */}
          <div
            role="button"
            tabIndex={0}
            aria-label={t('hero.aiTeaserTitle')}
            onClick={() => {
              if (onOpenPlanner) onOpenPlanner();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (onOpenPlanner) onOpenPlanner();
              }
            }}
            className="card-elevate mt-6 rounded-3xl bg-[#EAF0E9] border border-[#DCE6DA] p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-[#2D5A3D] group tv-stagger-4 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white text-[#2D5A3D] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-300">
                <Sparkles className="w-5 h-5 text-[#2D5A3D]" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-[#152A1C] leading-snug">
                  {t('hero.aiTeaserTitle')}
                </h4>
                <p className="text-xs text-[#57685D] mt-0.5">
                  {t('hero.aiTeaserSubtitle')}
                </p>
              </div>
            </div>
            <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white p-1 shadow-xs border border-white group-hover:scale-105 transition-transform duration-300">
              <img
                src="/images/ai-robot-mascot.jpg"
                alt="TripVerse AI Travel Mascot"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>

        </div>

        {/* Two-Column Grid: Interactive Setup Card + Live Device Showcase */}
        <ScrollReveal className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto mt-6">

          {/* Left Column: Interactive Planning Setup Card */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-[0_20px_48px_-12px_rgba(45,90,61,0.08)] border border-[#E2EBE1] relative">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E2EBE1] flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('hero.tripParameters')}</span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#152A1C]">{t('hero.planIn30Seconds')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGuaranteeModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A3D] bg-[#E8EFE7] hover:bg-[#DCE7DB] px-3.5 py-2 min-h-[44px] rounded-full border border-[#DCE7DB] transition-all cursor-pointer shadow-2xs"
                title="Learn how TripVerse budget estimates work"
              >
                <CheckCircle2 className="w-4 h-4 text-[#2D5A3D] shrink-0" />
                <span>{t('hero.budgetEstimates')}</span>
                <Info className="w-3.5 h-3.5 opacity-80" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Field 1: Destination with Precision Autocomplete */}
              <div ref={plannerSearchRef} className="relative">
                <label 
                  htmlFor="hero-planner-destination-input"
                  className="block text-xs font-bold uppercase tracking-wider text-[#152A1C] dark:text-slate-300 mb-1.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                    <span>{t('hero.destinationLabel')}</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#2D5A3D] dark:text-emerald-400 bg-[#EAF0E9] dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-[#DCE7DB] dark:border-emerald-800/50">
                    {t('hero.anySpotWorldwide')}
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="hero-planner-destination-input"
                    type="text"
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      setShowPlannerDropdown(true);
                    }}
                    onFocus={() => setShowPlannerDropdown(true)}
                    onKeyDown={handlePlannerKeyDown}
                    placeholder={t('hero.destinationPlaceholder')}
                    className="w-full pl-4 pr-10 py-3 sm:py-3.5 min-h-[44px] rounded-2xl bg-[#F4F6F2] dark:bg-slate-800/80 border border-[#DCE7DB] dark:border-slate-700 text-[#152A1C] dark:text-slate-100 font-semibold placeholder:text-[#57685D] dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:border-[#2D5A3D] dark:focus:border-emerald-500 focus:ring-4 focus:ring-[#2D5A3D]/10 dark:focus:ring-emerald-500/20 transition-all text-sm sm:text-base"
                    autoComplete="off"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400 animate-spin" />
                    ) : destination.trim().length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDestination('');
                          setSuggestions([]);
                          setShowPlannerDropdown(false);
                          setPlannerHighlightedIndex(-1);
                        }}
                        className="text-slate-400 hover:text-[#152A1C] dark:hover:text-slate-200 p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg"
                        aria-label="Clear destination input"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Autocomplete Dropdown */}
                {showPlannerDropdown && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-[#E2EBE1] dark:border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-[#E2EBE1] dark:divide-slate-800 max-h-60 overflow-y-auto animate-in fade-in">
                    <div className="px-3 py-1.5 bg-[#F4F6F2] dark:bg-slate-800/80 text-[11px] font-bold uppercase tracking-wider text-[#57685D] dark:text-slate-400 flex items-center justify-between">
                      <span>{t('hero.suggestedPlaces')}</span>
                      <span>{t('hero.verifiedGeocoding')}</span>
                    </div>
                    {suggestions.map((spot, idx) => {
                      const IconComp =
                        spot.spotType === 'temple' ? Flame :
                          spot.spotType === 'nature' ? Trees :
                            spot.spotType === 'monument' ? Landmark :
                              spot.spotType === 'beach' ? Sun :
                                MapPin;

                      const isHighlighted = plannerHighlightedIndex === idx;

                      return (
                        <div
                          key={spot.id}
                          className={`w-full px-3.5 py-3 text-left transition-colors flex items-center justify-between gap-2.5 min-h-[44px] ${
                            isHighlighted ? 'bg-[#E8EFE7] dark:bg-slate-800' : 'hover:bg-[#E8EFE7]/70 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setDestination(spot.name);
                              setShowPlannerDropdown(false);
                              setPlannerHighlightedIndex(-1);
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            {spot.image ? (
                              <img
                                src={spot.image}
                                alt={spot.name}
                                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#DCE7DB] dark:border-slate-700"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[#E8EFE7] dark:bg-slate-800 group-hover:bg-[#2D5A3D] group-hover:text-white text-[#2D5A3D] dark:text-emerald-400 flex items-center justify-center shrink-0 transition-colors">
                                <IconComp className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[#152A1C] dark:text-slate-100">
                                  {spot.name}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#F4F6F2] dark:bg-slate-800 text-[#57685D] dark:text-slate-300 border border-[#E2EBE1] dark:border-slate-700">
                                  {spot.country && spot.country !== 'India' && spot.country !== 'Worldwide' ? `${spot.country}` : spot.state}
                                </span>
                                <span className="text-[11px] font-mono text-[#2D5A3D] dark:text-emerald-400 bg-[#E8EFE7] dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-[#DCE7DB] dark:border-emerald-800/50">
                                  {spot.coordinates.lat.toFixed(2)}°, {spot.coordinates.lng.toFixed(2)}°
                                </span>
                              </div>
                              <p className="text-xs text-[#57685D] dark:text-slate-400 truncate mt-0.5">{spot.fullName}</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDestination(spot.name);
                              setShowPlannerDropdown(false);
                              setPlannerHighlightedIndex(-1);
                              const planParams = {
                                destination: spot.name,
                                duration,
                                travelers,
                                budget,
                                budgetMode,
                              };
                              if (onOpenPlanner) {
                                onOpenPlanner(planParams);
                              } else if (onQuickPlan) {
                                onQuickPlan(planParams);
                              }
                            }}
                            className="hidden xs:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#2D5A3D]/10 hover:bg-[#2D5A3D] text-[#2D5A3D] hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer"
                            title={`Plan trip to ${spot.name}`}
                          >
                            <span>Plan</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick Destination Pills (44px min height for ergonomic tapping) */}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <span className="text-xs font-bold text-[#57685D]">{t('dest.popular')}</span>
                  {quickDests.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setDestination(item.name);
                        setShowPlannerDropdown(false);
                        setShowFloatingDropdown(false);
                      }}
                      className={`min-h-[44px] px-3.5 py-2 rounded-full border transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold ${
                        destination.toLowerCase() === item.name.toLowerCase()
                          ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-xs'
                          : 'bg-white text-slate-700 border-[#DCE7DB] hover:border-[#2D5A3D] hover:bg-[#F4F6F2]'
                      }`}
                    >
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
                    <span>{t('hero.durationDays')}</span>
                  </label>
                  <select
                    id="hero-duration-select"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    aria-label={t('hero.durationDays')}
                    className="w-full px-3.5 py-3 min-h-[44px] rounded-2xl bg-[#F4F6F2] border border-[#DCE7DB] text-[#152A1C] font-semibold focus:bg-white focus:outline-none focus:border-[#2D5A3D] focus:ring-4 focus:ring-[#2D5A3D]/10 text-sm cursor-pointer"
                  >
                    <option value={1}>{t('hero.day1Express')}</option>
                    <option value={2}>{t('hero.day2Weekend')}</option>
                    <option value={3}>{t('hero.day3Optimal')}</option>
                    <option value={4}>{t('hero.day4Deep')}</option>
                    <option value={5}>{t('hero.day5Complete')}</option>
                    <option value={7}>{t('hero.day7Extended')}</option>
                  </select>
                </div>

                {/* Field 3: Travelers */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#152A1C] mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>{t('hero.travelersCount')}</span>
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
                      {travelers} {travelers === 1 ? t('hero.soloTraveler') : travelers === 2 ? t('hero.coupleTravelers') : t('hero.groupTravelers')}
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

              {/* Field 4: Budget with Choice (Total Group vs Per Person) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#152A1C]">
                      {budgetMode === 'total' ? t('planner.budgetModeTotal') : t('planner.budgetModePerPerson')}
                    </span>
                  </div>

                  {/* Mode Selector Toggle: User's Choice Between Total vs Per Person */}
                  <div className="inline-flex items-center bg-[#E8EFE7] p-0.5 rounded-xl border border-[#DCE7DB]">
                    <button
                      type="button"
                      data-indicator="true"
                      onClick={() => {
                        if (budgetMode !== 'total') {
                          setBudgetMode('total');
                          setBudget(prev => Math.max(2000, prev * travelers));
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all min-h-0 ${
                        budgetMode === 'total'
                          ? 'bg-white text-[#2D5A3D] shadow-2xs border border-[#DCE7DB]'
                          : 'text-[#57685D] hover:text-[#152A1C]'
                      }`}
                    >
                      {t('planner.budgetModeTotal')}
                    </button>
                    <button
                      type="button"
                      data-indicator="true"
                      onClick={() => {
                        if (budgetMode !== 'per_person') {
                          setBudgetMode('per_person');
                          setBudget(prev => Math.max(1000, Math.round(prev / Math.max(1, travelers))));
                        }
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all min-h-0 ${
                        budgetMode === 'per_person'
                          ? 'bg-white text-[#2D5A3D] shadow-2xs border border-[#DCE7DB]'
                          : 'text-[#57685D] hover:text-[#152A1C]'
                      }`}
                    >
                      {t('planner.budgetModePerPerson')}
                    </button>
                  </div>
                </div>

                {/* Slider + Exact Value Control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-medium text-[#57685D]">
                      {budgetMode === 'total'
                        ? `For all ${travelers} travelers`
                        : `Total: ${formatCurrency(budget * travelers, currency)} for ${travelers} travelers`}
                    </span>

                    {/* Direct Exact Budget Input */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="hero-exact-budget" className="text-xs font-semibold text-[#57685D]">
                        Exact:
                      </label>
                      <input
                        type="number"
                        id="hero-exact-budget"
                        min={budgetMode === 'total' ? 2000 : 1000}
                        max={budgetMode === 'total' ? 100000 : 50000}
                        step={budgetMode === 'total' ? 500 : 250}
                        value={budget}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBudget(Math.max(budgetMode === 'total' ? 1000 : 500, val));
                        }}
                        aria-label={budgetMode === 'total' ? 'Type exact total group budget' : 'Type exact budget per person'}
                        className="w-28 px-3 py-1 text-right font-extrabold text-[#2D5A3D] bg-[#E8EFE7] border border-[#DCE7DB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]"
                      />
                    </div>
                  </div>

                  <input
                    id="hero-budget-slider"
                    type="range"
                    min={budgetMode === 'total' ? 2000 : 1000}
                    max={budgetMode === 'total' ? 60000 : 25000}
                    step={budgetMode === 'total' ? 500 : 250}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    aria-label={budgetMode === 'total' ? 'Total Group Budget Slider' : 'Budget Per Person Slider'}
                    className="w-full h-2.5 bg-[#DCE7DB] rounded-lg appearance-none cursor-pointer accent-[#2D5A3D]"
                  />

                  <div className="flex justify-between text-xs sm:text-sm font-bold text-[#57685D] pt-0.5 gap-1">
                    <span>
                      {formatCurrency(budgetMode === 'total' ? 2000 : 1000, currency)} {budgetMode === 'per_person' ? '/p' : ''} (Budget)
                    </span>
                    <span className="hidden xs:inline">
                      {formatCurrency(budgetMode === 'total' ? 15000 : 7000, currency)} {budgetMode === 'per_person' ? '/p' : ''}
                    </span>
                    <span className="hidden sm:inline">
                      {formatCurrency(budgetMode === 'total' ? 30000 : 15000, currency)} {budgetMode === 'per_person' ? '/p' : ''}
                    </span>
                    <span>
                      {formatCurrency(budgetMode === 'total' ? 60000 : 25000, currency)}+ {budgetMode === 'per_person' ? '/p' : ''} (Comfort)
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit CTA Pill Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="btn-liquid-primary flex-1 min-h-[52px] flex items-center justify-center gap-2 py-4 px-6 rounded-full text-white font-display font-bold text-base shadow-xl shadow-[#2D5A3D]/25 group"
                >
                  <Sparkles className="w-5 h-5 text-emerald-100 shrink-0" />
                  <span className="whitespace-nowrap">{t('hero.planMyTripBtn')}</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={onExplore}
                  className="btn-liquid-glass min-h-[52px] flex items-center justify-center gap-2 py-3.5 px-6 rounded-full text-[#152A1C] font-bold text-sm whitespace-nowrap"
                >
                  <Compass className="w-4 h-4 text-[#2D5A3D] shrink-0" />
                  <span>{t('hero.exploreDestinations')}</span>
                </button>
              </div>

            </form>

            {/* Budget Guarantee Explanatory Modal */}
            {showGuaranteeModal && (() => {
              const guaranteeModal = (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in"
                  onClick={() => setShowGuaranteeModal(false)}
                >
                  <div
                    className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E2EBE1] space-y-4 animate-in zoom-in-95"
                    onClick={(e) => e.stopPropagation()}
                  >
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
              );
              return typeof document !== 'undefined'
                ? createPortal(guaranteeModal, document.body)
                : guaranteeModal;
            })()}
          </div>

          {/* Right Column: Real figure, shape and functionality of a real smartphone */}
          <div className="lg:col-span-5 flex justify-center">
            <Suspense fallback={<div className="w-[300px] sm:w-[320px] h-[610px] rounded-[46px] bg-[#E8EFE7]/60 dark:bg-slate-800/60 animate-pulse border border-[#DCE7DB] dark:border-slate-700" />}>
              <InteractivePhoneDevice currency={currency} activeTrip={activeTrip} onQuickPlan={onOpenPlanner || onQuickPlan || (() => {})} />
            </Suspense>
          </div>

        </ScrollReveal>

      </div>
    </section>
  );
};
