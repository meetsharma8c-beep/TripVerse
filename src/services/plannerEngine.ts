import { Trip, DayPlan, ItineraryActivity, RouteType, TravelPreference, Coordinates, Destination } from '../types/trip';
import { POPULAR_DESTINATIONS } from '../data/destinations';
import { synthesizeDestination, resolveDestinationImage } from '../utils/destinationImages';
import { generateTransportDeals } from './dealService';
import { resolvePreciseLocationSync, PreciseLocation } from './locationService';
import { selectHotelForTrip } from './hotelService';

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
 * Dynamic Regional Cuisine helper for ANY Indian state or global country
 */
function getRegionalCuisine(state: string, country: string) {
  const normState = (state || '').toLowerCase();
  const normCountry = (country || '').toLowerCase();

  if (normState.includes('gujarat')) {
    return {
      cuisineName: 'Kathiyawadi & Gujarati',
      breakfast: 'Fresh Fafda, Jalebi, Khaman & Adrak Chai',
      lunch: 'Unlimited Gujarati Thali with Puran Poli, Dal-Bhat & Kadhi',
      dinner: 'Coal-fired Bajra Rotla with Ringna No Olo, Garlic Chutney & Chaas',
      snack: 'Steamed Sev Khamani & Masala Soda'
    };
  }
  if (normState.includes('rajasthan') || normState.includes('jaipur') || normState.includes('jodhpur') || normState.includes('udaipur')) {
    return {
      cuisineName: 'Rajasthani & Mewari',
      breakfast: 'Pyaaz Kachori with Tangy Tamarind & Mint Chutney with Kulhad Chai',
      lunch: 'Traditional Dal Baati Churma with Gatte Ki Sabzi & Ker Sangri',
      dinner: 'Royal Mewari Thali with Laal Maas / Paneer Kunda and Crisp Missi Roti',
      snack: 'Mawa Kachori & Ghevar'
    };
  }
  if (normState.includes('himachal') || normState.includes('uttarakhand') || normState.includes('kashmir') || normState.includes('ladakh')) {
    return {
      cuisineName: 'Pahadi & Himalayan',
      breakfast: 'Stuffed Pahadi Parathas with Fresh Curd & Mountain Herb Chai',
      lunch: 'Steamed Siddu with Pure Ghee & Slow-cooked Pahadi Dal',
      dinner: 'Hot Himalayan Thukpa, Steamed Momos & Kashmiri Kahwa',
      snack: 'Rhododendron Juice & Warm Apple Strudel'
    };
  }
  if (normState.includes('karnataka') || normState.includes('bangalore') || normState.includes('gokarna') || normState.includes('coorg')) {
    return {
      cuisineName: 'Coastal Karnataka & South Indian',
      breakfast: 'Crispy Ghee Podi Dosa with Filter Coffee',
      lunch: 'Coastal Banana Leaf Thali with Neer Dosa & Coconut Chutney',
      dinner: 'Kundapura Spiced Curry with Akki Rotti and Coconut Payasam',
      snack: 'Mangalore Buns & Fresh Filter Coffee'
    };
  }
  if (normState.includes('tamil') || normState.includes('chennai') || normState.includes('dhanushkodi') || normState.includes('rameshwaram')) {
    return {
      cuisineName: 'Chettinad & Tamil',
      breakfast: 'Steaming Idlis, Medu Vada & Traditional Kumbakonam Degree Coffee',
      lunch: 'Authentic Chettinad Spice Feast on Banana Leaf with Kuzhambu & Rasam',
      dinner: 'Crisp Kothu Parotta with Coconut Stew & Elaneer Payasam',
      snack: 'Banana Bajjis & Madurai Jigarthanda'
    };
  }
  if (normState.includes('kerala') || normState.includes('varkala') || normState.includes('munnar') || normState.includes('kochi')) {
    return {
      cuisineName: 'Malabar & Coastal Kerala',
      breakfast: 'Soft Appam with Vegetable / Egg Stew and Cardamom Tea',
      lunch: 'Traditional Kerala Sadhya served on fresh Plantain Leaf',
      dinner: 'Malabar Parotta with Roast Masala, Coconut Rice & Sol Kadhi',
      snack: 'Crisp Banana Chips & Spiced Buttermilk (Sambhram)'
    };
  }
  if (normState.includes('goa')) {
    return {
      cuisineName: 'Goan Coastal',
      breakfast: 'Fresh Poee Bread with Goan Omelette & Spiced Chai',
      lunch: 'Coconut-laced Coastal Curry Thali with Red Rice & Kokum Kadhi',
      dinner: 'Beachfront Grilled Delicacies with Bebinca Dessert',
      snack: 'Feni Cocktail or Sol Kadhi with Cashew Farsan'
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
  const totalBudget = input.budgetMode === 'total'
    ? input.budgetAmount
    : input.budgetAmount * input.travelersCount;

  const budgetPerPerson = Math.round(totalBudget / Math.max(1, input.travelersCount));

  const rawDestName = (input.destinationName || input.destination || 'Scenic Getaway').trim();
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

  // Determine true destination coordinates
  const destCoords: Coordinates = input.destinationCoords || preciseLoc.coordinates || matchedDest.coordinates || { lat: 26.9124, lng: 75.7873 };

  // Determine origin coordinates
  const originCoords: Coordinates = input.originCoords || resolveOriginCoords(input.origin || 'Ahmedabad, Gujarat');

  // Calculate real highway distance & duration
  const straightLineDist = haversineDistKm(originCoords, destCoords);
  const routeDistKm = Math.max(45, Math.round(straightLineDist * 1.25));
  const avgSpeed = input.transportMode === 'flight' ? 450 : input.transportMode === 'bike' ? 55 : 68;
  const routeHours = Math.max(1, Math.round((routeDistKm / avgSpeed) * 10) / 10);

  // Calculate budget allocation percentages
  let transportPct = 0.25;
  let stayPct = 0.32;
  let foodPct = 0.20;
  let actPct = 0.16;

  if (input.transportMode === 'flight') transportPct = 0.38;
  if (input.transportMode === 'bike' || input.transportMode === 'bus') transportPct = 0.18;
  if (input.accommodationType === '5star' || input.accommodationType === '4star') stayPct = 0.40;
  if (input.accommodationType === 'hostel') stayPct = 0.20;

  // Calculate preliminary estimated total
  let estimatedTotal = Math.round(totalBudget * 0.94);
  if (estimatedTotal < 2000 * input.travelersCount) {
    estimatedTotal = 2100 * input.travelersCount;
  }

  const transportCost = Math.round(estimatedTotal * transportPct);
  const stayCost = Math.round(estimatedTotal * stayPct);
  const foodCost = Math.round(estimatedTotal * foodPct);
  const actCost = Math.round(estimatedTotal * actPct);
  const miscCost = estimatedTotal - (transportCost + stayCost + foodCost + actCost);

  // Regional cuisine and activity metadata
  const cuisine = getRegionalCuisine(state, country);
  const activityMeta = getActivityTypeMeta(spotType, category);

  // Compile full highlights list - prioritize curated destination activities
  const rawHighlights = [
    ...(matchedDest.popularActivities || []),
    ...(preciseLoc.highlights || [])
  ].filter(Boolean);
  const highlights = rawHighlights.length > 0 ? rawHighlights : [
    `${spotName} Historic & Scenic Landmark Tour`,
    `${spotName} Cultural Discovery & Views`,
    `${spotName} Local Artisan Heritage Market`,
    `${spotName} Panoramic Trail & Nature Walk`,
    `${spotName} Sunset Overlook`
  ];

  // Determine pacing preference and city cost multiplier
  const pacing: 'relaxed' | 'balanced' | 'fast_paced' = input.pacing ||
    (input.travelerType === 'couple' || input.travelerType === 'family' ? 'relaxed' : 'balanced');
  const cityMultiplier = getCityCostMultiplier(state, spotName);
  const daysCount = Math.max(1, Math.min(input.durationDays, 7));

  // Select verified real hotel matching destination and accommodation tier
  const { recommendedHotel, alternativeHotels } = selectHotelForTrip({
    destination: spotName,
    accommodationType: input.accommodationType || 'budget',
    totalBudget,
    durationDays: daysCount,
    travelersCount: input.travelersCount,
    startDate: input.startDate
  });

  // Generate days
  const days: DayPlan[] = [];

  for (let d = 1; d <= daysCount; d++) {
    const isFirstDay = d === 1;
    const isLastDay = d === daysCount;
    const dayCost = Math.round(estimatedTotal / daysCount);

    if (isFirstDay) {
      // Day 1: Departure, Highway pitstop, Check-in at recommended hotel, Lunch, Prime Landmark & Golden Hour
      const day1SightFee = getActivityTicketFee(highlights[0] || spotName, spotType, category);
      const depTime = pacing === 'relaxed' ? '9:00 AM' : pacing === 'fast_paced' ? '6:00 AM' : '7:30 AM';
      const bsTime = pacing === 'relaxed' ? '11:15 AM' : pacing === 'fast_paced' ? '8:30 AM' : '10:00 AM';
      const checkinTime = pacing === 'relaxed' ? '2:00 PM' : pacing === 'fast_paced' ? '11:45 AM' : '1:00 PM';
      const lunchTime = pacing === 'relaxed' ? '3:15 PM' : pacing === 'fast_paced' ? '1:00 PM' : '2:30 PM';
      const sightTime = pacing === 'relaxed' ? '5:15 PM' : pacing === 'fast_paced' ? '2:45 PM' : '4:30 PM';
      const sunsetTime = pacing === 'relaxed' ? '7:00 PM' : pacing === 'fast_paced' ? '6:15 PM' : '6:30 PM';
      const dinnerTime = pacing === 'relaxed' ? '9:15 PM' : pacing === 'fast_paced' ? '8:30 PM' : '8:45 PM';

      days.push({
        dayNumber: 1,
        title: `Day 1 — Journey to ${spotName} & Prime Highlights (${pacing.replace('_', ' ')} pace)`,
        theme: `Departure, Check-in at ${recommendedHotel.name}, ${highlights[0] || spotName + ' Tour'} & Golden Hour Sunset`,
        dayEstimatedCost: dayCost,
        activities: [
          {
            id: `act-1-dep`,
            dayNumber: 1,
            time: depTime,
            title: `${pacing === 'fast_paced' ? 'Early Sunrise' : pacing === 'relaxed' ? 'Leisurely' : 'Comfortable'} Departure from ${input.origin || 'City Center'}`,
            type: 'departure',
            location: `${input.origin || 'City Center'} Highway Corridor`,
            estimatedCost: 0,
            travelTimeMin: 0,
            distanceKm: 0,
            description: `Departure towards ${spotName}. Planned for a ${pacing.replace('_', ' ')} rhythm.`,
            coordinates: originCoords,
            tag: 'Start Point'
          },
          {
            id: `act-1-bs`,
            dayNumber: 1,
            time: bsTime,
            title: 'Highway Rest & Refreshment Halt',
            type: 'breakstop',
            location: 'En-route Highway Food Plaza',
            estimatedCost: Math.round(140 * cityMultiplier * input.travelersCount),
            travelTimeMin: Math.round(routeHours * 30),
            distanceKm: Math.round(routeDistKm * 0.5),
            description: `Suggested refreshment break for breakfast/tea en-route (~₹${Math.round(140 * cityMultiplier)}/person).`,
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
            estimatedCost: Math.min(stayCost, recommendedHotel.nightlyRate),
            travelTimeMin: Math.round(routeHours * 30),
            distanceKm: Math.round(routeDistKm * 0.5),
            description: `${recommendedHotel.starRating}★ ${recommendedHotel.roomType}. Amenities: ${recommendedHotel.amenities.slice(0, 3).join(', ')}. ${recommendedHotel.cancellationPolicy}.`,
            coordinates: { lat: destCoords.lat + 0.002, lng: destCoords.lng - 0.002 },
            tag: `Verified Stay • ${recommendedHotel.tier.toUpperCase()}`,
            mapUrl: recommendedHotel.bookingUrl
          },
          {
            id: `act-1-lunch`,
            dayNumber: 1,
            time: lunchTime,
            title: `${cuisine.cuisineName} Welcome Lunch`,
            type: 'food',
            location: `${spotName} Regional Dining Kitchen`,
            estimatedCost: Math.round(340 * cityMultiplier * input.travelersCount),
            travelTimeMin: 15,
            distanceKm: 1.5,
            description: `Authentic regional feast: ${cuisine.lunch}. Tailored for ${input.foodPreference} dining (~₹${Math.round(340 * cityMultiplier)}/person).`,
            coordinates: { lat: destCoords.lat - 0.003, lng: destCoords.lng + 0.003 },
            tag: 'Lunch'
          },
          {
            id: `act-1-prime-sight`,
            dayNumber: 1,
            time: sightTime,
            title: highlights[0] || `${spotName} ${activityMeta.afternoonVerb}`,
            type: 'attraction',
            location: `${spotName} Landmark Core`,
            estimatedCost: Math.round(day1SightFee * input.travelersCount),
            travelTimeMin: 20,
            distanceKm: 2.5,
            description: `${activityMeta.afternoonDesc} (Visitor entry ticket: ₹${day1SightFee}/person, ₹${day1SightFee * input.travelersCount} total).`,
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
            estimatedCost: Math.round(30 * input.travelersCount),
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
            estimatedCost: Math.round(440 * cityMultiplier * input.travelersCount),
            travelTimeMin: 10,
            distanceKm: 1.2,
            description: `Evening feast enjoying ${cuisine.dinner} under starry skies (~₹${Math.round(440 * cityMultiplier)}/person).`,
            coordinates: { lat: destCoords.lat + 0.001, lng: destCoords.lng + 0.002 },
            tag: 'Dinner'
          }
        ]
      });
    } else if (isLastDay) {
      // Final Day: Morning breakfast, artisan shopping, farewell lunch, and highway return drive
      const bfastTime = pacing === 'relaxed' ? '9:00 AM' : pacing === 'fast_paced' ? '7:00 AM' : '8:00 AM';
      const sightTime = pacing === 'relaxed' ? '10:45 AM' : pacing === 'fast_paced' ? '8:30 AM' : '9:30 AM';
      const shopTime = pacing === 'relaxed' ? '12:30 PM' : pacing === 'fast_paced' ? '10:45 AM' : '11:30 AM';
      const lunchTime = pacing === 'relaxed' ? '2:15 PM' : pacing === 'fast_paced' ? '12:45 PM' : '1:30 PM';
      const depTime = pacing === 'relaxed' ? '3:45 PM' : pacing === 'fast_paced' ? '2:00 PM' : '3:00 PM';
      const bsTime = pacing === 'relaxed' ? '6:30 PM' : pacing === 'fast_paced' ? '4:45 PM' : '5:30 PM';
      const arrTime = pacing === 'relaxed' ? '9:30 PM' : pacing === 'fast_paced' ? '7:45 PM' : '8:30 PM';

      days.push({
        dayNumber: d,
        title: `Day ${d} — Morning Panorama, Artisan Souvenirs & Safe Return (${pacing.replace('_', ' ')} pace)`,
        theme: 'Morning Specialty Breakfast, Handcrafted Souvenirs, Farewell Lunch & Return Highway Drive',
        dayEstimatedCost: dayCost,
        activities: [
          {
            id: `act-${d}-bfast`,
            dayNumber: d,
            time: bfastTime,
            title: `Traditional ${cuisine.cuisineName} Breakfast`,
            type: 'food',
            location: `${spotName} Local Morning Hub`,
            estimatedCost: Math.round(120 * cityMultiplier * input.travelersCount),
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
            title: highlights[Math.min(highlights.length - 1, 3)] || `${spotName} Scenic Morning Walk & Photoshoot`,
            type: 'attraction',
            location: `${spotName} Scenic Environs`,
            estimatedCost: Math.round(100 * input.travelersCount),
            travelTimeMin: 15,
            distanceKm: 2.0,
            description: `Gentle morning stroll taking in the final scenic panoramas and iconic photo frames.`,
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
            estimatedCost: Math.round(200 * input.travelersCount),
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
            location: `${spotName} Highway Link Garden Dhaba`,
            estimatedCost: Math.round(260 * cityMultiplier * input.travelersCount),
            travelTimeMin: 20,
            distanceKm: 5.0,
            description: `Hearty celebratory meal before joining the return expressway corridor.`,
            coordinates: { lat: destCoords.lat + 0.008, lng: destCoords.lng + 0.005 },
            tag: 'Lunch'
          },
          {
            id: `act-${d}-return`,
            dayNumber: d,
            time: depTime,
            title: `Commence Return Journey to ${input.origin || 'Origin'}`,
            type: 'departure',
            location: `${spotName} Highway Toll Gateway`,
            estimatedCost: Math.round(transportCost * 0.4),
            travelTimeMin: 0,
            distanceKm: 0,
            description: `Smooth highway cruising on national corridor with scenic vistas and road trip playlist.`,
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
            title: 'Evening Highway Chai & Snack Halt',
            type: 'breakstop',
            location: 'Along the route — choose a suitable stop',
            estimatedCost: Math.round(100 * cityMultiplier * input.travelersCount),
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
            description: `Trip to ${spotName} concluded smoothly and strictly within planned budget!`,
            coordinates: originCoords,
            tag: 'Destination'
          }
        ]
      });
    } else {
      // Middle Days: Deep exploration of secondary highlights & culture
      const highlightIdx = (d - 1) % highlights.length;
      const dayHighlight = highlights[highlightIdx] || `${spotName} Hidden Trails & Heritage`;
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
          estimatedCost: Math.round(110 * cityMultiplier * input.travelersCount),
          travelTimeMin: 15,
          distanceKm: 1.0,
          description: `Start the day fresh with regional breakfast specialties: ${cuisine.breakfast}.`,
          coordinates: { lat: destCoords.lat + 0.002, lng: destCoords.lng - 0.002 },
          tag: 'Breakfast'
        },
        {
          id: `act-${d}-morn-sight`,
          dayNumber: d,
          time: mornSightTime,
          title: dayHighlight,
          type: 'attraction',
          location: `${spotName} Historic/Scenic Center`,
          estimatedCost: Math.round(midSightFee * input.travelersCount),
          travelTimeMin: 25,
          distanceKm: 5.0,
          description: `Prime sightseeing and photography with picturesque landscapes and architecture (Ticket: ₹${midSightFee}/person).`,
          coordinates: { lat: destCoords.lat + 0.015, lng: destCoords.lng + 0.012 },
          tag: 'Sightseeing'
        },
        {
          id: `act-${d}-lunch`,
          dayNumber: d,
          time: lunchTime,
          title: 'Lunch at Scenic Countryside Garden',
          type: 'food',
          location: 'Local Garden Restaurant',
          estimatedCost: Math.round(280 * cityMultiplier * input.travelersCount),
          travelTimeMin: 20,
          distanceKm: 4.0,
          description: `Fresh regional cuisine tailored for ${input.foodPreference} preference: ${cuisine.lunch}.`,
          coordinates: { lat: destCoords.lat + 0.006, lng: destCoords.lng - 0.008 },
          tag: 'Lunch'
        },
        {
          id: `act-${d}-afternoon`,
          dayNumber: d,
          time: aftSightTime,
          title: pacing === 'relaxed' ? 'Scenic Cafe & Lakeside Afternoon Lounge' : 'Nature Trail & Hidden Spot Exploration',
          type: 'viewpoint',
          location: 'Scenic Overlook Point',
          estimatedCost: Math.round(150 * cityMultiplier * input.travelersCount),
          travelTimeMin: 20,
          distanceKm: 4.5,
          description: pacing === 'relaxed'
            ? 'Unhurried downtime sipping local beverage, taking photographs, and soaking in peaceful views.'
            : 'Energizing nature walk away from crowds with fresh air and viewpoints.',
          coordinates: { lat: destCoords.lat - 0.012, lng: destCoords.lng - 0.012 },
          tag: pacing === 'relaxed' ? 'Leisure' : 'Nature'
        },
        {
          id: `act-${d}-culture`,
          dayNumber: d,
          time: cultureTime,
          title: 'Cultural Folk Performance / Evening Stroll',
          type: 'attraction',
          location: 'Cultural Amphitheater',
          estimatedCost: Math.round(220 * input.travelersCount),
          travelTimeMin: 20,
          distanceKm: 3.0,
          description: 'Vibrant local live art, traditional instruments, and folk storytelling.',
          coordinates: { lat: destCoords.lat + 0.008, lng: destCoords.lng + 0.008 },
          tag: 'Culture'
        },
        {
          id: `act-${d}-dinner`,
          dayNumber: d,
          time: dinnerTime,
          title: 'Celebratory Dinner with Regional Sweets',
          type: 'food',
          location: 'Heritage Dining Hall',
          estimatedCost: Math.round(350 * cityMultiplier * input.travelersCount),
          travelTimeMin: 10,
          distanceKm: 1.2,
          description: `Hearty evening dinner with traditional delicacies: ${cuisine.dinner}.`,
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
          title: `${spotName} Sunrise Ridge Golden Hour`,
          type: 'viewpoint',
          location: `${spotName} High Ridge Viewpoint`,
          estimatedCost: 0,
          travelTimeMin: 15,
          distanceKm: 3.0,
          description: 'Early morning golden rays and mist-covered landscapes. Perfect for drone/camera photography.',
          coordinates: { lat: destCoords.lat - 0.008, lng: destCoords.lng + 0.008 },
          tag: 'Sunrise'
        });
      }

      days.push({
        dayNumber: d,
        title: `Day ${d} — Deep Dive into ${spotName} & ${dayHighlight} (${pacing.replace('_', ' ')} pace)`,
        theme: `Heritage Exploration, Nature Trails, Scenic Photography & Authentic ${cuisine.cuisineName} Feasts`,
        dayEstimatedCost: dayCost,
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
    travelersCount: input.travelersCount,
    totalBudget: totalBudget,
    priorities: input.priorities,
    startDate: input.startDate
  });

  return {
    id: `trip-${Date.now()}`,
    name: `${input.origin || 'Origin'} → ${spotName} | ${daysCount} Days`,
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
    travelersCount: input.travelersCount,
    travelerType: input.travelerType || 'friends',
    totalBudget: totalBudget,
    budgetPerPerson: budgetPerPerson,
    preferences: input.preferences || ['culture', 'nature', 'budget'],
    transportMode: input.transportMode || 'car',
    accommodationType: input.accommodationType || 'budget',
    foodPreference: input.foodPreference || 'veg',
    priorities: input.priorities || ['budget', 'comfort'],
    status: 'upcoming',
    isUserCreated: true,
    isSample: false,
    createdAt: new Date().toISOString(),
    startDate: input.startDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    aiRationale: `Suggested ${daysCount}-day trip plan to ${spotName} (${state}) for ${input.travelersCount} traveler(s). Selected stay: ${recommendedHotel.name} (${recommendedHotel.starRating}★). Pacing: ${pacing.replace('_', ' ')}. Total budget calibrated to regional prices. Buffer estimate: ₹${Math.max(0, totalBudget - estimatedTotal).toLocaleString('en-IN')}.`,
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
    selectedHotel: recommendedHotel,
    hotelOptions: alternativeHotels,
    pacing: pacing,
    bestTransportDeal: bestDeal,
    transportDeals: allDeals,
    routeDetails: {
      distanceKm: routeDistKm,
      durationHours: routeHours,
      source: 'estimate'
    },
    travelDataStatus: input.transportMode === 'car' || input.transportMode === 'bike' ? 'pending' : 'not_applicable'
  };
}
