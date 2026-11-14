import { describe, it, expect } from 'vitest';
import { inferArgonStateFromText, ARGON_STATE_THEME, DEFAULT_PROACTIVE_HINTS } from '../src/components/argon/argon.types';

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
});
