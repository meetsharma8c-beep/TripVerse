import React, { useState } from 'react';
import { 
  Bus, 
  Car, 
  ExternalLink, 
  Plane, 
  Train, 
  Bike, 
  QrCode, 
  Sun, 
  CloudSun, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Download, 
  Bed, 
  ChevronRight, 
  Ticket,
  Sparkles,
  Luggage,
  Calendar
} from 'lucide-react';
import { Trip, TransportMode } from '../../types/trip';
import { resolveDestinationImage, handleImageError } from '../../utils/destinationImages';

interface TransportDealsViewProps {
  trip: Trip;
  onApplySavings?: (savingsAmount: number, category: any, reason: string) => void;
  onOpenPrint?: () => void;
  onOpenBooking?: () => void;
}

const MODES: Array<{ id: TransportMode; label: string; Icon: typeof Plane }> = [
  { id: 'flight', label: 'Flights', Icon: Plane },
  { id: 'train', label: 'Trains', Icon: Train },
  { id: 'bus', label: 'Buses', Icon: Bus },
  { id: 'public', label: 'Public transport', Icon: Bus },
  { id: 'car', label: 'Cars & cabs', Icon: Car },
  { id: 'bike', label: 'Motorbike rental', Icon: Bike }
];

export const TransportDealsView: React.FC<TransportDealsViewProps> = ({ 
  trip, 
  onOpenPrint,
  onOpenBooking 
}) => {
  const [mode, setMode] = useState<TransportMode>(trip.transportMode || 'car');
  const [checklist, setChecklist] = useState([
    { id: 1, label: 'Travel Documents & ID', checked: true },
    { id: 2, label: 'Camera & Charger', checked: true },
    { id: 3, label: 'Seasonal Outfits & Shoes', checked: true },
    { id: 4, label: 'First-Aid & Essentials', checked: false }
  ]);

  const origin = (trip.origin || 'Origin').split(',')[0].trim();
  const destination = (trip.destination || 'Destination').split(',')[0].trim();
  const query = encodeURIComponent(`${origin} to ${destination}`);

  // Derived 3-letter uppercase station / airport codes
  const originCode = origin.slice(0, 3).toUpperCase() || 'ORG';
  const destCode = destination.slice(0, 3).toUpperCase() || 'DST';

  const providers = {
    flight: [
      { name: 'Google Flights search', href: `https://www.google.com/travel/flights?q=${query}` },
      { name: 'MakeMyTrip Flights', href: `https://www.makemytrip.com/flights/` }
    ],
    train: [
      { name: 'IRCTC train search', href: 'https://www.irctc.co.in/nget/train-search' }
    ],
    bus: [
      { name: 'redBus search', href: 'https://www.redbus.in/' },
      { name: 'IntrCity SmartBus', href: 'https://www.intrcity.com/' }
    ],
    public: [
      { name: 'IRCTC train search', href: 'https://www.irctc.co.in/nget/train-search' },
      { name: 'redBus search', href: 'https://www.redbus.in/' }
    ],
    car: [
      { name: 'Zoomcar', href: 'https://www.zoomcar.com/' },
      { name: 'MakeMyTrip cabs', href: 'https://www.makemytrip.com/cabs/' }
    ],
    bike: [
      { name: 'Royal Brothers', href: 'https://www.royalbrothers.com/' },
      { name: 'Wheelstreet', href: 'https://www.wheelstreet.com/' }
    ],
    any: [
      { name: 'Google Flights search', href: `https://www.google.com/travel/flights?q=${query}` },
      { name: 'IRCTC train search', href: 'https://www.irctc.co.in/nget/train-search' },
      { name: 'redBus search', href: 'https://www.redbus.in/' }
    ]
  } satisfies Record<TransportMode, Array<{ name: string; href: string }>>;

  const Icon = MODES.find(item => item.id === mode)?.Icon || Car;
  const modeDescription: Record<TransportMode, string> = {
    flight: `Search flights from ${origin || 'your origin'} to ${destination || 'your destination'}.`,
    train: `Open IRCTC to enter ${origin || 'your origin'} and ${destination || 'your destination'}.`,
    bus: `Open bus providers to search ${origin || 'your origin'} to ${destination || 'your destination'}.`,
    public: `Search public transport for ${origin || 'your origin'} to ${destination || 'your destination'}.`,
    car: `Check rental coverage and pickup locations near ${destination || 'your destination'}.`,
    bike: `Check motorbike rental coverage near ${destination || 'your destination'}.`,
    any: `Search providers for ${origin || 'your origin'} to ${destination || 'your destination'}.`
  };

  const destinationImg = resolveDestinationImage(trip.destination);
  const hotelName = trip.selectedHotel?.name || 'Handpicked Boutique Stay';
  const packedCount = checklist.filter(c => c.checked).length;
  const progressPercent = Math.round((packedCount / checklist.length) * 100);

  const toggleChecklistItem = (id: number) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* ============================================================== */}
      {/* SCREEN 3: SIGNATURE LUXURY BOARDING PASS & JOURNEY TICKET CARD  */}
      {/* ============================================================== */}
      <div className="rounded-3xl overflow-hidden border border-[#E2EBE1] shadow-[0_10px_30px_rgba(45,90,61,0.06)] bg-white">
        
        {/* Scalloped Header Banner (Emerald Forest) */}
        <div className="bg-[#2D5A3D] text-white px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-emerald-300" />
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-100">
              Boarding Pass & Route Pass
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span>On Time</span>
            </span>
            <Plane className="w-4 h-4 text-emerald-200" />
          </div>
        </div>

        {/* Boarding Pass Core Body */}
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Origin -> Destination Flight Path Diagram */}
          <div className="flex items-center justify-between gap-4">
            
            {/* Origin */}
            <div className="space-y-0.5 text-left min-w-[70px]">
              <span className="text-[10px] font-bold text-[#5A7362] uppercase tracking-wider block">
                {origin}
              </span>
              <p className="text-2xl sm:text-3xl font-display font-black text-[#152A1C] tracking-tight">
                {originCode}
              </p>
              <span className="text-xs font-semibold text-[#152A1C] block">
                08:40 AM
              </span>
              <span className="text-[10px] text-slate-400 block">
                {trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Day 1'}
              </span>
            </div>

            {/* In-Between Flight Route Arc with Plane */}
            <div className="flex-1 flex flex-col items-center justify-center px-2">
              <span className="text-[10px] font-bold text-[#5A7362] mb-1">
                {trip.routeDetails?.durationHours ? `${trip.routeDetails.durationHours}h` : '2h 15m'}
              </span>
              <div className="relative w-full flex items-center justify-center">
                <div className="w-full border-t-2 border-dashed border-[#8EA78D]/50" />
                <div className="absolute w-7 h-7 rounded-full bg-[#E8EFE7] border border-[#8EA78D]/40 text-[#2D5A3D] flex items-center justify-center shadow-2xs">
                  <Plane className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 font-mono">
                {trip.routeDetails?.distanceKm ? `${trip.routeDetails.distanceKm} km` : 'Scenic Route'}
              </span>
            </div>

            {/* Destination */}
            <div className="space-y-0.5 text-right min-w-[70px]">
              <span className="text-[10px] font-bold text-[#5A7362] uppercase tracking-wider block">
                {destination}
              </span>
              <p className="text-2xl sm:text-3xl font-display font-black text-[#152A1C] tracking-tight">
                {destCode}
              </p>
              <span className="text-xs font-semibold text-[#152A1C] block">
                11:50 AM
              </span>
              <span className="text-[10px] text-slate-400 block">
                {trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'Day 1'}
              </span>
            </div>

          </div>

          {/* Ticket Perforated Tear Line */}
          <div className="relative py-1 flex items-center justify-center">
            <div className="w-full border-t border-dashed border-[#8EA78D]/40" />
            <div className="absolute -left-8 w-5 h-5 rounded-full bg-[#F4F6F2] border-r border-[#E2EBE1]" />
            <div className="absolute -right-8 w-5 h-5 rounded-full bg-[#F4F6F2] border-l border-[#E2EBE1]" />
          </div>

          {/* Boarding Details & Clean QR Code */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="grid grid-cols-3 gap-4 flex-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#5A7362] tracking-wider block">Trip ID</span>
                <p className="text-xs sm:text-sm font-black text-[#152A1C] font-display mt-0.5">{trip.id.slice(0, 10).toUpperCase()}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#5A7362] tracking-wider block">Gate / Bay</span>
                <p className="text-xs sm:text-sm font-black text-[#152A1C] font-display mt-0.5">A12</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#5A7362] tracking-wider block">Travelers</span>
                <p className="text-xs sm:text-sm font-black text-[#152A1C] font-display mt-0.5">{trip.travelersCount} Pax</p>
              </div>
            </div>

            {/* Stylized Vector QR Code Block */}
            <div className="p-2 rounded-2xl bg-[#F4F6F2] border border-[#E2EBE1] flex items-center justify-center shrink-0 shadow-2xs">
              <QrCode className="w-11 h-11 text-[#152A1C]" />
            </div>
          </div>

        </div>

        {/* Screen 3: Hotel Card directly inside Transit Hub */}
        <div className="border-t border-[#E2EBE1] p-4 sm:p-5 bg-[#F8FAF7]/60">
          <div 
            onClick={onOpenBooking}
            className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#E2EBE1] hover:border-[#2D5A3D] transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#E2EBE1] bg-[#E8EFE7]">
                <img
                  src={destinationImg}
                  alt={hotelName}
                  onError={handleImageError}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D5A3D] block">
                  Hotel Stay
                </span>
                <h4 className="text-sm font-bold text-[#152A1C] truncate">
                  {hotelName}
                </h4>
                <p className="text-[11px] text-[#5A7362] truncate">
                  {trip.durationDays} Days • {Math.max(1, trip.durationDays - 1)} Nights
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2D5A3D] group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </div>

        {/* Screen 3: Weather & Trip Progress Dual Cards */}
        <div className="border-t border-[#E2EBE1] p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
          
          {/* Weather Widget */}
          <div className="p-3.5 rounded-2xl bg-[#F4F6F2] border border-[#E2EBE1] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#5A7362] tracking-wider block">
                Weather in {destination}
              </span>
              <p className="text-2xl font-black font-display text-[#152A1C] mt-0.5">26°C</p>
              <p className="text-[11px] text-[#5A7362]">Partly Cloudy • High 30° Low 23°</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2EBE1] flex items-center justify-center text-amber-500 shadow-2xs">
              <CloudSun className="w-6 h-6 text-amber-500" />
            </div>
          </div>

          {/* Trip Progress Circular Metric */}
          <div className="p-3.5 rounded-2xl bg-[#F4F6F2] border border-[#E2EBE1] flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#5A7362] tracking-wider block">
                Trip Progress
              </span>
              <p className="text-2xl font-black font-display text-[#2D5A3D] mt-0.5">{progressPercent}%</p>
              <p className="text-[11px] text-[#5A7362]">{packedCount} of {checklist.length} tasks ready</p>
            </div>
            <div className="relative w-12 h-12 flex items-center justify-center">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#2D5A3D] transition-all duration-500"
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <Sparkles className="w-4 h-4 text-[#2D5A3D] absolute" />
            </div>
          </div>

        </div>

        {/* Screen 3: Packing Checklist with Interactive Checkboxes */}
        <div className="border-t border-[#E2EBE1] p-4 sm:p-5 bg-[#F8FAF7]/60 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#152A1C]">
            <div className="flex items-center gap-1.5">
              <Luggage className="w-3.5 h-3.5 text-[#2D5A3D]" />
              <span>Packing Checklist</span>
            </div>
            <span className="text-[#5A7362] text-[11px]">{packedCount} of {checklist.length} packed</span>
          </div>

          <div className="w-full bg-[#E2EBE1] rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#2D5A3D] h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {checklist.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleChecklistItem(item.id)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all text-left cursor-pointer ${
                  item.checked 
                    ? 'bg-white border-[#8EA78D]/50 text-[#152A1C] shadow-2xs' 
                    : 'bg-white/60 border-[#E2EBE1] text-slate-500 hover:bg-white'
                }`}
              >
                {item.checked ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2D5A3D] shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span className={item.checked ? 'font-semibold' : ''}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Screen 3: Green Pill Primary Action (View E-Ticket & Dossier) */}
        <div className="p-4 sm:p-5 bg-white border-t border-[#E2EBE1]">
          <button
            type="button"
            onClick={onOpenPrint || (() => window.print())}
            className="w-full py-3.5 px-6 rounded-full bg-[#2D5A3D] hover:bg-[#244931] text-white font-display font-bold text-sm shadow-md shadow-[#2D5A3D]/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>View & Download E-Ticket Dossier</span>
          </button>
        </div>

      </div>

      {/* ============================================================== */}
      {/* DIRECT PROVIDER SEARCH & COMPARISON                            */}
      {/* ============================================================== */}
      <section className="space-y-5 rounded-3xl border border-[#E2EBE1] bg-white p-5 shadow-sm sm:p-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">External Provider Search</p>
          <h2 className="mt-1 text-xl font-bold font-display text-[#152A1C]">Compare Live Transport & Booking</h2>
          <p className="mt-1 text-sm text-[#5A7362]">
            {trip.origin} → {trip.destination}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
          TripVerse connects you directly with certified carriers. Search live schedules and book directly with zero markups.
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MODES.map(({ id, label, Icon: ModeIcon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-xs font-bold transition-all cursor-pointer ${
                mode === id 
                  ? 'bg-[#2D5A3D] text-white shadow-xs' 
                  : 'bg-[#F4F6F2] text-[#5A7362] hover:bg-[#E8EFE7] hover:text-[#152A1C]'
              }`}
            >
              <ModeIcon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {providers[mode].map(provider => (
            <a
              key={provider.name}
              href={provider.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-[#E2EBE1] p-4 transition-all hover:border-[#2D5A3D] hover:bg-[#E8EFE7]/40 shadow-2xs group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon className="h-5 w-5" />
              </div>
              <span className="flex-1 text-sm font-bold text-[#152A1C]">{provider.name}</span>
              <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-[#2D5A3D] transition-colors" />
            </a>
          ))}
        </div>
        <p className="text-[11px] text-[#5A7362]">{modeDescription[mode]}</p>
      </section>

    </div>
  );
};

