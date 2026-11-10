import React, { useState } from 'react';
import { PhoneCall, ShieldCheck, AlertTriangle, CheckCircle2, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';
import { useLanguage } from '../../services/languageService';
import { resolveConcodeSafetyRadar, DestinationSafetyData, ScamItem } from '../../services/concodeSafetyRadarService';

export type { DestinationSafetyData, ScamItem };

interface SafetyEmergencyProps {
  destination?: string;
}

export const SafetyEmergency: React.FC<SafetyEmergencyProps> = ({ destination }) => {
  const { t } = useLanguage();
  const rawDest = (destination || '').trim();
  const cleanDest = rawDest ? rawDest.split(',')[0].trim() : t('Your Destination');
  const data = resolveConcodeSafetyRadar(rawDest || cleanDest);
  const [expandedScam, setExpandedScam] = useState<number | null>(0);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Header Banner */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('CONCODE Security Sentinel')}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            <span>{t('Guild: security')}</span>
          </span>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-[#0B2545]">{cleanDest} {t('Safety & Scam Radar')}</h2>
              {data.country && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {data.region ? `${data.region}, ${data.country}` : data.country}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('Real-time local intelligence, emergency hotlines, and tourist trap warnings verified for your journey.')}
            </p>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold ${
            data.advisoryLevel === 'Safe'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${data.advisoryLevel === 'Safe' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
            <span>{t('Advisory')}: {t(data.advisoryLevel)}</span>
          </div>
        </div>
      </div>

      {/* Emergency Hotlines Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <PhoneCall className="w-4 h-4 text-[#2D5A3D]" />
          <span>{t('Verified Local Emergency Numbers')}</span>
        </h3>
        
        <div className="grid gap-2.5 sm:grid-cols-2">
          {data.emergencyNumbers.map((item) => (
            <a
              key={item.label}
              href={`tel:${item.number}`}
              onClick={() => triggerHaptic('medium')}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all group"
            >
              <div className="min-w-0">
                <span className="block text-xs text-slate-500 font-medium truncate">{t(item.label)}</span>
                <strong className="block text-base font-bold text-slate-900 tracking-wide font-mono mt-0.5">{item.number}</strong>
              </div>
              <span className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-[#2D5A3D] group-hover:bg-[#2D5A3D] group-hover:text-white flex items-center justify-center transition-all shrink-0 shadow-2xs">
                <PhoneCall className="w-4 h-4" />
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Local Tourist Scam Radar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span>{t('Tourist Trap & Scam Radar for {cleanDest}', { cleanDest })}</span>
          </h3>
          <span className="text-[11px] text-slate-500">{t('Know before you go')}</span>
        </div>

        <div className="space-y-2.5">
          {data.commonScams.map((scam, idx) => {
            const isExpanded = expandedScam === idx;
            return (
              <div
                key={scam.title}
                className="rounded-2xl border border-slate-200 overflow-hidden transition-all bg-white"
              >
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setExpandedScam(isExpanded ? null : idx);
                  }}
                  className="w-full text-left p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 font-bold text-xs">
                      !
                    </span>
                    <span className="font-bold text-xs text-slate-900 truncate">{t(scam.title)}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="p-3.5 pt-0 text-xs text-slate-600 border-t border-slate-100 bg-slate-50/50 space-y-2">
                    <p className="leading-relaxed">{t(scam.description)}</p>
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-900 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-[11px] font-bold text-emerald-900">{t('How to Protect Yourself:')}</strong>
                        <span className="text-[11px] leading-relaxed">{t(scam.howToAvoid)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Safe Neighborhoods & Guidance */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Recommended Safe Areas</span>
          </div>
          <ul className="text-xs text-emerald-800 space-y-1">
            {data.safeNeighborhoods.map((n) => (
              <li key={n} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-2">
            <Info className="w-4 h-4 text-slate-600" />
            <span>High Vigilance Zones</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1">
            {data.cautionAreas.map((n) => (
              <li key={n} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </div>
  );
};
