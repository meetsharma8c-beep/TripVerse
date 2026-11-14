import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Share2, 
  Check, 
  Globe, 
  MapPin, 
  Compass, 
  Crown, 
  Mountain,
  Landmark,
  Building2,
  Calendar,
  ShieldCheck,
  Printer,
  FileText,
  Navigation,
  ArrowUpRight
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { triggerHaptic } from '../../services/deviceService';
import { 
  computeTravelWrapped, 
  generateWrappedSocialText, 
  TravelWrappedStats 
} from '../../services/travelWrappedService';
import { Trip } from '../../types/trip';

interface TripWrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  userEmail?: string;
}

export const TripWrappedModal: React.FC<TripWrappedModalProps> = ({
  isOpen,
  onClose,
  trips,
  userEmail
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'manifest' | 'certificate'>('summary');
  const [stats] = useState<TravelWrappedStats>(() => computeTravelWrapped(trips, userEmail));
  const [copied, setCopied] = useState<boolean>(false);

  useModalBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const handleShare = () => {
    triggerHaptic('medium');
    const text = generateWrappedSocialText(stats);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    triggerHaptic('light');
    window.print();
  };

  const renderArchetypeInsignia = (className = 'w-4 h-4') => {
    switch (stats.travelerArchetype.iconName) {
      case 'crown':
        return <Crown className={className} />;
      case 'mountain':
        return <Mountain className={className} />;
      case 'landmark':
        return <Landmark className={className} />;
      case 'building':
        return <Building2 className={className} />;
      default:
        return <Compass className={className} />;
    }
  };

  const modalMarkup = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl bg-[#0D1017] border border-[#263140] rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-[#212B36] bg-[#141A23] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1B232E] border border-[#344252] flex items-center justify-center text-[#C8AA6E]">
              <Calendar className="w-4 h-4 text-[#C8AA6E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-[#C8AA6E] uppercase">
                  ANNUAL VOYAGE RETROSPECTIVE • {stats.year}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  • AUDITED DOSSIER
                </span>
              </div>
              <h2 className="text-sm font-semibold tracking-wide text-slate-100 uppercase font-sans">
                TripVerse Annual Travel Ledger
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 px-2.5 rounded-lg bg-[#212B36] hover:bg-[#2C3847] text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 border border-[#344252] transition-colors cursor-pointer"
              title="Print Dossier"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 px-2.5 rounded-lg bg-[#212B36] hover:bg-[#2C3847] text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 border border-[#344252] transition-colors cursor-pointer"
              title="Copy Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
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
            onClick={() => setActiveTab('summary')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-2 uppercase font-medium ${
              activeTab === 'summary'
                ? 'border-[#C8AA6E] text-[#C8AA6E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Executive Metrics Matrix</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-2 uppercase font-medium ${
              activeTab === 'manifest'
                ? 'border-[#C8AA6E] text-[#C8AA6E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Voyage Manifest Ledger ({stats.totalTrips})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('certificate')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer flex items-center gap-2 uppercase font-medium ${
              activeTab === 'certificate'
                ? 'border-[#C8AA6E] text-[#C8AA6E]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Official Dossier Certificate</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar bg-[#0B0F14]">
          {/* TAB 1: EXECUTIVE METRICS MATRIX */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Traveler Classification Card */}
              <div className="p-4 rounded-xl border border-[#2D3748] bg-[#141A23] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-lg bg-[#1E2632] border border-[#344252] flex items-center justify-center text-[#C8AA6E]">
                    {renderArchetypeInsignia('w-5 h-5')}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Traveler Classification • Audit 2026
                    </span>
                    <h3 className="text-base font-bold text-slate-100 font-sans tracking-wide">
                      {stats.travelerArchetype.title}
                    </h3>
                  </div>
                </div>

                <div className="text-left sm:text-right font-mono text-xs">
                  <span className="px-2 py-0.5 rounded border border-[#C8AA6E]/40 text-[#C8AA6E] font-bold text-[10px] uppercase tracking-wider block sm:inline-block">
                    {stats.travelerArchetype.badge}
                  </span>
                  {stats.isFounder && (
                    <span className="text-[10px] text-amber-300 block mt-1">
                      VIP Founding Architect Clearance
                    </span>
                  )}
                </div>
              </div>

              {/* High-Contrast Core Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl border border-[#212B36] bg-[#111720]">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Ground / Air Traversed</span>
                  <span className="text-lg font-bold text-[#C8AA6E] block mt-1">
                    ~{stats.totalKmTraveled.toLocaleString()} km
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {Math.round((stats.totalKmTraveled / 40075) * 100)}% of Equator
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-[#212B36] bg-[#111720]">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Expedition Time</span>
                  <span className="text-lg font-bold text-slate-100 block mt-1">
                    {stats.totalDaysTraveled} Days
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Across {stats.totalTrips} Voyages
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-[#212B36] bg-[#111720]">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Territories Visited</span>
                  <span className="text-lg font-bold text-emerald-400 block mt-1">
                    {stats.countriesVisited.length} Sovereign
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {stats.countriesVisited.join(', ') || 'Global'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-[#212B36] bg-[#111720]">
                  <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Metropolises Logged</span>
                  <span className="text-lg font-bold text-sky-400 block mt-1">
                    {stats.citiesExplored.length} Cities
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                    {stats.citiesExplored.join(', ')}
                  </span>
                </div>
              </div>

              {/* Geographic Signature Anchor */}
              <div className="p-4 rounded-xl border border-[#212B36] bg-[#111720] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Primary Geographic Anchor • Calendar Year 2026
                  </span>
                  <span className="text-[#C8AA6E] font-bold">VERIFIED SPOT</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 font-sans">{stats.topLandmark}</h4>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">
                      {stats.travelerArchetype.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Editorial Analysis Footnote */}
              <div className="p-3.5 rounded-xl border border-[#1E2631] bg-[#0E131A] text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>DOCUMENT NO. TVR-{stats.year}-AUDIT</span>
                <span className="text-[#C8AA6E]">TRIP-VERSE.COM • ARCHIVED</span>
              </div>
            </div>
          )}

          {/* TAB 2: VOYAGE MANIFEST LEDGER */}
          {activeTab === 'manifest' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-[#212B36] pb-2">
                <span>VERIFIED EXPEDITIONS MANIFEST • {stats.year}</span>
                <span>{stats.totalTrips} RECORDS AUDITED</span>
              </div>

              <div className="rounded-xl border border-[#212B36] bg-[#111720] overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#161C24] text-slate-400 border-b border-[#212B36] text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Expedition Title</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Primary Anchor</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2632] text-slate-300">
                    <tr className="hover:bg-[#161F2A] transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-100">Manali Alpine Expedition</td>
                      <td className="py-2.5 px-3 text-slate-400">Manali, Himachal Pradesh</td>
                      <td className="py-2.5 px-3">5 Days</td>
                      <td className="py-2.5 px-3 text-slate-400">Hadimba Pagoda Temple</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: OFFICIAL CERTIFICATE DOSSIER */}
          {activeTab === 'certificate' && (
            <div className="space-y-4">
              {/* Formal Editorial Certificate */}
              <div className="p-6 rounded-xl border border-[#2D3748] bg-[#121822] space-y-5 text-center relative overflow-hidden">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-widest text-[#C8AA6E] uppercase block font-semibold">
                    TRIPVERSE GLOBAL BORDER & VOYAGE AUTHORITY
                  </span>
                  <h3 className="text-lg font-bold text-slate-100 font-sans tracking-wide uppercase">
                    Annual Travel Retrospective Certificate
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Audit Registration: TVR-2026-RETRO-{stats.year}
                  </p>
                </div>

                <div className="w-16 h-px bg-[#C8AA6E]/40 mx-auto" />

                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed font-sans">
                  This dossier certifies that the bearer has completed all verified expeditions, boundary transits, and architectural landmark visits recorded in the TripVerse sovereign registry for the year {stats.year}.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-xs font-mono text-left max-w-lg mx-auto">
                  <div className="p-2.5 rounded border border-[#212B36] bg-[#0E131A]">
                    <span className="text-[9px] text-slate-500 uppercase block">Distance</span>
                    <span className="font-bold text-[#C8AA6E] text-xs">~{stats.totalKmTraveled.toLocaleString()} km</span>
                  </div>
                  <div className="p-2.5 rounded border border-[#212B36] bg-[#0E131A]">
                    <span className="text-[9px] text-slate-500 uppercase block">Expeditions</span>
                    <span className="font-bold text-slate-200 text-xs">{stats.totalDaysTraveled} Days</span>
                  </div>
                  <div className="p-2.5 rounded border border-[#212B36] bg-[#0E131A]">
                    <span className="text-[9px] text-slate-500 uppercase block">Classification</span>
                    <span className="font-bold text-slate-200 text-xs truncate block">{stats.travelerArchetype.title}</span>
                  </div>
                  <div className="p-2.5 rounded border border-[#212B36] bg-[#0E131A]">
                    <span className="text-[9px] text-slate-500 uppercase block">Anchor</span>
                    <span className="font-bold text-slate-200 text-xs truncate block">{stats.topLandmark}</span>
                  </div>
                </div>

                <div className="pt-2 text-[10px] font-mono text-slate-400 flex items-center justify-between border-t border-[#1E2631]">
                  <span>Authorized by: TripVerse Border Registry</span>
                  <span>trip-verse.com</span>
                </div>
              </div>

              {/* Copy Action */}
              <button
                type="button"
                onClick={handleShare}
                className="w-full py-2.5 rounded-lg bg-[#1B232E] hover:bg-[#25303E] border border-[#2F3C4E] text-slate-200 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-slate-400" />}
                <span>{copied ? 'Retrospective Dossier Copied to Clipboard' : 'Copy Official Retrospective Summary'}</span>
              </button>
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
