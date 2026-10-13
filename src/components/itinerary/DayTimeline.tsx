import React, { useState, useEffect } from 'react';
import { DayPlan, ItineraryActivity, TransportDeal, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, formatCurrency } from '../../services/currencyService';
import { resolveDestinationImage, handleImageError } from '../../utils/destinationImages';
import { 
  Clock, 
  MapPin, 
  Car, 
  CheckCircle2, 
  Circle,
  Utensils, 
  Bed, 
  Camera, 
  Sun, 
  Sparkles, 
  Coffee,
  Navigation,
  ChevronDown,
  ChevronRight,
  Tag,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  SlidersHorizontal,
  Compass
} from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

interface DayTimelineProps {
  itinerary: DayPlan[];
  bestDeal?: TransportDeal;
  onOpenDeals?: () => void;
  onAddActivity?: (dayNumber: number) => void;
  onEditActivity?: (dayNumber: number, activity: ItineraryActivity) => void;
  onDeleteActivity?: (dayNumber: number, activityId: string) => void;
  onMoveActivity?: (dayNumber: number, activityId: string, direction: 'up' | 'down') => void;
  onToggleComplete?: (dayNumber: number, activityId: string) => void;
  onOptimizeWithAI?: () => void;
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  itinerary,
  bestDeal,
  onOpenDeals,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onMoveActivity,
  onToggleComplete,
  onOptimizeWithAI
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({ 1: true });
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());
  const [isOptimizing, setIsOptimizing] = useState(false);

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
      
      {/* Advisory Note */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E8EFE7]/60 border border-[#8EA78D]/30 text-xs text-[#2D5A3D]">
        <Compass className="w-4 h-4 text-[#2D5A3D] shrink-0" />
        <span className="flex-1">
          Smart Itinerary: Real-time routes, optimized timings & verified local spots. Tap any day to inspect details.
        </span>
      </div>

      {/* Screen 2: Vertical Day Timeline Stream */}
      <div className="relative space-y-5">
        
        {/* Connecting Vertical Dotted Line */}
        <div 
          className="absolute left-[19px] sm:left-[21px] top-6 bottom-12 w-[2px] border-l-2 border-dashed border-[#8EA78D]/40 z-0 pointer-events-none" 
        />

        {itinerary.map((day) => {
          const isExpanded = !!expandedDays[day.dayNumber];
          const topActivities = day.activities.slice(0, 4);
          
          // Image preview for the day
          const primaryActivity = day.activities.find(a => a.type === 'attraction' || a.type === 'viewpoint') || day.activities[0];
          const dayThumb = primaryActivity ? resolveDestinationImage(primaryActivity.location || primaryActivity.title) : '/images/destinations/meghalaya.jpg';

          return (
            <div key={day.dayNumber} className="relative z-10 flex items-start gap-3 sm:gap-4 group">
              
              {/* Screen 2: Green Circular Day Badge */}
              <button
                type="button"
                onClick={() => toggleDayExpanded(day.dayNumber)}
                className="w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-[#2D5A3D] text-white font-display font-bold flex flex-col items-center justify-center shrink-0 shadow-[0_2px_10px_rgba(45,90,61,0.2)] transition-transform group-hover:scale-105 cursor-pointer ring-4 ring-[#F4F6F2]"
              >
                <span className="text-[9px] uppercase tracking-wider text-[#A8C7A5] font-semibold leading-none">Day</span>
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
                        {day.title}
                      </h3>
                      <ChevronDown className={`w-4 h-4 text-[#8EA78D] transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Summary Bullet Points matching Reference Screen 2 */}
                    <div className="space-y-1 text-xs text-[#5A7362] font-normal pl-1">
                      {topActivities.length > 0 ? (
                        topActivities.slice(0, 3).map((act) => (
                          <div key={act.id} className="flex items-center gap-1.5 truncate">
                            <span className="text-[#8EA78D]">•</span>
                            <span className="truncate">{act.title}</span>
                            {act.travelTimeMin > 0 && (
                              <span className="text-[10px] text-slate-400">({act.travelTimeMin}m)</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="italic text-slate-400">No scheduled activities yet.</p>
                      )}
                    </div>

                    {/* Cost & Theme footer */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-[#5A7362] flex-wrap">
                      <span className="font-semibold text-[#2D5A3D] bg-[#E8EFE7] px-2 py-0.5 rounded-full">
                        Est. {formatCurrency(Number(day.dayEstimatedCost || 0), currency)}
                      </span>
                      {day.theme && (
                        <span className="text-slate-400">Theme: {day.theme}</span>
                      )}
                    </div>

                  </div>

                  {/* Right Thumbnail Image matching Reference Screen 2 */}
                  <div className="shrink-0">
                    <div className="w-20 h-18 sm:w-24 sm:h-20 rounded-2xl overflow-hidden shadow-xs border border-[#E2EBE1] bg-[#E8EFE7]">
                      <img
                        src={dayThumb}
                        alt={day.title}
                        onError={(e) => handleImageError(e)}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  </div>

                </div>

                {/* Expanded Detailed Interactive Activities */}
                {isExpanded && (
                  <div className="border-t border-[#E2EBE1] bg-[#F8FAF7]/50 p-4 sm:p-5 space-y-4 animate-fade-in">
                    
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#5A7362]">
                        Detailed Schedule ({day.activities.length} items)
                      </span>

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

                    {/* Timeline items for this day */}
                    <div className="space-y-3">
                      {day.activities.map((act, idx) => {
                        const Icon = getActivityIcon(act.type);

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
                                  {act.time}
                                </span>

                                <span className={`text-sm font-bold min-w-0 break-words leading-snug ${act.completed ? 'line-through text-slate-400' : 'text-[#152A1C]'}`}>
                                  {act.title}
                                </span>

                                {act.isCustom && (
                                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded-md shrink-0">
                                    Custom
                                  </span>
                                )}
                              </div>

                              {/* Cost & Inline Reorder / Edit Actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-bold text-[#152A1C] bg-[#F8FAF7] px-2.5 py-1 rounded-lg border border-[#E2EBE1]">
                                  {act.estimatedCost === 0 ? 'Free' : formatCurrency(act.estimatedCost, currency)}
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
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5 text-[#8EA78D]" />
                                    <span>{act.travelTimeMin} min transit</span>
                                  </span>
                                </>
                              )}

                              {act.distanceKm > 0 && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1">
                                    <Car className="w-3.5 h-3.5 text-[#8EA78D]" />
                                    <span>{act.distanceKm} km</span>
                                  </span>
                                </>
                              )}
                            </div>

                            {act.description && (
                              <p className="text-xs text-[#5A7362] leading-relaxed">
                                {act.description}
                              </p>
                            )}

                            {/* External Links (Maps, Zomato, Stays) */}
                            <div className="mt-2 pt-2 border-t border-[#E2EBE1] flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
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
          
          {/* Desktop Toolbar (md+): Inline "+ Add Activity" + "Optimize with AI" + Settings */}
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

          {/* Mobile Only: "+ Add Activity" Full Width Button */}
          {onAddActivity && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onAddActivity(selectedDay);
              }}
              className="md:hidden w-full py-3.5 rounded-2xl border-2 border-dashed border-[#8EA78D]/50 hover:border-[#2D5A3D] bg-[#F8FAF7] hover:bg-[#E8EFE7]/50 text-[#2D5A3D] font-display font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer group shadow-2xs active:scale-[0.99]"
            >
              <div className="w-5 h-5 rounded-full bg-[#E8EFE7] group-hover:bg-[#2D5A3D] text-[#2D5A3D] group-hover:text-white flex items-center justify-center transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span>Add Activity</span>
            </button>
          )}

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

    </div>
  );
};

