const GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search';
const ROUTING_URL = 'https://api.geoapify.com/v1/routing';
const PLACES_URL = 'https://api.geoapify.com/v2/places';
const requestCounts = new Map();

// In-Memory Multi-Tier Caches to conserve Geoapify Free Tier API Credits (3,000/day limit)
const geocodeCache = new Map();
const placesCache = new Map();
const routeFeatureCache = new Map();

const GEOCODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PLACES_TTL_MS = 6 * 60 * 60 * 1000;   // 6 hours
const ROUTE_TTL_MS = 6 * 60 * 60 * 1000;    // 6 hours

function getCached(cache, key, ttl) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.ts > ttl) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(cache, key, data, maxSize = 500) {
  if (cache.size >= maxSize) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

function isSameSiteRequest(req) {
  const origin = req.headers.origin;
  if (!origin || !req.headers.host) return false;
  if (['capacitor://localhost', 'ionic://localhost', 'http://localhost', 'https://localhost'].includes(origin)) {
    return true;
  }
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function isRateLimited(req) {
  const now = Date.now();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const record = requestCounts.get(ip);
  if (!record || now - record.start > 10 * 60 * 1000) {
    requestCounts.set(ip, { start: now, count: 1 });
    return false;
  }
  record.count += 1;
  return record.count > 30;
}

function asCoordinates(value) {
  if (value && Number.isFinite(value.lat) && Number.isFinite(value.lng) &&
      value.lat >= -90 && value.lat <= 90 && value.lng >= -180 && value.lng <= 180) {
    return { lat: value.lat, lon: value.lng };
  }
  return null;
}

async function resolveLocation(value, apiKey) {
  const coordinates = asCoordinates(value);
  if (coordinates) return coordinates;
  if (typeof value !== 'string' || !value.trim() || value.length > 200) return null;

  const cacheKey = value.trim().toLowerCase();
  const cached = getCached(geocodeCache, cacheKey, GEOCODE_TTL_MS);
  if (cached) return cached;

  const url = new URL(GEOCODE_URL);
  url.searchParams.set('text', value.trim());
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('apiKey', apiKey);
  const response = await fetch(url);
  if (!response.ok) {
    throw await providerError(response, 'GEOAPIFY_GEOCODING_UNAVAILABLE');
  }
  const result = await response.json();
  const location = result.results?.[0];
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon)) return null;
  const resolved = { lat: location.lat, lon: location.lon };
  setCached(geocodeCache, cacheKey, resolved, 1000);
  return resolved;
}

function providerError(response, fallbackCode) {
  const error = new Error(fallbackCode);
  error.code = response.status === 401 || response.status === 403 ? 'GEOAPIFY_API_KEY_REJECTED' : fallbackCode;
  error.httpStatus = response.status;
  return response.json()
    .then(body => {
      error.providerMessage = typeof body.message === 'string' ? body.message : undefined;
      if (/api.?key.*(?:invalid|not found|unauthorized)|invalid.*api.?key/i.test(error.providerMessage || '')) {
        error.code = 'GEOAPIFY_API_KEY_REJECTED';
      }
      return error;
    })
    .catch(() => error);
}

function distanceKm(a, b) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.lat - a.lat);
  const dLon = radians((b.lon ?? b.lng) - (a.lon ?? a.lng));
  const lat1 = radians(a.lat);
  const lat2 = radians(b.lat);
  const haversine = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function encodePolyline(points) {
  let previousLat = 0;
  let previousLon = 0;
  let encoded = '';
  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lon = Math.round(point.lon * 1e5);
    for (const delta of [lat - previousLat, lon - previousLon]) {
      let value = delta < 0 ? ~(delta << 1) : delta << 1;
      while (value >= 0x20) {
        encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
        value >>= 5;
      }
      encoded += String.fromCharCode(value + 63);
    }
    previousLat = lat;
    previousLon = lon;
  }
  return encoded;
}

function normalizeManeuverType(rawType, instructionText) {
  const s = `${rawType || ''} ${instructionText || ''}`.toLowerCase();
  if (s.includes('destination') || s.includes('arrive')) return 'arrive';
  if (s.includes('depart') || s.includes('start')) return 'depart';
  if (s.includes('roundabout') || s.includes('rotary')) return 'roundabout';
  if (s.includes('u-turn') || s.includes('uturn') || s.includes('make a u')) return 'uturn';
  if (s.includes('sharp left')) return 'sharp_left';
  if (s.includes('sharp right')) return 'sharp_right';
  if (s.includes('slight left') || s.includes('keep left') || s.includes('bear left')) return 'slight_left';
  if (s.includes('slight right') || s.includes('keep right') || s.includes('bear right')) return 'slight_right';
  if (s.includes('left')) return 'left';
  if (s.includes('right')) return 'right';
  if (s.includes('merge')) return 'merge';
  if (s.includes('exit') || s.includes('ramp')) return 'exit';
  return 'straight';
}

function extractNavigationSteps(routeFeature, routePoints) {
  const legs = routeFeature?.properties?.legs;
  if (!Array.isArray(legs) || legs.length === 0) return [];
  const rawSteps = legs.flatMap(leg => Array.isArray(leg?.steps) ? leg.steps : []);
  return rawSteps
    .map((step, index) => {
      const fromIdx = Math.max(0, Math.min(routePoints.length - 1, Number(step?.from_index) || 0));
      const toIdx = Math.max(fromIdx, Math.min(routePoints.length - 1, Number(step?.to_index) || fromIdx));
      const pt = routePoints[fromIdx] || routePoints[0];
      const instruction =
        step?.instruction?.text ||
        step?.instruction?.post_transition_instruction ||
        step?.instruction?.pre_transition_instruction ||
        (step?.name ? `Continue on ${step.name}` : 'Continue straight');
      return {
        index,
        instruction: String(instruction).trim(),
        type: normalizeManeuverType(step?.instruction?.type, instruction),
        streetName: typeof step?.name === 'string' && step.name.trim() ? step.name.trim() : undefined,
        distanceMeters: Math.max(0, Math.round(Number(step?.distance) || 0)),
        durationSeconds: Math.max(0, Math.round(Number(step?.time) || 0)),
        coordinates: pt ? { lat: pt.lat, lng: pt.lon } : { lat: 0, lng: 0 },
        fromIndex: fromIdx,
        toIndex: toIdx
      };
    })
    .filter(s => s.instruction.length > 0);
}

async function fetchOsrmNavigationFallback(routeOrigin, routeDestination, mode) {
  const profile = mode === 'walk' ? 'foot' : mode === 'bicycle' ? 'bike' : 'driving';
  const url = `https://router.project-osrm.org/route/v1/${profile}/${routeOrigin.lon},${routeOrigin.lat};${routeDestination.lon},${routeDestination.lat}?overview=full&geometries=geojson&steps=true`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'TripVerse-Nav/1.0' }, signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    const coords = route?.geometry?.coordinates;
    if (!route || !Array.isArray(coords) || coords.length < 2) return null;
    const routePoints = coords.map(([lon, lat]) => ({ lat, lon }));
    const osrmSteps = (route.legs || []).flatMap(l => l.steps || []);
    const steps = osrmSteps.map((st, index) => {
      const m = st.maneuver || {};
      const mType = `${m.type || ''} ${m.modifier || ''}`.trim();
      const street = typeof st.name === 'string' && st.name.trim() ? st.name.trim() : '';
      const instruction = m.type === 'arrive'
        ? 'You have arrived at your destination'
        : m.type === 'depart'
          ? (street ? `Head out on ${street}` : 'Start driving on the highlighted route')
          : `${(m.modifier || m.type || 'Continue').replace(/^./, c => c.toUpperCase())}${street ? ` onto ${street}` : ''}`;
      const loc = Array.isArray(m.location) ? { lat: m.location[1], lng: m.location[0] } : { lat: routePoints[0].lat, lng: routePoints[0].lon };
      return {
        index,
        instruction,
        type: normalizeManeuverType(mType, instruction),
        streetName: street || undefined,
        distanceMeters: Math.max(0, Math.round(Number(st.distance) || 0)),
        durationSeconds: Math.max(0, Math.round(Number(st.duration) || 0)),
        coordinates: loc,
        fromIndex: 0,
        toIndex: 0
      };
    });
    return {
      distanceMeters: Math.round(Number(route.distance) || 0),
      durationSeconds: Math.round(Number(route.duration) || 0),
      routePoints,
      steps
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function getRoutePoints(geometry) {
  const coordinates = geometry?.type === 'LineString'
    ? geometry.coordinates
    : geometry?.type === 'MultiLineString'
      ? geometry.coordinates.flat()
      : [];
  return coordinates
    .filter(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))
    .map(([lon, lat]) => ({ lat, lon }));
}

function routeProgress(place, points) {
  let nearestDistance = Infinity;
  let distanceFromStartKm = 0;
  let cumulativeDistanceKm = 0;
  for (let i = 1; i < points.length; i++) {
    const start = points[i - 1];
    const end = points[i];
    const averageLatitudeRadians = ((start.lat + end.lat + place.lat) / 3) * Math.PI / 180;
    const longitudeScale = Math.cos(averageLatitudeRadians);
    const segmentX = (end.lon - start.lon) * longitudeScale;
    const segmentY = end.lat - start.lat;
    const placeX = (place.lng - start.lon) * longitudeScale;
    const placeY = place.lat - start.lat;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
    const fraction = segmentLengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, (placeX * segmentX + placeY * segmentY) / segmentLengthSquared));
    const projectedPoint = {
      lat: start.lat + (end.lat - start.lat) * fraction,
      lon: start.lon + (end.lon - start.lon) * fraction
    };
    const distance = distanceKm(place, projectedPoint);
    const segmentDistanceKm = distanceKm(start, end);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      distanceFromStartKm = cumulativeDistanceKm + segmentDistanceKm * fraction;
    }
    cumulativeDistanceKm += segmentDistanceKm;
  }
  return {
    distanceFromStartKm: Math.round(distanceFromStartKm),
    offRouteKm: Math.round(nearestDistance * 10) / 10
  };
}

function routeLengthKm(points) {
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    distance += distanceKm(points[i - 1], points[i]);
  }
  return distance;
}

function pointAtRouteDistance(points, targetDistanceKm) {
  let traversedDistanceKm = 0;
  for (let i = 1; i < points.length; i++) {
    const segmentDistanceKm = distanceKm(points[i - 1], points[i]);
    if (traversedDistanceKm + segmentDistanceKm >= targetDistanceKm) {
      const fraction = segmentDistanceKm === 0
        ? 0
        : (targetDistanceKm - traversedDistanceKm) / segmentDistanceKm;
      return {
        lat: points[i - 1].lat + (points[i].lat - points[i - 1].lat) * fraction,
        lon: points[i - 1].lon + (points[i].lon - points[i - 1].lon) * fraction
      };
    }
    traversedDistanceKm += segmentDistanceKm;
  }
  return points[points.length - 1];
}

async function searchPlaces(apiKey, point, categories, radiusMeters) {
  const cacheKey = `${point.lat.toFixed(4)},${point.lon.toFixed(4)}:${(categories || []).slice().sort().join(',')}:${radiusMeters}`;
  const cached = getCached(placesCache, cacheKey, PLACES_TTL_MS);
  if (cached) return cached;

  const url = new URL(PLACES_URL);
  url.searchParams.set('apiKey', apiKey);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categories,
      filter: {
        type: 'circle',
        lon: point.lon,
        lat: point.lat,
        radius: radiusMeters
      },
      bias: { type: 'proximity', lon: point.lon, lat: point.lat },
      limit: 20
    })
  });
  if (!response.ok) {
    throw await providerError(response, 'GEOAPIFY_PLACES_UNAVAILABLE');
  }
  const result = await response.json();
  const mapped = mapPlaceFeatures(result.features || []);
  setCached(placesCache, cacheKey, mapped, 500);
  return mapped;
}

function mapPlaceFeatures(features) {
  return features.map(feature => {
    const properties = feature.properties || {};
    const [lon, lat] = feature.geometry?.coordinates || [];
    if (!properties.place_id || !properties.name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      id: properties.place_id,
      name: properties.name,
      address: properties.formatted || properties.address_line2 || '',
      coordinates: { lat, lng: lon },
      types: properties.categories || [],
      mapUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`
    };
  }).filter(Boolean);
}

async function searchPlacesAlongRoute(apiKey, routePoints) {
  const routeLength = routeLengthKm(routePoints);
  const sampleDistances = [];
  for (let distance = 25; distance < routeLength - 15; distance += 50) {
    sampleDistances.push(distance);
  }
  if (sampleDistances.length === 0 && routeLength > 30) {
    sampleDistances.push(routeLength / 2);
  }
  const samplePoints = sampleDistances.map(distance =>
    pointAtRouteDistance(routePoints, distance)
  );
  const optionalSearches = [
    { section: 'amenities', categories: ['parking', 'leisure.picnic'] },
    { section: 'ev_charging', categories: ['service.vehicle.charging_station'] },
    { section: 'medical', categories: ['healthcare.hospital', 'healthcare.clinic_or_praxis', 'healthcare.pharmacy'] }
  ];
  const placeSearchWarnings = new Set();
  const featureSets = await Promise.all(samplePoints.map(async point => {
    const [coreResult, ...optionalResults] = await Promise.allSettled([
      searchPlaces(apiKey, point, ['catering.restaurant', 'catering.cafe', 'service.vehicle.fuel'], 12000),
      ...optionalSearches.map(search => searchPlaces(apiKey, point, search.categories, 12000))
    ]);
    if (coreResult.status === 'rejected') throw coreResult.reason;

    optionalResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        placeSearchWarnings.add(optionalSearches[index].section);
        console.warn('Geoapify optional pitstop category search failed', {
          section: optionalSearches[index].section,
          category: optionalSearches[index].categories[0],
          httpStatus: result.reason?.httpStatus,
          message: result.reason?.providerMessage
        });
      }
    });

    return [
      ...coreResult.value,
      ...optionalResults.flatMap(result => result.status === 'fulfilled' ? result.value : [])
    ];
  }));
  const uniquePlaces = new Map();
  for (const place of featureSets.flat()) {
    const progress = routeProgress(place.coordinates, routePoints);
    if (progress.offRouteKm > 12 || uniquePlaces.has(place.id)) continue;
    uniquePlaces.set(place.id, {
      ...place,
      distanceFromStartKm: progress.distanceFromStartKm,
      offRouteKm: progress.offRouteKm
    });
  }
  return {
    places: [...uniquePlaces.values()].sort((a, b) => a.distanceFromStartKm - b.distanceFromStartKm),
    placeSearchWarnings: [...placeSearchWarnings]
  };
}

async function searchDestinationPlaces(apiKey, point) {
  return searchPlaces(
    apiKey,
    point,
    ['tourism.attraction', 'tourism.sights', 'leisure.park', 'catering.restaurant', 'catering.cafe', 'accommodation.hotel'],
    15000
  );
}

export default async function handler(req, res) {
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (!isSameSiteRequest(req)) return res.status(403).json({ error: 'ORIGIN_NOT_ALLOWED' });
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  if (isRateLimited(req)) return res.status(429).json({ error: 'RATE_LIMITED' });

  const { origin, destination, destinationCoordinates, navigationOnly, mode } = req.body || {};
  const routingMode = ['drive', 'motorcycle', 'walk', 'bicycle'].includes(mode) ? mode : 'drive';
  const explicitDestCoords = asCoordinates(destinationCoordinates);
  if ((!asCoordinates(origin) && (typeof origin !== 'string' || !origin.trim() || origin.length > 200)) ||
      (!explicitDestCoords && (typeof destination !== 'string' || !destination.trim() || destination.length > 200))) {
    return res.status(400).json({ error: 'INVALID_ROUTE_INPUT' });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey && !(navigationOnly && asCoordinates(origin) && explicitDestCoords)) {
    return res.status(503).json({ error: 'GEOAPIFY_API_KEY_NOT_CONFIGURED' });
  }

  try {
    const [routeOrigin, initialRouteDestination] = await Promise.all([
      asCoordinates(origin) ? Promise.resolve(asCoordinates(origin)) : resolveLocation(origin, apiKey),
      explicitDestCoords ? Promise.resolve(explicitDestCoords) : resolveLocation(destination, apiKey)
    ]);
    if (!routeOrigin || !initialRouteDestination) {
      return res.status(422).json({ error: 'GEOAPIFY_LOCATION_NOT_FOUND' });
    }

    const destinationCandidates = [initialRouteDestination];
    if (typeof destination === 'string' && apiKey) {
      const normalizedDestination = destination.replace(/\s*\(([^)]+)\)/g, ', $1').trim();
      const simplifiedDestination = destination.replace(/\s*\([^)]+\)/g, '').trim();
      for (const candidate of [normalizedDestination, simplifiedDestination]) {
        if (candidate && candidate !== destination) destinationCandidates.push(candidate);
      }
    }

    let routeDestination = initialRouteDestination;
    let routeFeature;
    let routePoints = [];
    let lastRouteError;
    if (apiKey) {
      for (const [index, candidate] of destinationCandidates.entries()) {
        if (index > 0) {
          try {
            routeDestination = await resolveLocation(candidate, apiKey);
          } catch (error) {
            lastRouteError = error;
            continue;
          }
          if (!routeDestination ||
              (routeDestination.lat === initialRouteDestination.lat &&
               routeDestination.lon === initialRouteDestination.lon)) continue;
        }

        const routeCacheKey = `${routingMode}|${routeOrigin.lat.toFixed(4)},${routeOrigin.lon.toFixed(4)}|${routeDestination.lat.toFixed(4)},${routeDestination.lon.toFixed(4)}`;
        const cachedRoute = getCached(routeFeatureCache, routeCacheKey, ROUTE_TTL_MS);
        if (cachedRoute) {
          routeFeature = cachedRoute.feature;
          routePoints = cachedRoute.points;
          break;
        }

        const routingUrl = new URL(ROUTING_URL);
        routingUrl.searchParams.set('waypoints',
          `${routeOrigin.lat},${routeOrigin.lon}|${routeDestination.lat},${routeDestination.lon}`);
        routingUrl.searchParams.set('mode', routingMode);
        routingUrl.searchParams.set('type', 'balanced');
        routingUrl.searchParams.set('details', 'instruction_details');
        routingUrl.searchParams.set('format', 'geojson');
        routingUrl.searchParams.set('apiKey', apiKey);
        try {
          const routeResponse = await fetch(routingUrl);
          if (!routeResponse.ok) {
            throw await providerError(routeResponse, 'GEOAPIFY_ROUTING_UNAVAILABLE');
          }
          const routeData = await routeResponse.json();
          routeFeature = routeData.features?.[0];
          routePoints = getRoutePoints(routeFeature?.geometry);
          if (routeFeature && routePoints.length >= 2) {
            setCached(routeFeatureCache, routeCacheKey, { feature: routeFeature, points: routePoints }, 300);
            break;
          }
          lastRouteError = Object.assign(new Error('GEOAPIFY_ROUTE_NOT_FOUND'), {
            code: 'GEOAPIFY_ROUTE_NOT_FOUND'
          });
        } catch (error) {
          lastRouteError = error;
        }
      }
    }

    if ((!routeFeature || routePoints.length < 2) && navigationOnly) {
      const osrm = await fetchOsrmNavigationFallback(routeOrigin, routeDestination, routingMode);
      if (osrm) {
        return res.status(200).json({
          route: {
            distanceKm: Math.round(osrm.distanceMeters / 100) / 10,
            distanceMeters: osrm.distanceMeters,
            durationHours: Math.round((osrm.durationSeconds / 3600) * 10) / 10,
            durationSeconds: osrm.durationSeconds,
            encodedPolyline: encodePolyline(osrm.routePoints),
            originCoordinates: { lat: routeOrigin.lat, lng: routeOrigin.lon },
            destinationCoordinates: { lat: routeDestination.lat, lng: routeDestination.lon },
            steps: osrm.steps,
            provider: 'osrm_fallback'
          }
        });
      }
    }
    if (!routeFeature || routePoints.length < 2) throw lastRouteError;

    const properties = routeFeature.properties || {};
    if (!Number.isFinite(properties.distance) || !Number.isFinite(properties.time)) {
      return res.status(502).json({ error: 'GEOAPIFY_ROUTE_DATA_INVALID' });
    }
    const steps = extractNavigationSteps(routeFeature, routePoints);

    if (navigationOnly) {
      return res.status(200).json({
        route: {
          distanceKm: Math.round(properties.distance / 100) / 10,
          distanceMeters: Math.round(properties.distance),
          durationHours: Math.round((properties.time / 3600) * 10) / 10,
          durationSeconds: Math.round(properties.time),
          encodedPolyline: encodePolyline(routePoints),
          originCoordinates: { lat: routeOrigin.lat, lng: routeOrigin.lon },
          destinationCoordinates: { lat: routeDestination.lat, lng: routeDestination.lon },
          steps,
          provider: 'geoapify_routing'
        }
      });
    }

    const [routeSearch, destinationPlaces] = await Promise.all([
      searchPlacesAlongRoute(apiKey, routePoints),
      searchDestinationPlaces(apiKey, routeDestination)
    ]);

    return res.status(200).json({
      route: {
        distanceKm: Math.round(properties.distance / 100) / 10,
        distanceMeters: Math.round(properties.distance),
        durationHours: Math.round((properties.time / 3600) * 10) / 10,
        durationSeconds: Math.round(properties.time),
        encodedPolyline: encodePolyline(routePoints),
        originCoordinates: { lat: routeOrigin.lat, lng: routeOrigin.lon },
        destinationCoordinates: { lat: routeDestination.lat, lng: routeDestination.lon },
        steps,
        provider: 'geoapify_routing'
      },
      places: routeSearch.places,
      placeSearchWarnings: routeSearch.placeSearchWarnings,
      destinationPlaces
    });
  } catch (error) {
    console.error('Geoapify travel data request failed', {
      code: error.code || 'GEOAPIFY_TRAVEL_DATA_UNAVAILABLE',
      httpStatus: error.httpStatus,
      message: error.providerMessage
    });
    return res.status(502).json({
      error: error.code || 'GEOAPIFY_TRAVEL_DATA_UNAVAILABLE'
    });
  }
}
