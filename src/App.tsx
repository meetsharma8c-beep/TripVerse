import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Trip, Destination, BreakStop, BudgetBreakdown, UserProfile, ItineraryActivity, DayPlan } from './types/trip';
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
import { generateAITrip, type PlannerInput } from './services/plannerEngine';
import { generatePersonalizedTrip } from './services/aiTripPlanner';
import { resolveLandmarkCoordinates } from './services/landmarkAtlasService';
import { resolvePreciseLocationSync } from './services/locationService';
import { applyGeoapifyTravelData, fetchGeoapifyTravelData, getBreakStopSection } from './services/travelDataService';
import { getStoredCurrency, setActiveCurrency, Currency, syncLiveExchangeRates } from './services/currencyService';
import { generateNotifications } from './services/notificationService';
import { AIAppAction } from './services/aiAssistant';
import { triggerHaptic, syncAppBadge } from './services/deviceService';
import { formatCurrency } from './services/currencyService';
import { useLanguage } from './services/languageService';

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
import { ArgonFloatingWidget } from './components/argon/ArgonFloatingWidget';

// Home Components
import { HeroSection } from './components/home/HeroSection';
import { FeaturePillars } from './components/home/FeaturePillars';
import { PopularDestinations } from './components/home/PopularDestinations';
import { PublicLaunchSpotlight } from './components/home/PublicLaunchSpotlight';
import { AIGenerationSkeleton } from './components/common/AIGenerationSkeleton';

// Itinerary Components
import { TripHeader } from './components/itinerary/TripHeader';
import { DayTimeline } from './components/itinerary/DayTimeline';
import { BreakStopCard } from './components/itinerary/BreakStopCard';
import { BudgetOptimizer } from './components/itinerary/BudgetOptimizer';
import { SafetyEmergency } from './components/itinerary/SafetyEmergency';

const CHUNK_RELOAD_COOLDOWN_MS = 15_000;
const CHUNK_RELOAD_STORAGE_KEY = 'tripverse_chunk_reload_at';

function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    importer().catch((error: unknown) => {
      if (typeof window !== 'undefined') {
        const lastReloadRaw = window.sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
        const lastReloadAt = lastReloadRaw ? Number(lastReloadRaw) : 0;
        if (!Number.isFinite(lastReloadAt) || Date.now() - lastReloadAt > CHUNK_RELOAD_COOLDOWN_MS) {
          window.sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(Date.now()));
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    })
  );
}

const PackingWeatherView = lazyWithRetry(() => import('./components/itinerary/PackingWeatherView').then(m => ({ default: m.PackingWeatherView })));
const TripSplitExpenses = lazyWithRetry(() => import('./components/itinerary/TripSplitExpenses').then(m => ({ default: m.TripSplitExpenses })));
const LocalGemsView = lazyWithRetry(() => import('./components/itinerary/LocalGemsView').then(m => ({ default: m.LocalGemsView })));
import { ActivityModal } from './components/itinerary/ActivityModal';

// Transport Deals & Views
const TransportDealsView = lazyWithRetry(() => import('./components/deals/TransportDealsView').then(m => ({ default: m.TransportDealsView })));

// Trips & Explore Views (Lazy-loaded for faster initial paint)
const MyTripsView = lazyWithRetry(() => import('./components/trips/MyTripsView').then(m => ({ default: m.MyTripsView })));
const ExploreView = lazyWithRetry(() => import('./components/explore/ExploreView').then(m => ({ default: m.ExploreView })));
import { DestinationDetailModal } from './components/explore/DestinationDetailModal';
const SavedItemsView = lazyWithRetry(() => import('./components/saved/SavedItemsView').then(m => ({ default: m.SavedItemsView })));
const ProfileView = lazyWithRetry(() => import('./components/profile/ProfileView').then(m => ({ default: m.ProfileView })));
import { AuthModal } from './components/profile/AuthModal';
import { ResetPasswordModal } from './components/profile/ResetPasswordModal';
import { GuestPlannerRestrictedModal } from './components/planner/GuestPlannerRestrictedModal';
import { 
  getCurrentUser, 
  isGuestUser,
  onAuthStateChanged, 
  toUserProfile, 
  getUserSubscriptionQuota, 
  consumeTripCredit,
  signOut as authSignOut,
  checkAndProcessFirebaseRedirectResult
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

const TripPassesHubView = lazy(() => import('./components/booking/TripPassesHubView').then(m => ({ default: m.TripPassesHubView })));

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
  MoreVertical,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { resolveRouteFromBrowser } from './utils/routeResolver';
import { POPULAR_DESTINATIONS } from './data/destinations';
import { synthesizeDestination } from './utils/destinationImages';

const DISCOVERY_FALLBACK_TRIP: Trip = {
  id: 'discovery-co-pilot',
  name: 'TripVerse Discovery',
  origin: 'Current Location',
  destination: 'Explore Destinations',
  durationDays: 3,
  travelersCount: 1,
  travelerType: 'solo',
  currency: 'INR',
  totalBudget: 50000,
  budgetPerPerson: 50000,
  preferences: ['nature', 'culture', 'food'],
  transportMode: 'any',
  accommodationType: '3star',
  foodPreference: 'any',
  priorities: ['experience'],
  itinerary: [],
  breakStops: [],
  budgetBreakdown: {
    transportation: 15000,
    accommodation: 20000,
    food: 10000,
    activities: 4000,
    miscellaneous: 1000
  },
  estimatedTotal: 50000,
  routeType: 'scenic',
  status: 'draft',
  createdAt: new Date().toISOString()
};

export function App() {
  const { language, t } = useLanguage();
  const initialTrips = React.useMemo(() => loadTrips(), []);
  const initialRoute = React.useMemo(() => resolveRouteFromBrowser(initialTrips), [initialTrips]);

  // Global State
  const [currentTab, setCurrentTab] = useState<string>(() => initialRoute.tab || 'home');
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [activeTripIdState, setActiveTripIdState] = useState<string>(() => initialRoute.tripId || getActiveTripId());
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getCurrentUser());
  const [savedItemIds, setSavedItemIds] = useState<string[]>(() => loadSavedItemIds());

  // Sub-tab inside Trip Detail view
  const [tripSubTab, setTripSubTab] = useState<
    'itinerary' | 'hub' | 'packing' | 'expenses' | 'gems' | 'deals' | 'route' | 'breakstops' | 'budget' | 'safety'
  >('itinerary');
  const [tripsViewMode, setTripsViewMode] = useState<'passes' | 'portfolio'>('passes');

  // Modals & Drawers
  const [isPlannerOpen, setIsPlannerOpen] = useState(() => Boolean(initialRoute.openPlanner && !isGuestUser(getCurrentUser())));
  const [isGuestPlannerRestrictedOpen, setIsGuestPlannerRestrictedOpen] = useState(() => Boolean(initialRoute.openPlanner && isGuestUser(getCurrentUser())));
  const [guestRestrictedFeature, setGuestRestrictedFeature] = useState<{
    featureTitle?: string;
    featureDescription?: string;
    featureButtonText?: string;
  } | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(() => (initialRoute as any).openCollab || false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialMethod, setAuthModalInitialMethod] = useState<'google' | 'email' | 'phone' | 'guest'>('google');
  const [authModalInitialSubMode, setAuthModalInitialSubMode] = useState<'login' | 'signup'>('login');
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (initialRoute as any).openResetPassword ||
      window.location.pathname.startsWith('/reset-password') ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    );
  });
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
    budgetMode: 'per_person' | 'total';
  }>({
    destination: '',
    duration: 3,
    travelers: 3,
    budget: 8000,
    budgetMode: 'total'
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
  const [prevActiveTripId, setPrevActiveTripId] = useState<string | undefined>(undefined);
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

  // Detect search engine crawlers / preview bots so they immediately render full content without splash screens or onboarding modals
  const isSearchCrawler = typeof navigator !== 'undefined' && /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|ia_archiver|twitterbot|linkedinbot|whatsapp|applebot|semrushbot|ahrefsbot|lighthouse|chrome-lighthouse|pagespeed|gtmetrix|headlesschrome/i.test(navigator.userAgent || '');

  // Native & PWA App Opening Animation Screen State
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('nosplash') === 'true' || isSearchCrawler) {
        return false;
      }
    }
    return true;
  });
  const [splashPlatform, setSplashPlatform] = useState<'ios' | 'android' | undefined>(undefined);

  // Genuine App Initialization Tracking
  const [isAppReady, setIsAppReady] = useState<boolean>(() => isSearchCrawler);
  const [initStage, setInitStage] = useState<{ progress: number; message: string }>({
    progress: 25,
    message: 'Initializing travel intelligence...'
  });

  const handleFinishSplash = React.useCallback(() => {
    setShowSplash(false);
  }, []);

  // Merge cloud trips with local rich metadata (coordinates, completion state, routeDetails) so cloud sync never strips local precision
  const mergeCloudTripsWithLocal = (cloudList: Trip[], localList: Trip[]): Trip[] => {
    const localMap = new Map(localList.map(t => [t.id, t]));
    return cloudList.map(cloudTrip => {
      const localTrip = localMap.get(cloudTrip.id);
      if (!localTrip) {
        return {
          ...cloudTrip,
          bestTransportDeal: undefined,
          transportDeals: []
        };
      }
      const localActsById = new Map<string, ItineraryActivity>();
      for (const d of localTrip.itinerary || []) {
        for (const a of d.activities || []) {
          if (a.id) localActsById.set(a.id, a);
        }
      }
      const mergedItinerary = (cloudTrip.itinerary || []).map(day => ({
        ...day,
        activities: (day.activities || []).map(act => {
          const localAct = act.id ? localActsById.get(act.id) : undefined;
          return localAct
            ? {
                ...act,
                coordinates: localAct.coordinates || act.coordinates,
                completed: localAct.completed ?? act.completed,
                tag: localAct.tag || act.tag,
                isCustom: localAct.isCustom ?? act.isCustom
              }
            : act;
        })
      }));
      const mergedDestDetails = cloudTrip.destinationDetails || localTrip.destinationDetails;
      return {
        ...localTrip,
        ...cloudTrip,
        originCoordinates: cloudTrip.originCoordinates || localTrip.originCoordinates,
        destinationDetails: mergedDestDetails
          ? {
              ...mergedDestDetails,
              coordinates: cloudTrip.destinationDetails?.coordinates || localTrip.destinationDetails?.coordinates || mergedDestDetails.coordinates
            }
          : undefined,
        routeDetails: cloudTrip.routeDetails || localTrip.routeDetails,
        travelDataStatus: localTrip.travelDataStatus || cloudTrip.travelDataStatus,
        currency: cloudTrip.currency || localTrip.currency,
        itinerary: mergedItinerary,
        bestTransportDeal: undefined,
        transportDeals: []
      };
    });
  };

  useEffect(() => {
    // Process pending redirect authentication (e.g. returning from Google Sign-In redirect on mobile/Safari)
    checkAndProcessFirebaseRedirectResult()
      .then(user => {
        if (user) {
          setCurrentUser(user);
          setUserProfile(toUserProfile(user));
          setIsAuthModalOpen(false);
        }
      })
      .catch(err => {
        console.warn('[Firebase Auth] Redirect result processing notice:', err);
      });

    const unsub = onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsAuthModalOpen(false);
        if (!isGuestUser(user)) {
          setIsGuestPlannerRestrictedOpen(false);
        }
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
            // User has cloud trips for their account: merge with local metadata and cache locally without re-uploading
            const mergedCloudTrips = mergeCloudTripsWithLocal(cloudTrips, localUserTrips);
            setTrips(mergedCloudTrips);
            saveTrips(mergedCloudTrips, user.uid, { skipCloudSync: true });
            if (!mergedCloudTrips.some(t => t.id === userActiveId)) {
              setActiveTripIdState(mergedCloudTrips[0].id);
              setActiveTripId(mergedCloudTrips[0].id, user.uid);
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

    const handleQuotaUpdate = () => {
      const active = getCurrentUser();
      if (active) {
        setCurrentUser({ ...active });
      }
    };
    window.addEventListener('tripverse_quota_updated', handleQuotaUpdate);

    const handlePasswordRecoveryEvent = () => {
      setIsResetPasswordModalOpen(true);
      setIsAuthModalOpen(false);
    };
    window.addEventListener('tripverse_open_reset_password_modal', handlePasswordRecoveryEvent);

    return () => {
      unsub();
      window.removeEventListener('tripverse_quota_updated', handleQuotaUpdate);
      window.removeEventListener('tripverse_open_reset_password_modal', handlePasswordRecoveryEvent);
    };
  }, []);

  // Helper to preload critical visual assets before revealing the UI
  const preloadVisualAsset = (src: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(true);
      const img = new Image();
      img.src = src;
      if (img.complete) {
        resolve(true);
      } else {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
      }
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function bootstrapApp() {
      try {
        // Step 1: Storage & Initial Session Verification (25% progress)
        if (!isMounted) return;
        setInitStage({
          progress: 25,
          message: 'Verifying session & travel profile...'
        });

        const activeUser = getCurrentUser();
        if (activeUser?.uid) {
          const localUserTrips = loadTrips(activeUser.uid);
          setTrips(localUserTrips);
          const userActiveId = getActiveTripId(activeUser.uid);
          setActiveTripIdState(userActiveId);
          const userSaved = loadSavedItemIds(activeUser.uid);
          setSavedItemIds(userSaved);
        } else {
          const guestProfile = loadUserProfile(null);
          setUserProfile(guestProfile);
          const guestTrips = loadTrips(null);
          setTrips(guestTrips);
        }

        // Step 2: Live FX & Exchange Rates Synchronization (50% progress)
        if (!isMounted) return;
        setInitStage({
          progress: 50,
          message: 'Synchronizing real-time exchange rates...'
        });

        // Genuine network FX fetch with 1.2s timeout ceiling so offline or slow connections never block launch
        await Promise.race([
          syncLiveExchangeRates(),
          new Promise((r) => setTimeout(r, 1200))
        ]).catch(() => {});

        // Step 3: Auth & Cloud Data Sync (75% progress)
        if (!isMounted) return;
        setInitStage({
          progress: 75,
          message: activeUser?.uid ? 'Syncing cloud itineraries...' : 'Connecting travel intelligence...'
        });

        if (activeUser?.uid) {
          try {
            const [cloudTrips, cloudProfile, cloudStates, cloudSavedItems] = await Promise.race([
              Promise.all([
                loadUserTripsFromSupabase(activeUser.uid).catch(() => null),
                loadUserProfileFromSupabase(activeUser.uid).catch(() => null),
                loadUserPassportFromSupabase(activeUser.uid).catch(() => null),
                loadUserSavedItemsFromSupabase(activeUser.uid).catch(() => null)
              ]),
              new Promise<any[]>((r) => setTimeout(() => r([null, null, null, null]), 1500))
            ]);

            if (cloudTrips && cloudTrips.length > 0 && isMounted) {
              const localCurrent = loadTrips(activeUser.uid);
              const mergedCloudTrips = mergeCloudTripsWithLocal(cloudTrips, localCurrent);
              setTrips(mergedCloudTrips);
              saveTrips(mergedCloudTrips, activeUser.uid, { skipCloudSync: true });
            }
            if (cloudProfile && isMounted) {
              const merged = { ...toUserProfile(activeUser), ...cloudProfile };
              setUserProfile(merged);
              saveUserProfile(merged, activeUser.uid);
            }
            if (cloudSavedItems && cloudSavedItems.length > 0 && isMounted) {
              setSavedItemIds(cloudSavedItems);
              saveSavedItemIds(cloudSavedItems, activeUser.uid);
            }
            if (cloudStates && cloudStates.length > 0 && isMounted) {
              saveUserVisitedStates(cloudStates, activeUser.uid);
              window.dispatchEvent(new CustomEvent('tripverse_visited_states_change', { detail: cloudStates }));
            }
          } catch (e) {
            console.warn('[Bootstrap] Cloud sync notice:', e);
          }
        }

        // Step 4: Font & Critical Visual Assets Preloading (95% progress)
        if (!isMounted) return;
        setInitStage({
          progress: 95,
          message: 'Preloading typography & visuals...'
        });

        const fontPromise = (typeof document !== 'undefined' && document.fonts && document.fonts.ready)
          ? document.fonts.ready.catch(() => {})
          : Promise.resolve();

        const assetsPromise = Promise.all([
          preloadVisualAsset('/tripverse-mark.png?v=10'),
          preloadVisualAsset('/images/ai-robot-mascot.jpg')
        ]);

        await Promise.race([
          Promise.all([fontPromise, assetsPromise]),
          new Promise((r) => setTimeout(r, 1000))
        ]).catch(() => {});

        // Step 5: Ready Handover (100% progress)
        if (!isMounted) return;
        setInitStage({
          progress: 100,
          message: 'Welcome to TripVerse'
        });

        // Smooth transition pacing
        await new Promise((r) => setTimeout(r, 150));

        if (!isMounted) return;
        setIsAppReady(true);
      } catch (err) {
        console.warn('[Bootstrap] Error during bootstrap:', err);
        if (isMounted) {
          setIsAppReady(true);
        }
      }
    }

    bootstrapApp();

    return () => {
      isMounted = false;
    };
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

  // URL Pathname, Dynamic Document Title & SEO Meta Sync for Browser, Crawler & History Navigation
  useEffect(() => {
    let targetPath = '/';
    let targetTitle = 'TripVerse (Trip Verse) — Free AI Trip Planner, Road Trip Routes & Itineraries';
    let targetDesc = 'TripVerse (trip-verse.com) is the #1 free AI Trip Planner. Plan any trip in seconds with custom day-by-day trip itineraries, road trip routes, highway stops, hotel picks, live weather & group trip budgets across 10,000+ destinations worldwide.';

    if (selectedDestinationForDetails) {
      targetPath = `/destination/${selectedDestinationForDetails.id}`;
      targetTitle = `${selectedDestinationForDetails.name} Trip Itinerary & Travel Guide — TripVerse AI Trip Planner`;
      targetDesc = selectedDestinationForDetails.description || `Plan a custom AI trip itinerary to ${selectedDestinationForDetails.name} (${selectedDestinationForDetails.state}) with smart road trip routes, best time to visit (${selectedDestinationForDetails.bestTime}), and curated local highlights on TripVerse.`;
    } else if (currentTab === 'trip-detail') {
      const active = trips.find(t => t.id === activeTripIdState) || trips[0];
      if (active) {
        targetPath = `/trip/${active.id}`;
        targetTitle = `${active.name} (${active.durationDays} Days) — Trip Itinerary | TripVerse`;
        targetDesc = `Explore this ${active.durationDays}-day ${active.destination} trip itinerary from ${active.origin} with day-wise stops, route map, and budget breakdown on TripVerse.`;
      } else {
        targetPath = '/trips';
        targetTitle = 'My Trips & Travel Itineraries — TripVerse AI Trip Planner';
      }
    } else if (currentTab === 'explore') {
      targetPath = '/explore';
      targetTitle = 'Explore Trip Destinations, Road Trips & Travel Guides — TripVerse';
      targetDesc = 'Browse curated trip destinations, scenic road trips, mountain getaways, heritage cities, and coastal escapes worldwide on TripVerse.';
    } else if (currentTab === 'trips') {
      targetPath = '/trips';
      targetTitle = 'My Trips & Travel Itineraries — TripVerse AI Trip Planner';
    } else if (currentTab === 'saved') {
      targetPath = '/saved';
      targetTitle = 'Saved Trip Places & Pitstops — TripVerse';
    } else if (currentTab === 'profile') {
      targetPath = '/profile';
      targetTitle = 'Traveler Profile & Trip Passport — TripVerse';
    }

    document.title = targetTitle;

    // Synchronize SEO meta description, Open Graph tags, and Canonical URL dynamically
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', targetDesc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', targetTitle);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', targetDesc);
    const canonicalUrl = `https://trip-verse.com${targetPath === '/' ? '/' : targetPath}`;
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) canonicalLink.setAttribute('href', canonicalUrl);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);

    // Only update if path changed
    if (window.location.pathname !== targetPath) {
      window.history.pushState(
        { tab: currentTab, tripId: activeTripIdState, destId: selectedDestinationForDetails?.id },
        targetTitle,
        targetPath
      );
    }
  }, [currentTab, activeTripIdState, selectedDestinationForDetails, trips]);

  const tripSubSectionRef = useRef<HTMLDivElement>(null);

  const scrollPageToTopInstant = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const handleNavigateTab = useCallback((tab: string) => {
    setCurrentTab(tab);
    scrollPageToTopInstant();
  }, [scrollPageToTopInstant]);

  const handleSelectTripSubTab = useCallback((
    subTab: 'itinerary' | 'hub' | 'packing' | 'expenses' | 'gems' | 'deals' | 'route' | 'breakstops' | 'budget' | 'safety',
    options?: { scrollTargetId?: string; forceScroll?: boolean }
  ) => {
    setTripSubTab(subTab);
    window.setTimeout(() => {
      const targetEl = options?.scrollTargetId
        ? document.getElementById(options.scrollTargetId) || tripSubSectionRef.current
        : tripSubSectionRef.current;
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const shouldScroll = options?.forceScroll || rect.top < 56 || rect.top > 280;
      if (shouldScroll) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  }, []);

  const handleSelectTripsViewMode = useCallback((mode: 'passes' | 'portfolio') => {
    setTripsViewMode(mode);
    if (typeof window !== 'undefined' && window.scrollY > 120) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const hasMountedTabScrollRef = useRef(false);
  useEffect(() => {
    if (!hasMountedTabScrollRef.current) {
      hasMountedTabScrollRef.current = true;
      return;
    }
    scrollPageToTopInstant();
  }, [currentTab, scrollPageToTopInstant]);

  // Overlay modal state tracking for Android back gesture & browser history synchronization
  const isOverlayModalOpen = Boolean(
    isBookingModalOpen ||
    isGlobalSearchOpen ||
    isPlannerOpen ||
    isGuestPlannerRestrictedOpen ||
    isAIChatOpen ||
    isLiveNavOpen ||
    isShareModalOpen ||
    isNotificationCenterOpen ||
    isPhotoJournalOpen ||
    isReviewModalOpen ||
    isAuthModalOpen ||
    isResetPasswordModalOpen ||
    isProModalOpen ||
    isOnboardingOpen ||
    activityModalState.isOpen ||
    isReplanningOpen ||
    legalModalState.isOpen ||
    isBestDealModalOpen ||
    isPrintModalOpen ||
    isCollabModalOpen
  );

  const modalHistoryPushedRef = useRef(false);

  useEffect(() => {
    if (isOverlayModalOpen) {
      if (!modalHistoryPushedRef.current) {
        modalHistoryPushedRef.current = true;
        window.history.pushState({ isModal: true }, '');
      }
    } else {
      if (modalHistoryPushedRef.current) {
        modalHistoryPushedRef.current = false;
        if (window.history.state?.isModal) {
          window.history.back();
        }
      }
    }
  }, [isOverlayModalOpen]);

  // Browser & Android Hardware/Gesture Back Button Handler
  useEffect(() => {
    const handlePopState = () => {
      modalHistoryPushedRef.current = false;
      // Step 1: If any top-level modal or drawer is open, dismiss it first (native app feel)
      if (isBookingModalOpen) {
        setIsBookingModalOpen(false);
        return;
      }
      if (isGlobalSearchOpen) {
        setIsGlobalSearchOpen(false);
        return;
      }
      if (isPlannerOpen || isGuestPlannerRestrictedOpen) {
        setIsPlannerOpen(false);
        setIsGuestPlannerRestrictedOpen(false);
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
      if (isResetPasswordModalOpen) {
        setIsResetPasswordModalOpen(false);
        return;
      }
      if (isProModalOpen) {
        setIsProModalOpen(false);
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
      if (isReplanningOpen) {
        setIsReplanningOpen(false);
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
      if (isCollabModalOpen) {
        setIsCollabModalOpen(false);
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
      if (route.openResetPassword) {
        setIsResetPasswordModalOpen(true);
      }
      if (route.openPlanner) {
        const activeUser = currentUser ?? getCurrentUser();
        if (isGuestUser(activeUser)) {
          setIsGuestPlannerRestrictedOpen(true);
        } else {
          const quota = getUserSubscriptionQuota(activeUser);
          if (!quota.canCreateTrip) {
            setIsProModalOpen(true);
          } else {
            setIsPlannerOpen(true);
          }
        }
      }
      setCurrentTab(route.tab);
    };

    // Android native back button listener dispatched from Capacitor
    const handleHardwareBack = (e: Event) => {
      if (
        isGuestPlannerRestrictedOpen ||
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
        isResetPasswordModalOpen ||
        isProModalOpen ||
        isOnboardingOpen ||
        activityModalState.isOpen ||
        isReplanningOpen ||
        legalModalState.isOpen ||
        isBestDealModalOpen ||
        isPrintModalOpen ||
        isCollabModalOpen
      ) {
        e.preventDefault();
        setIsBookingModalOpen(false);
        setIsGlobalSearchOpen(false);
        setIsPlannerOpen(false);
        setIsGuestPlannerRestrictedOpen(false);
        setIsAIChatOpen(false);
        setIsLiveNavOpen(false);
        setSelectedDestinationForDetails(null);
        setIsShareModalOpen(false);
        setIsNotificationCenterOpen(false);
        setIsPhotoJournalOpen(false);
        setIsReviewModalOpen(false);
        setIsAuthModalOpen(false);
        setIsResetPasswordModalOpen(false);
        setIsProModalOpen(false);
        setIsOnboardingOpen(false);
        setActivityModalState(prev => ({ ...prev, isOpen: false }));
        setIsReplanningOpen(false);
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
    isResetPasswordModalOpen,
    isProModalOpen,
    isGuestPlannerRestrictedOpen,
    isOnboardingOpen,
    activityModalState.isOpen,
    isReplanningOpen,
    legalModalState.isOpen,
    isBestDealModalOpen,
    isPrintModalOpen,
    isCollabModalOpen,
    currentTab,
    trips,
    currentUser
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
  if (activeTrip?.id !== prevActiveTripId) {
    setPrevActiveTripId(activeTrip?.id);
    setActiveDisruption(null);
  }
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
    if (!activeTripId || !activeTripOrigin || !activeTripDestination) return;
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

    fetchGeoapifyTravelData(routeOrigin, trip.destination, trip.destinationDetails?.coordinates)
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

  // Auto-launch Onboarding Tour strictly for first-time ever visitors once (never for search crawlers)
  useEffect(() => {
    if (!hasCompletedOnboarding() && !showSplash && !isSearchCrawler) {
      setOnboardingCompleted(true);
      const timer = setTimeout(() => setIsOnboardingOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [showSplash, isSearchCrawler]);

  // Update notification counts in real-time & sync App Badging (Windows Taskbar & Android Launcher)
  useEffect(() => {
    const updateNotifs = () => {
      const notifs = generateNotifications(trips, activeTrip);
      const unreadCount = notifs.filter(n => !n.read).length;
      setUnreadNotificationCount(unreadCount);
      syncAppBadge(unreadCount);
    };
    updateNotifs();
    window.addEventListener('tripverse_notifications_updated', updateNotifs);
    return () => window.removeEventListener('tripverse_notifications_updated', updateNotifs);
  }, [trips, activeTrip]);

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
      handleOpenPlannerWithPrefill();
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
    budgetMode?: 'per_person' | 'total';
  }) => {
    if (params) {
      setPlannerPrefill(prev => ({
        destination: params.destination ?? prev.destination,
        duration: params.duration ?? prev.duration,
        travelers: params.travelers ?? prev.travelers,
        budget: params.budget ?? prev.budget,
        budgetMode: params.budgetMode ?? prev.budgetMode ?? 'total'
      }));
    }
    const activeUser = currentUser ?? getCurrentUser();
    if (isGuestUser(activeUser)) {
      setGuestRestrictedFeature(null);
      setIsGuestPlannerRestrictedOpen(true);
      return;
    }
    const quota = getUserSubscriptionQuota(activeUser);
    if (!quota.canCreateTrip) {
      setIsProModalOpen(true);
      return;
    }
    setIsPlannerOpen(true);
  };

  const handleOpenAIChat = (query?: string) => {
    const activeUser = currentUser ?? getCurrentUser();
    if (isGuestUser(activeUser)) {
      setGuestRestrictedFeature({
        featureTitle: 'Sign Up to Chat with ConCode AI Co-Pilot',
        featureDescription: 'You are currently exploring TripVerse in Guest Mode. Instant AI route calculations, live weather alerts, and 24/7 travel co-pilot guidance require a free registered account.',
        featureButtonText: 'Sign Up to Unlock ConCode AI (Free)'
      });
      setIsGuestPlannerRestrictedOpen(true);
      return;
    }
    if (query) {
      setActiveChatQuery(query);
    }
    setIsAIChatOpen(true);
  };

  const handleTripGenerated = async (input: PlannerInput) => {
    const activeUser = currentUser ?? getCurrentUser();
    const quota = getUserSubscriptionQuota(activeUser);
    if (!quota.canCreateTrip) {
      setIsPlannerOpen(false);
      if (isGuestUser(activeUser)) {
        setIsGuestPlannerRestrictedOpen(true);
      } else {
        setIsProModalOpen(true);
      }
      return;
    }

    setGenerationParams({
      destination: input.destinationName || input.destination || 'Custom Destination',
      duration: input.durationDays || 3,
      travelers: input.travelersCount || 2,
      budget: input.budgetAmount || 15000
    });
    setIsPlannerOpen(false);

    triggerHaptic('success');
    setIsGeneratingTrip(true);
    try {
      let newTrip: Trip;
      try {
        newTrip = await generatePersonalizedTrip(input);
      } catch (err) {
        console.warn('[TripGeneration] Cloud AI generation fallback triggered:', err);
        newTrip = generateAITrip(input);
      }
      if (currentUser?.uid) {
        newTrip.userId = currentUser.uid;
        newTrip.isUserCreated = true;
      }
      // Deduct free credit only upon successful generation
      consumeTripCredit(currentUser);
      saveOrUpdateTrip(newTrip, currentUser?.uid);
      setTrips(prev => [newTrip, ...prev]);
      setActiveTripId(newTrip.id, currentUser?.uid);
      setActiveTripIdState(newTrip.id);
      setCurrentTab('trip-detail');
      setTripSubTab('itinerary');
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
    setPhotoJournalTrip(prev => (prev && prev.id === updated.id ? updated : prev));
    setReviewTrip(prev => (prev && prev.id === updated.id ? updated : prev));
  };

  const handleAIAppAction = (action: AIAppAction) => {
    switch (action.type) {
      case 'SWITCH_TAB':
        if (action.payload?.tab && ['home', 'trips', 'explore', 'saved', 'profile', 'trip-detail'].includes(action.payload.tab)) {
          setCurrentTab(action.payload.tab as any);
        }
        if (action.payload?.subTab) {
          setTripSubTab(action.payload.subTab);
          if (!action.payload?.tab) {
            setCurrentTab('trip-detail');
          }
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
            {
              const activeUser = currentUser ?? getCurrentUser();
              if (isGuestUser(activeUser)) {
                setIsGuestPlannerRestrictedOpen(true);
              } else {
                const quota = getUserSubscriptionQuota(activeUser);
                if (!quota.canCreateTrip) {
                  setIsProModalOpen(true);
                } else {
                  setIsPlannerOpen(true);
                }
              }
            }
            break;
        }
        break;
      case 'GENERATE_NEW_TRIP':
        {
          const activeUser = currentUser ?? getCurrentUser();
          if (isGuestUser(activeUser)) {
            setIsGuestPlannerRestrictedOpen(true);
            break;
          }
          const quota = getUserSubscriptionQuota(activeUser);
          if (!quota.canCreateTrip) {
            setIsProModalOpen(true);
            break;
          }
        }
        if (action.payload?.trip) {
          const tripCandidate = action.payload.trip;
          const candidateDays = Array.isArray(tripCandidate.itinerary)
            ? tripCandidate.itinerary
            : Array.isArray(tripCandidate.days)
              ? tripCandidate.days
              : null;
          if (tripCandidate.id && candidateDays) {
            const trip: Trip = {
              ...tripCandidate,
              itinerary: candidateDays
            };
            if (currentUser?.uid) {
              trip.userId = currentUser.uid;
              trip.isUserCreated = true;
            }
            consumeTripCredit(currentUser);
            saveOrUpdateTrip(trip, currentUser?.uid);
            setTrips(prev => [trip, ...prev]);
            setActiveTripIdState(trip.id);
            setActiveTripId(trip.id, currentUser?.uid);
            setCurrentTab('trip-detail');
            setIsAIChatOpen(false);
          } else {
            handleTripGenerated(action.payload.trip);
          }
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
            setActiveTripId(found.id, currentUser?.uid);
            setActiveTripIdState(found.id);
            setCurrentTab('trip-detail');
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
          const currentExp = loadTripExpenses(activeTrip.id, currentUser?.uid);
          saveTripExpenses(activeTrip.id, [action.payload.expense, ...currentExp], currentUser?.uid);
          window.dispatchEvent(new CustomEvent('tripverse_expenses_updated'));
        }
        break;
      case 'ADD_PACKING_ITEM':
        if (action.payload?.items && activeTrip) {
          const currentPack = loadTripPacking(activeTrip.id, currentUser?.uid) || [];
          saveTripPacking(activeTrip.id, [...currentPack, ...action.payload.items], currentUser?.uid);
          window.dispatchEvent(new CustomEvent('tripverse_packing_updated'));
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
      aiRationale: `Budget optimized: ${reason} (Saved ${formatCurrency(savings)}).`
    };
    handleUpdateTrip(updated);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#2D5A3D', '#386B49', '#F59E0B']
      });
    } catch {
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

  const computeUpdatedEstimatedTotal = (trip: Trip, newActivitiesTotal: number) => {
    const bd = trip.budgetBreakdown;
    const nonActivityTotal =
      (bd?.transportation || 0) +
      (bd?.accommodation || 0) +
      (bd?.food || 0) +
      (bd?.miscellaneous || 0);
    return Math.max(500, newActivitiesTotal + nonActivityTotal);
  };

  const handleAddOrUpdateActivity = (dayNumber: number, activityData: Partial<ItineraryActivity>) => {
    if (!activeTrip) return;
    const baseDestCoords =
      activeTrip.destinationDetails?.coordinates ||
      activeTrip.routeDetails?.destinationCoordinates ||
      resolvePreciseLocationSync(activeTrip.destination).coordinates;
    const updatedDays = activeTrip.itinerary.map(day => {
      if (day.dayNumber === dayNumber) {
        const existingIndex = day.activities.findIndex(a => a.id === activityData.id);
        let updatedActivities: ItineraryActivity[];
        if (existingIndex >= 0) {
          updatedActivities = [...day.activities];
          updatedActivities[existingIndex] = { ...updatedActivities[existingIndex], ...activityData } as ItineraryActivity;
        } else {
          const actTitle = activityData.title || 'Custom Activity';
          const newAct: ItineraryActivity = {
            id: activityData.id || `act-custom-${Date.now()}`,
            dayNumber,
            time: activityData.time || '11:00 AM',
            title: actTitle,
            type: activityData.type || 'attraction',
            location: activityData.location || activeTrip.destination,
            estimatedCost: activityData.estimatedCost || 0,
            travelTimeMin: activityData.travelTimeMin || 15,
            distanceKm: activityData.distanceKm || 2,
            description: activityData.description || '',
            coordinates: activityData.coordinates || resolveLandmarkCoordinates(actTitle, baseDestCoords),
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
      estimatedTotal: computeUpdatedEstimatedTotal(activeTrip, newActivitiesTotal),
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
      estimatedTotal: computeUpdatedEstimatedTotal(activeTrip, newActivitiesTotal),
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

  const handleClearDay = (dayNumber: number) => {
    if (!activeTrip) return;
    triggerHaptic('warning');
    const updatedDays = activeTrip.itinerary.map(day => {
      if (day.dayNumber === dayNumber) {
        return { ...day, activities: [], dayEstimatedCost: 0 };
      }
      return day;
    });
    const newActivitiesTotal = updatedDays.reduce((sum, d) => sum + d.dayEstimatedCost, 0);
    handleUpdateTrip({
      ...activeTrip,
      itinerary: updatedDays,
      estimatedTotal: computeUpdatedEstimatedTotal(activeTrip, newActivitiesTotal),
      budgetBreakdown: {
        ...activeTrip.budgetBreakdown,
        activities: newActivitiesTotal
      }
    });
  };

  const handleAddDay = () => {
    if (!activeTrip) return;
    triggerHaptic('success');
    const newDayNumber = activeTrip.itinerary.length + 1;
    const newDay: DayPlan = {
      dayNumber: newDayNumber,
      title: `Day ${newDayNumber} — Flexible Exploration & Local Sights`,
      theme: 'Traveler Choice, Leisure Exploration & Local Highlights',
      dayEstimatedCost: 0,
      activities: []
    };
    const updatedDays = [...activeTrip.itinerary, newDay];
    handleUpdateTrip({
      ...activeTrip,
      durationDays: newDayNumber,
      itinerary: updatedDays
    });
  };

  const handleDeleteDay = (dayNumber: number) => {
    if (!activeTrip || activeTrip.itinerary.length <= 1) return;
    triggerHaptic('warning');
    const remaining = activeTrip.itinerary
      .filter(day => day.dayNumber !== dayNumber)
      .map((day, idx) => ({
        ...day,
        dayNumber: idx + 1,
        title: day.title.replace(/Day \d+/, `Day ${idx + 1}`),
        activities: day.activities.map(act => ({ ...act, dayNumber: idx + 1 }))
      }));
    const newActivitiesTotal = remaining.reduce((sum, d) => sum + d.dayEstimatedCost, 0);
    handleUpdateTrip({
      ...activeTrip,
      durationDays: remaining.length,
      itinerary: remaining,
      estimatedTotal: computeUpdatedEstimatedTotal(activeTrip, newActivitiesTotal),
      budgetBreakdown: {
        ...activeTrip.budgetBreakdown,
        activities: newActivitiesTotal
      }
    });
  };

  const handleQuickAddSight = (dayNumber: number, sightTitle: string) => {
    handleAddOrUpdateActivity(dayNumber, {
      title: sightTitle,
      location: activeTrip ? `${sightTitle}, ${activeTrip.destination}` : sightTitle,
      type: 'attraction',
      tag: 'Curated Sight',
      estimatedCost: 200,
      description: `Scenic highlight and cultural experience in ${activeTrip?.destination || 'destination'}.`
    });
  };

  const isAnyModalOpen = Boolean(
    isProModalOpen ||
    isBookingModalOpen ||
    isGeneratingTrip ||
    isPlannerOpen ||
    isGuestPlannerRestrictedOpen ||
    isGlobalSearchOpen ||
    isAIChatOpen ||
    isShareModalOpen ||
    isAuthModalOpen ||
    isResetPasswordModalOpen ||
    isLiveNavOpen ||
    isBestDealModalOpen ||
    isPrintModalOpen ||
    isCollabModalOpen ||
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
          const localCurrent = loadTrips(activeUser.uid);
          const mergedCloudTrips = mergeCloudTripsWithLocal(cloudTrips, localCurrent);
          setTrips(mergedCloudTrips);
          saveTrips(mergedCloudTrips, activeUser.uid, { skipCloudSync: true });
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

      // Check for Service Worker app updates in the background
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => reg?.update()).catch(() => {});
      }

      // Notify child components to refresh their widgets / data
      window.dispatchEvent(new CustomEvent('tripverse_refreshed', { detail: { timestamp: Date.now() } }));
    } catch (e) {
      console.warn('[PullToRefresh] Error during pull-to-refresh:', e);
    }
  };

  const handleUserSignOut = () => {
    authSignOut();
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
  };

  return (
    <div
      key={language}
      className={`min-h-screen w-full overflow-x-clip flex flex-col bg-[#F8FAFC] dark:bg-[#070C16] text-slate-900 dark:text-slate-100 selection:bg-[#2D5A3D] selection:text-white antialiased transition-opacity duration-300 ${
        !isAppReady && showSplash ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >

      {/* 0. Native iOS & Android App Opening Animation Splash Screen */}
      {showSplash && (
        <AppSplashScreen
          initialPlatform={splashPlatform}
          isAppReady={isAppReady}
          statusMessage={initStage.message}
          targetProgress={initStage.progress}
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
        onNavigate={handleNavigateTab}
        onOpenPlanner={() => handleOpenPlannerWithPrefill()}
        onOpenSearch={() => setIsGlobalSearchOpen(true)}
        onOpenChat={() => handleOpenAIChat()}
        userProfile={userProfile}
        onOpenNotifications={() => setIsNotificationCenterOpen(true)}
        unreadNotificationCount={unreadNotificationCount}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleUserSignOut}
        isAuthenticated={currentUser !== null}
        onOpenProModal={() => setIsProModalOpen(true)}
      />

      {/* Pull down to refresh gesture wrapper */}
      <PullToRefresh onRefresh={handlePullRefresh} disabled={isAnyModalOpen}>

        {/* Main Content View Switcher */}
        <main key={language} className="flex-1 pb-28 lg:pb-12">
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>

          {/* VIEW 1: HOME */}
          {currentTab === 'home' && (
            <div key="home" className="animate-fade-in">
              <HeroSection
                activeTrip={activeTrip}
                onQuickPlan={(params) => {
                  handleOpenPlannerWithPrefill(params);
                }}
                onExplore={() => handleNavigateTab('explore')}
                onOpenPlanner={(params) => handleOpenPlannerWithPrefill(params)}
                onSelectDestination={(dest) => setSelectedDestinationForDetails(dest)}
              />

              {/* Official Public Release 2.0 Spotlight & Viral Share */}
              <div className="hidden lg:block">
                <PublicLaunchSpotlight
                  onOpenPlanner={() => handleOpenPlannerWithPrefill()}
                  onExplore={() => handleNavigateTab('explore')}
                />
              </div>

              {/* Brand 5 Feature Pillars */}
              <FeaturePillars />

              {/* Popular Destinations Showcase */}
              <PopularDestinations
                onSelectDestination={(dest) => {
                  setSelectedDestinationForDetails(dest);
                }}
                onPlanTripForDestination={(destName) => {
                  handleOpenPlannerWithPrefill({
                    destination: destName
                  });
                }}
                savedItemIds={savedItemIds}
                onToggleSaved={handleToggleSaved}
                onViewAllExplore={() => handleNavigateTab('explore')}
              />

              {/* Semantic SEO Authority Hub: Trip Planning Guide, Popular Trip Routes & FAQ */}
              <section
                aria-labelledby="seo-trip-guide-heading"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4"
              >
                <div className="rounded-3xl bg-white/85 dark:bg-slate-900/75 border border-[#E2EBE1] dark:border-slate-800/80 p-6 sm:p-8 shadow-2xs">
                  <div className="max-w-3xl">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#15803D] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/40 mb-3">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Trip Planner &amp; Global Travel Directory
                    </span>
                    <h2
                      id="seo-trip-guide-heading"
                      className="text-xl sm:text-2xl font-display font-extrabold text-[#152A1C] dark:text-white tracking-tight"
                    >
                      Plan Any Trip to Any Destination on Earth — 195+ Countries, Cities, Islands &amp; Hidden Towns
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-[#4A6352] dark:text-slate-300 leading-relaxed">
                      Your destination can be <strong>anywhere in the world</strong>. Whether you are searching for a quick weekend <strong>trip</strong>, a scenic highway <strong>road trip</strong>, an alpine village in Europe, a tropical island in Southeast Asia, or a hidden mountain hamlet, <strong>TripVerse</strong> resolves live coordinates, encyclopedic sights, authentic photography, weather forecasts, and multi-currency group expense splitting for every corner of the planet.
                    </p>
                  </div>

                  {/* Quick Crawl & User Links for Top Global & Indian Trip Destinations + Universal Custom Destination Pill */}
                  <div className="mt-6 pt-5 border-t border-[#E8EFE7] dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#2D5A3D] dark:text-emerald-400">
                        Worldwide &amp; Regional Trip Guides (Or Search Any Place on Earth)
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsGlobalSearchOpen(true)}
                        className="text-xs font-bold text-[#15803D] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Search Any Global Destination (⌘K)</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_DESTINATIONS.slice(0, 20).map((dest) => (
                        <a
                          key={dest.id}
                          href={`/destination/${dest.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedDestinationForDetails(dest);
                          }}
                          className="text-xs font-semibold text-[#152A1C] dark:text-slate-200 bg-[#F4F7F3] dark:bg-slate-800/80 hover:bg-[#EAF0E9] dark:hover:bg-emerald-950/60 hover:text-[#15803D] dark:hover:text-emerald-300 px-3 py-1.5 rounded-xl border border-[#DCE7DB] dark:border-slate-700/70 transition-colors"
                        >
                          {dest.name} Trip
                        </a>
                      ))}
                      {['Reykjavik', 'Queenstown', 'Interlaken', 'Amalfi Coast', 'Machu Picchu', 'Banff', 'Santorini', 'Petra'].map((worldPlace) => (
                        <a
                          key={worldPlace}
                          href={`/destination/${worldPlace.toLowerCase().replace(/\s+/g, '-')}`}
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedDestinationForDetails(synthesizeDestination(worldPlace));
                          }}
                          className="text-xs font-semibold text-[#152A1C] dark:text-slate-200 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/60 hover:text-[#15803D] dark:hover:text-emerald-300 px-3 py-1.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 transition-colors"
                        >
                          {worldPlace} Trip
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* FAQ Accordion for High-Intent "Trip" Search Queries */}
                  <div className="mt-6 pt-5 border-t border-[#E8EFE7] dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <details className="group rounded-2xl bg-[#F8FAF7] dark:bg-slate-800/50 border border-[#E2EBE1] dark:border-slate-800 px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-xs sm:text-sm font-bold text-[#152A1C] dark:text-white [&::-webkit-details-marker]:hidden">
                        <span>How do I plan a trip for free with TripVerse AI?</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 shrink-0 ml-2" />
                      </summary>
                      <p className="mt-2 text-xs text-[#4A6352] dark:text-slate-300 leading-relaxed">
                        Enter your starting city, destination, trip duration, travel companions, and budget in the TripVerse AI Trip Planner. Within seconds, TripVerse generates a personalized day-by-day trip itinerary with verified sightseeing times, ticket costs, hotel areas, and route maps.
                      </p>
                    </details>

                    <details className="group rounded-2xl bg-[#F8FAF7] dark:bg-slate-800/50 border border-[#E2EBE1] dark:border-slate-800 px-4 py-3">
                      <summary className="flex cursor-pointer list-none items-center justify-between text-xs sm:text-sm font-bold text-[#152A1C] dark:text-white [&::-webkit-details-marker]:hidden">
                        <span>What makes TripVerse the best road trip planner?</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 shrink-0 ml-2" />
                      </summary>
                      <p className="mt-2 text-xs text-[#4A6352] dark:text-slate-300 leading-relaxed">
                        Unlike generic travel blogs, TripVerse calculates real driving routes between your origin and destination, automatically discovering highway rest stops, scenic viewpoints, EV charging stations, fuel pumps, and family dining along the way.
                      </p>
                    </details>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* VIEW 2: TRIP DETAILS & COMPLETE ITINERARY */}
          {currentTab === 'trip-detail' && activeTrip && (
            <div key="trip-detail" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">

              {/* Desktop Back & AI Assistant Top Bar */}
              <div className="hidden lg:flex items-center justify-between">
                <button
                  onClick={() => handleNavigateTab('trips')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <span>← {t('itinerary.backToTrips')}</span>
                </button>

                <button
                  onClick={() => handleOpenAIChat()}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A3D] bg-[#EAF0E9] px-3 py-1.5 rounded-full border border-[#8EA78D]/40 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('itinerary.aiAssistantAvailable')}</span>
                </button>
              </div>

              {/* Screen 2: Dedicated Mobile Top Bar (Back, "Your Itinerary", Bookmark, Menu) */}
              <div className="flex lg:hidden items-center justify-between pt-1 pb-1">
                <button
                  type="button"
                  onClick={() => handleNavigateTab('trips')}
                  className="w-10 h-10 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] flex items-center justify-center shadow-2xs hover:bg-[#F8FAF7] active:scale-95 transition-all cursor-pointer"
                  title="Back"
                  aria-label="Back to trips"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <h1 className="text-base font-display font-bold text-[#152A1C] text-center">
                  {t('itinerary.yourItinerary')}
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
                onOpenChat={() => handleOpenAIChat()}
                onOpenShare={() => setIsShareModalOpen(true)}
                onOptimizeBudget={() => handleSelectTripSubTab('budget', { forceScroll: true })}
                onExportTrip={handleExportTrip}
                onOpenLiveNav={() => setIsLiveNavOpen(true)}
                onNavigateToRoute={() => {
                  if (tripSubTab === 'route') {
                    setIsLiveNavOpen(true);
                  } else {
                    handleSelectTripSubTab('route', { scrollTargetId: 'smart-route-map', forceScroll: true });
                  }
                }}
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
                onOpenSafety={() => handleSelectTripSubTab('safety', { forceScroll: true })}
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
                  <div ref={tripSubSectionRef} id="trip-detail-output" className="space-y-3 scroll-mt-20 sm:scroll-mt-24">
                    {/* Screen 2: Mobile Sub-Navigation Bar with Route Map & Scam Radar */}
                    <div className="lg:hidden flex items-center gap-1 p-1 rounded-full bg-[#E8EFE7] border border-[#DCE7DB] shadow-2xs overflow-x-auto scrollbar-none">
                      {[
                        { id: 'itinerary', label: 'Itinerary' },
                        { id: 'route', label: 'Route' },
                        { id: 'safety', label: 'Scam Radar' },
                        { id: 'deals', label: 'Transport' },
                        { id: 'hub', label: 'Stay' },
                        { id: 'gems', label: 'Places' }
                      ].map(tab => {
                        const isActive = tripSubTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              handleSelectTripSubTab(tab.id as any);
                            }}
                            className={`flex-shrink-0 py-2 px-3 rounded-full text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer whitespace-nowrap ${
                              isActive
                                ? 'bg-[#2D5A3D] text-white shadow-xs'
                                : 'text-[#57685D] hover:text-[#152A1C]'
                            }`}
                          >
                            {t(tab.label)}
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
                                handleSelectTripSubTab(group.subTabs[0].id as any);
                              }}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${isGroupActive
                                  ? 'bg-[#2D5A3D] text-white shadow-xs scale-[1.02]'
                                  : 'bg-white text-[#5A7362] border border-[#E2EBE1] hover:border-[#8EA78D] hover:bg-[#F8FAF7]'
                                }`}
                            >
                              <GroupIcon className={`w-4 h-4 ${isGroupActive ? 'text-white' : 'text-[#8EA78D]'}`} />
                              <span>{t(group.label)}</span>
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
                                  handleSelectTripSubTab(sub.id as any);
                                }}
                                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSubActive
                                    ? 'bg-[#2D5A3D] text-white shadow-xs'
                                    : 'bg-[#E8EFE7] hover:bg-[#dce7db] text-[#2D5A3D]'
                                  }`}
                              >
                                <SubIcon className="w-3.5 h-3.5" />
                                <span>{t(sub.label)}</span>
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
                  destination={activeTrip.destination}
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
                  onOptimizeWithAI={() => handleSelectTripSubTab('hub', { forceScroll: true })}
                  onClearDay={handleClearDay}
                  onAddDay={handleAddDay}
                  onDeleteDay={handleDeleteDay}
                  onQuickAddSight={handleQuickAddSight}
                />
              )}

              {/* Sub-Tab: Digital Passes & Hub (Reference Screen 3) */}
              {tripSubTab === 'hub' && (
                <TripPassesHubView
                  trip={activeTrip}
                  onBack={() => handleSelectTripSubTab('itinerary')}
                  onOpenBookingModal={() => setIsBookingModalOpen(true)}
                  onOpenPacking={() => handleSelectTripSubTab('packing')}
                  onExportTrip={handleExportTrip}
                  onOpenShare={() => setIsShareModalOpen(true)}
                  onOpenNotifications={() => setIsNotificationCenterOpen(true)}
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
                    <p className="text-sm font-bold text-slate-700">{t('Loading route map…')}</p>
                    <p className="text-xs text-slate-400">{t('Preparing route geometry and nearby place listings')}</p>
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
                        <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">{t('Route-based listings')}</span>
                        <h2 className="text-xl font-bold text-[#0B2545]">{t('Highway Break Stops & Waypoints')}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {t('Geoapify place listings based on OpenStreetMap data near the driving route. Facilities, opening hours, and current availability are not confirmed.')}
                        </p>
                      </div>

                      <span className="text-xs font-bold text-[#2D5A3D] bg-[#EAF0E9] px-3 py-1.5 rounded-full border border-[#8EA78D]/40 self-start sm:self-auto">
                        {activeTrip.breakStops.length} {t('mapped listings')}
                      </span>
                    </div>

                    {activeTrip.travelDataStatus === 'loading' && (
                      <p className="mb-4 text-sm text-slate-600" role="status">{t('Loading a driving route and nearby OpenStreetMap listings via Geoapify…')}</p>
                    )}
                    {activeTrip.travelDataStatus === 'estimate' && (
                      <p className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3" role="status">
                        {t('Live route and place data is unavailable. The route and schedule are estimates; no pitstops or facilities are verified.')}
                        {activeTrip.travelDataError === 'ORIGIN_NOT_SET' && (' ' + t('Allow location access or enter a starting city in the full trip planner to request a live route.'))}
                        {activeTrip.travelDataError === 'GEOAPIFY_API_KEY_NOT_CONFIGURED' && (' ' + t('The server Geoapify API key is not configured. Set GEOAPIFY_API_KEY in Vercel Production.'))}
                        {activeTrip.travelDataError === 'GEOAPIFY_API_KEY_REJECTED' && (' ' + t('Geoapify rejected the server key. Check the key and plan limits in Geoapify.'))}
                        {activeTrip.travelDataError === 'GEOAPIFY_LOCATION_NOT_FOUND' && (' ' + t('Geoapify could not resolve the origin or destination. Try a more specific location.'))}
                        {' '}<button
                          type="button"
                          onClick={retryActiveTripRoute}
                          className="ml-1 font-bold underline decoration-amber-700 underline-offset-2 hover:text-amber-950"
                        >
                          {t('Retry live route')}
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
                              <span className="block text-sm font-bold text-[#0B2545]">{t(section.title)}</span>
                              <span className="mt-1 block text-xs text-slate-500">{t(section.detail)}</span>
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
                <SafetyEmergency destination={activeTrip?.destination} />
              )}

            </div>
          )}

          {/* VIEW 2 EMPTY STATE: When trip-detail is opened but user has no active trip */}
          {currentTab === 'trip-detail' && !activeTrip && (
            <div key="trip-detail-empty" className="max-w-xl mx-auto px-4 py-20 text-center animate-fade-in">
              <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-5 text-slate-400 border border-slate-200 shadow-sm">
                <Compass className="w-8 h-8 text-[#2D5A3D]" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">{t('No Trip Selected')}</h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                {t('No itinerary is currently active. Create your first journey with our AI Trip Planner or select an existing trip from your trips library.')}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenPlannerWithPrefill()}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold bg-[#2D5A3D] text-white hover:bg-[#244931] transition-colors flex items-center justify-center gap-2 text-sm shadow-md shadow-[#2D5A3D]/20"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('Create New Trip')}
                </button>
                <button
                  onClick={() => handleNavigateTab('trips')}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm"
                >
                  {t('View My Trips')}
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
                      onClick={() => handleSelectTripsViewMode('passes')}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        tripsViewMode === 'passes'
                          ? 'bg-[#2D5A3D] text-white shadow-xs'
                          : 'text-[#5A7362] hover:text-[#152A1C] hover:bg-[#F8FAF7]'
                      }`}
                    >
                      {t('Digital Pass & Hub')}
                    </button>
                    <button
                      onClick={() => handleSelectTripsViewMode('portfolio')}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        tripsViewMode === 'portfolio'
                          ? 'bg-[#2D5A3D] text-white shadow-xs'
                          : 'text-[#5A7362] hover:text-[#152A1C] hover:bg-[#F8FAF7]'
                      }`}
                    >
                      {t('All Saved Trips')} ({trips.length})
                    </button>
                  </div>
                </div>
              )}

              {activeTrip && tripsViewMode === 'passes' ? (
                <TripPassesHubView
                  trip={activeTrip}
                  onBack={() => handleSelectTripsViewMode('portfolio')}
                  onOpenBookingModal={() => setIsBookingModalOpen(true)}
                  onOpenPacking={() => {
                    handleNavigateTab('trip-detail');
                    handleSelectTripSubTab('packing', { forceScroll: true });
                  }}
                  onExportTrip={handleExportTrip}
                  onOpenShare={() => setIsShareModalOpen(true)}
                  onOpenNotifications={() => setIsNotificationCenterOpen(true)}
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
                onSignOut={handleUserSignOut}
                onOpenLegal={(tab) => setLegalModalState({ isOpen: true, tab })}
                onOpenProModal={() => setIsProModalOpen(true)}
              />
            </div>
          )}

          </Suspense>
        </main>

        {/* Modern Footer */}
        <footer className="bg-white dark:bg-[#070C16] border-t border-[#E2EBE1] dark:border-slate-800 py-8 lg:py-10 mt-auto pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-10 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left lg:max-w-[50%]">
              <Logo size="adaptive" showTagline={false} />
              <span className="hidden sm:inline text-[#DCE7DB] dark:text-slate-700">|</span>
              <span className="text-xs font-semibold text-[#5A7362] dark:text-slate-400">
                {t('"TripVerse plans the journey, not just the destination."')}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-[#5A7362] dark:text-slate-400">
              <button onClick={() => setIsOnboardingOpen(true)} className="hover:text-[#2D5A3D] dark:hover:text-emerald-400 transition-colors cursor-pointer">{t('Interactive Tour')}</button>
              <button onClick={() => handleNavigateTab('explore')} className="hover:text-[#2D5A3D] dark:hover:text-emerald-400 transition-colors cursor-pointer">{t('Destinations')}</button>
              <button onClick={() => handleOpenPlannerWithPrefill()} className="hover:text-[#2D5A3D] dark:hover:text-emerald-400 transition-colors cursor-pointer">{t('AI Engine')}</button>
              <button onClick={() => handleNavigateTab('trips')} className="hover:text-[#2D5A3D] dark:hover:text-emerald-400 transition-colors cursor-pointer">{t('My Routes')}</button>
              <span className="text-[#DCE7DB] dark:text-slate-700">|</span>
              <button onClick={() => setLegalModalState({ isOpen: true, tab: 'privacy' })} className="hover:text-[#2D5A3D] dark:hover:text-emerald-400 transition-colors cursor-pointer">{t('Privacy')}</button>
              <button onClick={() => setLegalModalState({ isOpen: true, tab: 'terms' })} className="hover:text-[#2D5A3D] dark:hover:text-emerald-400 transition-colors cursor-pointer">{t('Terms')}</button>
              <button onClick={() => setLegalModalState({ isOpen: true, tab: 'advisory' })} className="hover:text-[#2D5A3D] dark:hover:text-emerald-400 transition-colors cursor-pointer">{t('Advisory')}</button>
              <button onClick={() => setLegalModalState({ isOpen: true, tab: 'feedback' })} className="text-[#2D5A3D] dark:text-emerald-300 hover:text-[#1E3E2B] dark:hover:text-emerald-200 bg-[#EAF0E9] dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-[#DCE7DB] dark:border-emerald-800/40 transition-colors cursor-pointer font-bold">{t('Feedback')}</button>
              <span className="text-[#7A9382] dark:text-slate-500" translate="no" data-no-translate="true">© 2026 TripVerse</span>
            </div>
          </div>
        </footer>

      </PullToRefresh>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onNavigate={handleNavigateTab}
        onOpenPlanner={() => handleOpenPlannerWithPrefill()}
        unreadNotificationCount={unreadNotificationCount}
      />

      {/* Modals and Drawers with Code-Splitting Suspense Fallback */}
      <Suspense fallback={<ModalSkeleton />}>
        {isGuestPlannerRestrictedOpen && (
          <GuestPlannerRestrictedModal
            isOpen={isGuestPlannerRestrictedOpen}
            onClose={() => {
              setIsGuestPlannerRestrictedOpen(false);
              setGuestRestrictedFeature(null);
            }}
            onOpenSignUp={() => {
              setIsGuestPlannerRestrictedOpen(false);
              setGuestRestrictedFeature(null);
              setAuthModalInitialMethod('email');
              setAuthModalInitialSubMode('signup');
              setIsAuthModalOpen(true);
            }}
            onOpenSignIn={() => {
              setIsGuestPlannerRestrictedOpen(false);
              setGuestRestrictedFeature(null);
              setAuthModalInitialMethod('email');
              setAuthModalInitialSubMode('login');
              setIsAuthModalOpen(true);
            }}
            prefilledDestination={plannerPrefill.destination}
            featureTitle={guestRestrictedFeature?.featureTitle}
            featureDescription={guestRestrictedFeature?.featureDescription}
            featureButtonText={guestRestrictedFeature?.featureButtonText}
          />
        )}

        {isPlannerOpen && (
          <PlannerWizard
            currentUser={currentUser}
            initialDestination={plannerPrefill.destination}
            initialDuration={plannerPrefill.duration}
            initialTravelers={plannerPrefill.travelers}
            initialBudget={plannerPrefill.budget}
            initialBudgetMode={plannerPrefill.budgetMode}
            onClose={() => setIsPlannerOpen(false)}
            onTripGenerated={handleTripGenerated}
            onOpenProModal={() => {
              setIsPlannerOpen(false);
              setIsProModalOpen(true);
            }}
            onOpenAuthModal={() => {
              setIsPlannerOpen(false);
              setAuthModalInitialMethod('google');
              setAuthModalInitialSubMode('signup');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {isAIChatOpen && (
          <AIChatDrawer
            trip={activeTrip || trips[0] || DISCOVERY_FALLBACK_TRIP}
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
            onNavigateToPasses={() => {
              handleNavigateTab('trip-detail');
              handleSelectTripSubTab('hub', { forceScroll: true });
              setIsBookingModalOpen(false);
            }}
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
            onNavigateToPasses={() => {
              handleNavigateTab('trip-detail');
              handleSelectTripSubTab('hub', { forceScroll: true });
              setIsBestDealModalOpen(false);
            }}
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
              if (currentTab !== 'trip-detail') {
                setCurrentTab('trip-detail');
              }
              handleSelectTripSubTab('route', { scrollTargetId: 'smart-route-map', forceScroll: true });
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

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          initialMethod={authModalInitialMethod}
          initialSubMode={authModalInitialSubMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={(updated) => {
            const activeUser = getCurrentUser();
            setCurrentUser(activeUser);
            setUserProfile(updated);
            saveUserProfile(updated, activeUser?.uid);
          }}
        />
      )}

      {isResetPasswordModalOpen && (
        <ResetPasswordModal
          isOpen={isResetPasswordModalOpen}
          onClose={() => setIsResetPasswordModalOpen(false)}
          onSuccess={() => {
            const activeUser = getCurrentUser();
            setCurrentUser(activeUser);
            if (activeUser) {
              setUserProfile(toUserProfile(activeUser));
            }
            setIsResetPasswordModalOpen(false);
          }}
        />
      )}

      {/* Add/Edit Activity Modal */}
      {activeTrip && (
        <ActivityModal
          isOpen={activityModalState.isOpen}
          onClose={() => setActivityModalState(prev => ({ ...prev, isOpen: false, activity: null }))}
          dayNumber={activityModalState.dayNumber}
          existingActivity={activityModalState.activity}
          destination={activeTrip.destination}
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
          handleOpenAIChat();
        }}
        onNavigateTab={handleNavigateTab}
      />

      {/* Autonomous AI Co-Pilot Floating Mascot Widget (ConCode AI) */}
      <ArgonFloatingWidget
        onOpenChat={() => handleOpenAIChat()}
        onOpenChatWithQuery={(query) => handleOpenAIChat(query)}
        isChatOpen={isAIChatOpen}
        destinationName={currentTab === 'trip-detail' && activeTrip ? activeTrip.destination : undefined}
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
        title={
          currentUser && !isGuestUser(currentUser) && !getUserSubscriptionQuota(currentUser).canCreateTrip
            ? "You've Completed Your 3 Free Trip Plans"
            : 'Travel Without Limits with'
        }
        subtitle={
          currentUser && !isGuestUser(currentUser) && !getUserSubscriptionQuota(currentUser).canCreateTrip
            ? 'Upgrade to TripVerse Pro for unlimited AI-powered trip planning, offline itineraries, and priority travel intelligence.'
            : 'Unlock unlimited AI itineraries, real-time monsoon detours, and a dedicated 30h/week AI travel co-pilot.'
        }
        onClose={() => setIsProModalOpen(false)}
        onSubscribed={() => {
          const updated = getCurrentUser();
          setCurrentUser(updated);
          if (updated) {
            setUserProfile(toUserProfile(updated));
          }
        }}
      />

    </div>
  );
}

export default App;
