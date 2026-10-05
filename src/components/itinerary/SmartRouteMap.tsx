import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Trip, RouteType } from '../../types/trip';
import { getStoredCurrency, formatCurrency, SupportedCurrency } from '../../services/currencyService';
import { resolvePreciseLocationSync } from '../../services/locationService';
import {
  Navigation,
  MapPin,
  Car,
  Sparkles,
  Fuel,
  Coffee,
  Zap,
  Receipt,
  Camera,
  Layers,
  Compass,
  TrendingUp,
  Maximize2
} from 'lucide-react';

interface SmartRouteMapProps {
  trip: Trip;
  onRouteChange?: (newRouteType: RouteType) => void;
  onOpenLiveNav?: () => void;
}

type LayerFilter = 'all' | 'stops' | 'tolls' | 'fuel' | 'scenic';

export const SmartRouteMap: React.FC<SmartRouteMapProps> = ({
  trip,
  onRouteChange,
  onOpenLiveNav
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [selectedRoute, setSelectedRoute] = useState<RouteType>(trip.routeType || 'fastest');
  const [activeLayer, setActiveLayer] = useState<LayerFilter>('all');
  const [currency, setCurrency] = useState<SupportedCurrency>(getStoredCurrency());

  useEffect(() => {
    const handleCurrencyChange = (e: CustomEvent<SupportedCurrency>) => {
      if (e.detail) setCurrency(e.detail);
    };
    window.addEventListener('tripverse_currency_change' as any, handleCurrencyChange);
    return () => window.removeEventListener('tripverse_currency_change' as any, handleCurrencyChange);
  }, []);

  // Route configurations
  const routeOptions: Array<{
    id: RouteType;
    label: string;
    distance: string;
    duration: string;
    tag: string;
    color: string;
    description: string;
  }> = [
      {
        id: 'fastest',
        label: 'Fastest Route',
        distance: '258 km',
        duration: '4h 45m',
        tag: 'Via NH 48 Corridor',
        color: '#00B074',
        description: '6-lane expressway corridor with minimal slowdowns and bypasses.'
      },
      {
        id: 'cheapest',
        label: 'Cheapest Route',
        distance: '242 km',
        duration: '5h 30m',
        tag: 'Zero Tolls / State Road',
        color: '#0284C7',
        description: `Saves ~${formatCurrency(290, currency)} in highway expressway toll plazas with slightly lower average speeds.`
      },
      {
        id: 'comfortable',
        label: 'Most Comfortable',
        distance: '265 km',
        duration: '5h 10m',
        tag: 'Premium Rest Areas',
        color: '#8B5CF6',
        description: 'Prioritizes smooth resurfaced lanes, frequent fuel oasis stops, and AC food courts.'
      },
      {
        id: 'scenic',
        label: 'Scenic Route',
        distance: '280 km',
        duration: '5h 45m',
        tag: 'Aravalli Hills Vista',
        color: '#F59E0B',
        description: 'Sweeping mountain valley views, lakeside passes, and photo points.'
      }
    ];

  const handleSelectRoute = (r: RouteType) => {
    setSelectedRoute(r);
    if (onRouteChange) {
      onRouteChange(r);
    }
  };

  // Highway Toll Plazas
  const tollPlazas = [
    { name: 'Chiloda Toll Plaza', lat: 23.2150, lng: 72.7620, toll: 95, lanes: 'FASTag Active' },
    { name: 'Himatnagar Toll Plaza', lat: 23.5979, lng: 72.9698, toll: 110, lanes: 'Multi-lane FASTag' },
    { name: 'Ratanpur Border Toll', lat: 23.8340, lng: 73.4560, toll: 85, lanes: 'State Border Tax' }
  ];

  // Fuel & EV Stations
  const fuelAndEvStations = [
    { name: 'Shell Oasis & Tata 60kW EV', lat: 23.3500, lng: 72.8200, type: 'EV Fast Charger + Shell V-Power' },
    { name: 'Jio-bp Pulse Highway Hub', lat: 24.1200, lng: 73.6100, type: 'EV Supercharger + Clean Restrooms' }
  ];

  // Scenic Spots
  const scenicSpots = [
    { name: 'Shamlaji Aravalli Vista', lat: 23.6850, lng: 73.3850, view: 'Mountain pass panorama & heritage lake' },
    { name: 'Kherwara Valley Overlook', lat: 23.9912, lng: 73.5980, view: 'Gentle mountain curves & valley vistas' },
    { name: 'Tidi Dam Sunset Point', lat: 24.2810, lng: 73.6820, view: 'River canyon approach & sunset photo stop' }
  ];

  // Helper to create custom SVG div icons
  const createCustomIcon = (bgColor: string, svgContent: string) => {
    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          background: ${bgColor};
          color: white;
          border-radius: 50%;
          border: 2.5px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          transform: translateY(-50%);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          ${svgContent}
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20]
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [23.8, 73.2],
        zoom: 8,
        zoomControl: false,
        scrollWheelZoom: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Resolve Origin Coordinates
    let originCoords: L.LatLngTuple = [23.0225, 72.5714]; // Default Ahmedabad
    const depAct = trip.itinerary?.[0]?.activities?.find(a => a.type === 'departure');
    if (depAct?.coordinates && depAct.coordinates.lat && depAct.coordinates.lng) {
      originCoords = [depAct.coordinates.lat, depAct.coordinates.lng];
    } else {
      const resolvedOrigin = resolvePreciseLocationSync(trip.origin || 'Ahmedabad, Gujarat');
      if (resolvedOrigin?.coordinates) {
        originCoords = [resolvedOrigin.coordinates.lat, resolvedOrigin.coordinates.lng];
      }
    }

    // 2. Resolve Destination Coordinates
    let destCoords: L.LatLngTuple = [26.9124, 75.7873]; // Safe geographic default
    if (trip.destinationDetails?.coordinates && trip.destinationDetails.coordinates.lat && trip.destinationDetails.coordinates.lng) {
      destCoords = [trip.destinationDetails.coordinates.lat, trip.destinationDetails.coordinates.lng];
    } else {
      const mainAct = trip.itinerary?.[0]?.activities?.find(a => a.type === 'attraction' || a.type === 'hotel');
      if (mainAct?.coordinates && mainAct.coordinates.lat && mainAct.coordinates.lng) {
        destCoords = [mainAct.coordinates.lat, mainAct.coordinates.lng];
      } else {
        const resolvedDest = resolvePreciseLocationSync(trip.destination);
        if (resolvedDest?.coordinates) {
          destCoords = [resolvedDest.coordinates.lat, resolvedDest.coordinates.lng];
        }
      }
    }

    const startLat = originCoords[0];
    const startLng = originCoords[1];
    const endLat = destCoords[0];
    const endLng = destCoords[1];
    const cleanDest = trip.destination.split(',')[0].trim() || trip.destination;

    // Dynamic Waypoints
    const waypoints: L.LatLngTuple[] = [];

    // SVG icons
    const flagSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
    const coffeeSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`;
    const pinSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
    const tollSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
    const zapSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
    const cameraSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>`;

    // 1. Origin Marker
    waypoints.push(originCoords);
    L.marker(originCoords, {
      icon: createCustomIcon('#0B2545', flagSvg)
    })
      .bindPopup(`<div style="font-family: sans-serif; padding: 6px;">
        <span style="font-size: 10px; font-weight: bold; color: #0B2545; text-transform: uppercase;">Origin Point</span><br/>
        <strong style="font-size: 13px; color: #0F172A;">${trip.origin}</strong>
      </div>`)
      .addTo(layerGroup);

    // 2. Break stops along actual route
    if (activeLayer === 'all' || activeLayer === 'stops') {
      trip.breakStops.forEach((bs) => {
        const coords: L.LatLngTuple = [bs.coordinates.lat, bs.coordinates.lng];
        waypoints.push(coords);

        L.marker(coords, {
          icon: createCustomIcon('#00B074', coffeeSvg)
        })
          .bindPopup(`<div style="font-family: sans-serif; padding: 6px; min-width: 170px;">
            <span style="font-size: 10px; font-weight: bold; color: #00B074; text-transform: uppercase;">Highway Rest Stop</span><br/>
            <strong style="font-size: 13px; color: #0B2545;">${bs.name}</strong><br/>
            <span style="font-size: 11px; color: #64748B;">${bs.detourDistanceKm || 2} km detour • ${bs.rating}/5</span><br/>
            <span style="font-size: 11px; color: #00885B; font-weight: 600;">Halt: ${bs.estimatedStopMinutes} mins</span>
          </div>`)
          .addTo(layerGroup);
      });
    }

    // 3. Dynamic FASTag Toll Plazas along actual route
    if (activeLayer === 'all' || activeLayer === 'tolls') {
      const dynamicTolls = [
        {
          name: `${trip.origin || 'Interstate'} Corridor Toll Plaza`,
          lat: startLat + (endLat - startLat) * 0.28 + 0.005,
          lng: startLng + (endLng - startLng) * 0.28 - 0.005,
          toll: 95,
          lanes: 'FASTag Active'
        },
        {
          name: `${cleanDest} Approach Toll Plaza`,
          lat: startLat + (endLat - startLat) * 0.78 - 0.004,
          lng: startLng + (endLng - startLng) * 0.78 + 0.004,
          toll: 110,
          lanes: 'Multi-lane FASTag'
        }
      ];

      dynamicTolls.forEach(tp => {
        L.marker([tp.lat, tp.lng], {
          icon: createCustomIcon('#6366F1', tollSvg)
        })
          .bindPopup(`<div style="font-family: sans-serif; padding: 6px; min-width: 160px;">
            <span style="font-size: 10px; font-weight: bold; color: #6366F1; text-transform: uppercase;">Toll Plaza</span><br/>
            <strong style="font-size: 13px; color: #0B2545;">${tp.name}</strong><br/>
            <span style="font-size: 11px; color: #475569;">FASTag Toll: <strong>${formatCurrency(tp.toll, currency)}</strong></span><br/>
            <span style="font-size: 10px; color: #16A34A; font-weight: 600;">${tp.lanes}</span>
          </div>`)
          .addTo(layerGroup);
      });
    }

    // 4. Dynamic Fuel & EV Charging Stations
    if (activeLayer === 'all' || activeLayer === 'fuel') {
      const dynamicFuels = [
        {
          name: 'Jio-bp Pulse Highway Oasis & 60kW EV',
          lat: startLat + (endLat - startLat) * 0.42 + 0.008,
          lng: startLng + (endLng - startLng) * 0.42 + 0.008,
          type: 'EV Fast Charger + Clean Restrooms'
        },
        {
          name: 'IndianOil Swagat Highway Hub',
          lat: startLat + (endLat - startLat) * 0.68 - 0.007,
          lng: startLng + (endLng - startLng) * 0.68 - 0.007,
          type: 'EV Supercharger + 24x7 Convenience'
        }
      ];

      dynamicFuels.forEach(fe => {
        L.marker([fe.lat, fe.lng], {
          icon: createCustomIcon('#0284C7', zapSvg)
        })
          .bindPopup(`<div style="font-family: sans-serif; padding: 6px; min-width: 170px;">
            <span style="font-size: 10px; font-weight: bold; color: #0284C7; text-transform: uppercase;">Fuel & EV Charging</span><br/>
            <strong style="font-size: 13px; color: #0B2545;">${fe.name}</strong><br/>
            <span style="font-size: 11px; color: #64748B;">${fe.type}</span>
          </div>`)
          .addTo(layerGroup);
      });
    }

    // 5. Dynamic Scenic Photo Spots
    if (activeLayer === 'all' || activeLayer === 'scenic') {
      const dynamicScenics = [
        {
          name: `${cleanDest} Approach Valley Vista`,
          lat: startLat + (endLat - startLat) * 0.55 - 0.012,
          lng: startLng + (endLng - startLng) * 0.55 + 0.015,
          view: 'River valley & nature panorama photo stop'
        },
        {
          name: `${cleanDest} Golden Ridge Sunset Point`,
          lat: endLat - 0.005,
          lng: endLng + 0.005,
          view: 'Picturesque sunset angle & reflection point'
        }
      ];

      dynamicScenics.forEach(ss => {
        L.marker([ss.lat, ss.lng], {
          icon: createCustomIcon('#F59E0B', cameraSvg)
        })
          .bindPopup(`<div style="font-family: sans-serif; padding: 6px; min-width: 170px;">
            <span style="font-size: 10px; font-weight: bold; color: #D97706; text-transform: uppercase;">Scenic Viewpoint</span><br/>
            <strong style="font-size: 13px; color: #0B2545;">${ss.name}</strong><br/>
            <span style="font-size: 11px; color: #64748B;">${ss.view}</span>
          </div>`)
          .addTo(layerGroup);
      });
    }

    // 6. Destination Marker (Real Coordinates)
    waypoints.push(destCoords);
    L.marker(destCoords, {
      icon: createCustomIcon('#00B074', pinSvg)
    })
      .bindPopup(`<div style="font-family: sans-serif; padding: 6px;">
        <span style="font-size: 10px; font-weight: bold; color: #00B074; text-transform: uppercase;">Final Destination</span><br/>
        <strong style="font-size: 13px; color: #0B2545;">${trip.destination}</strong><br/>
        <span style="font-size: 10px; font-mono; color: #16A34A;">${destCoords[0].toFixed(4)}°N, ${destCoords[1].toFixed(4)}°E</span>
      </div>`)
      .addTo(layerGroup);

    // Draw Route Polyline
    const activeRouteConfig = routeOptions.find(r => r.id === selectedRoute) || routeOptions[0];
    const polyline = L.polyline(waypoints, {
      color: activeRouteConfig.color,
      weight: 5,
      opacity: 0.85,
      dashArray: selectedRoute === 'scenic' ? '8, 8' : undefined
    }).addTo(layerGroup);

    try {
      map.fitBounds(polyline.getBounds(), { padding: [45, 45] });
    } catch {
      // safe fallback
    }

  }, [trip, selectedRoute, activeLayer, currency]);

  // Camera fly-to helpers
  const flyToCoords = (lat: number, lng: number, zoom = 12) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  const recenterRoute = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds([
        [23.0525, 72.5312],
        [24.5854, 73.7125]
      ], { padding: [40, 40] });
    }
  };

  const activeRoute = routeOptions.find(r => r.id === selectedRoute) || routeOptions[0];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-caps text-[#00B074]">Interactive Highway Engine</span>
            <span className="text-xs font-bold text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">Live Pitstops, Tolls & EV</span>
          </div>
          <h2 className="text-xl font-bold font-display text-[#0B2545] mt-0.5">
            Smart Road Trip Route Map
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 text-pretty">
            Visual expressway corridors with active FASTag costs, EV fast-chargers, and highway food halts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {onOpenLiveNav && (
            <button
              onClick={onOpenLiveNav}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 animate-pulse" />
              <span>Launch Live GPS HUD</span>
            </button>
          )}
        </div>
      </div>

      {/* Route Type Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {routeOptions.map((opt) => {
          const isSelected = selectedRoute === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelectRoute(opt.id)}
              className={`p-3 rounded-2xl border text-left transition-all min-w-0 ${isSelected
                  ? 'border-[#00B074] bg-emerald-50/80 shadow-xs ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
            >
              <div className="flex items-center justify-between mb-1 gap-1">
                <span className="text-xs font-bold text-slate-900 truncate">{opt.label}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: opt.color }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0B2545] truncate font-display">
                <span className="shrink-0">{opt.duration}</span>
                <span className="text-slate-400 font-normal text-[11px] truncate">({opt.distance})</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
                {opt.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Layer Filters & Camera Controls Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">

        {/* Layer Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Layers:</span>
          </span>

          {[
            { id: 'all', label: 'All Markers' },
            { id: 'stops', label: `Rest Stops (${trip.breakStops.length})` },
            { id: 'tolls', label: `Tolls (${tollPlazas.length})` },
            { id: 'fuel', label: `Fuel & EV (${fuelAndEvStations.length})` },
            { id: 'scenic', label: `Scenic (${scenicSpots.length})` }
          ].map(layer => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id as LayerFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeLayer === layer.id
                  ? 'bg-[#0B2545] text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                }`}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Quick Camera Fly-to Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={recenterRoute}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
            title="Recenter Entire Route"
          >
            <Maximize2 className="w-3 h-3 text-emerald-600" />
            <span>Recenter</span>
          </button>
          <button
            onClick={() => flyToCoords(23.0525, 72.5312)}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Origin
          </button>
          <button
            onClick={() => flyToCoords(23.5979, 72.9698)}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Oasis Stop
          </button>
          <button
            onClick={() => flyToCoords(24.5854, 73.7125)}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Destination
          </button>
        </div>

      </div>

      {/* Leaflet Map Container */}
      <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map Legend Overlay */}
        <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-2.5 rounded-xl shadow-md border border-slate-200/80 text-[11px] font-semibold space-y-1.5 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0B2545]" />
            <span className="text-slate-700">Origin / Start Point</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00B074]" />
            <span className="text-slate-700">Rest Stops & Destination</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6366F1]" />
            <span className="text-slate-700">FASTag Toll Plazas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
            <span className="text-slate-700">Fuel & EV Superchargers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            <span className="text-slate-700">Scenic Photo Spots</span>
          </div>
        </div>
      </div>

      {/* Elevation & Highway Profile Ribbon */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-emerald-50/40 to-slate-50 border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <TrendingUp className="w-4 h-4 text-[#00B074]" />
            <span>Highway Elevation Profile</span>
          </div>
          <span className="text-slate-500 font-medium text-[11px]">
            Gradual ascent from 53m MSL (Gujarat Plains) to 598m MSL (Mewar Plateau)
          </span>
        </div>

        {/* Gradient altitude bar with milestones */}
        <div className="relative h-6 bg-slate-200/80 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-300/80 w-[25%] flex items-center justify-center text-[10px] font-bold text-emerald-950">
            53m • Ahmedabad
          </div>
          <div className="h-full bg-emerald-400/80 w-[25%] flex items-center justify-center text-[10px] font-bold text-emerald-950">
            140m • Himatnagar
          </div>
          <div className="h-full bg-emerald-500/80 w-[25%] flex items-center justify-center text-[10px] font-bold text-white">
            240m • Shamlaji Pass
          </div>
          <div className="h-full bg-emerald-600/90 w-[25%] flex items-center justify-center text-[10px] font-bold text-white">
            598m • Udaipur
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>Toll Estimate: <strong>{formatCurrency(290, currency)}</strong> via FASTag</span>
          <span>Speed Limit: <strong>80–90 km/h</strong> (NH-48 6-Lane Expressway)</span>
        </div>
      </div>

    </div>
  );
};
