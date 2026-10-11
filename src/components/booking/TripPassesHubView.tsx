import React, { useState, useEffect } from 'react';
import { Trip, PackingItem, WeatherForecast } from '../../types/trip';
import { fetchLiveDestinationWeather, getDestinationWeather } from '../../services/weatherService';
import { loadTripPacking, saveTripPacking } from '../../services/storageService';
import { generateSmartPackingList } from '../../services/packingService';
import { resolveDestinationImage, handleImageError } from '../../utils/destinationImages';
import { triggerHaptic } from '../../services/deviceService';
import { 
  ArrowLeft, 
  Bell, 
  MoreVertical, 
  Plane, 
  Bed, 
  ChevronRight, 
  Sun, 
  CloudSun, 
  CloudRain, 
  CheckCircle2, 
  Circle, 
  Download, 
  Share2, 
  ShieldCheck, 
  Calendar,
  Sparkles,
  QrCode
} from 'lucide-react';

interface TripPassesHubViewProps {
  trip: Trip;
  onBack?: () => void;
  onOpenBookingModal?: () => void;
  onOpenPacking?: () => void;
  onExportTrip?: () => void;
  onOpenShare?: () => void;
}

export const TripPassesHubView: React.FC<TripPassesHubViewProps> = ({
  trip,
  onBack,
  onOpenBookingModal,
  onOpenPacking,
  onExportTrip,
  onOpenShare
}) => {
  // Live weather forecast
  const [weather, setWeather] = useState<WeatherForecast>(() => 
    getDestinationWeather(trip.destination, trip.durationDays)
  );

  // Packing list state
  const [packingItems, setPackingItems] = useState<PackingItem[]>(() => {
    const saved = loadTripPacking(trip.id);
    if (saved && saved.length > 0) return saved;
    return generateSmartPackingList(trip);
  });

  useEffect(() => {
    let isMounted = true;
    fetchLiveDestinationWeather(
      trip.destination,
      trip.durationDays,
      undefined,
      trip.destinationDetails?.coordinates
    ).then((liveWeather) => {
      if (isMounted) {
        setWeather(liveWeather);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [trip.destination, trip.durationDays, trip.destinationDetails?.coordinates]);

  const togglePackingItem = (itemId: string) => {
    triggerHaptic('light');
    const updated = packingItems.map(item => 
      item.id === itemId ? { ...item, isPacked: !item.isPacked } : item
    );
    setPackingItems(updated);
    saveTripPacking(trip.id, updated);
  };

  // Derive origin/destination airport or city 3-letter codes
  const getCityCode = (locationName: string, fallback: string) => {
    if (!locationName) return fallback;
    const clean = locationName.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (clean.length >= 3) return clean.slice(0, 3);
    return fallback;
  };

  const originCode = getCityCode(trip.origin, 'CGK');
  const destinationCode = getCityCode(trip.destination, 'DPS');

  // Format dates
  const formatDateHeader = () => {
    if (!trip.startDate) return `${trip.durationDays} Days • ${Math.max(1, trip.durationDays - 1)} Nights`;
    try {
      const start = new Date(trip.startDate);
      const end = new Date(start);
      end.setDate(start.getDate() + (trip.durationDays - 1));
      const startStr = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const endStr = end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${startStr} – ${endStr}`;
    } catch {
      return `${trip.durationDays} Days Journey`;
    }
  };

  // Completed items calculations
  const totalActivities = trip.itinerary?.reduce((acc, d) => acc + (d.activities?.length || 0), 0) || 1;
  const completedActivities = trip.itinerary?.reduce((acc, d) => acc + (d.activities?.filter(a => a.completed)?.length || 0), 0) || 0;
  const packedCount = packingItems.filter(i => i.isPacked).length;
  const totalPackingCount = packingItems.length || 1;

  // Composite progress percentage
  const tripProgressPercent = Math.min(
    100,
    Math.max(
      15,
      Math.round(((completedActivities / totalActivities) * 0.5 + (packedCount / totalPackingCount) * 0.5) * 100)
    )
  );

  // Weather metrics
  const todayWeather = weather.forecastDays?.[0];
  const currentTemp = todayWeather ? Math.round(todayWeather.tempC) : 26;
  const weatherCondition = todayWeather?.condition || 'Partly Cloudy';
  const weatherHigh = todayWeather ? Math.round(todayWeather.maxTempC) : currentTemp + 4;
  const weatherLow = todayWeather ? Math.round(todayWeather.minTempC) : currentTemp - 3;

  // Hotel accommodation finding
  const stayActivity = trip.itinerary?.[0]?.activities?.find(a => a.type === 'hotel') || 
                      trip.itinerary?.[1]?.activities?.find(a => a.type === 'hotel');
  const hotelName = stayActivity?.title || `${(trip.destination || 'Destination').split(',')[0]} Eco Sanctuary Resort`;
  const hotelThumbnail = resolveDestinationImage(hotelName, 'nature');

  // SVG circular progress calculation
  const circleRadius = 26;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (tripProgressPercent / 100) * circleCircumference;

  return (
    <div className="max-w-xl mx-auto space-y-5 font-sans pb-24">
      
      {/* Reference Screen 3: Navigation Header */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] flex items-center justify-center shadow-xs hover:bg-[#F8FAF7] transition-all cursor-pointer active:scale-95"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-[#152A1C] tracking-tight">
              Trip to {(trip.destination || 'Destination').split(',')[0]}
            </h1>
            <p className="text-xs text-[#5A7362] font-medium">
              {formatDateHeader()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] flex items-center justify-center shadow-xs hover:bg-[#F8FAF7] transition-all cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenShare}
            className="w-10 h-10 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] flex items-center justify-center shadow-xs hover:bg-[#F8FAF7] transition-all cursor-pointer"
            title="Trip Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reference Screen 3: Signature Boarding Pass Card */}
      <div className="rounded-3xl bg-white border border-[#E2EBE1] shadow-[0_8px_32px_rgba(45,90,61,0.08)] overflow-hidden">
        
        {/* Forest Green Top Banner */}
        <div className="bg-[#2D5A3D] px-6 py-4 flex items-center justify-between text-white">
          <span className="text-[11px] font-mono tracking-widest uppercase text-white/90 font-bold">
            BOARDING PASS
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs">
            <span>On Time</span>
            <Plane className="w-3.5 h-3.5 text-white transform rotate-45" />
          </div>
        </div>

        {/* Departure & Arrival Routing */}
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            
            {/* Origin */}
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider text-[#5A7362] font-semibold block truncate max-w-[100px]">
                {(trip.origin || 'Origin').split(',')[0]}
              </span>
              <span className="text-3xl sm:text-4xl font-display font-black text-[#152A1C] tracking-tight block">
                {originCode}
              </span>
              <span className="text-xs font-bold text-[#152A1C] block">
                {trip.bestTransportDeal?.route?.departureTime || '08:40'}
              </span>
              <span className="text-[10px] text-[#8EA78D] font-medium block">
                {trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Day 1'}
              </span>
            </div>

            {/* Flight Flight Path & Duration */}
            <div className="flex-1 flex flex-col items-center justify-center px-2">
              <span className="text-[10px] font-semibold text-[#8EA78D] mb-1">
                {trip.bestTransportDeal?.route?.duration || '2h 10m'}
              </span>
              <div className="relative w-full flex items-center justify-center">
                <div className="w-full border-t-2 border-dashed border-[#8EA78D]/50" />
                <div className="absolute w-7 h-7 rounded-full bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shadow-2xs">
                  <Plane className="w-3.5 h-3.5 transform rotate-90 text-[#2D5A3D]" />
                </div>
              </div>
              <span className="text-[10px] text-[#5A7362] mt-1 capitalize">
                {trip.routeType} transit
              </span>
            </div>

            {/* Destination */}
            <div className="space-y-0.5 text-right">
              <span className="text-[11px] uppercase tracking-wider text-[#5A7362] font-semibold block truncate max-w-[100px]">
                {(trip.destination || 'Destination').split(',')[0]}
              </span>
              <span className="text-3xl sm:text-4xl font-display font-black text-[#152A1C] tracking-tight block">
                {destinationCode}
              </span>
              <span className="text-xs font-bold text-[#152A1C] block">
                {trip.bestTransportDeal?.route?.arrivalTime || '11:50'}
              </span>
              <span className="text-[10px] text-[#8EA78D] font-medium block">
                {trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Day 1'}
              </span>
            </div>

          </div>
        </div>

        {/* Signature Perforated Cutout Divider */}
        <div className="relative flex items-center my-1">
          {/* Left Cutout Hole */}
          <div className="w-5 h-5 rounded-full bg-[#F4F6F2] -ml-2.5 shadow-inner" />
          {/* Dashed Line */}
          <div className="flex-1 border-t-2 border-dashed border-[#E2EBE1]" />
          {/* Right Cutout Hole */}
          <div className="w-5 h-5 rounded-full bg-[#F4F6F2] -mr-2.5 shadow-inner" />
        </div>

        {/* Lower Boarding Pass Details & QR Code */}
        <div className="p-6 pt-4 flex items-center justify-between gap-4">
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">Transit / Deal</span>
              <span className="text-xs sm:text-sm font-extrabold text-[#152A1C] block truncate">
                {trip.bestTransportDeal?.provider || 'GA-422'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">Gate</span>
              <span className="text-xs sm:text-sm font-extrabold text-[#152A1C] block">
                A12
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">Seat / Class</span>
              <span className="text-xs sm:text-sm font-extrabold text-[#152A1C] block">
                24A
              </span>
            </div>
          </div>

          {/* QR Code Graphic */}
          <div className="shrink-0 p-2 rounded-2xl bg-[#F8FAF7] border border-[#E2EBE1] shadow-2xs">
            <svg className="w-14 h-14" viewBox="0 0 56 56" fill="none">
              {/* Clean decorative QR matrix */}
              <rect width="56" height="56" rx="8" fill="#F8FAF7" />
              <rect x="6" y="6" width="14" height="14" rx="3" stroke="#2D5A3D" strokeWidth="2.5" />
              <rect x="10" y="10" width="6" height="6" fill="#2D5A3D" rx="1" />
              <rect x="36" y="6" width="14" height="14" rx="3" stroke="#2D5A3D" strokeWidth="2.5" />
              <rect x="40" y="10" width="6" height="6" fill="#2D5A3D" rx="1" />
              <rect x="6" y="36" width="14" height="14" rx="3" stroke="#2D5A3D" strokeWidth="2.5" />
              <rect x="10" y="40" width="6" height="6" fill="#2D5A3D" rx="1" />
              {/* QR noise bits */}
              <rect x="24" y="8" width="4" height="4" fill="#2D5A3D" rx="1" />
              <rect x="28" y="16" width="4" height="4" fill="#2D5A3D" rx="1" />
              <rect x="24" y="24" width="8" height="8" fill="#2D5A3D" rx="2" />
              <rect x="36" y="24" width="4" height="4" fill="#2D5A3D" rx="1" />
              <rect x="44" y="28" width="4" height="4" fill="#2D5A3D" rx="1" />
              <rect x="24" y="36" width="4" height="8" fill="#2D5A3D" rx="1" />
              <rect x="32" y="44" width="8" height="4" fill="#2D5A3D" rx="1" />
              <rect x="44" y="40" width="4" height="6" fill="#2D5A3D" rx="1" />
            </svg>
          </div>
        </div>

      </div>

      {/* Reference Screen 3: Hotel Stay Card */}
      <div 
        onClick={onOpenBookingModal}
        className="rounded-3xl bg-white p-4 border border-[#E2EBE1] shadow-[0_4px_20px_rgba(45,90,61,0.05)] flex items-center justify-between gap-3 cursor-pointer hover:border-[#8EA78D] transition-all group"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden shrink-0 border border-[#E2EBE1] bg-[#E8EFE7]">
            <img
              src={hotelThumbnail}
              alt={hotelName}
              onError={(e) => handleImageError(e)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="min-w-0 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">Hotel</span>
            <h3 className="font-display font-bold text-sm sm:text-base text-[#152A1C] truncate block">
              {hotelName}
            </h3>
            <p className="text-xs text-[#5A7362] font-medium truncate">
              {formatDateHeader()} • {Math.max(1, trip.durationDays - 1)} Nights
            </p>
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#F8FAF7] text-[#8EA78D] group-hover:text-[#2D5A3D] group-hover:bg-[#E8EFE7] flex items-center justify-center shrink-0 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Reference Screen 3: Dual Cards in 2 Columns (Weather & Trip Progress Ring) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        
        {/* Column 1: Live Destination Weather */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 border border-[#E2EBE1] shadow-[0_4px_20px_rgba(45,90,61,0.05)] space-y-2">
          <span className="text-[11px] font-semibold text-[#5A7362] block truncate">
            Weather in {trip.destination.split(',')[0]}
          </span>
          <div className="flex items-baseline justify-between gap-1">
            <span className="text-3xl sm:text-4xl font-display font-black text-[#152A1C]">
              {currentTemp}°
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shrink-0">
              {weatherCondition.toLowerCase().includes('rain') ? (
                <CloudRain className="w-4 h-4 text-[#2D5A3D]" />
              ) : weatherCondition.toLowerCase().includes('cloud') ? (
                <CloudSun className="w-4 h-4 text-[#2D5A3D]" />
              ) : (
                <Sun className="w-4 h-4 text-[#2D5A3D]" />
              )}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-[#152A1C] block truncate">
              {weatherCondition}
            </span>
            <span className="text-[11px] text-[#8EA78D] font-medium block">
              H: {weatherHigh}° L: {weatherLow}°
            </span>
          </div>
        </div>

        {/* Column 2: Trip Progress Circular Ring Gauge */}
        <div className="rounded-3xl bg-white p-4 sm:p-5 border border-[#E2EBE1] shadow-[0_4px_20px_rgba(45,90,61,0.05)] space-y-2">
          <span className="text-[11px] font-semibold text-[#5A7362] block">
            Trip Progress
          </span>
          <div className="flex items-center gap-3 pt-0.5">
            {/* SVG Circular Ring Gauge */}
            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 64 64">
                <circle
                  cx="32"
                  cy="32"
                  r={circleRadius}
                  stroke="#E8EFE7"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={circleRadius}
                  stroke="#2D5A3D"
                  strokeWidth="6"
                  strokeDasharray={circleCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-[#E8EFE7] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#2D5A3D]" />
                </div>
              </div>
            </div>

            <div className="space-y-0.5 min-w-0">
              <span className="text-lg sm:text-xl font-display font-black text-[#152A1C] block">
                {tripProgressPercent}%
              </span>
              <span className="text-[11px] text-[#8EA78D] font-medium block">
                Completed
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Reference Screen 3: Packing Checklist Progress Card */}
      <div className="rounded-3xl bg-white p-5 border border-[#E2EBE1] shadow-[0_4px_20px_rgba(45,90,61,0.05)] space-y-3.5">
        
        <div 
          onClick={onOpenPacking}
          className="flex items-center justify-between gap-2 cursor-pointer group"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm sm:text-base text-[#152A1C]">
                Packing Checklist
              </h3>
              <span className="text-xs font-semibold text-[#8EA78D]">
                {packedCount} of {packingItems.length} packed
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8EA78D] group-hover:text-[#2D5A3D] group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#E8EFE7] rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-[#2D5A3D] transition-all duration-500"
            style={{ width: `${Math.round((packedCount / Math.max(1, packingItems.length)) * 100)}%` }}
          />
        </div>

        {/* 3 Interactive Quick Check Items matching Reference Screen 3 */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {packingItems.slice(0, 4).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => togglePackingItem(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                item.isPacked
                  ? 'bg-[#E8EFE7] text-[#2D5A3D] border-[#8EA78D]/40 font-semibold'
                  : 'bg-white text-slate-600 border-[#E2EBE1] hover:border-[#8EA78D]'
              }`}
            >
              {item.isPacked ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D]" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-300" />
              )}
              <span className="truncate max-w-[140px]">{item.name}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Reference Screen 3: Bottom Action Buttons ("View E-Ticket" & Share) */}
      <div className="pt-2 flex items-center gap-3">
        
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            if (onExportTrip) {
              onExportTrip();
            } else if (onOpenBookingModal) {
              onOpenBookingModal();
            }
          }}
          className="flex-1 py-4 px-6 rounded-full bg-[#2D5A3D] hover:bg-[#234730] text-white font-display font-bold text-sm sm:text-base shadow-[0_8px_30px_rgba(45,90,61,0.25)] flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-95"
        >
          <Download className="w-4 h-4 text-emerald-300" />
          <span>View E-Ticket & Passes</span>
        </button>

        <button
          type="button"
          onClick={onOpenShare}
          className="w-13 h-13 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] shadow-[0_4px_16px_rgba(45,90,61,0.1)] flex items-center justify-center hover:bg-[#F8FAF7] transition-all cursor-pointer active:scale-95 shrink-0"
          title="Share Pass"
        >
          <Share2 className="w-5 h-5" />
        </button>

      </div>

    </div>
  );
};
