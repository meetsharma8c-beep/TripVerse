import { BudgetBreakdown, Trip } from '../types/trip';
import { resolveApiUrl } from './deviceService';
import type { LiveMarketQuoteResult } from './liveMarketQuoteService';

export type BudgetProofStatus = 'PROVEN_SAT' | 'REBALANCE_AVAILABLE' | 'UNSAT_CONFLICT';

export interface FormalBudgetVerification {
  isSatisfiable: boolean;
  status: BudgetProofStatus;
  solverEngine: 'concode_apex_z3_smt' | 'concode_apex_deterministic_exact' | 'exact_linear_solver';
  currentSum: number;
  ceiling: number;
  /** ceiling - currentSum (negative means over budget) */
  delta: number;
  unsatCore: string[];
  witness: BudgetBreakdown;
  remediationGuidance: string;
  rTotal?: number;
}

export interface BudgetCategoryFloors {
  transport: number;
  accommodation: number;
  food: number;
  activities: number;
  buffer: number;
}

/**
 * Derive realistic non-negotiable floors for a trip's budget categories
 * (grounding against live market flight/hotel quotes when available).
 */
export function computeTripBudgetFloors(
  trip: Trip,
  liveQuotes?: LiveMarketQuoteResult | null
): BudgetCategoryFloors {
  const days = Math.max(1, trip.durationDays || 1);
  const nights = Math.max(1, days - 1);
  const travelers = Math.max(1, trip.travelersCount || 1);
  const b = trip.budgetBreakdown;

  const liveFlightFloor = liveQuotes?.flights?.bestOffer?.totalGroupAmount;
  const cheapestHotelNight = liveQuotes?.hotels?.[0]?.nightlyRatePerRoom ?? trip.selectedHotel?.nightlyRate;
  const liveHotelFloor = cheapestHotelNight ? Math.round(cheapestHotelNight * nights * Math.ceil(travelers / 2)) : 0;

  const transportFloor = liveFlightFloor
    ? Math.min(liveFlightFloor, Math.round((b?.transportation || liveFlightFloor) * 0.95))
    : Math.round((b?.transportation || 0) * 0.55);

  const accommodationFloor = liveHotelFloor
    ? Math.min(liveHotelFloor, Math.round((b?.accommodation || liveHotelFloor) * 0.9))
    : Math.round((b?.accommodation || 0) * 0.55);

  const foodFloor = Math.min(b?.food || 0, Math.round(450 * days * travelers));
  const activitiesFloor = Math.min(b?.activities || 0, Math.round(250 * days * travelers));
  const bufferFloor = Math.min(b?.miscellaneous || 0, Math.round((trip.totalBudget || 0) * 0.04));

  return {
    transport: Math.max(0, transportFloor),
    accommodation: Math.max(0, accommodationFloor),
    food: Math.max(0, foodFloor),
    activities: Math.max(0, activitiesFloor),
    buffer: Math.max(0, bufferFloor)
  };
}

/**
 * Deterministic exact integer linear constraint verifier for trip budgets.
 * Matches CONCODE Brain v4.0 APEX FormalVerifier.verify_linear_allocations semantics.
 */
export function verifyTripBudgetLocally(
  totalBudget: number,
  breakdown: BudgetBreakdown,
  floors?: Partial<BudgetCategoryFloors>
): FormalBudgetVerification {
  const ceiling = Math.max(0, Math.round(totalBudget || 0));
  const items: Array<{ key: keyof BudgetBreakdown; label: string; current: number; min: number }> = [
    { key: 'transportation', label: 'transport', current: Math.max(0, Math.round(breakdown.transportation || 0)), min: Math.max(0, Math.round(floors?.transport ?? 0)) },
    { key: 'accommodation', label: 'accommodation', current: Math.max(0, Math.round(breakdown.accommodation || 0)), min: Math.max(0, Math.round(floors?.accommodation ?? 0)) },
    { key: 'food', label: 'food', current: Math.max(0, Math.round(breakdown.food || 0)), min: Math.max(0, Math.round(floors?.food ?? 0)) },
    { key: 'activities', label: 'activities', current: Math.max(0, Math.round(breakdown.activities || 0)), min: Math.max(0, Math.round(floors?.activities ?? 0)) },
    { key: 'miscellaneous', label: 'buffer', current: Math.max(0, Math.round(breakdown.miscellaneous || 0)), min: Math.max(0, Math.round(floors?.buffer ?? 0)) }
  ];

  const currentSum = items.reduce((s, x) => s + x.current, 0);
  const minSum = items.reduce((s, x) => s + x.min, 0);

  if (minSum > ceiling) {
    const deficit = minSum - ceiling;
    return {
      isSatisfiable: false,
      status: 'UNSAT_CONFLICT',
      solverEngine: 'exact_linear_solver',
      currentSum,
      ceiling,
      delta: ceiling - currentSum,
      unsatCore: items.filter(x => x.min > 0).map(x => `min_${x.label}_${x.min}`).concat([`ceiling_${ceiling}`]),
      witness: {
        transportation: items[0].min,
        accommodation: items[1].min,
        food: items[2].min,
        activities: items[3].min,
        miscellaneous: items[4].min
      },
      remediationGuidance: `Essential floors (₹${minSum.toLocaleString('en-IN')}) exceed your ₹${ceiling.toLocaleString('en-IN')} budget cap by ₹${deficit.toLocaleString('en-IN')}. Raise budget or adjust transport/stay tier.`
    };
  }

  const witness: BudgetBreakdown = {
    transportation: items[0].current,
    accommodation: items[1].current,
    food: items[2].current,
    activities: items[3].current,
    miscellaneous: items[4].current
  };

  const withinNow = currentSum <= ceiling && items.every(x => x.current >= x.min);
  if (!withinNow) {
    const availableSlack = Math.max(0, ceiling - minSum);
    const requestedSlack = items.reduce((s, x) => s + Math.max(0, x.current - x.min), 0);
    let assigned = 0;
    items.forEach((item, idx) => {
      const req = Math.max(0, item.current - item.min);
      const share = requestedSlack > 0
        ? Math.floor((req / requestedSlack) * availableSlack)
        : Math.floor(availableSlack / items.length);
      const val = item.min + share;
      witness[item.key] = val;
      assigned += val;
      if (idx === items.length - 1 && assigned < ceiling) {
        witness[item.key] += ceiling - assigned;
      }
    });
  }

  return {
    isSatisfiable: true,
    status: currentSum <= ceiling ? 'PROVEN_SAT' : 'REBALANCE_AVAILABLE',
    solverEngine: 'exact_linear_solver',
    currentSum,
    ceiling,
    delta: ceiling - currentSum,
    unsatCore: [],
    witness,
    remediationGuidance: currentSum <= ceiling
      ? `Mathematically verified: all 5 categories sum to ₹${currentSum.toLocaleString('en-IN')} within your ₹${ceiling.toLocaleString('en-IN')} cap.`
      : `Categories sum to ₹${currentSum.toLocaleString('en-IN')} (₹${(currentSum - ceiling).toLocaleString('en-IN')} over cap). A proven rebalance fits your ₹${ceiling.toLocaleString('en-IN')} budget.`
  };
}

/**
 * Upgrade local proof with CONCODE Brain v4.0 APEX Z3 SMT Formal Verifier (/api/chat action=verify_budget).
 * Falls back transparently to verifyTripBudgetLocally when offline or unreachable.
 */
export async function verifyTripBudgetWithApex(
  trip: Trip,
  liveQuotes?: LiveMarketQuoteResult | null
): Promise<FormalBudgetVerification> {
  const floors = computeTripBudgetFloors(trip, liveQuotes);
  const local = verifyTripBudgetLocally(trip.totalBudget, trip.budgetBreakdown, floors);

  if (typeof window === 'undefined' || typeof fetch !== 'function') {
    return local;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_500);
  try {
    const res = await fetch(resolveApiUrl('/api/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_budget',
        totalBudget: trip.totalBudget,
        breakdown: {
          transport: trip.budgetBreakdown.transportation,
          accommodation: trip.budgetBreakdown.accommodation,
          food: trip.budgetBreakdown.food,
          activities: trip.budgetBreakdown.activities,
          buffer: trip.budgetBreakdown.miscellaneous
        },
        floors
      }),
      signal: controller.signal
    });
    if (!res.ok) return local;
    const data = await res.json().catch(() => null);
    if (!data?.ok) return local;

    const w = data.witness || {};
    const witness: BudgetBreakdown = {
      transportation: Number.isFinite(w.transport) ? Math.round(w.transport) : local.witness.transportation,
      accommodation: Number.isFinite(w.accommodation) ? Math.round(w.accommodation) : local.witness.accommodation,
      food: Number.isFinite(w.food) ? Math.round(w.food) : local.witness.food,
      activities: Number.isFinite(w.activities) ? Math.round(w.activities) : local.witness.activities,
      miscellaneous: Number.isFinite(w.buffer) ? Math.round(w.buffer) : local.witness.miscellaneous
    };

    const solverEngine: FormalBudgetVerification['solverEngine'] =
      data.solverEngine === 'concode_apex_z3_smt'
        ? 'concode_apex_z3_smt'
        : data.solverEngine === 'concode_apex_deterministic_exact'
          ? 'concode_apex_deterministic_exact'
          : 'exact_linear_solver';

    return {
      isSatisfiable: Boolean(data.isSatisfiable),
      status: (data.status as BudgetProofStatus) || local.status,
      solverEngine,
      currentSum: Number.isFinite(data.currentSum) ? data.currentSum : local.currentSum,
      ceiling: Number.isFinite(data.ceiling) ? data.ceiling : local.ceiling,
      delta: Number.isFinite(data.delta) ? data.delta : local.delta,
      unsatCore: Array.isArray(data.unsatCore) ? data.unsatCore : local.unsatCore,
      witness,
      remediationGuidance: typeof data.remediationGuidance === 'string' && data.remediationGuidance
        ? data.remediationGuidance
        : local.remediationGuidance,
      rTotal: typeof data.rTotal === 'number' ? data.rTotal : undefined
    };
  } catch {
    return local;
  } finally {
    clearTimeout(timeout);
  }
}
