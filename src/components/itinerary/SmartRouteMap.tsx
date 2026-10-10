import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Trip } from '../../types/trip';
import { Navigation, Maximize2 } from 'lucide-react';

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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: false,
      scrollWheelZoom: false
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layerGroupRef.current;
    if (!map || !layers) return;
    layers.clearLayers();

    const routeMatchesTrip = trip.routeDetails?.source === 'geoapify_routing' &&
      trip.routeDetails.origin === trip.origin &&
      trip.routeDetails.destination === trip.destination;
    const realRoute = routeMatchesTrip && trip.routeDetails?.encodedPolyline
      ? decodePolyline(trip.routeDetails.encodedPolyline)
      : [];
    if (realRoute.length < 2) {
      map.setView([20, 0], 2);
      return;
    }
    const start = realRoute[0];
    const end = realRoute[realRoute.length - 1];
    const routePoints = realRoute;

    L.polyline(routePoints, { color: '#2D5A3D', weight: 5, opacity: 0.85 }).addTo(layers);

    L.circleMarker(start, { radius: 8, color: '#fff', weight: 3, fillColor: '#0B2545', fillOpacity: 1 })
      .bindPopup(makePopup(trip.origin, 'Trip starting point'))
      .addTo(layers);
    L.circleMarker(end, { radius: 8, color: '#fff', weight: 3, fillColor: '#2D5A3D', fillOpacity: 1 })
      .bindPopup(makePopup(trip.destination, 'Trip destination'))
      .addTo(layers);

    trip.breakStops.forEach(stop => {
      const point: L.LatLngTuple = [stop.coordinates.lat, stop.coordinates.lng];
      L.circleMarker(point, { radius: 7, color: '#fff', weight: 2, fillColor: '#F59E0B', fillOpacity: 1 })
        .bindPopup(makePopup(
          stop.name,
          stop.source === 'geoapify_places'
            ? `${stop.description} · Geoapify / OpenStreetMap listing; facilities not confirmed`
            : 'Saved stop; source and details are unverified'
        ))
        .addTo(layers);
    });

    map.invalidateSize();
    map.fitBounds(L.latLngBounds([...routePoints, ...trip.breakStops.map(stop => [stop.coordinates.lat, stop.coordinates.lng] as L.LatLngTuple)]), {
      padding: [32, 32],
      maxZoom: 12
    });
  }, [trip]);

  const hasLiveRoute = trip.routeDetails?.source === 'geoapify_routing' &&
    trip.routeDetails.origin === trip.origin &&
    trip.routeDetails.destination === trip.destination &&
    Boolean(trip.routeDetails.encodedPolyline);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">Driving route</span>
          <h2 className="text-xl font-bold text-[#0B2545] mt-0.5">Route and nearby places</h2>
          <p className="text-xs text-slate-500 mt-1">
            {hasLiveRoute
              ? `Geoapify Routing · ${trip.routeDetails?.distanceKm} km · about ${trip.routeDetails?.durationHours} h`
              : 'Live road route unavailable · no route line shown'}
          </p>
        </div>
        {onOpenLiveNav && (
          <button
            onClick={onOpenLiveNav}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trip-gradient text-white font-bold text-xs shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Get directions</span>
          </button>
        )}
      </div>

      {!hasLiveRoute && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
          No live route is available to display. You can still enter the origin and destination in a navigation app to get directions.
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{hasLiveRoute ? 'Geoapify road geometry' : 'Route map unavailable'}</span>
        <button
          type="button"
          onClick={() => {
            const map = mapInstanceRef.current;
            if (map) map.fitBounds(map.getBounds(), { padding: [32, 32] });
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Recenter
        </button>
      </div>

      <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200">
        <div ref={mapContainerRef} className="w-full h-full" />
        {!hasLiveRoute && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 p-6 text-center text-sm font-semibold text-slate-600">
            A live driving route is needed to draw an accurate map.
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        Route geometry and nearby place listings are provided through Geoapify using OpenStreetMap data. Listings do not confirm opening hours, facilities, safety, or availability. Map tiles © OpenStreetMap contributors.
      </p>
    </div>
  );
};
