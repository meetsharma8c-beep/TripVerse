import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { getPassportStamps, unlockPassportStamp, getPassportProfile, INITIAL_STAMPS } from '../src/services/passportService';

describe('Digital Passport Service (passportService)', () => {
  beforeAll(() => {
    if (typeof window === 'undefined') {
      const storageMock: Record<string, string> = {};
      (globalThis as any).window = globalThis;
      (globalThis as any).localStorage = {
        getItem: (k: string) => storageMock[k] || null,
        setItem: (k: string, v: string) => { storageMock[k] = v; },
        removeItem: (k: string) => { delete storageMock[k]; },
        clear: () => { Object.keys(storageMock).forEach(k => delete storageMock[k]); }
      };
    }
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('retrieves default initial stamps starting locked until earned by the traveler', () => {
    const stamps = getPassportStamps('traveler@example.com');
    expect(stamps.length).toBeGreaterThan(5);
    const manali = stamps.find(s => s.id === 'stamp_manali_himalayas');
    expect(manali).toBeDefined();
    expect(manali?.unlockedAt).toBeNull();
  });

  it('exclusively unlocks Founder Genesis stamp for meet.sharma8c@gmail.com', () => {
    const founderStamps = getPassportStamps('meet.sharma8c@gmail.com');
    const founderGenesis = founderStamps.find(s => s.id === 'founder_genesis');
    expect(founderGenesis).toBeDefined();
    expect(founderGenesis?.isFounderOnly).toBe(true);

    const normalStamps = getPassportStamps('regular_traveler@gmail.com');
    expect(normalStamps.some(s => s.id === 'founder_genesis')).toBe(false);
  });

  it('unlocks a landmark stamp and updates persistent timestamp', () => {
    const initial = getPassportStamps('meet.sharma8c@gmail.com');
    const colosseumBefore = initial.find(s => s.id === 'stamp_colosseum');
    expect(colosseumBefore?.unlockedAt).toBeNull();

    const updated = unlockPassportStamp('stamp_colosseum');
    const colosseumAfter = updated.find(s => s.id === 'stamp_colosseum');
    expect(colosseumAfter?.unlockedAt).not.toBeNull();
  });

  it('derives accurate passport profile with tier progression and distance metrics', () => {
    const founderProfile = getPassportProfile('meet.sharma8c@gmail.com', 'Meet Sharma');
    expect(founderProfile.isFounder).toBe(true);
    expect(founderProfile.passportNumber).toBe('TV-FOUNDER-001');
    expect(founderProfile.travelTier).toBe('Cosmic Nomad');
    expect(founderProfile.countriesVisited).toBeGreaterThanOrEqual(1);

    const regularProfile = getPassportProfile('guest@example.com', 'Guest Traveler');
    expect(regularProfile.isFounder).toBe(false);
    expect(regularProfile.passportNumber).toMatch(/^TV-\d+/);
  });
});
