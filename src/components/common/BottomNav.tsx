import React from 'react';
import { Home, Briefcase, Bookmark, User, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';
import { useLanguage } from '../../services/languageService';

interface BottomNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenPlanner: () => void;
  unreadNotificationCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onNavigate,
  onOpenPlanner,
  unreadNotificationCount = 0,
}) => {
  const { t } = useLanguage();

  const handleTabClick = (tab: string) => {
    triggerHaptic('light');
    onNavigate(tab);
  };

  const handlePlannerClick = () => {
    triggerHaptic('medium');
    onOpenPlanner();
  };

  const navSlots = [
    { id: 'home', label: t('bottomNav.home'), icon: Home, hasBadge: false },
    { id: 'trip-detail', label: t('bottomNav.itinerary'), icon: Briefcase, hasBadge: false },
    null, // Center floating action slot ("AI Plan")
    { id: 'trips', label: t('bottomNav.bookings'), icon: Bookmark, hasBadge: false },
    { id: 'profile', label: t('bottomNav.profile'), icon: User, hasBadge: unreadNotificationCount > 0 },
  ] as const;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden tv-hide-short-landscape fixed bottom-0 left-0 right-0 z-40 pointer-events-none select-none px-1 pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]"
    >
      {/* Smooth bottom-to-top gradient fade without nested backdrop-filter (prevents Android Chrome compositor blur bugs) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -top-5 bg-gradient-to-t from-[#F4F6F2]/92 via-[#F4F6F2]/65 via-55% to-transparent dark:from-[#070C16]/92 dark:via-[#070C16]/65 dark:to-transparent"
      />

      <div className="relative z-10 max-w-md mx-auto px-2 pb-1.5">
        <div className="glass-elevated liquid-rim rounded-[28px] px-1.5 py-1 grid grid-cols-5 items-end">
        {navSlots.map((tab) => {
          if (!tab) {
            return (
              <button
                key="ai-plan"
                type="button"
                onClick={handlePlannerClick}
                aria-label={t('hero.aiItinerary')}
                className="pointer-events-auto relative flex flex-col items-center justify-end pt-1 pb-2 cursor-pointer group liquid-press focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244931]/40 rounded-2xl"
              >
                {/* Floating Emerald Orb with specular catchlight (no nested backdrop-filter inside glass-elevated) */}
                <div className="-mt-5 w-11 h-11 rounded-full bg-gradient-to-br from-[#386B49] via-[#2D5A3D] to-[#1E3E2B] border border-white/40 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.52),0_10px_22px_-5px_rgba(45,90,61,0.52)] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <Sparkles
                    className="w-[18px] h-[18px] text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.88)]"
                    strokeWidth={2}
                  />
                </div>
                <span className="mt-1 text-[10.5px] leading-none font-bold text-[#152A1C] dark:text-slate-100 tracking-tight whitespace-nowrap">
                  {t('bottomNav.aiPlan')}
                </span>
              </button>
            );
          }

          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
              className={`pointer-events-auto relative flex flex-col items-center justify-end pt-1.5 pb-2 my-0.5 mx-0.5 cursor-pointer liquid-press focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244931]/40 rounded-2xl ${
                isActive
                  ? 'text-[#1E3E2B] dark:text-emerald-300 bg-white/80 dark:bg-emerald-950/65 border border-white/75 dark:border-emerald-400/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_12px_-3px_rgba(45,90,61,0.16)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="relative h-5 flex items-center justify-center">
                <Icon
                  className={`w-[19px] h-[19px] transition-transform duration-200 ${
                    isActive ? 'stroke-[2.25] scale-105' : 'stroke-[1.7]'
                  }`}
                />
                {tab.hasBadge && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-1 w-2 h-2 bg-[#244931] dark:bg-emerald-400 rounded-full ring-2 ring-[#F8FAFC] dark:ring-[#070C16]"
                  />
                )}
              </div>

              <span
                className={`mt-1 text-[10.5px] leading-none tracking-tight whitespace-nowrap ${
                  isActive ? 'font-bold' : 'font-medium'
                }`}
              >
                {tab.label}
              </span>

              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#244931] dark:bg-emerald-400 animate-scale-in"
                />
              )}
            </button>
          );
        })}
        </div>
      </div>
    </nav>
  );
};
