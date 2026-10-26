import React from 'react';
import { ArrowRight, Map, Navigation } from 'lucide-react';
import { ScrollReveal } from '../common/ScrollReveal';

interface HighwayBreakstopsShowcaseProps {
  onPlanCorridor?: (destination: string) => void;
}

export const HighwayBreakstopsShowcase: React.FC<HighwayBreakstopsShowcaseProps> = ({
  onPlanCorridor
}) => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
    <ScrollReveal direction="scale" className="max-w-3xl mx-auto rounded-3xl border border-[#DCE7DB] bg-white p-6 sm:p-10 text-center shadow-[0_8px_30px_rgba(45,90,61,0.06)] hover:shadow-[0_16px_40px_rgba(45,90,61,0.1)] transition-shadow duration-300 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-emerald-50/70 blur-2xl pointer-events-none" />
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] shadow-xs">
        <Map className="h-6 w-6" />
      </div>
      <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">
        <Navigation className="h-4 w-4" />
        Route-specific travel data
      </div>
      <h2 className="mt-2 text-2xl sm:text-4xl font-display font-black text-[#152A1C]">
        Plan the journey, then check the places
      </h2>
      <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#57685D]">
        For driving trips, TripVerse can request Geoapify road routes and nearby places based on OpenStreetMap data after you create a plan. Listings do not verify facilities, opening hours, safety, or availability. Activity schedules and budgets remain suggestions.
      </p>
      <button
        type="button"
        onClick={() => onPlanCorridor?.('Udaipur')}
        className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#2D5A3D] px-6 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#244931] hover:shadow-md active:scale-95 group cursor-pointer"
      >
        Plan a journey to Udaipur
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
    </ScrollReveal>
  </section>
);
