import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

const mockStorage: Record<string, string> = {};
beforeAll(() => {
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = String(val);
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    }
  };
});

import { computeCorridorTileUrls, latLngToTileXY } from '../src/services/offlineTripPackService';
import { evaluateDayWeatherClash, parseActivityHour24 } from '../src/services/weatherSmartRescheduler';
import {
  enableTripPriceWatch,
  evaluatePriceWatch,
  disableTripPriceWatch,
  buildDirectCheckoutLinks
} from '../src/services/priceWatchService';
import { cloneSharedTripForUser, SharedTripDocument } from '../src/services/sharedTripService';
import { Trip, DayPlan, WeatherDay } from '../src/types/trip';

function buildMockTrip(): Trip {
  return {
    id: 'trip-goa-101',
    name: 'Goa Coastal Escape',
    origin: 'Mumbai',
    destination: 'Goa',
    startDate: '2026-12-10',
    endDate: '2026-12-13',
    durationDays: 4,
    travelersCount: 2,
    travelerType: 'couple',
    transportMode: 'flight',
    accommodationType: 'hotel',
    totalBudget: 45000,
    estimatedTotal: 42000,
    budgetBreakdown: {
      transportation: 14000,
      accommodation: 15000,
      food: 7000,
      activities: 4000,
      miscellaneous: 2000
    },
    itinerary: [],
    expenses: [],
    status: 'planned',
    createdAt: '2026-11-25T10:00:00Z'
  };
}

describe('Next-Gen 5 Pillars Verification Suite', () => {
  beforeEach(() => {
    (global as any).localStorage.clear();
  });

  it('computes deduplicated Web Mercator corridor OSM tiles within cap', () => {
    const xy = latLngToTileXY(15.2993, 74.124, 12);
    expect(xy.x).toBeGreaterThan(2800);
    expect(xy.y).toBeGreaterThan(1800);

    const urls = computeCorridorTileUrls(
      [
        { lat: 15.2993, lng: 74.124 },
        { lat: 15.4909, lng: 73.8278 }
      ],
      30
    );
    expect(urls.length).toBeGreaterThan(4);
    expect(urls.length).toBeLessThanOrEqual(30);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls[0]).toMatch(/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/);
  });

  it('detects high-rain and extreme-heat clashes with outdoor stops in DayTimeline', () => {
    expect(parseActivityHour24('2:30 PM')).toBeCloseTo(14.5);

    const day: DayPlan = {
      dayNumber: 2,
      title: 'Forts & Beaches',
      theme: 'Coastal Sightseeing',
      activities: [
        {
          id: 'act-1',
          time: '10:00 AM',
          title: 'Heritage Cafe Breakfast',
          location: 'Panjim',
          description: 'Indoor breakfast cafe',
          type: 'food',
          estimatedCost: 600,
          durationMinutes: 60
        },
        {
          id: 'act-2',
          time: '1:30 PM',
          title: 'Chapora Fort & Vagator Cliff Walk',
          location: 'North Goa',
          description: 'Open-air hilltop fort viewpoint',
          type: 'viewpoint',
          estimatedCost: 0,
          durationMinutes: 90
        }
      ]
    };

    const rainyDay: WeatherDay = {
      dayNumber: 2,
      date: 'Thu, 11 Dec',
      tempC: 27,
      minTempC: 24,
      maxTempC: 29,
      condition: 'Heavy Rain Showers',
      icon: 'cloud-rain',
      rainProbPercent: 78,
      humidityPercent: 88,
      windKmh: 22,
      uvi: 5,
      aqi: 30,
      clothingTip: 'Carry poncho'
    };

    const rainClash = evaluateDayWeatherClash(day, rainyDay, 'Goa');
    expect(rainClash).not.toBeNull();
    expect(rainClash?.severity).toBe('rain');
    expect(rainClash?.affectedActivityId).toBe('act-2');
    expect(rainClash?.actionType).toBe('swap_indoor');
    expect(rainClash?.indoorFallbackTitle).toContain('Museum of Goa');

    const hotDay: WeatherDay = {
      ...rainyDay,
      rainProbPercent: 10,
      condition: 'Blazing Desert Sun',
      maxTempC: 42
    };
    const heatClash = evaluateDayWeatherClash(day, hotDay, 'Jaipur');
    expect(heatClash).not.toBeNull();
    expect(heatClash?.severity).toBe('heat');
    expect(heatClash?.affectedActivityId).toBe('act-2');
    expect(heatClash?.actionType).toBe('move_earlier');
  });

  it('tracks flight & hotel price drops and generates pre-filled direct checkout links', () => {
    const trip = buildMockTrip();
    enableTripPriceWatch(trip, 16000, 4500);

    const dropState = evaluatePriceWatch(
      trip,
      {
        isLiveMarket: true,
        provider: 'google_live_serpapi',
        currency: 'INR',
        fetchedAt: new Date().toISOString(),
        flights: {
          bestOffer: {
            totalGroupAmount: 13200,
            perPersonAmount: 6600,
            currency: 'INR',
            carrierCode: '6E',
            carrierName: 'IndiGo',
            stops: 0,
            duration: '1h 15m'
          },
          medianGroupAmount: 14000,
          sampleCount: 5,
          offers: []
        },
        hotels: [
          {
            hotelId: 'h1',
            name: 'Taj Cidade',
            rating: 4.7,
            totalStayAmount: 11400,
            nightlyRatePerRoom: 3800,
            currency: 'INR',
            roomCategory: 'Deluxe',
            available: true
          }
        ]
      },
      16000,
      4500
    );

    expect(dropState.isWatching).toBe(true);
    expect(dropState.flightDeltaInr).toBe(-2800);
    expect(dropState.hotelNightlyDeltaInr).toBe(-700);
    expect(dropState.totalTripDeltaInr).toBe(-4900); // -2800 + (-700 * 3 nights * 1 room)

    const links = buildDirectCheckoutLinks(trip, 'BOM', 'GOI');
    expect(links.googleFlightsUrl).toContain('google.com/travel/flights');
    expect(links.skyscannerUrl).toContain('/bom/goi/');
    expect(links.bookingHotelsUrl).toContain('ss=Goa');

    disableTripPriceWatch(trip.id);
    expect(evaluatePriceWatch(trip, null, 16000, 4500).isWatching).toBe(false);
  });

  it('clones shared trip and live-reprices budget when visitor customizes origin or group size', () => {
    const baseTrip = buildMockTrip();
    const sharedDoc: SharedTripDocument = {
      shareId: 'tvs_abcd1234efgh5678',
      ownerUid: 'owner-1',
      ownerName: 'Aarav',
      tripName: baseTrip.name,
      destination: baseTrip.destination,
      trip: baseTrip,
      createdAt: baseTrip.createdAt,
      updatedAt: baseTrip.createdAt,
      source: 'firestore'
    };

    const clonedFromDelhiFor4 = cloneSharedTripForUser(sharedDoc, 'visitor-99', {
      customOrigin: 'Delhi',
      customTravelers: 4
    });

    expect(clonedFromDelhiFor4.origin).toBe('Delhi');
    expect(clonedFromDelhiFor4.travelersCount).toBe(4);
    expect(clonedFromDelhiFor4.estimatedTotal).not.toBe(baseTrip.estimatedTotal);
    expect(clonedFromDelhiFor4.aiRationale).toContain('Delhi');
    expect(clonedFromDelhiFor4.aiRationale).toContain('4 traveler(s)');
  });
});
