import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Eye, EyeOff, Check, AlertCircle, Loader2, KeyRound, X, ShieldCheck } from 'lucide-react';
import { updateUserPassword, getCurrentUser } from '../../services/authService';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setIsSuccess(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak', color: 'bg-rose-500' };
      case 2:
        return { score: 50, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: 'Good', color: 'bg-blue-500' };
      case 4:
        return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
      default:
        return { score: 0, label: '', color: '' };
    }
  };

  const strength = calculateStrength(newPassword);
  const isMatch = newPassword.length >= 6 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your new password.');
      return;
    }

    setIsLoading(true);
    try {
      await updateUserPassword(newPassword);
      setIsSuccess(true);

      // Clean up the URL hash / path cleanly so user does not re-enter reset loop on refresh
      if (typeof window !== 'undefined') {
        const cleanUrl = window.location.origin + (window.location.search || '');
        window.history.replaceState({}, document.title, cleanUrl);
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error('[ResetPasswordModal] Failed to update password:', err);
      setErrorMsg(err.message || 'Could not update password. Please request a new recovery link.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    // Clean up reset-password from URL if user dismisses
    if (typeof window !== 'undefined' && window.location.pathname.includes('/reset-password')) {
      window.history.replaceState({}, document.title, '/');
    }
    onClose();
  };

  const currentUser = getCurrentUser();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set New Password"
      onClick={handleCloseModal}
      className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overscroll-contain overflow-y-auto animate-in fade-in duration-200"
      style={{
        minHeight: '100dvh',
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))'
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set New Password Form"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-[#0C1523] rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col min-h-0 overflow-hidden my-auto animate-in zoom-in-95 duration-200"
        style={{
          maxHeight: 'min(92dvh, calc(100dvh - 1.5rem))'
        }}
      >
        {/* Header bar */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0B2545] dark:text-white leading-tight">Set New Password</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Secure your TripVerse explorer account</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isSuccess ? (
            <div className="py-6 text-center space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Password Updated!</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                  Your new password is saved and active. You are now logged in and your session is secure.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 pt-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to your dashboard...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {currentUser?.email && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Resetting for:</span>
                  <span className="font-mono font-bold text-[#0B2545] dark:text-slate-200 truncate max-w-[200px]">
                    {currentUser.email}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span className="flex-1 font-medium">{errorMsg}</span>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#0B2545] dark:text-white text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D] transition-colors"
                    required
                    autoFocus
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="pt-1.5 space-y-1">
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${strength.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                      <span>Strength: {strength.label}</span>
                      <span>Min. 6 characters</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#0B2545] dark:text-white text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D] transition-colors"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {confirmPassword.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium pt-0.5">
                    {isMatch ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-rose-500 dark:text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6 || !isMatch}
                className="w-full py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Update Password & Continue</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
