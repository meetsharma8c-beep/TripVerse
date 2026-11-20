import { PackingItem, Trip } from '../types/trip';
import { resolveTransitContext } from './transportFeasibilityEngine';

export interface PackingWeatherHint {
  minTempC?: number;
  maxTempC?: number;
  maxRainProb?: number;
}

export function generateSmartPackingList(trip: Trip, weatherHint?: PackingWeatherHint): PackingItem[] {
  const destLower = (trip.destination || '').toLowerCase();
  const prefs = trip.preferences || [];
  const mode = trip.transportMode || 'car';
  const country = (trip.destinationDetails?.country || '').toLowerCase();
  const transitCtx = resolveTransitContext(
    trip.destination || '',
    trip.destinationDetails?.coordinates || trip.routeDetails?.destinationCoordinates
  );
  const isInternational =
    Boolean(transitCtx.isOverseas) ||
    Boolean(country && country !== 'india' && country !== 'worldwide') ||
    ['tokyo', 'japan', 'paris', 'london', 'bali', 'maldives', 'singapore', 'dubai', 'bangkok', 'new york', 'new jersey'].some(k => destLower.includes(k));
  const isFlight = mode === 'flight' || isInternational;
  const isTrain = mode === 'train';

  const isMountain = destLower.includes('manali') || 
                     destLower.includes('leh') || 
                     destLower.includes('munnar') ||
                     destLower.includes('shimla') ||
                     prefs.includes('nature') ||
                     prefs.includes('adventure');

  const isBeach = destLower.includes('goa') || 
                  destLower.includes('gokarna') ||
                  destLower.includes('pondicherry') ||
                  destLower.includes('andaman') ||
                  destLower.includes('maldives') ||
                  destLower.includes('bali') ||
                  prefs.includes('beach');

  let items: PackingItem[] = [];

  // ==========================================
  // 1. FLIGHT & INTERNATIONAL TRAVEL CHECKLIST
  // ==========================================
  if (isFlight) {
    items = [
      // Documents
      { id: 'doc-intl-1', name: 'Valid Passport (Min. 6 Months Remaining Validity)', category: 'documents', isPacked: false, note: 'Mandatory for immigration clearance & international hotel check-ins' },
      { id: 'doc-intl-2', name: 'Approved Visa / eVisa / Entry Declaration QR', category: 'documents', isPacked: false, note: 'Visit Japan Web, ESTA, or tourist visa printout + digital copy' },
      { id: 'doc-intl-3', name: 'Confirmed Round-Trip Flight E-Tickets & Boarding Passes', category: 'documents', isPacked: false, note: 'Airline PNR & digital app boarding passes stored offline' },
      { id: 'doc-intl-4', name: 'Zero-Forex Travel Card & Emergency Local Currency Cash', category: 'documents', isPacked: false, note: 'Carry primary international debit/credit card + local notes for street dining' },
      { id: 'doc-intl-5', name: 'Comprehensive International Travel & Medical Insurance', category: 'documents', isPacked: false, note: 'Covers emergency healthcare, baggage delay, and flight cancellation' },

      // Flight Essentials & Gear
      { id: 'ess-intl-1', name: 'Universal Travel Power Adapter (Destination Plug Compatible)', category: 'electronics', isPacked: false, note: 'Essential for laptops, phones & cameras across global wall sockets' },
      { id: 'ess-intl-2', name: 'Destination eSIM / International Roaming Pack', category: 'electronics', isPacked: false, note: 'Install eSIM profile before departure for instant data connectivity upon landing' },
      { id: 'ess-intl-3', name: 'Airline Cabin-Compliant Power Bank (Under 100Wh / 20,000mAh)', category: 'electronics', isPacked: false, note: 'Must be carried in hand/cabin baggage only; forbidden in check-in luggage' },
      { id: 'ess-intl-4', name: 'TSA-Approved Combination Luggage Locks', category: 'essentials', isPacked: false, note: 'Protects checked suitcases and complies with airport security screening' },
      { id: 'ess-intl-5', name: 'Memory Foam Inflatable Neck Pillow & Sleep Eye Mask', category: 'essentials', isPacked: false, note: 'Vital for comfortable rest during long-haul flights' },
      { id: 'ess-intl-6', name: 'Noise-Cancelling Earphones & Airplane Audio Pin Adapter', category: 'electronics', isPacked: false },

      // Health & Toiletries (Aviation Compliant)
      { id: 'toil-intl-1', name: 'Transparent 1-Litre Clear Ziploc Pouch for Liquids (<100ml containers)', category: 'toiletries', isPacked: false, note: 'Mandatory standard security rule for all liquids/gels in cabin baggage' },
      { id: 'toil-intl-2', name: 'Moisturizing Lip Balm & Facial Hydration Mist', category: 'toiletries', isPacked: false, note: 'Combats dry pressurized cabin air on extended flights' },
      { id: 'med-intl-1', name: 'Prescription Medications with Original Doctor Prescription Certificate', category: 'firstaid', isPacked: false, note: 'Keep in original packaging to breeze through customs inspections' },
      { id: 'med-intl-2', name: 'Motion Sickness Tablets & Jet Lag Melatonin', category: 'firstaid', isPacked: false },
      { id: 'med-intl-3', name: 'Paracetamol, Antacid & Electrolyte Hydration Packets', category: 'firstaid', isPacked: false },

      // Clothing
      { id: 'cloth-intl-1', name: 'Comfortable Airport Transit Attire & Slip-On Walking Shoes', category: 'clothing', isPacked: false, note: 'Quick to remove at security scanners; cushioned for 15,000+ daily steps' },
      { id: 'cloth-intl-2', name: `City Exploration Outfits (${Math.min(trip.durationDays + 1, 6)} changes)`, category: 'clothing', isPacked: false },
      { id: 'cloth-intl-3', name: 'Compact Foldable Travel Umbrella', category: 'essentials', isPacked: false, note: 'Convenient for sudden coastal or city showers' }
    ];
  } 
  // ==========================================
  // 2. RAILWAY TRANSIT CHECKLIST
  // ==========================================
  else if (isTrain) {
    items = [
      { id: 'doc-trn-1', name: 'Government Photo ID (Original Aadhaar / Voter ID / Passport)', category: 'documents', isPacked: false, note: 'Mandatory for IRCTC ticket validation by TTE' },
      { id: 'doc-trn-2', name: 'IRCTC E-Ticket Confirmation / SMS on Mobile', category: 'documents', isPacked: false },
      { id: 'doc-trn-3', name: 'Emergency Cash in ₹100 / ₹500 denominations', category: 'documents', isPacked: false, note: 'For station porters and pantry cash transactions' },
      { id: 'ess-trn-1', name: 'Steel Wire Luggage Chain & Padlock', category: 'essentials', isPacked: false, note: 'Secure your bags to under-berth hooks during overnight train journeys' },
      { id: 'ess-trn-2', name: 'Multi-Plug Socket Adapter with Surge Protector', category: 'electronics', isPacked: false, note: 'Share the single side-berth charging socket smoothly' },
      { id: 'ess-trn-3', name: 'Disinfectant Wipes & Paper Soap', category: 'toiletries', isPacked: false, note: 'Sanitizing berth surfaces and station restrooms' },
      { id: 'ess-trn-4', name: '20,000mAh Fast-Charging Power Bank', category: 'electronics', isPacked: false },
      { id: 'ess-trn-5', name: 'Earplugs & Lightweight Eye Mask', category: 'essentials', isPacked: false, note: 'Blocks coach chatter and early morning station announcements' },
      { id: 'med-trn-1', name: 'Motion Sickness Tablets & Digestives (Pudin Hara / Digene)', category: 'firstaid', isPacked: false },
      { id: 'cloth-trn-1', name: 'Comfortable Cotton Trackpants & Slip-On Sandals', category: 'clothing', isPacked: false }
    ];
  }
  // ==========================================
  // 3. ROAD TRIP (CAR / BIKE) CHECKLIST
  // ==========================================
  else {
    items = [
      // Documents & Vehicle Papers
      { id: 'doc-1', name: 'Government Photo ID (Aadhaar / Voter ID / Passport)', category: 'documents', isPacked: false, note: 'Mandatory for hotel check-in & toll/border checkposts' },
      { id: 'doc-2', name: 'Original Driving License & Vehicle Registration (RC + PUC)', category: 'documents', isPacked: false, note: 'Physical copy or DigiLocker verified' },
      { id: 'doc-3', name: 'Vehicle Insurance Policy Document', category: 'documents', isPacked: false },
      { id: 'doc-4', name: 'Emergency Cash (₹3,000 - ₹5,000 in ₹100/₹500 notes)', category: 'documents', isPacked: false, note: 'Many highway dhabas & remote toll booths lack network UPI' },
      { id: 'doc-5', name: 'FASTag Recharged (minimum ₹1,000 balance)', category: 'documents', isPacked: false },

      // Highway Gear
      { id: 'ess-1', name: 'Insulated Water Bottles (1L per person)', category: 'essentials', isPacked: false, note: 'Avoid single-use plastic bottles on highways' },
      { id: 'ess-2', name: 'Car Tire Inflator & Pressure Gauge', category: 'essentials', isPacked: false },
      { id: 'ess-3', name: 'Spare Car Key', category: 'essentials', isPacked: false, note: 'Keep in a separate bag from main key' },
      { id: 'ess-4', name: 'Microfiber Towel & Wet Wipes', category: 'essentials', isPacked: false },
      { id: 'ess-5', name: 'Trash Bags for Vehicle Cleanliness', category: 'essentials', isPacked: false },

      // First Aid
      { id: 'med-1', name: 'Motion Sickness Tablets (Avomine / Ondansetron)', category: 'firstaid', isPacked: false, note: isMountain ? 'Crucial for winding ghat roads' : 'Good for long highway curves' },
      { id: 'med-2', name: 'Paracetamol & Pain Relief Spray (Volini/Moov)', category: 'firstaid', isPacked: false },
      { id: 'med-3', name: 'Antacid & Digestives (Pudin Hara / Digene)', category: 'firstaid', isPacked: false, note: 'For spicy dhaba food exploration' },
      { id: 'med-4', name: 'Bandages, Antiseptic Cream & Dettol Wipes', category: 'firstaid', isPacked: false },
      { id: 'med-5', name: 'ORS / Electrolyte Sachets', category: 'firstaid', isPacked: false, note: 'Prevents dehydration while driving' },

      // Electronics
      { id: 'elec-1', name: 'High-Wattage Dual-Port Car Charger', category: 'electronics', isPacked: false, note: 'For GPS phone + passenger phone' },
      { id: 'elec-2', name: '20,000mAh Power Bank with Fast Charging', category: 'electronics', isPacked: false },
      { id: 'elec-3', name: 'Magnetic AC Vent Phone Mount for Navigation', category: 'electronics', isPacked: false },
      { id: 'elec-4', name: 'Offline Google Maps & Spotify Playlist Downloaded', category: 'electronics', isPacked: false, note: 'Save offline areas in mobile settings' },
      { id: 'elec-5', name: 'Camera & Extra Memory Card / Action Cam', category: 'electronics', isPacked: false },

      // Toiletries
      { id: 'toil-1', name: 'Sunscreen Lotion (SPF 50+ PA+++)', category: 'toiletries', isPacked: false },
      { id: 'toil-2', name: 'Pocket Hand Sanitizer & Paper Soap Strips', category: 'toiletries', isPacked: false, note: 'For highway public restrooms' },
      { id: 'toil-3', name: 'Toilet Seat Sanitizer Spray (PeeSafe)', category: 'toiletries', isPacked: false },
      { id: 'toil-4', name: 'Lip Balm with SPF & Moisturizer', category: 'toiletries', isPacked: false },
      { id: 'toil-5', name: 'Toothbrush, Travel Paste & Quick-Dry Pouch', category: 'toiletries', isPacked: false },

      // Clothing
      { id: 'cloth-1', name: `Comfortable Travel T-Shirts (${Math.min(trip.durationDays + 1, 6)} pairs)`, category: 'clothing', isPacked: false },
      { id: 'cloth-2', name: 'Breathable Cargo Pants / Shorts / Track Pants', category: 'clothing', isPacked: false },
      { id: 'cloth-3', name: 'Cushioned Walking / Driving Shoes', category: 'clothing', isPacked: false },
      { id: 'cloth-4', name: 'Light Cotton Socks & Extra Pair', category: 'clothing', isPacked: false },
      { id: 'cloth-5', name: 'UV Protection Polarized Sunglasses', category: 'clothing', isPacked: false }
    ];
  }

  // Mountain additions
  if (isMountain) {
    items.push(
      { id: 'cloth-mtn-1', name: 'Fleece Jacket / Windproof Heavy Parka', category: 'clothing', isPacked: false, note: 'Nights drop significantly in hill stations' },
      { id: 'cloth-mtn-2', name: 'Thermal Inners (Top & Bottom)', category: 'clothing', isPacked: false },
      { id: 'cloth-mtn-3', name: 'Woolen Beanie & Touchscreen Gloves', category: 'clothing', isPacked: false },
      { id: 'ess-mtn-1', name: 'Camphor Tablets / Diamox (Altitude Care)', category: 'firstaid', isPacked: false, note: 'Assists breathing at high passes' }
    );
  }

  // Beach additions
  if (isBeach) {
    items.push(
      { id: 'cloth-bch-1', name: 'Swimwear & Quick-Dry Board Shorts', category: 'clothing', isPacked: false },
      { id: 'cloth-bch-2', name: 'Waterproof Phone Pouch for Beach & Watersports', category: 'electronics', isPacked: false },
      { id: 'cloth-bch-3', name: 'Flip Flops / Crocs for Sand', category: 'clothing', isPacked: false },
      { id: 'cloth-bch-4', name: 'Wide-Brim Sun Hat', category: 'clothing', isPacked: false },
      { id: 'toil-bch-1', name: 'Aloe Vera Gel / After-Sun Soothing Lotion', category: 'toiletries', isPacked: false }
    );
  }

  // Climate-adaptive additions from live/seasonal forecast temperatures
  const minTemp = weatherHint?.minTempC;
  const maxTemp = weatherHint?.maxTempC;
  const maxRain = weatherHint?.maxRainProb;

  if (typeof minTemp === 'number' && minTemp <= 8 && !isMountain) {
    items.push(
      { id: 'cloth-cold-1', name: 'Insulated Winter Coat / Down Jacket', category: 'clothing', isPacked: false, note: `Forecast lows near ${Math.round(minTemp)}°C — pack warm outerwear` },
      { id: 'cloth-cold-2', name: 'Thermal Base Layers & Warm Wool Socks', category: 'clothing', isPacked: false, note: 'Essential for crisp mornings and sub-10°C evenings' },
      { id: 'cloth-cold-3', name: 'Knit Beanie, Scarf & Touchscreen Gloves', category: 'clothing', isPacked: false }
    );
  }

  if (typeof maxRain === 'number' && maxRain >= 45) {
    items.push(
      { id: 'ess-rain-1', name: 'Compact Windproof Travel Umbrella / Rain Shell', category: 'clothing', isPacked: false, note: `Up to ${Math.round(maxRain)}% precipitation probability during your dates` }
    );
  }

  if (typeof maxTemp === 'number' && maxTemp >= 32) {
    items.push(
      { id: 'firstaid-heat-1', name: 'Electrolyte Hydration Sachets & Insulated Bottle', category: 'firstaid', isPacked: false, note: `Daytime highs around ${Math.round(maxTemp)}°C — stay hydrated` }
    );
  }

  return items;
}
