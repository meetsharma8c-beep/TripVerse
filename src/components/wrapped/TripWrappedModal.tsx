import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  Check,
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
  Sparkles,
  Globe,
  MapPin
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { triggerHaptic, printOrShareDocument } from '../../services/deviceService';
import {
  computeTravelWrapped,
  generateWrappedSocialText,
  TravelWrappedStats
} from '../../services/travelWrappedService';
import { formatCurrency } from '../../services/currencyService';
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
  const stats: TravelWrappedStats = useMemo(
    () => computeTravelWrapped(trips, userEmail),
    [trips, userEmail]
  );
  const [copied, setCopied] = useState<boolean>(false);

  useModalBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const equatorPct = Math.min(100, Math.round((stats.totalKmTraveled / 40075) * 100));

  const handleShare = () => {
    triggerHaptic('medium');
    const text = generateWrappedSocialText(stats);
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    triggerHaptic('light');
    void printOrShareDocument({
      title: 'TripVerse Travel Wrapped',
      text: generateWrappedSocialText(stats),
    });
  };

  const renderArchetypeInsignia = (className = 'w-5 h-5') => {
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="2026 Travel Wrapped"
      onClick={onClose}
      className="fixed inset-0 z-[130] flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white/95 dark:bg-[#0D1522]/95 backdrop-blur-2xl border border-white/80 dark:border-amber-400/20 rounded-[28px] sm:rounded-[32px] shadow-[0_28px_70px_-14px_rgba(120,53,15,0.38)] overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[92dvh]"
      >
        {/* Aurora Amber-Gold & Forest Header */}
        <div className="relative px-4 sm:px-6 py-4 bg-gradient-to-r from-[#183828] via-[#2D5A3D] to-[#7C4612] text-white flex items-center justify-between gap-3 border-b border-amber-300/25 shrink-0 overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-amber-400/25 blur-2xl" />
          <div className="relative z-10 flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-200 shadow-inner shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold tracking-widest text-amber-200 uppercase">
                  {stats.year} YEAR IN REVIEW
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white border border-white/20 font-semibold">
                  {stats.totalTrips} {stats.totalTrips === 1 ? 'Trip' : 'Trips'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-display font-bold tracking-tight text-white truncate mt-0.5">
                {stats.year} Travel <span className="font-serif italic font-normal text-amber-200">Wrapped</span>
              </h2>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-0 px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 text-xs font-semibold flex items-center gap-1.5 border border-white/15 transition-all cursor-pointer active:scale-95"
              title="Print Dossier"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="min-h-0 px-2.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer active:scale-95"
              title="Copy Share Summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-0 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close wrapped"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Liquid Capsule Tab Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#F8FAF7] dark:bg-[#090F1A] border-b border-[#E2EBE1] dark:border-white/10 shrink-0">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/85 dark:bg-slate-900/80 border border-[#DCE7DB] dark:border-white/10 overflow-x-auto scrollbar-none max-w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-none">
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`min-h-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'bg-[#2D5A3D] dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Highlights</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manifest')}
              className={`min-h-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'manifest'
                  ? 'bg-[#2D5A3D] dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Trip Manifest ({trips.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('certificate')}
              className={`min-h-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'certificate'
                  ? 'bg-[#2D5A3D] dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Certificate</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-gradient-to-b from-[#FAFBF8] via-[#F4F6F2] to-[#EAF0E9] dark:from-[#0B121E] dark:via-[#0D1522] dark:to-[#080D16]">
          {/* TAB 1: HIGHLIGHTS SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {/* Spotlight Traveler Archetype Banner */}
              <div className="relative overflow-hidden rounded-[24px] p-5 sm:p-6 bg-gradient-to-br from-[#1C3D2B] via-[#2D5A3D] to-[#5B3B14] text-white shadow-xl border border-amber-300/25">
                <div className="pointer-events-none absolute -right-8 -bottom-10 w-44 h-44 rounded-full bg-amber-400/20 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-300/20 border border-amber-200/40 flex items-center justify-center text-amber-200 shrink-0 shadow-inner">
                      {renderArchetypeInsignia('w-6 h-6')}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-amber-200 block">
                        Your {stats.year} Traveler Archetype
                      </span>
                      <h3 className="text-lg sm:text-xl font-display font-extrabold tracking-tight">
                        {stats.travelerArchetype.title}
                      </h3>
                      <p className="text-xs text-emerald-100/85 mt-1 max-w-md leading-relaxed">
                        {stats.travelerArchetype.description}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
                    <span className="px-3 py-1 rounded-full bg-amber-300/20 border border-amber-200/40 text-amber-200 font-bold text-[11px] uppercase tracking-wider">
                      {stats.travelerArchetype.badge}
                    </span>
                    {stats.isFounder && (
                      <span className="text-[10px] font-semibold text-amber-200/90">
                        VIP Founding Architect
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Liquid Bento Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="liquid-glass-surface rounded-2xl p-4 liquid-bento-card">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Distance</span>
                  <span className="text-xl font-display font-black text-amber-700 dark:text-amber-300 block mt-1">
                    ~{stats.totalKmTraveled.toLocaleString()} km
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {equatorPct}% of Earth&apos;s equator
                  </span>
                </div>

                <div className="liquid-glass-surface rounded-2xl p-4 liquid-bento-card">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Days Out</span>
                  <span className="text-xl font-display font-black text-[#152A1C] dark:text-white block mt-1">
                    {stats.totalDaysTraveled} Days
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Across {stats.totalTrips} journeys
                  </span>
                </div>

                <div className="liquid-glass-surface rounded-2xl p-4 liquid-bento-card">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Regions</span>
                  <span className="text-xl font-display font-black text-[#2D5A3D] dark:text-emerald-300 block mt-1">
                    {stats.countriesVisited.length}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                    {stats.countriesVisited.join(', ') || 'Global'}
                  </span>
                </div>

                <div className="liquid-glass-surface rounded-2xl p-4 liquid-bento-card">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Cities</span>
                  <span className="text-xl font-display font-black text-sky-700 dark:text-sky-300 block mt-1">
                    {stats.citiesExplored.length}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                    {stats.citiesExplored.join(', ') || 'Multiple hubs'}
                  </span>
                </div>
              </div>

              {/* Earth Circumference Progress Meter + Top Anchor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="liquid-glass-surface rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[#2D5A3D] dark:text-emerald-400" />
                      Orbit / Equator Progress
                    </span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{equatorPct}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2D5A3D] via-emerald-500 to-amber-500 transition-all duration-500"
                      style={{ width: `${Math.max(4, equatorPct)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Measured against 40,075 km Earth equatorial distance.
                  </p>
                </div>

                <div className="liquid-glass-surface rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Signature Landmark Anchor
                    </span>
                    <h4 className="text-sm sm:text-base font-display font-bold text-slate-900 dark:text-white truncate">
                      {stats.topLandmark}
                    </h4>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE VOYAGE MANIFEST LEDGER */}
          {activeTab === 'manifest' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-[#DCE7DB] dark:border-white/10 pb-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">Your Logged Journeys • {stats.year}</span>
                <span className="font-mono text-[11px]">{trips.length} TOTAL</span>
              </div>

              {trips.length === 0 ? (
                <div className="liquid-glass-surface rounded-2xl p-8 text-center space-y-2">
                  <Calendar className="w-8 h-8 text-[#2D5A3D] dark:text-emerald-400 mx-auto opacity-80" />
                  <h4 className="font-display font-bold text-slate-900 dark:text-white text-sm">No Trips Logged Yet</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                    Plan your first AI itinerary to see your journeys recorded in your {stats.year} Travel Wrapped manifest.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#DCE7DB] dark:border-white/10 bg-white/95 dark:bg-[#121B2B] overflow-x-auto shadow-sm">
                  <table className="w-full text-left text-xs min-w-[540px]">
                    <thead className="bg-[#EAF0E9]/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-[#DCE7DB] dark:border-white/10 text-[10px] uppercase font-mono">
                      <tr>
                        <th className="py-3 px-3.5">Journey</th>
                        <th className="py-3 px-3.5">Destination</th>
                        <th className="py-3 px-3.5">Duration</th>
                        <th className="py-3 px-3.5">Estimated Budget</th>
                        <th className="py-3 px-3.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                      {trips.map((tripItem) => (
                        <tr key={tripItem.id} className="hover:bg-[#F8FAF7] dark:hover:bg-white/5 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white max-w-[180px] truncate">
                            {tripItem.name}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-300">
                            {tripItem.destination}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono">
                            {tripItem.durationDays} {tripItem.durationDays === 1 ? 'Day' : 'Days'}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono font-semibold text-[#2D5A3D] dark:text-emerald-300">
                            {formatCurrency(tripItem.estimatedTotal || tripItem.totalBudget || 0, tripItem.currency)}
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/70 text-[#2D5A3D] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                              {tripItem.status || 'planned'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OFFICIAL COMMEMORATIVE CERTIFICATE */}
          {activeTab === 'certificate' && (
            <div className="space-y-4">
              <div className="rounded-[26px] border-2 border-[#C8AA6E]/45 bg-white dark:bg-[#121A28] p-6 sm:p-8 space-y-5 text-center relative overflow-hidden shadow-lg passport-foil-card">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-amber-700 dark:text-amber-300 uppercase block font-bold">
                    TRIPVERSE VOYAGE & EXPLORATION ARCHIVE
                  </span>
                  <h3 className="text-lg sm:text-2xl font-display font-extrabold text-[#152A1C] dark:text-white tracking-tight">
                    {stats.year} Explorer <span className="font-serif italic font-normal text-[#2D5A3D] dark:text-emerald-300">Retrospective Certificate</span>
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Registry ID: TVR-{stats.year}-WRAPPED
                  </p>
                </div>

                <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent mx-auto" />

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                  This certifies that the traveler completed all recorded routes, curated itineraries, and landmark discoveries registered in TripVerse during {stats.year}.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 text-left max-w-xl mx-auto">
                  <div className="p-3 rounded-xl border border-[#DCE7DB] dark:border-white/10 bg-[#F8FAF7] dark:bg-slate-900/70">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Distance</span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300 text-xs">~{stats.totalKmTraveled.toLocaleString()} km</span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#DCE7DB] dark:border-white/10 bg-[#F8FAF7] dark:bg-slate-900/70">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Duration</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">{stats.totalDaysTraveled} Days</span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#DCE7DB] dark:border-white/10 bg-[#F8FAF7] dark:bg-slate-900/70">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Archetype</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs truncate block">{stats.travelerArchetype.title}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-[#DCE7DB] dark:border-white/10 bg-[#F8FAF7] dark:bg-slate-900/70">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Top Anchor</span>
                    <span className="font-bold text-slate-900 dark:text-white text-xs truncate block">{stats.topLandmark}</span>
                  </div>
                </div>

                <div className="pt-3 text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between border-t border-[#E2EBE1] dark:border-white/10">
                  <span>Verified by TripVerse Registry</span>
                  <span className="text-[#2D5A3D] dark:text-emerald-300 font-bold">trip-verse.com</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShare}
                className="btn-liquid-primary w-full py-3 text-xs flex items-center justify-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-200" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'Travel Wrapped Summary Copied!' : 'Copy Official Travel Wrapped Summary'}</span>
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
