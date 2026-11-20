// src/services/calendarExportService.ts
// Generates RFC 5545 compliant iCalendar (.ics) files from TripVerse itineraries
// for one-tap import into Apple Calendar, Google Calendar, and Outlook.

import type { Trip, ItineraryActivity } from '../types/trip';
import { saveOrShareFile } from './deviceService';

function escapeIcsText(value: string): string {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatIcsLocalDateTime(date: Date): string {
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
  );
}

function formatIcsUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}` +
    `T${pad2(date.getUTCHours())}${pad2(date.getUTCMinutes())}${pad2(date.getUTCSeconds())}Z`
  );
}

/**
 * Parse human-readable activity time strings like "09:30 AM", "2:15 PM", "14:00", or "Morning"
 * into { hours, minutes }.
 */
export function parseActivityTime(timeStr?: string): { hours: number; minutes: number } {
  const raw = (timeStr || '').trim();
  const match12 = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return { hours: Math.min(23, Math.max(0, hours)), minutes: Math.min(59, Math.max(0, minutes)) };
  }

  const match24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return {
      hours: Math.min(23, Math.max(0, parseInt(match24[1], 10))),
      minutes: Math.min(59, Math.max(0, parseInt(match24[2], 10)))
    };
  }

  const lower = raw.toLowerCase();
  if (lower.includes('morning')) return { hours: 9, minutes: 0 };
  if (lower.includes('afternoon')) return { hours: 14, minutes: 0 };
  if (lower.includes('evening')) return { hours: 18, minutes: 0 };
  if (lower.includes('night')) return { hours: 20, minutes: 30 };

  return { hours: 10, minutes: 0 };
}

function resolveTripStartDate(trip: Trip): Date {
  if (trip.startDate) {
    const parsed = new Date(trip.startDate);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
}

function estimateDurationMinutes(activity: ItineraryActivity): number {
  if (activity.type === 'food') return 75;
  if (activity.type === 'departure' || activity.type === 'arrival' || activity.type === 'breakstop') {
    return Math.max(30, activity.travelTimeMin || 45);
  }
  if (activity.type === 'hotel') return 60;
  return 90;
}

/**
 * Generate an RFC 5545 iCalendar (.ics) document for an entire TripVerse itinerary.
 */
export function generateTripIcs(trip: Trip): string {
  const baseDate = resolveTripStartDate(trip);
  const dtStamp = formatIcsUtcStamp(new Date());
  const calName = escapeIcsText(`${trip.destination} Trip — TripVerse`);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TripVerse//AI Travel Itinerary//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`
  ];

  const days = Array.isArray(trip.itinerary) ? trip.itinerary : [];
  for (const day of days) {
    const dayOffset = Math.max(0, (day.dayNumber || 1) - 1);
    const activities = Array.isArray(day.activities) ? day.activities : [];

    activities.forEach((act, idx) => {
      const { hours, minutes } = parseActivityTime(act.time);
      const start = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate() + dayOffset,
        hours,
        minutes,
        0
      );
      const durationMin = estimateDurationMinutes(act);
      const end = new Date(start.getTime() + durationMin * 60 * 1000);

      const uid = `${(trip.id || 'trip').replace(/[^a-zA-Z0-9_-]/g, '')}-d${day.dayNumber}-a${idx}@trip-verse.com`;
      const summary = escapeIcsText(`[Day ${day.dayNumber}] ${act.title || 'Itinerary Stop'}`);
      const location = escapeIcsText(act.location || trip.destination || '');
      const descParts = [
        act.description || '',
        act.tag ? `Category: ${act.tag}` : '',
        act.estimatedCost ? `Estimated Cost: ${act.estimatedCost}` : '',
        `Planned with TripVerse (${trip.destination})`
      ].filter(Boolean);
      const description = escapeIcsText(descParts.join('\n'));

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${formatIcsLocalDateTime(start)}`,
        `DTEND:${formatIcsLocalDateTime(end)}`,
        `SUMMARY:${summary}`,
        `LOCATION:${location}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT'
      );
    });
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Trigger a cross-platform download or native OS Share Sheet export of the trip's .ics calendar file.
 */
export function downloadTripCalendarIcs(trip: Trip): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const icsContent = generateTripIcs(trip);
  const safeName = (trip.destination || 'tripverse-itinerary')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  void saveOrShareFile({
    filename: `${safeName || 'tripverse'}-itinerary.ics`,
    content: icsContent,
    mimeType: 'text/calendar;charset=utf-8',
    title: `${trip.destination || 'TripVerse'} Calendar Itinerary`,
    text: `Import your ${trip.destination || 'TripVerse'} itinerary into Apple Calendar or Google Calendar.`,
  });
  return true;
}
