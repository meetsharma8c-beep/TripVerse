import { describe, it, expect } from 'vitest';
import {
  getDefaultDisruptionReasonForTrip,
  getReplanOptions,
  buildCustomDateReplanOption,
  applyReplanToTrip,
} from '../src/services/replanningService';
import { generateAITrip } from '../src/services/plannerEngine';

describe('Genuine Smart Replanning Engine (replanningService)', () => {
  const mathuraTrainTrip = {
    ...generateAITrip({
      origin: 'Vadodara, Gujarat',
      destination: 'Mathura',
      durationDays: 4,
      travelersCount: 3,
      travelerType: 'family',
      budgetAmount: 84500,
      budgetMode: 'total',
      preferences: ['culture', 'spiritual'],
      transportMode: 'train',
      accommodationType: '3star',
      foodPreference: 'veg',
      priorities: ['comfort'],
      startDate: '2026-12-10',
    }),
    userId: 'user-owner-123',
    expenses: [
      {
        id: 'exp-1',
        tripId: 't-1',
        title: 'Advance Hotel Deposit',
        amount: 4500,
        category: 'accommodation' as const,
        paidBy: 'Meet',
        splitAmong: ['Meet', 'Friend'],
        date: 'Day 1',
      },
    ],
  };

  it('auto-selects mode-appropriate default disruption reason', () => {
    expect(getDefaultDisruptionReasonForTrip(mathuraTrainTrip)).toBe('train_cancellation');
    expect(getDefaultDisruptionReasonForTrip({ ...mathuraTrainTrip, transportMode: 'flight' })).toBe(
      'flight_cancellation'
    );
    expect(getDefaultDisruptionReasonForTrip({ ...mathuraTrainTrip, transportMode: 'car' })).toBe(
      'weather_alert'
    );
  });

  it('shifts startDate & every day date cleanly while preserving custom stops, userId & expenses', () => {
    const customOpt = buildCustomDateReplanOption(mathuraTrainTrip, '2026-12-20');
    expect(customOpt.newStartDate).toBe('2026-12-20');

    const shifted = applyReplanToTrip(mathuraTrainTrip, customOpt);
    expect(shifted.id).toBe(mathuraTrainTrip.id);
    expect(shifted.userId).toBe('user-owner-123');
    expect(shifted.startDate).toBe('2026-12-20');
    expect(shifted.expenses?.length).toBe(1);
    expect(shifted.itinerary.length).toBe(mathuraTrainTrip.itinerary.length);
    expect(shifted.itinerary[0].date).toBeDefined();
    expect(shifted.itinerary[0].date).not.toBe(shifted.itinerary[1].date);
  });

  it('applies 1-click Indoor Rain Shield swapping outdoor landmarks to indoor mirrors without losing trip data', () => {
    const options = getReplanOptions(mathuraTrainTrip, 'weather_alert');
    expect(options.weatherSwapOption).not.toBeNull();

    const shielded = applyReplanToTrip(mathuraTrainTrip, options.weatherSwapOption!);
    expect(shielded.userId).toBe('user-owner-123');
    expect(shielded.expenses?.length).toBe(1);
    expect(shielded.destination).toBe(mathuraTrainTrip.destination);
    expect(shielded.itinerary.some((d) => d.isWeatherSwapped)).toBe(true);
    expect(
      shielded.itinerary.flatMap((d) => d.activities).some((a) => a.isIndoorSwapped)
    ).toBe(true);
  });

  it('offers feasible transport mode switches and recalculates mode cleanly', () => {
    const options = getReplanOptions(mathuraTrainTrip, 'train_cancellation');
    expect(options.transportSwitches.length).toBeGreaterThan(0);
    const flightSwitch = options.transportSwitches.find((o) => o.newTransportMode === 'flight');
    expect(flightSwitch).toBeDefined();

    const switched = applyReplanToTrip(mathuraTrainTrip, flightSwitch!);
    expect(switched.transportMode).toBe('flight');
    expect(switched.breakStops).toEqual([]);
    expect(switched.userId).toBe('user-owner-123');
    expect(switched.expenses?.length).toBe(1);
  });

  it('suggests international peers for Paris rather than domestic Goa/Gokarna', () => {
    const parisTrip = generateAITrip({
      origin: 'Mumbai, India',
      destination: 'Paris',
      durationDays: 5,
      travelersCount: 2,
      travelerType: 'couple',
      budgetAmount: 240000,
      budgetMode: 'total',
      preferences: ['culture', 'heritage'],
      transportMode: 'flight',
      accommodationType: '4star',
      foodPreference: 'any',
      priorities: ['comfort'],
    });

    const options = getReplanOptions(parisTrip, 'flight_cancellation');
    const joined = options.newDestinations.map((d) => d.destination.toLowerCase()).join(' ');
    expect(joined).not.toContain('goa');
    expect(joined).not.toContain('gokarna');
    expect(joined).not.toContain('udaipur');
    expect(options.newDestinations.length).toBeGreaterThanOrEqual(2);
  });
});
