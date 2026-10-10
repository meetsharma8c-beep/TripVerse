export type DisruptionType = 
  | 'flight_cancellation' 
  | 'train_cancellation' 
  | 'weather_alert' 
  | 'natural_disaster' 
  | 'personal_emergency' 
  | 'official_change';

export interface DisruptionAlert {
  id: string;
  tripId: string;
  type: DisruptionType;
  title: string;
  details: string;
  carrierOrSource?: string;
  flightOrTrainNumber?: string;
  affectedDestination: string;
  severity: 'warning' | 'caution' | 'critical';
  timestamp: string;
}

export interface EmergencyStay {
  id: string;
  name: string;
  type: 'hotel' | 'homestay' | 'airport_transit' | 'resort';
  distanceKm: number;
  rating?: number;
  reviewCount?: number;
  pricePerNight?: number;
  amenities: string[];
  image: string;
  address: string;
  contactPhone: string;
  verifiedSafe: boolean;
  bookingStatus?: 'available' | 'booked';
}

export interface RefundGuidance {
  claimSteps: string[];
}

export interface ReplanOption {
  id: string;
  type: 'alternate_dates' | 'new_destination';
  title: string;
  destination: string;
  datesLabel: string;
  durationDays: number;
  estimatedCost: number;
  costDelta: number; // positive = more expensive, negative = savings
  recommendationReason: string;
  weatherCondition: string;
  image: string;
  highlights: string[];
  isRecommended?: boolean;
}
