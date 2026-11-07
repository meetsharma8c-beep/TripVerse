import React from 'react';
import { CloudRain, Coffee, ShieldCheck, Navigation, Percent } from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';
import { useLanguage } from '../../services/languageService';

export const FeaturePillars: React.FC = () => {
  const { t } = useLanguage();

  const pillars = [
    {
      id: 'weather',
      icon: CloudRain,
      badge: t('pillar.weather.badge'),
      title: t('pillar.weather.title'),
      desc: t('pillar.weather.desc')
    },
    {
      id: 'break-stops',
      icon: Coffee,
      badge: t('pillar.stops.badge'),
      title: t('pillar.stops.title'),
      desc: t('pillar.stops.desc')
    },
    {
      id: 'pricing',
      icon: Percent,
      badge: t('pillar.budget.badge'),
      title: t('pillar.budget.title'),
      desc: t('pillar.budget.desc')
    },
    {
      id: 'navigation',
      icon: Navigation,
      badge: t('pillar.nav.badge'),
      title: t('pillar.nav.title'),
      desc: t('pillar.nav.desc')
    },
    {
      id: 'safety',
      icon: ShieldCheck,
      badge: t('pillar.safety.badge'),
      title: t('pillar.safety.title'),
      desc: t('pillar.safety.desc')
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <ScrollReveal
              key={item.id}
              delayMs={idx * 55}
              className="flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl bg-white border border-[#E2EBE1] shadow-xs hover:shadow-lg hover:border-[#2D5A3D]/60 card-elevate group relative"
            >
              <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAF0E9] text-[#2D5A3D] border border-[#DCE7DB] mb-2.5">
                {item.badge}
              </span>
              <div className="w-12 h-12 rounded-xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#2D5A3D] group-hover:text-white transition-all duration-300 shadow-xs">
                <Icon className="w-6 h-6 stroke-[1.8]" />
              </div>
              <h3 className="font-bold text-[#152A1C] text-sm sm:text-base leading-tight mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-[#57685D] leading-snug">
                {item.desc}
              </p>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};
