import { useModalBehavior } from '../../hooks/useModalBehavior';
import React, { useState, useEffect, useMemo } from 'react';
import { ItineraryActivity } from '../../types/trip';
import { triggerHaptic } from '../../services/deviceService';
import { getStoredCurrency, Currency } from '../../services/currencyService';
import { useLanguage } from '../../services/languageService';
import { getDestinationHighlights, resolveLandmarkCoordinates } from '../../services/landmarkAtlasService';
import { resolvePreciseLocationSync } from '../../services/locationService';
import { Clock, MapPin, Check, Coins, X, Sparkles, AlertCircle } from 'lucide-react';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  existingActivity?: ItineraryActivity | null;
  onSave: (dayNumber: number, activity: Partial<ItineraryActivity>) => void;
  destination?: string;
}

export function ActivityModal({
  isOpen,
  onClose,
  dayNumber,
  existingActivity,
  onSave,
  destination
}: ActivityModalProps) {
  const { t } = useLanguage();
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency());
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('11:00 AM');
  const [type, setType] = useState<ItineraryActivity['type']>('attraction');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('300');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('Sightseeing');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const handleCurrency = () => setCurrency(getStoredCurrency());
    window.addEventListener('tripverse_currency_change', handleCurrency);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrency);
  }, []);

  const [prevOpen, setPrevOpen] = useState(isOpen);
  const [prevActivityId, setPrevActivityId] = useState(existingActivity?.id);

  if (isOpen !== prevOpen || existingActivity?.id !== prevActivityId) {
    setPrevOpen(isOpen);
    setPrevActivityId(existingActivity?.id);
    setFormError(null);
    if (existingActivity) {
      setTitle(existingActivity.title);
      setTime(existingActivity.time);
      setType(existingActivity.type);
      setLocation(existingActivity.location);
      setCost(String(Math.max(0, existingActivity.estimatedCost || 0)));
      setDescription(existingActivity.description);
      setTag(existingActivity.tag || 'Custom');
    } else {
      setTitle('');
      setTime('11:00 AM');
      setType('attraction');
      setLocation('');
      setCost('350');
      setDescription('');
      setTag('Sightseeing');
    }
  }

  useModalBehavior(isOpen, onClose);

  const destinationHighlights = useMemo(() => {
    if (!destination) return [];
    return getDestinationHighlights(destination, 10);
  }, [destination]);

  const handleQuickSelectHighlight = (highlight: string) => {
    triggerHaptic('light');
    setFormError(null);
    setTitle(highlight);
    setLocation(destination ? `${highlight}, ${destination}` : highlight);
    setType('attraction');
    setTag('Destination Highlight');
    setDescription(`Must-visit local landmark and cultural experience in ${destination || 'this region'}.`);
    setCost('200');
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanLocation = location.trim() || (destination ? destination.trim() : '');
    if (!cleanTitle) {
      setFormError('Please enter an activity title.');
      return;
    }
    if (!cleanLocation) {
      setFormError('Please enter a location or landmark.');
      return;
    }
    const parsedCost = Number(cost);
    if (cost.trim() !== '' && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      setFormError('Estimated cost cannot be negative.');
      return;
    }

    const safeCost = Math.max(0, Math.round(Number.isFinite(parsedCost) ? parsedCost : 0));
    const baseCoords = existingActivity?.coordinates
      || (destination ? resolvePreciseLocationSync(destination).coordinates : { lat: 28.6139, lng: 77.2090 });
    const resolvedCoords = existingActivity && existingActivity.title === cleanTitle && existingActivity.coordinates
      ? existingActivity.coordinates
      : resolveLandmarkCoordinates(cleanTitle, baseCoords);

    triggerHaptic('success');
    onSave(dayNumber, {
      id: existingActivity ? existingActivity.id : `act-custom-${Date.now()}`,
      dayNumber,
      title: cleanTitle,
      time: time.trim() || '11:00 AM',
      type,
      location: cleanLocation,
      estimatedCost: safeCost,
      description: description.trim() || 'Custom planned waypoint added by traveler.',
      tag,
      coordinates: resolvedCoords,
      isCustom: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-elevated liquid-rim rounded-[32px] w-full max-w-lg overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#152A1C] to-[#1E3E2B] text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
              {t('Itinerary Customization')}
            </span>
            <h3 className="text-lg font-bold font-display mt-0.5">
              {existingActivity ? t('Edit Activity') : `${t('Add Activity')} (${t('Day')} ${dayNumber})`}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
            aria-label={t('Close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {formError && (
            <div role="alert" className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Quick-Pick Destination Highlights */}
          {destinationHighlights.length > 0 && !existingActivity && (
            <div className="p-3 bg-[#EAF0E9]/80 dark:bg-emerald-950/40 rounded-2xl border border-[#DCE7DB] dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#2D5A3D] dark:text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick-Pick from {destination} Sights:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {destinationHighlights.map((hl) => (
                  <button
                    key={hl}
                    type="button"
                    onClick={() => handleQuickSelectHighlight(hl)}
                    className="min-h-0 px-2.5 py-1 rounded-lg bg-white/90 dark:bg-slate-800 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 border border-[#DCE7DB] dark:border-slate-700 text-xs font-medium text-[#152A1C] dark:text-slate-200 transition-colors text-left truncate max-w-full cursor-pointer"
                  >
                    + {hl}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#152A1C] dark:text-slate-200 mb-1">{t('Activity Title')} *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="e.g., Explore Kumbhalgarh Fort Wall"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900 border border-[#DCE7DB] dark:border-slate-700 text-sm font-medium text-[#152A1C] dark:text-white focus:ring-2 focus:ring-[#2D5A3D] focus:border-[#2D5A3D] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#152A1C] dark:text-slate-200 mb-1">{t('Time')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="e.g. 10:30 AM"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900 border border-[#DCE7DB] dark:border-slate-700 text-xs font-medium text-[#152A1C] dark:text-white focus:outline-none"
                />
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#152A1C] dark:text-slate-200 mb-1">{t('Activity Category')}</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-[#DCE7DB] dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-xs font-medium text-[#152A1C] dark:text-white focus:outline-none"
              >
                <option value="attraction">{t('Attraction / Fort')}</option>
                <option value="food">{t('Food & Dining')}</option>
                <option value="viewpoint">{t('Scenic Viewpoint')}</option>
                <option value="breakstop">{t('Highway Breakstop')}</option>
                <option value="hotel">{t('Hotel Check-in')}</option>
                <option value="nightlife">{t('Evening / Nightlife')}</option>
                <option value="rest">{t('Rest & Relaxation')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#152A1C] dark:text-slate-200 mb-1">{t('Location / Landmark')} *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Lake Pichola Ghat"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#DCE7DB] dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-xs text-[#152A1C] dark:text-white focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none"
                  required
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#152A1C] dark:text-slate-200 mb-1">{t('Estimated Cost')} ({currency})</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={10}
                  placeholder="e.g., 500"
                  value={cost}
                  onChange={(e) => {
                    setCost(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#DCE7DB] dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-xs font-bold text-[#152A1C] dark:text-white focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none"
                />
                <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#152A1C] dark:text-slate-200 mb-1">{t('Highlight Tag')}</label>
            <div className="flex items-center gap-2 flex-wrap">
              {['Culture', 'Sightseeing', 'Food', 'Sunset', 'Adventure', 'Shopping', 'Heritage'].map((tagItem) => (
                <button
                  key={tagItem}
                  type="button"
                  onClick={() => setTag(tagItem)}
                  className={`min-h-0 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    tag === tagItem
                      ? 'bg-[#2D5A3D] text-white shadow-xs'
                      : 'bg-[#F4F6F2] dark:bg-slate-800 text-[#5A7362] dark:text-slate-300 border border-[#E2EBE1] dark:border-slate-700 hover:bg-[#EAF0E9] dark:hover:bg-slate-700'
                  }`}
                >
                  {t(tagItem)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#152A1C] dark:text-slate-200 mb-1">{t('Notes & Description')}</label>
            <textarea
              rows={2}
              placeholder="Key tips: carry ID card, evening entry starts 6:30 PM, parking available..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-[#DCE7DB] dark:border-slate-700 bg-white/90 dark:bg-slate-900 text-xs text-[#152A1C] dark:text-white focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2EBE1] dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5A7362] dark:text-slate-300 hover:bg-[#EAF0E9]/60 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t('Cancel')}
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-full btn-liquid-primary text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{existingActivity ? t('Update Activity') : t('Add to Schedule')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
