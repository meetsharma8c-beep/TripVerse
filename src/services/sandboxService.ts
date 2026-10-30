import { toDeterministicUuid } from '../utils/uuid';
import { AuthUser } from '../types/auth';
import { UserProfile } from '../types/trip';
import { syncAccountToLocal, toUserProfile } from './authService';
import { saveProfileToSupabase } from './supabaseSyncService';

export const SANDBOX_STORAGE_KEY = 'tripverse_sandbox_enabled';
export const SANDBOX_TEST_CODE = '123456';

export interface SandboxPersona {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  avatar: string;
  travelerStyle: string;
  travelStyleTag: string;
  location: string;
  occupation: string;
  bio: string;
  savedPlaceIds?: string[];
  tripsCount?: number;
}

export const SANDBOX_PERSONAS: SandboxPersona[] = [
  {
    id: 'aarav_sharma',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@demo.tripverse.ai',
    phoneNumber: '+91 98765 43210',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    travelerStyle: 'Road Explorer',
    travelStyleTag: 'Road & Adventure Enthusiast',
    location: 'Mumbai, India',
    occupation: 'Photographer & Explorer',
    bio: 'Chasing scenic highways, coastal road trips, and offbeat mountain passes.',
    savedPlaceIds: ['goa-colva', 'ladakh-pangong', 'manali-solang'],
    tripsCount: 4
  },
  {
    id: 'riya_patel',
    name: 'Riya Patel',
    email: 'riya.patel@demo.tripverse.ai',
    phoneNumber: '+91 98123 45678',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    travelerStyle: 'Luxury & Heritage',
    travelStyleTag: 'Boutique Stays & Culture',
    location: 'Ahmedabad, India',
    occupation: 'Architectural Designer',
    bio: 'Passionate about heritage architecture, royal havelis, and boutique stays.',
    savedPlaceIds: ['jaipur-amber', 'udaipur-city-palace', 'kerala-backwaters'],
    tripsCount: 6
  },
  {
    id: 'marcus_vance',
    name: 'Marcus Vance',
    email: 'marcus.vance@demo.tripverse.ai',
    phoneNumber: '+1 415 555 2671',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    travelerStyle: 'Solo Backpacker',
    travelStyleTag: 'Global Digital Nomad',
    location: 'San Francisco, USA',
    occupation: 'Remote Software Engineer',
    bio: 'Exploring Asia while working remotely. Coffee, trails, and cultural immersions.',
    savedPlaceIds: ['bali-ubud', 'tokyo-shinjuku', 'hanoi-old-quarter'],
    tripsCount: 8
  }
];

/**
 * Check if Sandbox Mode is currently active
 * Evaluates localStorage preference or ?sandbox=true / ?demo=1 query parameter
 */
export function isSandboxMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sandbox') === 'true' || params.get('demo') === '1') {
      return true;
    }
    return localStorage.getItem(SANDBOX_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggle Sandbox Mode on or off
 */
export function setSandboxMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      localStorage.setItem(SANDBOX_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(SANDBOX_STORAGE_KEY);
    }
  } catch {}
}

/**
 * Check if a code matches the sandbox verification code (123456 or 990471)
 */
export function isSandboxVerificationCode(code: string): boolean {
  const clean = code.trim();
  return clean === SANDBOX_TEST_CODE || clean === '990471';
}

/**
 * Authenticate directly as a pre-loaded Sandbox Persona
 */
export async function authenticateSandboxPersona(persona: SandboxPersona): Promise<AuthUser> {
  const uid = toDeterministicUuid(`sandbox:${persona.id}`);
  const now = new Date().toISOString();

  const authUser: AuthUser = {
    uid,
    email: persona.email,
    displayName: persona.name,
    photoURL: persona.avatar,
    travelerStyle: persona.travelerStyle,
    travelStyleTag: persona.travelStyleTag,
    location: persona.location,
    occupation: persona.occupation,
    age: 26,
    emailVerified: true,
    provider: 'phone',
    createdAt: now,
    lastLoginAt: now,
    savedPlaceIds: persona.savedPlaceIds || []
  };

  syncAccountToLocal(authUser);
  saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});

  return authUser;
}

/**
 * Verify a sandbox phone or email authentication attempt
 */
export function createSandboxAuthUser(params: {
  identifier: string;
  type: 'phone' | 'email';
  name?: string;
  travelerStyle?: string;
  location?: string;
}): AuthUser {
  const prefix = params.type === 'phone' ? 'phone:' : 'email:';
  const cleanId = params.identifier.trim().toLowerCase();
  const uid = toDeterministicUuid(`sandbox:${prefix}${cleanId}`);
  const now = new Date().toISOString();
  const displayName = params.name?.trim() || cleanId.split('@')[0] || 'Sandbox Explorer';

  const authUser: AuthUser = {
    uid,
    email: params.type === 'email' ? cleanId : '',
    displayName,
    photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=2D5A3D,0B2545`,
    travelerStyle: params.travelerStyle || 'Road Explorer',
    travelStyleTag: 'Sandbox Explorer',
    location: params.location || 'India',
    occupation: 'Explorer',
    age: 25,
    emailVerified: true,
    provider: params.type,
    createdAt: now,
    lastLoginAt: now,
    savedPlaceIds: []
  };

  syncAccountToLocal(authUser);
  saveProfileToSupabase(authUser.uid, toUserProfile(authUser)).catch(() => {});

  return authUser;
}
