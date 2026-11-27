import { describe, it, expect } from 'vitest';
import { parseTripSubTab, isValidPlaceQuery } from '../src/utils/routeResolver';

describe('Carbon Audit Logic & Route Sync Guards', () => {
  it('parses valid TripDetail sub-tabs case-insensitively and rejects unknown values', () => {
    expect(parseTripSubTab('budget')).toBe('budget');
    expect(parseTripSubTab('ROUTE')).toBe('route');
    expect(parseTripSubTab(' safety ')).toBe('safety');
    expect(parseTripSubTab('breakstops')).toBe('breakstops');
    expect(parseTripSubTab('nonexistent')).toBeUndefined();
    expect(parseTripSubTab(null)).toBeUndefined();
  });

  it('rejects punctuation, pure digits, and placeholder strings in place queries', () => {
    expect(isValidPlaceQuery('???')).toBe(false);
    expect(isValidPlaceQuery('12345')).toBe(false);
    expect(isValidPlaceQuery('undefined')).toBe(false);
    expect(isValidPlaceQuery('Kyoto')).toBe(true);
    expect(isValidPlaceQuery('Amalfi Coast')).toBe(true);
  });
});
