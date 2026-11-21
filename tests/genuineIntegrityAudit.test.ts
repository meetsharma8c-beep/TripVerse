import { describe, it, expect } from 'vitest';
import { getLocalGems } from '../src/services/localGemsService';
import { scanTravelImage } from '../src/services/visualAiScannerService';
import { subscribeToTripCollaboration } from '../src/services/collaborationService';
import { generateLandmarkNarration } from '../src/services/audioTourService';

describe('Genuine Integrity Audit Regression Suite', () => {
  it('returns genuine real-world Mathura eateries and viewpoints instead of synthetic placeholders', () => {
    const mathuraGems = getLocalGems('Mathura');
    const foodNames = mathuraGems.foodGems.map(f => f.name.toLowerCase());
    const gemTitles = mathuraGems.hiddenGems.map(g => g.title.toLowerCase());

    expect(foodNames.some(n => n.includes('brijwasi'))).toBe(true);
    expect(foodNames.some(n => n.includes('central artisan kitchen'))).toBe(false);
    expect(gemTitles.some(t => t.includes('kusum sarovar') || t.includes('vishram ghat'))).toBe(true);
    expect(gemTitles.some(t => t.includes('horizon viewpoint'))).toBe(false);
  });

  it('never fabricates fake boarding pass PNRs or unknown landmarks when live vision is unavailable', async () => {
    const ticketFile = new File(['mock-bytes'], 'indigo_flight_ticket.jpg', { type: 'image/jpeg' });
    const ticketResult = await scanTravelImage(ticketFile);
    expect(ticketResult.type).toBe('unverified');

    const unknownFile = new File(['mock-bytes'], 'IMG_4092.jpg', { type: 'image/jpeg' });
    const unknownResult = await scanTravelImage(unknownFile);
    expect(unknownResult.type).toBe('unverified');
  });

  it('never falsely claims LIVE before Supabase Realtime actually subscribes', () => {
    const statuses: string[] = [];
    const unsub = subscribeToTripCollaboration('trip-local-check', () => {}, (s) => {
      statuses.push(s);
    });
    const initialStatus = statuses[0];
    unsub();
    expect(['CONNECTING', 'LOCAL_ONLY']).toContain(initialStatus);
    expect(statuses).not.toContain('LIVE');
  });

  it('narrates genuine custom landmark descriptions and fixes script typos', () => {
    const taj = generateLandmarkNarration('Taj Mahal', 'Agra');
    expect(taj).toContain('float weightless');
    expect(taj).not.toContain('floatweightless');

    const mathuraTemple = generateLandmarkNarration(
      'Shri Krishna Janmasthan',
      'Mathura',
      'Historic temple complex built around the sacred birthplace prison cell in central Mathura.'
    );
    expect(mathuraTemple).toContain('sacred birthplace prison cell');
    expect(mathuraTemple).not.toContain('most beloved cultural anchors');
  });
});
