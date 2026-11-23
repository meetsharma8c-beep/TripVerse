/**
 * Hands-Free Audio Tour Guide Service (audioTourService.ts)
 * Delivers immersive, spoken audio narrations for landmarks and destinations
 * using the Web Speech Synthesis API.
 */

export interface AudioTourState {
  isPlaying: boolean;
  isPaused: boolean;
  currentLandmark: string | null;
  playbackRate: number;
}

const LANDMARK_AUDIO_SCRIPTS: Record<string, string> = {
  'eiffel tower': 'Welcome to the Champ de Mars in Paris. Rising 330 metres above the Seine River, the Eiffel Tower was erected in 1889 as the grand entrance to the World\'s Fair. Engineered from over 18,000 pieces of puddling wrought iron by Gustave Eiffel, it was initially criticized by artists as a colossal black smokestack. Today, it stands as the timeless beating heart of France. Take a moment to glance up at the intricate lattice archways.',
  'taj mahal': 'You are standing before the Taj Mahal in Agra. Commissioned in 1632 by the fifth Mughal Emperor Shah Jahan to house the tomb of his beloved wife, Mumtaz Mahal. Over twenty thousand artisans carved translucent white Makrana marble and embedded semi-precious jade, lapis lazuli, and onyx into floral arabesques. Notice how the central dome seems to float weightless above the reflecting pool.',
  'burj khalifa': 'Behold the Burj Khalifa, towering 828 metres into the Arabian desert sky. Its tripartite Y-shaped footprint is modeled after the desert Spider Lily flower, engineered to deflect vortex wind shedding. As you gaze towards the silver spire, know that it takes twenty minutes for the sun to set at the pinnacle after it has already vanished on the ground.',
  'hadimba temple': 'Breathe in the deep Himalayan cedar scent of Dhungiri forest. You have reached Hadimba Temple, built in 1553 with a four-tiered wooden pagoda roof. Unlike traditional Hindu shrines, it venerates Hidimba Devi from the Mahabharata epic. Look closely at the carved door jambs depicting mythological deities, warriors, and wild alpine beasts.',
  'colosseum': 'Step into the colossal amphitheatre of ancient Rome, consecrated in 80 AD under Emperor Titus. For four centuries, up to eighty thousand Roman citizens gathered beneath linen awnings to witness gladiator spectacles and engineered naval battles. Listen to the echoes within these travertine arches.'
};

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentListener: ((state: AudioTourState) => void) | null = null;
let activeLandmark: string | null = null;

export function setAudioTourListener(callback: ((state: AudioTourState) => void) | null) {
  currentListener = callback;
}

function notifyState(isPlaying: boolean, isPaused: boolean) {
  if (currentListener) {
    currentListener({
      isPlaying,
      isPaused,
      currentLandmark: activeLandmark,
      playbackRate: 1.0
    });
  }
}

export function generateLandmarkNarration(landmarkName: string, destination?: string, customDescription?: string): string {
  const norm = landmarkName.toLowerCase();
  for (const [key, script] of Object.entries(LANDMARK_AUDIO_SCRIPTS)) {
    if (norm.includes(key)) {
      return script;
    }
  }

  if (customDescription && customDescription.trim().length > 25) {
    return `Welcome to ${landmarkName}${destination ? ` in ${destination}` : ''}. ${customDescription.trim()} ConCode AI wishes you a wonderful discovery.`;
  }

  // Dynamic fallback storytelling narration
  return `Welcome to ${landmarkName}${destination ? ` in ${destination}` : ''}. You are gazing at one of the region's most beloved cultural anchors. As you explore this landmark, take notice of the traditional regional craftsmanship, the bustling local atmosphere, and the timeless heritage passed down through generations. ConCode AI wishes you a wonderful discovery.`;
}

/**
 * Fetch a genuine, factual Wikipedia summary for any landmark worldwide so the
 * Audio Tour Guide narrates real history instead of generic boilerplate.
 */
export async function fetchLiveLandmarkNarration(
  landmarkName: string,
  destination?: string
): Promise<string | null> {
  if (typeof fetch === 'undefined') return null;
  const cleanTitle = landmarkName.split('&')[0].split('(')[0].trim();
  if (!cleanTitle || cleanTitle.length < 3) return null;

  const candidates = [
    cleanTitle,
    destination ? `${cleanTitle}, ${destination.split(',')[0].trim()}` : ''
  ].filter(Boolean);

  for (const title of candidates) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3_500);
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/\s+/g, '_'))}`,
        { headers: { Accept: 'application/json' }, signal: controller.signal }
      );
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json().catch(() => null);
      const extract = typeof data?.extract === 'string' ? data.extract.trim() : '';
      if (extract.length >= 60 && data?.type !== 'disambiguation') {
        const matched = extract.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
        const sentences = (matched ? matched.slice(0, 3).map((s: string) => s.trim()).join(' ') : extract).trim();
        return `Welcome to ${landmarkName}${destination ? ` in ${destination}` : ''}. ${sentences}`;
      }
    } catch {
      clearTimeout(timer);
    }
  }
  return null;
}

function speakScript(
  script: string,
  landmarkName: string,
  onFinished?: () => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  activeLandmark = landmarkName;
  const utterance = new SpeechSynthesisUtterance(script);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Prefer natural English voices if available
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Daniel')));
  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  utterance.onstart = () => {
    notifyState(true, false);
  };

  utterance.onend = () => {
    activeLandmark = null;
    notifyState(false, false);
    if (onFinished) onFinished();
  };

  utterance.onerror = () => {
    activeLandmark = null;
    notifyState(false, false);
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
  return true;
}

export function startAudioTour(
  landmarkName: string,
  destination?: string,
  onFinished?: () => void,
  customDescription?: string
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  stopAudioTour();

  const norm = landmarkName.toLowerCase();
  const hasCuratedScript = Object.keys(LANDMARK_AUDIO_SCRIPTS).some(k => norm.includes(k));
  if (hasCuratedScript || (customDescription && customDescription.trim().length > 25)) {
    const script = generateLandmarkNarration(landmarkName, destination, customDescription);
    return speakScript(script, landmarkName, onFinished);
  }

  // Enrich with real Wikipedia historical summary before speaking
  activeLandmark = landmarkName;
  notifyState(true, false);
  void fetchLiveLandmarkNarration(landmarkName, destination).then((wikiScript) => {
    // Only speak if the user didn't stop or switch tours while fetching
    if (activeLandmark !== landmarkName) return;
    const finalScript = wikiScript || generateLandmarkNarration(landmarkName, destination);
    speakScript(finalScript, landmarkName, onFinished);
  });

  return true;
}

export function pauseAudioTour() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    notifyState(true, true);
  }
}

export function resumeAudioTour() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    notifyState(true, false);
  }
}

export function stopAudioTour() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeLandmark = null;
    notifyState(false, false);
  }
}
