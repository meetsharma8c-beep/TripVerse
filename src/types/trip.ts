import type { Hotel } from '../services/hotelService';

export type TravelerType = 'solo' | 'couple' | 'friends' | 'family' | 'business';

export type TransportMode = 'car' | 'bike' | 'bus' | 'train' | 'flight' | 'public' | 'any';

export type AccommodationType = 'hostel' | 'budget' | '3star' | '4star' | '5star' | 'homestay' | 'any';

export type FoodPreference = 'veg' | 'nonveg' | 'vegan' | 'local' | 'street' | 'restaurant' | 'any';

export type TravelPreference = 
  | 'adventure' 
  | 'nature' 
  | 'culture' 
  | 'food' 
  | 'shopping' 
  | 'nightlife' 
  | 'relaxation' 
  | 'historical' 
  | 'photography' 
  | 'spiritual' 
  | 'luxury' 
  | 'budget'
  | 'beach';

export type Priority = 'budget' | 'time' | 'comfort' | 'experience';

export type RouteType = 'fastest' | 'cheapest' | 'comfortable' | 'scenic';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type BreakStopSection = 'amenities' | 'fuel' | 'ev_charging' | 'medical';

export interface BreakStop {
  id: string;
  source?: 'geoapify_places' | 'user';
  mapUrl?: string;
  section?: BreakStopSection;
  name: string;
  category: 'highway_food_court' | 'dhaba' | 'scenic_rest_stop' | 'fuel_plaza';
  rating?: number;
  reviewCount?: number;
  detourDistanceKm: number;
  distanceFromStartKm: number;
  foodAvailable?: boolean;
  washroomAvailable?: boolean;
  parkingAvailable?: boolean;
  restAreaAvailable?: boolean;
  fuelStationAvailable?: boolean;
  evChargingAvailable?: boolean;
  medicalFacilityAvailable?: boolean;
  openingHours: string;
  estimatedStopMinutes: number;
  image: string;
  description: string;
  recommendationReason: string;
  coordinates: Coordinates;
  addedToTrip?: boolean;
}

export interface ItineraryActivity {
  id: string;
  source?: 'geoapify_places';
  mapUrl?: string;
  dayNumber: number;
  time: string;
  title: string;
  type: 'departure' | 'breakstop' | 'arrival' | 'hotel' | 'food' | 'attraction' | 'viewpoint' | 'nightlife' | 'rest';
  location: string;
  estimatedCost: number;
  travelTimeMin: number;
  distanceKm: number;
  description: string;
  coordinates: Coordinates;
  tag?: string;
  completed?: boolean;
  notes?: string;
  isCustom?: boolean;
}

export interface DayPlan {
  dayNumber: number;
  title: string;
  theme: string;
  activities: ItineraryActivity[];
  dayEstimatedCost: number;
}

export interface BudgetBreakdown {
  transportation: number;
  accommodation: number;
  food: number;
  activities: number;
  miscellaneous: number;
}

export interface Trip {
  id: string;
  name: string;
  origin: string;
  originCoordinates?: Coordinates;
  destination: string;
  destinationDetails?: {
    image: string;
    state: string;
    description: string;
    coordinates?: Coordinates;
    category?: string;
    preciseSpot?: boolean;
    spotType?: string;
    highlights?: string[];
  };
  durationDays: number;
  travelersCount: number;
  travelerType: TravelerType;
  totalBudget: number;
  budgetPerPerson: number;
  preferences: TravelPreference[];
  transportMode: TransportMode;
  accommodationType: AccommodationType;
  foodPreference: FoodPreference;
  priorities: Priority[];
  itinerary: DayPlan[];
  breakStops: BreakStop[];
  budgetBreakdown: BudgetBreakdown;
  estimatedTotal: number;
  routeType: RouteType;
  status: 'upcoming' | 'ongoing' | 'completed' | 'draft';
  createdAt: string;
  startDate?: string;
  aiRationale?: string;
  bestTransportDeal?: TransportDeal;
  transportDeals?: TransportDeal[];
  selectedHotel?: Hotel;
  hotelOptions?: Hotel[];
  pacing?: 'relaxed' | 'balanced' | 'fast_paced';
  routeDetails?: {
    distanceKm: number;
    durationHours: number;
    source?: 'geoapify_routing' | 'estimate';
    encodedPolyline?: string;
    origin?: string;
    destination?: string;
    originCoordinates?: Coordinates;
    destinationCoordinates?: Coordinates;
  };
  travelDataStatus?: 'pending' | 'loading' | 'live' | 'estimate' | 'not_applicable';
  travelDataError?: 'GEOAPIFY_API_KEY_NOT_CONFIGURED' | 'GEOAPIFY_API_KEY_REJECTED' | 'GEOAPIFY_LOCATION_NOT_FOUND' | 'GEOAPIFY_TRAVEL_DATA_UNAVAILABLE' | 'ORIGIN_NOT_SET';
  travelDataWarnings?: BreakStopSection[];
  photos?: TripPhotoMemory[];
  review?: TripReview;
  isUserCreated?: boolean;
  isSample?: boolean;
  userId?: string;
  expenses?: ExpenseItem[];
  packingList?: PackingItem[];
  collaboration?: CollaborationSession;
}

export interface TripPhotoMemory {
  id: string;
  tripId: string;
  dayNumber?: number;
  activityId?: string;
  url: string;
  caption: string;
  takenAt: string;
  location?: string;
  tags?: string[];
  featured?: boolean;
}

export interface TripReview {
  id: string;
  tripId: string;
  rating: number; // 1 to 5
  overallExperience: 'exceptional' | 'delightful' | 'average' | 'challenging';
  highlights: string[];
  wouldRecommend: boolean;
  budgetVerdict: 'under_budget' | 'on_budget' | 'over_budget';
  notes: string;
  reviewedAt: string;
  favoriteSpot?: string;
}

export interface TransportDeal {
  id: string;
  mode: TransportMode;
  provider: string;
  providerLogo?: string;
  title: string;
  subtitle: string;
  badge: string; // e.g., "AI Best Recommendation", "Fastest", "Cheapest", "Premium Comfort"
  isBestDeal: boolean;
  route: {
    from: string;
    to: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    stopsText: string;
  };
  originalPrice: number;
  dealPrice: number;
  discountPercent: number;
  savingsAmount: number;
  priceUnit: 'per_person' | 'total' | 'per_day';
  rating: number;
  reviewCount: number;
  features: string[];
  couponCode?: string;
  urgencyText?: string;
  bookingUrl?: string;
  termsAndConditions?: string;
  expiryDate?: string;
  partnerVerified?: boolean;
  minBookingAmount?: number;
  vehicleDetails?: {
    model?: string;
    type?: string;
    seats?: number;
    fuelType?: string;
    transmission?: string;
    luggage?: string;
  };
}

export interface Destination {
  id: string;
  name: string;
  state: string;
  category: 'heritage' | 'mountain' | 'beach' | 'spiritual' | 'adventure' | 'weekend' | 'roadtrip' | 'nature';
  tagline: string;
  description: string;
  image: string;
  startBudget: number;
  rating: number;
  recommendedDuration: string;
  bestTime: string;
  popularActivities: string[];
  coordinates: Coordinates;
}


export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'JPY';

export interface UserProfile {
  name: string;
  age: number;
  occupation: string;
  location: string;
  email: string;
  phoneNumber?: string;
  avatar: string;
  travelerStyle: string;
  travelStyleTag: string;
  budgetPreference: string;
  foodPreference: string;
  accommodationPreference: string;
  savedPlaceIds: string[];
  tripsCount: number;
  preferredCurrency?: CurrencyCode;
}

export interface StructuredItineraryDay {
  dayNumber: number;
  title: string;
  theme?: string;
  morning: string;
  afternoon: string;
  evening: string;
  food: string;
  cost: number;
}

export interface StructuredItinerary {
  destination: string;
  durationDays: number;
  targetBudget?: number;
  totalCost?: number;
  currencySymbol?: string;
  days: StructuredItineraryDay[];
}

export interface AIChatBudgetBreakdown {
  total: number;
  transport: number;
  stays: number;
  food: number;
  activities: number;
  buffer: number;
  isEstimate: boolean;
  currencySymbol: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  engine?: 'concode_brain' | 'offline';
  guild?: string;
  guildIcon?: string;
  confidence?: number;
  actionButtons?: {
    label: string;
    action: string;
    payload?: any;
    primary?: boolean;
  }[];
  structuredItinerary?: StructuredItinerary;
  budgetBreakdown?: AIChatBudgetBreakdown;
  modificationBadge?: {
    type: 'cheaper' | 'removed' | 'added' | 'rainy' | 'saved';
    label: string;
    detail: string;
  };
}

export type NavigationManeuver = 
  | 'straight' 
  | 'turn-left' 
  | 'turn-right' 
  | 'fork-left' 
  | 'fork-right' 
  | 'exit-left' 
  | 'exit-right' 
  | 'merge' 
  | 'uturn' 
  | 'arrive' 
  | 'breakstop';

export interface NavigationStep {
  id: string;
  title: string;
  instruction: string;
  detail: string;
  distanceKm: number;
  durationMin: number;
  maneuver: NavigationManeuver;
  coordinates: Coordinates;
  isPassed?: boolean;
  landmark?: string;
  alert?: string;
  pitstopId?: string;
  speedLimitKmh?: number;
}

export interface LiveTrackingState {
  isActive: boolean;
  isSimulating: boolean;
  simulationSpeed: number; // 1, 5, 15
  currentCoord: Coordinates;
  speedKmh: number;
  headingDeg: number;
  currentStepIndex: number;
  distanceTraveledKm: number;
  remainingDistanceKm: number;
  remainingDurationMin: number;
  voiceEnabled: boolean;
  eta: string;
  isTrackingGps: boolean;
}

// ----------------------
// 1. SMART PACKING & WEATHER
// ----------------------
export type PackingCategory = 'essentials' | 'clothing' | 'electronics' | 'firstaid' | 'toiletries' | 'documents';

export interface PackingItem {
  id: string;
  name: string;
  category: PackingCategory;
  isPacked: boolean;
  isCustom?: boolean;
  note?: string;
  quantity?: number;
}

export interface WeatherDay {
  dayNumber: number;
  date: string;
  tempC: number;
  minTempC: number;
  maxTempC: number;
  condition: string;
  icon: string;
  rainProbPercent: number;
  humidityPercent: number;
  windKmh: number;
  uvi: number;
  aqi: number;
  clothingTip: string;
  alert?: string;
}

export interface WeatherForecast {
  destination: string;
  currentTempC: number;
  currentCondition: string;
  forecastDays: WeatherDay[];
  roadConditionAdvisory: {
    level: 'normal' | 'caution' | 'warning';
    title: string;
    details: string;
    tips: string[];
  };
  isLive?: boolean;
  source?: string;
  lastUpdated?: string;
}

// ----------------------
// 2. EXPENSES & FUEL/TOLL
// ----------------------
export type ExpenseCategory = 'fuel' | 'food' | 'stay' | 'toll' | 'activity' | 'shopping' | 'other';

export interface ExpenseItem {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: string; // Traveler name
  splitAmong: string[]; // Traveler names
  date: string;
  time?: string;
  notes?: string;
}

export interface SettlementTransaction {
  from: string;
  to: string;
  amount: number;
}

export interface ExpenseSplitSummary {
  totalSpent: number;
  plannedBudget: number;
  perPersonBalances: Record<string, number>; // positive = receives, negative = owes
  settlements: SettlementTransaction[];
}

export type VehicleType = 'petrol_hatchback' | 'diesel_suv' | 'ev' | 'bike';

export interface VehicleConfig {
  type: VehicleType;
  label: string;
  icon: string;
  defaultMileage: number; // km/l or km/charge
  fuelRate: number; // ₹ per liter or ₹ per kWh
  fuelUnit: string;
}

export interface VehicleFuelCalcResult {
  vehicleType: VehicleType;
  totalDistanceKm: number;
  mileage: number;
  fuelRate: number;
  fuelNeeded: number;
  estimatedFuelCost: number;
  estimatedTollCost: number;
  totalTransitCost: number;
  costPerPerson: number;
}

// ----------------------
// 3. LOCAL GEMS & FOOD TRAILS
// ----------------------
export interface LocalFoodGem {
  id: string;
  name: string;
  dish: string;
  category: 'street_food' | 'heritage_dhaba' | 'sweet_shop' | 'rooftop_cafe';
  location: string;
  pricePerPerson: number;
  rating: number;
  isVegetarian: boolean;
  image: string;
  bestTimeToVisit: string;
  whySpecial: string;
  mustTry: string;
  coordinates?: Coordinates;
}

export interface HiddenGem {
  id: string;
  title: string;
  category: 'secret_viewpoint' | 'artisan_village' | 'ancient_stepwell' | 'offbeat_temple' | 'nature_walk';
  location: string;
  rating: number;
  crowdLevel: 'very_low' | 'moderate' | 'peaceful';
  image: string;
  bestTimeOfDay: string;
  description: string;
  insiderTip: string;
  coordinates?: Coordinates;
}

// ----------------------
// 4. REAL-TIME GROUP COLLABORATION
// ----------------------
export interface TripCollaborator {
  id: string;
  name: string;
  avatar: string;
  email?: string;
  role: 'owner' | 'editor' | 'viewer';
  color: string;
  joinedAt: string;
  lastActiveAt: string;
  isOnline: boolean;
}

export interface ActivityVote {
  activityId: string;
  userId: string;
  userName: string;
  vote: 'up' | 'down';
  timestamp: string;
}

export interface GroupSuggestion {
  id: string;
  tripId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description: string;
  dayNumber: number;
  category: 'food' | 'spot' | 'activity' | 'stay';
  upvotes: string[]; // userIds
  downvotes: string[];
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface CollaborationSession {
  tripId: string;
  inviteCode: string; // e.g. "TRIP-8392"
  collaborators: TripCollaborator[];
  votes: Record<string, ActivityVote[]>; // activityId -> votes
  suggestions: GroupSuggestion[];
  updatedAt: string;
}
