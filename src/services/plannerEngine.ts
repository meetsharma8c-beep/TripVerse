import { Trip, DayPlan, ItineraryActivity, RouteType, TravelPreference, Coordinates, Destination } from '../types/trip';
import { POPULAR_DESTINATIONS } from '../data/destinations';
import { synthesizeDestination, resolveDestinationImage } from '../utils/destinationImages';
import { generateTransportDeals } from './dealService';
import { resolvePreciseLocationSync, PreciseLocation } from './locationService';
import { selectHotelForTrip } from './hotelService';
import { resolveTransitContext } from './transportFeasibilityEngine';

export interface PlannerInput {
  origin: string;
  destinationName?: string;
  destination?: string;
  durationDays: number;
  travelersCount: number;
  travelerType: any;
  budgetMode: 'per_person' | 'total';
  budgetAmount: number;
  preferences: TravelPreference[];
  specialRequests?: string;
  transportMode: any;
  accommodationType: any;
  foodPreference: any;
  priorities: any[];
  destinationCoords?: Coordinates;
  preciseLocation?: PreciseLocation;
  originCoords?: Coordinates;
  startDate?: string;
  pacing?: 'relaxed' | 'balanced' | 'fast_paced';
}

/**
 * Haversine formula to calculate approximate straight-line distance in km
 */
function haversineDistKm(c1: Coordinates, c2: Coordinates): number {
  const R = 6371;
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
    Math.cos((c2.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolve origin coordinates
 */
function resolveOriginCoords(originName: string): Coordinates {
  const lower = (originName || '').toLowerCase().trim();
  if (lower.includes('ahmedabad')) return { lat: 23.0225, lng: 72.5714 };
  if (lower.includes('vadodara') || lower.includes('baroda')) return { lat: 22.3072, lng: 73.1812 };
  if (lower.includes('surat')) return { lat: 21.1702, lng: 72.8311 };
  if (lower.includes('mumbai') || lower.includes('bombay')) return { lat: 19.0760, lng: 72.8777 };
  if (lower.includes('delhi')) return { lat: 28.6139, lng: 77.2090 };
  if (lower.includes('pune')) return { lat: 18.5204, lng: 73.8567 };
  if (lower.includes('jaipur')) return { lat: 26.9124, lng: 75.7873 };
  if (lower.includes('bangalore') || lower.includes('bengaluru')) return { lat: 12.9716, lng: 77.5946 };
  if (lower.includes('hyderabad')) return { lat: 17.3850, lng: 78.4867 };
  if (lower.includes('kolkata')) return { lat: 22.5726, lng: 88.3639 };

  // Fallback to offline geocoder
  const resolved = resolvePreciseLocationSync(originName);
  return resolved.coordinates || { lat: 23.0225, lng: 72.5714 };
}

/**
 * Dynamic Regional Cuisine helper for ANY Indian state or global country,
 * strictly honoring dietary preferences (veg, jain, vegan, non-veg, all).
 */
function getRegionalCuisine(state: string, country: string, foodPreference: string = 'veg') {
  const normState = (state || '').toLowerCase();
  const normCountry = (country || '').toLowerCase();
  const pref = (foodPreference || 'veg').toLowerCase();
  const isStrictVeg = pref === 'veg' || pref === 'jain' || pref === 'vegan' || pref === 'street_food';
  const isJain = pref === 'jain';

  if (normState.includes('gujarat')) {
    return {
      cuisineName: isJain ? 'Jain Kathiyawadi & Gujarati' : 'Kathiyawadi & Gujarati',
      breakfast: 'Fresh Fafda, Jalebi, Khaman & Adrak Chai',
      lunch: 'Unlimited Gujarati Thali with Puran Poli, Dal-Bhat & Kadhi',
      dinner: isJain
        ? 'Bajra Rotla with Jain Sev Tameta, Panchkutiyu Shaak & Chaas'
        : 'Coal-fired Bajra Rotla with Ringna No Olo, Sev Tameta & Chaas',
      snack: 'Steamed Sev Khamani & Masala Soda'
    };
  }
  if (normState.includes('rajasthan') || normState.includes('jaipur') || normState.includes('jodhpur') || normState.includes('udaipur')) {
    return {
      cuisineName: isJain ? 'Jain Rajasthani & Mewari' : 'Rajasthani & Mewari',
      breakfast: isJain
        ? 'Dal Kachori with Tangy Tamarind & Mint Chutney with Kulhad Chai'
        : 'Pyaaz & Dal Kachori with Tangy Tamarind Chutney & Kulhad Chai',
      lunch: 'Traditional Dal Baati Churma with Gatte Ki Sabzi & Ker Sangri',
      dinner: isStrictVeg
        ? 'Royal Mewari Vegetarian Thali with Paneer Rajwadi, Papad Ki Sabzi & Crisp Missi Roti'
        : 'Royal Mewari Thali with Laal Maas / Paneer Rajwadi and Crisp Missi Roti',
      snack: 'Mawa Kachori & Ghevar'
    };
  }
  if (normState.includes('himachal') || normState.includes('uttarakhand') || normState.includes('kashmir') || normState.includes('ladakh')) {
    return {
      cuisineName: 'Pahadi & Himalayan',
      breakfast: 'Stuffed Pahadi Parathas with Fresh Curd & Mountain Herb Chai',
      lunch: 'Steamed Siddu with Pure Ghee & Slow-cooked Pahadi Dal',
      dinner: 'Hot Himalayan Veg Thukpa, Steamed Momos & Kashmiri Kahwa',
      snack: 'Rhododendron Juice & Warm Apple Strudel'
    };
  }
  if (normState.includes('karnataka') || normState.includes('bangalore') || normState.includes('gokarna') || normState.includes('coorg')) {
    return {
      cuisineName: 'Coastal Karnataka & South Indian',
      breakfast: 'Crispy Ghee Podi Dosa with Filter Coffee',
      lunch: 'Coastal Banana Leaf Thali with Neer Dosa & Coconut Chutney',
      dinner: 'Kundapura Spiced Vegetable Curry with Akki Rotti and Coconut Payasam',
      snack: 'Mangalore Buns & Fresh Filter Coffee'
    };
  }
  if (normState.includes('tamil') || normState.includes('chennai') || normState.includes('dhanushkodi') || normState.includes('rameshwaram')) {
    return {
      cuisineName: 'Chettinad & Tamil',
      breakfast: 'Steaming Idlis, Medu Vada & Traditional Kumbakonam Degree Coffee',
      lunch: 'Authentic Chettinad Spice Feast on Banana Leaf with Kuzhambu & Rasam',
      dinner: 'Crisp Kothu Parotta with Vegetable Coconut Stew & Elaneer Payasam',
      snack: 'Banana Bajjis & Madurai Jigarthanda'
    };
  }
  if (normState.includes('kerala') || normState.includes('varkala') || normState.includes('munnar') || normState.includes('kochi')) {
    return {
      cuisineName: 'Malabar & Coastal Kerala',
      breakfast: isStrictVeg
        ? 'Soft Appam with Coconut Milk Vegetable Stew and Cardamom Tea'
        : 'Soft Appam with Vegetable / Egg Stew and Cardamom Tea',
      lunch: 'Traditional Kerala Sadhya served on fresh Plantain Leaf',
      dinner: 'Malabar Parotta with Spiced Vegetable Kurma, Coconut Rice & Sol Kadhi',
      snack: 'Crisp Banana Chips & Spiced Buttermilk (Sambharam)'
    };
  }
  if (normState.includes('goa')) {
    return {
      cuisineName: isStrictVeg ? 'Goan Saraswat Vegetarian' : 'Goan Coastal',
      breakfast: isStrictVeg
        ? 'Fresh Poee Bread with GoanPatal Bhaji & Spiced Chai'
        : 'Fresh Poee Bread with Goan Omelette & Spiced Chai',
      lunch: 'Coconut-laced Goan Cashew & Mushroom Xacuti with Red Rice & Kokum Kadhi',
      dinner: isStrictVeg
        ? 'Beachfront Goan Vegetable Caldinho & Paneer Cafreal with Bebinca'
        : 'Beachfront Grilled Coastal Delicacies with Bebinca Dessert',
      snack: 'Kokum Sol Kadhi with Roasted Cashew Farsan'
    };
  }
  if (normState.includes('maharashtra') || normState.includes('mumbai') || normState.includes('pune')) {
    return {
      cuisineName: 'Maharashtrian',
      breakfast: 'Zesty Kolhapuri Misal Pav with Farsan & Cutting Chai',
      lunch: 'Puran Poli, Batata Bhaji, Amti & Steamed Rice Thali',
      dinner: 'Pitla Bhakri with Thecha & Solkadhi',
      snack: 'Vada Pav with Dry Garlic Chutney'
    };
  }
  if (normCountry && normCountry !== 'india') {
    return {
      cuisineName: 'Continental & Regional Artisan',
      breakfast: 'Artisan Pastries, Fresh Seasonal Fruit & Cafe Latte',
      lunch: 'Farm-to-Table Bistro Speciality with Handcrafted Salads & Soups',
      dinner: 'Candlelight Dinner with Regional Chef Delicacies & Local Dessert',
      snack: 'Local Gelato & Herbal Infusion Tea'
    };
  }
  return {
    cuisineName: 'Regional Culinary Specialities',
    breakfast: 'Fresh Local Morning Breakfast Platter & Herbal Tea',
    lunch: 'Traditional Regional Deluxe Thali with Sweet Accompaniments',
    dinner: 'Chef Speciality Dinner with Fresh Hearth-baked Breads',
    snack: 'Local Specialty Farsan & Masala Tea'
  };
}

/**
 * Dynamic Activity Verbs and Descriptions based on spotType and category
 */
function getActivityTypeMeta(spotType: string, category: string) {
  if (spotType === 'temple' || category === 'spiritual') {
    return {
      afternoonVerb: 'Darshan, Architectural Tour & Sanctum Exploration',
      afternoonDesc: 'Experience tranquil sanctum darshan, majestic stone carvings, sacred water ponds, and spiritual serenity.',
      eveningVerb: 'Grand Evening Aarti & Cultural Light Spectacle',
      eveningDesc: 'Witness evening musical prayers, brass lamp aarti ceremonies, and luminous illuminated spires.',
      morningVerb: 'Morning Prayer, Holy Chants & Peaceful Walk',
      morningDesc: 'Immerse in peaceful dawn prayers, sacred hymns, and quiet morning breezes.'
    };
  }
  if (spotType === 'beach' || category === 'beach') {
    return {
      afternoonVerb: 'Coastal Shoreline Walk & Seashell Beach Trails',
      afternoonDesc: 'Stroll along sun-kissed sands, pristine tide pools, and azure waters with refreshing sea breezes.',
      eveningVerb: 'Golden Hour Ocean Sunset & Coastal Promenade',
      eveningDesc: 'Witness breathtaking horizon sunsets with coastal dining and gentle wave sounds.',
      morningVerb: 'Morning Shoreline Walk & Seashell Gathering',
      morningDesc: 'Peaceful barefoot walk along the tide line with cool morning sea breezes.'
    };
  }
  if (spotType === 'monument' || category === 'heritage') {
    return {
      afternoonVerb: 'Historic Fortress & Architectural Exploration',
      afternoonDesc: 'Discover ancient stone walls, regal balconies, intricate murals, and centuries of vibrant history.',
      eveningVerb: 'Golden Hour Heritage Ramparts & Folk Lore',
      eveningDesc: 'Take in panoramic horizon vistas from elevated battlements as the sunset bathes the monument in gold.',
      morningVerb: 'Courtyard Sunrise Stroll & Photography',
      morningDesc: 'Enjoy morning tranquility through arched stone gateways before crowds arrive.'
    };
  }
  if (spotType === 'nature' || category === 'nature') {
    return {
      afternoonVerb: 'Lush Forest Canopy & Nature Sanctuary Trail',
      afternoonDesc: 'Trek along verdant pathways, scenic riverbanks, birdwatching towers, and untouched wilderness.',
      eveningVerb: 'Scenic Twilight Overlook & Forest Breeze',
      eveningDesc: 'Watch the sun dip behind treetops and tranquil waters with the sounds of nature.',
      morningVerb: 'Misty Dawn Canopy Walk & Bird Chirping',
      morningDesc: 'Breathe in pure mountain and forest air as early sunlight streams through dense leaves.'
    };
  }
  // Hill station / mountain / roadtrip / default
  return {
    afternoonVerb: 'Scenic Panorama & Valley Exploration',
    afternoonDesc: 'Explore elevated scenic viewpoints, pine-scented mountain air, and panoramic valley horizons.',
    eveningVerb: 'Sunset Overlook & Promenade Leisure',
    eveningDesc: 'Unwind at the scenic overlook as golden twilight illuminates surrounding hills and valleys.',
    morningVerb: 'Morning Mist Walk & Sunrise View',
    morningDesc: 'Watch morning mist rise over distant ridges with a warm cup of freshly brewed tea.'
  };
}

/**
 * Real-world destination cost multiplier (Tier 1 metros vs Hill/Islands vs Heritage vs Small towns)
 */
function getCityCostMultiplier(state: string, destination: string): number {
  const norm = (state + ' ' + destination).toLowerCase();
  if (norm.includes('mumbai') || norm.includes('delhi') || norm.includes('bangalore') || norm.includes('bengaluru') || norm.includes('dubai') || norm.includes('singapore') || norm.includes('paris')) {
    return 1.45;
  }
  if (norm.includes('goa') || norm.includes('manali') || norm.includes('leh') || norm.includes('ladakh') || norm.includes('andaman') || norm.includes('munnar') || norm.includes('kashmir')) {
    return 1.25;
  }
  if (norm.includes('jaipur') || norm.includes('udaipur') || norm.includes('varanasi') || norm.includes('agra') || norm.includes('amritsar') || norm.includes('pune') || norm.includes('hyderabad')) {
    return 1.05;
  }
  return 0.85;
}

/**
 * Realistic visitor entry fees for monuments, heritage, and activities
 */
function getActivityTicketFee(title: string, spotType: string, category: string): number {
  const norm = (title + ' ' + spotType + ' ' + category).toLowerCase();
  if (norm.includes('palace') || norm.includes('fort') || norm.includes('castle')) return 200;
  if (norm.includes('museum') || norm.includes('gallery')) return 150;
  if (norm.includes('boat') || norm.includes('cruise') || norm.includes('lake ride')) return 450;
  if (norm.includes('safari') || norm.includes('adventure') || norm.includes('scuba') || norm.includes('paragliding')) return 1800;
  if (norm.includes('temple') || norm.includes('viewpoint') || norm.includes('beach') || norm.includes('walk') || norm.includes('ghat')) return 0;
  return 100;
}

export function generateAITrip(input: PlannerInput): Trip {
  const safeTravelers = Math.max(1, Math.min(30, Math.round(Number(input.travelersCount) || 1)));
  const daysCount = Math.max(1, Math.min(30, Math.round(Number(input.durationDays) || 3)));
  const rawBudget = Math.max(500, Number(input.budgetAmount) || 8000);
  const totalBudget = input.budgetMode === 'total'
    ? rawBudget
    : rawBudget * safeTravelers;

  const budgetPerPerson = Math.round(totalBudget / safeTravelers);

  const rawDestName = (input.destinationName || input.destination || 'Scenic Getaway').trim() || 'Scenic Getaway';
  const preciseLoc: PreciseLocation = input.preciseLocation || resolvePreciseLocationSync(rawDestName);

  // Exact catalog match only if user typed exact name; otherwise synthesize to keep spot name
  let matchedDest: Destination | undefined = POPULAR_DESTINATIONS.find(
    d => d.name.toLowerCase() === rawDestName.toLowerCase() ||
      d.id === preciseLoc.id
  );

  if (!matchedDest) {
    matchedDest = synthesizeDestination(
      preciseLoc.name || rawDestName,
      input.destinationCoords || preciseLoc.coordinates,
      preciseLoc.category,
      preciseLoc.state
    );
  }

  // Exact display name for spot (e.g. "Mansarovar, Jaipur", "Chopta", "Polo Forest", "Hallstatt")
  const spotName = preciseLoc.name || matchedDest.name || rawDestName;
  const state = preciseLoc.state || matchedDest.state || 'India';
  const country = preciseLoc.country || 'India';
  const spotType = preciseLoc.spotType || 'nature';
  const category = preciseLoc.category || matchedDest.category || 'roadtrip';
  const transitContext = resolveTransitContext(spotName);

  // Determine true destination coordinates
  const destCoords: Coordinates = input.destinationCoords || preciseLoc.coordinates || matchedDest.coordinates || { lat: 26.9124, lng: 75.7873 };

  // Determine origin coordinates
  const originCoords: Coordinates = input.originCoords || resolveOriginCoords(input.origin || 'Ahmedabad, Gujarat');

  // Calculate real highway distance & duration
  const straightLineDist = haversineDistKm(originCoords, destCoords);
  const routeDistKm = Math.max(45, Math.round(straightLineDist * 1.25));
  const avgSpeed = input.transportMode === 'flight' ? 450 : input.transportMode === 'bike' ? 55 : 68;
  const routeHours = Math.max(1, Math.round((routeDistKm / avgSpeed) * 10) / 10);

  // Calculate budget allocation percentages (1-day trip needs 0 overnight stay budget)
  const isSingleDay = daysCount === 1;
  let transportPct = isSingleDay ? 0.42 : 0.25;
  let stayPct = isSingleDay ? 0 : 0.32;
  let foodPct = isSingleDay ? 0.28 : 0.20;
  let actPct = isSingleDay ? 0.22 : 0.16;

  if (!isSingleDay) {
    if (input.transportMode === 'flight') { transportPct = 0.36; stayPct = 0.28; }
    if (input.transportMode === 'bike' || input.transportMode === 'bus') transportPct = 0.18;
    if (input.accommodationType === '5star' || input.accommodationType === '4star') { stayPct = 0.38; transportPct = Math.min(transportPct, 0.25); }
    if (input.accommodationType === 'hostel') stayPct = 0.20;
  }

  // Respect user's budget constraint without exceeding totalBudget
  const estimatedTotal = Math.max(Math.min(totalBudget, 500), Math.round(totalBudget * 0.94));

  const transportCost = Math.round(estimatedTotal * transportPct);
  const stayCost = Math.round(estimatedTotal * stayPct);
  const foodCost = Math.round(estimatedTotal * foodPct);
  const actCost = Math.round(estimatedTotal * actPct);
  const miscCost = Math.max(0, estimatedTotal - (transportCost + stayCost + foodCost + actCost));

  // Regional cuisine and activity metadata
  const foodPref = input.foodPreference || 'veg';
  const cuisine = getRegionalCuisine(state, country, foodPref);
  const activityMeta = getActivityTypeMeta(spotType, category);

  // Compile full deduplicated highlights list with enough unique entries for up to 30 days
  const rawHighlights = Array.from(new Set([
    ...(matchedDest.popularActivities || []),
    ...(preciseLoc.highlights || []),
    `${spotName} Historic & Scenic Landmark Tour`,
    `${spotName} Cultural Discovery & Panorama`,
    `${spotName} Local Artisan Heritage Market`,
    `${spotName} Panoramic Trail & Nature Walk`,
    `${spotName} Old Quarter Architecture Walk`,
    `${spotName} Lakeside / Valley Promenade`,
    `${spotName} Botanical & Heritage Gardens`,
    `${spotName} Craft Village & Folk Museum`,
    `${spotName} Morning Ridge & Viewpoint Trail`,
    `${spotName} Sunset Overlook & Cultural Square`
  ].filter(Boolean)));
  const highlights = rawHighlights;
  let nextHighlightCursor = 0;
  const takeUniqueHighlight = (fallbackLabel: string): string => {
    if (nextHighlightCursor < highlights.length) {
      return highlights[nextHighlightCursor++];
    }
    const cycleIdx = nextHighlightCursor++;
    return `${spotName} ${fallbackLabel} (Zone ${cycleIdx - highlights.length + 2})`;
  };

  // Determine pacing preference and city cost multiplier
  const pacing: 'relaxed' | 'balanced' | 'fast_paced' = input.pacing ||
    (input.travelerType === 'couple' || input.travelerType === 'family' ? 'relaxed' : 'balanced');
  const cityMultiplier = getCityCostMultiplier(state, spotName);

  // Select verified real hotel matching destination and accommodation tier
  const { recommendedHotel, alternativeHotels } = selectHotelForTrip({
    destination: spotName,
    accommodationType: input.accommodationType || 'budget',
    totalBudget,
    durationDays: daysCount,
    travelersCount: safeTravelers,
    startDate: input.startDate
  });

  // Scale meal/ticket unit costs so low-budget trips stay within their food + activity allocation
  const dailyFoodAndActBudget = (foodCost + actCost) / daysCount;
  const baselineDailyFoodAct = (800 * cityMultiplier + 350) * safeTravelers;
  const budgetScale = baselineDailyFoodAct > dailyFoodAndActBudget && baselineDailyFoodAct > 0
    ? Math.max(0.15, dailyFoodAndActBudget / baselineDailyFoodAct)
    : 1;
  const scaleExpense = (rawAmount: number) => Math.max(0, Math.round(rawAmount * budgetScale));

  const isAir = input.transportMode === 'flight' && transitContext.primaryAirport !== null;
  const isRail = input.transportMode === 'train' && transitContext.primaryRailwayStation !== null;
  const outboundTransitTitle = isAir
    ? `Flight from ${input.origin || 'Origin'} to ${transitContext.primaryAirport?.name || spotName}`
    : isRail
      ? `Train from ${input.origin || 'Origin'} to ${transitContext.primaryRailwayStation?.name || spotName}`
      : `${pacing === 'fast_paced' ? 'Early Sunrise' : pacing === 'relaxed' ? 'Leisurely' : 'Comfortable'} Departure from ${input.origin || 'City Center'}`;
  const outboundHaltTitle = isAir && !transitContext.hasDirectAirport
    ? `Road Transfer from ${transitContext.primaryAirport?.name} to ${spotName}`
    : isRail && !transitContext.hasDirectTrain
      ? `Road Transfer from ${transitContext.primaryRailwayStation?.name} to ${spotName}`
      : 'En-Route Rest & Refreshment Halt';

  // Generate days
  const days: DayPlan[] = [];

  for (let d = 1; d <= daysCount; d++) {
    const isFirstDay = d === 1;
    const isLastDay = d === daysCount;

    if (isSingleDay) {
      // 1-Day Day-Trip: Outbound Departure -> Refreshment Halt -> Sightseeing -> Lunch -> Afternoon Highlight -> Return Home
      const sight1 = takeUniqueHighlight(activityMeta.morningVerb);
      const sight2 = takeUniqueHighlight(activityMeta.afternoonVerb);
      const sight1Fee = getActivityTicketFee(sight1, spotType, category);
      const day1Acts: ItineraryActivity[] = [
        {
          id: 'act-1-dep',
          dayNumber: 1,
          time: '6:30 AM',
          title: outboundTransitTitle,
          type: 'departure',
          location: `${input.origin || 'City Center'} Transit Hub`,
          estimatedCost: Math.round(transportCost * 0.5),
          travelTimeMin: 0,
          distanceKm: 0,
          description: `Outbound day-trip departure towards ${spotName} (${pacing.replace('_', ' ')} pace).`,
          coordinates: originCoords,
          tag: 'Start Point'
        },
        {
          id: 'act-1-bs',
          dayNumber: 1,
          time: '8:30 AM',
          title: outboundHaltTitle,
          type: 'breakstop',
          location: 'En-route Refreshment Stop',
          estimatedCost: scaleExpense(120 * cityMultiplier * safeTravelers),
          travelTimeMin: Math.round(routeHours * 30),
          distanceKm: Math.round(routeDistKm * 0.5),
          description: `Morning breakfast & tea halt en-route (${cuisine.breakfast}).`,
          coordinates: {
            lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.5,
            lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.5
          },
          tag: 'Break Stop'
        },
        {
          id: 'act-1-prime-sight',
          dayNumber: 1,
          time: '10:30 AM',
          title: sight1,
          type: 'attraction',
          location: `${spotName} Landmark Core`,
          estimatedCost: scaleExpense(sight1Fee * safeTravelers),
          travelTimeMin: Math.round(routeHours * 30),
          distanceKm: Math.round(routeDistKm * 0.5),
          description: `${activityMeta.morningDesc} (Est. entry ticket: ~₹${sight1Fee}/person).`,
          coordinates: { lat: destCoords.lat + 0.004, lng: destCoords.lng + 0.003 },
          tag: 'Attraction'
        },
        {
          id: 'act-1-lunch',
          dayNumber: 1,
          time: '1:15 PM',
          title: `${cuisine.cuisineName} Lunch`,
          type: 'food',
          location: `${spotName} Regional Dining Kitchen`,
          estimatedCost: scaleExpense(300 * cityMultiplier * safeTravelers),
          travelTimeMin: 15,
          distanceKm: 1.5,
          description: `Authentic regional meal (${cuisine.lunch}) tailored for ${foodPref} preference.`,
          coordinates: { lat: destCoords.lat - 0.003, lng: destCoords.lng + 0.003 },
          tag: 'Lunch'
        },
        {
          id: 'act-1-afternoon',
          dayNumber: 1,
          time: '3:15 PM',
          title: sight2,
          type: 'viewpoint',
          location: `${spotName} Scenic Overlook`,
          estimatedCost: scaleExpense(100 * safeTravelers),
          travelTimeMin: 15,
          distanceKm: 2.2,
          description: `${activityMeta.afternoonDesc}`,
          coordinates: { lat: destCoords.lat - 0.005, lng: destCoords.lng + 0.005 },
          tag: 'Highlight'
        },
        {
          id: 'act-1-return',
          dayNumber: 1,
          time: '5:45 PM',
          title: `Commence Return Journey to ${input.origin || 'Origin'}`,
          type: 'departure',
          location: `${spotName} Departure Point`,
          estimatedCost: Math.round(transportCost * 0.5),
          travelTimeMin: 0,
          distanceKm: 0,
          description: `Evening return transit from ${spotName} to ${input.origin || 'Origin'}.`,
          coordinates: {
            lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.5,
            lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.5
          },
          tag: 'Return'
        },
        {
          id: 'act-1-home',
          dayNumber: 1,
          time: '9:30 PM',
          title: `Safe Arrival in ${input.origin || 'Home'}`,
          type: 'arrival',
          location: input.origin || 'Home City',
          estimatedCost: 0,
          travelTimeMin: Math.round(routeHours * 60),
          distanceKm: routeDistKm,
          description: `1-day excursion to ${spotName} completed within target budget.`,
          coordinates: originCoords,
          tag: 'Destination'
        }
      ];

      days.push({
        dayNumber: 1,
        title: `Day 1 — ${spotName} Express Day Excursion & Return (${pacing.replace('_', ' ')} pace)`,
        theme: `Outbound Transit, ${sight1}, ${cuisine.cuisineName} Lunch & Evening Return`,
        dayEstimatedCost: day1Acts.reduce((s, a) => s + a.estimatedCost, 0),
        activities: day1Acts
      });
    } else if (isFirstDay) {
      // Day 1 of Multi-Day Trip: Departure, Transit Halt, Check-in at recommended hotel, Lunch, Prime Landmark & Golden Hour
      const firstSight = takeUniqueHighlight(activityMeta.afternoonVerb);
      const day1SightFee = getActivityTicketFee(firstSight, spotType, category);
      const depTime = pacing === 'relaxed' ? '9:00 AM' : pacing === 'fast_paced' ? '6:00 AM' : '7:30 AM';
      const bsTime = pacing === 'relaxed' ? '11:15 AM' : pacing === 'fast_paced' ? '8:30 AM' : '10:00 AM';
      const checkinTime = pacing === 'relaxed' ? '2:00 PM' : pacing === 'fast_paced' ? '11:45 AM' : '1:00 PM';
      const lunchTime = pacing === 'relaxed' ? '3:15 PM' : pacing === 'fast_paced' ? '1:00 PM' : '2:30 PM';
      const sightTime = pacing === 'relaxed' ? '5:15 PM' : pacing === 'fast_paced' ? '2:45 PM' : '4:30 PM';
      const sunsetTime = pacing === 'relaxed' ? '7:00 PM' : pacing === 'fast_paced' ? '6:15 PM' : '6:30 PM';
      const dinnerTime = pacing === 'relaxed' ? '9:15 PM' : pacing === 'fast_paced' ? '8:30 PM' : '8:45 PM';

      const day1Acts: ItineraryActivity[] = [
        {
          id: `act-1-dep`,
          dayNumber: 1,
          time: depTime,
          title: outboundTransitTitle,
          type: 'departure',
          location: `${input.origin || 'City Center'} Transit Corridor`,
          estimatedCost: Math.round(transportCost * 0.5),
          travelTimeMin: 0,
          distanceKm: 0,
          description: `Departure towards ${spotName}.${transitContext.multiModalGuidance ? ' ' + transitContext.multiModalGuidance : ''}`,
          coordinates: originCoords,
          tag: 'Start Point'
        },
        {
          id: `act-1-bs`,
          dayNumber: 1,
          time: bsTime,
          title: outboundHaltTitle,
          type: 'breakstop',
          location: isAir ? (transitContext.primaryAirport?.name || 'Airport Transfer Hub') : isRail ? (transitContext.primaryRailwayStation?.name || 'Rail Transfer Hub') : 'En-route Highway Food Plaza',
          estimatedCost: scaleExpense(140 * cityMultiplier * safeTravelers),
          travelTimeMin: Math.round(routeHours * 30),
          distanceKm: Math.round(routeDistKm * 0.5),
          description: `Suggested refreshment break & transit connection en-route (~₹${scaleExpense(140 * cityMultiplier)}/person).`,
          coordinates: {
            lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.5,
            lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.5
          },
          tag: 'Break Stop'
        },
        {
          id: `act-1-hotel`,
          dayNumber: 1,
          time: checkinTime,
          title: `Check in at ${recommendedHotel.name}`,
          type: 'hotel',
          location: `${recommendedHotel.name}, ${recommendedHotel.neighborhood}, ${spotName}`,
          estimatedCost: Math.min(stayCost, Math.round(stayCost / Math.max(1, daysCount - 1))),
          travelTimeMin: Math.round(routeHours * 30),
          distanceKm: Math.round(routeDistKm * 0.5),
          description: `${recommendedHotel.starRating}★ ${recommendedHotel.roomType}. Amenities: ${recommendedHotel.amenities.slice(0, 3).join(', ')}. ${recommendedHotel.cancellationPolicy}.`,
          coordinates: { lat: destCoords.lat + 0.002, lng: destCoords.lng - 0.002 },
          tag: `Suggested Stay • ${recommendedHotel.tier.toUpperCase()}`,
          mapUrl: recommendedHotel.bookingUrl
        },
        {
          id: `act-1-lunch`,
          dayNumber: 1,
          time: lunchTime,
          title: `${cuisine.cuisineName} Welcome Lunch`,
          type: 'food',
          location: `${spotName} Regional Dining Kitchen`,
          estimatedCost: scaleExpense(340 * cityMultiplier * safeTravelers),
          travelTimeMin: 15,
          distanceKm: 1.5,
          description: `Authentic regional feast: ${cuisine.lunch}. Tailored for ${foodPref} dining (~₹${scaleExpense(340 * cityMultiplier)}/person).`,
          coordinates: { lat: destCoords.lat - 0.003, lng: destCoords.lng + 0.003 },
          tag: 'Lunch'
        },
        {
          id: `act-1-prime-sight`,
          dayNumber: 1,
          time: sightTime,
          title: firstSight,
          type: 'attraction',
          location: `${spotName} Landmark Core`,
          estimatedCost: scaleExpense(day1SightFee * safeTravelers),
          travelTimeMin: 20,
          distanceKm: 2.5,
          description: `${activityMeta.afternoonDesc} (Est. entry ticket: ~₹${day1SightFee}/person).`,
          coordinates: { lat: destCoords.lat + 0.005, lng: destCoords.lng + 0.004 },
          tag: 'Attraction'
        },
        {
          id: `act-1-sunset`,
          dayNumber: 1,
          time: sunsetTime,
          title: `${spotName} ${activityMeta.eveningVerb}`,
          type: 'viewpoint',
          location: `${spotName} Panoramic Viewpoint`,
          estimatedCost: scaleExpense(30 * safeTravelers),
          travelTimeMin: 15,
          distanceKm: 2.0,
          description: `${activityMeta.eveningDesc} (Golden Hour observation window).`,
          coordinates: { lat: destCoords.lat - 0.005, lng: destCoords.lng + 0.005 },
          tag: 'Sunset'
        },
        {
          id: `act-1-dinner`,
          dayNumber: 1,
          time: dinnerTime,
          title: `Dinner & ${cuisine.cuisineName} Delicacies`,
          type: 'food',
          location: `${spotName} Terrace / Courtyard Dining`,
          estimatedCost: scaleExpense(440 * cityMultiplier * safeTravelers),
          travelTimeMin: 10,
          distanceKm: 1.2,
          description: `Evening feast enjoying ${cuisine.dinner} under starry skies (~₹${scaleExpense(440 * cityMultiplier)}/person).`,
          coordinates: { lat: destCoords.lat + 0.001, lng: destCoords.lng + 0.002 },
          tag: 'Dinner'
        }
      ];

      days.push({
        dayNumber: 1,
        title: `Day 1 — Journey to ${spotName} & Prime Highlights (${pacing.replace('_', ' ')} pace)`,
        theme: `Departure, Check-in at ${recommendedHotel.name}, ${firstSight} & Golden Hour Sunset`,
        dayEstimatedCost: day1Acts.reduce((s, a) => s + a.estimatedCost, 0),
        activities: day1Acts
      });
    } else if (isLastDay) {
      // Final Day: Morning breakfast, unique sight, artisan shopping, farewell lunch, and return journey
      const finalSight = takeUniqueHighlight('Morning Panorama & Heritage Walk');
      const bfastTime = pacing === 'relaxed' ? '9:00 AM' : pacing === 'fast_paced' ? '7:00 AM' : '8:00 AM';
      const sightTime = pacing === 'relaxed' ? '10:45 AM' : pacing === 'fast_paced' ? '8:30 AM' : '9:30 AM';
      const shopTime = pacing === 'relaxed' ? '12:30 PM' : pacing === 'fast_paced' ? '10:45 AM' : '11:30 AM';
      const lunchTime = pacing === 'relaxed' ? '2:15 PM' : pacing === 'fast_paced' ? '12:45 PM' : '1:30 PM';
      const depTime = pacing === 'relaxed' ? '3:45 PM' : pacing === 'fast_paced' ? '2:00 PM' : '3:00 PM';
      const bsTime = pacing === 'relaxed' ? '6:30 PM' : pacing === 'fast_paced' ? '4:45 PM' : '5:30 PM';
      const arrTime = pacing === 'relaxed' ? '9:30 PM' : pacing === 'fast_paced' ? '7:45 PM' : '8:30 PM';

      const lastDayActs: ItineraryActivity[] = [
        {
          id: `act-${d}-bfast`,
          dayNumber: d,
          time: bfastTime,
          title: `Traditional ${cuisine.cuisineName} Breakfast`,
          type: 'food',
          location: `${spotName} Local Morning Hub`,
          estimatedCost: scaleExpense(120 * cityMultiplier * safeTravelers),
          travelTimeMin: 10,
          distanceKm: 0.8,
          description: `Fresh morning breakfast enjoying ${cuisine.breakfast}.`,
          coordinates: { lat: destCoords.lat - 0.001, lng: destCoords.lng + 0.001 },
          tag: 'Breakfast'
        },
        {
          id: `act-${d}-sight`,
          dayNumber: d,
          time: sightTime,
          title: finalSight,
          type: 'attraction',
          location: `${spotName} Scenic Environs`,
          estimatedCost: scaleExpense(100 * safeTravelers),
          travelTimeMin: 15,
          distanceKm: 2.0,
          description: `Gentle morning exploration taking in the final scenic panoramas and iconic photo frames.`,
          coordinates: { lat: destCoords.lat + 0.003, lng: destCoords.lng - 0.002 },
          tag: 'Scenic Walk'
        },
        {
          id: `act-${d}-shop`,
          dayNumber: d,
          time: shopTime,
          title: `${spotName} Local Artisan Souvenirs & Market`,
          type: 'attraction',
          location: `${spotName} Artisan Market Square`,
          estimatedCost: scaleExpense(200 * safeTravelers),
          travelTimeMin: 15,
          distanceKm: 1.5,
          description: `Pick up unique handmade crafts, local specialties, organic produce, and memorable souvenirs.`,
          coordinates: { lat: destCoords.lat - 0.003, lng: destCoords.lng - 0.003 },
          tag: 'Shopping'
        },
        {
          id: `act-${d}-lunch`,
          dayNumber: d,
          time: lunchTime,
          title: `Farewell ${cuisine.cuisineName} Garden Lunch`,
          type: 'food',
          location: `${spotName} Regional Dining Hub`,
          estimatedCost: scaleExpense(260 * cityMultiplier * safeTravelers),
          travelTimeMin: 20,
          distanceKm: 5.0,
          description: `Hearty celebratory meal (${cuisine.lunch}) tailored for ${foodPref} preference before return transit.`,
          coordinates: { lat: destCoords.lat + 0.008, lng: destCoords.lng + 0.005 },
          tag: 'Lunch'
        },
        {
          id: `act-${d}-return`,
          dayNumber: d,
          time: depTime,
          title: `Commence Return Journey to ${input.origin || 'Origin'}`,
          type: 'departure',
          location: isAir ? (transitContext.primaryAirport?.name || `${spotName} Departure`) : isRail ? (transitContext.primaryRailwayStation?.name || `${spotName} Station`) : `${spotName} Highway Gateway`,
          estimatedCost: Math.round(transportCost * 0.5),
          travelTimeMin: 0,
          distanceKm: 0,
          description: `Return journey from ${spotName} towards ${input.origin || 'Origin'}.`,
          coordinates: {
            lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.75,
            lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.75
          },
          tag: 'Return'
        },
        {
          id: `act-${d}-bs`,
          dayNumber: d,
          time: bsTime,
          title: 'Evening Transit Refreshment Halt',
          type: 'breakstop',
          location: 'Along the return route — confirm stop before travel',
          estimatedCost: scaleExpense(100 * cityMultiplier * safeTravelers),
          travelTimeMin: 120,
          distanceKm: Math.round(routeDistKm * 0.5),
          description: 'Suggested break timing only; confirm a suitable stop and its facilities before travel.',
          coordinates: {
            lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.35,
            lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.35
          },
          tag: 'Break Stop'
        },
        {
          id: `act-${d}-home`,
          dayNumber: d,
          time: arrTime,
          title: `Safe Arrival in ${input.origin || 'Home'}`,
          type: 'arrival',
          location: input.origin || 'Home City',
          estimatedCost: 0,
          travelTimeMin: 150,
          distanceKm: Math.round(routeDistKm * 0.5),
          description: `Trip to ${spotName} concluded smoothly within planned budget.`,
          coordinates: originCoords,
          tag: 'Destination'
        }
      ];

      days.push({
        dayNumber: d,
        title: `Day ${d} — ${finalSight}, Artisan Souvenirs & Safe Return (${pacing.replace('_', ' ')} pace)`,
        theme: 'Morning Specialty Breakfast, Handcrafted Souvenirs, Farewell Lunch & Return Journey',
        dayEstimatedCost: lastDayActs.reduce((s, a) => s + a.estimatedCost, 0),
        activities: lastDayActs
      });
    } else {
      // Middle Days: Deep exploration of unique highlights & culture
      const dayHighlight = takeUniqueHighlight('Hidden Trails & Heritage');
      const afternoonHighlight = takeUniqueHighlight('Scenic Overlook & Cultural Walk');
      const midSightFee = getActivityTicketFee(dayHighlight, spotType, category);

      const bfastTime = pacing === 'relaxed' ? '9:15 AM' : pacing === 'fast_paced' ? '7:15 AM' : '8:30 AM';
      const mornSightTime = pacing === 'relaxed' ? '11:15 AM' : pacing === 'fast_paced' ? '8:45 AM' : '10:00 AM';
      const lunchTime = pacing === 'relaxed' ? '2:00 PM' : pacing === 'fast_paced' ? '1:00 PM' : '1:30 PM';
      const aftSightTime = pacing === 'relaxed' ? '4:45 PM' : pacing === 'fast_paced' ? '2:45 PM' : '3:30 PM';
      const cultureTime = pacing === 'relaxed' ? '7:15 PM' : pacing === 'fast_paced' ? '6:15 PM' : '7:00 PM';
      const dinnerTime = pacing === 'relaxed' ? '9:15 PM' : pacing === 'fast_paced' ? '8:30 PM' : '9:00 PM';

      const middleActivities: ItineraryActivity[] = [
        {
          id: `act-${d}-bfast`,
          dayNumber: d,
          time: bfastTime,
          title: `Energizing ${cuisine.cuisineName} Breakfast`,
          type: 'food',
          location: `${spotName} Morning Eatery`,
          estimatedCost: scaleExpense(110 * cityMultiplier * safeTravelers),
          travelTimeMin: 15,
          distanceKm: 1.0,
          description: `Start the day fresh with regional breakfast specialties: ${cuisine.breakfast}.`,
          coordinates: { lat: destCoords.lat + 0.002 * d, lng: destCoords.lng - 0.002 * d },
          tag: 'Breakfast'
        },
        {
          id: `act-${d}-morn-sight`,
          dayNumber: d,
          time: mornSightTime,
          title: dayHighlight,
          type: 'attraction',
          location: `${spotName} Historic/Scenic Center`,
          estimatedCost: scaleExpense(midSightFee * safeTravelers),
          travelTimeMin: 25,
          distanceKm: 5.0,
          description: `Prime sightseeing and photography with picturesque landscapes and architecture (Est. ticket: ~₹${midSightFee}/person).`,
          coordinates: { lat: destCoords.lat + 0.005 * d, lng: destCoords.lng + 0.004 * d },
          tag: 'Sightseeing'
        },
        {
          id: `act-${d}-lunch`,
          dayNumber: d,
          time: lunchTime,
          title: `Regional ${cuisine.cuisineName} Lunch`,
          type: 'food',
          location: `${spotName} Local Garden Restaurant`,
          estimatedCost: scaleExpense(280 * cityMultiplier * safeTravelers),
          travelTimeMin: 20,
          distanceKm: 4.0,
          description: `Fresh regional cuisine tailored for ${foodPref} preference: ${cuisine.lunch}.`,
          coordinates: { lat: destCoords.lat + 0.003 * d, lng: destCoords.lng - 0.004 * d },
          tag: 'Lunch'
        },
        {
          id: `act-${d}-afternoon`,
          dayNumber: d,
          time: aftSightTime,
          title: afternoonHighlight,
          type: 'viewpoint',
          location: `${spotName} Scenic Overlook`,
          estimatedCost: scaleExpense(150 * cityMultiplier * safeTravelers),
          travelTimeMin: 20,
          distanceKm: 4.5,
          description: pacing === 'relaxed'
            ? 'Unhurried downtime sipping local beverage, taking photographs, and soaking in peaceful views.'
            : 'Energizing nature & heritage walk away from crowds with fresh air and viewpoints.',
          coordinates: { lat: destCoords.lat - 0.004 * d, lng: destCoords.lng - 0.004 * d },
          tag: pacing === 'relaxed' ? 'Leisure' : 'Nature'
        },
        {
          id: `act-${d}-culture`,
          dayNumber: d,
          time: cultureTime,
          title: takeUniqueHighlight(`${spotName} Cultural Evening & Promenade`),
          type: 'attraction',
          location: `${spotName} Cultural District`,
          estimatedCost: scaleExpense(220 * safeTravelers),
          travelTimeMin: 20,
          distanceKm: 3.0,
          description: 'Vibrant local live art, traditional instruments, and evening cultural walk.',
          coordinates: { lat: destCoords.lat + 0.004 * d, lng: destCoords.lng + 0.003 * d },
          tag: 'Culture'
        },
        {
          id: `act-${d}-dinner`,
          dayNumber: d,
          time: dinnerTime,
          title: `Evening ${cuisine.cuisineName} Dinner`,
          type: 'food',
          location: `${spotName} Heritage Dining Hall`,
          estimatedCost: scaleExpense(350 * cityMultiplier * safeTravelers),
          travelTimeMin: 10,
          distanceKm: 1.2,
          description: `Hearty evening dinner with traditional delicacies (${cuisine.dinner}) tailored for ${foodPref} preference.`,
          coordinates: { lat: destCoords.lat, lng: destCoords.lng },
          tag: 'Dinner'
        }
      ];

      // If fast_paced, add extra early sunrise golden hour activity
      if (pacing === 'fast_paced') {
        middleActivities.unshift({
          id: `act-${d}-sunrise`,
          dayNumber: d,
          time: '6:15 AM',
          title: `${spotName} Sunrise Ridge Golden Hour (Day ${d})`,
          type: 'viewpoint',
          location: `${spotName} High Ridge Viewpoint`,
          estimatedCost: 0,
          travelTimeMin: 15,
          distanceKm: 3.0,
          description: 'Early morning golden rays and mist-covered landscapes. Ideal for photography.',
          coordinates: { lat: destCoords.lat - 0.008, lng: destCoords.lng + 0.008 },
          tag: 'Sunrise'
        });
      }

      days.push({
        dayNumber: d,
        title: `Day ${d} — Deep Dive into ${spotName}: ${dayHighlight} (${pacing.replace('_', ' ')} pace)`,
        theme: `${dayHighlight}, ${afternoonHighlight} & Authentic ${cuisine.cuisineName} Dining`,
        dayEstimatedCost: middleActivities.reduce((s, a) => s + a.estimatedCost, 0),
        activities: middleActivities
      });
    }
  }

  const routeType: RouteType = input.priorities?.includes('time')
    ? 'fastest'
    : input.priorities?.includes('experience')
      ? 'scenic'
      : 'cheapest';

  // Generate best transport deal and alternatives tailored to the selected transport mode
  const { bestDeal, allDeals } = generateTransportDeals({
    mode: input.transportMode || 'car',
    origin: input.origin || 'Origin',
    destination: spotName,
    durationDays: daysCount,
    travelersCount: safeTravelers,
    totalBudget: totalBudget,
    priorities: input.priorities,
    startDate: input.startDate
  });

  let safeStartDate = input.startDate;
  if (!safeStartDate || Number.isNaN(new Date(safeStartDate).getTime())) {
    safeStartDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
  }

  return {
    id: `trip-${Date.now()}`,
    name: `${input.origin || 'Origin'} → ${spotName} | ${daysCount} ${daysCount === 1 ? 'Day' : 'Days'}`,
    origin: input.origin || 'Ahmedabad, Gujarat',
    originCoordinates: input.originCoords,
    destination: spotName,
    destinationDetails: {
      image: resolveDestinationImage(spotName, category) || matchedDest.image,
      state: state,
      description: matchedDest.description || `${spotName} in ${state}, ${country}. Handcrafted AI travel plan.`,
      coordinates: destCoords,
      category: category,
      preciseSpot: true,
      spotType: spotType,
      highlights: highlights
    },
    durationDays: daysCount,
    travelersCount: safeTravelers,
    travelerType: input.travelerType || 'friends',
    totalBudget: totalBudget,
    budgetPerPerson: budgetPerPerson,
    preferences: input.preferences?.length ? input.preferences : ['culture', 'nature', 'budget'],
    transportMode: input.transportMode || 'car',
    accommodationType: input.accommodationType || 'budget',
    foodPreference: foodPref,
    priorities: input.priorities?.length ? input.priorities : ['budget', 'comfort'],
    status: 'upcoming',
    isUserCreated: true,
    isSample: false,
    createdAt: new Date().toISOString(),
    startDate: safeStartDate,
    aiRationale: `Suggested ${daysCount}-day trip plan to ${spotName} (${state}) for ${safeTravelers} traveler(s).${isSingleDay ? '' : ` Selected stay: ${recommendedHotel.name} (${recommendedHotel.starRating}★).`} Pacing: ${pacing.replace('_', ' ')}. Total budget calibrated to regional prices. Buffer estimate: ₹${Math.max(0, totalBudget - estimatedTotal).toLocaleString('en-IN')}.`,
    breakStops: [],
    budgetBreakdown: {
      transportation: transportCost,
      accommodation: stayCost,
      food: foodCost,
      activities: actCost,
      miscellaneous: miscCost
    },
    estimatedTotal: estimatedTotal,
    routeType: routeType,
    itinerary: days,
    selectedHotel: isSingleDay ? undefined : recommendedHotel,
    hotelOptions: isSingleDay ? [] : alternativeHotels,
    pacing: pacing,
    bestTransportDeal: bestDeal,
    transportDeals: allDeals,
    routeDetails: {
      distanceKm: routeDistKm,
      durationHours: routeHours,
      source: 'estimate'
    },
    travelDataStatus: 'pending'
  };
}
