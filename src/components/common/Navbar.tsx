import React, { useState, useEffect } from 'react';
import { Logo, BrandIconMark } from './Logo';
import { Compass, MapPin, Bookmark, User, Sparkles, Menu, X, ChevronRight, PlaneTakeoff, Globe, Search, Moon, Sun, Crown } from 'lucide-react';
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
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const platform = (navigator as unknown as { userAgentData?: { platform?: string } })?.userAgentData?.platform || navigator.platform || '';
      setIsMac(/mac|iphone|ipad|ipod/i.test(platform));
    }
  }, []);

  // Lock body scroll on touch devices while mobile drawer is open to prevent awkward background jitter
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [mobileMenuOpen]);

  // Accessibility: close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

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
    <header className="sticky top-0 z-40 w-full bg-[#F4F6F2]/90 dark:bg-[#070C16]/90 backdrop-blur-md border-b border-[#E2EBE1] dark:border-slate-800 transition-all pt-safe pl-safe pr-safe">
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
                className="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#E8EFE7] dark:bg-emerald-950/40 border border-[#DCE7DB] dark:border-emerald-800/40 text-[10px] font-bold text-[#2D5A3D] dark:text-emerald-400 shadow-2xs shrink-0"
                title="Intelligent Travel Planning"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D] dark:bg-emerald-400 animate-pulse" />
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
                        ? 'text-[#2D5A3D] dark:text-emerald-400 bg-[#E8EFE7] dark:bg-emerald-950/40 shadow-xs' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#152A1C] dark:hover:text-white hover:bg-[#EAF0E9]/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {Icon && <Icon className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${isActive ? 'text-[#2D5A3D] dark:text-emerald-400' : 'text-slate-400 dark:text-slate-400'}`} />}
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-[9px] xl:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-[#386B49] to-[#2D5A3D] text-white shadow-xs">
                        {link.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-0.5 bg-[#2D5A3D] dark:bg-emerald-400 rounded-full" />
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
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DCE7DB] dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-200 transition-colors hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
            {/* Spotlight Global Search Trigger */}
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-[#152A1C] dark:hover:text-white text-xs font-semibold transition-all border border-[#DCE7DB] dark:border-slate-700 cursor-pointer shadow-2xs hover:border-[#C4D9C3] dark:hover:border-slate-600"
                title={`Search destinations & trips (${isMac ? '⌘K' : 'Ctrl+K'})`}
                aria-label={`Search destinations & trips (${isMac ? '⌘K' : 'Ctrl+K'})`}
              >
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="hidden 2xl:inline">Search...</span>
                <kbd className="hidden 2xl:inline text-[10px] font-mono bg-[#F4F6F2] dark:bg-slate-900 px-1.5 py-0.5 rounded border border-[#DCE7DB] dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-2xs">
                  {isMac ? '⌘K' : 'Ctrl+K'}
                </kbd>
              </button>
            )}

            {/* Currency Selector */}
            <div className="flex items-center gap-1 xl:gap-1.5 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-full px-2 xl:px-2.5 py-1.5 border border-[#DCE7DB] dark:border-slate-700 text-xs transition-all shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-0.5"
                aria-label="Select Currency"
              >
                {Object.keys(CURRENCIES).map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
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
                    : 'bg-[#E8EFE7] dark:bg-emerald-950/40 hover:bg-[#DCE7DB] dark:hover:bg-emerald-900/40 border-[#DCE7DB] dark:border-emerald-800/40 text-[#2D5A3D] dark:text-emerald-400'
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
                className="flex items-center gap-1.5 px-3.5 xl:px-4 py-1.5 xl:py-2 rounded-full bg-[#E8EFE7] dark:bg-emerald-950/40 border border-[#DCE7DB] dark:border-emerald-800/40 hover:bg-[#DCE7DB] dark:hover:bg-emerald-900/40 text-[#2D5A3D] dark:text-emerald-400 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Sign In / Register"
              >
                <User className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400" />
                <span>Sign In</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-[#DCE7DB] dark:border-slate-700 hover:border-[#2D5A3D] dark:hover:border-emerald-500 transition-colors cursor-pointer shadow-2xs"
                title="View Profile"
              >
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-[#2D5A3D]/30"
                />
                <span className="text-xs font-bold text-[#152A1C] dark:text-slate-100 max-w-[90px] truncate">
                  {(userProfile?.name || 'Traveler').split(' ')[0]}
                </span>
              </button>
            )}
          </div>

        </div>

        {/* MOBILE APP HEADER (Screen 1: Left Menu Button, Center Logo, Right Profile Avatar) */}
        <div className="flex lg:hidden items-center justify-between h-14 sm:h-16">
          {/* Left: Mobile App Hamburger Menu Icon (44px min touch target for iOS & Android) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white dark:bg-slate-800 shadow-xs border border-[#E2EBE1] dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 hover:text-[#152A1C] dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all focus:outline-none cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
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
                className="h-10 px-4 min-h-[40px] rounded-full bg-[#E8EFE7] dark:bg-emerald-950/40 border border-[#DCE7DB] dark:border-emerald-800/40 text-[#2D5A3D] dark:text-emerald-400 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                Sign In
              </button>
            ) : (
              <button
                onClick={() => onNavigate('profile')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full ring-2 ring-white dark:ring-slate-700 shadow-xs overflow-hidden cursor-pointer active:scale-95 transition-transform shrink-0 relative"
                title="Profile"
                aria-label="Profile"
              >
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-full h-full object-cover"
                />
                {quota.isPro && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-800 flex items-center justify-center">
                    <Crown className="w-2 h-2 text-amber-900 fill-amber-900" />
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Backdrop overlay - closes drawer on tap outside */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 top-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:top-[calc(4rem+env(safe-area-inset-top,0px))] bg-black/40 dark:bg-black/60 backdrop-blur-xs z-30 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile & Tablet Drawer Menu */}
      {mobileMenuOpen && (
        <div 
          id="mobile-navigation-drawer"
          role="dialog"
          aria-label="Mobile Navigation"
          className="relative z-40 lg:hidden border-t border-[#E2EBE1] dark:border-slate-800 bg-[#F4F6F2] dark:bg-[#0E1726] px-4 pt-3 pb-6 space-y-1 shadow-2xl animate-in slide-in-from-top duration-200 transition-colors max-h-[calc(100vh-4.5rem)] max-h-[calc(100dvh-4.5rem)] overscroll-contain overflow-y-auto"
        >
          {onOpenSearch && (
            <button
              onClick={() => {
                onOpenSearch();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EAF0E9]/70 dark:hover:bg-slate-800/80 transition-colors"
            >
              <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
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
                  quota.isPro ? 'bg-amber-400 text-amber-950' : 'bg-[#E8EFE7] dark:bg-emerald-950/60 text-[#2D5A3D] dark:text-emerald-400'
                }`}>
                  <Crown className="w-5 h-5 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-bold truncate ${quota.isPro ? 'text-white' : 'text-[#152A1C] dark:text-slate-100'}`}>
                      {quota.isPro ? 'TripVerse Pro Member' : 'TripVerse Pro'}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                      quota.isPro ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-[#E8EFE7] dark:bg-emerald-950/60 text-[#2D5A3D] dark:text-emerald-400'
                    }`}>
                      {quota.isPro ? 'ACTIVE' : 'UPGRADE'}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${quota.isPro ? 'text-emerald-200' : 'text-[#5A7362] dark:text-slate-400'}`}>
                    {quota.isPro ? 'Unlimited Trips & 30h/week AI Active' : 'Unlock Unlimited Trips & AI Brain'}
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${quota.isPro ? 'text-amber-300' : 'text-slate-400 dark:text-slate-500'}`} />
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
                  isActive 
                    ? 'bg-[#E8EFE7] dark:bg-emerald-950/60 text-[#2D5A3D] dark:text-emerald-300' 
                    : 'text-slate-700 dark:text-slate-200 hover:bg-[#EAF0E9]/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {Icon && <Icon className={`w-5 h-5 ${isActive ? 'text-[#2D5A3D] dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />}
                  <span>{link.label}</span>
                </div>
                {link.badge ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2D5A3D] dark:bg-emerald-600 text-white">
                    {link.badge}
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                )}
              </button>
            );
          })}

          {/* Mobile Install App banner for browser users */}
          {!isStandaloneApp && (
            <div className="p-3 my-2 rounded-2xl bg-[#EAF0E9] dark:bg-slate-800/90 border border-[#8EA78D]/30 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 p-1.5 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200/90 dark:border-slate-700">
                  <BrandIconMark className="w-full h-full" idPrefix="nav-banner" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">TripVerse App</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Free, offline & fast</p>
                </div>
              </div>
              <button
                onClick={handleOpenInstall}
                className="px-3 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Install
              </button>
            </div>
          )}

          {/* Mobile Currency selector */}
          <div className="pt-2 pb-2 px-3 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
              <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>Currency:</span>
            </div>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
              aria-label="Select Mobile Currency"
            >
              {Object.keys(CURRENCIES).map((c) => (
                <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {CURRENCIES[c as CurrencyCode].symbol} {c} ({CURRENCIES[c as CurrencyCode].name})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-[#EAF0E9]/70 dark:hover:bg-slate-800/60 cursor-pointer"
            aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
          >
            <span className="flex items-center gap-3">
              {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-400 dark:text-slate-500" />}
              <span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{isDarkMode ? 'On' : 'Off'}</span>
          </button>

          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800">
            <button
              onClick={() => {
                onOpenPlanner();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-trip-gradient text-white font-bold text-sm shadow-md active:scale-98 transition-transform cursor-pointer"
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
