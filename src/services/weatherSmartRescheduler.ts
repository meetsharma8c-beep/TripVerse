import { DayPlan, ItineraryActivity, WeatherDay } from '../types/trip';

export interface WeatherClashRecommendation {
  dayNumber: number;
  severity: 'rain' | 'heat';
  headline: string;
  detail: string;
  affectedActivityId: string;
  affectedActivityTitle: string;
  actionType: 'move_earlier' | 'move_later' | 'swap_indoor' | 'indoor_mirror';
  indoorFallbackTitle?: string;
  indoorFallbackDescription?: string;
}

const OUTDOOR_KEYWORDS = [
  'fort',
  'beach',
  'trek',
  'hike',
  'park',
  'garden',
  'lake',
  'waterfall',
  'viewpoint',
  'safari',
  'ghat',
  'promenade',
  'island',
  'bazaar',
  'walk',
  'climb',
  'cliff',
  'ruins'
];

const INDOOR_KEYWORDS = [
  'museum',
  'gallery',
  'palace museum',
  'cafe',
  'restaurant',
  'mall',
  'spa',
  'aquarium',
  'planetarium',
  'workshop',
  'cinema',
  'theatre',
  'indoor'
];

export function parseActivityHour24(timeStr?: string): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();
  const match = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const mins = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return hour + mins / 60;
}

export function isOutdoorExposedActivity(act: ItineraryActivity): boolean {
  if (
    act.type === 'hotel' ||
    act.type === 'food' ||
    act.type === 'rest' ||
    act.type === 'departure' ||
    act.type === 'arrival'
  ) {
    return false;
  }
  const text = `${act.title || ''} ${act.description || ''} ${act.location || ''}`.toLowerCase();
  if (INDOOR_KEYWORDS.some(k => text.includes(k))) return false;
  if (act.type === 'viewpoint') return true;
  return OUTDOOR_KEYWORDS.some(k => text.includes(k)) || act.type === 'attraction';
}

function buildCuratedIndoorReplacement(destination: string): { title: string; description: string } {
  const destCity = (destination || 'Destination').split(',')[0].trim();
  const lower = destCity.toLowerCase();
  if (lower.includes('goa')) {
    return {
      title: 'Museum of Goa (MOG) & Artisanal Coffee Lounge',
      description: 'Air-conditioned contemporary Goan art spaces in Pilerne paired with specialty local roasters — zero rain disruption.'
    };
  }
  if (lower.includes('jaipur')) {
    return {
      title: 'Albert Hall Museum & Heritage Blue Pottery Studio',
      description: 'Shaded Indo-Saracenic gallery halls and indoor craft demonstration away from peak desert glare.'
    };
  }
  if (lower.includes('mumbai')) {
    return {
      title: 'Chhatrapati Shivaji Maharaj Vastu Sangrahalaya & Kala Ghoda Galleries',
      description: 'Iconic vaulted museum galleries and indoor heritage cafes in Kala Ghoda.'
    };
  }
  if (lower.includes('udaipur')) {
    return {
      title: 'City Palace Crystal Gallery & Vintage Car Museum',
      description: 'Climate-sheltered royal crystal exhibits and indoor heritage collection.'
    };
  }
  return {
    title: `${destCity} Heritage Museum & Specialty Cultural Cafe`,
    description: `Sheltered indoor cultural showcase and local cafe experience in ${destCity}, protected from harsh weather.`
  };
}

/**
 * Evaluates a single itinerary day against its forecast `WeatherDay` to detect
 * high-probability rain (`>=65%`) or extreme afternoon heat (`>=39°C`) clashes.
 */
export function evaluateDayWeatherClash(
  day: DayPlan,
  weather: WeatherDay | undefined,
  destination: string = ''
): WeatherClashRecommendation | null {
  if (!weather || !Array.isArray(day.activities) || day.activities.length === 0) {
    return null;
  }

  const rainHigh =
    weather.rainProbPercent >= 65 ||
    /thunderstorm|heavy|downpour|rain showers/i.test(weather.condition || '');
  const heatExtreme = weather.maxTempC >= 39;

  if (!rainHigh && !heatExtreme) {
    return null;
  }

  // Find exposed outdoor stops, prioritizing midday/afternoon (11:30 - 16:30)
  const indexedOutdoor = day.activities
    .map((act, idx) => ({
      act,
      idx,
      hour: parseActivityHour24(act.time),
      exposed: isOutdoorExposedActivity(act)
    }))
    .filter(item => item.exposed);

  if (indexedOutdoor.length === 0) return null;

  const middayHit = indexedOutdoor.find(item => item.hour !== null && item.hour >= 11.5 && item.hour <= 16.5);
  const target = middayHit || indexedOutdoor[0];

  if (rainHigh) {
    if (day.activities.some(a => Boolean(a.indoorMirror))) {
      return {
        dayNumber: day.dayNumber,
        severity: 'rain',
        headline: `${weather.rainProbPercent}% Rain Forecast (${weather.condition})`,
        detail: `"${target.act.title}" is exposed outdoors. Switch this day to sheltered Indoor Mirrors in 1 tap.`,
        affectedActivityId: target.act.id,
        affectedActivityTitle: target.act.title,
        actionType: 'indoor_mirror'
      };
    }

    const indoor = buildCuratedIndoorReplacement(destination);
    return {
      dayNumber: day.dayNumber,
      severity: 'rain',
      headline: `${weather.rainProbPercent}% Rain Forecast on Day ${day.dayNumber}`,
      detail: `"${target.act.title}" (${target.act.time || 'Outdoor'}) faces high rain probability (${weather.rainProbPercent}%). Swap to "${indoor.title}" for a dry indoor experience.`,
      affectedActivityId: target.act.id,
      affectedActivityTitle: target.act.title,
      actionType: 'swap_indoor',
      indoorFallbackTitle: indoor.title,
      indoorFallbackDescription: indoor.description
    };
  }

  // Extreme afternoon heat (>= 39°C): only alert if an outdoor stop sits in peak heat window (11:30 - 16:30)
  if (heatExtreme && middayHit) {
    const canMoveEarlier = middayHit.idx > 0;
    const canMoveLater = middayHit.idx < day.activities.length - 1;
    const indoor = buildCuratedIndoorReplacement(destination);

    if (canMoveLater || canMoveEarlier) {
      return {
        dayNumber: day.dayNumber,
        severity: 'heat',
        headline: `Peak ${weather.maxTempC}°C Afternoon Heat Alert`,
        detail: `"${middayHit.act.title}" is scheduled at ${middayHit.act.time} during ${weather.maxTempC}°C peak UV/heat. Shift it out of the midday sun in 1 tap.`,
        affectedActivityId: middayHit.act.id,
        affectedActivityTitle: middayHit.act.title,
        actionType: canMoveLater ? 'move_later' : 'move_earlier'
      };
    }

    return {
      dayNumber: day.dayNumber,
      severity: 'heat',
      headline: `Peak ${weather.maxTempC}°C Afternoon Heat Alert`,
      detail: `"${middayHit.act.title}" faces ${weather.maxTempC}°C midday heat. Swap to air-conditioned "${indoor.title}".`,
      affectedActivityId: middayHit.act.id,
      affectedActivityTitle: middayHit.act.title,
      actionType: 'swap_indoor',
      indoorFallbackTitle: indoor.title,
      indoorFallbackDescription: indoor.description
    };
  }

  return null;
}
