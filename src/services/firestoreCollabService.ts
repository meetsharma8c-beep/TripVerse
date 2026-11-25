import { CollaborationSession, ExpenseItem } from '../types/trip';
import { getStoredFirebaseConfig } from './firebase';
import { getFirestoreVaultSession } from './supabaseSyncService';
import { loadTripExpenses } from './storageService';

export interface FirestoreCollabSnapshot {
  roomId: string;
  ownerUid: string;
  tripId: string;
  inviteCode: string;
  memberUids: string[];
  session: CollaborationSession;
  expenses: ExpenseItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Produces a deterministic 16..48 char URL-safe roomId matching ^[A-Za-z0-9_-]+$
 */
export function deriveCollabRoomId(tripId: string): string {
  const cleaned = String(tripId || 'trip').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 36);
  let hash = 2166136261;
  const src = String(tripId || 'trip');
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = (hash >>> 0).toString(36).padStart(7, '0');
  const candidate = `tvc_${cleaned}_${suffix}`;
  return candidate.length >= 12 ? candidate.slice(0, 60) : candidate.padEnd(16, '0');
}

function parseFirestoreDoc(roomId: string, doc: any): FirestoreCollabSnapshot | null {
  const f = doc?.fields;
  if (!f) return null;
  try {
    const ownerUid = f.ownerUid?.stringValue || '';
    const tripId = f.tripId?.stringValue || '';
    const inviteCode = f.inviteCode?.stringValue || 'TRIP-1000';
    const memberValues = f.memberUids?.arrayValue?.values || [];
    const memberUids = memberValues
      .map((v: any) => v?.stringValue)
      .filter((s: any): s is string => typeof s === 'string' && s.length > 0);
    const session = JSON.parse(f.sessionJson?.stringValue || 'null') as CollaborationSession | null;
    const expenses = JSON.parse(f.expensesJson?.stringValue || '[]') as ExpenseItem[];
    if (!ownerUid || !tripId || !session) return null;
    return {
      roomId,
      ownerUid,
      tripId,
      inviteCode,
      memberUids,
      session,
      expenses: Array.isArray(expenses) ? expenses : [],
      createdAt: f.createdAt?.stringValue || new Date().toISOString(),
      updatedAt: f.updatedAt?.stringValue || new Date().toISOString()
    };
  } catch {
    return null;
  }
}

export async function pullCollabRoomFromFirestore(tripId: string): Promise<FirestoreCollabSnapshot | null> {
  const fbConfig = getStoredFirebaseConfig();
  if (!fbConfig?.apiKey || !fbConfig?.projectId || typeof fetch !== 'function') return null;

  try {
    const vault = await getFirestoreVaultSession();
    if (!vault?.idToken) return null;
    const roomId = deriveCollabRoomId(tripId);
    const url = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/collab_rooms/${encodeURIComponent(roomId)}?key=${fbConfig.apiKey}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${vault.idToken}` }
    });
    if (!res.ok) return null;
    const raw = await res.json().catch(() => null);
    return parseFirestoreDoc(roomId, raw);
  } catch {
    return null;
  }
}

export async function pushCollabRoomToFirestore(params: {
  tripId: string;
  session?: CollaborationSession;
  expenses?: ExpenseItem[];
  inviteCode?: string;
}): Promise<boolean> {
  const fbConfig = getStoredFirebaseConfig();
  if (!fbConfig?.apiKey || !fbConfig?.projectId || typeof fetch !== 'function') return false;

  try {
    const vault = await getFirestoreVaultSession();
    if (!vault?.idToken || !vault?.localId) return false;

    const roomId = deriveCollabRoomId(params.tripId);
    const docUrl = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/collab_rooms/${encodeURIComponent(roomId)}?key=${fbConfig.apiKey}`;

    // Read existing doc first to preserve immutable fields & memberUids
    let existing: FirestoreCollabSnapshot | null = null;
    const getRes = await fetch(docUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${vault.idToken}` }
    });
    if (getRes.ok) {
      existing = parseFirestoreDoc(roomId, await getRes.json().catch(() => null));
    } else if (getRes.status !== 404) {
      return false;
    }

    const now = new Date().toISOString();
    const ownerUid = existing ? existing.ownerUid : vault.localId;
    const createdAt = existing ? existing.createdAt : now;
    const tripIdVal = existing ? existing.tripId : String(params.tripId).slice(0, 128);
    const inviteCode = existing
      ? existing.inviteCode
      : String(params.inviteCode || params.session?.inviteCode || 'TRIP-1000').slice(0, 32);

    const memberSet = new Set<string>(existing ? existing.memberUids : [ownerUid]);
    if (!memberSet.has(vault.localId) && memberSet.size < 20) {
      memberSet.add(vault.localId);
    }
    const memberUids = Array.from(memberSet).slice(0, 20);

    const mergedSession: CollaborationSession = params.session || existing?.session || {
      tripId: tripIdVal,
      inviteCode,
      collaborators: [],
      votes: {},
      suggestions: [],
      updatedAt: now
    };
    const mergedExpenses: ExpenseItem[] = params.expenses ?? existing?.expenses ?? loadTripExpenses(params.tripId) ?? [];

    const sessionJson = JSON.stringify(mergedSession);
    const expensesJson = JSON.stringify(mergedExpenses);
    if (sessionJson.length > 295_000 || expensesJson.length > 195_000) return false;

    const patchRes = await fetch(docUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vault.idToken}`
      },
      body: JSON.stringify({
        fields: {
          ownerUid: { stringValue: ownerUid },
          tripId: { stringValue: tripIdVal },
          inviteCode: { stringValue: inviteCode },
          memberUids: {
            arrayValue: {
              values: memberUids.map((uid) => ({ stringValue: uid }))
            }
          },
          sessionJson: { stringValue: sessionJson },
          expensesJson: { stringValue: expensesJson },
          createdAt: { stringValue: createdAt },
          updatedAt: { stringValue: now }
        }
      })
    });

    return patchRes.ok;
  } catch {
    return false;
  }
}

/**
 * Subscribes to live Firestore room updates (collaborators, votes, suggestions, and split expenses).
 * Never emits 'LIVE' synchronously before an authenticated Firestore check completes.
 */
export function subscribeToFirestoreCollabRoom(
  tripId: string,
  callbacks: {
    onSession?: (session: CollaborationSession) => void;
    onExpenses?: (expenses: ExpenseItem[]) => void;
    onStatus?: (status: 'CONNECTING' | 'LIVE' | 'LOCAL_ONLY' | 'DISCONNECTED') => void;
  },
  pollIntervalMs = 4_500
): () => void {
  const fbConfig = getStoredFirebaseConfig();
  if (!fbConfig?.apiKey || !fbConfig?.projectId || typeof window === 'undefined') {
    callbacks.onStatus?.('LOCAL_ONLY');
    return () => {};
  }

  let cancelled = false;
  let lastUpdatedAt = '';
  callbacks.onStatus?.('CONNECTING');

  const pollOnce = async () => {
    if (cancelled) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      const vault = await getFirestoreVaultSession();
      if (cancelled) return;
      if (!vault?.idToken) {
        callbacks.onStatus?.('LOCAL_ONLY');
        return;
      }
      const roomId = deriveCollabRoomId(tripId);
      const url = `https://firestore.googleapis.com/v1/projects/${fbConfig.projectId}/databases/(default)/documents/collab_rooms/${encodeURIComponent(roomId)}?key=${fbConfig.apiKey}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${vault.idToken}` }
      });
      if (cancelled) return;

      if (res.status === 404) {
        // Room can be created on first edit; connection to Firestore is genuinely live
        callbacks.onStatus?.('LIVE');
        return;
      }
      if (!res.ok) {
        callbacks.onStatus?.('LOCAL_ONLY');
        return;
      }

      callbacks.onStatus?.('LIVE');
      const snap = parseFirestoreDoc(roomId, await res.json().catch(() => null));
      if (!snap || cancelled) return;

      if (snap.updatedAt && snap.updatedAt !== lastUpdatedAt) {
        lastUpdatedAt = snap.updatedAt;
        callbacks.onSession?.(snap.session);
        callbacks.onExpenses?.(snap.expenses);
      }
    } catch {
      if (!cancelled) callbacks.onStatus?.('DISCONNECTED');
    }
  };

  // Start async check on next tick so immediate unsubscribe in tests cancels cleanly
  const initialTimer = setTimeout(() => {
    pollOnce();
  }, 60);
  const intervalId = setInterval(pollOnce, pollIntervalMs);

  return () => {
    cancelled = true;
    clearTimeout(initialTimer);
    clearInterval(intervalId);
  };
}
