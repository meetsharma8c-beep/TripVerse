/**
 * TRIPVERSE CONCODE — TRANSPORT FEASIBILITY & RELIABILITY ENGINE
 * 
 * Enforces Principles 1-21 of the CONCODE Master Travel Reliability & Feasibility Prompt:
 * - NEVER Hallucinate Travel Availability
 * - Destination ≠ Station Resolution
 * - Complete Journey Feasibility (Origin -> Primary Transport -> Arrival Terminal -> Final Mile -> Destination)
 * - Source-Action Separation (Booking links are action links, NOT evidence of availability)
 * - Honesty About Uncertainty (Confirmed / Likely / Possible / Unavailable / Unknown)
 */

export type FeasibilityConfidence = 'CONFIRMED' | 'LIKELY' | 'POSSIBLE' | 'UNAVAILABLE' | 'UNKNOWN';

export interface TransitHubInfo {
  name: string;
  code?: string;
  distanceKm?: number;
  transferNotes?: string;
}

export interface DestinationTransitProfile {
  destination: string;
  hasDirectAirport: boolean;
  primaryAirport: TransitHubInfo | null;
  hasDirectTrain: boolean;
  primaryRailwayStation: TransitHubInfo | null;
  roadConnectivity: {
    status: 'all_weather_highway' | 'mountain_ghat' | 'seasonal_high_altitude' | 'expressway';
    notes: string;
  };
  requiresMultiModal: boolean;
  multiModalGuidance?: string;
}

export interface FeasibilityAssessment {
  mode: string;
  status: FeasibilityConfidence;
  isDirectPossible: boolean;
  actualArrivalHub: string;
  routeDecomposition: string;
  transferSteps: string[];
  explanation: string;
  estimatedDuration?: string;
  estimatedCostRange?: string;
  actionBookingNote: string;
  requiresUserVerification: string[];
  alternatives?: {
    mode: string;
    description: string;
    tradeoffs: string;
  }[];
}

/**
 * Curated knowledge base of destinations where Destination ≠ Station/Airport,
 * or where mountain/geographic barriers mandate specific multi-modal corridors.
 */
const DESTINATION_PROFILES: Record<string, DestinationTransitProfile> = {
  manali: {
    destination: 'Manali, Himachal Pradesh',
    hasDirectAirport: false,
    primaryAirport: {
      name: 'Kullu-Bhuntar Airport',
      code: 'KUU',
      distanceKm: 50,
      transferNotes: '~50 km south of Manali; road transfer takes ~1.5 to 2 hours by cab or local bus. Flights are weather-sensitive.'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Chandigarh Junction / Kalka',
      code: 'CDG / KLK',
      distanceKm: 310,
      transferNotes: 'No direct train reaches Manali. Broad-gauge rail terminates at Chandigarh (CDG, ~310 km) or Kalka (KLK, ~280 km), requiring ~7-9 hours by road via Kiratpur-Manali highway (NH3).'
    },
    roadConnectivity: {
      status: 'mountain_ghat',
      notes: 'Well-connected via NH3 four-lane expressway up to Pandoh/Aut. Atal Tunnel connects onward to Lahaul.'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'Rail travelers should book trains to Chandigarh or Ambala, then continue via overnight Volvo bus or private taxi to Manali.'
  },
  ladakh: {
    destination: 'Leh & Ladakh',
    hasDirectAirport: true,
    primaryAirport: {
      name: 'Kushok Bakula Rimpochee Airport, Leh',
      code: 'IXL',
      distanceKm: 5,
      transferNotes: 'Year-round commercial passenger airport. High-altitude acclimatization (48 hours rest) mandatory upon arrival.'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Jammu Tawi / Chandigarh (No Rail in Ladakh)',
      code: 'JAT / CDG',
      distanceKm: 700,
      transferNotes: 'No railway connection exists in Ladakh. Nearest railheads are Jammu Tawi (~700 km) or Chandigarh (~750 km).'
    },
    roadConnectivity: {
      status: 'seasonal_high_altitude',
      notes: 'Manali-Leh (NH3) and Srinagar-Leh (NH1) highways are strictly seasonal, typically opening June to October and closed in winter due to heavy snow.'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'Fly into Leh (IXL) for fastest access, or drive via Manali/Srinagar strictly during mid-June to September.'
  },
  leh: {
    destination: 'Leh, Ladakh',
    hasDirectAirport: true,
    primaryAirport: {
      name: 'Kushok Bakula Rimpochee Airport, Leh',
      code: 'IXL',
      distanceKm: 5,
      transferNotes: 'Direct flights from Delhi, Mumbai, Srinagar, and Jammu. Strict 48h acclimatization rule.'
    },
    hasDirectTrain: false,
    primaryRailwayStation: null,
    roadConnectivity: {
      status: 'seasonal_high_altitude',
      notes: 'Passes (Baralacha La, Tanglang La, Zoji La) closed mid-November through April.'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'Direct flight to Leh is the only confirmed winter transit.'
  },
  shimla: {
    destination: 'Shimla, Himachal Pradesh',
    hasDirectAirport: false,
    primaryAirport: {
      name: 'Chandigarh International Airport / Jubbarhatti',
      code: 'IXC / SLV',
      distanceKm: 120,
      transferNotes: 'Jubbarhatti (SLV, ~22 km) has limited regional flights. Major commercial flights operate via Chandigarh (IXC, ~120 km, ~3.5h drive).'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Kalka Railway Station (Broad Gauge) / Shimla (Narrow Gauge)',
      code: 'KLK / SML',
      distanceKm: 90,
      transferNotes: 'Broad-gauge trains from Delhi/major cities terminate at Kalka (KLK). From Kalka, passengers take the historic narrow-gauge toy train (~5h) or highway road transfer (~3h).'
    },
    roadConnectivity: {
      status: 'mountain_ghat',
      notes: 'Himalayan Expressway (NH5) four-lane corridor from Chandigarh to Shimla.'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'Mainline trains reach Kalka. Transfer by Himalayan toy train or scenic 3h highway drive.'
  },
  munnar: {
    destination: 'Munnar, Kerala',
    hasDirectAirport: false,
    primaryAirport: {
      name: 'Cochin International Airport',
      code: 'COK',
      distanceKm: 110,
      transferNotes: 'Nearest airport is Kochi (COK, ~110 km). Road transfer takes ~3.5 to 4 hours via scenic ghat road (NH85).'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Aluva / Ernakulam Junction',
      code: 'AWY / ERS',
      distanceKm: 110,
      transferNotes: 'No railway reaches Munnar. Mainline trains terminate at Aluva (AWY, ~110 km) or Ernakulam (ERS, ~125 km); road transfer is mandatory.'
    },
    roadConnectivity: {
      status: 'mountain_ghat',
      notes: 'Scenic western ghats winding mountain route via Kothamangalam & Adimali.'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'Take a train or flight to Kochi (Ernakulam/Aluva), then hire a private taxi or KSRTC bus to Munnar.'
  },
  ooty: {
    destination: 'Ooty (Udhagamandalam), Tamil Nadu',
    hasDirectAirport: false,
    primaryAirport: {
      name: 'Coimbatore International Airport',
      code: 'CJB',
      distanceKm: 88,
      transferNotes: 'Nearest major commercial airport is Coimbatore (CJB, ~88 km, ~3h drive).'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Mettupalayam (Broad Gauge) / Ooty (Toy Train)',
      code: 'MTP / UAM',
      distanceKm: 45,
      transferNotes: 'Broad-gauge rail terminates at Mettupalayam (MTP, ~45 km) or Coimbatore (CBE, ~85 km). Nilgiri Mountain Railway (UNESCO toy train) operates between MTP and Ooty.'
    },
    roadConnectivity: {
      status: 'mountain_ghat',
      notes: 'Steep hairpin curves through Nilgiri Ghat roads (via Coonoor or Kotagiri).'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'Travel to Coimbatore/Mettupalayam by train/flight, then continue by cab or the heritage Nilgiri toy train.'
  },
  rishikesh: {
    destination: 'Rishikesh, Uttarakhand',
    hasDirectAirport: false,
    primaryAirport: {
      name: 'Dehradun Jolly Grant Airport',
      code: 'DED',
      distanceKm: 21,
      transferNotes: 'Dehradun airport is ~21 km from Rishikesh; easily connected via 35-minute taxi drive.'
    },
    hasDirectTrain: true,
    primaryRailwayStation: {
      name: 'Yog Nagari Rishikesh / Haridwar Junction',
      code: 'YNRK / HW',
      distanceKm: 5,
      transferNotes: 'Yog Nagari Rishikesh (YNRK) handles select superfast trains. Haridwar Junction (HW, ~25 km) is the primary major railway hub.'
    },
    roadConnectivity: {
      status: 'all_weather_highway',
      notes: 'NH334 / Delhi-Dehradun expressway corridor.'
    },
    requiresMultiModal: false
  },
  nainital: {
    destination: 'Nainital, Uttarakhand',
    hasDirectAirport: false,
    primaryAirport: {
      name: 'Pantnagar Airport / Delhi IGI Airport',
      code: 'PGH / DEL',
      distanceKm: 70,
      transferNotes: 'Pantnagar (PGH, ~70 km) has limited flights. Delhi IGI (DEL, ~300 km) is the primary hub with ~6.5h road connection.'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Kathgodam Railway Station',
      code: 'KGM',
      distanceKm: 35,
      transferNotes: 'No railway reaches Nainital lake. Broad-gauge rail terminates at Kathgodam (KGM, ~35 km). Taxi or shared cab takes ~1 to 1.5 hours uphill.'
    },
    roadConnectivity: {
      status: 'mountain_ghat',
      notes: 'Winding uphill road from Kathgodam/Haldwani via Jeolikote.'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'Take an overnight train (e.g. Ranikhet Express / Shatabdi) to Kathgodam, then take a 35 km cab to Nainital.'
  },
  'mount abu': {
    destination: 'Mount Abu, Rajasthan',
    hasDirectAirport: false,
    primaryAirport: {
      name: 'Udaipur Dabok Airport / Ahmedabad Airport',
      code: 'UDR / AMD',
      distanceKm: 165,
      transferNotes: 'Udaipur (UDR, ~165 km) or Ahmedabad (AMD, ~220 km) serve as flight gateways.'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Abu Road Railway Station',
      code: 'ABR',
      distanceKm: 28,
      transferNotes: 'Mainline trains between Delhi/Ahmedabad/Mumbai stop at Abu Road (ABR). Road climb to Mount Abu town is ~28 km (~1 hour).'
    },
    roadConnectivity: {
      status: 'mountain_ghat',
      notes: '28 km winding hill road from Abu Road base station.'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'Book train to Abu Road (ABR), then take a registered hill taxi or state bus for the 28 km ascent.'
  },
  spiti: {
    destination: 'Spiti Valley (Kaza)',
    hasDirectAirport: false,
    primaryAirport: null,
    hasDirectTrain: false,
    primaryRailwayStation: null,
    roadConnectivity: {
      status: 'seasonal_high_altitude',
      notes: 'Extremely rugged trans-Himalayan high-altitude terrain. Kunzum Pass route from Manali is strictly seasonal (June-October). Shimla-Kaza route is open longer but subject to rockfalls.'
    },
    requiresMultiModal: true,
    multiModalGuidance: 'No airport or railway exists. Must travel by rugged high-clearance SUV/bus via Shimla-Reckong Peo or Manali-Atal Tunnel.'
  },
  kasol: {
    destination: 'Kasol (Parvati Valley), Himachal Pradesh',
    hasDirectAirport: false,
    primaryAirport: {
      name: 'Kullu-Bhuntar Airport',
      code: 'KUU',
      distanceKm: 31,
      transferNotes: 'Bhuntar airport is ~31 km away (~1 hour drive).'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Chandigarh / Una Himachal',
      code: 'CDG / UHL',
      distanceKm: 290,
      transferNotes: 'Broad-gauge rail terminates at Chandigarh or Una (~7-8 hours road transfer).'
    },
    roadConnectivity: {
      status: 'mountain_ghat',
      notes: 'Connected via Bhuntar-Manikaran road along the Parvati River.'
    },
    requiresMultiModal: true
  },
  dharamshala: {
    destination: 'Dharamshala & McLeod Ganj, Himachal Pradesh',
    hasDirectAirport: true,
    primaryAirport: {
      name: 'Kangra Airport, Gaggal',
      code: 'DHM',
      distanceKm: 15,
      transferNotes: 'Direct regional flights from Delhi and Chandigarh; ~15 km drive to Dharamshala.'
    },
    hasDirectTrain: false,
    primaryRailwayStation: {
      name: 'Pathankot Cantt Railway Station',
      code: 'PTKC',
      distanceKm: 85,
      transferNotes: 'Broad-gauge trains stop at Pathankot Cantt (PTKC, ~85 km, ~2.5-3h road transfer).'
    },
    roadConnectivity: {
      status: 'mountain_ghat',
      notes: 'Smooth NH154 highway connecting Pathankot/Kangra to Dharamshala.'
    },
    requiresMultiModal: true
  },
  goa: {
    destination: 'Goa (North & South)',
    hasDirectAirport: true,
    primaryAirport: {
      name: 'Dabolim Airport (GOI, South) / Mopa Manohar Intl (GOX, North)',
      code: 'GOI / GOX',
      distanceKm: 25,
      transferNotes: 'Mopa (GOX) is closer to North Goa beaches; Dabolim (GOI) is closer to Central/South Goa.'
    },
    hasDirectTrain: true,
    primaryRailwayStation: {
      name: 'Madgaon Junction (MAO) / Thivim (THVM)',
      code: 'MAO / THVM',
      distanceKm: 15,
      transferNotes: 'Thivim (THVM) is optimal for North Goa; Madgaon (MAO) is optimal for South Goa.'
    },
    roadConnectivity: {
      status: 'all_weather_highway',
      notes: 'NH66 coastal highway and NH48 expressway corridor.'
    },
    requiresMultiModal: false
  },
  udaipur: {
    destination: 'Udaipur, Rajasthan',
    hasDirectAirport: true,
    primaryAirport: {
      name: 'Maharana Pratap Airport, Dabok',
      code: 'UDR',
      distanceKm: 22,
      transferNotes: 'Domestic airport with direct flights from Delhi, Mumbai, Bengaluru, and Jaipur (~35 min cab to city center).'
    },
    hasDirectTrain: true,
    primaryRailwayStation: {
      name: 'Udaipur City Railway Station',
      code: 'UDZ',
      distanceKm: 3,
      transferNotes: 'Centrally located terminal with direct superfast trains to Delhi, Mumbai, Ahmedabad, and Jaipur.'
    },
    roadConnectivity: {
      status: 'expressway',
      notes: 'Four-lane national highways (NH48 / NH27).'
    },
    requiresMultiModal: false
  }
};

/**
 * Resolves any free-form destination string into its true geographic & transit context
 */
export function resolveTransitContext(rawDestination: string): DestinationTransitProfile {
  const norm = (rawDestination || '').toLowerCase().trim();

  // Exact or substring match in curated registry
  for (const [key, profile] of Object.entries(DESTINATION_PROFILES)) {
    if (norm.includes(key)) {
      return profile;
    }
  }

  // Generic fallback for major cities where destination is typically a direct station/airport
  const cleanName = rawDestination.split(',')[0].trim() || 'Destination';
  return {
    destination: cleanName,
    hasDirectAirport: true,
    primaryAirport: {
      name: `${cleanName} Airport`,
      transferNotes: 'Subject to commercial schedule verification.'
    },
    hasDirectTrain: true,
    primaryRailwayStation: {
      name: `${cleanName} Railway Station`,
      transferNotes: 'Subject to IRCTC route schedule verification.'
    },
    roadConnectivity: {
      status: 'all_weather_highway',
      notes: 'Check live road navigation and toll status.'
    },
    requiresMultiModal: false
  };
}

/**
 * Evaluates the feasibility of a transport mode for a given journey.
 * Never hallucinate travel availability. Separates EVIDENCE, VALIDATION, and ACTION.
 */
export function evaluateTransportFeasibility(
  mode: 'train' | 'flight' | 'bus' | 'car',
  rawOrigin: string,
  rawDestination: string,
  travelDate?: string
): FeasibilityAssessment {
  const profile = resolveTransitContext(rawDestination);
  const cleanOrigin = (rawOrigin || 'Origin').split(',')[0].trim();
  const cleanDest = profile.destination.split(',')[0].trim();
  const dateLabel = travelDate ? ` on ${travelDate}` : '';

  // 1. TRAIN FEASIBILITY
  if (mode === 'train') {
    if (!profile.hasDirectTrain) {
      const hub = profile.primaryRailwayStation;
      const hubName = hub ? hub.name : 'nearest major railhead';
      const hubNotes = hub ? hub.transferNotes : 'Road transfer required for final stretch.';

      return {
        mode: 'train',
        status: 'UNAVAILABLE',
        isDirectPossible: false,
        actualArrivalHub: hubName,
        routeDecomposition: `${cleanOrigin} → Train → ${hubName} → Road Transfer (Bus/Taxi) → ${cleanDest}`,
        transferSteps: [
          `Board train at ${cleanOrigin} to ${hubName}`,
          `Alight at ${hubName}`,
          `Take road transfer (bus or private taxi, ~${hub?.distanceKm || 'multi-hour'} km) to ${cleanDest}`
        ],
        explanation: `No direct railway line reaches ${cleanDest}. Broad-gauge rail terminates at ${hubName}. ${hubNotes}`,
        actionBookingNote: `Use the official IRCTC portal to check train schedules to ${hubName} (not ${cleanDest}).`,
        requiresUserVerification: [
          `Verify train seat availability on IRCTC for the route ${cleanOrigin} to ${hubName}`,
          `Arrange onwards bus or taxi from ${hubName} to ${cleanDest}`
        ],
        alternatives: [
          {
            mode: 'bus',
            description: `Direct or semi-direct intercity bus from ${cleanOrigin} to ${cleanDest}`,
            tradeoffs: 'Avoids changing transport at railway station; longer continuous road journey.'
          },
          {
            mode: 'car',
            description: `Private AC cab or self-drive door-to-door from ${cleanOrigin} to ${cleanDest}`,
            tradeoffs: 'Highest convenience and flexibility; higher cost than train.'
          }
        ]
      };
    }

    return {
      mode: 'train',
      status: 'LIKELY',
      isDirectPossible: true,
      actualArrivalHub: profile.primaryRailwayStation?.name || `${cleanDest} Railway Station`,
      routeDecomposition: `${cleanOrigin} → Direct Train → ${profile.primaryRailwayStation?.name || cleanDest}`,
      transferSteps: [`Board train at ${cleanOrigin}`, `Alight at ${profile.primaryRailwayStation?.name || cleanDest}`],
      explanation: `Direct rail connection exists between ${cleanOrigin} and ${cleanDest}${dateLabel}. Real-time seat confirmation requires live IRCTC lookup.`,
      actionBookingNote: 'Official IRCTC booking portal — use to check current seat availability.',
      requiresUserVerification: [
        'Check real-time train running status and quota availability on IRCTC.'
      ]
    };
  }

  // 2. FLIGHT FEASIBILITY
  if (mode === 'flight') {
    if (!profile.hasDirectAirport) {
      const airport = profile.primaryAirport;
      const airportName = airport ? airport.name : 'nearest regional airport';

      return {
        mode: 'flight',
        status: 'POSSIBLE',
        isDirectPossible: false,
        actualArrivalHub: airportName,
        routeDecomposition: `${cleanOrigin} Airport → Flight → ${airportName} → Road Transfer → ${cleanDest}`,
        transferSteps: [
          `Fly from ${cleanOrigin} Airport to ${airportName}`,
          `Road transfer from ${airportName} (~${airport?.distanceKm || '40-100'} km) to ${cleanDest}`
        ],
        explanation: `${cleanDest} does not have a primary commercial passenger airport. Nearest practical gateway is ${airportName}. ${airport?.transferNotes || ''}`,
        actionBookingNote: `Search flight connections to ${airportName} (${airport?.code || ''}) on Google Flights / airline portals.`,
        requiresUserVerification: [
          `Check flight schedules to ${airportName} for ${dateLabel || 'your date'}`,
          `Verify onwards road transfer availability from ${airportName}`
        ]
      };
    }

    return {
      mode: 'flight',
      status: 'LIKELY',
      isDirectPossible: true,
      actualArrivalHub: profile.primaryAirport?.name || `${cleanDest} Airport`,
      routeDecomposition: `${cleanOrigin} Airport → Direct/Connecting Flight → ${profile.primaryAirport?.name || cleanDest}`,
      transferSteps: [`Fly from ${cleanOrigin} Airport to ${profile.primaryAirport?.name || cleanDest}`],
      explanation: `Commercial airport exists at ${cleanDest}. Direct or 1-stop flights operate depending on carrier schedules.`,
      actionBookingNote: 'Check live airline schedules and current seat availability on Google Flights.',
      requiresUserVerification: [
        'Check specific departure times and baggage policies for your selected date.'
      ]
    };
  }

  // 3. BUS FEASIBILITY
  if (mode === 'bus') {
    return {
      mode: 'bus',
      status: 'LIKELY',
      isDirectPossible: true,
      actualArrivalHub: `${cleanDest} Intercity Bus Terminal`,
      routeDecomposition: `${cleanOrigin} Bus Station → Intercity Bus → ${cleanDest}`,
      transferSteps: [`Board bus at ${cleanOrigin}`, `Alight at ${cleanDest} Bus Terminal`],
      explanation: `Intercity bus services (Government state transport and private AC sleeper/semi-sleeper operators) typically connect to ${cleanDest}.`,
      actionBookingNote: 'Official redBus portal — check operational schedules and boarding points.',
      requiresUserVerification: [
        'Confirm boarding point location and luggage space with bus operator.'
      ]
    };
  }

  // 4. CAR / CAB FEASIBILITY
  const isWinterDate = travelDate ? (
    /-(11|12|01|02|03|04)-/.test(travelDate) ||
    /\b(nov|dec|jan|feb|mar|apr)/i.test(travelDate) ||
    /20\d\d-(11|12|01|02|03|04)/.test(travelDate)
  ) : false;

  const isHighAltitudeSeasonal = profile.roadConnectivity.status === 'seasonal_high_altitude';
  const winterRoadClosed = isHighAltitudeSeasonal && isWinterDate;

  return {
    mode: 'car',
    status: winterRoadClosed ? 'UNAVAILABLE' : isHighAltitudeSeasonal ? 'POSSIBLE' : 'CONFIRMED',
    isDirectPossible: !winterRoadClosed,
    actualArrivalHub: `${cleanDest} (Door-to-door)`,
    routeDecomposition: `${cleanOrigin} → Highway / Road Network → ${cleanDest}`,
    transferSteps: ['Direct door-to-door travel with rest stops as required.'],
    explanation: winterRoadClosed
      ? `CRITICAL SEASONAL WARNING: Road travel to ${cleanDest} is generally impossible or closed in winter (${travelDate || 'winter months'}) due to heavy snowfall and closure of high mountain passes. Commercial flight to ${profile.primaryAirport?.name || 'regional airport'} is the only verified all-weather connection.`
      : `Road travel is practical. ${profile.roadConnectivity.notes}`,
    actionBookingNote: winterRoadClosed
      ? 'Road travel unavailable during winter. Switch to direct air travel.'
      : 'Official car rental / cab reservation portals — check rates for door-to-door hire.',
    requiresUserVerification: [
      isHighAltitudeSeasonal
        ? `Verify pass status (BRO road bulletins), weather alerts, and 4x4 snow chain requirements for ${travelDate || 'your journey'}.`
        : 'Check live toll rates and highway conditions.'
    ],
    alternatives: winterRoadClosed && profile.hasDirectAirport ? [
      {
        mode: 'flight',
        description: `Direct commercial flight into ${profile.primaryAirport?.name || cleanDest}`,
        tradeoffs: 'All-weather operational gateway in winter; strictly observe 48-hour acclimatization.'
      }
    ] : undefined
  };
}
