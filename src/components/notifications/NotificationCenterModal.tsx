import React, { useState, useEffect } from 'react';
import { Trip } from '../../types/trip';
import { TripNotification, TripCountdownInfo } from '../../types/notification';
import { 
  generateNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  calculateCountdown 
} from '../../services/notificationService';
import { 
  Bell, 
  X, 
  Clock, 
  CloudSun, 
  Luggage, 
  Tag, 
  ShieldAlert, 
  CheckCheck, 
  ArrowRight,
  Sparkles,
  PlaneTakeoff
} from 'lucide-react';

interface NotificationCenterModalProps {
  trips: Trip[];
  activeTrip?: Trip;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTarget: (target: string, tripId?: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  trips,
  activeTrip,
  isOpen,
  onClose,
  onNavigateToTarget
}) => {
  const [notifications, setNotifications] = useState<TripNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'alerts'>('all');
  const [countdown, setCountdown] = useState<TripCountdownInfo | null>(null);

  const hasUpcomingActiveTrip = !!(activeTrip && activeTrip.status === 'upcoming' && activeTrip.isUserCreated);

  // Refresh notifications when opened
  useEffect(() => {
    if (isOpen) {
      const notifs = generateNotifications(trips, activeTrip);
      setNotifications(notifs);
    }
  }, [isOpen, trips, activeTrip]);

  // Real-time ticking seconds countdown
  useEffect(() => {
    if (!isOpen || !hasUpcomingActiveTrip || !activeTrip) {
      setCountdown(null);
      return;
    }

    setCountdown(calculateCountdown(activeTrip));
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(activeTrip));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, activeTrip]);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    markAllNotificationsAsRead(unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleItemClick = (notif: TripNotification) => {
    markNotificationAsRead(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    if (notif.actionTarget) {
      onNavigateToTarget(notif.actionTarget, notif.tripId);
      onClose();
    }
  };

  const getNotificationIcon = (type: TripNotification['type']) => {
    switch (type) {
      case 'countdown':
        return <PlaneTakeoff className="w-5 h-5 text-emerald-600" />;
      case 'weather_alert':
        return <CloudSun className="w-5 h-5 text-amber-500" />;
      case 'packing':
        return <Luggage className="w-5 h-5 text-indigo-500" />;
      case 'deal':
        return <Tag className="w-5 h-5 text-rose-500" />;
      case 'disruption':
        return <ShieldAlert className="w-5 h-5 text-red-600" />;
      case 'system':
      default:
        return <Sparkles className="w-5 h-5 text-teal-600" />;
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'alerts') return n.type === 'weather_alert' || n.type === 'disruption';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-[#E2EBE1] overflow-hidden">
        
        {/* Header */}
        <div className="shrink-0 px-6 py-4 sm:py-5 border-b border-[#E2EBE1] flex items-center justify-between gap-4 bg-[#F4F6F2]">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl bg-[#EAF0E9] text-[#2D5A3D] flex items-center justify-center shadow-xs">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-[#152A1C] tracking-tight">
                Notification & Countdown Hub
              </h2>
              <p className="text-xs text-[#5A7362] font-medium">
                Trip countdowns and planning reminders; no live flight or road tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-[#152A1C] hover:bg-[#EAF0E9] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LIVE CARD: EITHER ACTIVE UPCOMING COUNTDOWN OR FRESH USER ONBOARDING BANNER */}
        {hasUpcomingActiveTrip && countdown && !countdown.isPast && activeTrip ? (
          <div className="shrink-0 mx-4 sm:mx-6 mt-4 sm:mt-5 mb-3 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#152A1C] via-[#1E3E2B] to-[#2D5A3D] text-white shadow-lg relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.8 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Next Departure Countdown</span>
              </span>
              <span className="text-xs text-slate-300 truncate max-w-[200px]">
                {activeTrip.destination}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center my-2">
              <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="block text-2xl sm:text-3xl font-extrabold font-display text-emerald-400">
                  {String(countdown.daysRemaining).padStart(2, '0')}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Days</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="block text-2xl sm:text-3xl font-extrabold font-display text-white">
                  {String(countdown.hoursRemaining).padStart(2, '0')}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Hours</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="block text-2xl sm:text-3xl font-extrabold font-display text-white">
                  {String(countdown.minutesRemaining).padStart(2, '0')}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Mins</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="block text-2xl sm:text-3xl font-extrabold font-display text-amber-300 animate-pulse">
                  {String(countdown.secondsRemaining).padStart(2, '0')}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Secs</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 mt-2 flex items-center justify-between">
              <span className="truncate max-w-[180px]">{activeTrip.name}</span>
              <button
                onClick={() => {
                  onNavigateToTarget('itinerary', activeTrip.id);
                  onClose();
                }}
                className="text-emerald-300 hover:text-emerald-200 font-bold underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Itinerary</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </p>
          </div>
        ) : (
          <div className="shrink-0 mx-4 sm:mx-6 mt-4 sm:mt-5 mb-3 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#152A1C] via-[#1E3E2B] to-[#2D5A3D] text-white shadow-lg relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 bg-[#2D5A3D]/20 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>TripVerse Co-Pilot Ready</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-400/80 bg-emerald-950/60 px-2 py-0.5 rounded-full">
                Planning tools only
              </span>
            </div>

            <h4 className="text-base font-bold text-white mb-1">
              Start Planning Your Journey
            </h4>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Draft road trips with estimated schedules and map listings when available. Confirm stops and facilities before travelling.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onNavigateToTarget('plan');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/30 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Plan A Trip Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  onNavigateToTarget('breakstops');
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-all border border-white/10 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Explore Pitstops</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills & Mark All Read */}
        <div className="shrink-0 px-6 py-2.5 sm:py-3 bg-slate-50 border-y border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'unread'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('alerts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'alerts'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Alerts
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold text-[#2D5A3D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
              <p className="text-xs font-semibold">
                {notifications.length === 0 ? "No notifications. You're all caught up." : "No notifications in this filter"}
              </p>
            </div>
          ) : (
            filteredNotifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 group ${
                  notif.read
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-300 shadow-xs'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                  notif.read ? 'bg-slate-100' : 'bg-white shadow-xs'
                }`}>
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className={`text-xs sm:text-sm font-bold truncate ${
                        notif.read ? 'text-slate-700' : 'text-slate-900'
                      }`}>
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      {notif.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.actionLabel && (
                    <div className="mt-2.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2D5A3D] group-hover:underline">
                        <span>{notif.actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
