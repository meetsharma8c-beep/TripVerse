import { describe, it, expect, vi } from 'vitest';
import { ARGON_HIGH_SYSTEM_PROMPT } from '../src/services/concode/argonHighPrompt';
import { streamConCodeArgonHigh } from '../src/services/concode/concodeRouter';

describe('Argon High Stream Router & System Prompt Suite', () => {
  it('verifies that ARGON_HIGH_SYSTEM_PROMPT adheres to the 3-stage format', () => {
    expect(ARGON_HIGH_SYSTEM_PROMPT).toContain('<concode_think>');
    expect(ARGON_HIGH_SYSTEM_PROMPT).toContain('</concode_think>');
    expect(ARGON_HIGH_SYSTEM_PROMPT).toContain('[STATE:idle|excited|warning]');
    expect(ARGON_HIGH_SYSTEM_PROMPT).toContain('[ACTION:none|route_preview|budget_split|weather_alert]');
    expect(ARGON_HIGH_SYSTEM_PROMPT).toContain('DESTINATION != STATION');
    expect(ARGON_HIGH_SYSTEM_PROMPT).toContain('Option A (Primary) vs. Option B (Contrasting Alternative)');
  });

  it('handles streaming chunks correctly parsing think tags and header tags', async () => {
    // Mock global fetch
    const mockResponseText = 
      '<concode_think>\n- Decode: 4 friends, Jaipur to Rishikesh, 15k\n- Math: ₹15,000 / 4 = ₹3,750 per head\n</concode_think>\n' +
      '[STATE:excited][ACTION:budget_split] Sorted bhai! ₹15,000 for 4 friends is comfortably doable this weekend without night driving.';

    const thinkingUpdates: string[] = [];
    let parsedState = '';
    let parsedAction = '';
    let visibleText = '';
    let completedState = '';
    let providerUsed = '';

    // Simulate fetch returning cloud fallback response
    vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
      if (typeof url === 'string' && url.includes('11434')) {
        // Local Ollama simulated offline
        throw new Error('Connection refused');
      }
      return {
        ok: true,
        json: async () => ({ content: mockResponseText }),
      } as any;
    });

    await streamConCodeArgonHigh(
      [],
      'bro 4 dost hai 15k total budget scene banao jaipur se rishikesh',
      {
        onThinkingUpdate: (thought) => thinkingUpdates.push(thought),
        onHeaderParsed: (state, action) => {
          parsedState = state;
          parsedAction = action;
        },
        onToken: (text) => {
          visibleText = text;
        },
        onComplete: (finalState, provider) => {
          completedState = finalState;
          providerUsed = provider;
        },
      }
    );

    expect(providerUsed).toBe('cloud-fallback');
    expect(parsedState).toBe('excited');
    expect(parsedAction).toBe('budget_split');
    expect(completedState).toBe('excited');
    expect(visibleText).toContain('Sorted bhai! ₹15,000 for 4 friends is comfortably doable');
    expect(visibleText).not.toContain('<concode_think>');
    expect(visibleText).not.toContain('[STATE:');

    vi.restoreAllMocks();
  });
});
