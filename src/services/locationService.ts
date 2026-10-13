import { Coordinates, Destination } from '../types/trip';

export interface PreciseLocation {
  id: string;
  name: string;
  fullName: string;
  state: string;
  country: string;
  coordinates: Coordinates;
  category: Destination['category'];
  spotType: 'temple' | 'monument' | 'village' | 'nature' | 'waterfall' | 'beach' | 'hill_station' | 'city' | 'viewpoint' | 'roadtrip' | 'mountain';
  highlights: string[];
  tagline: string;
  image?: string;
  popularDish?: string;
}

/**
 * Curated offline high-precision database for fast instant matching.
 * Includes micro-destinations, pilgrimage spots, villages, and major hubs.
 */
export const PRECISE_SPOTS_INDEX: PreciseLocation[] = [
  {
    id: 'poicha-gujarat',
    name: 'Poicha',
    fullName: 'Poicha, Narmada District, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 21.9348, lng: 73.5521 },
    category: 'spiritual',
    spotType: 'temple',
    highlights: [
      'Nilkanthdham Swaminarayan Temple Complex',
      'Narmada River Ghat & Boat Rides',
      'Sahajanand Universe & Musical Fountain',
      'Close to Statue of Unity (40 km)',
      'Kuber Bhandari Temple (Karnali by boat)'
    ],
    tagline: 'Nilkanthdham Swaminarayan Temple • Sacred Narmada River Ghats • Musical Fountain',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Authentic Kathiyawadi & Gujarati Thali, Fafda-Jalebi & Riverbank Prasad'
  },
  {
    id: 'statue-of-unity',
    name: 'Statue of Unity (Kevadia)',
    fullName: 'Statue of Unity, Kevadia, Narmada District, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 21.8380, lng: 73.7191 },
    category: 'heritage',
    spotType: 'monument',
    highlights: [
      'World’s Tallest 182m Statue',
      'Valley of Flowers & Butterfly Garden',
      'Sardar Sarovar Dam Viewpoint',
      'Glow Garden & Laser Light Projection',
      'Jungle Safari & Ekta Cruise'
    ],
    tagline: 'World’s Tallest Monument • Sardar Sarovar Dam • Valley of Flowers',
    image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Gujarati Farsan, Surti Sev Khamani & Tribal Cuisine'
  },
  {
    id: 'modhera-gujarat',
    name: 'Modhera',
    fullName: 'Modhera Sun Temple, Mehsana, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 23.5835, lng: 72.1331 },
    category: 'heritage',
    spotType: 'monument',
    highlights: [
      '11th Century Solanki Sun Temple',
      'Surya Kund Geometric Stepwell',
      'Evening 3D Light & Sound Projection Show',
      'India’s 1st 24x7 Solar Powered Heritage Village'
    ],
    tagline: 'Historic Sun Temple • Surya Kund Stepwell • Solar Heritage Village',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Mehsani Dal Dhokli & Kutchi Rotla'
  },
  {
    id: 'dholavira-kutch',
    name: 'Dholavira',
    fullName: 'Dholavira, UNESCO World Heritage, Khadir Bet, Kutch, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 23.8860, lng: 70.2130 },
    category: 'heritage',
    spotType: 'monument',
    highlights: [
      '5000-Year-Old Harappan Indus Valley Metropolis',
      'Ancient Water Reservoirs & Citadel Stone Architecture',
      'Khadir Bet White Rann Island Drive',
      'Fossil Park & Flamingos'
    ],
    tagline: 'Indus Valley Civilisation • UNESCO World Heritage • Rann Road Trip',
    image: 'https://images.unsplash.com/photo-1509299349698-dd22323b5963?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Kutchi Bajra Rotla, Ringna No Olo & Fresh Chaas'
  },
  {
    id: 'mandvi-kutch',
    name: 'Mandvi',
    fullName: 'Mandvi Beach, Kutch, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 22.8336, lng: 69.3562 },
    category: 'beach',
    spotType: 'beach',
    highlights: [
      'Vijay Vilas Royal Palace & Beach',
      '400-Year-Old Wooden Shipbuilding Yard',
      'Wind Farms Beach & Camel Safaris',
      'Kutchi Dabeli Origins'
    ],
    tagline: 'Palatial Coastal Sands • Historic Shipbuilding • Golden Sunset Dunes',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Authentic Original Mandvi Dabeli & Mawa Peda'
  },
  {
    id: 'saputara-dang',
    name: 'Saputara',
    fullName: 'Saputara Hill Station, Dang, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 20.5804, lng: 73.7490 },
    category: 'mountain',
    spotType: 'hill_station',
    highlights: [
      'Gujarat’s Only Hill Station in the Sahyadris',
      'Saputara Lake Boating & Cable Car Ropeway',
      'Sunset Point & Table Ground Plateau',
      'Gira Waterfalls nearby'
    ],
    tagline: 'Lush Sahyadri Hills • Misty Lake Boating • Tribal Bamboo Crafts',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Nagali Rotla, Bamboo Shoots Curry & Sweet Corn'
  },
  {
    id: 'polo-forest-sabarkantha',
    name: 'Polo Forest',
    fullName: 'Polo Forest & Ancient Jain Temples, Sabarkantha, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 24.0044, lng: 73.2386 },
    category: 'nature',
    spotType: 'nature',
    highlights: [
      '15th Century Ruined Temples hidden in Dense Jungle',
      'Harnav River Crossings & Dam Checkposts',
      'Trekking Trails & Eco-Campsites',
      'Rich Birdwatching & Flora'
    ],
    tagline: 'Hidden Ancient Ruins • Lush Harnav River • Pristine Forest Treks',
    image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Campfire Kathiyawadi Sev Tameta & Desi Chai'
  },
  {
    id: 'champaner-pavagadh',
    name: 'Champaner-Pavagadh',
    fullName: 'Champaner-Pavagadh UNESCO Archaeological Park, Panchmahal, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 22.4842, lng: 73.5350 },
    category: 'heritage',
    spotType: 'monument',
    highlights: [
      'UNESCO World Heritage Archaeological Site',
      'Jama Masjid & Citadel Gateways',
      'Maa Kalika Temple atop Pavagadh Hill & Ropeway',
      'Ancient Rainwater Harvesting Structures'
    ],
    tagline: 'UNESCO Citadel • Pavagadh Hill Pilgrimage • Islamic & Hindu Architecture',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Hot Fafda, Kadhi-Chutney & Sugarcane Juice'
  },
  {
    id: 'somnath-veraval',
    name: 'Somnath',
    fullName: 'Somnath Jyotirlinga Temple, Veraval, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 20.8880, lng: 70.4012 },
    category: 'spiritual',
    spotType: 'temple',
    highlights: [
      'First of the 12 Holy Jyotirlinga Shrines',
      'Oceanfront Temple with Crashing Arabian Waves',
      'Sound & Light Show (Jay Somnath)',
      'Triveni Sangam Holy River Confluence'
    ],
    tagline: 'First Jyotirlinga • Sea-facing Sacred Citadel • Divine Ocean Aarti',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Somnath Prasad Thali & Fresh Coconut Water'
  },
  {
    id: 'dwarka-devbhoomi',
    name: 'Dwarka',
    fullName: 'Dwarkadhish Temple, Devbhoomi Dwarka, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 22.2442, lng: 68.9685 },
    category: 'spiritual',
    spotType: 'temple',
    highlights: [
      'Ancient King Krishna Kingdom & Char Dham Shrine',
      'Jagat Mandir 72-Pillar Architectural Wonder',
      'Bet Dwarka Island Boat Ferry & Sudarshan Bridge',
      'Shivrajpur Blue Flag Beach'
    ],
    tagline: 'Char Dham Pilgrimage • Golden Dwaraka Coast • Sacred Dhwajarohan',
    image: 'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Dwarka Peda & Pure Desi Ghee Gujarati Bhojan'
  },
  {
    id: 'gir-national-park',
    name: 'Gir National Park',
    fullName: 'Gir National Park & Wildlife Sanctuary, Sasan Gir, Gujarat, India',
    state: 'Gujarat',
    country: 'India',
    coordinates: { lat: 21.1243, lng: 70.8242 },
    category: 'nature',
    spotType: 'nature',
    highlights: [
      'Only Natural Habitat of Asiatic Lions in the World',
      'Open-top Jeep Jungle Safari',
      'Devalia Safari Park (Gir Interpretation Zone)',
      'Maldhari Tribal Settlements'
    ],
    tagline: 'Asiatic Lion Safari • Teak Forest Trails • Wildlife Encounters',
    image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Maldhari Butter Milk, Ringna Olo & Bajra Roti'
  },
  {
    id: 'chopta-tungnath',
    name: 'Chopta',
    fullName: 'Chopta & Tungnath Temple, Rudraprayag, Uttarakhand, India',
    state: 'Uttarakhand',
    country: 'India',
    coordinates: { lat: 30.4853, lng: 79.1788 },
    category: 'mountain',
    spotType: 'mountain',
    highlights: [
      'Mini Switzerland of Uttarakhand & High Meadows',
      'World’s Highest Shiva Temple (Tungnath at 3,680m)',
      'Chandrashila Peak 360° Himalayan Panorama',
      'Deoria Tal Alpine Lake Reflection'
    ],
    tagline: 'Highest Shiva Temple • Alpine Bugyal Meadows • Chandrashila Summit',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Pahadi Garhwali Thali, Jhangore Ki Kheer & Chai'
  },
  {
    id: 'kasol-parvati-valley',
    name: 'Kasol',
    fullName: 'Kasol, Parvati Valley, Kullu, Himachal Pradesh, India',
    state: 'Himachal Pradesh',
    country: 'India',
    coordinates: { lat: 32.0100, lng: 77.3150 },
    category: 'adventure',
    spotType: 'village',
    highlights: [
      'Parvati River Pine Forest Trails',
      'Trek to Tosh, Kheerganga & Malana Villages',
      'Manikaran Sahib Natural Hot Sulphur Springs',
      'Bohemian Riverside Cafes'
    ],
    tagline: 'Parvati River Magic • Pine Valley Treks • Hot Springs of Manikaran',
    image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Siddu with Ghee, Israeli Shakshuka & Fresh Apple Pie'
  },
  {
    id: 'spiti-valley-kaza',
    name: 'Spiti Valley',
    fullName: 'Spiti Valley, Lahaul & Spiti, Himachal Pradesh, India',
    state: 'Himachal Pradesh',
    country: 'India',
    coordinates: { lat: 32.2461, lng: 78.0349 },
    category: 'adventure',
    spotType: 'mountain',
    highlights: [
      'Key Monastery Fortified Tibetan Shrine',
      'Highest Post Office in the World (Hikkim at 4,400m)',
      'Fossil Village of Langza & Buddha Statue',
      'Chandratal Crescent Moon Lake'
    ],
    tagline: 'The Middle Land • High Altitude Desert • Sacred Tibetan Monasteries',
    image: 'https://images.unsplash.com/photo-1580974852861-c381510bc98a?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Hot Butter Tea, Thukpa & Steamed Tingmo'
  },
  {
    id: 'dhanushkodi-rameswaram',
    name: 'Dhanushkodi',
    fullName: 'Dhanushkodi Ghost Town, Rameswaram, Tamil Nadu, India',
    state: 'Tamil Nadu',
    country: 'India',
    coordinates: { lat: 9.1764, lng: 79.4181 },
    category: 'beach',
    spotType: 'beach',
    highlights: [
      'Land’s End of India between Bay of Bengal & Indian Ocean',
      'Ram Setu (Adam’s Bridge) Starting Shoals',
      'Submerged 1964 Church & Railway Station Ruins',
      'Spectacular Coastal Straight Highway Drive'
    ],
    tagline: 'Land’s End of India • Meeting of Two Oceans • Submerged Ghost Town',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Fresh Rameswaram Fish Fry & Filter Kaapi'
  },
  {
    id: 'gokarna-karnataka',
    name: 'Gokarna',
    fullName: 'Gokarna, Uttara Kannada, Karnataka, India',
    state: 'Karnataka',
    country: 'India',
    coordinates: { lat: 14.5479, lng: 74.3188 },
    category: 'beach',
    spotType: 'beach',
    highlights: [
      'Om Beach, Kudle Beach & Half Moon Beach Cliff Treks',
      'Mahabaleshwar Shiva Temple & Atmalinga',
      'Secluded Sunset Points & Bioluminescent Waters',
      'Yana Rocks limestone monoliths nearby'
    ],
    tagline: 'Sacred Atmalinga • Crescent Cliff Beaches • Serene Coastal Trails',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Mangalore Style Fish Curry Meals & Neer Dosa'
  },
  {
    id: 'varkala-kerala',
    name: 'Varkala',
    fullName: 'Varkala Cliff Beach, Thiruvananthapuram, Kerala, India',
    state: 'Kerala',
    country: 'India',
    coordinates: { lat: 8.7379, lng: 76.7163 },
    category: 'beach',
    spotType: 'beach',
    highlights: [
      'Red Laterite Sea Cliffs overlooking Arabian Sea',
      'Papanasam Beach Holy Waters & Natural Spring',
      'Cliffside Candlelight Dining & Yoga Studios',
      'Janardhana Swami 2000-Year-Old Temple'
    ],
    tagline: 'Red Laterite Sea Cliffs • Sunset Yoga • Holy Papanasam Waters',
    image: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'Kerala Fish Moilee, Appam & Banana Fritters'
  },
  {
    id: 'hampi-karnataka',
    name: 'Hampi',
    fullName: 'Hampi UNESCO World Heritage Site, Vijayanagara, Karnataka, India',
    state: 'Karnataka',
    country: 'India',
    coordinates: { lat: 15.3350, lng: 76.4600 },
    category: 'heritage',
    spotType: 'monument',
    highlights: [
      'Vijayanagara Empire Boulder Ruins & Stone Chariot',
      'Virupaksha Active Ancient Temple',
      'Tungabhadra River Coracle Boat Rides',
      'Matanga Hill Sunrise Panorama'
    ],
    tagline: 'Vijayanagara Stone Chariot • Boulder Landscapes • Ancient River Coracles',
    image: 'https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1200&q=80',
    popularDish: 'South Indian Banana Leaf Meals & Crispy Masala Dosa'
  }
];

// In-memory cache for geocoded queries
const geocodeCache = new Map<string, PreciseLocation[]>();

/**
 * Clean & normalize a place query
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\b(in|near|at|around|close to|the)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fast search combining curated offline spots and live OpenStreetMap Nominatim
 */
export async function searchLocations(
  query: string,
  signal?: AbortSignal
): Promise<PreciseLocation[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  const cleanNorm = normalizeQuery(trimmed);

  // 1. Check curated offline index first (zero latency)
  const localMatches: PreciseLocation[] = [];
  for (const spot of PRECISE_SPOTS_INDEX) {
    const spotNorm = normalizeQuery(`${spot.name} ${spot.state} ${spot.fullName}`);
    if (
      spotNorm.includes(cleanNorm) ||
      cleanNorm.includes(normalizeQuery(spot.name)) ||
      spot.name.toLowerCase().startsWith(trimmed.toLowerCase()) ||
      spot.highlights.some(h => normalizeQuery(h).includes(cleanNorm))
    ) {
      localMatches.push(spot);
    }
  }

  // 2. Query OpenStreetMap Nominatim for live geocoding (covers any spot anywhere in the world)
  let liveResults: PreciseLocation[] = [];
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&addressdetails=1&limit=6`;

    const res = await fetch(nominatimUrl, {
      signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TripVerse-AI-Travel-Platform/1.0'
      }
    });

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        liveResults = items.map((item: any, idx: number) => {
          const address = item.address || {};
          const cityOrTown = address.city || address.town || address.village || address.suburb || address.hamlet || address.county || item.name;
          const state = address.state || address.province || address.region || '';
          const country = address.country || 'India';
          const displayName = item.display_name || '';

          // Determine spot type & category
          const type = item.type || item.class || 'place';
          let spotType: PreciseLocation['spotType'] = 'city';
          let category: Destination['category'] = 'roadtrip';

          const textBlob = `${displayName} ${type}`.toLowerCase();
          if (textBlob.includes('temple') || textBlob.includes('mandir') || textBlob.includes('church') || textBlob.includes('mosque') || textBlob.includes('spiritual')) {
            spotType = 'temple';
            category = 'spiritual';
          } else if (textBlob.includes('beach') || textBlob.includes('coast') || textBlob.includes('island')) {
            spotType = 'beach';
            category = 'beach';
          } else if (textBlob.includes('mountain') || textBlob.includes('hill') || textBlob.includes('peak') || textBlob.includes('valley')) {
            spotType = 'hill_station';
            category = 'mountain';
          } else if (textBlob.includes('fort') || textBlob.includes('palace') || textBlob.includes('heritage') || textBlob.includes('monument')) {
            spotType = 'monument';
            category = 'heritage';
          } else if (textBlob.includes('waterfall') || textBlob.includes('lake') || textBlob.includes('river') || textBlob.includes('forest')) {
            spotType = 'nature';
            category = 'nature';
          } else if (textBlob.includes('village') || textBlob.includes('hamlet')) {
            spotType = 'village';
            category = 'weekend';
          }

          // Format a distinctive title so multiple admin results don't all look identical
          let title = cityOrTown || item.name || trimmed;
          const isDistrict = type === 'administrative' || displayName.toLowerCase().includes('district');
          if (isDistrict && !title.toLowerCase().includes('district')) {
            title = `${title} (District)`;
          }

          return {
            id: `osm-${item.osm_id || idx}-${Date.now()}`,
            name: title,
            fullName: displayName.split(',').slice(0, 3).join(', ').trim() || displayName,
            state: state || (country === 'India' ? 'India' : country),
            country,
            coordinates: {
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon)
            },
            category,
            spotType,
            highlights: [
              `Authentic local sights in ${cityOrTown || title}`,
              `Regional culinary stops & culture`,
              `Scenic approaches & viewpoints`
            ],
            tagline: `${title} • ${state ? `${state}, ` : ''}${country}`,
            image: undefined
          };
        });
      }
    }
  } catch (err: any) {
    // Network or abort error; fallback gracefully to local matches
  }

  // Deduplicate and combine (give priority to local verified spots)
  const combined: PreciseLocation[] = [...localMatches];
  const seenKeys = new Set(localMatches.map(m => `${m.name.toLowerCase()}|${m.state.toLowerCase()}`));
  const seenCoords = new Set(localMatches.map(m => `${m.coordinates.lat.toFixed(1)},${m.coordinates.lng.toFixed(1)}`));

  for (const item of liveResults) {
    const nameKey = `${item.name.toLowerCase()}|${item.state.toLowerCase()}`;
    const coordKey = `${item.coordinates.lat.toFixed(1)},${item.coordinates.lng.toFixed(1)}`;
    if (!seenKeys.has(nameKey) && !seenCoords.has(coordKey)) {
      seenKeys.add(nameKey);
      seenCoords.add(coordKey);
      combined.push(item);
    }
  }

  // Limit to top 6 distinct results
  const result = combined.slice(0, 6);
  geocodeCache.set(cacheKey, result);
  return result;
}

/**
 * Synchronous / Immediate fallback resolver for any location input
 * Guarantees a rich PreciseLocation with valid coordinates even offline.
 */
export function resolvePreciseLocationSync(input: string): PreciseLocation {
  const clean = input.trim();
  const norm = normalizeQuery(clean);

  // 1. Direct check against curated spots
  for (const spot of PRECISE_SPOTS_INDEX) {
    if (
      spot.id === norm ||
      normalizeQuery(spot.name) === norm ||
      norm.includes(normalizeQuery(spot.name)) ||
      normalizeQuery(spot.name).includes(norm) ||
      norm.includes(spot.id)
    ) {
      return spot;
    }
  }

  // Special match: "Poicha in Gujarat" or "Poicha"
  if (norm.includes('poicha') || norm.includes('nilkanth')) {
    return PRECISE_SPOTS_INDEX.find(s => s.id === 'poicha-gujarat')!;
  }

  // Special match: "Statue of Unity" / "Kevadia"
  if (norm.includes('unity') || norm.includes('kevadia') || norm.includes('sardar sarovar')) {
    return PRECISE_SPOTS_INDEX.find(s => s.id === 'statue-of-unity')!;
  }

  // Categorize based on keywords
  let category: Destination['category'] = 'roadtrip';
  let spotType: PreciseLocation['spotType'] = 'city';
  let state = 'India';
  let country = 'India';
  let coordinates: Coordinates = { lat: 26.9124, lng: 75.7873 }; // Universal safe geographic default

  if (norm.includes('gujarat') || norm.includes('ahmedabad') || norm.includes('surat') || norm.includes('vadodara') || norm.includes('rajkot') || norm.includes('kutch') || norm.includes('somnath') || norm.includes('dwarka') || norm.includes('polo')) {
    state = 'Gujarat';
    coordinates = norm.includes('polo') ? { lat: 24.0044, lng: 73.2386 } : { lat: 23.0225, lng: 72.5714 };
  } else if (norm.includes('rajasthan') || norm.includes('jaipur') || norm.includes('mansarovar') || norm.includes('jodhpur') || norm.includes('udaipur') || norm.includes('jaisalmer') || norm.includes('pushkar') || norm.includes('bikaner') || norm.includes('abu')) {
    state = 'Rajasthan';
    coordinates = norm.includes('mansarovar') ? { lat: 26.8530, lng: 75.7645 } : { lat: 26.9124, lng: 75.7873 };
  } else if (norm.includes('uttarakhand') || norm.includes('rishikesh') || norm.includes('haridwar') || norm.includes('dehradun') || norm.includes('nainital') || norm.includes('mussoorie') || norm.includes('chopta') || norm.includes('tungnath') || norm.includes('kedarnath') || norm.includes('badrinath') || norm.includes('auli')) {
    state = 'Uttarakhand';
    category = 'mountain';
    spotType = 'hill_station';
    coordinates = norm.includes('chopta') ? { lat: 30.4853, lng: 79.1788 } : { lat: 30.0668, lng: 79.0193 };
  } else if (norm.includes('himachal') || norm.includes('manali') || norm.includes('shimla') || norm.includes('kasol') || norm.includes('spiti') || norm.includes('kullu') || norm.includes('dharamshala') || norm.includes('dalhousie') || norm.includes('jibhi')) {
    state = 'Himachal Pradesh';
    category = 'mountain';
    spotType = 'hill_station';
    coordinates = norm.includes('spiti') ? { lat: 32.2461, lng: 78.0349 } : { lat: 32.2432, lng: 77.1892 };
  } else if (norm.includes('karnataka') || norm.includes('bangalore') || norm.includes('bengaluru') || norm.includes('mysore') || norm.includes('coorg') || norm.includes('hampi') || norm.includes('gokarna') || norm.includes('chikmagalur')) {
    state = 'Karnataka';
    coordinates = norm.includes('gokarna') ? { lat: 14.5479, lng: 74.3188 } : norm.includes('hampi') ? { lat: 15.3350, lng: 76.4600 } : { lat: 12.9716, lng: 77.5946 };
  } else if (norm.includes('kerala') || norm.includes('kochi') || norm.includes('munnar') || norm.includes('alleppey') || norm.includes('varkala') || norm.includes('wayanad')) {
    state = 'Kerala';
    coordinates = norm.includes('varkala') ? { lat: 8.7379, lng: 76.7163 } : norm.includes('munnar') ? { lat: 10.0889, lng: 77.0595 } : { lat: 9.9312, lng: 76.2673 };
  } else if (norm.includes('goa') || norm.includes('panaji') || norm.includes('calangute') || norm.includes('baga') || norm.includes('palolem')) {
    state = 'Goa';
    category = 'beach';
    spotType = 'beach';
    coordinates = { lat: 15.2993, lng: 74.1240 };
  } else if (norm.includes('maharashtra') || norm.includes('mumbai') || norm.includes('pune') || norm.includes('lonavala') || norm.includes('mahabaleshwar') || norm.includes('alibaug') || norm.includes('shirdi')) {
    state = 'Maharashtra';
    coordinates = { lat: 18.5204, lng: 73.8567 };
  } else if (norm.includes('tamil') || norm.includes('chennai') || norm.includes('ooty') || norm.includes('kodaikanal') || norm.includes('dhanushkodi') || norm.includes('rameshwaram') || norm.includes('pondicherry') || norm.includes('puducherry')) {
    state = 'Tamil Nadu';
    coordinates = norm.includes('dhanushkodi') ? { lat: 9.1762, lng: 79.4184 } : { lat: 13.0827, lng: 80.2707 };
  } else if (norm.includes('austria') || norm.includes('hallstatt') || norm.includes('vienna') || norm.includes('salzburg')) {
    state = 'Upper Austria';
    country = 'Austria';
    coordinates = { lat: 47.5622, lng: 13.6493 };
  } else if (norm.includes('switzerland') || norm.includes('interlaken') || norm.includes('zermatt') || norm.includes('zurich')) {
    state = 'Bern';
    country = 'Switzerland';
    coordinates = { lat: 46.6863, lng: 7.8632 };
  } else if (norm.includes('france') || norm.includes('paris')) {
    state = 'Île-de-France';
    country = 'France';
    coordinates = { lat: 48.8566, lng: 2.3522 };
  } else if (norm.includes('japan') || norm.includes('tokyo') || norm.includes('kyoto')) {
    state = 'Kanto';
    country = 'Japan';
    coordinates = { lat: 35.6762, lng: 139.6503 };
  }

  if (norm.includes('temple') || norm.includes('mandir') || norm.includes('ghat') || norm.includes('dham') || norm.includes('spiritual')) {
    category = 'spiritual';
    spotType = 'temple';
  } else if (norm.includes('beach') || norm.includes('sea') || norm.includes('coast')) {
    category = 'beach';
    spotType = 'beach';
  } else if (norm.includes('hill') || norm.includes('mountain') || norm.includes('pass') || norm.includes('valley') || norm.includes('trek')) {
    category = 'mountain';
    spotType = 'hill_station';
  } else if (norm.includes('fort') || norm.includes('palace') || norm.includes('monument') || norm.includes('ruin')) {
    category = 'heritage';
    spotType = 'monument';
  } else if (norm.includes('fall') || norm.includes('lake') || norm.includes('forest') || norm.includes('jungle')) {
    category = 'nature';
    spotType = 'nature';
  }

  return {
    id: `custom-${clean.toLowerCase().replace(/\s+/g, '-')}`,
    name: clean,
    fullName: `${clean}${state !== 'India' ? `, ${state}` : ''}${country !== 'India' ? `, ${country}` : ', India'}`,
    state,
    country,
    coordinates,
    category,
    spotType,
    highlights: [
      `${clean} Cultural & Historic Landmark Tour`,
      `${clean} Iconic Heritage Architecture & Scenic Spots`,
      `${clean} Artisan Craft Bazaar & Souvenir Walk`,
      `${clean} Panoramic Viewpoint & Sunset Overlook`
    ],
    tagline: `Precise Spot • ${state} • Handcrafted AI Itinerary`,
    image: undefined
  };
}

/**
 * Async resolver with Nominatim geocoding lookup
 */
export async function resolvePreciseLocation(input: string): Promise<PreciseLocation> {
  const clean = input.trim();
  if (!clean) return resolvePreciseLocationSync('Udaipur');

  // Try search
  try {
    const matches = await searchLocations(clean);
    if (matches.length > 0) {
      return matches[0];
    }
  } catch {
    // fallback
  }

  return resolvePreciseLocationSync(clean);
}
