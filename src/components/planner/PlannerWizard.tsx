import { useModalBehavior } from '../../hooks/useModalBehavior';
import React, { useState, useEffect } from 'react';
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
  Calendar,
  Lock,
  Info,
  Compass,
  SlidersHorizontal,
  Plus,
  LucideIcon
} from 'lucide-react';
import { TravelPreference, TravelerType, TransportMode, AccommodationType, FoodPreference, Priority, Coordinates } from '../../types/trip';
import { PlannerInput } from '../../services/plannerEngine';
import { formatCurrency, getStoredCurrency, SupportedCurrency } from '../../services/currencyService';
import { searchLocations, resolvePreciseLocationSync, PreciseLocation } from '../../services/locationService';
import { resolveGlobalDestination } from '../../services/globalLocationResolver';
import { getDestinationHighlights } from '../../services/landmarkAtlasService';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { AuthUser } from '../../types/auth';
import { getUserSubscriptionQuota, getCurrentUser, isGuestUser } from '../../services/authService';
import { getFeasibleTransportModes } from '../../services/transportFeasibilityEngine';
import { evaluateLiveMarketPrices } from '../../services/liveMarketPricingService';
import { syncLiveExchangeRates } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { isValidPlaceQuery } from '../../utils/routeResolver';
import { loadUserProfile } from '../../services/storageService';

function detectDefaultOriginHub(): string {
  try {
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
    if (tz.includes('calcutta') || tz.includes('kolkata') || tz.includes('asia/colombo')) return 'Mumbai, India';
    if (tz.includes('london')) return 'London, United Kingdom';
    if (tz.includes('paris')) return 'Paris, France';
    if (tz.includes('berlin')) return 'Berlin, Germany';
    if (tz.includes('rome')) return 'Rome, Italy';
    if (tz.includes('madrid')) return 'Madrid, Spain';
    if (tz.includes('zurich')) return 'Zurich, Switzerland';
    if (tz.includes('tokyo')) return 'Tokyo, Japan';
    if (tz.includes('singapore')) return 'Singapore';
    if (tz.includes('dubai')) return 'Dubai, UAE';
    if (tz.includes('bangkok')) return 'Bangkok, Thailand';
    if (tz.includes('sydney') || tz.includes('melbourne')) return 'Sydney, Australia';
    if (tz.includes('auckland')) return 'Auckland, New Zealand';
    if (tz.includes('toronto') || tz.includes('vancouver') || tz.includes('montreal')) return 'Toronto, Canada';
    if (tz.includes('los_angeles')) return 'Los Angeles, USA';
    if (tz.includes('chicago')) return 'Chicago, USA';
    if (tz.includes('america') || tz.includes('new_york')) return 'New York, USA';
  } catch {}
  return 'New York, USA';
}

interface PlannerWizardProps {
  currentUser?: AuthUser | null;
  initialDestination?: string;
  initialDuration?: number;
  initialTravelers?: number;
  initialBudget?: number;
  initialBudgetMode?: 'per_person' | 'total';
  onClose: () => void;
  onTripGenerated: (tripInput: PlannerInput) => void;
  onOpenProModal?: () => void;
  onOpenAuthModal?: () => void;
}

export const PlannerWizard: React.FC<PlannerWizardProps> = ({
  currentUser,
  initialDestination = '',
  initialDuration = 3,
  initialTravelers = 3,
  initialBudget = 8000,
  initialBudgetMode = 'total',
  onClose,
  onTripGenerated,
  onOpenProModal,
  onOpenAuthModal
}) => {
  const { t } = useLanguage();
  const [quota, setQuota] = useState(() => getUserSubscriptionQuota(currentUser));
  const isGuest = isGuestUser(currentUser ?? getCurrentUser());

  useEffect(() => {
    setQuota(getUserSubscriptionQuota(currentUser));
    const handleQuota = () => setQuota(getUserSubscriptionQuota(currentUser));
    window.addEventListener('tripverse_quota_updated', handleQuota);
    return () => window.removeEventListener('tripverse_quota_updated', handleQuota);
  }, [currentUser]);

  useModalBehavior(true, onClose);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isSubmittingRef = React.useRef(false);
  const totalSteps = 9;

  // Step 1: Destination
  const [origin, setOrigin] = useState(() => {
    const savedLoc = loadUserProfile(currentUser?.uid)?.location;
    if (savedLoc && savedLoc !== 'Worldwide' && savedLoc !== 'India') return savedLoc;
    return detectDefaultOriginHub();
  });
  const [originCoords, setOriginCoords] = useState<Coordinates | undefined>();
  const [destination, setDestination] = useState(initialDestination);

  // Precision Spot Search & Geocoding State
  const [selectedPreciseSpot, setSelectedPreciseSpot] = useState<PreciseLocation | null>(() =>
    initialDestination.trim() ? resolvePreciseLocationSync(initialDestination) : null
  );
  const selectedPreciseSpotRef = React.useRef(selectedPreciseSpot);
  React.useEffect(() => {
    selectedPreciseSpotRef.current = selectedPreciseSpot;
  });
  const [destSuggestions, setDestSuggestions] = useState<PreciseLocation[]>([]);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [isDetectingOrigin, setIsDetectingOrigin] = useState(false);

  // Debounced search for destination input with stale-response guard
  React.useEffect(() => {
    let isCurrent = true;

    if (!destination || destination.trim().length < 2) {
      setDestSuggestions([]);
      setIsSearchingDest(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const results = await searchLocations(destination);
        if (!isCurrent) return;
        setDestSuggestions(results);
        const exact = results.find(
          r => r.name.toLowerCase() === destination.toLowerCase().trim() ||
            destination.toLowerCase().trim().includes(r.name.toLowerCase())
        );
        if (exact) {
          setSelectedPreciseSpot(exact);
        } else if (!selectedPreciseSpotRef.current || selectedPreciseSpotRef.current.name.toLowerCase() !== destination.toLowerCase().trim()) {
          setSelectedPreciseSpot(resolvePreciseLocationSync(destination));
        }
      } catch {
        // fallback to sync resolver
        if (isCurrent) {
          setSelectedPreciseSpot(resolvePreciseLocationSync(destination));
        }
      } finally {
        if (isCurrent) {
          setIsSearchingDest(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
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
            setOriginCoords({ lat, lng });
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
          setOrigin(detectDefaultOriginHub());
        },
        { timeout: 8000 }
      );
    }
  };

  // Step 2: Duration, Dates & Pacing
  const [duration, setDuration] = useState<number>(initialDuration);
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [pacing, setPacing] = useState<'relaxed' | 'balanced' | 'fast_paced'>('balanced');

  // Step 3: Travelers
  const [travelerType, setTravelerType] = useState<TravelerType>('friends');
  const [travelersCount, setTravelersCount] = useState<number>(initialTravelers);

  // Step 4: Budget
  const [budgetMode, setBudgetMode] = useState<'per_person' | 'total'>(initialBudgetMode);
  const [budgetAmount, setBudgetAmount] = useState<number>(initialBudget);
  const hasManualBudgetRef = React.useRef<boolean>(initialBudget !== 8000);

  // Synchronize dynamic prefilled parameters from search bar or explore modals
  useEffect(() => {
    if (initialDestination) {
      setDestination(initialDestination);
      const spot = resolvePreciseLocationSync(initialDestination);
      if (spot) setSelectedPreciseSpot(spot);
    }
  }, [initialDestination]);

  useEffect(() => {
    if (initialDuration) setDuration(initialDuration);
  }, [initialDuration]);

  useEffect(() => {
    if (initialTravelers) setTravelersCount(initialTravelers);
  }, [initialTravelers]);

  useEffect(() => {
    if (initialBudget) setBudgetAmount(initialBudget);
  }, [initialBudget]);

  useEffect(() => {
    if (initialBudgetMode) setBudgetMode(initialBudgetMode);
  }, [initialBudgetMode]);
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
  const [specialRequests, setSpecialRequests] = useState('');

  // Step 6: Transportation
  const [transportMode, setTransportMode] = useState<TransportMode>('car');

  // Real-time transport feasibility based on geographic origin, destination, coordinates & travel date
  const transportFeasibility = React.useMemo(() => {
    return getFeasibleTransportModes(origin, destination, startDate, originCoords, selectedPreciseSpot?.coordinates);
  }, [origin, destination, startDate, originCoords, selectedPreciseSpot]);

  // Keep transportMode valid: if current selection is not available for this route/destination, auto-promote to recommended default
  React.useEffect(() => {
    if (!transportFeasibility.availableModes.includes(transportMode)) {
      setTransportMode(transportFeasibility.recommendedDefaultMode);
    }
  }, [transportFeasibility, transportMode]);

  // Step 7: Accommodation
  const [accommodationType, setAccommodationType] = useState<AccommodationType>('budget');

  // Step 8: Food
  const [foodPreference, setFoodPreference] = useState<FoodPreference>('veg');

  // Step 9: Comfort Priorities
  const [priorities, setPriorities] = useState<Priority[]>(['budget', 'experience', 'comfort']);

  // Trigger Live Forex Rate Sync on Mount
  useEffect(() => {
    syncLiveExchangeRates().catch(() => {});
  }, []);

  // Real-time 6-Vertical Market Price Intelligence Report
  const liveMarketReport = React.useMemo(() => {
    return evaluateLiveMarketPrices({
      origin: origin || 'Mumbai',
      destination: destination || 'Destination',
      durationDays: duration,
      travelersCount,
      startDate,
      accommodationType,
      transportMode,
      originCoords,
      destCoords: selectedPreciseSpot?.coordinates
    });
  }, [origin, destination, duration, travelersCount, startDate, accommodationType, transportMode, originCoords, selectedPreciseSpot]);

  // Auto-sync budget to realistic live market rates whenever destination/duration/travelers change,
  // until the user explicitly customizes the budget slider.
  const sliderMax = React.useMemo(() => {
    const recTotal = liveMarketReport?.recommendedGroundBudgetINR || 25000;
    if (budgetMode === 'total') {
      return Math.max(200000, Math.ceil((recTotal * 1.8) / 10000) * 10000);
    }
    const recPerPerson = Math.round(recTotal / Math.max(1, travelersCount));
    return Math.max(75000, Math.ceil((recPerPerson * 1.8) / 5000) * 5000);
  }, [liveMarketReport, budgetMode, travelersCount]);

  useEffect(() => {
    if (hasManualBudgetRef.current) return;
    if (!destination.trim() || !liveMarketReport?.recommendedGroundBudgetINR) return;
    const rawTarget =
      budgetMode === 'total'
        ? liveMarketReport.recommendedGroundBudgetINR
        : Math.round(liveMarketReport.recommendedGroundBudgetINR / Math.max(1, travelersCount));
    const rounded = Math.max(budgetMode === 'total' ? 3000 : 1500, Math.round(rawTarget / 500) * 500);
    setBudgetAmount(rounded);
  }, [destination, duration, travelersCount, budgetMode, liveMarketReport?.recommendedGroundBudgetINR]);

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

  const validateStepOrAll = (step: number | 'all'): string | null => {
    const cleanDest = destination.trim();
    const cleanOrigin = origin.trim();
    const normalizeCity = (s: string) => s.split(',')[0].trim().toLowerCase().replace(/\s+/g, ' ');

    if (step === 1 || step === 'all') {
      if (!isValidPlaceQuery(cleanDest)) {
        return 'Please enter a valid destination city, region, or landmark (at least 2 letters).';
      }
      if (cleanOrigin && normalizeCity(cleanOrigin) === normalizeCity(cleanDest)) {
        return `Origin and destination are both "${cleanDest.split(',')[0].trim()}". Choose a different destination or nearby getaway.`;
      }
    }

    if (step === 2 || step === 'all') {
      if (!Number.isFinite(duration) || duration < 1 || duration > 30) {
        return 'Trip duration must be between 1 and 30 days.';
      }
      if (startDate) {
        const todayIso = new Date().toISOString().split('T')[0];
        if (startDate < todayIso) {
          return 'Start date is in the past. Please choose today or a future departure date.';
        }
      }
    }

    if (step === 3 || step === 'all') {
      if (!Number.isFinite(travelersCount) || travelersCount < 1 || travelersCount > 30) {
        return 'Travelers count must be between 1 and 30.';
      }
    }

    if (step === 4 || step === 'all') {
      if (!Number.isFinite(budgetAmount) || budgetAmount < 500) {
        return 'Please enter a realistic budget (minimum 500).';
      }
    }

    return null;
  };

  const handleNext = () => {
    const stepErr = validateStepOrAll(currentStep);
    if (stepErr) {
      setValidationError(stepErr);
      return;
    }
    setValidationError(null);
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      if (isGuest) {
        onClose();
        if (onOpenAuthModal) onOpenAuthModal();
        return;
      }
      if (!quota.canCreateTrip) {
        onClose();
        if (onOpenProModal) onOpenProModal();
        return;
      }
      // Submit directly to unified AI trip generator
      handleFinalSubmit();
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Traveler Itinerary Flexibility & Sights Choice
  const [itineraryStyle, setItineraryStyle] = useState<'flexible_custom' | 'ai_curated'>('flexible_custom');
  const [availableSights, setAvailableSights] = useState<string[]>([]);
  const [selectedSights, setSelectedSights] = useState<string[]>([]);
  const [customSightInput, setCustomSightInput] = useState('');
  const lastSightsDestRef = React.useRef<string>('');

  // Dynamically populate genuine sights whenever destination or selected spot changes (never leak prior city's sights)
  useEffect(() => {
    const rawDest = (selectedPreciseSpot?.name || destination || '').trim();
    if (!rawDest) {
      lastSightsDestRef.current = '';
      setAvailableSights([]);
      setSelectedSights([]);
      return;
    }
    const destKey = rawDest.toLowerCase();
    const matched = POPULAR_DESTINATIONS.find(
      d => d.name.toLowerCase() === destKey ||
           destKey.includes(d.name.toLowerCase())
    );
    const atlasHighlights = getDestinationHighlights(rawDest, 14);
    const combined = Array.from(new Set([
      ...(selectedPreciseSpot?.highlights || []),
      ...(matched?.popularActivities || []),
      ...atlasHighlights
    ].filter(Boolean)));
    const destChanged = lastSightsDestRef.current !== destKey;
    lastSightsDestRef.current = destKey;

    setAvailableSights(combined);
    setSelectedSights(prev => {
      if (destChanged || prev.length === 0) {
        return combined.slice(0, 5);
      }
      // Keep only selections that belong to the current destination's combined sights
      const valid = prev.filter(s => combined.includes(s));
      return valid.length > 0 ? valid : combined.slice(0, 5);
    });

    // If the user typed any global destination not in our local catalog, fetch live Wikimedia Geosearch sights & exact coordinates
    if (!matched && rawDest.length >= 2) {
      let cancelled = false;
      const timer = setTimeout(async () => {
        try {
          const globalLoc = await resolveGlobalDestination(rawDest);
          if (cancelled || !globalLoc) return;
          if (globalLoc.highlights && globalLoc.highlights.length > 0) {
            setAvailableSights(prev => {
              const merged = Array.from(new Set([...globalLoc.highlights, ...prev].filter(Boolean)));
              return merged;
            });
            setSelectedSights(prev => {
              // Replace generic template highlights if live Wikipedia Geosearch returned real landmarks
              const valid = prev.filter(s => globalLoc.highlights.includes(s));
              if (prev.length === 0 || valid.length === 0) {
                return globalLoc.highlights.slice(0, 5);
              }
              return prev;
            });
          }
          // Also enrich selectedPreciseSpot if none was chosen from dropdown so transport feasibility & coordinates are exact
          setSelectedPreciseSpot(prev => {
            if (prev && prev.name.toLowerCase() === rawDest.toLowerCase()) return prev;
            return {
              id: `global-${globalLoc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
              name: globalLoc.name,
              fullName: globalLoc.fullName || `${globalLoc.name}, ${globalLoc.country}`,
              state: globalLoc.state,
              country: globalLoc.country,
              category: 'roadtrip',
              spotType: 'city',
              tagline: globalLoc.description
                ? globalLoc.description.slice(0, 88)
                : `Discover ${globalLoc.name}, ${globalLoc.country}`,
              coordinates: globalLoc.coordinates,
              highlights: globalLoc.highlights,
              image: globalLoc.image
            };
          });
        } catch {
          // Graceful fallback if offline
        }
      }, 300);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
  }, [destination, selectedPreciseSpot]);

  const toggleSight = (sight: string) => {
    if (selectedSights.includes(sight)) {
      setSelectedSights(selectedSights.filter(s => s !== sight));
    } else {
      setSelectedSights([...selectedSights, sight]);
    }
  };

  const handleAddCustomSight = () => {
    const trimmed = customSightInput.trim();
    if (!trimmed) return;
    if (!selectedSights.includes(trimmed)) {
      setSelectedSights(prev => [...prev, trimmed]);
    }
    if (!availableSights.includes(trimmed)) {
      setAvailableSights(prev => [trimmed, ...prev]);
    }
    setCustomSightInput('');
  };

  const handleFinalSubmit = () => {
    if (isSubmittingRef.current) return;
    const err = validateStepOrAll('all');
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    isSubmittingRef.current = true;
    const finalTransportMode = transportFeasibility.availableModes.includes(transportMode)
      ? transportMode
      : transportFeasibility.recommendedDefaultMode;

    const safeDuration = Math.min(30, Math.max(1, Math.round(duration || 3)));
    const safeTravelers = Math.min(30, Math.max(1, Math.round(travelersCount || 2)));
    const safeBudget = Math.max(500, Math.round(budgetAmount || 15000));

    const input: PlannerInput = {
      origin: origin.trim(),
      originCoords,
      destinationName: destination.trim(),
      durationDays: safeDuration,
      travelersCount: safeTravelers,
      travelerType,
      budgetMode,
      budgetAmount: safeBudget,
      preferences,
      specialRequests: specialRequests.trim(),
      transportMode: finalTransportMode,
      accommodationType,
      foodPreference,
      priorities,
      destinationCoords: selectedPreciseSpot?.coordinates,
      preciseLocation: selectedPreciseSpot || undefined,
      startDate,
      pacing,
      itineraryStyle,
      selectedActivities: selectedSights
    };
    onTripGenerated(input);
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 1500);
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

      {isGuest ? (
        <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-black text-[#0B2545]">
              {t('planner.guestTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              {t('planner.guestDesc')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Full Day-by-Day AI Generation</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#2D5A3D] shrink-0" />
              <span>Highway Breakstops & Route Logistics</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Permanent Cloud Trip Sync</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="w-full py-3.5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#A8C5AC]" />
              <span>{t('planner.guestSignUp')}</span>
            </button>
            <div className="text-center pt-0.5">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  className="text-[#2D5A3D] font-bold hover:underline cursor-pointer ml-1"
                >
                  {t('planner.guestSignIn')}
                </button>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
            >
              {t('planner.guestContinue')}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Top Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-trip-gradient text-white flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#0B2545] truncate">{t('planner.title')}</h2>
                {quota.isPro ? (
                  <button
                    type="button"
                    onClick={onOpenProModal}
                    className="px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-black tracking-wider flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                    title="TripVerse Pro Active (Unlimited Trips & 30h/week AI)"
                  >
                    <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-600" />
                    <span>PRO</span>
                  </button>
                ) : (
                  <div
                    className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold tracking-wider shrink-0 select-none"
                    title={`${quota.freeTripsRemaining} of 3 free trips remaining`}
                  >
                    {t('planner.freeTripsRemaining', { count: quota.freeTripsRemaining })}
                  </div>
                )}
              </div>
              <span className="text-[11px] sm:text-xs text-slate-500 font-semibold block">
                {t('planner.stepOf', { current: currentStep, total: totalSteps })}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Line */}
        <div className="w-full bg-slate-100 h-1.5 shrink-0">
          <div
            className="bg-trip-gradient h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Step Content Area */}
        <div className="p-4 sm:p-8 flex-1 overflow-y-auto overscroll-contain">

          {/* Quota Exhaustion Warning Banner */}
          {!quota.canCreateTrip && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Crown className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">Free Trip Trial Limit Reached (3 of 3 used)</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Upgrade to TripVerse Pro to unlock unlimited AI planning and 30h/week dedicated intelligence facility.
                  </p>
                </div>
              </div>
              {onOpenProModal && (
                <button
                  type="button"
                  onClick={onOpenProModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs shrink-0 cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span>Upgrade to Pro</span>
                </button>
              )}
            </div>
          )}

          {/* STEP 1: DESTINATION */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('planner.step1Subtitle')}</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">{t('planner.step1Title')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('planner.step1Desc')}
                </p>
              </div>

              <div className="space-y-4">
                {/* Starting From (Origin) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      {t('planner.originLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isDetectingOrigin}
                      className="text-[11px] font-bold text-[#2D5A3D] hover:text-[#2D5A3D] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Crosshair className={`w-3.5 h-3.5 ${isDetectingOrigin ? 'animate-spin text-[#2D5A3D]' : ''}`} />
                      <span>{isDetectingOrigin ? t('planner.detectingGps') : t('planner.useCurrentLocation')}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <Navigation className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => {
                        setOrigin(e.target.value);
                        setOriginCoords(undefined);
                      }}
                      placeholder="e.g. London, New York, Tokyo, Mumbai, Paris..."
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-semibold text-sm focus:bg-white focus:outline-none focus:border-[#2D5A3D] focus:ring-4 focus:ring-[#2D5A3D]/15"
                    />
                  </div>
                </div>

                {/* Primary Destination with Autocomplete */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      {t('planner.destinationLabel')}
                    </label>
                    {selectedPreciseSpot && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D5A3D] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{t('planner.preciseGpsActive')}</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-[#2D5A3D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        setShowDestDropdown(true);
                      }}
                      onFocus={() => setShowDestDropdown(true)}
                      placeholder="Type any destination on Earth (e.g. Paris, Kyoto, Santorini, Reykjavik, Goa)..."
                      className="w-full pl-10 pr-10 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm focus:bg-white focus:outline-none focus:border-[#2D5A3D] focus:ring-4 focus:ring-[#2D5A3D]/15 text-slate-900 shadow-xs"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {isSearchingDest ? (
                        <Loader2 className="w-4 h-4 text-[#2D5A3D] animate-spin" />
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
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 max-h-56 sm:max-h-72 overflow-y-auto overscroll-contain animate-in fade-in slide-in-from-top-2 duration-150">
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
                            <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-[#2D5A3D] group-hover:text-white text-slate-600 flex items-center justify-center shrink-0 transition-colors">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[#0B2545] group-hover:text-[#2D5A3D]">
                                  {spot.name}
                                </span>
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  {spot.state || spot.country}
                                </span>
                                <span className="text-[10px] font-mono font-semibold text-[#2D5A3D] bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                                  {Math.abs(spot.coordinates.lat).toFixed(2)}°{spot.coordinates.lat >= 0 ? 'N' : 'S'}, {Math.abs(spot.coordinates.lng).toFixed(2)}°{spot.coordinates.lng >= 0 ? 'E' : 'W'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {spot.fullName}
                              </p>
                              {spot.highlights && spot.highlights.length > 0 && (
                                <p className="text-[11px] text-[#2D5A3D] font-medium truncate mt-0.5">
                                  {spot.highlights.slice(0, 2).join(' • ')}
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
                        <div className="w-7 h-7 rounded-lg bg-[#2D5A3D] text-white flex items-center justify-center shrink-0">
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
                            {hl}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-[#2D5A3D]">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
                      <span>AI will dynamically calculate real highway routes, fuel/tolls, and activities for this spot.</span>
                    </div>
                  </div>
                )}

                {/* Popular Quick Select */}
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-2">Featured Worldwide & Regional Destinations:</span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { name: 'Paris', label: 'Paris, France', highlight: true },
                        { name: 'Tokyo', label: 'Tokyo, Japan', highlight: true },
                        { name: 'Santorini', label: 'Santorini, Greece' },
                        { name: 'Swiss Alps', label: 'Swiss Alps' },
                        { name: 'Bali', label: 'Bali, Indonesia', highlight: true },
                        { name: 'New York City', label: 'New York, USA' },
                        { name: 'Dubai', label: 'Dubai, UAE' },
                        { name: 'Rome', label: 'Rome, Italy' },
                        { name: 'Queenstown', label: 'Queenstown, NZ' },
                        { name: 'Reykjavik', label: 'Reykjavik, Iceland' },
                        { name: 'Udaipur', label: 'Udaipur, India' },
                        { name: 'Goa', label: 'Goa, India' },
                        { name: 'Manali', label: 'Manali, Himalayas' }
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
                          ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                          }`}
                      >
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: DURATION, DATES & PACING */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('Step 2 — Duration, Dates & Pacing')}</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">{t('Plan Your Schedule & Rhythm')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('TripVerse balances daily travel times, stay dates, and activities for a seamless, realistic itinerary.')}
                </p>
              </div>

              {/* Trip Duration */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  {t('Trip Duration')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
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
                      className={`p-3.5 rounded-2xl border text-left transition-all ${duration === item.days
                        ? 'border-[#2D5A3D] bg-emerald-50/70 shadow-xs scale-[1.01]'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <span className="text-base font-black text-[#0B2545] block">{t(item.label)}</span>
                      <span className="text-[11px] text-slate-500 font-medium">{t(item.sub)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    {t('Departure / Start Date')}
                  </label>
                  <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {t('Powers Live Hotel & Ticket Booking')}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="date"
                    value={startDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm text-slate-800 focus:bg-white focus:outline-none focus:border-[#2D5A3D] focus:ring-4 focus:ring-[#2D5A3D]/15"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { label: 'Next Sat', daysOffset: ((6 - new Date().getDay() + 7) % 7) || 7 },
                      { label: 'In 2 Wks', daysOffset: 14 },
                      { label: 'Next Mo', daysOffset: 30 }
                    ].map(preset => {
                      const d = new Date();
                      d.setDate(d.getDate() + preset.daysOffset);
                      const iso = d.toISOString().split('T')[0];
                      const isSel = startDate === iso;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setStartDate(iso)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                            isSel ? 'bg-[#2D5A3D] text-white border-[#2D5A3D]' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {t(preset.label)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Day-to-Day Schedule Pacing */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  {t('Day-to-Day Schedule Pacing')}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'relaxed',
                      title: 'Relaxed Pace',
                      desc: 'Late 9:30 AM starts, 2 key spots, relaxed cafe pauses & leisurely dining.'
                    },
                    {
                      id: 'balanced',
                      title: 'Balanced Pace',
                      desc: 'Optimal mix of 3-4 attractions, local lunch, and sunset golden hour.'
                    },
                    {
                      id: 'fast_paced',
                      title: 'Fast-Paced',
                      desc: 'Action-packed 6:30 AM starts, maximum spots, night bazaars & adventure.'
                    }
                  ].map(p => {
                    const isSel = pacing === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPacing(p.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSel
                            ? 'border-[#2D5A3D] bg-emerald-50/70 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-black text-slate-900">{t(p.title)}</span>
                          {isSel && <Check className="w-3.5 h-3.5 text-[#2D5A3D]" />}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{t(p.desc)}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: TRAVELERS */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('planner.step4Subtitle')}</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">{t('planner.step4Title')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('We optimize room sharing, transport splitting, and suitable stops based on your group.')}
                </p>
              </div>

              {/* Group Type Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { id: 'solo', label: t('planner.solo'), icon: User },
                  { id: 'couple', label: t('planner.couple'), icon: Users },
                  { id: 'friends', label: t('planner.friends'), icon: Users },
                  { id: 'family', label: t('planner.family'), icon: Home },
                  { id: 'business', label: t('planner.business'), icon: Briefcase }
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
                        ? 'border-[#2D5A3D] bg-emerald-50/70 text-slate-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                        }`}
                    >
                      <TypeIcon className={`w-5 h-5 ${isSelected ? 'text-[#2D5A3D]' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-semibold">{type.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Number of People Counter */}
              <div className="pt-2">
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">
                  {t('planner.howManyTravelers')}
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
                      {travelersCount === 1 ? t('person') : t('people')}
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
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('planner.step3Subtitle')}</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">{t('planner.step3Title')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('This is a budget target. Generated costs are estimates and may exceed it; verify prices with providers before booking.')}
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
                  {t('planner.budgetModeTotal')}
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetMode('per_person')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${budgetMode === 'per_person' ? 'bg-white text-[#0B2545] shadow-xs' : 'text-slate-600'
                    }`}
                >
                  {t('planner.budgetModePerPerson')}
                </button>
              </div>

              {/* Budget Display Card */}
              <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-50 rounded-2xl border border-emerald-200/80 text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-[#2D5A3D] text-[11px] font-bold uppercase tracking-wider mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{t(budgetMode === 'total' ? 'Total On-Ground Budget' : 'On-Ground Budget Per Person')}</span>
                </div>
                <div className="text-4xl sm:text-5xl font-black text-[#0B2545] font-display my-2">
                  {formatCurrency(budgetAmount, currency)}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-semibold text-pretty">
                  {budgetMode === 'total'
                    ? `Equal to approx ${formatCurrency(Math.round(budgetAmount / Math.max(1, travelersCount)), currency)} per person for ${travelersCount} travelers.`
                    : `Total for ${travelersCount} travelers: ${formatCurrency(budgetAmount * travelersCount, currency)}.`}
                </p>

                {/* Transparency Breakdown Strip: Inclusions & Flight Notice */}
                <div className="mt-4 pt-3.5 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left text-xs">
                  <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-100 flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[11px] font-bold text-emerald-900 block">Included in Ground Budget:</span>
                      <p className="text-[10px] text-slate-600 leading-tight">
                        3★/4★ hotel stays, local cab transfers & tolls, daily regional meals, entry fees & activities.
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-2">
                    <Plane className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[11px] font-bold text-amber-900 block">Flight / Intercity Transit:</span>
                      <p className="text-[10px] text-amber-800 leading-tight">
                        Booked separately via live Google Flights/IRCTC as airfare varies by departure city & season.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={budgetMode === 'total' ? 3000 : 1500}
                  max={sliderMax}
                  step={500}
                  value={Math.min(sliderMax, budgetAmount)}
                  onChange={(e) => {
                    hasManualBudgetRef.current = true;
                    setBudgetAmount(Number(e.target.value));
                  }}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2D5A3D]"
                />
                <div className="flex justify-between text-[10px] sm:text-xs font-semibold text-slate-400 gap-1 flex-wrap sm:flex-nowrap">
                  <span className="truncate">{formatCurrency(budgetMode === 'total' ? 3000 : 1500, currency)} (Budget)</span>
                  <span className="hidden xs:inline">{formatCurrency(budgetMode === 'total' ? 25000 : 10000, currency)}</span>
                  <span className="hidden sm:inline">{formatCurrency(budgetMode === 'total' ? 75000 : 30000, currency)}</span>
                  <span className="truncate">{formatCurrency(sliderMax, currency)}+ (Luxury)</span>
                </div>
              </div>

              {/* LIVE MARKET PRICE METER across 6 Verticals */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3.5 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      Estimated Cost Index ({liveMarketReport.originCity} → {liveMarketReport.destinationCity})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {liveMarketReport.seasonBadge}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        hasManualBudgetRef.current = false;
                        const recTotal = liveMarketReport.recommendedGroundBudgetINR;
                        setBudgetAmount(
                          budgetMode === 'total'
                            ? Math.min(sliderMax, Math.round(recTotal / 500) * 500)
                            : Math.min(sliderMax, Math.round(recTotal / Math.max(1, travelersCount) / 500) * 500)
                        );
                      }}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
                    >
                      Sync Slider to Est. Ground Rate ({formatCurrency(
                        budgetMode === 'total'
                          ? liveMarketReport.recommendedGroundBudgetINR
                          : Math.round(liveMarketReport.recommendedGroundBudgetINR / Math.max(1, travelersCount)),
                        currency
                      )})
                    </button>
                  </div>
                </div>

                {/* Smart Nearby Hub Arbitrage Alert Banner */}
                {liveMarketReport.smartHubArbitrage && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-extrabold text-emerald-300">
                          Smart Airport Hub Arbitrage: Save {formatCurrency(liveMarketReport.smartHubArbitrage.totalGroupSavings, currency)}!
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-100/90 leading-snug">
                        {liveMarketReport.smartHubArbitrage.originCity} ({liveMarketReport.smartHubArbitrage.originCode}) round-trip flights are ~{formatCurrency(liveMarketReport.smartHubArbitrage.originRoundTripPerPerson, currency)}/person (1-stop surge). Driving {liveMarketReport.smartHubArbitrage.driveTimeText} to <strong>{liveMarketReport.smartHubArbitrage.hubCity} ({liveMarketReport.smartHubArbitrage.hubCode})</strong> drops airfare to <strong>~{formatCurrency(liveMarketReport.smartHubArbitrage.hubRoundTripPerPerson, currency)}/person</strong>!
                      </p>
                    </div>
                    <a
                      href={liveMarketReport.smartHubArbitrage.hubGoogleFlightsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] shrink-0 text-center transition-colors"
                    >
                      Check {liveMarketReport.smartHubArbitrage.hubCode} Flights ↗
                    </a>
                  </div>
                )}

                {/* 6-Vertical Itemized Market Breakdown */}
                <div className="divide-y divide-slate-800/80 text-xs">
                  {liveMarketReport.lineItems.map((item) => {
                    const displayAmt = budgetMode === 'total' ? item.totalGroupAmountINR : item.amountPerPersonINR;
                    const badgeClasses =
                      item.statusTone === 'surge'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : item.statusTone === 'savings'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : item.statusTone === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/30';

                    return (
                      <div key={item.id} className="py-2 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-100">{item.itemTitle}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeClasses}`}>
                              {item.statusLabel}
                            </span>
                            {!item.isIncludedInGroundBudget && (
                              <span className="text-[9px] font-semibold text-amber-300/90">
                                • Separate Air/Hub Ticket
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.subtitle}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-extrabold block ${item.id === 'smart_hub' ? 'text-emerald-400' : 'text-white'}`}>
                            {formatCurrency(displayAmt, currency)}
                          </span>
                          {item.bookingUrl && (
                            <a
                              href={item.bookingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-bold text-emerald-400 hover:underline"
                            >
                              {item.bookingProvider || 'Live Rate'} ↗
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Summary Totals Footer */}
                <div className="pt-2.5 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/90 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Live On-Ground Market Cost</span>
                      <span className="text-[10px] text-emerald-400 font-bold">Stays + Cabs + Passes + Dining</span>
                    </div>
                    <span className="text-sm font-black text-white">
                      {formatCurrency(
                        budgetMode === 'total'
                          ? liveMarketReport.recommendedGroundBudgetINR
                          : Math.round(liveMarketReport.recommendedGroundBudgetINR / Math.max(1, travelersCount)),
                        currency
                      )}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/90 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        All-In Market Total (with {liveMarketReport.smartHubArbitrage ? liveMarketReport.smartHubArbitrage.hubCode : liveMarketReport.originAirportCode} Flights)
                      </span>
                      <span className="text-[10px] text-sky-400 font-bold">
                        {liveMarketReport.smartHubArbitrage
                          ? `Saves ${formatCurrency(liveMarketReport.smartHubArbitrage.totalGroupSavings, currency)} vs ${liveMarketReport.originAirportCode}`
                          : 'Round-Trip Air + Ground'}
                      </span>
                    </div>
                    <span className="text-sm font-black text-emerald-400">
                      {formatCurrency(
                        budgetMode === 'total'
                          ? liveMarketReport.totalWithSmartHubFlightsINR
                          : Math.round(liveMarketReport.totalWithSmartHubFlightsINR / Math.max(1, travelersCount)),
                        currency
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: TRAVEL PREFERENCES & SIGHTS SELECTION */}
          {currentStep === 5 && (
            <div className="space-y-6 animate-in fade-in">
              <div>
                <span className="badge-caps text-[#2D5A3D]">{t('Step 5 — Sights & Flexibility')}</span>
                <h3 className="text-xl sm:text-2xl font-bold font-display text-[#0B2545] mt-1">{t('Customize Your Itinerary & Sights')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('No forced rigid plans. Choose your itinerary style and select the exact sights you want to visit.')}
                </p>
              </div>

              {/* Itinerary Flexibility Mode Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setItineraryStyle('flexible_custom')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    itineraryStyle === 'flexible_custom'
                      ? 'border-[#2D5A3D] bg-emerald-50/70 shadow-xs ring-2 ring-[#2D5A3D]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#2D5A3D] flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    {itineraryStyle === 'flexible_custom' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-900 block">Flexible Custom Plan (Traveler's Choice)</span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    Zero rigid schedules or fixed hours. Choose your own sights and explore at your own pace with total flexibility.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setItineraryStyle('ai_curated')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    itineraryStyle === 'ai_curated'
                      ? 'border-[#2D5A3D] bg-emerald-50/70 shadow-xs ring-2 ring-[#2D5A3D]/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-[#2D5A3D]" />
                    </div>
                    {itineraryStyle === 'ai_curated' && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-slate-900 block">AI Curated Timeline</span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    AI balances your selected sights across days with optimized routing, while leaving everything 100% editable.
                  </span>
                </button>
              </div>

              {/* Genuine Destination Sights & Attractions Selection */}
              {availableSights.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                        Select Sights to Visit in {destination || 'Destination'}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {selectedSights.length} of {availableSights.length} attractions chosen by you
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSights([...availableSights])}
                        className="text-[11px] font-bold text-[#2D5A3D] hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSights([])}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto overscroll-contain pr-1">
                    {availableSights.map((sight) => {
                      const isChosen = selectedSights.includes(sight);
                      return (
                        <button
                          key={sight}
                          type="button"
                          onClick={() => toggleSight(sight)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isChosen
                              ? 'bg-[#2D5A3D] text-white shadow-2xs font-bold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {isChosen && <Check className="w-3.5 h-3.5" />}
                          <span className="truncate max-w-[220px]">{sight}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Spot / Attraction */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={customSightInput}
                      onChange={(e) => setCustomSightInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomSight();
                        }
                      }}
                      placeholder={`Add another spot in ${destination || 'this trip'} (e.g. local bazaar, cafe)...`}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#2D5A3D] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSight}
                      disabled={!customSightInput.trim()}
                      className="px-3 py-1.5 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Experience Vibes */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  {t('Trip Vibes & Interests')}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {preferenceOptions.map(opt => {
                    const isSelected = preferences.includes(opt.id);
                    const PrefIcon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => togglePreference(opt.id)}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all min-w-0 cursor-pointer ${isSelected
                          ? 'border-[#2D5A3D] bg-emerald-50 text-slate-900 font-bold shadow-2xs'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                          }`}
                      >
                        <PrefIcon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#2D5A3D]' : 'text-slate-400'}`} />
                        <span className="text-xs sm:text-sm font-semibold truncate min-w-0 flex-1">{t(opt.label)}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#2D5A3D] ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="trip-special-requests" className="block text-xs font-bold uppercase text-slate-600 mb-1.5">
                  {t('What matters most on this trip?')}
                </label>
                <textarea
                  id="trip-special-requests"
                  value={specialRequests}
                  onChange={(event) => setSpecialRequests(event.target.value.slice(0, 500))}
                  placeholder={t('For example: quiet places, easy walks for my parents, local vegetarian food, and no packed schedules.')}
                  rows={2}
                  maxLength={500}
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#2D5A3D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#2D5A3D]/15"
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">{specialRequests.length}/500</p>
              </div>
            </div>
          )}

          {/* STEP 6: TRANSPORTATION */}
          {currentStep === 6 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('Step 6 — Transportation Mode')}</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">{t('How do you prefer to travel?')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('For road trips (Car/Bike), we calculate fuel, tolls, and automatic highway break stops.')}
                </p>
              </div>

              {/* Geographic Feasibility Notice Banner */}
              {transportFeasibility.transitNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs sm:text-sm flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900">{t(transportFeasibility.transitNotice)}</span>
                    <span className="text-[11px] text-amber-700/90 mt-0.5 block">
                      {t('Unavailable travel options for this route are automatically excluded to keep your itinerary realistic.')}
                    </span>
                  </div>
                </div>
              )}

              {/* Grid: Only render physically and geographically feasible modes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {transportFeasibility.allModes
                  .filter(m => m.isAvailable)
                  .map(tMode => {
                    const IconComponent =
                      tMode.id === 'car' ? Car :
                      tMode.id === 'bike' ? Bike :
                      tMode.id === 'bus' ? Bus :
                      tMode.id === 'train' ? Train :
                      tMode.id === 'flight' ? Plane : Sparkles;
                    const isSelected = transportMode === tMode.id;
                    const liveModePriceTag =
                      tMode.id === 'flight'
                        ? liveMarketReport.smartHubArbitrage
                          ? `~${formatCurrency(liveMarketReport.smartHubArbitrage.hubRoundTripPerPerson, currency)}/pax via ${liveMarketReport.smartHubArbitrage.hubCode}`
                          : `~${formatCurrency(liveMarketReport.flightRoundTripPerPersonINR, currency)}/pax RT`
                        : tMode.id === 'train'
                        ? `~${formatCurrency(liveMarketReport.trainRoundTripPerPersonINR, currency)}/pax RT`
                        : tMode.id === 'car' || tMode.id === 'bike'
                        ? `~${formatCurrency(liveMarketReport.roadTripFuelAndTollsINR, currency)} fuel & tolls`
                        : null;

                    return (
                      <button
                        key={tMode.id}
                        type="button"
                        onClick={() => setTransportMode(tMode.id as TransportMode)}
                        className={`p-3.5 rounded-2xl border text-left transition-all ${isSelected
                          ? 'border-[#2D5A3D] bg-emerald-50/70 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <IconComponent className={`w-5 h-5 ${isSelected ? 'text-[#2D5A3D]' : 'text-slate-400'}`} />
                          {liveModePriceTag && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-[#2D5A3D]">
                              {liveModePriceTag}
                            </span>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 block">{t(tMode.label)}</span>
                        <span className="text-[11px] text-slate-500">{t(tMode.desc)}</span>
                      </button>
                    );
                  })}
              </div>

              {/* Airfare Dynamics & Smart Nearby Hub Arbitrage Card when Flight is Selected */}
              {transportMode === 'flight' && (
                <div className="p-4 rounded-2xl bg-sky-50/95 border border-sky-200/90 text-sky-950 text-xs space-y-3 animate-in fade-in">
                  <div className="flex items-start justify-between gap-2.5 flex-wrap">
                    <div className="flex items-start gap-2.5">
                      <Plane className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-sky-950 block">
                          Live Route Market Index: {liveMarketReport.originCity} ({liveMarketReport.originAirportCode}) ↔ {liveMarketReport.gatewayAirportName}
                        </span>
                        <span className="text-[11px] text-sky-800 block mt-0.5">
                          {liveMarketReport.flightCarrierSummary} • Est. Round-Trip: <strong>{formatCurrency(liveMarketReport.flightRoundTripPerPersonINR, currency)}/person</strong> ({formatCurrency(liveMarketReport.flightTotalGroupINR, currency)} total for {travelersCount})
                        </span>
                      </div>
                    </div>
                    <a
                      href={liveMarketReport.flightGoogleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shrink-0 transition-colors"
                    >
                      Verify Live on Google Flights ↗
                    </a>
                  </div>

                  {liveMarketReport.smartHubArbitrage && (
                    <div className="p-3 rounded-xl bg-emerald-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0 fill-amber-300" />
                          <span className="text-xs font-black uppercase tracking-wide">
                            Smart Nearby Hub Swap: Save {formatCurrency(liveMarketReport.smartHubArbitrage.totalGroupSavings, currency)} Total
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-50 leading-snug">
                          {liveMarketReport.smartHubArbitrage.explanation}
                        </p>
                      </div>
                      <a
                        href={liveMarketReport.smartHubArbitrage.hubGoogleFlightsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-extrabold text-[11px] shrink-0 text-center transition-colors shadow-2xs"
                      >
                        Compare {liveMarketReport.smartHubArbitrage.hubCode} Flights ({formatCurrency(liveMarketReport.smartHubArbitrage.hubRoundTripPerPerson, currency)}/pax) ↗
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Road Trip Live Fuel + NHAI Fastag Breakdown when Car or Bike is Selected */}
              {(transportMode === 'car' || transportMode === 'bike') && (
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <Car className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-900 block">
                      Live Highway Fuel & NHAI Fastag Toll Estimate: {formatCurrency(liveMarketReport.roadTripFuelAndTollsINR, currency)} (Round-Trip)
                    </span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {liveMarketReport.roadTripBreakdownText} • Local destination cab/union tariff est: {formatCurrency(liveMarketReport.localTransitTotalGroupINR, currency)} ({liveMarketReport.localTransitDescription}).
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/80 rounded-2xl text-xs text-slate-700">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#2D5A3D] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <strong className="text-slate-900 block font-bold">{t('Direct Live Booking & Ticketing')}</strong>
                  <span className="text-slate-500 text-[11px]">
                    {t('TripVerse matches live Google Flights, IRCTC Express trains, redBus volvo coaches, and Zoomcar self-drives with direct booking deep-links.')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: ACCOMMODATION */}
          {currentStep === 7 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('Step 7 — Accommodation')}</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">{t('Where would you like to stay?')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('TripVerse matches real, verified hotels and boutique stays with instant Booking.com & Google Hotels booking links.')}
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
                        ? 'border-[#2D5A3D] bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-[#2D5A3D]' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block">{t(acc.label)}</span>
                      <span className="text-[11px] text-slate-500">{t(acc.desc)}</span>
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
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('Step 8 — Dining & Food')}</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">{t('What are your dietary preferences?')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('We calculate calibrated regional dining budgets (famous thalis, street food, and verified kitchens) matching your preference.')}
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
                        ? 'border-[#2D5A3D] bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? 'text-[#2D5A3D]' : 'text-slate-400'}`} />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block">{t(food.label)}</span>
                      <span className="text-[11px] text-slate-500">{t(food.desc)}</span>
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
                <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('Step 9 — Core Priority')}</span>
                <h3 className="text-2xl font-bold text-[#0B2545] mt-1">{t('What matters most to you?')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {t('Select your top priority. The AI algorithm will balance trade-offs in your favor.')}
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
                        ? 'border-[#2D5A3D] bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-[#2D5A3D]' : 'text-slate-400'}`} />
                        {isSelected && <Check className="w-4 h-4 text-[#2D5A3D]" />}
                      </div>
                      <span className="text-sm font-bold text-slate-900 block">{t(p.label)}</span>
                      <span className="text-xs text-slate-500 mt-0.5 block">{t(p.desc)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Live Journey Receipt Preview Strip */}
        <div className="px-4 sm:px-6 py-2 border-t border-slate-100/90 dark:border-slate-800/80 bg-gradient-to-r from-[#F4F6F2] via-[#EAF0E9]/70 to-[#F4F6F2] dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-900 flex items-center justify-between gap-3 text-[11px] text-[#2D5A3D] dark:text-emerald-300 font-semibold overflow-x-auto scrollbar-none shrink-0">
          <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-[#152A1C] dark:text-slate-100 truncate max-w-[140px] sm:max-w-[220px]">
              {origin.split(',')[0] || 'Origin'} → {destination.split(',')[0] || 'Any Spot'}
            </span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap text-slate-600 dark:text-slate-300 shrink-0">
            <span>{duration}d</span>
            <span>•</span>
            <span>{travelersCount} {travelersCount === 1 ? 'Traveler' : 'Travelers'}</span>
            <span>•</span>
            <span className="font-bold text-[#2D5A3D] dark:text-emerald-400">
              {formatCurrency(budgetAmount, currency)}
              {budgetMode === 'per_person' ? '/person' : ' ground'}
            </span>
          </div>
        </div>

        {/* Inline Liquid Glass Validation Banner */}
        {validationError && (
          <div
            role="alert"
            className="mx-4 sm:mx-6 mb-2 px-3.5 py-2.5 rounded-2xl bg-rose-50/95 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in"
          >
            <span>{validationError}</span>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              aria-label="Dismiss validation message"
              className="min-h-0 text-rose-500 hover:text-rose-700 font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Bottom Navigation Controls */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-white/90 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 1}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${currentStep === 1
              ? 'text-slate-300 cursor-not-allowed opacity-50'
              : 'text-slate-700 hover:bg-slate-200/70'
              }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('planner.back')}</span>
          </button>

          <div className="flex items-center gap-2">
            {currentStep < totalSteps && quota.canCreateTrip && (
              <button
                type="button"
                onClick={() => {
                  if (isSubmittingRef.current) return;
                  if (isGuest) {
                    onClose();
                    if (onOpenAuthModal) onOpenAuthModal();
                    return;
                  }
                  const err = validateStepOrAll('all');
                  if (err) {
                    setValidationError(err);
                    return;
                  }
                  setValidationError(null);
                  isSubmittingRef.current = true;
                  const finalDest = destination.trim();
                  const finalTransportMode = transportFeasibility.availableModes.includes(transportMode)
                    ? transportMode
                    : transportFeasibility.recommendedDefaultMode;
                  onTripGenerated({
                    origin: origin.trim(),
                    originCoords,
                    destinationName: finalDest,
                    durationDays: Math.min(30, Math.max(1, Math.round(duration || 3))),
                    travelersCount: Math.min(30, Math.max(1, Math.round(travelersCount || 2))),
                    travelerType,
                    budgetMode,
                    budgetAmount: Math.max(500, Math.round(budgetAmount || 15000)),
                    preferences,
                    specialRequests: specialRequests.trim(),
                    transportMode: finalTransportMode,
                    accommodationType,
                    foodPreference,
                    priorities,
                    destinationCoords: selectedPreciseSpot?.coordinates,
                    preciseLocation: selectedPreciseSpot || resolvePreciseLocationSync(finalDest),
                    startDate,
                    pacing,
                    itineraryStyle,
                    selectedActivities: selectedSights
                  });
                  setTimeout(() => {
                    isSubmittingRef.current = false;
                  }, 1500);
                }}
                data-testid="planner-instant-generate"
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#2D5A3D]/30 bg-emerald-50/80 hover:bg-emerald-100/80 text-[#2D5A3D] font-bold text-xs transition-all cursor-pointer active:scale-95"
                title="Skip remaining steps and generate immediately with smart AI defaults"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>{t('Instant Generate')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={!quota.canCreateTrip && onOpenProModal ? onOpenProModal : handleNext}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer shrink-0 ${
                !quota.canCreateTrip && currentStep === totalSteps
                  ? 'bg-gradient-to-r from-amber-500 via-[#2D5A3D] to-[#1E3E2A] hover:opacity-95 shadow-amber-500/20'
                  : 'bg-trip-gradient hover:bg-trip-gradient-hover shadow-emerald-500/20'
              }`}
            >
              {currentStep === totalSteps ? (
                !quota.canCreateTrip ? (
                  <>
                    <Crown className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>{t('planner.upgradeToPro')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{t('planner.generate')}</span>
                  </>
                )
              ) : (
                <>
                  <span>{t('planner.next')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
      )}
    </div>
  );
};
