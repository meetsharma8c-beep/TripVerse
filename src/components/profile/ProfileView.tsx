import React, { useState, useEffect } from 'react';
import { UserProfile, Trip } from '../../types/trip';
import { getStoredCurrency, formatCurrency, Currency } from '../../services/currencyService';
import { 
  User, 
  MapPin, 
  Briefcase, 
  Mail, 
  Phone,
  Sparkles, 
  Check, 
  RotateCcw,
  Edit3, 
  ShieldCheck, 
  Compass,
  LogOut,
  Users,
  X,
  Image as ImageIcon,
  Bell,
  Lock,
  FileText,
  MessageSquare,
  ChevronRight,
  Crown,
  CheckCircle2,
  Radio,
  Zap
} from 'lucide-react';
import { DigitalPassport } from './DigitalPassport';
import { loadUserVisitedStates, resetGuestStorage } from '../../services/storageService';
import { 
  getCurrentUser, 
  signOut as authSignOut, 
  getSavedAccounts, 
  switchAccount, 
  updateAuthProfile, 
  toUserProfile,
  getUserSubscriptionQuota
} from '../../services/authService';
import { AuthUser } from '../../types/auth';
import { TripVerseProModal } from '../subscription/TripVerseProModal';

interface ProfileViewProps {
  userProfile: UserProfile;
  trips?: Trip[];
  currentUser?: AuthUser | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onOpenAuthModal: () => void;
  onReplayTour?: () => void;
  onSignOut?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
  onOpenLegal?: (tab: 'privacy' | 'terms' | 'advisory' | 'feedback') => void;
}

const AVATAR_PRESETS = [
  '/default-avatar.svg',
  '/avatars/mountains.svg',
  '/avatars/coastal.svg',
  '/avatars/roadtripper.svg',
  '/avatars/navigator.svg'
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  userProfile,
  trips = [],
  currentUser: propCurrentUser,
  onUpdateProfile,
  onOpenAuthModal,
  onReplayTour,
  onSignOut,
  onOpenNotifications,
  unreadNotificationCount = 0,
  onOpenLegal
}) => {
  const [currency, setCurrency] = useState<Currency>(getStoredCurrency());
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [activeBadgesCount, setActiveBadgesCount] = useState<number>(0);
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  const [authUser, setAuthUser] = useState<AuthUser | null>(() => propCurrentUser ?? getCurrentUser());

  useEffect(() => {
    if (propCurrentUser !== undefined) {
      setAuthUser(propCurrentUser);
    }
  }, [propCurrentUser]);

  useEffect(() => {
    const handleAuthChange = () => {
      setAuthUser(getCurrentUser());
    };
    window.addEventListener('tripverse_auth_state_change', handleAuthChange);
    window.addEventListener('tripverse_quota_updated', handleAuthChange);
    return () => {
      window.removeEventListener('tripverse_auth_state_change', handleAuthChange);
      window.removeEventListener('tripverse_quota_updated', handleAuthChange);
    };
  }, []);

  const currentUser = authUser;
  const quota = getUserSubscriptionQuota(currentUser);
  const savedAccounts = getSavedAccounts();

  // Dynamic calculations for user stats (only user-planned trips count towards personal profile stats)
  const userCreatedTrips = (trips || []).filter(t => t.isUserCreated);
  const tripsCount = userCreatedTrips.length;

  const highwayKms = userCreatedTrips.length > 0
    ? userCreatedTrips.reduce((sum, trip) => {
        if (trip.routeDetails?.distanceKm) return sum + trip.routeDetails.distanceKm;
        if (trip.breakStops && trip.breakStops.length > 0) {
          const maxDistance = Math.max(...trip.breakStops.map(b => b.distanceFromStartKm || 0));
          if (maxDistance > 0) return sum + maxDistance;
        }
        return sum + 260;
      }, 0)
    : 0;

  useEffect(() => {
    const updateBadges = (e?: any) => {
      try {
        const states: string[] = Array.isArray(e?.detail) ? e.detail : loadUserVisitedStates(currentUser?.uid);
        let count = 0;
        if (states.some(s => ['HP', 'UK', 'LA'].includes(s))) count++;
        if (['GA', 'KL', 'MH', 'TN', 'PY'].filter(s => states.includes(s)).length >= 2) count++;
        if (states.some(s => ['RJ', 'MP'].includes(s))) count++;
        if (states.length >= 3) count++;
        if (states.length >= 5) count++;
        if (states.length > 0) count++;
        setActiveBadgesCount(count);
        return;
      } catch {}
      setActiveBadgesCount(0);
    };

    updateBadges();
    window.addEventListener('tripverse_visited_states_change', updateBadges);
    return () => window.removeEventListener('tripverse_visited_states_change', updateBadges);
  }, [currentUser]);

  useEffect(() => {
    setFormData(userProfile);
  }, [userProfile]);

  useEffect(() => {
    const handleCurrency = () => setCurrency(getStoredCurrency());
    window.addEventListener('tripverse_currency_change', handleCurrency);
    return () => window.removeEventListener('tripverse_currency_change', handleCurrency);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentUser) {
        const updatedAuth = await updateAuthProfile({
          displayName: formData.name,
          location: formData.location,
          occupation: formData.occupation,
          age: formData.age,
          travelerStyle: formData.travelerStyle,
          travelStyleTag: formData.travelStyleTag,
          photoURL: formData.avatar
        });
        onUpdateProfile(toUserProfile(updatedAuth));
      } else {
        onUpdateProfile(formData);
      }
      setIsEditing(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  const handleSignOut = () => {
    if (confirm('Are you sure you want to sign out of your TripVerse account?')) {
      authSignOut();
      if (onSignOut) {
        onSignOut();
      }
    }
  };

  const handleResetGuestData = () => {
    if (confirm('Reset guest preferences and reload fresh session?')) {
      resetGuestStorage();
      window.location.reload();
    }
  };

  const handleSwitchAccount = async (uid: string) => {
    try {
      const switched = await switchAccount(uid);
      onUpdateProfile(toUserProfile(switched));
      setShowSwitchModal(false);
    } catch (err) {
      console.error('Failed to switch account:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          
          {/* Avatar with verified status ring */}
          <div className="relative group">
            <img
              src={currentUser ? (userProfile.avatar || '/default-avatar.svg') : '/default-avatar.svg'}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/default-avatar.svg';
              }}
              alt={currentUser ? (userProfile.name || 'Traveler Profile') : 'Guest Explorer'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-emerald-500/20 shadow-md transition-transform group-hover:scale-105"
            />
            {currentUser && (
              <div className="absolute -bottom-1 -right-1 p-1.5 bg-[#2D5A3D] rounded-xl text-white shadow-xs" title="Verified Explorer Profile">
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Profile Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-2xl sm:text-3xl font-display font-black text-[#0B2545] tracking-tight">
                    {currentUser 
                      ? (currentUser.displayName || userProfile.name || 'Traveler Explorer') 
                      : 'Guest Explorer'}
                  </h1>
                  {currentUser?.provider === 'google' ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <span>Google Verified</span>
                    </span>
                  ) : currentUser?.provider === 'phone' || (currentUser?.phoneNumber && !currentUser?.email) ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>Phone Verified</span>
                    </span>
                  ) : (currentUser?.provider === 'email' || currentUser?.provider === 'supabase' || currentUser?.email) ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Mail className="w-3 h-3 text-emerald-600" />
                      <span>Email Verified</span>
                    </span>
                  ) : currentUser ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Explorer Verified</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider">
                      Guest Mode
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#2D5A3D]">
                  {currentUser ? (userProfile.travelStyleTag || 'Verified Explorer') : 'Guest Explorer'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 justify-center sm:justify-end flex-wrap">
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8EFE7] hover:bg-[#dce7db] text-[#2D5A3D] font-semibold text-xs border border-[#8EA78D]/30 transition-colors cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                </button>

                {savedAccounts.length > 1 && (
                  <button
                    onClick={() => setShowSwitchModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAF7] text-[#152A1C] border border-[#E2EBE1] font-semibold text-xs transition-colors cursor-pointer"
                    title="Switch between saved accounts"
                  >
                    <Users className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Switch</span>
                  </button>
                )}

                {onOpenNotifications && (
                  <button
                    onClick={onOpenNotifications}
                    className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F8FAF7] text-[#152A1C] border border-[#E2EBE1] font-semibold text-xs transition-colors cursor-pointer"
                    title="Reminders & Notifications"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Reminders</span>
                    {unreadNotificationCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </button>
                )}

                {onReplayTour && (
                  <button
                    onClick={onReplayTour}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8EFE7] hover:bg-[#dce7db] text-[#2D5A3D] font-semibold text-xs border border-[#8EA78D]/30 transition-colors cursor-pointer"
                    title="Take First-Time Interactive Tour"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>App Tour</span>
                  </button>
                )}

                {currentUser ? (
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenAuthModal}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                    title="Sign In or Register"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign In / Register</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-600 pt-1 font-sans">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser ? (userProfile.location || 'India') : 'India'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>{currentUser ? `${userProfile.occupation || 'Explorer'} ${userProfile.age ? `(Age ${userProfile.age})` : ''}` : 'Guest Session'}</span>
              </span>
              {currentUser?.email && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentUser.email}</span>
                  </span>
                </>
              )}
              {currentUser?.phoneNumber && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{currentUser.phoneNumber}</span>
                  </span>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-slate-100 text-center">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 min-w-0">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Trips Planned</span>
            <span className="text-xl sm:text-2xl font-serif font-bold text-slate-900">{tripsCount}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 min-w-0">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Highway Kms</span>
            <span className="text-xl sm:text-2xl font-serif font-bold text-[#2D5A3D]">
              {highwayKms > 0 ? `${highwayKms.toLocaleString()} km` : '0 km'}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 min-w-0">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Passport Badges</span>
            <span className="text-xl sm:text-2xl font-serif font-bold text-amber-500">
              {activeBadgesCount > 0 ? `${activeBadgesCount} Active` : '0 Active'}
            </span>
          </div>
        </div>

        {/* Subscription & Quota Card (Luxury Pass Aesthetic) */}
        {quota.isPro ? (
          <div className="mt-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#0C1A14] via-[#152F22] to-[#1F4431] text-white border border-amber-400/40 shadow-xl shadow-emerald-950/25 relative overflow-hidden">
            {/* Ambient Lighting Orbs */}
            <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

            <div className="relative z-1 flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-[0_0_20px_rgba(245,158,11,0.35)] shrink-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-[14px] bg-[#0E1E16] flex items-center justify-center">
                    <Crown className="w-7 h-7 text-amber-400 fill-amber-400" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h3 className="font-display font-black text-lg text-white tracking-tight">
                      TripVerse Pro Member
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>VIP ALL-ACCESS</span>
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 mt-1 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                    <span className="font-semibold text-white">Unlimited Trips</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-amber-300 font-bold">
                      <Zap className="w-3 h-3" />
                      30h/Week AI Facility Active
                    </span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs backdrop-blur-xs transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Manage Membership</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-50 via-emerald-50/40 to-amber-50/25 dark:from-[#0c1611] dark:via-[#13241b] dark:to-[#171f1a] border border-slate-200/90 dark:border-emerald-500/20 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-start gap-4 text-center sm:text-left w-full sm:w-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#E8EFE7] dark:bg-[#1A2E22] border border-[#2D5A3D]/20 dark:border-emerald-500/30 text-[#2D5A3D] dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-2xs mx-auto sm:mx-0">
                  <Compass className="w-6 h-6" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h4 className="font-display font-black text-base text-[#0B2545] dark:text-white">
                      Free Explorer Pass
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/80 text-[10px] font-black uppercase tracking-wider">
                      {quota.freeTripsRemaining}/3 FREE TRIPS LEFT
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Includes 3 free AI trip plans. Upgrade to Pro for unlimited trips and full 30h/week AI capacity.
                  </p>

                  {/* 3-Step Milestone Beads */}
                  <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                    {[1, 2, 3].map((stepNum) => {
                      const isUsed = (quota.freeTripsTotal - quota.freeTripsRemaining) >= stepNum;
                      return (
                        <div 
                          key={stepNum}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            isUsed 
                              ? 'bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 shadow-2xs'
                          }`}
                        >
                          {isUsed ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <span className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[8px] font-black">
                              {stepNum}
                            </span>
                          )}
                          <span>Trip {stepNum}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsProModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-[#2D5A3D] to-[#1E3E2A] hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-emerald-900/15 hover:shadow-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <Crown className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>Upgrade to Pro (30h/Wk)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Guest Mode Cloud Sync Prompt */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="w-11 h-11 rounded-2xl bg-white border border-[#8EA78D] text-[#2D5A3D] flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-950">Save Your Journeys to Cloud</h4>
              <p className="text-xs text-emerald-800">
                You're in Guest Mode. Sign in with Google or Email to link itineraries and access them across all your devices.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAuthModal}
            className="px-5 py-2.5 rounded-2xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Profile changes saved and synchronized to your account!</span>
        </div>
      )}

      {/* Edit Form */}
      {isEditing ? (
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-[#0B2545] text-lg">Edit Personal Profile & Persona</h3>
            <span className="text-xs text-slate-400">
              {currentUser ? 'Authenticated Account' : 'Guest Session (Local Only)'}
            </span>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Choose Profile Avatar</span>
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar: preset })}
                  className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex-shrink-0 ${
                    formData.avatar === preset
                      ? 'border-[#2D5A3D] ring-2 ring-[#2D5A3D]/30 scale-105'
                      : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={preset} alt="preset" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <input
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              placeholder="Or paste custom image URL"
              className="mt-2 w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 text-slate-500 cursor-not-allowed"
                title="Email is locked to your authenticated login"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Occupation & Age</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="Occupation"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                />
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 25 })}
                  placeholder="Age"
                  className="w-20 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Travel Persona Tag</label>
              <input
                type="text"
                value={formData.travelStyleTag}
                onChange={(e) => setFormData({ ...formData, travelStyleTag: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Food Preference</label>
              <select
                value={formData.foodPreference}
                onChange={(e) => setFormData({ ...formData, foodPreference: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
              >
                <option value="Pure Vegetarian / Local Delicacies">Pure Vegetarian / Local Delicacies</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Vegan / Organic">Vegan / Organic</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-trip-gradient text-white font-bold text-xs shadow-xs cursor-pointer active:scale-98"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D5A3D]">Smart Preferences</span>
              <h3 className="text-lg font-bold text-[#0B2545]">AI Personalization Engine</h3>
            </div>
            <span className="text-xs text-slate-400 font-semibold">Active Learning: ON</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Default Budget Mode</span>
              <p className="text-xs font-bold text-slate-800">{userProfile.budgetPreference}</p>
              <p className="text-[11px] text-slate-500">
                AI auto-allocates ~{formatCurrency(2500, currency)}/day per traveler
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Cuisine & Diet</span>
              <p className="text-xs font-bold text-slate-800">{userProfile.foodPreference}</p>
              <p className="text-[11px] text-slate-500">Filters 100% verified pure veg kitchens</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Accommodation Vibe</span>
              <p className="text-xs font-bold text-slate-800">{userProfile.accommodationPreference}</p>
              <p className="text-[11px] text-slate-500">Prioritizes scenic lake-facing rooftop havelis</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-start gap-3 text-xs text-slate-700">
            <Sparkles className="w-4 h-4 text-[#2D5A3D] flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Personalized Recommendation Rule:</strong> Because you frequently choose budget havelis and road trips from Ahmedabad, TripVerse prioritizes NH-48 rest stops with top 5-star washroom ratings and cost-effective group room packages.
            </p>
          </div>
        </div>
      )}

      {/* Switch Account Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-sm">Switch Explorer Account</h4>
              <button onClick={() => setShowSwitchModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {savedAccounts.map(account => (
                <button
                  key={account.uid}
                  onClick={() => handleSwitchAccount(account.uid)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                    currentUser?.uid === account.uid
                      ? 'border-[#2D5A3D] bg-emerald-50/70'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <img src={account.photoURL} alt={account.displayName} className="w-9 h-9 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{account.displayName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{account.email || account.phoneNumber || 'Phone Account'}</p>
                  </div>
                  {currentUser?.uid === account.uid && (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowSwitchModal(false);
                onOpenAuthModal();
              }}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs transition-colors"
            >
              + Add Another Account
            </button>
          </div>
        </div>
      )}

      {/* Digital Travel Passport & State Badges */}
      <DigitalPassport />

      {/* Trust, Legal & Feedback Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2D5A3D]" />
            <h4 className="font-bold text-sm text-[#0B2545]">Trust, Privacy & Feedback</h4>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">TripVerse Core</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => onOpenLegal && onOpenLegal('privacy')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 flex items-center justify-between transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-[#2D5A3D]">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Privacy Policy</p>
                <p className="text-[11px] text-slate-500">Local encryption & zero ad trackers</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2D5A3D]" />
          </button>

          <button
            onClick={() => onOpenLegal && onOpenLegal('terms')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 flex items-center justify-between transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-[#2D5A3D]">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Terms of Service</p>
                <p className="text-[11px] text-slate-500">Platform guidelines & fair travel</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2D5A3D]" />
          </button>

          <button
            onClick={() => onOpenLegal && onOpenLegal('advisory')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/80 hover:border-amber-300 flex items-center justify-between transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-amber-600">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 group-hover:text-amber-900">AI Travel Advisory</p>
                <p className="text-[11px] text-slate-500">Highway weather & mountain pass safety</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600" />
          </button>

          <button
            onClick={() => onOpenLegal && onOpenLegal('feedback')}
            className="p-3.5 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/80 hover:border-emerald-300 flex items-center justify-between transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-[#2D5A3D]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950">Send Traveler Feedback</p>
                <p className="text-[11px] text-emerald-700">Suggest spots or report road bugs</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#2D5A3D]" />
          </button>
        </div>
      </div>

      {/* Account Session & Security Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center sm:text-left">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            currentUser ? 'bg-emerald-50 text-[#2D5A3D] border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            <User className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {currentUser 
                ? `Signed in as ${currentUser.email || currentUser.displayName || 'Verified Traveler'}`
                : 'Guest Session Active'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser 
                ? 'Your journeys and preferences are synced with the cloud.'
                : 'You are browsing anonymously. Sign in to sync across devices.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end">
          {currentUser ? (
            <button
              onClick={handleSignOut}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleResetGuestData}
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                title="Reset local guest cache and start afresh"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Guest Session</span>
              </button>
              <button
                onClick={onOpenAuthModal}
                className="px-5 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <User className="w-4 h-4" />
                <span>Sign In / Register</span>
              </button>
            </>
          )}
        </div>
      </div>

      <TripVerseProModal
        isOpen={isProModalOpen}
        currentUser={currentUser}
        onClose={() => setIsProModalOpen(false)}
        onSubscribed={() => {
          setAuthUser(getCurrentUser());
        }}
      />

    </div>
  );
};
