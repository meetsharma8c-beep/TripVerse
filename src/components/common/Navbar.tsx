import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { 
  Compass, 
  MapPin, 
  Bookmark, 
  User, 
  Sparkles, 
  Menu, 
  X, 
  ChevronRight,
  PlaneTakeoff,
  Globe,
  Bell,
  Smartphone,
  Download,
  Search
} from 'lucide-react';
import { UserProfile, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, setActiveCurrency, CURRENCIES } from '../../services/currencyService';
import { isStandalone } from '../../services/deviceService';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenPlanner: () => void;
  userProfile: UserProfile;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  onOpenAuthModal?: () => void;
  isAuthenticated?: boolean;
  onOpenSearch?: () => void;
  onOpenChat?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenPlanner,
  userProfile,
  onOpenNotifications,
  unreadNotificationCount = 0,
  onOpenAuthModal,
  isAuthenticated = true,
  onOpenSearch,
  onOpenChat
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());
  const [isStandaloneApp, setIsStandaloneApp] = useState(true);

  useEffect(() => {
    setIsStandaloneApp(isStandalone());
  }, []);

  const handleOpenInstall = () => {
    window.dispatchEvent(new CustomEvent('tripverse-open-install'));
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleCurrencyEvent = (e: Event) => {
      const customEvent = e as CustomEvent<CurrencyCode>;
      if (customEvent.detail) {
        setCurrency(customEvent.detail);
      }
    };
    window.addEventListener('tripverse_currency_change', handleCurrencyEvent);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrencyEvent);
  }, []);

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
    setActiveCurrency(newCurrency);
  };

  const desktopNavLinks = [
    { id: 'home', label: 'Home', icon: null },
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'trips', label: 'My Trips', icon: MapPin },
    { id: 'planner', label: 'Planner', icon: Sparkles, badge: 'AI' },
    { id: 'saved', label: 'Saved', icon: Bookmark },
  ];

  const mobileNavLinks = [
    ...desktopNavLinks,
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleLinkClick = (id: string) => {
    if (id === 'planner') {
      onOpenPlanner();
    } else {
      onNavigate(id);
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all pt-safe">
      {/* Top Public Announcement Bar */}
      <div className="bg-gradient-to-r from-[#0B2545] via-[#00B074] to-[#0B2545] text-white py-1.5 px-3 sm:px-4 text-center text-xs font-semibold flex items-center justify-between sm:justify-center gap-2 overflow-hidden shadow-inner">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest shrink-0">
            <Sparkles className="w-3 h-3 text-emerald-300 animate-pulse shrink-0" />
            <span>Public Release 2.0</span>
          </span>
          <span className="hidden md:inline truncate">
            Autonomous road trip intelligence: live satellite radar, 500+ verified NHAI rest stops & 0% commission bookings.
          </span>
          <span className="md:hidden truncate">
            Autonomous Travel & Highway Intelligence
          </span>
        </div>
        <button 
          type="button"
          onClick={onOpenPlanner}
          className="underline font-bold text-emerald-200 hover:text-white transition-colors cursor-pointer shrink-0 ml-1 text-[11px] sm:text-xs"
        >
          Plan Free AI Trip ↗
        </button>
      </div>

      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-18 gap-3">
          
          {/* Left: Brand Logo & Navigation Links */}
          <div className="flex items-center gap-2.5 xl:gap-4 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <Logo 
                size="md" 
                taglineClassName="hidden 2xl:block"
                onClick={() => onNavigate('home')} 
              />
              <div 
                className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100/90 border border-slate-200/80 text-[10px] font-bold text-slate-700 shadow-2xs shrink-0"
                title="Official CONCODE.WEB Ecosystem Project"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>CONCODE.WEB</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1 shrink-0" aria-label="Main Navigation">
              {desktopNavLinks.map((link) => {
                const isActive = currentTab === link.id;
                const Icon = link.icon;

                return (
                  <button
                    key={link.id}
                    onClick={() => handleLinkClick(link.id)}
                    className={`relative flex items-center gap-1 xl:gap-1.5 px-2 xl:px-2.5 py-1.5 xl:py-2 rounded-xl text-xs xl:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'text-[#00B074] bg-emerald-50/80 shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {Icon && <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${isActive ? 'text-[#00B074]' : 'text-slate-400'}`} />}
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-[9px] xl:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs">
                        {link.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 xl:left-2.5 xl:right-2.5 h-0.5 bg-[#00B074] rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action & Profile: Search, Currency, CTA, Profile */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 shrink-0">
            {/* Spotlight Global Search Trigger */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-all border border-slate-200/80 cursor-pointer shadow-2xs hover:border-slate-300"
                title="Search destinations & trips (⌘K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden xl:inline">Search...</span>
                <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            )}


            {/* Currency Selector */}
            <div className="flex items-center gap-1 xl:gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 rounded-full px-2 xl:px-2.5 py-1.5 border border-slate-200/80 text-xs transition-all shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-0.5"
                aria-label="Select Currency"
              >
                {Object.keys(CURRENCIES).map((c) => (
                  <option key={c} value={c}>
                    {CURRENCIES[c as CurrencyCode].symbol} {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Primary CTA: "Plan My Trip" */}
            <button
              onClick={onOpenPlanner}
              className="btn-liquid-primary flex items-center gap-1.5 xl:gap-2 px-3.5 xl:px-5 py-2 xl:py-2.5 rounded-full text-white font-bold text-xs xl:text-sm shadow-lg shadow-emerald-500/25 group shrink-0"
            >
              <PlaneTakeoff className="w-3.5 h-3.5 xl:w-4 xl:h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span>Plan My Trip</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* User Profile Pill or Sign In Button */}
            {!isAuthenticated ? (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 xl:px-4 py-1.5 xl:py-2 rounded-full bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Sign In / Register"
              >
                <User className="w-3.5 h-3.5 text-[#00B074]" />
                <span>Sign In</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-slate-100 transition-colors cursor-pointer"
                title="View Profile"
              >
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-emerald-500/30"
                />
                <span className="text-xs font-semibold text-slate-700 max-w-[90px] truncate">
                  {userProfile.name.split(' ')[0]}
                </span>
              </button>
            )}
          </div>

          {/* Mobile & Tablet Actions */}
          <div className="flex lg:hidden items-center gap-1.5">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Search (⌘K)"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-slate-600" />
              </button>
            )}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                )}
              </button>
            )}
            <button
              onClick={onOpenPlanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-trip-gradient text-white font-bold text-xs shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Plan</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-1 shadow-xl animate-in slide-in-from-top duration-200">
          {mobileNavLinks.map((link) => {
            const isActive = currentTab === link.id;
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-emerald-50 text-[#00B074]' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon className={`w-5 h-5 ${isActive ? 'text-[#00B074]' : 'text-slate-400'}`} />}
                  <span>{link.label}</span>
                </div>
                {link.badge ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    {link.badge}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                )}
              </button>
            );
          })}

          {/* Mobile Install App banner for browser users */}
          {!isStandaloneApp && (
            <div className="p-3 my-2 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">TripVerse App</p>
                  <p className="text-[10px] text-slate-500">Free, offline & fast</p>
                </div>
              </div>
              <button
                onClick={handleOpenInstall}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Install
              </button>
            </div>
          )}

          {/* Mobile Currency & CONCODE badge */}
          <div className="pt-2 pb-2 px-3 flex items-center justify-between border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <Globe className="w-4 h-4 text-slate-400" />
              <span>Currency:</span>
            </div>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
              className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800"
            >
              {Object.keys(CURRENCIES).map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c as CurrencyCode].symbol} {c} ({CURRENCIES[c as CurrencyCode].name})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => {
                onOpenPlanner();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-trip-gradient text-white font-bold text-sm shadow-md"
            >
              <PlaneTakeoff className="w-4 h-4" />
              <span>Plan My Trip With AI</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
