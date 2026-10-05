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
  Star
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
    description: 'TripVerse automatically sequences high-hygiene highway break stops, verified dhabas, EV charging, and scenic viewpoints along your drive.',
    icon: Sparkles,
    gradient: 'from-emerald-500 to-teal-600',
    illustrationBg: 'bg-emerald-50',
    keyPoints: [
      'Authentic highway food courts & clean restrooms',
      'Accurate fuel, toll, and day-wise budget calculations',
      'Tailored for solo, friends, couple, or family road-trips'
    ]
  },
  {
    stepNumber: 2,
    badge: 'Universal Geocoding',
    title: 'Plan for Any Precise Spot Worldwide',
    description: 'Type any landmark, temple, hidden village, or remote lake — from Poicha to Paris, Mansarovar to Tokyo. TripVerse pinpoints exact GPS coordinates.',
    icon: MapPin,
    gradient: 'from-blue-500 to-indigo-600',
    illustrationBg: 'bg-blue-50',
    keyPoints: [
      'Universal global search with instant geocoding',
      'Curated local food trails and hidden viewpoints',
      'Weather forecasts and seasonal travel advisories'
    ]
  },
  {
    stepNumber: 3,
    badge: 'Disruption Guard & HUD',
    title: 'Live Road Co-Pilot & AI Replanning',
    description: 'Turn-by-turn road navigation with voice guidance. If your flight or train is delayed, 1-click Trip Replanning books emergency stays and reroutes.',
    icon: ShieldCheck,
    gradient: 'from-rose-500 to-amber-600',
    illustrationBg: 'bg-rose-50',
    keyPoints: [
      'Live Turn-by-Turn GPS HUD with speed & ETA',
      'Instant disruption compensation & refund advisory',
      'Emergency stays curated within 5km of transit hubs'
    ]
  },
  {
    stepNumber: 4,
    badge: 'TripSplit & Dossiers',
    title: 'Split Expenses & Travel Offline',
    description: 'Effortlessly split group expenses via UPI, capture photo scrapbooks, and download comprehensive printable travel dossiers for zero-network zones.',
    icon: Wallet,
    gradient: 'from-teal-500 to-emerald-600',
    illustrationBg: 'bg-teal-50',
    keyPoints: [
      'TripSplit UPI payment settlement with friends',
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
        colors: ['#00B074', '#00D084', '#F59E0B', '#3B82F6']
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col">
        
        {/* Top Bar with Skip & Close */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {ONBOARDING_STEPS.map((step, idx) => (
              <button
                key={step.stepNumber}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-8 bg-[#00B074]'
                    : idx < currentStepIndex
                    ? 'w-2.5 bg-emerald-300'
                    : 'w-2.5 bg-slate-200'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 cursor-pointer"
              >
                Skip Tour
              </button>
            )}
            <button
              onClick={handleSkip}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slide Visual Presentation */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          {/* Animated Hero Badge & Icon */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-3xl ${currentStep.illustrationBg} flex items-center justify-center shadow-inner border border-white/80 shrink-0`}>
              <IconComponent className="w-8 h-8 text-[#00B074]" />
            </div>

            <div className="min-w-0">
              <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full text-white bg-gradient-to-r ${currentStep.gradient} shadow-xs mb-1`}>
                {currentStep.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-[#0B2545] tracking-tight leading-snug">
                {currentStep.title}
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 font-normal leading-relaxed">
            {currentStep.description}
          </p>

          {/* Feature Interactive Snapshot */}
          {currentStepIndex === 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900/90 to-[#0B2545] text-white border border-emerald-500/30 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                <span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> NH-48 Express Corridor</span>
                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">AI Curated</span>
              </div>
              <div className="flex items-center justify-between text-xs bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="px-2.5 py-1 rounded-lg bg-emerald-500 text-white flex items-center gap-1 font-bold text-xs shrink-0 shadow-xs">
                    <Star className="w-3 h-3 fill-amber-300 text-amber-300 shrink-0" />
                    <span>4.8</span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">Honest Highway Food Court</p>
                    <p className="text-[10px] text-emerald-200">120 km from start · 5-Star Clean Washrooms</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-md">Fuel & Food</span>
              </div>
            </div>
          )}

          {currentStepIndex === 1 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/90 to-[#0B2545] text-white border border-blue-500/30 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-blue-300">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Precision GPS Geocoding</span>
                <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">Global</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Poicha Nilkanthdham Swaminarayan</p>
                  <p className="text-[10px] text-blue-200">21.84° N, 73.55° E · Narmada Riverbank</p>
                </div>
                <span className="text-[10px] font-bold text-blue-300 bg-blue-950/60 px-2 py-1 rounded-md">100% Found</span>
              </div>
            </div>
          )}

          {currentStepIndex === 2 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/90 to-[#0B2545] text-white border border-rose-500/30 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-300">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Live Road HUD & Disruption Guard</span>
                <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-400/30">Active</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Next Turn: In 1.2 km take Vadodara Ring Road</p>
                  <p className="text-[10px] text-rose-200">Current Speed: 74 km/h · 0 Traffic Disruptions Ahead</p>
                </div>
                <span className="text-xs font-black text-rose-400 bg-rose-950/70 px-2.5 py-1 rounded-md">74 km/h</span>
              </div>
            </div>
          )}

          {currentStepIndex === 3 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-950/90 to-[#0B2545] text-white border border-teal-500/30 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-teal-300">
                <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Group TripSplit & Offline Dossier</span>
                <span className="bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-400/30">1-Click UPI</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">₹8,400 Total Shared · 4 Friends</p>
                  <p className="text-[10px] text-teal-200">Settlement ready · Printable PDF Dossier cached</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 px-2 py-1 rounded-md">Settled</span>
              </div>
            </div>
          )}

          {/* Key Feature Bullets */}
          <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            {currentStep.keyPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#00B074] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-400">
            Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={() => setCurrentStepIndex(prev => prev - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
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
