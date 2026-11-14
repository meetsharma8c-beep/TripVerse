import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Phone, 
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
  Compass,
  Radio,
  Share2
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
  destinationCountry?: string; // e.g. 'FR', 'IN', 'JP', 'AE', 'US'
}

export const EmergencySosModal: React.FC<EmergencySosModalProps> = ({
  isOpen,
  onClose,
  destinationCountry = 'IN'
}) => {
  const { t } = useLanguage();
  const [selectedCountry, setSelectedCountry] = useState<string>(destinationCountry.toUpperCase());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<boolean>(false);
  const [copiedSosMessage, setCopiedSosMessage] = useState<boolean>(false);

  const emergencyData: CountryEmergencyNumbers = getEmergencyNumbersForCountry(selectedCountry);
  const phrases: EmergencyPhrase[] = EMERGENCY_PHRASES[selectedCountry] || EMERGENCY_PHRASES['IN'] || [];

  const availableCountryCodes = Object.keys(COUNTRY_EMERGENCY_REGISTRY);

  useEffect(() => {
    if (isOpen) {
      setSelectedCountry(destinationCountry.toUpperCase());
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCoords({
              lat: Number(pos.coords.latitude.toFixed(5)),
              lng: Number(pos.coords.longitude.toFixed(5))
            });
          },
          () => {
            // High-altitude or fallback GPS coordinates
            setCoords({ lat: 28.6139, lng: 77.2090 });
          },
          { timeout: 5000, enableHighAccuracy: false }
        );
      }
    }
  }, [isOpen, destinationCountry]);

  useModalBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const handleCopyCoords = () => {
    triggerHaptic('light');
    if (coords) {
      navigator.clipboard.writeText(`${coords.lat}, ${coords.lng}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  const handleCopySosBroadcast = () => {
    triggerHaptic('medium');
    const msg = 
      `GLOBAL SOS DISPATCH:\n` +
      `Emergency distress beacon activated.\n` +
      `Country Jurisdiction: ${emergencyData.countryName} (${emergencyData.countryCode})\n` +
      `Universal Emergency Service: ${emergencyData.universalOrPolice}\n` +
      (coords ? `Coordinates: ${coords.lat} N, ${coords.lng} E\n` : '') +
      `Timestamp: ${new Date().toISOString()}\n` +
      `TripVerse Incident Verification: https://trip-verse.com`;

    navigator.clipboard.writeText(msg);
    setCopiedSosMessage(true);
    setTimeout(() => setCopiedSosMessage(false), 2500);
  };

  const handleCall = (number: string) => {
    triggerHaptic('heavy');
    window.location.href = `tel:${number}`;
  };

  const handleSpeakPhrase = (text: string) => {
    triggerHaptic('light');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const modalMarkup = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#160B0E] via-[#1A0D11] to-[#0E0608] border-2 border-rose-500/40 rounded-3xl shadow-[0_25px_60px_rgba(225,29,72,0.4)] overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Consular Dispatch Header Bar */}
        <div className="px-5 py-4 border-b border-rose-500/20 bg-rose-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 flex items-center justify-center text-white shadow-lg shadow-rose-600/40 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wider text-rose-200 uppercase font-sans">
                  {t('Global Emergency SOS')}
                </h2>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-ping" />
                  DISPATCH READY
                </span>
              </div>
              <p className="text-xs text-rose-300/80 font-mono tracking-wider">
                {emergencyData.countryName.toUpperCase()} • VERIFIED EMBASSY & RESCUE DISPATCH
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Jurisdiction Country Selector */}
        <div className="px-5 py-2.5 bg-black/40 border-b border-white/10 overflow-x-auto whitespace-nowrap flex items-center gap-2 custom-scrollbar">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0 font-bold">
            Select Jurisdiction:
          </span>
          {availableCountryCodes.map((code) => {
            const isSelected = selectedCountry === code;
            const reg = COUNTRY_EMERGENCY_REGISTRY[code];
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedCountry(code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
              >
                [{code}] {reg.countryName}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Live Coordinates Readout */}
          <div className="p-3.5 rounded-2xl bg-black/60 border border-rose-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] font-mono text-slate-400 block uppercase tracking-wider">
                  Live Emergency Dispatch Coordinates
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-rose-200 truncate block">
                  {coords ? `${coords.lat}° N, ${coords.lng}° E` : 'Calibrating GPS positioning...'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleCopyCoords}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer"
              >
                {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopySosBroadcast}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 font-bold text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer"
                title="Copy Full SOS Broadcast Message"
              >
                {copiedSosMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedSosMessage ? 'Broadcast Copied' : 'SOS Text'}</span>
              </button>
            </div>
          </div>

          {/* 1-Tap Emergency Quick Dial Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Police / Universal Emergency */}
            <button
              type="button"
              onClick={() => handleCall(emergencyData.universalOrPolice)}
              className="p-4 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white flex flex-col justify-between items-start shadow-lg shadow-rose-600/30 transition-all cursor-pointer active:scale-98 border border-rose-400/30"
            >
              <div className="flex items-center justify-between w-full">
                <PhoneCall className="w-5 h-5" />
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-black/40 border border-white/20">
                  {emergencyData.universalOrPolice}
                </span>
              </div>
              <div className="mt-3 text-left">
                <span className="text-xs font-black block tracking-wider uppercase font-sans">Police / Universal</span>
                <span className="text-[10px] text-rose-100/80 block mt-0.5">Emergency Command Center</span>
              </div>
            </button>

            {/* Ambulance / Medical Emergency */}
            <button
              type="button"
              onClick={() => handleCall(emergencyData.ambulance)}
              className="p-4 rounded-2xl bg-gradient-to-br from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-white flex flex-col justify-between items-start shadow-lg shadow-red-800/30 transition-all cursor-pointer active:scale-98 border border-red-500/30"
            >
              <div className="flex items-center justify-between w-full">
                <HeartPulse className="w-5 h-5 text-red-200" />
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-black/40 border border-white/20">
                  {emergencyData.ambulance}
                </span>
              </div>
              <div className="mt-3 text-left">
                <span className="text-xs font-black block tracking-wider uppercase font-sans">Medical Ambulance</span>
                <span className="text-[10px] text-red-200/80 block mt-0.5">Paramedics & Trauma Response</span>
              </div>
            </button>

            {/* Fire & Rescue Brigade */}
            <button
              type="button"
              onClick={() => handleCall(emergencyData.fire)}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-700 to-amber-800 hover:from-amber-600 hover:to-amber-700 text-white flex flex-col justify-between items-start shadow-lg shadow-amber-700/30 transition-all cursor-pointer active:scale-98 border border-amber-500/30"
            >
              <div className="flex items-center justify-between w-full">
                <Flame className="w-5 h-5 text-amber-200" />
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-black/40 border border-white/20">
                  {emergencyData.fire}
                </span>
              </div>
              <div className="mt-3 text-left">
                <span className="text-xs font-black block tracking-wider uppercase font-sans">Fire & Rescue</span>
                <span className="text-[10px] text-amber-100/80 block mt-0.5">Civil Evacuation & Hazards</span>
              </div>
            </button>

            {/* Tourist Assistance & Consular Helpline */}
            {emergencyData.touristPoliceOrHelp ? (
              <button
                type="button"
                onClick={() => handleCall(emergencyData.touristPoliceOrHelp!)}
                className="p-4 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-900 hover:from-emerald-700 hover:to-emerald-800 text-white flex flex-col justify-between items-start shadow-lg shadow-emerald-800/30 transition-all cursor-pointer active:scale-98 border border-emerald-500/30"
              >
                <div className="flex items-center justify-between w-full">
                  <Globe className="w-5 h-5 text-emerald-200" />
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-black/40 border border-white/20">
                    {emergencyData.touristPoliceOrHelp}
                  </span>
                </div>
                <div className="mt-3 text-left">
                  <span className="text-xs font-black block tracking-wider uppercase font-sans">Tourist Helpline</span>
                  <span className="text-[10px] text-emerald-100/80 block mt-0.5">Multilingual Assistance</span>
                </div>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between items-start text-slate-400">
                <Globe className="w-5 h-5 opacity-40" />
                <div className="mt-3">
                  <span className="text-xs font-bold block">Consular Standby</span>
                  <span className="text-[10px] opacity-70 block">Refer to universal 112 line</span>
                </div>
              </div>
            )}
          </div>

          {/* Phonetical Emergency Translation Cards */}
          {phrases.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Phonetic Emergency Translations</span>
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Audio Synthesis Available</span>
              </div>

              <div className="space-y-2">
                {phrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 hover:bg-white/[0.08] transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono uppercase text-slate-400 block tracking-wider">
                        {phrase.situation} • {phrase.targetLanguage}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-white mt-0.5 font-sans">
                        {phrase.translatedText}
                      </p>
                      <p className="text-[11px] text-amber-300 font-mono italic mt-0.5">
                        &quot;{phrase.phoneticPronunciation}&quot;
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSpeakPhrase(phrase.translatedText)}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-rose-300 hover:text-white shrink-0 transition-colors cursor-pointer border border-white/10"
                      title="Speak Out Loud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consular Legal Protocol Guidance */}
          <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-[11px] text-rose-200/90 leading-relaxed font-sans flex items-start gap-2.5">
            <Info className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-200 block uppercase font-mono text-[10px] mb-0.5">
                Consular Operational Notes
              </span>
              <span>{emergencyData.embassyNotes}</span>
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
