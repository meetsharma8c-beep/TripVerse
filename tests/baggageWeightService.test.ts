import { describe, it, expect } from 'vitest';
import { calculateBaggageWeight, estimateItemWeight, AIRLINE_POLICIES } from '../src/services/baggageWeightService';

describe('Baggage Weight Service (baggageWeightService)', () => {
  it('correctly estimates item weights by keyword', () => {
    expect(estimateItemWeight('Denim Jeans Pants')).toBe(0.65);
    expect(estimateItemWeight('Down Feather Jacket')).toBe(0.95);
    expect(estimateItemWeight('MacBook Pro Laptop')).toBe(1.80);
    expect(estimateItemWeight('Universal Wall Charger')).toBe(0.25);
    expect(estimateItemWeight('Random Accessory')).toBe(0.30);
  });

  it('calculates safe cabin baggage status within IndiGo 7kg allowance', () => {
    const items = [
      { title: 'T-Shirt', packed: true },
      { title: 'Shorts', packed: true }
    ];
    const result = calculateBaggageWeight(items, 'INDIGO');
    expect(result.cabinLimitKg).toBe(7.0);
    expect(result.checkInLimitKg).toBe(15.0);
    expect(result.cabinStatus).toBe('safe');
  });

  it('triggers overweight warning when baggage exceeds airline limit', () => {
    const heavyItems = Array.from({ length: 30 }).map((_, i) => ({
      title: `Heavy Winter Coat & Boots ${i}`,
      packed: true
    }));
    const result = calculateBaggageWeight(heavyItems, 'INDIGO');
    expect(result.cabinStatus).toBe('overweight');
    expect(result.warningNotice).toContain('exceeds');
    expect(result.warningNotice).toContain('₹550 / kg');
  });

  it('supports major international airlines (Emirates, Singapore Airlines, Delta)', () => {
    expect(AIRLINE_POLICIES['EMIRATES'].checkInLimitKg).toBe(25.0);
    expect(AIRLINE_POLICIES['SINGAPORE'].checkInLimitKg).toBe(30.0);
    expect(AIRLINE_POLICIES['DELTA'].cabinLimitKg).toBe(8.0);
  });
});
