import React, { useState, useEffect } from 'react';
import { 
  Award, 
  MapPin, 
  Sparkles, 
  Check, 
  Compass, 
  ShieldCheck, 
  TrendingUp, 
  Layers, 
  CheckCircle2,
  Lock,
  Globe,
  Share2,
  Mountain,
  Waves,
  Landmark,
  Snowflake,
  Trees,
  Sun,
  Coffee,
  Train,
  Route,
  Leaf
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { openExternalUrl, triggerHaptic } from '../../services/deviceService';

interface IndianRegion {
  name: string;
  states: { 
    id: string; 
    name: string; 
    tag: string; 
    Icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[];
}

const INDIAN_REGIONS: IndianRegion[] = [
  {
    name: 'Western Gateway & Coasts',
    states: [
      { id: 'RJ', name: 'Rajasthan', tag: 'Forts & Havelis', Icon: Landmark, color: 'text-amber-600 bg-amber-50' },
      { id: 'GJ', name: 'Gujarat', tag: 'Rann & Heritage', Icon: Compass, color: 'text-emerald-600 bg-emerald-50' },
      { id: 'GA', name: 'Goa', tag: 'Sun & Beaches', Icon: Waves, color: 'text-cyan-600 bg-cyan-50' },
      { id: 'MH', name: 'Maharashtra', tag: 'Sahyadri Ghats', Icon: Mountain, color: 'text-indigo-600 bg-indigo-50' }
    ]
  },
  {
    name: 'Northern Himalayas',
    states: [
      { id: 'HP', name: 'Himachal Pradesh', tag: 'Snow & Valleys', Icon: Snowflake, color: 'text-sky-600 bg-sky-50' },
      { id: 'UK', name: 'Uttarakhand', tag: 'Devbhoomi & Rivers', Icon: Trees, color: 'text-emerald-600 bg-emerald-50' },
      { id: 'JK', name: 'Jammu & Kashmir', tag: 'Paradise Lakes', Icon: Snowflake, color: 'text-blue-600 bg-blue-50' },
      { id: 'LA', name: 'Ladakh', tag: 'High Mountain Passes', Icon: Mountain, color: 'text-amber-600 bg-amber-50' },
      { id: 'DL', name: 'Delhi NCR', tag: 'Imperial Capital', Icon: Landmark, color: 'text-rose-600 bg-rose-50' },
      { id: 'PB', name: 'Punjab', tag: 'Golden Fields', Icon: Sun, color: 'text-amber-500 bg-amber-50' }
    ]
  },
  {
    name: 'Southern Tropics & Ghats',
    states: [
      { id: 'KL', name: 'Kerala', tag: 'Backwaters & Spice', Icon: Trees, color: 'text-emerald-600 bg-emerald-50' },
      { id: 'KA', name: 'Karnataka', tag: 'Coffee Hills & Ruins', Icon: Coffee, color: 'text-amber-700 bg-amber-50' },
      { id: 'TN', name: 'Tamil Nadu', tag: 'Dravidian Temples', Icon: Landmark, color: 'text-orange-600 bg-orange-50' },
      { id: 'PY', name: 'Pondicherry', tag: 'Pastel French Villas', Icon: Compass, color: 'text-purple-600 bg-purple-50' },
      { id: 'TS', name: 'Telangana', tag: 'Biryani & Charminar', Icon: Sparkles, color: 'text-blue-600 bg-blue-50' }
    ]
  },
  {
    name: 'Central & Eastern Horizons',
    states: [
      { id: 'MP', name: 'Madhya Pradesh', tag: 'Heart of Tigers', Icon: Trees, color: 'text-teal-600 bg-teal-50' },
      { id: 'WB', name: 'West Bengal', tag: 'Tea & Sunderbans', Icon: Train, color: 'text-rose-600 bg-rose-50' },
      { id: 'OD', name: 'Odisha', tag: 'Konark Sun & Coast', Icon: Waves, color: 'text-cyan-600 bg-cyan-50' },
      { id: 'SK', name: 'Sikkim', tag: 'Kanchenjunga Vista', Icon: Mountain, color: 'text-emerald-600 bg-emerald-50' }
    ]
  }
];

import { loadUserVisitedStates, saveUserVisitedStates } from '../../services/storageService';

const TOTAL_STATES_AND_UTS = 36;

export const DigitalPassport: React.FC = () => {
  const [visitedStates, setVisitedStates] = useState<string[]>(() => loadUserVisitedStates());

  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [copiedShare, setCopiedShare] = useState(false);

  // Sync state when account switches or visited states change
  useEffect(() => {
    const handleStatesChange = (e: any) => {
      if (Array.isArray(e.detail)) {
        setVisitedStates(e.detail);
      } else {
        setVisitedStates(loadUserVisitedStates());
      }
    };
    const handleAuthChange = () => {
      setVisitedStates(loadUserVisitedStates());
    };

    window.addEventListener('tripverse_visited_states_change', handleStatesChange);
    window.addEventListener('tripverse_auth_state_change', handleAuthChange);
    return () => {
      window.removeEventListener('tripverse_visited_states_change', handleStatesChange);
      window.removeEventListener('tripverse_auth_state_change', handleAuthChange);
    };
  }, []);

  const toggleState = (stateId: string, stateName: string) => {
    const isAlreadyVisited = visitedStates.includes(stateId);
    let updated: string[];

    if (isAlreadyVisited) {
      updated = visitedStates.filter(id => id !== stateId);
      triggerHaptic('light');
    } else {
      updated = [...visitedStates, stateId];
      triggerHaptic('success');
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#2D5A3D', '#38BDF8', '#F59E0B']
        });
      } catch (e) {}
    }

    setVisitedStates(updated);
    saveUserVisitedStates(updated);
  };

  const percentUnlocked = Math.round((visitedStates.length / TOTAL_STATES_AND_UTS) * 100);
  const estimatedKm = visitedStates.length * 480;

  // Achievement Badges
  const badges = [
    {
      id: 'himalayan',
      title: 'Himalayan Trailblazer',
      description: 'Explored high altitude passes in Himachal, Uttarakhand, or Ladakh.',
      Icon: Mountain,
      color: 'text-sky-700 bg-sky-50 border-sky-200',
      unlocked: visitedStates.includes('HP') || visitedStates.includes('UK') || visitedStates.includes('LA')
    },
    {
      id: 'coastal',
      title: 'Coastal Voyager',
      description: 'Stood before the Arabian Sea or Bay of Bengal across 2+ beach states.',
      Icon: Waves,
      color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
      unlocked: ['GA', 'KL', 'MH', 'TN', 'PY'].filter(s => visitedStates.includes(s)).length >= 2
    },
    {
      id: 'heritage',
      title: 'Heritage Connoisseur',
      description: 'Walked through royal fortresses and palaces in Rajasthan or MP.',
      Icon: Landmark,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      unlocked: visitedStates.includes('RJ') || visitedStates.includes('MP')
    },
    {
      id: 'expressway',
      title: 'Expressway Cruiser',
      description: 'Clocked 500+ kilometers along interstate national highway routes.',
      Icon: Route,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      unlocked: visitedStates.length >= 3
    },
    {
      id: 'pan_india',
      title: 'Pan-India Explorer',
      description: 'Explored destinations across 5+ distinct Indian states.',
      Icon: Globe,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      unlocked: visitedStates.length >= 5
    },
    {
      id: 'eco',
      title: 'Eco-Voyager Pioneer',
      description: 'Prioritized shared group rides or green rail transport journeys.',
      Icon: Leaf,
      color: 'text-teal-700 bg-teal-50 border-teal-200',
      unlocked: true // Default earned via smart routing
    }
  ];

  const handleSharePassport = () => {
    const text = `TripVerse India Travel Passport:\n• ${visitedStates.length}/${TOTAL_STATES_AND_UTS} States & UTs Explored (${percentUnlocked}% of India Unlocked)\n• ~${estimatedKm} km Logged\n• ${badges.filter(b => b.unlocked).length} Achievement Badges Earned\n\nTrack your road trips with TripVerse AI`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
      triggerHaptic('light');
    }
    const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    openExternalUrl(wa);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Passport Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="badge-caps text-[#2D5A3D]">Gamified Travel Ledger</span>
            <span className="text-xs font-semibold text-slate-300">•</span>
            <span className="text-xs font-medium text-slate-500">Official Indian Travel Log</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0B2545] mt-1 tracking-tight">
            Digital Travel Passport & State Badges
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Tap any state to stamp your digital passport. Unlock achievements as you explore India's highways.
          </p>
        </div>

        <button
          onClick={handleSharePassport}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
          <span>{copiedShare ? 'Copied & Shared!' : 'Share Passport'}</span>
        </button>
      </div>

      {/* Progress & Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* State Unlocked Stat */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/70 space-y-2">
          <span className="text-[10px] uppercase font-semibold text-emerald-800 tracking-wider block">
            India Territory Unlocked
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#0B2545]">
            {visitedStates.length} <span className="text-sm text-slate-500 font-sans font-normal">/ {TOTAL_STATES_AND_UTS} States</span>
          </div>
          <div className="w-full bg-emerald-200/80 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#2D5A3D] rounded-full transition-all duration-500"
              style={{ width: `${percentUnlocked}%` }}
            />
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 block">
            {percentUnlocked}% of India Explored
          </span>
        </div>

        {/* Kilometers Logged */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
            Roadtrip Distance Logged
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#0B2545]">
            ~{estimatedKm.toLocaleString()} <span className="text-sm text-slate-400 font-sans font-normal">km</span>
          </div>
          <p className="text-[11px] text-slate-500 pt-1 font-sans">
            Across expressways, ghat passes, and state corridors.
          </p>
        </div>

        {/* Carbon Rating */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
          <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
            Eco-Traveler Score
          </span>
          <div className="text-2xl sm:text-3xl font-serif font-bold text-[#2D5A3D]">
            94 / 100
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Low carbon footprint via smart group carpooling.</span>
          </div>
        </div>

      </div>

      {/* State Scratch & Stamp Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0B2545] font-serif flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600" />
            <span>Interactive State Stamps (Tap to Stamp)</span>
          </h3>
          <span className="text-[11px] text-slate-500 font-medium">
            {visitedStates.length} Stamped
          </span>
        </div>

        <div className="space-y-4">
          {INDIAN_REGIONS.map(region => (
            <div key={region.name} className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                {region.name}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {region.states.map(st => {
                  const isVisited = visitedStates.includes(st.id);
                  const StateIcon = st.Icon;

                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleState(st.id, st.name)}
                      className={`p-3 rounded-2xl border text-left transition-all duration-200 flex items-start justify-between gap-2 cursor-pointer ${
                        isVisited
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs ring-1 ring-emerald-500/20'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${st.color}`}>
                            <StateIcon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {st.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate mt-1">
                          {st.tag}
                        </span>
                      </div>

                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                        isVisited ? 'bg-[#2D5A3D] text-white' : 'border border-slate-300'
                      }`}>
                        {isVisited && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unlockable Achievement Badges */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0B2545] font-serif flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Explorer Badges & Trophies ({badges.filter(b => b.unlocked).length}/{badges.length})</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {badges.map(b => {
            const BadgeIcon = b.Icon;
            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${
                  b.unlocked
                    ? 'bg-white border-amber-200/80 shadow-xs ring-1 ring-amber-400/20'
                    : 'bg-slate-50/70 border-slate-200/70 opacity-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${b.color}`}>
                  <BadgeIcon className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-semibold text-slate-900 truncate">
                      {b.title}
                    </h4>
                    {b.unlocked ? (
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                        Earned
                      </span>
                    ) : (
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    {b.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
