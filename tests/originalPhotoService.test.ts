import { describe, it, expect } from 'vitest';
import { 
  extractCleanLandmarkName, 
  fetchOriginalPhoto, 
  enrichTripWithOriginalPhotos,
  getInstantPhoto
} from '../src/services/originalPhotoService';
import { Trip } from '../src/types/trip';

describe('Original Photo Resolution Service', () => {

  it('correctly extracts clean landmark queries from complex itinerary titles', () => {
    const candidates = extractCleanLandmarkName('Day 1 — Arrival & Shibuya Crossing Experience', 'Tokyo, Japan');
    expect(candidates).toContain('Shibuya Crossing');
    expect(candidates).toContain('Tokyo');
  });

  it('correctly extracts landmark from temple and visit titles', () => {
    const candidates = extractCleanLandmarkName('Morning Visit to Senso-ji Temple and Asakusa', 'Tokyo');
    expect(candidates.some(c => c.toLowerCase().includes('senso-ji') || c.toLowerCase().includes('asakusa'))).toBe(true);
  });

  it('fetches genuine original photographic image for Tokyo from Wikimedia / curated sources', async () => {
    const photo = await fetchOriginalPhoto('Tokyo', 'Japan');
    expect(photo).toBeTruthy();
    expect(typeof photo).toBe('string');
    // Must NOT be an svg, flag, or map
    expect(photo?.toLowerCase()).not.toContain('.svg');
    expect(photo?.toLowerCase()).not.toContain('flag_of');
    expect(photo?.toLowerCase()).not.toContain('map_of');
  });

  it('fetches genuine photographic image for Shibuya Crossing', async () => {
    const photo = await fetchOriginalPhoto('Shibuya Crossing', 'Tokyo');
    expect(photo).toBeTruthy();
    expect(photo?.toLowerCase()).not.toContain('.svg');
  });

  it('returns instant photo from curated catalog without network delay', () => {
    const photo = getInstantPhoto('tokyo');
    expect(photo).toBeTruthy();
    expect(photo).toContain('images.unsplash.com');
  });

  it('enriches an entire trip during plan generation with original photos', async () => {
    const mockTrip: Trip = {
      id: 'test-tokyo-trip',
      name: 'Vadodara to Tokyo',
      origin: 'Vadodara, Gujarat',
      destination: 'Tokyo, Japan',
      destinationDetails: {
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', // mock generic mountain image
        state: 'Tokyo',
        country: 'Japan',
        description: 'Trip to Tokyo'
      },
      durationDays: 3,
      travelersCount: 2,
      travelerType: 'friends',
      totalBudget: 200000,
      budgetPerPerson: 100000,
      preferences: ['culture', 'food'],
      transportMode: 'flight',
      accommodationType: 'budget',
      foodPreference: 'veg',
      priorities: ['budget'],
      status: 'upcoming',
      createdAt: new Date().toISOString(),
      itinerary: [
        {
          dayNumber: 1,
          title: 'Day 1 — Arrival & Shibuya Crossing Experience',
          theme: 'Arrival & Shibuya',
          dayEstimatedCost: 40000,
          activities: [
            {
              id: 'act-1-sight',
              dayNumber: 1,
              time: '3:00 PM',
              title: 'Shibuya Crossing',
              type: 'attraction',
              location: 'Shibuya, Tokyo',
              estimatedCost: 0,
              travelTimeMin: 20,
              distanceKm: 2,
              description: 'World-famous scramble crossing',
              coordinates: { lat: 35.6595, lng: 139.7005 }
            }
          ]
        }
      ],
      breakStops: [],
      budgetBreakdown: {
        transportation: 50000,
        accommodation: 50000,
        food: 50000,
        activities: 30000,
        miscellaneous: 20000
      },
      estimatedTotal: 200000,
      routeType: 'international_overseas',
      selectedHotel: {
        id: 'tyo-hotel-gracery',
        name: 'Hotel Gracery Shinjuku',
        destination: 'Tokyo, Japan',
        tier: 'mid_range',
        starRating: 4,
        userRating: 4.5,
        reviewCount: 5000,
        nightlyRate: 14000,
        currency: 'INR',
        image: '',
        address: 'Shinjuku',
        neighborhood: 'Kabukicho',
        amenities: ['Wi-Fi'],
        roomType: 'Double',
        bookingUrl: 'https://booking.com',
        bookingPartner: 'Booking.com',
        cancellationPolicy: 'Free',
        highlights: ['Godzilla']
      }
    };

    const enriched = await enrichTripWithOriginalPhotos(mockTrip, 'Tokyo, Japan');

    // Destination image must no longer be the mock image
    expect(enriched.destinationDetails?.image).not.toBe('https://images.unsplash.com/photo-1506744038136-46273834b3fb');
    expect(enriched.destinationDetails?.image).toBeTruthy();

    // Day 1 image must be populated with a genuine photo of Shibuya Crossing / Tokyo
    expect(enriched.itinerary[0].image).toBeTruthy();
    expect(enriched.itinerary[0].image?.toLowerCase()).not.toContain('photo-1506744038136-46273834b3fb');

    // Hotel must have an image
    expect(enriched.selectedHotel?.image).toBeTruthy();
  });
});
