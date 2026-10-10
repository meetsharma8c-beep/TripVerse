import { 
  Trip, 
  CollaborationSession, 
  TripCollaborator, 
  ActivityVote, 
  GroupSuggestion, 
  ItineraryActivity 
} from '../types/trip';

export type {
  CollaborationSession,
  TripCollaborator,
  ActivityVote,
  GroupSuggestion
};
import { AuthUser } from '../types/auth';
import { getSupabaseClient } from './supabase';
import { 
  saveCollaborationSessionToSupabase, 
  loadCollaborationSessionFromSupabase 
} from './supabaseSyncService';

const COLLAB_STORAGE_KEY_PREFIX = 'tripverse_collab_v1_';
const COLLAB_EVENT_KEY = 'tripverse_collaboration_update';

const AVATAR_COLORS = [
  '#2D5A3D', // Emerald
  '#0284c7', // Sky Blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#10b981', // Mint
  '#6366f1'  // Indigo
];

function getRandomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

/**
 * Generate 6-digit short room invite code (e.g. TRIP-8492)
 */
export function generateInviteCode(tripId: string): string {
  let hash = 0;
  for (let i = 0; i < tripId.length; i++) {
    hash = (hash << 5) - hash + tripId.charCodeAt(i);
    hash |= 0;
  }
  const num = Math.abs(hash) % 9000 + 1000;
  return `TRIP-${num}`;
}

/**
 * Get or initialize collaboration session for a trip
 */
export function getOrInitializeCollaborationSession(
  trip: Trip, 
  currentUser?: AuthUser | null
): CollaborationSession {
  // Check local cache first
  const cached = loadLocalSession(trip.id);
  if (cached) {
    return cached;
  }

  const ownerName = currentUser?.displayName || 'Trip Leader';
  const ownerAvatar = currentUser?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerName)}&backgroundColor=2D5A3D,0B2545`;
  const ownerId = currentUser?.uid || `user-owner-${Date.now()}`;

  const owner: TripCollaborator = {
    id: ownerId,
    name: ownerName,
    avatar: ownerAvatar,
    email: currentUser?.email || undefined,
    role: 'owner',
    color: '#2D5A3D',
    joinedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    isOnline: true
  };

  // Start cleanly with the trip owner only; real co-travelers join via invite code or explicit user add
  const initialCollaborators: TripCollaborator[] = [owner];

  const session: CollaborationSession = {
    tripId: trip.id,
    inviteCode: generateInviteCode(trip.id),
    collaborators: initialCollaborators,
    votes: {},
    suggestions: [],
    updatedAt: new Date().toISOString()
  };

  saveLocalSession(trip.id, session);
  syncToCloud(session).catch(() => {});
  return session;
}

/**
 * Load local session from localStorage
 */
function loadLocalSession(tripId: string): CollaborationSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${COLLAB_STORAGE_KEY_PREFIX}${tripId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Save session to localStorage and broadcast change event
 */
function saveLocalSession(tripId: string, session: CollaborationSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${COLLAB_STORAGE_KEY_PREFIX}${tripId}`, JSON.stringify(session));
    window.dispatchEvent(new CustomEvent(COLLAB_EVENT_KEY, { detail: session }));
  } catch {}
}

/**
 * Sync session to Supabase if configured
 */
async function syncToCloud(session: CollaborationSession): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await saveCollaborationSessionToSupabase(session);
    // Broadcast via Supabase Realtime channel for live peers
    const channel = supabase.channel(`collab:${session.tripId}`);
    channel.send({
      type: 'broadcast',
      event: 'collab_update',
      payload: session
    });
  } catch (e) {
    console.warn('[Supabase] Collaboration sync notice:', e);
  }
}

/**
 * Join trip collaboration by invite code or link
 */
export async function joinTripCollaboration(
  tripId: string, 
  user: AuthUser, 
  role: 'editor' | 'viewer' = 'editor'
): Promise<CollaborationSession> {
  let session = loadLocalSession(tripId);

  // Try fetching from Supabase if missing locally
  if (!session) {
    try {
      session = await loadCollaborationSessionFromSupabase(tripId);
    } catch {}
  }

  if (!session) {
    throw new Error('Trip collaboration room not found. Please verify the invite link or code.');
  }

  const existingIdx = session.collaborators.findIndex(c => c.id === user.uid || (user.email && c.email === user.email));
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    session.collaborators[existingIdx].isOnline = true;
    session.collaborators[existingIdx].lastActiveAt = now;
  } else {
    session.collaborators.push({
      id: user.uid,
      name: user.displayName || 'Travel Buddy',
      avatar: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'Buddy')}`,
      email: user.email || undefined,
      role,
      color: getRandomColor(),
      joinedAt: now,
      lastActiveAt: now,
      isOnline: true
    });
  }

  session.updatedAt = now;
  saveLocalSession(tripId, session);
  syncToCloud(session).catch(() => {});
  return session;
}

/**
 * Cast or toggle upvote/downvote on an itinerary activity
 */
export async function castActivityVote(
  tripId: string,
  activityId: string,
  vote: 'up' | 'down',
  user: AuthUser
): Promise<CollaborationSession> {
  const session = loadLocalSession(tripId);
  if (!session) {
    throw new Error('Collaboration session not found.');
  }

  const votesForActivity = session.votes[activityId] || [];
  const existingVoteIdx = votesForActivity.findIndex(v => v.userId === user.uid);
  const now = new Date().toISOString();

  if (existingVoteIdx >= 0) {
    if (votesForActivity[existingVoteIdx].vote === vote) {
      // Toggle off
      votesForActivity.splice(existingVoteIdx, 1);
    } else {
      // Switch vote
      votesForActivity[existingVoteIdx].vote = vote;
      votesForActivity[existingVoteIdx].timestamp = now;
    }
  } else {
    votesForActivity.push({
      activityId,
      userId: user.uid,
      userName: user.displayName || 'Traveler',
      vote,
      timestamp: now
    });
  }

  session.votes[activityId] = votesForActivity;
  session.updatedAt = now;
  saveLocalSession(tripId, session);
  syncToCloud(session).catch(() => {});
  return session;
}

/**
 * Get aggregated vote score for an activity
 */
export function getActivityVoteSummary(
  session: CollaborationSession | null, 
  activityId: string,
  currentUserId?: string
): { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null; isFavorite: boolean } {
  if (!session || !session.votes[activityId]) {
    return { upvotes: 0, downvotes: 0, userVote: null, isFavorite: false };
  }

  const votes = session.votes[activityId];
  let up = 0;
  let down = 0;
  let userVote: 'up' | 'down' | null = null;

  for (const v of votes) {
    if (v.vote === 'up') up++;
    if (v.vote === 'down') down++;
    if (currentUserId && v.userId === currentUserId) {
      userVote = v.vote;
    }
  }

  const isFavorite = up >= 2 && up > down;
  return { upvotes: up, downvotes: down, userVote, isFavorite };
}

/**
 * Propose a new group activity suggestion
 */
export async function addGroupSuggestion(
  tripId: string,
  user: AuthUser,
  suggestion: {
    title: string;
    description: string;
    dayNumber: number;
    category: 'food' | 'spot' | 'activity' | 'stay';
  }
): Promise<GroupSuggestion> {
  const session = loadLocalSession(tripId);
  if (!session) {
    throw new Error('Collaboration session not found.');
  }

  const newSuggestion: GroupSuggestion = {
    id: `sug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tripId,
    userId: user.uid,
    userName: user.displayName || 'Traveler',
    userAvatar: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'Traveler')}`,
    title: suggestion.title.trim(),
    description: suggestion.description.trim(),
    dayNumber: suggestion.dayNumber,
    category: suggestion.category,
    upvotes: [user.uid],
    downvotes: [],
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  session.suggestions.unshift(newSuggestion);
  session.updatedAt = new Date().toISOString();
  saveLocalSession(tripId, session);
  syncToCloud(session).catch(() => {});
  return newSuggestion;
}

/**
 * Vote on a group proposal/suggestion
 */
export async function voteOnSuggestion(
  tripId: string,
  suggestionId: string,
  userId: string,
  vote: 'up' | 'down'
): Promise<CollaborationSession> {
  const session = loadLocalSession(tripId);
  if (!session) throw new Error('Collaboration session not found.');

  const sug = session.suggestions.find(s => s.id === suggestionId);
  if (!sug) throw new Error('Suggestion not found.');

  sug.upvotes = sug.upvotes.filter(id => id !== userId);
  sug.downvotes = sug.downvotes.filter(id => id !== userId);

  if (vote === 'up') {
    sug.upvotes.push(userId);
  } else {
    sug.downvotes.push(userId);
  }

  session.updatedAt = new Date().toISOString();
  saveLocalSession(tripId, session);
  syncToCloud(session).catch(() => {});
  return session;
}

/**
 * Accept proposal and insert directly into trip day's activities
 */
export function acceptSuggestionIntoTrip(
  trip: Trip,
  suggestionId: string
): { updatedTrip: Trip; updatedSession: CollaborationSession; acceptedActivity: ItineraryActivity } {
  const session = loadLocalSession(trip.id);
  if (!session) throw new Error('Session not found.');

  const sug = session.suggestions.find(s => s.id === suggestionId);
  if (!sug) throw new Error('Suggestion not found.');

  sug.status = 'accepted';
  session.updatedAt = new Date().toISOString();
  saveLocalSession(trip.id, session);
  syncToCloud(session).catch(() => {});

  const newActivity: ItineraryActivity = {
    id: `act-sug-${Date.now()}`,
    dayNumber: sug.dayNumber,
    time: '17:30',
    title: sug.title,
    type: sug.category === 'food' ? 'food' : sug.category === 'stay' ? 'hotel' : 'attraction',
    location: trip.destination,
    estimatedCost: 500,
    travelTimeMin: 15,
    distanceKm: 4.5,
    description: `${sug.description} (Suggested by ${sug.userName})`,
    coordinates: trip.destinationDetails?.coordinates || { lat: 28.6139, lng: 77.2090 },
    tag: 'Group Voted',
    isCustom: true
  };

  const updatedItinerary = trip.itinerary.map(day => {
    if (day.dayNumber === sug.dayNumber) {
      return {
        ...day,
        activities: [...day.activities, newActivity]
      };
    }
    return day;
  });

  const updatedTrip: Trip = {
    ...trip,
    itinerary: updatedItinerary,
    collaboration: session
  };

  return { updatedTrip, updatedSession: session, acceptedActivity: newActivity };
}

/**
 * Real-time subscription to collaboration changes
 */
export function subscribeToTripCollaboration(
  tripId: string,
  callback: (session: CollaborationSession) => void
): () => void {
  // 1. Local CustomEvent listener
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<CollaborationSession>;
    if (custom.detail && custom.detail.tripId === tripId) {
      callback(custom.detail);
    }
  };
  window.addEventListener(COLLAB_EVENT_KEY, handleLocalEvent);

  // 2. Storage event listener for multi-tab live sync
  const handleStorage = (e: StorageEvent) => {
    if (e.key === `${COLLAB_STORAGE_KEY_PREFIX}${tripId}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorage);

  // 3. Supabase Realtime broadcast listener if configured
  let supabaseChannel: any = null;
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      supabaseChannel = supabase.channel(`collab:${tripId}`);
      supabaseChannel
        .on('broadcast', { event: 'collab_update' }, ({ payload }: any) => {
          if (payload && payload.tripId === tripId) {
            callback(payload as CollaborationSession);
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('[Supabase] Realtime collaboration subscription notice:', e);
    }
  }

  // Return unsubscribe cleaner
  return () => {
    window.removeEventListener(COLLAB_EVENT_KEY, handleLocalEvent);
    window.removeEventListener('storage', handleStorage);
    if (supabaseChannel && supabase) {
      supabase.removeChannel(supabaseChannel);
    }
  };
}
