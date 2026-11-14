import { describe, it, expect } from 'vitest';
import { generateLandmarkNarration } from '../src/services/audioTourService';

describe('Hands-Free Audio Tour Guide Service (audioTourService)', () => {
  it('generates rich historical scripts for world landmarks', () => {
    const eiffel = generateLandmarkNarration('Eiffel Tower', 'Paris');
    expect(eiffel).toContain('Champ de Mars');
    expect(eiffel).toContain('330 metres');

    const taj = generateLandmarkNarration('Taj Mahal', 'Agra');
    expect(taj).toContain('Shah Jahan');
    expect(taj).toContain('Makrana marble');

    const hadimba = generateLandmarkNarration('Hadimba Temple', 'Manali');
    expect(hadimba).toContain('cedar');
    expect(hadimba).toContain('pagoda');
  });

  it('provides engaging dynamic storytelling narration for any global destination', () => {
    const custom = generateLandmarkNarration('Dubrovnik Old Town Fortress', 'Croatia');
    expect(custom).toContain('Dubrovnik Old Town Fortress');
    expect(custom).toContain('Croatia');
    expect(custom).toContain('ConCode AI wishes you a wonderful discovery');
  });
});
