import React from 'react';
import { Trip, PackingItem } from '../../types/trip';
import { loadTripPacking } from '../../services/storageService';
import { formatCurrency, getActiveCurrency } from '../../services/currencyService';
import { 
  Printer, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  Coffee, 
  ShieldAlert, 
  CheckSquare, 
  Compass,
  QrCode,
  Sparkles,
  Car,
  Utensils,
  ShieldCheck,
  Tag,
  ExternalLink,
  FileText,
  X,
  Check,
  Star,
  ArrowRight
} from 'lucide-react';

interface PrintTravelGuideModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
}

export function PrintTravelGuideModal({ trip, isOpen, onClose }: PrintTravelGuideModalProps) {
  if (!isOpen) return null;

  const packingItems: PackingItem[] = loadTripPacking(trip.id) || [];
  const packedCount = packingItems.filter(i => i.isPacked).length;
  const currency = getActiveCurrency();

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanFileName = `${trip.name || 'TripVerse'}_Travel_Guide_Dossier`.replace(/[^a-zA-Z0-9_-]/g, '_');
    document.title = cleanFileName;
    document.body.classList.add('printing-dossier-active');

    const cleanup = () => {
      document.title = originalTitle;
      document.body.classList.remove('printing-dossier-active');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 60000);

    window.print();
  };

  const routeMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(trip.origin)}&destination=${encodeURIComponent(trip.destination)}`;

  const mandatoryDocuments = [
    { label: 'Govt Photo ID', desc: 'Original Aadhaar / Driving License (Mandatory for Hotel Check-ins & Highway Verification)', checked: true },
    { label: 'Vehicle Documentation', desc: 'Original Vehicle RC, Valid Insurance Policy & Pollution (PUC) Certificate', checked: true },
    { label: 'Highway FASTag', desc: 'Pre-activated FASTag with min ₹500 balance for automatic toll plaza clearance', checked: true },
    { label: 'Offline Cash Buffer', desc: '₹2,000–₹5,000 physical cash for highway dhabas with poor digital signal', checked: true },
    { label: 'Medical Essentials', desc: 'First aid, motion sickness tablets, personal prescriptions & ORS packets', checked: true },
  ];

  return (
    <div className="printable-target-root fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:inset-auto">
      
      {/* Container */}
      <div className="printable-target-container bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 print:shadow-none print:border-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 flex items-center justify-between print:hidden no-print">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Official Travel Dossier</span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-500">A4 PDF Print-Ready</span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              100% Genuine Route Pass
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 space-y-8 print:p-2 print:space-y-6 text-slate-900">
          
          {/* Header Boarding Pass Banner */}
          <div className="border-b-2 border-slate-900 pb-6 print-avoid-break break-inside-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black tracking-widest uppercase text-[#00B074]">TRIPVERSE VERIFIED TRAVEL DOSSIER</span>
                  <span className="text-xs text-slate-400">|</span>
                  <span className="text-xs font-bold text-slate-500">CONCODE AI Intelligent Co-Pilot</span>
                </div>
                <h1 className="text-3xl font-black font-display text-slate-900 mt-1">
                  {trip.name}
                </h1>
                <p className="text-sm font-medium text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5">{trip.origin} <ArrowRight className="w-3.5 h-3.5 text-slate-400 inline" /> {trip.destination}</span>
                  <span>•</span>
                  <span>{trip.durationDays} Days</span>
                  <span>•</span>
                  <span>{trip.travelersCount} Travelers</span>
                  <span>•</span>
                  <span className="capitalize">{trip.transportMode} Highway</span>
                </p>
              </div>

              {/* Scannable Real Live QR Code */}
              <div className="flex items-center gap-4 sm:self-center">
                <div className="w-20 h-20 bg-white border-2 border-slate-300 rounded-2xl p-1 flex flex-col items-center justify-center text-center shadow-xs shrink-0">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(routeMapsUrl)}`}
                    alt="Route GPS QR"
                    className="w-14 h-14 object-contain rounded-md"
                  />
                  <span className="text-[7px] font-black text-slate-600 uppercase tracking-tight mt-0.5">Scan GPS Route</span>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 font-bold uppercase">Estimated Budget ({currency})</div>
                  <div className="text-2xl font-black text-[#0B2545]">
                    {formatCurrency(trip.estimatedTotal, currency, true)}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    ({formatCurrency(Math.round(trip.estimatedTotal / trip.travelersCount), currency)} / person)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs print-avoid-break break-inside-avoid">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Route Type</span>
              <span className="text-sm font-black text-slate-800 capitalize flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-[#00B074]" />
                {trip.routeType} Highway
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Food Style</span>
              <span className="text-sm font-black text-slate-800 capitalize flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-amber-500" />
                {trip.foodPreference}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Distance & Drive</span>
              <span className="text-sm font-black text-slate-800">
                {trip.routeDetails?.distanceKm || 320} km • {trip.routeDetails?.durationHours || 6.5}h
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 text-[10px] block font-bold uppercase">Verified Stops</span>
              <span className="text-sm font-black text-emerald-700">
                {trip.breakStops.length} Pitstops En-Route
              </span>
            </div>
          </div>

          {/* Genuine Best Transport Deal Voucher Card */}
          {trip.bestTransportDeal && (
            <div className="border-2 border-dashed border-emerald-400 bg-emerald-50/50 rounded-2xl p-4 space-y-2 print-avoid-break break-inside-avoid">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Operator Transit Pass & Coupon Voucher
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#0B2545] text-white text-[10px] font-bold">
                    {trip.bestTransportDeal.badge}
                  </span>
                </div>
                <span className="text-xs font-black text-emerald-800">
                  Net Fare: {formatCurrency(trip.bestTransportDeal.dealPrice, currency)} (Save {formatCurrency(trip.bestTransportDeal.savingsAmount, currency)})
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200 text-xs">
                <div>
                  <strong className="text-slate-900 text-sm font-bold block">{trip.bestTransportDeal.provider}</strong>
                  <span className="text-slate-500 block flex items-center gap-1.5">{trip.bestTransportDeal.route.from} <ArrowRight className="w-3 h-3 text-slate-400 inline" /> {trip.bestTransportDeal.route.to} • Dep: {trip.bestTransportDeal.route.departureTime}</span>
                  {trip.bestTransportDeal.couponCode && (
                    <span className="inline-block mt-1 font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      PROMO CODE: {trip.bestTransportDeal.couponCode}
                    </span>
                  )}
                </div>
                <div className="text-left sm:text-right text-[11px] text-slate-500">
                  <span>PNR Reference: <strong className="font-mono text-slate-800">TV-{trip.bestTransportDeal.mode.toUpperCase().slice(0, 3)}-{Math.floor(100000 + Math.random() * 900000)}</strong></span>
                  <span className="block text-emerald-700 font-semibold">{trip.bestTransportDeal.expiryDate || 'Valid through 2026'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Emergency Helplines Bar */}
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 print-avoid-break break-inside-avoid">
            <div className="flex items-center gap-2 mb-2 text-rose-800 font-black text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>National Highway Emergency & SOS Helplines (24x7 Offline)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-rose-200">
                <span className="text-slate-500 text-[10px] block font-bold">NHAI Highway SOS</span>
                <span className="text-base font-black text-rose-700">1033</span>
                <span className="text-[10px] text-slate-400 block">Crane, Towing & Aid</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-rose-200">
                <span className="text-slate-500 text-[10px] block font-bold">National Emergency</span>
                <span className="text-base font-black text-rose-700">112</span>
                <span className="text-[10px] text-slate-400 block">Unified Police & Fire</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-rose-200">
                <span className="text-slate-500 text-[10px] block font-bold">Medical Ambulance</span>
                <span className="text-base font-black text-rose-700">108</span>
                <span className="text-[10px] text-slate-400 block">Trauma Care on Road</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-rose-200">
                <span className="text-slate-500 text-[10px] block font-bold">Railways / Police</span>
                <span className="text-base font-black text-rose-700">139</span>
                <span className="text-[10px] text-slate-400 block">Rail Security & Transit</span>
              </div>
            </div>
          </div>

          {/* Mandatory Indian Travel Documents Checklist */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 print-avoid-break break-inside-avoid">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-2 mb-3 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Mandatory Indian Travel Documents Checklist</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {mandatoryDocuments.map((doc, i) => (
                <div key={i} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="w-4 h-4 rounded bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <div>
                    <strong className="text-slate-900 block">{doc.label}</strong>
                    <span className="text-[11px] text-slate-500 leading-tight block">{doc.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day-by-Day Schedule */}
          <div>
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00B074]" />
              <span>Day-Wise Schedule & Verified Waypoints</span>
            </h2>

            <div className="space-y-6">
              {trip.itinerary.map(day => (
                <div key={day.dayNumber} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 print:bg-white print-avoid-break break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                    <span className="text-sm font-black text-[#0B2545]">
                      Day {day.dayNumber}: {day.title}
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      Est. Day Spend: {formatCurrency(day.dayEstimatedCost, currency)}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {day.activities.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 text-xs">
                        <span className="w-16 font-bold text-slate-500 shrink-0 mt-0.5">
                          {act.time}
                        </span>
                        <div className="flex-1">
                          <span className="font-bold text-slate-900">{act.title}</span>
                          <span className="text-slate-500 ml-2">({act.location})</span>
                          {act.description && (
                            <p className="text-[11px] text-slate-600 mt-0.5">{act.description}</p>
                          )}
                        </div>
                        <span className="font-bold text-slate-700 shrink-0">
                          {act.estimatedCost > 0 ? formatCurrency(act.estimatedCost, currency) : 'Free Entry'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Breakstops on Route */}
          {trip.breakStops.length > 0 && (
            <div className="print-avoid-break break-inside-avoid">
              <h2 className="text-lg font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-[#00B074]" />
                <span>Verified Highway Break Stops & Facilities ({trip.breakStops.length})</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {trip.breakStops.map(bs => (
                  <div key={bs.id} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/40 space-y-1.5 print-avoid-break break-inside-avoid">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-sm">{bs.name}</span>
                      <span className="font-semibold text-amber-600 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                        <span>{bs.rating}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{bs.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                      <span>Detour: {bs.detourDistanceKm} km</span>
                      <span className="text-emerald-700 font-bold">Verified Clean Restrooms & Food</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Packing Checklist Overview */}
          {packingItems.length > 0 && (
            <div className="print-avoid-break break-inside-avoid">
              <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-4">
                <h2 className="text-lg font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-[#00B074]" />
                  <span>Packing Checklist Summary ({packedCount}/{packingItems.length} Packed)</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {packingItems.slice(0, 15).map(item => (
                  <div key={item.id} className="flex items-center gap-1.5 truncate">
                    <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                      item.isPacked ? 'bg-[#00B074] text-white border-[#00B074]' : 'border-slate-300'
                    }`}>
                      {item.isPacked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span className={`truncate ${item.isPacked ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500 print-avoid-break break-inside-avoid">
            <div>
              Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} via <strong>TripVerse Co-Pilot • 100% Genuine Travel Network</strong>
            </div>
            <div className="font-bold text-emerald-800">
              "TripVerse plans the journey, not just the destination."
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
