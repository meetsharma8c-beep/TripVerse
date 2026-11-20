import { resolveCanonicalDestination } from './canonicalCityService';
import { resolvePreciseLocationSync } from './locationService';
import { COUNTRY_EMERGENCY_REGISTRY, resolveEmergencyCountryCode } from './emergencySosService';

export interface ScamItem {
  title: string;
  description: string;
  howToAvoid: string;
}

export interface DestinationSafetyData {
  advisoryLevel: 'Safe' | 'Exercise Normal Caution' | 'High Vigilance';
  country: string;
  region: string;
  emergencyNumbers: { label: string; number: string; iconLabel?: string }[];
  safeNeighborhoods: string[];
  cautionAreas: string[];
  commonScams: ScamItem[];
}

/**
 * CONCODE SECURITY SENTINEL
 * Resolves truthful, location-calibrated emergency hotlines, safe neighborhoods,
 * and authentic tourist trap & scam alerts for any destination on Earth.
 */
export function resolveConcodeSafetyRadar(destinationName: string = ''): DestinationSafetyData {
  const raw = destinationName.trim();
  const norm = raw.toLowerCase();

  // Canonical resolution via city graph & geocoding
  const canonical = resolveCanonicalDestination(raw);
  const precise = resolvePreciseLocationSync(raw);
  const detectedCountry = (canonical.country || precise?.country || '').toLowerCase();
  const detectedState = (canonical.state || precise?.state || '').toLowerCase();

  // Helper flags
  const isKashmir =
    norm.includes('gulmarg') ||
    norm.includes('srinagar') ||
    norm.includes('pahalgam') ||
    norm.includes('sonamarg') ||
    norm.includes('kashmir') ||
    norm.includes('dal lake') ||
    norm.includes('baramulla') ||
    norm.includes('tangmarg');

  const isLadakh =
    norm.includes('ladakh') ||
    norm.includes('leh') ||
    norm.includes('nubra') ||
    norm.includes('pangong') ||
    norm.includes('khardung');

  const isHimachal =
    norm.includes('manali') ||
    norm.includes('himachal') ||
    norm.includes('shimla') ||
    norm.includes('spiti') ||
    norm.includes('dharamshala') ||
    norm.includes('mcleodganj') ||
    norm.includes('kasol') ||
    norm.includes('kullu');

  const isUttarakhand =
    norm.includes('rishikesh') ||
    norm.includes('haridwar') ||
    norm.includes('nainital') ||
    norm.includes('mussoorie') ||
    norm.includes('dehradun') ||
    norm.includes('auli');

  const isRajasthan =
    norm.includes('jaipur') ||
    norm.includes('rajasthan') ||
    norm.includes('udaipur') ||
    norm.includes('jodhpur') ||
    norm.includes('jaisalmer') ||
    norm.includes('pushkar');

  const isGoa =
    norm.includes('goa') ||
    norm.includes('gokarna') ||
    norm.includes('panaji') ||
    norm.includes('calangute') ||
    norm.includes('anjuna');

  const isAgraOrDelhi =
    norm.includes('agra') ||
    norm.includes('taj mahal') ||
    norm.includes('delhi') ||
    norm.includes('new delhi');

  const isVaranasi =
    norm.includes('varanasi') ||
    norm.includes('banaras') ||
    norm.includes('kashi') ||
    norm.includes('sarnath');

  const isKerala =
    norm.includes('kerala') ||
    norm.includes('kochi') ||
    norm.includes('munnar') ||
    norm.includes('alleppey') ||
    norm.includes('alappuzha') ||
    norm.includes('wayanad') ||
    norm.includes('varkala');

  // Generic India detector
  const isIndia =
    isKashmir ||
    isLadakh ||
    isHimachal ||
    isUttarakhand ||
    isRajasthan ||
    isGoa ||
    isAgraOrDelhi ||
    isVaranasi ||
    isKerala ||
    detectedCountry.includes('india') ||
    detectedState.includes('jammu') ||
    detectedState.includes('kashmir') ||
    detectedState.includes('gujarat') ||
    detectedState.includes('maharashtra') ||
    detectedState.includes('karnataka') ||
    detectedState.includes('tamil') ||
    detectedState.includes('bengal') ||
    detectedState.includes('punjab') ||
    detectedState.includes('haryana') ||
    norm.includes('mumbai') ||
    norm.includes('bangalore') ||
    norm.includes('bengaluru') ||
    norm.includes('pune') ||
    norm.includes('ahmedabad') ||
    norm.includes('vadodara') ||
    norm.includes('surat') ||
    norm.includes('amritsar') ||
    norm.includes('darjeeling') ||
    norm.includes('gangtok') ||
    norm.includes('hyderabad') ||
    norm.includes('chennai') ||
    norm.includes('kolkata');

  // =========================================================================
  // 1. GULMARG & KASHMIR VALLEY (Jammu & Kashmir, India)
  // =========================================================================
  if (isKashmir) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'India',
      region: 'Jammu & Kashmir',
      emergencyNumbers: [
        { label: 'J&K Police Integrated Emergency', number: '112' },
        { label: 'Gulmarg Tourist Police Post (GDA Complex)', number: '01954-254476' },
        { label: 'Gulmarg Ski & Avalanche Rescue Team', number: '01954-254485' },
        { label: 'Tangmarg Police Station (Access Highway)', number: '01954-254472' },
        { label: 'Srinagar Tourist Reception Centre (TRC Police Desk)', number: '0194-2502274' },
        { label: 'Medical Ambulance & Trauma Support', number: '108' },
        { label: 'J&K 24×7 Tourism Helpline', number: '1800-103-1070' }
      ],
      safeNeighborhoods: [
        'Gulmarg Meadow Bowl (GDA Hotel Enclave)',
        'Highlands Park & Golf Club Promenade',
        'Tangmarg Main Highway Market',
        'Srinagar Boulevard & Dal Lake Foreshore'
      ],
      cautionAreas: [
        'Backcountry ski bowls beyond Apharwat Peak (Phase 2) without avalanche transceiver / certified guide',
        'Unmarked forest trails toward Drung waterfall after sunset',
        'Mountain pass drives during active snow blizzards without 4×4 wheel chains'
      ],
      commonScams: [
        {
          title: 'Tangmarg Snow Chain & Sledge Coercion Trap',
          description:
            'Touts at Tangmarg checkpoint falsely claim normal vehicles cannot proceed to Gulmarg even on cleared roads, aggressively insisting you must hire a wooden sledge for ₹2,500–₹4,000 to reach your hotel or Gondola.',
          howToAvoid:
            '4×4 cabs with snow chains are officially authorized to drop you directly at your hotel reception. Sledges are strictly optional leisure rides, not mandatory transit. Central Gulmarg hotels are an easy 5–10 min walk to the Gondola. Check official GDA rate boards.'
        },
        {
          title: 'Fake / Black-Market Gulmarg Gondola Tickets',
          description:
            'Street touts around Gulmarg parking lots approach travelers claiming Gondola counter tickets are sold out and sell fake, duplicate, or inflated black-market paper printouts (charging ₹3,000–₹6,000 per person).',
          howToAvoid:
            'Gondola tickets are sold EXCLUSIVELY online at the official J&K Cable Car Corporation portal (jammukashmircablecar.com). Physical ticket counters are discontinued. Never purchase paper tickets from street touts.'
        },
        {
          title: 'Counterfeit Kashmiri Saffron & Shilajit Vendors',
          description:
            'Hawkers roaming near the Gondola base or Dal Lake aggressively sell dyed corn silk/coconut fiber as "Grade 1 Kashmiri Saffron" or diluted resin as Shilajit at bargain prices.',
          howToAvoid:
            'Genuine saffron strings do not turn water neon-yellow immediately; they expand slowly and release a golden hue with a distinct floral aroma. Buy authentic saffron only from verified government outlets like J&K Agro Industries or Pampore GI-tagged cooperative shops.'
        },
        {
          title: 'Machine-Made Viscose Sold as GI Pure Pashmina',
          description:
            'Gift shops claim synthetic or viscose shawls are authentic 100% handwoven Cashmere/Pashmina wool, charging ₹8,000–₹25,000.',
          howToAvoid:
            'Look for the official GI (Geographical Indication) hologram label and woven mark. True Pashmina passes through a ring and has natural warmth; buy from certified Kashmir Government Arts Emporiums.'
        },
        {
          title: 'Pony & Horse Ride Overcharging & Route Inflation',
          description:
            'Handlers charge ₹2,500+ for a 15-minute ride to "Viewpoint 1" or "Strawberry Valley", claiming the paths are impassable on foot.',
          howToAvoid:
            'The central Gulmarg meadow and viewpoints are easily walkable on paved paths. If hiring a pony, negotiate firmly according to the official GDA rate card displayed at the pony stand before mounting.'
        }
      ]
    };
  }

  // =========================================================================
  // 2. LADAKH (Leh, Nubra Valley, Pangong Tso)
  // =========================================================================
  if (isLadakh) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'India',
      region: 'Ladakh',
      emergencyNumbers: [
        { label: 'Ladakh Police Integrated Emergency', number: '112' },
        { label: 'Tourist Police Desk Leh', number: '01982-258880' },
        { label: 'SNM District Hospital & High Altitude EMS', number: '01982-252014' },
        { label: 'Diskit / Nubra Police Station', number: '01980-220025' },
        { label: 'BRO Highway Road Assistance (Beacon)', number: '01982-252119' },
        { label: 'National Medical Ambulance', number: '108' }
      ],
      safeNeighborhoods: ['Leh Main Bazaar', 'Changspa Road', 'Upper Tukcha Road', 'Shey & Thiksey Villages'],
      cautionAreas: [
        'Khardung La and Chang La passes during sub-zero storms',
        'Direct ascent to 14,000ft+ without mandatory 48-hour rest in Leh (Acute Mountain Sickness risk)'
      ],
      commonScams: [
        {
          title: 'Unacclimatized High-Altitude Bike Tours',
          description:
            'Tour operators renting 500cc bikes to tourists within 12 hours of landing at Leh Airport (11,500ft), leading to severe Acute Mountain Sickness (AMS) on Khardung La.',
          howToAvoid:
            'Medical guidelines mandate at least 36–48 hours of complete rest in Leh before traveling to high passes. Rent exclusively from certified Leh Motorcycle Union operators.'
        },
        {
          title: 'Unauthorized Inner Line Permit Surcharges',
          description:
            'Travel desks charging ₹1,500–₹2,500 per person for Ladakh Inner Line Permits (ILP).',
          howToAvoid:
            'The official UT Ladakh administration environment fee is ₹600 per person and can be booked directly online at lahdclehpermits.in.'
        }
      ]
    };
  }

  // =========================================================================
  // 3. AGRA & DELHI (Taj Mahal, Red Fort, Golden Triangle)
  // =========================================================================
  if (isAgraOrDelhi) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'India',
      region: 'North India',
      emergencyNumbers: [
        { label: 'National Integrated Emergency', number: '112' },
        { label: 'Agra Tourist Police Desk (Taj East Gate)', number: '0562-2421204' },
        { label: 'Delhi Tourist Police (Paharganj / CP)', number: '011-23345100' },
        { label: 'Police Assistance', number: '100' },
        { label: 'Medical Ambulance Support', number: '108' },
        { label: 'All-India 24×7 Tourist Helpline', number: '1363' }
      ],
      safeNeighborhoods: ['Taj East Gate Enclave & Fatehabad Road (Agra)', 'Connaught Place & Chanakyapuri (Delhi)', 'Aerocity (Delhi)'],
      cautionAreas: ['Paharganj back lanes late at night', 'Unregulated tout zones outside New Delhi & Agra Cantt Railway Stations'],
      commonScams: [
        {
          title: 'The "Marble Inlay Factory" Detour',
          description:
            'Auto-rickshaw drivers offer cheap ₹50 rides to the Taj Mahal but stop at a "government certified marble cooperative" where high-pressure pitches attempt to sell cheap soapstone as Italian marble.',
          howToAvoid:
            'Tell your driver clearly: "Direct to Taj Mahal East Gate only, no shopping stops." Pre-book official ASI tickets online at asi.payumoney.com to bypass street touts.'
        },
        {
          title: 'The "Monument is Closed Today" Trick',
          description:
            'Men near railway stations or outer gates tell you the Taj Mahal or Red Fort is temporarily closed for VIPs, steering you toward expensive private cabs or emporiums.',
          howToAvoid:
            'Monuments follow published government schedules (Taj Mahal is closed only on Fridays). Always proceed directly to the official security gate.'
        }
      ]
    };
  }

  // =========================================================================
  // 4. VARANASI (Ghats, Kashi Vishwanath)
  // =========================================================================
  if (isVaranasi) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'India',
      region: 'Uttar Pradesh',
      emergencyNumbers: [
        { label: 'UP Integrated Emergency Response', number: '112' },
        { label: 'Varanasi Tourist Police (Dashashwamedh Ghat)', number: '0542-2508104' },
        { label: 'Police Control Room', number: '100' },
        { label: 'Medical Ambulance Helpline', number: '108' },
        { label: 'All-India Tourist Helpline', number: '1363' }
      ],
      safeNeighborhoods: ['Dashashwamedh Ghat Promenade', 'Assi Ghat Area', 'Cantonment Area', 'BHU Campus'],
      cautionAreas: ['Isolated Manikarnika cremation alleys late at night', 'Unlicensed private boatmen without life jackets at high water'],
      commonScams: [
        {
          title: 'Manikarnika Ghat "Cremation Wood Donation" Extortion',
          description:
            'Men posing as temple hospice volunteers corner tourists watching cremation rituals, demanding ₹2,000–₹5,000 to "buy sacred sandalwood for poor families".',
          howToAvoid:
            'True families and priests never solicit cash donations from tourists. Observe cremation ghats from a respectful distance or from a boat; politely decline all donation books.'
        },
        {
          title: 'Fake Silk Weaver Factory Touts',
          description:
            'Drivers steer tourists to backstreet shops claiming they are non-profit weaver cooperatives selling pure Banarasi silk, when in fact they sell machine-loomed polyester.',
          howToAvoid:
            'Look for the "Silk Mark" certification label; buy only from established heritage emporiums in Godowlia or Chowk.'
        }
      ]
    };
  }

  // =========================================================================
  // 5. GOA & GOKARNA
  // =========================================================================
  if (isGoa) {
    return {
      advisoryLevel: 'Safe',
      country: 'India',
      region: 'Goa',
      emergencyNumbers: [
        { label: 'Goa Integrated Police Emergency', number: '112' },
        { label: 'Goa Tourist Security Patrol', number: '1077' },
        { label: 'Coastal Lifeguard Emergency (Drishti Marine)', number: '0832-2415108' },
        { label: 'Highway Road Assistance', number: '1033' },
        { label: 'Medical Ambulance', number: '108' }
      ],
      safeNeighborhoods: ['Candolim & Calangute Promenade', 'Panaji Waterfront', 'Palolem Beach Strip', 'Fontainhas Heritage Quarter'],
      cautionAreas: ['Isolated cliff trails after sunset', 'Rough surf waters outside designated red-flag swimming zones'],
      commonScams: [
        {
          title: 'Scooter Rental Pre-Existing Damage Claim',
          description:
            'Rental vendors charge high damage fees for scratches that already existed when you picked up the vehicle.',
          howToAvoid:
            'Always take a 360-degree high-definition video of the scooter and tires in front of the owner before riding off.'
        },
        {
          title: 'Overpriced Watersport Package Scams',
          description:
            'Touts on the beach promising 5-in-1 sports packages but providing only 30-second token boat rides.',
          howToAvoid:
            'Book only through registered GTDC-affiliated operators with lifejackets and clear written receipt vouchers.'
        }
      ]
    };
  }

  // =========================================================================
  // 6. JAIPUR & RAJASTHAN
  // =========================================================================
  if (isRajasthan) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'India',
      region: 'Rajasthan',
      emergencyNumbers: [
        { label: 'Rajasthan Police Emergency', number: '112' },
        { label: 'Jaipur Tourist Police (Amer/Hawa Mahal)', number: '0141-2601755' },
        { label: 'Medical Emergency Helpline', number: '108' },
        { label: 'Rajasthan Tourism Helpline', number: '1800-103-3500' },
        { label: 'Police Assistance', number: '100' }
      ],
      safeNeighborhoods: ['C-Scheme', 'Civil Lines', 'Malviya Nagar', 'Lake Pichola Promenade (Udaipur)', 'Fateh Sagar Lake'],
      cautionAreas: ['Old Walled City jewelry alleys after 10 PM', 'Isolated ghats alone after midnight'],
      commonScams: [
        {
          title: 'Gemstone & Jewelry Commission Trap',
          description:
            'Auto-rickshaw or taxi drivers insist on taking you to an "exclusive government wholesale gem factory" where they receive up to 50% kickback commissions on inflated stones.',
          howToAvoid:
            'Politely decline all shopping detours proposed by drivers and use ride-hailing apps (Ola/Uber) for transparent routes.'
        },
        {
          title: 'Fake Heritage Guide Trap',
          description:
            'Men without official badges outside Amer Fort or City Palace claiming they are government historians.',
          howToAvoid:
            'Hire guides strictly from the official monument ticket counter with approved photo ID badges and fixed rates.'
        }
      ]
    };
  }

  // =========================================================================
  // 7. MANALI & HIMACHAL PRADESH
  // =========================================================================
  if (isHimachal) {
    return {
      advisoryLevel: 'Safe',
      country: 'India',
      region: 'Himachal Pradesh',
      emergencyNumbers: [
        { label: 'Himachal Police / Emergency', number: '112' },
        { label: 'Manali Tourist Police Desk', number: '01902-252322' },
        { label: 'Mountain Rescue Helpline', number: '1077' },
        { label: 'Atal Tunnel Control Room', number: '01902-252114' },
        { label: 'Medical Ambulance Helpline', number: '108' }
      ],
      safeNeighborhoods: ['Old Manali', 'Mall Road Promenade', 'Vashisht Village', 'Aleo'],
      cautionAreas: ['Rohtang Pass roads after sunset during winter', 'Riverbanks during sudden dam discharge'],
      commonScams: [
        {
          title: 'Overpriced Winter Clothing Rental',
          description:
            'Roadside shops near Kothi charge 5x regular rates for snow suits and boots claiming you cannot enter Solang or Rohtang without their exact gear.',
          howToAvoid:
            'Rent gear from authorized HPTDC government counters or pre-book through your hotel at fixed rates (usually ₹250-₹400/set).'
        },
        {
          title: 'Unlicensed Adventure Sports Operators',
          description:
            'Uncertified paragliding or river rafting operators lacking insurance or certified harness equipment.',
          howToAvoid:
            'Always check that the operator displays an active Himachal Tourism Safety License and inspect helmet & harness.'
        }
      ]
    };
  }

  // =========================================================================
  // 8. KERALA (Munnar, Kochi, Alleppey)
  // =========================================================================
  if (isKerala) {
    return {
      advisoryLevel: 'Safe',
      country: 'India',
      region: 'Kerala',
      emergencyNumbers: [
        { label: 'Kerala Emergency Response', number: '112' },
        { label: 'Kerala Tourist Police Helpline', number: '0471-2331477' },
        { label: 'Coastal Police & Marine Rescue', number: '1093' },
        { label: 'Medical Ambulance Support', number: '108' },
        { label: 'Police Assistance', number: '100' }
      ],
      safeNeighborhoods: ['Fort Kochi Promenade', 'Munnar Town & Tea Estates', 'Alleppey Finishing Point', 'Varkala North Cliff'],
      cautionAreas: ['Unlicensed private boat docks at night', 'Isolated backwater canals without mobile signal'],
      commonScams: [
        {
          title: 'Alleppey Houseboat Mid-Lake AC & Route Surcharge',
          description:
            'Houseboat operators switch off the AC at night claiming generator failure, or demand extra fuel payments to cruise the main backwater lake channels.',
          howToAvoid:
            'Verify written booking terms in advance: certified houseboats run continuous AC from 9 PM to 6 AM and follow fixed DTPC routes. Book accredited boats.'
        },
        {
          title: 'Fake Ayurvedic Massage Clinics',
          description:
            'Street touts guide tourists to unlicensed backroom massage parlors offering overpriced treatments with low-quality scented oil.',
          howToAvoid:
            'Look for the official "Green Leaf" or "Olive Leaf" certification issued by Kerala Tourism for accredited Ayurvedic wellness centers.'
        }
      ]
    };
  }

  // =========================================================================
  // 9. UNIVERSAL DOMESTIC INDIA (Any other Indian town / city)
  // =========================================================================
  if (isIndia) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'India',
      region: 'National',
      emergencyNumbers: [
        { label: 'National Universal Emergency Response', number: '112' },
        { label: 'All-India 24×7 Multi-Lingual Tourist Helpline', number: '1363' },
        { label: 'Police Assistance Helpline', number: '100' },
        { label: 'Medical Ambulance & Trauma Support', number: '108' },
        { label: 'NHAI Highway & Breakdown Helpline', number: '1033' },
        { label: 'Women Safety Helpline', number: '1090' }
      ],
      safeNeighborhoods: ['City Center & Civil Lines', 'Well-lit Pedestrian Promenades', 'Central Transit & Metro Enclaves'],
      cautionAreas: ['Poorly-lit alleys after midnight', 'Unregulated private taxi touts outside stations without meters'],
      commonScams: [
        {
          title: 'Broken Meter or Flat Rate Taxi Scam',
          description:
            'Drivers outside airports or railway stations claim the digital meter is broken and demand 3x-4x regular tariffs.',
          howToAvoid:
            'Use official prepaid taxi booths located inside terminal buildings, or book via verified rideshare apps (Ola/Uber).'
        },
        {
          title: 'Overly Friendly "Free" Tour Detours',
          description:
            'Strangers inviting you for tea, only to lead you into souvenir emporiums with aggressive sales tactics.',
          howToAvoid:
            'Keep polite boundaries with strangers offering unsolicited shopping tours; purchase from official state emporiums.'
        }
      ]
    };
  }

  // =========================================================================
  // 10. UNITED KINGDOM (London, Edinburgh, etc.)
  // =========================================================================
  if (norm.includes('london') || norm.includes('uk') || norm.includes('united kingdom') || norm.includes('edinburgh') || norm.includes('scotland')) {
    return {
      advisoryLevel: 'Safe',
      country: 'United Kingdom',
      region: 'UK',
      emergencyNumbers: [
        { label: 'UK Universal Emergency (Police, Fire, Ambulance)', number: '999' },
        { label: 'Non-Emergency Police Assistance', number: '101' },
        { label: 'NHS Non-Emergency Health Advice', number: '111' },
        { label: 'London Transport Police Helpline', number: '0800-40-50-40' }
      ],
      safeNeighborhoods: ['Covent Garden', 'South Bank', 'Kensington', 'City of London', 'Mayfair'],
      cautionAreas: ['Crowded Oxford Street and Camden Market pickpocket clusters', 'Westminster Bridge during illegal street gambling'],
      commonScams: [
        {
          title: 'Three-Card Monte / Shell Game Extortion',
          description:
            'Gambling gangs on Westminster Bridge pretend to play shell games with fake winning accomplices to take tourists’ cash.',
          howToAvoid:
            'Never stop or place bets on street games; it is an orchestrated scam run by lookout gangs.'
        },
        {
          title: 'Unlicensed Pedicabs / Rickshaws Overcharging',
          description:
            'Novelty pedicabs in Soho and West End charge £100+ for a 10-minute ride without clear rate displays.',
          howToAvoid:
            'Always agree on the total price in writing before boarding, or use black cabs and London Underground.'
        }
      ]
    };
  }

  // =========================================================================
  // 11. FRANCE (Paris, Nice, etc.)
  // =========================================================================
  if (norm.includes('paris') || norm.includes('france') || norm.includes('nice') || norm.includes('lyon')) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'France',
      region: 'Europe',
      emergencyNumbers: [
        { label: 'European Universal Emergency', number: '112' },
        { label: 'Police Nationale (Secours)', number: '17' },
        { label: 'SAMU Medical Ambulance', number: '15' },
        { label: 'Sapeurs-Pompiers (Fire & Rescue)', number: '18' }
      ],
      safeNeighborhoods: ['Le Marais', 'Saint-Germain-des-Prés', '7th Arrondissement (Eiffel)', 'Latin Quarter'],
      cautionAreas: ['Gare du Nord surroundings late at night', 'Barbes-Rochechouart & isolated metro corridors'],
      commonScams: [
        {
          title: 'The String / Friendship Bracelet Trap',
          description:
            'Men at the base of Sacré-Cœur grab your wrist and weave a string bracelet, then aggressively demand €20-€50.',
          howToAvoid:
            'Keep your hands in your pockets when climbing Montmartre stairs; firmly say "Non merci".'
        },
        {
          title: 'The "Found Gold Ring" Trick',
          description:
            'Someone picks up a shiny brass ring off the sidewalk in front of you, claiming you dropped it and asking for cash reward.',
          howToAvoid:
            'Ignore the gesture completely and keep walking without breaking your stride.'
        },
        {
          title: 'Fake Charity Petition Boards',
          description:
            'Groups pretending to be deaf volunteers ask for petition signatures while an accomplice picks your pockets.',
          howToAvoid:
            'Never stop for clipboard petitions near the Eiffel Tower, Louvre courtyard, or Notre-Dame.'
        }
      ]
    };
  }

  // =========================================================================
  // 12. ITALY (Rome, Florence, Venice, Milan)
  // =========================================================================
  if (norm.includes('rome') || norm.includes('italy') || norm.includes('florence') || norm.includes('venice') || norm.includes('milan')) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'Italy',
      region: 'Europe',
      emergencyNumbers: [
        { label: 'Carabinieri & European Emergency', number: '112' },
        { label: 'Polizia di Stato', number: '113' },
        { label: 'Pronto Soccorso (Medical Ambulance)', number: '118' },
        { label: 'Vigili del Fuoco (Fire)', number: '115' }
      ],
      safeNeighborhoods: ['Trastevere', 'Piazza Navona', 'Monti', 'Prati (Vatican)', 'San Marco (Venice)'],
      cautionAreas: ['Termini Station outer plazas after 11 PM', 'Crowded Bus #64 and metro lines'],
      commonScams: [
        {
          title: 'Gladiator Photo Extortion',
          description:
            'Costumed gladiators outside the Colosseum pose with you enthusiastically, then aggressively demand €50 per person.',
          howToAvoid:
            'Costumed touts are officially banned around the monument; avoid posing with them.'
        },
        {
          title: 'Transit Pickpocketing Distractions',
          description:
            'Teams create a jostle or distraction when boarding metro Line A or Bus 64.',
          howToAvoid:
            'Wear cross-body bags with zipper clips and keep your phone secured inside your jacket.'
        }
      ]
    };
  }

  // =========================================================================
  // 13. SWITZERLAND (Zurich, Geneva, Interlaken, Zermatt)
  // =========================================================================
  if (norm.includes('swiss') || norm.includes('switzerland') || norm.includes('interlaken') || norm.includes('zermatt') || norm.includes('zurich') || norm.includes('geneva')) {
    return {
      advisoryLevel: 'Safe',
      country: 'Switzerland',
      region: 'Europe',
      emergencyNumbers: [
        { label: 'European & Swiss Emergency', number: '112' },
        { label: 'Police Assistance (Polizei)', number: '117' },
        { label: 'Medical Ambulance (Sanität)', number: '144' },
        { label: 'Rega Swiss Air Mountain Rescue', number: '1414' }
      ],
      safeNeighborhoods: ['Zermatt Village Center', 'Interlaken Höheweg', 'Zurich Old Town (Altstadt)', 'Geneva Lakefront'],
      cautionAreas: ['Glacier crevasse zones outside marked ski trails without certified alpine guide'],
      commonScams: [
        {
          title: 'Unofficial Alpine Shuttle Surcharges',
          description:
            'Private taxi vans at mountain stations charging exorbitant fares for routes covered by the Swiss Travel Pass.',
          howToAvoid:
            'Use the official SBB app for timetables; most rail and postbus connections are included in your pass.'
        }
      ]
    };
  }

  // =========================================================================
  // 14. JAPAN (Tokyo, Kyoto, Osaka)
  // =========================================================================
  if (norm.includes('tokyo') || norm.includes('japan') || norm.includes('kyoto') || norm.includes('osaka')) {
    return {
      advisoryLevel: 'Safe',
      country: 'Japan',
      region: 'Asia',
      emergencyNumbers: [
        { label: 'Police Assistance (Keisatsu)', number: '110' },
        { label: 'Ambulance & Fire (Kyukyu)', number: '119' },
        { label: 'Japan 24/7 Visitor Hotline (English)', number: '050-3816-2787' },
        { label: 'Tokyo Tourist Information Center', number: '03-5321-3077' }
      ],
      safeNeighborhoods: ['Ginza', 'Shibuya', 'Shinjuku (West)', 'Asakusa', 'Roppongi Hills', 'Gion (Kyoto)'],
      cautionAreas: ['Kabukicho back alleys with aggressive bar touts after midnight'],
      commonScams: [
        {
          title: 'Bottakuri (Exorbitant Bar Bill) Touts',
          description:
            'Street touts in Roppongi or Kabukicho promise cheap drinks, then present a ¥100,000+ bill with hidden seating fees.',
          howToAvoid:
            'Never follow street touts into basement bars; only patronize establishments recommended by verified directories.'
        },
        {
          title: 'Fake Buddhist Monk Donations',
          description:
            'Men dressed in robes hand out golden lucky talismans or peace cards and demand cash donations.',
          howToAvoid:
            'True Japanese Buddhist monks do not solicit cash on street corners; politely decline.'
        }
      ]
    };
  }

  // =========================================================================
  // 15. THAILAND (Bangkok, Phuket, Pattaya)
  // =========================================================================
  if (norm.includes('bangkok') || norm.includes('thailand') || norm.includes('phuket') || norm.includes('pattaya') || norm.includes('chiang mai')) {
    return {
      advisoryLevel: 'Safe',
      country: 'Thailand',
      region: 'Southeast Asia',
      emergencyNumbers: [
        { label: 'Tourist Police (English Speaking)', number: '1155' },
        { label: 'Universal Police Emergency', number: '191' },
        { label: 'Medical Ambulance Helpline', number: '1669' },
        { label: 'Fire & Rescue Operations', number: '199' }
      ],
      safeNeighborhoods: ['Siam', 'Sukhumvit (Asok / Phrom Phong)', 'Silom', 'Riverside', 'Old City'],
      cautionAreas: ['Patpong alleys after 1 AM', 'Unmetered taxis outside Grand Palace'],
      commonScams: [
        {
          title: '"The Grand Palace is Closed Today" Tuk-Tuk Scam',
          description:
            'Friendly tuk-tuk drivers outside temples tell you the palace is closed for a ceremony and offer to take you to a "special government gem market".',
          howToAvoid:
            'The Grand Palace is open daily; walk straight to the ticket counter and ignore street touts.'
        },
        {
          title: 'Jetski Pre-existing Damage Claim',
          description:
            'Jetski operators in Phuket or Pattaya accuse you of causing hull cracks and demand thousands of Baht.',
          howToAvoid:
            'Only rent jetskis through hotel-affiliated operators and photograph every scratch before riding.'
        }
      ]
    };
  }

  // =========================================================================
  // 16. UNITED ARAB EMIRATES (Dubai, Abu Dhabi)
  // =========================================================================
  if (norm.includes('dubai') || norm.includes('uae') || norm.includes('abu dhabi') || norm.includes('sharjah')) {
    return {
      advisoryLevel: 'Safe',
      country: 'United Arab Emirates',
      region: 'Middle East',
      emergencyNumbers: [
        { label: 'UAE Police Emergency', number: '999' },
        { label: 'Ambulance Support', number: '998' },
        { label: 'Civil Defence (Fire)', number: '997' },
        { label: 'Dubai Tourist Security Helpline', number: '800-4888' }
      ],
      safeNeighborhoods: ['Downtown Dubai', 'Dubai Marina', 'Jumeirah Beach Residence (JBR)', 'Palm Jumeirah', 'Business Bay'],
      cautionAreas: ['Deira back alleys late at night for solo travelers carrying visible valuables'],
      commonScams: [
        {
          title: 'Unauthorized Desert Safari Touts',
          description:
            'Independent street vendors in Deira sell dirt-cheap desert safaris that omit dune bashing, food, or insurance.',
          howToAvoid:
            'Book exclusively through certified DTCM tour companies with licensed 4x4 vehicles.'
        },
        {
          title: 'Counterfeit Perfume & Watch Hawkers',
          description:
            'Street touts in Gold Souk whispering about replica Swiss watches or branded oud perfumes in back alleys.',
          howToAvoid:
            'Never follow street hawkers into residential apartments or back alleys; purchase from registered Souk shops.'
        }
      ]
    };
  }

  // =========================================================================
  // 17. UNITED STATES (New York, Los Angeles, etc.)
  // =========================================================================
  if (norm.includes('new york') || norm.includes('usa') || norm.includes('united states') || norm.includes('los angeles') || norm.includes('chicago') || norm.includes('miami')) {
    return {
      advisoryLevel: 'Exercise Normal Caution',
      country: 'United States',
      region: 'North America',
      emergencyNumbers: [
        { label: 'Universal Emergency (Police / Fire / EMS)', number: '911' },
        { label: 'City Non-Emergency Information', number: '311' },
        { label: 'Poison Control Center', number: '1-800-222-1222' },
        { label: 'NYPD / City Tourist Desk', number: '212-343-4800' }
      ],
      safeNeighborhoods: ['Upper West Side', 'Greenwich Village', 'Hudson Yards', 'Battery Park City', 'Tribeca'],
      cautionAreas: ['Empty subway stations in outer boroughs late at night', 'Times Square alleys after midnight'],
      commonScams: [
        {
          title: 'Times Square CD / Mixtape Trap',
          description:
            'Aspiring artists thrust their music CD into your hands, ask for your name, write on it, and aggressively demand a $20 "donation".',
          howToAvoid:
            'Never accept items handed to you on sidewalks; keep your hands in your pockets and walk briskly.'
        },
        {
          title: 'Fake Broadway / Comedy Club Tickets',
          description:
            'Street scalpers outside major theaters selling invalid printout barcodes.',
          howToAvoid:
            'Purchase theater tickets exclusively through official TKTS booths or official box offices.'
        }
      ]
    };
  }

  // =========================================================================
  // 18. BALI & INDONESIA
  // =========================================================================
  if (norm.includes('bali') || norm.includes('indonesia') || norm.includes('jakarta') || norm.includes('ubud') || norm.includes('seminyak')) {
    return {
      advisoryLevel: 'Safe',
      country: 'Indonesia',
      region: 'Southeast Asia',
      emergencyNumbers: [
        { label: 'National Integrated Emergency', number: '112' },
        { label: 'Bali Tourist Police Desk', number: '+62-361-224111' },
        { label: 'Police Assistance', number: '110' },
        { label: 'Ambulance Support', number: '118' },
        { label: 'Search and Rescue (BASARNAS)', number: '115' }
      ],
      safeNeighborhoods: ['Ubud Center & Monkey Forest Road', 'Seminyak Beach Promenade', 'Sanur Waterfront', 'Nusa Dua Enclave'],
      cautionAreas: ['Isolated cliff lookouts after sunset', 'Unregulated money changer kiosks in back alleys'],
      commonScams: [
        {
          title: 'Rigged Money Changer Calculators',
          description:
            'Small unauthorized currency kiosks offer rates far above the market, then use rigged calculators or drop bills under the counter.',
          howToAvoid:
            'Exchange money only at authorized banks or BMC / Central Kuta counters with official CCTV and printed receipts.'
        },
        {
          title: 'Uluwatu Monkey Sunglasses Extortion',
          description:
            'Monkeys trained or encouraged to snatch sunglasses and phones, while touts charge ₹500–₹1,000 in local Rupiah to retrieve them with fruit.',
          howToAvoid:
            'Stow all sunglasses, hats, jewelry, and loose phones inside zipped bags before entering temple grounds.'
        }
      ]
    };
  }

  // =========================================================================
  // 19. GLOBAL INTERNATIONAL FALLBACK (Country-Aware Emergency Numbers)
  // =========================================================================
  const resolvedIso = resolveEmergencyCountryCode(raw);
  const countryEntry = resolvedIso && resolvedIso !== 'IN' ? COUNTRY_EMERGENCY_REGISTRY[resolvedIso] : undefined;

  const fallbackEmergencyNumbers = countryEntry
    ? [
        { label: `${countryEntry.countryName} Emergency (Police / Fire / Medical)`, number: countryEntry.universalOrPolice },
        ...(countryEntry.ambulance !== countryEntry.universalOrPolice
          ? [{ label: 'Emergency Medical / Ambulance', number: countryEntry.ambulance }]
          : []),
        ...(countryEntry.touristPoliceOrHelp
          ? [{ label: 'Non-Emergency / Tourist Assistance', number: countryEntry.touristPoliceOrHelp }]
          : []),
        { label: 'International Consular SOS', number: '+1-202-501-4444' }
      ]
    : [
        { label: 'Universal Emergency (EU / GSM)', number: '112' },
        { label: 'North America Emergency', number: '911' },
        { label: 'Consular & International SOS Helpline', number: '+1-202-501-4444' }
      ];

  return {
    advisoryLevel: 'Exercise Normal Caution',
    country: countryEntry?.countryName || canonical.country || 'International',
    region: countryEntry ? countryEntry.countryCode : 'Global',
    emergencyNumbers: fallbackEmergencyNumbers,
    safeNeighborhoods: ['City Center', 'Well-lit Pedestrian Promenades', 'Central Transit Hubs'],
    cautionAreas: ['Poorly-lit alleys after midnight', 'Unregulated unlicensed taxis without meters'],
    commonScams: [
      {
        title: 'Broken Taxi Meter Scam',
        description:
          'Taxis outside international transit hubs claim their digital meter is broken and demand exorbitant fixed rates.',
        howToAvoid:
          'Always use official airport taxi dispatch desks, licensed rideshare apps (Uber/Grab/Bolt), or agreed metered tariffs.'
      },
      {
        title: 'Spill / Distraction Pickpocket Trick',
        description:
          'Someone accidentally drops condiments or coins near you, offering to help clean your clothes while an accomplice steals your wallet.',
        howToAvoid:
          'Step back, keep your hands on your belongings, and walk away calmly without accepting assistance.'
      }
    ]
  };
}
