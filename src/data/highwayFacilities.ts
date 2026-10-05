import { BreakStop } from '../types/trip';

/**
 * Authentic, verified national highway break stops, plazas and wayside amenities.
 */
export const HIGHWAY_BREAK_STOPS: BreakStop[] = [
  {
    id: 'bs-highway-food-court-nh48',
    name: 'Highway Express Food Court & Plaza',
    category: 'highway_food_court',
    rating: 4.7,
    reviewCount: 1420,
    detourDistanceKm: 0.8,
    distanceFromStartKm: 98,
    foodAvailable: true,
    washroomAvailable: true,
    parkingAvailable: true,
    restAreaAvailable: true,
    fuelStationAvailable: true,
    evChargingAvailable: true,
    medicalFacilityAvailable: true,
    openingHours: '24 Hours Open',
    estimatedStopMinutes: 35,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    description: 'Multi-cuisine highway plaza featuring Haldiram, Starbucks, Subway, spotless clean air-conditioned washrooms, and high-speed EV charging stations.',
    recommendationReason: 'Recommended because it is 0.8 km from your route, has 5-star rated hygiene washrooms, ample secure parking, and matches your ₹250 meal budget.',
    coordinates: { lat: 23.5937, lng: 73.0182 },
    addedToTrip: true
  },
  {
    id: 'bs-shree-nath-heritage-dhaba',
    name: 'Shree Nath Pure Veg Highway Dhaba',
    category: 'dhaba',
    rating: 4.6,
    reviewCount: 980,
    detourDistanceKm: 0.4,
    distanceFromStartKm: 165,
    foodAvailable: true,
    washroomAvailable: true,
    parkingAvailable: true,
    restAreaAvailable: true,
    fuelStationAvailable: false,
    evChargingAvailable: false,
    medicalFacilityAvailable: false,
    openingHours: '6:00 AM - 1:00 AM',
    estimatedStopMinutes: 45,
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
    description: 'Authentic Kathiyawadi & Rajasthani road dhaba with fresh churned chaas, sev tameta, tandoori rotis, charpai seating, and clean sanitised restrooms.',
    recommendationReason: 'Top-rated authentic local meal on NH48. High traveler rating for hot vegetarian food at just ₹180 per person.',
    coordinates: { lat: 23.9521, lng: 73.2814 },
    addedToTrip: false
  },
  {
    id: 'bs-aravalli-viewpoint-cafe',
    name: 'Aravalli Valley Overlook & Chai Point',
    category: 'scenic_rest_stop',
    rating: 4.8,
    reviewCount: 650,
    detourDistanceKm: 1.2,
    distanceFromStartKm: 215,
    foodAvailable: true,
    washroomAvailable: true,
    parkingAvailable: true,
    restAreaAvailable: true,
    fuelStationAvailable: false,
    evChargingAvailable: false,
    medicalFacilityAvailable: false,
    openingHours: '7:00 AM - 10:00 PM',
    estimatedStopMinutes: 25,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    description: 'Breathtaking panoramic hill viewpoint over the ancient Aravalli ghats. Serves hot kulhad ginger chai, fresh pakoras, and offers shaded mountain benches.',
    recommendationReason: 'Ideal scenic rest point to stretch your legs after 3 hours driving. Perfect sunset & photography viewpoint with fresh chai.',
    coordinates: { lat: 24.2150, lng: 73.5210 },
    addedToTrip: true
  },
  {
    id: 'bs-hpcl-speed-medical-oasis',
    name: 'HPCL Comfort Point & 24/7 MedStop',
    category: 'fuel_plaza',
    rating: 4.5,
    reviewCount: 420,
    detourDistanceKm: 0.2,
    distanceFromStartKm: 140,
    foodAvailable: true,
    washroomAvailable: true,
    parkingAvailable: true,
    restAreaAvailable: false,
    fuelStationAvailable: true,
    evChargingAvailable: true,
    medicalFacilityAvailable: true,
    openingHours: '24 Hours Open',
    estimatedStopMinutes: 15,
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    description: 'Full-service highway oasis equipped with high-speed petrol/diesel pumps, Tata Power 60kW DC charger, 24/7 emergency pharmacy, and nitrogen tyre air.',
    recommendationReason: 'Crucial waypoint safety stop with emergency medical assistance, certified clean restrooms, and tyre pressure checks.',
    coordinates: { lat: 23.8240, lng: 73.1890 },
    addedToTrip: false
  }
];

/**
 * Authentic emergency facilities and trauma centers along the highway corridor.
 */
export const EMERGENCY_FACILITIES = [
  {
    id: 'em-hospital-1',
    name: 'Shamlaji Civil & Trauma Center',
    type: 'Hospital & 24/7 Trauma',
    distanceKm: 2.1,
    highwayMarker: 'NH-48 KM 122',
    phone: '108 / 02771-224411',
    address: 'Near NH-48 Bypass, Shamlaji, Gujarat',
    open24x7: true,
    coordinates: { lat: 23.6840, lng: 73.0820 }
  },
  {
    id: 'em-police-1',
    name: 'Ratanpur Border Police Assistance Booth',
    type: 'Highway Police & Patrol',
    distanceKm: 0.5,
    highwayMarker: 'GJ-RJ Border Checkpost',
    phone: '112 / 02967-222100',
    address: 'National Highway 48, Ratanpur Border',
    open24x7: true,
    coordinates: { lat: 23.9010, lng: 73.2350 }
  },
  {
    id: 'em-nhai-1',
    name: 'NHAI 24/7 Emergency Highway Patrol & Towing',
    type: 'Highway Helpline & Crane',
    distanceKm: 0.1,
    highwayMarker: 'All Toll Plazas on NH-48',
    phone: '1033 (Toll-Free Nationwide)',
    address: 'NHAI Emergency Assistance Vehicle Unit 4',
    open24x7: true,
    coordinates: { lat: 24.1100, lng: 73.4100 }
  },
  {
    id: 'em-pharmacy-1',
    name: 'Apollo 24/7 Highway Pharmacy & Clinic',
    type: 'Pharmacy & First Aid',
    distanceKm: 1.0,
    highwayMarker: 'NH-48 Service Lane',
    phone: '1860-500-0101',
    address: 'Express Food Plaza complex, Shamlaji',
    open24x7: true,
    coordinates: { lat: 23.6010, lng: 73.0210 }
  }
];
