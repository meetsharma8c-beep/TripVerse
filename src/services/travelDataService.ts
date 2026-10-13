import { BreakStop, BreakStopSection, Coordinates, Trip } from '../types/trip';

interface GeoapifyTravelDataResponse {
  route: {
    distanceKm: number;
    durationHours: number;
    encodedPolyline: string;
    originCoordinates: Coordinates;
    destinationCoordinates: Coordinates;
  };
  places: Array<{
    id: string;
    name: string;
    address: string;
    coordinates: Coordinates;
    types: string[];
    rating?: number;
    reviewCount?: number;
    mapUrl?: string;
    distanceFromStartKm: number;
    offRouteKm: number;
  }>;
  placeSearchWarnings?: BreakStopSection[];
  destinationPlaces: Array<{
    id: string;
    name: string;
    address: string;
    coordinates: Coordinates;
    types: string[];
    rating?: number;
    reviewCount?: number;
    mapUrl?: string;
  }>;
}

export async function fetchGeoapifyTravelData(origin: string | Coordinates, destination: string): Promise<GeoapifyTravelDataResponse> {
  const apiBase = window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:'
    ? 'https://tripverse-pied.vercel.app'
    : '';
  const response = await fetch(`${apiBase}/api/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination })
  });
  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorCode = typeof result.error === 'string' ? result.error : 'GEOAPIFY_TRAVEL_DATA_UNAVAILABLE';
    throw new Error(errorCode);
  }

  return result as GeoapifyTravelDataResponse;
}

function classifyPlace(types: string[]): BreakStopSection {
  if (types.some(type => type.startsWith('service.vehicle.charging_station'))) return 'ev_charging';
  if (types.some(type => type.startsWith('service.vehicle.fuel'))) return 'fuel';
  if (types.some(type => type.startsWith('healthcare.'))) return 'medical';
  return 'amenities';
}

export function getBreakStopSection(stop: BreakStop): BreakStopSection {
  if (stop.section) return stop.section;
  if (stop.evChargingAvailable) return 'ev_charging';
  if (stop.fuelStationAvailable) return 'fuel';
  if (stop.medicalFacilityAvailable) return 'medical';
  return 'amenities';
}

function hasPlaceType(types: string[], category: string): boolean {
  return types.some(type => type === category || type.startsWith(`${category}.`));
}

export function applyGeoapifyTravelData(trip: Trip, data: GeoapifyTravelDataResponse): Trip {
  const breakStops: BreakStop[] = data.places.map(place => ({
    id: `geoapify-${place.id}`,
    source: 'geoapify_places',
    mapUrl: place.mapUrl,
    section: classifyPlace(place.types),
    name: place.name,
    category: classifyPlace(place.types) === 'fuel'
      ? 'fuel_plaza'
      : classifyPlace(place.types) === 'amenities' && place.types.some(type => type.startsWith('tourism.'))
        ? 'scenic_rest_stop'
        : place.types.includes('catering.cafe')
          ? 'dhaba'
          : 'highway_food_court',
    rating: place.rating,
    reviewCount: place.reviewCount,
    detourDistanceKm: place.offRouteKm,
    distanceFromStartKm: place.distanceFromStartKm,
    foodAvailable: place.types.some(type => ['catering.restaurant', 'catering.cafe'].includes(type)) || undefined,
    washroomAvailable: hasPlaceType(place.types, 'amenity.toilets') || undefined,
    parkingAvailable: hasPlaceType(place.types, 'parking') || undefined,
    restAreaAvailable: hasPlaceType(place.types, 'highway.rest_area') ||
      hasPlaceType(place.types, 'highway.services') ||
      hasPlaceType(place.types, 'leisure.picnic') || undefined,
    fuelStationAvailable: hasPlaceType(place.types, 'service.vehicle.fuel') || undefined,
    evChargingAvailable: hasPlaceType(place.types, 'service.vehicle.charging_station') || undefined,
    medicalFacilityAvailable: place.types.some(type => type.startsWith('healthcare.')) || undefined,
    openingHours: 'Check the listing for current hours',
    estimatedStopMinutes: 30,
    image: '',
    description: place.address || 'OpenStreetMap place listing. Confirm details before travelling.',
    recommendationReason: 'Geoapify place listing near the calculated driving route; route proximity is approximate.',
    coordinates: place.coordinates
  }));

  const attractions = data.destinationPlaces.filter(place =>
    place.types.some(type => type.startsWith('tourism.') || type === 'leisure.park')
  );
  const restaurants = data.destinationPlaces.filter(place =>
    place.types.some(type => ['catering.restaurant', 'catering.cafe'].includes(type))
  );
  const accommodations = data.destinationPlaces.filter(place => typeIsAccommodation(place.types));
  let attractionIndex = 0;
  let restaurantIndex = 0;
  let accommodationIndex = 0;
  const routeDistanceKm = data.route.distanceKm;
  const eligibleStops = breakStops.filter(stop =>
    stop.distanceFromStartKm >= routeDistanceKm * 0.15 &&
    stop.distanceFromStartKm <= routeDistanceKm * 0.85
  );
  const firstStop = eligibleStops.sort((a, b) =>
    Math.abs(a.distanceFromStartKm - routeDistanceKm / 2) -
    Math.abs(b.distanceFromStartKm - routeDistanceKm / 2)
  )[0];
  const itinerary = trip.itinerary.map(day => ({
    ...day,
    activities: day.activities.map(activity => {
      if (activity.isCustom || !activity.id.startsWith('act-')) return activity;
      if (activity.type === 'breakstop') {
        if (activity.id !== 'act-1-bs' || !firstStop) {
          return {
            ...activity,
            title: 'Plan a rest break',
            location: 'Along the route — choose a suitable stop',
            description: 'Suggested break timing only; confirm a suitable stop and its facilities before travelling.',
            tag: 'Suggested break'
          };
        }
        return {
          ...activity,
          title: firstStop.name,
          location: firstStop.description,
          distanceKm: firstStop.distanceFromStartKm,
          coordinates: firstStop.coordinates,
          source: 'geoapify_places' as const,
          mapUrl: firstStop.mapUrl,
          description: 'Geoapify place listing based on OpenStreetMap data near the route. Confirm facilities and opening hours before departure.',
          tag: 'Geoapify / OpenStreetMap listing'
        };
      }

      let candidates: typeof data.destinationPlaces;
      let candidateIndex: number;
      if (activity.type === 'food') {
        candidates = restaurants;
        candidateIndex = restaurantIndex++;
      } else if (activity.type === 'hotel') {
        candidates = accommodations;
        candidateIndex = accommodationIndex++;
      } else if (activity.type === 'attraction' || activity.type === 'viewpoint') {
        candidates = attractions;
        candidateIndex = attractionIndex++;
      } else {
        return activity;
      }
      const place = candidates[candidateIndex];

      if (place) {
        return {
          ...activity,
          title: place.name,
          location: place.address || trip.destination,
          coordinates: place.coordinates,
          source: 'geoapify_places' as const,
          mapUrl: place.mapUrl,
          description: 'Geoapify place listing based on OpenStreetMap data. Confirm availability, entry, menu, and details directly before visiting.',
          tag: 'Geoapify / OpenStreetMap listing'
        };
      }

      return activity;
    })
  }));

  return {
    ...trip,
    breakStops,
    itinerary,
    travelDataStatus: 'live',
    travelDataWarnings: data.placeSearchWarnings || [],
    routeDetails: {
      ...data.route,
      source: 'geoapify_routing',
      origin: trip.origin,
      destination: trip.destination
    },
    aiRationale: trip.aiRationale?.replace(/with verified highway route \(~[\d,]+ km\), .*? and 2 midway break stops\./, `with a Geoapify driving route (~${data.route.distanceKm} km) and nearby Geoapify/OpenStreetMap listings.`)
  };
}

function typeIsAccommodation(types: string[]): boolean {
  return types.some(type => type.startsWith('accommodation.'));
}
