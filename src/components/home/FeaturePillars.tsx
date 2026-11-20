import React from 'react';
import { CloudRain, Coffee, ShieldCheck, Navigation, Percent, Compass, Fuel, Utensils, Mountain } from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';
import { useLanguage } from '../../services/languageService';
import { LiquidCard } from '../ui/liquid';

export const FeaturePillars: React.FC = () => {
  const { t } = useLanguage();

  const pillars = [
    {
      id: 'weather',
      icon: CloudRain,
      badge: t('pillar.weather.badge'),
      title: t('pillar.weather.title'),
      desc: t('pillar.weather.desc'),
      accent: 'from-sky-500/12 via-emerald-500/8 to-transparent',
    },
    {
      id: 'break-stops',
      icon: Coffee,
      badge: t('pillar.stops.badge'),
      title: t('pillar.stops.title'),
      desc: t('pillar.stops.desc'),
      accent: 'from-emerald-600/12 via-amber-500/8 to-transparent',
    },
    {
      id: 'pricing',
      icon: Percent,
      badge: t('pillar.budget.badge'),
      title: t('pillar.budget.title'),
      desc: t('pillar.budget.desc'),
      accent: 'from-emerald-500/10 to-transparent',
    },
    {
      id: 'navigation',
      icon: Navigation,
      badge: t('pillar.nav.badge'),
      title: t('pillar.nav.title'),
      desc: t('pillar.nav.desc'),
      accent: 'from-teal-500/10 to-transparent',
    },
    {
      id: 'safety',
      icon: ShieldCheck,
      badge: t('pillar.safety.badge'),
      title: t('pillar.safety.title'),
      desc: t('pillar.safety.desc'),
      accent: 'from-amber-500/10 to-transparent',
    },
  ];

  const [weatherPillar, stopsPillar, ...secondaryPillars] = pillars;
  const WeatherIcon = weatherPillar.icon;
  const StopsIcon = stopsPillar.icon;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      {/* Editorial Section Eyebrow */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2D5A3D] dark:text-emerald-400">
            <Compass className="w-3.5 h-3.5" />
            <span>Engineered for the Open Road</span>
          </span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-display font-black text-[#152A1C] dark:text-white tracking-tight leading-tight">
            Intelligence woven into{' '}
            <span className="font-serif italic font-normal text-[#2D5A3D] dark:text-emerald-400">every mile.</span>
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#57685D] dark:text-slate-400 max-w-sm">
          Five real-time travel engines orchestrated inside one calm Liquid Glass workspace.
        </p>
      </div>

      {/* Asymmetric Editorial 12-Column Liquid Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Hero Bento 1: Climate & Indoor Mirror Pacing (5 cols) */}
        <ScrollReveal delayMs={0} className="lg:col-span-5 h-full">
          <LiquidCard outerRadius={28} innerPadding={10} className="h-full p-6 sm:p-7 flex flex-col justify-between group">
            <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${weatherPillar.accent}`} />
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="glass-clear liquid-rim inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full text-[#2D5A3D] dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                  {weatherPillar.badge}
                </span>
                <div className="w-11 h-11 rounded-2xl glass-accent liquid-rim flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <WeatherIcon className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-[#152A1C] dark:text-white tracking-tight">
                  {weatherPillar.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-[#57685D] dark:text-slate-300 leading-relaxed">
                  {weatherPillar.desc}
                </p>
              </div>
            </div>

            {/* Subtle Visual Weather-Swap Pill Preview */}
            <div className="relative z-10 mt-5 pt-4 border-t border-[#DCE7DB]/70 dark:border-white/10 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#2D5A3D] dark:text-emerald-300">
              <span className="inline-flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-[#EAF0E9] dark:bg-emerald-950/60 tabular-nums">Rain-Ready</span>
                <span className="text-[#57685D] dark:text-slate-400">1-Tap Indoor Mirrors</span>
              </span>
              <span className="font-serif italic text-[#2D5A3D] dark:text-emerald-400">Live Sync</span>
            </div>
          </LiquidCard>
        </ScrollReveal>

        {/* Hero Bento 2: Panoramic Highway Break Stops with Animated SVG Route Spline (7 cols) */}
        <ScrollReveal delayMs={65} className="lg:col-span-7 h-full">
          <LiquidCard outerRadius={28} innerPadding={10} className="h-full p-6 sm:p-7 flex flex-col justify-between group">
            <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${stopsPillar.accent}`} />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2.5 max-w-md">
                <span className="glass-clear liquid-rim inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full text-[#2D5A3D] dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {stopsPillar.badge}
                </span>
                <h3 className="text-xl sm:text-2xl font-display font-extrabold text-[#152A1C] dark:text-white tracking-tight">
                  {stopsPillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#57685D] dark:text-slate-300 leading-relaxed">
                  {stopsPillar.desc}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl glass-accent liquid-rim flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <StopsIcon className="w-5 h-5" />
              </div>
            </div>

            {/* Signature Animated Route Spline Connecting Highway Pit-Stop Glass Micro-Pills */}
            <div className="relative z-10 mt-6 pt-4 border-t border-[#DCE7DB]/70 dark:border-white/10">
              <div className="relative flex items-center justify-between gap-2">
                <svg
                  aria-hidden="true"
                  className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-6 w-[calc(100%-3rem)] pointer-events-none"
                  viewBox="0 0 400 24"
                  preserveAspectRatio="none"
                  fill="none"
                >
                  <path
                    d="M 0 12 Q 100 2, 200 12 T 400 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-[#2D5A3D]/45 dark:text-emerald-400/50 liquid-route-trace"
                    strokeLinecap="round"
                  />
                </svg>

                {[
                  { icon: Fuel, label: 'EV & Fuel' },
                  { icon: Utensils, label: 'Highway Cafes' },
                  { icon: Mountain, label: 'Scenic Pullouts' },
                ].map((stop) => {
                  const StopIcon = stop.icon;
                  return (
                    <span
                      key={stop.label}
                      className="relative z-10 glass-clear liquid-rim inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#152A1C] dark:text-slate-100"
                    >
                      <StopIcon className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                      <span className="truncate">{stop.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </LiquidCard>
        </ScrollReveal>

        {/* Bottom 3 Concentric Editorial Bento Pillars (4 cols each) */}
        {secondaryPillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <ScrollReveal key={item.id} delayMs={120 + idx * 55} className="lg:col-span-4 h-full">
              <LiquidCard outerRadius={26} innerPadding={8} className="h-full p-5 sm:p-6 flex flex-col justify-between group">
                <div aria-hidden="true" className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent}`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="glass-clear liquid-rim text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full text-[#2D5A3D] dark:text-emerald-300">
                      {item.badge}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#EAF0E9] dark:bg-emerald-950/60 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center group-hover:bg-[#2D5A3D] group-hover:text-white transition-all duration-300 shadow-2xs">
                      <Icon className="w-5 h-5 stroke-[1.9]" />
                    </div>
                  </div>
                  <h3 className="font-display font-bold text-base sm:text-lg text-[#152A1C] dark:text-white tracking-tight mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#57685D] dark:text-slate-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </LiquidCard>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};
