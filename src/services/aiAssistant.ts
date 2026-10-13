import { 
  Trip, 
  ChatMessage, 
  DayPlan, 
  BreakStop, 
  RouteType, 
  ExpenseItem, 
  ExpenseCategory, 
  PackingItem, 
  ItineraryActivity 
} from '../types/trip';
import { queryConcodeBrain } from './concodeBrainService';
import { generateAITrip } from './plannerEngine';
import { generateTransportDeals } from './dealService';
import { evaluateTransportFeasibility, resolveTransitContext } from './transportFeasibilityEngine';
import { 
  loadTrips, 
  loadTripExpenses, 
  saveTripExpenses, 
  loadTripPacking, 
  saveTripPacking 
} from './storageService';

export type AIAppActionType =
  | 'UPDATE_TRIP'
  | 'SWITCH_TAB'
  | 'START_NAVIGATION'
  | 'OPEN_MODAL'
  | 'GENERATE_NEW_TRIP'
  | 'SWITCH_ACTIVE_TRIP'
  | 'DELETE_TRIP'
  | 'ADD_EXPENSE'
  | 'ADD_PACKING_ITEM';

export interface AIAppAction {
  type: AIAppActionType;
  payload?: any;
}

export interface AssistantResponse {
  message: ChatMessage;
  updatedTrip?: Trip;
  appAction?: AIAppAction;
}

export function processUserChatQuery(query: string, currentTrip: Trip): AssistantResponse {
  const normalized = query.toLowerCase().trim();
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const rawDest = (currentTrip.destination && currentTrip.destination !== 'Custom Spot') ? currentTrip.destination : '';
  const cleanDest = (rawDest || currentTrip.name || 'your destination').split(',')[0].trim();
  const cleanOrigin = (currentTrip.origin && currentTrip.origin !== 'Origin') ? currentTrip.origin.split(',')[0].trim() : 'your origin';

  // 1. LIVE TURN-BY-TURN GPS NAVIGATION HUD
  if (
    normalized.includes('navigation') ||
    normalized.includes('navigate') ||
    normalized.includes('start gps') ||
    normalized.includes('open gps') ||
    normalized.includes('turn by turn') ||
    normalized.includes('launch hud') ||
    normalized.includes('drive now')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Open live navigation**\n\n` +
          `TripVerse does not provide turn-by-turn directions, live traffic, speed-limit detection, or toll-lane guidance. Opening an external navigation app for ${cleanOrigin} → ${cleanDest}.`,
        timestamp,
        actionButtons: [
          { label: 'Highway Safety & SOS', action: 'SAFETY_CHECK' },
          { label: 'View mapped place listings', action: 'VIEW_ITINERARY' }
        ]
      },
      appAction: {
        type: 'START_NAVIGATION'
      }
    };
  }

  // 2. TRIP REPLANNING, DISRUPTION & EMERGENCY STAYS
  if (
    normalized.includes('replan') ||
    normalized.includes('disrupt') ||
    normalized.includes('cancel') ||
    normalized.includes('emergency stay') ||
    normalized.includes('refund') ||
    normalized.includes('affected') ||
    (normalized.includes('flight') && (normalized.includes('cancel') || normalized.includes('delay') || normalized.includes('bad'))) ||
    (normalized.includes('train') && (normalized.includes('cancel') || normalized.includes('delay'))) ||
    (normalized.includes('weather') && (normalized.includes('bad') || normalized.includes('warning') || normalized.includes('alert') || normalized.includes('storm')))
  ) {
    const isEmergencyStay = normalized.includes('stay') || normalized.includes('hotel') || normalized.includes('shelter');
    const isRefund = normalized.includes('refund') || normalized.includes('policy') || normalized.includes('waiver');

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `TripVerse can help draft alternative plans for ${cleanDest}, but it does not monitor live disruptions, make bookings, or submit refund claims.\n\n` +
          `• Search external accommodation listings and verify safety, availability, price, and terms directly.\n` +
          `• Contact the transport or booking provider shown on your confirmation for current status and refund eligibility.\n` +
          `• Replanning suggestions are estimates; check weather and travel conditions with official sources before acting.\n\n` +
          `Opening Trip Replanning options...`,
        timestamp,
        actionButtons: [
          { label: 'Replan My Trip', action: 'OPEN_REPLANNING' },
          { label: 'Nearby Emergency Stays', action: 'OPEN_EMERGENCY_STAY' },
          { label: 'Refund Policy Docket', action: 'OPEN_REFUND_INFO' }
        ]
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: {
          modal: 'replanning',
          screen: isEmergencyStay ? 3 : (isRefund ? 'refund' : 2)
        }
      }
    };
  }

  // 3. DIRECT TRIP CREATION VIA CHAT (e.g., "Plan a trip to Manali for 4 days")
  if (
    (normalized.startsWith('plan a trip') || normalized.startsWith('plan trip') || normalized.startsWith('create a trip') || normalized.startsWith('create trip')) &&
    (normalized.includes('to ') || normalized.includes('for '))
  ) {
    const destMatch = normalized.match(/(?:to|for)\s+([a-zA-Z\s]+?)(?:\s+(?:for|from|with|budget)|$)/i);
    const targetDest = destMatch && destMatch[1] ? destMatch[1].trim() : 'Manali';
    
    // Extract duration if mentioned (e.g. "for 4 days")
    const durationMatch = normalized.match(/(\d+)\s*(?:days|day)/i);
    const durationDays = durationMatch ? Math.max(1, Math.min(10, parseInt(durationMatch[1]))) : 3;

    // Extract budget if mentioned (e.g. "with 15000 budget", "₹12,000")
    const budgetMatch = normalized.match(/(?:₹|rs\.?|inr|budget\s*(?:of|is)?)\s*([\d,]+)/i);
    const budgetAmount = budgetMatch ? parseInt(budgetMatch[1].replace(/,/g, '')) : 12000;

    const newTrip = generateAITrip({
      origin: currentTrip.origin || 'Ahmedabad, Gujarat',
      destination: targetDest,
      destinationName: targetDest.charAt(0).toUpperCase() + targetDest.slice(1),
      durationDays,
      travelersCount: currentTrip.travelersCount || 2,
      travelerType: currentTrip.travelerType || 'friends',
      budgetMode: 'total',
      budgetAmount,
      preferences: currentTrip.preferences || ['nature', 'scenic'],
      transportMode: currentTrip.transportMode || 'car',
      accommodationType: currentTrip.accommodationType || 'hotel',
      foodPreference: currentTrip.foodPreference || 'all',
      priorities: currentTrip.priorities || ['nature', 'food']
    });

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Created New Journey to ${newTrip.destination}!**\n\n` +
          `• **Duration:** ${newTrip.durationDays} Days (${newTrip.travelersCount} Travelers)\n` +
          `• **Route Corridor:** ${newTrip.origin.split(',')[0]} → ${newTrip.destination.split(',')[0]}\n` +
          `• **Estimated Budget:** ₹${newTrip.estimatedTotal.toLocaleString('en-IN')} (Target: ₹${newTrip.totalBudget.toLocaleString('en-IN')})\n` +
          `• **Pace & Sights:** ${newTrip.itinerary.length} curated day plans with morning sights, heritage visits, and sunset overlooks.\n\n` +
          `Switched your dashboard to your new ${newTrip.destination.split(',')[0]} expedition!`,
        timestamp,
        actionButtons: [
          { label: 'Check Weather & Road Alerts', action: 'CHECK_WEATHER' },
          { label: 'Start GPS Navigation', action: 'START_NAV' },
          { label: 'Optimize Budget', action: 'MAKE_CHEAPER' }
        ]
      },
      appAction: {
        type: 'GENERATE_NEW_TRIP',
        payload: { trip: newTrip }
      }
    };
  }

  // 4. PRINTABLE TRAVEL GUIDE / PDF EXPORT
  if (
    normalized.includes('print') ||
    normalized.includes('pdf') ||
    normalized.includes('download guide') ||
    normalized.includes('travel guide') ||
    normalized.includes('export itinerary') ||
    normalized.includes('export guide')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Generating Official TripVerse Travel Guide for ${cleanDest}!**\n\n` +
          `• **Contents:** Complete day-by-day itinerary, toll tax budgets, emergency contacts, dining stops, and packing checklist.\n` +
          `• **Format:** High-resolution offline document formatted for mobile viewing or direct printing.\n\n` +
          `Opening the Travel Guide export modal now...`,
        timestamp,
        actionButtons: [
          { label: 'Share with Travel Buddy', action: 'OPEN_SHARE' },
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' }
        ]
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'print' }
      }
    };
  }

  // 5. SHARE TRIP / COLLABORATION
  if (
    normalized.includes('share') ||
    normalized.includes('collaborate') ||
    normalized.includes('invite') ||
    normalized.includes('send to friend')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Trip Sharing & Collaboration Docket Ready!**\n\n` +
          `• Generate your live shareable link or scan QR code to collaborate on ${cleanDest} with friends and family.\n\n` +
          `Opening Share Modal now...`,
        timestamp,
        actionButtons: [
          { label: 'Print Travel Guide', action: 'OPEN_PRINT' },
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' }
        ]
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'share' }
      }
    };
  }

  // 6. PHOTO JOURNAL & TRIP MEMORIES
  if (
    normalized.includes('photo') ||
    normalized.includes('scrapbook') ||
    normalized.includes('journal') ||
    normalized.includes('memories')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Opening Trip Photo Journal & Memory Scrapbook for ${cleanDest}!**\n\n` +
          `Upload geotagged road trip snapshots, polaroids, and notes to preserve your travel milestones.\n\n` +
          `Opening Photo Journal now...`,
        timestamp,
        actionButtons: [
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' },
          { label: 'Share Trip', action: 'OPEN_SHARE' }
        ]
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'photos' }
      }
    };
  }

  // 7. WRITE REVIEW & RATINGS
  if (
    normalized.includes('review') ||
    normalized.includes('rate') ||
    normalized.includes('feedback')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Post-Trip Review & Feedback Hub:**\n\n` +
          `Rate your overall experience, highway condition, havelis, and food dhabas for ${cleanDest}.\n\n` +
          `Opening Review Modal now...`,
        timestamp
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'review' }
      }
    };
  }

  // 8. NOTIFICATIONS & COUNTDOWN ALERTS
  if (
    normalized.includes('notification') ||
    normalized.includes('alert') ||
    normalized.includes('countdown')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Notification & Travel Briefing Center:**\n\n` +
          `View departure countdowns, FASTag balance alerts, and highway patrol advisory broadcasts.\n\n` +
          `Opening Notification Center now...`,
        timestamp
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'notifications' }
      }
    };
  }

  // 9. SIGN IN / ACCOUNT SESSION
  if (
    normalized.includes('sign in') ||
    normalized.includes('login') ||
    normalized.includes('register') ||
    normalized.includes('create account')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**TripVerse Account Session & Cloud Sync:**\n\n` +
          `Sign in to automatically sync your trips, passport stamps, and custom itineraries across all your devices.\n\n` +
          `Opening Sign In Modal now...`,
        timestamp
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'auth' }
      }
    };
  }

  // 10. SCREEN & TAB SWITCHING COMMANDS
  if (
    normalized.includes('show map') ||
    normalized.includes('view map') ||
    normalized.includes('route map') ||
    normalized.includes('open map')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Switching to Interactive Route Map:**\n\n` +
          `Displaying full highway corridor from ${cleanOrigin} to ${cleanDest} with pitstops, tolls, and elevation profiles.`,
        timestamp,
        actionButtons: [
          { label: 'Start GPS Navigation', action: 'START_NAV' },
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' }
        ]
      },
      appAction: {
        type: 'SWITCH_TAB',
        payload: { tab: 'trips', subTab: 'route' }
      }
    };
  }

  // 7A. HOTEL & ACCOMMODATION BOOKING
  if (
    normalized.includes('hotel') ||
    normalized.includes('stay') ||
    normalized.includes('resort') ||
    normalized.includes('hostel') ||
    normalized.includes('lodging') ||
    normalized.includes('where to stay') ||
    normalized.includes('book room')
  ) {
    const hotel = currentTrip.selectedHotel;
    const hotelName = hotel?.name || `${cleanDest} Heritage Stay`;
    const hotelRate = hotel?.nightlyRate ? `₹${hotel.nightlyRate.toLocaleString('en-IN')}/night` : `₹${Math.round(currentTrip.budgetBreakdown.accommodation / Math.max(1, currentTrip.durationDays))}/night`;

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Verified Stays & Room Booking for ${cleanDest}:**\n\n` +
          `• **Selected Property:** ${hotelName} (${hotel?.starRating || 4}★)\n` +
          `• **Location:** ${hotel?.address || hotel?.neighborhood || `${cleanDest} City Center`}\n` +
          `• **Estimated Rate:** ${hotelRate}\n` +
          (hotel?.amenities?.length ? `• **Amenities:** ${hotel.amenities.slice(0, 4).join(', ')}\n` : '') +
          `• **Booking Partner:** Pre-configured deep-links available for **Booking.com** and **Google Hotels** with your exact dates.\n\n` +
          `Opening the Booking & Ticketing Center to view room availability and partner links...`,
        timestamp,
        actionButtons: [
          { label: 'Book Stay on Booking.com', action: 'OPEN_BOOKING', primary: true },
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' },
          { label: 'Make Trip Cheaper', action: 'MAKE_CHEAPER' }
        ]
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'booking' }
      }
    };
  }

  // 7B. FLIGHT, TRAIN & BUS TICKETING / TRANSPORT DEALS (CONCODE FEASIBILITY ENGINE)
  if (
    normalized.includes('ticket') ||
    normalized.includes('train') ||
    normalized.includes('flight') ||
    normalized.includes('bus') ||
    normalized.includes('deal') ||
    normalized.includes('transport') ||
    normalized.includes('booking') ||
    normalized.includes('buy ticket')
  ) {
    const rawMode = currentTrip.transportMode;
    const requestedMode: 'train' | 'flight' | 'bus' | 'car' = 
      normalized.includes('train') ? 'train' :
      (normalized.includes('flight') || normalized.includes('air')) ? 'flight' :
      normalized.includes('bus') ? 'bus' : 
      rawMode === 'train' || rawMode === 'flight' || rawMode === 'bus' ? rawMode : 'car';

    const feasibility = evaluateTransportFeasibility(requestedMode, cleanOrigin, cleanDest);
    const deal = currentTrip.bestTransportDeal || currentTrip.transportDeals?.[0];
    const dealPrice = deal?.dealPrice ? `₹${deal.dealPrice.toLocaleString('en-IN')}` : 'Market Fare Range';

    let feasibilityText = `**CONCODE Transport Feasibility Audit for ${cleanOrigin} → ${cleanDest} (${requestedMode.toUpperCase()}):**\n\n` +
      `• **Feasibility Status:** ${feasibility.status}\n` +
      `• **Verified Corridor:** ${feasibility.routeDecomposition}\n` +
      `• **Logistics Assessment:** ${feasibility.explanation}\n`;

    if (!feasibility.isDirectPossible) {
      feasibilityText += `• **Notice:** Direct ${requestedMode} does NOT reach ${cleanDest}. Broad-gauge rail or commercial flights terminate at **${feasibility.actualArrivalHub}**. Final-mile road transfer (~${feasibility.transferSteps[feasibility.transferSteps.length - 1]}) is mandatory.\n`;
    }

    feasibilityText += `• **Estimated Fare Range:** ${dealPrice} (Group estimate; seat prices fluctuate dynamically)\n` +
      `• **Action / Booking Portals:** ${feasibility.actionBookingNote}\n\n` +
      `*Action links connect directly to official operators (IRCTC / Google Flights / redBus) to verify live seat availability for this segment.*`;

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: feasibilityText,
        timestamp,
        actionButtons: [
          { label: 'Open Booking Action Center', action: 'OPEN_BOOKING', primary: true },
          { label: 'View Multi-Modal Route', action: 'VIEW_ROUTE' },
          { label: 'Audit Budget', action: 'MAKE_CHEAPER' }
        ]
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'booking' }
      }
    };
  }

  // 7C. SCHEDULE PACING TUNING (Relaxed vs Fast-Paced)
  if (
    normalized.includes('pace') ||
    normalized.includes('pacing') ||
    normalized.includes('relax') ||
    normalized.includes('slow down') ||
    normalized.includes('fast pace') ||
    normalized.includes('packed') ||
    normalized.includes('early morning')
  ) {
    const isRelaxed = normalized.includes('relax') || normalized.includes('slow');
    const newPace: 'relaxed' | 'fast_paced' = isRelaxed ? 'relaxed' : 'fast_paced';

    const updated = { ...currentTrip, pacing: newPace };
    if (updated.itinerary?.length) {
      updated.itinerary = updated.itinerary.map(day => {
        return {
          ...day,
          title: day.title.replace(/\((relaxed|balanced|fast_paced)\s*pace\)/i, `(${newPace.replace('_', ' ')} pace)`),
          activities: day.activities.map(act => {
            if (act.type === 'departure' && act.tag === 'Start Point') {
              return { ...act, time: isRelaxed ? '9:00 AM' : '6:00 AM', title: isRelaxed ? `Leisurely Departure from ${cleanOrigin}` : `Early Sunrise Departure from ${cleanOrigin}` };
            }
            if (act.type === 'food' && act.tag === 'Breakfast') {
              return { ...act, time: isRelaxed ? '9:15 AM' : '7:15 AM' };
            }
            if (act.type === 'food' && act.tag === 'Lunch') {
              return { ...act, time: isRelaxed ? '2:15 PM' : '1:00 PM' };
            }
            if (act.type === 'food' && act.tag === 'Dinner') {
              return { ...act, time: isRelaxed ? '9:15 PM' : '8:30 PM' };
            }
            return act;
          })
        };
      });
    }

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Schedule Pacing Adjusted to ${isRelaxed ? 'Relaxed Leisure' : 'Fast-Paced Explorer'}!**\n\n` +
          (isRelaxed
            ? `• **Morning Wake-up:** Departures and breakfast shifted to 9:00–9:30 AM.\n` +
              `• **Cadence:** 2–3 prime attractions per day with afternoon lounge and unhurried dining.\n` +
              `• **Evenings:** Extended sunset walks and late dinners under the stars.\n\n`
            : `• **Sunrise Starts:** Days kick off at 6:00–6:30 AM to beat tourist crowds.\n` +
              `• **Cadence:** Action-packed sightseeing across morning, afternoon, and golden hour.\n` +
              `• **Evenings:** Night bazaars and cultural events for maximum exploration.\n\n`) +
          `Your itinerary schedule and timeline have been recalculated!`,
        timestamp,
        actionButtons: [
          { label: 'View Updated Itinerary', action: 'VIEW_ITINERARY', primary: true },
          { label: 'Book Tickets & Stays', action: 'OPEN_BOOKING' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  if (
    normalized.includes('show packing') ||
    normalized.includes('view packing') ||
    normalized.includes('open packing') ||
    ((normalized.includes('packing list') || normalized.includes('what to pack')) && !normalized.includes('add') && !normalized.startsWith('pack '))
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Opening Weather-Aligned Packing Checklist:**\n\n` +
          `Smart checklist tailored for ${cleanDest}'s climate and terrain with essentials, gear, and medication.`,
        timestamp,
        actionButtons: [
          { label: 'Check Live Weather', action: 'CHECK_WEATHER' },
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' }
        ]
      },
      appAction: {
        type: 'SWITCH_TAB',
        payload: { tab: 'trips', subTab: 'packing' }
      }
    };
  }

  if (
    normalized.includes('show expenses') ||
    normalized.includes('expense tracker') ||
    normalized.includes('cost breakdown')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Switching to Real-Time Budget & Expense Ledger:**\n\n` +
          `Total Budget: ₹${currentTrip.totalBudget.toLocaleString('en-IN')} • Estimated: ₹${currentTrip.estimatedTotal.toLocaleString('en-IN')}`,
        timestamp,
        actionButtons: [
          { label: 'Make Trip Cheaper', action: 'MAKE_CHEAPER' },
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' }
        ]
      },
      appAction: {
        type: 'SWITCH_TAB',
        payload: { tab: 'trips', subTab: 'expenses' }
      }
    };
  }

  if (
    normalized.includes('hidden gems') ||
    normalized.includes('secret spots')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Opening Offbeat Hidden Gems for ${cleanDest}:**\n\n` +
          `Discovering uncrowded photography vistas, secluded lakes, and artisanal workshops.`,
        timestamp
      },
      appAction: {
        type: 'SWITCH_TAB',
        payload: { tab: 'trips', subTab: 'gems' }
      }
    };
  }

  if (
    normalized.includes('show itinerary') ||
    normalized.includes('view itinerary') ||
    normalized.includes('day by day') ||
    normalized.includes('schedule')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Switching to Day-by-Day Itinerary Schedule for ${cleanDest}:**`,
        timestamp,
        actionButtons: [
          { label: 'Add Waypoint', action: 'ADD_MOUNT_ABU' },
          { label: 'Start GPS Nav', action: 'START_NAV' }
        ]
      },
      appAction: {
        type: 'SWITCH_TAB',
        payload: { tab: 'trips', subTab: 'itinerary' }
      }
    };
  }

  if (
    normalized.includes('go to profile') ||
    normalized.includes('open profile') ||
    normalized.includes('my profile')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Navigating to Your Explorer Profile:**`,
        timestamp
      },
      appAction: {
        type: 'SWITCH_TAB',
        payload: { tab: 'profile' }
      }
    };
  }

  if (
    normalized.includes('go to explore') ||
    normalized.includes('discover destinations')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Navigating to Explore Hub:**`,
        timestamp
      },
      appAction: {
        type: 'SWITCH_TAB',
        payload: { tab: 'explore' }
      }
    };
  }

  // 11. WEATHER & CLIMATE TELEMETRY
  if (
    normalized.includes('weather') ||
    normalized.includes('forecast') ||
    normalized.includes('temp') ||
    normalized.includes('temperature') ||
    (normalized.includes('rain') && !normalized.includes('train')) ||
    normalized.includes('rainfall') ||
    normalized.includes('climate') ||
    normalized.includes('aqi') ||
    normalized.includes('snow') ||
    normalized.includes('mist') ||
    normalized.includes('fog')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `I don't have a live forecast or verified road advisory in this chat response for ${currentTrip.destination}. Open the trip weather view to request a current forecast where coordinates and provider coverage are available. Check official weather and road-authority updates before travelling.`,
        timestamp,
        actionButtons: [
          { label: 'Check Weather Forecast', action: 'CHECK_WEATHER' },
          { label: 'View Packing Checklist', action: 'VIEW_PACKING' },
          { label: 'Review Route Safety Guidance', action: 'SAFETY_CHECK' }
        ]
      }
    };
  }

  // 12. WAYPOINTS & DETOURS (e.g., Mount Abu, Kumbhalgarh, Pushkar)
  if (
    normalized.includes('mount abu') ||
    normalized.includes('abu') ||
    normalized.includes('waypoint') ||
    normalized.includes('detour') ||
    normalized.includes('stopover')
  ) {
    const updated = { ...currentTrip };
    const hasAbu = updated.breakStops.some(s => s.name.toLowerCase().includes('abu'));
    
    if (!hasAbu) {
      const newStop: BreakStop = {
        id: `stop-abu-${Date.now()}`,
        name: 'Mount Abu Scenic Hill Overlook',
        category: 'scenic_rest_stop',
        rating: 4.8,
        reviewCount: 412,
        detourDistanceKm: 18,
        distanceFromStartKm: 215,
        foodAvailable: true,
        washroomAvailable: true,
        parkingAvailable: true,
        restAreaAvailable: true,
        fuelStationAvailable: true,
        evChargingAvailable: true,
        openingHours: '6:00 AM - 9:00 PM',
        estimatedStopMinutes: 90,
        image: 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80',
        description: 'Panoramic Aravalli valley viewpoints, Nakki Lake sunset walk, and ancient Dilwara marble temples.',
        recommendationReason: 'Highest peak of the Aravalli range with cool mountain air and scenic sunset points.',
        coordinates: { lat: 24.5926, lng: 72.7156 },
        addedToTrip: true
      };
      updated.breakStops = [...updated.breakStops, newStop];
      updated.estimatedTotal += 1200;
      updated.budgetBreakdown = {
        ...updated.budgetBreakdown,
        transportation: updated.budgetBreakdown.transportation + 800,
        activities: updated.budgetBreakdown.activities + 400
      };
    }

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Added Mount Abu Scenic Hill Waypoint to Your Route!**\n\n` +
          `• **Detour Details:** +120 km scenic mountain driving through lush Aravalli ghats.\n` +
          `• **Highlights:** Sunset Point at Nakki Lake, toad rock overlook, and ancient marble Dilwara Temples.\n` +
          `• **Cost & Time:** ~2h additional driving, +₹1,200 estimated fuel and state hill toll.\n\n` +
          `Your route map and break stops have been updated!`,
        timestamp,
        actionButtons: [
          { label: 'View Updated Route Map', action: 'VIEW_ROUTE' },
          { label: 'Start GPS Navigation', action: 'START_NAV' },
          { label: 'Make Trip Cheaper', action: 'MAKE_CHEAPER' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 13. BUDGET CUTTING / MAKE CHEAPER
  if (
    normalized.includes('cheaper') ||
    normalized.includes('reduce cost') ||
    normalized.includes('save money') ||
    normalized.includes('lower budget') ||
    normalized.includes('cut expense')
  ) {
    const updated = { ...currentTrip };
    const savedHotel = 700;
    const savedFood = 350;
    const savedTransport = 200;
    const totalSavings = savedHotel + savedFood + savedTransport;

    updated.budgetBreakdown = {
      ...updated.budgetBreakdown,
      accommodation: Math.max(1000, updated.budgetBreakdown.accommodation - savedHotel),
      food: Math.max(800, updated.budgetBreakdown.food - savedFood),
      transportation: Math.max(800, updated.budgetBreakdown.transportation - savedTransport)
    };
    updated.estimatedTotal = Math.max(2000, updated.estimatedTotal - totalSavings);
    updated.accommodationType = 'hostel';

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Draft budget reduced by ₹${totalSavings.toLocaleString('en-IN')}**\n\n` +
          `This offline rule updated the draft estimate; it did not find or book any live offer:\n` +
          `• **Lodging:** Uses a lower-cost stay assumption (Estimated reduction ₹${savedHotel})\n` +
          `• **Dining:** Uses a lower-cost local-meal assumption (Estimated reduction ₹${savedFood})\n` +
          `• **Transit:** Uses a lower transport-cost assumption (Estimated reduction ₹${savedTransport})\n\n` +
          `**New draft estimate:** ₹${updated.estimatedTotal.toLocaleString('en-IN')}. Check provider prices before booking.`,
        timestamp,
        actionButtons: [
          { label: 'View Expense Breakdown', action: 'VIEW_EXPENSES' },
          { label: 'Check Transport Deals', action: 'VIEW_DEALS' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 14. SET CUSTOM BUDGET (e.g. "set budget to 15000", "my budget is ₹20,000")
  if (
    (normalized.includes('budget to') || normalized.includes('budget is') || normalized.includes('set budget')) &&
    normalized.match(/[\d,]+/)
  ) {
    const numMatch = normalized.match(/[\d,]+/);
    const newBudget = numMatch ? parseInt(numMatch[0].replace(/,/g, '')) : currentTrip.totalBudget;

    if (newBudget > 1000) {
      const updated = { ...currentTrip };
      updated.totalBudget = newBudget;
      updated.estimatedTotal = Math.round(newBudget * 0.88);
      updated.budgetBreakdown = {
        accommodation: Math.round(newBudget * 0.40),
        transportation: Math.round(newBudget * 0.30),
        food: Math.round(newBudget * 0.20),
        activities: Math.round(newBudget * 0.08),
        miscellaneous: Math.round(newBudget * 0.02)
      };

      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `**Budget Recalibrated to ₹${newBudget.toLocaleString('en-IN')}!**\n\n` +
            `• **Lodging:** ₹${updated.budgetBreakdown.accommodation.toLocaleString('en-IN')} (40%)\n` +
            `• **Transport & Fuel:** ₹${updated.budgetBreakdown.transportation.toLocaleString('en-IN')} (30%)\n` +
            `• **Dining & Dhabas:** ₹${updated.budgetBreakdown.food.toLocaleString('en-IN')} (20%)\n` +
            `• **Activities & Buffer:** ₹${updated.budgetBreakdown.activities.toLocaleString('en-IN')} (10%)\n\n` +
            `Your trip budget ledger has been updated across all views.`,
          timestamp,
          actionButtons: [
            { label: 'View Expense Breakdown', action: 'VIEW_EXPENSES' },
            { label: 'Check Transport Deals', action: 'VIEW_DEALS' }
          ]
        },
        updatedTrip: updated,
        appAction: {
          type: 'UPDATE_TRIP',
          payload: { updatedTrip: updated }
        }
      };
    }
  }

  // 15. EXTEND TRIP BY 1 DAY
  if (
    normalized.includes('one more day') ||
    normalized.includes('add a day') ||
    normalized.includes('extend trip') ||
    normalized.includes('extra day')
  ) {
    const updated = { ...currentTrip };
    const newDayNumber = updated.durationDays + 1;
    updated.durationDays = newDayNumber;
    updated.estimatedTotal += 1800;
    updated.totalBudget += 2000;
    updated.budgetBreakdown = {
      ...updated.budgetBreakdown,
      accommodation: updated.budgetBreakdown.accommodation + 800,
      food: updated.budgetBreakdown.food + 600,
      activities: updated.budgetBreakdown.activities + 400
    };

    const newDay: DayPlan = {
      dayNumber: newDayNumber,
      title: `Day ${newDayNumber} — Extended Heritage Exploration & Relaxed Leisure`,
      theme: 'Offbeat Artisan Village & Sunset Overlook',
      dayEstimatedCost: 1800,
      activities: [
        {
          id: `act-${newDayNumber}-1`,
          dayNumber: newDayNumber,
          time: '9:30 AM',
          title: 'Artisan Heritage Village Walk',
          type: 'attraction',
          location: `${cleanDest} Cultural Enclave`,
          estimatedCost: 350,
          travelTimeMin: 20,
          distanceKm: 5,
          description: 'Explore live craft workshops, block printing, pottery, and folk musicians.',
          coordinates: { lat: 24.5854, lng: 73.7125 },
          tag: 'Culture'
        },
        {
          id: `act-${newDayNumber}-2`,
          dayNumber: newDayNumber,
          time: '1:30 PM',
          title: 'Lakeside Traditional Lunch',
          type: 'food',
          location: 'Garden Haveli Restaurant',
          estimatedCost: 450,
          travelTimeMin: 15,
          distanceKm: 4,
          description: 'Authentic regional lunch featuring fresh local dishes with scenic waterfront seating.',
          coordinates: { lat: 24.5800, lng: 73.6800 },
          tag: 'Food'
        },
        {
          id: `act-${newDayNumber}-3`,
          dayNumber: newDayNumber,
          time: '4:30 PM',
          title: 'Sunset Ridge Panoramic Overlook',
          type: 'viewpoint',
          location: 'Scenic Hill Overlook',
          estimatedCost: 100,
          travelTimeMin: 25,
          distanceKm: 8,
          description: 'Golden hour twilight viewpoint offering 360-degree photography over the surrounding valleys.',
          coordinates: { lat: 24.5900, lng: 73.6900 },
          tag: 'Viewpoint'
        }
      ]
    };

    updated.itinerary = [...updated.itinerary, newDay];

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Extended Journey to ${newDayNumber} Days!**\n\n` +
          `• Added **Day ${newDayNumber}:** Cultural Artisan Village, lakeside garden lunch, and sunset ridge overlook.\n` +
          `• Budget Adjusted: +₹1,800 to cover 1 extra night lodging, meals, and local transit.\n\n` +
          `Your itinerary schedule and calendar have been updated!`,
        timestamp,
        actionButtons: [
          { label: 'View Day Schedule', action: 'VIEW_ITINERARY' },
          { label: 'Check Weather', action: 'CHECK_WEATHER' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 16. SHORTEN TRIP
  if (
    normalized.includes('shorten') ||
    normalized.includes('reduce by 1 day') ||
    normalized.includes('remove a day') ||
    normalized.includes('make it 2 days')
  ) {
    const updated = { ...currentTrip };
    if (updated.durationDays > 1) {
      updated.durationDays = updated.durationDays - 1;
      updated.itinerary = updated.itinerary.slice(0, updated.durationDays);
      updated.estimatedTotal = Math.max(2000, updated.estimatedTotal - 1500);

      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `**Shortened Journey to ${updated.durationDays} Days!**\n\n` +
            `Adjusted itinerary and trimmed estimated budget down to ₹${updated.estimatedTotal.toLocaleString('en-IN')}.`,
          timestamp,
          actionButtons: [
            { label: 'View Updated Itinerary', action: 'VIEW_ITINERARY' }
          ]
        },
        updatedTrip: updated,
        appAction: {
          type: 'UPDATE_TRIP',
          payload: { updatedTrip: updated }
        }
      };
    }
  }

  // 17. 100% PURE VEG / JAIN DIETARY FILTER
  if (
    normalized.includes('pure veg') ||
    normalized.includes('only veg') ||
    normalized.includes('vegetarian') ||
    normalized.includes('jain') ||
    normalized.includes('vegan')
  ) {
    const updated = { ...currentTrip };
    updated.foodPreference = 'veg';
    updated.itinerary = updated.itinerary.map(day => ({
      ...day,
      activities: day.activities.map(a => {
        if (a.type === 'food') {
          return {
            ...a,
            title: `Pure Veg: ${a.title.replace('Pure Veg: ', '')}`,
            description: `${a.description} Dietary preference requested; confirm ingredients and cross-contamination directly with each venue.`
          };
        }
        return a;
      })
    }));

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Vegetarian preference noted**\n\n` +
          `Trip suggestions reflect a vegetarian preference for ${cleanOrigin} → ${cleanDest}. This does not verify a venue's menu, preparation practices, or hygiene; confirm directly with each venue.`,
        timestamp,
        actionButtons: [
          { label: 'View Food Dhabas', action: 'VIEW_ITINERARY' },
          { label: 'Optimize Budget', action: 'MAKE_CHEAPER' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 18. SWITCH TRANSPORT MODE (e.g. flight, train, car, bus)
  if (
    normalized.includes('switch to flight') ||
    normalized.includes('by air') ||
    normalized.includes('take flight') ||
    normalized.includes('switch to train') ||
    normalized.includes('by train') ||
    normalized.includes('switch to car') ||
    normalized.includes('by car') ||
    normalized.includes('road trip')
  ) {
    const updated = { ...currentTrip };
    if (normalized.includes('flight') || normalized.includes('air')) updated.transportMode = 'flight';
    else if (normalized.includes('train')) updated.transportMode = 'train';
    else updated.transportMode = 'car';

    const feasibility = evaluateTransportFeasibility(updated.transportMode, updated.origin, updated.destination);

    const deals = generateTransportDeals({
      mode: updated.transportMode,
      origin: updated.origin,
      destination: updated.destination,
      durationDays: updated.durationDays,
      travelersCount: updated.travelersCount,
      totalBudget: updated.totalBudget,
      priorities: updated.priorities
    });
    updated.transportDeals = deals.allDeals;
    updated.bestTransportDeal = deals.bestDeal;

    let switchMsg = `**Switched Transport Mode to ${updated.transportMode.toUpperCase()}!**\n\n` +
      `• **Feasibility Status:** ${feasibility.status}\n` +
      `• **Verified Corridor:** ${feasibility.routeDecomposition}\n`;

    if (!feasibility.isDirectPossible) {
      switchMsg += `• **Destination Notice:** ${cleanDest} has no direct ${updated.transportMode}. ${feasibility.explanation}\n`;
    }

    switchMsg += `• **Action Links:** Updated official operator search links in your travel dashboard. Check live operator schedules for current seat availability.`;

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: switchMsg,
        timestamp,
        actionButtons: [
          { label: 'Search Verified Operators', action: 'VIEW_DEALS' },
          { label: 'Start GPS Nav', action: 'START_NAV' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 19. ROUTE TYPE SWITCHING (Scenic vs Fastest Expressway)
  if (
    normalized.includes('scenic route') ||
    normalized.includes('fastest route') ||
    normalized.includes('avoid tolls')
  ) {
    const updated = { ...currentTrip };
    if (normalized.includes('fastest')) updated.routeType = 'fastest';
    else if (normalized.includes('avoid tolls')) updated.routeType = 'cheapest';
    else updated.routeType = 'scenic';

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Route Type Updated to ${updated.routeType.replace('_', ' ').toUpperCase()}!**\n\n` +
          `Recalculated driving trajectory along ${cleanOrigin} → ${cleanDest}.`,
        timestamp,
        actionButtons: [
          { label: 'View Route on Map', action: 'VIEW_ROUTE' },
          { label: 'Start GPS Nav', action: 'START_NAV' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 20. REMOVE SHOPPING OR UNWANTED ACTIVITIES
  if (
    (normalized.includes('remove') && normalized.includes('shopping')) ||
    normalized.includes('no shopping')
  ) {
    const updated = { ...currentTrip };
    updated.itinerary = updated.itinerary.map(day => ({
      ...day,
      activities: day.activities.filter(a => a.tag !== 'Shopping' && !a.title.toLowerCase().includes('shopping') && !a.title.toLowerCase().includes('bazaar'))
    }));
    updated.budgetBreakdown.activities = Math.max(500, updated.budgetBreakdown.activities - 400);
    updated.estimatedTotal = Math.max(2000, updated.estimatedTotal - 400);

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: '**Removed Shopping Visits from Itinerary!**\n\nReclaimed 2.5 hours of free leisure time and reduced activities budget by ₹400.',
        timestamp,
        actionButtons: [
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 22. LOG EXPENSE / REAL-TIME BUDGET ACCOUNTING (e.g. "log expense 850 for dinner", "spent 1200 on fuel")
  if (
    (normalized.includes('expense') || normalized.includes('spent') || normalized.includes('paid') || normalized.includes('log cost')) &&
    normalized.match(/(?:₹|rs\.?|inr)?\s*(\d+)/i)
  ) {
    const amtMatch = normalized.match(/(?:₹|rs\.?|inr)?\s*(\d+)/i);
    const amount = amtMatch ? parseInt(amtMatch[1]) : 0;
    
    let category: ExpenseCategory = 'other';
    if (normalized.includes('petrol') || normalized.includes('fuel') || normalized.includes('diesel') || normalized.includes('cng') || normalized.includes('ev charge')) {
      category = 'fuel';
    } else if (normalized.includes('toll') || normalized.includes('fastag')) {
      category = 'toll';
    } else if (normalized.includes('food') || normalized.includes('dinner') || normalized.includes('lunch') || normalized.includes('breakfast') || normalized.includes('snack') || normalized.includes('tea') || normalized.includes('chai') || normalized.includes('coffee') || normalized.includes('dhaba') || normalized.includes('restaurant') || normalized.includes('cafe')) {
      category = 'food';
    } else if (normalized.includes('hotel') || normalized.includes('stay') || normalized.includes('room') || normalized.includes('resort') || normalized.includes('homestay') || normalized.includes('hostel')) {
      category = 'stay';
    } else if (normalized.includes('ticket') || normalized.includes('entry') || normalized.includes('safari') || normalized.includes('boat') || normalized.includes('ride') || normalized.includes('activity') || normalized.includes('paragliding')) {
      category = 'activity';
    } else if (normalized.includes('shopping') || normalized.includes('gift') || normalized.includes('souvenir') || normalized.includes('bazaar')) {
      category = 'shopping';
    }

    let title = 'General Expense';
    const forMatch = normalized.match(/(?:for|on|at)\s+([a-zA-Z\s0-9]+?)(?:\s+(?:under|in|category|₹|rs)|$)/i);
    if (forMatch && forMatch[1]) {
      title = forMatch[1].trim().charAt(0).toUpperCase() + forMatch[1].trim().slice(1);
    } else {
      title = `${category.charAt(0).toUpperCase() + category.slice(1)} Payment`;
    }

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      tripId: currentTrip.id,
      title,
      amount,
      category,
      paidBy: 'You',
      splitAmong: ['You', ...(currentTrip.travelersCount > 1 ? [`Traveler 2`] : [])],
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const existingExpenses = loadTripExpenses(currentTrip.id);
      saveTripExpenses(currentTrip.id, [newExpense, ...existingExpenses]);
    } catch (e) {
      console.warn('Could not persist expense', e);
    }

    const updated = { ...currentTrip };
    updated.estimatedTotal += amount;
    if (category === 'food') updated.budgetBreakdown.food += amount;
    else if (category === 'fuel' || category === 'toll') updated.budgetBreakdown.transportation += amount;
    else if (category === 'stay') updated.budgetBreakdown.accommodation += amount;
    else if (category === 'activity') updated.budgetBreakdown.activities += amount;
    else updated.budgetBreakdown.miscellaneous = (updated.budgetBreakdown.miscellaneous || 0) + amount;

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Logged Expense of ₹${amount.toLocaleString('en-IN')}!**\n\n` +
          `• **Item:** ${title}\n` +
          `• **Category:** ${category.toUpperCase()} (${category === 'fuel' ? 'Fuel & Transit' : category === 'food' ? 'Dining & Dhabas' : category === 'toll' ? 'FASTag Toll' : 'Travel'})\n` +
          `• **Updated Trip Spend:** ₹${updated.estimatedTotal.toLocaleString('en-IN')} of ₹${updated.totalBudget.toLocaleString('en-IN')} planned target.\n\n` +
          `Recorded to your real-time expense ledger and split settlements!`,
        timestamp,
        actionButtons: [
          { label: 'View Expense Tracker', action: 'VIEW_EXPENSES' },
          { label: 'Make Trip Cheaper', action: 'MAKE_CHEAPER' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'ADD_EXPENSE',
        payload: { expense: newExpense }
      }
    };
  }

  // 23. ADD PACKING ITEMS & CHECKLIST CONTROL (e.g. "add power bank and camera to packing list", "pack everything")
  if (
    (normalized.includes('packing') || normalized.includes('pack ')) &&
    (normalized.includes('add') || normalized.includes('need') || normalized.includes('put') || normalized.includes('bring') || normalized.startsWith('pack '))
  ) {
    if (normalized.includes('everything') || normalized.includes('all') || normalized.includes('mark all')) {
      const currentPacking = loadTripPacking(currentTrip.id) || [];
      const updatedPacking = currentPacking.map(item => ({ ...item, isPacked: true }));
      saveTripPacking(currentTrip.id, updatedPacking);

      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `**All ${updatedPacking.length} Packing Items Marked as Packed!**\n\nYour bags are 100% ready for departure to ${cleanDest}.`,
          timestamp,
          actionButtons: [
            { label: 'View Packing List', action: 'VIEW_PACKING' },
            { label: 'Start GPS Nav', action: 'START_NAV' }
          ]
        },
        appAction: {
          type: 'SWITCH_TAB',
          payload: { tab: 'trips', subTab: 'packing' }
        }
      };
    }

    let cleanQuery = normalized
      .replace(/add\s+/gi, '')
      .replace(/to (?:my )?packing (?:list|checklist)?/gi, '')
      .replace(/in (?:my )?packing (?:list|checklist)?/gi, '')
      .replace(/pack\s+/gi, '')
      .replace(/please/gi, '')
      .trim();

    const rawItems = cleanQuery.split(/,|\band\b/).map(s => s.trim()).filter(s => s.length > 1);
    const addedItems: PackingItem[] = rawItems.map((name, idx) => ({
      id: `pack-ai-${Date.now()}-${idx}`,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      category: 'essentials',
      isPacked: false,
      essential: true,
      note: 'Added via TripVerse AI Co-Pilot'
    }));

    if (addedItems.length > 0) {
      const currentPacking = loadTripPacking(currentTrip.id) || [];
      const updatedPacking = [...currentPacking, ...addedItems];
      saveTripPacking(currentTrip.id, updatedPacking);

      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `**Added to Your Packing Checklist:**\n\n` +
            addedItems.map(i => `• ${i.name}`).join('\n') +
            `\n\nSynced with your ${cleanDest} packing list.`,
          timestamp,
          actionButtons: [
            { label: 'View Packing Checklist', action: 'VIEW_PACKING' },
            { label: 'Check Live Weather', action: 'CHECK_WEATHER' }
          ]
        },
        appAction: {
          type: 'ADD_PACKING_ITEM',
          payload: { items: addedItems }
        }
      };
    }
  }

  // 24. SWITCH ACTIVE TRIP TO ANOTHER SAVED JOURNEY (e.g. "switch to Jaipur trip", "open Udaipur trip")
  if (
    (normalized.includes('switch to') || normalized.includes('open my') || normalized.includes('show my')) &&
    (normalized.includes('trip') || normalized.includes('journey'))
  ) {
    const allTrips = loadTrips();
    const queryDest = normalized
      .replace(/switch to/gi, '')
      .replace(/open my/gi, '')
      .replace(/show my/gi, '')
      .replace(/trip/gi, '')
      .replace(/journey/gi, '')
      .trim();

    const foundTrip = allTrips.find(t => 
      t.id !== currentTrip.id && 
      (t.destination.toLowerCase().includes(queryDest) || t.name.toLowerCase().includes(queryDest))
    );

    if (foundTrip) {
      return {
        message: {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `**Switched Active Trip to ${foundTrip.destination.split(',')[0]}!**\n\n` +
            `• **Trip Name:** ${foundTrip.name}\n` +
            `• **Duration:** ${foundTrip.durationDays} Days (${foundTrip.travelersCount} Travelers)\n` +
            `• **Budget:** ₹${foundTrip.estimatedTotal.toLocaleString('en-IN')}\n\n` +
            `Your dashboard has been updated to your ${foundTrip.destination.split(',')[0]} expedition.`,
          timestamp,
          actionButtons: [
            { label: 'View Itinerary', action: 'VIEW_ITINERARY' },
            { label: 'Start GPS Nav', action: 'START_NAV' }
          ]
        },
        appAction: {
          type: 'SWITCH_ACTIVE_TRIP',
          payload: { tripId: foundTrip.id }
        }
      };
    }
  }

  // 25. DELETE CURRENT TRIP (e.g. "delete this trip", "remove this trip")
  if (
    normalized.includes('delete this trip') ||
    normalized.includes('remove this trip') ||
    normalized.includes('delete current trip') ||
    normalized.includes('cancel this trip')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Trip Deleted:** Successfully removed ${cleanDest} from your active journeys list.`,
        timestamp,
        actionButtons: [
          { label: 'Go to My Trips', action: 'VIEW_ITINERARY' }
        ]
      },
      appAction: {
        type: 'DELETE_TRIP',
        payload: { tripId: currentTrip.id }
      }
    };
  }

  // 26. RENAME TRIP (e.g. "rename trip to Monsoon Roadtrip")
  if (
    normalized.includes('rename trip to') ||
    normalized.includes('change trip name to') ||
    normalized.includes('name this trip')
  ) {
    const nameMatch = normalized.match(/(?:rename trip to|change trip name to|name this trip)\s+([^.]+)/i);
    const newName = nameMatch && nameMatch[1] ? nameMatch[1].trim() : `${cleanDest} Expedition`;
    const updated = { ...currentTrip, name: newName };

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Trip Renamed:** Your journey is now titled **"${newName}"**!`,
        timestamp,
        actionButtons: [
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' },
          { label: 'Share Trip', action: 'OPEN_SHARE' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 27. CHANGE DEPARTURE ORIGIN (e.g. "start from Mumbai", "change origin to Delhi")
  if (
    normalized.includes('start from') ||
    normalized.includes('change origin to') ||
    normalized.includes('departure from')
  ) {
    const originMatch = normalized.match(/(?:start from|change origin to|departure from)\s+([a-zA-Z\s]+?)(?:\s+(?:instead|for|with)|$)/i);
    const newOrigin = originMatch && originMatch[1] ? originMatch[1].trim() : 'Ahmedabad, Gujarat';
    const updated = { ...currentTrip, origin: newOrigin };

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Starting Point Updated!**\n\nDeparture origin updated to **${newOrigin}**. Route corridor and distance metrics recalculating.`,
        timestamp,
        actionButtons: [
          { label: 'View Route Map', action: 'VIEW_ROUTE' },
          { label: 'Start GPS Nav', action: 'START_NAV' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 28. CHANGE TRAVELERS COUNT & TRAVELER TYPE (e.g. "change travelers to 4", "solo trip", "family trip")
  if (
    normalized.includes('traveler') ||
    normalized.includes('travelers') ||
    normalized.includes('people') ||
    normalized.includes('solo trip') ||
    normalized.includes('family trip') ||
    normalized.includes('couple trip') ||
    normalized.includes('friends trip')
  ) {
    const updated = { ...currentTrip };
    const numMatch = normalized.match(/(\d+)\s*(?:travelers?|people|persons?)/i);
    if (numMatch) {
      updated.travelersCount = Math.max(1, Math.min(20, parseInt(numMatch[1])));
    } else if (normalized.includes('solo')) {
      updated.travelersCount = 1;
      updated.travelerType = 'solo';
    } else if (normalized.includes('couple')) {
      updated.travelersCount = 2;
      updated.travelerType = 'couple';
    }

    if (normalized.includes('family')) updated.travelerType = 'family';
    else if (normalized.includes('friends')) updated.travelerType = 'friends';

    updated.budgetPerPerson = Math.round(updated.totalBudget / updated.travelersCount);

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Traveler Party Updated!**\n\n` +
          `• **Travelers Count:** ${updated.travelersCount} (${updated.travelerType.toUpperCase()})\n` +
          `• **Budget Per Person:** ₹${updated.budgetPerPerson.toLocaleString('en-IN')} (Target total: ₹${updated.totalBudget.toLocaleString('en-IN')})\n\n` +
          `Itinerary activities and vehicle passenger load adjusted accordingly!`,
        timestamp,
        actionButtons: [
          { label: 'View Expenses', action: 'VIEW_EXPENSES' },
          { label: 'Check Transport Deals', action: 'VIEW_DEALS' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 29. ADD CUSTOM ACTIVITY TO DAY ITINERARY (e.g. "add paragliding to day 2", "add boat ride to day 1")
  if (
    (normalized.startsWith('add ') || normalized.includes('add activity')) &&
    (normalized.includes('day') || normalized.includes('schedule') || normalized.includes('itinerary'))
  ) {
    const dayMatch = normalized.match(/day\s*(\d+)/i);
    const dayIndex = dayMatch ? Math.max(0, Math.min(currentTrip.itinerary.length - 1, parseInt(dayMatch[1]) - 1)) : 0;
    const targetDayNumber = dayIndex + 1;

    let activityTitle = normalized
      .replace(/add\s+/gi, '')
      .replace(/to day\s*\d+/gi, '')
      .replace(/on day\s*\d+/gi, '')
      .replace(/in day\s*\d+/gi, '')
      .replace(/activity/gi, '')
      .trim();

    activityTitle = activityTitle.charAt(0).toUpperCase() + activityTitle.slice(1);
    if (!activityTitle) activityTitle = 'Scenic Exploration & Local Walk';

    const newActivity: ItineraryActivity = {
      id: `act-custom-${Date.now()}`,
      dayNumber: targetDayNumber,
      time: '3:00 PM',
      title: activityTitle,
      type: 'attraction',
      location: `${cleanDest} Highlights`,
      estimatedCost: 350,
      travelTimeMin: 15,
      distanceKm: 4,
      description: `Custom activity added via CONCODE AI: ${activityTitle}. Recommended timing and gear arranged.`,
      coordinates: currentTrip.destinationDetails?.coordinates || { lat: 24.5854, lng: 73.7125 },
      tag: 'Custom',
      isCustom: true
    };

    const updated = { ...currentTrip };
    updated.itinerary = updated.itinerary.map((day, idx) => {
      if (idx === dayIndex) {
        return {
          ...day,
          activities: [...day.activities, newActivity],
          dayEstimatedCost: day.dayEstimatedCost + newActivity.estimatedCost
        };
      }
      return day;
    });
    updated.estimatedTotal += newActivity.estimatedCost;

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Added Activity to Day ${targetDayNumber}!**\n\n` +
          `• **Activity:** ${activityTitle}\n` +
          `• **Scheduled Time:** 3:00 PM\n` +
          `• **Estimated Cost:** ₹${newActivity.estimatedCost}\n\n` +
          `Injected directly into your Day ${targetDayNumber} timeline!`,
        timestamp,
        actionButtons: [
          { label: 'View Itinerary', action: 'VIEW_ITINERARY' },
          { label: 'Start GPS Nav', action: 'START_NAV' }
        ]
      },
      updatedTrip: updated,
      appAction: {
        type: 'UPDATE_TRIP',
        payload: { updatedTrip: updated }
      }
    };
  }

  // 30. HIGHWAY SAFETY & EMERGENCY SOS DIRECTORY
  if (
    normalized.includes('sos') ||
    normalized.includes('safety') ||
    normalized.includes('emergency') ||
    normalized.includes('police') ||
    normalized.includes('hospital') ||
    normalized.includes('helpline') ||
    normalized.includes('ambulance')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `TripVerse does not monitor your location, contact emergency services, or dispatch roadside assistance.\n\n` +
          `If you are in immediate danger, contact the local emergency service for your current location. In India, 112 is the national emergency number; emergency numbers and roadside support vary elsewhere. For highway assistance, use the number posted by the road authority or your vehicle-assistance provider and confirm it is current.\n\n` +
          `Follow local authority instructions and check official route and weather updates before travelling.`,
        timestamp,
        actionButtons: [
          { label: 'Start GPS Navigation', action: 'START_NAV' },
          { label: 'View Route on Map', action: 'VIEW_ROUTE' },
          { label: 'Replan Trip if Delayed', action: 'OPEN_REPLANNING' }
        ]
      }
    };
  }

  // 31. OPEN PLANNER WIZARD MODAL
  if (
    normalized.includes('open planner') ||
    normalized.includes('start planner') ||
    normalized.includes('trip wizard') ||
    normalized.includes('new trip wizard')
  ) {
    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: `**Opening TripVerse AI Planner Wizard:**\n\nCraft a custom itinerary tailored by travelers, budget tier, and scenic priorities.`,
        timestamp
      },
      appAction: {
        type: 'OPEN_MODAL',
        payload: { modal: 'planner' }
      }
    };
  }

  // 32. DEFAULT CONTEXTUAL ASSISTANT RESPONSE
  return {
    message: {
      id: `msg-${Date.now()}`,
      sender: 'ai',
      text: `**TripVerse AI Co-Pilot Ready!**\n\n` +
        `I understood your request: "${query}". I can execute any action across your journey to ${cleanDest}:\n` +
        `• **Start GPS Navigation:** Say "start navigation" to launch the turn-by-turn HUD\n` +
        `• **Check Weather & Rain:** Say "show me ${cleanDest}'s weather" or "weather in Manali"\n` +
        `• **Optimize Budget:** Say "make this cheaper" or "log expense ₹850 for dinner"\n` +
        `• **Packing List:** Say "add power bank and camera to packing list"\n` +
        `• **Add Waypoints:** Say "add Mount Abu" to inject scenic hill detours\n` +
        `• **Print Travel Guide:** Say "download PDF guide" to get an offline booklet\n` +
        `• **Adjust Dates:** Say "extend trip by 1 day" or "shorten to 2 days"\n` +
        `• **Dietary:** Say "pure veg only" to filter verified vegetarian havelis`,
      timestamp,
      actionButtons: [
        { label: 'Check Weather & Rain', action: 'CHECK_WEATHER' },
        { label: 'Start GPS Navigation', action: 'START_NAV' },
        { label: 'Make This Cheaper', action: 'MAKE_CHEAPER' },
        { label: 'Add Mount Abu Waypoint', action: 'ADD_MOUNT_ABU' },
        { label: 'Print Travel Guide', action: 'OPEN_PRINT' }
      ]
    }
  };
}

export async function processTravelCoPilotQuery(
  query: string,
  currentTrip: Trip
): Promise<AssistantResponse> {
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  try {
    const brainRes = await queryConcodeBrain(query, currentTrip);
    const actionButtons = (brainRes.actionButtons && brainRes.actionButtons.length > 0)
      ? brainRes.actionButtons
      : [
          { label: 'Start GPS Navigation', action: 'START_NAV' },
          { label: 'Audit Tolls & Fuel', action: 'MAKE_CHEAPER' },
          { label: 'Food Trails & Dhabas', action: 'EXPLORE_FOOD' }
        ];

    return {
      message: {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: brainRes.response,
        timestamp,
        engine: 'concode_brain',
        guild: brainRes.guild,
        guildIcon: brainRes.guildIcon,
        confidence: brainRes.confidence,
        actionButtons,
        structuredItinerary: brainRes.structuredItinerary,
        budgetBreakdown: brainRes.budgetBreakdown,
        modificationBadge: brainRes.modificationBadge
      },
      updatedTrip: brainRes.updatedTrip,
      appAction: brainRes.appAction
    };
  } catch (err) {
    console.warn('[TripVerse] CONCODE unavailable; using clearly-labelled offline rules.', err);
    const offlineRes = processUserChatQuery(query, currentTrip);
    offlineRes.message.engine = 'offline';
    offlineRes.message.text = `**Offline trip guidance — CONCODE is currently unavailable.**\n\n${offlineRes.message.text}`;
    return offlineRes;
  }
}
