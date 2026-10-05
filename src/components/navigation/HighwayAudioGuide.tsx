import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Headphones, 
  Sparkles, 
  Compass, 
  MapPin, 
  Clock, 
  RotateCcw,
  Sliders,
  Radio,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { triggerHaptic } from '../../services/deviceService';

interface AudioStory {
  id: string;
  milestoneKm: number;
  title: string;
  tagline: string;
  durationSec: number;
  location: string;
  narration: string;
  funFact: string;
}

const HIGHWAY_STORIES: AudioStory[] = [
  {
    id: 'story-1',
    milestoneKm: 18,
    title: 'Sabarmati & The Salt March Corridor',
    tagline: 'The Cradle of Indian Independence',
    durationSec: 45,
    location: 'Ahmedabad Outskirts (NH-147)',
    narration: 'As you leave Ahmedabad, you are driving parallel to the historic Sabarmati River. It was from here in 1930 that Mahatma Gandhi commenced the famous 385-kilometer Dandi Salt March. The riverbed was once dry for months, but is now India’s premier urban riverfront project.',
    funFact: 'The river was named after the sage Kashyapa’s daughter, Sabarmati, meaning "the all-bearing mother".'
  },
  {
    id: 'story-2',
    milestoneKm: 48,
    title: 'The Golden Quadrilateral Highway (NH-48)',
    tagline: 'Engineering the Lifeline of India',
    durationSec: 40,
    location: 'Chiloda to Prantij Expressway',
    narration: 'You have now entered the NH-48 corridor, part of India’s ambitious Golden Quadrilateral network. Connecting Delhi, Mumbai, Chennai, and Kolkata, this 5,846-kilometer highway is one of the longest four-to-six lane expressway loops in the world.',
    funFact: 'Over 65 percent of India’s long-distance interstate road freight travels along parts of this very highway.'
  },
  {
    id: 'story-3',
    milestoneKm: 115,
    title: 'Shamlaji & The 1,000-Year-Old Aravalli Pass',
    tagline: 'Ancient Trade Route of the Solanki Kings',
    durationSec: 50,
    location: 'Shamlaji Valley, Gujarat',
    narration: 'Approaching the Shamlaji hills, notice the ancient sandstone cliffs. The 11th-century Gadadhar Vishnu temple here was once a primary resting halt for camel and bullock caravans trading silk, spices, and silver between the ports of Gujarat and the royal courts of Mewar.',
    funFact: 'The river Meshwo carving through this valley has yielded archaeological terracotta seals dating back to the Gupta Empire.'
  },
  {
    id: 'story-4',
    milestoneKm: 148,
    title: 'Ratanpur Gate: Welcome to Mewar',
    tagline: 'Entering the Land of Maharana Pratap',
    durationSec: 45,
    location: 'Gujarat–Rajasthan Interstate Border',
    narration: 'You are crossing the border into Rajasthan at Ratanpur. You have now entered Mewar, historically celebrated as the only kingdom in medieval India that never bowed to foreign imperial conquest. The landscape shifts here from sandy plains to rolling granite hillocks.',
    funFact: 'Notice the highway dhabas suddenly serving spicy Dal Baati Churma and buttermilk spiced with roasted cumin and mint!'
  },
  {
    id: 'story-5',
    milestoneKm: 195,
    title: 'Kherwara Pass: The Whispering Hills',
    tagline: 'Gateway of the Mewar Bhil Corps',
    durationSec: 40,
    location: 'Kherwara Ghat Section',
    narration: 'As you navigate the gentle curves of Kherwara, look right towards the rolling valleys. In the 1840s, this historic garrison protected the mountain passes. The indigenous Bhil archers here were legendary allies who fought alongside Maharana Pratap at the Battle of Haldighati in 1576.',
    funFact: 'The Aravalli range you are driving through is geologically older than the Himalayas, dating back over 2 billion years.'
  },
  {
    id: 'story-6',
    milestoneKm: 254,
    title: 'Lake Pichola & The City of Lakes Arrival',
    tagline: 'A Romantic Venetian Oasis in the Desert',
    durationSec: 55,
    location: 'Udaipur City Waterfront',
    narration: 'Welcome to Udaipur! Founded in 1559 by Maharana Udai Singh II, this oasis was designed around Lake Pichola, an artificial lake built by a Banjara grain gypsy in 1362. The marble City Palace stands guard on the eastern bank, reflecting floating white palaces on the water.',
    funFact: 'Lake Palace on Jag Niwas island was immortalized globally in the classic 1983 James Bond film, Octopussy.'
  }
];

interface HighwayAudioGuideProps {
  currentDistanceKm?: number;
  onClose?: () => void;
}

export const HighwayAudioGuide: React.FC<HighwayAudioGuideProps> = ({
  currentDistanceKm = 35,
  onClose
}) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isAutoPlayMode, setIsAutoPlayMode] = useState(true);

  const activeStory = HIGHWAY_STORIES[activeStoryIndex];

  // Stop speaking on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakCurrentStory = (speed = playbackSpeed) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted) return;

    window.speechSynthesis.cancel();

    const textToSpeak = `${activeStory.title}. ${activeStory.tagline}. ${activeStory.narration} Quick highway fact: ${activeStory.funFact}`;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = speed;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN'; // Authentic Indian English cadence

    utterance.onend = () => {
      setIsPlaying(false);
      // If auto-play mode is on and there is a next story
      if (isAutoPlayMode && activeStoryIndex < HIGHWAY_STORIES.length - 1) {
        setTimeout(() => {
          setActiveStoryIndex(prev => prev + 1);
        }, 3000);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    triggerHaptic('light');
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      triggerHaptic('light');
    } else {
      speakCurrentStory();
    }
  };

  const handleNextStory = () => {
    window.speechSynthesis.cancel();
    const nextIdx = (activeStoryIndex + 1) % HIGHWAY_STORIES.length;
    setActiveStoryIndex(nextIdx);
    setIsPlaying(false);
    triggerHaptic('light');
  };

  const handlePrevStory = () => {
    window.speechSynthesis.cancel();
    const prevIdx = activeStoryIndex === 0 ? HIGHWAY_STORIES.length - 1 : activeStoryIndex - 1;
    setActiveStoryIndex(prevIdx);
    setIsPlaying(false);
    triggerHaptic('light');
  };

  const handleSpeedChange = () => {
    const speeds = [0.85, 1.0, 1.2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    triggerHaptic('light');
    if (isPlaying) {
      speakCurrentStory(nextSpeed);
    }
  };

  const handleSelectStory = (idx: number) => {
    window.speechSynthesis.cancel();
    setActiveStoryIndex(idx);
    setIsPlaying(false);
    triggerHaptic('light');
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 border border-slate-800 shadow-2xl space-y-5">
      
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Headphones className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="badge-caps text-emerald-400">Hands-Free AI Audio Companion</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <h3 className="text-base sm:text-lg font-bold font-display text-white mt-0.5">
              Highway Heritage & Landmarks Tour
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AutoPlay Toggle */}
          <button
            onClick={() => setIsAutoPlayMode(!isAutoPlayMode)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isAutoPlayMode 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isAutoPlayMode ? 'Auto-Narration ON' : 'Manual Mode'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Close Guide"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Active Story Showcase Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700/80 relative overflow-hidden space-y-3">
        
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-300">{activeStory.location}</span>
          </div>
          <span className="font-bold text-emerald-400">
            Milestone: KM {activeStory.milestoneKm}
          </span>
        </div>

        <div>
          <h4 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight leading-snug">
            {activeStory.title}
          </h4>
          <p className="text-xs text-emerald-300 font-medium mt-0.5">
            {activeStory.tagline}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
          {activeStory.narration}
        </p>

        {/* Fun Fact Callout */}
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2 text-xs">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span className="text-slate-200">
            <strong className="text-emerald-300">Local Highway Secret:</strong> {activeStory.funFact}
          </span>
        </div>

        {/* Audio Player Controls */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrevStory}
              className="p-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer"
              title="Previous Story"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlayPause}
              className="px-5 py-3 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause Audio Story</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Play Voice Guide</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNextStory}
              className="p-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors cursor-pointer"
              title="Next Story"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Speed Toggle */}
            <button
              type="button"
              onClick={handleSpeedChange}
              className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              {playbackSpeed}x Speed
            </button>

            {/* Mute Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsMuted(!isMuted);
                if (isPlaying) {
                  window.speechSynthesis.cancel();
                  setIsPlaying(false);
                }
              }}
              className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>

        </div>

      </div>

      {/* Highway Milestones Playlist */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          Tour Landmarks Along NH-48 ({HIGHWAY_STORIES.length} Stories)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HIGHWAY_STORIES.map((st, idx) => {
            const isCurrent = idx === activeStoryIndex;

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleSelectStory(idx)}
                className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                    : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="font-bold text-emerald-400">KM {st.milestoneKm}</span>
                    <span>•</span>
                    <span className="truncate">{st.location}</span>
                  </div>
                  <h5 className="text-xs font-bold text-white truncate mt-0.5">
                    {st.title}
                  </h5>
                </div>

                <div className="shrink-0">
                  {isCurrent && isPlaying ? (
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-emerald-400 animate-pulse rounded-full" />
                      <span className="w-1 h-4 bg-emerald-400 animate-pulse rounded-full delay-75" />
                      <span className="w-1 h-2 bg-emerald-400 animate-pulse rounded-full delay-150" />
                    </div>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
