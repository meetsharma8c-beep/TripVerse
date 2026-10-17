import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Trip, Destination, BreakStop, BudgetBreakdown, UserProfile, ItineraryActivity, Coordinates } from './types/trip';
import {
  loadTrips,
  saveTrips,
  saveOrUpdateTrip,
  deleteTrip,
  getActiveTripId,
  setActiveTripId,
  loadUserProfile,
  saveUserProfile,
  loadSavedItemIds,
  saveSavedItemIds,
  toggleSavedItemId,
  loadUserVisitedStates,
  saveUserVisitedStates,
  migrateGuestCreatedTripsToUser,
  hasCompletedOnboarding,
  setOnboardingCompleted,
  loadTripExpenses,
  saveTripExpenses,
  loadTripPacking,
  saveTripPacking,
  resetGuestStorage
} from './services/storageService';
import { type PlannerInput } from './services/plannerEngine';
import { generatePersonalizedTrip } from './services/aiTripPlanner';
import { applyGeoapifyTravelData, fetchGeoapifyTravelData, getBreakStopSection } from './services/travelDataService';
import { getStoredCurrency, setActiveCurrency, Currency } from './services/currencyService';
import { generateNotifications } from './services/notificationService';
import { AIAppAction } from './services/aiAssistant';
import { triggerHaptic } from './services/deviceService';

// Common Components
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { Logo } from './components/common/Logo';
import { ModalSkeleton } from './components/common/SkeletonLoader';
import { OfflineStatusBar } from './components/common/OfflineStatusBar';
import { LegalTrustModal, LegalTab } from './components/common/LegalTrustModal';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';
import { AppSplashScreen } from './components/common/AppSplashScreen';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { PullToRefresh } from './components/common/PullToRefresh';

// Home Components
import { HeroSection } from './components/home/HeroSection';
import { FeaturePillars } from './components/home/FeaturePillars';
import { PopularDestinations } from './components/home/PopularDestinations';
import { HighwayBreakstopsShowcase } from './components/home/HighwayBreakstopsShowcase';
import { PublicLaunchSpotlight } from './components/home/PublicLaunchSpotlight';
import { AIGenerationSkeleton } from './components/common/AIGenerationSkeleton';
import { POPULAR_DESTINATIONS } from './data/destinations';

// Itinerary Components
import { TripHeader } from './components/itinerary/TripHeader';
import { DayTimeline } from './components/itinerary/DayTimeline';
import { BreakStopCard } from './components/itinerary/BreakStopCard';
import { BudgetOptimizer } from './components/itinerary/BudgetOptimizer';
import { SafetyEmergency } from './components/itinerary/SafetyEmergency';
import { PackingWeatherView } from './components/itinerary/PackingWeatherView';
import { TripSplitExpenses } from './components/itinerary/TripSplitExpenses';
import { LocalGemsView } from './components/itinerary/LocalGemsView';
import { ActivityModal } from './components/itinerary/ActivityModal';

// Transport Deals & Views
import { TransportDealsView } from './components/deals/TransportDealsView';

// Trips & Explore Views
import { MyTripsView } from './components/trips/MyTripsView';
import { ExploreView } from './components/explore/ExploreView';
import { DestinationDetailModal } from './components/explore/DestinationDetailModal';
import { SavedItemsView } from './components/saved/SavedItemsView';
import { ProfileView } from './components/profile/ProfileView';
import { AuthModal } from './components/profile/AuthModal';
import { 
  getCurrentUser, 
  onAuthStateChanged, 
  toUserProfile, 
  getUserSubscriptionQuota, 
  consumeTripCredit 
} from './services/authService';
import { TripVerseProModal } from './components/subscription/TripVerseProModal';
import { AuthUser } from './types/auth';
import {
  loadUserTripsFromSupabase,
  loadUserProfileFromSupabase,
  loadUserPassportFromSupabase,
  loadUserSavedItemsFromSupabase,
  loadUserActiveTripFromSupabase,
  saveAllUserTripsToSupabase,
  saveUserProfileToSupabase,
  saveUserPassportToSupabase,
  saveUserSavedItemsToSupabase
} from './services/supabaseSyncService';

// Disruption Banner
import { DisruptionBanner } from './components/replanning/DisruptionBanner';
import { DisruptionAlert } from './types/replanning';

// Lazy-Loaded Heavy Modals for Optimized Code Splitting & CWV Speed
const SmartRouteMap = lazy(() => import('./components/itinerary/SmartRouteMap').then(m => ({ default: m.SmartRouteMap })));
const TripBookingCheckoutModal = lazy(() => import('./components/booking/TripBookingCheckoutModal').then(m => ({ default: m.TripBookingCheckoutModal })));
const PlannerWizard = lazy(() => import('./components/planner/PlannerWizard').then(m => ({ default: m.PlannerWizard })));
const TripReplanningModal = lazy(() => import('./components/replanning/TripReplanningModal').then(m => ({ default: m.TripReplanningModal })));
const PrintTravelGuideModal = lazy(() => import('./components/itinerary/PrintTravelGuideModal').then(m => ({ default: m.PrintTravelGuideModal })));
const LiveNavigationHUD = lazy(() => import('./components/navigation/LiveNavigationHUD').then(m => ({ default: m.LiveNavigationHUD })));
const AIChatDrawer = lazy(() => import('./components/chat/AIChatDrawer').then(m => ({ default: m.AIChatDrawer })));
const ShareTripModal = lazy(() => import('./components/trips/ShareTripModal').then(m => ({ default: m.ShareTripModal })));
const TripPhotoJournalModal = lazy(() => import('./components/memories/TripPhotoJournalModal').then(m => ({ default: m.TripPhotoJournalModal })));
const NotificationCenterModal = lazy(() => import('./components/notifications/NotificationCenterModal').then(m => ({ default: m.NotificationCenterModal })));
const OnboardingModal = lazy(() => import('./components/onboarding/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
const TripReviewModal = lazy(() => import('./components/reviews/TripReviewModal').then(m => ({ default: m.TripReviewModal })));
const TripCollaborationModal = lazy(() => import('./components/collaboration/TripCollaborationModal').then(m => ({ default: m.TripCollaborationModal })));

import { TripPassesHubView } from './components/booking/TripPassesHubView';

// Icons
import {
  Calendar,
  MapPin,
  Coffee,
  Wallet,
  ShieldCheck,
  Sparkles,
  Tag,
  CloudSun,
  Receipt,
  UtensilsCrossed,
  Compass,
  ChevronDown,
  QrCode,
  ArrowLeft,
  Bookmark,
  MoreVertical
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Browser Route & Deep Link URL Resolver
function resolveRouteFromBrowser(loadedTrips: Trip[]) {
  if (typeof window === 'undefined') {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  const pathname = (window.location.pathname || '/').toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const rawHash = (window.location.hash || '').toLowerCase().replace('#', '');

  // 1. Direct pathname routing (/destination/:slug, /trip/:id, /itinerary/:id, /booking, /explore, /mytrips, /saved, /profile, /planner)
  if (pathname.startsWith('/destination/')) {
    const slug = pathname.replace('/destination/', '').trim();
    if (slug) {
      const match = POPULAR_DESTINATIONS.find(d =>
        d.id.toLowerCase() === slug ||
        d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug ||
        d.name.toLowerCase() === slug
      );
      if (match) {
        return { tab: 'explore', dest: match, tripId: null, openBooking: false, openPlanner: false };
      }
    }
    return { tab: 'explore', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  if (pathname.startsWith('/trip/') || pathname.startsWith('/itinerary/')) {
    const tripId = pathname.replace('/trip/', '').replace('/itinerary/', '').trim();
    const found = loadedTrips.find(t => t.id.toLowerCase() === tripId);
    if (found) {
      return { tab: 'trip-detail', dest: null, tripId: found.id, openBooking: false, openPlanner: false };
    }
    return { tab: 'trips', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  if (pathname.startsWith('/booking')) {
    const bookingTripId = pathname.replace('/booking/', '').replace('/booking', '').trim();
    const found = (bookingTripId ? loadedTrips.find(t => t.id.toLowerCase() === bookingTripId) : null) || loadedTrips[0];
    if (found) {
      return { tab: 'trip-detail', dest: null, tripId: found.id, openBooking: true, openPlanner: false };
    }
    return { tab: 'trips', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  if (pathname === '/explore') {
    return { tab: 'explore', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  if (pathname === '/mytrips' || pathname === '/trips') {
    return { tab: 'trips', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  if (pathname === '/saved') {
    return { tab: 'saved', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  if (pathname === '/profile') {
    return { tab: 'profile', dest: null, tripId: null, openBooking: false, openPlanner: false };
  }
  if (pathname === '/planner') {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: true };
  }

  // 2. Query parameters fallback (?tripId=..., ?action=..., ?collab=..., ?tab=...)
  const tripIdParam = searchParams.get('tripId') || searchParams.get('trip');
  const actionParam = searchParams.get('action');
  const collabParam = searchParams.get('collab');
  const tabParam = searchParams.get('tab');

  if (collabParam) {
    const targetTrip = (tripIdParam ? loadedTrips.find(t => t.id === tripIdParam) : null)
      || loadedTrips.find(t => t.collaboration?.inviteCode === collabParam)
      || loadedTrips[0];
    if (targetTrip) {
      return { tab: 'trip-detail', dest: null, tripId: targetTrip.id, openBooking: false, openPlanner: false, openCollab: true };
    }
  }

  if (tripIdParam) {
    const found = loadedTrips.find(t => t.id === tripIdParam);
    if (found) {
      return { tab: 'trip-detail', dest: null, tripId: found.id, openBooking: actionParam === 'book', openPlanner: false, openCollab: false };
    }
  }
  if (actionParam === 'pro' || actionParam === 'subscription') {
    return { tab: 'profile', dest: null, tripId: null, openBooking: false, openPlanner: false, openPro: true };
  }
  if (actionParam === 'plan') {
    return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: true };
  }
  if (actionParam === 'book') {
    return { tab: 'trip-detail', dest: null, tripId: null, openBooking: true, openPlanner: false };
  }
  if (tabParam && ['home', 'explore', 'trips', 'saved', 'profile'].includes(tabParam)) {
    return { tab: tabParam, dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  // 3. Hash fallback (#explore, #mytrips, #saved, #profile, #trip-...)
  if (rawHash.startsWith('trip-') && rawHash.length > 5) {
    const hashTripId = rawHash.replace('trip-', '');
    const found = loadedTrips.find(t => t.id === hashTripId);
    if (found) {
      return { tab: 'trip-detail', dest: null, tripId: found.id, openBooking: false, openPlanner: false };
    }
  }
  if (rawHash === 'mytrips') return { tab: 'trips', dest: null, tripId: null, openBooking: false, openPlanner: false };
  if (['home', 'explore', 'trips', 'saved', 'profile', 'trip-detail'].includes(rawHash)) {
    return { tab: rawHash, dest: null, tripId: null, openBooking: false, openPlanner: false };
  }

  return { tab: 'home', dest: null, tripId: null, openBooking: false, openPlanner: false };
}

export function App() {
  const initialTrips = React.useMemo(() => loadTrips(), []);
  const initialRoute = React.useMemo(() => resolveRouteFromBrowser(initialTrips), [initialTrips]);

  // Global State
  const [currentTab, setCurrentTab] = useState<string>(() => initialRoute.tab || 'home');
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [activeTripIdState, setActiveTripIdState] = useState<string>(() => initialRoute.tripId || getActiveTripId());
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser());
  const [savedItemIds, setSavedItemIds] = useState<string[]>(() => loadSavedItemIds());

  useEffect(() => {
    const unsub = onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        const localProfile = toUserProfile(user);
        setUserProfile(localProfile);

        // 1. Immediately switch in-memory state to the user's local account data
        const localUserTrips = loadTrips(user.uid);
        setTrips(localUserTrips);
        const userActiveId = getActiveTripId(user.uid);
        setActiveTripIdState(userActiveId);
        const userSaved = loadSavedItemIds(user.uid);
        setSavedItemIds(userSaved);
        const userStates = loadUserVisitedStates(user.uid);
        window.dispatchEvent(new CustomEvent('tripverse_visited_states_change', { detail: userStates }));

        // 2. Fetch and sync from Supabase PostgreSQL strictly for this user
        try {
          const [cloudTrips, cloudProfile, cloudStates, cloudSavedItems, cloudActiveTrip] = await Promise.all([
            loadUserTripsFromSupabase(user.uid),
            loadUserProfileFromSupabase(user.uid),
            loadUserPassportFromSupabase(user.uid),
            loadUserSavedItemsFromSupabase(user.uid),
            loadUserActiveTripFromSupabase(user.uid)
          ]);

          if (cloudTrips && cloudTrips.length > 0) {
            // User has cloud trips for their account: display and cache locally
            const tripsWithoutUnverifiedDeals = cloudTrips.map(trip => ({
              ...trip,
              bestTransportDeal: undefined,
              transportDeals: []
            }));
            setTrips(tripsWithoutUnverifiedDeals);
            saveTrips(tripsWithoutUnverifiedDeals, user.uid);
            if (!tripsWithoutUnverifiedDeals.some(t => t.id === userActiveId)) {
              setActiveTripIdState(tripsWithoutUnverifiedDeals[0].id);
              setActiveTripId(tripsWithoutUnverifiedDeals[0].id, user.uid);
            }
          } else {
            // User has no cloud trips yet.
            // Check if guest created a trip right before sign in, migrate it to this user
            const migrated = migrateGuestCreatedTripsToUser(user.uid);
            if (migrated.length > 0) {
              const updatedTrips = loadTrips(user.uid);
              setTrips(updatedTrips);
              saveAllUserTripsToSupabase(user.uid, migrated).catch(() => { });
            } else {
              // Only sync existing local user-created trips (NEVER unowned samples or other users' data)
              const userCreated = localUserTrips.filter(t => t.isUserCreated && t.userId === user.uid);
              if (userCreated.length > 0) {
                saveAllUserTripsToSupabase(user.uid, userCreated).catch(() => { });
              }
            }
          }

          if (cloudProfile) {
            const merged = { ...localProfile, ...cloudProfile };
            setUserProfile(merged);
            saveUserProfile(merged, user.uid);
            // Restore user's preferred currency across devices
            if (merged.preferredCurrency) {
              setActiveCurrency(merged.preferredCurrency);
            }
          } else {
            saveUserProfileToSupabase(user.uid, localProfile).catch(() => { });
          }

          if (cloudStates && cloudStates.length > 0) {
            saveUserVisitedStates(cloudStates, user.uid);
          } else if (userStates.length > 0) {
            saveUserPassportToSupabase(user.uid, userStates).catch(() => { });
          }

          if (cloudSavedItems && cloudSavedItems.length > 0) {
            setSavedItemIds(cloudSavedItems);
            saveSavedItemIds(cloudSavedItems, user.uid);
          } else if (userSaved.length > 0) {
            saveUserSavedItemsToSupabase(user.uid, userSaved).catch(() => { });
          }

          if (cloudActiveTrip) {
            setActiveTripIdState(cloudActiveTrip);
            setActiveTripId(cloudActiveTrip, user.uid);
          }
        } catch (e) {
          console.warn('[Supabase Sync Notice]:', e);
        }
      } else {
        // User logged out -> Switch cleanly to fresh Guest state (Option 2 ephemeral storage)
        resetGuestStorage();
        const guestProfile = loadUserProfile(null);
        setUserProfile(guestProfile);
        const guestTrips = loadTrips(null);
        setTrips(guestTrips);
        const guestActiveTripId = getActiveTripId(null);
        setActiveTripIdState(guestActiveTripId);
        const guestSavedItems = loadSavedItemIds(null);
        setSavedItemIds(guestSavedItems);
        const guestStates = loadUserVisitedStates(null);
        window.dispatchEvent(new CustomEvent('tripverse_visited_states_change', { detail: guestStates }));
      }
    });
    return unsub;
  }, []);

  // Sub-tab inside Trip Detail view
  const [tripSubTab, setTripSubTab] = useState<
    'itinerary' | 'hub' | 'packing' | 'expenses' | 'gems' | 'deals' | 'route' | 'breakstops' | 'budget' | 'safety'
  >('itinerary');
  const [tripsViewMode, setTripsViewMode] = useState<'passes' | 'portfolio'>('passes');

  // Modals & Drawers
  const [isPlannerOpen, setIsPlannerOpen] = useState(() => initialRoute.openPlanner || false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(() => (initialRoute as any).openCollab || false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLiveNavOpen, setIsLiveNavOpen] = useState(false);
  const [isProModalOpen, setIsProModalOpen] = useState(() => (initialRoute as any).openPro || false);
  const [isBestDealModalOpen, setIsBestDealModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(() => initialRoute.openBooking || false);
  const [selectedDestinationForDetails, setSelectedDestinationForDetails] = useState<Destination | null>(() => initialRoute.dest || null);
  const [activityModalState, setActivityModalState] = useState<{
    isOpen: boolean;
    dayNumber: number;
    activity?: ItineraryActivity | null;
  }>({
    isOpen: false,
    dayNumber: 1,
    activity: null
  });

  // Planner prefill params
  const [plannerPrefill, setPlannerPrefill] = useState<{
    destination: string;
    duration: number;
    travelers: number;
    budget: number;
  }>({
    destination: '',
    duration: 3,
    travelers: 3,
    budget: 8000
  });

  // Quick 1-Click AI Trip Generator State (Reconciling "Plan in 30 Seconds" with stepped feedback)
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);
  const [generationParams, setGenerationParams] = useState<{
    destination: string;
    duration: number;
    travelers: number;
    budget: number;
  }>({
    destination: 'Udaipur',
    duration: 3,
    travelers: 2,
    budget: 8000
  });

  // Active currency
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency());

  // Trip Replanning & Disruption State
  const [isReplanningOpen, setIsReplanningOpen] = useState(false);
  const [replanningInitialScreen, setReplanningInitialScreen] = useState<1 | 2 | 3 | 4 | 5 | 'refund'>(2);
  const [activeDisruption, setActiveDisruption] = useState<DisruptionAlert | null>(null);
  const [isDisruptionDismissed, setIsDisruptionDismissed] = useState(false);
  const [activeChatQuery, setActiveChatQuery] = useState<string | undefined>(undefined);

  // Feature 2: Photo Memories Scrapbook State
  const [isPhotoJournalOpen, setIsPhotoJournalOpen] = useState(false);
  const [photoJournalTrip, setPhotoJournalTrip] = useState<Trip | null>(null);

  // Feature 3: Notification Center & Countdown State
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Feature 4: First-Time User Onboarding State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Feature 5: Post-Trip Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewTrip, setReviewTrip] = useState<Trip | null>(null);

  // Native & PWA App Opening Animation Screen State
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('nosplash') === 'true' || window.localStorage?.getItem('tripverse_skip_splash') === 'true' || window.sessionStorage?.getItem('tripverse_skip_splash') === 'true') {
        return false;
      }
    }
    return true;
  });
  const [splashPlatform, setSplashPlatform] = useState<'ios' | 'android' | undefined>(undefined);

  const handleFinishSplash = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    const handleReplay = (e: any) => {
      if (e.detail?.platform) {
        setSplashPlatform(e.detail.platform);
      }
      setShowSplash(true);
    };
    window.addEventListener('tripverse-show-splash', handleReplay);
    return () => window.removeEventListener('tripverse-show-splash', handleReplay);
  }, []);

  // Legal, Trust & Traveler Feedback Modal State
  const [legalModalState, setLegalModalState] = useState<{
    isOpen: boolean;
    tab: LegalTab;
  }>({
    isOpen: false,
    tab: 'privacy'
  });

  // Currency Change Listener — persist to Supabase profile
  useEffect(() => {
    const handleCurrency = (e: Event) => {
      const newCurrency = (e as CustomEvent<Currency>).detail;
      setCurrency(getStoredCurrency());
      // Persist currency preference to cloud profile
      if (currentUser?.uid && userProfile) {
        const updatedProfile = { ...userProfile, preferredCurrency: newCurrency };
        setUserProfile(updatedProfile);
        saveUserProfile(updatedProfile, currentUser.uid);
        saveUserProfileToSupabase(currentUser.uid, updatedProfile).catch(() => { });
      }
    };
    window.addEventListener('tripverse_currency_change', handleCurrency);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrency);
  }, [currentUser, userProfile]);

  // URL Pathname & Dynamic Document Title Sync for Browser & History Navigation
  useEffect(() => {
    let targetPath = '/';
    let targetTitle = 'TripVerse — AI Trip Planner';

    if (selectedDestinationForDetails) {
      targetPath = `/destination/${selectedDestinationForDetails.id}`;
      targetTitle = `${selectedDestinationForDetails.name} — TripVerse`;
    } else if (currentTab === 'trip-detail') {
      const active = trips.find(t => t.id === activeTripIdState) || trips[0];
      if (active) {
        targetPath = `/trip/${active.id}`;
        targetTitle = `${active.name} — TripVerse Itinerary`;
      } else {
        targetPath = '/mytrips';
        targetTitle = 'My Trips & Itineraries — TripVerse';
      }
    } else if (currentTab === 'explore') {
      targetPath = '/explore';
      targetTitle = 'Explore Destinations & Hidden Gems — TripVerse';
    } else if (currentTab === 'trips') {
      targetPath = '/mytrips';
      targetTitle = 'My Trips & Itineraries — TripVerse';
    } else if (currentTab === 'saved') {
      targetPath = '/saved';
      targetTitle = 'Saved Places & Pitstops — TripVerse';
    } else if (currentTab === 'profile') {
      targetPath = '/profile';
      targetTitle = 'Traveler Profile & Passport — TripVerse';
    } else {
      targetPath = '/';
      targetTitle = 'TripVerse — AI Trip Planner';
    }

    document.title = targetTitle;

    // Only update if path changed
    if (window.location.pathname !== targetPath) {
      window.history.pushState(
        { tab: currentTab, tripId: activeTripIdState, destId: selectedDestinationForDetails?.id },
        targetTitle,
        targetPath
      );
    }
  }, [currentTab, activeTripIdState, selectedDestinationForDetails, trips]);

  // Browser & Android Hardware/Gesture Back Button Handler
  useEffect(() => {
    const handlePopState = () => {
      // Step 1: If any top-level modal or drawer is open, dismiss it first (native app feel)
      if (isBookingModalOpen) {
        setIsBookingModalOpen(false);
        return;
      }
      if (isGlobalSearchOpen) {
        setIsGlobalSearchOpen(false);
        return;
      }
      if (isPlannerOpen) {
        setIsPlannerOpen(false);
        return;
      }
      if (isAIChatOpen) {
        setIsAIChatOpen(false);
        return;
      }
      if (isLiveNavOpen) {
        setIsLiveNavOpen(false);
        return;
      }
      if (selectedDestinationForDetails) {
        setSelectedDestinationForDetails(null);
        return;
      }
      if (isShareModalOpen) {
        setIsShareModalOpen(false);
        return;
      }
      if (isNotificationCenterOpen) {
        setIsNotificationCenterOpen(false);
        return;
      }
      if (isPhotoJournalOpen) {
        setIsPhotoJournalOpen(false);
        return;
      }
      if (isReviewModalOpen) {
        setIsReviewModalOpen(false);
        return;
      }
      if (isAuthModalOpen) {
        setIsAuthModalOpen(false);
        return;
      }
      if (isOnboardingOpen) {
        setIsOnboardingOpen(false);
        return;
      }
      if (activityModalState.isOpen) {
        setActivityModalState(prev => ({ ...prev, isOpen: false }));
        return;
      }
      if (legalModalState.isOpen) {
        setLegalModalState(prev => ({ ...prev, isOpen: false }));
        return;
      }
      if (isBestDealModalOpen) {
        setIsBestDealModalOpen(false);
        return;
      }
      if (isPrintModalOpen) {
        setIsPrintModalOpen(false);
        return;
      }

      // Step 2: Sync route from window.location.pathname and query/hash
      const route = resolveRouteFromBrowser(trips);
      if (route.dest) {
        setSelectedDestinationForDetails(route.dest);
      } else {
        setSelectedDestinationForDetails(null);
      }
      if (route.tripId) {
        setActiveTripIdState(route.tripId);
        setActiveTripId(route.tripId, currentUser?.uid);
      }
      if (route.openBooking) {
        setIsBookingModalOpen(true);
      }
      if (route.openPlanner) {
        setIsPlannerOpen(true);
      }
      setCurrentTab(route.tab);
    };

    // Android native back button listener dispatched from Capacitor
    const handleHardwareBack = (e: Event) => {
      if (
        isBookingModalOpen ||
        isGlobalSearchOpen ||
        isPlannerOpen ||
        isAIChatOpen ||
        isLiveNavOpen ||
        selectedDestinationForDetails ||
        isShareModalOpen ||
        isNotificationCenterOpen ||
        isPhotoJournalOpen ||
        isReviewModalOpen ||
        isAuthModalOpen ||
        isOnboardingOpen ||
        activityModalState.isOpen ||
        legalModalState.isOpen ||
        isBestDealModalOpen ||
        isPrintModalOpen ||
        isCollabModalOpen
      ) {
        e.preventDefault();
        setIsBookingModalOpen(false);
        setIsGlobalSearchOpen(false);
        setIsPlannerOpen(false);
        setIsAIChatOpen(false);
        setIsLiveNavOpen(false);
        setSelectedDestinationForDetails(null);
        setIsShareModalOpen(false);
        setIsNotificationCenterOpen(false);
        setIsPhotoJournalOpen(false);
        setIsReviewModalOpen(false);
        setIsAuthModalOpen(false);
        setIsOnboardingOpen(false);
        setActivityModalState(prev => ({ ...prev, isOpen: false }));
        setLegalModalState(prev => ({ ...prev, isOpen: false }));
        setIsBestDealModalOpen(false);
        setIsPrintModalOpen(false);
        setIsCollabModalOpen(false);
        return;
      }

      // If user is on an inner tab or trip detail view, back button returns to 'home'
      if (currentTab !== 'home') {
        e.preventDefault();
        setCurrentTab('home');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('tripverse-hardware-back', handleHardwareBack);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('tripverse-hardware-back', handleHardwareBack);
    };
  }, [
    isBookingModalOpen,
    isGlobalSearchOpen,
    isPlannerOpen,
    isAIChatOpen,
    isLiveNavOpen,
    selectedDestinationForDetails,
    isShareModalOpen,
    isNotificationCenterOpen,
    isPhotoJournalOpen,
    isReviewModalOpen,
    isAuthModalOpen,
    isOnboardingOpen,
    activityModalState.isOpen,
    legalModalState.isOpen,
    isBestDealModalOpen,
    isPrintModalOpen,
    isCollabModalOpen,
    currentTab,
    trips,
    currentUser?.uid
  ]);

  // Spotlight Global Search (⌘K / Ctrl+K) Listener
  useEffect(() => {
    const handleOpenSearch = () => setIsGlobalSearchOpen(true);
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };

    window.addEventListener('tripverse-open-search', handleOpenSearch);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('tripverse-open-search', handleOpenSearch);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);


  const activeTrip = trips.find(t => t.id === activeTripIdState) || trips[0];
  const tripsRef = React.useRef(trips);
  const userIdRef = React.useRef(currentUser?.uid);
  useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);
  useEffect(() => {
    userIdRef.current = currentUser?.uid;
  }, [currentUser?.uid]);

  const activeTripId = activeTrip?.id;
  const activeTripOrigin = activeTrip?.origin;
  const activeTripDestination = activeTrip?.destination;
  const activeTripTransportMode = activeTrip?.transportMode;
  const activeTripRouteSource = activeTrip?.routeDetails?.source;
  const activeTripRouteOrigin = activeTrip?.routeDetails?.origin;
  const activeTripRouteDestination = activeTrip?.routeDetails?.destination;
  const activeTripOriginLatitude = activeTrip?.originCoordinates?.lat;
  const activeTripOriginLongitude = activeTrip?.originCoordinates?.lng;
  const activeTripTravelDataStatus = activeTrip?.travelDataStatus;
  const inFlightRouteRequestKeyRef = React.useRef<string | null>(null);
  const retryActiveTripRoute = () => {
    if (!activeTrip) return;
    const retryTrip: Trip = {
      ...activeTrip,
      travelDataStatus: 'pending',
      travelDataError: undefined,
      travelDataWarnings: undefined
    };
    saveOrUpdateTrip(retryTrip, userIdRef.current);
    setTrips(previous => previous.map(trip => trip.id === retryTrip.id ? retryTrip : trip));
  };

  useEffect(() => {
    if (!activeTripId || !activeTripOrigin || !activeTripDestination ||
      (activeTripTransportMode !== 'car' && activeTripTransportMode !== 'bike')) return;
    const trip = tripsRef.current.find(item => item.id === activeTripId);
    if (!trip) return;
    if (activeTripRouteSource === 'geoapify_routing' &&
      activeTripRouteOrigin === activeTripOrigin &&
      activeTripRouteDestination === activeTripDestination) return;
    const requestKey = JSON.stringify([
      currentUser?.uid || 'guest',
      activeTripId,
      activeTripOrigin,
      activeTripDestination,
      activeTripTransportMode,
      activeTripOriginLatitude,
      activeTripOriginLongitude
    ]);
    if (trip.travelDataStatus &&
      !(trip.travelDataStatus === 'live' && activeTripRouteSource !== 'geoapify_routing') &&
      trip.travelDataStatus !== 'pending' &&
      trip.travelDataStatus !== 'loading') return;
    if (trip.travelDataStatus === 'loading' && inFlightRouteRequestKeyRef.current === requestKey) return;
    if (inFlightRouteRequestKeyRef.current === requestKey) return;

    const tripId = activeTripId;
    inFlightRouteRequestKeyRef.current = requestKey;
    let cancelled = false;
    const updateTrip = (updatedTrip: Trip) => {
      if (cancelled) return;
      saveOrUpdateTrip(updatedTrip, userIdRef.current);
      setTrips(previous => previous.map(trip => trip.id === tripId ? updatedTrip : trip));
    };

    const loadingTrip = { ...trip, travelDataStatus: 'loading' as const };
    saveOrUpdateTrip(loadingTrip, userIdRef.current);
    setTrips(previous => previous.map(item => item.id === tripId ? loadingTrip : item));

    const routeOrigin = trip.originCoordinates ||
      (trip.origin.toLowerCase().startsWith('current location') ? null : trip.origin);
    if (!routeOrigin) {
      const estimatedTrip: Trip = {
        ...trip,
        travelDataStatus: 'estimate',
        travelDataError: 'ORIGIN_NOT_SET',
        routeDetails: undefined
      };
      updateTrip(estimatedTrip);
      inFlightRouteRequestKeyRef.current = null;
      return;
    }

    fetchGeoapifyTravelData(routeOrigin, trip.destination)
      .then(data => {
        if (cancelled) return;
        const currentTrip = tripsRef.current.find(item => item.id === tripId) || trip;
        updateTrip(applyGeoapifyTravelData(currentTrip, data));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Live Geoapify travel data unavailable', error);
        const errorCode = error instanceof Error ? error.message : 'GEOAPIFY_TRAVEL_DATA_UNAVAILABLE';
        const currentTrip = tripsRef.current.find(item => item.id === tripId) || trip;
        const estimatedTrip: Trip = {
          ...currentTrip,
          breakStops: currentTrip.breakStops.filter(stop => stop.source === 'user'),
          travelDataStatus: 'estimate',
          travelDataError: errorCode === 'GEOAPIFY_API_KEY_NOT_CONFIGURED'
            ? 'GEOAPIFY_API_KEY_NOT_CONFIGURED'
            : errorCode === 'GEOAPIFY_API_KEY_REJECTED'
              ? 'GEOAPIFY_API_KEY_REJECTED'
              : errorCode === 'GEOAPIFY_LOCATION_NOT_FOUND'
                ? 'GEOAPIFY_LOCATION_NOT_FOUND'
                : 'GEOAPIFY_TRAVEL_DATA_UNAVAILABLE',
          routeDetails: currentTrip.routeDetails
            ? { ...currentTrip.routeDetails, source: 'estimate' }
            : undefined,
          itinerary: currentTrip.itinerary.map(day => ({
            ...day,
            activities: day.activities.map(activity => {
              if (activity.isCustom || !activity.id.startsWith('act-') || activity.source === 'geoapify_places') return activity;
              if (activity.type === 'breakstop') return {
                ...activity,
                title: 'Plan a rest break',
                location: 'Along the route — choose a suitable stop',
                description: 'Live place data is unavailable. Select and verify a stop before travelling.',
                tag: 'Suggested break'
              };
              if (activity.type === 'food') return {
                ...activity,
                title: `Choose a place to eat in ${currentTrip.destination}`,
                location: `${currentTrip.destination} — choose a venue`,
                description: 'Suggested meal time only; no restaurant or menu has been confirmed.',
                tag: 'Dining suggestion'
              };
              if (activity.type === 'hotel') return {
                ...activity,
                title: `Choose accommodation in ${currentTrip.destination}`,
                location: `${currentTrip.destination} — no property selected`,
                description: 'Suggested check-in time only; accommodation is not selected or booked.',
                tag: 'Stay suggestion'
              };
              if (activity.type === 'attraction' || activity.type === 'viewpoint') return {
                ...activity,
                title: `Choose an activity in ${currentTrip.destination}`,
                location: `${currentTrip.destination} — choose a venue`,
                description: 'Activity idea only; no place has been confirmed.',
                tag: 'Activity suggestion'
              };
              return activity;
            })
          }))
        };
        updateTrip(estimatedTrip);
      })
      .finally(() => {
        if (inFlightRouteRequestKeyRef.current === requestKey) {
          inFlightRouteRequestKeyRef.current = null;
        }
      });

    return () => {
      cancelled = true;
      if (inFlightRouteRequestKeyRef.current === requestKey) {
        inFlightRouteRequestKeyRef.current = null;
      }
    };
  }, [
    activeTripId,
    activeTripOrigin,
    activeTripDestination,
    activeTripTransportMode,
    activeTripRouteSource,
    activeTripRouteOrigin,
    activeTripRouteDestination,
    activeTripOriginLatitude,
    activeTripOriginLongitude,
    activeTripTravelDataStatus,
    currentUser?.uid
  ]);

  // Auto-launch Onboarding Tour strictly for first-time ever visitors once
  useEffect(() => {
    if (!hasCompletedOnboarding() && !showSplash) {
      setOnboardingCompleted(true);
      const timer = setTimeout(() => setIsOnboardingOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  // Update notification counts in real-time
  useEffect(() => {
    const updateNotifs = () => {
      const notifs = generateNotifications(trips, activeTrip);
      setUnreadNotificationCount(notifs.filter(n => !n.read).length);
    };
    updateNotifs();
    window.addEventListener('tripverse_notifications_updated', updateNotifs);
    return () => window.removeEventListener('tripverse_notifications_updated', updateNotifs);
  }, [trips, activeTrip]);

  // Active disruption is clean by default; only shown if explicitly triggered by the traveler
  useEffect(() => {
    setActiveDisruption(null);
  }, [activeTrip?.id]);

  // Action Handlers
  const handleOpenMemories = (targetTrip?: Trip) => {
    setPhotoJournalTrip(targetTrip || activeTrip || null);
    setIsPhotoJournalOpen(true);
  };

  const handleOpenReview = (targetTrip?: Trip) => {
    setReviewTrip(targetTrip || activeTrip || null);
    setIsReviewModalOpen(true);
  };

  const handleNavigateFromNotification = (target: string, targetTripId?: string) => {
    if (target === 'plan') {
      setIsPlannerOpen(true);
      return;
    }
    if (target === 'home') {
      setCurrentTab('home');
      return;
    }
    if (target === 'trips') {
      setCurrentTab('trips');
      return;
    }
    if (target === 'explore') {
      setCurrentTab('explore');
      return;
    }

    if (targetTripId && targetTripId !== activeTripIdState) {
      handleSelectTrip(targetTripId);
    } else {
      setCurrentTab('trip-detail');
    }

    if (target === 'itinerary' || target === 'weather' || target === 'packing' || target === 'deals' || target === 'breakstops' || target === 'safety' || target === 'budget') {
      setTripSubTab(target === 'weather' ? 'packing' : target as any);
    } else if (target === 'replanning') {
      setReplanningInitialScreen(1);
      setIsReplanningOpen(true);
    }
  };

  // Handlers
  const handleOpenPlannerWithPrefill = (params?: {
    destination?: string;
    duration?: number;
    travelers?: number;
    budget?: number;
  }) => {
    if (params) {
      setPlannerPrefill(prev => ({
        destination: params.destination ?? prev.destination,
        duration: params.duration ?? prev.duration,
        travelers: params.travelers ?? prev.travelers,
        budget: params.budget ?? prev.budget,
      }));
    }
    setIsPlannerOpen(true);
  };

  // Direct 1-Click Fast Trip Generator (Delivering on 'Plan in 30 Seconds' promise)
  const handleQuickPlanDirect = (params: {
    destination?: string;
    duration?: number;
    travelers?: number;
    budget?: number;
  }) => {
    const quota = getUserSubscriptionQuota(currentUser);
    if (!quota.canCreateTrip) {
      setIsProModalOpen(true);
      return;
    }

    triggerHaptic('medium');
    const finalParams = {
      destination: params.destination?.trim() || 'Udaipur',
      duration: params.duration || 3,
      travelers: params.travelers || 2,
      budget: params.budget || 8000
    };
    setGenerationParams(finalParams);
    setIsGeneratingTrip(true);

    setTimeout(async () => {
      consumeTripCredit(currentUser);
      let originCoords: Coordinates | undefined;
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        originCoords = await new Promise<Coordinates | undefined>(resolve => {
          navigator.geolocation.getCurrentPosition(
            position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
            error => {
              console.warn('Current location unavailable for quick planning', error.message);
              resolve(undefined);
            },
            { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 }
          );
        });
      }
      const input: PlannerInput = {
        destination: finalParams.destination,
        destinationName: finalParams.destination.charAt(0).toUpperCase() + finalParams.destination.slice(1),
        origin: 'Current Location',
        durationDays: finalParams.duration,
        travelersCount: finalParams.travelers,
        travelerType: 'friends',
        budgetMode: 'total',
        budgetAmount: finalParams.budget,
        preferences: ['nature', 'photography', 'food'],
        transportMode: 'car',
        accommodationType: 'hotel',
        foodPreference: 'all',
        priorities: ['balanced', 'scenic', 'food'],
        originCoords
      };

      const newTrip = await generatePersonalizedTrip(input);
      if (!originCoords) {
        newTrip.travelDataStatus = 'estimate';
        newTrip.travelDataError = 'ORIGIN_NOT_SET';
      }
      if (currentUser?.uid) {
        newTrip.userId = currentUser.uid;
        newTrip.isUserCreated = true;
      }
      saveOrUpdateTrip(newTrip, currentUser?.uid);
      setTrips(prev => [newTrip, ...prev]);
      setActiveTripIdState(newTrip.id);
      setActiveTripId(newTrip.id, currentUser?.uid);

      try {
        localStorage.setItem(`tripverse_plan_generated_${currentUser?.uid || 'guest'}`, 'true');
      } catch { }

      setIsGeneratingTrip(false);
      setCurrentTab('trip-detail');
      setTripSubTab('itinerary');
      setIsBestDealModalOpen(true);
      triggerHaptic('success');

      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2D5A3D', '#386B49', '#38BDF8', '#F59E0B']
        });
      } catch { }
    }, 1800);
  };

  const handleTripGenerated = async (input: PlannerInput) => {
    const quota = getUserSubscriptionQuota(currentUser);
    if (!quota.canCreateTrip) {
      setIsPlannerOpen(false);
      setIsProModalOpen(true);
      return;
    }

    consumeTripCredit(currentUser);
    triggerHaptic('success');
    setIsGeneratingTrip(true);
    try {
      const newTrip = await generatePersonalizedTrip(input);
      if (currentUser?.uid) {
        newTrip.userId = currentUser.uid;
        newTrip.isUserCreated = true;
      }
      saveOrUpdateTrip(newTrip, currentUser?.uid);
      setTrips(prev => [newTrip, ...prev]);
      setActiveTripIdState(newTrip.id);
      setIsPlannerOpen(false);
      setCurrentTab('trip-detail');
      setTripSubTab('itinerary');
      setIsBestDealModalOpen(true);
    } finally {
      setIsGeneratingTrip(false);
    }
  };

  const handleSelectTrip = (id: string) => {
    triggerHaptic('light');
    setActiveTripId(id, currentUser?.uid);
    setActiveTripIdState(id);
    setCurrentTab('trip-detail');
  };

  const handleDeleteTrip = (id: string) => {
    triggerHaptic('warning');
    deleteTrip(id, currentUser?.uid);
    const updated = trips.filter(t => t.id !== id);
    setTrips(updated);
    if (activeTripIdState === id) {
      const nextId = updated.length > 0 ? updated[0].id : '';
      setActiveTripIdState(nextId);
      setActiveTripId(nextId, currentUser?.uid);
    }
  };

  const handleToggleSaved = (id: string) => {
    triggerHaptic('medium');
    const updated = toggleSavedItemId(id, currentUser?.uid);
    setSavedItemIds(updated);
  };

  const handleUpdateTrip = (updated: Trip) => {
    if (currentUser?.uid && !updated.userId) {
      updated.userId = currentUser.uid;
    }
    saveOrUpdateTrip(updated, currentUser?.uid);
    setTrips(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const handleAIAppAction = (action: AIAppAction) => {
    switch (action.type) {
      case 'SWITCH_TAB':
        if (action.payload?.tab && ['home', 'trips', 'explore', 'profile'].includes(action.payload.tab)) {
          setCurrentTab(action.payload.tab);
        }
        if (action.payload?.subTab) {
          setTripSubTab(action.payload.subTab);
        }
        setIsAIChatOpen(false);
        break;
      case 'START_NAVIGATION':
        setIsAIChatOpen(false);
        setIsLiveNavOpen(true);
        break;
      case 'OPEN_MODAL':
        setIsAIChatOpen(false);
        switch (action.payload?.modal) {
          case 'share':
            setIsShareModalOpen(true);
            break;
          case 'print':
            setIsPrintModalOpen(true);
            break;
          case 'deals':
          case 'booking':
            setIsBestDealModalOpen(true);
            break;
          case 'replanning':
            setReplanningInitialScreen(action.payload.screen || 2);
            setIsReplanningOpen(true);
            break;
          case 'photos':
            if (activeTrip) setPhotoJournalTrip(activeTrip);
            setIsPhotoJournalOpen(true);
            break;
          case 'review':
            if (activeTrip) setReviewTrip(activeTrip);
            setIsReviewModalOpen(true);
            break;
          case 'notifications':
            setIsNotificationCenterOpen(true);
            break;
          case 'auth':
            setIsAuthModalOpen(true);
            break;
          case 'planner':
            if (action.payload?.prefill) {
              setPlannerPrefill(prev => ({ ...prev, ...action.payload.prefill }));
            }
            setIsPlannerOpen(true);
            break;
        }
        break;
      case 'GENERATE_NEW_TRIP':
        if (action.payload?.trip) {
          handleTripGenerated(action.payload.trip);
        }
        break;
      case 'UPDATE_TRIP':
        if (action.payload?.updatedTrip) {
          handleUpdateTrip(action.payload.updatedTrip);
        }
        break;
      case 'SWITCH_ACTIVE_TRIP':
        if (action.payload?.tripId) {
          const found = trips.find(t => t.id === action.payload.tripId);
          if (found) {
            setActiveTripId(found.id);
            setActiveTripIdState(found.id);
            setCurrentTab('trips');
          }
        }
        break;
      case 'DELETE_TRIP':
        if (action.payload?.tripId) {
          handleDeleteTrip(action.payload.tripId);
          setCurrentTab('trips');
        }
        break;
      case 'ADD_EXPENSE':
        if (action.payload?.expense && activeTrip) {
          const currentExp = loadTripExpenses(activeTrip.id);
          saveTripExpenses(activeTrip.id, [action.payload.expense, ...currentExp]);
        }
        break;
      case 'ADD_PACKING_ITEM':
        if (action.payload?.items && activeTrip) {
          const currentPack = loadTripPacking(activeTrip.id) || [];
          saveTripPacking(activeTrip.id, [...currentPack, ...action.payload.items]);
        }
        break;
    }
  };

  const handleToggleBreakStop = (breakStop: BreakStop) => {
    if (!activeTrip) return;
    const exists = activeTrip.breakStops.some(bs => bs.id === breakStop.id);
    let updatedBreakStops: BreakStop[];
    let deltaCost = 0;

    if (exists) {
      updatedBreakStops = activeTrip.breakStops.filter(bs => bs.id !== breakStop.id);
      deltaCost = -250; // cost savings
    } else {
      updatedBreakStops = [...activeTrip.breakStops, { ...breakStop, addedToTrip: true }];
      deltaCost = 250;
    }

    const newEstimatedTotal = Math.max(1500, activeTrip.estimatedTotal + deltaCost);
    const updated: Trip = {
      ...activeTrip,
      breakStops: updatedBreakStops,
      estimatedTotal: newEstimatedTotal,
      budgetBreakdown: {
        ...activeTrip.budgetBreakdown,
        food: Math.max(500, activeTrip.budgetBreakdown.food + deltaCost)
      }
    };

    handleUpdateTrip(updated);
  };

  const handleApplyBudgetSavings = (savings: number, category: keyof BudgetBreakdown, reason: string) => {
    if (!activeTrip) return;
    const updated: Trip = {
      ...activeTrip,
      estimatedTotal: Math.max(1500, activeTrip.estimatedTotal - savings),
      budgetBreakdown: {
        ...activeTrip.budgetBreakdown,
        [category]: Math.max(400, activeTrip.budgetBreakdown[category] - savings)
      },
      aiRationale: `Budget optimized: ${reason} (Saved ₹${savings.toLocaleString('en-IN')}).`
    };
    handleUpdateTrip(updated);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#2D5A3D', '#386B49', '#F59E0B']
      });
    } catch (e) {
      // safe fallback
    }
  };

  const handleExportTrip = () => {
    if (!activeTrip) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeTrip, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `TripVerse_${activeTrip.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleAddOrUpdateActivity = (dayNumber: number, activityData: Partial<ItineraryActivity>) => {
    if (!activeTrip) return;
    const updatedDays = activeTrip.itinerary.map(day => {
      if (day.dayNumber === dayNumber) {
        const existingIndex = day.activities.findIndex(a => a.id === activityData.id);
        let updatedActivities: ItineraryActivity[];
        if (existingIndex >= 0) {
          updatedActivities = [...day.activities];
          updatedActivities[existingIndex] = { ...updatedActivities[existingIndex], ...activityData } as ItineraryActivity;
        } else {
          const newAct: ItineraryActivity = {
            id: activityData.id || `act-custom-${Date.now()}`,
            dayNumber,
            time: activityData.time || '11:00 AM',
            title: activityData.title || 'Custom Activity',
            type: activityData.type || 'attraction',
            location: activityData.location || activeTrip.destination,
            estimatedCost: activityData.estimatedCost || 0,
            travelTimeMin: activityData.travelTimeMin || 15,
            distanceKm: activityData.distanceKm || 2,
            description: activityData.description || '',
            coordinates: activityData.coordinates || { lat: 24.5854, lng: 73.7125 },
            tag: activityData.tag || 'Custom',
            completed: false,
            isCustom: true
          };
          updatedActivities = [...day.activities, newAct];
        }
        const dayEstimatedCost = updatedActivities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
        return {
          ...day,
          activities: updatedActivities,
          dayEstimatedCost
        };
      }
      return day;
    });

    const newActivitiesTotal = updatedDays.reduce((sum, d) => sum + d.dayEstimatedCost, 0);
    const updatedTrip: Trip = {
      ...activeTrip,
      itinerary: updatedDays,
      estimatedTotal: Math.max(1500, newActivitiesTotal + activeTrip.budgetBreakdown.transportation + activeTrip.budgetBreakdown.accommodation),
      budgetBreakdown: {
        ...activeTrip.budgetBreakdown,
        activities: newActivitiesTotal
      }
    };
    handleUpdateTrip(updatedTrip);
  };

  const handleDeleteActivity = (dayNumber: number, activityId: string) => {
    if (!activeTrip) return;
    const updatedDays = activeTrip.itinerary.map(day => {
      if (day.dayNumber === dayNumber) {
        const updatedActivities = day.activities.filter(a => a.id !== activityId);
        const dayEstimatedCost = updatedActivities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
        return { ...day, activities: updatedActivities, dayEstimatedCost };
      }
      return day;
    });

    const newActivitiesTotal = updatedDays.reduce((sum, d) => sum + d.dayEstimatedCost, 0);
    handleUpdateTrip({
      ...activeTrip,
      itinerary: updatedDays,
      estimatedTotal: Math.max(1500, newActivitiesTotal + activeTrip.budgetBreakdown.transportation + activeTrip.budgetBreakdown.accommodation),
      budgetBreakdown: {
        ...activeTrip.budgetBreakdown,
        activities: newActivitiesTotal
      }
    });
  };

  const handleMoveActivity = (dayNumber: number, activityId: string, direction: 'up' | 'down') => {
    if (!activeTrip) return;
    const updatedDays = activeTrip.itinerary.map(day => {
      if (day.dayNumber === dayNumber) {
        const idx = day.activities.findIndex(a => a.id === activityId);
        if (idx < 0) return day;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= day.activities.length) return day;
        const updated = [...day.activities];
        const temp = updated[idx];
        updated[idx] = updated[targetIdx];
        updated[targetIdx] = temp;
        return { ...day, activities: updated };
      }
      return day;
    });
    handleUpdateTrip({ ...activeTrip, itinerary: updatedDays });
  };

  const handleToggleActivityComplete = (dayNumber: number, activityId: string) => {
    if (!activeTrip) return;
    const updatedDays = activeTrip.itinerary.map(day => {
      if (day.dayNumber === dayNumber) {
        return {
          ...day,
          activities: day.activities.map(a => a.id === activityId ? { ...a, completed: !a.completed } : a)
        };
      }
      return day;
    });
    handleUpdateTrip({ ...activeTrip, itinerary: updatedDays });
  };

  const isAnyModalOpen = Boolean(
    isBookingModalOpen ||
    isGeneratingTrip ||
    isPlannerOpen ||
    isGlobalSearchOpen ||
    isAIChatOpen ||
    isShareModalOpen ||
    isAuthModalOpen ||
    isLiveNavOpen ||
    isBestDealModalOpen ||
    isPrintModalOpen ||
    selectedDestinationForDetails !== null ||
    activityModalState.isOpen ||
    isReplanningOpen ||
    isPhotoJournalOpen ||
    isNotificationCenterOpen ||
    isOnboardingOpen ||
    legalModalState.isOpen ||
    isReviewModalOpen ||
    showSplash
  );

  const handlePullRefresh = async () => {
    try {
      const activeUser = getCurrentUser();
      if (activeUser) {
        // Sync latest cloud data from Supabase for authenticated user
        const [cloudTrips, cloudProfile, cloudStates, cloudSavedItems, cloudActiveTrip] = await Promise.all([
          loadUserTripsFromSupabase(activeUser.uid).catch(() => null),
          loadUserProfileFromSupabase(activeUser.uid).catch(() => null),
          loadUserPassportFromSupabase(activeUser.uid).catch(() => null),
          loadUserSavedItemsFromSupabase(activeUser.uid).catch(() => null),
          loadUserActiveTripFromSupabase(activeUser.uid).catch(() => null)
        ]);

        if (cloudTrips && cloudTrips.length > 0) {
          setTrips(cloudTrips);
          saveTrips(cloudTrips, activeUser.uid);
        } else {
          setTrips(loadTrips(activeUser.uid));
        }

        if (cloudProfile) {
          const merged = { ...toUserProfile(activeUser), ...cloudProfile };
          setUserProfile(merged);
          saveUserProfile(merged, activeUser.uid);
          if (merged.preferredCurrency) {
            setActiveCurrency(merged.preferredCurrency);
          }
        } else {
          setUserProfile(toUserProfile(activeUser));
        }

        if (cloudStates && cloudStates.length > 0) {
          saveUserVisitedStates(cloudStates, activeUser.uid);
          window.dispatchEvent(new CustomEvent('tripverse_visited_states_change', { detail: cloudStates }));
        }

        if (cloudSavedItems && cloudSavedItems.length > 0) {
          setSavedItemIds(cloudSavedItems);
          saveSavedItemIds(cloudSavedItems, activeUser.uid);
        }

        if (cloudActiveTrip) {
          setActiveTripIdState(cloudActiveTrip);
          setActiveTripId(cloudActiveTrip, activeUser.uid);
        }
      } else {
        // Guest mode reload
        const freshGuestProfile = loadUserProfile(null);
        setUserProfile(freshGuestProfile);
        const guestTrips = loadTrips(null);
        setTrips(guestTrips);
        const guestSaved = loadSavedItemIds(null);
        setSavedItemIds(guestSaved);
        const guestActiveId = getActiveTripId(null);
        setActiveTripIdState(guestActiveId);
        const guestStates = loadUserVisitedStates(null);
        window.dispatchEvent(new CustomEvent('tripverse_visited_states_change', { detail: guestStates }));
      }

      // Notify child components to refresh their widgets / data
      window.dispatchEvent(new CustomEvent('tripverse_refreshed', { detail: { timestamp: Date.now() } }));
    } catch (e) {
      console.warn('[PullToRefresh] Error during pull-to-refresh:', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#070C16] text-slate-900 dark:text-slate-100 selection:bg-[#2D5A3D] selection:text-white antialiased">

      {/* 0. Native iOS & Android App Opening Animation Splash Screen */}
      {showSplash && (
        <AppSplashScreen
          initialPlatform={splashPlatform}
          onFinish={handleFinishSplash}
        />
      )}

      {/* 0b. Stepped AI Trip Generation Loading Skeleton Screen */}
      {isGeneratingTrip && (
        <AIGenerationSkeleton
          destination={generationParams.destination}
          duration={generationParams.duration}
          travelers={generationParams.travelers}
          budget={generationParams.budget}
        />
      )}

      {/* Highway Offline Mode Detection Banner */}
      <OfflineStatusBar />

      {/* Desktop & Mobile Header */}
      <Navbar
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab)}
        onOpenPlanner={() => handleOpenPlannerWithPrefill()}
        onOpenSearch={() => setIsGlobalSearchOpen(true)}
        onOpenChat={() => setIsAIChatOpen(true)}
        userProfile={userProfile}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isAuthenticated={currentUser !== null}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* Pull down to refresh gesture wrapper */}
      <PullToRefresh onRefresh={handlePullRefresh} disabled={isAnyModalOpen}>

        {/* Main Content View Switcher */}
        <main className="flex-1 pb-28 lg:pb-12">

          {/* VIEW 1: HOME */}
          {currentTab === 'home' && (
            <div key="home" className="animate-fade-in">
              <HeroSection
                activeTrip={activeTrip}
                onQuickPlan={(params) => {
                  handleQuickPlanDirect(params);
                }}
                onExplore={() => setCurrentTab('explore')}
                onOpenPlanner={() => handleOpenPlannerWithPrefill()}
                onSelectDestination={(dest) => setSelectedDestinationForDetails(dest)}
              />

              {/* Official Public Release 2.0 Spotlight & Viral Share */}
              <div className="hidden lg:block">
                <PublicLaunchSpotlight
                  onOpenPlanner={() => handleOpenPlannerWithPrefill()}
                  onExplore={() => setCurrentTab('explore')}
                />
              </div>

              {/* Verified Highway Corridor & Pitstop Engine Showcase (Differentiator) */}
              <HighwayBreakstopsShowcase
                onPlanCorridor={(destName) => {
                  handleQuickPlanDirect({
                    destination: destName,
                    duration: 3,
                    travelers: 2,
                    budget: 9500
                  });
                }}
              />

              {/* Brand 5 Feature Pillars */}
              <FeaturePillars />

              {/* Popular Destinations Showcase */}
              <PopularDestinations
                onSelectDestination={(dest) => {
                  setSelectedDestinationForDetails(dest);
                }}
                onPlanTripForDestination={(destName) => {
                  handleQuickPlanDirect({
                    destination: destName,
                    duration: 3,
                    travelers: 2,
                    budget: 8500
                  });
                }}
                savedItemIds={savedItemIds}
                onToggleSaved={handleToggleSaved}
                onViewAllExplore={() => setCurrentTab('explore')}
              />
            </div>
          )}

          {/* VIEW 2: TRIP DETAILS & COMPLETE ITINERARY */}
          {currentTab === 'trip-detail' && activeTrip && (
            <div key="trip-detail" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">

              {/* Desktop Back & AI Assistant Top Bar */}
              <div className="hidden lg:flex items-center justify-between">
                <button
                  onClick={() => setCurrentTab('trips')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <span>← Back to My Trips</span>
                </button>

                <button
                  onClick={() => setIsAIChatOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A3D] bg-[#EAF0E9] px-3 py-1.5 rounded-full border border-[#8EA78D]/40 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Travel Assistant Available</span>
                </button>
              </div>

              {/* Screen 2: Dedicated Mobile Top Bar (Back, "Your Itinerary", Bookmark, Menu) */}
              <div className="flex lg:hidden items-center justify-between pt-1 pb-1">
                <button
                  type="button"
                  onClick={() => setCurrentTab('trips')}
                  className="w-10 h-10 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] flex items-center justify-center shadow-2xs hover:bg-[#F8FAF7] active:scale-95 transition-all cursor-pointer"
                  title="Back"
                  aria-label="Back to trips"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <h1 className="text-base font-display font-bold text-[#152A1C] text-center">
                  Your Itinerary
                </h1>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleSaved(activeTrip.id)}
                    className="w-10 h-10 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] flex items-center justify-center shadow-2xs hover:bg-[#F8FAF7] active:scale-95 transition-all cursor-pointer"
                    title="Bookmark Itinerary"
                    aria-label="Bookmark Itinerary"
                  >
                    <Bookmark className={`w-4 h-4 ${savedItemIds.includes(activeTrip.id) ? 'fill-[#2D5A3D]' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="w-10 h-10 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] flex items-center justify-center shadow-2xs hover:bg-[#F8FAF7] active:scale-95 transition-all cursor-pointer"
                    title="Trip Options"
                    aria-label="Trip Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Disruption Alert Banner (Infographic Screen 1 Alert Flow) */}
              {activeDisruption && !isDisruptionDismissed && (
                <DisruptionBanner
                  disruption={activeDisruption}
                  onOpenReplanning={() => {
                    setReplanningInitialScreen(1);
                    setIsReplanningOpen(true);
                  }}
                  onDismiss={() => setIsDisruptionDismissed(true)}
                />
              )}

              {/* Trip Header & Budget Overview */}
              <TripHeader
                trip={activeTrip}
                onOpenChat={() => setIsAIChatOpen(true)}
                onOpenShare={() => setIsShareModalOpen(true)}
                onOptimizeBudget={() => setTripSubTab('budget')}
                onExportTrip={handleExportTrip}
                onOpenLiveNav={() => setIsLiveNavOpen(true)}
                onOpenDeals={() => setIsBestDealModalOpen(true)}
                onOpenPrintDossier={() => setIsPrintModalOpen(true)}
                onOpenBooking={() => setIsBookingModalOpen(true)}
                onOpenReplanning={() => {
                  setReplanningInitialScreen(2);
                  setIsReplanningOpen(true);
                }}
                onOpenMemories={() => handleOpenMemories(activeTrip)}
                onOpenReview={() => handleOpenReview(activeTrip)}
                onOpenCollaboration={() => setIsCollabModalOpen(true)}
              />

              {/* Sub-Navigation: Screen 2 Mobile 4-Pill Bar vs Desktop Grouped Navigation */}
              {(() => {
                const TRIP_GROUPS = [
                  {
                    id: 'journey',
                    label: 'Journey & Passes',
                    icon: Compass,
                    subTabs: [
                      { id: 'itinerary', label: 'Day Itinerary', icon: Calendar },
                      { id: 'hub', label: 'Passes & Hub', icon: QrCode },
                      { id: 'route', label: 'Route Map', icon: MapPin },
                      { id: 'breakstops', label: `Pitstops (${activeTrip.breakStops.length})`, icon: Coffee }
                    ]
                  },
                  {
                    id: 'budget_deals',
                    label: 'Budget & Deals',
                    icon: Wallet,
                    subTabs: [
                      { id: 'expenses', label: 'TripSplit & Fuel', icon: Receipt },
                      { id: 'deals', label: 'Transport Deals', icon: Tag },
                      { id: 'budget', label: 'Budget Optimizer', icon: Sparkles }
                    ]
                  },
                  {
                    id: 'essentials',
                    label: 'Essentials',
                    icon: ShieldCheck,
                    subTabs: [
                      { id: 'packing', label: 'Packing & Weather', icon: CloudSun },
                      { id: 'safety', label: 'Safety & SOS', icon: ShieldCheck }
                    ]
                  },
                  {
                    id: 'discover',
                    label: 'Discover',
                    icon: UtensilsCrossed,
                    subTabs: [
                      { id: 'gems', label: 'Food Trails & Gems', icon: UtensilsCrossed }
                    ]
                  }
                ];

                const currentGroup = TRIP_GROUPS.find(g => g.subTabs.some(s => s.id === tripSubTab)) || TRIP_GROUPS[0];

                return (
                  <div className="space-y-3">
                    {/* Screen 2: Mobile 4-pill Sub-Navigation Bar */}
                    <div className="lg:hidden flex items-center justify-between gap-1.5 p-1 rounded-full bg-[#E8EFE7] border border-[#DCE7DB] shadow-2xs">
                      {[
                        { id: 'itinerary', label: 'Itinerary' },
                        { id: 'deals', label: 'Transport' },
                        { id: 'hub', label: 'Stay' },
                        { id: 'gems', label: 'Recommendations' }
                      ].map(tab => {
                        const isActive = tripSubTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setTripSubTab(tab.id as any);
                            }}
                            className={`flex-1 py-2 px-1 rounded-full text-xs font-bold transition-all text-center cursor-pointer ${
                              isActive
                                ? 'bg-[#2D5A3D] text-white shadow-xs'
                                : 'text-[#57685D] hover:text-[#152A1C]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Desktop Sub-Navigation: 4 Curated Category Groups */}
                    <div className="hidden lg:block space-y-3">
                      <div className="flex items-center gap-2 border-b border-[#E2EBE1] pb-3 overflow-x-auto scrollbar-none">
                        {TRIP_GROUPS.map(group => {
                          const isGroupActive = currentGroup.id === group.id;
                          const GroupIcon = group.icon;

                          return (
                            <button
                              key={group.id}
                              onClick={() => {
                                triggerHaptic('light');
                                setTripSubTab(group.subTabs[0].id as any);
                              }}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${isGroupActive
                                  ? 'bg-[#2D5A3D] text-white shadow-xs scale-[1.02]'
                                  : 'bg-white text-[#5A7362] border border-[#E2EBE1] hover:border-[#8EA78D] hover:bg-[#F8FAF7]'
                                }`}
                            >
                              <GroupIcon className={`w-4 h-4 ${isGroupActive ? 'text-white' : 'text-[#8EA78D]'}`} />
                              <span>{group.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Secondary Contextual Sub-Pills */}
                      {currentGroup.subTabs.length > 1 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none animate-fade-in">
                          {currentGroup.subTabs.map(sub => {
                            const isSubActive = tripSubTab === sub.id;
                            const SubIcon = sub.icon;

                            return (
                              <button
                                key={sub.id}
                                onClick={() => {
                                  triggerHaptic('light');
                                  setTripSubTab(sub.id as any);
                                }}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSubActive
                                    ? 'bg-[#2D5A3D] text-white shadow-xs'
                                    : 'bg-[#E8EFE7] hover:bg-[#dce7db] text-[#2D5A3D]'
                                  }`}
                              >
                                <SubIcon className="w-3.5 h-3.5" />
                                <span>{sub.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Sub-Tab 1: Day-Wise Itinerary Timeline with Custom Actions */}
              {tripSubTab === 'itinerary' && (
                <DayTimeline
                  itinerary={activeTrip.itinerary}
                  bestDeal={activeTrip.bestTransportDeal}
                  onOpenDeals={() => setIsBestDealModalOpen(true)}
                  onAddActivity={(dayNumber) => {
                    setActivityModalState({ isOpen: true, dayNumber, activity: null });
                  }}
                  onEditActivity={(dayNumber, activity) => {
                    setActivityModalState({ isOpen: true, dayNumber, activity });
                  }}
                  onDeleteActivity={handleDeleteActivity}
                  onMoveActivity={handleMoveActivity}
                  onToggleComplete={handleToggleActivityComplete}
                  onOptimizeWithAI={() => setTripSubTab('hub')}
                />
              )}

              {/* Sub-Tab: Digital Passes & Hub (Reference Screen 3) */}
              {tripSubTab === 'hub' && (
                <TripPassesHubView
                  trip={activeTrip}
                  onBack={() => setTripSubTab('itinerary')}
                  onOpenBookingModal={() => setIsBookingModalOpen(true)}
                  onOpenPacking={() => setTripSubTab('packing')}
                  onExportTrip={handleExportTrip}
                  onOpenShare={() => setIsShareModalOpen(true)}
                />
              )}

              {/* Sub-Tab: Packing Checklist & Live Weather Advisory */}
              {tripSubTab === 'packing' && (
                <PackingWeatherView trip={activeTrip} />
              )}

              {/* Sub-Tab: TripSplit Expenses & Highway Fuel/Tolls */}
              {tripSubTab === 'expenses' && (
                <TripSplitExpenses trip={activeTrip} />
              )}

              {/* Sub-Tab: Curated Local Food Trails & Hidden Gems */}
              {tripSubTab === 'gems' && (
                <LocalGemsView
                  trip={activeTrip}
                  onAddActivity={(dayNumber, act) => {
                    handleAddOrUpdateActivity(dayNumber, act);
                  }}
                />
              )}

              {/* Sub-Tab: Transit Deals & Fares */}
              {tripSubTab === 'deals' && (
                <TransportDealsView
                  trip={activeTrip}
                  onApplySavings={handleApplyBudgetSavings}
                  onOpenPrint={() => setIsPrintModalOpen(true)}
                  onOpenBooking={() => setIsBookingModalOpen(true)}
                />
              )}

              {/* Sub-Tab 2: Smart Route Map */}
              {tripSubTab === 'route' && (
                <Suspense fallback={
                  <div className="h-96 rounded-3xl bg-white border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-3 animate-pulse">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center">
                      <MapPin className="w-6 h-6 animate-bounce" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Loading route map…</p>
                    <p className="text-xs text-slate-400">Preparing route geometry and nearby place listings</p>
                  </div>
                }>
                  <SmartRouteMap
                    trip={activeTrip}
                    onOpenLiveNav={() => setIsLiveNavOpen(true)}
                  />
                </Suspense>
              )}

              {/* Sub-Tab 3: Break Stop Catalog */}
              {tripSubTab === 'breakstops' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">Route-based listings</span>
                        <h2 className="text-xl font-bold text-[#0B2545]">Highway Break Stops & Waypoints</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Geoapify place listings based on OpenStreetMap data near the driving route. Facilities, opening hours, and current availability are not confirmed.
                        </p>
                      </div>

                      <span className="text-xs font-bold text-[#2D5A3D] bg-[#EAF0E9] px-3 py-1.5 rounded-full border border-[#8EA78D]/40 self-start sm:self-auto">
                        {activeTrip.breakStops.length} mapped listings
                      </span>
                    </div>

                    {activeTrip.travelDataStatus === 'loading' && (
                      <p className="mb-4 text-sm text-slate-600" role="status">Loading a driving route and nearby OpenStreetMap listings via Geoapify…</p>
                    )}
                    {activeTrip.travelDataStatus === 'estimate' && (
                      <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3" role="status">
                        Live route and place data is unavailable. The route and schedule are estimates; no pitstops or facilities are verified.
                        {activeTrip.travelDataError === 'ORIGIN_NOT_SET' && ' Allow location access or enter a starting city in the full trip planner to request a live route.'}
                        {activeTrip.travelDataError === 'GEOAPIFY_API_KEY_NOT_CONFIGURED' && ' The server Geoapify API key is not configured. Set GEOAPIFY_API_KEY in Vercel Production.'}
                        {activeTrip.travelDataError === 'GEOAPIFY_API_KEY_REJECTED' && ' Geoapify rejected the server key. Check the key and plan limits in Geoapify.'}
                        {activeTrip.travelDataError === 'GEOAPIFY_LOCATION_NOT_FOUND' && ' Geoapify could not resolve the origin or destination. Try a more specific location.'}
                        {' '}<button
                          type="button"
                          onClick={retryActiveTripRoute}
                          className="ml-1 font-bold underline decoration-amber-700 underline-offset-2 hover:text-amber-950"
                        >
                          Retry live route
                        </button>
                      </p>
                    )}
                    {activeTrip.travelDataWarnings && activeTrip.travelDataWarnings.length > 0 && (
                      <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3" role="status">
                        Some map-provider category searches were unavailable: {activeTrip.travelDataWarnings.map(section =>
                          section === 'amenities' ? 'food/washroom/parking/rest area'
                            : section === 'ev_charging' ? 'EV charging'
                              : section === 'medical' ? 'medical facilities' : 'fuel'
                        ).join(', ')}. Other route results are still shown; check a maps provider for missing listings.
                      </p>
                    )}

                    {([
                      { id: 'amenities', title: 'Food, Washroom, Parking & Rest Area', detail: 'These amenities may be available together at a stop; confirm each one with the provider.' },
                      { id: 'fuel', title: 'Fuel Stations', detail: 'Fuel locations are listed separately from general rest stops.' },
                      { id: 'ev_charging', title: 'EV Charging', detail: 'Charging locations are listed separately. Confirm connector type and live availability.' },
                      { id: 'medical', title: 'Medical Facilities', detail: 'Clinics, hospitals, and pharmacies are listed separately. This is not emergency dispatch.' }
                    ] as const).map(section => {
                      const sectionStops = activeTrip.breakStops.filter(stop =>
                        getBreakStopSection(stop) === section.id
                      );
                      return (
                        <details key={section.id} className="group mt-3 first:mt-0 rounded-2xl border border-slate-200 bg-white open:border-emerald-200 open:bg-emerald-50/20">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-4 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 [&::-webkit-details-marker]:hidden">
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-[#0B2545]">{section.title}</span>
                              <span className="mt-1 block text-xs text-slate-500">{section.detail}</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 group-open:bg-emerald-100 group-open:text-emerald-800">
                                {sectionStops.length} {sectionStops.length === 1 ? 'listing' : 'listings'}
                              </span>
                              <ChevronDown aria-hidden="true" className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
                            </span>
                          </summary>
                          <div className="border-t border-slate-200 px-4 py-4">
                            {sectionStops.length > 0 ? (
                              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                {sectionStops.map(bs => (
                                  <BreakStopCard
                                    key={bs.id}
                                    breakStop={bs}
                                    isAdded={true}
                                    onToggleAdd={handleToggleBreakStop}
                                  />
                                ))}
                              </div>
                            ) : (
                              activeTrip.travelDataStatus !== 'loading' && (
                                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                  {activeTrip.travelDataStatus === 'estimate'
                                    ? 'Listings were not searched because live route data is unavailable.'
                                    : 'No map listings were returned for this section on the searched route. Check a maps provider before travelling.'}
                                </p>
                              )
                            )}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Budget Optimizer */}
              {tripSubTab === 'budget' && (
                <BudgetOptimizer
                  trip={activeTrip}
                  onApplySavings={handleApplyBudgetSavings}
                />
              )}

              {/* Sub-Tab 5: Safety & Emergency */}
              {tripSubTab === 'safety' && (
                <SafetyEmergency />
              )}

            </div>
          )}

          {/* VIEW 2 EMPTY STATE: When trip-detail is opened but user has no active trip */}
          {currentTab === 'trip-detail' && !activeTrip && (
            <div key="trip-detail-empty" className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5 text-slate-400 border border-slate-200 shadow-sm">
                <Compass className="w-8 h-8 text-[#2D5A3D]" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">No Trip Selected</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                No itinerary is currently active. Create your first journey with our AI Trip Planner or select an existing trip from your trips library.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenPlannerWithPrefill()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold bg-[#2D5A3D] text-white hover:bg-[#244931] transition-colors flex items-center justify-center gap-2 text-sm shadow-md shadow-[#2D5A3D]/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Create New Trip
                </button>
                <button
                  onClick={() => setCurrentTab('trips')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm"
                >
                  View My Trips
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: MY TRIPS & DIGITAL PASSES */}
          {currentTab === 'trips' && (
            <div key="trips" className="animate-fade-in space-y-5">
              {activeTrip && (
                <div className="flex items-center justify-center pt-2">
                  <div className="inline-flex p-1 rounded-full bg-white border border-[#E2EBE1] shadow-xs">
                    <button
                      onClick={() => setTripsViewMode('passes')}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        tripsViewMode === 'passes'
                          ? 'bg-[#2D5A3D] text-white shadow-xs'
                          : 'text-[#5A7362] hover:text-[#152A1C] hover:bg-[#F8FAF7]'
                      }`}
                    >
                      Digital Pass & Hub
                    </button>
                    <button
                      onClick={() => setTripsViewMode('portfolio')}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        tripsViewMode === 'portfolio'
                          ? 'bg-[#2D5A3D] text-white shadow-xs'
                          : 'text-[#5A7362] hover:text-[#152A1C] hover:bg-[#F8FAF7]'
                      }`}
                    >
                      All Saved Trips ({trips.length})
                    </button>
                  </div>
                </div>
              )}

              {activeTrip && tripsViewMode === 'passes' ? (
                <TripPassesHubView
                  trip={activeTrip}
                  onBack={() => setTripsViewMode('portfolio')}
                  onOpenBookingModal={() => setIsBookingModalOpen(true)}
                  onOpenPacking={() => {
                    setCurrentTab('trip-detail');
                    setTripSubTab('packing');
                  }}
                  onExportTrip={handleExportTrip}
                  onOpenShare={() => setIsShareModalOpen(true)}
                />
              ) : (
                <MyTripsView
                  trips={trips}
                  activeTripId={activeTripIdState}
                  onSelectTrip={(id) => {
                    handleSelectTrip(id);
                    setTripsViewMode('passes');
                  }}
                  onOpenPlanner={() => handleOpenPlannerWithPrefill()}
                  onDeleteTrip={handleDeleteTrip}
                  onShareTrip={(t) => {
                    setActiveTripIdState(t.id);
                    setIsShareModalOpen(true);
                  }}
                  onOpenMemories={(t) => handleOpenMemories(t)}
                  onOpenReview={(t) => handleOpenReview(t)}
                />
              )}
            </div>
          )}

          {/* VIEW 4: EXPLORE */}
          {currentTab === 'explore' && (
            <div key="explore" className="animate-fade-in">
              <ExploreView
                userProfile={userProfile}
                onPlanTripForDestination={(destName) => {
                  handleOpenPlannerWithPrefill({ destination: destName });
                }}
                savedItemIds={savedItemIds}
                onToggleSaved={handleToggleSaved}
              />
            </div>
          )}

          {/* VIEW 5: SAVED */}
          {currentTab === 'saved' && (
            <div key="saved" className="animate-fade-in">
              <SavedItemsView
                savedItemIds={savedItemIds}
                trips={trips}
                onToggleSaved={handleToggleSaved}
                onSelectTrip={handleSelectTrip}
                onPlanTripForDestination={(destName) => {
                  handleOpenPlannerWithPrefill({ destination: destName });
                }}
                onSelectDestination={(dest) => {
                  setSelectedDestinationForDetails(dest);
                }}
              />
            </div>
          )}

          {/* VIEW 6: PROFILE */}
          {currentTab === 'profile' && (
            <div key="profile" className="animate-fade-in">
              <ProfileView
                userProfile={userProfile}
                trips={trips}
                currentUser={currentUser}
                onUpdateProfile={(updated) => {
                  setUserProfile(updated);
                  saveUserProfile(updated, currentUser?.uid);
                }}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
                onReplayTour={() => setIsOnboardingOpen(true)}
                onOpenNotifications={() => setIsNotificationCenterOpen(true)}
                unreadNotificationCount={unreadNotificationCount}
                onSignOut={() => {
                  setCurrentUser(null);
                  resetGuestStorage();
                  const cleanGuest = loadUserProfile(null);
                  setUserProfile(cleanGuest);
                  const guestTrips = loadTrips(null);
                  setTrips(guestTrips);
                  const guestActiveTripId = getActiveTripId(null);
                  setActiveTripIdState(guestActiveTripId);
                  const guestSaved = loadSavedItemIds(null);
                  setSavedItemIds(guestSaved);
                  const guestStates = loadUserVisitedStates(null);
                  window.dispatchEvent(new CustomEvent('tripverse_visited_states_change', { detail: guestStates }));
                  setIsAuthModalOpen(true);
                }}
                onOpenLegal={(tab) => setLegalModalState({ isOpen: true, tab })}
              />
            </div>
          )}

        </main>

        {/* Modern Footer */}
        <footer className="bg-white border-t border-[#E2EBE1] py-8 lg:py-10 mt-auto pb-24 lg:pb-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <Logo size="adaptive" showTagline={false} />
              <span className="hidden sm:inline text-[#DCE7DB]">|</span>
              <span className="text-xs font-semibold text-[#5A7362]">
                "TripVerse plans the journey, not just the destination."
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-[#5A7362]">
              <button onClick={() => setIsOnboardingOpen(true)} className="hover:text-[#2D5A3D] transition-colors cursor-pointer">Interactive Tour</button>
              <button onClick={() => setCurrentTab('explore')} className="hover:text-[#2D5A3D] transition-colors cursor-pointer">Destinations</button>
              <button onClick={() => handleOpenPlannerWithPrefill()} className="hover:text-[#2D5A3D] transition-colors cursor-pointer">AI Engine</button>
              <button onClick={() => setCurrentTab('trips')} className="hover:text-[#2D5A3D] transition-colors cursor-pointer">My Routes</button>
              <span className="text-[#DCE7DB]">|</span>
              <button onClick={() => setLegalModalState({ isOpen: true, tab: 'privacy' })} className="hover:text-[#2D5A3D] transition-colors cursor-pointer">Privacy</button>
              <button onClick={() => setLegalModalState({ isOpen: true, tab: 'terms' })} className="hover:text-[#2D5A3D] transition-colors cursor-pointer">Terms</button>
              <button onClick={() => setLegalModalState({ isOpen: true, tab: 'advisory' })} className="hover:text-[#2D5A3D] transition-colors cursor-pointer">Advisory</button>
              <button onClick={() => setLegalModalState({ isOpen: true, tab: 'feedback' })} className="text-[#2D5A3D] hover:text-[#1E3E2B] bg-[#EAF0E9] px-3 py-1 rounded-full border border-[#DCE7DB] transition-colors cursor-pointer font-bold">Feedback</button>
              <span className="text-[#7A9382]">© 2026 TripVerse</span>
            </div>
          </div>
        </footer>

      </PullToRefresh>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={(tab) => setCurrentTab(tab)}
        onOpenPlanner={() => handleOpenPlannerWithPrefill()}
        unreadNotificationCount={unreadNotificationCount}
      />

      {/* Modals and Drawers with Code-Splitting Suspense Fallback */}
      <Suspense fallback={<ModalSkeleton />}>
        {isPlannerOpen && (
          <PlannerWizard
            initialDestination={plannerPrefill.destination}
            initialDuration={plannerPrefill.duration}
            initialTravelers={plannerPrefill.travelers}
            initialBudget={plannerPrefill.budget}
            onClose={() => setIsPlannerOpen(false)}
            onTripGenerated={handleTripGenerated}
            onOpenProModal={() => {
              setIsPlannerOpen(false);
              setIsProModalOpen(true);
            }}
          />
        )}

        {(activeTrip || trips[0]) && isAIChatOpen && (
          <AIChatDrawer
            trip={activeTrip || trips[0]}
            isOpen={isAIChatOpen}
            initialQuery={activeChatQuery}
            onClose={() => {
              setIsAIChatOpen(false);
              setActiveChatQuery(undefined);
            }}
            onUpdateTrip={handleUpdateTrip}
            onAppAction={handleAIAppAction}
            onOpenProModal={() => setIsProModalOpen(true)}
            onOpenReplanning={(screen) => {
              setIsAIChatOpen(false);
              setReplanningInitialScreen(screen || 2);
              setIsReplanningOpen(true);
            }}
          />
        )}

        {activeTrip && isShareModalOpen && (
          <ShareTripModal
            trip={activeTrip}
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
          />
        )}

        {/* Real-time Group Collaboration Hub */}
        {activeTrip && isCollabModalOpen && (
          <TripCollaborationModal
            trip={activeTrip}
            isOpen={isCollabModalOpen}
            currentUser={currentUser}
            onClose={() => setIsCollabModalOpen(false)}
            onTripUpdated={handleUpdateTrip}
          />
        )}

        {/* Closed-Loop Trip Reservation & Verified Checkout Drawer */}
        {activeTrip && isBookingModalOpen && (
          <TripBookingCheckoutModal
            trip={activeTrip}
            isOpen={isBookingModalOpen}
            onClose={() => setIsBookingModalOpen(false)}
            currency={currency}
          />
        )}

        {/* Live Turn-by-Turn GPS Navigation HUD */}
        {activeTrip && isLiveNavOpen && (
          <LiveNavigationHUD
            trip={activeTrip}
            isOpen={isLiveNavOpen}
            onClose={() => setIsLiveNavOpen(false)}
          />
        )}

        {/* Booking options opened from the former deal shortcut */}
        {activeTrip && isBestDealModalOpen && (
          <TripBookingCheckoutModal
            trip={activeTrip}
            isOpen={isBestDealModalOpen}
            onClose={() => setIsBestDealModalOpen(false)}
            currency={currency}
          />
        )}

        {/* Printable & PDF Travel Guide Dossier Modal */}
        {activeTrip && isPrintModalOpen && (
          <PrintTravelGuideModal
            trip={activeTrip}
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
          />
        )}

        {/* Trip Replanning & Disruption Guard Modal */}
        {activeTrip && isReplanningOpen && (
          <TripReplanningModal
            trip={activeTrip}
            isOpen={isReplanningOpen}
            initialReason={activeDisruption?.type || 'flight_cancellation'}
            initialScreen={replanningInitialScreen}
            onClose={() => setIsReplanningOpen(false)}
            onApplyReplannedTrip={(updatedTrip) => {
              handleUpdateTrip(updatedTrip);
              setActiveDisruption(null);
            }}
            onOpenChatWithQuery={(query) => {
              setActiveChatQuery(query);
              setIsAIChatOpen(true);
            }}
            onViewMap={() => {
              setTripSubTab('route');
            }}
          />
        )}

        {/* Feature 2: Trip Photo Scrapbook & Memories Modal */}
        {photoJournalTrip && isPhotoJournalOpen && (
          <TripPhotoJournalModal
            trip={photoJournalTrip}
            isOpen={isPhotoJournalOpen}
            onClose={() => setIsPhotoJournalOpen(false)}
            onUpdateTrip={handleUpdateTrip}
          />
        )}

        {/* Feature 3: Notification Center & Countdown Modal */}
        {isNotificationCenterOpen && (
          <NotificationCenterModal
            trips={trips}
            activeTrip={activeTrip}
            isOpen={isNotificationCenterOpen}
            onClose={() => setIsNotificationCenterOpen(false)}
            onNavigateToTarget={handleNavigateFromNotification}
          />
        )}

        {/* Feature 4: First-Time User Interactive Onboarding Tour */}
        {isOnboardingOpen && (
          <OnboardingModal
            isOpen={isOnboardingOpen}
            onClose={() => setIsOnboardingOpen(false)}
            onStartPlanning={() => handleOpenPlannerWithPrefill()}
          />
        )}

        {/* Feature 5: Post-Trip Review & Ratings Modal */}
        {reviewTrip && isReviewModalOpen && (
          <TripReviewModal
            trip={reviewTrip}
            isOpen={isReviewModalOpen}
            onClose={() => setIsReviewModalOpen(false)}
            onSavedReview={(rev) => {
              handleUpdateTrip({ ...reviewTrip, review: rev });
            }}
          />
        )}
      </Suspense>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(updated) => {
          const activeUser = getCurrentUser();
          setCurrentUser(activeUser);
          setUserProfile(updated);
          saveUserProfile(updated, activeUser?.uid);
        }}
      />

      {/* Add/Edit Activity Modal */}
      {activeTrip && (
        <ActivityModal
          isOpen={activityModalState.isOpen}
          onClose={() => setActivityModalState(prev => ({ ...prev, isOpen: false, activity: null }))}
          dayNumber={activityModalState.dayNumber}
          existingActivity={activityModalState.activity}
          onSave={(dayNumber, act) => {
            handleAddOrUpdateActivity(dayNumber, act);
          }}
        />
      )}

      {/* Destination Detail Modal (Home & Saved Views) */}
      <DestinationDetailModal
        destination={selectedDestinationForDetails}
        isOpen={!!selectedDestinationForDetails}
        onClose={() => setSelectedDestinationForDetails(null)}
        onPlanTrip={(destName) => {
          setSelectedDestinationForDetails(null);
          handleOpenPlannerWithPrefill({ destination: destName });
        }}
        isSaved={selectedDestinationForDetails ? savedItemIds.includes(selectedDestinationForDetails.id) : false}
        onToggleSaved={handleToggleSaved}
      />

      {/* Global Spotlight Search Modal (⌘K / Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        trips={trips}
        onSelectTrip={(tripId) => {
          setActiveTripId(tripId);
          setActiveTripIdState(tripId);
          setCurrentTab('trip-detail');
        }}
        onSelectDestination={(dest) => {
          setSelectedDestinationForDetails(dest);
        }}
        onOpenPlanner={(prefill) => {
          handleOpenPlannerWithPrefill(prefill);
        }}
        onOpenLiveNav={() => {
          setIsLiveNavOpen(true);
        }}
        onOpenChat={() => {
          setIsAIChatOpen(true);
        }}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
        }}
      />

      {/* PWA Free Install Banner & iOS Guide */}
      <PwaInstallPrompt />

      {/* Trust, Legal & Traveler Feedback Modal */}
      <LegalTrustModal
        isOpen={legalModalState.isOpen}
        initialTab={legalModalState.tab}
        onClose={() => setLegalModalState(prev => ({ ...prev, isOpen: false }))}
        userEmail={currentUser?.email || ''}
      />

      {/* TripVerse Pro & Quota Modal */}
      <TripVerseProModal
        isOpen={isProModalOpen}
        currentUser={currentUser}
        onClose={() => setIsProModalOpen(false)}
        onSubscribed={() => {
          setCurrentUser(getCurrentUser());
        }}
      />

    </div>
  );
}

export default App;
