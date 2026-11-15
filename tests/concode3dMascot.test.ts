import { describe, it, expect } from 'vitest';
import { preparePromptForConCode } from '../src/services/concode/normalizeUserPrompt';
import { ARGON_STATE_THEME, ArgonState } from '../src/components/argon/argon.types';

describe('ConCode 3D Living Mascot & Prompt Normalizer Engine', () => {
  it('normalizes common travel abbreviations and slang into unambiguous prompt terms', () => {
    const raw = 'pls plan trip b/w manali and shimla rn for 4 ppl w/ budget under 40k cuz mom needs low walking';
    const normalized = preparePromptForConCode(raw);
    expect(normalized).toContain('please');
    expect(normalized).toContain('between');
    expect(normalized).toContain('right now');
    expect(normalized).toContain('people');
    expect(normalized).toContain('with');
    expect(normalized).toContain('₹40,000');
    expect(normalized).toContain('because');
  });

  it('automatically injects a constraint-lock instruction for complex multi-part prompts', () => {
    const longPrompt = 'Can you suggest whether we should do Coorg or Ooty in December? We have 5 days, budget is around 45k, my mother has motion sickness, so we need flat roads and minimal hairpin bends. What do you recommend?';
    const result = preparePromptForConCode(longPrompt);
    expect(result).toContain('[SYSTEM NOTE: This is a multi-part user query.');
    expect(result).toContain('Extract every constraint');
    expect(result).toContain('Do not give a short generic summary.');
  });

  it('preserves short concise prompts without unnecessary system note bloat', () => {
    const shortPrompt = 'What is the weather in Paris?';
    const result = preparePromptForConCode(shortPrompt);
    expect(result).toBe('What is the weather in Paris?');
    expect(result).not.toContain('[SYSTEM NOTE:');
  });

  it('verifies theme definitions for all mascot emotion states including decided and confused', () => {
    const states: ArgonState[] = [
      'idle',
      'listening',
      'thinking',
      'excited',
      'decided',
      'warning',
      'confused',
      'speaking'
    ];

    for (const s of states) {
      const theme = ARGON_STATE_THEME[s];
      expect(theme).toBeDefined();
      expect(theme.ledHex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.badgeLabel).toBeTruthy();
    }
  });
});
