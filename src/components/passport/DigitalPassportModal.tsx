import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  MapPin, 
  Globe, 
  Sparkles, 
  Check, 
  Share2, 
  Stamp, 
  Crown, 
  Compass, 
  ShieldCheck,
  Mountain,
  Landmark,
  Building2,
  Calendar,
  FileCheck2,
  Award,
  Fingerprint
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { triggerHaptic } from '../../services/deviceService';
import { 
  getPassportProfile, 
  getPassportStamps, 
  unlockPassportStamp, 
  PassportStamp, 
  DigitalPassportProfile 
} from '../../services/passportService';
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
  const [activeTab, setActiveTab] = useState<'stamps' | 'identity' | 'analytics'>('stamps');
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
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
        colors: [stamp.color, '#D4AF37', '#10B981']
      });
    } catch {}
  };

  const handleSharePassport = () => {
    triggerHaptic('light');
    const text = 
      `TRIPVERSE DIGITAL TRAVEL PASSPORT\n` +
      `----------------------------------------\n` +
      `Document No: ${profile.passportNumber}\n` +
      `Holder: ${profile.holderName}\n` +
      `Tier: ${profile.travelTier}\n` +
      `Verified Border Clearances: ${profile.countriesVisited} Sovereign Territories\n` +
      `Landmark Stamps: ${profile.stampsCount} Registered Seals\n` +
      `Traversed Ground: ${profile.totalKmTraveled.toLocaleString()} km\n` +
      `Verification Authority: https://trip-verse.com`;

    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const renderStampIcon = (stamp: PassportStamp, className = 'w-5 h-5') => {
    if (stamp.category === 'country' || stamp.icon === 'flag') {
      return (
        <span className="font-mono font-black text-xs px-1.5 py-0.5 rounded border border-current tracking-wider">
          {stamp.countryCode}
        </span>
      );
    }
    switch (stamp.icon) {
      case 'crown':
        return <Crown className={className} />;
      case 'mountain':
        return <Mountain className={className} />;
      case 'landmark':
      case 'monument':
      case 'arena':
        return <Landmark className={className} />;
      case 'building':
        return <Building2 className={className} />;
      default:
        return <Compass className={className} />;
    }
  };

  const unlockedStampsCount = stamps.filter(s => !!s.unlockedAt).length;

  const modalMarkup = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#0B1A14] via-[#0E221B] to-[#07130E] border-2 border-amber-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Top Diplomatic Header Bar */}
        <div className="relative px-5 py-4 border-b border-amber-500/20 bg-black/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold tracking-wider text-amber-200 uppercase font-sans">
                  {t('Digital Travel Passport')}
                </h2>
                {profile.isFounder ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-xs tracking-wider">
                    <Crown className="w-3 h-3 fill-slate-950" />
                    FOUNDER ARCHITECT
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-emerald-300 font-mono border border-emerald-500/30">
                    ICAO 9303
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-300/80 font-mono tracking-wider">
                DOCUMENT NO. {profile.passportNumber} • {profile.travelTier.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSharePassport}
              className="p-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
              title="Export Passport Dossier"
            >
              {copiedShare ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copiedShare ? 'Copied' : 'Share Dossier'}</span>
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
        <div className="flex border-b border-white/10 bg-black/30 px-5 pt-2.5 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('stamps')}
            className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 tracking-wide uppercase font-mono text-[11px] ${
              activeTab === 'stamps'
                ? 'border-amber-400 text-amber-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>{t('Visa Seals & Clearances')} ({unlockedStampsCount}/{stamps.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 tracking-wide uppercase font-mono text-[11px] ${
              activeTab === 'identity'
                ? 'border-amber-400 text-amber-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>{t('Biometric Identity')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-2.5 px-2 border-b-2 transition-all cursor-pointer flex items-center gap-2 tracking-wide uppercase font-mono text-[11px] ${
              activeTab === 'analytics'
                ? 'border-amber-400 text-amber-300 font-extrabold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{t('Exploration Tier')}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {activeTab === 'stamps' && (
            <div className="space-y-4">
              {/* Authenticity Bar */}
              <div className="flex items-center justify-between text-xs text-emerald-200/90 bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-3 px-4">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-sans">Authentic immigration seals verified via itinerary GPS logs and checkpoint admissions.</span>
                </div>
                <span className="font-mono font-bold text-amber-300 text-xs shrink-0 pl-2">
                  {profile.countriesVisited} TERRITORIES
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
                      className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer select-none group flex flex-col justify-between min-h-[148px] ${
                        isUnlocked
                          ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.03] border-amber-400/40 hover:border-amber-300 shadow-lg hover:scale-102'
                          : 'bg-black/30 border-white/5 opacity-55 hover:opacity-85'
                      }`}
                    >
                      {/* Port Header & Verification Status */}
                      <div className="flex items-start justify-between">
                        <div 
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                          style={{
                            backgroundColor: isUnlocked ? `${stamp.color}20` : 'rgba(255,255,255,0.05)',
                            color: isUnlocked ? stamp.color : 'rgba(255,255,255,0.4)',
                            border: `1px solid ${isUnlocked ? stamp.color : 'rgba(255,255,255,0.1)'}`
                          }}
                        >
                          {renderStampIcon(stamp, 'w-4 h-4')}
                        </div>

                        {isUnlocked ? (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" />
                            VERIFIED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold uppercase bg-white/5 text-slate-400 border border-white/10">
                            PENDING
                          </span>
                        )}
                      </div>

                      {/* Seal Title & Coordinates */}
                      <div className="my-2">
                        <h4 className="text-xs font-bold text-slate-100 group-hover:text-amber-200 line-clamp-1 font-sans">
                          {stamp.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 line-clamp-1 flex items-center gap-1 mt-0.5 font-mono">
                          <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                          <span>{stamp.location}</span>
                        </p>
                      </div>

                      {/* Official Immigration Circular / Octagonal Ink Seal */}
                      <div 
                        className="text-[9px] font-mono font-bold tracking-widest uppercase py-1 px-1.5 rounded border border-dashed truncate text-center transition-colors"
                        style={{
                          borderColor: isUnlocked ? stamp.color : 'rgba(255,255,255,0.15)',
                          color: isUnlocked ? stamp.color : 'rgba(255,255,255,0.3)',
                          backgroundColor: isUnlocked ? `${stamp.color}10` : 'transparent'
                        }}
                      >
                        {stamp.portCode} • {stamp.vintageNumber}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'identity' && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0F261D] via-[#0B1E17] to-[#07130E] border border-amber-400/30 space-y-6 relative overflow-hidden shadow-2xl">
              {/* Security Background Pattern Watermark */}
              <div className="absolute right-3 bottom-3 opacity-5 pointer-events-none select-none">
                <Compass className="w-72 h-72 text-amber-200" />
              </div>

              {/* Issuing Authority Header */}
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
                <div>
                  <span className="text-[9px] font-mono tracking-widest text-emerald-400 block uppercase font-bold">
                    GLOBAL TRAVEL PASSPORT • DIPLOMATIC CLEARANCE
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-amber-200 tracking-wider font-sans uppercase">
                    TRIPVERSE GLOBAL AUTHORITY
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-2xl border-2 border-amber-400/50 bg-amber-400/10 flex items-center justify-center text-amber-300 font-mono font-black text-xs shadow-inner">
                  {profile.isFounder ? (
                    <Crown className="w-6 h-6 text-amber-400" />
                  ) : (
                    <Fingerprint className="w-6 h-6 text-amber-400" />
                  )}
                </div>
              </div>

              {/* Biometric Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Document No.</span>
                  <span className="text-sm font-bold text-amber-300">{profile.passportNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Classification</span>
                  <span className="text-sm font-bold text-emerald-300">{profile.travelTier}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Nationality Code</span>
                  <span className="text-sm font-bold text-slate-100">{profile.nationalityCode} / {profile.homeCountry.toUpperCase()}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Full Name</span>
                  <span className="text-sm font-bold text-slate-100">{profile.holderName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Issuance Authority</span>
                  <span className="text-slate-300 font-semibold">TVR / IMMIGRATION</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Date of Issue</span>
                  <span className="text-slate-300">{profile.issueDate}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Document Validity</span>
                  <span className="text-amber-300 font-bold">{profile.expiryDate}</span>
                </div>
              </div>

              {/* Statistics Strip */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-black/50 border border-white/10 text-center font-mono">
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Territories</span>
                  <span className="text-base sm:text-lg font-black text-amber-300">{profile.countriesVisited}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Verified Seals</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400">{profile.stampsCount}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase tracking-wider">Ground Traversed</span>
                  <span className="text-base sm:text-lg font-black text-sky-300">~{profile.totalKmTraveled.toLocaleString()} km</span>
                </div>
              </div>

              {/* ICAO Doc 9303 Machine Readable Zone (MRZ) */}
              <div className="p-3.5 bg-black/70 rounded-xl border border-white/10 font-mono text-[9px] sm:text-[10px] tracking-widest text-emerald-400/90 leading-loose select-all uppercase overflow-x-auto whitespace-pre">
                {`P<TVR<${profile.holderName.replace(/[^A-Za-z0-9]/g, '<').toUpperCase().slice(0, 30).padEnd(39, '<')}\n${profile.passportNumber.padEnd(9, '<')}4IND9001014M2611158<<<<<<<<<<<<06`}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Explorer Progression Dossier
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  LEVEL {profile.travelTier === 'Cosmic Nomad' ? '4' : profile.travelTier === 'Globetrotter' ? '3' : profile.travelTier === 'Continental Voyager' ? '2' : '1'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold">Current Standing</span>
                    <span className="text-amber-300 font-mono font-black">{profile.travelTier}</span>
                  </div>
                  <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-amber-400 h-full rounded-full transition-all duration-500"
                      style={{
                        width: profile.travelTier === 'Cosmic Nomad' ? '100%' : profile.travelTier === 'Globetrotter' ? '75%' : profile.travelTier === 'Continental Voyager' ? '50%' : '25%'
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {profile.travelTier === 'Cosmic Nomad' 
                      ? 'Maximum explorer clearance achieved. Unrestricted global access unlocked.'
                      : 'Log additional cross-border itineraries and landmark visits to advance to the next diplomatic tier.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-slate-400 block uppercase">Founder Clearance</span>
                    <span className={`text-sm font-bold ${profile.isFounder ? 'text-amber-300' : 'text-slate-400'}`}>
                      {profile.isFounder ? 'ACTIVE • LIFETIME VIP' : 'STANDARD TIER'}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className="text-[10px] text-slate-400 block uppercase">Circumnavigation Ratio</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {Math.round((profile.totalKmTraveled / 40075) * 100)}% of Equator
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stamp Detail Popup */}
          {selectedStamp && (
            <div className="p-4 rounded-2xl bg-slate-900/95 border border-amber-400/40 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                    style={{
                      backgroundColor: `${selectedStamp.color}20`,
                      color: selectedStamp.color,
                      border: `1px solid ${selectedStamp.color}`
                    }}
                  >
                    {renderStampIcon(selectedStamp, 'w-5 h-5')}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-200 font-sans">{selectedStamp.name}</h4>
                    <p className="text-xs text-slate-400 font-mono">{selectedStamp.location}, {selectedStamp.country}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStamp(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {selectedStamp.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-[11px] font-mono text-emerald-400">
                  {selectedStamp.unlockedAt 
                    ? `Verified on: ${new Date(selectedStamp.unlockedAt).toLocaleDateString()}` 
                    : 'Admission: Pending Check-in'}
                </span>
                {!selectedStamp.unlockedAt && (
                  <button
                    type="button"
                    onClick={() => handleStampAction(selectedStamp)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Stamp className="w-3.5 h-3.5" />
                    <span>Stamp Passport</span>
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
