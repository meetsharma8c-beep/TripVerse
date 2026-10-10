import React from 'react';
import { Home, Briefcase, Bookmark, User, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

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
  const handleTabClick = (tab: string) => {
    triggerHaptic('light');
    onNavigate(tab);
  };

  const handlePlannerClick = () => {
    triggerHaptic('medium');
    onOpenPlanner();
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#E2EBE1] px-2 py-1 shadow-[0_-4px_24px_rgba(45,90,61,0.06)] pb-safe transition-all duration-200">
      <div className="max-w-md mx-auto flex items-center justify-around">
        
        {/* Home */}
        <button
          onClick={() => handleTabClick('home')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentTab === 'home' ? 'text-[#2D5A3D]' : 'text-slate-500 hover:text-[#152A1C]'
          }`}
          aria-label="Home"
        >
          <Home className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'home' ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 transition-all duration-200 ${currentTab === 'home' ? 'font-bold' : 'font-medium'}`}>
            Home
          </span>
          {currentTab === 'home' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] mt-0.5 animate-scale-in" />
          )}
        </button>

        {/* Itinerary */}
        <button
          onClick={() => handleTabClick('trip-detail')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentTab === 'trip-detail' ? 'text-[#2D5A3D]' : 'text-slate-500 hover:text-[#152A1C]'
          }`}
          aria-label="Itinerary"
        >
          <Briefcase className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'trip-detail' ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 transition-all duration-200 ${currentTab === 'trip-detail' ? 'font-bold' : 'font-medium'}`}>
            Itinerary
          </span>
          {currentTab === 'trip-detail' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] mt-0.5 animate-scale-in" />
          )}
        </button>

        {/* AI Planner Center Button */}
        <button
          onClick={handlePlannerClick}
          className="relative -top-3.5 flex flex-col items-center justify-center active:scale-90 transition-transform duration-150 cursor-pointer group"
          aria-label="Open AI Trip Planner"
        >
          <div className="w-12 h-12 rounded-full btn-liquid-primary flex items-center justify-center shadow-lg shadow-[#2D5A3D]/30 border-2 border-white transform group-hover:scale-105 transition-all">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <span className="text-[10px] font-bold text-[#152A1C] mt-1 tracking-tight">
            AI Plan
          </span>
        </button>

        {/* Bookings / Trips */}
        <button
          onClick={() => handleTabClick('trips')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentTab === 'trips' ? 'text-[#2D5A3D]' : 'text-slate-500 hover:text-[#152A1C]'
          }`}
          aria-label="Bookings"
        >
          <Bookmark className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'trips' ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'}`} />
          <span className={`text-[11px] mt-0.5 transition-all duration-200 ${currentTab === 'trips' ? 'font-bold' : 'font-medium'}`}>
            Bookings
          </span>
          {currentTab === 'trips' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] mt-0.5 animate-scale-in" />
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => handleTabClick('profile')}
          className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer ${
            currentTab === 'profile' ? 'text-[#2D5A3D]' : 'text-slate-500 hover:text-[#152A1C]'
          }`}
          aria-label="Profile"
        >
          <div className="relative">
            <User className={`w-5 h-5 transition-transform duration-200 ${currentTab === 'profile' ? 'stroke-[2.5] scale-110' : 'stroke-[1.8]'}`} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#2D5A3D] rounded-full ring-2 ring-white animate-pulse" />
            )}
          </div>
          <span className={`text-[11px] mt-0.5 transition-all duration-200 ${currentTab === 'profile' ? 'font-bold' : 'font-medium'}`}>
            Profile
          </span>
          {currentTab === 'profile' && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] mt-0.5 animate-scale-in" />
          )}
        </button>

      </div>
    </div>
  );
};
