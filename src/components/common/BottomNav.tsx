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

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#070C16]/95 backdrop-blur-xl border-t border-[#E2EBE1] dark:border-slate-800/90 px-2 py-1 shadow-[0_-4px_24px_rgba(45,90,61,0.06)] dark:shadow-[0_-4px_28px_rgba(0,0,0,0.45)] pb-safe transition-colors duration-200"
    >
      <div className="max-w-md mx-auto flex items-center justify-around">
        
        {/* Home */}
        <button
          type="button"
          onClick={() => handleTabClick('home')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentTab === 'home'
              ? 'text-[#2D5A3D] dark:text-[#68B684]'
              : 'text-slate-500 dark:text-slate-400 hover:text-[#152A1C] dark:hover:text-slate-200'
          }`}
          aria-label={t('bottomNav.home')}
          aria-current={currentTab === 'home' ? 'page' : undefined}
        >
          <Home className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'home' ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 transition-all duration-200 ${currentTab === 'home' ? 'font-bold' : 'font-medium'}`}>
            {t('bottomNav.home')}
          </span>
          {currentTab === 'home' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] dark:bg-[#68B684] mt-0.5 animate-scale-in" />
          )}
        </button>

        {/* Itinerary */}
        <button
          type="button"
          onClick={() => handleTabClick('trip-detail')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentTab === 'trip-detail'
              ? 'text-[#2D5A3D] dark:text-[#68B684]'
              : 'text-slate-500 dark:text-slate-400 hover:text-[#152A1C] dark:hover:text-slate-200'
          }`}
          aria-label={t('bottomNav.itinerary')}
          aria-current={currentTab === 'trip-detail' ? 'page' : undefined}
        >
          <Briefcase className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'trip-detail' ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 transition-all duration-200 ${currentTab === 'trip-detail' ? 'font-bold' : 'font-medium'}`}>
            {t('bottomNav.itinerary')}
          </span>
          {currentTab === 'trip-detail' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] dark:bg-[#68B684] mt-0.5 animate-scale-in" />
          )}
        </button>

        {/* AI Planner Center Button */}
        <button
          type="button"
          onClick={handlePlannerClick}
          className="relative -top-3.5 flex flex-col items-center justify-center active:scale-90 transition-transform duration-150 cursor-pointer group px-1"
          aria-label={t('hero.aiItinerary')}
        >
          <div className="w-12 h-12 rounded-full btn-liquid-primary flex items-center justify-center shadow-lg shadow-[#2D5A3D]/30 border-2 border-white dark:border-[#070C16] transform group-hover:scale-105 transition-all">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-[10px] font-bold text-[#152A1C] dark:text-slate-200 mt-1 tracking-tight">
            {t('bottomNav.aiPlan')}
          </span>
        </button>

        {/* Bookings / Trips */}
        <button
          type="button"
          onClick={() => handleTabClick('trips')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentTab === 'trips'
              ? 'text-[#2D5A3D] dark:text-[#68B684]'
              : 'text-slate-500 dark:text-slate-400 hover:text-[#152A1C] dark:hover:text-slate-200'
          }`}
          aria-label={t('bottomNav.bookings')}
          aria-current={currentTab === 'trips' ? 'page' : undefined}
        >
          <Bookmark className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'trips' ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 transition-all duration-200 ${currentTab === 'trips' ? 'font-bold' : 'font-medium'}`}>
            {t('bottomNav.bookings')}
          </span>
          {currentTab === 'trips' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] dark:bg-[#68B684] mt-0.5 animate-scale-in" />
          )}
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => handleTabClick('profile')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentTab === 'profile'
              ? 'text-[#2D5A3D] dark:text-[#68B684]'
              : 'text-slate-500 dark:text-slate-400 hover:text-[#152A1C] dark:hover:text-slate-200'
          }`}
          aria-label={t('bottomNav.profile')}
          aria-current={currentTab === 'profile' ? 'page' : undefined}
        >
          <div className="relative">
            <User className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'profile' ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'}`} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#2D5A3D] dark:bg-[#68B684] rounded-full ring-2 ring-white dark:ring-[#070C16] animate-pulse" />
            )}
          </div>
          <span className={`text-[11px] mt-0.5 transition-all duration-200 ${currentTab === 'profile' ? 'font-bold' : 'font-medium'}`}>
            {t('bottomNav.profile')}
          </span>
          {currentTab === 'profile' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] dark:bg-[#68B684] mt-0.5 animate-scale-in" />
          )}
        </button>

      </div>
    </nav>
  );
};
