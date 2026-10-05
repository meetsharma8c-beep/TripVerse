import React from 'react';
import { EMERGENCY_FACILITIES } from '../../data/highwayFacilities';
import { 
  ShieldCheck, 
  PhoneCall, 
  MapPin, 
  AlertCircle, 
  Radio,
  ExternalLink,
  Train,
  HeartHandshake,
  Compass
} from 'lucide-react';

export const SafetyEmergency: React.FC = () => {
  const nationalHelplines = [
    {
      number: '1033',
      name: 'NHAI Highway Emergency',
      desc: 'Towing, Ambulance & Crane (Toll-Free)',
      color: 'text-emerald-600',
      bgHover: 'hover:border-emerald-300 hover:bg-emerald-50/40',
      tag: 'Highway Corridor'
    },
    {
      number: '112',
      name: 'National Unified Emergency',
      desc: 'Instant Police, Fire & Border Patrol Dispatch',
      color: 'text-blue-600',
      bgHover: 'hover:border-blue-300 hover:bg-blue-50/40',
      tag: 'Police & Dispatch'
    },
    {
      number: '108',
      name: 'Trauma & Medical Ambulance',
      desc: 'Free 24x7 Highway Emergency Medical Care',
      color: 'text-rose-600',
      bgHover: 'hover:border-rose-300 hover:bg-rose-50/40',
      tag: 'Trauma Care'
    },
    {
      number: '139',
      name: 'RailMadad & Railway Police',
      desc: 'Security, Medical on Train & Rail Inquiries',
      color: 'text-amber-600',
      bgHover: 'hover:border-amber-300 hover:bg-amber-50/40',
      tag: 'Railways'
    },
    {
      number: '1091',
      name: 'Women Safety Helpline',
      desc: '24x7 Dedicated Women Highway & City Helpline',
      color: 'text-purple-600',
      bgHover: 'hover:border-purple-300 hover:bg-purple-50/40',
      tag: 'Women Safety'
    },
    {
      number: '1363',
      name: 'Incredible India Tourist Helpline',
      desc: 'Ministry of Tourism 24x7 Multi-lingual Guidance',
      color: 'text-teal-600',
      bgHover: 'hover:border-teal-300 hover:bg-teal-50/40',
      tag: 'Tourism Support'
    }
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Road Safety & Official Assistance</span>
          </div>
          <h2 className="text-xl font-bold text-[#0B2545]">Verified Emergency & Route Assistance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authentic Govt & Highway helpline numbers with live one-tap emergency calling and GPS turn-by-turn navigation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto">
          <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>NHAI 24/7 Monitored Corridor</span>
        </div>
      </div>

      {/* Instant National Helplines Strip */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          National Emergency Helplines (Toll-Free & 24x7)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {nationalHelplines.map(line => (
            <a
              key={line.number}
              href={`tel:${line.number}`}
              className={`p-3.5 rounded-2xl bg-slate-50 border border-slate-200 ${line.bgHover} transition-all flex items-center justify-between gap-3 group`}
              title={`Call ${line.name} directly`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider truncate">
                    {line.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-white border border-slate-200 text-slate-600 shrink-0">
                    {line.tag}
                  </span>
                </div>
                <span className={`text-xl font-black font-display ${line.color}`}>
                  {line.number}
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                  {line.desc}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center group-hover:bg-[#00B074] group-hover:text-white group-hover:border-[#00B074] transition-colors shrink-0 shadow-xs">
                <PhoneCall className="w-4 h-4" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Route-Specific Verified Points */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Verified Highway Trauma & Police Support Points
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {EMERGENCY_FACILITIES.map((facility) => (
            <div
              key={facility.id}
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <span className="text-[10px] font-bold text-[#00B074] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                    {facility.type}
                  </span>
                  <span className="text-xs font-bold text-slate-500 shrink-0">
                    {facility.distanceKm} km from route
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 text-sm mt-1 truncate">{facility.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5 text-pretty">{facility.address}</p>
                <span className="text-[11px] font-semibold text-slate-400 block mt-1 truncate">
                  Highway Milestone: {facility.highwayMarker}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 truncate font-mono">
                  {facility.phone}
                </span>

                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Google Maps Directions */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${facility.coordinates.lat},${facility.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold text-xs transition-colors shrink-0 whitespace-nowrap"
                    title="Navigate directly on Google Maps"
                  >
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>Navigate</span>
                    <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                  </a>

                  {/* Direct Call Button */}
                  <a
                    href={`tel:${facility.phone.split('/')[0].trim()}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00B074] hover:bg-[#009663] text-white font-bold text-xs transition-colors shrink-0 whitespace-nowrap shadow-xs"
                    title={`Call ${facility.name}`}
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
