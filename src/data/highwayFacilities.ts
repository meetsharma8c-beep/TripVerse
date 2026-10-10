import { BreakStop } from '../types/trip';

export const HIGHWAY_BREAK_STOPS: BreakStop[] = [
  {
    id: 'bs-nh48-highway-king',
    name: 'Hotel Highway King & EV Plaza',
    category: 'highway_food_court',
    section: 'amenities',
    rating: 4.6,
    reviewCount: 3840,
    detourDistanceKm: 0.2,
    distanceFromStartKm: 85,
    foodAvailable: true,
    washroomAvailable: true,
    parkingAvailable: true,
    restAreaAvailable: true,
    fuelStationAvailable: true,
    evChargingAvailable: true,
    medicalFacilityAvailable: true,
    openingHours: 'Open 24 Hours',
    estimatedStopMinutes: 35,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    description: 'Premier NH-48 corridor rest stop featuring multi-cuisine food court, Costa Coffee, 60kW DC Fast EV chargers, clean restrooms, and children play zone.',
    recommendationReason: 'Verified highway plaza with spotless washrooms and 24x7 security.',
    coordinates: { lat: 27.6534, lng: 76.5412 }
  },
  {
    id: 'bs-nh48-food-express',
    name: 'Mannat Haveli Food Plaza',
    category: 'dhaba',
    section: 'amenities',
    rating: 4.7,
    reviewCount: 5210,
    detourDistanceKm: 0.1,
    distanceFromStartKm: 142,
    foodAvailable: true,
    washroomAvailable: true,
    parkingAvailable: true,
    restAreaAvailable: true,
    fuelStationAvailable: true,
    evChargingAvailable: true,
    openingHours: 'Open 24 Hours',
    estimatedStopMinutes: 40,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    description: 'Heritage theme highway plaza serving authentic tandoori parathas, kulhad chai, south Indian snacks with air-conditioned dining halls.',
    recommendationReason: 'Popular family pitstop known for fast service and regional cuisine.',
    coordinates: { lat: 27.2145, lng: 76.1287 }
  },
  {
    id: 'bs-nh48-hpcl-oasis',
    name: 'HPCL COCO Fuel Oasis & Cafe',
    category: 'fuel_plaza',
    section: 'fuel',
    rating: 4.5,
    reviewCount: 1980,
    detourDistanceKm: 0.0,
    distanceFromStartKm: 210,
    foodAvailable: true,
    washroomAvailable: true,
    parkingAvailable: true,
    fuelStationAvailable: true,
    evChargingAvailable: true,
    openingHours: 'Open 24 Hours',
    estimatedStopMinutes: 20,
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=600&q=80',
    description: 'Company-owned company-operated petrol & diesel station with guaranteed fuel purity, nitrogen tyre filling, automated air pumps, and convenience store.',
    recommendationReason: 'COCO certified station for reliable fuel and quick nitrogen check.',
    coordinates: { lat: 26.8912, lng: 75.8123 }
  },
  {
    id: 'bs-nh48-tata-ev-hub',
    name: 'Tata Power EZ Charge Fast Hub',
    category: 'fuel_plaza',
    section: 'ev_charging',
    rating: 4.8,
    reviewCount: 840,
    detourDistanceKm: 0.3,
    distanceFromStartKm: 175,
    foodAvailable: true,
    washroomAvailable: true,
    parkingAvailable: true,
    evChargingAvailable: true,
    openingHours: 'Open 24 Hours',
    estimatedStopMinutes: 45,
    image: 'https://images.unsplash.com/photo-1558441719-8b8359781dc3?auto=format&fit=crop&w=600&q=80',
    description: 'Dual-gun 120kW ultra-fast CCS2 DC chargers with shaded parking bays, lounge seating, high-speed WiFi, and snack bistro.',
    recommendationReason: 'High reliability 120kW DC fast charging with minimal waiting times.',
    coordinates: { lat: 26.4521, lng: 75.3214 }
  }
];

export const EMERGENCY_FACILITIES: Array<{
  id: string;
  name: string;
  type: string;
  distanceKm: number;
  highwayMarker: string;
  phone: string;
  address: string;
  open24x7: boolean;
  coordinates: { lat: number; lng: number };
}> = [
  {
    id: 'em-1',
    name: 'NHAI Highway Patrol & Ambulance Base',
    type: 'Highway Emergency / Medical Response',
    distanceKm: 4.2,
    highwayMarker: 'NH-48 KM 128',
    phone: '1033',
    address: 'NHAI Toll Plaza Command Unit, NH-48',
    open24x7: true,
    coordinates: { lat: 27.4521, lng: 76.3214 }
  },
  {
    id: 'em-2',
    name: 'District Trauma Hospital & Emergency Ward',
    type: 'Hospital / Trauma Care',
    distanceKm: 9.8,
    highwayMarker: 'Exit 18B',
    phone: '108',
    address: 'Highway Bypass Junction',
    open24x7: true,
    coordinates: { lat: 27.2145, lng: 76.1287 }
  },
  {
    id: 'em-3',
    name: '24x7 Highway Recovery & Towing Service',
    type: 'Vehicle Breakdown & Crane',
    distanceKm: 6.5,
    highwayMarker: 'NH-48 Service Road',
    phone: '1800-180-2222',
    address: 'Near Indian Oil Plaza, NH-48',
    open24x7: true,
    coordinates: { lat: 26.8912, lng: 75.8123 }
  }
];
