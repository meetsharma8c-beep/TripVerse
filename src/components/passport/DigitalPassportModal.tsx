import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Award, MapPin, Globe, Sparkles, Check, Share2, Stamp, Crown, Compass, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { triggerHaptic } from '../../services/deviceService';
import { getPassportProfile, getPassportStamps, unlockPassportStamp, PassportStamp, DigitalPassportProfile } from '../../services/passportService';
import { useLanguage } from '../../services/languageService';

interface DigitalPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

export const DigitalPassportModal: React.FC<DigitalPassportModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  userName
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'stamps' | 'identity' | 'achievements'>('stamps');
  const [profile, setProfile] = useState<DigitalPassportProfile>(() => getPassportProfile(userEmail, userName));
  const [stamps, setStamps] = useState<PassportStamp[]>(() => getPassportStamps(userEmail));
  const [selectedStamp, setSelectedStamp] = useState<PassportStamp | null>(null);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setProfile(getPassportProfile(userEmail, userName));
      setStamps(getPassportStamps(userEmail));
    }
  }, [isOpen, userEmail, userName]);

  useModalBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const handleStampAction = (stamp: PassportStamp) => {
    triggerHaptic('success');
    const updated = unlockPassportStamp(stamp.id);
    setStamps(updated);
    setProfile(getPassportProfile(userEmail, userName));
    setSelectedStamp({ ...stamp, unlockedAt: new Date().toISOString() });

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: [stamp.color, '#D4AF37', '#10B981']
      });
    } catch {}
  };

  const handleSharePassport = () => {
    triggerHaptic('light');
    const text = `🛂 My TripVerse Digital Passport:\n⭐ Tier: ${profile.travelTier}\n🌍 ${profile.countriesVisited} Countries Visited • ✈️ ${profile.stampsCount} Historic Landmark Stamps\nCheck out TripVerse: https://trip-verse.com`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const modalMarkup = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#0F291E] via-[#143828] to-[#0A1F16] border-2 border-amber-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Top Passport Header Bar */}
        <div className="relative px-5 py-4 border-b border-amber-500/20 bg-black/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-slate-950 font-black">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-wide text-amber-200">
                  {t('TRIPVERSE PASSPORT')}
                </h2>
                {profile.isFounder && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 shadow-xs flex items-center gap-1">
                    <Crown className="w-3 h-3 fill-amber-950" />
                    FOUNDER
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-300/80 font-mono">
                {profile.passportNumber} • {profile.travelTier}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSharePassport}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Share Passport Card"
            >
              {copiedShare ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedShare ? 'Copied!' : 'Share'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/30 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('stamps')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'stamps'
                ? 'border-amber-400 text-amber-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>{t('Visa & Landmark Stamps')} ({stamps.filter(s => !!s.unlockedAt).length}/{stamps.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'identity'
                ? 'border-amber-400 text-amber-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{t('Bio & Traveler ID')}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {activeTab === 'stamps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-emerald-200/90 bg-emerald-950/60 border border-emerald-500/20 rounded-2xl p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Stamps are verified via itinerary visits and GPS exploration check-ins.</span>
                </div>
                <span className="font-mono font-bold text-amber-300">
                  {profile.countriesVisited} Countries Visited
                </span>
              </div>

              {/* Stamp Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stamps.map((stamp) => {
                  const isUnlocked = !!stamp.unlockedAt;
                  return (
                    <div
                      key={stamp.id}
                      onClick={() => setSelectedStamp(stamp)}
                      className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none group flex flex-col justify-between min-h-[140px] ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-white/10 to-white/5 border-amber-400/40 hover:border-amber-300 shadow-lg hover:scale-102'
                          : 'bg-black/30 border-white/5 opacity-60 hover:opacity-90'
                      }`}
                    >
                      {/* Authenticity Ink Ring Stamp effect */}
                      <div className="flex items-start justify-between">
                        <span className="text-2xl">{stamp.icon}</span>
                        {isUnlocked ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            STAMPED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-white/10 text-slate-400">
                            LOCKED
                          </span>
                        )}
                      </div>

                      <div className="my-2">
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-200 line-clamp-1">
                          {stamp.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{stamp.location}</span>
                        </p>
                      </div>

                      {/* Vintage Stamp Seal bottom */}
                      <div 
                        className="text-[9px] font-mono font-bold tracking-widest uppercase py-1 px-1.5 rounded border border-dashed truncate text-center"
                        style={{
                          borderColor: isUnlocked ? stamp.color : 'rgba(255,255,255,0.1)',
                          color: isUnlocked ? stamp.color : 'rgba(255,255,255,0.3)'
                        }}
                      >
                        {stamp.sealText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#122B20] to-[#0D2118] border border-amber-400/30 space-y-6 relative overflow-hidden shadow-2xl">
              {/* Watermark Crest */}
              <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none select-none">
                <Compass className="w-64 h-64 text-amber-200" />
              </div>

              <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
                <div>
                  <h3 className="text-lg font-black text-amber-200 tracking-wider">
                    REPUBLIC OF CONCODE
                  </h3>
                  <p className="text-xs text-emerald-300 font-mono tracking-widest">
                    TRIPVERSE GLOBAL PASSPORT
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl border-2 border-amber-400/50 bg-amber-400/10 flex items-center justify-center text-amber-300 font-black text-xl shadow-inner">
                  {profile.isFounder ? '👑' : '✈️'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Passport No.</span>
                  <span className="text-sm font-bold text-amber-300">{profile.passportNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Traveler Tier</span>
                  <span className="text-sm font-bold text-emerald-300">{profile.travelTier}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Holder Name</span>
                  <span className="text-sm font-bold text-slate-100">{profile.holderName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Nationality / Base</span>
                  <span className="text-sm font-bold text-slate-100">{profile.homeCountry}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Issue Date</span>
                  <span className="text-slate-300">{profile.issueDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Validity</span>
                  <span className="text-slate-300">{profile.expiryDate}</span>
                </div>
              </div>

              {/* Statistics Strip */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-black/40 border border-white/5 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">Countries</span>
                  <span className="text-base font-extrabold text-amber-300">{profile.countriesVisited}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Stamps</span>
                  <span className="text-base font-extrabold text-emerald-400">{profile.stampsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Distance</span>
                  <span className="text-base font-extrabold text-blue-300">~{profile.totalKmTraveled.toLocaleString()} km</span>
                </div>
              </div>

              {/* Machine Readable Zone */}
              <div className="p-3 bg-black/60 rounded-xl border border-white/5 font-mono text-[10px] tracking-widest text-emerald-400/90 leading-loose select-all">
                P&lt;CONCODE&lt;{profile.holderName.replace(/\s+/g, '&lt;').toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br />
                {profile.passportNumber}&lt;&lt;&lt;IND9001014M2611158&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;06
              </div>
            </div>
          )}

          {/* Stamp Detail Popup */}
          {selectedStamp && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-400/40 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{selectedStamp.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-200">{selectedStamp.name}</h4>
                    <p className="text-xs text-slate-400">{selectedStamp.location}, {selectedStamp.country}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStamp(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedStamp.description}
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-mono text-emerald-400">
                  {selectedStamp.unlockedAt ? `Stamped on: ${new Date(selectedStamp.unlockedAt).toLocaleDateString()}` : 'Status: Ready to Stamp'}
                </span>
                {!selectedStamp.unlockedAt && (
                  <button
                    type="button"
                    onClick={() => handleStampAction(selectedStamp)}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Stamp className="w-3.5 h-3.5" />
                    <span>Stamp My Passport</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalMarkup, document.body)
    : modalMarkup;
};
