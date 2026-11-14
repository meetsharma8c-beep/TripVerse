import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ChevronRight, ChevronLeft, Share2, Check, Globe, MapPin, Compass, Crown, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { triggerHaptic } from '../../services/deviceService';
import { computeTravelWrapped, generateWrappedSocialText, TravelWrappedStats } from '../../services/travelWrappedService';
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
        // Trigger celebratory confetti on last recap slide
        try {
          confetti({
            particleCount: 80,
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

  const modalMarkup = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md h-[580px] bg-gradient-to-b from-[#0A1610] via-[#10291D] to-[#07130D] border-2 border-emerald-500/40 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] overflow-hidden text-white flex flex-col justify-between p-6 select-none"
      >
        {/* Story Progress Indicators at the top */}
        <div className="flex items-center gap-1.5 w-full">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                idx <= currentSlide ? 'bg-amber-400' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-all cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Slide Contents */}
        <div className="flex-1 flex flex-col justify-center items-center text-center px-2 py-4 animate-in fade-in zoom-in-95 duration-200">
          {currentSlide === 0 && (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-2xl shadow-xl shadow-amber-500/30 mx-auto animate-bounce">
                ✨
              </div>
              <span className="text-xs uppercase font-mono tracking-widest text-emerald-400 font-bold block">
                TripVerse Wrapped • {stats.year}
              </span>
              <h2 className="text-3xl font-black text-white leading-tight">
                Your Year in <span className="text-amber-300">Wanderlust</span>
              </h2>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                You didn't just stay in one place this year. Let's look back at every flight, mountain ridge, and skyline you conquered.
              </p>
            </div>
          )}

          {currentSlide === 1 && (
            <div className="space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 mx-auto">
                <Globe className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Total Ground Covered</span>
                <div className="text-4xl font-extrabold text-amber-300 my-1 font-mono">
                  ~{stats.totalKmTraveled.toLocaleString()} km
                </div>
                <p className="text-xs text-emerald-300 font-semibold">
                  That's over {Math.round(stats.totalKmTraveled / 400)}% of the Earth's circumference!
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-around text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cities</span>
                  <span className="text-lg font-bold text-white">{stats.citiesExplored.length}</span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Countries</span>
                  <span className="text-lg font-bold text-emerald-400">{stats.countriesVisited.length}</span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <span className="text-[10px] text-slate-400 block">Days Traveled</span>
                  <span className="text-lg font-bold text-amber-300">{stats.totalDaysTraveled}</span>
                </div>
              </div>
            </div>
          )}

          {currentSlide === 2 && (
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 mx-auto">
                <Trophy className="w-7 h-7" />
              </div>
              <span className="text-xs font-mono uppercase text-amber-400 tracking-wider">Your Top Crown Landmark</span>
              <h3 className="text-2xl font-black text-white">
                {stats.topLandmark}
              </h3>
              <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                Out of all the monuments and scenic overlooks on your journey, this was your most unforgettable anchor spot.
              </p>
            </div>
          )}

          {currentSlide === 3 && (
            <div className="space-y-4">
              <div className="text-5xl animate-pulse">
                {stats.travelerArchetype.badge}
              </div>
              <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Your Travel Archetype</span>
              <h3 className="text-2xl font-black text-amber-300">
                {stats.travelerArchetype.title}
              </h3>
              <p className="text-xs text-slate-200 max-w-xs mx-auto leading-relaxed">
                {stats.travelerArchetype.description}
              </p>
              {stats.isFounder && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-[11px] shadow-md">
                  <Crown className="w-3.5 h-3.5 fill-amber-950" />
                  <span>VIP FOUNDER STATUS</span>
                </div>
              )}
            </div>
          )}

          {currentSlide === 4 && (
            <div className="space-y-4 w-full">
              <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/80 to-black border border-amber-400/40 text-left space-y-3 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{stats.travelerArchetype.badge}</span>
                    <span className="text-xs font-black text-amber-300 font-mono tracking-wider">
                      {stats.travelerArchetype.title.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    {stats.year} RECAP
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Distance</span>
                    <span className="font-bold text-white">~{stats.totalKmTraveled.toLocaleString()} km</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Duration</span>
                    <span className="font-bold text-white">{stats.totalDaysTraveled} Days</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Top Spot</span>
                    <span className="font-bold text-amber-200 truncate block">{stats.topLandmark}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Countries</span>
                    <span className="font-bold text-emerald-300">{stats.countriesVisited.join(', ')}</span>
                  </div>
                </div>

                <div className="text-[9px] font-mono text-slate-400 pt-1 text-center">
                  trip-verse.com • ConCode Cosmos
                </div>
              </div>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleShare}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98"
              >
                {copied ? <Check className="w-4 h-4 text-slate-950" /> : <Share2 className="w-4 h-4 text-slate-950" />}
                <span>{copied ? 'Story Card Copied to Clipboard!' : 'Share to Instagram / WhatsApp / X'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className="text-[11px] font-mono text-slate-400">
            {currentSlide + 1} of {totalSlides}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentSlide === totalSlides - 1}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
