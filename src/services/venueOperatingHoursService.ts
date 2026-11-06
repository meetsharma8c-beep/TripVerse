/**
 * TRIPVERSE VENUE OPERATING HOURS & CLOSURE FEASIBILITY SERVICE
 * 
 * Validates venue operating hours, seasonal schedules, and day-of-week closures
 * (e.g. Louvre closed Tuesdays, Vatican Museums closed Sundays) to prevent
 * impossible itineraries.
 */

export interface VenueRule {
  nameMatch: RegExp;
  category: 'museum' | 'palace' | 'temple' | 'market' | 'nature' | 'viewpoint';
  openTimeMinutes: number;  // Minutes from midnight (e.g. 9:30 AM = 570)
  closeTimeMinutes: number; // Minutes from midnight (e.g. 5:30 PM = 1050)
  closedDaysOfWeek: number[]; // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  closureNote: string;
}

export const KNOWN_VENUE_RULES: VenueRule[] = [
  // Paris
  {
    nameMatch: /louvre/i,
    category: 'museum',
    openTimeMinutes: 540,  // 9:00 AM
    closeTimeMinutes: 1080, // 6:00 PM (9:45 PM on Fridays)
    closedDaysOfWeek: [2], // Tuesday
    closureNote: 'Musée du Louvre is closed every Tuesday.'
  },
  {
    nameMatch: /orsay/i,
    category: 'museum',
    openTimeMinutes: 570,  // 9:30 AM
    closeTimeMinutes: 1080, // 6:00 PM
    closedDaysOfWeek: [1], // Monday
    closureNote: "Musée d'Orsay is closed every Monday."
  },
  {
    nameMatch: /pompidou/i,
    category: 'museum',
    openTimeMinutes: 660,  // 11:00 AM
    closeTimeMinutes: 1260, // 9:00 PM
    closedDaysOfWeek: [2], // Tuesday
    closureNote: 'Centre Pompidou is closed every Tuesday.'
  },
  {
    nameMatch: /versailles/i,
    category: 'palace',
    openTimeMinutes: 540,  // 9:00 AM
    closeTimeMinutes: 1110, // 6:30 PM
    closedDaysOfWeek: [1], // Monday
    closureNote: 'Palace of Versailles is closed on Mondays.'
  },

  // Rome / Vatican
  {
    nameMatch: /vatican|sistine/i,
    category: 'museum',
    openTimeMinutes: 540,  // 9:00 AM
    closeTimeMinutes: 1080, // 6:00 PM
    closedDaysOfWeek: [0], // Sunday (except last Sunday of month)
    closureNote: 'Vatican Museums and Sistine Chapel are closed on Sundays.'
  },
  {
    nameMatch: /borghese/i,
    category: 'museum',
    openTimeMinutes: 540,  // 9:00 AM
    closeTimeMinutes: 1140, // 7:00 PM
    closedDaysOfWeek: [1], // Monday
    closureNote: 'Galleria Borghese is closed on Mondays (advance booking required).'
  },

  // Florence
  {
    nameMatch: /uffizi|accademia/i,
    category: 'museum',
    openTimeMinutes: 495,  // 8:15 AM
    closeTimeMinutes: 1110, // 6:30 PM
    closedDaysOfWeek: [1], // Monday
    closureNote: 'Uffizi & Accademia Galleries are closed on Mondays.'
  },

  // New York
  {
    nameMatch: /guggenheim/i,
    category: 'museum',
    openTimeMinutes: 630,  // 10:30 AM
    closeTimeMinutes: 1050, // 5:30 PM
    closedDaysOfWeek: [], // Open 7 days
    closureNote: 'Guggenheim Museum open daily.'
  },

  // Tokyo
  {
    nameMatch: /tokyo national museum/i,
    category: 'museum',
    openTimeMinutes: 570,  // 9:30 AM
    closeTimeMinutes: 1020, // 5:00 PM
    closedDaysOfWeek: [1], // Monday
    closureNote: 'Tokyo National Museum is closed on Mondays.'
  },
  {
    nameMatch: /tsukiji outer market/i,
    category: 'market',
    openTimeMinutes: 300,  // 5:00 AM
    closeTimeMinutes: 840,  // 2:00 PM
    closedDaysOfWeek: [0, 3], // Sunday, Wednesday
    closureNote: 'Tsukiji Outer Market wholesale stalls are predominantly closed on Sundays & Wednesdays.'
  }
];

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 720;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = (match[3] || '').toUpperCase();

  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export interface OperatingCheckResult {
  isOpen: boolean;
  reason?: string;
  suggestedAlternative?: string;
  category: 'museum' | 'palace' | 'temple' | 'market' | 'nature' | 'viewpoint' | 'general';
}

/**
 * Checks whether a given venue is open on the specified date and time.
 */
export function verifyVenueFeasibility(
  venueName: string,
  dateInput: string | Date,
  timeOfDay: string
): OperatingCheckResult {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const dayOfWeek = isNaN(d.getTime()) ? 1 : d.getDay();
  const timeMinutes = parseTimeToMinutes(timeOfDay);

  const matchedRule = KNOWN_VENUE_RULES.find(r => r.nameMatch.test(venueName));
  if (matchedRule) {
    if (matchedRule.closedDaysOfWeek.includes(dayOfWeek)) {
      return {
        isOpen: false,
        reason: `${venueName}: ${matchedRule.closureNote}`,
        suggestedAlternative: `${venueName.split(' ')[0]} Historic Promenade & Architectural Facade`,
        category: matchedRule.category
      };
    }
    if (timeMinutes < matchedRule.openTimeMinutes || timeMinutes > matchedRule.closeTimeMinutes) {
      return {
        isOpen: false,
        reason: `${venueName} operating hours are ~${Math.floor(matchedRule.openTimeMinutes / 60)}:00 to ~${Math.floor(matchedRule.closeTimeMinutes / 60)}:00. Scheduling at ${timeOfDay} falls outside open hours.`,
        suggestedAlternative: `${venueName} (Adjusted to Daytime Hours)`,
        category: matchedRule.category
      };
    }
    return {
      isOpen: true,
      category: matchedRule.category
    };
  }

  // Generic heuristic based on name keywords
  const norm = venueName.toLowerCase();
  if (norm.includes('museum') || norm.includes('gallery')) {
    // Museums typically close after 6:00 PM
    if (timeMinutes > 1110) { // After 6:30 PM
      return {
        isOpen: false,
        reason: `Museums typically close by 6:00 PM. ${venueName} is better scheduled in the morning or early afternoon.`,
        suggestedAlternative: `${venueName} Daytime Visit`,
        category: 'museum'
      };
    }
    return { isOpen: true, category: 'museum' };
  }

  if (norm.includes('night market') || norm.includes('nightlife') || norm.includes('pub') || norm.includes('bazaar')) {
    if (timeMinutes < 720) { // Before 12:00 PM
      return {
        isOpen: false,
        reason: `Night markets and vibrant bazaars come alive in late afternoon and evening.`,
        suggestedAlternative: `${venueName} Evening Stroll`,
        category: 'market'
      };
    }
    return { isOpen: true, category: 'market' };
  }

  return { isOpen: true, category: 'general' };
}
