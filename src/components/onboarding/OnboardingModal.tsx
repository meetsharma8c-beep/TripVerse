import React, { useState } from 'react';
import { Sparkles, MapPin, ShieldCheck, Wallet, ArrowRight, Check, X, Navigation, Globe, Languages } from 'lucide-react';
import confetti from 'canvas-confetti';
import { setOnboardingCompleted } from '../../services/storageService';
import { LanguageCode, CurrencyCode } from '../../types/trip';
import { getActiveLanguage, setActiveLanguage, LANGUAGES, t } from '../../services/languageService';
import { getActiveCurrency, setActiveCurrency, CURRENCIES } from '../../services/currencyService';

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
    description: 'Curate unforgettable road trips with scenic highway stops, hidden local gems, and tailored day-by-day itineraries.',
    icon: Sparkles,
    gradient: 'from-[#386B49] to-[#1E3E2B]',
    illustrationBg: 'bg-[#EAF0E9]',
    keyPoints: [
      'Discover handpicked scenic viewpoints, culinary spots, and rest stops',
      'Smart budget forecasting for fuel, stays, and activities',
      'Tailored for solo wanderers, couples, friend groups, or families'
    ]
  },
  {
    stepNumber: 2,
    badge: 'Universal Destinations',
    title: 'Explore Any Destination Worldwide',
    description: 'From bustling capital cities to tranquil mountain villages, easily discover places and craft detailed routes tailored to your travel style.',
    icon: MapPin,
    gradient: 'from-blue-500 to-indigo-600',
    illustrationBg: 'bg-blue-50',
    keyPoints: [
      'Global coverage across continents and off-the-beaten-path trails',
      'Curated attraction highlights, photo spots, and local culture',
      'Personalized pacing matching your unique travel rhythm'
    ]
  },
  {
    stepNumber: 3,
    badge: 'Live Navigation & Replanning',
    title: '1-Click Directions & Adaptive AI Replanning',
    description: 'Seamlessly launch directions in your favorite navigation app, and adapt your plans on the fly with intelligent AI adjustments.',
    icon: ShieldCheck,
    gradient: 'from-rose-500 to-amber-600',
    illustrationBg: 'bg-rose-50',
    keyPoints: [
      'Instant 1-click handoff to Google Maps and directions',
      'Smart weather & disruption replanning alternatives',
      'Direct links for fast accommodation and transport reservations'
    ]
  },
  {
    stepNumber: 4,
    badge: 'TripSplit & Travel Dossiers',
    title: 'Split Expenses & Travel Offline',
    description: 'Effortlessly divide trip costs among friends, capture photo journals, and export elegant printable guides for offline journeys.',
    icon: Wallet,
    gradient: 'from-[#386B49] to-[#2D5A3D]',
    illustrationBg: 'bg-[#EAF0E9]',
    keyPoints: [
      'Fair and transparent group expense splitting with currency support',
      'Offline-ready printable PDF guide & full itinerary dossier',
      'Photo journal and trip memory vault to cherish your journey'
    ]
  }
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartPlanning
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(getActiveLanguage());
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(getActiveCurrency());

  const handleSelectLanguage = (lang: LanguageCode) => {
    setSelectedLang(lang);
    setActiveLanguage(lang);
    const defCurr = LANGUAGES[lang]?.defaultCurrency;
    if (defCurr) {
      setSelectedCurrency(defCurr);
      setActiveCurrency(defCurr);
    }
  };

  const handleSelectCurrency = (curr: CurrencyCode) => {
    setSelectedCurrency(curr);
    setActiveCurrency(curr);
  };

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
        className="glass-elevated liquid-rim rounded-[32px] w-full max-w-xl max-h-full overflow-hidden flex flex-col"
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
                {t('Skip Tour', selectedLang)}
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

        {/* Global Language & Currency Opening Switcher Bar */}
        <div className="shrink-0 px-4 sm:px-6 py-2 bg-[#F4F8F3] border-y border-[#E2EBE1] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
            <Languages className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" />
            <span className="hidden sm:inline">{t('common.language', selectedLang)}:</span>
            <select
              value={selectedLang}
              onChange={(e) => handleSelectLanguage(e.target.value as LanguageCode)}
              className="bg-white border border-[#DCE7DB] rounded-lg px-2 py-0.5 font-bold text-slate-800 cursor-pointer focus:outline-none"
              aria-label="Select Opening Language"
            >
              {Object.values(LANGUAGES).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-slate-700 font-semibold shrink-0">
            <span className="hidden sm:inline text-slate-500">{t('common.currency', selectedLang)}:</span>
            <select
              value={selectedCurrency}
              onChange={(e) => handleSelectCurrency(e.target.value as CurrencyCode)}
              className="bg-white border border-[#DCE7DB] rounded-lg px-2 py-0.5 font-bold text-slate-800 cursor-pointer focus:outline-none"
              aria-label="Select Opening Currency"
            >
              {Object.keys(CURRENCIES).map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c as CurrencyCode].symbol} {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Slide Visual Presentation */}
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none overscroll-contain p-4 sm:p-8 space-y-4 sm:space-y-6">
          {/* First Step Quick Language Selection Grid */}
          {currentStepIndex === 0 && (
            <div className="p-3.5 rounded-2xl bg-[#EAF0E9] border border-[#C4D9C3] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#152A1C] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#2D5A3D]" />
                  {t('welcome.chooseLanguage', selectedLang)}
                </span>
                <span className="text-[10px] font-bold text-[#2D5A3D] bg-white px-2 py-0.5 rounded-full border border-[#C4D9C3]">
                  {LANGUAGES[selectedLang]?.nativeName} ({LANGUAGES[selectedLang]?.flag})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                {Object.values(LANGUAGES).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleSelectLanguage(l.code)}
                    className={`px-2 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedLang === l.code
                        ? 'bg-[#2D5A3D] text-white shadow-xs scale-102 ring-2 ring-[#2D5A3D]/20'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#DCE7DB]'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span className="truncate">{l.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Animated Hero Badge & Icon */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl ${currentStep.illustrationBg} flex items-center justify-center shadow-inner border border-white/80 shrink-0`}>
              <IconComponent className="w-8 h-8 text-[#2D5A3D]" />
            </div>

            <div className="min-w-0">
              <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full text-white bg-gradient-to-r ${currentStep.gradient} shadow-xs mb-1`}>
                {t(currentStep.badge, selectedLang)}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-[#152A1C] tracking-tight leading-snug">
                {t(currentStep.title, selectedLang)}
              </h2>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[#5A7362] font-normal leading-relaxed">
            {t(currentStep.description, selectedLang)}
          </p>

          {/* Feature Interactive Snapshot */}
          {currentStepIndex === 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#152A1C] to-[#1E3E2B] text-white border border-[#386B49]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8EA78D]">
                <span className="flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5" /> {t('Example driving route', selectedLang)}</span>
                <span className="bg-[#2D5A3D]/40 text-[#8EA78D] px-2 py-0.5 rounded-full border border-[#386B49]/50">{t('Example', selectedLang)}</span>
              </div>
              <div className="flex items-center justify-between text-xs bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="px-2.5 py-1 rounded-lg bg-[#2D5A3D] text-white flex items-center gap-1 font-bold text-xs shrink-0 shadow-xs">
                    <span>{t('Map', selectedLang)}</span>
                  </div>
                  <div>
                    <p className="font-bold text-white text-xs">{t('Nearby place listing', selectedLang)}</p>
                    <p className="text-[10px] text-[#8EA78D]">{t('Facilities and hours not confirmed', selectedLang)}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[#8EA78D] bg-[#152A1C]/80 px-2 py-1 rounded-md">{t('Example', selectedLang)}</span>
              </div>
            </div>
          )}

          {currentStepIndex === 1 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1E3E2B] to-[#152A1C] text-white border border-[#386B49]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#8EA78D]">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {t('Example location result', selectedLang)}</span>
                <span className="bg-[#2D5A3D]/30 text-[#A8C7A5] px-2 py-0.5 rounded-full border border-[#386B49]/40">{t('Example', selectedLang)}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Poicha Nilkanthdham Swaminarayan</p>
                  <p className="text-[10px] text-[#EAF0E9]">21.84° N, 73.55° E · Narmada Riverbank</p>
                </div>
                <span className="text-[10px] font-bold text-[#A8C7A5] bg-[#152A1C]/70 px-2 py-1 rounded-md">{t('Example', selectedLang)}</span>
              </div>
            </div>
          )}

          {currentStepIndex === 2 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#244931] to-[#152A1C] text-white border border-[#386B49]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#A8C7A5]">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> {t('Directions & Trip Planning', selectedLang)}</span>
                <span className="bg-[#2D5A3D]/30 text-[#A8C7A5] px-2 py-0.5 rounded-full border border-[#386B49]/40">{t('Planning only', selectedLang)}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">{t('Next Turn: In 1.2 km take Vadodara Ring Road', selectedLang)}</p>
                  <p className="text-[10px] text-[#EAF0E9]">{t('Current Speed: 74 km/h · 0 Traffic Disruptions Ahead', selectedLang)}</p>
                </div>
                <span className="text-xs font-black text-emerald-300 bg-[#152A1C]/70 px-2.5 py-1 rounded-md">74 km/h</span>
              </div>
            </div>
          )}

          {currentStepIndex === 3 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#2D5A3D] to-[#152A1C] text-white border border-[#386B49]/40 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#A8C7A5]">
                <span className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> {t('Group TripSplit & Offline Dossier', selectedLang)}</span>
                <span className="bg-[#2D5A3D]/30 text-[#A8C7A5] px-2 py-0.5 rounded-full border border-[#386B49]/40">{t('Expense Splits', selectedLang)}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">{t('₹8,400 Total Shared · 4 Friends', selectedLang)}</p>
                  <p className="text-[10px] text-[#EAF0E9]">{t('Settlement ready · Printable PDF Dossier cached', selectedLang)}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 bg-[#152A1C]/70 px-2 py-1 rounded-md">{t('Settled', selectedLang)}</span>
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
                <span>{t(point, selectedLang)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs font-bold text-slate-400">
            {t('Step', selectedLang)} {currentStepIndex + 1} {t('of', selectedLang)} {ONBOARDING_STEPS.length}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                onClick={() => setCurrentStepIndex(prev => prev - 1)}
                className="min-h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                {t('common.back', selectedLang) || 'Back'}
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex min-h-11 items-center gap-2 px-5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>{isLastStep ? t('welcome.getStarted', selectedLang) : t('welcome.continue', selectedLang)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
