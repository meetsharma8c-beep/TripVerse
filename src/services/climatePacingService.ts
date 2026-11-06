/**
 * TRIPVERSE CLIMATE & SEASONAL PACING SERVICE
 * 
 * Dynamically adjusts daily travel pacing, sightseeing time slots,
 * and outdoor-versus-indoor scheduling based on destination climatology
 * and trip travel month (e.g. Dubai/Rajasthan 45°C summer heat,
 * Alpine winter short daylight, Monsoon rain).
 */

export interface ClimatePacingProfile {
  protocol: 'extreme_heat' | 'monsoon_rain' | 'alpine_winter' | 'temperate_standard';
  title: string;
  badge: string;
  advisoryNote: string;
  recommendedSlotShifts: {
    morningSightseeingTime: string;
    afternoonTime: string;
    sunsetTime: string;
    dinnerTime: string;
  };
  preferIndoorMidday: boolean;
  essentialGear: string[];
}

export function evaluateClimatePacing(
  destination: string,
  country: string,
  state: string,
  startDateInput: string | Date = new Date()
): ClimatePacingProfile {
  const d = typeof startDateInput === 'string' ? new Date(startDateInput) : startDateInput;
  const month = isNaN(d.getTime()) ? new Date().getMonth() + 1 : d.getMonth() + 1; // 1 = Jan, 12 = Dec

  const norm = `${destination} ${state} ${country}`.toLowerCase();

  // 1. EXTREME SUMMER HEAT (> 40°C in May - August)
  const isDesertHeatDest = norm.includes('dubai') ||
    norm.includes('abu dhabi') ||
    norm.includes('rajasthan') ||
    norm.includes('jaipur') ||
    norm.includes('jodhpur') ||
    norm.includes('jaisalmer') ||
    norm.includes('cairo') ||
    norm.includes('egypt') ||
    norm.includes('riyadh') ||
    norm.includes('doha') ||
    norm.includes('phoenix') ||
    norm.includes('las vegas');

  const isSummerMonth = month >= 5 && month <= 8;

  if (isDesertHeatDest && isSummerMonth) {
    return {
      protocol: 'extreme_heat',
      title: 'Extreme Heat Daytime Pacing Active',
      badge: '☀️ Desert Summer Protocol',
      advisoryNote: 'Temperatures frequently exceed 40°C midday. Outdoor activities shifted to early morning and post-sunset golden hours; midday dedicated to air-conditioned halls and shaded dining.',
      recommendedSlotShifts: {
        morningSightseeingTime: '7:30 AM', // Beat the heat
        afternoonTime: '2:30 PM',         // Air-conditioned indoor museum/palace
        sunsetTime: '6:45 PM',            // Cool evening breeze
        dinnerTime: '9:00 PM'
      },
      preferIndoorMidday: true,
      essentialGear: ['Electrolytes & Thermal Water Bottle', 'UV Protective Hat & Polarized Sunglasses', 'Breathable Linen Clothing', 'SPF 50+ Sunscreen']
    };
  }

  // 2. ALPINE / ARCTIC SHORT DAYLIGHT WINTER (Nov - Feb)
  const isColdWinterDest = norm.includes('iceland') ||
    norm.includes('tromso') ||
    norm.includes('norway') ||
    norm.includes('lapland') ||
    norm.includes('finland') ||
    norm.includes('switzerland') ||
    norm.includes('hokkaido') ||
    norm.includes('spiti') ||
    norm.includes('ladakh') ||
    norm.includes('banff');

  const isWinterMonth = month === 11 || month === 12 || month === 1 || month === 2;

  if (isColdWinterDest && isWinterMonth) {
    return {
      protocol: 'alpine_winter',
      title: 'Alpine Winter Daylight Compression Active',
      badge: '❄️ Sub-Zero Winter Protocol',
      advisoryNote: 'Daylight is condensed to 4–7 hours with temperatures below freezing. Key outdoor sights scheduled between 10:30 AM and 3:00 PM; evenings centered around thermal springs, fireside dining, and night sky viewing.',
      recommendedSlotShifts: {
        morningSightseeingTime: '10:00 AM', // Wait for morning frost to thaw
        afternoonTime: '1:30 PM',          // Prime solar window
        sunsetTime: '4:15 PM',             // Early winter dusk
        dinnerTime: '7:30 PM'
      },
      preferIndoorMidday: false,
      essentialGear: ['Windproof Thermal Base Layers', 'Ice Grippers / Crampons for Boots', 'Insulated Down Parka', 'Rechargeable Hand Warmers']
    };
  }

  // 3. TROPICAL MONSOON / RAIN SEASON (July - Sept in South Asia; Nov - Feb in Bali)
  const isSouthAsiaMonsoon = (norm.includes('india') || norm.includes('goa') || norm.includes('kerala') || norm.includes('mumbai') || norm.includes('thailand') || norm.includes('vietnam')) &&
    (month >= 6 && month <= 9);
  const isBaliWet = norm.includes('bali') && (month === 11 || month === 12 || month === 1 || month === 2);

  if (isSouthAsiaMonsoon || isBaliWet) {
    return {
      protocol: 'monsoon_rain',
      title: 'Monsoon Dynamic Weather Protocol Active',
      badge: '🌧️ Monsoon Shield Protocol',
      advisoryNote: 'High likelihood of heavy afternoon showers. Outdoor landscapes and viewpoints scheduled in fresh clear mornings; afternoons prepared with indoor cultural and covered market alternatives.',
      recommendedSlotShifts: {
        morningSightseeingTime: '8:30 AM',
        afternoonTime: '1:45 PM',
        sunsetTime: '6:15 PM',
        dinnerTime: '8:30 PM'
      },
      preferIndoorMidday: true,
      essentialGear: ['High-Incline Windproof Umbrella', 'Waterproof Dry Bag for Electronics', 'Quick-Dry Footwear', 'Mosquito Repellent']
    };
  }

  // 4. TEMPERATE / STANDARD
  return {
    protocol: 'temperate_standard',
    title: 'Standard Optimal Pacing Active',
    badge: '🌤️ Optimal Climate Conditions',
    advisoryNote: 'Favorable seasonal weather conditions throughout travel dates.',
    recommendedSlotShifts: {
      morningSightseeingTime: '9:30 AM',
      afternoonTime: '3:30 PM',
      sunsetTime: '6:30 PM',
      dinnerTime: '8:30 PM'
    },
    preferIndoorMidday: false,
    essentialGear: ['Comfortable Walking Shoes', 'Hydration Pack', 'Camera / Smartphone Power Bank']
  };
}
