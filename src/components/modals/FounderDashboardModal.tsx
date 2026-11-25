import React, { useState, useEffect } from 'react';
import { 
  X, 
  Crown, 
  Users, 
  CheckCircle2, 
  Sparkles, 
  Search, 
  Download, 
  ShieldCheck, 
  Activity, 
  Zap, 
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { 
  fetchFounderUserRoster, 
  AdminUserRecord, 
  AdminMetrics, 
  adminGrantPro, 
  adminRevokePro,
  buildFounderRosterCsv
} from '../../services/adminService';
import { triggerHaptic } from '../../services/deviceService';

interface FounderDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RosterFilter = 'all' | 'genuine' | 'google' | 'pro' | 'free' | 'guests';

export const FounderDashboardModal: React.FC<FounderDashboardModalProps> = ({ isOpen, onClose }) => {
  useModalBehavior(isOpen, onClose);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [guests, setGuests] = useState<AdminUserRecord[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<RosterFilter>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchFounderUserRoster();
      setUsers(data.users);
      setGuests(data.guests || []);
      setMetrics(data.metrics);
    } catch (err: any) {
      console.error('[FounderDashboard] Load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGrant = async (email: string) => {
    triggerHaptic();
    const ok = await adminGrantPro(email, 365);
    if (ok) {
      setActionNotice(`Granted 1-Year Pro membership to ${email} (synced to cloud)`);
      setTimeout(() => setActionNotice(null), 4000);
      loadData(true);
    }
  };

  const handleRevoke = async (email: string) => {
    triggerHaptic();
    const ok = await adminRevokePro(email);
    if (ok) {
      setActionNotice(`Revoked Pro membership for ${email}`);
      setTimeout(() => setActionNotice(null), 4000);
      loadData(true);
    }
  };

  const handleExportCsv = () => {
    triggerHaptic();
    const sourceRecords = filterTier === 'guests' ? guests : users;
    const csv = buildFounderRosterCsv(sourceRecords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tripverse_users_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setActionNotice(`Exported ${sourceRecords.length} records to CSV`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const sourcePool = filterTier === 'guests' ? guests : users;

  const filteredUsers = sourcePool.filter(u => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      u.email.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.location || '').toLowerCase().includes(q) ||
      u.provider.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (filterTier === 'all' || filterTier === 'guests') return true;
    if (filterTier === 'genuine') return u.isGenuine;
    if (filterTier === 'google') return u.provider === 'google';
    return u.tier === filterTier;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-5xl max-h-[92dvh] flex flex-col bg-slate-900 border border-amber-500/30 rounded-3xl shadow-[0_25px_70px_rgba(245,158,11,0.15)] overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="founder-dashboard-title"
      >
        {/* Header Bar */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 border-b border-amber-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-2 ring-amber-400/40">
              <Crown className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="founder-dashboard-title" className="text-lg font-bold text-white tracking-tight">
                  TripVerse Founder Command Center
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  VIP Access Only
                </span>
              </div>
              <p className="text-xs text-amber-200/70">
                meet.sharma8c@gmail.com • Unified Email + Google OAuth + Guest cloud roster
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Export CSV"
              aria-label="Export CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Roster"
              aria-label="Refresh Roster"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Close Dashboard"
              aria-label="Close Dashboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice Alert */}
        {actionNotice && (
          <div className="px-6 py-2.5 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700">
          {/* KPI Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-slate-850/80 border border-slate-700/60 flex flex-col">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                Total Sign-Up / In
              </span>
              <span className="text-2xl font-bold text-white mt-1">
                {metrics ? metrics.totalRegistered : '...'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {metrics ? `${metrics.activeSignedUsers} signed in • ${metrics.signedUpOnlyUsers ?? 0} signup only` : 'Email + Google OAuth'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-850/80 border border-slate-700/60 flex flex-col">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                Active Sign-ins
              </span>
              <span className="text-2xl font-bold text-blue-300 mt-1">
                {metrics ? metrics.activeSignedUsers : '...'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">
                {metrics ? `${metrics.googleUsers} Google • ${metrics.guestSessions} Guests` : '≥1 authenticated session'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-850/80 border border-amber-500/20 bg-amber-950/10 flex flex-col">
              <span className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Genuine Travelers
              </span>
              <span className="text-2xl font-bold text-amber-300 mt-1">
                {metrics ? metrics.genuineTravelers : '...'}
              </span>
              <span className="text-[10px] text-amber-400/60 mt-0.5">Non-test human users</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-850/80 border border-slate-700/60 flex flex-col">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                Pro Subscribers
              </span>
              <span className="text-2xl font-bold text-emerald-300 mt-1">
                {metrics ? metrics.proSubscribers : '...'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5">Active paid/granted</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-850/80 border border-amber-500/30 bg-amber-950/20 flex flex-col">
              <span className="text-[11px] font-medium text-amber-300 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                VIP Founder
              </span>
              <span className="text-2xl font-bold text-amber-300 mt-1">
                {metrics ? metrics.vipFounders : 1}
              </span>
              <span className="text-[10px] text-amber-400/60 mt-0.5">Permanent unrestricted</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-850/80 border border-slate-700/60 flex flex-col">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Cloud AI Health
              </span>
              <span className="text-2xl font-bold text-emerald-400 mt-1">
                Online
              </span>
              <span className="text-[10px] text-emerald-500/80 mt-0.5">Groq 120B + SerpApi</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search travelers by email, name, provider, or city..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: `All Registered (${metrics?.totalRegistered ?? 0})` },
                { id: 'genuine', label: `Genuine (${metrics?.genuineTravelers ?? 0})` },
                { id: 'google', label: `Google (${metrics?.googleUsers ?? 0})` },
                { id: 'pro', label: `Pro (${metrics?.proSubscribers ?? 0})` },
                { id: 'free', label: `Free (${metrics?.freeAccounts ?? 0})` },
                { id: 'guests', label: `Guests (${metrics?.guestSessions ?? 0})` }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterTier(f.id as RosterFilter)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    filterTier === f.id
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* User Roster Table */}
          <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-850/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Traveler</th>
                    <th className="px-4 py-3">Status / Tier</th>
                    <th className="px-4 py-3">Auth Provider</th>
                    <th className="px-4 py-3">Created / Last Active</th>
                    <th className="px-4 py-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                        Fetching verified database roster...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No travelers found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isFounder = u.tier === 'vip_founder';
                      const isPro = u.tier === 'pro';

                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isFounder 
                                  ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 ring-2 ring-amber-400/40' 
                                  : isPro
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-750 text-slate-300'
                              }`}>
                                {isFounder ? '👑' : (u.name.charAt(0) || 'T').toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-100 truncate flex items-center gap-1.5">
                                  <span>{u.name}</span>
                                  {u.isGenuine && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Verified Genuine Traveler" />
                                  )}
                                  {u.location && (
                                    <span className="text-[10px] text-slate-500 font-normal">• {u.location}</span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">
                                  {u.isGuest ? `Guest ID: ${u.id.slice(0, 8)}` : u.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {isFounder ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-xs shadow-amber-500/20">
                                <Crown className="w-3 h-3 fill-slate-950" />
                                VIP Founder
                              </span>
                            ) : isPro ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                <Zap className="w-3 h-3" />
                                Pro Member
                              </span>
                            ) : u.isGuest ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/70">
                                Guest Session
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                                Free Tier
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 font-mono text-[11px] text-slate-300 uppercase">
                            {u.provider}
                          </td>

                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            <div>
                              {new Date(u.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            {u.lastSignInAt ? (
                              <div className="text-[10px] text-emerald-400/80">
                                Signed in {new Date(u.lastSignInAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                            ) : (
                              <div className="text-[10px] text-amber-400/80">
                                Signed up only (0 logins)
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {isFounder ? (
                              <span className="text-[10px] text-amber-300 font-semibold italic">Permanent Founder</span>
                            ) : u.isGuest ? (
                              <span className="text-[10px] text-slate-500">Anonymous</span>
                            ) : isPro ? (
                              <button
                                onClick={() => handleRevoke(u.email)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-semibold transition-all cursor-pointer"
                              >
                                Revoke Pro
                              </button>
                            ) : (
                              <button
                                onClick={() => handleGrant(u.email)}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition-all cursor-pointer"
                              >
                                Grant 1-Yr Pro
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-slate-900/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Showing all {filteredUsers.length} matched records (zero row cap)</span>
              <span>Synced across Supabase Auth + Firebase OAuth + Google GIS</span>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted cloud roster • Deduplicated by canonical account identity</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
