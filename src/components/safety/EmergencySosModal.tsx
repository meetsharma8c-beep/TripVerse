import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldAlert,
  HeartPulse,
  Flame,
  MapPin,
  Copy,
  Check,
  Volume2,
  Globe,
  Info,
  PhoneCall,
  Share2,
  ExternalLink
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { triggerHaptic } from '../../services/deviceService';
import {
  getEmergencyNumbersForCountry,
  EMERGENCY_PHRASES,
  COUNTRY_EMERGENCY_REGISTRY,
  CountryEmergencyNumbers,
  EmergencyPhrase
} from '../../services/emergencySosService';
import { useLanguage } from '../../services/languageService';

interface EmergencySosModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationCountry?: string;
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  isOpen,
  onClose,
  destinationCountry = 'IN'
}) => {
  const { t } = useLanguage();
  const [selectedCountry, setSelectedCountry] = useState<string>(destinationCountry.toUpperCase());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'acquiring' | 'locked' | 'unavailable'>('acquiring');
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [copiedSosMessage, setCopiedSosMessage] = useState<boolean>(false);

  const emergencyData: CountryEmergencyNumbers = getEmergencyNumbersForCountry(selectedCountry);
  const phrases: EmergencyPhrase[] = EMERGENCY_PHRASES[selectedCountry] || EMERGENCY_PHRASES['IN'] || [];
  const availableCountryCodes = Object.keys(COUNTRY_EMERGENCY_REGISTRY);

  useEffect(() => {
    if (isOpen) {
      setSelectedCountry(destinationCountry.toUpperCase());
      setGpsStatus('acquiring');
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({
              lat: Number(pos.coords.latitude.toFixed(5)),
              lng: Number(pos.coords.longitude.toFixed(5))
            });
            setGpsStatus('locked');
          },
          () => {
            setCoords(null);
            setGpsStatus('unavailable');
          },
          { timeout: 5000, enableHighAccuracy: false }
        );
      } else {
        setGpsStatus('unavailable');
      }
    }
  }, [isOpen, destinationCountry]);

  useModalBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const handleCopyCoords = () => {
    triggerHaptic('light');
    if (coords) {
      navigator.clipboard?.writeText(`${coords.lat}, ${coords.lng}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const handleCopySosBroadcast = () => {
    triggerHaptic('medium');
    const msg =
      `EMERGENCY DISTRESS BEACON\n` +
      `----------------------------------------\n` +
      `Jurisdiction : ${emergencyData.countryName.toUpperCase()} (${emergencyData.countryCode})\n` +
      `Police Line  : ${emergencyData.universalOrPolice}\n` +
      `Medical Line : ${emergencyData.ambulance}\n` +
      (coords ? `WGS-84 GPS   : ${coords.lat}, ${coords.lng}\nGoogle Maps  : https://maps.google.com/?q=${coords.lat},${coords.lng}\n` : '') +
      `Timestamp    : ${new Date().toISOString()}\n` +
      `Protocol     : Immediate responder assistance requested.\n` +
      `----------------------------------------`;

    navigator.clipboard?.writeText(msg);
    setCopiedSosMessage(true);
    setTimeout(() => setCopiedSosMessage(false), 2500);
  };

  const handleCall = (number: string) => {
    triggerHaptic('heavy');
    window.location.href = `tel:${number}`;
  };

  const handleSpeakPhrase = (text: string) => {
    triggerHaptic('light');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const modalMarkup = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Emergency SOS"
      onClick={onClose}
      className="fixed inset-0 z-[130] overscroll-contain flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/75 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl glass-modal liquid-rim border-rose-500/20 rounded-[28px] sm:rounded-[32px] overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[92dvh]"
      >
        {/* High-Clarity Crimson Rescue Header */}
        <div className="relative px-4 sm:px-6 py-4 bg-gradient-to-r from-[#58111D] via-[#881337] to-[#4C0D1A] text-white flex items-center justify-between gap-3 border-b border-rose-400/25 shrink-0 overflow-hidden">
          <div className="pointer-events-none absolute -left-8 -top-8 w-36 h-36 rounded-full bg-rose-500/25 blur-2xl" />
          <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/25 border border-rose-300/40 flex items-center justify-center text-rose-100 shadow-inner shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold tracking-widest text-rose-200 uppercase">
                  SOS RESCUE DISPATCH
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  24/7 Active
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-white truncate mt-0.5">
                {t('Global Emergency SOS')} • {emergencyData.countryName}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-0 relative z-10 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close SOS console"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Liquid Jurisdiction Selector Strip */}
        <div
          className="px-4 sm:px-6 py-2.5 bg-[#F8FAFC] dark:bg-[#090E17] border-b border-slate-200/80 dark:border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0"
          style={{
            maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 92%, rgba(0,0,0,0) 100%)'
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 shrink-0">
            Country:
          </span>
          {availableCountryCodes.map((code) => {
            const isSelected = selectedCountry === code;
            const reg = COUNTRY_EMERGENCY_REGISTRY[code];
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedCountry(code);
                }}
                className={`min-h-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-rose-300 dark:hover:border-rose-500/40'
                }`}
              >
                {code} • {reg.countryName}
              </button>
            );
          })}
        </div>

        {/* Console Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-gradient-to-b from-[#FFF9FA] via-[#F8FAFC] to-[#F1F5F9] dark:from-[#0A0F18] dark:via-[#0D131D] dark:to-[#080C14]">
          {/* Primary 1-Tap SOS Rapid Dial Action */}
          <button
            type="button"
            onClick={() => handleCall(emergencyData.universalOrPolice)}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:brightness-110 text-white shadow-[0_14px_30px_-8px_rgba(225,29,72,0.5)] border border-rose-300/40 flex items-center justify-between gap-3 transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-3 text-left min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <PhoneCall className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-widest text-rose-100 block">
                  1-Tap Emergency Dispatch • {emergencyData.countryName}
                </span>
                <span className="text-base sm:text-lg font-display font-black tracking-tight truncate block">
                  Call Universal / Police Now
                </span>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-white text-rose-700 font-mono font-black text-base shadow-sm shrink-0">
              {emergencyData.universalOrPolice}
            </span>
          </button>

          {/* Live GPS Telemetry & Distress Beacon Card */}
          <div className="liquid-glass-surface rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Live WGS-84 Location
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm truncate block">
                  {gpsStatus === 'locked' && coords
                    ? `${coords.lat}° N, ${coords.lng}° E`
                    : gpsStatus === 'acquiring'
                      ? 'Acquiring GPS satellite lock...'
                      : 'Location permission denied — use local street landmark'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {coords && (
                <>
                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="min-h-0 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 hover:border-slate-300 transition-colors cursor-pointer"
                  >
                    {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
                  </button>
                  <a
                    href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-0 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1 hover:border-slate-300 transition-colors"
                  >
                    <span>Map</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
              <button
                type="button"
                onClick={handleCopySosBroadcast}
                className="min-h-0 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                {copiedSosMessage ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedSosMessage ? 'Beacon Copied' : 'Copy Distress SMS'}</span>
              </button>
            </div>
          </div>

          {/* Color-Coded Emergency Service Directory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Medical Ambulance */}
            <div className="rounded-2xl p-4 bg-white dark:bg-[#131C2B] border border-rose-200/80 dark:border-rose-500/20 liquid-bento-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="text-xs font-display font-bold text-slate-900 dark:text-white truncate">
                    Medical & Ambulance
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Paramedic & Trauma Response
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCall(emergencyData.ambulance)}
                className="min-h-0 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 text-rose-700 dark:text-rose-200 hover:text-white border border-rose-200 dark:border-rose-700 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{emergencyData.ambulance}</span>
              </button>
            </div>

            {/* Fire & Civil Rescue */}
            <div className="rounded-2xl p-4 bg-white dark:bg-[#131C2B] border border-amber-200/80 dark:border-amber-500/20 liquid-bento-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-display font-bold text-slate-900 dark:text-white truncate">
                    Fire & Rescue
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Hazard & Civil Evacuation
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleCall(emergencyData.fire)}
                className="min-h-0 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-600 text-amber-800 dark:text-amber-200 hover:text-white border border-amber-200 dark:border-amber-700 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{emergencyData.fire}</span>
              </button>
            </div>

            {/* Tourist Police & Consular */}
            <div className="sm:col-span-2 rounded-2xl p-4 bg-white dark:bg-[#131C2B] border border-emerald-200/80 dark:border-emerald-500/20 liquid-bento-card flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400 shrink-0" />
                  <span className="text-xs font-display font-bold text-slate-900 dark:text-white truncate">
                    Tourist Police & Multilingual Helpdesk
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                  Traveler assistance, lost passports & safe escort
                </span>
              </div>
              {emergencyData.touristPoliceOrHelp ? (
                <button
                  type="button"
                  onClick={() => handleCall(emergencyData.touristPoliceOrHelp!)}
                  className="min-h-0 px-3.5 py-2 rounded-xl bg-[#EAF0E9] dark:bg-emerald-950/60 hover:bg-[#2D5A3D] text-[#2D5A3D] dark:text-emerald-200 hover:text-white border border-[#C6D8C5] dark:border-emerald-700 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[140px]">{emergencyData.touristPoliceOrHelp}</span>
                </button>
              ) : (
                <span className="text-xs text-slate-500 font-mono">Dial {emergencyData.universalOrPolice}</span>
              )}
            </div>
          </div>

          {/* Spoken Emergency Phrasebook */}
          {phrases.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs border-b border-slate-200/80 dark:border-white/10 pb-1.5">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-300">
                  Spoken Emergency Cards ({phrases[0]?.targetLanguage})
                </span>
                <span className="text-[10px] text-slate-400">Tap speaker to play aloud</span>
              </div>

              <div className="space-y-2">
                {phrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-3.5 bg-white dark:bg-[#131C2B] border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                        {phrase.situation}
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {phrase.translatedText}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        &ldquo;{phrase.phoneticPronunciation}&rdquo;
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSpeakPhrase(phrase.translatedText)}
                      className="min-h-0 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#2D5A3D] text-slate-700 dark:text-slate-200 hover:text-white border border-slate-200 dark:border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      title="Play aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Speak</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consular Advisory */}
          <div className="rounded-2xl p-3.5 bg-slate-100/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
            <Info className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 block mb-0.5">
                Local Jurisdiction Guidance
              </span>
              <p className="leading-relaxed">{emergencyData.embassyNotes}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalMarkup, document.body)
    : modalMarkup;
};
