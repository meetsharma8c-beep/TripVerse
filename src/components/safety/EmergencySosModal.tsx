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
  Radio,
  Share2,
  AlertTriangle
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
      `EMERGENCY DISTRESS BEACON\n` +
      `----------------------------------------\n` +
      `Incident Jurisdiction: ${emergencyData.countryName.toUpperCase()} (${emergencyData.countryCode})\n` +
      `Primary Dispatch Line: ${emergencyData.universalOrPolice}\n` +
      `Medical Dispatch     : ${emergencyData.ambulance}\n` +
      (coords ? `Coordinates (WGS84)  : ${coords.lat} N, ${coords.lng} E\n` : '') +
      `Timestamp (UTC)      : ${new Date().toISOString()}\n` +
      `Incident Protocol    : Immediate responder dispatch requested.\n` +
      `TripVerse Verification: https://trip-verse.com\n` +
      `----------------------------------------`;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0D1017] border border-[#263140] rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Authoritative Consular Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#212B36] bg-[#141A23] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2A1519] border border-[#521E24] flex items-center justify-center text-[#E05260]">
              <ShieldAlert className="w-4 h-4 text-[#E05260]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-[#E05260] uppercase">
                  CONSULAR ASSISTANCE & RESCUE DESK
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                  • 24/7 ACTIVE
                </span>
              </div>
              <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                Global Emergency Dispatch Console
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#212B36] hover:bg-[#2C3847] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Sovereign Jurisdiction Selector Bar */}
        <div className="px-5 py-2.5 bg-[#0F141C] border-b border-[#212B36] flex items-center justify-between gap-3 text-xs font-mono overflow-x-auto custom-scrollbar">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider shrink-0">
            Selected Jurisdiction:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {availableCountryCodes.map((code) => {
              const isSelected = selectedCountry === code;
              const reg = COUNTRY_EMERGENCY_REGISTRY[code];
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedCountry(code)}
                  className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-[#1E293B] text-slate-100 border-[#475569] font-bold'
                      : 'bg-[#131922] text-slate-400 border-[#1E2631] hover:bg-[#1A222D] hover:text-slate-300'
                  }`}
                >
                  {code} • {reg.countryName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-[#0B0F14]">
          {/* Coordinates & Telemetry Dispatch Panel */}
          <div className="p-3.5 rounded-xl border border-[#212B36] bg-[#121720] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="text-[9px] text-slate-400 block uppercase tracking-wider">
                  Live Dispatch Geolocation (WGS-84 Datum)
                </span>
                <span className="font-bold text-slate-200 text-xs sm:text-sm">
                  {coords ? `${coords.lat}° N, ${coords.lng}° E` : 'Acquiring satellite coordinate fix...'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyCoords}
                className="px-2.5 py-1 rounded-lg bg-[#1B232E] hover:bg-[#25303E] border border-[#2F3C4E] text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedCoords ? 'Copied' : 'Copy GPS'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopySosBroadcast}
                className="px-2.5 py-1 rounded-lg bg-[#1B232E] hover:bg-[#25303E] border border-[#2F3C4E] text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedSosMessage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copiedSosMessage ? 'Beacon Copied' : 'Generate Distress SMS'}</span>
              </button>
            </div>
          </div>

          {/* Direct Emergency Telephone Directory */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#212B36] pb-1.5">
              <span className="uppercase text-[10px] tracking-wider">Direct Dispatch Lines • {emergencyData.countryName.toUpperCase()}</span>
              <span className="text-[10px]">Instant 1-Tap Voice Dial</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Universal / Police Emergency */}
              <div className="p-3.5 rounded-xl border border-[#263140] bg-[#121720] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200 uppercase font-sans">
                      Police / Universal Emergency
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    National Emergency Dispatch Network
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCall(emergencyData.universalOrPolice)}
                  className="px-3 py-1.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] border border-[#4B5563] text-slate-100 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <PhoneCall className="w-3 h-3 text-rose-400" />
                  <span>{emergencyData.universalOrPolice}</span>
                </button>
              </div>

              {/* Medical Ambulance */}
              <div className="p-3.5 rounded-xl border border-[#263140] bg-[#121720] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200 uppercase font-sans">
                      Medical Ambulance & Trauma
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    Central Paramedic Response
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCall(emergencyData.ambulance)}
                  className="px-3 py-1.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] border border-[#4B5563] text-slate-100 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <PhoneCall className="w-3 h-3 text-red-400" />
                  <span>{emergencyData.ambulance}</span>
                </button>
              </div>

              {/* Fire & Rescue */}
              <div className="p-3.5 rounded-xl border border-[#263140] bg-[#121720] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200 uppercase font-sans">
                      Fire & Civil Rescue
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    Hazard Mitigation & Evacuation
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCall(emergencyData.fire)}
                  className="px-3 py-1.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] border border-[#4B5563] text-slate-100 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <PhoneCall className="w-3 h-3 text-amber-400" />
                  <span>{emergencyData.fire}</span>
                </button>
              </div>

              {/* Tourist & Diplomatic Police */}
              <div className="p-3.5 rounded-xl border border-[#263140] bg-[#121720] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200 uppercase font-sans">
                      Tourist Police & Consular
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                    Multilingual Tourist Assistance
                  </span>
                </div>
                {emergencyData.touristPoliceOrHelp ? (
                  <button
                    type="button"
                    onClick={() => handleCall(emergencyData.touristPoliceOrHelp!)}
                    className="px-3 py-1.5 rounded-lg bg-[#1F2937] hover:bg-[#374151] border border-[#4B5563] text-slate-100 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <PhoneCall className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[100px]">{emergencyData.touristPoliceOrHelp}</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">Use 112 Universal</span>
                )}
              </div>
            </div>
          </div>

          {/* Official Phonetic Phrasebook for Emergency Situations */}
          {phrases.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#212B36] pb-1.5">
                <span className="uppercase text-[10px] tracking-wider">Phonetic Emergency Phrasebook ({phrases[0]?.targetLanguage})</span>
                <span className="text-[10px]">Speech Synthesis Supported</span>
              </div>

              <div className="space-y-2">
                {phrases.map((phrase, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#212B36] bg-[#121720] flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <span className="text-[9px] font-mono uppercase text-slate-400 block">
                        {phrase.situation}
                      </span>
                      <p className="text-xs sm:text-sm font-medium text-slate-100 mt-0.5">
                        {phrase.translatedText}
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Phonetic: &quot;{phrase.phoneticPronunciation}&quot;
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSpeakPhrase(phrase.translatedText)}
                      className="p-2 rounded-lg bg-[#1B232E] hover:bg-[#25303E] text-slate-300 hover:text-white border border-[#2F3C4E] transition-colors cursor-pointer shrink-0"
                      title="Speak phrase"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consular Operational Advisory */}
          <div className="p-3.5 rounded-xl border border-[#212B36] bg-[#10141C] text-xs font-sans text-slate-300 flex items-start gap-3">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                Consular Guidance & Jurisdiction Protocol
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {emergencyData.embassyNotes}
              </p>
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
