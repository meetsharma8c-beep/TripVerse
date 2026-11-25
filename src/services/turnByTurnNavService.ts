import { Coordinates } from '../types/trip';
import { resolveApiUrl } from './deviceService';
import { loadOfflineKv, saveOfflineKv } from './offlineDbService';

export type NavMode = 'drive' | 'motorcycle' | 'walk' | 'bicycle';

export type TurnManeuverType =
  | 'straight'
  | 'left'
  | 'right'
  | 'slight_left'
  | 'slight_right'
  | 'sharp_left'
  | 'sharp_right'
  | 'uturn'
  | 'roundabout'
  | 'merge'
  | 'exit'
  | 'arrive'
  | 'depart';

export interface TurnStep {
  index: number;
  instruction: string;
  type: TurnManeuverType;
  streetName?: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: Coordinates;
  fromIndex: number;
  toIndex: number;
}

export interface TurnByTurnRoute {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationHours: number;
  originCoordinates: Coordinates;
  destinationCoordinates: Coordinates;
  polylinePoints: [number, number][];
  steps: TurnStep[];
  provider: string;
}

export interface NavProgressSnapshot {
  activeStepIndex: number;
  distanceToNextTurnMeters: number;
  remainingDistanceMeters: number;
  remainingDurationSeconds: number;
  offRouteMeters: number;
  isOffRoute: boolean;
  arrived: boolean;
  voiceKey: string | null;
  voicePrompt: string | null;
}

export function decodeEncodedPolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    const dLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index < encoded.length);
    const dLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dLng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Exact distance from a GPS point to the closest segment of a polyline,
 * plus the closest vertex index along the route.
 */
export function pointToPolylineDistanceMeters(
  pos: Coordinates,
  routePoints: [number, number][]
): { offRouteMeters: number; nearestIndex: number } {
  if (routePoints.length === 0) return { offRouteMeters: 0, nearestIndex: 0 };
  if (routePoints.length === 1) {
    return {
      offRouteMeters: haversineMeters(pos, { lat: routePoints[0][0], lng: routePoints[0][1] }),
      nearestIndex: 0
    };
  }

  let bestMeters = Infinity;
  let bestIdx = 0;
  const cosLat = Math.cos((pos.lat * Math.PI) / 180);

  for (let i = 1; i < routePoints.length; i++) {
    const [lat1, lng1] = routePoints[i - 1];
    const [lat2, lng2] = routePoints[i];

    const dx = (lng2 - lng1) * cosLat;
    const dy = lat2 - lat1;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      const px = (pos.lng - lng1) * cosLat;
      const py = pos.lat - lat1;
      t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
    }

    const projLat = lat1 + t * (lat2 - lat1);
    const projLng = lng1 + t * (lng2 - lng1);
    const d = haversineMeters(pos, { lat: projLat, lng: projLng });
    if (d < bestMeters) {
      bestMeters = d;
      bestIdx = t >= 0.5 ? i : i - 1;
    }
  }

  return { offRouteMeters: Math.round(bestMeters), nearestIndex: bestIdx };
}

export function evaluateNavigationProgress(
  gpsPos: Coordinates,
  routePoints: [number, number][],
  steps: TurnStep[],
  currentStepIndex: number,
  speedMps?: number | null
): NavProgressSnapshot {
  const { offRouteMeters, nearestIndex } = pointToPolylineDistanceMeters(gpsPos, routePoints);
  const destPoint = routePoints.length > 0
    ? { lat: routePoints[routePoints.length - 1][0], lng: routePoints[routePoints.length - 1][1] }
    : (steps[steps.length - 1]?.coordinates || gpsPos);

  const distToDestDirect = haversineMeters(gpsPos, destPoint);
  const arrived = distToDestDirect <= 45;
  const isOffRoute = !arrived && offRouteMeters > 85;

  if (steps.length === 0) {
    const estSpeed = speedMps && speedMps > 2 ? speedMps : 11.1; // ~40 km/h default
    return {
      activeStepIndex: 0,
      distanceToNextTurnMeters: Math.round(distToDestDirect),
      remainingDistanceMeters: Math.round(distToDestDirect),
      remainingDurationSeconds: Math.round(distToDestDirect / estSpeed),
      offRouteMeters,
      isOffRoute,
      arrived,
      voiceKey: arrived ? 'arrived' : null,
      voicePrompt: arrived ? 'You have arrived at your destination.' : null
    };
  }

  let nextIdx = Math.max(0, Math.min(steps.length - 1, currentStepIndex));

  // Advance step automatically if user passed the maneuver point or reached within 30m of the next turn
  while (nextIdx < steps.length - 1) {
    const nextStep = steps[nextIdx + 1];
    const distToUpcoming = haversineMeters(gpsPos, nextStep.coordinates);
    const passedByRouteIndex = nextStep.fromIndex > 0 && nearestIndex >= nextStep.fromIndex && distToUpcoming < 65;
    if (distToUpcoming <= 30 || passedByRouteIndex) {
      nextIdx += 1;
    } else {
      break;
    }
  }

  const upcomingManeuver = steps[Math.min(nextIdx + 1, steps.length - 1)];
  const distanceToNextTurnMeters = arrived
    ? 0
    : Math.round(haversineMeters(gpsPos, upcomingManeuver.coordinates));

  // Remaining distance & duration from active step onwards
  let remainingDistanceMeters = distanceToNextTurnMeters;
  let remainingDurationSeconds = 0;
  for (let i = nextIdx + 1; i < steps.length; i++) {
    remainingDistanceMeters += steps[i].distanceMeters;
    remainingDurationSeconds += steps[i].durationSeconds;
  }
  const activeStep = steps[nextIdx];
  if (activeStep && activeStep.distanceMeters > 0) {
    const ratio = Math.min(1, distanceToNextTurnMeters / activeStep.distanceMeters);
    remainingDurationSeconds += Math.round(activeStep.durationSeconds * ratio);
  }
  if (arrived) {
    remainingDistanceMeters = 0;
    remainingDurationSeconds = 0;
  }

  // Determine clean spoken voice cue threshold (never repeats for the same step + bucket)
  let voiceKey: string | null = null;
  let voicePrompt: string | null = null;
  const targetStep = steps[Math.min(nextIdx + 1, steps.length - 1)] || steps[nextIdx];

  if (arrived) {
    voiceKey = 'arrived';
    voicePrompt = 'You have arrived at your destination.';
  } else if (targetStep && targetStep.instruction) {
    if (distanceToNextTurnMeters <= 50) {
      voiceKey = `step-${targetStep.index}-now`;
      voicePrompt = `${targetStep.instruction} now.`;
    } else if (distanceToNextTurnMeters <= 180) {
      voiceKey = `step-${targetStep.index}-150`;
      voicePrompt = `In ${Math.round(distanceToNextTurnMeters / 10) * 10} meters, ${targetStep.instruction}.`;
    } else if (distanceToNextTurnMeters <= 520 && distanceToNextTurnMeters >= 400) {
      voiceKey = `step-${targetStep.index}-500`;
      voicePrompt = `In 500 meters, ${targetStep.instruction}.`;
    }
  }

  return {
    activeStepIndex: nextIdx,
    distanceToNextTurnMeters,
    remainingDistanceMeters: Math.max(0, Math.round(remainingDistanceMeters)),
    remainingDurationSeconds: Math.max(0, Math.round(remainingDurationSeconds)),
    offRouteMeters,
    isOffRoute,
    arrived,
    voiceKey,
    voicePrompt
  };
}

export function formatNavDistance(meters: number): string {
  const m = Math.max(0, Math.round(meters));
  if (m < 1000) {
    return `${m < 50 ? m : Math.round(m / 10) * 10} m`;
  }
  const km = m / 1000;
  return km >= 100 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
}

export function formatNavDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

export function formatNavArrivalClock(secondsFromNow: number): string {
  const arrival = new Date(Date.now() + Math.max(0, secondsFromNow) * 1000);
  return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function speakNavigationInstruction(text: string, enabled: boolean): void {
  if (!enabled || !text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  } catch {
    // Graceful no-op on restricted WebViews
  }
}

export async function fetchTurnByTurnRoute(params: {
  origin: Coordinates | string;
  destination: string;
  destinationCoordinates?: Coordinates;
  mode?: NavMode;
}): Promise<TurnByTurnRoute> {
  const modeKey = params.mode || 'drive';
  const offlineKey = `offline_nav_route:${String(params.destination || '').toLowerCase().trim()}:${modeKey}`;

  try {
    const res = await fetch(resolveApiUrl('/api/route'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: params.origin,
        destination: params.destination,
        destinationCoordinates: params.destinationCoordinates,
        navigationOnly: true,
        mode: modeKey
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `ROUTE_HTTP_${res.status}`);
    }

    const data = await res.json();
    const route = data?.route;
    if (!route || !route.encodedPolyline) {
      throw new Error('NO_ROUTE_GEOMETRY');
    }

    const polylinePoints = decodeEncodedPolyline(route.encodedPolyline);
    const steps: TurnStep[] = Array.isArray(route.steps) ? route.steps : [];

    const result: TurnByTurnRoute = {
      distanceMeters: Number.isFinite(route.distanceMeters) ? route.distanceMeters : Math.round((route.distanceKm || 0) * 1000),
      distanceKm: Number(route.distanceKm || 0),
      durationSeconds: Number.isFinite(route.durationSeconds) ? route.durationSeconds : Math.round((route.durationHours || 0) * 3600),
      durationHours: Number(route.durationHours || 0),
      originCoordinates: route.originCoordinates,
      destinationCoordinates: route.destinationCoordinates,
      polylinePoints,
      steps,
      provider: route.provider || 'geoapify_routing'
    };

    saveOfflineKv(offlineKey, result).catch(() => {});
    return result;
  } catch (netErr) {
    // Offline / Airplane-Mode fallback: serve pre-cached corridor route from IndexedDB
    try {
      const cached = await loadOfflineKv<TurnByTurnRoute>(offlineKey);
      if (cached && Array.isArray(cached.polylinePoints) && cached.polylinePoints.length > 0) {
        return { ...cached, provider: `${cached.provider} (offline_pack)` };
      }
    } catch {}
    throw netErr;
  }
}
