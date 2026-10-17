import React, { useState, useEffect } from 'react';
import { Trip } from '../../types/trip';
import { getStoredCurrency, formatCurrency, Currency } from '../../services/currencyService';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  QrCode, 
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Wallet
} from 'lucide-react';

interface ShareTripModalProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareTripModal: React.FC<ShareTripModalProps> = ({
  trip,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency());

  useEffect(() => {
    const handleCurrency = () => setCurrency(getStoredCurrency());
    window.addEventListener('tripverse_currency_change', handleCurrency);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrency);
  }, []);

  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?tripId=${trip.id}` 
    : `https://tripverse-pied.vercel.app/?tripId=${trip.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `TripVerse: ${trip.name}`,
          text: `Check out our verified AI journey from ${trip.origin} to ${trip.destination} on TripVerse:`,
          url: shareUrl,
        });
      } catch (e) {
        // Share cancelled or closed by user
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      
      <div className="bg-white rounded-[32px] max-w-md w-full shadow-2xl border border-[#E2EBE1] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2EBE1] flex items-center justify-between bg-[#F4F6F2]">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#2D5A3D]" />
            <h3 className="font-bold text-sm text-[#152A1C]">Share Trip Itinerary</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-[#EAF0E9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shareable Card Canvas Preview */}
        <div className="p-6 space-y-5">
          
          <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#152A1C] via-[#1E3E2B] to-[#2D5A3D] text-white p-6 shadow-xl space-y-4">
            
            {/* Brand Watermark */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-display font-black text-base">
                <span className="text-white">Trip</span>
                <span className="text-emerald-300">Verse</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                Verified AI Journey
              </span>
            </div>

            {/* Trip Title & Subtitle */}
            <div className="min-w-0">
              <p className="text-xs text-emerald-300 font-semibold tracking-wide truncate">
                {trip.origin} → {trip.destination}
              </p>
              <h4 className="text-xl font-black font-display mt-0.5 leading-tight text-balance">
                {trip.name}
              </h4>
            </div>

            {/* Key Metrics Chips */}
            <div className="grid grid-cols-3 gap-2 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 text-center">
              <div className="min-w-0">
                <span className="text-[10px] text-slate-300 block uppercase tracking-wider font-semibold">Duration</span>
                <span className="text-sm font-bold truncate block">{trip.durationDays} Days</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-300 block uppercase tracking-wider font-semibold">Travelers</span>
                <span className="text-sm font-bold truncate block">{trip.travelersCount} Group</span>
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-300 block uppercase tracking-wider font-semibold">Est. Budget</span>
                <span className="text-sm font-bold text-emerald-300 truncate block">
                  {formatCurrency(trip.estimatedTotal, currency)}
                </span>
              </div>
            </div>

            {/* Key Highlights */}
            <div className="text-xs text-slate-200 space-y-1">
              <p className="font-bold text-white text-[11px] uppercase tracking-wider">
                Trip Highlights:
              </p>
              <p className="line-clamp-2 text-slate-300">
                {trip.itinerary && trip.itinerary.length > 0 ? (
                  trip.itinerary.slice(0, 2).map((day, idx) => (
                    <span key={idx} className="block truncate">
                      • {day.theme || day.activities?.[0]?.title || `${trip.destination} Day ${day.dayNumber}`}
                    </span>
                  ))
                ) : (
                  <span>• Suggested route from {trip.origin || 'origin'} to {trip.destination}; verify directions and place details in your maps app</span>
                )}
              </p>
            </div>

            {/* Live Scannable Route QR Code */}
            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 bg-white rounded-lg p-0.5 text-slate-900 shrink-0 shadow-xs flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(shareUrl)}`}
                    alt="Scan Route QR"
                    className="w-full h-full object-contain rounded"
                  />
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-slate-300 block">Scan to open itinerary</span>
                  <span className="font-bold text-white text-xs truncate max-w-[140px] block">
                    {typeof window !== 'undefined' ? window.location.host : 'tripverse.ai'}
                  </span>
                </div>
              </div>

              <span className="text-[10px] text-emerald-300 font-medium">
                Live Route Sync
              </span>
            </div>

          </div>

          {/* Social Share Primary Action */}
          <button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-trip-gradient text-white font-bold text-sm shadow-md hover:bg-trip-gradient-hover active:scale-98 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via WhatsApp, Messages or Social</span>
          </button>

          {/* Copyable Link Input */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
              Direct Web Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  copied
                    ? 'bg-[#2D5A3D] text-white'
                    : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-xs'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
