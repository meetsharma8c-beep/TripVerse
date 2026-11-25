import { Trip, Coordinates } from '../types/trip';
import { saveOfflineKv, loadOfflineKv } from './offlineDbService';
import { generateTripIcs } from './calendarExportService';
import { getEmergencyNumbersForCountry, resolveEmergencyCountryCode } from './emergencySosService';
import { getTravelReadinessInfo } from './travelReadinessService';
import { resolvePreciseLocationSync } from './locationService';
import { fetchTurnByTurnRoute, TurnByTurnRoute } from './turnByTurnNavService';
import { formatCurrency, getActiveCurrency } from './currencyService';
import { resolveApiUrl } from './deviceService';

const MAP_TILE_CACHE_NAME = 'tripverse-map-tiles-v3';

export interface OfflineTripPackMetadata {
  savedAt: number;
  cachedTiles: number;
  hasOfflineRoute: boolean;
  passesCached: number;
}

/**
 * Convert geographic (lat, lng) into Web Mercator slippy map tile (x, y) at zoom `z`.
 */
export function latLngToTileXY(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (clampedLat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y))
  };
}

/**
 * Compute deduplicated OpenStreetMap tile URLs (zoom 11..13) covering destination & stop coordinates.
 */
export function computeCorridorTileUrls(points: Coordinates[], maxTiles: number = 60): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(points) || points.length === 0) return urls;

  const validPoints = points.filter(
    p => p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180
  );
  if (validPoints.length === 0) return urls;

  const zooms = [11, 12, 13];
  for (const z of zooms) {
    const radius = z === 13 ? 1 : 0;
    for (const pt of validPoints) {
      const center = latLngToTileXY(pt.lat, pt.lng, z);
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (urls.length >= maxTiles) return urls;
          const n = Math.pow(2, z);
          const tx = Math.max(0, Math.min(n - 1, center.x + dx));
          const ty = Math.max(0, Math.min(n - 1, center.y + dy));
          const key = `${z}/${tx}/${ty}`;
          if (!seen.has(key)) {
            seen.add(key);
            urls.push(`https://tile.openstreetmap.org/${key}.png`);
          }
        }
      }
    }
  }

  return urls;
}

function collectTripCoordinates(trip: Trip): Coordinates[] {
  const coords: Coordinates[] = [];
  if (trip.destinationDetails?.coordinates) {
    coords.push(trip.destinationDetails.coordinates);
  } else {
    const resolvedDest = resolvePreciseLocationSync(trip.destination);
    if (resolvedDest?.coordinates) coords.push(resolvedDest.coordinates);
  }

  if (trip.origin) {
    const resolvedOrig = resolvePreciseLocationSync(trip.origin);
    if (resolvedOrig?.coordinates) coords.push(resolvedOrig.coordinates);
  }

  for (const day of trip.itinerary || []) {
    for (const act of day.activities || []) {
      if (act.coordinates && Number.isFinite(act.coordinates.lat) && Number.isFinite(act.coordinates.lng)) {
        coords.push(act.coordinates);
      } else if (act.location || act.title) {
        const loc = resolvePreciseLocationSync(`${act.title} ${trip.destination}`);
        if (loc?.coordinates) coords.push(loc.coordinates);
      }
    }
  }

  return coords.slice(0, 18);
}

function loadSavedPassesForOffline(tripId: string): any[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`tripverse_passes_${tripId}`) || localStorage.getItem('tripverse_passes_v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function buildOfflineRouteCacheKey(destination: string, mode: string = 'drive'): string {
  return `offline_nav_route:${String(destination || '').toLowerCase().trim()}:${mode}`;
}

export async function loadCachedOfflineRoute(
  destination: string,
  mode: string = 'drive'
): Promise<TurnByTurnRoute | null> {
  try {
    const exact = await loadOfflineKv<TurnByTurnRoute>(buildOfflineRouteCacheKey(destination, mode));
    if (exact && Array.isArray(exact.polylinePoints) && exact.polylinePoints.length > 0) {
      return exact;
    }
  } catch {}
  return null;
}

/**
 * Downloads the complete Airplane-Mode Offline Trip Pack:
 * 1. Itinerary, Calendar (.ics), Emergency SOS, Visa/Readiness, and Passes in IndexedDB
 * 2. Turn-by-Turn GPS Route Geometry for offline navigation
 * 3. Corridor OpenStreetMap tiles in Service Worker `CacheStorage` (`tripverse-map-tiles-v3`)
 */
export async function downloadOfflineTripPack(
  trip: Trip,
  onProgress?: (percent: number, stage: string) => void
): Promise<OfflineTripPackMetadata> {
  onProgress?.(10, 'Caching itinerary, passes & SOS contacts...');

  const countryCode = resolveEmergencyCountryCode(trip.destination);
  const passes = loadSavedPassesForOffline(trip.id);
  const coords = collectTripCoordinates(trip);

  let hasOfflineRoute = false;
  onProgress?.(35, 'Saving turn-by-turn GPS route geometry...');
  try {
    const navRoute = await fetchTurnByTurnRoute({
      origin: trip.origin || 'Mumbai',
      destination: trip.destination,
      destinationCoordinates: trip.destinationDetails?.coordinates,
      mode: trip.transportMode === 'bike' ? 'motorcycle' : 'drive'
    });
    if (navRoute && navRoute.polylinePoints.length > 0) {
      await saveOfflineKv(buildOfflineRouteCacheKey(trip.destination, 'drive'), navRoute);
      if (trip.transportMode === 'bike') {
        await saveOfflineKv(buildOfflineRouteCacheKey(trip.destination, 'motorcycle'), navRoute);
      }
      hasOfflineRoute = true;
    }
  } catch {
    // Route API offline or unreachable (e.g. air-only overseas leg); non-fatal
  }

  onProgress?.(60, 'Pre-caching corridor street map tiles...');
  const tileUrls = computeCorridorTileUrls(coords, 54);
  let cachedTiles = 0;

  if (typeof caches !== 'undefined' && tileUrls.length > 0) {
    try {
      const tileCache = await caches.open(MAP_TILE_CACHE_NAME);
      const batchSize = 9;
      for (let i = 0; i < tileUrls.length; i += batchSize) {
        const slice = tileUrls.slice(i, i + batchSize);
        await Promise.allSettled(
          slice.map(async (url) => {
            const existing = await tileCache.match(url);
            if (existing) {
              cachedTiles++;
              return;
            }
            const resp = await fetch(url, { mode: 'cors' });
            if (resp.ok) {
              await tileCache.put(url, resp.clone());
              cachedTiles++;
            }
          })
        );
        const pct = 60 + Math.round(((i + slice.length) / tileUrls.length) * 35);
        onProgress?.(Math.min(95, pct), `Cached ${cachedTiles}/${tileUrls.length} map tiles...`);
      }
    } catch {
      // CacheStorage restricted in private browsing; non-fatal
    }
  }

  const meta: OfflineTripPackMetadata = {
    savedAt: Date.now(),
    cachedTiles,
    hasOfflineRoute,
    passesCached: passes.length
  };

  await saveOfflineKv(`offline_bundle:${trip.id}`, {
    ...meta,
    trip,
    ics: generateTripIcs(trip),
    emergency: getEmergencyNumbersForCountry(countryCode),
    readiness: getTravelReadinessInfo(trip.destination),
    passes
  });

  onProgress?.(100, 'Offline Pack Ready for Airplane Mode!');
  return meta;
}

export async function getOfflineTripPackStatus(tripId: string): Promise<OfflineTripPackMetadata | null> {
  try {
    const saved = await loadOfflineKv<OfflineTripPackMetadata>(`offline_bundle:${tripId}`);
    if (saved && saved.savedAt) {
      return {
        savedAt: saved.savedAt,
        cachedTiles: Number(saved.cachedTiles || 0),
        hasOfflineRoute: Boolean(saved.hasOfflineRoute),
        passesCached: Number(saved.passesCached || 0)
      };
    }
  } catch {}
  return null;
}

/**
 * Send formatted HTML itinerary via cloud transactional email gateway,
 * falling back cleanly to a pre-filled native `mailto:` draft when offline or unconfigured.
 */
export async function dispatchTripItineraryEmail(
  trip: Trip,
  recipientEmail: string,
  recipientName?: string
): Promise<{ sentViaCloud: boolean; fallbackMailto: boolean; message: string }> {
  const currency = getActiveCurrency();
  const formattedBudget = formatCurrency(trip.estimatedTotal || trip.totalBudget, currency);
  const days = (trip.itinerary || []).map((d) => ({
    title: d.title || d.theme || `Day ${d.dayNumber}`,
    stops: (d.activities || []).map((a) => ({
      time: a.time || 'Flexible',
      title: a.title,
      cost: a.estimatedCost > 0 ? formatCurrency(a.estimatedCost, currency) : ''
    }))
  }));

  const cleanEmail = (recipientEmail || '').trim().toLowerCase();
  if (cleanEmail && cleanEmail.includes('@')) {
    try {
      const res = await fetch(resolveApiUrl('/api/email-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_itinerary',
          email: cleanEmail,
          name: recipientName || cleanEmail.split('@')[0],
          tripSummary: {
            name: trip.name,
            origin: trip.origin || 'Origin',
            destination: trip.destination,
            durationDays: trip.durationDays,
            travelersCount: trip.travelersCount,
            formattedBudget,
            shareUrl: typeof window !== 'undefined' ? window.location.origin : 'https://trip-verse.com',
            days
          }
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        return {
          sentViaCloud: true,
          fallbackMailto: false,
          message: `Itinerary emailed directly to ${cleanEmail}!`
        };
      }
    } catch {}
  }

  // Fallback: Open clean pre-formatted native email client draft
  if (typeof window !== 'undefined') {
    const subject = `TripVerse Itinerary: ${trip.destination} (${trip.durationDays} Days)`;
    const lines: string[] = [
      `${trip.name || `${trip.destination} Trip`}`,
      `Route: ${trip.origin || 'Origin'} -> ${trip.destination} | ${trip.durationDays} Days | ${trip.travelersCount} Traveler(s)`,
      `Estimated Budget: ${formattedBudget}`,
      ''
    ];
    for (let i = 0; i < days.length; i++) {
      lines.push(`DAY ${i + 1}: ${days[i].title}`);
      for (const s of days[i].stops) {
        lines.push(`  • ${s.time} - ${s.title}${s.cost ? ` (${s.cost})` : ''}`);
      }
      lines.push('');
    }
    lines.push('Planned with live market pricing on https://trip-verse.com');
    const mailtoHref = `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    window.location.href = mailtoHref;
  }

  return {
    sentViaCloud: false,
    fallbackMailto: true,
    message: 'Opened pre-filled itinerary summary in your email app!'
  };
}
