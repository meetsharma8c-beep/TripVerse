import { StructuredItinerary, StructuredItineraryDay, Trip } from '../types/trip';

export interface ConcodeSessionState {
  sessionId?: string;
  destination?: string;
  destinationName?: string;
  durationDays?: number;
  budget?: number;
  travelersCount?: number;
  preferences?: string[];
  stage: 'idle' | 'clarifying' | 'planned' | 'modifying';
  draftItinerary?: StructuredItinerary;
  lastUpdated?: number;
}

import { getCurrentUser } from './authService';

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  const user = getCurrentUser();
  return user?.uid ? window.localStorage : window.sessionStorage;
}

function getSessionKey(): string {
  const user = getCurrentUser();
  return user?.uid ? `tripverse_concode_session_u_${user.uid}` : 'tripverse_concode_session_guest';
}

const INITIAL_SESSION: ConcodeSessionState = {
  stage: 'idle',
  preferences: []
};

let memorySession: ConcodeSessionState = { ...INITIAL_SESSION };

/**
 * Get the current active multi-turn ConCode AI session state
 * (Session-only for guests, persistent for logged-in users)
 */
export function getConcodeSession(): ConcodeSessionState {
  try {
    const storage = getSessionStorage();
    if (storage) {
      const key = getSessionKey();
      const raw = storage.getItem(key);
      if (raw) {
        memorySession = { ...INITIAL_SESSION, ...JSON.parse(raw) };
        return memorySession;
      }
    }
  } catch {}
  return memorySession;
}

/**
 * Update the active multi-turn session
 */
export function updateConcodeSession(partial: Partial<ConcodeSessionState>): ConcodeSessionState {
  const current = getConcodeSession();
  memorySession = {
    ...current,
    ...partial,
    lastUpdated: Date.now()
  };

  try {
    const storage = getSessionStorage();
    if (storage) {
      storage.setItem(getSessionKey(), JSON.stringify(memorySession));
    }
  } catch {}
  return memorySession;
}

/**
 * Reset the session back to fresh state
 */
export function resetConcodeSession(): void {
  memorySession = { ...INITIAL_SESSION };
  try {
    const storage = getSessionStorage();
    if (storage) {
      storage.removeItem(getSessionKey());
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('tripverse_concode_session_guest');
      sessionStorage.removeItem('tripverse_concode_session');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tripverse_concode_session_guest');
      localStorage.removeItem('tripverse_concode_session');
    }
  } catch {}
}

/**
 * Extract destination name from user utterance
 */
export function extractDestinationFromQuery(text: string): string | null {
  const norm = text.toLowerCase().trim();

  // 1. Known top destinations check first (highest precision)
  const knownPlaces = [
    'Dubai', 'Japan', 'Tokyo', 'Switzerland', 'Paris', 'London', 'Bali', 'Singapore', 'Thailand', 'Rome',
    'Udaipur', 'Manali', 'Goa', 'Gokarna', 'Chopta', 'Dhanushkodi', 'Polo Forest', 'Spiti Valley',
    'Varanasi', 'Jaipur', 'Jodhpur', 'Kerala', 'Munnar', 'Varkala', 'Kashmir', 'Ladakh', 'Amritsar',
    'Rishikesh', 'Meghalaya', 'Andaman', 'Shimla', 'Ooty', 'Coorg', 'Hampi', 'New York', 'Iceland'
  ];

  for (const place of knownPlaces) {
    const rx = new RegExp(`\\b${place}\\b`, 'i');
    if (rx.test(norm)) {
      return place;
    }
  }

  // Common direct destination queries with strict word boundaries
  const patterns = [
    /\b(?:travel to|trip to|vacation in|holiday in|journey to)\s+([a-zA-Z\s]+?)(?:\s+(?:for|with|in|on|budget|and)|$|[.,!?])/i,
    /\b(?:plan a|plan)\s+(?:\d+[\s-]*(?:day|days|night|nights))?\s*(?:trip to|tour to|journey to)\s+([a-zA-Z\s]+?)(?:\s+(?:for|with|budget)|$|[.,!?])/i,
    /\b(?:in|at)\s+([a-zA-Z\s]+?)(?:\s+(?:for|with|budget)|$|[.,!?])/i
  ];

  const invalidCandidates = [
    'the', 'a', 'an', 'my', 'our', 'next', 'some', 'cheap', 'budget', 'luxury', 
    'this trip', 'trip', 'itinerary', 'places', 'are the best', 'best places',
    'best places to visit', 'should i pack', 'places to visit'
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const candLower = candidate.toLowerCase();
      if (!invalidCandidates.some(inv => candLower === inv || candLower.startsWith(inv)) && candidate.length >= 3 && candidate.length <= 30) {
        return candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  return null;
}

/**
 * Extract trip duration in days from text
 */
export function extractDurationFromQuery(text: string): number | null {
  const norm = text.toLowerCase().trim();

  // Pattern: "10 days", "5-day", "3 days", "for 4 days", "a week", "weekend"
  if (norm.includes('weekend') || norm.includes('2 days') || norm.includes('2 day')) return 2;
  if (norm.includes('a week') || norm.includes('one week') || norm.includes('7 days') || norm.includes('7 day')) return 7;
  if (norm.includes('2 weeks') || norm.includes('two weeks') || norm.includes('14 days')) return 14;

  const match = norm.match(/(\d+)\s*(?:days?|day|nights?|night)/i);
  if (match && match[1]) {
    const days = parseInt(match[1], 10);
    if (days >= 1 && days <= 30) {
      return days;
    }
  }

  // Isolated number if session is already asking for days (e.g. User says just "10" or "5")
  if (/^\d{1,2}$/.test(norm)) {
    const val = parseInt(norm, 10);
    if (val >= 1 && val <= 30) return val;
  }

  return null;
}

/**
 * Extract budget amount from text
 */
export function extractBudgetFromQuery(text: string): number | null {
  const norm = text.toLowerCase().trim();

  // Check for lakh: e.g. "1.5 lakh", "1 lakh", "2.5 lakhs", "1.5L"
  const lakhMatch = norm.match(/([\d.]+)\s*(?:lakhs?|lakh|lac|lacs|l)\b/i);
  if (lakhMatch && lakhMatch[1]) {
    const num = parseFloat(lakhMatch[1]);
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 100000);
    }
  }

  // Check for 'k': e.g. "50k", "80k"
  const kMatch = norm.match(/([\d.]+)\s*k\b/i);
  if (kMatch && kMatch[1]) {
    const num = parseFloat(kMatch[1]);
    if (!isNaN(num) && num > 0) {
      return Math.round(num * 1000);
    }
  }

  // Check for direct currency formatted numbers: e.g. "₹1,50,000", "₹100000", "150000", "$2000"
  const directMatch = norm.match(/(?:₹|rs\.?|inr|\$|€|£|budget\s*(?:of|is)?)\s*([\d,]+)/i);
  if (directMatch && directMatch[1]) {
    const clean = directMatch[1].replace(/,/g, '');
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 1000 && num <= 50000000) {
      return num;
    }
  }

  // General isolated formatted number with commas: e.g. "1,00,000" or "100000"
  const numOnlyMatch = norm.match(/\b\d{1,3}(?:,\d{2,3})+\b/);
  if (numOnlyMatch) {
    const clean = numOnlyMatch[0].replace(/,/g, '');
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num >= 1000) return num;
  }

  return null;
}

/**
 * Extract preferences from text (e.g. food, architecture, nature, beach, luxury, budget)
 */
export function extractPreferencesFromQuery(text: string): string[] {
  const norm = text.toLowerCase();
  const found: string[] = [];

  const map: Record<string, string> = {
    food: 'food',
    culinary: 'food',
    dining: 'food',
    cuisine: 'food',
    restaurants: 'food',
    architecture: 'architecture',
    buildings: 'architecture',
    monuments: 'architecture',
    skylines: 'architecture',
    nature: 'nature',
    mountains: 'nature',
    hills: 'nature',
    hiking: 'nature',
    beach: 'beach',
    coastal: 'beach',
    sea: 'beach',
    adventure: 'adventure',
    safari: 'adventure',
    desert: 'adventure',
    history: 'culture',
    culture: 'culture',
    heritage: 'culture',
    temples: 'culture',
    shopping: 'shopping',
    markets: 'shopping',
    souks: 'shopping',
    relaxed: 'relaxed',
    chill: 'relaxed',
    leisure: 'relaxed',
    'pure veg': 'vegetarian',
    veg: 'vegetarian',
    vegetarian: 'vegetarian'
  };

  for (const [kw, pref] of Object.entries(map)) {
    const rx = new RegExp(`\\b${kw}\\b`, 'i');
    if (rx.test(norm) && !found.includes(pref)) {
      found.push(pref);
    }
  }

  return found;
}
