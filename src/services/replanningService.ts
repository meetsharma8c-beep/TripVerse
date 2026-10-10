import { Trip, Coordinates } from '../types/trip';
import { DisruptionAlert, DisruptionType, EmergencyStay, RefundGuidance, ReplanOption } from '../types/replanning';
import { generateAITrip, PlannerInput } from './plannerEngine';
import { resolvePreciseLocationSync } from './locationService';

/** Creates a planning scenario selected by the user; it does not verify a live disruption. */
export function generateDisruptionForTrip(trip: Trip, customReason?: DisruptionType): DisruptionAlert {
  const reason: DisruptionType = customReason || 'flight_cancellation';
  const cleanDest = trip.destination.split(',')[0].trim() || trip.destination;
  const labels: Record<DisruptionType, string> = {
    flight_cancellation: 'flight cancellation',
    train_cancellation: 'train cancellation',
    weather_alert: 'weather concern',
    natural_disaster: 'local emergency',
    official_change: 'schedule change',
    personal_emergency: 'personal emergency'
  };
  const label = labels[reason];

  return {
    id: `scenario-${Date.now()}`,
    tripId: trip.id,
    type: reason,
    title: `Planning scenario: ${label}`,
    details: `You selected a ${label} scenario for your trip to ${cleanDest}. TripVerse has not verified a live disruption. Check official provider or authority updates before acting.`,
    affectedDestination: cleanDest,
    severity: 'caution',
    timestamp: 'User-selected scenario'
  };
}

export function getEmergencyStays(_destination: string, _coordinates?: Coordinates): EmergencyStay[] {
  return [];
}

/** Provides general next steps without estimating a refund or claiming a provider policy. */
export function getCancellationPolicy(_trip: Trip, _disruption: DisruptionAlert): RefundGuidance {
  return {
    claimSteps: [
      'Open the airline, rail, hotel, or booking provider you used and check the booking status.',
      'Contact that provider directly to ask about cancellation, changes, and any refund eligibility.',
      'Review the terms on your booking confirmation and keep the provider’s case or cancellation reference.',
      'If you purchased travel insurance, contact the insurer using the details on your policy.'
    ]
  };
}

/**
 * Derives smart replan options: Alternate Dates vs. Alternative Safe Destinations.
 */
export function getReplanOptions(trip: Trip, _reason: DisruptionType): {
  alternateDates: ReplanOption[];
  newDestinations: ReplanOption[];
} {
  const cleanDest = trip.destination.split(',')[0].trim() || trip.destination;
  const currentCost = trip.estimatedTotal || trip.totalBudget;

  // Alternate Dates (Same Destination shifted into the future)
  const alternateDates: ReplanOption[] = [
    {
      id: 'replan-dates-1',
      type: 'alternate_dates',
      title: `${cleanDest} (choose new dates)`,
      destination: trip.destination,
      datesLabel: 'Choose dates with your provider',
      durationDays: trip.durationDays,
      estimatedCost: Math.round(currentCost * 1.04),
      costDelta: Math.round(currentCost * 0.04),
      recommendationReason: 'Planning suggestion only. Check current transport and accommodation availability.',
      weatherCondition: 'Weather not checked',
      image: trip.destinationDetails?.image || 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
      highlights: ['Check transport availability', 'Review change fees', 'Contact accommodation provider'],
      isRecommended: true
    },
    {
      id: 'replan-dates-2',
      type: 'alternate_dates',
      title: `${cleanDest} (compare dates)`,
      destination: trip.destination,
      datesLabel: 'Choose dates with your provider',
      durationDays: trip.durationDays,
      estimatedCost: Math.round(currentCost * 0.98),
      costDelta: -Math.round(currentCost * 0.02),
      recommendationReason: 'Planning suggestion only. Check current transport and accommodation availability.',
      weatherCondition: 'Weather not checked',
      image: trip.destinationDetails?.image || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      highlights: ['Compare provider prices', 'Check attraction hours', 'Verify local travel conditions']
    }
  ];

  // Alternative Destinations (Different cities with matching vibes and budget)
  const normDest = cleanDest.toLowerCase();
  let alternativeCandidates: Array<{ name: string; state: string; days: number; costFactor: number; reason: string; image: string; highlights: string[] }> = [];

  if (normDest.includes('udaipur') || normDest.includes('rajasthan') || normDest.includes('jaipur')) {
    alternativeCandidates = [
      {
        name: 'Goa',
        state: 'Goa',
        days: Math.min(4, trip.durationDays + 1),
        costFactor: 1.15,
        reason: 'A coastal destination suggestion. Check travel connections and local conditions.',
        image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
        highlights: ['Coastal attractions', 'Local dining options', 'Check current travel conditions']
      },
      {
        name: 'Mount Abu',
        state: 'Rajasthan',
        days: trip.durationDays,
        costFactor: 0.92,
        reason: 'A hill destination suggestion with local attractions to research.',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        highlights: ['Nakki Lake', 'Dilwara Temples', 'Check opening times and access']
      },
      {
        name: 'Jodhpur',
        state: 'Rajasthan',
        days: trip.durationDays,
        costFactor: 0.96,
        reason: 'Blue city with majestic Mehrangarh Fort and authentic desert dining.',
        image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
        highlights: ['Mehrangarh Fort', 'Old-city areas', 'Umaid Bhawan Palace']
      }
    ];
  } else if (normDest.includes('manali') || normDest.includes('chopta') || normDest.includes('himachal') || normDest.includes('uttarakhand')) {
    alternativeCandidates = [
      {
        name: 'Rishikesh',
        state: 'Uttarakhand',
        days: trip.durationDays,
        costFactor: 0.90,
        reason: 'A foothill destination suggestion with local attractions to research.',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        highlights: ['Ganga ghats', 'Local cafes', 'Check current road conditions']
      },
      {
        name: 'Dalhousie',
        state: 'Himachal Pradesh',
        days: trip.durationDays,
        costFactor: 0.98,
        reason: 'A hill destination suggestion with local attractions to research.',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        highlights: ['Khajjiar', 'Panchpula', 'Check current access and conditions']
      },
      {
        name: 'Jaipur',
        state: 'Rajasthan',
        days: trip.durationDays,
        costFactor: 1.05,
        reason: 'A heritage destination suggestion with local attractions to research.',
        image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80',
        highlights: ['Amer Fort', 'Hawa Mahal', 'Check opening times and access']
      }
    ];
  } else {
    // Universal default alternatives
    alternativeCandidates = [
      {
        name: 'Goa',
        state: 'Goa',
        days: trip.durationDays,
        costFactor: 1.10,
        reason: 'A coastal destination suggestion. Check travel connections and local conditions.',
        image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
        highlights: ['Coastal attractions', 'Local dining options', 'Check travel connections']
      },
      {
        name: 'Udaipur',
        state: 'Rajasthan',
        days: trip.durationDays,
        costFactor: 1.02,
        reason: 'The City of Lakes with royal palaces, scenic boat rides, and romantic ghats.',
        image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
        highlights: ['Lake Pichola boating', 'City Palace heritage museum', 'Rooftop dining with lake views']
      },
      {
        name: 'Gokarna',
        state: 'Karnataka',
        days: trip.durationDays,
        costFactor: 0.88,
        reason: 'A coastal destination suggestion with local attractions to research.',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        highlights: ['Om Beach & Kudle sunset', 'Serene temple town charm', 'Budget-friendly beach shacks']
      }
    ];
  }

  const newDestinations: ReplanOption[] = alternativeCandidates.map((c, idx) => {
    const cost = Math.round(currentCost * c.costFactor);
    return {
      id: `replan-dest-${c.name.toLowerCase()}`,
      type: 'new_destination',
      title: `${c.name} (Alternative)`,
      destination: `${c.name}, ${c.state}`,
      datesLabel: `${c.days} days • dates not checked`,
      durationDays: c.days,
      estimatedCost: cost,
      costDelta: cost - currentCost,
      recommendationReason: c.reason,
      weatherCondition: 'Weather not checked',
      image: c.image,
      highlights: c.highlights,
      isRecommended: idx === 0
    };
  });

  return {
    alternateDates,
    newDestinations
  };
}

/**
 * Executes the replan by regenerating an intelligent itinerary for the selected option.
 */
export function applyReplanToTrip(originalTrip: Trip, option: ReplanOption): Trip {
  const targetDestination = option.destination || originalTrip.destination;
  const targetDuration = option.durationDays || originalTrip.durationDays;
  const targetBudget = option.estimatedCost || originalTrip.totalBudget;

  const input: PlannerInput = {
    origin: originalTrip.origin,
    destinationName: targetDestination,
    durationDays: targetDuration,
    travelersCount: originalTrip.travelersCount,
    travelerType: originalTrip.travelerType,
    budgetMode: 'total',
    budgetAmount: targetBudget,
    preferences: originalTrip.preferences || ['relaxation', 'nature'],
    transportMode: originalTrip.transportMode,
    accommodationType: originalTrip.accommodationType,
    foodPreference: originalTrip.foodPreference,
    priorities: originalTrip.priorities,
    preciseLocation: resolvePreciseLocationSync(targetDestination)
  };

  const newTrip = generateAITrip(input);

  return {
    ...newTrip,
    id: originalTrip.id, // Preserve same trip ID so it replaces active trip cleanly
    name: `${originalTrip.origin} → ${targetDestination.split(',')[0]} (Replanned)`,
    aiRationale: `Draft itinerary suggestion for ${targetDestination}, based on the selected planning option. Verify dates, prices, availability, and travel conditions with providers.`
  };
}
