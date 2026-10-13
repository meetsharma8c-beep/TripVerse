import { getSupabaseClient } from './supabase';
import { Trip, UserProfile, ExpenseItem, TripReview, TripPhotoMemory, PackingItem } from '../types/trip';
import { getActiveCurrency } from './currencyService';
import { DisruptionAlert, ReplanOption, RefundGuidance } from '../types/replanning';
import { toDeterministicUuid } from '../utils/uuid';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * SUPABASE CLOUD POSTGRESQL SYNCHRONIZATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════
 * Communicates with the real Supabase backend, adhering to RLS policies.
 */

// 1. TRIPS
export async function saveTripToSupabase(userId: string, trip: Trip): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const payload = {
      id: trip.id,
      user_id: cleanUserId,
      name: trip.name,
      origin: trip.origin,
      destination: trip.destination,
      destination_state: trip.destinationDetails?.state || null,
      destination_description: trip.destinationDetails?.description || null,
      destination_image: trip.destinationDetails?.image || null,
      duration_days: trip.durationDays,
      travelers_count: trip.travelersCount,
      traveler_type: trip.travelerType,
      total_budget: trip.totalBudget,
      budget_per_person: trip.budgetPerPerson,
      transport_mode: trip.transportMode,
      accommodation_type: trip.accommodationType,
      food_preference: trip.foodPreference,
      status: trip.status,
      route_type: trip.routeType || 'fastest',
      estimated_total: trip.estimatedTotal,
      ai_rationale: trip.aiRationale || null,
      budget_breakdown: trip.budgetBreakdown,
      route_details: trip.routeDetails || null,
      break_stops: trip.breakStops || [],
      preferences: trip.preferences || [],
      priorities: trip.priorities || [],
      is_user_created: true,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('trips').upsert(payload);
    if (error) {
      console.warn('[Supabase] Failed to upsert trip:', error);
      return false;
    }

    // Save Itinerary Days & Items if present
    if (trip.itinerary && trip.itinerary.length > 0) {
      const daysPayload = trip.itinerary.map(d => ({
        id: `day-${trip.id}-${d.dayNumber}`,
        trip_id: trip.id,
        day_number: d.dayNumber,
        title: d.title,
        theme: d.theme || null,
        day_estimated_cost: d.dayEstimatedCost || 0
      }));

      await supabase.from('itinerary_days').upsert(daysPayload);

      const itemsPayload: any[] = [];
      trip.itinerary.forEach(d => {
        if (d.activities && d.activities.length > 0) {
          d.activities.forEach((act, idx) => {
            itemsPayload.push({
              id: act.id || `item-${trip.id}-${d.dayNumber}-${idx}`,
              day_id: `day-${trip.id}-${d.dayNumber}`,
              trip_id: trip.id,
              day_number: d.dayNumber,
              time_slot: act.time || null,
              title: act.title,
              description: act.description || null,
              location: act.location || null,
              cost: act.estimatedCost || 0,
              category: act.type || 'attraction',
              duration_mins: act.travelTimeMin || 30
            });
          });
        }
      });

      if (itemsPayload.length > 0) {
        await supabase.from('itinerary_items').upsert(itemsPayload);
      }
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Error saving trip:', err);
    return false;
  }
}

export async function loadTripsFromSupabase(userId: string): Promise<Trip[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { data: tripsData, error: tripsErr } = await supabase
      .from('trips')
      .select('*')
      .eq('user_id', cleanUserId)
      .order('created_at', { ascending: false });

    if (tripsErr) {
      console.warn('[Supabase] Error loading trips:', tripsErr);
      return null;
    }

    if (!tripsData || tripsData.length === 0) return [];

    const tripIds = tripsData.map(t => t.id);

    // Fetch associated itinerary days & items
    const [daysRes, itemsRes, expensesRes] = await Promise.all([
      supabase.from('itinerary_days').select('*').in('trip_id', tripIds).order('day_number', { ascending: true }),
      supabase.from('itinerary_items').select('*').in('trip_id', tripIds),
      supabase.from('expenses').select('*').in('trip_id', tripIds)
    ]);

    const daysMap = new Map<string, any[]>();
    (daysRes.data || []).forEach(d => {
      if (!daysMap.has(d.trip_id)) daysMap.set(d.trip_id, []);
      daysMap.get(d.trip_id)!.push(d);
    });

    const itemsMap = new Map<string, any[]>();
    (itemsRes.data || []).forEach(i => {
      if (!itemsMap.has(i.trip_id)) itemsMap.set(i.trip_id, []);
      itemsMap.get(i.trip_id)!.push(i);
    });

    const expensesMap = new Map<string, ExpenseItem[]>();
    (expensesRes.data || []).forEach(e => {
      if (!expensesMap.has(e.trip_id)) expensesMap.set(e.trip_id, []);
      expensesMap.get(e.trip_id)!.push({
        id: e.id,
        tripId: e.trip_id,
        title: e.title,
        amount: Number(e.amount),
        category: e.category,
        paidBy: e.paid_by,
        splitAmong: e.split_among || [],
        date: e.date || (e.created_at ? e.created_at.split('T')[0] : new Date().toISOString().split('T')[0])
      });
    });

    const trips: Trip[] = tripsData.map(t => {
      const tripDays = daysMap.get(t.id) || [];
      const tripItems = itemsMap.get(t.id) || [];

      const itinerary = tripDays.map(d => ({
        dayNumber: d.day_number,
        title: d.title,
        theme: d.theme || undefined,
        dayEstimatedCost: Number(d.day_estimated_cost || 0),
        activities: tripItems
          .filter(i => i.day_number === d.day_number)
          .map((i, idx) => ({
            id: i.id || `act-${t.id}-${d.day_number}-${idx}`,
            dayNumber: d.day_number,
            time: i.time_slot || '10:00 AM',
            title: i.title,
            type: (i.category as any) || 'attraction',
            description: i.description || '',
            location: i.location || t.destination,
            estimatedCost: Number(i.cost || 0),
            travelTimeMin: i.duration_mins || 30,
            distanceKm: 0,
            coordinates: t.destination_lat && t.destination_lng ? { lat: Number(t.destination_lat), lng: Number(t.destination_lng) } : { lat: 20.5937, lng: 78.9629 }
          }))
      }));

      return {
        id: t.id,
        userId: t.user_id,
        name: t.name,
        origin: t.origin,
        destination: t.destination,
        destinationDetails: {
          image: t.destination_image || '',
          state: t.destination_state || '',
          description: t.destination_description || ''
        },
        durationDays: t.duration_days,
        travelersCount: t.travelers_count,
        travelerType: t.traveler_type,
        totalBudget: Number(t.total_budget),
        budgetPerPerson: Number(t.budget_per_person),
        preferences: t.preferences || [],
        transportMode: t.transport_mode,
        accommodationType: t.accommodation_type,
        foodPreference: t.food_preference,
        priorities: t.priorities || [],
        status: t.status,
        isUserCreated: true,
        createdAt: t.created_at,
        aiRationale: t.ai_rationale || undefined,
        breakStops: t.break_stops || [],
        budgetBreakdown: t.budget_breakdown || {
          transportation: 0,
          accommodation: 0,
          food: 0,
          activities: 0,
          miscellaneous: 0
        },
        estimatedTotal: Number(t.estimated_total || 0),
        routeType: t.route_type,
        routeDetails: t.route_details || undefined,
        itinerary: itinerary.length > 0 ? itinerary : [],
        expenses: expensesMap.get(t.id) || []
      };
    });

    return trips;
  } catch (err) {
    console.error('[Supabase] Error loading trips:', err);
    return null;
  }
}

export async function deleteTripFromSupabase(userId: string, tripId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId)
      .eq('user_id', cleanUserId);

    return !error;
  } catch (err) {
    console.error('[Supabase] Error deleting trip:', err);
    return false;
  }
}

// 2. EXPENSES
export async function saveExpenseToSupabase(userId: string, expense: ExpenseItem): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const payload = {
      id: expense.id,
      trip_id: expense.tripId,
      user_id: cleanUserId,
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      paid_by: expense.paidBy,
      split_among: expense.splitAmong,
      date: expense.date || new Date().toISOString()
    };

    const { error } = await supabase.from('expenses').upsert(payload);
    return !error;
  } catch (err) {
    console.error('[Supabase] Error saving expense:', err);
    return false;
  }
}

export async function deleteExpenseFromSupabase(userId: string, expenseId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', cleanUserId);

    return !error;
  } catch (err) {
    console.error('[Supabase] Error deleting expense:', err);
    return false;
  }
}

// 3. SAVED PLACES / BOOKMARKS
export async function saveSavedPlaceToSupabase(userId: string, placeId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase.from('saved_places').upsert({
      id: `save-${cleanUserId}-${placeId}`,
      user_id: cleanUserId,
      place_id: placeId
    });
    return !error;
  } catch {
    return false;
  }
}

export async function deleteSavedPlaceFromSupabase(userId: string, placeId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase
      .from('saved_places')
      .delete()
      .eq('user_id', cleanUserId)
      .eq('place_id', placeId);
    return !error;
  } catch {
    return false;
  }
}

export async function loadSavedPlacesFromSupabase(userId: string): Promise<string[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { data, error } = await supabase
      .from('saved_places')
      .select('place_id')
      .eq('user_id', cleanUserId);

    if (error) return null;
    return (data || []).map(d => d.place_id);
  } catch {
    return null;
  }
}

// 4. USER PROFILE
export async function saveProfileToSupabase(userId: string, profile: UserProfile): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const payload = {
      id: cleanUserId,
      email: profile.email || null,
      display_name: profile.name,
      avatar_url: profile.avatar || null,
      phone_number: profile.phoneNumber || null,
      traveler_style: profile.travelerStyle || 'Smart Roadtripper',
      travel_style_tag: profile.travelStyleTag || 'Verified Explorer',
      location: profile.location || 'India',
      occupation: profile.occupation || 'Explorer',
      age: profile.age || 25,
      preferred_currency: profile.preferredCurrency || getActiveCurrency(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('profiles').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

export async function loadProfileFromSupabase(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', cleanUserId)
      .single();

    if (error || !data) return null;

    return {
      name: data.display_name || 'Traveler Explorer',
      age: data.age || 25,
      occupation: data.occupation || 'Explorer',
      location: data.location || 'India',
      email: data.email || '',
      phoneNumber: data.phone_number || '',
      avatar: data.avatar_url || '/default-avatar.svg',
      travelerStyle: data.traveler_style || 'Smart Roadtripper',
      travelStyleTag: data.travel_style_tag || 'Verified Explorer',
      preferredCurrency: (data.preferred_currency || 'INR') as UserProfile['preferredCurrency'],
      budgetPreference: 'Balanced & Value-Focused',
      foodPreference: 'Authentic Local & Hygienic Stops',
      accommodationPreference: 'Boutique Stays & Clean Hotels',
      savedPlaceIds: [],
      tripsCount: 0
    };
  } catch {
    return null;
  }
}

// 5. DIGITAL PASSPORT
export async function savePassportToSupabase(userId: string, visitedStates: string[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase.from('user_passport').upsert({
      user_id: cleanUserId,
      visited_states: visitedStates,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

export async function loadPassportFromSupabase(userId: string): Promise<string[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { data, error } = await supabase
      .from('user_passport')
      .select('visited_states')
      .eq('user_id', cleanUserId)
      .single();

    if (error || !data) return null;
    return data.visited_states || [];
  } catch {
    return null;
  }
}

// 6. EMERGENCY EVENTS & REPLANNING
export async function saveEmergencyEventToSupabase(
  userId: string, 
  disruption: DisruptionAlert,
  plan?: {
    revisedSummary?: string;
    alternativeTransport?: any;
    budgetImpact?: number;
    timeImpact?: string;
    refundGuidance?: RefundGuidance;
    actionSteps?: string[];
  }
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const eventId = disruption.id || `emerg-evt-${Date.now()}`;
    const { error: evtErr } = await supabase.from('emergency_events').upsert({
      id: eventId,
      trip_id: disruption.tripId,
      user_id: cleanUserId,
      disruption_type: disruption.type,
      title: disruption.title,
      details: disruption.details,
      severity: disruption.severity || 'warning',
      carrier_or_source: disruption.carrierOrSource || null,
      flight_or_train_number: disruption.flightOrTrainNumber || null,
      affected_destination: disruption.affectedDestination || null,
      status: 'reported',
      reported_at: new Date().toISOString()
    });

    if (evtErr) {
      console.warn('[Supabase] Failed to save emergency event:', evtErr);
      return false;
    }

    if (plan) {
      await supabase.from('emergency_plans').upsert({
        id: `plan-${eventId}`,
        event_id: eventId,
        trip_id: disruption.tripId,
        user_id: cleanUserId,
        revised_itinerary_summary: plan.revisedSummary || null,
        alternative_transport: plan.alternativeTransport || null,
        budget_impact: plan.budgetImpact || 0,
        time_impact: plan.timeImpact || null,
        refund_guidance: plan.refundGuidance || null,
        action_steps: plan.actionSteps || [],
        created_at: new Date().toISOString()
      });
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Error saving emergency event/plan:', err);
    return false;
  }
}

// 7. BATCH AND COMPATIBILITY HELPERS
export async function saveAllUserTripsToSupabase(userId: string, trips: Trip[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !trips || trips.length === 0) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const results = await Promise.all(trips.map(t => saveTripToSupabase(cleanUserId, t)));
    return results.every(Boolean);
  } catch (err) {
    console.warn('[Supabase] Batch save trips notice:', err);
    return false;
  }
}

export const saveUserTripToSupabase = saveTripToSupabase;
export const deleteUserTripFromSupabase = deleteTripFromSupabase;
export const loadUserTripsFromSupabase = loadTripsFromSupabase;

export const saveUserProfileToSupabase = saveProfileToSupabase;
export const loadUserProfileFromSupabase = loadProfileFromSupabase;

export const saveUserPassportToSupabase = savePassportToSupabase;
export const loadUserPassportFromSupabase = loadPassportFromSupabase;

export async function saveUserSavedItemsToSupabase(userId: string, itemIds: string[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    if (!itemIds || itemIds.length === 0) {
      await supabase.from('saved_places').delete().eq('user_id', cleanUserId);
      return true;
    }

    const payload = itemIds.map(id => ({
      id: `save-${cleanUserId}-${id}`,
      user_id: cleanUserId,
      place_id: id
    }));

    const { error } = await supabase.from('saved_places').upsert(payload);
    return !error;
  } catch (err) {
    console.warn('[Supabase] Saved items batch error:', err);
    return false;
  }
}

export const loadUserSavedItemsFromSupabase = loadSavedPlacesFromSupabase;

// 8. ACTIVE TRIP SELECTION PREFERENCE
export async function saveUserActiveTripToSupabase(userId: string, activeTripId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !activeTripId) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ active_trip_id: activeTripId, updated_at: new Date().toISOString() })
      .eq('id', cleanUserId);
    return !error;
  } catch {
    return false;
  }
}

export async function loadUserActiveTripFromSupabase(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { data } = await supabase
      .from('profiles')
      .select('active_trip_id')
      .eq('id', cleanUserId)
      .single();
    return data?.active_trip_id || null;
  } catch {
    return null;
  }
}

// 9. COLLABORATION SESSIONS
export async function saveCollaborationSessionToSupabase(session: any): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !session?.tripId) return false;

  try {
    const { error } = await supabase.from('trip_collaborations').upsert({
      trip_id: session.tripId,
      session_data: session,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch (e) {
    console.warn('[Supabase] Collaboration sync notice:', e);
    return false;
  }
}

export async function loadCollaborationSessionFromSupabase(tripId: string): Promise<any | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !tripId) return null;

  try {
    const { data, error } = await supabase
      .from('trip_collaborations')
      .select('session_data')
      .eq('trip_id', tripId)
      .single();

    if (error || !data) return null;
    return data.session_data;
  } catch {
    return null;
  }
}

// 10. TRIP REVIEWS
export async function saveReviewToSupabase(userId: string, tripId: string, review: TripReview): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase.from('trip_reviews').upsert({
      id: review.id,
      trip_id: tripId,
      user_id: cleanUserId,
      rating: review.rating,
      review_text: review.notes || '',
      favorite_spot: review.favoriteSpot || null,
      created_at: review.reviewedAt || new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

export async function loadReviewFromSupabase(userId: string, tripId: string): Promise<TripReview | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { data, error } = await supabase
      .from('trip_reviews')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', cleanUserId)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      tripId: data.trip_id,
      rating: data.rating,
      overallExperience: data.rating >= 4 ? 'delightful' : data.rating >= 3 ? 'average' : 'challenging',
      highlights: [],
      wouldRecommend: data.rating >= 4,
      budgetVerdict: 'on_budget',
      notes: data.review_text || '',
      reviewedAt: data.created_at,
      favoriteSpot: data.favorite_spot || undefined
    };
  } catch {
    return null;
  }
}

// 11. TRIP PHOTOS
export async function savePhotoToSupabase(userId: string, photo: TripPhotoMemory): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase.from('trip_photos').upsert({
      id: photo.id,
      trip_id: photo.tripId,
      user_id: cleanUserId,
      day_number: photo.dayNumber || null,
      url: photo.url,
      caption: photo.caption || '',
      location: photo.location || null,
      tags: photo.tags || [],
      featured: photo.featured || false,
      taken_at: photo.takenAt || new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

export async function loadPhotosFromSupabase(userId: string, tripId: string): Promise<TripPhotoMemory[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { data, error } = await supabase
      .from('trip_photos')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', cleanUserId)
      .order('taken_at', { ascending: false });

    if (error || !data) return null;
    return data.map(p => ({
      id: p.id,
      tripId: p.trip_id,
      dayNumber: p.day_number || undefined,
      url: p.url,
      caption: p.caption || '',
      takenAt: p.taken_at || p.created_at,
      location: p.location || undefined,
      tags: p.tags || [],
      featured: p.featured || false
    }));
  } catch {
    return null;
  }
}

export async function deletePhotoFromSupabase(userId: string, photoId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { error } = await supabase
      .from('trip_photos')
      .delete()
      .eq('id', photoId)
      .eq('user_id', cleanUserId);
    return !error;
  } catch {
    return false;
  }
}

// 12. PACKING LISTS
export async function savePackingToSupabase(userId: string, tripId: string, items: PackingItem[]): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !items || items.length === 0) return false;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const payload = items.map(item => ({
      id: item.id,
      trip_id: tripId,
      user_id: cleanUserId,
      name: item.name,
      category: item.category || 'essentials',
      is_packed: item.isPacked || false,
      is_custom: item.isCustom || false,
      note: item.note || null,
      quantity: item.quantity || 1
    }));

    const { error } = await supabase.from('packing_items').upsert(payload);
    return !error;
  } catch {
    return false;
  }
}

export async function loadPackingFromSupabase(userId: string, tripId: string): Promise<PackingItem[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const cleanUserId = toDeterministicUuid(userId);
    const { data, error } = await supabase
      .from('packing_items')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', cleanUserId);

    if (error || !data) return null;
    return data.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category as PackingItem['category'],
      isPacked: p.is_packed || false,
      isCustom: p.is_custom || false,
      note: p.note || undefined,
      quantity: p.quantity || 1
    }));
  } catch {
    return null;
  }
}

