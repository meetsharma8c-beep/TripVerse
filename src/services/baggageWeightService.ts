/**
 * Baggage Weight & Airline Allowance Service (baggageWeightService.ts)
 * Computes live estimated luggage weight against airline cabin & check-in limits.
 */

export interface AirlineBaggagePolicy {
  airlineCode: string;
  airlineName: string;
  cabinLimitKg: number;
  checkInLimitKg: number;
  excessFeePerKgApprox: string;
}

export const AIRLINE_POLICIES: Record<string, AirlineBaggagePolicy> = {
  INDIGO: {
    airlineCode: 'INDIGO',
    airlineName: 'IndiGo Airlines',
    cabinLimitKg: 7.0,
    checkInLimitKg: 15.0,
    excessFeePerKgApprox: '₹550 / kg'
  },
  AIRINDIA: {
    airlineCode: 'AIRINDIA',
    airlineName: 'Air India',
    cabinLimitKg: 7.0,
    checkInLimitKg: 20.0,
    excessFeePerKgApprox: '₹600 / kg'
  },
  EMIRATES: {
    airlineCode: 'EMIRATES',
    airlineName: 'Emirates',
    cabinLimitKg: 7.0,
    checkInLimitKg: 25.0,
    excessFeePerKgApprox: 'AED 120 / kg'
  },
  SINGAPORE: {
    airlineCode: 'SINGAPORE',
    airlineName: 'Singapore Airlines',
    cabinLimitKg: 7.0,
    checkInLimitKg: 30.0,
    excessFeePerKgApprox: 'SGD 45 / kg'
  },
  DELTA: {
    airlineCode: 'DELTA',
    airlineName: 'Delta Air Lines',
    cabinLimitKg: 8.0,
    checkInLimitKg: 23.0,
    excessFeePerKgApprox: '$100 flat standard'
  },
  RYANAIR: {
    airlineCode: 'RYANAIR',
    airlineName: 'Ryanair / European Low-Cost',
    cabinLimitKg: 7.0,
    checkInLimitKg: 10.0,
    excessFeePerKgApprox: '€12 / kg'
  }
};

export const ITEM_WEIGHT_ESTIMATES: Record<string, number> = {
  shirt: 0.22,
  top: 0.20,
  jeans: 0.65,
  pants: 0.45,
  jacket: 0.95,
  coat: 1.40,
  thermal: 0.35,
  shoes: 1.10,
  boots: 1.50,
  sneakers: 0.85,
  laptop: 1.80,
  camera: 1.25,
  toiletries: 0.60,
  umbrella: 0.35,
  charger: 0.25,
  powerbank: 0.32,
  towel: 0.40,
  socks: 0.08,
  medicine: 0.20,
  passport: 0.10,
  gloves: 0.15,
  sunglasses: 0.08
};

export interface BaggageCalculationResult {
  estimatedWeightKg: number;
  cabinLimitKg: number;
  checkInLimitKg: number;
  cabinStatus: 'safe' | 'near_limit' | 'overweight';
  checkInStatus: 'safe' | 'near_limit' | 'overweight';
  cabinPercent: number;
  checkInPercent: number;
  warningNotice?: string;
}

/**
 * Estimate weight for an item title based on lexical keyword matching
 */
export function estimateItemWeight(title: string): number {
  const norm = title.toLowerCase();
  // Sort keys by descending length so longer specific terms (e.g. laptop) match before short substrings (e.g. top)
  const entries = Object.entries(ITEM_WEIGHT_ESTIMATES).sort((a, b) => b[0].length - a[0].length);
  for (const [key, weight] of entries) {
    const regex = new RegExp(`\\b${key}`, 'i');
    if (regex.test(norm)) {
      return weight;
    }
  }
  // Default general item weight: 0.3 kg
  return 0.30;
}

/**
 * Calculate total luggage weight and airline allowance status
 */
export function calculateBaggageWeight(
  items: Array<{ title: string; packed: boolean; category?: string }>,
  airlineKey = 'INDIGO'
): BaggageCalculationResult {
  const policy = AIRLINE_POLICIES[airlineKey] || AIRLINE_POLICIES['INDIGO'];

  // Sum estimated weights of all packed items
  let totalEstimated = 0;
  items.forEach(item => {
    if (item.packed) {
      totalEstimated += estimateItemWeight(item.title);
    }
  });

  // Base suitcase tare weight: 2.2 kg for cabin, 3.8 kg for check-in
  const cabinWeight = Number((totalEstimated * 0.4 + 2.2).toFixed(1));
  const checkInWeight = Number((totalEstimated * 0.6 + 3.8).toFixed(1));

  const cabinPercent = Math.min(100, Math.round((cabinWeight / policy.cabinLimitKg) * 100));
  const checkInPercent = Math.min(100, Math.round((checkInWeight / policy.checkInLimitKg) * 100));

  let cabinStatus: BaggageCalculationResult['cabinStatus'] = 'safe';
  if (cabinWeight > policy.cabinLimitKg) {
    cabinStatus = 'overweight';
  } else if (cabinWeight >= policy.cabinLimitKg * 0.85) {
    cabinStatus = 'near_limit';
  }

  let checkInStatus: BaggageCalculationResult['checkInStatus'] = 'safe';
  if (checkInWeight > policy.checkInLimitKg) {
    checkInStatus = 'overweight';
  } else if (checkInWeight >= policy.checkInLimitKg * 0.85) {
    checkInStatus = 'near_limit';
  }

  let warningNotice: string | undefined;
  if (cabinStatus === 'overweight') {
    warningNotice = `Cabin bag exceeds ${policy.cabinLimitKg}kg limit (${cabinWeight}kg). Gate-check excess fee: approx ${policy.excessFeePerKgApprox}.`;
  } else if (checkInStatus === 'overweight') {
    warningNotice = `Check-in bag exceeds ${policy.checkInLimitKg}kg limit (${checkInWeight}kg). Airline excess fee: approx ${policy.excessFeePerKgApprox}.`;
  }

  return {
    estimatedWeightKg: Number((cabinWeight + checkInWeight).toFixed(1)),
    cabinLimitKg: policy.cabinLimitKg,
    checkInLimitKg: policy.checkInLimitKg,
    cabinStatus,
    checkInStatus,
    cabinPercent,
    checkInPercent,
    warningNotice
  };
}
