import { describe, it, expect } from 'vitest';
import { getFeasibleTransportModes } from '../src/services/transportFeasibilityEngine';
import { generateAITrip, PlannerInput } from '../src/services/plannerEngine';

describe('Transport Feasibility Engine — Geographic & Route Validation', () => {

  it('excludes Car, Bike, Bus, and Train for overseas international destinations (e.g. Tokyo)', () => {
    const res = getFeasibleTransportModes('Vadodara, Gujarat', 'Tokyo, Japan');

    expect(res.routeType).toBe('international_overseas');
    expect(res.recommendedDefaultMode).toBe('flight');

    // Available modes MUST only contain flight and any
    expect(res.availableModes).toContain('flight');
    expect(res.availableModes).toContain('any');
    expect(res.availableModes).not.toContain('car');
    expect(res.availableModes).not.toContain('bike');
    expect(res.availableModes).not.toContain('bus');
    expect(res.availableModes).not.toContain('train');

    // Verify unavailable reasons are set
    const carOption = res.allModes.find(m => m.id === 'car');
    expect(carOption?.isAvailable).toBe(false);
    expect(carOption?.unavailableReason).toBeDefined();

    const trainOption = res.allModes.find(m => m.id === 'train');
    expect(trainOption?.isAvailable).toBe(false);

    expect(res.transitNotice).toContain('Overseas route');
  });

  it('excludes Car, Bike, Bus, and Train for island destinations (e.g. Port Blair / Andaman)', () => {
    const res = getFeasibleTransportModes('Kolkata, West Bengal', 'Port Blair, Andaman and Nicobar Islands');

    expect(res.routeType).toBe('domestic_island');
    expect(res.recommendedDefaultMode).toBe('flight');

    expect(res.availableModes).toContain('flight');
    expect(res.availableModes).not.toContain('car');
    expect(res.availableModes).not.toContain('bike');
    expect(res.availableModes).not.toContain('bus');
    expect(res.availableModes).not.toContain('train');

    expect(res.transitNotice).toContain('Island destination');
  });

  it('excludes Train for mountain destinations without rail tracks (e.g. Manali, Spiti, Munnar)', () => {
    const res = getFeasibleTransportModes('Delhi', 'Manali, Himachal Pradesh');

    expect(res.routeType).toBe('domestic_mountain');
    expect(res.availableModes).not.toContain('train');
    expect(res.availableModes).toContain('car');
    expect(res.availableModes).toContain('bus');

    const trainOption = res.allModes.find(m => m.id === 'train');
    expect(trainOption?.isAvailable).toBe(false);
    expect(trainOption?.unavailableReason).toContain('broad-gauge trains terminate at distant railheads');

    expect(res.transitNotice).toContain('Mountain destination');
  });

  it('excludes direct Flights for short highway corridors (e.g. Mumbai to Pune)', () => {
    const res = getFeasibleTransportModes('Mumbai, Maharashtra', 'Pune, Maharashtra');

    expect(res.routeType).toBe('short_commute');
    expect(res.availableModes).not.toContain('flight');
    expect(res.availableModes).toContain('car');
    expect(res.availableModes).toContain('train');

    const flightOption = res.allModes.find(m => m.id === 'flight');
    expect(flightOption?.isAvailable).toBe(false);
    expect(flightOption?.unavailableReason).toContain('direct commercial flights are not operated');

    expect(res.transitNotice).toContain('Short corridor');
  });

  it('allows all realistic options for standard inter-city domestic routes (e.g. Ahmedabad to Jaipur)', () => {
    const res = getFeasibleTransportModes('Ahmedabad, Gujarat', 'Jaipur, Rajasthan');

    expect(res.routeType).toBe('domestic_standard');
    expect(res.availableModes).toContain('car');
    expect(res.availableModes).toContain('bus');
    expect(res.availableModes).toContain('train');
    expect(res.availableModes).toContain('flight');
    expect(res.availableModes).toContain('any');
  });

  it('auto-promotes impossible modes in plannerEngine to a feasible mode (Tokyo: car -> flight)', async () => {
    const input: PlannerInput = {
      origin: 'Mumbai, Maharashtra',
      destination: 'Tokyo, Japan',
      destinationName: 'Tokyo',
      durationDays: 5,
      travelersCount: 2,
      travelerType: 'friends',
      budgetMode: 'total',
      budgetAmount: 250000,
      transportMode: 'car', // physically impossible to drive from Mumbai to Tokyo!
      accommodationType: 'hotel',
      foodPreference: 'all',
      preferences: ['culture', 'food']
    };

    const trip = await generateAITrip(input);
    expect(trip.transportMode).toBe('flight');
    expect(trip.transportMode).not.toBe('car');
  });

  it('auto-promotes impossible train in plannerEngine for Manali to car or bus', async () => {
    const input: PlannerInput = {
      origin: 'Chandigarh',
      destination: 'Manali, Himachal Pradesh',
      destinationName: 'Manali',
      durationDays: 3,
      travelersCount: 2,
      travelerType: 'couple',
      budgetMode: 'total',
      budgetAmount: 25000,
      transportMode: 'train', // no train tracks reach Manali!
      accommodationType: 'budget',
      foodPreference: 'veg',
      preferences: ['nature', 'relaxation']
    };

    const trip = await generateAITrip(input);
    expect(trip.transportMode).not.toBe('train');
    expect(['car', 'bus', 'flight', 'bike', 'any']).toContain(trip.transportMode);
  });
});
