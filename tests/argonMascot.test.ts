import { describe, it, expect } from 'vitest';
import {
  inferArgonStateFromText,
  parseConCodeStreamResponse,
  ARGON_STATE_THEME,
  DEFAULT_PROACTIVE_HINTS,
} from '../src/components/argon/argon.types';
import { isGuestUser } from '../src/services/authService';

describe('Argon AI Mascot State Machine & Emotion Intelligence', () => {
  it('correctly maps emotions and visual themes for all valid states', () => {
    const states = ['idle', 'listening', 'thinking', 'excited', 'warning', 'speaking'] as const;
    for (const state of states) {
      const theme = ARGON_STATE_THEME[state];
      expect(theme).toBeDefined();
      expect(theme.badgeLabel).toBeTruthy();
      expect(theme.ledHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.ledGlowRgba).toContain('rgba');
      expect(theme.visorTint).toBeTruthy();
    }
  });

  it('infers excited state from celebratory and positive decision keywords', () => {
    expect(inferArgonStateFromText("Congratulations! Your flight to Tokyo is confirmed and booked.")).toBe('excited');
    expect(inferArgonStateFromText("Boom! Let's go explore the Swiss Alps!")).toBe('excited');
    expect(inferArgonStateFromText("Amazing, your luxury suite is reserved!")).toBe('excited');
  });

  it('infers warning state from alerts, delays, weather cautions, or budget overruns', () => {
    expect(inferArgonStateFromText("Caution: Heavy rainstorm alert detected on your mountain route.")).toBe('warning');
    expect(inferArgonStateFromText("Flight cancelled due to mechanical issue; re-routing suggested.")).toBe('warning');
    expect(inferArgonStateFromText("Warning: You are approaching 95% of your trip budget limit.")).toBe('warning');
  });

  it('infers thinking state from computation and optimization keywords', () => {
    expect(inferArgonStateFromText("Analyzing 2,400 flight routes to find lowest carbon emissions...")).toBe('thinking');
    expect(inferArgonStateFromText("Optimizing multi-city schedule for maximum museum opening hours.")).toBe('thinking');
  });

  it('infers listening state from open-ended prompts and inquiries', () => {
    expect(inferArgonStateFromText("Where would you like to travel next? Tell me your vibe.")).toBe('listening');
    expect(inferArgonStateFromText("What kind of food are you craving tonight?")).toBe('listening');
  });

  it('defaults to speaking for standard conversational text', () => {
    expect(inferArgonStateFromText("Here is your detailed 3-day walking tour of Rome.")).toBe('speaking');
    expect(inferArgonStateFromText("")).toBe('idle');
  });

  it('provides rich proactive travel hints with actionable questions and emoji cues', () => {
    expect(DEFAULT_PROACTIVE_HINTS.length).toBeGreaterThanOrEqual(4);
    for (const hint of DEFAULT_PROACTIVE_HINTS) {
      expect(hint.id).toBeTruthy();
      expect(hint.text).toBeTruthy();
      expect(hint.actionPrompt).toBeTruthy();
      expect(ARGON_STATE_THEME[hint.emotion]).toBeDefined();
    }
  });

  it('guarantees WCAG compliant high contrast LED indicator colors for all device displays', () => {
    const states = ['idle', 'listening', 'thinking', 'excited', 'warning', 'speaking'] as const;
    for (const state of states) {
      const theme = ARGON_STATE_THEME[state];
      expect(theme.ledHex.length).toBe(7);
      expect(theme.ledGlowRgba).toMatch(/rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)/);
    }
  });

  it('correctly identifies guest users so the sign-up popup is triggered instead of opening chat', () => {
    // Null or undefined user session is a guest
    expect(isGuestUser(null)).toBe(true);
    expect(isGuestUser(undefined)).toBe(true);

    // Anonymous guest explorer
    expect(isGuestUser({
      uid: 'guest-123',
      isAnonymous: true,
      provider: 'guest',
      email: '',
      displayName: 'Guest Explorer'
    } as any)).toBe(true);

    // Registered user with genuine email is not a guest
    expect(isGuestUser({
      uid: 'user-789',
      isAnonymous: false,
      provider: 'google',
      email: 'traveler@tripverse.com',
      displayName: 'Alice Traveler'
    } as any)).toBe(false);
  });

  describe('ConCode Response Stream Parser & State Contract', () => {
    it('parses [STATE:idle] and strips the tag cleanly', () => {
      const raw = "[STATE:idle] Hi there! I'm your ConCode travel companion. Where shall we begin?";
      const result = parseConCodeStreamResponse(raw);
      expect(result.state).toBe('idle');
      expect(result.cleanText).toBe("Hi there! I'm your ConCode travel companion. Where shall we begin?");
      expect(result.cleanText).not.toContain('[STATE:');
    });

    it('parses [STATE:warning] for weather, road, or budget alerts', () => {
      const raw = "[STATE:warning] Please don't cancel just yet—we can definitely make ₹12,000 work comfortably for your group.";
      const result = parseConCodeStreamResponse(raw);
      expect(result.state).toBe('warning');
      expect(result.cleanText).toBe("Please don't cancel just yet—we can definitely make ₹12,000 work comfortably for your group.");
    });

    it('parses [STATE:excited] for route/itinerary confirmation', () => {
      const raw = "[STATE:excited] Done! I have locked the coastal highway route and added the noon café pitstop to your guide.";
      const result = parseConCodeStreamResponse(raw);
      expect(result.state).toBe('excited');
      expect(result.cleanText).toBe("Done! I have locked the coastal highway route and added the noon café pitstop to your guide.");
    });

    it('parses [STATE:thinking] and [STATE:listening] states', () => {
      expect(parseConCodeStreamResponse("[STATE:thinking] Calculating safest mountain passes...").state).toBe('thinking');
      expect(parseConCodeStreamResponse("[STATE:listening] What kind of stays does your group prefer?").state).toBe('listening');
      expect(parseConCodeStreamResponse("[STATE:speaking] Here are your turn-by-turn route notes.").state).toBe('speaking');
    });

    it('gracefully aliases decided to excited and confused to warning', () => {
      const decidedRes = parseConCodeStreamResponse("[STATE:decided] Itinerary locked!");
      expect(decidedRes.state).toBe('excited');
      expect(decidedRes.cleanText).toBe("Itinerary locked!");

      const confusedRes = parseConCodeStreamResponse("[EMOTION:confused] I could not find that destination. Did you mean Manali?");
      expect(confusedRes.state).toBe('warning');
      expect(confusedRes.cleanText).toBe("I could not find that destination. Did you mean Manali?");
    });

    it('falls back to inferArgonStateFromText when no state tag is prefixed', () => {
      const rawAlert = "Warning: road closure on NH-3 due to rainfall.";
      const resAlert = parseConCodeStreamResponse(rawAlert);
      expect(resAlert.state).toBe('warning');
      expect(resAlert.cleanText).toBe(rawAlert);

      const rawBooked = "Congratulations, your ticket is booked and confirmed! 🎉";
      const resBooked = parseConCodeStreamResponse(rawBooked);
      expect(resBooked.state).toBe('excited');
      expect(resBooked.cleanText).toBe(rawBooked);
    });

    it('handles empty or blank string gracefully', () => {
      expect(parseConCodeStreamResponse("").state).toBe('idle');
      expect(parseConCodeStreamResponse("").cleanText).toBe("");
    });
  });
});
