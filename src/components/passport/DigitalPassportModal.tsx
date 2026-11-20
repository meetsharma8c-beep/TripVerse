import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Share2,
  ShieldCheck,
  Calendar,
  FileCheck2,
  Fingerprint,
  Printer,
  Copy,
  Sparkles,
  Globe,
  Compass
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'biodata' | 'visa-pages' | 'ledger'>('biodata');
  const [profile, setProfile] = useState<DigitalPassportProfile>(() => getPassportProfile(userEmail, userName));
  const [stamps, setStamps] = useState<PassportStamp[]>(() => getPassportStamps(userEmail));
  const [selectedStamp, setSelectedStamp] = useState<PassportStamp | null>(null);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);
  const [copiedDocNo, setCopiedDocNo] = useState<boolean>(false);

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
  };

  const handleCopyDocNo = () => {
    triggerHaptic('light');
    navigator.clipboard?.writeText(profile.passportNumber);
    setCopiedDocNo(true);
    setTimeout(() => setCopiedDocNo(false), 2000);
  };

  const handleSharePassport = () => {
    triggerHaptic('light');
    const text =
      `TRIPVERSE DIGITAL TRAVEL PASSPORT\n` +
      `==================================================\n` +
      `Document Number : ${profile.passportNumber}\n` +
      `Bearer          : ${profile.holderName.toUpperCase()}\n` +
      `Nationality     : ${profile.nationalityCode} (${profile.homeCountry.toUpperCase()})\n` +
      `Travel Tier     : ${profile.travelTier.toUpperCase()}\n` +
      `Status          : ${profile.isFounder ? 'VIP FOUNDING ARCHITECT' : 'OFFICIAL TRAVELER'}\n` +
      `Territories     : ${profile.countriesVisited} Verified\n` +
      `Entry Seals     : ${profile.stampsCount} Port Clearances\n` +
      `Distance Logged : ${profile.totalKmTraveled.toLocaleString()} km\n` +
      `Validity        : ${profile.expiryDate}\n` +
      `Issued By       : TripVerse Travel Registry (https://trip-verse.com)\n` +
      `==================================================`;

    navigator.clipboard?.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const handlePrint = () => {
    triggerHaptic('light');
    window.print();
  };

  const unlockedCount = stamps.filter(s => !!s.unlockedAt).length;
  const nameParts = (profile.holderName || 'TRAVELER').trim().split(' ');
  const surname = nameParts.length > 1 ? nameParts[nameParts.length - 1].toUpperCase() : 'TRAVELER';
  const givenNames = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ').toUpperCase() : nameParts[0].toUpperCase();

  const modalMarkup = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Digital Travel Passport"
      onClick={onClose}
      className="fixed inset-0 z-[130] overscroll-contain flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/75 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl glass-modal liquid-rim rounded-[28px] sm:rounded-[32px] overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[92dvh]"
      >
        {/* Luxury Emerald & Brushed Gold Booklet Header */}
        <div className="relative px-4 sm:px-6 py-4 bg-gradient-to-r from-[#132E20] via-[#214C34] to-[#2B3D2C] text-white flex items-center justify-between gap-3 border-b border-amber-300/20 shrink-0 overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-amber-400/15 blur-2xl" />
          <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-300/35 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase">
                  ICAO DOC 9303 • DIGITAL FOLIO
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-emerald-200 border border-white/15 font-semibold">
                  {unlockedCount}/{stamps.length} Seals
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-white truncate mt-0.5">
                {t('Digital Travel Passport')}
              </h2>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-0 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer active:scale-95"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleSharePassport}
              className="min-h-0 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer active:scale-95"
              title="Copy Diplomatic Record"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedShare ? 'Copied' : 'Share'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-0 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close passport"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Liquid Capsule Tab Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#F4F6F2]/90 dark:bg-[#090F1A]/90 border-b border-[#E2EBE1] dark:border-white/10 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/80 dark:bg-slate-900/80 border border-[#DCE7DB] dark:border-white/10 overflow-x-auto scrollbar-none max-w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none">
            <button
              type="button"
              onClick={() => setActiveTab('biodata')}
              className={`min-h-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'biodata'
                  ? 'bg-[#2D5A3D] dark:bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Identity Bio-Data</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('visa-pages')}
              className={`min-h-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'visa-pages'
                  ? 'bg-[#2D5A3D] dark:bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Visa Stamps ({unlockedCount}/{stamps.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`min-h-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'bg-[#2D5A3D] dark:bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Clearance Ledger</span>
            </button>
          </div>
        </div>

        {/* Main Document Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-gradient-to-b from-[#F8FAF7] via-[#F4F6F2] to-[#EAF0E9] dark:from-[#0B121E] dark:via-[#0D1522] dark:to-[#090E18]">
          {/* TAB 1: BIOMETRIC IDENTITY PAGE */}
          {activeTab === 'biodata' && (
            <div className="space-y-4">
              {/* Frosted Tactile Passport Bio Card */}
              <div className="rounded-[24px] border border-[#D4E2D2] dark:border-amber-300/20 bg-white/95 dark:bg-[#121B2B]/95 p-5 sm:p-6 shadow-lg passport-foil-card relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-[0.045] dark:opacity-[0.04] pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#2D5A3D 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                />

                {/* Passport Issuing Header */}
                <div className="relative border-b border-[#E2EBE1] dark:border-white/10 pb-3.5 mb-5 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#2D5A3D] dark:text-amber-300 uppercase block">
                      TRIPVERSE TRAVEL AUTHORITY
                    </span>
                    <h3 className="text-base sm:text-lg font-display font-extrabold text-[#152A1C] dark:text-white tracking-wide uppercase">
                      PASSPORT • <span className="font-serif italic font-normal text-[#2D5A3D] dark:text-emerald-300">Passeport</span>
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDocNo}
                    className="min-h-0 px-2.5 py-1.5 rounded-xl bg-[#F4F6F2] dark:bg-slate-800/80 border border-[#DCE7DB] dark:border-white/10 text-right font-mono hover:border-[#2D5A3D] transition-colors cursor-pointer"
                    title="Copy Passport Number"
                  >
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Doc Series • Tap Copy</span>
                    <span className="text-xs font-bold text-[#2D5A3D] dark:text-amber-300 inline-flex items-center gap-1">
                      {profile.passportNumber}
                      {copiedDocNo ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
                    </span>
                  </button>
                </div>

                {/* Portrait + Bio Fields */}
                <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                  {/* Biometric Photo Plate */}
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-40 rounded-2xl border border-[#DCE7DB] dark:border-white/15 bg-[#EAF0E9] dark:bg-[#0B121D] p-1.5 flex flex-col justify-between shadow-inner relative">
                      <div className="w-full h-full rounded-xl bg-gradient-to-b from-white/80 to-[#DCE7DB]/60 dark:from-slate-800/80 dark:to-slate-900 flex flex-col items-center justify-center text-[#2D5A3D] dark:text-emerald-300 relative overflow-hidden">
                        <Fingerprint className="w-16 h-16 opacity-35" />
                        <span className="text-[9px] font-mono font-bold tracking-widest absolute bottom-2.5 opacity-80">
                          BIOMETRIC ID
                        </span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full border border-amber-500/60 bg-amber-50/95 dark:bg-amber-950/90 text-[8px] font-mono font-bold text-amber-800 dark:text-amber-300 uppercase tracking-widest rotate-[-6deg] shadow-xs">
                        VERIFIED SEAL
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-3 text-center uppercase tracking-wider block">
                      Holder Signature
                    </span>
                    <span className="text-sm font-serif italic text-[#152A1C] dark:text-slate-200 mt-0.5">
                      {profile.holderName}
                    </span>
                  </div>

                  {/* Standard ICAO Metadata Grid */}
                  <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4 text-xs font-mono">
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Type</span>
                      <span className="font-bold text-slate-900 dark:text-white">P (Explorer)</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Country Code</span>
                      <span className="font-bold text-slate-900 dark:text-white">{profile.nationalityCode}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Passport No.</span>
                      <span className="font-bold text-[#2D5A3D] dark:text-amber-300">{profile.passportNumber}</span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Surname / Nom</span>
                      <span className="font-bold text-slate-900 dark:text-white tracking-wide">{surname}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Registry</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300">ACTIVE</span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Given Names / Prénoms</span>
                      <span className="font-bold text-slate-900 dark:text-white tracking-wide">{givenNames}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Nationality</span>
                      <span className="font-bold text-slate-900 dark:text-white">{profile.homeCountry.toUpperCase()}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Date of Issue</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{profile.issueDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Date of Expiry</span>
                      <span className="font-semibold text-amber-700 dark:text-amber-300">{profile.expiryDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block uppercase">Authority</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">TVR / GLOBAL</span>
                    </div>
                  </div>
                </div>

                {/* ICAO Doc 9303 Machine Readable Zone (MRZ) */}
                <div className="mt-6 pt-4 border-t border-[#E2EBE1] dark:border-white/10">
                  <div className="bg-[#152A1C] dark:bg-[#070B12] p-3.5 rounded-2xl border border-[#2D5A3D]/40 dark:border-white/10 font-mono text-[9px] sm:text-[10.5px] text-emerald-200/90 tracking-[0.2em] leading-loose select-all overflow-x-auto whitespace-pre shadow-inner">
{`P<TVR<${surname}<<${givenNames.replace(/\s+/g, '<')}<<<<<<<<<<<<<<<<<<<<<<<\n${profile.passportNumber.padEnd(9, '<')}4${profile.nationalityCode}9811144U2611018<<<<<<<<<<<<<<<06`}
                  </div>
                </div>
              </div>

              {/* Liquid Bento Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="liquid-glass-surface rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Explorer Rank</span>
                    <span className="font-display font-bold text-slate-900 dark:text-white truncate block">{profile.travelTier}</span>
                  </div>
                </div>
                <div className="liquid-glass-surface rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Territories Cleared</span>
                    <span className="font-display font-bold text-[#2D5A3D] dark:text-emerald-300 truncate block">{profile.countriesVisited} Regions</span>
                  </div>
                </div>
                <div className="liquid-glass-surface rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Distance Logged</span>
                    <span className="font-display font-bold text-slate-900 dark:text-white truncate block">~{profile.totalKmTraveled.toLocaleString()} km</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTHENTIC VISA PAGES & ENTRY SEALS */}
          {activeTab === 'visa-pages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-[#DCE7DB] dark:border-white/10 pb-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">Official Entry Stamps & Visa Cachets</span>
                <span className="font-mono text-[11px]">PAGE 04 / 32</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {stamps.map((stamp) => {
                  const isUnlocked = !!stamp.unlockedAt;

                  return (
                    <button
                      type="button"
                      key={stamp.id}
                      onClick={() => setSelectedStamp(stamp)}
                      className={`text-left relative p-4 rounded-2xl border transition-all cursor-pointer select-none min-h-[148px] flex flex-col justify-between ${
                        isUnlocked
                          ? 'bg-white dark:bg-[#141E2E] border-[#B6CCB4] dark:border-amber-400/35 liquid-bento-card'
                          : 'bg-white/55 dark:bg-slate-900/45 border-dashed border-slate-300 dark:border-slate-700 opacity-70 hover:opacity-100 hover:border-[#8EA78D]'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2 text-xs font-mono">
                        <span className="font-extrabold text-[#2D5A3D] dark:text-emerald-300 tracking-wider">
                          {stamp.portCode}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isUnlocked
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-[#2D5A3D] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {isUnlocked ? 'STAMPED' : 'TAP TO STAMP'}
                        </span>
                      </div>

                      <div className="my-2.5">
                        <h4 className="text-sm font-display font-bold text-slate-900 dark:text-white line-clamp-1">
                          {stamp.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {stamp.location}
                        </p>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 uppercase">
                          Ref: {stamp.vintageNumber}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-dashed border-slate-200 dark:border-white/10 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500 dark:text-slate-400">
                          {isUnlocked && stamp.unlockedAt ? new Date(stamp.unlockedAt).toLocaleDateString('en-GB') : 'Unvisited'}
                        </span>
                        <span className={`text-[9px] uppercase tracking-wider font-bold ${isUnlocked ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400'}`}>
                          {stamp.sealText}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BORDER CLEARANCE LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-[#DCE7DB] dark:border-white/10 pb-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">Entry & Exit Registry</span>
                <span className="font-mono text-[11px]">{unlockedCount} CLEARED</span>
              </div>

              <div className="rounded-2xl border border-[#DCE7DB] dark:border-white/10 bg-white/95 dark:bg-[#121B2B] overflow-x-auto shadow-sm">
                <table className="w-full text-left text-xs min-w-[540px]">
                  <thead className="bg-[#EAF0E9]/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-[#DCE7DB] dark:border-white/10 text-[10px] uppercase font-mono">
                    <tr>
                      <th className="py-3 px-3.5">Port Code</th>
                      <th className="py-3 px-3.5">Jurisdiction</th>
                      <th className="py-3 px-3.5">Clearance</th>
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                    {stamps.map((stamp) => (
                      <tr key={stamp.id} className="hover:bg-[#F8FAF7] dark:hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono font-bold text-[#2D5A3D] dark:text-emerald-300">{stamp.portCode}</td>
                        <td className="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">{stamp.country}</td>
                        <td className="py-2.5 px-3.5 text-slate-500 dark:text-slate-400">{stamp.name}</td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-500 dark:text-slate-400">
                          {stamp.unlockedAt ? new Date(stamp.unlockedAt).toLocaleDateString('en-GB') : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            stamp.unlockedAt
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-[#2D5A3D] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {stamp.unlockedAt ? 'Cleared' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stamp Detail Inspection Panel */}
          {selectedStamp && (
            <div className="liquid-glass-surface rounded-2xl p-4 sm:p-5 space-y-3 border border-[#C6D8C5] dark:border-amber-400/30 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#E2EBE1] dark:border-white/10 pb-2.5">
                <div>
                  <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 uppercase block">
                    PORT CLEARANCE • {selectedStamp.portCode}
                  </span>
                  <h4 className="text-sm sm:text-base font-display font-bold text-slate-900 dark:text-white">{selectedStamp.name}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStamp(null)}
                  className="min-h-0 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedStamp.description}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-[#E2EBE1] dark:border-white/10">
                  <span className="block text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Location</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedStamp.location}, {selectedStamp.country}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-[#E2EBE1] dark:border-white/10">
                  <span className="block text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Seal Reference</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{selectedStamp.vintageNumber}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E2EBE1] dark:border-white/10">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {selectedStamp.unlockedAt
                    ? `Stamped on ${new Date(selectedStamp.unlockedAt).toLocaleDateString('en-GB')}`
                    : 'Tap below to stamp this destination in your passport'}
                </span>
                {!selectedStamp.unlockedAt && (
                  <button
                    type="button"
                    onClick={() => handleStampAction(selectedStamp)}
                    className="btn-liquid-primary min-h-0 px-4 py-2 text-xs"
                  >
                    Stamp Destination Seal
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
