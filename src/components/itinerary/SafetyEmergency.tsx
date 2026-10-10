import React from 'react';
import { ExternalLink, PhoneCall, ShieldCheck } from 'lucide-react';

export const SafetyEmergency: React.FC = () => (
  <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-5">
    <div className="border-b border-slate-100 pb-4">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2D5A3D] mb-1">
        <ShieldCheck className="w-4 h-4" />
        <span>Emergency information</span>
      </div>
      <h2 className="text-xl font-bold text-[#0B2545]">Use local official services</h2>
      <p className="text-sm text-slate-600 mt-1">
        Emergency numbers and roadside services depend on your country and exact location. TripVerse does not verify nearby emergency facilities. Check local official sources before travelling.
      </p>
    </div>

    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="font-bold text-slate-800">If you are travelling in India</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <a href="tel:112" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-emerald-300">
          <span>
            <strong className="block text-sm text-slate-800">112</strong>
            <span className="text-xs text-slate-500">National emergency response</span>
          </span>
          <PhoneCall className="w-4 h-4 text-[#2D5A3D]" />
        </a>
        <a href="tel:1033" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:border-emerald-300">
          <span>
            <strong className="block text-sm text-slate-800">1033</strong>
            <span className="text-xs text-slate-500">NHAI highway helpline</span>
          </span>
          <PhoneCall className="w-4 h-4 text-[#2D5A3D]" />
        </a>
      </div>
      <a
        href="https://112.gov.in/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700"
      >
        Check India emergency information
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  </div>
);
