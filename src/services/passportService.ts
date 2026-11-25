/**
 * Digital Passport Service (passportService.ts)
 * Collectible travel stamps, biometric visa badges, and verified explorer records.
 * 100% professional and zero-emoji compliance.
 */

import { loadTrips } from './storageService';

export interface PassportStamp {
  id: string;
  name: string;
  location: string;
  country: string;
  countryCode: string;
  category: 'landmark' | 'country' | 'achievement' | 'special';
  unlockedAt: string | null;
  icon: string; // Clean vector icon identifier (e.g. 'crown', 'mountain', 'landmark', etc.)
  color: string;
  sealText: string;
  description: string;
  portCode: string;
  vintageNumber: string;
  isRare?: boolean;
  isFounderOnly?: boolean;
}

export interface TravelBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isUnlocked: boolean;
  progress: number; // 0 - 100
}

export interface DigitalPassportProfile {
  passportNumber: string;
  holderName: string;
  email: string;
  homeCountry: string;
  nationalityCode: string;
  issueDate: string;
  expiryDate: string;
  isFounder: boolean;
  travelTier: 'Novice Explorer' | 'Continental Voyager' | 'Globetrotter' | 'Cosmic Nomad';
  stampsCount: number;
  countriesVisited: number;
  totalKmTraveled: number;
}

import { isFounderEmail } from './authService';

const STORAGE_KEY_PASSPORT_STAMPS = 'tripverse_passport_stamps_v1';

export const INITIAL_STAMPS: PassportStamp[] = [
  {
    id: 'founder_genesis',
    name: 'ConCode Core Genesis',
    location: 'TripVerse Origin',
    country: 'ConCode Universe',
    countryCode: 'VIP',
    category: 'special',
    unlockedAt: null,
    icon: 'crown',
    color: '#D4AF37', // Gold
    sealText: 'VIP FOUNDER • ARCHITECT',
    portCode: 'CC-GENESIS',
    vintageNumber: 'TV-ARCH-001',
    description: 'Exclusive founding architect clearance honoring the inception of TripVerse.',
    isRare: true,
    isFounderOnly: true
  },
  {
    id: 'stamp_manali_himalayas',
    name: 'Himalayan Ridge Pass',
    location: 'Manali, Himachal Pradesh',
    country: 'India',
    countryCode: 'IN',
    category: 'landmark',
    unlockedAt: null,
    icon: 'mountain',
    color: '#15803D', // Emerald
    sealText: 'SOLANG VALLEY • 3,200M',
    portCode: 'KUU / DEL',
    vintageNumber: 'HIM-3200-A',
    description: 'Alpine high-altitude pass verified across the Pir Panjal range.'
  },
  {
    id: 'stamp_eiffel_paris',
    name: 'Tour Eiffel Summit',
    location: 'Paris, Île-de-France',
    country: 'France',
    countryCode: 'FR',
    category: 'landmark',
    unlockedAt: null,
    icon: 'landmark',
    color: '#1E40AF', // Royal Blue
    sealText: 'CHAMP DE MARS • PARIS',
    portCode: 'CDG / PAR',
    vintageNumber: 'FR-75007-B',
    description: 'Summit clearance at the historic iron architectural monument of Paris.'
  },
  {
    id: 'stamp_taj_mahal',
    name: 'Mughal Wonder Seal',
    location: 'Agra, Uttar Pradesh',
    country: 'India',
    countryCode: 'IN',
    category: 'landmark',
    unlockedAt: null,
    icon: 'monument',
    color: '#B45309', // Amber
    sealText: 'TAJ MAHAL • UNESCO',
    portCode: 'AGR / DEL',
    vintageNumber: 'UP-282001-A',
    description: 'Verified entry to the ivory-white marble jewel of world cultural heritage.'
  },
  {
    id: 'stamp_burj_khalifa',
    name: 'Apex Observation Seal',
    location: 'Downtown Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    category: 'landmark',
    unlockedAt: null,
    icon: 'building',
    color: '#047857', // Teal
    sealText: 'BURJ KHALIFA • 828M',
    portCode: 'DXB / T3',
    vintageNumber: 'AE-DXB-828',
    description: 'Clearance verified at the highest metropolitan observation deck in the world.'
  },
  {
    id: 'stamp_fushimi_inari',
    name: 'Senbon Torii Gates',
    location: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    category: 'landmark',
    unlockedAt: null,
    icon: 'shrine',
    color: '#DC2626', // Crimson Vermilion
    sealText: 'KYOTO • SACRED TORII',
    portCode: 'KIX / UKY',
    vintageNumber: 'JP-61208-T',
    description: 'Passage verified through the historic cedar shrine path of Inari Mountain.'
  },
  {
    id: 'stamp_colosseum',
    name: 'Flavian Amphitheater Entry',
    location: 'Rome',
    country: 'Italy',
    countryCode: 'IT',
    category: 'landmark',
    unlockedAt: null,
    icon: 'arena',
    color: '#9333EA', // Imperial Purple
    sealText: 'ROMA • FLAVIAN ARENA',
    portCode: 'FCO / ROM',
    vintageNumber: 'IT-00184-C',
    description: 'Walked the ancient monumental arches of the Roman Flavian Colosseum.'
  },
  {
    id: 'stamp_marina_bay',
    name: 'SkyPark Observation Horizon',
    location: 'Marina Bay',
    country: 'Singapore',
    countryCode: 'SG',
    category: 'landmark',
    unlockedAt: null,
    icon: 'horizon',
    color: '#0284C7', // Sky Blue
    sealText: 'SINGAPORE • SKYPARK',
    portCode: 'SIN / SIN',
    vintageNumber: 'SG-018956-M',
    description: 'Cantilever skyline panoramic clearance overlooking the Singapore Strait.'
  },
  {
    id: 'stamp_country_india',
    name: 'Republic of India Border Clearance',
    location: 'Border Immigration',
    country: 'India',
    countryCode: 'IN',
    category: 'country',
    unlockedAt: null,
    icon: 'flag',
    color: '#EA580C', // Saffron
    sealText: 'IMMIGRATION BUREAU • IN',
    portCode: 'DEL / BOM',
    vintageNumber: 'IND-VIS-2601',
    description: 'Official sovereign entry clearance for the Indian subcontinent.'
  },
  {
    id: 'stamp_country_france',
    name: 'Schengen Border Seal',
    location: 'Paris CDG Airport',
    country: 'France',
    countryCode: 'FR',
    category: 'country',
    unlockedAt: null,
    icon: 'flag',
    color: '#2563EB',
    sealText: 'SCHENGEN BORDER • FR',
    portCode: 'CDG / ORY',
    vintageNumber: 'SCH-FRA-2602',
    description: 'European Schengen territory official entry and transit clearance.'
  },
  {
    id: 'stamp_country_japan',
    name: 'Landing Permission Japan',
    location: 'Tokyo Narita / Haneda',
    country: 'Japan',
    countryCode: 'JP',
    category: 'country',
    unlockedAt: null,
    icon: 'flag',
    color: '#E11D48',
    sealText: 'IMMIGRATION SERVICES • JP',
    portCode: 'NRT / HND',
    vintageNumber: 'JPN-VIS-2603',
    description: 'Ministry of Justice Japan verified temporary visitor landing seal.'
  },
  {
    id: 'stamp_country_uae',
    name: 'Dubai International Border Clearance',
    location: 'DXB Terminal 3',
    country: 'UAE',
    countryCode: 'AE',
    category: 'country',
    unlockedAt: null,
    icon: 'flag',
    color: '#059669',
    sealText: 'GDRFA DUBAI • ENTRY',
    portCode: 'DXB / DWC',
    vintageNumber: 'UAE-DXB-2604',
    description: 'General Directorate of Residency and Foreigners Affairs verified entry.'
  }
];

function loadRawPassportStamps(isFounder: boolean): PassportStamp[] {
  const raw = localStorage.getItem(STORAGE_KEY_PASSPORT_STAMPS);
  let stamps: PassportStamp[];
  if (!raw) {
    stamps = INITIAL_STAMPS.map(s => ({ ...s }));
  } else {
    const parsed: PassportStamp[] = JSON.parse(raw);
    const byId = new Map(parsed.map(s => [s.id, s]));
    stamps = INITIAL_STAMPS.map(init => byId.get(init.id) || { ...init });
  }

  let dirty = !raw;

  // Ensure Founder Genesis stamp is always unlocked for the Founder
  stamps = stamps.map(s => {
    if (s.id === 'founder_genesis' && isFounder && !s.unlockedAt) {
      dirty = true;
      return { ...s, unlockedAt: new Date().toISOString() };
    }
    return s;
  });

  // Auto-unlock stamps corresponding to real trips saved in the user's account
  try {
    const savedTrips = loadTrips().filter(t => t && t.id && t.id !== 'discovery-co-pilot');
    if (savedTrips.length > 0) {
      const unlockMap = new Map<string, string>();
      for (const trip of savedTrips) {
        const hay = `${trip.destination || ''} ${trip.name || ''} ${trip.destinationDetails?.country || ''} ${trip.destinationDetails?.state || ''}`.toLowerCase();
        const ts = trip.createdAt || new Date().toISOString();
        if (/india|manali|himachal|kasol|solang|agra|mathura|vrindavan|goa|udaipur|jaipur|kerala|munnar|ladakh|leh|varanasi|rishikesh|shimla|darjeeling|andaman|ooty|coorg|mumbai|delhi|vadodara|gujarat|rajasthan/i.test(hay)) {
          if (!unlockMap.has('stamp_country_india')) unlockMap.set('stamp_country_india', ts);
        }
        if (/manali|solang|himachal|kasol|rohtang/i.test(hay)) {
          if (!unlockMap.has('stamp_manali_himalayas')) unlockMap.set('stamp_manali_himalayas', ts);
        }
        if (/agra|taj mahal/i.test(hay)) {
          if (!unlockMap.has('stamp_taj_mahal')) unlockMap.set('stamp_taj_mahal', ts);
        }
        if (/paris|france/i.test(hay)) {
          if (!unlockMap.has('stamp_country_france')) unlockMap.set('stamp_country_france', ts);
          if (/paris|eiffel/i.test(hay) && !unlockMap.has('stamp_eiffel_paris')) {
            unlockMap.set('stamp_eiffel_paris', ts);
          }
        }
        if (/dubai|uae|united arab emirates|abu dhabi/i.test(hay)) {
          if (!unlockMap.has('stamp_country_uae')) unlockMap.set('stamp_country_uae', ts);
          if (/dubai|burj/i.test(hay) && !unlockMap.has('stamp_burj_khalifa')) {
            unlockMap.set('stamp_burj_khalifa', ts);
          }
        }
        if (/japan|tokyo|kyoto|osaka/i.test(hay)) {
          if (!unlockMap.has('stamp_country_japan')) unlockMap.set('stamp_country_japan', ts);
          if (/kyoto|fushimi|inari|tokyo|japan/i.test(hay) && !unlockMap.has('stamp_fushimi_inari')) {
            unlockMap.set('stamp_fushimi_inari', ts);
          }
        }
        if (/rome|italy|colosseum/i.test(hay)) {
          if (!unlockMap.has('stamp_colosseum')) unlockMap.set('stamp_colosseum', ts);
        }
        if (/singapore|marina bay/i.test(hay)) {
          if (!unlockMap.has('stamp_marina_bay')) unlockMap.set('stamp_marina_bay', ts);
        }
      }

      if (unlockMap.size > 0) {
        stamps = stamps.map(s => {
          const autoTs = unlockMap.get(s.id);
          if (autoTs && !s.unlockedAt) {
            dirty = true;
            return { ...s, unlockedAt: autoTs };
          }
          return s;
        });
      }
    }
  } catch {
    // Safe fallback in isolated test environments
  }

  if (dirty) {
    localStorage.setItem(STORAGE_KEY_PASSPORT_STAMPS, JSON.stringify(stamps));
  }
  return stamps;
}

export function getPassportStamps(userEmail?: string): PassportStamp[] {
  if (typeof window === 'undefined') return INITIAL_STAMPS;

  const isFounder = isFounderEmail(userEmail);

  try {
    const stamps = loadRawPassportStamps(isFounder);
    return isFounder ? stamps : stamps.filter(s => !s.isFounderOnly);
  } catch {
    return INITIAL_STAMPS;
  }
}

export function unlockPassportStamp(stampId: string, userEmail?: string): PassportStamp[] {
  if (typeof window === 'undefined') return INITIAL_STAMPS;

  const isFounder = isFounderEmail(userEmail);

  try {
    const rawStamps = loadRawPassportStamps(isFounder);
    const updated = rawStamps.map(s => {
      if (s.id === stampId && !s.unlockedAt) {
        return { ...s, unlockedAt: new Date().toISOString() };
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEY_PASSPORT_STAMPS, JSON.stringify(updated));
    return isFounder ? updated : updated.filter(s => !s.isFounderOnly);
  } catch {
    return INITIAL_STAMPS;
  }
}

export function getPassportProfile(userEmail?: string, userName?: string): DigitalPassportProfile {
  const isFounder = isFounderEmail(userEmail);
  const stamps = getPassportStamps(userEmail);
  const unlocked = stamps.filter(s => !!s.unlockedAt);

  const countrySet = new Set(unlocked.map(s => s.countryCode));
  let realTripKm = 0;
  try {
    const savedTrips = loadTrips().filter(t => t && t.id && t.id !== 'discovery-co-pilot');
    for (const trip of savedTrips) {
      realTripKm += Math.round(trip.routeDetails?.distanceKm || (trip.durationDays || 1) * 180);
      if (trip.destinationDetails?.country) {
        countrySet.add(trip.destinationDetails.country.toUpperCase().slice(0, 3));
      }
    }
  } catch {}

  const countries = countrySet.size;

  let tier: DigitalPassportProfile['travelTier'] = 'Novice Explorer';
  if (isFounder || unlocked.length >= 8) {
    tier = 'Cosmic Nomad';
  } else if (unlocked.length >= 5) {
    tier = 'Globetrotter';
  } else if (unlocked.length >= 2) {
    tier = 'Continental Voyager';
  }

  return {
    passportNumber: isFounder ? 'TV-FOUNDER-001' : `TV-${Math.abs(hashString(userEmail || 'explorer')).toString().substring(0, 6)}`,
    holderName: userName || (isFounder ? 'Meet Sharma (Founder)' : 'Traveler'),
    email: userEmail || 'traveler@tripverse.com',
    homeCountry: 'India',
    nationalityCode: 'IND',
    issueDate: '01 NOV 2026',
    expiryDate: 'PERPETUAL DIPLOMATIC',
    isFounder,
    travelTier: tier,
    stampsCount: unlocked.length,
    countriesVisited: countries,
    totalKmTraveled: Math.max(unlocked.length * 1420, realTripKm)
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
