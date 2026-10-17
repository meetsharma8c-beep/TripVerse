import React, { useEffect, useState } from 'react';
import { Destination, CurrencyCode } from '../../types/trip';
import { 
  X, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Wallet, 
  Star, 
  Bookmark, 
  Check, 
  Compass, 
  Car, 
  Utensils, 
  Clock, 
  Sun,
  Share2,
  ShieldCheck
} from 'lucide-react';
import { handleImageError } from '../../utils/destinationImages';
import { getActiveCurrency, formatCurrency } from '../../services/currencyService';
import { triggerHaptic } from '../../services/deviceService';

interface DestinationDetailModalProps {
  destination: Destination | null;
  isOpen: boolean;
  onClose: () => void;
  onPlanTrip: (destName: string) => void;
  isSaved?: boolean;
  onToggleSaved?: (id: string) => void;
}

// Destination culinary & highway highlights map
const DESTINATION_INSIDER_HIGHLIGHTS: Record<string, { food: string[]; highway: string; vibe: string }> = {
  udaipur: {
    food: ['Dal Baati Churma', 'Gatte ki Sabzi', 'Lal Maas', 'Kachori at Shastri Circle'],
    highway: 'NH-48 Golden Quadrilateral corridor from Ahmedabad (260 km, 4.5 hrs)',
    vibe: 'Romantic havelis, serene lakeside evenings, and Rajput heritage'
  },
  manali: {
    food: ['Siddu with Ghee', 'Kullu Trout Fish', 'Tudkiya Bhat', 'Himachali Dhaam'],
    highway: 'NH-3 via Kiratpur–Manali 4-lane expressway and Atal Tunnel route',
    vibe: 'Alpine pine forests, river rafting, snow valleys, and bohemian Old Manali cafes'
  },
  goa: {
    food: ['Goan Fish Curry Thali', 'Pork Vindaloo', 'Bebinca Cake', 'Poi Sandwich'],
    highway: 'NH-66 Coastal Highway via Konkan vista & Western Ghat passes',
    vibe: 'Golden palm beaches, Portuguese colonial villas, and beach shack sunsets'
  },
  jaipur: {
    food: ['Pyaaz Kachori', 'Ker Sangri', 'Ghevar at LMB', 'Rajasthani Thali at Chokhi Dhani'],
    highway: 'Delhi–Mumbai Expressway (NE4) & NH-48 (Fast 3.5 hr expressway drive)',
    vibe: 'Pink terracotta palaces, vibrant handicraft bazaars, and hilltop forts'
  },
  rishikesh: {
    food: ['Aloo Puri at Chotiwala', 'Ayurvedic Herbal Teas', 'Organic Smoothie Bowls', 'Garhwali Kaphuli'],
    highway: 'NH-58 Delhi–Haridwar–Rishikesh Expressway (approx 240 km, 4.5 hrs)',
    vibe: 'Yoga ashrams, Ganga Aarti sunset chants, and white-water river rafting'
  },
  varanasi: {
    food: ['Banarasi Kachori Jalebi', 'Tamatar Chaat', 'Malaiyo (Winter)', 'Blue Lassi'],
    highway: 'Purvanchal Expressway & NH-19 corridor',
    vibe: 'Spiritual Ganga Ghats, thousand-year-old silk alleys, and mesmerizing evening Aarti'
  },
  coorg: {
    food: ['Pandi Curry (Coorg Pork)', 'Kadambuttu (Rice Balls)', 'Bamboo Shoot Curry', 'Fresh Filter Coffee'],
    highway: 'Bangalore–Mysore Expressway to NH-275 scenic plantation drive (250 km, 5 hrs)',
    vibe: 'Misty coffee hills, cascading Abbey Falls, and lush Western Ghats greenery'
  },
  pondicherry: {
    food: ['French Croissants', 'Crepes at Cafe des Arts', 'Creole Fish Curry', 'Woodfired Pizza'],
    highway: 'East Coast Road (ECR) scenic ocean-hugging drive from Chennai (150 km, 3 hrs)',
    vibe: 'French Quarter pastel villas, Promenade beach walk, and Auroville serenity'
  }
};

export const DestinationDetailModal: React.FC<DestinationDetailModalProps> = ({
  destination,
  isOpen,
  onClose,
  onPlanTrip,
  isSaved = false,
  onToggleSaved
}) => {
  const [currency, setCurrency] = useState<CurrencyCode>(getActiveCurrency());
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handleCurrency = () => setCurrency(getActiveCurrency());
    window.addEventListener('tripverse_currency_change', handleCurrency);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrency);
  }, []);

  // Keyboard escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !destination) return null;

  const insider = DESTINATION_INSIDER_HIGHLIGHTS[destination.id.toLowerCase()] || {
    food: ['Local regional thali', 'Street food specialties', 'Authentic culinary treats'],
    highway: 'National Highway connectivity with wayside amenities',
    vibe: destination.tagline
  };

  const handleShare = () => {
    triggerHaptic('light');
    const shareText = `Explore ${destination.name}, ${destination.state} on TripVerse: ${destination.tagline}. Estimated budget from ${formatCurrency(destination.startBudget, currency)}/person.`;
    if (navigator.share) {
      navigator.share({
        title: `${destination.name} - TripVerse`,
        text: shareText,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] max-w-2xl w-full shadow-2xl border border-[#E2EBE1] overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Hero Header Media */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden shrink-0">
          <img
            src={destination.image}
            alt={destination.name}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

          {/* Top Bar Floating Controls */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-slate-800 shadow-sm">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{destination.rating} / 5.0</span>
                <span className="text-[10px] text-slate-500 font-semibold">({(Math.round(destination.rating * 540 + 420)).toLocaleString()} reviews)</span>
              </span>

              <span className="bg-emerald-500/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                {destination.category}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onToggleSaved && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onToggleSaved(destination.id);
                  }}
                  className={`p-2.5 rounded-full backdrop-blur-md transition-all shadow-md cursor-pointer ${
                    isSaved 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                      : 'bg-white/90 text-slate-700 hover:bg-white hover:text-[#2D5A3D]'
                  }`}
                  title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                </button>
              )}

              <button
                type="button"
                onClick={handleShare}
                className="p-2.5 rounded-full bg-white/90 text-slate-700 hover:bg-white hover:text-[#2D5A3D] backdrop-blur-md transition-all shadow-md cursor-pointer"
                title="Share Destination"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-all shadow-md cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Bottom Destination Meta */}
          <div className="absolute bottom-4 left-5 right-5 text-white z-10">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{destination.state}, India</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-display tracking-tight text-balance drop-shadow-md">
              {destination.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 line-clamp-1 font-medium drop-shadow-sm">
              {destination.tagline}
            </p>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 overscroll-contain touch-pan-y">

          {/* Key Facts Metric Strip */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 text-center">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Starting Budget</span>
              <span className="text-sm sm:text-base font-black text-[#2D5A3D] font-display truncate block">
                {formatCurrency(destination.startBudget, currency)}
              </span>
              <span className="text-[10px] text-slate-500">per traveler</span>
            </div>

            <div className="min-w-0 border-x border-slate-200 px-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Ideal Duration</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-800 font-display truncate block">
                {destination.recommendedDuration}
              </span>
              <span className="text-[10px] text-slate-500">recommended</span>
            </div>

            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Best Season</span>
              <span className="text-sm sm:text-base font-extrabold text-[#0B2545] font-display truncate block">
                {destination.bestTime}
              </span>
              <span className="text-[10px] text-slate-500">pleasant weather</span>
            </div>
          </div>

          {/* Destination Overview */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              About This Destination
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-pretty">
              {destination.description}
            </p>
          </div>

          {/* Transparent Price Decomposition & Trust Block */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[#2D5A3D]" />
                <span>Price Transparency & Inclusions</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                Zero Hidden Charges
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5 text-emerald-700">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>What's Included:</span>
                </span>
                <ul className="text-slate-600 space-y-1 pl-1 text-[11px]">
                  <li>• Verified 3-star/4-star Heritage stay recommendation</li>
                  <li>• FastTag expressway toll tariffs computation</li>
                  <li>• Recommended highway break stop dining costs</li>
                  <li>• Primary destination entry & parking estimates</li>
                </ul>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1">
                <span className="font-bold text-slate-700 block text-xs flex items-center gap-1.5 text-slate-500">
                  <X className="w-3.5 h-3.5 text-slate-400" />
                  <span>Excluded from Estimate:</span>
                </span>
                <ul className="text-slate-500 space-y-1 pl-1 text-[11px]">
                  <li>• Personal retail & handicraft shopping</li>
                  <li>• Fuel top-ups beyond computed route</li>
                  <li>• Optional extreme adventure sports</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium text-[11px]">
                TripVerse does not make or guarantee bookings. Prices and cancellation terms must be confirmed with the provider.
              </span>
            </div>
          </div>

          {/* Top Recommended Activities & Experiences */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Top Experiences & Sightseeing
              </h3>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {destination.popularActivities.length} Must-Visits
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {destination.popularActivities.map((activity, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#2D5A3D] flex items-center justify-center shrink-0 font-bold text-xs">
                    {idx + 1}
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate">
                    {activity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Highway & Road Trip Route Access */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0B2545]">
              <Car className="w-4 h-4 text-[#2D5A3D] shrink-0" />
              <span>Highway Route & Connectivity</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed text-pretty">
              {insider.highway}
            </p>
          </div>

          {/* Iconic Local Delicacies to Taste */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <Utensils className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Must-Try Local Food & Specialties</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {insider.food.map((dish, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-amber-200 text-amber-900 text-xs font-medium shadow-2xs"
                >
                  <Utensils className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>{dish}</span>
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Modal Sticky Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t border-[#E2EBE1] bg-white/95 backdrop-blur-md flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn-liquid-glass px-5 py-3 rounded-full text-slate-700 font-bold text-xs"
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('success');
              const destName = destination.name;
              onClose();
              onPlanTrip(destName);
            }}
            className="btn-liquid-primary flex-1 py-3.5 px-5 rounded-full text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>Plan {destination.name} Trip With AI</span>
          </button>
        </div>

      </div>
    </div>
  );
};
