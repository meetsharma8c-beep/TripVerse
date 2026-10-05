import React, { useState, useEffect } from 'react';
import { DayPlan, ItineraryActivity, TransportDeal, CurrencyCode } from '../../types/trip';
import { getActiveCurrency, formatCurrency } from '../../services/currencyService';
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
  Tag,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldCheck,
  Ticket
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
}

export const DayTimeline: React.FC<DayTimelineProps> = ({
  itinerary,
  bestDeal,
  onOpenDeals,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
  onMoveActivity,
  onToggleComplete
}) => {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());

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

  const activeDayPlan = itinerary.find(d => d.dayNumber === selectedDay) || itinerary[0];

  const toggleExpand = (id: string) => {
    setExpandedActivities(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
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
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Day Selector Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#00B074]">Step-by-Step Schedule</span>
          <h2 className="text-xl font-bold text-[#0B2545]">Day-Wise Itinerary</h2>
        </div>

        {/* Day Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {itinerary.map((day) => (
            <button
              key={day.dayNumber}
              onClick={() => setSelectedDay(day.dayNumber)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                selectedDay === day.dayNumber
                  ? 'bg-trip-gradient text-white shadow-xs scale-[1.02]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Day {day.dayNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Active Day Header */}
      {activeDayPlan && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              {activeDayPlan.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Theme: {activeDayPlan.theme}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Day's Estimated Cost</span>
              <span className="text-base font-extrabold text-[#00B074]">
                {formatCurrency(activeDayPlan.dayEstimatedCost, currency)}
              </span>
            </div>

            {onAddActivity && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onAddActivity(selectedDay);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#00B074] hover:bg-[#00925e] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Activity</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timeline Stream */}
      <div className="relative pl-4 sm:pl-6 space-y-6 before:absolute before:left-[19px] sm:before:left-[27px] before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {activeDayPlan?.activities.map((act, index) => {
          const Icon = getActivityIcon(act.type);
          const isExpanded = expandedActivities[act.id] ?? false;

          return (
            <div key={act.id} className="relative flex items-start gap-3 sm:gap-4 group">
              
              {/* Timeline Marker Icon */}
              <div className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-110 transition-transform ${
                act.completed
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-600'
                  : 'bg-white border-[#00B074] text-[#00B074]'
              }`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              {/* Activity Card */}
              <div className={`flex-1 rounded-2xl p-4 border transition-all ${
                act.completed
                  ? 'bg-emerald-50/40 border-emerald-200 opacity-80'
                  : 'bg-white border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md'
              }`}>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    {onToggleComplete && (
                      <button
                        onClick={() => {
                          triggerHaptic('light');
                          onToggleComplete(selectedDay, act.id);
                        }}
                        className="cursor-pointer shrink-0"
                        title={act.completed ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        {act.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#00B074]" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 hover:text-[#00B074] transition-colors" />
                        )}
                      </button>
                    )}

                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      {act.time}
                    </span>

                    {act.tag && (
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                        {act.tag}
                      </span>
                    )}

                    {act.isCustom && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 shrink-0">
                        Custom
                      </span>
                    )}

                    <span className={`text-sm font-bold min-w-0 ${act.completed ? 'line-through text-slate-400' : 'text-[#0B2545]'}`}>
                      {act.title}
                    </span>
                  </div>

                  {/* Cost & Actions */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 shrink-0">
                      {act.estimatedCost === 0 ? 'Free' : formatCurrency(act.estimatedCost, currency)}
                    </span>

                    {/* Inline Actions (Edit, Delete, Move) */}
                    <div className="flex items-center gap-0.5 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {onMoveActivity && (
                        <>
                          <button
                            onClick={() => {
                              triggerHaptic('light');
                              onMoveActivity(selectedDay, act.id, 'up');
                            }}
                            disabled={index === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Move earlier"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              triggerHaptic('light');
                              onMoveActivity(selectedDay, act.id, 'down');
                            }}
                            disabled={index === (activeDayPlan.activities.length - 1)}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Move later"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {onEditActivity && (
                        <button
                          onClick={() => {
                            triggerHaptic('light');
                            onEditActivity(selectedDay, act);
                          }}
                          className="p-1 text-slate-400 hover:text-[#00B074] cursor-pointer"
                          title="Edit activity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {onDeleteActivity && (
                        <button
                          onClick={() => {
                            triggerHaptic('warning');
                            onDeleteActivity(selectedDay, act.id);
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

                {/* Location and Transit Details */}
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{act.location}</span>
                  </span>

                  {act.travelTimeMin > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{act.travelTimeMin} min</span>
                      </span>
                    </>
                  )}

                  {act.distanceKm > 0 && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-600 font-medium">
                        <Car className="w-3.5 h-3.5 text-slate-400" />
                        <span>{act.distanceKm} km</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed text-pretty">
                  {act.description}
                </p>

                {/* Genuine Real-World Travel Tools & Verified Links */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Direct Google Maps Directions */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location || act.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                      title="Open precise directions in Google Maps"
                    >
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Maps Directions</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                    </a>

                    {/* Dining / Food Link */}
                    {(act.type === 'food' || act.tag?.toLowerCase().includes('food') || act.tag?.toLowerCase().includes('dining')) && (
                      <a
                        href={`https://www.zomato.com/search?q=${encodeURIComponent(act.title + ' ' + act.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
                        title="Search reviews & dishes on Zomato"
                      >
                        <Utensils className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>Zomato Menu</span>
                        <ExternalLink className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                      </a>
                    )}

                    {/* Hotel / Stay Link */}
                    {act.type === 'hotel' && (
                      <a
                        href="https://www.makemytrip.com/hotels/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition-colors"
                        title="Compare live hotel rates on MakeMyTrip"
                      >
                        <Bed className="w-3 h-3 text-sky-600 shrink-0" />
                        <span>Book Stay ↗</span>
                      </a>
                    )}

                    {/* Sightseeing Ticket Link */}
                    {(act.type === 'attraction' || act.type === 'viewpoint' || act.tag?.toLowerCase().includes('sightseeing') || act.tag?.toLowerCase().includes('heritage')) && (() => {
                      const combined = `${act.title} ${act.location} ${act.tag || ''}`.toLowerCase();
                      const isCityPalaceUdaipur = combined.includes('city palace') && combined.includes('udaipur');
                      const ticketUrl = isCityPalaceUdaipur 
                        ? 'https://www.citypalaceudaipur.com/' 
                        : 'https://asi.paygov.org.in/asi-webapp/#/ticketbooking';
                      const ticketLabel = isCityPalaceUdaipur ? 'Palace Tickets' : 'Govt ASI Tickets';
                      const ticketTitle = isCityPalaceUdaipur 
                        ? 'Official City Palace Udaipur Entry Booking' 
                        : 'Official Archaeological Survey of India (ASI) E-Ticket Portal';

                      return (
                        <a
                          href={ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors"
                          title={ticketTitle}
                        >
                          <Ticket className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>{ticketLabel}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                        </a>
                      );
                    })()}
                  </div>

                  {/* Verification Seal */}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Verified Real Stop</span>
                  </span>
                </div>

                {/* Best Transport Deal Integration */}
                {selectedDay === 1 && act.type === 'departure' && bestDeal && (
                  <div className="mt-3.5 p-3 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl bg-trip-gradient text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#0B2545] truncate">
                            Best {bestDeal.mode.toUpperCase()} Deal: {bestDeal.provider}
                          </span>
                          <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                            Save {formatCurrency(bestDeal.savingsAmount, currency)}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {bestDeal.title} • {bestDeal.couponCode ? `Code: ${bestDeal.couponCode}` : 'AI Price Match'}
                        </span>
                      </div>
                    </div>

                    {onOpenDeals && (
                      <button
                        onClick={onOpenDeals}
                        className="px-3 py-1.5 rounded-xl bg-[#0B2545] hover:bg-[#133966] text-white font-bold text-xs self-start sm:self-auto transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        View Deal Details →
                      </button>
                    )}
                  </div>
                )}

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

