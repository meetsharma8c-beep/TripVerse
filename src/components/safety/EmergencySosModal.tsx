import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Phone, ShieldAlert, HeartPulse, Flame, MapPin, Copy, Check, Volume2, Globe2 } from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { triggerHaptic } from '../../services/deviceService';
import { getEmergencyNumbersForCountry, EMERGENCY_PHRASES, CountryEmergencyNumbers, EmergencyPhrase } from '../../services/emergencySosService';
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

  const emergencyData: CountryEmergencyNumbers = getEmergencyNumbersForCountry(selectedCountry);
  const phrases: EmergencyPhrase[] = EMERGENCY_PHRASES[selectedCountry] || EMERGENCY_PHRASES['IN'] || [];

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
            // Geolocation fallback
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#140D0F] border-2 border-rose-500/40 rounded-3xl shadow-[0_25px_60px_rgba(225,29,72,0.35)] overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-rose-500/20 bg-rose-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-600/30 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide text-rose-200">
                {t('GLOBAL EMERGENCY SOS')}
              </h2>
              <p className="text-xs text-rose-300/80 font-mono">
                {emergencyData.countryName} • Verified Emergency Responders
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* GPS Coordinates Readout for Operators */}
          {coords && (
            <div className="p-3.5 rounded-2xl bg-black/50 border border-rose-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">
                    Your Current GPS Coordinates
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-200">
                    {coords.lat}° N, {coords.lng}° E
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCoords}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
              >
                {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCoords ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}

          {/* Quick Dial Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Police / Universal */}
            <button
              type="button"
              onClick={() => handleCall(emergencyData.universalOrPolice)}
              className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex flex-col justify-between items-start shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <Phone className="w-5 h-5" />
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-black/30">
                  {emergencyData.universalOrPolice}
                </span>
              </div>
              <div className="mt-2 text-left">
                <span className="text-xs font-extrabold block">Police / Universal</span>
                <span className="text-[10px] opacity-80">Immediate Law Enforcement</span>
              </div>
            </button>

            {/* Ambulance / Medical */}
            <button
              type="button"
              onClick={() => handleCall(emergencyData.ambulance)}
              className="p-3.5 rounded-2xl bg-red-700 hover:bg-red-600 text-white flex flex-col justify-between items-start shadow-md shadow-red-700/30 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <HeartPulse className="w-5 h-5" />
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-black/30">
                  {emergencyData.ambulance}
                </span>
              </div>
              <div className="mt-2 text-left">
                <span className="text-xs font-extrabold block">Medical Ambulance</span>
                <span className="text-[10px] opacity-80">Paramedics & Trauma</span>
              </div>
            </button>

            {/* Fire Brigade */}
            <button
              type="button"
              onClick={() => handleCall(emergencyData.fire)}
              className="p-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white flex flex-col justify-between items-start shadow-md shadow-amber-600/30 transition-all cursor-pointer active:scale-98"
            >
              <div className="flex items-center justify-between w-full">
                <Flame className="w-5 h-5" />
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-black/30">
                  {emergencyData.fire}
                </span>
              </div>
              <div className="mt-2 text-left">
                <span className="text-xs font-extrabold block">Fire & Rescue</span>
                <span className="text-[10px] opacity-80">Hazard & Evacuation</span>
              </div>
            </button>

            {/* Tourist Helpline */}
            {emergencyData.touristPoliceOrHelp && (
              <button
                type="button"
                onClick={() => handleCall(emergencyData.touristPoliceOrHelp!)}
                className="p-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white flex flex-col justify-between items-start shadow-md shadow-emerald-700/30 transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center justify-between w-full">
                  <Globe2 className="w-5 h-5" />
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-black/30">
                    {emergencyData.touristPoliceOrHelp}
                  </span>
                </div>
                <div className="mt-2 text-left">
                  <span className="text-xs font-extrabold block">Tourist Police</span>
                  <span className="text-[10px] opacity-80">English-speaking Helpline</span>
                </div>
              </button>
            )}
          </div>

          {/* Emergency Phrases */}
          {phrases.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Emergency Translated Phrases</span>
              </h3>
              <div className="space-y-2">
                {phrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block">{phrase.situation} ({phrase.targetLanguage})</span>
                      <p className="text-sm font-bold text-white mt-0.5">{phrase.translatedText}</p>
                      <p className="text-[11px] text-amber-300 font-mono italic mt-0.5">{phrase.phoneticPronunciation}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSpeakPhrase(phrase.translatedText)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-rose-300 hover:text-white shrink-0 transition-colors cursor-pointer"
                      title="Speak Out Loud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Country Dispatcher Guidance */}
          <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-[11px] text-rose-200/80 leading-relaxed">
            ℹ️ {emergencyData.embassyNotes}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalMarkup, document.body)
    : modalMarkup;
};
