import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinates, Trip } from '../../types/trip';
import {
  ArrowUp,
  Car,
  Bike,
  Footprints,
  ChevronLeft,
  ChevronRight,
  Compass,
  ExternalLink,
  Flag,
  List,
  Loader2,
  LocateFixed,
  Navigation,
  RefreshCw,
  RotateCcw,
  CornerUpLeft,
  CornerUpRight,
  GitMerge,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../../services/languageService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import {
  NavMode,
  TurnByTurnRoute,
  TurnManeuverType,
  evaluateNavigationProgress,
  fetchTurnByTurnRoute,
  formatNavArrivalClock,
  formatNavDistance,
  formatNavDuration,
  speakNavigationInstruction
} from '../../services/turnByTurnNavService';

interface LiveNavigationHUDProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
}

interface NavStopTarget {
  id: string;
  label: string;
  subtitle?: string;
  coordinates?: Coordinates;
  query: string;
}

function ManeuverIcon({ type, className = 'w-7 h-7' }: { type: TurnManeuverType; className?: string }) {
  switch (type) {
    case 'left':
    case 'slight_left':
    case 'sharp_left':
      return <CornerUpLeft className={className} />;
    case 'right':
    case 'slight_right':
    case 'sharp_right':
      return <CornerUpRight className={className} />;
    case 'uturn':
    case 'roundabout':
      return <RotateCcw className={className} />;
    case 'merge':
    case 'exit':
      return <GitMerge className={className} />;
    case 'arrive':
      return <Flag className={className} />;
    default:
      return <ArrowUp className={className} />;
  }
}

export const LiveNavigationHUD: React.FC<LiveNavigationHUDProps> = ({ trip, isOpen, onClose }) => {
  const { t } = useLanguage();
  useModalBehavior(isOpen, onClose);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const gpsMarkerRef = useRef<L.CircleMarker | null>(null);
  const gpsAccuracyRef = useRef<L.Circle | null>(null);
  const activeTurnMarkerRef = useRef<L.CircleMarker | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastSpokenKeyRef = useRef<string | null>(null);
  const lastRerouteAtRef = useRef<number>(0);

  const defaultMode: NavMode =
    trip.transportMode === 'bike' ? 'motorcycle' : 'drive';

  const navTargets = useMemo<NavStopTarget[]>(() => {
    const list: NavStopTarget[] = [
      {
        id: 'main-dest',
        label: trip.destination || 'Destination',
        subtitle: 'Final Destination',
        coordinates: trip.routeDetails?.destinationCoordinates || trip.destinationDetails?.coordinates,
        query: trip.destination || 'Destination'
      }
    ];
    const seen = new Set<string>([list[0].label.toLowerCase()]);
    for (const day of trip.itinerary || []) {
      for (const act of day.activities || []) {
        if (!act.title || seen.has(act.title.toLowerCase())) continue;
        if (act.coordinates && Number.isFinite(act.coordinates.lat) && Number.isFinite(act.coordinates.lng)) {
          seen.add(act.title.toLowerCase());
          list.push({
            id: `act-${day.dayNumber}-${act.id}`,
            label: act.title,
            subtitle: `Day ${day.dayNumber}${act.time ? ` · ${act.time}` : ''}`,
            coordinates: act.coordinates,
            query: `${act.title}, ${trip.destination}`
          });
          if (list.length >= 10) break;
        }
      }
      if (list.length >= 10) break;
    }
    return list;
  }, [trip]);

  const [selectedTargetId, setSelectedTargetId] = useState<string>('main-dest');
  const [navMode, setNavMode] = useState<NavMode>(defaultMode);
  const [route, setRoute] = useState<TurnByTurnRoute | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [gpsEnabled, setGpsEnabled] = useState<boolean>(true);
  const [gpsStatus, setGpsStatus] = useState<'locating' | 'active' | 'denied' | 'unsupported'>('locating');
  const [gpsPos, setGpsPos] = useState<Coordinates | null>(null);
  const [gpsSpeedKmh, setGpsSpeedKmh] = useState<number | null>(null);
  const [followCamera, setFollowCamera] = useState<boolean>(true);

  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [showStepsDrawer, setShowStepsDrawer] = useState<boolean>(false);
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);
  const [distanceToTurnM, setDistanceToTurnM] = useState<number | null>(null);
  const [remainingDistM, setRemainingDistM] = useState<number | null>(null);
  const [remainingDurS, setRemainingDurS] = useState<number | null>(null);
  const [isOffRoute, setIsOffRoute] = useState<boolean>(false);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);
  const [arrived, setArrived] = useState<boolean>(false);

  const selectedTarget = useMemo(
    () => navTargets.find(x => x.id === selectedTargetId) || navTargets[0],
    [navTargets, selectedTargetId]
  );

  // Build external traffic handoff URLs (compact fallback for live traffic jams)
  const externalDestParam = selectedTarget?.coordinates
    ? `${selectedTarget.coordinates.lat},${selectedTarget.coordinates.lng}`
    : (selectedTarget?.query || trip.destination || 'Destination');
  const externalOriginParam = gpsPos
    ? `${gpsPos.lat},${gpsPos.lng}`
    : trip.routeDetails?.originCoordinates
      ? `${trip.routeDetails.originCoordinates.lat},${trip.routeDetails.originCoordinates.lng}`
      : (trip.origin && !trip.origin.toLowerCase().startsWith('current location') ? trip.origin : undefined);

  const googleDirections = new URLSearchParams({
    api: '1',
    destination: externalDestParam,
    travelmode: navMode === 'walk' ? 'walking' : navMode === 'motorcycle' ? 'two-wheeler' : 'driving'
  });
  if (externalOriginParam) googleDirections.set('origin', externalOriginParam);
  const googleMapsUrl = `https://www.google.com/maps/dir/?${googleDirections.toString()}`;

  const appleDirections = new URLSearchParams({
    daddr: externalDestParam,
    dirflg: navMode === 'walk' ? 'w' : 'd'
  });
  if (externalOriginParam) appleDirections.set('saddr', externalOriginParam);
  const appleMapsUrl = `https://maps.apple.com/?${appleDirections.toString()}`;

  const loadRoute = useCallback(async (originOverride?: Coordinates | string, isAutoReroute = false) => {
    if (!selectedTarget) return;
    if (isAutoReroute) {
      setIsRerouting(true);
    } else {
      setIsLoadingRoute(true);
    }
    setRouteError(null);

    const originInput: Coordinates | string =
      originOverride ||
      gpsPos ||
      trip.routeDetails?.originCoordinates ||
      trip.originCoordinates ||
      (trip.origin && !trip.origin.toLowerCase().startsWith('current location') ? trip.origin : 'New Delhi, India');

    try {
      const nextRoute = await fetchTurnByTurnRoute({
        origin: originInput,
        destination: selectedTarget.query,
        destinationCoordinates: selectedTarget.coordinates,
        mode: navMode
      });
      setRoute(nextRoute);
      setActiveStepIdx(0);
      setDistanceToTurnM(nextRoute.steps[0]?.distanceMeters ?? nextRoute.distanceMeters);
      setRemainingDistM(nextRoute.distanceMeters);
      setRemainingDurS(nextRoute.durationSeconds);
      setIsOffRoute(false);
      setArrived(false);
      lastSpokenKeyRef.current = null;

      if (isAutoReroute && voiceEnabled) {
        speakNavigationInstruction('Route recalculated. Follow the highlighted path.', true);
      }
    } catch (err: any) {
      setRouteError(err?.message || 'Unable to fetch turn-by-turn route right now.');
    } finally {
      setIsLoadingRoute(false);
      setIsRerouting(false);
    }
  }, [selectedTarget, gpsPos, trip.routeDetails?.originCoordinates, trip.originCoordinates, trip.origin, navMode, voiceEnabled]);

  // Initial route load whenever HUD opens, mode changes, or target changes
  useEffect(() => {
    if (!isOpen) return;
    loadRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedTargetId, navMode]);

  // Initialize interactive Leaflet map when modal opens
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: false,
      attributionControl: true
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    map.on('dragstart', () => {
      setFollowCamera(false);
    });

    mapRef.current = map;
    routeLayerRef.current = L.layerGroup().addTo(map);

    // Ensure proper tile sizing after dialog animation
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 180);

    return () => {
      clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      gpsMarkerRef.current = null;
      gpsAccuracyRef.current = null;
      activeTurnMarkerRef.current = null;
    };
  }, [isOpen]);

  // Draw route polyline + origin/destination markers whenever route updates
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer || !route || route.polylinePoints.length < 2) return;

    layer.clearLayers();
    // Outer dark casing for contrast in both light and dark modes
    L.polyline(route.polylinePoints, {
      color: '#064E3B',
      weight: 9,
      opacity: 0.55,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(layer);

    // Inner bright TripVerse emerald path
    const mainLine = L.polyline(route.polylinePoints, {
      color: '#10B981',
      weight: 5,
      opacity: 0.96,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(layer);

    // Origin marker
    L.circleMarker([route.originCoordinates.lat, route.originCoordinates.lng], {
      radius: 7,
      color: '#FFFFFF',
      weight: 2.5,
      fillColor: '#0EA5E9',
      fillOpacity: 1
    }).addTo(layer);

    // Destination marker
    L.circleMarker([route.destinationCoordinates.lat, route.destinationCoordinates.lng], {
      radius: 9,
      color: '#FFFFFF',
      weight: 3,
      fillColor: '#10B981',
      fillOpacity: 1
    }).bindPopup(`<strong>${selectedTarget?.label || trip.destination}</strong>`).addTo(layer);

    if (!gpsPos || !followCamera) {
      map.fitBounds(mainLine.getBounds(), { padding: [48, 48], maxZoom: 15 });
    }
  }, [route, selectedTarget?.label, trip.destination]);

  // Highlight active turn maneuver pin on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route || !route.steps.length) return;
    const targetStep = route.steps[Math.min(activeStepIdx + 1, route.steps.length - 1)] || route.steps[activeStepIdx];
    if (!targetStep) return;

    if (activeTurnMarkerRef.current) {
      activeTurnMarkerRef.current.setLatLng([targetStep.coordinates.lat, targetStep.coordinates.lng]);
    } else {
      activeTurnMarkerRef.current = L.circleMarker([targetStep.coordinates.lat, targetStep.coordinates.lng], {
        radius: 8,
        color: '#FFFFFF',
        weight: 2.5,
        fillColor: '#F59E0B',
        fillOpacity: 1
      }).addTo(map);
    }
  }, [route, activeStepIdx]);

  // Live GPS watcher + Screen Wake Lock
  useEffect(() => {
    if (!isOpen || !gpsEnabled) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {});
        wakeLockRef.current = null;
      }
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unsupported');
      return;
    }

    setGpsStatus('locating');

    // Request Screen Wake Lock so the phone stays awake while navigating
    if ('wakeLock' in navigator && typeof (navigator as any).wakeLock?.request === 'function') {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLockRef.current = lock;
      }).catch(() => {});
    }

    let hadFirstFix = false;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        const acc = Math.min(250, Math.max(10, position.coords.accuracy || 25));
        const speedMps = position.coords.speed;
        setGpsPos(coords);
        setGpsStatus('active');
        setGpsSpeedKmh(
          typeof speedMps === 'number' && Number.isFinite(speedMps) && speedMps >= 0
            ? Math.round(speedMps * 3.6)
            : null
        );

        // Update live blue GPS puck + accuracy ring on Leaflet map
        const map = mapRef.current;
        if (map) {
          if (!gpsAccuracyRef.current) {
            gpsAccuracyRef.current = L.circle([coords.lat, coords.lng], {
              radius: acc,
              color: '#38BDF8',
              weight: 1,
              fillColor: '#38BDF8',
              fillOpacity: 0.16
            }).addTo(map);
          } else {
            gpsAccuracyRef.current.setLatLng([coords.lat, coords.lng]).setRadius(acc);
          }

          if (!gpsMarkerRef.current) {
            gpsMarkerRef.current = L.circleMarker([coords.lat, coords.lng], {
              radius: 8,
              color: '#FFFFFF',
              weight: 3,
              fillColor: '#0284C7',
              fillOpacity: 1
            }).addTo(map);
          } else {
            gpsMarkerRef.current.setLatLng([coords.lat, coords.lng]);
          }

          if (followCamera) {
            map.setView([coords.lat, coords.lng], Math.max(map.getZoom(), 15), { animate: true });
          }
        }

        // On first live GPS fix, if user chose Current Location or is >300m from origin, re-anchor route to real GPS
        if (!hadFirstFix) {
          hadFirstFix = true;
          if ((trip.origin || '').toLowerCase().startsWith('current location')) {
            loadRoute(coords, false);
          }
        }
      },
      () => {
        setGpsStatus('denied');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 12000
      }
    );

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {});
        wakeLockRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch {}
      }
    };
  }, [isOpen, gpsEnabled, followCamera, trip.origin]);

  // Evaluate live turn-by-turn progress, voice announcements, and automatic off-route rerouting
  useEffect(() => {
    if (!gpsPos || !route || route.polylinePoints.length < 2) return;

    const progress = evaluateNavigationProgress(
      gpsPos,
      route.polylinePoints,
      route.steps,
      activeStepIdx,
      gpsSpeedKmh !== null ? gpsSpeedKmh / 3.6 : null
    );

    setActiveStepIdx(progress.activeStepIndex);
    setDistanceToTurnM(progress.distanceToNextTurnMeters);
    setRemainingDistM(progress.remainingDistanceMeters);
    setRemainingDurS(progress.remainingDurationSeconds);
    setIsOffRoute(progress.isOffRoute);
    setArrived(progress.arrived);

    if (progress.voiceKey && progress.voicePrompt && progress.voiceKey !== lastSpokenKeyRef.current) {
      lastSpokenKeyRef.current = progress.voiceKey;
      speakNavigationInstruction(progress.voicePrompt, voiceEnabled);
    }

    // Automatic off-route rerouting (12s cooldown to avoid API spam)
    if (progress.isOffRoute && !isRerouting && Date.now() - lastRerouteAtRef.current > 12_000) {
      lastRerouteAtRef.current = Date.now();
      loadRoute(gpsPos, true);
    }
  }, [gpsPos, route, voiceEnabled, gpsSpeedKmh, isRerouting, loadRoute]);

  if (!isOpen) return null;

  const steps = route?.steps || [];
  const primaryStep = steps[Math.min(activeStepIdx + 1, Math.max(0, steps.length - 1))] || steps[0];
  const followingStep = steps[Math.min(activeStepIdx + 2, steps.length - 1)];
  const showFollowing = Boolean(followingStep && primaryStep && followingStep.index !== primaryStep.index);

  const displayDistToTurn = distanceToTurnM ?? primaryStep?.distanceMeters ?? route?.distanceMeters ?? 0;
  const displayRemainingDist = remainingDistM ?? route?.distanceMeters ?? 0;
  const displayRemainingDur = remainingDurS ?? route?.durationSeconds ?? 0;

  const handleStepPreview = (delta: number) => {
    if (!steps.length) return;
    const next = Math.max(0, Math.min(steps.length - 1, activeStepIdx + delta));
    setActiveStepIdx(next);
    setFollowCamera(false);
    const step = steps[next];
    if (step) {
      setDistanceToTurnM(step.distanceMeters);
      mapRef.current?.setView([step.coordinates.lat, step.coordinates.lng], 15, { animate: true });
      if (voiceEnabled) {
        speakNavigationInstruction(step.instruction, true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-sm flex flex-col">
      {/* Top Turn-by-Turn Maneuver HUD */}
      <div className="relative z-20 bg-[#0F2A1E] text-white border-b border-emerald-500/25 shadow-xl px-3.5 sm:px-6 pt-3 pb-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                arrived
                  ? 'bg-emerald-500 text-white border-emerald-300'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35'
              }`}>
                {isLoadingRoute ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : arrived ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <ManeuverIcon type={primaryStep?.type || 'straight'} className="w-7 h-7 sm:w-8 sm:h-8" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-emerald-300">
                    {arrived
                      ? t('Arrived!')
                      : isLoadingRoute
                        ? t('Calculating route...')
                        : formatNavDistance(displayDistToTurn)}
                  </span>
                  {route?.provider && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-emerald-100/90">
                      {gpsStatus === 'active' ? 'Live GPS' : 'Turn-by-Turn Preview'}
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base font-bold text-white leading-snug line-clamp-2 mt-0.5">
                  {arrived
                    ? `${t('You have reached')} ${selectedTarget?.label}`
                    : primaryStep?.instruction || `${t('Navigate to')} ${selectedTarget?.label}`}
                </p>
                {showFollowing && !arrived && (
                  <p className="text-[11px] sm:text-xs text-emerald-100/75 mt-0.5 truncate">
                    {t('Then')}: {followingStep.instruction} ({formatNavDistance(followingStep.distanceMeters)})
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setVoiceEnabled(v => !v)}
                aria-label={voiceEnabled ? 'Mute voice guidance' : 'Enable voice guidance'}
                title={voiceEnabled ? 'Voice On' : 'Voice Muted'}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  voiceEnabled
                    ? 'bg-emerald-500/20 border-emerald-400/35 text-emerald-200 hover:bg-emerald-500/30'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setShowStepsDrawer(s => !s)}
                aria-label="Toggle turn list"
                title="All Turns"
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                  showStepsDrawer
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('Close navigation')}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-500/80 border border-white/10 text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode + Target Stop Strip */}
          <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <div className="inline-flex rounded-xl bg-black/30 p-0.5 border border-white/10 shrink-0">
              {([
                { id: 'drive' as NavMode, label: 'Drive', icon: Car },
                { id: 'motorcycle' as NavMode, label: '2-Wheeler', icon: Bike },
                { id: 'walk' as NavMode, label: 'Walk', icon: Footprints }
              ]).map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setNavMode(m.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      navMode === m.id ? 'bg-emerald-500 text-white' : 'text-emerald-100/75 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {navTargets.length > 1 && (
              <select
                value={selectedTargetId}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                aria-label="Select destination stop"
                className="bg-black/30 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-white outline-none max-w-[220px] truncate"
              >
                {navTargets.map(target => (
                  <option key={target.id} value={target.id} className="bg-slate-900 text-white">
                    {target.label}{target.subtitle ? ` (${target.subtitle})` : ''}
                  </option>
                ))}
              </select>
            )}

            {gpsPos && (
              <button
                type="button"
                onClick={() => loadRoute(gpsPos, false)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-bold text-emerald-100 border border-white/10 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRerouting ? 'animate-spin' : ''}`} />
                Route from My GPS
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Off-route / Error alert strip */}
      {(isOffRoute || isRerouting || routeError) && (
        <div className={`relative z-20 px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 ${
          routeError ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {routeError
              ? `${routeError} — You can retry or launch Google/Apple Maps below.`
              : isRerouting
                ? 'Off route detected — Recalculating fastest turn-by-turn route from your GPS...'
                : 'Off route — tap Recalculate or follow back to the emerald path.'}
          </span>
          {routeError && (
            <button
              type="button"
              onClick={() => loadRoute()}
              className="ml-2 px-2.5 py-0.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Main Live Map Viewport */}
      <div className="relative flex-1 min-h-0 w-full bg-[#0E1726]">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Map Controls (Recenter / Step Preview) */}
        <div className="absolute left-3.5 bottom-4 z-[500] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (gpsPos && mapRef.current) {
                setFollowCamera(true);
                mapRef.current.setView([gpsPos.lat, gpsPos.lng], 16, { animate: true });
              } else if (route && mapRef.current && route.polylinePoints.length >= 2) {
                mapRef.current.fitBounds(L.latLngBounds(route.polylinePoints), { padding: [48, 48] });
              } else {
                setGpsEnabled(true);
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-lg border cursor-pointer backdrop-blur-md ${
              followCamera && gpsPos
                ? 'bg-emerald-600 text-white border-emerald-400'
                : 'bg-slate-900/90 text-white border-white/15 hover:bg-slate-800'
            }`}
          >
            <LocateFixed className="w-4 h-4" />
            <span>{gpsPos ? (followCamera ? 'GPS Locked' : 'Recenter GPS') : 'Fit Route'}</span>
          </button>

          {steps.length > 1 && (
            <div className="inline-flex items-center rounded-xl bg-slate-900/90 border border-white/15 shadow-lg overflow-hidden backdrop-blur-md">
              <button
                type="button"
                onClick={() => handleStepPreview(-1)}
                disabled={activeStepIdx <= 0}
                aria-label="Previous turn"
                className="p-2 text-white hover:bg-white/10 disabled:opacity-35 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-[11px] font-bold text-emerald-200 tabular-nums">
                Step {Math.min(activeStepIdx + 1, steps.length)}/{steps.length}
              </span>
              <button
                type="button"
                onClick={() => handleStepPreview(1)}
                disabled={activeStepIdx >= steps.length - 1}
                aria-label="Next turn"
                className="p-2 text-white hover:bg-white/10 disabled:opacity-35 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Live Speedometer Badge (when moving via GPS) */}
        {gpsSpeedKmh !== null && (
          <div className="absolute right-3.5 top-3.5 z-[500] w-14 h-14 rounded-2xl bg-slate-900/90 border border-white/15 shadow-lg flex flex-col items-center justify-center backdrop-blur-md">
            <span className="text-lg font-black text-white leading-none tabular-nums">{gpsSpeedKmh}</span>
            <span className="text-[9px] font-bold uppercase text-emerald-300 mt-0.5">km/h</span>
          </div>
        )}

        {/* Expandable Turn-by-Turn Steps Drawer */}
        {showStepsDrawer && (
          <div className="absolute inset-y-0 right-0 z-[550] w-full max-w-sm bg-white dark:bg-[#0D1A13] border-l border-slate-200 dark:border-emerald-900/60 shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-emerald-900/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Turn-by-Turn Directions</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {steps.length} steps · {formatNavDistance(route?.distanceMeters || 0)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStepsDrawer(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {steps.map((step, i) => {
                const isCurrent = i === activeStepIdx || i === activeStepIdx + 1;
                return (
                  <button
                    key={step.index}
                    type="button"
                    onClick={() => {
                      setActiveStepIdx(i);
                      setFollowCamera(false);
                      mapRef.current?.setView([step.coordinates.lat, step.coordinates.lng], 16, { animate: true });
                      setShowStepsDrawer(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/50'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isCurrent
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}>
                      <ManeuverIcon type={step.type} className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {step.instruction}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {formatNavDistance(step.distanceMeters)}
                        {step.durationSeconds > 0 ? ` · ${formatNavDuration(step.durationSeconds)}` : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Live Telemetry + Traffic Fallback Bar */}
      <div className="relative z-20 bg-white dark:bg-[#0B1610] border-t border-slate-200 dark:border-emerald-900/50 px-4 py-3 shadow-2xl">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 sm:gap-6">
            <div>
              <div className="text-lg sm:text-xl font-black text-emerald-700 dark:text-emerald-400 leading-none tabular-nums">
                {arrived ? '0 min' : formatNavDuration(displayRemainingDur)}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <span>{formatNavDistance(displayRemainingDist)}</span>
                <span>·</span>
                <span>ETA {formatNavArrivalClock(displayRemainingDur)}</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
              <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {gpsStatus === 'active'
                  ? 'Live GPS active · Wake Lock on'
                  : gpsStatus === 'denied'
                    ? 'GPS permission off · Preview mode'
                    : gpsStatus === 'locating'
                      ? 'Acquiring GPS signal...'
                      : 'Interactive route preview'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
              title="Open in Google Maps for live crowd-sourced traffic"
            >
              <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Google Maps</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
            <a
              href={appleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-white/15 transition-colors"
            >
              <span>Apple Maps</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
