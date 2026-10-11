import React, { useState } from 'react';
import { 
  Sparkles, 
  Radio, 
  CheckCircle2, 
  Share2, 
  Copy, 
  Check, 
  Zap, 
  Compass, 
  MessageCircle,
  Award,
  ArrowRight
} from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

interface PublicLaunchSpotlightProps {
  onOpenPlanner: () => void;
  onExplore: () => void;
}

export const PublicLaunchSpotlight: React.FC<PublicLaunchSpotlightProps> = ({
  onOpenPlanner,
  onExplore
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const launchUrl = typeof window !== 'undefined' ? window.location.origin : 'https://tripverse-pied.vercel.app';

  const shareText = "Plan a trip with TripVerse: create a draft itinerary and budget estimate, with driving routes and map listings when available. Check it out:";

  const handleCopyLink = () => {
    triggerHaptic('light');
    navigator.clipboard?.writeText(launchUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleNativeShare = async () => {
    triggerHaptic('medium');
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TripVerse — Autonomous Travel & Highway Intelligence Platform',
          text: shareText,
          url: launchUrl
        });
      } catch {
        // user cancelled
      }
    } else {
      handleCopyLink();
    }
  };

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${launchUrl}`)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(launchUrl)}&hashtags=TripVerse,RoadTrip,TravelAI,IncredibleIndia`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(launchUrl)}`
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Container with liquid-glass aesthetic & emerald glow */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#0B2545] via-[#0E2E56] to-[#041B33] text-white p-6 sm:p-10 lg:p-12 border border-emerald-500/30 shadow-2xl shadow-emerald-950/40">
        
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-8">
          
          {/* Header Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 text-xs font-black uppercase tracking-widest mb-3">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
                <span>Official Public Release 2.0</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-white leading-tight">
                Welcome to the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Highway & Travel Intelligence</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl mt-2 font-normal leading-relaxed">
                Create a draft itinerary and budget, then review live driving routes and nearby map listings when those services are configured. Confirm bookings and place details directly with providers.
              </p>
            </div>

            {/* Launch Action */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenPlanner}
                className="px-6 py-3.5 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Plan Free Journey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-emerald-300" />
                <span>Explore India</span>
              </button>
            </div>
          </div>

          {/* 4 Pillars of Real-Time Intelligence */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition-all space-y-2 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-bold">
                <Compass className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-bold text-white text-base">Live Weather Forecast</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Current and forecast weather from Open-Meteo when provider coverage and destination coordinates are available.
              </p>
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block pt-1">
                Forecast data; not a road-safety advisory
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition-all space-y-2 group">
              <div className="w-10 h-10 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center font-bold">
                <Radio className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-bold text-white text-base">Emergency information</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Emergency contacts vary by location. The app provides a small set of India helpline references; it does not locate or verify nearby services.
              </p>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block pt-1">
                Check local official guidance
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition-all space-y-2 group">
              <div className="w-10 h-10 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
              </div>
              <h3 className="font-bold text-white text-base">Route-based map listings</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Driving routes and nearby OpenStreetMap listings via Geoapify are requested for a trip when configured. Place listings do not verify facilities or current availability.
              </p>
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block pt-1">
                Geoapify / OpenStreetMap data
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition-all space-y-2 group">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="font-bold text-white text-base">External booking links</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Booking and transport links open third-party providers. Confirm availability, prices, fees, and terms with them before purchase.
              </p>
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block pt-1">
                Direct Partner Handoff
              </span>
            </div>

          </div>

          {/* Viral Community Sharing Bar */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white/10 border border-white/15 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h4 className="text-base font-bold text-white">Share TripVerse With Your Travel Buddies</h4>
              </div>
              <p className="text-xs text-slate-300">
                Help friends and family create draft trips with routes and map listings when available.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={shareLinks.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>

              <a
                href={shareLinks.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              >
                <svg className="w-3.5 h-3.5 fill-current text-sky-400" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>Share on X</span>
              </a>

              <a
                href={shareLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.25c-.96 0-1.74.78-1.74 1.74a1.74 1.74 0 1 0 3.48 0c0-.96-.78-1.74-1.74-1.74Z"/>
                </svg>
                <span>LinkedIn</span>
              </a>

              <button
                type="button"
                onClick={handleNativeShare}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-emerald-300" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
