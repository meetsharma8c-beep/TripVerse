// src/components/argon/argon.types.ts

export type ArgonState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'excited'
  | 'warning'
  | 'speaking';

export interface ArgonThemeConfig {
  ledHex: string;
  ledGlowRgba: string;
  badgeLabel: string;
  visorTint: string;
}

export const ARGON_STATE_THEME: Record<ArgonState, ArgonThemeConfig> = {
  idle: {
    ledHex: '#10B981', // Emerald
    ledGlowRgba: 'rgba(16, 185, 129, 0.55)',
    badgeLabel: 'ConCode Ready',
    visorTint: '#FFF4DC',
  },
  listening: {
    ledHex: '#38BDF8', // Cyan
    ledGlowRgba: 'rgba(56, 189, 248, 0.65)',
    badgeLabel: 'Listening...',
    visorTint: '#F5FBFF',
  },
  thinking: {
    ledHex: '#8B5CF6', // Purple
    ledGlowRgba: 'rgba(139, 92, 246, 0.70)',
    badgeLabel: 'Routing via ConCode...',
    visorTint: '#FAF5FF',
  },
  excited: {
    ledHex: '#10B981', // Emerald
    ledGlowRgba: 'rgba(16, 185, 129, 0.80)',
    badgeLabel: 'Itinerary Locked!',
    visorTint: '#FFF1D0',
  },
  warning: {
    ledHex: '#F59E0B', // Amber
    ledGlowRgba: 'rgba(245, 158, 11, 0.75)',
    badgeLabel: 'Travel Advisory',
    visorTint: '#FFF7E6',
  },
  speaking: {
    ledHex: '#38BDF8', // Cyan
    ledGlowRgba: 'rgba(56, 189, 248, 0.65)',
    badgeLabel: 'ConCode AI',
    visorTint: '#FFF4DC',
  },
};

export interface ProactiveHint {
  id: string;
  text: string;
  mobileText?: string;
  actionPrompt: string;
  emotion: ArgonState;
}

export const DEFAULT_PROACTIVE_HINTS: ProactiveHint[] = [
  {
    id: 'day-2',
    text: 'Ready to plan Day 2? 🗺️',
    actionPrompt: 'Plan Day 2 of my itinerary with scenic pitstops.',
    emotion: 'excited',
  },
  {
    id: 'weather-alert',
    text: 'Weather radar on your route 🌦️',
    actionPrompt: 'Check live weather alerts and road conditions on my route.',
    emotion: 'warning',
  },
  {
    id: 'local-gems',
    text: 'Discover hidden food spots 🍜',
    actionPrompt: 'Suggest verified hidden gems and authentic local food.',
    emotion: 'excited',
  },
  {
    id: 'budget-opt',
    text: 'Optimize group travel budget ₹',
    actionPrompt: 'Optimize our trip budget and suggest verified stays.',
    emotion: 'idle',
  },
];

/**
 * Automatically infers Argon's emotional reaction from ConCode AI text or trip telemetry
 */
export function inferArgonStateFromText(text: string): ArgonState {
  if (!text || text.trim() === '') return 'idle';
  const lower = text.toLowerCase();

  // 1. Warnings & alerts take priority
  if (
    /weather alert|rain|monsoon|over budget|delay|roadblock|caution|warning|traffic|sold out|expensive|congestion|cancelled/.test(
      lower
    )
  ) {
    return 'warning';
  }

  // 2. Celebrations, confirmations, excited travel moments
  if (
    /congrat|confirmed|locked|booked|day \d+ ready|great deal|pitstop verified|saved|perfect match|success|boom|let's go|amazing|🎉|✈️|🚀/.test(
      lower
    )
  ) {
    return 'excited';
  }

  // 3. AI calculation and route optimization
  if (
    /routing|calculating|optimizing|analyzing|searching|fetching|checking live/.test(
      lower
    )
  ) {
    return 'thinking';
  }

  // 4. Inquisitive or listening prompts
  if (
    /where would you like|tell me|what kind|how can i help|where to/.test(
      lower
    )
  ) {
    return 'listening';
  }

  // 5. Default conversational speech
  return 'speaking';
}

/**
 * Parses ConCode response stream prefix tag [STATE:...] or [EMOTION:...] into a clean state and user-facing text.
 * e.g., "[STATE:warning] Heavy showers expected..." -> { state: 'warning', cleanText: 'Heavy showers expected...' }
 * Also gracefully supports decided -> excited and confused -> warning aliases.
 */
export function parseConCodeStreamResponse(rawText: string): {
  state: ArgonState;
  cleanText: string;
} {
  if (!rawText) return { state: 'idle', cleanText: '' };
  const match = rawText.match(
    /^\[(?:STATE|EMOTION):(idle|listening|thinking|excited|warning|speaking|decided|confused)\]\s*/i
  );
  if (match) {
    let matched = match[1].toLowerCase();
    if (matched === 'decided') matched = 'excited';
    if (matched === 'confused') matched = 'warning';
    return {
      state: matched as ArgonState,
      cleanText: rawText.replace(match[0], '').trimStart(),
    };
  }
  return {
    state: inferArgonStateFromText(rawText),
    cleanText: rawText,
  };
}

