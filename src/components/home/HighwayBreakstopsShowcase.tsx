import React, { useState } from 'react';
import { 
  MapPin, 
  Coffee, 
  Utensils, 
  Zap, 
  ShieldCheck, 
  Fuel, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Coins, 
  Navigation,
  Star,
  Compass
} from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

interface HighwayRoute {
  id: string;
  name: string;
  highway: string;
  distance: string;
  driveTime: string;
  tollEstimate: string;
  stopsCount: number;
  stops: {
    name: string;
    type: 'dhaba' | 'ev' | 'fuel' | 'viewpoint';
    tag: string;
    rating: number;
    reviewCount: number;
    hygieneRating: string;
    specialty: string;
    features: string[];
    distanceMark: string;
    image: string;
  }[];
}

const HIGHWAY_CORRIDORS: HighwayRoute[] = [
  {
    id: 'ahmedabad-udaipur',
    name: 'Ahmedabad → Udaipur',
    highway: 'NH-48 Golden Quadrilateral',
    distance: '260 km',
    driveTime: '4.5 hrs',
    tollEstimate: '₹345 (3 FastTag Plazas)',
    stopsCount: 3,
    stops: [
      {
        name: 'Shamlaji Highway Food Oasis',
        type: 'dhaba',
        tag: 'Verified Hygiene 5/5',
        rating: 4.8,
        reviewCount: 3420,
        hygieneRating: 'Sanitized Restrooms & Baby Care',
        specialty: 'Authentic Kathiyawadi Rotla, Spiced Buttermilk & Fafda Jalebi',
        features: ['100% Clean Washrooms', '24/7 Security', 'Ample Parking'],
        distanceMark: 'KM 115 • Midway Break',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Tata Power 60kW EV Fast Hub',
        type: 'ev',
        tag: 'Active CCS2 Fast Charger',
        rating: 4.9,
        reviewCount: 890,
        hygieneRating: 'AC Cafe Lounge with High-Speed WiFi',
        specialty: '0% to 80% charge in 35 mins while enjoying fresh brewed coffee',
        features: ['Dual Gun 60kW', 'Air-Conditioned Waiting', 'Live Availability'],
        distanceMark: 'KM 142 • Ratanpur Border',
        image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Kherwara Aravalli Ghat Viewpoint',
        type: 'viewpoint',
        tag: 'Scenic Photography Halt',
        rating: 4.7,
        reviewCount: 1650,
        hygieneRating: 'Fresh Mountain Air & Tea Stall',
        specialty: 'Panoramic mountain pass overlook with hot ginger masala chai',
        features: ['Sunset Vista', 'Scenic Overlook', 'Kulhad Chai'],
        distanceMark: 'KM 198 • Ghat Pass',
        image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },
  {
    id: 'delhi-manali',
    name: 'Delhi → Manali',
    highway: 'NH-44 & Kiratpur-Manali Expressway',
    distance: '510 km',
    driveTime: '9.5 hrs',
    tollEstimate: '₹710 (6 FastTag Plazas)',
    stopsCount: 4,
    stops: [
      {
        name: 'Murthal Amrik Sukhdev Dhaba',
        type: 'dhaba',
        tag: 'Iconic Highway Legend',
        rating: 4.9,
        reviewCount: 28400,
        hygieneRating: '5-Star Commercial Kitchen & Restrooms',
        specialty: 'Tandoori Parathas drenched in homemade white butter and lassi',
        features: ['Sanitized Facilities', 'Express Takeaway', '24/7 Hot Food'],
        distanceMark: 'KM 52 • Breakfast Halt',
        image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Zirakpur BPCL Oasis & EV Plaza',
        type: 'fuel',
        tag: 'Automated FastTag Fueling',
        rating: 4.8,
        reviewCount: 1420,
        hygieneRating: 'Clean Restrooms + Cafe Coffee Day',
        specialty: 'Fuel price calibration before entering mountain territory',
        features: ['Nitrogen Tire Check', 'Free Highway Maps', '24/7 EV Chargers'],
        distanceMark: 'KM 220 • Foothills Check',
        image: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Pandoh Dam Scenic Overlook',
        type: 'viewpoint',
        tag: 'Beas River Gorge',
        rating: 4.8,
        reviewCount: 3200,
        hygieneRating: 'Fresh Pine Breeze & Fruit Stalls',
        specialty: 'Himachali Siddu with Pure Ghee & fresh spiced walnuts',
        features: ['River Photography', 'Safe Parking Bay', 'Local Delicacies'],
        distanceMark: 'KM 420 • Alpine Valley',
        image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=600&q=80'
      }
    ]
  },
  {
    id: 'mumbai-goa',
    name: 'Mumbai → Goa',
    highway: 'NH-66 Scenic Coastal Highway',
    distance: '585 km',
    driveTime: '10.5 hrs',
    tollEstimate: '₹480 (4 FastTag Plazas)',
    stopsCount: 3,
    stops: [
      {
        name: 'Kolad Riverbank Pitstop & Cafe',
        type: 'dhaba',
        tag: 'Kundalika River Rest Area',
        rating: 4.8,
        reviewCount: 2100,
        hygieneRating: 'Clean Restrooms & Shaded Seating',
        specialty: 'Steaming Misal Pav with Farsan & fresh tender coconut water',
        features: ['River Breeze', 'Family Friendly', 'Quick Bites'],
        distanceMark: 'KM 118 • Morning Break',
        image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Chiplun Vashishti River Overlook',
        type: 'viewpoint',
        tag: 'Konkan Heartland',
        rating: 4.9,
        reviewCount: 4500,
        hygieneRating: 'Sanitized Restrooms + Authentic Dining',
        specialty: 'Authentic Konkani Fish Thali, Solkadhi & fresh Alphonso drinks',
        features: ['Valley View', 'EV Fast Charging', 'Regional Souvenirs'],
        distanceMark: 'KM 260 • Lunch Halt',
        image: 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?auto=format&fit=crop&w=600&q=80'
      },
      {
        name: 'Kankavli Highway Rest Plaza',
        type: 'fuel',
        tag: 'Shell & EV Supercharge',
        rating: 4.8,
        reviewCount: 1150,
        hygieneRating: 'Modern Convenience Store & Restrooms',
        specialty: 'Cold refreshments & vehicle check before the final coastal run',
        features: ['Clean Toilets', 'ATM on site', 'Coffee Kiosk'],
        distanceMark: 'KM 440 • Sunset Halt',
        image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80'
      }
    ]
  }
];

interface HighwayBreakstopsShowcaseProps {
  onPlanCorridor?: (destination: string) => void;
}

export const HighwayBreakstopsShowcase: React.FC<HighwayBreakstopsShowcaseProps> = ({
  onPlanCorridor
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('ahmedabad-udaipur');

  const activeRoute = HIGHWAY_CORRIDORS.find(r => r.id === selectedRouteId) || HIGHWAY_CORRIDORS[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[#00B074] text-xs sm:text-sm font-bold shadow-2xs mb-3">
          <Navigation className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>The TripVerse Secret Weapon</span>
        </div>

        <h2 className="text-2xl sm:text-4xl font-display font-black text-[#0B2545] tracking-tight leading-tight mb-3">
          We Plan the Highway, <span className="text-trip-gradient">Not Just the Hotel</span>
        </h2>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed text-pretty">
          Other apps abandon you the moment you leave the city gates. TripVerse sequences high-hygiene highway break stops, verified dhabas, EV charging hubs, and exact NHAI toll costs right on your route.
        </p>
      </div>

      {/* Corridor Selector Tabs */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        {HIGHWAY_CORRIDORS.map(corridor => {
          const isSelected = corridor.id === selectedRouteId;
          return (
            <button
              key={corridor.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setSelectedRouteId(corridor.id);
              }}
              className={`min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#00B074] text-white shadow-md shadow-emerald-500/20'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
              }`}
            >
              <span>{corridor.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {corridor.distance}
              </span>
            </button>
          );
        })}
      </div>

      {/* Route Corridor Intelligence Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0B2545] to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-800 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <Navigation className="w-3.5 h-3.5" />
              <span>{activeRoute.highway}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-display text-white">
              {activeRoute.name} Corridor
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Verified road quality, lane conditions, and real-time toll tariffs.
            </p>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 bg-white/10 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-white/10 text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Distance</span>
              <span className="text-sm sm:text-base font-extrabold text-white block">{activeRoute.distance}</span>
              <span className="text-[10px] text-slate-400">{activeRoute.driveTime} drive</span>
            </div>
            <div className="border-x border-white/15 px-2">
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">FastTag Tolls</span>
              <span className="text-sm sm:text-base font-extrabold text-emerald-400 block">{activeRoute.tollEstimate.split(' ')[0]}</span>
              <span className="text-[10px] text-slate-400">Pre-calculated</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300 block">Pitstops</span>
              <span className="text-sm sm:text-base font-extrabold text-white block">{activeRoute.stopsCount} Verified</span>
              <span className="text-[10px] text-slate-400">Hygiene tested</span>
            </div>
          </div>
        </div>
      </div>

      {/* Break Stop Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeRoute.stops.map((stop, idx) => (
          <div
            key={idx}
            className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 flex flex-col"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={stop.image}
                alt={stop.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                <span className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-black text-slate-800 shadow-xs">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>{stop.rating}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Verified Stop</span>
                </span>

                <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  {stop.type.toUpperCase()}
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                  {stop.distanceMark}
                </span>
                <h4 className="text-base font-bold font-display leading-tight truncate drop-shadow-sm">
                  {stop.name}
                </h4>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/70">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{stop.hygieneRating}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {stop.specialty}
                </p>

                {/* Feature Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {stop.features.map((feat, fIdx) => (
                    <span
                      key={fIdx}
                      className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md"
                    >
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  const dest = activeRoute.name.split('→')[1]?.trim() || 'Udaipur';
                  if (onPlanCorridor) {
                    onPlanCorridor(dest);
                  }
                }}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-[#00B074] hover:text-white text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer group/btn"
              >
                <span>Plan With This Highway Route</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
};
