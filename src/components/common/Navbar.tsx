import React, { useState, useEffect, useRef } from 'react';
import { Logo, BrandIconMark } from './Logo';
import { Compass, MapPin, Bookmark, User, Sparkles, Menu, X, ChevronRight, ChevronDown, PlaneTakeoff, Globe, Search, Moon, Sun, Crown, LogOut, Bell, Languages } from 'lucide-react';
import { UserProfile, CurrencyCode, LanguageCode } from '../../types/trip';
import { getActiveCurrency, setActiveCurrency, CURRENCIES } from '../../services/currencyService';
import { getActiveLanguage, setActiveLanguage, LANGUAGES, useLanguage } from '../../services/languageService';
import { isStandalone } from '../../services/deviceService';
import { getUserSubscriptionQuota } from '../../services/authService';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenPlanner: () => void;
  userProfile: UserProfile;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
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
  onSignOut,
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());
  const { language, setLanguage, t } = useLanguage();
  const [isStandaloneApp] = useState(() => isStandalone());
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('tripverse_theme') === 'dark';
    } catch {
      return false;
    }
  });

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);
  const [isMac] = useState(() => {
    if (typeof navigator !== 'undefined') {
      const platform = (navigator as unknown as { userAgentData?: { platform?: string } })?.userAgentData?.platform || navigator.platform || '';
      return /mac|iphone|ipad|ipod/i.test(platform);
    }
    return true;
  });

  // Lock background page scroll cleanly on html (keeping sticky header anchored) & handle Escape
  useModalBehavior(mobileMenuOpen, () => setMobileMenuOpen(false));

  // Auto-close mobile drawer if viewport crosses desktop breakpoint so scroll lock never lingers
  useEffect(() => {
    if (!mobileMenuOpen || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const handleViewportChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileMenuOpen(false);
    };
    mq.addEventListener?.('change', handleViewportChange);
    return () => mq.removeEventListener?.('change', handleViewportChange);
  }, [mobileMenuOpen]);

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

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    setLanguage(newLanguage);
  };

  const desktopNavLinks = [
    { id: 'home', label: t('nav.home'), icon: null },
    { id: 'explore', label: t('nav.destinations'), icon: Compass },
    { id: 'trips', label: t('nav.myTrips'), icon: MapPin },
    { id: 'planner', label: t('nav.plan'), icon: Sparkles, badge: 'AI' },
    { id: 'saved', label: t('nav.saved'), icon: Bookmark },
  ];

  const mobileNavLinks = [
    ...desktopNavLinks,
    { id: 'profile', label: t('nav.profile'), icon: User },
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
    <header
      data-frosted-header="true"
      className="sticky top-0 z-[45] w-full transition-colors duration-200"
    >
      <div
        className={`relative z-20 pt-safe pl-safe pr-safe transition-colors ${
          mobileMenuOpen ? 'bg-[#F4F6F2] dark:bg-[#0E1726]' : ''
        }`}
      >
        {/* Smooth top-to-bottom frosted gradient shade: borderless across all screen widths */}
        {!mobileMenuOpen && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 -bottom-5 bg-gradient-to-b from-[#ECF2EB]/96 via-[#F4F6F2]/90 via-66% to-transparent dark:from-[#070C16]/96 dark:via-[#070C16]/86 dark:via-66% dark:to-transparent backdrop-blur-md"
              style={{
                maskImage:
                  'linear-gradient(to bottom, rgba(0, 0, 0, 1) 66%, rgba(0, 0, 0, 0.74) 84%, rgba(0, 0, 0, 0) 100%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, rgba(0, 0, 0, 1) 66%, rgba(0, 0, 0, 0.74) 84%, rgba(0, 0, 0, 0) 100%)',
              }}
            />
            {/* Soft ambient downward shade replacing the hard bottom border */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 -bottom-5 bg-gradient-to-b from-[#152A1C]/[0.025] via-[#152A1C]/[0.06] via-74% to-transparent dark:from-black/15 dark:via-black/38 dark:via-74% dark:to-transparent"
            />
          </>
        )}

        <div className="relative z-10 max-w-[1536px] mx-auto px-3 sm:px-5 lg:px-3 xl:px-5 2xl:px-8">
        {/* DESKTOP HEADER (Responsive across lg 1024px through 2xl 1536px+ without clipping) */}
        <div className="hidden lg:flex items-center justify-between h-16 xl:h-18 gap-1.5 xl:gap-2">
          
          {/* Left: Brand Logo & Navigation Links */}
          <div className="flex items-center gap-1.5 xl:gap-3 2xl:gap-4 min-w-0 shrink-0">
            <div className="flex items-center gap-1.5 xl:gap-2 min-w-0 shrink-0">
              <Logo 
                size="adaptive" 
                variant={isDarkMode ? 'light' : 'auto'}
                showTagline={false}
                taglineClassName="hidden"
                onClick={() => onNavigate('home')} 
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="flex items-center space-x-0 xl:space-x-1 shrink-0" aria-label="Main Navigation">
              {desktopNavLinks.map((link) => {
                const isActive = currentTab === link.id;

                return (
                  <button
                    key={link.id}
                    onClick={() => handleLinkClick(link.id)}
                    className={`relative flex items-center gap-1 px-1.5 xl:px-3 py-1.5 xl:py-2 rounded-xl text-[11.5px] xl:text-[13px] 2xl:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'text-[#2D5A3D] dark:text-emerald-400 bg-[#E8EFE7] dark:bg-emerald-950/40 shadow-xs' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-[#152A1C] dark:hover:text-white hover:bg-[#EAF0E9]/70 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{link.label}</span>
                    {link.badge && (
                      <span className="text-[9px] xl:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-[#386B49] to-[#2D5A3D] text-white shadow-xs">
                        {link.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#2D5A3D] dark:bg-emerald-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Action & Profile: Theme, Notifs, Search, Locale, CTA, User Menu */}
          <div className="flex items-center gap-1 xl:gap-1.5 2xl:gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex h-7.5 w-7.5 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-full border border-[#DCE7DB] dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-200 transition-colors hover:bg-white dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5 xl:h-4 xl:w-4 text-amber-400" /> : <Moon className="h-3.5 w-3.5 xl:h-4 xl:w-4" />}
            </button>

            {/* Notifications Trigger */}
            {onOpenNotifications && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative flex h-7.5 w-7.5 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-full border border-[#DCE7DB] dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-200 transition-colors hover:bg-white dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
                aria-label={`View notifications${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} unread)` : ''}`}
                title={`View notifications${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} unread)` : ''}`}
              >
                <Bell className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

            {/* Global Search Trigger (Clean circular icon button matching Theme & Notifications) */}
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="flex h-7.5 w-7.5 xl:h-8 xl:w-8 shrink-0 items-center justify-center rounded-full border border-[#DCE7DB] dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-200 transition-colors hover:bg-white dark:hover:bg-slate-700 cursor-pointer shadow-2xs"
                title={`Search destinations & trips (${isMac ? '⌘K' : 'Ctrl+K'})`}
                aria-label={`Search destinations & trips (${isMac ? '⌘K' : 'Ctrl+K'})`}
              >
                <Search className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
              </button>
            )}

            {/* Compact Language Selector Pill */}
            <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-full h-7.5 xl:h-8 px-1.5 xl:px-2 border border-[#DCE7DB] dark:border-slate-700 text-xs transition-all shadow-2xs shrink-0" title="Change Language">
              <Languages className="hidden xl:block w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-0.5"
                aria-label="Select Language"
              >
                {Object.values(LANGUAGES).map((l) => (
                  <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {l.flag} {l.code.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Compact Currency Selector Pill */}
            <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 rounded-full h-7.5 xl:h-8 px-1.5 xl:px-2 border border-[#DCE7DB] dark:border-slate-700 text-xs transition-all shadow-2xs shrink-0" title="Change Currency">
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer pr-0.5"
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
                className={`flex items-center gap-1 h-7.5 xl:h-8 px-2 xl:px-2.5 rounded-full text-[11px] xl:text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer shadow-2xs border ${
                  quota.isPro
                    ? 'bg-amber-500/10 border-amber-300/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20'
                    : 'bg-[#E8EFE7] dark:bg-emerald-950/40 hover:bg-[#DCE7DB] dark:hover:bg-emerald-900/40 border-[#DCE7DB] dark:border-emerald-800/40 text-[#2D5A3D] dark:text-emerald-400'
                }`}
                title={quota.isPro ? t('TripVerse Pro Active') : t('Unlock Unlimited Trips with TripVerse Pro')}
              >
                <Crown className={`w-3.5 h-3.5 shrink-0 ${quota.isPro ? 'text-amber-500 fill-amber-500' : 'text-[#2D5A3D] dark:text-emerald-400'}`} />
                <span>{quota.isPro ? 'PRO' : 'Pro'}</span>
              </button>
            )}

            {/* Primary CTA: "Plan Trip" */}
            <button
              onClick={onOpenPlanner}
              className="btn-liquid-primary flex items-center gap-1 xl:gap-1.5 h-7.5 xl:h-8 px-2 xl:px-3.5 rounded-full text-white font-bold text-[11px] xl:text-xs whitespace-nowrap group shrink-0"
            >
              <PlaneTakeoff className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span>{t('Plan Trip')}</span>
            </button>

            {/* User Profile Menu with Integrated Sign Out */}
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1 xl:gap-1.5 h-7.5 xl:h-8 px-2 xl:px-3 rounded-full bg-[#E8EFE7] dark:bg-emerald-950/40 border border-[#DCE7DB] dark:border-emerald-800/40 hover:bg-[#DCE7DB] dark:hover:bg-emerald-900/40 text-[#2D5A3D] dark:text-emerald-400 text-[11px] xl:text-xs font-bold whitespace-nowrap shrink-0 transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Sign In / Register"
              >
                <User className="w-3.5 h-3.5 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                <span>{t('Sign In')}</span>
              </button>
            ) : (
              <div className="relative shrink-0" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-1.5 h-8 pl-1 pr-2 rounded-full bg-white dark:bg-slate-800 border border-[#DCE7DB] dark:border-slate-700 hover:border-[#2D5A3D] dark:hover:border-emerald-500 transition-colors cursor-pointer shadow-2xs shrink-0"
                  title="Account Menu"
                  aria-expanded={isProfileMenuOpen}
                >
                  <img
                    src={userProfile.avatar}
                    alt={userProfile.name}
                    className="w-6 h-6 rounded-full object-cover ring-2 ring-[#2D5A3D]/30 shrink-0"
                  />
                  <span className="hidden xl:inline text-xs font-bold text-[#152A1C] dark:text-slate-100 max-w-[70px] truncate">
                    {(userProfile?.name || 'Traveler').split(' ')[0]}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-[#2D5A3D]' : ''}`} />
                </button>

                {/* Dropdown Popover */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Header */}
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                      <div className="flex items-center gap-2">
                        <img
                          src={userProfile.avatar}
                          alt={userProfile.name}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-[#2D5A3D]/30 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {userProfile.name || 'Traveler'}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {userProfile.email || 'traveler@tripverse.com'}
                          </p>
                        </div>
                      </div>
                      {quota.isPro && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-300/40">
                          <Crown className="w-3 h-3" />
                          <span>{t('TripVerse Pro Member')}</span>
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onNavigate('profile');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EAF0E9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        <span>{t('Profile & Preferences')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onNavigate('trips');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EAF0E9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{t('My Trips')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onNavigate('saved');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EAF0E9] dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Bookmark className="w-4 h-4 text-slate-400" />
                        <span>{t('Saved Spots')}</span>
                      </button>
                    </div>

                    {/* Sign Out Action inside Dropdown */}
                    {onSignOut && (
                      <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            if (confirm(t('Are you sure you want to sign out of your TripVerse account?'))) {
                              onSignOut();
                            }
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-4 h-4 shrink-0" />
                          <span>{t('Sign Out')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              variant={isDarkMode ? 'light' : 'auto'}
              showTagline={false}
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('home');
              }} 
            />
          </div>

          {/* Right: Clean Profile Avatar / Auth (Matching Reference Screen 1) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isAuthenticated ? (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="h-10 px-3.5 min-h-[40px] rounded-full bg-[#E8EFE7] dark:bg-emerald-950/40 border border-[#DCE7DB] dark:border-emerald-800/40 text-[#2D5A3D] dark:text-emerald-400 text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>{t('Sign In')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('profile')}
                  className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full ring-2 ring-white dark:ring-slate-700 shadow-xs overflow-hidden cursor-pointer active:scale-95 transition-transform shrink-0 relative"
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
                {onSignOut && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t('Are you sure you want to sign out of your TripVerse account?'))) {
                        onSignOut();
                      }
                    }}
                    className="h-9 px-2.5 sm:px-3 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95"
                    title={t('Sign Out')}
                    aria-label={t('Sign Out')}
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{t('Sign Out')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Drawer Backdrop overlay - closes drawer on tap outside & blocks touch-panning on iOS */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/45 dark:bg-black/65 backdrop-blur-xs z-10 lg:hidden touch-none animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile & Tablet Drawer Menu (out-of-flow beneath sticky header bar so page never shifts) */}
      {mobileMenuOpen && (
        <div 
          id="mobile-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="lg:hidden absolute top-full inset-x-0 z-30 border-t border-[#E2EBE1] dark:border-slate-800 bg-[#F4F6F2] dark:bg-[#0E1726] px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] space-y-1 shadow-2xl animate-in slide-in-from-top duration-200 transition-colors max-h-[calc(100vh-3.5rem-env(safe-area-inset-top,0px))] max-h-[calc(100dvh-3.5rem-max(0.25rem,env(safe-area-inset-top,0px)))] sm:max-h-[calc(100dvh-4rem-max(0.25rem,env(safe-area-inset-top,0px)))] overscroll-contain overflow-y-auto"
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
              <span>{t('Search destinations & trips')}</span>
            </button>
          )}

          {onOpenNotifications && (
            <button
              onClick={() => {
                onOpenNotifications();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EAF0E9]/70 dark:hover:bg-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                <span>{t('Notifications')}</span>
              </div>
              {unreadNotificationCount > 0 && (
                <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {unreadNotificationCount}
                </span>
              )}
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
                      {quota.isPro ? t('TripVerse Pro Member') : t('TripVerse Pro')}
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                      quota.isPro ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-[#E8EFE7] dark:bg-emerald-950/60 text-[#2D5A3D] dark:text-emerald-400'
                    }`}>
                      {quota.isPro ? t('ACTIVE') : t('UPGRADE')}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${quota.isPro ? 'text-emerald-200' : 'text-[#5A7362] dark:text-slate-400'}`}>
                    {quota.isPro ? t('Unlimited Trips & 30h/week AI Active') : t('Unlock Unlimited Trips & AI Brain')}
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
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{t('TripVerse App')}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('Free, offline & fast')}</p>
                </div>
              </div>
              <button
                onClick={handleOpenInstall}
                className="px-3 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {t('Install')}
              </button>
            </div>
          )}

          {/* Mobile Language selector */}
          <div className="pt-2 pb-2 px-3 flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold shrink-0">
              <Languages className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>{t('Language:')}</span>
            </div>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
              className="min-w-0 max-w-[66%] truncate px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
              aria-label={t('Select Mobile Language')}
            >
              {Object.values(LANGUAGES).map((l) => (
                <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  {l.flag} {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Currency selector */}
          <div className="pt-2 pb-2 px-3 flex items-center justify-between gap-2 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold shrink-0">
              <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>{t('Currency:')}</span>
            </div>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
              className="min-w-0 max-w-[66%] truncate px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
              aria-label={t('Select Mobile Currency')}
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
            aria-label={isDarkMode ? t('Switch to light mode') : t('Switch to dark mode')}
          >
            <span className="flex items-center gap-3">
              {isDarkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-400 dark:text-slate-500" />}
              <span>{isDarkMode ? t('Light mode') : t('Dark mode')}</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{isDarkMode ? t('On') : t('Off')}</span>
          </button>

          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2">
            <button
              onClick={() => {
                onOpenPlanner();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-trip-gradient text-white font-bold text-sm shadow-md active:scale-98 transition-transform cursor-pointer"
            >
              <PlaneTakeoff className="w-4 h-4" />
              <span>{t('Plan My Trip With AI')}</span>
            </button>

            {!isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  onOpenAuthModal?.();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#E8EFE7] dark:bg-emerald-950/60 border border-[#DCE7DB] dark:border-emerald-800/50 text-[#2D5A3D] dark:text-emerald-300 font-bold text-sm transition-colors cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>{t('Sign In / Register')}</span>
              </button>
            ) : (
              onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (confirm(t('Are you sure you want to sign out of your TripVerse account?'))) {
                      onSignOut();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 font-bold text-sm transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('Sign Out')}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}
    </header>
  );
};
