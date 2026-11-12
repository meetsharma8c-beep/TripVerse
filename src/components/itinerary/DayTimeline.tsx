import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { DayPlan, ItineraryActivity, TransportDeal, CurrencyCode, Coordinates } from '../../types/trip';
import { getActiveCurrency, formatCurrency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { resolveDestinationImage, handleImageError, DEFAULT_TRAVEL_FALLBACK_IMAGE } from '../../utils/destinationImages';
import { fetchOriginalPhoto, getInstantPhoto } from '../../services/originalPhotoService';
import { getDestinationHighlights, calculateTransitBetween, resolveLandmarkCoordinates } from '../../services/landmarkAtlasService';
import { Clock, MapPin, Car, CheckCircle2, Circle, Utensils, Bed, Camera, Sun, Sparkles, Coffee, Navigation, ChevronDown, Tag, Plus, Edit2, Trash2, ArrowUp, ArrowDown, ExternalLink, SlidersHorizontal, Compass, CloudRain, Sunrise, Users, Info, ShieldCheck, Zap, Activity, Building2, Moon, RotateCcw, CalendarPlus } from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';
const Landmark3DViewer = lazy(() => import('../common/Landmark3DViewer').then(m => ({ default: m.Landmark3DViewer })));
import { toggleDayWeatherMode } from '../../services/smartTravelEngine';

interface DayTimelineProps {
  itinerary: DayPlan[];
  destination?: string;
  bestDeal?: TransportDeal;
  onOpenDeals?: () => void;
  onAddActivity?: (dayNumber: number) => void;
  onEditActivity?: (dayNumber: number, activity: ItineraryActivity) => void;
  onDeleteActivity?: (dayNumber: number, activityId: string) => void;
  onMoveActivity?: (dayNumber: number, activityId: string, direction: 'up' | 'down') => void;
  onToggleComplete?: (dayNumber: number, activityId: string) => void;
  onOptimizeWithAI?: () => void;
  onClearDay?: (dayNumber: number) => void;
  onAddDay?: () => void;
  onDeleteDay?: (dayNumber: number) => void;
  onQuickAddSight?: (dayNumber: number, sightName: string) => void;
}

const DayThumbnailImage: React.FC<{
  day: DayPlan;
  destination?: string;
}> = ({ day, destination = '' }) => {
  const primaryActivity = day.activities?.find(a => a.type === 'attraction' || a.type === 'viewpoint') || day.activities?.[0];
  
  const initialUrl = 
    day.image || 
    primaryActivity?.image || 
    getInstantPhoto(primaryActivity?.title || day.title || destination) ||
    resolveDestinationImage(primaryActivity?.location || primaryActivity?.title || destination);

  const [imgSrc, setImgSrc] = useState<string>(initialUrl);

  useEffect(() => {
    let isMounted = true;
    const targetQuery = primaryActivity?.title || day.title || day.theme || destination;
    
    // If not already a custom photo or if it is currently a fallback, fetch original photo live
    if (!day.image || imgSrc === DEFAULT_TRAVEL_FALLBACK_IMAGE) {
      fetchOriginalPhoto(targetQuery, destination).then(photo => {
        if (isMounted && photo) {
          setImgSrc(photo);
        }
      });
    }
    return () => { isMounted = false; };
  }, [day, primaryActivity, destination]);

  return (
    <div className="w-20 h-18 sm:w-24 sm:h-20 rounded-2xl overflow-hidden shadow-xs border border-[#E2EBE1] bg-[#E8EFE7]">
      <img
        src={imgSrc}
        alt={day.title}
        onError={(e) => handleImageError(e, resolveDestinationImage(destination))}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
};

export const DayTimeline: React.FC<DayTimelineProps> = ({
  itinerary,
  destination,
  bestDeal,
  onOpenDeals,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onMoveActivity,
  onToggleComplete,
  onOptimizeWithAI,
  onClearDay,
  onAddDay,
  onDeleteDay,
  onQuickAddSight
}) => {
  const { t } = useLanguage();
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({ 1: true });
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [is3DOpen, setIs3DOpen] = useState(false);
  const [selected3DLandmark, setSelected3DLandmark] = useState('');
  const [weatherSwappedDays, setWeatherSwappedDays] = useState<Record<number, boolean>>({});
  const [isFlexiblePacing, setIsFlexiblePacing] = useState(false);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const requestLiveLocation = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      setTimeout(() => setLocationError(null), 4000);
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    triggerHaptic('medium');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setIsLocating(false);
        triggerHaptic('success');
      },
      (err) => {
        setIsLocating(false);
        setLocationError(err.code === 1 ? 'Location access was denied in browser settings.' : 'Unable to determine GPS location.');
        setTimeout(() => setLocationError(null), 4500);
        triggerHaptic('warning');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const destinationHighlights = useMemo(() => {
    if (!destination) return [];
    return getDestinationHighlights(destination, 14);
  }, [destination]);

  const handleToggleWeatherMode = (dayNumber: number) => {
    triggerHaptic('medium');
    setWeatherSwappedDays(prev => ({
      ...prev,
      [dayNumber]: !prev[dayNumber]
    }));
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

  const toggleDayExpanded = (dayNumber: number) => {
    triggerHaptic('light');
    setSelectedDay(dayNumber);
    setExpandedDays(prev => ({
      ...prev,
      [dayNumber]: !prev[dayNumber]
    }));
  };

  const handleOptimizeClick = () => {
    triggerHaptic('medium');
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
      if (onOptimizeWithAI) {
        onOptimizeWithAI();
      } else if (onOpenDeals) {
        onOpenDeals();
      }
    }, 600);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'departure':
      case 'arrival':
        return Navigation;
      case 'breakstop':
        return Coffee;
      case 'hotel':
        return Bed;
      case 'food':
        return Utensils;
      case 'attraction':
        return Camera;
      case 'viewpoint':
        return Sun;
      default:
        return Sparkles;
    }
  };

  return (
    <div className="space-y-6 font-sans pb-28 md:pb-8">
      
      {/* Itinerary Control Bar: Advisory, Live GPS & Flexibility Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[#E8EFE7]/70 border border-[#8EA78D]/30">
        <div className="flex items-center gap-2 text-xs text-[#2D5A3D]">
          <Compass className="w-4 h-4 text-[#2D5A3D] shrink-0" />
          <span className="font-semibold">
            {userCoords
              ? t('Live GPS Active: Real-time distance and ETA calculated from your current location')
              : isFlexiblePacing 
                ? 'Flexible Exploration Mode: Day goals without rigid hour-by-hour locks' 
                : t('itinerary.smartItineraryAdvisory')}
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          {/* Live GPS Mode Toggle */}
          <button
            type="button"
            onClick={userCoords ? () => { triggerHaptic('light'); setUserCoords(null); } : requestLiveLocation}
            disabled={isLocating}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              userCoords
                ? 'bg-emerald-700 text-white shadow-xs hover:bg-emerald-800'
                : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
            }`}
            title={userCoords ? t('Click to turn off live GPS mode') : t('Detect your GPS location to calculate real-time distance to every activity')}
          >
            <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>
              {isLocating 
                ? t('Locating...') 
                : userCoords 
                  ? t('Live GPS Connected') 
                  : t('Live GPS Mode')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsFlexiblePacing(prev => !prev);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isFlexiblePacing
                ? 'bg-[#2D5A3D] text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isFlexiblePacing ? 'Flexible Mode (Active)' : 'Switch to Flexible Mode'}</span>
          </button>
        </div>
      </div>

      {locationError && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-center justify-between animate-fadeIn">
          <span>{locationError}</span>
          <button type="button" onClick={() => setLocationError(null)} className="text-amber-600 hover:text-amber-800 font-bold ml-2">×</button>
        </div>
      )}

      {/* Screen 2: Vertical Day Timeline Stream */}
      <div className="relative space-y-5">
        
        {/* Connecting Vertical Dotted Line */}
        <div 
          className="absolute left-[19px] sm:left-[21px] top-6 bottom-12 w-[2px] border-l-2 border-dashed border-[#8EA78D]/40 z-0 pointer-events-none" 
        />

        {itinerary.map((day) => {
          const isExpanded = !!expandedDays[day.dayNumber];
          const isRainActive = !!weatherSwappedDays[day.dayNumber];
          const activeDay = isRainActive ? toggleDayWeatherMode(day, true) : day;
          const topActivities = activeDay.activities.slice(0, 4);

          return (
            <div key={day.dayNumber} className="relative z-10 flex items-start gap-3 sm:gap-4 group">
              
              {/* Screen 2: Green Circular Day Badge */}
              <button
                type="button"
                onClick={() => toggleDayExpanded(day.dayNumber)}
                className="w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-[#2D5A3D] text-white font-display font-bold flex flex-col items-center justify-center shrink-0 shadow-[0_2px_10px_rgba(45,90,61,0.2)] transition-transform group-hover:scale-105 cursor-pointer ring-4 ring-[#F4F6F2]"
              >
                <span className="text-[9px] uppercase tracking-wider text-[#A8C7A5] font-semibold leading-none">{t('itinerary.day')}</span>
                <span className="text-sm font-black leading-none mt-0.5">{day.dayNumber}</span>
              </button>

              {/* Day Card */}
              <div className="flex-1 rounded-3xl bg-white border border-[#E2EBE1] shadow-[0_4px_24px_rgba(45,90,61,0.05)] overflow-hidden transition-all duration-200 hover:border-[#8EA78D]">
                
                {/* Header Row */}
                <div 
                  onClick={() => toggleDayExpanded(day.dayNumber)}
                  className="p-4 sm:p-5 flex items-start justify-between gap-3 cursor-pointer select-none bg-white hover:bg-[#F8FAF7]/80 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    
                    {/* Title & Chevron */}
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-lg bg-[#E8EFE7] text-[#2D5A3D] flex items-center justify-center shrink-0">
                        <Sparkles className="w-3 h-3 text-[#2D5A3D]" />
                      </div>
                      <h3 className="font-display font-bold text-base sm:text-lg text-[#152A1C] tracking-tight truncate">
                        {t(day.title)}
                      </h3>
                      <ChevronDown className={`w-4 h-4 text-[#8EA78D] transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Summary Bullet Points matching Reference Screen 2 */}
                    <div className="space-y-1 text-xs text-[#5A7362] font-normal pl-1">
                      {topActivities.length > 0 ? (
                        topActivities.slice(0, 3).map((act) => (
                          <div key={act.id} className="flex items-center gap-1.5 truncate">
                            <span className="text-[#8EA78D]">•</span>
                            <span className="truncate">{t(act.title)}</span>
                            {act.travelTimeMin > 0 && (
                              <span className="text-[10px] text-slate-400">({act.travelTimeMin}m)</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="italic text-slate-400">{t('No scheduled activities yet.')}</p>
                      )}
                    </div>

                    {/* Cost & Theme footer */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-[#5A7362] flex-wrap">
                      <span className="font-semibold text-[#2D5A3D] bg-[#E8EFE7] px-2 py-0.5 rounded-full">
                        {t('Est.')} {formatCurrency(Number(day.dayEstimatedCost || 0), currency)}
                      </span>
                      {day.theme && (
                        <span className="text-slate-400">{t(`Theme: ${day.theme}`)}</span>
                      )}
                    </div>

                  </div>

                  {/* Right Controls & Thumbnail Image */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isExpanded && (
                      <div className="flex flex-col gap-1 items-end">
                        {onClearDay && activeDay.activities.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('warning');
                              if (window.confirm(`Clear all activities in Day ${day.dayNumber} to start with a blank day?`)) {
                                onClearDay(day.dayNumber);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1"
                            title={`Clear Day ${day.dayNumber} activities`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Clear</span>
                          </button>
                        )}
                        {onDeleteDay && itinerary.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('warning');
                              if (window.confirm(`Remove Day ${day.dayNumber} from this itinerary?`)) {
                                onDeleteDay(day.dayNumber);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-1"
                            title={`Remove Day ${day.dayNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Delete Day</span>
                          </button>
                        )}
                      </div>
                    )}
                    <DayThumbnailImage day={day} destination={destination} />
                  </div>

                </div>

                {/* Expanded Detailed Interactive Activities */}
                {isExpanded && (
                  <div className="border-t border-[#E2EBE1] bg-[#F8FAF7]/50 p-4 sm:p-5 space-y-4 animate-fade-in">
                    
                    {/* Circadian Jet-Lag Protection Banner */}
                    {day.dayNumber === 1 && day.circadianAdvice && day.circadianAdvice.isSignificantShift && (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-950 shadow-2xs">
                        <Sunrise className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 flex-wrap">
                            <span>Circadian Jet-Lag Protection Active (+{day.circadianAdvice.deltaUtcHours}h Shift)</span>
                            <span className="text-[10px] font-extrabold uppercase bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                              Melatonin Sync
                            </span>
                          </div>
                          <p className="text-amber-900/90 leading-relaxed text-[11px]">
                            {day.circadianAdvice.melatoninResetSlot.scientificRationale}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] font-semibold text-amber-800 flex-wrap pt-0.5">
                            <span className="inline-flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" /> Outdoor Light Window: {day.circadianAdvice.melatoninResetSlot.startTime} – {day.circadianAdvice.melatoninResetSlot.endTime}</span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-700 shrink-0" /> Max Pacing Cap: {day.circadianAdvice.recommendedMaxStepsDay1.toLocaleString()} steps</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cultural Insights Strip (Day 1) */}
                    {day.culturalInsights && day.culturalInsights.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#2D5A3D]" />
                            <strong className="text-[#152A1C] uppercase tracking-wider text-[11px]">Local Customs & Friction Guardrails</strong>
                          </div>
                          <span className="text-[10px] font-bold text-[#2D5A3D] bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                            {day.culturalInsights.length} Verified Rules
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {day.culturalInsights.slice(0, 4).map(ci => (
                            <div key={ci.id} className="p-2.5 rounded-xl bg-white border border-emerald-100 text-[11px] space-y-0.5">
                              <div className="font-bold text-[#152A1C] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D]" />
                                <span>{ci.title}</span>
                              </div>
                              <p className="text-slate-600 line-clamp-2">{ci.detail}</p>
                              <div className="text-[10px] text-[#2D5A3D] font-semibold pt-0.5">Tip: {ci.actionableTip}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Schedule Header with TSP Badge and Rain Mode Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-1 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#5A7362]">
                          Detailed Schedule ({activeDay.activities.length} items)
                        </span>
                        {activeDay.tspOptimized && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5 text-emerald-700" />
                            TSP Route Optimized
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Dynamic Weather Rain-Mode 1-Click Toggle */}
                        {day.activities.some(a => a.indoorMirror) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWeatherMode(day.dayNumber);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                              isRainActive
                                ? 'bg-sky-600 text-white border border-sky-700 shadow-sm'
                                : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
                            }`}
                          >
                            <CloudRain className="w-3.5 h-3.5" />
                            <span>{isRainActive ? 'Rain Mode Active (Indoor Mirrors)' : 'Rain Forecast? Swap to Indoor Mirrors'}</span>
                          </button>
                        )}

                        {onAddActivity && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('light');
                              onAddActivity(day.dayNumber);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#234730] text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Stop</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timeline items for this day */}
                    <div className="space-y-3">
                      {activeDay.activities.length === 0 && (
                        <div className="p-6 text-center space-y-3 bg-white rounded-2xl border border-dashed border-[#8EA78D]/50 shadow-2xs">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#2D5A3D] mx-auto flex items-center justify-center">
                            <Compass className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#152A1C]">Flexible Free Exploration Day</h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                              No rigid activities scheduled for Day {day.dayNumber}. Wander at your own pace, enjoy spontaneous meals, or add sights of your choice below.
                            </p>
                          </div>
                          {onAddActivity && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                onAddActivity(day.dayNumber);
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold shadow-xs hover:bg-[#234730] transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Custom Activity</span>
                            </button>
                          )}
                        </div>
                      )}

                      {activeDay.activities.map((act, idx) => {
                        const Icon = getActivityIcon(act.type);
                        const actCoords: Coordinates = act.coordinates || resolveLandmarkCoordinates(act.location || act.title, { lat: 25.5, lng: 91.5 });
                        const liveTransit = userCoords && actCoords ? calculateTransitBetween(userCoords, actCoords) : null;

                        return (
                          <div
                            key={act.id}
                            className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
                              act.completed
                                ? 'bg-[#E8EFE7]/40 border-[#8EA78D]/30 opacity-75'
                                : 'bg-white border-[#E2EBE1] shadow-2xs hover:border-[#8EA78D]'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              
                              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                                {onToggleComplete && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('light');
                                      onToggleComplete(day.dayNumber, act.id);
                                    }}
                                    className="cursor-pointer shrink-0"
                                    title={act.completed ? 'Mark uncompleted' : 'Mark completed'}
                                  >
                                    {act.completed ? (
                                      <CheckCircle2 className="w-4 h-4 text-[#2D5A3D]" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-[#8EA78D] hover:text-[#2D5A3D] transition-colors" />
                                    )}
                                  </button>
                                )}

                                <span className="text-xs font-bold text-[#2D5A3D] bg-[#E8EFE7] px-2 py-0.5 rounded-full shrink-0">
                                  {isFlexiblePacing 
                                    ? (idx === 0 ? 'Morning' : idx === 1 ? 'Midday' : idx === 2 ? 'Afternoon' : idx === 3 ? 'Sunset' : 'Evening')
                                    : act.time}
                                </span>

                                <span className={`text-sm font-bold min-w-0 break-words leading-snug ${act.completed ? 'line-through text-slate-400' : 'text-[#152A1C]'}`}>
                                  {t(act.title)}
                                </span>

                                {act.isCustom && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-md shrink-0">
                                    {t('Custom')}
                                  </span>
                                )}

                                {(act.type === 'attraction' || act.type === 'viewpoint' || act.type === 'nightlife') && act.queueSlot === 'early_morning_low_crowd' && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-md shrink-0 inline-flex items-center gap-1">
                                    <Sunrise className="w-3 h-3 text-emerald-600 shrink-0 inline" />
                                    <span>{t('Low-Queue Slot')}</span>
                                  </span>
                                )}
                                {(act.type === 'attraction' || act.type === 'viewpoint') && act.queueSlot === 'midday_timed_indoor' && (
                                  <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-md shrink-0 inline-flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-indigo-600 shrink-0 inline" />
                                    <span>{t('Timed Indoor')}</span>
                                  </span>
                                )}
                                {(act.type === 'attraction' || act.type === 'viewpoint' || act.type === 'nightlife') && act.queueSlot === 'evening_vibrant' && (
                                  <span className="text-[10px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-md shrink-0 inline-flex items-center gap-1">
                                    <Moon className="w-3 h-3 text-purple-600 shrink-0 inline" />
                                    <span>{act.type === 'nightlife' ? t('Nightlife Peak') : t('Evening Highlight')}</span>
                                  </span>
                                )}
                                {act.isIndoorSwapped && (
                                  <span className="text-[10px] font-bold text-sky-800 bg-sky-100 border border-sky-300 px-1.5 py-0.2 rounded-md shrink-0 inline-flex items-center gap-1">
                                    <CloudRain className="w-3 h-3 text-sky-600 shrink-0 inline" />
                                    <span>{t('Indoor Mirror')}</span>
                                  </span>
                                )}
                              </div>

                              {/* Cost & Inline Reorder / Edit Actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-[#152A1C] bg-[#F8FAF7] px-2.5 py-1 rounded-lg border border-[#E2EBE1]">
                                  {act.estimatedCost === 0 ? t('Free') : formatCurrency(act.estimatedCost, currency)}
                                </span>

                                <div className="flex items-center gap-0.5">
                                  {onMoveActivity && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          triggerHaptic('light');
                                          onMoveActivity(day.dayNumber, act.id, 'up');
                                        }}
                                        disabled={idx === 0}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                        title="Move earlier"
                                      >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          triggerHaptic('light');
                                          onMoveActivity(day.dayNumber, act.id, 'down');
                                        }}
                                        disabled={idx === day.activities.length - 1}
                                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                        title="Move later"
                                      >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {onEditActivity && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerHaptic('light');
                                        onEditActivity(day.dayNumber, act);
                                      }}
                                      className="p-1 text-slate-400 hover:text-[#2D5A3D] cursor-pointer"
                                      title="Edit activity"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {onDeleteActivity && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerHaptic('warning');
                                        onDeleteActivity(day.dayNumber, act.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                      title="Remove activity"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                              </div>

                            </div>

                            {/* Location & Transit Distance */}
                            <div className="flex items-center gap-2 sm:gap-3 text-xs text-[#5A7362] mb-1.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-[#8EA78D] shrink-0" />
                                <span>{act.location}</span>
                              </span>

                              {act.travelTimeMin > 0 && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1" title={t('Planned transit from previous stop')}>
                                    <Clock className="w-3.5 h-3.5 text-[#8EA78D]" />
                                    <span>{act.travelTimeMin} min transit</span>
                                  </span>
                                </>
                              )}

                              {act.distanceKm > 0 && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1" title={t('Planned distance from previous stop')}>
                                    <Car className="w-3.5 h-3.5 text-[#8EA78D]" />
                                    <span>{act.distanceKm} km</span>
                                  </span>
                                </>
                              )}

                              {/* Real-time GPS distance when user has live mode active */}
                              {liveTransit && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[11px]">
                                    <Compass className="w-3 h-3 text-emerald-600 animate-pulse" />
                                    <span>{liveTransit.distanceKm} km from you ({liveTransit.travelTimeMin}m live)</span>
                                  </span>
                                </>
                              )}

                              {/* Quick GPS live check button */}
                              {!userCoords && (
                                <button
                                  type="button"
                                  onClick={requestLiveLocation}
                                  disabled={isLocating}
                                  className="text-[10px] text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/60 px-1.5 py-0.5 rounded-md font-semibold transition-colors flex items-center gap-1 cursor-pointer ml-auto sm:ml-0"
                                  title={t('Calculate real-time distance and ETA from your current GPS location')}
                                >
                                  <Navigation className={`w-2.5 h-2.5 text-emerald-600 ${isLocating ? 'animate-spin' : ''}`} />
                                  <span>{isLocating ? t('Locating...') : t('Live ETA')}</span>
                                </button>
                              )}
                            </div>

                            {act.description && (
                              <p className="text-xs text-[#5A7362] leading-relaxed">
                                {t(act.description)}
                              </p>
                            )}

                            {act.culturalTip && (
                              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 space-y-1">
                                {act.culturalTip.etiquette && (
                                  <div className="flex items-start gap-1.5">
                                    <span className="font-bold text-[#2D5A3D] shrink-0">Etiquette:</span>
                                    <span>{act.culturalTip.etiquette}</span>
                                  </div>
                                )}
                                {act.culturalTip.paymentAlert && (
                                  <div className="flex items-start gap-1.5 text-amber-800 font-medium">
                                    <span className="font-bold text-amber-900 shrink-0">Payment Note:</span>
                                    <span>{act.culturalTip.paymentAlert}</span>
                                  </div>
                                )}
                                {act.culturalTip.tippingRule === 'strictly_no_tipping' && (
                                  <div className="flex items-center gap-1.5 text-emerald-700 font-semibold text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 inline" />
                                    <span>{t('Strictly Zero Tipping: Omotenashi hospitality is included in full.')}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* External Links (Maps, Zomato, Stays) */}
                            <div className="mt-2 pt-2 border-t border-[#E2EBE1] flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Direct Turn-by-Turn GPS Navigation from User's Current Location */}
                                <a
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                    act.coordinates 
                                      ? `${act.coordinates.lat},${act.coordinates.lng}` 
                                      : `${act.title}, ${act.location}`
                                  )}&travelmode=driving`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#2D5A3D] hover:bg-[#23462f] shadow-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                  title={t('Start turn-by-turn navigation in Google Maps from your current location')}
                                >
                                  <Navigation className="w-3 h-3 text-emerald-200 fill-current" />
                                  <span>{t('Navigate')}</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-emerald-200" />
                                </a>

                                <a
                                  href={act.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location || act.title)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D5A3D] bg-[#E8EFE7] hover:bg-[#d9e5d8] px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  <MapPin className="w-3 h-3 text-[#2D5A3D]" />
                                  <span>View on Maps</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-[#8EA78D]" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setSelected3DLandmark(act.title);
                                    setIs3DOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                  title="Explore in interactive 3D WebGL"
                                >
                                  <Sparkles className="w-3 h-3 text-emerald-600" />
                                  <span>3D View</span>
                                </button>

                                {(act.type === 'food' || act.tag?.toLowerCase().includes('food')) && (
                                  <a
                                    href={`https://www.zomato.com/search?q=${encodeURIComponent(act.title + ' ' + act.location)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                                  >
                                    <Utensils className="w-3 h-3 text-rose-600" />
                                    <span>Menu & Reviews</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-rose-400" />
                                  </a>
                                )}

                                {act.type === 'hotel' && (
                                  <a
                                    href={act.mapUrl || `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(act.location || act.title)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 px-2.5 py-1 rounded-lg transition-colors"
                                  >
                                    <Bed className="w-3 h-3 text-sky-600" />
                                    <span>Book Stay on Booking.com</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                                  </a>
                                )}
                              </div>

                              <span className="text-[10px] text-slate-400">
                                {act.source === 'geoapify_places' ? 'OpenStreetMap verified' : 'AI curated suggestion'}
                              </span>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                    {/* Quick-Pick Destination Sights Strip */}
                    {destinationHighlights.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-[#2D5A3D]">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Quick Add Sights to Day {day.dayNumber} ({destination || 'Destination'}):</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">Click to add in 1-tap</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {destinationHighlights.map((hl) => {
                            const alreadyAdded = activeDay.activities.some(a => a.title.toLowerCase().includes(hl.toLowerCase()) || hl.toLowerCase().includes(a.title.toLowerCase()));
                            return (
                              <button
                                key={hl}
                                type="button"
                                disabled={alreadyAdded}
                                onClick={() => {
                                  triggerHaptic('success');
                                  if (onQuickAddSight) {
                                    onQuickAddSight(day.dayNumber, hl);
                                  } else if (onAddActivity) {
                                    onAddActivity(day.dayNumber);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left truncate max-w-full ${
                                  alreadyAdded
                                    ? 'bg-emerald-100/60 text-emerald-800 border border-emerald-200 opacity-60 cursor-default'
                                    : 'bg-white hover:bg-emerald-100/70 border border-emerald-200 text-slate-800 shadow-2xs'
                                }`}
                              >
                                {alreadyAdded ? `✓ ${hl}` : `+ ${hl}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Multi-Persona Parallel Group Explorer Card */}
                    {activeDay.groupBranches && activeDay.groupBranches.length > 0 && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-slate-50 border border-emerald-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-[#2D5A3D] text-white flex items-center justify-center">
                              <Users className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-[#152A1C] uppercase tracking-wide">
                                Multi-Persona Parallel Explorer Sprints
                              </h4>
                              <div className="text-[11px] text-slate-500">Autonomous afternoon tracks with unified group evening convergence</div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#2D5A3D] bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                            Pareto Optimized
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {activeDay.groupBranches.map(branch => (
                            <div key={branch.branchId} className="p-3 rounded-xl bg-white border border-[#E2EBE1] shadow-2xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#2D5A3D]">{branch.timeWindow}</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{branch.distanceToConvergenceMeters}m to dinner</span>
                              </div>
                              <div className="text-xs font-bold text-[#152A1C]">{branch.activityTitle}</div>
                              <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{branch.description}</div>
                            </div>
                          ))}
                        </div>

                        {activeDay.groupBranches[0]?.convergenceAnchor && (
                          <div className="p-2.5 rounded-xl bg-emerald-100/60 border border-emerald-200 flex items-center gap-2 text-xs text-[#2D5A3D]">
                            <Sparkles className="w-4 h-4 text-[#2D5A3D] shrink-0" />
                            <span className="font-medium">
                              <strong>{activeDay.groupBranches[0].convergenceAnchor.time} Convergence:</strong> {activeDay.groupBranches[0].convergenceAnchor.venueName} — {activeDay.groupBranches[0].convergenceAnchor.instructions}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transport Deal Banner on Day 1 */}
                    {day.dayNumber === 1 && bestDeal && (
                      <div className="p-3.5 rounded-2xl bg-[#E8EFE7] border border-[#8EA78D]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-xl bg-[#2D5A3D] text-white flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-[#152A1C] truncate">
                                Best {bestDeal.mode.toUpperCase()} Deal: {bestDeal.provider}
                              </span>
                              <span className="text-[10px] font-extrabold text-[#2D5A3D] bg-white px-2 py-0.5 rounded-full border border-[#8EA78D]/30">
                                Save {formatCurrency(bestDeal.savingsAmount, currency)}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#5A7362] block truncate">
                              {bestDeal.title} • {bestDeal.couponCode ? `Code: ${bestDeal.couponCode}` : 'AI Price Match'}
                            </span>
                          </div>
                        </div>

                        {onOpenDeals && (
                          <button
                            type="button"
                            onClick={onOpenDeals}
                            className="px-3.5 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#234730] text-white font-bold text-xs transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                          >
                            View Deal →
                          </button>
                        )}
                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
          );
        })}

        {/* Action Controls: Responsive Setup */}
        <div className="pl-13 sm:pl-15 pt-1 space-y-3">
          
          {/* Desktop Toolbar (md+): Inline "+ Add Activity" + "+ Add Day" + "Optimize with AI" + Settings */}
          <div className="hidden md:flex items-center gap-3">
            {onAddActivity && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onAddActivity(selectedDay);
                }}
                className="flex-1 py-3.5 px-5 rounded-2xl border-2 border-dashed border-[#8EA78D]/50 hover:border-[#2D5A3D] bg-[#F8FAF7] hover:bg-[#E8EFE7]/50 text-[#2D5A3D] font-display font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
              >
                <div className="w-5 h-5 rounded-full bg-[#E8EFE7] group-hover:bg-[#2D5A3D] text-[#2D5A3D] group-hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Add Activity</span>
              </button>
            )}

            {onAddDay && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('success');
                  onAddDay();
                }}
                className="py-3.5 px-5 rounded-2xl border border-emerald-300 bg-white hover:bg-emerald-50 text-[#2D5A3D] font-display font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99] shrink-0"
                title="Add an extra day to this trip"
              >
                <CalendarPlus className="w-4 h-4 text-[#2D5A3D]" />
                <span>+ Add Day</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOptimizeClick}
              disabled={isOptimizing}
              className="py-3.5 px-6 rounded-2xl bg-[#2D5A3D] hover:bg-[#234730] text-white font-display font-bold text-sm shadow-[0_4px_18px_rgba(45,90,61,0.22)] flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 disabled:opacity-75 shrink-0"
            >
              <Sparkles className={`w-4 h-4 text-emerald-300 ${isOptimizing ? 'animate-spin' : ''}`} />
              <span>{isOptimizing ? 'Optimizing Itinerary...' : 'Optimize with AI'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                if (onOpenDeals) onOpenDeals();
              }}
              className="w-12 h-12 rounded-2xl bg-white border border-[#E2EBE1] text-[#2D5A3D] shadow-xs flex items-center justify-center hover:bg-[#F8FAF7] hover:border-[#8EA78D] transition-all cursor-pointer active:scale-95 shrink-0"
              title="Route Preferences & Filter"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile Only: "+ Add Activity" & "+ Add Day" Buttons */}
          <div className="md:hidden space-y-2">
            {onAddActivity && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onAddActivity(selectedDay);
                }}
                className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#8EA78D]/50 hover:border-[#2D5A3D] bg-[#F8FAF7] hover:bg-[#E8EFE7]/50 text-[#2D5A3D] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
              >
                <div className="w-5 h-5 rounded-full bg-[#E8EFE7] group-hover:bg-[#2D5A3D] text-[#2D5A3D] group-hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span>Add Activity</span>
              </button>
            )}

            {onAddDay && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('success');
                  onAddDay();
                }}
                className="w-full py-2.5 rounded-2xl border border-emerald-300 bg-white hover:bg-emerald-50 text-[#2D5A3D] font-display font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99]"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-[#2D5A3D]" />
                <span>+ Add Day {itinerary.length + 1} to Itinerary</span>
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Reference Screen 2: Signature Sticky Floating Action Bar for Mobile Screens Only (< md) */}
      <div className="md:hidden fixed bottom-22 left-0 right-0 z-40 px-4 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center gap-3 pointer-events-auto">
          
          <button
            type="button"
            onClick={handleOptimizeClick}
            disabled={isOptimizing}
            className="flex-1 py-3.5 px-6 rounded-full bg-[#2D5A3D] hover:bg-[#234730] text-white font-display font-bold text-sm sm:text-base shadow-[0_8px_30px_rgba(45,90,61,0.35)] flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-75"
          >
            <Sparkles className={`w-4 h-4 text-emerald-300 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? 'Optimizing Itinerary...' : 'Optimize with AI'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              if (onOpenDeals) onOpenDeals();
            }}
            className="w-12 h-12 rounded-full bg-white border border-[#E2EBE1] text-[#2D5A3D] shadow-[0_6px_20px_rgba(45,90,61,0.15)] flex items-center justify-center hover:bg-[#F8FAF7] transition-all cursor-pointer active:scale-95 shrink-0"
            title="Route Preferences & Filter"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* Interactive 3D WebGL Landmark Viewer */}
      {is3DOpen && (
        <Suspense fallback={null}>
          <Landmark3DViewer
            landmarkName={selected3DLandmark || 'Heritage Landmark'}
            destination={destination || 'Your Destination'}
            isOpen={is3DOpen}
            onClose={() => setIs3DOpen(false)}
          />
        </Suspense>
      )}

    </div>
  );
};

