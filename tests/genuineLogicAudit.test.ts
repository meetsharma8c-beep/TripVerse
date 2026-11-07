import { describe, it, expect } from 'vitest';
import { generateSmartPackingList } from '../src/services/packingService';
import { getReplanOptions } from '../src/services/replanningService';
import { Trip } from '../src/types/trip';
import { POPULAR_DESTINATIONS, parseDurationDays } from '../src/data/destinations';

describe('Genuine Travel Domain Logic Verification', () => {
  const mockTokyoTrip: Trip = {
    id: 'test-tokyo-1',
    destination: 'Tokyo, Japan',
    origin: 'Delhi, India',
    startDate: '2026-12-01',
    endDate: '2026-12-07',
    durationDays: 7,
    travelStyle: 'culture',
    travelGroup: 'couple',
    transportMode: 'flight',
    totalBudget: 250000,
    itinerary: []
  };

  const mockGoaRoadTrip: Trip = {
    id: 'test-goa-1',
    destination: 'Goa',
    origin: 'Mumbai',
    startDate: '2026-12-01',
    endDate: '2026-12-05',
    durationDays: 5,
    travelStyle: 'relaxed',
    travelGroup: 'friends',
    transportMode: 'car',
    totalBudget: 40000,
    itinerary: []
  };

  it('generates international aviation packing items for Tokyo flight and excludes FASTag/tire inflator', () => {
    const items = generateSmartPackingList(mockTokyoTrip);
    const itemNames = items.map(i => i.name.toLowerCase());

    // International & flight essentials must be present
    expect(itemNames.some(n => n.includes('passport'))).toBe(true);
    expect(itemNames.some(n => n.includes('universal travel power adapter') || n.includes('adapter'))).toBe(true);
    expect(itemNames.some(n => n.includes('forex') || n.includes('currency'))).toBe(true);
    expect(itemNames.some(n => n.includes('liquids') || n.includes('cabin'))).toBe(true);

    // Car road trip items must NOT contaminate flight packing
    expect(itemNames.some(n => n.includes('fastag'))).toBe(false);
    expect(itemNames.some(n => n.includes('tire inflator'))).toBe(false);
    expect(itemNames.some(n => n.includes('puc certificate'))).toBe(false);
  });

  it('generates highway road trip items for car trips and excludes airline cabin restrictions', () => {
    const items = generateSmartPackingList(mockGoaRoadTrip);
    const itemNames = items.map(i => i.name.toLowerCase());

    // Road trip essentials must be present
    expect(itemNames.some(n => n.includes('fastag'))).toBe(true);
    expect(itemNames.some(n => n.includes('driving license') || n.includes('rc'))).toBe(true);
    expect(itemNames.some(n => n.includes('pressure gauge') || n.includes('tire'))).toBe(true);

    // International passport/eVisa should NOT be mandatory for domestic car roadtrip
    expect(itemNames.some(n => n.includes('evisa') || n.includes('embassy'))).toBe(false);
  });

  it('suggests geographically genuine alternative destinations when replanning international trips', () => {
    const replan = getReplanOptions(mockTokyoTrip, 'flight_cancellation');
    expect(replan.newDestinations.length).toBeGreaterThan(0);

    const destNames = replan.newDestinations.map(d => d.destination.toLowerCase());
    const joined = destNames.join(' ');
    // Must contain Kyoto or Osaka or Singapore, NOT domestic Indian cities like Goa or Udaipur
    expect(joined).toContain('kyoto');
    expect(joined).not.toContain('udaipur');
    expect(joined).not.toContain('gokarna');
  });

  it('guarantees realistic economic budgets for international tier-1 and domestic destinations without inadequate pre-filled numbers', () => {
    // Paris, New York, Tokyo, London, Swiss Alps must have realistic ground cost budgets (>= ₹50,000)
    const paris = POPULAR_DESTINATIONS.find((d: any) => d.id === 'paris');
    const tokyo = POPULAR_DESTINATIONS.find((d: any) => d.id === 'tokyo');
    const nyc = POPULAR_DESTINATIONS.find((d: any) => d.id === 'new-york');
    const swiss = POPULAR_DESTINATIONS.find((d: any) => d.id === 'swiss-alps');

    expect(paris.startBudget).toBeGreaterThanOrEqual(50000);
    expect(tokyo.startBudget).toBeGreaterThanOrEqual(50000);
    expect(nyc.startBudget).toBeGreaterThanOrEqual(50000);
    expect(swiss.startBudget).toBeGreaterThanOrEqual(50000);

    // Domestic destinations must have realistic ground budgets (>= ₹10,000)
    const goa = POPULAR_DESTINATIONS.find((d: any) => d.id === 'goa');
    const ladakh = POPULAR_DESTINATIONS.find((d: any) => d.id === 'ladakh');
    expect(goa.startBudget).toBeGreaterThanOrEqual(10000);
    expect(ladakh.startBudget).toBeGreaterThanOrEqual(25000);

    // Duration parser must extract clean numbers for planning wizard
    expect(parseDurationDays('5 Days')).toBe(5);
    expect(parseDurationDays('3 - 4 Days')).toBe(3);
  });
});
