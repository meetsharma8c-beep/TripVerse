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

  it('translates full-app strings (Hero, BottomNav, Planner, Trips, Saved, Itinerary) across all 10 languages', () => {
    const supportedLangs = ['en', 'es', 'fr', 'de', 'ja', 'hi', 'zh', 'ar', 'it', 'pt'] as const;

    for (const lang of supportedLangs) {
      // Hero search placeholder
      const searchPlaceholder = t('hero.searchPlaceholder', lang);
      expect(searchPlaceholder.length).toBeGreaterThan(0);
      expect(searchPlaceholder).not.toBe('hero.searchPlaceholder');

      // Inspiring destinations heading
      const inspiring = t('hero.inspiringDestinations', lang);
      expect(inspiring.length).toBeGreaterThan(0);
      expect(inspiring).not.toBe('hero.inspiringDestinations');

      // Bottom nav tabs
      const bottomHome = t('bottomNav.home', lang);
      const bottomItinerary = t('bottomNav.itinerary', lang);
      expect(bottomHome.length).toBeGreaterThan(0);
      expect(bottomItinerary.length).toBeGreaterThan(0);

      // Planner wizard
      const step1 = t('planner.step1Title', lang);
      expect(step1.length).toBeGreaterThan(0);
      expect(step1).not.toBe('planner.step1Title');

      // My Trips
      const tripsTitle = t('trips.title', lang);
      expect(tripsTitle.length).toBeGreaterThan(0);

      // Saved Places
      const savedTitle = t('saved.title', lang);
      expect(savedTitle.length).toBeGreaterThan(0);

      // Itinerary
      const yourItin = t('itinerary.yourItinerary', lang);
      expect(yourItin.length).toBeGreaterThan(0);
    }
  });

  it('supports dynamic parameter interpolation in translation strings', () => {
    const enStep = t('planner.stepOf', 'en', { current: 2, total: 9 });
    expect(enStep).toBe('Step 2 of 9');

    const esStep = t('planner.stepOf', 'es', { current: 3, total: 9 });
    expect(esStep).toBe('Paso 3 de 9');

    const zhStep = t('planner.stepOf', 'zh', { current: 1, total: 9 });
    expect(zhStep).toBe('第 1 步 / 共 9 步');
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

  it('translates raw English travel phrases and category titles across all 10 languages', () => {
    // Check raw phrase translation in Spanish
    expect(t('Curated Escapes & Nature Havens', 'es')).toBe('Escapadas seleccionadas y refugios naturales');
    expect(t('Typical Ground Cost', 'es')).toBe('Costo Típico en Destino');
    expect(t('Ideal Window', 'es')).toBe('Temporada Ideal');
    expect(t('Explore Details', 'es')).toBe('Explorar Detalles');
    expect(t('All Places', 'es')).toBe('Todos los Lugares');
    expect(t('Culture & Royal', 'es')).toBe('Cultura e Historia');
    expect(t('Mountains & Snow', 'es')).toBe('Montañas y Nieve');

    // Check in French
    expect(t('Curated Escapes & Nature Havens', 'fr')).toBe('Escapades sélectionnées et havres de nature');
    expect(t('Typical Ground Cost', 'fr')).toBe('Coût Terrestre Typique');
    expect(t('Explore Details', 'fr')).toBe('Explorer les Détails');

    // Check in German
    expect(t('Curated Escapes & Nature Havens', 'de')).toBe('Kuratierte Ausflugsziele & Naturparadiese');
    expect(t('Typical Ground Cost', 'de')).toBe('Typische Vor-Ort-Kosten');
    expect(t('Weather forecast', 'de')).toBe('Wettervorhersage');

    // Check in Japanese
    expect(t('Curated Escapes & Nature Havens', 'ja')).toBe('厳選されたリゾート＆大自然');
    expect(t('Typical Ground Cost', 'ja')).toBe('現地滞在費用の目安');
    expect(t('Explore Details', 'ja')).toBe('詳細を見る');

    // Check in Hindi
    expect(t('Curated Escapes & Nature Havens', 'hi')).toBe('चुनिंदा यात्राएं और प्राकृतिक स्थल');
    expect(t('Typical Ground Cost', 'hi')).toBe('विशिष्ट जमीनी खर्च');
    expect(t('All Places', 'hi')).toBe('सभी स्थान');

    // Check in Chinese
    expect(t('Curated Escapes & Nature Havens', 'zh')).toBe('精选度假胜地与自然乐园');
    expect(t('Typical Ground Cost', 'zh')).toBe('典型地面行程费用');

    // Check in Arabic
    expect(t('Curated Escapes & Nature Havens', 'ar')).toBe('رحلات مختارة وملاذات طبيعية');
    expect(t('Typical Ground Cost', 'ar')).toBe('التكلفة الميدانية النموذجية');

    // Check in Italian
    expect(t('Curated Escapes & Nature Havens', 'it')).toBe('Fughe curate e rifugi naturali');
    expect(t('Typical Ground Cost', 'it')).toBe('Costo Tipico a Terra');

    // Check in Portuguese
    expect(t('Curated Escapes & Nature Havens', 'pt')).toBe('Escapadas selecionadas e refúgios naturais');
    expect(t('Typical Ground Cost', 'pt')).toBe('Custo Típico no Destino');
  });

  it('dynamically translates compound tokens (e.g. Days, Nights, Travelers)', () => {
    expect(t('3 Days', 'es')).toBe('3 Días');
    expect(t('3 Days', 'fr')).toBe('3 Jours');
    expect(t('3 Days', 'de')).toBe('3 Tage');
    expect(t('3 Days', 'ja')).toBe('3 日間');
    expect(t('3 Days', 'hi')).toBe('3 दिन');
    expect(t('2 Nights', 'es')).toBe('2 Noches');
    expect(t('2 Nights', 'ja')).toBe('2 泊');
    expect(t('2 Travelers', 'es')).toBe('2 Viajeros');
    expect(t('4 of 8 packed', 'es')).toBe('4 de 8 empacados');
    expect(t('4 of 8 packed', 'fr')).toBe('4 sur 8 emballés');
    expect(t('4 of 8 packed', 'hi')).toBe('4 / 8 पैक किए गए');
    expect(t('Step 4', 'es')).toBe('Paso 4');
    expect(t('Step 4', 'ja')).toBe('ステップ 4');
    expect(t('Step 4', 'hi')).toBe('चरण 4');
    expect(t('Day 2', 'es')).toBe('Día 2');
    expect(t('Day 2', 'fr')).toBe('Jour 2');
    expect(t('Day 2', 'hi')).toBe('दिन 2');
    expect(t('Compare Live Transport & Booking', 'es')).toBe('Comparar Transporte y Reservas en Vivo');
    expect(t('Packing Checklist', 'fr')).toBe('Liste de Colisage');
    expect(t('TripExpenses & Group Settlement', 'hi')).toBe('TripExpenses & Group Settlement');
  });

  it('handles trailing colons, ellipses, and leading asterisks seamlessly', () => {
    // Trailing colon
    expect(t('Select Cabin Class:', 'es')).toBe('Seleccionar clase de cabina:');
    expect(t('Select Coach Class:', 'ja')).toBe('車両クラスを選択:');

    // Trailing ellipsis
    expect(t('Processing...', 'es')).toBe('Procesando...');

    // Leading asterisk note
    expect(t('* Realistic estimates based on seasonal averages. Excludes personal shopping.', 'es'))
      .toBe('* Estimaciones realistas basadas en promedios estacionales. Excluye compras personales.');
  });

  it('performs seamless bidirectional reverse lookup between non-English languages', () => {
    // If a node was previously rendered in Spanish, it can transition to Japanese
    expect(t('Guardar Cambios', 'ja')).toBe('変更を保存');
    expect(t('Guardar Cambios', 'hi')).toBe('बदलाव सहेजें');
    expect(t('Guardar Cambios', 'en')).toBe('Save Changes');

    // And French to Japanese
    expect(t('Explorer les Détails', 'ja')).toBe('詳細を見る');
    expect(t('Explorer les Détails', 'en')).toBe('Explore Details');
  });

  it('translates newly registered modal and drawer phrases accurately across languages', () => {
    // Auth Modal
    expect(t('Create your TripVerse Account', 'es')).toBe('Crea tu Cuenta de TripVerse');
    expect(t('Create your TripVerse Account', 'ja')).toBe('TripVerse アカウントを作成');

    // Replanning Modal
    expect(t('Smart replanning engine', 'es')).toBe('Motor inteligente de replanificación');
    expect(t('Smart replanning engine', 'fr')).toBe('Moteur de replanification intelligent');

    // Payment Gateway
    expect(t('Trip Payment Gateway', 'es')).toBe('Pasarela de Pago de Viaje');
    expect(t('Trip Payment Gateway', 'ja')).toBe('旅行決済ゲートウェイ');

    // Legal & Trust
    expect(t('TripVerse Legal, Privacy & Safety Trust Center', 'es'))
      .toBe('Centro de Confianza Legal, Privacidad y Seguridad de TripVerse');
  });

  it('guarantees TripVerse brand name is NEVER translated across any language', () => {
    const allLanguages: LanguageCode[] = ['en', 'es', 'fr', 'de', 'ja', 'hi', 'zh', 'ar', 'it', 'pt'];
    allLanguages.forEach((lang) => {
      expect(t('TripVerse', lang)).toBe('TripVerse');
      expect(t('tripverse', lang)).toBe('TripVerse');
      expect(t('  TripVerse  ', lang)).toBe('  TripVerse  ');
    });
  });

  it('preserves leading and trailing emojis while localizing inner phrase', () => {
    expect(t('✨ AI Route & Journey Intelligence', 'es')).toContain('✨');
    expect(t('✨ AI Route & Journey Intelligence', 'es')).toContain('Inteligencia');

    expect(t('🔒 Protected', 'es')).toContain('🔒');
    expect(t('🔒 Protected', 'es')).toContain('Protegido');

    expect(t('Continue →', 'es')).toBe('Continuar →');
    expect(t('← Back to Overview', 'es')).toBe('← Volver al Resumen');
  });

  it('translates dynamic quantity tokens cleanly', () => {
    expect(t('3 Stops', 'es')).toBe('3 Paradas');
    expect(t('5 Items', 'es')).toBe('5 Artículos');
    expect(t('2 Hours', 'es')).toBe('2 Horas');
    expect(t('4 Days Trip', 'es')).toBe('Viaje de 4 Días');
  });
});
