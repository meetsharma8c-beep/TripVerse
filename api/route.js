const GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search';
const ROUTING_URL = 'https://api.geoapify.com/v1/routing';
const PLACES_URL = 'https://api.geoapify.com/v2/places';
const requestCounts = new Map();

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
  return { lat: location.lat, lon: location.lon };
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
  return mapPlaceFeatures(result.features || []);
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

  const { origin, destination } = req.body || {};
  if ((!asCoordinates(origin) && (typeof origin !== 'string' || !origin.trim() || origin.length > 200)) ||
      typeof destination !== 'string' || !destination.trim() || destination.length > 200) {
    return res.status(400).json({ error: 'INVALID_ROUTE_INPUT' });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'GEOAPIFY_API_KEY_NOT_CONFIGURED' });

  try {
    const [routeOrigin, initialRouteDestination] = await Promise.all([
      resolveLocation(origin, apiKey),
      resolveLocation(destination, apiKey)
    ]);
    if (!routeOrigin || !initialRouteDestination) {
      return res.status(422).json({ error: 'GEOAPIFY_LOCATION_NOT_FOUND' });
    }

    const destinationCandidates = [initialRouteDestination];
    if (typeof destination === 'string') {
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

      const routingUrl = new URL(ROUTING_URL);
      routingUrl.searchParams.set('waypoints',
        `${routeOrigin.lat},${routeOrigin.lon}|${routeDestination.lat},${routeDestination.lon}`);
      routingUrl.searchParams.set('mode', 'drive');
      routingUrl.searchParams.set('type', 'balanced');
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
        if (routeFeature && routePoints.length >= 2) break;
        lastRouteError = Object.assign(new Error('GEOAPIFY_ROUTE_NOT_FOUND'), {
          code: 'GEOAPIFY_ROUTE_NOT_FOUND'
        });
      } catch (error) {
        lastRouteError = error;
      }
    }
    if (!routeFeature || routePoints.length < 2) throw lastRouteError;

    const [routeSearch, destinationPlaces] = await Promise.all([
      searchPlacesAlongRoute(apiKey, routePoints),
      searchDestinationPlaces(apiKey, routeDestination)
    ]);
    const properties = routeFeature.properties || {};
    if (!Number.isFinite(properties.distance) || !Number.isFinite(properties.time)) {
      return res.status(502).json({ error: 'GEOAPIFY_ROUTE_DATA_INVALID' });
    }

    return res.status(200).json({
      route: {
        distanceKm: Math.round(properties.distance / 100) / 10,
        durationHours: Math.round((properties.time / 3600) * 10) / 10,
        encodedPolyline: encodePolyline(routePoints),
        originCoordinates: { lat: routeOrigin.lat, lng: routeOrigin.lon },
        destinationCoordinates: { lat: routeDestination.lat, lng: routeDestination.lon }
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
