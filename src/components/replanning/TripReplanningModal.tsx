import React, { useState, useEffect } from 'react';
import { Trip, CurrencyCode } from '../../types/trip';
import { 
  DisruptionAlert, 
  DisruptionType, 
  EmergencyStay, 
  RefundGuidance, 
  ReplanOption 
} from '../../types/replanning';
import { 
  generateDisruptionForTrip, 
  getEmergencyStays, 
  getCancellationPolicy, 
  getReplanOptions, 
  applyReplanToTrip 
} from '../../services/replanningService';
import { saveEmergencyEventToSupabase } from '../../services/supabaseSyncService';
import { getCurrentUser } from '../../services/authService';
import { formatCurrency, getActiveCurrency } from '../../services/currencyService';
import { 
  AlertTriangle, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Home, 
  RotateCcw, 
  Receipt, 
  Bot, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Wallet, 
  Phone, 
  ShieldCheck, 
  Clock, 
  Bed, 
  Wifi, 
  Utensils, 
  Car, 
  ChevronRight,
  Plane,
  CloudRain,
  Train,
  AlertOctagon,
  Briefcase,
  UserCheck,
  Battery,
  ShieldAlert,
  Send,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TripReplanningModalProps {
  trip: Trip;
  isOpen: boolean;
  initialReason?: DisruptionType;
  initialScreen?: 1 | 2 | 3 | 4 | 5 | 'refund';
  onClose: () => void;
  onApplyReplannedTrip: (updatedTrip: Trip) => void;
  onOpenChatWithQuery?: (query: string) => void;
  onViewMap?: () => void;
}

export const TripReplanningModal: React.FC<TripReplanningModalProps> = ({
  trip,
  isOpen,
  initialReason = 'flight_cancellation',
  initialScreen = 2,
  onClose,
  onApplyReplannedTrip,
  onOpenChatWithQuery,
  onViewMap
}) => {
  const [currency] = useState<CurrencyCode>(getActiveCurrency());
  const [selectedReason, setSelectedReason] = useState<DisruptionType>(initialReason);
  
  // Current step in the 5-screen flow:
  // 1: Alert Notification
  // 2: Choose Reason / Action (Trip Affected)
  // 3: Emergency Stay Assistance
  // 4: Replan Trip Option
  // 5: Final Confirmation
  // 'refund': Cancellation / Refund Guidance View
  const [screen, setScreen] = useState<1 | 2 | 3 | 4 | 5 | 'refund'>(initialScreen);
  const [showAllStays, setShowAllStays] = useState(false);

  // Active disruption alert
  const [disruption, setDisruption] = useState<DisruptionAlert>(() => 
    generateDisruptionForTrip(trip, initialReason)
  );

  useEffect(() => {
    if (isOpen) {
      if (initialScreen) setScreen(initialScreen);
      if (initialReason) {
        setSelectedReason(initialReason);
        setDisruption(generateDisruptionForTrip(trip, initialReason));
      }
    }
  }, [isOpen, initialScreen, initialReason, trip]);

  // Emergency stays
  const [stays, setStays] = useState<EmergencyStay[]>(() => 
    getEmergencyStays(trip.destination, trip.destinationDetails?.coordinates)
  );
  const [bookedStayId, setBookedStayId] = useState<string | null>(null);

  // Replan options
  const replanData = getReplanOptions(trip, selectedReason);
  const [replanTab, setReplanTab] = useState<'alternate_dates' | 'new_destination'>('alternate_dates');
  const [selectedReplanOption, setSelectedReplanOption] = useState<ReplanOption>(() => 
    replanData.alternateDates[0] || replanData.newDestinations[0]
  );
  const [replannedTrip, setReplannedTrip] = useState<Trip | null>(null);

  // Refund guidance
  const refundInfo = getCancellationPolicy(trip, disruption);

  if (!isOpen) return null;

  // Handle reason switch
  const handleReasonChange = (reason: DisruptionType) => {
    setSelectedReason(reason);
    const newDisrupt = generateDisruptionForTrip(trip, reason);
    setDisruption(newDisrupt);
    const newOptions = getReplanOptions(trip, reason);
    setSelectedReplanOption(replanTab === 'alternate_dates' ? newOptions.alternateDates[0] : newOptions.newDestinations[0]);
  };

  // Handle book emergency stay
  const handleBookStay = (stay: EmergencyStay) => {
    setBookedStayId(stay.id);
    try {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  // Handle execute replan
  const handleConfirmReplan = () => {
    const updated = applyReplanToTrip(trip, selectedReplanOption);
    setReplannedTrip(updated);
    onApplyReplannedTrip(updated);

    // Persist real disruption event and emergency plan to cloud database (Supabase)
    const user = getCurrentUser();
    if (user?.uid) {
      saveEmergencyEventToSupabase(user.uid, disruption, {
        revisedSummary: selectedReplanOption.title || selectedReplanOption.destination,
        alternativeTransport: selectedReplanOption.type,
        budgetImpact: selectedReplanOption.costDelta,
        timeImpact: selectedReplanOption.datesLabel,
        refundGuidance: refundInfo,
        actionSteps: selectedReplanOption.highlights
      }).catch(err => {
        console.warn('[Supabase] Emergency replan cloud persist warning:', err);
      });
    }

    setScreen(5);
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#00B074', '#10B981', '#3B82F6', '#F59E0B']
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top App Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#00B074]">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#0B2545] leading-tight">
                Trip Replanning & Disruption Guard
              </h2>
              <span className="text-[11px] text-slate-500">
                TripVerse 24/7 Journey Protection
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Infographic 5-Step Process Bar */}
        <div className="bg-slate-100/90 px-3 sm:px-5 py-2 border-b border-slate-200 flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-semibold text-slate-500 shrink-0">
          <button
            type="button"
            onClick={() => setScreen(1)}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              screen === 1 ? 'bg-white text-red-600 font-bold shadow-xs ring-1 ring-red-200' : 'hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[9px] font-black">1</span>
            <span>Alert Notice</span>
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            onClick={() => setScreen(2)}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              screen === 2 ? 'bg-white text-[#0B2545] font-bold shadow-xs ring-1 ring-slate-300' : 'hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-black">2</span>
            <span>Choose Action</span>
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            onClick={() => setScreen(3)}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              screen === 3 ? 'bg-white text-emerald-700 font-bold shadow-xs ring-1 ring-emerald-200' : 'hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black">3</span>
            <span>Emergency Stay</span>
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            onClick={() => setScreen(4)}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              screen === 4 ? 'bg-white text-purple-700 font-bold shadow-xs ring-1 ring-purple-200' : 'hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[9px] font-black">4</span>
            <span>Replan Trip</span>
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            onClick={() => setScreen(5)}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              screen === 5 ? 'bg-white text-emerald-700 font-bold shadow-xs ring-1 ring-emerald-200' : 'hover:text-slate-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-black">5</span>
            <span>Confirmation</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">

          {/* SCREEN 1: ALERT NOTIFICATION */}
          {screen === 1 && (
            <div className="space-y-6 py-2">
              <div className="text-center">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                  Step 1: Real-Time Disruption Alert Notification
                </span>
                <h3 className="text-xl font-bold text-[#0B2545] mt-2">
                  Live Disruption Notification Received
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  TripVerse monitors real-time flight/train status and meteorological warnings 24/7 to safeguard your travels.
                </p>
              </div>

              {/* Realistic Mobile Device Frame */}
              <div className="max-w-sm mx-auto bg-slate-950 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-900 relative overflow-hidden">
                <div className="relative rounded-[32px] overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white p-5 min-h-[350px] flex flex-col justify-between border border-slate-800">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1 pt-1">
                    <span className="text-xs font-bold text-white">9:41</span>
                    <div className="w-16 h-3.5 bg-black rounded-full mx-auto" />
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Wifi className="w-3.5 h-3.5 text-slate-300" />
                      <Battery className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>

                  {/* Lock Screen Time */}
                  <div className="text-center my-6 space-y-1">
                    <div className="text-4xl font-extrabold tracking-tight text-white font-mono">
                      9:41
                    </div>
                    <div className="text-xs text-slate-300 font-medium">
                      Mon, 21 Apr
                    </div>
                  </div>

                  {/* Native Push Notification Card */}
                  <div 
                    onClick={() => setScreen(2)}
                    className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl cursor-pointer hover:border-emerald-400/60 transition-all hover:scale-[1.02] active:scale-98 group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-lg bg-[#00B074] flex items-center justify-center text-white">
                          <RotateCcw className="w-3 h-3 text-white" />
                        </div>
                        <span className="font-bold text-white text-xs">TripVerse</span>
                      </div>
                      <span className="text-[11px] text-slate-400">now</span>
                    </div>

                    <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>Trip Disruption Alert</span>
                    </h4>

                    <p className="text-xs text-slate-200 mt-1.5 leading-snug">
                      Your flight to {trip.destination.split(',')[0]} ({disruption.flightOrTrainNumber || '6E 532'}) is cancelled due to bad weather. Tap to view options.
                    </p>

                    <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-400 font-semibold group-hover:text-emerald-300">
                      <span>Tap to view options</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Bottom Home Indicator */}
                  <div className="w-28 h-1 bg-slate-500/60 rounded-full mx-auto mt-4" />
                </div>
              </div>

              {/* Direct Next Button */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setScreen(2)}
                  className="px-6 py-3 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <span>Proceed to Choose Reason & Action (Step 2)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: CHOOSE REASON / ACTION ("TRIP AFFECTED") */}
          {screen === 2 && (
            <div className="space-y-6">
              
              {/* Disruption Summary Banner */}
              <div className="bg-red-50/80 border border-red-200/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Trip Affected</span>
                    <span className="text-[11px] text-red-500 bg-white px-2 py-0.5 rounded-full border border-red-200 font-semibold">
                      {disruption.timestamp}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-red-900 mt-1">
                    Your trip to {trip.destination.split(',')[0]} has been affected
                  </h4>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    {disruption.details}
                  </p>
                </div>
              </div>

              {/* Reason Selector Pills */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Select or Change Disruption Reason:
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'flight_cancellation', label: 'Flight Cancelled', icon: Plane },
                    { id: 'weather_alert', label: 'Severe Weather', icon: CloudRain },
                    { id: 'train_cancellation', label: 'Train Cancelled', icon: Train },
                    { id: 'natural_disaster', label: 'Natural Disaster', icon: AlertOctagon },
                    { id: 'official_change', label: 'Official / Work', icon: Briefcase },
                    { id: 'personal_emergency', label: 'Personal Emergency', icon: UserCheck }
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = selectedReason === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleReasonChange(item.id as DisruptionType)}
                        className={`text-xs px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#00B074] text-white border-[#00B074] shadow-xs' 
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Cards: "What would you like to do?" */}
              <div>
                <h3 className="text-base font-bold text-[#0B2545] mb-3">
                  What would you like to do?
                </h3>
                
                <div className="grid grid-cols-1 gap-3.5">
                  
                  {/* Option 1: Emergency Stay */}
                  <button
                    type="button"
                    onClick={() => setScreen(3)}
                    className="w-full text-left p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-500 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                        <Home className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-emerald-950">Find Emergency Stay</span>
                          <span className="text-[10px] uppercase font-extrabold bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full">
                            Immediate
                          </span>
                        </div>
                        <p className="text-xs text-emerald-800/80 mt-0.5">
                          Verified nearby safe hotels & homestays with 24/7 check-in (near your location)
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>

                  {/* Option 2: View Refund / Cancellation Info */}
                  <button
                    type="button"
                    onClick={() => setScreen('refund')}
                    className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-400 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-sm sm:text-base text-[#0B2545]">View Refund / Cancellation Info</span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Carrier penalty waiver policies, instant claim docket & full fare refund status
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>

                  {/* Option 3: Replan My Trip */}
                  <button
                    type="button"
                    onClick={() => setScreen(4)}
                    className="w-full text-left p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-purple-400 transition-all flex items-center justify-between group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 group-hover:scale-105 transition-transform">
                        <RotateCcw className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-sm sm:text-base text-[#0B2545]">Replan My Trip</span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Explore alternate travel dates or switch to guaranteed sunny alternative destinations
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
                  </button>

                </div>
              </div>

              {/* Footer: Need Help with AI */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Need immediate assistance?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenChatWithQuery) {
                      onOpenChatWithQuery(`My trip to ${trip.destination} is affected due to ${selectedReason}. Can you guide my options?`);
                    }
                  }}
                  className="text-xs font-bold text-[#00B074] hover:text-emerald-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>Chat with 24/7 AI Travel Assistant</span>
                </button>
              </div>

            </div>
          )}

          {/* SCREEN 3: EMERGENCY STAY ASSISTANCE */}
          {screen === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <button
                    type="button"
                    onClick={() => setScreen(2)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Options</span>
                  </button>
                  <h3 className="text-xl font-bold text-[#0B2545]">Emergency Stay</h3>
                  <p className="text-xs text-slate-500">
                    Nearby safe and affordable stays with verified 24/7 check-in assistance.
                  </p>
                </div>
              </div>

              {/* Recommended Stay Featured Section */}
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Recommended Stay
                </span>

                {stays[0] && (() => {
                  const stay = stays[0];
                  const isBooked = bookedStayId === stay.id;
                  return (
                    <div className="bg-white rounded-3xl border-2 border-emerald-500/50 overflow-hidden shadow-lg p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-stretch md:items-center">
                      <div className="relative w-full md:w-52 h-44 rounded-2xl overflow-hidden shrink-0">
                        <img
                          src={stay.image}
                          alt={stay.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                          Top Choice
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <h4 className="font-extrabold text-base sm:text-lg text-[#0B2545]">
                            {stay.name}
                          </h4>
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Verified Safe Facility
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{trip.destination.split(',')[0]} • {stay.distanceKm} km away</span>
                        </p>

                        {/* Amenities: Free WiFi, Food, Parking */}
                        <div className="flex items-center gap-4 text-xs text-slate-600 font-semibold py-1">
                          <span className="flex items-center gap-1.5">
                            <Wifi className="w-3.5 h-3.5 text-emerald-600" /> Free WiFi
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-emerald-600" /> Food
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Car className="w-3.5 h-3.5 text-emerald-600" /> Parking
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Live room tariffs & availability verified directly via certified partner conduit
                          </span>
                        </div>

                        <div className="pt-2 flex items-center gap-2.5 flex-wrap">
                          {isBooked ? (
                            <span className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Stay Confirmed</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBookStay(stay)}
                              className="px-5 py-2.5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>Reserve Stay</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <a
                            href={`tel:${stay.contactPhone}`}
                            className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Call Reception</span>
                          </a>

                          <a
                            href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(stay.name + ' ' + trip.destination.split(',')[0])}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            <span>Booking.com</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => setShowAllStays(!showAllStays)}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            {showAllStays ? 'Hide Additional' : 'View More Stays'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Collapsible Additional Stays */}
              {showAllStays && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Other Nearby Vetted Accommodation Options:
                  </span>
                  {stays.slice(1).map((stay) => {
                    const isBooked = bookedStayId === stay.id;
                    return (
                      <div
                        key={stay.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isBooked 
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20' 
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={stay.image}
                            alt={stay.name}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-[#0B2545] truncate">
                                {stay.name}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {stay.distanceKm} km away
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Verified Safe
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{stay.address}</p>
                            <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium mt-1.5">
                              <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-600" /> WiFi</span>
                              <span className="flex items-center gap-1"><Utensils className="w-3 h-3 text-emerald-600" /> Food</span>
                              <span className="flex items-center gap-1"><Car className="w-3 h-3 text-emerald-600" /> Parking</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 shrink-0">
                          <span className="text-xs font-semibold text-slate-500">
                            Check Live Tariff
                          </span>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <a
                              href={`tel:${stay.contactPhone}`}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                              title="Call Stay Front Desk"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            </a>
                            <a
                              href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(stay.name + ' ' + trip.destination.split(',')[0])}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700"
                              title="View on Booking.com"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            </a>
                            {isBooked ? (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Booked
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleBookStay(stay)}
                                className="px-3 py-1.5 rounded-lg bg-[#00B074] hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer"
                              >
                                Book Stay
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {bookedStayId && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Hotel reservation confirmed. Front desk has been notified for your priority check-in.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScreen(4)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer shrink-0 ml-2"
                  >
                    Next: Replan Trip →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SCREEN 4: REPLAN TRIP OPTION */}
          {screen === 4 && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => setScreen(2)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Options</span>
                </button>
                <h3 className="text-xl font-bold text-[#0B2545]">Replan Your Trip</h3>
                <p className="text-xs text-slate-500">
                  We've found these options for you based on current availability and weather windows.
                </p>
              </div>

              {/* Segmented Control: Alternate Dates vs New Destination */}
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setReplanTab('alternate_dates');
                    setSelectedReplanOption(replanData.alternateDates[0]);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    replanTab === 'alternate_dates' 
                      ? 'bg-white text-[#0B2545] shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Alternate Dates</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplanTab('new_destination');
                    setSelectedReplanOption(replanData.newDestinations[0]);
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    replanTab === 'new_destination' 
                      ? 'bg-white text-[#0B2545] shadow-xs' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>New Destination</span>
                </button>
              </div>

              {/* Original Baseline Card */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 text-xs opacity-90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                    <Plane className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{trip.destination.split(',')[0]} (Original)</span>
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-bold">Disrupted</span>
                    </div>
                    <span className="text-slate-500 text-[11px] block mt-0.5">{trip.durationDays} Days • Original Dates</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700 block">{formatCurrency(trip.estimatedTotal || trip.totalBudget, currency)}</span>
                  <span className="text-[10px] text-slate-400">Current Cost</span>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-3">
                {(replanTab === 'alternate_dates' ? replanData.alternateDates : replanData.newDestinations).map((opt) => {
                  const isSelected = selectedReplanOption?.id === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedReplanOption(opt)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                        isSelected 
                          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-xs' 
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={opt.image}
                          alt={opt.title}
                          className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-100"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-[#0B2545]">
                              {opt.title}
                            </h4>
                            {opt.isRecommended && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Recommended
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                            {opt.datesLabel} • {opt.weatherCondition}
                          </span>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                            {opt.recommendationReason}
                          </p>
                        </div>
                      </div>

                      {/* Cost and Radio */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <span className="text-sm sm:text-base font-extrabold text-[#0B2545]">
                          {formatCurrency(opt.estimatedCost, currency)}
                        </span>
                        <span className={`text-[11px] font-bold ${opt.costDelta > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {opt.costDelta === 0 ? 'Exact Budget Match' : opt.costDelta > 0 ? `+${formatCurrency(opt.costDelta, currency)}` : `${formatCurrency(opt.costDelta, currency)} savings`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Replan Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenChatWithQuery) {
                      onOpenChatWithQuery(`Help me compare replanning options between ${selectedReplanOption.destination} and my original plan.`);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-[#00B074]" />
                  <span>Chat with AI</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReplan}
                  className="px-6 py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Select & Replan</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* SCREEN 5: FINAL CONFIRMATION */}
          {screen === 5 && (
            <div className="space-y-6 text-center py-4">
              {/* Graphic Icon: airplane flying over landscape */}
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 ring-8 ring-emerald-50 animate-in zoom-in">
                <Plane className="w-12 h-12 text-white drop-shadow-md -rotate-12 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white text-[#00B074] flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-5 h-5 fill-emerald-100 text-[#00B074]" />
                </div>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[#0B2545] tracking-tight">
                  Your Trip Has Been Replanned!
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                  We've updated your itinerary and saved your preferences.
                </p>
              </div>

              {/* Summary Card */}
              {selectedReplanOption && (
                <div className="bg-slate-50/90 border border-slate-200 rounded-3xl p-5 max-w-md mx-auto text-left space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>New Destination</span>
                    </span>
                    <span className="text-sm font-bold text-[#0B2545]">
                      {selectedReplanOption.destination.split(',')[0]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Duration</span>
                    </span>
                    <span className="text-sm font-bold text-[#0B2545]">
                      {selectedReplanOption.durationDays} days
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Total Cost</span>
                    </span>
                    <span className="text-lg font-black text-[#00B074]">
                      {formatCurrency(selectedReplanOption.estimatedCost, currency)}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  View Itinerary
                </button>

                {onViewMap && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewMap();
                    }}
                    className="px-6 py-3 rounded-2xl border-2 border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    View on Map
                  </button>
                )}
              </div>

            </div>
          )}

          {/* VIEW: CANCELLATION & REFUND SUPPORT */}
          {screen === 'refund' && (
            <div className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => setScreen(2)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Options</span>
                </button>
                <h3 className="text-xl font-bold text-[#0B2545]">Trip Cancellation & Refund Support</h3>
                <p className="text-xs text-slate-500">
                  Carrier policy guidance, cancellation fee waivers, and instant insurance claims.
                </p>
              </div>

              {/* Refund Summary Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 uppercase">Docket Reference</span>
                  <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800">
                    {refundInfo.referenceNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Original Booking Amount</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrency(refundInfo.originalFareAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Cancellation Fee Waiver</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {refundInfo.cancellationFeeWaiverPercent}% Penalty Waived
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                  <span className="text-sm font-bold text-blue-950">Estimated Refund to Bank</span>
                  <span className="text-lg font-extrabold text-blue-700">
                    {formatCurrency(refundInfo.estimatedRefundAmount, currency)}
                  </span>
                </div>
              </div>

              {/* Exemption Rule */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-[#0B2545] block">Official Policy Rule:</span>
                <p className="text-slate-600">{refundInfo.policyExemptionRule}</p>
              </div>

              {/* Next Steps List */}
              <div>
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
                  Automated Claim Steps:
                </span>
                <div className="space-y-2">
                  {refundInfo.claimSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Helpline & Action */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone className="w-4 h-4 text-[#00B074]" />
                  <span>24/7 Helpline: <strong className="text-slate-800">{refundInfo.supportHelpline}</strong></span>
                </div>

                <button
                  type="button"
                  onClick={() => setScreen(4)}
                  className="px-5 py-2.5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Or Replan Trip Instead →
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
