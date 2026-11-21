import { describe, it, expect } from 'vitest';
import {
  scanTravelImage,
  ScannedLandmarkResult,
  ScannedFoodResult,
  ScannedUnverifiedResult
} from '../src/services/visualAiScannerService';

describe('Visual AI Scanner Service (visualAiScannerService)', () => {
  it('correctly identifies Eiffel Tower from explicit cues', async () => {
    const fakeFile = new File(['fake-image-bytes'], 'eiffel_tower_paris_sunset.jpg', { type: 'image/jpeg' });
    const result = await scanTravelImage(fakeFile) as ScannedLandmarkResult;

    expect(result.type).toBe('landmark');
    expect(result.name).toBe('Eiffel Tower');
    expect(result.city).toBe('Paris');
    expect(result.country).toBe('France');
    expect(result.confidence).toBeGreaterThan(0.9);
    expect(result.entryFee).toContain('€28.30');
  });

  it('correctly identifies Taj Mahal from prompt cues', async () => {
    const result = await scanTravelImage('data:image/jpeg;base64,mock', 'What is this marble wonder in Agra?') as ScannedLandmarkResult;

    expect(result.type).toBe('landmark');
    expect(result.name).toBe('Taj Mahal');
    expect(result.city).toBe('Agra');
    expect(result.country).toBe('India');
    expect(result.architecturalStyle).toContain('Mughal Architecture');
  });

  it('never fabricates fake boarding pass PNRs or fares when live vision OCR is offline', async () => {
    const fakeFile = new File(['fake-bytes'], 'emirates_boarding_pass_dubai.png', { type: 'image/png' });
    const result = await scanTravelImage(fakeFile) as ScannedUnverifiedResult;

    expect(result.type).toBe('unverified');
    expect(result.reason).toBe('vision_unavailable');
    expect(result.guidance.toLowerCase()).toContain('never fabricate');
  });

  it('correctly identifies culinary dish when explicitly named', async () => {
    const result = await scanTravelImage('data:image/png;base64,mock', 'ramen noodle bowl in fukuoka') as ScannedFoodResult;

    expect(result.type).toBe('food');
    expect(result.dishName).toContain('Ramen');
    expect(result.cuisine).toBe('Japanese');
    expect(result.flavorProfile).toContain('umami');
    expect(result.dietaryTags.length).toBeGreaterThan(0);
  });

  it('returns honest unverified response for unknown photos instead of inventing fake landmarks', async () => {
    const fakeFile = new File(['fake-bytes'], 'random_pic_981.jpg', { type: 'image/jpeg' });
    const result = await scanTravelImage(fakeFile) as ScannedUnverifiedResult;

    expect(result.type).toBe('unverified');
    expect(result.reason).toBe('vision_unavailable');
  });
});
