import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Polyfill localStorage & window for Node test environment
const mockStorage: Record<string, string> = {};
const eventListeners: Record<string, Function[]> = {};

beforeAll(() => {
  (global as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = String(val); },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    }
  };
  (global as any).window = {
    location: { origin: 'https://tripverse-pied.vercel.app' },
    dispatchEvent: (event: any) => {
      const listeners = eventListeners[event.type] || [];
      listeners.forEach(fn => fn(event));
      return true;
    },
    addEventListener: (type: string, fn: Function) => {
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      if (eventListeners[type]) {
        eventListeners[type] = eventListeners[type].filter(f => f !== fn);
      }
    }
  };
  (global as any).CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, params?: { detail: any }) {
      this.type = type;
      this.detail = params?.detail;
    }
  };
});

import {
  LANGUAGES,
  getActiveLanguage,
  setActiveLanguage,
  t,
  STORAGE_KEY_LANGUAGE
} from '../src/services/languageService';
import { buildPrompt } from '../src/services/aiTripPlanner';
import { Trip } from '../types/trip';

describe('Global Language & Localization (i18n) Engine', () => {
  beforeEach(() => {
    (global as any).localStorage.clear();
    setActiveLanguage('en');
  });

  it('supports 10 iconic worldwide languages with native names, flags, and direction', () => {
    const supportedCodes = ['en', 'es', 'fr', 'de', 'ja', 'hi', 'zh', 'ar', 'it', 'pt'] as const;
    
    for (const code of supportedCodes) {
      const config = LANGUAGES[code];
      expect(config).toBeDefined();
      expect(config.code).toBe(code);
      expect(config.name.length).toBeGreaterThan(0);
      expect(config.nativeName.length).toBeGreaterThan(0);
      expect(config.flag.length).toBeGreaterThan(0);
      expect(config.dir).toMatch(/ltr|rtl/);
      expect(config.defaultCurrency).toBeDefined();
    }

    expect(LANGUAGES.ar.dir).toBe('rtl');
    expect(LANGUAGES.ja.nativeName).toBe('日本語');
    expect(LANGUAGES.hi.nativeName).toBe('हिन्दी');
    expect(LANGUAGES.es.nativeName).toBe('Español');
  });

  it('translates core navigation, buttons, and form labels seamlessly across languages', () => {
    // English
    expect(t('nav.home', 'en')).toBe('Home');
    expect(t('cta.startPlanning', 'en')).toBe('Plan My Trip');

    // Spanish
    expect(t('nav.home', 'es')).toBe('Inicio');
    expect(t('cta.startPlanning', 'es')).toBe('Planear Mi Viaje');

    // French
    expect(t('nav.home', 'fr')).toBe('Accueil');
    expect(t('cta.startPlanning', 'fr')).toBe('Planifier Mon Voyage');

    // German
    expect(t('nav.home', 'de')).toBe('Startseite');
    expect(t('cta.startPlanning', 'de')).toBe('Reise planen');

    // Japanese
    expect(t('nav.home', 'ja')).toBe('ホーム');
    expect(t('cta.startPlanning', 'ja')).toBe('旅行を計画する');

    // Hindi
    expect(t('nav.home', 'hi')).toBe('होम');
    expect(t('cta.startPlanning', 'hi')).toBe('मेरी ट्रिप प्लान करें');

    // Fallback for non-existent key returns key itself
    expect(t('non.existent.key', 'es')).toBe('non.existent.key');
  });

  it('persists selected language in localStorage and dispatches global event', () => {
    let capturedEventDetail: string | null = null;
    const listener = (e: any) => {
      capturedEventDetail = e.detail;
    };

    (global as any).window.addEventListener('tripverse_language_change', listener);

    setActiveLanguage('ja');

    expect((global as any).localStorage.getItem(STORAGE_KEY_LANGUAGE)).toBe('ja');
    expect(getActiveLanguage()).toBe('ja');
    expect(capturedEventDetail).toBe('ja');

    (global as any).window.removeEventListener('tripverse_language_change', listener);
  });

  it('injects active language into the AI trip planning prompt', () => {
    setActiveLanguage('es');

    const mockTrip: Trip = {
      id: 'test-trip-1',
      title: 'Trip to Tokyo',
      destination: 'Tokyo, Japan',
      origin: 'Madrid',
      startDate: '2026-05-01',
      endDate: '2026-05-04',
      durationDays: 3,
      totalBudget: 2500,
      currency: 'EUR',
      travelersCount: 2,
      travelerType: 'couple',
      foodPreference: 'all',
      preferences: ['culture'],
      priorities: ['experience'],
      transportMode: 'flight',
      accommodationType: 'boutique',
      itinerary: [],
      budgetBreakdown: { accommodation: 1000, activities: 800, food: 500, transport: 200 },
      highlights: [],
      packingList: [],
      createdAt: '2026-05-01'
    };

    const prompt = buildPrompt({
      destination: 'Tokyo, Japan',
      origin: 'Madrid',
      durationDays: 3,
      budgetAmount: 2500,
      currency: 'EUR',
      travelersCount: 2,
      travelerType: 'couple',
      foodPreference: 'all',
      preferences: ['culture'],
      priorities: ['experience']
    }, mockTrip);

    expect(prompt).toContain('The traveler\'s active language is Spanish');
    expect(prompt).toContain('"language": "es"');
  });
});
