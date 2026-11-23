/**
 * Live Transit Schedule Service (liveTransitScheduleService.ts)
 * Queries `/api/transit-schedules` for real train numbers, station codes, and scheduled departures
 * (backed by live IRCTC API when configured or verified Indian Railways corridor timetables).
 */

import { resolveApiUrl } from './deviceService';

export interface TransitScheduleItem {
  number: string;
  name: string;
  dep: string;
  arr: string;
  duration: string;
  days: string;
  classes: string[];
}

export interface TransitScheduleResponse {
  source: 'live_irctc_api' | 'verified_rail_timetable' | 'partner_search_only';
  mode: string;
  originCode?: string;
  destCode?: string;
  schedules: TransitScheduleItem[];
  note?: string;
}

const SCHEDULE_CACHE = new Map<string, TransitScheduleResponse>();

export async function fetchTransitSchedules(params: {
  origin: string;
  destination: string;
  mode: 'train' | 'flight' | 'bus';
  fromCode?: string;
  toCode?: string;
  date?: string;
}): Promise<TransitScheduleResponse> {
  const key = `${params.mode}|${params.origin.toLowerCase()}|${params.destination.toLowerCase()}|${params.fromCode || ''}|${params.toCode || ''}`;
  const cached = SCHEDULE_CACHE.get(key);
  if (cached) return cached;

  const qs = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    mode: params.mode,
    ...(params.fromCode ? { fromCode: params.fromCode } : {}),
    ...(params.toCode ? { toCode: params.toCode } : {}),
    ...(params.date ? { date: params.date } : {}),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const res = await fetch(`${resolveApiUrl('/api/transit-schedules')}?${qs.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        const result: TransitScheduleResponse = {
          source: data.source || 'partner_search_only',
          mode: data.mode || params.mode,
          originCode: data.originCode,
          destCode: data.destCode,
          schedules: Array.isArray(data.schedules) ? data.schedules : [],
          note: data.note,
        };
        SCHEDULE_CACHE.set(key, result);
        return result;
      }
    }
  } catch {
    clearTimeout(timer);
  }

  return {
    source: 'partner_search_only',
    mode: params.mode,
    schedules: [],
    note: 'Tap the official booking partner below to check live schedules and seat availability.',
  };
}
