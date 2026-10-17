import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  MessageSquare, 
  Star, 
  Check, 
  Send,
  Lock,
  Compass,
  Heart
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getSupabaseClient } from '../../services/supabase';

export type LegalTab = 'privacy' | 'terms' | 'advisory' | 'feedback';

interface LegalTrustModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  userEmail?: string;
}

export const LegalTrustModal: React.FC<LegalTrustModalProps> = ({
  isOpen,
  initialTab = 'privacy',
  onClose,
  userEmail = ''
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  
  // Feedback Form State
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<string>('suggestion');
  const [feedbackEmail, setFeedbackEmail] = useState<string>(userEmail);
  const [message, setMessage] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Persist feedback to Supabase
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.from('user_feedback').insert({
          id: `fb_${Date.now()}`,
          rating,
          category,
          email: feedbackEmail || null,
          message: message.trim(),
          created_at: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Failed to submit feedback:', e);
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {}

    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setMessage('');
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] max-w-2xl w-full shadow-2xl border border-[#E2EBE1] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2EBE1] flex items-center justify-between bg-[#F4F6F2] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#2D5A3D]/10 text-[#2D5A3D] flex items-center justify-center border border-[#2D5A3D]/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#152A1C]">TripVerse Trust, Legal & Feedback</h3>
              <p className="text-[11px] text-[#5A7362] font-medium">Transparent, traveler-first policies & community voice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-[#EAF0E9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E2EBE1] bg-white px-6 gap-2 pt-3 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-[#2D5A3D] text-[#2D5A3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-[#2D5A3D] text-[#2D5A3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('advisory')}
            className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'advisory'
                ? 'border-[#2D5A3D] text-[#2D5A3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>AI Travel Advisory</span>
          </button>

          <button
            onClick={() => setActiveTab('feedback')}
            className={`pb-3 px-3 text-xs font-bold transition-all flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'feedback'
                ? 'border-[#2D5A3D] text-[#2D5A3D]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Send Feedback</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
          
          {/* TAB 1: PRIVACY POLICY */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#2D5A3D] shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Local-First Privacy Architecture:</strong> TripVerse encrypts and stores your created itineraries, saved spots, and offline documents directly in your browser's private indexed sandbox. We do not sell or broker traveler data.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Information We Collect</h4>
                <p>
                  When you use TripVerse, information necessary to plan and preserve journeys is stored locally:
                </p>
                <ul className="list-disc pl-5 mt-1 space-y-1 text-slate-600">
                  <li><strong>Itineraries & Preferences:</strong> Origins, destinations, budget parameters, and customized activities.</li>
                  <li><strong>Device Permissions:</strong> Optional GPS location (only when requesting nearby highway fuel/food stops) and notifications (for trip departure reminders).</li>
                  <li><strong>Offline Caches:</strong> Route paths, curated gems, and offline travel dossier assets cached for connectivity drop-offs.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Zero Third-Party Advertising Trackers</h4>
                <p>
                  TripVerse does not run third-party cross-site advertising pixels or tracking scripts. All AI suggestions are generated contextually based on your explicit trip inputs.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Your Data Rights & Deletion</h4>
                <p>
                  You retain complete ownership of your travel data. You can export your journeys anytime or perform a complete data wipe from the Profile tab.
                </p>
              </div>

              <div className="pt-2 text-[11px] text-slate-400">
                Last updated: September 2026 • Compliant with DPDP & GDPR Best Practices
              </div>
            </div>
          )}

          {/* TAB 2: TERMS OF SERVICE */}
          {activeTab === 'terms' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Acceptance of Terms</h4>
                <p>
                  By accessing or using TripVerse ("Platform"), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may discontinue use of the platform.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Purpose of the Platform</h4>
                <p>
                  TripVerse provides AI-assisted travel itinerary planning, highway rest-stop recommendations, expense tracking, and route exploration tools. All recommendations are designed as supportive aids for independent travelers.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Booking & Third-Party Service Providers</h4>
                <p>
                  TripVerse may link to third-party booking systems, hotels, fuel stations, flight aggregators, and train schedules. TripVerse does not directly operate airlines, hotels, or toll plazas and bears no liability for third-party delays, cancellations, or service deficiencies.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">4. User Conduct</h4>
                <p>
                  Users agree to use the platform in compliance with all applicable local, national, and international road safety and immigration laws.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: AI TRAVEL ADVISORY */}
          {activeTab === 'advisory' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-xs font-bold text-amber-900">Safety First on the Highway:</strong>
                  <p className="text-[11px] leading-relaxed mt-0.5">
                    TripVerse route estimates, toll calculations, and fuel stops are computer-assisted forecasts. Always prioritize real-time highway signs, weather alerts, and instructions from traffic police.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Route & Travel Time Estimates</h4>
                <p>
                  Travel durations are based on standard road conditions and posted speed limits. Actual drive times may fluctuate significantly due to seasonal monsoon landslides, construction detours, religious processions, or holiday weekend toll plaza congestion.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Mountain & High-Altitude Routes</h4>
                <p>
                  When traveling through high-altitude passes (e.g. Rohtang, Zoji La, Ladakh, or Uttarakhand ghats), weather conditions change rapidly. Always verify pass opening statuses with BRO (Border Roads Organisation) or local district magistrate notices prior to departure.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. Emergency Preparedness</h4>
                <p>
                  Ensure your vehicle is equipped with a spare tyre, jack, first-aid kit, emergency water, and physical cash for remote stretch toll booths or petrol pumps where UPI/card networks may experience cell tower outage.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: USER FEEDBACK & BUG REPORT */}
          {activeTab === 'feedback' && (
            <div>
              {isSubmitted ? (
                <div className="py-12 text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Feedback Received!</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Thank you for helping make TripVerse better for travelers worldwide. Our engineering team reviews every note.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitFeedback} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      How would you rate your TripVerse experience?
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1 text-amber-400 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-semibold text-slate-500">
                        {rating === 5 ? 'Loved it!' : rating >= 4 ? 'Great' : rating === 3 ? 'Good' : 'Needs Polish'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Topic Category
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-hidden focus:border-[#2D5A3D]"
                      >
                        <option value="suggestion">Feature Suggestion</option>
                        <option value="bug">Report a Bug / Glitch</option>
                        <option value="route">Route or Stop Accuracy</option>
                        <option value="deals">Transport Deals & Pricing</option>
                        <option value="praise">Praise & Shout-out</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Your Email (optional)
                      </label>
                      <input
                        type="email"
                        value={feedbackEmail}
                        onChange={(e) => setFeedbackEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:border-[#2D5A3D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Your Thoughts or Observations
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what you liked, what felt rough, or highway stops you'd like added..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:border-[#2D5A3D] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-trip-gradient text-white font-bold text-xs shadow-md hover:bg-trip-gradient-hover active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Traveler Feedback</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>TripVerse AI • Plan the journey, not just the destination.</span>
          </div>
          <button
            onClick={onClose}
            className="font-bold text-slate-700 hover:text-slate-900"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
