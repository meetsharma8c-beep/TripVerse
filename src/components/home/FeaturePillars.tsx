import React from 'react';
import { CloudRain, Coffee, ShieldCheck, Navigation, Percent } from 'lucide-react';

export const FeaturePillars: React.FC = () => {
  const pillars = [
    {
      id: 'weather',
      icon: CloudRain,
      badge: 'Forecast',
      title: 'Weather forecast',
      desc: 'Open-Meteo forecast when coordinates and provider coverage are available; not a road advisory'
    },
    {
      id: 'break-stops',
      icon: Coffee,
      badge: 'When available',
      title: 'Route & place listings',
      desc: 'Driving route geometry and nearby Geoapify/OpenStreetMap places; facilities are not confirmed'
    },
    {
      id: 'pricing',
      icon: Percent,
      badge: 'Estimate',
      title: 'Trip budgets',
      desc: 'Draft budget estimates; confirm current prices with providers'
    },
    {
      id: 'navigation',
      icon: Navigation,
      badge: 'External app',
      title: 'Get directions',
      desc: 'Open a navigation provider for turn-by-turn directions and traffic'
    },
    {
      id: 'safety',
      icon: ShieldCheck,
      badge: 'Location-specific',
      title: 'Emergency information',
      desc: 'Use official local services; TripVerse does not verify nearby facilities'
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {pillars.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-emerald-400 hover:-translate-y-0.5 transition-all duration-300 group relative"
            >
              <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-2.5">
                {item.badge}
              </span>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#2D5A3D] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all duration-300 shadow-xs">
                <Icon className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-tight mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-slate-500 leading-snug">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
