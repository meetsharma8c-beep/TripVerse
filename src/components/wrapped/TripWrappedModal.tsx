import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Share2, 
  Check, 
  Globe, 
  MapPin, 
  Compass, 
  Crown, 
  Trophy,
  Mountain,
  Landmark,
  Building2,
  Calendar,
  ShieldCheck,
  Plane,
  Navigation
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { triggerHaptic } from '../../services/deviceService';
import { 
  computeTravelWrapped, 
  generateWrappedSocialText, 
  TravelWrappedStats 
} from '../../services/travelWrappedService';
import { Trip } from '../../types/trip';

interface TripWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  userEmail?: string;
}

export const TripWrappedModal: React.FC<TripWrappedModalProps> = ({
  isOpen,
  onClose,
  trips,
  userEmail
}) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [stats] = useState<TravelWrappedStats>(() => computeTravelWrapped(trips, userEmail));
  const [copied, setCopied] = useState<boolean>(false);

  useModalBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const totalSlides = 5;

  const handleNext = () => {
    triggerHaptic('light');
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
      if (currentSlide === totalSlides - 2) {
        try {
          confetti({
            particleCount: 75,
            spread: 70,
            origin: { y: 0.6 },
            colors: [stats.travelerArchetype.themeColor, '#D4AF37', '#10B981']
          });
        } catch {}
      }
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleShare = () => {
    triggerHaptic('medium');
    const text = generateWrappedSocialText(stats);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const renderArchetypeIcon = (className = 'w-8 h-8') => {
    switch (stats.travelerArchetype.iconName) {
      case 'crown':
        return <Crown className={className} />;
      case 'mountain':
        return <Mountain className={className} />;
      case 'landmark':
        return <Landmark className={className} />;
      case 'building':
        return <Building2 className={className} />;
      default:
        return <Compass className={className} />;
    }
  };

  const modalMarkup = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md h-[590px] bg-gradient-to-b from-[#0B1712] via-[#0E2018] to-[#07110C] border-2 border-emerald-500/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden text-white flex flex-col justify-between p-6 select-none"
      >
        {/* Top Story Progress Indicators */}
        <div className="flex items-center gap-1.5 w-full">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                idx <= currentSlide ? 'bg-amber-400' : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-all cursor-pointer z-10 border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Slide Contents */}
        <div className="flex-1 flex flex-col justify-center items-center text-center px-2 py-4 animate-in fade-in zoom-in-95 duration-200">
          {currentSlide === 0 && (
            <div className="space-y-4 max-w-xs mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-xl shadow-amber-500/30 mx-auto">
                <Sparkles className="w-8 h-8 fill-slate-950 text-slate-950" />
              </div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold block">
                ANNUAL TRAVEL RETROSPECTIVE • {stats.year}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight font-sans">
                Your Year in <span className="text-amber-300">Expedition</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                A definitive audit of the aerial mileage, cross-border frontiers, and cultural landmarks you traversed throughout the year.
              </p>
              <div className="pt-2">
                <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-amber-200 uppercase tracking-wider">
                  Verified Executive Dossier
                </span>
              </div>
            </div>
          )}

          {currentSlide === 1 && (
            <div className="space-y-4 w-full max-w-xs mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 mx-auto">
                <Navigation className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block">
                  Ground & Airspace Traversed
                </span>
                <div className="text-3xl sm:text-4xl font-extrabold text-amber-300 my-1 font-mono">
                  ~{stats.totalKmTraveled.toLocaleString()} km
                </div>
                <p className="text-xs text-emerald-300 font-semibold font-mono">
                  Equivalent to {Math.round((stats.totalKmTraveled / 40075) * 100)}% of Earth&apos;s equatorial circumference
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-around text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Cities</span>
                  <span className="text-base font-bold text-white">{stats.citiesExplored.length}</span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Territories</span>
                  <span className="text-base font-bold text-emerald-400">{stats.countriesVisited.length}</span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase">Days Away</span>
                  <span className="text-base font-bold text-amber-300">{stats.totalDaysTraveled}</span>
                </div>
              </div>
            </div>
          )}

          {currentSlide === 2 && (
            <div className="space-y-4 max-w-xs mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider block">
                Signature Anchor Destination
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white font-sans">
                {stats.topLandmark}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Of all the architectural monuments, alpine passes, and coastal vistas logged on your itineraries, this was your foremost geographic anchor.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>VERIFIED ITINERARY RECORD</span>
              </div>
            </div>
          )}

          {currentSlide === 3 && (
            <div className="space-y-4 max-w-xs mx-auto">
              <div 
                className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-xl"
                style={{
                  backgroundColor: `${stats.travelerArchetype.themeColor}25`,
                  color: stats.travelerArchetype.themeColor,
                  border: `2px solid ${stats.travelerArchetype.themeColor}60`
                }}
              >
                {renderArchetypeIcon('w-8 h-8')}
              </div>
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider block">
                  Traveler Archetype
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-amber-300 font-sans mt-0.5">
                  {stats.travelerArchetype.title}
                </h3>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">
                {stats.travelerArchetype.description}
              </p>
              {stats.isFounder && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] shadow-md tracking-wider">
                  <Crown className="w-3 h-3 fill-slate-950" />
                  <span>VIP FOUNDER STATUS • LIFETIME ACCESS</span>
                </div>
              )}
            </div>
          )}

          {currentSlide === 4 && (
            <div className="space-y-4 w-full">
              {/* Executive Summary Card */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-950/90 via-black to-slate-950 border border-amber-400/40 text-left space-y-3 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        backgroundColor: `${stats.travelerArchetype.themeColor}30`,
                        color: stats.travelerArchetype.themeColor
                      }}
                    >
                      {renderArchetypeIcon('w-4 h-4')}
                    </div>
                    <span className="text-xs font-black text-amber-300 font-mono tracking-wider">
                      {stats.travelerArchetype.title.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold border border-emerald-500/30 px-1.5 py-0.5 rounded">
                    {stats.year} DOSSIER
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">Ground Traversed</span>
                    <span className="font-bold text-white text-xs">~{stats.totalKmTraveled.toLocaleString()} km</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">Total Days</span>
                    <span className="font-bold text-white text-xs">{stats.totalDaysTraveled} Days</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">Signature Spot</span>
                    <span className="font-bold text-amber-200 truncate block text-xs">{stats.topLandmark}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase">Territories</span>
                    <span className="font-bold text-emerald-300 truncate block text-xs">{stats.countriesVisited.join(', ')}</span>
                  </div>
                </div>

                <div className="text-[8px] font-mono text-slate-400 pt-1 text-center border-t border-white/5 uppercase tracking-widest">
                  DOCUMENT NO. TVR-{stats.year}-WRAP • TRIP-VERSE.COM
                </div>
              </div>

              {/* Share Action Button */}
              <button
                type="button"
                onClick={handleShare}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98 tracking-wider uppercase font-mono"
              >
                {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Share2 className="w-4 h-4 text-slate-950" />}
                <span>{copied ? 'Retrospective Dossier Copied' : 'Export & Share Dossier'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Carousel Navigation Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 disabled:opacity-25 disabled:pointer-events-none cursor-pointer transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Slide {currentSlide + 1} / {totalSlides}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlide === totalSlides - 1}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-25 disabled:pointer-events-none cursor-pointer transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalMarkup, document.body)
    : modalMarkup;
};
