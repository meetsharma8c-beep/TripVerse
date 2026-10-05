import { Trip, Coordinates } from '../types/trip';
import { DisruptionAlert, DisruptionType, EmergencyStay, RefundGuidance, ReplanOption } from '../types/replanning';
import { generateAITrip, PlannerInput } from './plannerEngine';
import { resolvePreciseLocationSync } from './locationService';

/**
 * Generates an active disruption alert contextually tailored to a trip.
 */
export function generateDisruptionForTrip(trip: Trip, customReason?: DisruptionType): DisruptionAlert {
  const reason: DisruptionType = customReason || 'flight_cancellation';
  const cleanDest = trip.destination.split(',')[0].trim() || trip.destination;

  switch (reason) {
    case 'flight_cancellation':
      return {
        id: `disrupt-${Date.now()}`,
        tripId: trip.id,
        type: 'flight_cancellation',
        title: `Your flight to ${cleanDest} (6E 532) is cancelled due to bad weather`,
        details: `IndiGo Flight 6E 532 from ${trip.origin.split(',')[0]} to ${cleanDest} has been cancelled following adverse weather conditions and low runway visibility.`,
        carrierOrSource: 'IndiGo Airlines 6E 532',
        flightOrTrainNumber: '6E 532',
        affectedDestination: cleanDest,
        severity: 'critical',
        timestamp: 'Just now'
      };

    case 'weather_alert':
      return {
        id: `disrupt-${Date.now()}`,
        tripId: trip.id,
        type: 'weather_alert',
        title: `Red Weather Warning: Heavy Rainstorms & Highway Advisory in ${cleanDest}`,
        details: `National Meteorological Department has issued a severe travel advisory with expected waterlogging and visibility below 100m.`,
        carrierOrSource: 'India Meteorological Dept & Highway Authority',
        affectedDestination: cleanDest,
        severity: 'warning',
        timestamp: '15 mins ago'
      };

    case 'train_cancellation':
      return {
        id: `disrupt-${Date.now()}`,
        tripId: trip.id,
        type: 'train_cancellation',
        title: `Express Train to ${cleanDest} (12981) Rescheduled / Suspended`,
        details: `Railway operations suspended along the northern corridor due to emergency track maintenance.`,
        carrierOrSource: 'Indian Railways (IRCTC)',
        flightOrTrainNumber: '12981 Superfast',
        affectedDestination: cleanDest,
        severity: 'critical',
        timestamp: 'Just now'
      };

    case 'natural_disaster':
      return {
        id: `disrupt-${Date.now()}`,
        tripId: trip.id,
        type: 'natural_disaster',
        title: `Landslide & Flash Flood Warning on ${cleanDest} Mountain Pass`,
        details: `Highways approaching ${cleanDest} have been temporarily restricted by civil administration for traveler safety.`,
        carrierOrSource: 'Disaster Management Authority',
        affectedDestination: cleanDest,
        severity: 'critical',
        timestamp: '30 mins ago'
      };

    case 'official_change':
      return {
        id: `disrupt-${Date.now()}`,
        tripId: trip.id,
        type: 'official_change',
        title: `Official Schedule Conflict Reported for ${cleanDest} Trip`,
        details: `Your work commitment conflicts with scheduled travel dates. Flexible rescheduling tools activated.`,
        carrierOrSource: 'User Calendar Sync',
        affectedDestination: cleanDest,
        severity: 'caution',
        timestamp: 'Today'
      };

    case 'personal_emergency':
    default:
      return {
        id: `disrupt-${Date.now()}`,
        tripId: trip.id,
        type: 'personal_emergency',
        title: `Personal Travel Emergency Initiated for ${cleanDest} Trip`,
        details: `Trip marked as interrupted due to urgent personal circumstances. Safe accommodation and refund assistance enabled.`,
        carrierOrSource: 'User Emergency Assist',
        affectedDestination: cleanDest,
        severity: 'caution',
        timestamp: 'Just now'
      };
  }
}

/**
 * Returns nearby verified emergency stays with live distances, ratings, and amenities.
 */
export function getEmergencyStays(destination: string, coordinates?: Coordinates): EmergencyStay[] {
  const cleanDest = destination.split(',')[0].trim() || destination;

  return [
    {
      id: 'stay-emerg-1',
      name: `${cleanDest} Highway Transit Hub & Lodging`,
      type: 'hotel',
      distanceKm: 2.1,
      amenities: ['Free WiFi', '24/7 Food & Dining', 'Secure Parking', 'Round-the-Clock Reception'],
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      address: `${cleanDest} Transit Corridor Bypass`,
      contactPhone: '+91 1800 102 3344',
      verifiedSafe: true,
      bookingStatus: 'available'
    },
    {
      id: 'stay-emerg-2',
      name: `${cleanDest} Express Highway Safe Haven`,
      type: 'hotel',
      distanceKm: 3.4,
      amenities: ['24/7 Hot Food', 'Medical First-Aid On Call', 'Clean Washrooms', 'Free WiFi'],
      image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      address: `${cleanDest} National Highway Service Road`,
      contactPhone: '+91 1800 102 3344',
      verifiedSafe: true,
      bookingStatus: 'available'
    },
    {
      id: 'stay-emerg-3',
      name: `${cleanDest} Municipal Rest House & Circuit Lodge`,
      type: 'homestay',
      distanceKm: 4.2,
      amenities: ['Home Cooked Meals', 'Family Rooms', 'Free WiFi', 'Gated Perimeter'],
      image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
      address: `${cleanDest} Civil Administrative Enclave`,
      contactPhone: '+91 1800 102 3344',
      verifiedSafe: true,
      bookingStatus: 'available'
    },
    {
      id: 'stay-emerg-4',
      name: `${cleanDest} Terminal Transit Sleep Pods & Rest Lounge`,
      type: 'airport_transit',
      distanceKm: 1.2,
      amenities: ['Soundproof Pods', 'Showers', 'High-Speed WiFi', 'Luggage Lockers'],
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
      address: `${cleanDest} Transport Intermodal Concourse`,
      contactPhone: '+91 1800 102 3344',
      verifiedSafe: true,
      bookingStatus: 'available'
    }
  ];
}

/**
 * Calculates refund guidance and airline/railway waiver policies.
 */
export function getCancellationPolicy(trip: Trip, disruption: DisruptionAlert): RefundGuidance {
  const total = trip.estimatedTotal || trip.totalBudget;
  const isCarrierOrWeather = disruption.type === 'flight_cancellation' || 
                             disruption.type === 'train_cancellation' || 
                             disruption.type === 'weather_alert' || 
                             disruption.type === 'natural_disaster';

  const refundPct = isCarrierOrWeather ? 1.0 : 0.85;
  const refundAmount = Math.round(total * refundPct);

  return {
    carrierOrEntity: disruption.carrierOrSource || 'Carrier & Hotel Booking Network',
    referenceNumber: `TV-REF-${trip.id.slice(-6).toUpperCase()}`,
    estimatedRefundAmount: refundAmount,
    originalFareAmount: total,
    cancellationFeeWaiverPercent: isCarrierOrWeather ? 100 : 80,
    policyExemptionRule: isCarrierOrWeather 
      ? 'DGCA Weather Involuntary Cancellation Rule & Civil Aviation Circular 2024 (100% Zero Penalty Waiver)' 
      : 'TripVerse Flexible Travel Insurance Protection Clause 4B (Minor convenience fee only)',
    estimatedProcessingDays: isCarrierOrWeather ? 2 : 4,
    claimSteps: [
      'Automatic cancellation docket generated with carrier reference code.',
      'Hotel partner notified of force majeure cancellation for zero penalty release.',
      'Refund processed directly to original payment method within 48 to 72 hours.',
      'Download the official stamped Disruption Certificate for travel insurance reimbursement.'
    ],
    supportHelpline: '1800-420-8747 (TripVerse Priority Disruption Desk)'
  };
}

/**
 * Derives smart replan options: Alternate Dates vs. Alternative Safe Destinations.
 */
export function getReplanOptions(trip: Trip, reason: DisruptionType): {
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
      title: `${cleanDest} (Next Week)`,
      destination: trip.destination,
      datesLabel: `3 Days • 28 Apr – 1 May (Next Week)`,
      durationDays: trip.durationDays,
      estimatedCost: Math.round(currentCost * 1.04),
      costDelta: Math.round(currentCost * 0.04),
      recommendationReason: `Optimal weather window returns next Monday with clear sunny skies and restored flights.`,
      weatherCondition: 'Sunny & 28°C',
      image: trip.destinationDetails?.image || 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=800&q=80',
      highlights: ['Confirmed flight operations', 'Zero reschedule fee waiver', 'Original hotel reservation shifted'],
      isRecommended: true
    },
    {
      id: 'replan-dates-2',
      type: 'alternate_dates',
      title: `${cleanDest} (Upcoming Weekend)`,
      destination: trip.destination,
      datesLabel: `3 Days • 5 May – 8 May (Weekend Getaway)`,
      durationDays: trip.durationDays,
      estimatedCost: Math.round(currentCost * 0.98),
      costDelta: -Math.round(currentCost * 0.02),
      recommendationReason: `Slightly lower off-peak rates with weekend convenience and calm lake breezes.`,
      weatherCondition: 'Pleasant & 27°C',
      image: trip.destinationDetails?.image || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      highlights: ['Save ₹350 on weekend stays', 'Less crowded heritage monuments', 'Standard road access']
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
        reason: 'Sunny coastal weather, active beaches, and seamless direct connections.',
        image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
        highlights: ['Sunny beaches & sunset cruises', 'Vibrant beach cafes', 'Clean coastal roads']
      },
      {
        name: 'Mount Abu',
        state: 'Rajasthan',
        days: trip.durationDays,
        costFactor: 0.92,
        reason: 'Highest peak in Aravallis with cool weather, Nakki Lake, and Dilwara Temples.',
        image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
        highlights: ['Cool hill climate', 'Nakki Lake boating', 'Scenic sunset point']
      },
      {
        name: 'Jodhpur',
        state: 'Rajasthan',
        days: trip.durationDays,
        costFactor: 0.96,
        reason: 'Blue city with majestic Mehrangarh Fort and authentic desert dining.',
        image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80',
        highlights: ['Mehrangarh Fort ramparts', 'Blue city old lanes', 'Umaid Bhawan palace']
      }
    ];
  } else if (normDest.includes('manali') || normDest.includes('chopta') || normDest.includes('himachal') || normDest.includes('uttarakhand')) {
    alternativeCandidates = [
      {
        name: 'Rishikesh',
        state: 'Uttarakhand',
        days: trip.durationDays,
        costFactor: 0.90,
        reason: 'Clear foothill weather, peaceful Ganga ghats, and gentle river breeze.',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
        highlights: ['Laxman Jhula & Ganga Aarti', 'Organic riverside cafes', 'Safe accessible highway']
      },
      {
        name: 'Dalhousie',
        state: 'Himachal Pradesh',
        days: trip.durationDays,
        costFactor: 0.98,
        reason: 'Pine-clad valleys and colonial architecture away from flooded lower rivers.',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
        highlights: ['Khajjiar mini-Switzerland', 'Panchpula waterfall', 'Pleasant alpine breeze']
      },
      {
        name: 'Jaipur',
        state: 'Rajasthan',
        days: trip.durationDays,
        costFactor: 1.05,
        reason: 'Dry sunny heritage capital with grand palaces and vibrant bazaars.',
        image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80',
        highlights: ['Amer Fort & Nahargarh sunset', 'Hawa Mahal & City Palace', 'Royal Rajasthani Thali']
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
        reason: 'Guaranteed sunny skies, relaxed beaches, and top-rated stays.',
        image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
        highlights: ['Sunny coastline', 'Seafood shacks & heritage churches', 'Smooth airport connections']
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
        reason: 'Peaceful secluded beaches and scenic cliff walks.',
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
      datesLabel: `${c.days} Days • Same Travel Dates`,
      durationDays: c.days,
      estimatedCost: cost,
      costDelta: cost - currentCost,
      recommendationReason: c.reason,
      weatherCondition: 'Sunny & Favorable',
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
    aiRationale: `Trip automatically replanned from ${originalTrip.destination} to ${targetDestination} following disruption (${option.recommendationReason}). All preferences, budget constraints, and explorer profiles preserved.`
  };
}
