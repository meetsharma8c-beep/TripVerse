import { Trip, BreakStop, DayPlan, RouteType, TravelPreference, Coordinates, Destination } from '../types/trip';
import { POPULAR_DESTINATIONS } from '../data/destinations';
import { HIGHWAY_BREAK_STOPS } from '../data/highwayFacilities';
import { synthesizeDestination, resolveDestinationImage } from '../utils/destinationImages';
import { generateTransportDeals } from './dealService';
import { resolvePreciseLocationSync, PreciseLocation } from './locationService';

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
  transportMode: any;
  accommodationType: any;
  foodPreference: any;
  priorities: any[];
  destinationCoords?: Coordinates;
  preciseLocation?: PreciseLocation;
  originCoords?: Coordinates;
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

  // Compile full highlights list
  const rawHighlights = [
    ...(preciseLoc.highlights || []),
    ...(matchedDest.popularActivities || [])
  ].filter(Boolean);
  const highlights = rawHighlights.length > 0 ? rawHighlights : [
    `${spotName} Historic & Scenic Landmark Tour`,
    `${spotName} Cultural Discovery & Views`,
    `${spotName} Local Artisan Heritage Market`,
    `${spotName} Panoramic Trail & Nature Walk`,
    `${spotName} Sunset Overlook`
  ];

  // Generate days
  const days: DayPlan[] = [];
  const daysCount = Math.max(1, Math.min(input.durationDays, 7));

  for (let d = 1; d <= daysCount; d++) {
    const isFirstDay = d === 1;
    const isLastDay = d === daysCount;
    const dayCost = Math.round(estimatedTotal / daysCount);

    if (isFirstDay) {
      // Day 1: Departure, Highway pitstop, Check-in, Lunch, Primary Landmark & Golden Hour
      days.push({
        dayNumber: 1,
        title: `Day 1 — Journey to ${spotName} & Prime Highlights`,
        theme: `Departure, Midway Corridor Pitstop, Check-in, ${highlights[0] || spotName + ' Tour'} & Golden Hour Sunset`,
        dayEstimatedCost: dayCost,
        activities: [
          {
            id: `act-1-dep`,
            dayNumber: 1,
            time: '7:30 AM',
            title: `Early Departure from ${input.origin || 'City Center'}`,
            type: 'departure',
            location: `${input.origin || 'City Center'} Highway Corridor`,
            estimatedCost: 0,
            travelTimeMin: 0,
            distanceKm: 0,
            description: `Morning departure towards ${spotName}. Navigation, FASTag and route waypoints cached.`,
            coordinates: originCoords,
            tag: 'Start Point'
          },
          {
            id: `act-1-bs`,
            dayNumber: 1,
            time: '10:00 AM',
            title: 'Highway Oasis Pitstop & Refreshment',
            type: 'breakstop',
            location: `${spotName} Highway Expressway Rest Area (4.8 / 5)`,
            estimatedCost: Math.round(250 * input.travelersCount),
            travelTimeMin: Math.round(routeHours * 30),
            distanceKm: Math.round(routeDistKm * 0.5),
            description: `Fresh breakfast (${cuisine.breakfast.split('&')[0].trim()}), sanitized washroom halt, and fuel check.`,
            coordinates: {
              lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.5,
              lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.5
            },
            tag: 'Break Stop'
          },
          {
            id: `act-1-hotel`,
            dayNumber: 1,
            time: '1:00 PM',
            title: `Arrival in ${spotName} & Check-in`,
            type: 'hotel',
            location: `${spotName} Pre-booked Stay (${input.accommodationType} tier)`,
            estimatedCost: Math.round(stayCost / daysCount),
            travelTimeMin: Math.round(routeHours * 30),
            distanceKm: Math.round(routeDistKm * 0.5),
            description: `Check into verified stay in ${spotName}. Freshen up and unpack with pleasant surroundings.`,
            coordinates: { lat: destCoords.lat + 0.002, lng: destCoords.lng - 0.002 },
            tag: 'Stay'
          },
          {
            id: `act-1-lunch`,
            dayNumber: 1,
            time: '2:30 PM',
            title: `${cuisine.cuisineName} Welcome Lunch`,
            type: 'food',
            location: `${spotName} Regional Dining Kitchen`,
            estimatedCost: Math.round(240 * input.travelersCount),
            travelTimeMin: 15,
            distanceKm: 1.5,
            description: `Enjoy authentic regional specialties: ${cuisine.lunch}. Tailored for ${input.foodPreference} dining.`,
            coordinates: { lat: destCoords.lat - 0.003, lng: destCoords.lng + 0.003 },
            tag: 'Lunch'
          },
          {
            id: `act-1-prime-sight`,
            dayNumber: 1,
            time: '4:30 PM',
            title: highlights[0] || `${spotName} ${activityMeta.afternoonVerb}`,
            type: 'attraction',
            location: `${spotName} Landmark Center`,
            estimatedCost: Math.round(180 * input.travelersCount),
            travelTimeMin: 20,
            distanceKm: 2.5,
            description: activityMeta.afternoonDesc,
            coordinates: { lat: destCoords.lat + 0.005, lng: destCoords.lng + 0.004 },
            tag: 'Attraction'
          },
          {
            id: `act-1-sunset`,
            dayNumber: 1,
            time: '6:30 PM',
            title: `${spotName} ${activityMeta.eveningVerb}`,
            type: 'viewpoint',
            location: `${spotName} Panoramic Viewpoint`,
            estimatedCost: Math.round(50 * input.travelersCount),
            travelTimeMin: 15,
            distanceKm: 2.0,
            description: activityMeta.eveningDesc,
            coordinates: { lat: destCoords.lat - 0.005, lng: destCoords.lng + 0.005 },
            tag: 'Sunset'
          },
          {
            id: `act-1-dinner`,
            dayNumber: 1,
            time: '8:45 PM',
            title: `Dinner & ${cuisine.cuisineName} Delicacies`,
            type: 'food',
            location: `${spotName} Terrace / Courtyard Dining`,
            estimatedCost: Math.round(300 * input.travelersCount),
            travelTimeMin: 10,
            distanceKm: 1.2,
            description: `Evening feast enjoying ${cuisine.dinner} under starry skies.`,
            coordinates: { lat: destCoords.lat + 0.001, lng: destCoords.lng + 0.002 },
            tag: 'Dinner'
          }
        ]
      });
    } else if (isLastDay) {
      // Final Day: Morning breakfast, artisan shopping, farewell lunch, and highway return drive
      days.push({
        dayNumber: d,
        title: `Day ${d} — Morning Panorama, Artisan Souvenirs & Safe Return to ${input.origin || 'Origin'}`,
        theme: 'Morning Specialty Breakfast, Handcrafted Souvenirs, Farewell Lunch & Return Highway Drive',
        dayEstimatedCost: dayCost,
        activities: [
          {
            id: `act-${d}-bfast`,
            dayNumber: d,
            time: '8:00 AM',
            title: `Traditional ${cuisine.cuisineName} Breakfast`,
            type: 'food',
            location: `${spotName} Local Morning Hub`,
            estimatedCost: Math.round(120 * input.travelersCount),
            travelTimeMin: 10,
            distanceKm: 0.8,
            description: `Fresh morning breakfast enjoying ${cuisine.breakfast}.`,
            coordinates: { lat: destCoords.lat - 0.001, lng: destCoords.lng + 0.001 },
            tag: 'Breakfast'
          },
          {
            id: `act-${d}-sight`,
            dayNumber: d,
            time: '9:30 AM',
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
            time: '11:30 AM',
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
            time: '1:30 PM',
            title: `Farewell ${cuisine.cuisineName} Garden Lunch`,
            type: 'food',
            location: `${spotName} Highway Link Garden Dhaba`,
            estimatedCost: Math.round(240 * input.travelersCount),
            travelTimeMin: 20,
            distanceKm: 5.0,
            description: `Hearty celebratory meal before joining the return expressway corridor.`,
            coordinates: { lat: destCoords.lat + 0.008, lng: destCoords.lng + 0.005 },
            tag: 'Lunch'
          },
          {
            id: `act-${d}-return`,
            dayNumber: d,
            time: '3:00 PM',
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
            time: '5:30 PM',
            title: 'Evening Highway Chai & Snack Halt',
            type: 'breakstop',
            location: 'Expressway Highway Rest Area (Clean Washrooms & Fuel)',
            estimatedCost: Math.round(100 * input.travelersCount),
            travelTimeMin: 120,
            distanceKm: Math.round(routeDistKm * 0.5),
            description: 'Hot tea break, fuel check, and quick leg stretch.',
            coordinates: {
              lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.35,
              lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.35
            },
            tag: 'Break Stop'
          },
          {
            id: `act-${d}-home`,
            dayNumber: d,
            time: '8:30 PM',
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
      days.push({
        dayNumber: d,
        title: `Day ${d} — Deep Dive into ${spotName} & ${dayHighlight}`,
        theme: `Heritage Exploration, Nature Trails, Scenic Photography & Authentic ${cuisine.cuisineName} Feasts`,
        dayEstimatedCost: dayCost,
        activities: [
          {
            id: `act-${d}-bfast`,
            dayNumber: d,
            time: '8:30 AM',
            title: `Energizing ${cuisine.cuisineName} Breakfast`,
            type: 'food',
            location: `${spotName} Morning Eatery`,
            estimatedCost: Math.round(110 * input.travelersCount),
            travelTimeMin: 15,
            distanceKm: 1.0,
            description: `Start the day fresh with regional breakfast specialties: ${cuisine.breakfast}.`,
            coordinates: { lat: destCoords.lat + 0.002, lng: destCoords.lng - 0.002 },
            tag: 'Breakfast'
          },
          {
            id: `act-${d}-morn-sight`,
            dayNumber: d,
            time: '10:00 AM',
            title: dayHighlight,
            type: 'attraction',
            location: `${spotName} Historic/Scenic Center`,
            estimatedCost: Math.round(180 * input.travelersCount),
            travelTimeMin: 25,
            distanceKm: 5.0,
            description: 'Prime sightseeing and photography with picturesque landscapes and architecture.',
            coordinates: { lat: destCoords.lat + 0.015, lng: destCoords.lng + 0.012 },
            tag: 'Sightseeing'
          },
          {
            id: `act-${d}-lunch`,
            dayNumber: d,
            time: '1:30 PM',
            title: 'Lunch at Scenic Countryside Garden',
            type: 'food',
            location: 'Local Garden Restaurant',
            estimatedCost: Math.round(280 * input.travelersCount),
            travelTimeMin: 20,
            distanceKm: 4.0,
            description: `Fresh regional cuisine tailored for ${input.foodPreference} preference: ${cuisine.lunch}.`,
            coordinates: { lat: destCoords.lat + 0.006, lng: destCoords.lng - 0.008 },
            tag: 'Lunch'
          },
          {
            id: `act-${d}-afternoon`,
            dayNumber: d,
            time: '3:30 PM',
            title: 'Nature Trail & Hidden Spot Exploration',
            type: 'viewpoint',
            location: 'Scenic Overlook Point',
            estimatedCost: Math.round(150 * input.travelersCount),
            travelTimeMin: 20,
            distanceKm: 4.5,
            description: 'Peaceful walk away from heavy crowds with fresh air and great vistas.',
            coordinates: { lat: destCoords.lat - 0.012, lng: destCoords.lng - 0.012 },
            tag: 'Nature'
          },
          {
            id: `act-${d}-culture`,
            dayNumber: d,
            time: '7:00 PM',
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
            time: '9:00 PM',
            title: 'Celebratory Dinner with Regional Sweets',
            type: 'food',
            location: 'Heritage Dining Hall',
            estimatedCost: Math.round(350 * input.travelersCount),
            travelTimeMin: 10,
            distanceKm: 1.2,
            description: `Hearty evening dinner with traditional delicacies: ${cuisine.dinner}.`,
            coordinates: { lat: destCoords.lat, lng: destCoords.lng },
            tag: 'Dinner'
          }
        ]
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
    priorities: input.priorities
  });

  const isGujaratState = (state === 'Gujarat');
  const isRajasthanState = (state === 'Rajasthan');
  const isHimalayanState = (state === 'Himachal Pradesh' || state === 'Uttarakhand');

  const stop1Name = isHimalayanState
    ? 'Valley View Highway Oasis & Mountain Tea Stop'
    : isRajasthanState
    ? 'Royal Highway Midpoint Plaza & Desert Oasis'
    : isGujaratState
    ? 'Expressway Food Oasis (Clean Washrooms & Food Court)'
    : `${spotName} Corridor Midpoint Rest Area`;

  const stop2Name = isHimalayanState
    ? 'Pine Ridge Food Plaza & Emergency Medical Post'
    : isRajasthanState
    ? 'Heritage Highway Food Court & EV Fast Charger'
    : `${spotName} Highway Corridor Food Plaza & Fuel`;

  // Dynamically place 2 highway break stops along the actual line between origin & destination
  const breakStops: BreakStop[] = [
    {
      ...HIGHWAY_BREAK_STOPS[0],
      id: `bs-dyn-1-${Date.now()}`,
      name: stop1Name,
      distanceFromStartKm: Math.round(routeDistKm * 0.38),
      coordinates: {
        lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.38,
        lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.38
      }
    },
    {
      ...HIGHWAY_BREAK_STOPS[1],
      id: `bs-dyn-2-${Date.now()}`,
      name: stop2Name,
      distanceFromStartKm: Math.round(routeDistKm * 0.72),
      coordinates: {
        lat: originCoords.lat + (destCoords.lat - originCoords.lat) * 0.72,
        lng: originCoords.lng + (destCoords.lng - originCoords.lng) * 0.72
      }
    }
  ];

  return {
    id: `trip-${Date.now()}`,
    name: `${input.origin || 'Origin'} → ${spotName} | ${daysCount} Days`,
    origin: input.origin || 'Ahmedabad, Gujarat',
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
    aiRationale: `TripVerse AI has optimized this journey specifically to ${spotName} (${state}) around your ₹${totalBudget.toLocaleString('en-IN')} budget for ${input.travelersCount} traveler(s). Precise coordinates locked at ${destCoords.lat.toFixed(4)}°N, ${destCoords.lng.toFixed(4)}°E with verified highway route (~${routeDistKm} km), ${input.accommodationType} stays, and 2 midway break stops. Buffer: ₹${Math.max(0, totalBudget - estimatedTotal).toLocaleString('en-IN')}.`,
    breakStops,
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
    bestTransportDeal: bestDeal,
    transportDeals: allDeals,
    routeDetails: {
      distanceKm: routeDistKm,
      durationHours: routeHours
    }
  };
}
