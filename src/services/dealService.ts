import { TransportDeal, TransportMode, Priority } from '../types/trip';

export interface DealQueryParams {
  mode: TransportMode;
  origin: string;
  destination: string;
  durationDays: number;
  travelersCount: number;
  totalBudget: number;
  priorities?: Priority[];
}

/**
 * TripVerse has no live fare or inventory provider. Do not fabricate deals,
 * prices, schedules, coupons, or booking references.
 */
export function generateTransportDeals(_params: DealQueryParams): {
  bestDeal?: TransportDeal;
  allDeals: TransportDeal[];
} {
  return { allDeals: [] };
}

export function getDealsForMode(_mode: TransportMode, _params: DealQueryParams): TransportDeal[] {
  return [];
}
