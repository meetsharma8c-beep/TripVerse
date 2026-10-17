import React, { useState, useEffect } from 'react';
import { Logo, BrandIconMark } from './Logo';
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
  Search,
  Moon,
  Sun,
  Crown
} from 'lucide-react';
import { UserProfile, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, setActiveCurrency, CURRENCIES } from '../../services/currencyService';
import { isStandalone } from '../../services/deviceService';
import { getUserSubscriptionQuota } from '../../services/authService';

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
  onOpenProModal?: () => void;
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
  onOpenChat,
  onOpenProModal
}) => {
  const [quota, setQuota] = useState(() => getUserSubscriptionQuota());

  useEffect(() => {
    const handleQuotaChange = () => {
      setQuota(getUserSubscriptionQuota());
    };
    window.addEventListener('tripverse_quota_updated', handleQuotaChange);
    window.addEventListener('tripverse_auth_state_change', handleQuotaChange);
    return () => {
      window.removeEventListener('tripverse_quota_updated', handleQuotaChange);
      window.removeEventListener('tripverse_auth_state_change', handleQuotaChange);
    };
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());
  const [isStandaloneApp, setIsStandaloneApp] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('tripverse_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setIsStandaloneApp(isStandalone());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
      'content',
      isDarkMode ? '#0B1220' : '#2D5A3D'
    );
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(current => {
      const next = !current;
      try {
        localStorage.setItem('tripverse_theme', next ? 'dark' : 'light');
      } catch (error) {
        console.error('[Theme] Could not save theme preference:', error);
      }
      return next;
    });
  };

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
    <header className="sticky top-0 z-40 w-full bg-[#F4F6F2]/90 backdrop-blur-md border-b border-[#E2EBE1] transition-all pt-safe">
      {/* Top Public Announcement Bar - Desktop only for clean mobile app feel */}
      <div className="hidden lg:flex bg-gradient-to-r from-[#152A1C] via-[#2D5A3D] to-[#152A1C] text-white py-1.5 px-3 sm:px-4 text-center text-xs font-semibold items-center justify-between sm:justify-center gap-2 overflow-hidden shadow-inner">
        <div className="flex items-center gap-2 truncate">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-widest shrink-0">
            <Sparkles className="w-3 h-3 text-[#A8C5AC] animate-pulse shrink-0" />
            <span>AI Travel Planner</span>
          </span>
          <span className="hidden md:inline truncate text-[#E2EBE1]">
            Plan day-by-day itineraries, highway pit stops, and budget-optimized routes.
          </span>
          <span className="md:hidden truncate text-[#E2EBE1]">
            AI-Powered Journeys
          </span>
        </div>
        <button 
          type="button"
          onClick={onOpenPlanner}
          className="underline font-bold text-[#C5D9C8] hover:text-white transition-colors cursor-pointer shrink-0 ml-1 text-[11px] sm:text-xs"
        >
          Plan Free Trip ↗
        </button>
      </div>

      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-6 xl:px-8">
        {/* DESKTOP HEADER (Preserved 100% for lg+) */}
        <div className="hidden lg:flex items-center justify-between h-18 gap-2 sm:gap-3">
          
          {/* Left: Brand Logo & Navigation Links */}
          <div className="flex flex-1 lg:flex-none items-center gap-2.5 xl:gap-4 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Logo 
                size="adaptive" 
                taglineClassName="hidden 2xl:block"
                onClick={() => onNavigate('home')} 
              />
              <div 
                className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E8EFE7] border border-[#DCE7DB] text-[10px] font-bold text-[#2D5A3D] shadow-2xs shrink-0"
                title="Intelligent Travel Planning"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] animate-pulse" />
                <span>AI Travelverse</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="flex items-center space-x-0.5 xl:space-x-1 shrink-0" aria-label="Main Navigation">
              {desktopNavLinks.map((link) => {
                const isActive = currentTab === link.id;
                const Icon = link.icon;

                return (
                  <button
                    key={link.id}
                    onClick={() => handleLinkClick(link.id)}
                    className={`relative flex items-center gap-1 xl:gap-1.5 px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-xl text-xs xl:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'text-[#2D5A3D] bg-[#E8EFE7] shadow-xs' 
                        : 'text-slate-600 hover:text-[#152A1C] hover:bg-[#EAF0E9]/70'
                    }`}
                  >
                    {Icon && <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${isActive ? 'text-[#2D5A3D]' : 'text-slate-400'}`} />}
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-[9px] xl:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-[#386B49] to-[#2D5A3D] text-white shadow-xs">
                        {link.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-0.5 bg-[#2D5A3D] rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action & Profile: Search, Currency, CTA, Profile */}
          <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DCE7DB] bg-white/80 text-slate-600 transition-colors hover:bg-white"
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {/* Spotlight Global Search Trigger */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-[#152A1C] text-xs font-semibold transition-all border border-[#DCE7DB] cursor-pointer shadow-2xs hover:border-[#C4D9C3]"
                title="Search destinations & trips (⌘K)"
              >
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden xl:inline">Search...</span>
                <kbd className="text-[10px] font-mono bg-[#F4F6F2] px-1.5 py-0.5 rounded border border-[#DCE7DB] text-slate-500 shadow-2xs">
                  ⌘K
                </kbd>
              </button>
            )}

            {/* Currency Selector */}
            <div className="flex items-center gap-1 xl:gap-1.5 bg-white/80 hover:bg-white rounded-full px-2 xl:px-2.5 py-1.5 border border-[#DCE7DB] text-xs transition-all shadow-2xs">
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

            {/* Desktop Subscription / Pro Link */}
            {onOpenProModal && (
              <button
                type="button"
                onClick={onOpenProModal}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs border ${
                  quota.isPro
                    ? 'bg-amber-500/10 border-amber-300/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20'
                    : 'bg-[#E8EFE7] dark:bg-[#1A2E22] hover:bg-[#DCE7DB] border-[#DCE7DB] text-[#2D5A3D] dark:text-emerald-300'
                }`}
                title={quota.isPro ? 'TripVerse Pro Active (30h/week AI Co-Pilot)' : 'Unlock Unlimited Trips with TripVerse Pro'}
              >
                <Crown className={`w-3.5 h-3.5 ${quota.isPro ? 'text-amber-500 fill-amber-500' : 'text-[#2D5A3D] dark:text-emerald-400'}`} />
                <span>{quota.isPro ? 'PRO' : 'Get Pro'}</span>
              </button>
            )}

            {/* Primary CTA: "Plan My Trip" */}
            <button
              onClick={onOpenPlanner}
              className="btn-liquid-primary flex items-center gap-1.5 xl:gap-2 px-4 xl:px-5 py-2 xl:py-2.5 rounded-full text-white font-bold text-xs xl:text-sm group shrink-0"
            >
              <PlaneTakeoff className="w-3.5 h-3.5 xl:w-4 xl:h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span>Plan My Trip</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* User Profile Pill or Sign In Button */}
            {!isAuthenticated ? (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3.5 xl:px-4 py-1.5 xl:py-2 rounded-full bg-[#E8EFE7] border border-[#DCE7DB] hover:bg-[#DCE7DB] text-[#2D5A3D] text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Sign In / Register"
              >
                <User className="w-3.5 h-3.5 text-[#2D5A3D]" />
                <span>Sign In</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-white border border-[#DCE7DB] hover:border-[#2D5A3D] transition-colors cursor-pointer shadow-2xs"
                title="View Profile"
              >
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-[#2D5A3D]/30"
                />
                <span className="text-xs font-bold text-[#152A1C] max-w-[90px] truncate">
                  {(userProfile?.name || 'Traveler').split(' ')[0]}
                </span>
              </button>
            )}
          </div>

        </div>

        {/* MOBILE APP HEADER (Screen 1: Left Menu Button, Center Logo, Right Profile Avatar) */}
        <div className="flex lg:hidden items-center justify-between h-14">
          {/* Left: Mobile App Hamburger Menu Icon */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-xs border border-[#E2EBE1] dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:text-[#152A1C] hover:bg-white active:scale-95 transition-all focus:outline-none cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#152A1C] dark:text-slate-100" /> : <Menu className="w-5 h-5 text-[#152A1C] dark:text-slate-100" />}
          </button>

          {/* Center: Clean TripVerse Brand Logo */}
          <div className="flex items-center justify-center">
            <Logo 
              size="sm" 
              showTagline={false}
              onClick={() => onNavigate('home')} 
            />
          </div>

          {/* Right: Clean Profile Avatar / Auth (Matching Reference Screen 1) */}
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <button
                onClick={onOpenAuthModal}
                className="px-3.5 py-1.5 rounded-full bg-[#E8EFE7] border border-[#DCE7DB] text-[#2D5A3D] text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => onNavigate('profile')}
                className="w-10 h-10 rounded-full ring-2 ring-white dark:ring-slate-700 shadow-xs overflow-hidden cursor-pointer active:scale-95 transition-transform shrink-0 relative"
                title="Profile"
                aria-label="Profile"
              >
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-full h-full object-cover"
                />
                {quota.isPro && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-amber-400 ring-1.5 ring-white flex items-center justify-center">
                    <Crown className="w-2 h-2 text-amber-900 fill-amber-900" />
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E2EBE1] bg-[#F4F6F2] px-4 pt-3 pb-5 space-y-1 shadow-xl animate-in slide-in-from-top duration-200">
          {onOpenSearch && (
            <button
              onClick={() => {
                onOpenSearch();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Search className="w-5 h-5 text-slate-400" />
              <span>Search destinations & trips</span>
            </button>
          )}

          {/* Mobile Subscription & Plan Banner */}
          {onOpenProModal && (
            <div 
              onClick={() => {
                onOpenProModal();
                setMobileMenuOpen(false);
              }}
              className={`p-4 my-2 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
                quota.isPro
                  ? 'bg-gradient-to-r from-[#152A1C] via-[#1E3E2A] to-[#2D5A3D] text-white border-emerald-400/30'
                  : 'bg-white dark:bg-slate-800 border-[#E2EBE1] dark:border-slate-700 text-[#152A1C] dark:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  quota.isPro ? 'bg-amber-400 text-amber-950' : 'bg-[#E8EFE7] text-[#2D5A3D]'
                }`}>
                  <Crown className="w-5 h-5 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold truncate ${quota.isPro ? 'text-white' : 'text-[#152A1C] dark:text-slate-100'}`}>
                      {quota.isPro ? 'TripVerse Pro Member' : 'TripVerse Pro'}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                      quota.isPro ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-[#E8EFE7] text-[#2D5A3D]'
                    }`}>
                      {quota.isPro ? 'ACTIVE' : 'UPGRADE'}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${quota.isPro ? 'text-emerald-200' : 'text-[#5A7362] dark:text-slate-400'}`}>
                    {quota.isPro ? 'Unlimited Trips & 30h/week AI Active' : 'Unlock Unlimited Trips & AI Brain'}
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${quota.isPro ? 'text-amber-300' : 'text-slate-400'}`} />
            </div>
          )}
          {mobileNavLinks.map((link) => {
            const isActive = currentTab === link.id;
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive ? 'bg-[#E8EFE7] text-[#2D5A3D]' : 'text-slate-700 hover:bg-[#EAF0E9]/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon className={`w-5 h-5 ${isActive ? 'text-[#2D5A3D]' : 'text-slate-400'}`} />}
                  <span>{link.label}</span>
                </div>
                {link.badge ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2D5A3D] text-white">
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
            <div className="p-3 my-2 rounded-2xl bg-[#EAF0E9] border border-[#8EA78D]/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200/90">
                  <BrandIconMark className="w-full h-full" idPrefix="nav-banner" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">TripVerse App</p>
                  <p className="text-[10px] text-slate-500">Free, offline & fast</p>
                </div>
              </div>
              <button
                onClick={handleOpenInstall}
                className="px-3 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
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

          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            <span className="flex items-center gap-3">
              {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-400" />}
              <span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
            </span>
            <span className="text-xs text-slate-500">{isDarkMode ? 'On' : 'Off'}</span>
          </button>

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
