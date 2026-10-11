import React, { useState } from 'react';
import { Trip, TripReview } from '../../types/trip';
import { saveTripReview } from '../../services/storageService';
import { 
  Star, 
  X, 
  Check, 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  Heart, 
  Wallet, 
  MapPin, 
  Award,
  Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TripReviewModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onSavedReview?: (review: TripReview) => void;
}

const HIGHLIGHT_OPTIONS = [
  'Breathtaking Scenery',
  'Authentic Regional Food',
  'Smooth Highway Roads',
  'Clean Restrooms & Break Stops',
  'Heritage Architecture',
  'Peaceful Nature Vibe',
  'Under Budget Savings',
  'Exciting Adventure Activities'
];

export const TripReviewModal: React.FC<TripReviewModalProps> = ({
  trip,
  isOpen,
  onClose,
  onSavedReview
}) => {
  const existingReview = trip.review;

  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [overallExperience, setOverallExperience] = useState<TripReview['overallExperience']>(
    existingReview?.overallExperience || 'exceptional'
  );
  const [highlights, setHighlights] = useState<string[]>(
    existingReview?.highlights || ['Breathtaking Scenery', 'Under Budget Savings']
  );
  const [wouldRecommend, setWouldRecommend] = useState<boolean>(
    existingReview?.wouldRecommend ?? true
  );
  const [budgetVerdict, setBudgetVerdict] = useState<TripReview['budgetVerdict']>(
    existingReview?.budgetVerdict || 'under_budget'
  );
  const [notes, setNotes] = useState<string>(
    existingReview?.notes || ''
  );
  const [favoriteSpot, setFavoriteSpot] = useState<string>(
    existingReview?.favoriteSpot || ''
  );

  if (!isOpen) return null;

  const handleToggleHighlight = (tag: string) => {
    setHighlights(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 5: return 'Exceptional Expedition!';
      case 4: return 'Great Experience & Memories';
      case 3: return 'Good Journey with Few Gaps';
      case 2: return 'Challenging or Delayed';
      case 1: return 'Poor Route Experience';
      default: return '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const reviewData: TripReview = {
      id: existingReview?.id || `rev-${Date.now()}`,
      tripId: trip.id,
      rating,
      overallExperience,
      highlights,
      wouldRecommend,
      budgetVerdict,
      notes: notes.trim() || 'Wonderful journey with well-planned break stops and scenic viewpoints.',
      reviewedAt: new Date().toISOString(),
      favoriteSpot: favoriteSpot.trim() || trip.destination.split(',')[0]
    };

    saveTripReview(trip.id, reviewData);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#2D5A3D', '#10B981']
      });
    } catch {
      // safe fallback
    }

    if (onSavedReview) {
      onSavedReview(reviewData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200/90 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-gradient-to-r from-amber-50/60 via-emerald-50/30 to-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Post-Trip Review
              </span>
              <h2 className="text-xl font-bold font-display text-[#0B2545] tracking-tight truncate">
                Rate Your Trip Experience
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Trip Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">{trip.origin} →</span>
              <h3 className="text-sm font-bold text-[#0B2545] truncate">{trip.name}</h3>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
              {trip.durationDays} Days • {trip.travelersCount} Travelers
            </span>
          </div>

          {/* Star Rating Section */}
          <div className="text-center space-y-2 py-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Overall Trip Rating
            </label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const active = (hoverRating !== null ? hoverRating : rating) >= starVal;
                return (
                  <button
                    key={starVal}
                    type="button"
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(starVal)}
                    className="p-1 rounded-xl hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                    aria-label={`Rate ${starVal} stars`}
                  >
                    <Star
                      className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                        active
                          ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-sm font-bold text-amber-600">
              {getRatingLabel(hoverRating !== null ? hoverRating : rating)}
            </p>
          </div>

          {/* Experience Feeling Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              How did the journey feel overall?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'exceptional', label: 'Exceptional' },
                { id: 'delightful', label: 'Delightful' },
                { id: 'average', label: 'Average' },
                { id: 'challenging', label: 'Challenging' },
              ].map((exp) => (
                <button
                  key={exp.id}
                  type="button"
                  onClick={() => setOverallExperience(exp.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                    overallExperience === exp.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {exp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Highlights Tag Cloud */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Key Highlights & Memorable Elements
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HIGHLIGHT_OPTIONS.map((tag) => {
                const selected = highlights.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleHighlight(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer ${
                      selected
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-emerald-600" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Budget Accuracy Verdict */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Budget Accuracy Verdict
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'under_budget', label: 'Under Budget', desc: 'Saved cash' },
                { id: 'on_budget', label: 'Spot On', desc: 'Matched plan' },
                { id: 'over_budget', label: 'Over Budget', desc: 'Extra spent' },
              ].map((verdict) => (
                <button
                  key={verdict.id}
                  type="button"
                  onClick={() => setBudgetVerdict(verdict.id as any)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    budgetVerdict === verdict.id
                      ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-800 block">{verdict.label}</span>
                  <span className="text-[10px] text-slate-500">{verdict.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Favorite Spot */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Favorite Spot / Viewpoint
            </label>
            <input
              type="text"
              placeholder="e.g. Sunset point on Lake Pichola, Anjuna cliff cafe"
              value={favoriteSpot}
              onChange={(e) => setFavoriteSpot(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#2D5A3D]"
            />
          </div>

          {/* Personal Traveler Notes & Advice */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Traveler Notes & Advice for Others
            </label>
            <textarea
              rows={3}
              placeholder="Share advice on road quality, food recommendations, or scenic stop tips..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#2D5A3D] resize-none"
            />
          </div>

          {/* Would you recommend toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Would you recommend this route & plan to friends?
              </span>
              <span className="text-[11px] text-slate-500">
                Helps optimize the AI recommendation engine
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  wouldRecommend
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Yes</span>
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  !wouldRecommend
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>No</span>
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Save & Publish Review</span>
          </button>

        </form>

      </div>
    </div>
  );
};
