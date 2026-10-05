import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Trip, 
  NavigationStep, 
  LiveTrackingState, 
  Coordinates, 
  NavigationManeuver 
} from '../../types/trip';
import { 
  generateNavigationStepsForTrip,
  DEFAULT_AHMEDABAD_UDAIPUR_STEPS, 
  calculateDistanceKm, 
  calculateBearing, 
  speakNavigationPrompt, 
  startRealGpsTracking,
  formatRemainingDuration,
  calculateEtaTime
} from '../../services/navigationService';
import { 
  ArrowUp, 
  CornerUpLeft, 
  CornerUpRight, 
  GitFork, 
  Coffee, 
  Flag, 
  Navigation, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  RotateCcw, 
  X, 
  List, 
  Radio, 
  AlertTriangle, 
  ShieldCheck, 
  LocateFixed, 
  PhoneCall,
  CheckCircle2,
  Sparkles,
  Headphones
} from 'lucide-react';
import { HighwayAudioGuide } from './HighwayAudioGuide';

interface LiveNavigationHUDProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
}

export const LiveNavigationHUD: React.FC<LiveNavigationHUDProps> = ({
  trip,
  isOpen,
  onClose
}) => {
  const steps = React.useMemo(() => generateNavigationStepsForTrip(trip), [trip]);
  
  // Navigation & Simulation State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(5); // 1x, 5x, 15x
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isTrackingRealGps, setIsTrackingRealGps] = useState(false);
  const [isCueSheetOpen, setIsCueSheetOpen] = useState(false);
  const [isAudioGuideOpen, setIsAudioGuideOpen] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Position, Speed, Heading
  const [currentCoord, setCurrentCoord] = useState<Coordinates>(steps[0]?.coordinates || { lat: 23.0225, lng: 72.5714 });
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(68);
  const [currentHeading, setCurrentHeading] = useState<number>(38);
  const [distanceToNextKm, setDistanceToNextKm] = useState<number>(steps[0]?.distanceKm || 5.0);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const carMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const passedPolylineRef = useRef<L.Polyline | null>(null);
  const followVehicleRef = useRef(true);

  // Active Step
  const activeStep = steps[currentStepIndex] || steps[0];
  const nextStep = steps[currentStepIndex + 1] || null;

  // Calculate remaining trip distance & duration
  const remainingDistanceKm = steps
    .slice(currentStepIndex)
    .reduce((sum, s, idx) => sum + (idx === 0 ? distanceToNextKm : s.distanceKm), 0);
  const remainingDurationMin = (remainingDistanceKm / Math.max(30, currentSpeedKmh)) * 60;
  const etaString = calculateEtaTime(remainingDurationMin);

  // Speak voice guidance on step change
  useEffect(() => {
    if (!isOpen || !voiceEnabled) return;
    const prompt = `${activeStep.instruction}. ${activeStep.alert || activeStep.detail}`;
    speakNavigationPrompt(prompt);
  }, [currentStepIndex, isOpen, voiceEnabled]);

  // Real GPS Tracking integration
  useEffect(() => {
    if (!isOpen || !isTrackingRealGps) return;
    setGpsError(null);

    const stopGps = startRealGpsTracking(
      (coords, speed, heading) => {
        setCurrentCoord(coords);
        setCurrentSpeedKmh(Math.max(10, speed));
        setCurrentHeading(heading);

        // Find nearest step
        let closestIndex = currentStepIndex;
        let minDist = 99999;
        steps.forEach((s, idx) => {
          const d = calculateDistanceKm(coords, s.coordinates);
          if (d < minDist) {
            minDist = d;
            closestIndex = idx;
          }
        });
        if (closestIndex !== currentStepIndex) {
          setCurrentStepIndex(closestIndex);
        }
        setDistanceToNextKm(Math.round(minDist * 10) / 10);
      },
      (err) => {
        setGpsError(err);
        setIsTrackingRealGps(false);
      }
    );

    return () => {
      stopGps();
    };
  }, [isOpen, isTrackingRealGps, currentStepIndex]);

  // Simulation Ticker
  useEffect(() => {
    if (!isOpen || !isSimulating || isTrackingRealGps) return;

    const interval = setInterval(() => {
      setDistanceToNextKm((prev) => {
        // decrement distance based on speed
        const delta = (currentSpeedKmh * (simulationSpeed * 0.2)) / 3600;
        const newDist = prev - delta;

        if (newDist <= 0.2) {
          // Advance to next step
          if (currentStepIndex < steps.length - 1) {
            const nextIdx = currentStepIndex + 1;
            setCurrentStepIndex(nextIdx);
            setCurrentCoord(steps[nextIdx].coordinates);
            
            // update heading to next step
            if (steps[nextIdx + 1]) {
              const bearing = calculateBearing(steps[nextIdx].coordinates, steps[nextIdx + 1].coordinates);
              setCurrentHeading(Math.round(bearing));
            }
            return steps[nextIdx].distanceKm;
          } else {
            // Reached destination
            setIsSimulating(false);
            if (voiceEnabled) {
              speakNavigationPrompt('You have arrived at your destination, Udaipur Lake Pichola!', true);
            }
            return 0;
          }
        }

        // Interpolate coordinate towards next step
        const targetCoord = nextStep ? nextStep.coordinates : activeStep.coordinates;
        const ratio = Math.min(1, delta / Math.max(0.5, prev));
        setCurrentCoord((prevCoord) => ({
          lat: prevCoord.lat + (targetCoord.lat - prevCoord.lat) * ratio,
          lng: prevCoord.lng + (targetCoord.lng - prevCoord.lng) * ratio
        }));

        return Math.max(0, Math.round(newDist * 10) / 10);
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isOpen, isSimulating, isTrackingRealGps, currentStepIndex, simulationSpeed, currentSpeedKmh, nextStep, activeStep, voiceEnabled]);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentCoord.lat, currentCoord.lng],
        zoom: 12,
        zoomControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Route Polyline
      const fullRouteCoords: L.LatLngTuple[] = steps.map(s => [s.coordinates.lat, s.coordinates.lng]);
      routePolylineRef.current = L.polyline(fullRouteCoords, {
        color: '#00B074',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round'
      }).addTo(map);

      // Car Icon
      const carDivIcon = L.divIcon({
        className: 'vehicle-marker-wrapper',
        html: `
          <div style="
            position: relative;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: rgba(0, 176, 116, 0.25);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              width: 36px;
              height: 36px;
              background: #0B2545;
              border: 3px solid #00D084;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              transform: rotate(${currentHeading}deg);
              transition: transform 0.3s ease;
            ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#00D084" stroke="white" stroke-width="2"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      carMarkerRef.current = L.marker([currentCoord.lat, currentCoord.lng], { icon: carDivIcon }).addTo(map);

      // Add waypoints
      steps.forEach((s) => {
        if (s.maneuver === 'breakstop') {
          L.marker([s.coordinates.lat, s.coordinates.lng], {
            icon: L.divIcon({
              html: `<div style="background:#F59E0B; color:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/></svg></div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            })
          }).bindPopup(`<strong>${s.title}</strong><br/>${s.detail}`).addTo(map);
        }
      });

      mapInstanceRef.current = map;
    }

    // Update car marker position
    if (carMarkerRef.current && mapInstanceRef.current) {
      carMarkerRef.current.setLatLng([currentCoord.lat, currentCoord.lng]);
      
      // update rotation icon html
      const icon = carMarkerRef.current.getIcon() as L.DivIcon;
      if (icon && icon.options) {
        carMarkerRef.current.setIcon(L.divIcon({
          className: 'vehicle-marker-wrapper',
          html: `
            <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(0, 176, 116, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="width: 36px; height: 36px; background: #0B2545; border: 3px solid #00D084; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transform: rotate(${currentHeading}deg); transition: transform 0.3s ease;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#00D084" stroke="white" stroke-width="2"><polygon points="12 2 19 21 12 17 5 21 12 2"/></svg>
              </div>
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        }));
      }

      if (followVehicleRef.current) {
        mapInstanceRef.current.panTo([currentCoord.lat, currentCoord.lng], { animate: true });
      }
    }
  }, [isOpen, currentCoord, currentHeading]);

  if (!isOpen) return null;

  // Helper for Maneuver Icon
  const renderManeuverIcon = (m: NavigationManeuver, className = 'w-9 h-9 text-white') => {
    switch (m) {
      case 'straight':
        return <ArrowUp className={className} />;
      case 'turn-left':
      case 'exit-left':
        return <CornerUpLeft className={className} />;
      case 'turn-right':
      case 'exit-right':
        return <CornerUpRight className={className} />;
      case 'fork-left':
      case 'fork-right':
      case 'merge':
        return <GitFork className={className} />;
      case 'breakstop':
        return <Coffee className={className} />;
      case 'arrive':
        return <Flag className={className} />;
      default:
        return <ArrowUp className={className} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col select-none animate-in fade-in duration-200">
      
      {/* 1. TOP HIGHWAY GREEN NAVIGATION HEADER */}
      <div className="bg-[#00704A] text-white px-4 sm:px-6 pt-safe pb-4 shadow-xl border-b border-emerald-600/40 relative z-30">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-4">
          
          <div className="flex items-start gap-4">
            {/* Maneuver Giant Shield */}
            <div className="w-16 h-16 rounded-2xl bg-[#005538] border-2 border-emerald-300/40 flex items-center justify-center shrink-0 shadow-lg">
              {renderManeuverIcon(activeStep.maneuver)}
            </div>

            <div>
              {/* Distance to next maneuver */}
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-emerald-200">
                  {distanceToNextKm <= 0.3 ? 'NOW' : `In ${distanceToNextKm} km`}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider bg-emerald-900/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>

              {/* Main Instruction */}
              <h2 className="text-lg sm:text-xl font-bold mt-1 leading-snug line-clamp-2">
                {activeStep.instruction}
              </h2>

              {/* Road detail */}
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {activeStep.detail}
              </p>
            </div>
          </div>

          {/* Close HUD Button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors shrink-0"
            title="Exit Navigation HUD"
            aria-label="Exit Navigation HUD"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Next Maneuver Preview Ribbon */}
        {nextStep && (
          <div className="max-w-4xl mx-auto mt-3 pt-2.5 border-t border-emerald-600/50 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-300">Then:</span>
              <div className="w-4 h-4 text-emerald-300 inline-flex items-center justify-center">
                {renderManeuverIcon(nextStep.maneuver, 'w-3.5 h-3.5')}
              </div>
              <span className="truncate max-w-[280px] sm:max-w-md">{nextStep.instruction}</span>
            </div>
            <span className="shrink-0 font-bold text-white">In {nextStep.distanceKm} km</span>
          </div>
        )}
      </div>

      {/* 2. MAP VIEWPORT & FLOATING OVERLAYS */}
      <div className="flex-1 relative w-full bg-slate-900">
        
        {/* Leaflet Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Highway Rest Stop Proximity Alert Banner */}
        {activeStep.alert && (
          <div className="absolute top-4 left-4 right-4 max-w-lg mx-auto z-[400] animate-in slide-in-from-top duration-300">
            <div className="bg-gradient-to-r from-[#0B2545] to-[#133966] text-white p-4 rounded-2xl shadow-2xl border border-amber-400/40 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/30">
                <Coffee className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                    Verified Highway Rest Stop
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    Clean Restrooms • 4.8 / 5.0
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-100 mt-1">
                  {activeStep.alert}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* GPS Error Alert */}
        {gpsError && (
          <div className="absolute top-4 left-4 right-4 max-w-md mx-auto z-[400] bg-rose-900/90 text-white p-3 rounded-2xl border border-rose-500 flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-300" />
            <span className="truncate">{gpsError} (Switched to Route Guidance Mode)</span>
          </div>
        )}

        {/* Left Floating Speedometer & Highway Limit */}
        <div className="absolute bottom-6 left-4 z-[400] flex flex-col gap-2">
          {/* Current Speed */}
          <div className="w-20 h-20 rounded-full bg-slate-950/90 backdrop-blur-md border-2 border-emerald-500/50 shadow-2xl flex flex-col items-center justify-center text-white">
            <span className="text-2xl font-black font-display text-emerald-400 leading-none">
              {currentSpeedKmh}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
              km/h
            </span>
          </div>

          {/* Speed Limit */}
          <div className="w-12 h-12 mx-auto rounded-full bg-white text-slate-900 border-4 border-rose-600 shadow-md flex items-center justify-center font-black text-xs">
            {activeStep.speedLimitKmh || 90}
          </div>
        </div>

        {/* Right Floating Controls (Recenter, Voice, Cue Sheet, SOS) */}
        <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-2.5">
          {/* Follow / Recenter Button */}
          <button
            onClick={() => {
              followVehicleRef.current = true;
              if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo([currentCoord.lat, currentCoord.lng], { animate: true });
              }
            }}
            className="w-11 h-11 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center shadow-lg"
            title="Recenter on Vehicle"
            aria-label="Recenter on Vehicle"
          >
            <LocateFixed className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Highway Audio Guide Button */}
          <button
            onClick={() => setIsAudioGuideOpen(!isAudioGuideOpen)}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shadow-lg transition-all ${
              isAudioGuideOpen
                ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-300 text-white shadow-emerald-500/30'
                : 'bg-slate-900/90 backdrop-blur-md border-slate-700 text-emerald-400 hover:text-white'
            }`}
            title="Highway AI Voice Tour Guide"
            aria-label="Highway AI Voice Tour Guide"
          >
            <Headphones className="w-5 h-5 animate-pulse" />
          </button>

          {/* Voice Guidance Toggle */}
          <button
            onClick={() => {
              setVoiceEnabled(!voiceEnabled);
              if (!voiceEnabled) {
                speakNavigationPrompt(activeStep.instruction, true);
              }
            }}
            className={`w-11 h-11 rounded-2xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-colors ${
              voiceEnabled
                ? 'bg-[#00B074] border-emerald-400 text-white'
                : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title={voiceEnabled ? 'Voice Guidance Active (Tap to mute)' : 'Voice Guidance Muted (Tap to unmute)'}
            aria-label="Toggle Voice Guidance"
          >
            {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Cue Sheet Toggle */}
          <button
            onClick={() => setIsCueSheetOpen(true)}
            className="w-11 h-11 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white flex items-center justify-center shadow-lg"
            title="View Turn-by-Turn Cue Sheet"
            aria-label="View Turn-by-Turn Cue Sheet"
          >
            <List className="w-5 h-5 text-cyan-400" />
          </button>

          {/* Emergency SOS Button */}
          <a
            href="tel:1033"
            className="w-11 h-11 rounded-2xl bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white flex items-center justify-center shadow-lg"
            title="NHAI Highway Helpline 1033"
            aria-label="NHAI Highway Helpline 1033"
          >
            <PhoneCall className="w-4 h-4" />
          </a>
        </div>

      </div>

      {/* 3. ROUTE GUIDANCE & CO-PILOT CONTROL BAR */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Play / Simulation Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-colors ${
              isSimulating
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-trip-gradient hover:bg-trip-gradient-hover text-white'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isSimulating ? 'Pause Route' : 'Drive Route'}</span>
          </button>

          {/* Step Back / Step Forward */}
          <button
            onClick={() => {
              if (currentStepIndex > 0) {
                const prevIdx = currentStepIndex - 1;
                setCurrentStepIndex(prevIdx);
                setCurrentCoord(steps[prevIdx].coordinates);
                setDistanceToNextKm(steps[prevIdx].distanceKm);
              }
            }}
            disabled={currentStepIndex === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            title="Previous Step"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (currentStepIndex < steps.length - 1) {
                const nextIdx = currentStepIndex + 1;
                setCurrentStepIndex(nextIdx);
                setCurrentCoord(steps[nextIdx].coordinates);
                setDistanceToNextKm(steps[nextIdx].distanceKm);
              }
            }}
            disabled={currentStepIndex === steps.length - 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            title="Next Step"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Speed multiplier */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            {[1, 5, 15].map(spd => (
              <button
                key={spd}
                onClick={() => setSimulationSpeed(spd)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  simulationSpeed === spd ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Real GPS Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsTrackingRealGps(!isTrackingRealGps);
              if (!isTrackingRealGps) {
                setIsSimulating(false);
              }
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              isTrackingRealGps
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isTrackingRealGps ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{isTrackingRealGps ? 'Live Device GPS Active' : 'Enable Real GPS'}</span>
          </button>

          <button
            onClick={() => {
              setCurrentStepIndex(0);
              setCurrentCoord(steps[0].coordinates);
              setDistanceToNextKm(steps[0].distanceKm);
              setIsSimulating(false);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
            title="Reset to Origin"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 4. BOTTOM TRIP STATS BAR (ETA, DISTANCE, TIME) */}
      <div className="bg-[#0B2545] border-t border-slate-800/80 px-5 py-3 text-white pb-safe">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-6">
            {/* ETA */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Estimated Arrival
              </span>
              <span className="text-xl font-extrabold text-emerald-300 font-display">
                {etaString}
              </span>
            </div>

            {/* Remaining Duration */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Duration
              </span>
              <span className="text-base font-bold text-white">
                {formatRemainingDuration(remainingDurationMin)}
              </span>
            </div>

            {/* Remaining Distance */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Remaining
              </span>
              <span className="text-base font-bold text-white">
                {Math.round(remainingDistanceKm)} km
              </span>
            </div>
          </div>

          {/* End Button */}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs shadow-md transition-colors"
          >
            End Guide
          </button>

        </div>
      </div>

      {/* 5. CUE SHEET SLIDE-OVER DRAWER */}
      {isCueSheetOpen && (
        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            
            <div className="bg-[#0B2545] px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Turn-by-Turn Route Cues</h3>
                <p className="text-xs text-slate-300">{steps.length} milestones along NH-48</p>
              </div>
              <button
                onClick={() => setIsCueSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Cue Sheet"
                aria-label="Close Cue Sheet"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {steps.map((s, idx) => {
                const isCurrent = idx === currentStepIndex;
                const isPassed = idx < currentStepIndex;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setCurrentStepIndex(idx);
                      setCurrentCoord(s.coordinates);
                      setDistanceToNextKm(s.distanceKm);
                      setIsCueSheetOpen(false);
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isCurrent
                        ? 'bg-emerald-50 border-[#00B074] shadow-sm ring-2 ring-[#00B074]/30'
                        : isPassed
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-[#00B074] text-white'
                        : isPassed
                        ? 'bg-slate-200 text-slate-500'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {isPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : renderManeuverIcon(s.maneuver, 'w-4 h-4')}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {s.title}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 shrink-0 ml-2">
                          {s.distanceKm} km
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                        {s.instruction}
                      </p>
                      {s.alert && (
                        <span className="inline-block mt-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {s.alert}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* 6. HIGHWAY AUDIO GUIDE MODAL / DRAWER */}
      {isAudioGuideOpen && (
        <div className="fixed inset-0 z-[650] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <HighwayAudioGuide onClose={() => setIsAudioGuideOpen(false)} />
          </div>
        </div>
      )}

    </div>
  );
};
