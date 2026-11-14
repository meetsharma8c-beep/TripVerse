import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  MapPin, 
  Check, 
  Share2, 
  ShieldCheck,
  Calendar,
  FileCheck2,
  Award,
  Fingerprint,
  Printer,
  ChevronRight,
  ExternalLink
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

  const handleSharePassport = () => {
    triggerHaptic('light');
    const text = 
      `TRIPVERSE DIPLOMATIC PASSPORT & TRAVEL DOSSIER\n` +
      `==================================================\n` +
      `Document Number : ${profile.passportNumber}\n` +
      `Bearer          : ${profile.holderName.toUpperCase()}\n` +
      `Nationality     : ${profile.nationalityCode} (${profile.homeCountry.toUpperCase()})\n` +
      `Diplomatic Tier : ${profile.travelTier.toUpperCase()}\n` +
      `Status          : ${profile.isFounder ? 'VIP FOUNDING ARCHITECT' : 'OFFICIAL TRAVELER'}\n` +
      `Clearances      : ${profile.countriesVisited} Sovereign Territories\n` +
      `Verified Seals  : ${profile.stampsCount} Immigration Port Clearances\n` +
      `Aerial/Ground   : ${profile.totalKmTraveled.toLocaleString()} km Traversed\n` +
      `Validity        : ${profile.expiryDate}\n` +
      `Issuing Body    : TripVerse Border & Travel Authority\n` +
      `Verification    : https://trip-verse.com\n` +
      `==================================================`;

    navigator.clipboard.writeText(text);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-[#0D1117] border border-[#2A3441] rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Top Diplomatic Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#212B36] bg-[#161C24] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#212B36] border border-[#344252] flex items-center justify-center text-[#C8AA6E]">
              <ShieldCheck className="w-4 h-4 text-[#C8AA6E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-[#C8AA6E] uppercase">
                  ICAO DOC 9303 COMPLIANT
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  • PASSPORT / PASSEPORT
                </span>
              </div>
              <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase">
                TripVerse Diplomatic Travel Record
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 px-2.5 rounded-lg bg-[#212B36] hover:bg-[#2C3847] text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 border border-[#344252] transition-colors cursor-pointer"
              title="Print Document"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleSharePassport}
              className="p-1.5 px-2.5 rounded-lg bg-[#212B36] hover:bg-[#2C3847] text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 border border-[#344252] transition-colors cursor-pointer"
              title="Copy Diplomatic Record"
            >
              {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copiedShare ? 'Copied' : 'Share'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#212B36] hover:bg-[#2C3847] text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Sub-Navigation */}
        <div className="flex border-b border-[#212B36] bg-[#0E131A] px-5 pt-2 gap-4 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('biodata')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-2 uppercase font-medium ${
              activeTab === 'biodata'
                ? 'border-[#C8AA6E] text-[#C8AA6E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Identity Bio-Data Page</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('visa-pages')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-2 uppercase font-medium ${
              activeTab === 'visa-pages'
                ? 'border-[#C8AA6E] text-[#C8AA6E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Visa Folio & Entry Seals ({unlockedCount}/{stamps.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-2 uppercase font-medium ${
              activeTab === 'ledger'
                ? 'border-[#C8AA6E] text-[#C8AA6E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Border Clearance Ledger</span>
          </button>
        </div>

        {/* Main Document Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-[#0B0F14]">
          {/* TAB 1: BIOMETRIC IDENTITY PAGE */}
          {activeTab === 'biodata' && (
            <div className="space-y-4">
              {/* Authentic Passport Laminate Card */}
              <div className="rounded-xl border border-[#2D3748] bg-[#141A23] p-6 shadow-xl relative overflow-hidden">
                {/* Guilloché Subtle Background Security Watermark */}
                <div 
                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage: 'radial-gradient(#C8AA6E 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                />

                {/* Passport Issuing State Header */}
                <div className="border-b border-[#2A3441] pb-3 mb-5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-[#C8AA6E] uppercase block">
                      TRIPVERSE BORDER & IMMIGRATION AUTHORITY
                    </span>
                    <h3 className="text-base font-semibold text-slate-100 tracking-wider uppercase font-sans">
                      PASSPORT • PASSEPORT
                    </h3>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 block uppercase">Document Series</span>
                    <span className="text-xs font-bold text-slate-200">TVR-2026-BIO</span>
                  </div>
                </div>

                {/* Passport Grid: Portrait + Official Bio Fields */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                  {/* Portrait Box */}
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-40 rounded border border-[#3A4756] bg-[#0E131A] p-1.5 flex flex-col justify-between shadow-inner relative">
                      <div className="w-full h-full rounded bg-[#17202C] flex flex-col items-center justify-center text-slate-400 relative overflow-hidden">
                        <Fingerprint className="w-16 h-16 text-slate-600/40" />
                        <span className="text-[9px] font-mono text-slate-400 absolute bottom-2 tracking-wider">
                          BIOMETRIC
                        </span>
                      </div>
                      {/* Security Stamp Overlay across Corner of Photo */}
                      <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded border border-[#C8AA6E]/60 bg-[#161C24]/90 text-[8px] font-mono text-[#C8AA6E] uppercase tracking-widest rotate-[-6deg]">
                        OFFICIAL SEAL
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 mt-3 text-center uppercase tracking-wider block">
                      Holder Signature / Signature
                    </span>
                    <span className="text-xs font-serif italic text-slate-300 mt-0.5">
                      {profile.holderName}
                    </span>
                  </div>

                  {/* Bio Metadata Fields in standard ICAO passport layout */}
                  <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-4 text-xs font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Type / Type</span>
                      <span className="font-bold text-slate-100">P</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Country Code / Code</span>
                      <span className="font-bold text-slate-100">{profile.nationalityCode}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Passport No. / No Passeport</span>
                      <span className="font-bold text-[#C8AA6E]">{profile.passportNumber}</span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-400 block uppercase">Surname / Nom</span>
                      <span className="font-bold text-slate-100 tracking-wide">{surname}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Sex / Sexe</span>
                      <span className="font-bold text-slate-100">M / F</span>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-400 block uppercase">Given Names / Prénoms</span>
                      <span className="font-bold text-slate-100 tracking-wide">{givenNames}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Nationality / Nationalité</span>
                      <span className="font-bold text-slate-100">{profile.homeCountry.toUpperCase()}</span>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Date of Issue / Délivrance</span>
                      <span className="font-semibold text-slate-300">{profile.issueDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Date of Expiry / Expiration</span>
                      <span className="font-semibold text-[#C8AA6E]">{profile.expiryDate}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Authority / Autorité</span>
                      <span className="font-semibold text-slate-300">TVR / BORDERS</span>
                    </div>
                  </div>
                </div>

                {/* ICAO Doc 9303 Machine Readable Zone (MRZ) */}
                <div className="mt-6 pt-4 border-t border-[#2A3441]">
                  <div className="bg-[#090D12] p-3 rounded border border-[#1E2631] font-mono text-[9px] sm:text-[10.5px] text-[#A0AEC0] tracking-[0.22em] leading-loose select-all overflow-x-auto whitespace-pre">
{`P<TVR<${surname}<<${givenNames.replace(/\s+/g, '<')}<<<<<<<<<<<<<<<<<<<<<<<\n${profile.passportNumber.padEnd(9, '<')}4${profile.nationalityCode}9811144M2611018<<<<<<<<<<<<<<<06`}
                  </div>
                </div>
              </div>

              {/* Status & Sovereign Clearance Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg border border-[#212B36] bg-[#141A23]">
                  <span className="text-[9px] text-slate-400 block uppercase">Classification</span>
                  <span className="font-bold text-slate-100 block mt-0.5">{profile.travelTier}</span>
                </div>
                <div className="p-3 rounded-lg border border-[#212B36] bg-[#141A23]">
                  <span className="text-[9px] text-slate-400 block uppercase">Sovereign Clearances</span>
                  <span className="font-bold text-[#C8AA6E] block mt-0.5">{profile.countriesVisited} Territories</span>
                </div>
                <div className="p-3 rounded-lg border border-[#212B36] bg-[#141A23]">
                  <span className="text-[9px] text-slate-400 block uppercase">Aerial / Terrestrial Distance</span>
                  <span className="font-bold text-slate-200 block mt-0.5">~{profile.totalKmTraveled.toLocaleString()} km</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTHENTIC VISA PAGES & ENTRY SEALS */}
          {activeTab === 'visa-pages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#212B36] pb-2">
                <span>OFFICIAL VISAS & ENTRY ENDORSEMENTS / VISAS ET CACHETS</span>
                <span>PAGE 04 / 32</span>
              </div>

              {/* Real Immigration Inked Stamps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {stamps.map((stamp) => {
                  const isUnlocked = !!stamp.unlockedAt;

                  return (
                    <div
                      key={stamp.id}
                      onClick={() => setSelectedStamp(stamp)}
                      className={`relative p-4 rounded-lg border transition-all cursor-pointer select-none min-h-[145px] flex flex-col justify-between ${
                        isUnlocked
                          ? 'border-[#3E4C5E] bg-[#111720] hover:bg-[#151D28] shadow-md'
                          : 'border-[#1E2631] bg-[#0B0F14] opacity-50 hover:opacity-75'
                      }`}
                    >
                      {/* Top Header of Stamp */}
                      <div className="flex items-center justify-between border-b border-[#242F3D] pb-1.5 text-xs font-mono">
                        <span className="font-bold text-slate-200 tracking-wider">
                          {stamp.portCode}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isUnlocked ? 'text-[#C8AA6E] border border-[#C8AA6E]/40' : 'text-slate-500 border border-slate-700'
                        }`}>
                          {isUnlocked ? 'ADMITTED' : 'REQUIRED'}
                        </span>
                      </div>

                      {/* Middle Seal Body */}
                      <div className="my-2.5">
                        <h4 className="text-xs font-semibold text-slate-100 line-clamp-1 font-sans">
                          {stamp.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                          {stamp.location}
                        </p>
                        <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase">
                          Ref: {stamp.vintageNumber}
                        </div>
                      </div>

                      {/* Official Immigration Inked Footprint */}
                      <div className="pt-2 border-t border-dashed border-[#242F3D] flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">
                          {isUnlocked && stamp.unlockedAt ? new Date(stamp.unlockedAt).toLocaleDateString('en-GB') : '---'}
                        </span>
                        <span className="text-[#C8AA6E] text-[9px] uppercase tracking-wider font-semibold">
                          {stamp.sealText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: BORDER CLEARANCE LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#212B36] pb-2">
                <span>OFFICIAL RECORD OF BORDER CROSSINGS & AUTHORIZATIONS</span>
                <span>ENTRY / EXIT REGISTRY</span>
              </div>

              <div className="rounded-xl border border-[#212B36] bg-[#111720] overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#161C24] text-slate-400 border-b border-[#212B36] text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Port Code</th>
                      <th className="py-2.5 px-3">Jurisdiction</th>
                      <th className="py-2.5 px-3">Clearance Classification</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2632] text-slate-300">
                    {stamps.map((stamp) => (
                      <tr key={stamp.id} className="hover:bg-[#161F2A] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-200">{stamp.portCode}</td>
                        <td className="py-2.5 px-3">{stamp.country}</td>
                        <td className="py-2.5 px-3 text-slate-400">{stamp.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {stamp.unlockedAt ? new Date(stamp.unlockedAt).toLocaleDateString('en-GB') : 'Pending Inspection'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            stamp.unlockedAt 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
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

          {/* Stamp Detail Inspection Dialog */}
          {selectedStamp && (
            <div className="p-4 rounded-xl bg-[#141B24] border border-[#2F3D4E] space-y-3">
              <div className="flex items-center justify-between border-b border-[#242F3D] pb-2">
                <div>
                  <span className="text-[9px] font-mono text-[#C8AA6E] uppercase block">
                    PORT CLEARANCE INSPECTION • {selectedStamp.portCode}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100">{selectedStamp.name}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStamp(null)}
                  className="text-xs font-mono text-slate-400 hover:text-white px-2 py-1 rounded bg-[#212B36]"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                {selectedStamp.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-slate-400">
                <div>
                  <span className="block text-[9px] uppercase text-slate-500">Jurisdiction</span>
                  <span className="text-slate-200">{selectedStamp.location}, {selectedStamp.country}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase text-slate-500">Authorization Reference</span>
                  <span className="text-slate-200">{selectedStamp.vintageNumber}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#242F3D]">
                <span className="text-xs font-mono text-slate-400">
                  {selectedStamp.unlockedAt 
                    ? `Admission clearance recorded on ${new Date(selectedStamp.unlockedAt).toLocaleDateString('en-GB')}` 
                    : 'Clearance verification pending entry confirmation'}
                </span>
                {!selectedStamp.unlockedAt && (
                  <button
                    type="button"
                    onClick={() => handleStampAction(selectedStamp)}
                    className="px-3 py-1.5 rounded-lg bg-[#C8AA6E] hover:bg-[#B39255] text-slate-950 font-bold text-xs font-mono transition-colors cursor-pointer"
                  >
                    Authenticate Entry Clearance
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
