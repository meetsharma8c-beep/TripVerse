import { Coordinates } from './trip';

// ==========================================
// 1. SPATIO-TEMPORAL TSP & QUEUE INVERSION
// ==========================================
export type QueueSlot = 'early_morning_low_crowd' | 'midday_timed_indoor' | 'afternoon_leisure' | 'evening_vibrant';

export interface TspOptimizationResult {
  originalDistanceKm: number;
  optimizedDistanceKm: number;
  savedDistanceKm: number;
  estimatedTransitTimeSavedMinutes: number;
  routePolygon: Coordinates[];
}

// ==========================================
// 2. CIRCADIAN RHYTHM & JET LAG PACING
// ==========================================
export interface CircadianPacingAdvice {
  originTimezone: string;
  destinationTimezone: string;
  deltaUtcHours: number;
  isSignificantShift: boolean;
  melatoninResetSlot: {
    startTime: string;
    endTime: string;
    activityType: 'outdoor_sunlight' | 'gentle_hydration' | 'early_rest';
    scientificRationale: string;
  };
  recommendedMaxStepsDay1: number;
  pacingWaveform: Array<{
    dayNumber: number;
    intensity: 'arrival_gentle' | 'expedition' | 'restorative' | 'peak_adventure';
    targetStepCount: number;
    rationale: string;
  }>;
}

// ==========================================
// 3. HYPER-LOCAL CULTURAL FRICTION ENGINE
// ==========================================
export interface CulturalInsight {
  id: string;
  category: 'payment_cash' | 'transit_etiquette' | 'dining_tipping' | 'sacred_spaces' | 'cultural_norm';
  title: string;
  detail: string;
  actionableTip: string;
  severity: 'must_know' | 'recommended' | 'insider_secret';
}

export interface ActivityCulturalTip {
  etiquette?: string;
  paymentAlert?: string;
  dressCode?: string;
  shoeProtocol?: 'shoes_on' | 'shoes_off_tatami' | 'temple_slippers';
  tippingRule?: 'strictly_no_tipping' | 'tipping_expected_15_20' | 'table_coperto_service_charge' | 'optional_round_up';
}

// ==========================================
// 4. DYNAMIC WEATHER-ADAPTIVE ACTIVITY
// ==========================================
export interface IndoorMirrorActivity {
  title: string;
  location: string;
  description: string;
  image: string;
  estimatedCost: number;
  coordinates: Coordinates;
  category: 'museum' | 'gallery' | 'indoor_market' | 'covered_arcade' | 'aquarium' | 'craft_workshop';
  whyMirror: string;
}

// ==========================================
// 5. MULTI-PERSONA PARETO FRONTIER BALANCING
// ==========================================
export interface ParallelGroupBranch {
  branchId: string;
  timeWindow: string; // e.g. "14:30 - 17:00"
  branchName: string;
  targetPersonas: string[]; // e.g. ["shopper", "luxury", "relaxed"]
  activityTitle: string;
  activityLocation: string;
  description: string;
  distanceToConvergenceMeters: number;
  convergenceAnchor: {
    time: string;
    venueName: string;
    type: 'izakaya' | 'café' | 'rooftop' | 'tea_house';
    instructions: string;
  };
}

// ==========================================
// 6. PPP & FINANCIAL MICRO-ECONOMICS
// ==========================================
export interface TransitPassRoi {
  passName: string;
  passCost: number;
  singleFaresTotalEstimate: number;
  netSavings: number;
  isRecommended: boolean;
  validityDuration: string;
  coverageAreas: string[];
  purchaseLocation: string;
}

export interface TaxFreeShoppingGuidance {
  minimumThresholdAmount: number;
  currency: string;
  refundPercentage: number;
  rules: string[];
  passportRequired: boolean;
  redemptionMethod: string;
}

// ==========================================
// 7. BORDER, VISA & TRANSIT TRAP SENTINEL
// ==========================================
export interface BorderSecuritySentinel {
  passportValidityRequiredMonths: number;
  isPassportBufferSufficient: boolean;
  transitVisaWarning?: {
    appliesToSelfTransfer: boolean;
    warningText: string;
    hubsRequiringClearance: string[];
  };
  mandatoryArrivalDeclarations: Array<{
    name: string;
    officialPortalName: string;
    submissionWindowHoursPrior: number;
    url: string;
    cost: string;
    mandatory: boolean;
  }>;
  currencyCustomsLimitDeclaration: string;
  medicationRestrictions: string[];
}
