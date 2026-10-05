import React from 'react';
import { BreakStop } from '../../types/trip';
import { 
  Star, 
  MapPin, 
  Clock, 
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
  Trash2,
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
  const facilityItems = [
    { label: 'Food & Dining', available: breakStop.foodAvailable, icon: Utensils },
    { label: 'Clean Washroom', available: breakStop.washroomAvailable, icon: Check },
    { label: 'Secure Parking', available: breakStop.parkingAvailable, icon: Car },
    { label: 'Rest Area', available: breakStop.restAreaAvailable, icon: Check },
    { label: 'Fuel Station', available: breakStop.fuelStationAvailable, icon: Fuel },
    { label: 'EV Fast Charge', available: breakStop.evChargingAvailable, icon: Zap },
    { label: 'Medical Facility', available: breakStop.medicalFacilityAvailable, icon: ShieldCheck },
  ];

  return (
    <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
      isAdded 
        ? 'bg-white border-emerald-300 shadow-md ring-2 ring-emerald-500/20' 
        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
    }`}>
      
      {/* Top Banner Tag */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>TripVerse Recommended Break Stop</span>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs bg-emerald-100/60 px-2 py-0.5 rounded-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Highway Verified</span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-4">
        
        {/* Title & Timing */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-display font-bold text-[#0B2545] leading-snug">{breakStop.name}</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed text-pretty">{breakStop.description}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto bg-slate-50 sm:bg-transparent px-3 py-1.5 sm:px-0 sm:py-0 rounded-xl sm:rounded-none border sm:border-0 border-slate-100">
            <div className="text-left sm:text-right">
              <span className="badge-caps text-slate-400 block">Detour</span>
              <span className="text-xs font-bold text-slate-800 font-display">{breakStop.detourDistanceKm} km</span>
            </div>
            <div className="text-left sm:text-right border-l border-slate-200 pl-3">
              <span className="badge-caps text-slate-400 block">Suggested Stop</span>
              <span className="text-xs font-bold text-emerald-600 font-display">{breakStop.estimatedStopMinutes} mins</span>
            </div>
          </div>
        </div>

        {/* Facilities Grid */}
        <div>
          <span className="badge-caps text-slate-400 block mb-2">
            Verified On-Site Facilities
          </span>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {facilityItems.map(f => (
              <span
                key={f.label}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-xl font-semibold border whitespace-nowrap ${
                  f.available 
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' 
                    : 'bg-slate-50 border-slate-200 text-slate-400 line-through opacity-60'
                }`}
              >
                {f.available ? <Check className="w-3 h-3 text-emerald-600 shrink-0" /> : <X className="w-3 h-3 text-slate-400 shrink-0" />} <span>{f.label}</span>
              </span>
            ))}
          </div>
        </div>

        {/* AI Recommendation Reason (USP Section 24) */}
        <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 border-l-4 border-l-emerald-500 text-xs sm:text-sm text-slate-600 leading-relaxed text-pretty">
          <strong className="text-slate-800 font-bold block sm:inline mr-1">Why TripVerse recommended this:</strong>
          <span>{breakStop.recommendationReason}</span>
        </div>

        {/* Bottom Bar: Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              {breakStop.openingHours}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Verified Plaza
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Google Maps Navigation */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${breakStop.coordinates.lat},${breakStop.coordinates.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3 py-2 rounded-xl border border-slate-200 transition-colors shadow-xs"
              title="Open turn-by-turn navigation in Google Maps"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Navigate</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              onClick={() => onToggleAdd(breakStop)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs ${
                isAdded
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                  : 'bg-trip-gradient hover:bg-trip-gradient-hover text-white'
              }`}
            >
              {isAdded ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
