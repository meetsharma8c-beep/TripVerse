import { WeatherForecast, WeatherDay, Coordinates } from '../types/trip';
import { resolvePreciseLocationSync } from './locationService';

interface DestinationWeatherProfile {
  name: string;
  baseTemp: number;
  tempRange: [number, number];
  condition: string;
  rainProb: number;
  humidity: number;
  wind: number;
  aqi: number;
  uvi: number;
  roadAdvisory: {
    level: 'normal' | 'caution' | 'warning';
    title: string;
    details: string;
    tips: string[];
  };
  clothingTip: string;
}

const DESTINATION_PROFILES: Record<string, DestinationWeatherProfile> = {
  manali: {
    name: 'Manali',
    baseTemp: 14,
    tempRange: [7, 17],
    condition: 'Cool & Mountain Breeze',
    rainProb: 35,
    humidity: 65,
    wind: 18,
    aqi: 28,
    uvi: 6,
    roadAdvisory: {
      level: 'caution',
      title: 'Ghat Curves & Morning Mist on Kiratpur-Manali Highway',
      details: 'High-altitude hairpin turns and occasional fog near tunnel portals. Slow speeds advised.',
      tips: ['Use low-beam fog lights in passes', 'Engage engine braking on downhill stretches', 'Keep emergency tire chains if traveling towards Solang/Atal Tunnel']
    },
    clothingTip: 'Thermal base layers, fleece jacket, windbreaker, and sturdy trekking shoes.'
  },
  shimla: {
    name: 'Shimla',
    baseTemp: 15,
    tempRange: [9, 18],
    condition: 'Crisp Mountain Breeze & Pine Air',
    rainProb: 30,
    humidity: 58,
    wind: 14,
    aqi: 32,
    uvi: 6,
    roadAdvisory: {
      level: 'caution',
      title: 'Himalayan Expressway (NH-5) Clear with Hill Hairpins',
      details: 'Four-lane expressway until Parwanoo, narrowing to active dual hill road up to Shimla.',
      tips: ['Yield to ascending vehicles on narrow bridges', 'Avoid overtaking on blind curves']
    },
    clothingTip: 'Warm hoodie, light jacket, woolen cap for evenings, and comfortable walking shoes.'
  },
  dharamshala: {
    name: 'Dharamshala',
    baseTemp: 18,
    tempRange: [12, 22],
    condition: 'Misty Valleys & Pleasant Sun',
    rainProb: 40,
    humidity: 62,
    wind: 12,
    aqi: 30,
    uvi: 7,
    roadAdvisory: {
      level: 'normal',
      title: 'Kangra Valley Hill Roads Clear',
      details: 'Scenic asphalt through tea gardens; occasional damp stretches near McLeod Ganj.',
      tips: ['Exercise caution during afternoon showers', 'Mind pedestrian traffic in town square']
    },
    clothingTip: 'Layered breathable cotton, rain poncho, and a cozy fleece pullover.'
  },
  ladakh: {
    name: 'Leh Ladakh',
    baseTemp: 9,
    tempRange: [2, 14],
    condition: 'Chilly Mountain Air & Crystal Skies',
    rainProb: 5,
    humidity: 25,
    wind: 22,
    aqi: 14,
    uvi: 11,
    roadAdvisory: {
      level: 'warning',
      title: 'High-Altitude Mountain Passes & Water Crossings',
      details: 'Extreme elevation (>11,000 ft). Frozen patches early morning; meltwater streams across roads midday.',
      tips: ['Acclimatize 48 hrs in Leh before Khardung La', 'UV is extreme; polarized sunglasses mandatory', 'Keep portable tire inflator and extra fuel']
    },
    clothingTip: 'Heavy down parka, thermal thermals, UV 400 sunglasses, SPF 50+ sunscreen, lip balm, and woolen gloves.'
  },
  srinagar: {
    name: 'Srinagar',
    baseTemp: 16,
    tempRange: [8, 19],
    condition: 'Crisp Valley Breeze & Chinar Glow',
    rainProb: 20,
    humidity: 52,
    wind: 10,
    aqi: 35,
    uvi: 6,
    roadAdvisory: {
      level: 'normal',
      title: 'Jammu-Srinagar NH-44 Highway Operational',
      details: 'Chenani-Nashri and Banihal Qazigund tunnels clear with smooth 4-lane flow.',
      tips: ['Check traffic control unit update before Ramban stretch', 'Keep toll cash / FASTag handy']
    },
    clothingTip: 'Kashmiri pashmina/shawl, light jacket, casual trainers, and umbrella.'
  },
  udaipur: {
    name: 'Udaipur',
    baseTemp: 31,
    tempRange: [20, 33],
    condition: 'Sunny & Pleasant Lakeside',
    rainProb: 10,
    humidity: 42,
    wind: 12,
    aqi: 68,
    uvi: 7,
    roadAdvisory: {
      level: 'normal',
      title: 'NH-48 Corridor Clear & Dry',
      details: 'Optimal driving conditions with clear visibility and standard highway cruise speeds.',
      tips: ['Keep sunglasses handy for afternoon glare', 'Check tire pressure due to road heat']
    },
    clothingTip: 'Light cotton shirts, sunglasses, light jacket for evening lakeside breezes.'
  },
  jaipur: {
    name: 'Jaipur',
    baseTemp: 32,
    tempRange: [21, 35],
    condition: 'Warm & Sunny Desert Glow',
    rainProb: 5,
    humidity: 38,
    wind: 14,
    aqi: 95,
    uvi: 8,
    roadAdvisory: {
      level: 'normal',
      title: 'Delhi-Jaipur Expressway (NE-4) High-Speed Run',
      details: 'World-class 8-lane expressway. Strictly adhere to 120 km/h speed limits with automated radar.',
      tips: ['Ensure FASTag has at least ₹500 balance', 'Rest at wayside amenities every 150 km']
    },
    clothingTip: 'Comfortable cotton kurtas/tees, sun hat, and walking shoes for fort ramparts.'
  },
  jodhpur: {
    name: 'Jodhpur',
    baseTemp: 33,
    tempRange: [22, 36],
    condition: 'Bright Sunshine & Blue City Warmth',
    rainProb: 5,
    humidity: 35,
    wind: 15,
    aqi: 80,
    uvi: 9,
    roadAdvisory: {
      level: 'normal',
      title: 'Marwar Highway Corridor Clear',
      details: 'Wide 4-lane state highway with straight desert visibility and minimal cross traffic.',
      tips: ['Carry plenty of drinking water', 'Monitor vehicle coolant levels in midday heat']
    },
    clothingTip: 'Breathable linen clothes, wide-brim hat, UV sunglasses, and walking shoes.'
  },
  jaisalmer: {
    name: 'Jaisalmer',
    baseTemp: 34,
    tempRange: [21, 37],
    condition: 'Golden Thar Sunshine & Desert Breeze',
    rainProb: 2,
    humidity: 28,
    wind: 20,
    aqi: 72,
    uvi: 9,
    roadAdvisory: {
      level: 'normal',
      title: 'NH-11 Desert Highway Smooth & Clear',
      details: 'Spectacular straight stretches through sand dunes; watch out for occasional stray camels.',
      tips: ['Fuel up in Pokhran as fuel bunks become sparse', 'Drop tire pressure slightly if dune driving']
    },
    clothingTip: 'Light cotton scarf/shemagh for sand gusts, sunscreen, light night jacket for desert drop.'
  },
  mount_abu: {
    name: 'Mount Abu',
    baseTemp: 22,
    tempRange: [15, 26],
    condition: 'Pleasant Hill Climate & Cool Breeze',
    rainProb: 15,
    humidity: 50,
    wind: 14,
    aqi: 40,
    uvi: 7,
    roadAdvisory: {
      level: 'caution',
      title: 'Abu Road to Mount Abu Ghat Section (28 km)',
      details: 'Scenic mountain climb with well-banked curves and panoramic valley viewpoints.',
      tips: ['Keep vehicle in lower gear while climbing and descending', 'Stop at sunset viewpoint lay-bys safely']
    },
    clothingTip: 'Light cardigan or jacket for evening lakeside walks, sun cap, and trekking footwear.'
  },
  goa: {
    name: 'Goa',
    baseTemp: 30,
    tempRange: [24, 32],
    condition: 'Tropical Sunshine & Coastal Breeze',
    rainProb: 20,
    humidity: 78,
    wind: 16,
    aqi: 45,
    uvi: 9,
    roadAdvisory: {
      level: 'normal',
      title: 'Coastal Highway NH-66 Clear',
      details: 'Smooth multi-lane driving with scenic coconut grove stretches.',
      tips: ['Stay hydrated with coconut water at highway stalls', 'Beware of sudden coastal showers']
    },
    clothingTip: 'Breathable linen clothes, beachwear, UV sunglasses, and waterproof footwear.'
  },
  mumbai: {
    name: 'Mumbai',
    baseTemp: 30,
    tempRange: [25, 33],
    condition: 'Warm Sea Breeze & Coastal Sun',
    rainProb: 25,
    humidity: 80,
    wind: 18,
    aqi: 92,
    uvi: 8,
    roadAdvisory: {
      level: 'normal',
      title: 'Mumbai-Pune Expressway & Coastal Sea Link Flowing',
      details: 'World-class 6-lane tollway; watch for lane discipline in Bhor Ghat section.',
      tips: ['Avoid Mumbai peak hours (8:30-11 AM, 6-9 PM)', 'Use FASTag for seamless toll booths']
    },
    clothingTip: 'Light breathable casuals, sun shades, and comfortable shoes for promenade strolls.'
  },
  delhi: {
    name: 'Delhi NCR',
    baseTemp: 28,
    tempRange: [19, 32],
    condition: 'Clear Autumn Skies & Warm Sunshine',
    rainProb: 10,
    humidity: 48,
    wind: 12,
    aqi: 125,
    uvi: 7,
    roadAdvisory: {
      level: 'normal',
      title: 'Eastern/Western Peripheral & Urban Expressways Smooth',
      details: 'Wide bypass expressways active. Smooth 100-120 km/h cruising on peripheral corridors.',
      tips: ['Use Eastern Peripheral to bypass central city congestion', 'Carry pollution mask if sensitive to AQI']
    },
    clothingTip: 'Smart casual layers, comfortable walking sneakers for heritage monuments.'
  },
  bengaluru: {
    name: 'Bengaluru',
    baseTemp: 26,
    tempRange: [18, 28],
    condition: 'Pleasant Garden City Weather',
    rainProb: 30,
    humidity: 62,
    wind: 15,
    aqi: 45,
    uvi: 7,
    roadAdvisory: {
      level: 'normal',
      title: 'Bangalore-Mysore Expressway (NH-275) High-Speed Run',
      details: 'Access-controlled 10-lane expressway. Shaves commute to Mysore down to 75 minutes.',
      tips: ['No 2-wheelers/3-wheelers on main expressway lanes', 'Speed limit 100 km/h strictly enforced']
    },
    clothingTip: 'Light jackets, trendy casual wear, and an umbrella for occasional evening drizzle.'
  },
  coorg: {
    name: 'Coorg',
    baseTemp: 21,
    tempRange: [14, 25],
    condition: 'Misty Coffee Plantations & Crisp Air',
    rainProb: 45,
    humidity: 80,
    wind: 12,
    aqi: 22,
    uvi: 6,
    roadAdvisory: {
      level: 'caution',
      title: 'Western Ghats Forest Roads & Estate Hairpins',
      details: 'Scenic roads through dense coffee and spice estates. Occasional slippery moss on turns.',
      tips: ['Maintain moderate speed under 45 km/h in estate lanes', 'Keep windows rolled down for fresh mountain aroma']
    },
    clothingTip: 'Raincoat or umbrella, light sweater, anti-slip walking shoes, and insect repellent.'
  },
  munnar: {
    name: 'Munnar',
    baseTemp: 18,
    tempRange: [12, 21],
    condition: 'Misty Tea Hills & Passing Showers',
    rainProb: 50,
    humidity: 85,
    wind: 15,
    aqi: 22,
    uvi: 5,
    roadAdvisory: {
      level: 'warning',
      title: 'Dense Fog & Slippery Hairpins on Gap Road',
      details: 'Visibility drops below 50m during misty afternoons. Frequent wet patches on asphalt.',
      tips: ['Strictly stay in your lane on blind bends', 'Drive with hazard lights only when stopped', 'Check brake pads before ascending']
    },
    clothingTip: 'Raincoat/umbrella, warm layers, rain-resistant jacket, and warm wool socks.'
  },
  ooty: {
    name: 'Ooty',
    baseTemp: 16,
    tempRange: [10, 20],
    condition: 'Chilly Nilgiri Breeze & Rolling Fog',
    rainProb: 35,
    humidity: 75,
    wind: 14,
    aqi: 20,
    uvi: 6,
    roadAdvisory: {
      level: 'caution',
      title: 'Kallatti Ghat (36 Hairpin Bends) Route',
      details: 'Steep gradient with tight hairpin turns. Downhill engine braking strictly advised.',
      tips: ['Use first/second gear on steep descents', 'Yield to ascending tourist vehicles']
    },
    clothingTip: 'Warm woolen sweater, windproof jacket, muffler, and warm socks.'
  },
  rishikesh: {
    name: 'Rishikesh',
    baseTemp: 24,
    tempRange: [15, 27],
    condition: 'Crisp Mountain Breeze & River Chills',
    rainProb: 25,
    humidity: 55,
    wind: 10,
    aqi: 42,
    uvi: 6,
    roadAdvisory: {
      level: 'caution',
      title: 'Badrinath Highway Narrow Sections & Pilgrim Traffic',
      details: 'Active hill highway with slow-moving buses on river gorge curves.',
      tips: ['Honk at blind turns', 'Yield right of way to ascending uphill traffic']
    },
    clothingTip: 'Quick-dry activewear for river rafting, warm hoodie for Ganga Aarti evenings.'
  },
  gujarat: {
    name: 'Gujarat / Ahmedabad',
    baseTemp: 32,
    tempRange: [22, 35],
    condition: 'Sunny & Warm Breeze',
    rainProb: 8,
    humidity: 42,
    wind: 12,
    aqi: 55,
    uvi: 8,
    roadAdvisory: {
      level: 'normal',
      title: 'State & National Highway Corridor Clear',
      details: 'Well-maintained multi-lane corridor with smooth tarmac and regular service plazas.',
      tips: ['Keep FASTag recharged for toll booths', 'Check tyre pressures during warm afternoon hours']
    },
    clothingTip: 'Breathable cotton clothing, sunglasses, and comfortable walking shoes.'
  },
  poicha: {
    name: 'Poicha',
    baseTemp: 32,
    tempRange: [21, 34],
    condition: 'Sunny & Pleasant Narmada River Basin',
    rainProb: 10,
    humidity: 46,
    wind: 11,
    aqi: 48,
    uvi: 8,
    roadAdvisory: {
      level: 'normal',
      title: 'Vadodara-Rajpipla & NE-1 Expressway Clear',
      details: 'Smooth 4-lane highway leading into Narmada district with clear driving visibility.',
      tips: ['Keep sunglasses handy for bright afternoon sun', 'Carry hydration bottles for temple walking tour', 'Adequate EV charging & fuel near Rajpipla']
    },
    clothingTip: 'Modest lightweight cotton attire for temple grounds, comfortable walking sandals, and sun cap.'
  },
  amritsar: {
    name: 'Amritsar',
    baseTemp: 25,
    tempRange: [16, 29],
    condition: 'Crisp Northern Sun & Fresh Breeze',
    rainProb: 10,
    humidity: 50,
    wind: 12,
    aqi: 65,
    uvi: 7,
    roadAdvisory: {
      level: 'normal',
      title: 'Grand Trunk Road (NH-44) High Quality Highway',
      details: 'Excellent 6-lane highway with iconic roadside dhabas serving fresh parathas.',
      tips: ['Enjoy highway dhabas near Murthal/Ambala', 'Keep headscarf handy for Golden Temple entry']
    },
    clothingTip: 'Casual cotton attire, headscarf or bandana for temple entry, comfortable slip-on footwear.'
  },
  varanasi: {
    name: 'Varanasi',
    baseTemp: 28,
    tempRange: [19, 32],
    condition: 'Spiritual Sunshine & Ganga Breeze',
    rainProb: 15,
    humidity: 60,
    wind: 8,
    aqi: 88,
    uvi: 7,
    roadAdvisory: {
      level: 'normal',
      title: 'Purvanchal Expressway & Ring Road Smooth',
      details: 'World-class expressway connects right to Varanasi outskirts; avoid central old town by car.',
      tips: ['Park cars at designated lots near Godowlia and explore ghats by foot/e-rickshaw', 'Early morning 5:30 AM boat ride has calmest waters']
    },
    clothingTip: 'Modest comfortable cotton clothes, easy-to-remove sandals for temple and ghat visits.'
  },
  agra: {
    name: 'Agra',
    baseTemp: 29,
    tempRange: [18, 33],
    condition: 'Warm Sunshine & Clear Heritage Skies',
    rainProb: 5,
    humidity: 45,
    wind: 11,
    aqi: 105,
    uvi: 8,
    roadAdvisory: {
      level: 'normal',
      title: 'Yamuna Expressway (165 km) High-Speed Run',
      details: 'World-class 6-lane concrete expressway with 100 km/h radar speed limit.',
      tips: ['Check tire air pressure before concrete expressway run to avoid overheating', 'Use toll plazas with FASTag']
    },
    clothingTip: 'Breathable cottons, sun hat, UV sunglasses, and walking shoes for Taj Mahal grounds.'
  }
};

/**
 * Intelligent Destination & City Extractor
 * Parses natural language queries like "show me Manali's weather", "weather in Udaipur",
 * or defaults to the active trip's destination.
 */
export function extractCityFromQuery(
  queryOrCity: string,
  fallbackDestination?: string
): { profileKey: string; displayName: string } {
  const norm = (queryOrCity || '').toLowerCase().trim();
  
  // 1. Direct city check mapping
  const cityMapping: Record<string, { key: string; name: string }> = {
    'manali': { key: 'manali', name: 'Manali' },
    'solang': { key: 'manali', name: 'Manali' },
    'rohtang': { key: 'manali', name: 'Manali' },
    'kullu': { key: 'manali', name: 'Manali' },
    'atal tunnel': { key: 'manali', name: 'Manali' },
    'kasol': { key: 'manali', name: 'Kasol, Himachal' },
    'spiti': { key: 'ladakh', name: 'Spiti Valley' },
    'shimla': { key: 'shimla', name: 'Shimla' },
    'kufri': { key: 'shimla', name: 'Shimla' },
    'chail': { key: 'shimla', name: 'Shimla' },
    'dharamshala': { key: 'dharamshala', name: 'Dharamshala' },
    'mcleodganj': { key: 'dharamshala', name: 'McLeod Ganj' },
    'ladakh': { key: 'ladakh', name: 'Leh Ladakh' },
    'leh': { key: 'ladakh', name: 'Leh Ladakh' },
    'pangong': { key: 'ladakh', name: 'Leh Ladakh' },
    'srinagar': { key: 'srinagar', name: 'Srinagar' },
    'kashmir': { key: 'srinagar', name: 'Kashmir Valley' },
    'gulmarg': { key: 'srinagar', name: 'Gulmarg' },
    'pahalgam': { key: 'srinagar', name: 'Pahalgam' },
    'udaipur': { key: 'udaipur', name: 'Udaipur' },
    'jaipur': { key: 'jaipur', name: 'Jaipur' },
    'jodhpur': { key: 'jodhpur', name: 'Jodhpur' },
    'jaisalmer': { key: 'jaisalmer', name: 'Jaisalmer' },
    'mount abu': { key: 'mount_abu', name: 'Mount Abu' },
    'abu': { key: 'mount_abu', name: 'Mount Abu' },
    'goa': { key: 'goa', name: 'Goa' },
    'panaji': { key: 'goa', name: 'Goa' },
    'calangute': { key: 'goa', name: 'Goa' },
    'mumbai': { key: 'mumbai', name: 'Mumbai' },
    'bombay': { key: 'mumbai', name: 'Mumbai' },
    'lonavala': { key: 'mumbai', name: 'Lonavala' },
    'delhi': { key: 'delhi', name: 'Delhi NCR' },
    'ncr': { key: 'delhi', name: 'Delhi NCR' },
    'bengaluru': { key: 'bengaluru', name: 'Bengaluru' },
    'bangalore': { key: 'bengaluru', name: 'Bengaluru' },
    'coorg': { key: 'coorg', name: 'Coorg' },
    'kodagu': { key: 'coorg', name: 'Coorg' },
    'munnar': { key: 'munnar', name: 'Munnar' },
    'kerala': { key: 'munnar', name: 'Kerala' },
    'wayanad': { key: 'coorg', name: 'Wayanad' },
    'ooty': { key: 'ooty', name: 'Ooty' },
    'rishikesh': { key: 'rishikesh', name: 'Rishikesh' },
    'haridwar': { key: 'rishikesh', name: 'Rishikesh' },
    'dehradun': { key: 'rishikesh', name: 'Dehradun' },
    'ahmedabad': { key: 'gujarat', name: 'Ahmedabad' },
    'gujarat': { key: 'gujarat', name: 'Gujarat' },
    'vadodara': { key: 'gujarat', name: 'Vadodara' },
    'surat': { key: 'gujarat', name: 'Surat' },
    'rajkot': { key: 'gujarat', name: 'Rajkot' },
    'kutch': { key: 'jaisalmer', name: 'Rann of Kutch' },
    'poicha': { key: 'poicha', name: 'Poicha' },
    'amritsar': { key: 'amritsar', name: 'Amritsar' },
    'varanasi': { key: 'varanasi', name: 'Varanasi' },
    'banaras': { key: 'varanasi', name: 'Varanasi' },
    'agra': { key: 'agra', name: 'Agra' }
  };

  // Check if any known city is mentioned directly in the query text
  for (const [candidate, target] of Object.entries(cityMapping)) {
    // Check with word boundary or exact presence
    if (norm.includes(candidate)) {
      return { profileKey: target.key, displayName: target.name };
    }
  }

  // 2. Check if a fallback destination was supplied and contains a known city
  const fallbackNorm = (fallbackDestination || '').toLowerCase().trim();
  if (fallbackNorm && fallbackNorm !== 'custom spot' && fallbackNorm !== 'destination') {
    for (const [candidate, target] of Object.entries(cityMapping)) {
      if (fallbackNorm.includes(candidate)) {
        const cleanName = fallbackDestination!.split(',')[0].trim();
        return { profileKey: target.key, displayName: cleanName || target.name };
      }
    }
    // If not in dictionary but valid custom destination name
    const cleanFallback = fallbackDestination!.split(',')[0].trim();
    if (cleanFallback && cleanFallback !== 'Custom Spot') {
      return { profileKey: 'udaipur', displayName: cleanFallback };
    }
  }

  // 3. Natural extraction regex (e.g., "weather in XYZ", "forecast for XYZ")
  const match = norm.match(/(?:weather|forecast|temp|temperature|climate)\s+(?:in|for|at|of)\s+([a-zA-Z\s]+)/i);
  if (match && match[1]) {
    const rawExtracted = match[1].replace(/['?.,]/g, '').trim();
    if (rawExtracted.length > 2 && rawExtracted !== 'this route' && rawExtracted !== 'my trip') {
      const cap = rawExtracted.charAt(0).toUpperCase() + rawExtracted.slice(1);
      return { profileKey: 'udaipur', displayName: cap };
    }
  }

  // Default fallback
  return { profileKey: 'udaipur', displayName: 'Udaipur' };
}

export function getDestinationWeather(
  queryOrCity: string, 
  durationDays: number = 3,
  fallbackDestination?: string
): WeatherForecast {
  const { profileKey, displayName } = extractCityFromQuery(queryOrCity, fallbackDestination);
  const profile = DESTINATION_PROFILES[profileKey] || DESTINATION_PROFILES.udaipur;

  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const forecastDays: WeatherDay[] = [];
  const count = Math.max(3, Math.min(durationDays, 7));

  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    // subtle variation per day
    const tempOffset = (i % 2 === 0 ? 1 : -1) * (i * 0.5);
    const minTemp = Math.round(profile.tempRange[0] + tempOffset);
    const maxTemp = Math.round(profile.tempRange[1] + tempOffset);
    const avgTemp = Math.round((minTemp + maxTemp) / 2);
    const rainVariation = Math.max(0, Math.min(95, profile.rainProb + (i * 5 - 10)));

    let condition = profile.condition;
    let icon = 'sun';
    if (rainVariation > 40) {
      condition = 'Scattered Showers';
      icon = 'cloud-rain';
    } else if (rainVariation > 20) {
      condition = 'Partly Cloudy';
      icon = 'cloud-sun';
    }

    forecastDays.push({
      dayNumber: i + 1,
      date: `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`,
      tempC: avgTemp,
      minTempC: minTemp,
      maxTempC: maxTemp,
      condition,
      icon,
      rainProbPercent: rainVariation,
      humidityPercent: Math.min(95, profile.humidity + (i % 3) * 2),
      windKmh: profile.wind + (i % 2),
      uvi: profile.uvi,
      aqi: profile.aqi,
      clothingTip: profile.clothingTip,
      alert: rainVariation > 60 ? 'Heavy afternoon showers likely. Plan indoor visits between 2-4 PM.' : undefined
    });
  }

  return {
    destination: displayName,
    currentTempC: profile.baseTemp,
    currentCondition: profile.condition,
    forecastDays,
    roadConditionAdvisory: profile.roadAdvisory,
    isLive: false,
    source: 'Curated Climate Engine'
  };
}

/**
 * WMO Weather Code to User-Friendly Condition & Icon
 */
function mapWmoCodeToCondition(code: number): { condition: string; icon: string } {
  if (code === 0) return { condition: 'Sunny & Clear Skies', icon: 'sun' };
  if (code === 1 || code === 2) return { condition: 'Mainly Clear & Pleasant', icon: 'cloud-sun' };
  if (code === 3) return { condition: 'Overcast & Breezy', icon: 'cloud' };
  if (code === 45 || code === 48) return { condition: 'Misty Hill Fog', icon: 'cloud-fog' };
  if (code >= 51 && code <= 55) return { condition: 'Light Passing Drizzle', icon: 'cloud-drizzle' };
  if (code >= 61 && code <= 65) return { condition: 'Scattered Showers', icon: 'cloud-rain' };
  if (code >= 71 && code <= 77) return { condition: 'Snow & Mountain Flurries', icon: 'snowflake' };
  if (code >= 80 && code <= 82) return { condition: 'Passing Rain Showers', icon: 'cloud-rain' };
  if (code >= 95) return { condition: 'Thunderstorm & Rain', icon: 'cloud-lightning' };
  return { condition: 'Pleasant & Clear', icon: 'sun' };
}

/**
 * Fetches the current forecast from Open-Meteo for the resolved coordinates.
 */
export async function fetchLiveDestinationWeather(
  queryOrCity: string,
  durationDays: number = 3,
  fallbackDestination?: string,
  customCoords?: Coordinates
): Promise<WeatherForecast> {
  const fallback = getDestinationWeather(queryOrCity, durationDays, fallbackDestination);
  
  let lat = customCoords?.lat;
  let lng = customCoords?.lng;

  if (!lat || !lng) {
    const loc = resolvePreciseLocationSync(queryOrCity || fallbackDestination || fallback.destination);
    if (loc && loc.coordinates) {
      lat = loc.coordinates.lat;
      lng = loc.coordinates.lng;
    }
  }

  if (!lat || !lng) {
    return { ...fallback, isLive: false };
  }

  try {
    const count = Math.max(3, Math.min(durationDays, 7));
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Live weather API returned status ' + res.status);
    const data = await res.json();

    const current = data.current;
    const daily = data.daily;
    if (!current || !daily || !daily.time) {
      return { ...fallback, isLive: false };
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const forecastDays: WeatherDay[] = [];

    const daysCount = Math.min(count, daily.time.length);
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(daily.time[i]);
      const wmo = daily.weather_code[i] || 0;
      const meta = mapWmoCodeToCondition(wmo);
      const minTemp = Math.round(daily.temperature_2m_min[i]);
      const maxTemp = Math.round(daily.temperature_2m_max[i]);
      const avgTemp = Math.round((minTemp + maxTemp) / 2);
      const rainProb = Math.round(daily.precipitation_probability_max[i] || 0);
      const uvi = Math.round(daily.uv_index_max[i] || 6);

      forecastDays.push({
        dayNumber: i + 1,
        date: `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`,
        tempC: avgTemp,
        minTempC: minTemp,
        maxTempC: maxTemp,
        condition: meta.condition,
        icon: meta.icon,
        rainProbPercent: rainProb,
        humidityPercent: Math.round(current.relative_humidity_2m || 55),
        windKmh: Math.round(current.wind_speed_10m || 12),
        uvi: uvi,
        aqi: fallback.forecastDays[i]?.aqi || 40,
        clothingTip: fallback.forecastDays[i]?.clothingTip || fallback.forecastDays[0]?.clothingTip || 'Comfortable layered travel attire.',
        alert: rainProb > 50 ? 'Precipitation expected. Plan outdoor sightseeing during clearer morning hours.' : undefined
      });
    }

    const currentMeta = mapWmoCodeToCondition(current.weather_code || 0);

    return {
      destination: fallback.destination,
      currentTempC: Math.round(current.temperature_2m),
      currentCondition: currentMeta.condition,
      forecastDays: forecastDays.length > 0 ? forecastDays : fallback.forecastDays,
      roadConditionAdvisory: fallback.roadConditionAdvisory,
      isLive: true,
      source: 'Open-Meteo forecast',
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  } catch (err) {
    console.warn('Real-time meteorological fetch failed; using curated profile:', err);
    return { ...fallback, isLive: false };
  }
}

