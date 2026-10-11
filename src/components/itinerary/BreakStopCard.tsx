import React from 'react';
import { BreakStop } from '../../types/trip';
import { 
  MapPin, 
  Check,
  X,
  Utensils, 
  Sparkles, 
  Car, 
  Fuel, 
  Zap, 
  ShieldCheck, 
  Plus, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface BreakStopCardProps {
  breakStop: BreakStop;
  isAdded: boolean;
  onToggleAdd: (breakStop: BreakStop) => void;
}

export const BreakStopCard: React.FC<BreakStopCardProps> = ({
  breakStop,
  isAdded,
  onToggleAdd
}) => {
  const amenitiesItems = [
    { label: 'Food & Dining', available: breakStop.foodAvailable, icon: Utensils },
    { label: 'Washroom', available: breakStop.washroomAvailable, icon: Check },
    { label: 'Parking', available: breakStop.parkingAvailable, icon: Car },
    { label: 'Rest Area', available: breakStop.restAreaAvailable, icon: Check },
  ];
  const section = breakStop.section ||
    (breakStop.evChargingAvailable ? 'ev_charging' : breakStop.fuelStationAvailable ? 'fuel' : breakStop.medicalFacilityAvailable ? 'medical' : 'amenities');
  const facilityItems = section === 'fuel'
    ? [{ label: 'Fuel Station', available: breakStop.fuelStationAvailable, icon: Fuel }]
    : section === 'ev_charging'
      ? [{ label: 'EV Charging', available: breakStop.evChargingAvailable, icon: Zap }]
      : section === 'medical'
        ? [{ label: 'Medical Facility', available: breakStop.medicalFacilityAvailable, icon: ShieldCheck }]
        : amenitiesItems;
  const isGeoapifyListing = breakStop.source === 'geoapify_places';
  const sectionLabel = section === 'fuel'
    ? 'Fuel Station'
    : section === 'ev_charging'
      ? 'EV Charging'
      : section === 'medical'
        ? 'Medical Facility'
        : 'Food, Washroom, Parking & Rest Area';

  return (
    <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
      isAdded 
        ? 'bg-white border-[#2D5A3D] shadow-md ring-2 ring-[#2D5A3D]/20' 
        : 'bg-white border-[#E2EBE1] hover:border-[#8EA78D] shadow-xs'
    }`}>
      
      {/* Top Banner Tag */}
      <div className="bg-[#E8EFE7] px-5 py-2.5 border-b border-[#8EA78D]/30 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-bold text-[#2D5A3D] min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-[#2D5A3D]" />
          <span className="truncate">{sectionLabel}</span>
        </div>

        <span className="text-[10px] text-[#5A7362] shrink-0 font-medium">
          {isGeoapifyListing ? 'Geoapify / OpenStreetMap' : 'Verified stop'}
        </span>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Title & Timing */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-display font-bold text-[#152A1C] leading-snug">{breakStop.name}</h3>
            <p className="text-xs sm:text-sm text-[#5A7362] mt-1 leading-relaxed text-pretty">{breakStop.description}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto bg-[#F8FAF7] sm:bg-transparent px-3 py-1.5 sm:px-0 sm:py-0 rounded-xl sm:rounded-none border sm:border-0 border-[#E2EBE1]">
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">Off route</span>
              <span className="text-xs font-bold text-[#152A1C] font-display">{breakStop.detourDistanceKm} km</span>
            </div>
            <div className="text-left sm:text-right border-l border-[#E2EBE1] pl-3">
              <span className="text-[10px] uppercase font-bold text-[#8EA78D] block">Suggested Stop</span>
              <span className="text-xs font-bold text-[#2D5A3D] font-display">{breakStop.estimatedStopMinutes} mins</span>
            </div>
          </div>
        </div>

        {/* Facilities Grid */}
        <div>
          <span className="text-[10px] uppercase font-bold text-[#8EA78D] block mb-2">
            {isGeoapifyListing ? 'Categories listed by map provider · verify on site' : 'Verified route facilities'}
          </span>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {facilityItems.map(f => (
              <span
                key={f.label}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl font-semibold border whitespace-nowrap ${
                  (isGeoapifyListing && f.available)
                    ? 'bg-[#E8EFE7] border-[#8EA78D]/40 text-[#2D5A3D]' 
                    : 'bg-[#F8FAF7] border-[#E2EBE1] text-[#5A7362]'
                }`}
              >
                {(isGeoapifyListing && f.available) ? <Check className="w-3 h-3 text-[#2D5A3D] shrink-0" /> : <X className="w-3 h-3 text-slate-400 shrink-0" />}
                <span>{isGeoapifyListing && f.available ? f.label : `${f.label} · Unverified`}</span>
              </span>
            ))}
          </div>
        </div>

        {/* AI Recommendation Reason */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAF7] border border-[#E2EBE1] border-l-4 border-l-[#2D5A3D] text-xs sm:text-sm text-[#5A7362] leading-relaxed text-pretty">
          <strong className="text-[#152A1C] font-bold block sm:inline mr-1">Pitstop details:</strong>
          <span>{breakStop.recommendationReason}</span>
        </div>

        {/* Bottom Bar: Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E2EBE1] gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#5A7362]">
              {isGeoapifyListing ? `${breakStop.rating ? `${breakStop.rating.toFixed(1)}/5${breakStop.reviewCount ? ` (${breakStop.reviewCount} reviews)` : ''} · ` : ''}${breakStop.openingHours}` : 'Highway route facility'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Google Maps Navigation */}
            <a
              href={breakStop.mapUrl || `https://www.google.com/maps/dir/?api=1&destination=${breakStop.coordinates.lat},${breakStop.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#152A1C] hover:text-[#2D5A3D] bg-white hover:bg-[#E8EFE7] px-3 py-2 rounded-xl border border-[#E2EBE1] transition-colors shadow-2xs"
              title="Open turn-by-turn navigation in Google Maps"
            >
              <MapPin className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
              <span>Navigate</span>
              <ExternalLink className="w-3 h-3 text-[#8EA78D]" />
            </a>

            <button
              onClick={() => onToggleAdd(breakStop)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs ${
                isAdded
                  ? 'bg-[#E8EFE7] text-[#2D5A3D] border border-[#8EA78D]/40 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                  : 'bg-[#2D5A3D] hover:bg-[#234730] text-white'
              }`}
            >
              {isAdded ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D]" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stop</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
