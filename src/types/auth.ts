export type AuthProvider = 'email' | 'google' | 'phone' | 'guest' | 'supabase';
export type SubscriptionTier = 'free' | 'pro';

export interface UserSubscriptionQuota {
  tier: SubscriptionTier;
  isPro: boolean;
  freeTripsRemaining: number;
  freeTripsTotal: number;
  canCreateTrip: boolean;
  weeklyAssistantMinutesRemaining: number;
  weeklyAssistantMinutesTotal: number;
  weeklyQuotaHoursFormatted: string;
  subscriptionExpiresAt?: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  phoneNumber?: string;
  displayName: string;
  photoURL: string;
  travelerStyle: string;
  travelStyleTag: string;
  location: string;
  occupation: string;
  age: number;
  emailVerified: boolean;
  provider: AuthProvider;
  createdAt: string;
  lastLoginAt: string;
  savedPlaceIds?: string[];
  subscriptionTier?: SubscriptionTier;
  freeTripsRemaining?: number;
  subscriptionExpiresAt?: string;
  weeklyAssistantMinutesRemaining?: number;
  weeklyQuotaResetAt?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

export interface SignUpData {
  name: string;
  email: string;
  password: string;
  travelerStyle?: string;
  location?: string;
  occupation?: string;
}

export interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface GoogleCredentialPayload {
  iss?: string;
  sub: string;
  email: string;
  email_verified?: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface VerificationCodeRecord {
  email: string;
  code: string;
  purpose: 'signup' | 'password_reset';
  expiresAt: number;
}

export interface AuthError {
  code: string;
  message: string;
}
