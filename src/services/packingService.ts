import { PackingItem, Trip } from '../types/trip';

export function generateSmartPackingList(trip: Trip): PackingItem[] {
  const destLower = (trip.destination || '').toLowerCase();
  const prefs = trip.preferences || [];
  const isMountain = destLower.includes('manali') || 
                     destLower.includes('leh') || 
                     destLower.includes('munnar') ||
                     destLower.includes('shimla') ||
                     prefs.includes('nature') ||
                     prefs.includes('adventure');

  const isBeach = destLower.includes('goa') || 
                  destLower.includes('gokarna') ||
                  destLower.includes('pondicherry') ||
                  prefs.includes('beach');

  const items: PackingItem[] = [
    // 1. Documents & Valuables
    { id: 'doc-1', name: 'Government Photo ID (Aadhaar / Voter ID / Passport)', category: 'documents', isPacked: false, note: 'Mandatory for hotel check-in & toll/border checkposts' },
    { id: 'doc-2', name: 'Driving License & Vehicle Registration (RC + PUC)', category: 'documents', isPacked: false, note: 'Physical copy or DigiLocker verified' },
    { id: 'doc-3', name: 'Vehicle Insurance Policy Document', category: 'documents', isPacked: false },
    { id: 'doc-4', name: 'Emergency Cash (₹3,000 - ₹5,000 in ₹100/₹500 notes)', category: 'documents', isPacked: false, note: 'Many highway dhabas & remote toll booths lack network UPI' },
    { id: 'doc-5', name: 'FASTag Recharged (minimum ₹1,000 balance)', category: 'documents', isPacked: false },

    // 2. Essentials & Highway Gear
    { id: 'ess-1', name: 'Insulated Water Bottles (1L per person)', category: 'essentials', isPacked: false, note: 'Avoid single-use plastic bottles on highways' },
    { id: 'ess-2', name: 'Car Tire Inflator & Pressure Gauge', category: 'essentials', isPacked: false },
    { id: 'ess-3', name: 'Spare Car Key', category: 'essentials', isPacked: false, note: 'Keep in a separate bag from main key' },
    { id: 'ess-4', name: 'Microfiber Towel & Wet Wipes', category: 'essentials', isPacked: false },
    { id: 'ess-5', name: 'Trash Bags for Vehicle Cleanliness', category: 'essentials', isPacked: false },

    // 3. First Aid & Health
    { id: 'med-1', name: 'Motion Sickness Tablets (Avomine / Ondansetron)', category: 'firstaid', isPacked: false, note: isMountain ? 'Crucial for winding ghat roads' : 'Good for long highway curves' },
    { id: 'med-2', name: 'Paracetamol & Pain Relief Spray (Volini/Moov)', category: 'firstaid', isPacked: false },
    { id: 'med-3', name: 'Antacid & Digestives (Pudin Hara / Digene)', category: 'firstaid', isPacked: false, note: 'For spicy dhaba food exploration' },
    { id: 'med-4', name: 'Bandages, Antiseptic Cream & Dettol Wipes', category: 'firstaid', isPacked: false },
    { id: 'med-5', name: 'ORS / Electrolyte Sachets', category: 'firstaid', isPacked: false, note: 'Prevents dehydration while driving' },

    // 4. Electronics & Tech
    { id: 'elec-1', name: 'High-Wattage Dual-Port Car Charger', category: 'electronics', isPacked: false, note: 'For GPS phone + passenger phone' },
    { id: 'elec-2', name: '20,000mAh Power Bank with Fast Charging', category: 'electronics', isPacked: false },
    { id: 'elec-3', name: 'Magnetic AC Vent Phone Mount for Navigation', category: 'electronics', isPacked: false },
    { id: 'elec-4', name: 'Offline Google Maps & Spotify Playlist Downloaded', category: 'electronics', isPacked: false, note: 'Save offline areas in mobile settings' },
    { id: 'elec-5', name: 'Camera & Extra Memory Card / Action Cam', category: 'electronics', isPacked: false },

    // 5. Toiletries & Sun Protection
    { id: 'toil-1', name: 'Sunscreen Lotion (SPF 50+ PA+++)', category: 'toiletries', isPacked: false },
    { id: 'toil-2', name: 'Pocket Hand Sanitizer & Paper Soap Strips', category: 'toiletries', isPacked: false, note: 'For highway public restrooms' },
    { id: 'toil-3', name: 'Toilet Seat Sanitizer Spray (PeeSafe)', category: 'toiletries', isPacked: false },
    { id: 'toil-4', name: 'Lip Balm with SPF & Moisturizer', category: 'toiletries', isPacked: false },
    { id: 'toil-5', name: 'Toothbrush, Travel Paste & Quick-Dry Pouch', category: 'toiletries', isPacked: false },

    // 6. Clothing
    { id: 'cloth-1', name: `Comfortable Travel T-Shirts (${Math.min(trip.durationDays + 1, 6)} pairs)`, category: 'clothing', isPacked: false },
    { id: 'cloth-2', name: 'Breathable Cargo Pants / Shorts / Track Pants', category: 'clothing', isPacked: false },
    { id: 'cloth-3', name: 'Cushioned Walking / Driving Shoes', category: 'clothing', isPacked: false },
    { id: 'cloth-4', name: 'Light Cotton Socks & Extra Pair', category: 'clothing', isPacked: false },
    { id: 'cloth-5', name: 'UV Protection Polarized Sunglasses', category: 'clothing', isPacked: false }
  ];

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

  return items;
}
