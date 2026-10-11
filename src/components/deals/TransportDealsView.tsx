import React, { useState } from 'react';
import { Bus, Car, ExternalLink, Plane, Train, Bike } from 'lucide-react';
import { Trip, TransportMode } from '../../types/trip';

interface TransportDealsViewProps {
  trip: Trip;
  onApplySavings: (savingsAmount: number, category: any, reason: string) => void;
}

const MODES: Array<{ id: TransportMode; label: string; Icon: typeof Plane }> = [
  { id: 'flight', label: 'Flights', Icon: Plane },
  { id: 'train', label: 'Trains', Icon: Train },
  { id: 'bus', label: 'Buses', Icon: Bus },
  { id: 'public', label: 'Public transport', Icon: Bus },
  { id: 'car', label: 'Cars & cabs', Icon: Car },
  { id: 'bike', label: 'Motorbike rental', Icon: Bike }
];

export const TransportDealsView: React.FC<TransportDealsViewProps> = ({ trip }) => {
  const [mode, setMode] = useState<TransportMode>(trip.transportMode || 'car');
  const origin = (trip.origin || 'Origin').split(',')[0].trim();
  const destination = (trip.destination || 'Destination').split(',')[0].trim();
  const query = encodeURIComponent(`${origin} to ${destination}`);
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

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">External provider search</p>
        <h2 className="mt-1 text-xl font-bold text-[#0B2545]">Compare transport for your trip</h2>
        <p className="mt-1 text-sm text-slate-600">
          {trip.origin} → {trip.destination}
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
        TripVerse is free to use and does not collect booking payments. These links take you to external providers to
        search and book directly. Some providers require you to enter the route after opening their site. Verify current
        schedules, prices, availability, and terms there; TripVerse does not create a reservation.
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MODES.map(({ id, label, Icon: ModeIcon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            aria-pressed={mode === id}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-bold ${
              mode === id ? 'bg-[#0B2545] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
            className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-slate-200 p-4 transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
          >
            <Icon className="h-5 w-5 text-emerald-700" />
            <span className="flex-1 text-sm font-bold text-slate-800">{provider.name}</span>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">{modeDescription[mode]}</p>
    </section>
  );
};
