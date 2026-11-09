import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MapPin, Compass, Sparkles, Navigation, ArrowRight, Star, Globe } from 'lucide-react';
import { Trip, Destination } from '../../types/trip';
import { POPULAR_DESTINATIONS } from '../../data/destinations';
import { triggerHaptic } from '../../services/deviceService';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { useLanguage } from '../../services/languageService';
import { searchLocations, PreciseLocation } from '../../services/locationService';
import { synthesizeDestination, handleImageError } from '../../utils/destinationImages';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
  onSelectDestination: (dest: Destination) => void;
  onOpenPlanner: (prefill?: { destination?: string }) => void;
  onOpenLiveNav: () => void;
  onOpenChat: () => void;
  onNavigateTab: (tab: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  trips,
  onSelectTrip,
  onSelectDestination,
  onOpenPlanner,
  onOpenLiveNav,
  onOpenChat,
  onNavigateTab
}) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [globalSuggestions, setGlobalSuggestions] = useState<PreciseLocation[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useModalBehavior(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setGlobalSuggestions([]);
    }
  }, [isOpen]);

  // Live worldwide location search (Wikipedia + Nominatim + Local Registry)
  useEffect(() => {
    const trimmed = query.trim();
    if (!isOpen || trimmed.length < 2) {
      setGlobalSuggestions([]);
      setIsSearchingGlobal(false);
      return;
    }

    let cancelled = false;
    setIsSearchingGlobal(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(trimmed);
        if (!cancelled) {
          setGlobalSuggestions(results.slice(0, 6));
        }
      } catch {
        if (!cancelled) setGlobalSuggestions([]);
      } finally {
        if (!cancelled) setIsSearchingGlobal(false);
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered by parent state via custom event or global listener
          window.dispatchEvent(new CustomEvent('tripverse-open-search'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalizedQuery = query.trim().toLowerCase();

  // Filter destinations + merge live global search results
  const catalogMatches = normalizedQuery
    ? POPULAR_DESTINATIONS.filter(d => 
        d.name.toLowerCase().includes(normalizedQuery) ||
        d.state.toLowerCase().includes(normalizedQuery) ||
        d.tagline.toLowerCase().includes(normalizedQuery)
      ).slice(0, 4)
    : POPULAR_DESTINATIONS.slice(0, 3);

  const globalSynthesizedMatches: Destination[] = normalizedQuery
    ? globalSuggestions
        .filter(loc => !catalogMatches.some(c => c.name.toLowerCase() === loc.name.toLowerCase()))
        .map(loc => synthesizeDestination(loc.name, loc))
        .slice(0, 4)
    : [];

  // Always offer an instant synthesized destination option for the exact typed query if not already listed
  const allCombinedMatches = [...catalogMatches, ...globalSynthesizedMatches];
  if (
    normalizedQuery.length >= 2 &&
    !allCombinedMatches.some(d => d.name.toLowerCase() === normalizedQuery)
  ) {
    allCombinedMatches.push(synthesizeDestination(query.trim()));
  }
  const matchingDestinations = allCombinedMatches.slice(0, 6);

  // Filter user trips
  const matchingTrips = normalizedQuery
    ? trips.filter(t => 
        t.name.toLowerCase().includes(normalizedQuery) ||
        t.destination.toLowerCase().includes(normalizedQuery) ||
        t.origin.toLowerCase().includes(normalizedQuery)
      ).slice(0, 3)
    : trips.slice(0, 2);

  // Quick App Actions
  const baseActions = [
    ...(query.trim()
      ? [
          {
            id: 'plan_searched_destination',
            label: `${t('Plan trip to')} "${query.trim()}"`,
            desc: t('Customize route, dates, budget & activities step-by-step'),
            icon: Sparkles,
            iconColor: 'text-[#2D5A3D]',
            action: () => {
              onClose();
              onOpenPlanner({ destination: query.trim() });
            }
          }
        ]
      : []),
    {
      id: 'plan_trip',
      label: t('Create New Itinerary with AI'),
      desc: t('Smart route, budget allocation & pitstops'),
      icon: Sparkles,
      iconColor: 'text-emerald-500',
      action: () => {
        onClose();
        onOpenPlanner();
      }
    },
    {
      id: 'live_nav',
      label: t('Get Directions'),
      desc: t('Open your route in an external navigation app'),
      icon: Navigation,
      iconColor: 'text-cyan-500',
      action: () => {
        onClose();
        onOpenLiveNav();
      }
    },
    {
      id: 'ai_chat',
      label: t('Chat with AI Travel Assistant'),
      desc: t('Ask about weather, replanning, or vegetarian food'),
      icon: Sparkles,
      iconColor: 'text-purple-500',
      action: () => {
        onClose();
        onOpenChat();
      }
    },
    {
      id: 'explore_places',
      label: t('Explore Worldwide & Local Destinations'),
      desc: t('Search any city, island, mountain town, or landmark on Earth'),
      icon: Globe,
      iconColor: 'text-amber-500',
      action: () => {
        onClose();
        onNavigateTab('explore');
      }
    }
  ];

  const quickActions = baseActions.filter(act => 
    act.id === 'plan_searched_destination' ||
    !normalizedQuery || 
    act.label.toLowerCase().includes(normalizedQuery) || 
    act.desc.toLowerCase().includes(normalizedQuery)
  );

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Search destinations and trips"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-xl overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && query.trim()) {
                e.preventDefault();
                triggerHaptic('light');
                onClose();
                if (matchingDestinations.length > 0) {
                  onSelectDestination(matchingDestinations[0]);
                } else {
                  onSelectDestination(synthesizeDestination(query.trim()));
                }
              }
            }}
            placeholder={t('Search trips, destinations, or quick actions (⌘K)...')}
            className="flex-1 bg-transparent text-sm sm:text-base font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {query ? (
            <button 
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={t('Clear search')}
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block text-[10px] font-bold uppercase bg-slate-100 border border-slate-300 text-slate-500 px-2 py-0.5 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Search Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5 scrollbar-thin">
          
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block">
                {t('Quick Actions')}
              </span>
              <div className="space-y-1">
                {quickActions.map(act => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      onClick={() => {
                        triggerHaptic('light');
                        act.action();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-2xs transition-all">
                          <Icon className={`w-4 h-4 ${act.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                            {act.label}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate">{act.desc}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Destinations */}
          {matchingDestinations.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('Worldwide & Curated Destinations')}
                </span>
                {isSearchingGlobal && (
                  <span className="text-[10px] font-semibold text-emerald-600 animate-pulse">
                    {t('Searching globally...')}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {matchingDestinations.map(dest => (
                  <button
                    key={dest.id}
                    onClick={() => {
                      triggerHaptic('light');
                      onClose();
                      onSelectDestination(dest);
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={dest.image} 
                        alt={dest.name}
                        onError={(e) => handleImageError(e, dest.name)}
                        className="w-10 h-10 rounded-xl object-cover shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                            {dest.name}
                          </h4>
                          <span className="text-[10px] font-medium text-slate-400 shrink-0">
                            • {dest.state}{dest.country && dest.country !== dest.state ? `, ${dest.country}` : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{dest.tagline}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-[#2D5A3D] flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{dest.rating}</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          onClose();
                          onOpenPlanner({ destination: dest.name });
                        }}
                        className="px-2.5 py-1 rounded-xl bg-[#E8EFE7] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        title={`Plan trip to ${dest.name}`}
                      >
                        {t('Plan')}
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* My Trips */}
          {matchingTrips.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block">
                {t('My Trips')}
              </span>
              <div className="space-y-1">
                {matchingTrips.map(trip => (
                  <button
                    key={trip.id}
                    onClick={() => {
                      triggerHaptic('light');
                      onClose();
                      onSelectTrip(trip.id);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#2D5A3D] flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                          {trip.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">
                          {trip.origin} → {trip.destination} • {trip.durationDays} {t('Days')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                      {t('Open')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty Search Results */}
          {quickActions.length === 0 && matchingDestinations.length === 0 && matchingTrips.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm font-bold text-slate-700">{t('No matching results for')} "{query}"</p>
              <p className="text-xs text-slate-400">{t('Try searching for destinations or activities')}</p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400">
          <span>{t('Search everything across TripVerse')}</span>
          <span className="font-mono">{t('Press ESC to exit')}</span>
        </div>
      </div>
    </div>
  );
};
