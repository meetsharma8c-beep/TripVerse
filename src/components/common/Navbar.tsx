import React, { useState, useEffect, useRef } from 'react';
import { Logo, BrandIconMark } from './Logo';
import { Compass, MapPin, Bookmark, User, Sparkles, Menu, X, ChevronRight, ChevronDown, PlaneTakeoff, Globe, Search, Moon, Sun, Crown, LogOut, Bell, Languages, Home, Smartphone, Stamp, ShieldAlert } from 'lucide-react';
import { UserProfile, CurrencyCode, LanguageCode } from '../../types/trip';
import { getActiveCurrency, setActiveCurrency, CURRENCIES } from '../../services/currencyService';
import { getActiveLanguage, setActiveLanguage, LANGUAGES, useLanguage } from '../../services/languageService';
import { isStandalone } from '../../services/deviceService';
import { getCurrentUser, getUserSubscriptionQuota } from '../../services/authService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { LiquidNavbar, LiquidTabs } from '../ui/liquid';

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
  onOpenFounderDashboard?: () => void;
  onOpenPassport?: () => void;
  onOpenEmergencySos?: () => void;
  onOpenWrapped?: () => void;
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
  onOpenProModal,
  onOpenFounderDashboard,
  onOpenPassport,
  onOpenEmergencySos,
  onOpenWrapped
}) => {
  const resolveNavbarQuota = () => {
    const activeAuth = getCurrentUser();
    const resolvedEmail = userProfile?.email || activeAuth?.email || '';
    const resolvedName = userProfile?.name || activeAuth?.displayName || '';
    return getUserSubscriptionQuota(
      resolvedEmail ? ({ email: resolvedEmail, displayName: resolvedName } as any) : activeAuth
    );
  };

  const [quota, setQuota] = useState(resolveNavbarQuota);

  useEffect(() => {
    const updateQuota = () => {
      setQuota(resolveNavbarQuota());
    };
    updateQuota();
    window.addEventListener('tripverse_quota_updated', updateQuota);
    window.addEventListener('tripverse_auth_state_change', updateQuota);
    return () => {
      window.removeEventListener('tripverse_quota_updated', updateQuota);
      window.removeEventListener('tripverse_auth_state_change', updateQuota);
    };
  }, [userProfile?.email, userProfile?.name]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());
  const { language, setLanguage, t } = useLanguage();
  const [isStandaloneApp] = useState(() => isStandalone());
  const [themeMode, setThemeMode] = useState<'system' | 'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('tripverse_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return 'system';
    } catch {
      return 'system';
    }
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return true;
    }
    try {
      const saved = localStorage.getItem('tripverse_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
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

  // Synchronize Dark Mode, status bar theme-color, and dispatch custom event for maps and 3D scenes
  useEffect(() => {
    const applyThemeState = (dark: boolean) => {
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute(
        'content',
        dark ? '#070C16' : '#2D5A3D'
      );
      window.dispatchEvent(new CustomEvent('tripverse-theme-change', { detail: { isDark: dark } }));
    };

    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
        applyThemeState(e.matches);
      };
      setIsDarkMode(mediaQuery.matches);
      applyThemeState(mediaQuery.matches);
      mediaQuery.addEventListener?.('change', handleSystemChange);
      return () => mediaQuery.removeEventListener?.('change', handleSystemChange);
    } else {
      const isDark = themeMode === 'dark';
      setIsDarkMode(isDark);
      applyThemeState(isDark);
    }
  }, [themeMode]);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    const nextTheme: 'dark' | 'light' = nextDark ? 'dark' : 'light';
    
    const commitTheme = () => {
      setThemeMode(nextTheme);
      setIsDarkMode(nextDark);
      try {
        localStorage.setItem('tripverse_theme', nextTheme);
      } catch (error) {
        console.error('[Theme] Could not save theme preference:', error);
      }
    };

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        commitTheme();
      });
    } else {
      commitTheme();
    }
  };

  const handleSelectThemeMode = (mode: 'system' | 'light' | 'dark') => {
    const commitTheme = () => {
      setThemeMode(mode);
      try {
        localStorage.setItem('tripverse_theme', mode);
      } catch (error) {
        console.error('[Theme] Could not save theme preference:', error);
      }
    };

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        commitTheme();
      });
    } else {
      commitTheme();
    }
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
    ...desktopNavLinks.map((link) =>
      link.id === 'home' ? { ...link, icon: Home } : link
    ),
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

        <div className="relative z-10 max-w-[1536px] mx-auto px-3 sm:px-5 lg:px-3 xl:px-5 2xl:px-8 lg:pt-2.5">
        {/* DESKTOP HEADER (Floating Detached Auto-Condensing Liquid Glass Pill Bar) */}
        <LiquidNavbar className="hidden lg:flex items-center justify-between gap-1.5 xl:gap-2">
          
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

            {/* Desktop Navigation Links (Morphing Sliding Liquid Glass Pill Indicator) */}
            <LiquidTabs
              items={desktopNavLinks.map((link) => ({
                id: link.id,
                label: link.label,
                badge: link.badge || undefined,
              }))}
              activeId={currentTab}
              onSelect={handleLinkClick}
              ariaLabel="Main Navigation"
              className="shrink-0"
            />
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
                  quota.isFounder
                    ? 'bg-amber-400 text-amber-950 font-black border-amber-300 shadow-xs hover:bg-amber-300'
                    : quota.isPro
                    ? 'bg-amber-500/10 border-amber-300/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20'
                    : 'bg-[#E8EFE7] dark:bg-emerald-950/40 hover:bg-[#DCE7DB] dark:hover:bg-emerald-900/40 border-[#DCE7DB] dark:border-emerald-800/40 text-[#2D5A3D] dark:text-emerald-400'
                }`}
                title={quota.isFounder ? 'VIP Founder Pro Active (Lifetime Unlimited Access)' : quota.isPro ? t('TripVerse Pro Active') : t('Unlock Unlimited Trips with TripVerse Pro')}
              >
                <Crown className={`w-3.5 h-3.5 shrink-0 ${quota.isFounder ? 'text-amber-950 fill-amber-950' : quota.isPro ? 'text-amber-500 fill-amber-500' : 'text-[#2D5A3D] dark:text-emerald-400'}`} />
                <span>{quota.isFounder ? 'VIP FOUNDER' : quota.isPro ? 'PRO' : 'Pro'}</span>
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
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl glass-elevated liquid-rim p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
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
                        <div className={`mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          quota.isFounder
                            ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-xs'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300/40'
                        }`}>
                          <Crown className={`w-3 h-3 ${quota.isFounder ? 'fill-amber-950 text-amber-950' : ''}`} />
                          <span>{quota.isFounder ? '👑 VIP Founder Pro' : t('TripVerse Pro Member')}</span>
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="space-y-0.5">
                      {quota.isFounder && onOpenFounderDashboard && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenFounderDashboard();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 mb-1 rounded-xl text-xs font-bold text-amber-950 dark:text-amber-200 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 transition-all cursor-pointer shadow-xs"
                        >
                          <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500 shrink-0" />
                          <span>{t('Founder Command Center')}</span>
                        </button>
                      )}

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

                      {onOpenPassport && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenPassport();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                        >
                          <Stamp className="w-4 h-4 text-amber-500" />
                          <span>{t('Digital Travel Passport')}</span>
                        </button>
                      )}

                      {onOpenEmergencySos && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenEmergencySos();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <ShieldAlert className="w-4 h-4 text-rose-500" />
                          <span>{t('Global Emergency SOS')}</span>
                        </button>
                      )}

                      {onOpenWrapped && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            onOpenWrapped();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-600 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                          <span>{t('2026 Travel Wrapped')}</span>
                        </button>
                      )}

                      <a
                        href="/downloads/TripVerse-v1.0.apk"
                        download="TripVerse-v1.0.apk"
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                      >
                        <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>{t('Get Android App (APK)')}</span>
                      </a>
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

        </LiquidNavbar>

        {/* MOBILE APP HEADER (Screen 1: Left Menu Button, Center Logo, Right Profile Avatar) */}
        <div className="flex lg:hidden items-center justify-between h-14 sm:h-16">
          {/* Left: Mobile App Hamburger Menu Icon (44px min touch target for iOS & Android) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full glass-clear liquid-rim liquid-press flex items-center justify-center text-slate-800 dark:text-slate-100 hover:text-[#152A1C] dark:hover:text-white focus:outline-none cursor-pointer"
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
                {quota.isFounder && onOpenFounderDashboard && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenFounderDashboard();
                    }}
                    className="h-10 px-2.5 min-h-[40px] rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-amber-950 font-black text-[11px] shadow-xs ring-2 ring-amber-400/40 flex items-center gap-1 cursor-pointer active:scale-95 transition-transform shrink-0"
                    title="Founder Command Center"
                    aria-label="Founder Command Center"
                  >
                    <Crown className="w-3.5 h-3.5 fill-amber-950 shrink-0" />
                    <span className="hidden sm:inline">Command</span>
                  </button>
                )}
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
          className="lg:hidden absolute top-full inset-x-0 z-30 border-t border-[#E2EBE1]/90 dark:border-slate-800 bg-[#F4F6F2] dark:bg-[#0B1220] rounded-b-[28px] px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-2.5 shadow-[0_24px_48px_-12px_rgba(21,42,28,0.22)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65)] animate-in slide-in-from-top duration-200 transition-colors max-h-[calc(100vh-3.5rem-env(safe-area-inset-top,0px))] max-h-[calc(100dvh-3.5rem-max(0.25rem,env(safe-area-inset-top,0px)))] sm:max-h-[calc(100dvh-4rem-max(0.25rem,env(safe-area-inset-top,0px)))] overscroll-contain overflow-y-auto scrollbar-none"
        >
          {/* Compact Quick-Action Utility Pills */}
          {(onOpenSearch || onOpenNotifications) && (
            <div className={`grid gap-2 ${onOpenSearch && onOpenNotifications ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {onOpenSearch && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenSearch();
                    setMobileMenuOpen(false);
                  }}
                  aria-label={t('Search destinations & trips')}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-800/85 border border-[#E2EBE1] dark:border-slate-700/70 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#2D5A3D]/40 dark:hover:border-emerald-500/40 active:scale-[0.98] transition-all shadow-[0_1px_2px_rgba(21,42,28,0.03)] cursor-pointer min-w-0"
                >
                  <span className="w-7 h-7 rounded-xl bg-[#F4F6F2] dark:bg-slate-900/80 flex items-center justify-center text-[#2D5A3D] dark:text-emerald-400 shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <span className="truncate">{t('Search')}</span>
                </button>
              )}

              {onOpenNotifications && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenNotifications();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-white dark:bg-slate-800/85 border border-[#E2EBE1] dark:border-slate-700/70 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#2D5A3D]/40 dark:hover:border-emerald-500/40 active:scale-[0.98] transition-all shadow-[0_1px_2px_rgba(21,42,28,0.03)] cursor-pointer min-w-0"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-[#F4F6F2] dark:bg-slate-900/80 flex items-center justify-center text-[#2D5A3D] dark:text-emerald-400 shrink-0">
                      <Bell className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">{t('Notifications')}</span>
                  </span>
                  {unreadNotificationCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Mobile Subscription & Plan Banner */}
          {onOpenProModal && (
            <button
              type="button"
              onClick={() => {
                onOpenProModal();
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer shadow-[0_1px_3px_rgba(21,42,28,0.04)] active:scale-[0.99] flex items-center justify-between gap-3 ${
                quota.isPro
                  ? 'bg-gradient-to-r from-[#152A1C] via-[#1E3E2A] to-[#2D5A3D] text-white border-emerald-400/30'
                  : 'bg-gradient-to-r from-white via-white to-[#EDF4ED] dark:from-slate-800/90 dark:via-slate-800/90 dark:to-emerald-950/35 border-[#DCE7DB] dark:border-emerald-800/40 text-[#152A1C] dark:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  quota.isPro ? 'bg-amber-400 text-amber-950' : 'bg-[#E8EFE7] dark:bg-emerald-950/60 text-[#2D5A3D] dark:text-emerald-400'
                }`}>
                  <Crown className="w-4.5 h-4.5 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-bold truncate ${quota.isPro ? 'text-white' : 'text-[#152A1C] dark:text-slate-100'}`}>
                      {quota.isFounder ? 'TripVerse Founder VIP' : quota.isPro ? t('TripVerse Pro Member') : t('TripVerse Pro')}
                    </p>
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide shrink-0 ${
                      quota.isFounder ? 'bg-amber-400 text-amber-950 font-black' : quota.isPro ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-[#E8EFE7] dark:bg-emerald-950/60 text-[#2D5A3D] dark:text-emerald-400'
                    }`}>
                      {quota.isFounder ? 'VIP FOUNDER' : quota.isPro ? t('ACTIVE') : t('UPGRADE')}
                    </span>
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${quota.isPro ? 'text-emerald-200' : 'text-[#5A7362] dark:text-slate-400'}`}>
                    {quota.isFounder ? 'Lifetime Unlimited Trips & ConCode AI Brain Active' : quota.isPro ? t('Unlimited Trips & 30h/week AI Active') : t('Unlock Unlimited Trips & AI Brain')}
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 ${quota.isPro ? 'text-amber-300' : 'text-slate-400 dark:text-slate-500'}`} />
            </button>
          )}

          {/* Mobile VIP Founder Command Center Quick Launch */}
          {quota.isFounder && onOpenFounderDashboard && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenFounderDashboard();
              }}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-amber-950 font-black text-xs border border-amber-500/40 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-amber-950 text-amber-300 flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4 fill-amber-300" />
                </span>
                <div className="text-left min-w-0">
                  <div className="text-xs font-black tracking-tight truncate">
                    {t('Founder Command Center')}
                  </div>
                  <div className="text-[10px] font-semibold text-amber-900/80 truncate">
                    Live registered users, Google/Email telemetry &amp; Pro grants
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 text-amber-950" />
            </button>
          )}

          {/* Grouped Navigation Menu Surface */}
          <nav
            aria-label="Drawer Navigation"
            className="rounded-2xl bg-white dark:bg-slate-800/80 border border-[#E2EBE1] dark:border-slate-700/70 divide-y divide-[#F1F5F0] dark:divide-slate-700/50 overflow-hidden shadow-[0_1px_3px_rgba(21,42,28,0.04)]"
          >
            {mobileNavLinks.map((link) => {
              const isActive = currentTab === link.id;
              const Icon = link.icon;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-[13.5px] font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#EAF1E9]/85 dark:bg-emerald-950/45 text-[#1E4631] dark:text-emerald-300'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-[#F4F6F2]/75 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-[#2D5A3D] dark:bg-emerald-600 text-white shadow-2xs'
                          : 'bg-[#F4F6F2] dark:bg-slate-900/70 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                    </span>
                    <span className="truncate">{link.label}</span>
                  </div>
                  {link.badge ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2D5A3D] dark:bg-emerald-600 text-white shrink-0">
                      {link.badge}
                    </span>
                  ) : (
                    <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#2D5A3D] dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'}`} />
                  )}
                </button>
              );
            })}
            {/* Quick Action Tiles in Mobile Drawer */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {onOpenPassport && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenPassport();
                  }}
                  className="p-2.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/30 text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <Stamp className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block truncate">{t('Passport')}</span>
                    <span className="text-[10px] text-amber-700/70 dark:text-amber-400 block truncate">{t('Visa Stamps')}</span>
                  </div>
                </button>
              )}
              {onOpenEmergencySos && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenEmergencySos();
                  }}
                  className="p-2.5 rounded-2xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-300/30 text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200 block truncate">{t('SOS Help')}</span>
                    <span className="text-[10px] text-rose-700/70 dark:text-rose-400 block truncate">{t('Emergency')}</span>
                  </div>
                </button>
              )}
              {onOpenWrapped && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenWrapped();
                  }}
                  className="p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-300/30 text-left transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block truncate">{t('Wrapped')}</span>
                    <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400 block truncate">{t('Year in Travel')}</span>
                  </div>
                </button>
              )}
            </div>
          </nav>

          {/* Compact Install App Strip for Browser Users */}
          {!isStandaloneApp && (
            <div className="px-3 py-2 rounded-2xl bg-[#E8EFE7]/90 dark:bg-slate-800/90 border border-[#DCE7DB] dark:border-slate-700 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 p-1.5 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200/90 dark:border-slate-700">
                  <BrandIconMark className="w-full h-full" idPrefix="nav-banner" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#152A1C] dark:text-slate-100 truncate">{t('TripVerse App')}</p>
                  <p className="text-[10px] text-[#5A7362] dark:text-slate-400 truncate">{t('Free, offline & fast')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenInstall}
                className="min-h-0 px-3.5 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs cursor-pointer active:scale-95 transition-all shrink-0"
              >
                {t('Install')}
              </button>
            </div>
          )}

          {/* Grouped Preferences Surface (Aligned Language, Currency & Appearance Switch) */}
          <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-[#E2EBE1] dark:border-slate-700/70 divide-y divide-[#F1F5F0] dark:divide-slate-700/50 overflow-hidden shadow-[0_1px_3px_rgba(21,42,28,0.04)]">
            {/* Language */}
            <div className="px-3 py-1.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-xl bg-[#F4F6F2] dark:bg-slate-900/70 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  <Languages className="w-4 h-4" />
                </span>
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {t('Language')}
                </span>
              </div>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                className="w-[58%] min-w-0 shrink-0 truncate px-2.5 py-1.5 rounded-xl bg-[#F4F6F2] dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/25"
                aria-label={t('Select Mobile Language')}
              >
                {Object.values(LANGUAGES).map((l) => (
                  <option key={l.code} value={l.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {l.flag} {l.nativeName === l.name ? l.nativeName : `${l.nativeName} (${l.name})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div className="px-3 py-1.5 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-xl bg-[#F4F6F2] dark:bg-slate-900/70 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                  <Globe className="w-4 h-4" />
                </span>
                <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {t('Currency')}
                </span>
              </div>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="w-[58%] min-w-0 shrink-0 truncate px-2.5 py-1.5 rounded-xl bg-[#F4F6F2] dark:bg-slate-900 border border-[#E2EBE1] dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2D5A3D]/25"
                aria-label={t('Select Mobile Currency')}
              >
                {Object.keys(CURRENCIES).map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {CURRENCIES[c as CurrencyCode].symbol} {c} ({CURRENCIES[c as CurrencyCode].name})
                  </option>
                ))}
              </select>
            </div>

            {/* Appearance: 3-Way Mode (System / Light / Dark) */}
            <div className="w-full px-3 py-2 flex flex-col gap-2">
              <div className="flex items-center justify-between text-left">
                <span className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isDarkMode ? 'bg-amber-400/15 text-amber-400' : 'bg-[#F4F6F2] dark:bg-slate-900/70 text-slate-500'
                  }`}>
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </span>
                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                    {t('Appearance')}
                  </span>
                </span>
                <span className="text-[11px] font-bold text-[#2D5A3D] dark:text-emerald-400 uppercase tracking-wider">
                  {themeMode === 'system' ? t('Auto') : isDarkMode ? t('Dark') : t('Light')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#F4F6F2] dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => handleSelectThemeMode('system')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    themeMode === 'system'
                      ? 'bg-white dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('Auto')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectThemeMode('light')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    themeMode === 'light'
                      ? 'bg-white dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('Light')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectThemeMode('dark')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    themeMode === 'dark'
                      ? 'bg-white dark:bg-slate-800 text-[#2D5A3D] dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('Dark')}
                </button>
              </div>
            </div>
          </div>

          {/* Primary Actions Footer */}
          <div className="pt-0.5 space-y-2">
            <button
              type="button"
              onClick={() => {
                onOpenPlanner();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-trip-gradient text-white font-bold text-sm shadow-md active:scale-[0.98] transition-transform cursor-pointer"
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
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-[#E8EFE7] hover:bg-[#DCE7DB] dark:bg-emerald-950/60 dark:hover:bg-emerald-950/80 border border-[#DCE7DB] dark:border-emerald-800/50 text-[#2D5A3D] dark:text-emerald-300 font-bold text-sm transition-colors cursor-pointer"
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
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 font-bold text-sm transition-colors cursor-pointer"
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
