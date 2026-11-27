import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trip } from '../../types/trip';
import { Navigation, Maximize2, Plane, TrainFront, MapPin } from 'lucide-react';
import { useLanguage } from '../../services/languageService';

function buildGreatCircleArc(
  start: L.LatLngTuple,
  end: L.LatLngTuple,
  segments = 40
): L.LatLngTuple[] {
  const pts: L.LatLngTuple[] = [];
  const dLat = end[0] - start[0];
  const dLng = end[1] - start[1];
  const distDeg = Math.hypot(dLat, dLng);
  // Subtle northern curvature so flight arcs look natural on Web Mercator
  const arcLift = Math.min(18, Math.max(2, distDeg * 0.16));
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = start[0] + dLat * t + Math.sin(Math.PI * t) * arcLift;
    const lng = start[1] + dLng * t;
    pts.push([Math.max(-85, Math.min(85, lat)), lng]);
  }
  return pts;
}

interface SmartRouteMapProps {
  trip: Trip;
  onOpenLiveNav?: () => void;
}

function decodePolyline(encoded: string): L.LatLngTuple[] {
  const points: L.LatLngTuple[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      if (index >= encoded.length) return [];
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      if (index >= encoded.length) return [];
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

function makePopup(title: string, detail: string): HTMLElement {
  const container = document.createElement('div');
  const heading = document.createElement('strong');
  heading.textContent = title;
  const description = document.createElement('div');
  description.textContent = detail;
  container.append(heading, description);
  return container;
}

export const SmartRouteMap: React.FC<SmartRouteMapProps> = ({ trip, onOpenLiveNav }) => {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeBoundsRef = useRef<L.LatLngBounds | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [isDarkTheme, setIsDarkTheme] = useState<boolean>(() => {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  });
  const isTrainTrip =
    trip.transportMode === 'train' || /\brail transit\b/i.test(trip.aiRationale || '');
  const isFlightTrip =
    !isTrainTrip &&
    (trip.transportMode === 'flight' ||
      /\bflight transit\b/i.test(trip.aiRationale || '') ||
      (trip.routeDetails?.distanceKm ?? 0) > 3500);
  const isNonRoadTrip = isFlightTrip || isTrainTrip;
  const [flightViewMode, setFlightViewMode] = useState<'local' | 'corridor'>('local');

  useEffect(() => {
    const syncTheme = () => {
      const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      setIsDarkTheme(dark);
    };

    window.addEventListener('tripverse-theme-change', syncTheme);
    const observer = new MutationObserver(() => syncTheme());
    if (typeof document !== 'undefined') {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    return () => {
      window.removeEventListener('tripverse-theme-change', syncTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: false,
      scrollWheelZoom: false
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Use OpenStreetMap's modern HTTP/2 tile CDN directly in both light & night modes
    // (night mode styles .leaflet-tile-pane via CSS so CARTO API-key watermarks never appear
    // and theme switching is instant with zero tile reloads).
    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    mapInstanceRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;
    layers.clearLayers();

    try {
      const routeMatchesTrip =
        !isNonRoadTrip &&
        trip.routeDetails?.source === 'geoapify_routing' &&
        trip.routeDetails.origin === trip.origin &&
        trip.routeDetails.destination === trip.destination;
      const realRoute = routeMatchesTrip && trip.routeDetails?.encodedPolyline
        ? decodePolyline(trip.routeDetails.encodedPolyline)
        : [];
      if (realRoute.length < 2) {
        // Flight or Rail Corridor Mode: Great-Circle Arc (Flight) or Rail Track Corridor (Train)
        const origCoord = trip.originCoordinates || trip.routeDetails?.originCoordinates;
        const destCoord = trip.destinationDetails?.coordinates || trip.routeDetails?.destinationCoordinates;
        if (
          isNonRoadTrip &&
          flightViewMode === 'corridor' &&
          origCoord &&
          destCoord &&
          Number.isFinite(origCoord.lat) &&
          Number.isFinite(destCoord.lat)
        ) {
          const origPt: L.LatLngTuple = [Number(origCoord.lat), Number(origCoord.lng)];
          const destPt: L.LatLngTuple = [Number(destCoord.lat), Number(destCoord.lng)];
          const arcPoints = buildGreatCircleArc(origPt, destPt, 48);

          if (isTrainTrip) {
            // Railway track style: solid rail bed + sleeper cross-ties dash
            L.polyline(arcPoints, {
              color: isDarkTheme ? '#065F46' : '#1E3E2B',
              weight: 6,
              opacity: 0.55
            }).addTo(layers);
            L.polyline(arcPoints, {
              color: isDarkTheme ? '#34D399' : '#2D5A3D',
              weight: 3,
              dashArray: '6, 6',
              opacity: 0.95
            }).addTo(layers);
          } else {
            L.polyline(arcPoints, {
              color: isDarkTheme ? '#34D399' : '#2D5A3D',
              weight: 3,
              dashArray: '8, 8',
              opacity: 0.9
            }).addTo(layers);
          }

          L.circleMarker(origPt, {
            radius: 8,
            color: '#fff',
            weight: 3,
            fillColor: '#0284C7',
            fillOpacity: 1
          })
            .bindPopup(
              makePopup(
                trip.origin || 'Origin',
                isTrainTrip ? 'Origin Railway Junction' : 'Departure Airport Hub'
              )
            )
            .addTo(layers);

          L.circleMarker(destPt, {
            radius: 9,
            color: '#fff',
            weight: 3,
            fillColor: '#10B981',
            fillOpacity: 1
          })
            .bindPopup(
              makePopup(
                trip.destination || 'Destination',
                isTrainTrip ? 'Destination Railway Junction' : 'Arrival Destination'
              )
            )
            .addTo(layers);

          map.invalidateSize();
          const bounds = L.latLngBounds(arcPoints);
          routeBoundsRef.current = bounds;
          map.fitBounds(bounds, { padding: [44, 44], maxZoom: 7 });
          return;
        }

        // Local Sightseeing Map: Plot destination center and daily destination activity spots
        const fallbackPoints: L.LatLngTuple[] = [];
        const destCenter = trip.destinationDetails?.coordinates || trip.routeDetails?.destinationCoordinates;

        if (destCenter) {
          const lat = Number(destCenter.lat);
          const lng = Number(destCenter.lng);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            const destPt: L.LatLngTuple = [lat, lng];
            fallbackPoints.push(destPt);
            L.circleMarker(destPt, {
              radius: 9,
              color: '#fff',
              weight: 3,
              fillColor: isDarkTheme ? '#10B981' : '#2D5A3D',
              fillOpacity: 1
            })
              .bindPopup(makePopup(trip.destination || 'Destination', 'Trip destination center'))
              .addTo(layers);
          }
        }

        (trip.itinerary || []).forEach(day => {
          (day.activities || []).forEach(act => {
            if (act.coordinates && Number.isFinite(act.coordinates.lat) && Number.isFinite(act.coordinates.lng)) {
              const actLat = Number(act.coordinates.lat);
              const actLng = Number(act.coordinates.lng);
              // On Train/Flight Local Map view, skip origin-city departure/return pins (>0.8 deg away from destination)
              // so the Local Map zooms cleanly into the destination's temples, hotels, and restaurants.
              if (
                isNonRoadTrip &&
                destCenter &&
                Number.isFinite(destCenter.lat) &&
                Number.isFinite(destCenter.lng) &&
                Math.hypot(actLat - Number(destCenter.lat), actLng - Number(destCenter.lng)) > 0.8
              ) {
                return;
              }
              const pt: L.LatLngTuple = [actLat, actLng];
              fallbackPoints.push(pt);
              L.circleMarker(pt, {
                radius: 6,
                color: '#fff',
                weight: 2,
                fillColor: isDarkTheme ? '#38BDF8' : '#0284C7',
                fillOpacity: 1
              })
                .bindPopup(makePopup(act.title || 'Activity', `Day ${day.dayNumber} · ${act.time || ''}`))
                .addTo(layers);
            }
          });
        });

        if (!isNonRoadTrip) {
          (trip.breakStops || []).forEach(stop => {
            if (stop?.coordinates && Number.isFinite(stop.coordinates.lat) && Number.isFinite(stop.coordinates.lng)) {
              const pt: L.LatLngTuple = [Number(stop.coordinates.lat), Number(stop.coordinates.lng)];
              fallbackPoints.push(pt);
              L.circleMarker(pt, { radius: 6, color: '#fff', weight: 2, fillColor: '#F59E0B', fillOpacity: 1 })
                .bindPopup(makePopup(stop.name || 'Stop', 'Suggested break stop'))
                .addTo(layers);
            }
          });
        }

        if (fallbackPoints.length > 0) {
          map.invalidateSize();
          const bounds = L.latLngBounds(fallbackPoints);
          routeBoundsRef.current = bounds;
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
          return;
        }

        routeBoundsRef.current = null;
        map.setView([20, 0], 2);
        return;
      }
      const start = realRoute[0];
      const end = realRoute[realRoute.length - 1];
      const routePoints = realRoute;

      if (isDarkTheme) {
        // Glowing double-layer neon emerald route for dark mode
        L.polyline(routePoints, { color: '#059669', weight: 8, opacity: 0.4 }).addTo(layers);
        L.polyline(routePoints, { color: '#34D399', weight: 4, opacity: 1 }).addTo(layers);
      } else {
        L.polyline(routePoints, { color: '#2D5A3D', weight: 5, opacity: 0.85 }).addTo(layers);
      }

      if (Number.isFinite(start[0]) && Number.isFinite(start[1])) {
        L.circleMarker(start, {
          radius: 8,
          color: '#fff',
          weight: 3,
          fillColor: isDarkTheme ? '#38BDF8' : '#0B2545',
          fillOpacity: 1
        })
          .bindPopup(makePopup(trip.origin || 'Origin', 'Trip starting point'))
          .addTo(layers);
      }
      if (Number.isFinite(end[0]) && Number.isFinite(end[1])) {
        L.circleMarker(end, {
          radius: 8,
          color: '#fff',
          weight: 3,
          fillColor: isDarkTheme ? '#10B981' : '#2D5A3D',
          fillOpacity: 1
        })
          .bindPopup(makePopup(trip.destination || 'Destination', 'Trip destination'))
          .addTo(layers);
      }

      const stops = trip.breakStops || [];
      const validStopPoints: L.LatLngTuple[] = [];

      stops.forEach(stop => {
        if (!stop?.coordinates) return;
        const lat = Number(stop.coordinates.lat);
        const lng = Number(stop.coordinates.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        const point: L.LatLngTuple = [lat, lng];
        validStopPoints.push(point);

        L.circleMarker(point, { radius: 7, color: '#fff', weight: 2, fillColor: '#F59E0B', fillOpacity: 1 })
          .bindPopup(makePopup(
            stop.name || 'Break Stop',
            stop.source === 'geoapify_places'
              ? `${stop.description || 'Highway amenity'} · Geoapify / OpenStreetMap listing; facilities not confirmed`
              : 'Saved stop; source and details are unverified'
          ))
          .addTo(layers);
      });

      map.invalidateSize();
      const allPoints: L.LatLngTuple[] = [
        ...routePoints.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])),
        ...validStopPoints
      ];

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        routeBoundsRef.current = bounds;
        map.fitBounds(bounds, {
          padding: [32, 32],
          maxZoom: 12
        });
      }
    } catch (mapErr) {
      console.warn('[SmartRouteMap] Could not render polyline or bounds:', mapErr);
    }
  }, [trip, isDarkTheme, flightViewMode, isFlightTrip, isTrainTrip, isNonRoadTrip]);

  const hasLiveRoute =
    !isNonRoadTrip &&
    trip.routeDetails?.source === 'geoapify_routing' &&
    trip.routeDetails.origin === trip.origin &&
    trip.routeDetails.destination === trip.destination &&
    Boolean(trip.routeDetails.encodedPolyline);

  const hasLocalPins = Boolean(
    trip.destinationDetails?.coordinates ||
    trip.routeDetails?.destinationCoordinates ||
    (trip.itinerary || []).some(d => (d.activities || []).some(a => Boolean(a.coordinates)))
  );
  const canRenderInteractiveMap = hasLiveRoute || hasLocalPins;

  return (
    <div id="smart-route-map" className="glass-frosted liquid-rim rounded-[30px] p-5 sm:p-7 space-y-4 scroll-mt-24">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D] dark:text-emerald-400">
            {isFlightTrip
              ? t('Flight & Destination Map')
              : isTrainTrip
                ? t('Rail & Destination Map')
                : t('Driving route')}
          </span>
          <h2 className="text-xl font-display font-bold text-[#152A1C] dark:text-white mt-0.5">
            {isFlightTrip
              ? t('Interactive sightseeing & flight map')
              : isTrainTrip
                ? t('Interactive sightseeing & rail corridor map')
                : t('Route and nearby places')}
          </h2>
          <p className="text-xs text-[#5A7362] dark:text-slate-400 mt-1">
            {hasLiveRoute
              ? `Geoapify Routing · ${trip.routeDetails?.distanceKm} km · ${t('about')} ${trip.routeDetails?.durationHours} h`
              : isFlightTrip
                ? `${trip.origin} → ${trip.destination} · ${flightViewMode === 'local' ? t('Zoomed into daily sightseeing pins') : t('Great-circle flight corridor')}`
                : isTrainTrip
                  ? `${trip.origin} → ${trip.destination} · ${flightViewMode === 'local' ? t('Zoomed into destination sightseeing pins') : t('Direct railway corridor')}`
                  : hasLocalPins
                    ? t('Showing destination and itinerary stops on interactive map')
                    : t('Live road route unavailable · no route line shown')}
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {isNonRoadTrip && !hasLiveRoute && (
            <div className="inline-flex rounded-full glass-clear liquid-rim p-1">
              <button
                type="button"
                onClick={() => setFlightViewMode('local')}
                className={`min-h-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  flightViewMode === 'local'
                    ? 'bg-[#2D5A3D] dark:bg-emerald-600 text-white shadow-xs'
                    : 'text-[#5A7362] dark:text-slate-300 hover:text-[#152A1C] dark:hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{t('Local Map')}</span>
              </button>
              <button
                type="button"
                onClick={() => setFlightViewMode('corridor')}
                className={`min-h-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  flightViewMode === 'corridor'
                    ? 'bg-[#2D5A3D] dark:bg-emerald-600 text-white shadow-xs'
                    : 'text-[#5A7362] dark:text-slate-300 hover:text-[#152A1C] dark:hover:text-white'
                }`}
              >
                {isTrainTrip ? <TrainFront className="w-3.5 h-3.5" /> : <Plane className="w-3.5 h-3.5" />}
                <span>{isTrainTrip ? t('Rail Corridor') : t('Flight Arc')}</span>
              </button>
            </div>
          )}
          {onOpenLiveNav && (
            <button
              onClick={onOpenLiveNav}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full btn-liquid-primary text-white font-bold text-xs cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{t('Get directions')}</span>
            </button>
          )}
        </div>
      </div>

      {!canRenderInteractiveMap && (
        <p className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3">
          {t('No live route is available to display. You can still enter the origin and destination in a navigation app to get directions.')}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-[#5A7362] dark:text-slate-300">
        <span>
          {hasLiveRoute
            ? t('Geoapify road geometry')
            : isFlightTrip
              ? (flightViewMode === 'local' ? t('Destination sightseeing pins') : t('Estimated air corridor'))
              : isTrainTrip
                ? (flightViewMode === 'local' ? t('Destination sightseeing pins') : t('Direct railway corridor'))
                : hasLocalPins
                  ? t('Destination & activity pins')
                  : t('Route map unavailable')}
        </span>
        <button
          type="button"
          onClick={() => {
            const map = mapInstanceRef.current;
            if (!map) return;
            if (routeBoundsRef.current && routeBoundsRef.current.isValid()) {
              map.fitBounds(routeBoundsRef.current, { padding: [32, 32], maxZoom: 13 });
            } else {
              map.setView([20, 0], 2);
            }
          }}
          className="min-h-0 flex items-center gap-1 px-3 py-1.5 rounded-full glass-clear liquid-rim liquid-press text-xs font-bold text-[#152A1C] dark:text-slate-200 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
          {t('Recenter')}
        </button>
      </div>

      <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-[#E2EBE1] dark:border-white/10">
        <div ref={mapContainerRef} className="w-full h-full" />
        {!canRenderInteractiveMap && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 p-6 text-center text-sm font-semibold text-[#57685D] dark:text-slate-300">
            {t('A live driving route is needed to draw an accurate map.')}
          </div>
        )}
      </div>
      <p className="text-[11px] text-[#5A7362] dark:text-slate-400">
        {t('Route geometry and nearby place listings are provided through Geoapify using OpenStreetMap data. Listings do not confirm opening hours, facilities, safety, or availability. Map tiles © OpenStreetMap contributors.')}
      </p>
    </div>
  );
};
