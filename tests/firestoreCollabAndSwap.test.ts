import { describe, it, expect } from 'vitest';
import { deriveCollabRoomId, subscribeToFirestoreCollabRoom } from '../src/services/firestoreCollabService';

describe('Firestore Multiplayer Collaboration & Room Security', () => {
  it('derives deterministic 12..64 char URL-safe roomId compliant with firestore.rules', () => {
    const id1 = deriveCollabRoomId('trip-1795432231700');
    const id2 = deriveCollabRoomId('trip-1795432231700');
    const idShort = deriveCollabRoomId('t1');

    expect(id1).toBe(id2);
    expect(id1.length).toBeGreaterThanOrEqual(12);
    expect(id1.length).toBeLessThanOrEqual(64);
    expect(/^[A-Za-z0-9_-]+$/.test(id1)).toBe(true);

    expect(idShort.length).toBeGreaterThanOrEqual(12);
    expect(/^[A-Za-z0-9_-]+$/.test(idShort)).toBe(true);
  });

  it('never emits LIVE synchronously before Firestore handshake completes', () => {
    const statuses: string[] = [];
    const unsub = subscribeToFirestoreCollabRoom('trip-sync-test', {
      onStatus: (s) => statuses.push(s)
    });
    unsub();
    expect(statuses).not.toContain('LIVE');
  });
});
