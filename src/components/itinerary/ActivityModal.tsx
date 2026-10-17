import React, { useState, useEffect } from 'react';
import { ItineraryActivity } from '../../types/trip';
import { triggerHaptic } from '../../services/deviceService';
import { getStoredCurrency, Currency } from '../../services/currencyService';
import { Clock, MapPin, Tag, Plus, Check, Coins, X } from 'lucide-react';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayNumber: number;
  existingActivity?: ItineraryActivity | null;
  onSave: (dayNumber: number, activity: Partial<ItineraryActivity>) => void;
}

export function ActivityModal({
  isOpen,
  onClose,
  dayNumber,
  existingActivity,
  onSave
}: ActivityModalProps) {
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency());
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('11:00 AM');
  const [type, setType] = useState<ItineraryActivity['type']>('attraction');
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState('300');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('Sightseeing');

  useEffect(() => {
    const handleCurrency = () => setCurrency(getStoredCurrency());
    window.addEventListener('tripverse_currency_change', handleCurrency);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrency);
  }, []);

  useEffect(() => {
    if (existingActivity) {
      setTitle(existingActivity.title);
      setTime(existingActivity.time);
      setType(existingActivity.type);
      setLocation(existingActivity.location);
      setCost(existingActivity.estimatedCost.toString());
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
  }, [existingActivity, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;

    triggerHaptic('success');
    onSave(dayNumber, {
      id: existingActivity ? existingActivity.id : `act-custom-${Date.now()}`,
      dayNumber,
      title: title.trim(),
      time,
      type,
      location: location.trim(),
      estimatedCost: parseFloat(cost) || 0,
      description: description.trim() || 'Custom planned waypoint added by traveler.',
      tag,
      isCustom: true
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl border border-[#E2EBE1] flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#152A1C] to-[#1E3E2B] text-white flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300">
              Itinerary Customization
            </span>
            <h3 className="text-lg font-bold font-display mt-0.5">
              {existingActivity ? 'Edit Activity' : `Add Activity to Day ${dayNumber}`}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Explore Kumbhalgarh Fort Wall"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-[#2D5A3D] focus:border-[#2D5A3D] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
              <div className="relative">
                <input
                  type="text"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  placeholder="e.g. 10:30 AM"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none"
                />
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Category</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="attraction">Attraction / Fort</option>
                <option value="food">Food & Dining</option>
                <option value="viewpoint">Scenic Viewpoint</option>
                <option value="breakstop">Highway Breakstop</option>
                <option value="hotel">Hotel Check-in</option>
                <option value="nightlife">Evening / Nightlife</option>
                <option value="rest">Rest & Relaxation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Location / Landmark *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g., Lake Pichola Ghat"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none"
                  required
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Cost ({currency})</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="e.g., 500"
                  value={cost}
                  onChange={e => setCost(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none"
                />
                <Coins className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Highlight Tag</label>
            <div className="flex items-center gap-2 flex-wrap">
              {['Culture', 'Sightseeing', 'Food', 'Sunset', 'Adventure', 'Shopping', 'Heritage'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    tag === t
                      ? 'bg-[#2D5A3D] text-white shadow-xs'
                      : 'bg-[#F4F6F2] text-[#5A7362] border border-[#E2EBE1] hover:bg-[#EAF0E9]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes & Description</label>
            <textarea
              rows={2}
              placeholder="Key tips: carry ID card, evening entry starts 6:30 PM, parking available..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-[#2D5A3D] focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{existingActivity ? 'Update Activity' : 'Add to Schedule'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
