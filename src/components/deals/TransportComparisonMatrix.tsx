import React from 'react';
import { Trip } from '../../types/trip';
import { formatCurrency, SupportedCurrency } from '../../services/currencyService';
import { 
  Car, 
  Train, 
  Bus, 
  Plane, 
  Clock, 
  Wallet, 
  Luggage, 
  Leaf, 
  Sparkles, 
  ExternalLink, 
  Check, 
  Calendar,
  ShieldCheck,
  TrendingDown,
  Award
} from 'lucide-react';

interface TransportComparisonMatrixProps {
  trip: Trip;
  currency: SupportedCurrency;
}

export const TransportComparisonMatrix: React.FC<TransportComparisonMatrixProps> = ({
  trip,
  currency
}) => {
  const travelers = Math.max(1, trip.travelersCount);

  // Mode comparative models
  const modes = [
    {
      id: 'car',
      name: 'Road Trip (Car / SUV)',
      provider: 'Personal Car / Savaari Cab',
      icon: Car,
      color: '#00B074',
      bgLight: 'bg-emerald-50',
      borderLight: 'border-emerald-200',
      badge: 'Best for Groups',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      costPerPerson: Math.round(5800 / travelers),
      totalTripCost: 5800,
      transitTime: '4h 45m',
      doorToDoorTime: '4h 45m',
      baggage: 'Unlimited Boot Space',
      carbonKgPerPerson: 10.5,
      comfortRating: '4.8 / 5.0',
      flexibility: '100% On-Demand (Stop anytime)',
      pros: [
        'Scenic highway rest stops & food dhabas',
        'Direct hotel door-to-door without luggage drag',
        'Cost divides down as travelers increase'
      ],
      bookingUrl: 'https://www.zoomcar.com/',
      bookingLabel: 'Rent with Zoomcar'
    },
    {
      id: 'train',
      name: 'Vande Bharat / Express Train',
      provider: 'Indian Railways (IRCTC)',
      icon: Train,
      color: '#0284C7',
      bgLight: 'bg-sky-50',
      borderLight: 'border-sky-200',
      badge: 'Lowest Fatigue',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      costPerPerson: 950,
      totalTripCost: 950 * travelers,
      transitTime: '4h 15m',
      doorToDoorTime: '5h 15m (incl. station buffer)',
      baggage: '40 kg Free / Passenger',
      carbonKgPerPerson: 4.2,
      comfortRating: '4.9 / 5.0',
      flexibility: 'Fixed timings (Daily 06:10 AM & 15:45 PM)',
      pros: [
        'Greenest eco-friendly option in India',
        'AC Chair Car with charging points & meals',
        'Zero traffic jams or toll plaza halts'
      ],
      bookingUrl: 'https://www.irctc.co.in/',
      bookingLabel: 'Book on IRCTC'
    },
    {
      id: 'bus',
      name: 'AC Sleeper Multi-Axle Bus',
      provider: 'RedBus Verified Operators',
      icon: Bus,
      color: '#8B5CF6',
      bgLight: 'bg-purple-50',
      borderLight: 'border-purple-200',
      badge: 'Best Budget Value',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      costPerPerson: 650,
      totalTripCost: 650 * travelers,
      transitTime: '5h 45m',
      doorToDoorTime: '6h 30m',
      baggage: '2 Luggage Pieces / Passenger',
      carbonKgPerPerson: 11.2,
      comfortRating: '4.2 / 5.0',
      flexibility: 'Frequent evening departures',
      pros: [
        'Lowest ticket cost per passenger',
        'Overnight departures save one hotel night',
        'Direct drop at city central bus station'
      ],
      bookingUrl: 'https://www.redbus.in/',
      bookingLabel: 'Book on RedBus'
    },
    {
      id: 'flight',
      name: 'Regional Flight (Economy)',
      provider: 'IndiGo / Air India',
      icon: Plane,
      color: '#F59E0B',
      bgLight: 'bg-amber-50',
      borderLight: 'border-amber-200',
      badge: 'Shortest Flight Time',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      costPerPerson: 3850,
      totalTripCost: 3850 * travelers,
      transitTime: '1h 10m (airborne)',
      doorToDoorTime: '3h 40m (incl. check-in)',
      baggage: '15 kg Check-in + 7 kg Cabin',
      carbonKgPerPerson: 84.0,
      comfortRating: '4.6 / 5.0',
      flexibility: 'Specific scheduled flights',
      pros: [
        'Fastest airborne cruise duration',
        'Complimentary air miles & airport lounges',
        'Premium service and speed'
      ],
      bookingUrl: 'https://www.makemytrip.com/flights/',
      bookingLabel: 'Search on MakeMyTrip'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Intro Banner */}
      <div className="bg-gradient-to-r from-[#0B2545] to-[#143B66] text-white p-5 sm:p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-caps text-emerald-300">Intelligent Mode Decision Matrix</span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-emerald-200">{travelers} Traveler{travelers > 1 ? 's' : ''}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold font-display mt-0.5">
            Transport Options: {trip.origin} → {trip.destination}
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl text-pretty">
            Compare true door-to-door travel times, group expenses, baggage flexibility, and carbon footprint before you book.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 text-center shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-300 block">AI Recommended</span>
          <span className="text-sm font-black text-emerald-300 font-display">Road Trip / Car</span>
          <span className="text-[10px] text-slate-300 block mt-0.5">Optimal for {travelers} buddies</span>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {modes.map((m) => {
          const IconComp = m.icon;

          return (
            <div
              key={m.id}
              className={`bg-white rounded-3xl border ${m.borderLight} shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden group`}
            >
              <div>
                
                {/* Card Header */}
                <div className={`${m.bgLight} p-5 border-b ${m.borderLight}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                    <div 
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: m.color }}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                  </div>

                  <h4 className="text-base font-bold font-display text-[#0B2545] leading-snug">
                    {m.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {m.provider}
                  </p>
                </div>

                {/* Key Metrics */}
                <div className="p-5 space-y-4">
                  
                  {/* Fare */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Cost Per Person</span>
                      <span className="text-2xl font-black font-display text-[#0B2545]">
                        {formatCurrency(m.costPerPerson, currency)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total for Group</span>
                      <span className="text-xs font-bold text-slate-700">
                        {formatCurrency(m.totalTripCost, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Door to Door Time */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Door-to-Door</span>
                    </span>
                    <span className="font-bold text-slate-900 font-display">
                      {m.doorToDoorTime}
                    </span>
                  </div>

                  {/* Baggage Rule */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Luggage className="w-3.5 h-3.5 text-slate-400" />
                      <span>Baggage</span>
                    </span>
                    <span className="font-semibold text-slate-800 truncate max-w-[140px]" title={m.baggage}>
                      {m.baggage}
                    </span>
                  </div>

                  {/* Carbon Footprint */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Eco Footprint</span>
                    </span>
                    <span className={`font-bold ${m.carbonKgPerPerson < 15 ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {m.carbonKgPerPerson} kg CO2/pax
                    </span>
                  </div>

                  {/* Top Advantages */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Key Highlights:
                    </span>
                    <ul className="space-y-1.5">
                      {m.pros.map((pro, idx) => (
                        <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5 leading-snug">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                </div>

              </div>

              {/* Booking CTA Button */}
              <div className="p-5 pt-0">
                <a
                  href={m.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors group-hover:bg-trip-gradient group-hover:text-white"
                >
                  <span>{m.bookingLabel}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
