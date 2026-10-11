import { Trip } from '../types/trip';
import { TripNotification, TripCountdownInfo } from '../types/notification';

import { getCurrentUser } from './authService';

function getNotificationStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  const user = getCurrentUser();
  return user?.uid ? window.localStorage : window.sessionStorage;
}

function getReadNotificationsKey(): string {
  const user = getCurrentUser();
  return user?.uid ? `tripverse_notifications_read_u_${user.uid}` : 'tripverse_notifications_read_guest';
}

export function getStoredReadNotificationIds(): string[] {
  try {
    const storage = getNotificationStorage();
    if (!storage) return [];
    const key = getReadNotificationsKey();
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveReadNotificationIds(ids: string[]): void {
  try {
    const storage = getNotificationStorage();
    if (storage) {
      storage.setItem(getReadNotificationsKey(), JSON.stringify(ids));
      window.dispatchEvent(new CustomEvent('tripverse_notifications_updated'));
    }
  } catch (e) {
    console.error('Error saving read notification ids', e);
  }
}

export function markNotificationAsRead(id: string): void {
  const ids = getStoredReadNotificationIds();
  if (!ids.includes(id)) {
    saveReadNotificationIds([...ids, id]);
  }
}

export function markAllNotificationsAsRead(ids: string[]): void {
  const existing = getStoredReadNotificationIds();
  const merged = Array.from(new Set([...existing, ...ids]));
  saveReadNotificationIds(merged);
}

/**
 * Calculates a live countdown to trip departure.
 * Uses the trip createdAt or synthetic future date (e.g. 2 days from now for upcoming trips).
 */
export function calculateCountdown(trip: Trip): TripCountdownInfo {
  // Synthesize departure date: 2 days from today at 07:00 AM for upcoming trips
  const now = new Date();
  const targetDate = new Date();
  
  if (trip.status === 'upcoming') {
    targetDate.setDate(now.getDate() + 2);
    targetDate.setHours(7, 0, 0, 0);
  } else if (trip.status === 'ongoing') {
    targetDate.setDate(now.getDate());
    targetDate.setHours(18, 0, 0, 0);
  } else {
    // completed/draft
    targetDate.setDate(now.getDate() - 5);
  }

  const diffMs = targetDate.getTime() - now.getTime();
  const isPast = diffMs <= 0;
  const isToday = !isPast && targetDate.getDate() === now.getDate();

  if (isPast) {
    return {
      tripId: trip.id,
      tripName: trip.name,
      destination: trip.destination,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      secondsRemaining: 0,
      isToday: false,
      isPast: true
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return {
    tripId: trip.id,
    tripName: trip.name,
    destination: trip.destination,
    daysRemaining: days,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    secondsRemaining: seconds,
    isToday,
    isPast: false
  };
}

/**
 * Generates trip-specific countdown and planning reminders; this does not monitor live conditions.
 */
export function generateNotifications(trips: Trip[], activeTrip?: Trip): TripNotification[] {
  const readIds = getStoredReadNotificationIds();
  const notifs: TripNotification[] = [];

  // NO MOCK NOTIFICATIONS:
  // If there are no real trip-specific notifications or stored notifications, return []
  // so the UI naturally displays the clean empty state: "No notifications. You're all caught up."


  // 2. Active Trip Contextual Notifications (Attached only when user has actively created or planned an upcoming journey)
  const isUserUpcomingJourney = !!(activeTrip && activeTrip.status === 'upcoming' && activeTrip.isUserCreated);

  if (isUserUpcomingJourney && activeTrip) {
    const countdown = calculateCountdown(activeTrip);
    const destName = (activeTrip.destination || 'Destination').split(',')[0];
    if (!countdown.isPast) {
      notifs.push({
        id: `notif-countdown-${activeTrip.id}`,
        tripId: activeTrip.id,
        title: `Departure Countdown: ${countdown.daysRemaining}d ${countdown.hoursRemaining}h to ${destName}!`,
        message: `Your journey to ${activeTrip.destination || 'your destination'} is upcoming. Check current route conditions and weather before departure.`,
        type: 'countdown',
        timestamp: 'Active Trip',
        read: readIds.includes(`notif-countdown-${activeTrip.id}`),
        priority: 'high',
        actionLabel: 'View Itinerary',
        actionTarget: 'itinerary'
      });
    }

    // Prompt the traveler to check a forecast; no live weather is fetched here.
    notifs.push({
      id: `notif-weather-${activeTrip.id}`,
      tripId: activeTrip.id,
      title: `Weather check reminder: ${destName}`,
      message: 'No weather or route conditions have been checked for this trip. Review current forecasts and official advisories before travelling.',
      type: 'system',
      timestamp: 'Planning reminder',
      read: readIds.includes(`notif-weather-${activeTrip.id}`),
      priority: 'low',
      actionLabel: 'Check Weather',
      actionTarget: 'weather'
    });

    // Smart packing checklist for active trip
    notifs.push({
      id: `notif-packing-${activeTrip.id}`,
      tripId: activeTrip.id,
      title: 'Smart Packing Checklist Ready',
      message: `Review and adjust the suggested packing checklist for your trip to ${destName}.`,
      type: 'packing',
      timestamp: 'Trip Assistant',
      read: readIds.includes(`notif-packing-${activeTrip.id}`),
      priority: 'low',
      actionLabel: 'Open Packing List',
      actionTarget: 'packing'
    });

  }

  // 3. User reviews (Only for user-completed trips that have not been reviewed yet)
  const unreviewedTrip = trips.find(t => t.status === 'completed' && !t.review && (t as any).isUserCreated);
  if (unreviewedTrip) {
    const unreviewedDest = (unreviewedTrip.destination || 'Destination').split(',')[0];
    notifs.push({
      id: `notif-review-${unreviewedTrip.id}`,
      tripId: unreviewedTrip.id,
      title: `How was ${unreviewedDest}?`,
      message: `You completed "${unreviewedTrip.name}". Share your feedback and preserve your memories!`,
      type: 'system',
      timestamp: 'Recent Trip',
      read: readIds.includes(`notif-review-${unreviewedTrip.id}`),
      priority: 'high',
      actionLabel: 'Rate Trip',
      actionTarget: 'itinerary'
    });
  }

  return notifs;
}
