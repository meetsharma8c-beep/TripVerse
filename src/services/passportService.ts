/**
 * Digital Passport Service (passportService.ts)
 * Collectible travel stamps, holographic visa badges, and explorer achievements.
 */

export interface PassportStamp {
  id: string;
  name: string;
  location: string;
  country: string;
  countryCode: string;
  category: 'landmark' | 'country' | 'achievement' | 'special';
  unlockedAt: string | null;
  icon: string;
  color: string;
  sealText: string;
  description: string;
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
  issueDate: string;
  expiryDate: string;
  isFounder: boolean;
  travelTier: 'Novice Explorer' | 'Continental Voyager' | 'Globetrotter' | 'Cosmic Nomad';
  stampsCount: number;
  countriesVisited: number;
  totalKmTraveled: number;
}

const STORAGE_KEY_PASSPORT_STAMPS = 'tripverse_passport_stamps_v1';
const FOUNDER_EMAIL = 'meet.sharma8c@gmail.com';

export const INITIAL_STAMPS: PassportStamp[] = [
  {
    id: 'founder_genesis',
    name: 'ConCode Core Genesis',
    location: 'TripVerse Origin',
    country: 'ConCode Universe',
    countryCode: 'VIP',
    category: 'special',
    unlockedAt: null,
    icon: '👑',
    color: '#D4AF37', // Gold
    sealText: 'VIP FOUNDER • ARCHITECT',
    description: 'Exclusive founding architect stamp honoring the creation of TripVerse.',
    isRare: true,
    isFounderOnly: true
  },
  {
    id: 'stamp_manali_himalayas',
    name: 'Himalayan Ridge Pass',
    location: 'Manali, Himachal',
    country: 'India',
    countryCode: 'IN',
    category: 'landmark',
    unlockedAt: '2026-10-15T10:00:00.000Z',
    icon: '🏔️',
    color: '#15803D', // Emerald
    sealText: 'SOLANG VALLEY • 3,200M',
    description: 'Alpine high-altitude pass verified in the pir panjal range.'
  },
  {
    id: 'stamp_eiffel_paris',
    name: 'Tour Eiffel Summit',
    location: 'Paris, Île-de-France',
    country: 'France',
    countryCode: 'FR',
    category: 'landmark',
    unlockedAt: null,
    icon: '🗼',
    color: '#1E40AF', // Royal Blue
    sealText: 'CHAMP DE MARS • PARIS',
    description: 'Summit clearance at the iron lady of Paris.'
  },
  {
    id: 'stamp_taj_mahal',
    name: 'Mughal Wonder Seal',
    location: 'Agra, Uttar Pradesh',
    country: 'India',
    countryCode: 'IN',
    category: 'landmark',
    unlockedAt: '2026-10-20T14:30:00.000Z',
    icon: '🕌',
    color: '#B45309', // Amber
    sealText: 'TAJ MAHAL • UNESCO',
    description: 'Verified visit to the ivory-white jewel of world heritage.'
  },
  {
    id: 'stamp_burj_khalifa',
    name: 'Apex of the Clouds',
    location: 'Downtown Dubai',
    country: 'United Arab Emirates',
    countryCode: 'AE',
    category: 'landmark',
    unlockedAt: null,
    icon: '🏙️',
    color: '#047857', // Teal
    sealText: 'BURJ KHALIFA • 828M',
    description: 'Conquered the highest observation deck in the world.'
  },
  {
    id: 'stamp_fushimi_inari',
    name: 'Senbon Torii Gates',
    location: 'Kyoto',
    country: 'Japan',
    countryCode: 'JP',
    category: 'landmark',
    unlockedAt: null,
    icon: '⛩️',
    color: '#DC2626', // Crimson Vermilion
    sealText: 'KYOTO • SACRED TORII',
    description: 'Crossed the vermilion labyrinth of Inari mountain.'
  },
  {
    id: 'stamp_colosseum',
    name: 'Gladiator Arena Entry',
    location: 'Rome',
    country: 'Italy',
    countryCode: 'IT',
    category: 'landmark',
    unlockedAt: null,
    icon: '🏛️',
    color: '#9333EA', // Purple
    sealText: 'ROMA • FLAVIAN ARENA',
    description: 'Walked the ancient arches of the Roman Colosseum.'
  },
  {
    id: 'stamp_marina_bay',
    name: 'SkyPark Horizon',
    location: 'Marina Bay',
    country: 'Singapore',
    countryCode: 'SG',
    category: 'landmark',
    unlockedAt: null,
    icon: '✨',
    color: '#0284C7', // Sky Blue
    sealText: 'SINGAPORE • SKYPARK',
    description: 'Cantilever skyline view overlooking the Singapore Strait.'
  },
  {
    id: 'stamp_country_india',
    name: 'Republic of India Visa',
    location: 'Border Clearance',
    country: 'India',
    countryCode: 'IN',
    category: 'country',
    unlockedAt: '2026-09-01T08:00:00.000Z',
    icon: '🇮🇳',
    color: '#EA580C', // Saffron
    sealText: 'BORDER IMMIGRATION • IN',
    description: 'Official entry stamp for the incredible subcontinent.'
  },
  {
    id: 'stamp_country_france',
    name: 'Schengen Border Seal',
    location: 'Paris CDG Airport',
    country: 'France',
    countryCode: 'FR',
    category: 'country',
    unlockedAt: null,
    icon: '🇫🇷',
    color: '#2563EB',
    sealText: 'SCHENGEN REPUBLIQUE • FR',
    description: 'European Schengen territory admission stamp.'
  },
  {
    id: 'stamp_country_japan',
    name: 'Landing Permission Japan',
    location: 'Tokyo Narita / Haneda',
    country: 'Japan',
    countryCode: 'JP',
    category: 'country',
    unlockedAt: null,
    icon: '🇯🇵',
    color: '#E11D48',
    sealText: 'IMMIGRATION BUREAU • JP',
    description: 'Cherry blossom temporary visitor landing seal.'
  },
  {
    id: 'stamp_country_uae',
    name: 'Dubai International Arrival',
    location: 'DXB Terminal 3',
    country: 'UAE',
    countryCode: 'AE',
    category: 'country',
    unlockedAt: null,
    icon: '🇦🇪',
    color: '#059669',
    sealText: 'GDRFA DUBAI • ENTRY',
    description: 'Emirates golden gate desert metropolis arrival.'
  }
];

export function getPassportStamps(userEmail?: string): PassportStamp[] {
  if (typeof window === 'undefined') return INITIAL_STAMPS;

  const isFounder = (userEmail || '').trim().toLowerCase() === FOUNDER_EMAIL;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_PASSPORT_STAMPS);
    if (!raw) {
      // Default: If founder, unlock genesis stamp automatically
      const stamps = INITIAL_STAMPS.map(s => {
        if (s.id === 'founder_genesis') {
          return { ...s, unlockedAt: isFounder ? new Date().toISOString() : null };
        }
        return s;
      });
      localStorage.setItem(STORAGE_KEY_PASSPORT_STAMPS, JSON.stringify(stamps));
      return isFounder ? stamps : stamps.filter(s => !s.isFounderOnly);
    }

    const parsed: PassportStamp[] = JSON.parse(raw);
    return isFounder ? parsed : parsed.filter(s => !s.isFounderOnly);
  } catch {
    return INITIAL_STAMPS;
  }
}

export function unlockPassportStamp(stampId: string): PassportStamp[] {
  if (typeof window === 'undefined') return INITIAL_STAMPS;

  try {
    const stamps = getPassportStamps();
    const updated = stamps.map(s => {
      if (s.id === stampId && !s.unlockedAt) {
        return { ...s, unlockedAt: new Date().toISOString() };
      }
      return s;
    });
    localStorage.setItem(STORAGE_KEY_PASSPORT_STAMPS, JSON.stringify(updated));
    return updated;
  } catch {
    return INITIAL_STAMPS;
  }
}

export function getPassportProfile(userEmail?: string, userName?: string): DigitalPassportProfile {
  const isFounder = (userEmail || '').trim().toLowerCase() === FOUNDER_EMAIL;
  const stamps = getPassportStamps(userEmail);
  const unlocked = stamps.filter(s => !!s.unlockedAt);

  const countries = new Set(unlocked.map(s => s.countryCode)).size;

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
    issueDate: '01 NOV 2026',
    expiryDate: 'PERPETUAL VIP',
    isFounder,
    travelTier: tier,
    stampsCount: unlocked.length,
    countriesVisited: Math.max(1, countries),
    totalKmTraveled: unlocked.length * 1420 + 2500
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
