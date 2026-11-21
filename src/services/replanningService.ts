import { Trip, Coordinates } from '../types/trip';
import { DisruptionAlert, DisruptionType, EmergencyStay, RefundGuidance, ReplanOption } from '../types/replanning';
import { generateAITrip, PlannerInput } from './plannerEngine';
import { resolvePreciseLocationSync } from './locationService';
import { evaluateLiveMarketPrices } from './liveMarketPricingService';
import { getFeasibleTransportModes } from './transportFeasibilityEngine';
import { fetchLiveDestinationWeather } from './weatherService';
import { getIndoorMirrorForActivity, toggleDayWeatherMode } from './smartTravelEngine';
import { sanitizeNonRoadTripPitstops } from './storageService';
import { POPULAR_DESTINATIONS } from '../data/destinations';

function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseBaseStartDate(raw?: string): Date {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateRangeLabel(startIso: string, durationDays: number): string {
  const start = new Date(`${startIso}T00:00:00`);
  if (Number.isNaN(start.getTime())) return `${durationDays} Days`;
  const end = addDays(start, Math.max(0, durationDays - 1));
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)} (${durationDays}d)`;
}

function estimateRealTripCost(
  trip: Trip,
  overrides: {
    destination?: string;
    destCoords?: Coordinates;
    startDate?: string;
    transportMode?: Trip['transportMode'];
    durationDays?: number;
  }
): number {
  const dest = overrides.destination || trip.destination;
  const mode = overrides.transportMode || trip.transportMode || 'car';
  const durationDays = overrides.durationDays || trip.durationDays || 3;
  const travelers = Math.max(1, trip.travelersCount || 2);
  const market = evaluateLiveMarketPrices({
    origin: trip.origin || 'Ahmedabad, Gujarat',
    destination: dest,
    durationDays,
    travelersCount: travelers,
    startDate: overrides.startDate || trip.startDate,
    accommodationType: trip.accommodationType || '3star',
    transportMode: mode,
    originCoords: trip.originCoordinates,
    destCoords: overrides.destCoords || trip.destinationDetails?.coordinates,
  });

  const transportCost =
    mode === 'flight'
      ? market.smartHubArbitrage
        ? market.smartHubArbitrage.hubRoundTripPerPerson * travelers + market.smartHubArbitrage.groundTransferToHubCost
        : market.flightTotalGroupINR
      : mode === 'train'
        ? market.trainTotalGroupINR
        : mode === 'car' || mode === 'bike'
          ? market.roadTripFuelAndTollsINR
          : market.localTransitTotalGroupINR;

  const stayCost = durationDays === 1 ? 0 : market.hotelTotalGroupINR;
  const subtotal = transportCost + stayCost + market.diningTotalGroupINR + market.attractionsTotalGroupINR;
  return Math.max(1500, Math.round(subtotal * 1.05));
}

/** Picks the most realistic default disruption reason based on the trip's actual transport mode. */
export function getDefaultDisruptionReasonForTrip(trip: Trip): DisruptionType {
  if (trip.transportMode === 'train') return 'train_cancellation';
  if (trip.transportMode === 'flight') return 'flight_cancellation';
  return 'weather_alert';
}

/** Creates a planning scenario selected by the user; it does not verify a live disruption. */
export function generateDisruptionForTrip(trip: Trip, customReason?: DisruptionType): DisruptionAlert {
  const reason: DisruptionType = customReason || getDefaultDisruptionReasonForTrip(trip);
  const cleanDest = trip.destination.split(',')[0].trim() || trip.destination;
  const labels: Record<DisruptionType, string> = {
    flight_cancellation: 'flight cancellation',
    train_cancellation: 'train cancellation',
    weather_alert: 'severe weather alert',
    natural_disaster: 'local emergency',
    official_change: 'schedule change',
    personal_emergency: 'personal emergency',
  };
  const label = labels[reason];

  return {
    id: `scenario-${Date.now()}`,
    tripId: trip.id,
    type: reason,
    title: `Planning scenario: ${label}`,
    details: `You selected a ${label} scenario for your ${trip.transportMode || 'planned'} trip to ${cleanDest}. TripVerse calculates real shifted dates, alternate modes, indoor rain swaps, and live Open-Meteo forecasts — verify carrier bookings directly with your provider.`,
    affectedDestination: cleanDest,
    severity: reason === 'natural_disaster' ? 'critical' : 'caution',
    timestamp: 'User-selected scenario',
  };
}

export function getEmergencyStays(_destination: string, _coordinates?: Coordinates): EmergencyStay[] {
  return [];
}

/** Provides provider-aware cancellation & refund steps based on the trip's transport mode. */
export function getCancellationPolicy(trip: Trip, _disruption: DisruptionAlert): RefundGuidance {
  if (trip.transportMode === 'train') {
    return {
      claimSteps: [
        'Check your PNR status on IRCTC / NTES (or your national rail operator). If the train is cancelled by railways, a full automatic refund is normally processed without filing a TDR.',
        'If your train is delayed by more than 3 hours and you choose not to travel, file a TDR (Ticket Deposit Receipt) online before the actual departure of the train.',
        'Contact your hotel directly to request a free date modification or late check-in hold using your rail cancellation reference.',
        'If you switch to an alternate train or flight in TripVerse below, keep your original PNR receipt for travel insurance reimbursement.',
      ],
    };
  }
  if (trip.transportMode === 'flight') {
    return {
      claimSteps: [
        'Open your airline app or Manage Booking portal with your 6-character PNR — carrier-initiated cancellations qualify for either free rebooking on the next flight or a full original-payment refund.',
        'Request written cancellation/delay confirmation from the airline desk or app for hotel modification waivers and travel insurance claims.',
        'Contact your hotel before check-in cutoff to shift dates rather than incurring a no-show penalty.',
        'If you purchased travel insurance, submit the airline disruption certificate along with receipts for emergency meals or overnight stays.',
      ],
    };
  }
  return {
    claimSteps: [
      'Check live road/highway advisories on Google Maps or local transport authorities before starting your drive.',
      'Contact your hotel or homestay directly — most properties allow free date shifts when severe weather or roadblocks affect highway access.',
      'Review cancellation cutoff times on your booking confirmation and keep any waiver or case reference ID.',
      'If you purchased travel insurance, contact the insurer using the policy helpline before making non-refundable changes.',
    ],
  };
}

/** Builds a genuine custom-date shift replan option with real market pricing. */
export function buildCustomDateReplanOption(trip: Trip, customIsoDate: string): ReplanOption {
  const cleanDest = trip.destination.split(',')[0].trim() || trip.destination;
  const baselineCost = trip.estimatedTotal || trip.totalBudget || 15000;
  const shiftedCost = estimateRealTripCost(trip, { startDate: customIsoDate });
  const destCoords = trip.destinationDetails?.coordinates || resolvePreciseLocationSync(trip.destination).coordinates;

  return {
    id: `replan-dates-custom-${customIsoDate}`,
    type: 'alternate_dates',
    title: `${cleanDest} • Shift to ${formatDateRangeLabel(customIsoDate, trip.durationDays)}`,
    destination: trip.destination,
    datesLabel: formatDateRangeLabel(customIsoDate, trip.durationDays),
    newStartDate: customIsoDate,
    durationDays: trip.durationDays,
    estimatedCost: shiftedCost,
    costDelta: shiftedCost - baselineCost,
    recommendationReason: 'Preserves your exact itinerary stops, hotel, expenses & memories while shifting all day dates cleanly.',
    weatherCondition: 'Checking live forecast…',
    image:
      trip.destinationDetails?.image ||
      'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
    highlights: [
      'Updates startDate & every day’s calendar date',
      'Preserves all custom stops, expenses & photos',
      'Recalculates seasonal market pricing for new dates',
    ],
    coordinates: destCoords,
    isRecommended: true,
  };
}

/**
 * Derives 100% genuine replan options across 4 dimensions:
 * 1. Real Date Shifts (+3d, +7d, +14d) with real market pricing
 * 2. Real Transport Mode Switches (e.g. Train -> Flight or Car via feasibility engine)
 * 3. 1-Click Indoor Weather Shield (swaps outdoor stops to real indoor mirrors)
 * 4. Region- & Geography-Aware Alternative Destinations (real Haversine proximity + market pricing)
 */
export function getReplanOptions(trip: Trip, reason: DisruptionType): {
  alternateDates: ReplanOption[];
  transportSwitches: ReplanOption[];
  weatherSwapOption: ReplanOption | null;
  newDestinations: ReplanOption[];
} {
  const cleanDest = trip.destination.split(',')[0].trim() || trip.destination;
  const currentCost = trip.estimatedTotal || trip.totalBudget || 15000;
  const baseStart = parseBaseStartDate(trip.startDate);
  const destCoords =
    trip.destinationDetails?.coordinates ||
    trip.routeDetails?.destinationCoordinates ||
    resolvePreciseLocationSync(trip.destination).coordinates;
  const originCoords = trip.originCoordinates || resolvePreciseLocationSync(trip.origin || 'Ahmedabad, Gujarat').coordinates;

  // 1. REAL ALTERNATE DATE SHIFTS (+3 days, +7 days, +14 days)
  const shiftPresets = [
    { offsetDays: 3, tag: '+3 Days • Short Delay Window', note: 'Best if your train/flight is delayed or weather clears within 72 hours.' },
    { offsetDays: 7, tag: '+7 Days • Next Week (Same Weekday)', note: 'Keeps the same weekend/weekday alignment with fresh transport availability.' },
    { offsetDays: 14, tag: '+14 Days • 2 Weeks Out', note: 'Wider advance booking window for lower hotel & ticket fares.' },
  ];

  const alternateDates: ReplanOption[] = shiftPresets.map((preset, idx) => {
    const shiftedIso = toIsoDate(addDays(baseStart, preset.offsetDays));
    const shiftedCost = estimateRealTripCost(trip, { startDate: shiftedIso, destCoords });
    return {
      id: `replan-dates-${preset.offsetDays}d`,
      type: 'alternate_dates',
      title: `${cleanDest} (${preset.tag})`,
      destination: trip.destination,
      datesLabel: formatDateRangeLabel(shiftedIso, trip.durationDays),
      newStartDate: shiftedIso,
      durationDays: trip.durationDays,
      estimatedCost: shiftedCost,
      costDelta: shiftedCost - currentCost,
      recommendationReason: preset.note,
      weatherCondition: 'Checking live forecast…',
      image:
        trip.destinationDetails?.image ||
        'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
      highlights: [
        `New departure: ${shiftedIso}`,
        'Keeps all your customized sights & expenses',
        'Recalculates seasonal fares for new dates',
      ],
      coordinates: destCoords,
      isRecommended: idx === 0,
    };
  });

  // 2. REAL TRANSPORT MODE SWITCHES (from transportFeasibilityEngine)
  const feasibility = getFeasibleTransportModes(
    trip.origin || '',
    trip.destination || '',
    trip.startDate,
    originCoords,
    destCoords
  );
  const modeMeta: Record<string, { label: string; reason: string; highlights: string[] }> = {
    flight: {
      label: 'Switch to Flight',
      reason: 'Fastest recovery when trains or highways are disrupted — saves transit hours.',
      highlights: ['Airport-to-hotel corridor', 'Zero highway pitstop clutter', 'Live airfare budget calibration'],
    },
    train: {
      label: 'Switch to Express Train',
      reason: 'Weather-resilient rail alternative with station-to-station reliability and lower fare.',
      highlights: ['Station arrival & hotel transfer', 'Weather-resilient rail transit', 'Budget-friendly group fares'],
    },
    car: {
      label: 'Switch to Road Trip (Car)',
      reason: 'Full schedule control when scheduled flights or trains are cancelled.',
      highlights: ['Flexible departure time', 'Highway fuel & toll budgeting', 'En-route rest & dining stops'],
    },
    bus: {
      label: 'Switch to Intercity Coach / Bus',
      reason: 'Frequent sleeper/AC Volvo departures when rail seats are waitlisted.',
      highlights: ['Frequent daily departures', 'Lower group transit cost', 'Direct highway corridor'],
    },
  };

  const currentMode = trip.transportMode || 'car';
  const transportSwitches: ReplanOption[] = feasibility.availableModes
    .filter((m) => m !== currentMode && m !== 'any' && m !== 'bike' && Boolean(modeMeta[m]))
    .map((mode, idx) => {
      const meta = modeMeta[mode];
      const modeCost = estimateRealTripCost(trip, {
        transportMode: mode as Trip['transportMode'],
        destCoords,
      });
      return {
        id: `replan-mode-${mode}`,
        type: 'switch_transport',
        title: `${meta.label} → ${cleanDest}`,
        destination: trip.destination,
        datesLabel: trip.startDate
          ? formatDateRangeLabel(trip.startDate, trip.durationDays)
          : `${trip.durationDays} Days • Same Dates`,
        newStartDate: trip.startDate,
        newTransportMode: mode as ReplanOption['newTransportMode'],
        durationDays: trip.durationDays,
        estimatedCost: modeCost,
        costDelta: modeCost - currentCost,
        recommendationReason: meta.reason,
        weatherCondition: 'Same destination weather',
        image:
          trip.destinationDetails?.image ||
          'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
        highlights: meta.highlights,
        coordinates: destCoords,
        isRecommended: idx === 0,
      };
    });

  // 3. 1-CLICK INDOOR WEATHER SHIELD (swaps outdoor stops to real indoor mirrors)
  const outdoorCount = (trip.itinerary || []).reduce((count, day) => {
    const swappable = (day.activities || []).filter(
      (a) => a.type === 'attraction' || a.type === 'viewpoint' || a.type === 'rest'
    ).length;
    return count + swappable;
  }, 0);

  const weatherSwapOption: ReplanOption | null =
    outdoorCount > 0
      ? {
          id: 'replan-indoor-weather-shield',
          type: 'indoor_weather_swap',
          title: `Indoor Rain & Storm Shield (${cleanDest})`,
          destination: trip.destination,
          datesLabel: trip.startDate
            ? formatDateRangeLabel(trip.startDate, trip.durationDays)
            : `${trip.durationDays} Days • Keep Dates & Hotel`,
          newStartDate: trip.startDate,
          durationDays: trip.durationDays,
          estimatedCost: currentCost,
          costDelta: 0,
          recommendationReason: `Keeps your hotel, transport & dates intact while swapping ${outdoorCount} outdoor sightseeing stops to verified indoor museums, galleries, cafes, and heritage halls.`,
          weatherCondition: 'Rain & storm protected',
          image:
            trip.destinationDetails?.image ||
            'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
          highlights: [
            `Swaps ${outdoorCount} outdoor activities to indoor mirrors`,
            'Zero hotel or ticket cancellation fees',
            'Preserves all expenses, photos & packing list',
          ],
          coordinates: destCoords,
          isRecommended: reason === 'weather_alert',
        }
      : null;

  // 4. GEOGRAPHICALLY & CULTURALLY GENUINE ALTERNATIVE DESTINATIONS
  const normDest = `${cleanDest} ${trip.destinationDetails?.country || ''} ${trip.destinationDetails?.state || ''}`.toLowerCase();
  const destCountry = (trip.destinationDetails?.country || '').trim().toLowerCase();

  interface AltCandidate {
    name: string;
    state: string;
    country: string;
    days: number;
    reason: string;
    image: string;
    highlights: string[];
    coordinates?: Coordinates;
  }

  let candidates: AltCandidate[] = [];

  if (/tokyo|japan|kyoto|osaka/.test(normDest)) {
    candidates = [
      {
        name: 'Kyoto',
        state: 'Japan',
        country: 'Japan',
        days: trip.durationDays,
        reason: 'Cultural heart of Japan with Fushimi Inari, Arashiyama Bamboo Grove, and historic geisha quarters.',
        image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
        highlights: ['Fushimi Inari-taisha Torii gates', 'Kinkaku-ji Golden Pavilion', 'Traditional matcha tea ceremonies'],
        coordinates: { lat: 35.0116, lng: 135.7681 },
      },
      {
        name: 'Osaka',
        state: 'Japan',
        country: 'Japan',
        days: trip.durationDays,
        reason: 'Japan’s premier culinary capital with bustling Dotonbori neon canals and Osaka Castle.',
        image: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80',
        highlights: ['Dotonbori street food market', 'Osaka Castle Park', 'Universal Studios Japan'],
        coordinates: { lat: 34.6937, lng: 135.5023 },
      },
      {
        name: 'Singapore',
        state: 'Singapore',
        country: 'Singapore',
        days: trip.durationDays,
        reason: 'Futuristic garden metropolis with world-class public transit, vibrant street hawker centers, and Marina Bay.',
        image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80',
        highlights: ['Gardens by the Bay Supertrees', 'Marina Bay Sands SkyPark', 'Chinatown & Little India food trails'],
        coordinates: { lat: 1.3521, lng: 103.8198 },
      },
    ].filter((c) => !cleanDest.toLowerCase().includes(c.name.toLowerCase()));
  } else {
    // Dynamically rank real destinations from POPULAR_DESTINATIONS by same country/region + Haversine proximity + vibe match
    const isIndiaTrip =
      destCountry === 'india' ||
      (!destCountry && destCoords.lat >= 6 && destCoords.lat <= 37 && destCoords.lng >= 68 && destCoords.lng <= 98);

    const tripPrefs = new Set((trip.preferences || []).map((p) => p.toLowerCase()));
    const pool = POPULAR_DESTINATIONS.filter((d) => {
      if (d.name.toLowerCase() === cleanDest.toLowerCase()) return false;
      const dIsIndia = (d.country || 'India').toLowerCase() === 'india';
      return isIndiaTrip ? dIsIndia : !dIsIndia;
    });

    const scored = pool
      .map((d) => {
        const distKm = haversineKm(destCoords, d.coordinates);
        const catMatch = tripPrefs.has(d.category.toLowerCase()) ? 1 : 0;
        const sameRegionBonus =
          trip.destinationDetails?.state &&
          d.state.toLowerCase() === trip.destinationDetails.state.toLowerCase()
            ? 1
            : 0;
        // Prefer nearby regional alternatives (within 1,200km) with matching travel vibe
        const score = catMatch * 350 + sameRegionBonus * 250 - Math.min(distKm, 4000) * 0.22 + d.rating * 40;
        return { dest: d, distKm, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    candidates = scored.map(({ dest, distKm }) => ({
      name: dest.name,
      state: dest.state,
      country: dest.country || 'India',
      days: trip.durationDays,
      reason: `${dest.tagline} (~${Math.round(distKm).toLocaleString()} km from ${cleanDest}).`,
      image: dest.image,
      highlights: (dest.popularActivities || []).slice(0, 3),
      coordinates: dest.coordinates,
    }));
  }

  const newDestinations: ReplanOption[] = candidates.map((c, idx) => {
    const destLabel = c.state && c.state !== c.name ? `${c.name}, ${c.state}` : c.name;
    const realCost = estimateRealTripCost(trip, {
      destination: destLabel,
      destCoords: c.coordinates,
      durationDays: c.days,
    });
    return {
      id: `replan-dest-${c.name.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'new_destination',
      title: `${c.name} (Alternative)`,
      destination: destLabel,
      datesLabel: trip.startDate
        ? formatDateRangeLabel(trip.startDate, c.days)
        : `${c.days} Days • Flexible Dates`,
      newStartDate: trip.startDate,
      durationDays: c.days,
      estimatedCost: realCost,
      costDelta: realCost - currentCost,
      recommendationReason: c.reason,
      weatherCondition: 'Checking live forecast…',
      image: c.image,
      highlights: c.highlights.length > 0 ? c.highlights : [`Explore ${c.name}`, 'Local dining & heritage', 'Verified coordinates'],
      coordinates: c.coordinates,
      isRecommended: idx === 0,
    };
  });

  return {
    alternateDates,
    transportSwitches,
    weatherSwapOption,
    newDestinations,
  };
}

/**
 * Fetches live Open-Meteo weather forecasts for replan options in parallel so every card
 * shows real temperature, condition, and precipitation probability instead of "Weather not checked".
 */
export async function enrichReplanOptionsWithLiveWeather(options: ReplanOption[]): Promise<Record<string, string>> {
  const weatherMap: Record<string, string> = {};
  await Promise.all(
    options.map(async (opt) => {
      if (opt.type === 'indoor_weather_swap' || opt.type === 'switch_transport') return;
      try {
        const forecast = await Promise.race([
          fetchLiveDestinationWeather(opt.destination, opt.durationDays, opt.newStartDate, opt.coordinates),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
        ]);
        if (forecast && forecast.forecastDays && forecast.forecastDays.length > 0) {
          const first = forecast.forecastDays[0];
          const avgMax = Math.round(
            forecast.forecastDays.reduce((sum, d) => sum + d.maxTempC, 0) / forecast.forecastDays.length
          );
          const maxRain = Math.max(...forecast.forecastDays.map((d) => d.rainProbPercent));
          weatherMap[opt.id] = `${avgMax}°C • ${first.condition} (${maxRain}% rain)`;
        } else {
          weatherMap[opt.id] = 'Forecast unavailable offline';
        }
      } catch {
        weatherMap[opt.id] = 'Forecast unavailable offline';
      }
    })
  );
  return weatherMap;
}

/**
 * Executes the replan genuinely while preserving the user's account ownership, expenses,
 * photo memories, and reviews.
 */
export function applyReplanToTrip(originalTrip: Trip, option: ReplanOption): Trip {
  // Mode 1: 1-Click Indoor Weather Shield (non-destructive swap of outdoor stops to indoor mirrors)
  if (option.type === 'indoor_weather_swap') {
    const shieldedItinerary = (originalTrip.itinerary || []).map((day) => {
      const preparedDay = {
        ...day,
        activities: (day.activities || []).map((act) => {
          if (act.indoorMirror || act.type === 'departure' || act.type === 'arrival' || act.type === 'hotel' || act.type === 'food') {
            return act;
          }
          return {
            ...act,
            indoorMirror: getIndoorMirrorForActivity(act, originalTrip.destination),
          };
        }),
      };
      return toggleDayWeatherMode(preparedDay, true);
    });

    return {
      ...originalTrip,
      itinerary: shieldedItinerary,
      aiRationale: `Smart Replanned (Indoor Weather Shield): Swapped outdoor landmarks in ${originalTrip.destination} to verified indoor museums, heritage halls, and cultural venues while preserving your dates, stay, and budget.`,
    };
  }

  // Mode 2: Real Date Shift (updates startDate + every day's date while preserving all customized itinerary stops!)
  if (option.type === 'alternate_dates' && option.newStartDate) {
    const newStart = new Date(`${option.newStartDate}T00:00:00`);
    const shiftedItinerary = (originalTrip.itinerary || []).map((day, idx) => {
      const dayDate = addDays(newStart, idx);
      return {
        ...day,
        date: dayDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
      };
    });

    const ratio =
      originalTrip.estimatedTotal > 0 ? option.estimatedCost / originalTrip.estimatedTotal : 1;

    return {
      ...originalTrip,
      startDate: option.newStartDate,
      estimatedTotal: option.estimatedCost,
      totalBudget: Math.max(originalTrip.totalBudget, option.estimatedCost),
      budgetPerPerson: Math.round(
        Math.max(originalTrip.totalBudget, option.estimatedCost) / Math.max(1, originalTrip.travelersCount || 1)
      ),
      budgetBreakdown: {
        transportation: Math.round((originalTrip.budgetBreakdown?.transportation || 0) * ratio),
        accommodation: Math.round((originalTrip.budgetBreakdown?.accommodation || 0) * ratio),
        food: Math.round((originalTrip.budgetBreakdown?.food || 0) * ratio),
        activities: Math.round((originalTrip.budgetBreakdown?.activities || 0) * ratio),
        miscellaneous: Math.round((originalTrip.budgetBreakdown?.miscellaneous || 0) * ratio),
      },
      itinerary: shiftedItinerary,
      aiRationale: `Smart Replanned (Dates Shifted to ${option.datesLabel}): All itinerary days shifted cleanly to ${option.newStartDate} with recalculated seasonal market estimates. Your customized stops, expenses, and memories were preserved.`,
    };
  }

  // Mode 3 & 4: Switch Transport Mode OR Switch to a New Alternative Destination
  const targetDestination = option.destination || originalTrip.destination;
  const targetDuration = option.durationDays || originalTrip.durationDays;
  const targetBudget = option.estimatedCost || originalTrip.totalBudget;
  const targetTransportMode = option.newTransportMode || originalTrip.transportMode;
  const targetStartDate = option.newStartDate || originalTrip.startDate;

  const input: PlannerInput = {
    origin: originalTrip.origin,
    originCoords: originalTrip.originCoordinates,
    destinationName: targetDestination,
    destinationCoords: option.coordinates,
    durationDays: targetDuration,
    travelersCount: originalTrip.travelersCount,
    travelerType: originalTrip.travelerType,
    budgetMode: 'total',
    budgetAmount: targetBudget,
    preferences: originalTrip.preferences || ['culture', 'nature'],
    transportMode: targetTransportMode,
    accommodationType: originalTrip.accommodationType,
    foodPreference: originalTrip.foodPreference,
    priorities: originalTrip.priorities,
    startDate: targetStartDate,
    currency: originalTrip.currency,
    preciseLocation: resolvePreciseLocationSync(targetDestination),
  };

  const generated = generateAITrip(input);
  const { trip: sanitized } = sanitizeNonRoadTripPitstops(generated);
  const shortDest = targetDestination.split(',')[0].trim();

  return {
    ...sanitized,
    id: originalTrip.id, // Preserve trip ID so it updates the active trip in place
    userId: originalTrip.userId,
    isUserCreated: true,
    createdAt: originalTrip.createdAt,
    expenses: originalTrip.expenses,
    photos: originalTrip.photos,
    review: originalTrip.review,
    name:
      option.type === 'switch_transport'
        ? `${originalTrip.origin} → ${shortDest} | ${targetDuration} ${targetDuration === 1 ? 'Day' : 'Days'}`
        : `${originalTrip.origin} → ${shortDest} (Replanned)`,
    aiRationale:
      option.type === 'switch_transport'
        ? `Smart Replanned (Switched to ${targetTransportMode} transit): Recalculated transit corridor, fares, and logistics for ${shortDest} while preserving your expenses and memories.`
        : `Smart Replanned to ${targetDestination} (${option.datesLabel}): Generated fresh day-by-day attractions, regional stay, and live-market budget while preserving your account records.`,
  };
}
