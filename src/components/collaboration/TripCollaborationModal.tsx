import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Copy, 
  Check, 
  Share2, 
  ThumbsUp, 
  ThumbsDown, 
  Plus, 
  Sparkles, 
  ShieldCheck, 
  Crown, 
  Clock, 
  MapPin, 
  Utensils, 
  Flame, 
  MessageSquare,
  QrCode,
  ArrowRight,
  Send,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trip, CollaborationSession, TripCollaborator, GroupSuggestion } from '../../types/trip';
import { AuthUser } from '../../types/auth';
import { openExternalUrl } from '../../services/deviceService';
import { 
  getOrInitializeCollaborationSession,
  castActivityVote,
  getActivityVoteSummary,
  addGroupSuggestion,
  acceptSuggestionIntoTrip,
  subscribeToTripCollaboration 
} from '../../services/collaborationService';

interface TripCollaborationModalProps {
  isOpen: boolean;
  trip: Trip;
  currentUser: AuthUser | null;
  onClose: () => void;
  onTripUpdated: (updatedTrip: Trip) => void;
}

export const TripCollaborationModal: React.FC<TripCollaborationModalProps> = ({
  isOpen,
  trip,
  currentUser,
  onClose,
  onTripUpdated
}) => {
  const [session, setSession] = useState<CollaborationSession>(() => 
    getOrInitializeCollaborationSession(trip, currentUser)
  );
  const [activeTab, setActiveTab] = useState<'invite' | 'votes' | 'suggestions'>('invite');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // New Suggestion Form
  const [suggestTitle, setSuggestTitle] = useState('');
  const [suggestDesc, setSuggestDesc] = useState('');
  const [suggestDay, setSuggestDay] = useState(1);
  const [suggestCategory, setSuggestCategory] = useState<'food' | 'spot' | 'activity' | 'stay'>('food');
  const [isSubmittingSuggest, setIsSubmittingSuggest] = useState(false);

  // Real-time synchronization subscription
  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToTripCollaboration(trip.id, (updatedSession) => {
      setSession(updatedSession);
      onTripUpdated({
        ...trip,
        collaboration: updatedSession
      });
    });
    return () => unsub();
  }, [trip.id, isOpen]);

  if (!isOpen) return null;

  const currentUserId = currentUser?.uid || 'guest-user';
  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?collab=${session.inviteCode}&trip=${trip.id}`
    : `https://tripverse-pied.vercel.app/?collab=${session.inviteCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Join me in planning our trip to ${trip.destination} on TripVerse!\n\nUse Room Code: ${session.inviteCode}\nOr join directly with this link: ${inviteUrl}`
    );
    openExternalUrl(`https://api.whatsapp.com/send?text=${text}`);
  };

  const handleVote = async (activityId: string, vote: 'up' | 'down') => {
    const userToUse: AuthUser = currentUser || {
      uid: 'guest-explorer',
      email: 'explorer@tripverse.app',
      displayName: 'You (Explorer)',
      photoURL: 'https://api.dicebear.com/7.x/initials/svg?seed=You',
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Explorer',
      location: 'India',
      occupation: 'Explorer',
      age: 25,
      emailVerified: true,
      provider: 'guest',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    try {
      const updated = await castActivityVote(trip.id, activityId, vote, userToUse);
      setSession(updated);
      onTripUpdated({
        ...trip,
        collaboration: updated
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestTitle.trim()) return;

    setIsSubmittingSuggest(true);
    const userToUse: AuthUser = currentUser || {
      uid: 'guest-explorer',
      email: 'explorer@tripverse.app',
      displayName: 'You (Explorer)',
      photoURL: 'https://api.dicebear.com/7.x/initials/svg?seed=You',
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Explorer',
      location: 'India',
      occupation: 'Explorer',
      age: 25,
      emailVerified: true,
      provider: 'guest',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    try {
      await addGroupSuggestion(trip.id, userToUse, {
        title: suggestTitle,
        description: suggestDesc || 'Suggested activity for the group',
        dayNumber: suggestDay,
        category: suggestCategory
      });
      setSuggestTitle('');
      setSuggestDesc('');
      try {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      } catch {}
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingSuggest(false);
    }
  };

  const handleAcceptSuggestion = (suggestionId: string) => {
    try {
      const { updatedTrip, updatedSession } = acceptSuggestionIntoTrip(trip, suggestionId);
      setSession(updatedSession);
      onTripUpdated(updatedTrip);
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#2D5A3D] flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#0B2545]">Group Collaboration Hub</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {session.collaborators.length} Travelers
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-sm">
                Planning: <span className="font-semibold text-slate-700">{trip.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('invite')}
            className={`py-3.5 flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
              activeTab === 'invite'
                ? 'border-[#2D5A3D] text-[#0B2545] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>Invite & Friends</span>
          </button>

          <button
            onClick={() => setActiveTab('votes')}
            className={`py-3.5 flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
              activeTab === 'votes'
                ? 'border-[#2D5A3D] text-[#0B2545] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>Activity Polls</span>
          </button>

          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-3.5 flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
              activeTab === 'suggestions'
                ? 'border-[#2D5A3D] text-[#0B2545] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>Drop-In Ideas ({session.suggestions.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* ========================================================== */}
          {/* TAB 1: INVITE & COLLABORATORS                               */}
          {/* ========================================================== */}
          {activeTab === 'invite' && (
            <div className="space-y-6">
              
              {/* Room Code Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-sky-500/5 to-slate-50 border border-emerald-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Live Room Code
                    </span>
                    <h4 className="text-2xl font-black font-mono tracking-wider text-[#0B2545]">
                      {session.inviteCode}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Share this code or link with friends to plan this itinerary together.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopyCode}
                      className="px-3.5 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 transition-all"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-[#2D5A3D]" /> : <Copy className="w-4 h-4 text-emerald-700" />}
                      <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
                    </button>

                    <button
                      onClick={handleWhatsAppShare}
                      className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Invite Link Bar */}
                <div className="flex items-center gap-2 bg-white/90 p-1.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="flex-1 px-3 py-1.5 text-xs text-slate-600 bg-transparent font-mono outline-hidden select-all"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-lg bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              {/* Collaborator Member List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Trip Travelers ({session.collaborators.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Auto-syncs across devices
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {session.collaborators.map((c: TripCollaborator) => (
                    <div 
                      key={c.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between hover:border-emerald-300 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <img
                            src={c.avatar}
                            alt={c.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          {c.isOnline && (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#0B2545] truncate">{c.name}</span>
                            {c.role === 'owner' && (
                              <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {c.isOnline ? 'Active now' : 'Joined planner'}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide shrink-0 ${
                        c.role === 'owner'
                          ? 'bg-amber-100 text-amber-800'
                          : c.role === 'editor'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {c.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2: ACTIVITY POLLS & VOTES                              */}
          {/* ========================================================== */}
          {activeTab === 'votes' && (
            <div className="space-y-5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
                <ThumbsUp className="w-4 h-4 text-[#2D5A3D] shrink-0 mt-0.5" />
                <p>
                  Vote on activities with your travel buddies. Items with high group agreement get awarded the <strong className="text-[#0B2545]">Group Favorite</strong> badge!
                </p>
              </div>

              {trip.itinerary.map((day) => (
                <div key={day.dayNumber} className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#0B2545] text-white text-[11px] font-bold flex items-center justify-center">
                      D{day.dayNumber}
                    </span>
                    <h5 className="text-xs font-bold text-[#0B2545]">{day.title || `Day ${day.dayNumber}`}</h5>
                  </div>

                  <div className="space-y-2">
                    {day.activities.map((act) => {
                      const summary = getActivityVoteSummary(session, act.id, currentUserId);
                      return (
                        <div 
                          key={act.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            summary.isFavorite 
                              ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 truncate">{act.title}</span>
                              {summary.isFavorite && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  <Flame className="w-3 h-3 text-amber-600" />
                                  Group Favorite
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {act.time}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {act.location}
                              </span>
                            </div>
                          </div>

                          {/* Voting Action Pill */}
                          <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-xl">
                            <button
                              onClick={() => handleVote(act.id, 'up')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                summary.userVote === 'up'
                                  ? 'bg-[#2D5A3D] text-white shadow-2xs scale-105'
                                  : 'text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              <span>{summary.upvotes}</span>
                            </button>

                            <button
                              onClick={() => handleVote(act.id, 'down')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                summary.userVote === 'down'
                                  ? 'bg-rose-500 text-white shadow-2xs scale-105'
                                  : 'text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              <span>{summary.downvotes}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 3: DROP-IN SUGGESTIONS & PROPOSALS                     */}
          {/* ========================================================== */}
          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              
              {/* Proposal Submission Form */}
              <form onSubmit={handleCreateSuggestion} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    Propose a New Spot / Idea
                  </h4>
                  <span className="text-[11px] text-slate-400">Collaborators can upvote</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={suggestTitle}
                    onChange={(e) => setSuggestTitle(e.target.value)}
                    placeholder="e.g. Sunset drinks at Thalassa Cafe"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                    required
                  />

                  <div className="flex gap-2">
                    <select
                      value={suggestDay}
                      onChange={(e) => setSuggestDay(Number(e.target.value))}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                    >
                      {trip.itinerary.map(d => (
                        <option key={d.dayNumber} value={d.dayNumber}>
                          Day {d.dayNumber}
                        </option>
                      ))}
                    </select>

                    <select
                      value={suggestCategory}
                      onChange={(e) => setSuggestCategory(e.target.value as any)}
                      className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                    >
                      <option value="food">Food & Cafe</option>
                      <option value="spot">Spot / Viewpoint</option>
                      <option value="activity">Activity / Tour</option>
                      <option value="stay">Hotel / Stay</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={suggestDesc}
                    onChange={(e) => setSuggestDesc(e.target.value)}
                    placeholder="Why should the group go here? (optional)"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingSuggest || !suggestTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Drop Idea</span>
                  </button>
                </div>
              </form>

              {/* Suggestions Feed */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Group Ideas & Pitches ({session.suggestions.length})
                </h4>

                {session.suggestions.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-2xl">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs">No proposals yet. Drop the first idea above!</p>
                  </div>
                ) : (
                  session.suggestions.map((sug: GroupSuggestion) => {
                    const isAccepted = sug.status === 'accepted';
                    return (
                      <div
                        key={sug.id}
                        className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                          isAccepted 
                            ? 'bg-emerald-50/50 border-emerald-300' 
                            : 'bg-white border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={sug.userAvatar}
                              alt={sug.userName}
                              className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-[#0B2545]">{sug.title}</span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  Day {sug.dayNumber}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                Suggested by {sug.userName}
                              </span>
                            </div>
                          </div>

                          {isAccepted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-[#2D5A3D]" />
                              Added to Plan
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAcceptSuggestion(sug.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#2D5A3D]/10 hover:bg-[#2D5A3D]/20 text-[#2D5A3D] font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to Day {sug.dayNumber}</span>
                            </button>
                          )}
                        </div>

                        {sug.description && (
                          <p className="text-xs text-slate-600 pl-9">
                            {sug.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
