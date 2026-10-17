import React, { useState } from 'react';
import { 
  Sparkles, 
  MapPin, 
  ShieldCheck, 
  Wallet, 
  ArrowRight, 
  Check, 
  X, 
  Navigation, 
  Coffee, 
  FileText,
  PlaneTakeoff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { setOnboardingCompleted } from '../../services/storageService';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPlanning: () => void;
}

const ONBOARDING_STEPS = [
  {
    stepNumber: 1,
    badge: 'AI Route & Stop Planner',
    title: 'Plan the Journey, Not Just the Hotel',
    description: 'TripVerse can suggest named places along a drive using map-provider data. Listings do not verify cleanliness, safety, opening hours, or availability.',
    icon: Sparkles,
    gradient: 'from-[#386B49] to-[#1E3E2B]',
    illustrationBg: 'bg-[#EAF0E9]',
    keyPoints: [
      'Explore nearby places and review their provider listings',
      'Fuel, toll, and day-wise budget figures are estimates',
      'Tailored for solo, friends, couple, or family road-trips'
    ]
  },
  {
    stepNumber: 2,
    badge: 'Universal Geocoding',
    title: 'Plan for Any Precise Spot Worldwide',
    description: 'Search for a place and review the location resolved by the map provider. Remote or ambiguous locations may not resolve precisely.',
    icon: MapPin,
    gradient: 'from-blue-500 to-indigo-600',
    illustrationBg: 'bg-blue-50',
    keyPoints: [
      'Map-provider search where coverage is available',
      'Place suggestions that should be checked before travel',
      'TripVerse does not provide live weather or official travel advisories'
    ]
  },
  {
    stepNumber: 3,
    badge: 'Directions & Trip Planning',
    title: 'External Directions & AI Replanning',
    description: 'Open your resolved route in an external maps app. Use the disruption planner to draft alternatives; verify live status and book directly with providers.',
    icon: ShieldCheck,
    gradient: 'from-rose-500 to-amber-600',
    illustrationBg: 'bg-rose-50',
    keyPoints: [
      'External navigation handoff; TripVerse does not guide turn by turn',
      'General cancellation steps; refunds are decided by providers',
      'No live accommodation availability or emergency booking integration'
    ]
  },
  {
    stepNumber: 4,
    badge: 'TripSplit & Dossiers',
    title: 'Split Expenses & Travel Offline',
    description: 'Track shared expenses and suggested settlements, capture photo scrapbooks, and download printable travel guides. Payments happen outside TripVerse.',
    icon: Wallet,
    gradient: 'from-[#386B49] to-[#2D5A3D]',
    illustrationBg: 'bg-[#EAF0E9]',
    keyPoints: [
      'Suggested expense splits; no payment processing or verification',
      'Offline-ready printable PDF guide & itinerary',
      'Post-trip ratings, photo journal & memory vault'
    ]
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartPlanning
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleFinish = () => {
    setOnboardingCompleted(true);
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2D5A3D', '#386B49', '#F59E0B', '#3B82F6']
      });
    } catch {
      // safe fallback
    }
    onClose();
    onStartPlanning();
  };

  const handleSkip = () => {
    setOnboardingCompleted(true);
    onClose();
  };

  const IconComponent = currentStep.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))'
      }}
    >
      <div
        className="bg-white rounded-[32px] w-full max-w-xl max-h-full shadow-2xl border border-[#E2EBE1] overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100dvh - max(1.5rem, env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px)))' }}
      >
        
        {/* Top Bar with Skip & Close */}
        <div className="shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {ONBOARDING_STEPS.map((step, idx) => (
              <button
                key={step.stepNumber}
                onClick={() => setCurrentStepIndex(idx)}
                className="flex h-11 w-8 items-center justify-center rounded-full cursor-pointer"
                aria-label={`Go to step ${idx + 1}`}
                aria-current={idx === currentStepIndex ? 'step' : undefined}
              >
                <span
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? 'w-8 bg-[#2D5A3D]'
                      : idx < currentStepIndex
                      ? 'w-2.5 bg-[#8EA78D]'
                      : 'w-2.5 bg-[#E2EBE1]'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="min-h-11 px-2 text-xs font-bold text-[#5A7362] hover:text-[#152A1C] transition-colors cursor-pointer"
              >
                Skip Tour
              </button>
            )}
            <button
              onClick={handleSkip}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:text-[#152A1C] hover:bg-[#EAF0E9] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slide Visual Presentation */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* Animated Hero Badge & Icon */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl ${currentStep.illustrationBg} flex items-center justify-center shadow-inner border border-white/80 shrink-0`}>
              <IconComponent className="w-8 h-8 text-[#2D5A3D]" />
            </div>

            <div className="min-w-0">
              <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full text-white bg-gradient-to-r ${currentStep.gradient} shadow-xs mb-1`}>
                {currentStep.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-[#152A1C] tracking-tight leading-snug">
                {currentStep.title}
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[#5A7362] font-normal leading-relaxed">
            {currentStep.description}
          </p>

          {/* Feature Interactive Snapshot */}
          {currentStepIndex === 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#152A1C] to-[#1E3E2B] text-white border border-[#386B49]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8EA78D]">
                <span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> Example driving route</span>
                <span className="bg-[#2D5A3D]/40 text-[#8EA78D] px-2 py-0.5 rounded-full border border-[#386B49]/50">Example</span>
              </div>
              <div className="flex items-center justify-between text-xs bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="px-2.5 py-1 rounded-lg bg-[#2D5A3D] text-white flex items-center gap-1 font-bold text-xs shrink-0 shadow-xs">
                    <span>Map</span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">Nearby place listing</p>
                    <p className="text-[10px] text-[#8EA78D]">Facilities and hours not confirmed</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#8EA78D] bg-[#152A1C]/80 px-2 py-1 rounded-md">Example</span>
              </div>
            </div>
          )}

          {currentStepIndex === 1 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1E3E2B] to-[#152A1C] text-white border border-[#386B49]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8EA78D]">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Example location result</span>
                <span className="bg-[#2D5A3D]/30 text-[#A8C7A5] px-2 py-0.5 rounded-full border border-[#386B49]/40">Example</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Poicha Nilkanthdham Swaminarayan</p>
                  <p className="text-[10px] text-[#EAF0E9]">21.84° N, 73.55° E · Narmada Riverbank</p>
                </div>
                <span className="text-[10px] font-bold text-[#A8C7A5] bg-[#152A1C]/70 px-2 py-1 rounded-md">Example</span>
              </div>
            </div>
          )}

          {currentStepIndex === 2 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#244931] to-[#152A1C] text-white border border-[#386B49]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#A8C7A5]">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Directions & Trip Planning</span>
                <span className="bg-[#2D5A3D]/30 text-[#A8C7A5] px-2 py-0.5 rounded-full border border-[#386B49]/40">Planning only</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Next Turn: In 1.2 km take Vadodara Ring Road</p>
                  <p className="text-[10px] text-[#EAF0E9]">Current Speed: 74 km/h · 0 Traffic Disruptions Ahead</p>
                </div>
                <span className="text-xs font-black text-emerald-300 bg-[#152A1C]/70 px-2.5 py-1 rounded-md">74 km/h</span>
              </div>
            </div>
          )}

          {currentStepIndex === 3 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#2D5A3D] to-[#152A1C] text-white border border-[#386B49]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#A8C7A5]">
                <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Group TripSplit & Offline Dossier</span>
                <span className="bg-[#2D5A3D]/30 text-[#A8C7A5] px-2 py-0.5 rounded-full border border-[#386B49]/40">Expense Splits</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">₹8,400 Total Shared · 4 Friends</p>
                  <p className="text-[10px] text-[#EAF0E9]">Settlement ready · Printable PDF Dossier cached</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 bg-[#152A1C]/70 px-2 py-1 rounded-md">Settled</span>
              </div>
            </div>
          )}

          {/* Key Feature Bullets */}
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            {currentStep.keyPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#2D5A3D] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-400">
            Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={() => setCurrentStepIndex(prev => prev - 1)}
                className="min-h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex min-h-11 items-center gap-2 px-5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>{isLastStep ? 'Start Planning' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
