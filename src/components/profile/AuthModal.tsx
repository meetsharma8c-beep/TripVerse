import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  Check, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  MapPin,
  ArrowLeft, 
  ArrowRight,
  KeyRound, 
  Sparkles,
  Compass,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../../types/trip';
import { 
  signInWithEmail, 
  sendPasswordResetCode,
  signInWithGooglePopup, 
  signInWithGoogleRedirect,
  signInWithGoogleCredential,
  isMobileDevice,
  ensureGoogleIdentityServices,
  createAccountWithSupabase, 
  signInAnonymouslyWithSupabase,
  clearPhoneAuthSession,
  toUserProfile,
  verifyEmailOtp,
  resendEmailConfirmation
} from '../../services/authService';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
  initialMethod?: 'google' | 'email' | 'phone' | 'guest';
  initialSubMode?: 'login' | 'signup';
  restrictionMessage?: string | null;
}

const TRAVELER_STYLES = [
  { id: 'Budget explorer', label: 'Budget Explorer' },
  { id: 'Heritage & Culture', label: 'Heritage & Culture' },
  { id: 'Nature & Trekking', label: 'Nature & Trekking' },
  { id: 'Food & Cafe Hunter', label: 'Foodie & Cafes' },
  { id: 'Luxury & Leisure', label: 'Luxury & Leisure' }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMethod,
  initialSubMode,
  restrictionMessage
}) => {
  // Main Authentication mode
  const [authMethod, setAuthMethod] = useState<'google' | 'email' | 'guest'>(
    initialMethod === 'phone' ? 'email' : (initialMethod || 'email')
  );
  const [emailSubMode, setEmailSubMode] = useState<'login' | 'signup' | 'forgot-password' | 'verify-email'>(initialSubMode || 'login');

  useEffect(() => {
    if (isOpen) {
      if (initialMethod) setAuthMethod(initialMethod === 'phone' ? 'email' : initialMethod);
      if (initialSubMode) setEmailSubMode(initialSubMode);
    }
  }, [isOpen, initialMethod, initialSubMode]);

  // Email / Password state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [emailLocation, setEmailLocation] = useState('India');
  const [emailTravelerStyle, setEmailTravelerStyle] = useState('Budget explorer');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [emailOtpToken, setEmailOtpToken] = useState('');
  const [emailResendCountdown, setEmailResendCountdown] = useState(0);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const activeRequestIdRef = useRef(0);

  const switchAuthTab = useCallback((nextMethod: 'google' | 'email' | 'guest', nextEmailSubMode?: 'login' | 'signup') => {
    activeRequestIdRef.current += 1;
    setIsLoading(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setAuthMethod(nextMethod);
    if (nextEmailSubMode) {
      setEmailSubMode(nextEmailSubMode);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      activeRequestIdRef.current += 1;
      setIsLoading(false);
      setErrorMsg(null);
      setSuccessMsg(null);
      ensureGoogleIdentityServices().catch(() => {});
    }
  }, [isOpen]);

  // Clean up auth session when modal closes
  const handleModalClose = useCallback(() => {
    activeRequestIdRef.current += 1;
    setIsLoading(false);
    clearPhoneAuthSession();
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  }, [onClose]);

  useModalBehavior(isOpen, handleModalClose);

  useEffect(() => {
    if (emailResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setEmailResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailResendCountdown]);

  if (!isOpen) return null;

  // ----------------------------------------------------------------------
  // 1. Google Sign-In & Sign-Up via Firebase OAuth2 Popup / Redirect
  // ----------------------------------------------------------------------
  const handleTriggerGoogleAuth = async (forceRedirect: boolean = false) => {
    const reqId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (forceRedirect) {
        await signInWithGoogleRedirect();
        return; // Page will redirect to Google
      }
      const user = await signInWithGooglePopup();
      if (activeRequestIdRef.current !== reqId) return;
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Welcome, ${user.displayName}! Signed in with Google.`);
      setTimeout(() => {
        onSuccess(toUserProfile(user));
        handleModalClose();
      }, 500);
    } catch (err: any) {
      if (activeRequestIdRef.current !== reqId) return;
      const msg = err?.message || '';
      if (
        err.code === 'auth/popup-closed-by-user' ||
        msg.toLowerCase().includes('popup-closed') ||
        msg.toLowerCase().includes('cancelled') ||
        msg.toLowerCase().includes('closed')
      ) {
        setIsLoading(false);
        return;
      }
      console.error('Google Auth error:', err);
      setErrorMsg(
        err.message || 'Google sign-in could not complete. You can try the Direct Redirect button below.'
      );
      // NOTE: Never switch tab away from google! Keep user on Google tab.
    } finally {
      if (activeRequestIdRef.current === reqId) {
        setIsLoading(false);
      }
    }
  };

  // ----------------------------------------------------------------------
  // 2. Genuine Instant Guest Explorer Sign-In (Supabase Verified Session)
  // ----------------------------------------------------------------------
  const handleInstantGuestSignIn = async () => {
    const reqId = ++activeRequestIdRef.current;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = await signInAnonymouslyWithSupabase({
        name: name.trim() || 'Explorer',
        travelerStyle: emailTravelerStyle || 'Budget explorer',
        location: emailLocation || 'India'
      });
      if (activeRequestIdRef.current !== reqId) return;
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Welcome, ${user.displayName}! Verified explorer session activated.`);
      setTimeout(() => {
        onSuccess(toUserProfile(user));
        handleModalClose();
      }, 500);
    } catch (err: any) {
      if (activeRequestIdRef.current !== reqId) return;
      console.error('Instant guest sign-in error:', err);
      setErrorMsg(err.message || 'Could not initialize guest session.');
    } finally {
      if (activeRequestIdRef.current === reqId) {
        setIsLoading(false);
      }
    }
  };

  // ----------------------------------------------------------------------
  // 4. Real Email/Password Sign In
  // ----------------------------------------------------------------------
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const reqId = ++activeRequestIdRef.current;
    setIsLoading(true);
    try {
      const user = await signInWithEmail({ email, password, rememberMe });
      if (activeRequestIdRef.current !== reqId) return;
      try {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Welcome back, ${user.displayName}!`);
      setTimeout(() => {
        onSuccess(toUserProfile(user));
        handleModalClose();
      }, 500);
    } catch (err: any) {
      if (activeRequestIdRef.current !== reqId) return;
      console.error('Email sign in error:', err);
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      if (
        msg.toLowerCase().includes('not confirmed') ||
        msg.toLowerCase().includes('confirmation is pending') ||
        (err as any)?.code === 'email_not_confirmed'
      ) {
        setErrorMsg('Email confirmation is required. Enter the 6-digit confirmation code sent to your email below:');
        setEmailSubMode('verify-email');
        setEmailResendCountdown(60);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      if (activeRequestIdRef.current === reqId) {
        setIsLoading(false);
      }
    }
  };

  // ----------------------------------------------------------------------
  // 5. Real Email/Password Account Creation with Supabase
  // ----------------------------------------------------------------------
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const reqId = ++activeRequestIdRef.current;
    setIsLoading(true);
    try {
      const user = await createAccountWithSupabase({
        name: name.trim(),
        email: email.trim(),
        password,
        travelerStyle: emailTravelerStyle,
        location: emailLocation || 'India'
      });
      if (activeRequestIdRef.current !== reqId) return;

      // If email confirmation is required, ask user for the 6-digit OTP code sent to their email
      if (user.emailConfirmationPending || user.isPendingEmailConfirmation) {
        setEmailSubMode('verify-email');
        setEmailResendCountdown(60);
        setSuccessMsg(`We sent a 6-digit confirmation code to ${email.trim()}. Enter it below to activate your account.`);
        return;
      }

      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Welcome to TripVerse, ${user.displayName}! Account created successfully.`);
      setTimeout(() => {
        onSuccess(toUserProfile(user));
        handleModalClose();
      }, 600);
    } catch (err: any) {
      if (activeRequestIdRef.current !== reqId) return;
      console.error('Account creation error:', err);
      setErrorMsg(err.message || 'Could not create account.');
    } finally {
      if (activeRequestIdRef.current === reqId) {
        setIsLoading(false);
      }
    }
  };

  // ----------------------------------------------------------------------
  // 6. Email Confirmation Token Verification & Resend
  // ----------------------------------------------------------------------
  const handleVerifyEmailToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const token = emailOtpToken.trim();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!token || token.length < 6) {
      setErrorMsg('Please enter the 6-digit confirmation code from your email.');
      return;
    }

    setIsLoading(true);
    try {
      const verifiedUser = await verifyEmailOtp(email.trim(), token);
      try {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Email confirmed! Welcome to TripVerse, ${verifiedUser.displayName}.`);
      setTimeout(() => {
        onSuccess(toUserProfile(verifiedUser));
        handleModalClose();
      }, 600);
    } catch (err: any) {
      console.error('Email confirmation error:', err);
      setErrorMsg(err.message || 'Invalid or expired confirmation code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmailToken = async () => {
    if (emailResendCountdown > 0) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter your email address to receive a confirmation code.');
      return;
    }
    setIsLoading(true);
    try {
      await resendEmailConfirmation(email.trim(), name.trim());
      setEmailResendCountdown(60);
      setSuccessMsg(`Confirmation code re-dispatched to ${email.trim()}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not resend confirmation email.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // 7. Real Password Reset Link Dispatch
  // ----------------------------------------------------------------------
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetCode(email.trim());
      setResetEmailSent(true);
      setSuccessMsg(`Password recovery email sent to ${email.trim()}.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMsg(err.message || 'Could not send password reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="Sign in or create account"
      onClick={handleModalClose}
      className="fixed inset-0 z-[60] overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#2D5A3D]/10 text-[#2D5A3D] flex items-center justify-center font-black text-sm">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-xl font-black font-display text-[#0B2545]">
              Trip<span className="text-[#2D5A3D]">Verse</span>
            </span>
          </div>

          <button
            onClick={handleModalClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Method Navigation: Google vs Email vs Quick Guest */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={() => switchAuthTab('google')}
            className={`py-3 text-[11px] sm:text-xs font-bold transition-all border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              authMethod === 'google'
                ? 'border-[#2D5A3D] text-[#0B2545] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Google</span>
          </button>

          <button
            type="button"
            onClick={() => switchAuthTab('email')}
            className={`py-3 text-[11px] sm:text-xs font-bold transition-all border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              authMethod === 'email'
                ? 'border-[#2D5A3D] text-[#0B2545] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => switchAuthTab('guest')}
            className={`py-3 text-[11px] sm:text-xs font-bold transition-all border-b-2 flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
              authMethod === 'guest'
                ? 'border-[#2D5A3D] text-[#0B2545] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Guest</span>
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-4 max-h-[82vh] overflow-y-auto">

          {/* AI Planner Restriction Banner (when prompted from restricted guest action) */}
          {restrictionMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 flex-1">
                <span className="font-bold block text-amber-950">AI Trip Planner Account Required</span>
                <span className="leading-relaxed block text-amber-800">{restrictionMessage}</span>
              </div>
            </div>
          )}
          
          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <span className="font-medium leading-relaxed block">{errorMsg}</span>
                {authMethod === 'email' && emailSubMode === 'signup' && errorMsg.toLowerCase().includes('already exists') && (
                  <button
                    type="button"
                    onClick={() => switchAuthTab('email', 'login')}
                    className="inline-flex items-center gap-1 font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer pt-0.5"
                  >
                    <span>Switch to Sign In</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {authMethod === 'google' ? (
                  <button
                    type="button"
                    onClick={() => handleTriggerGoogleAuth(true)}
                    className="inline-flex items-center gap-1 font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer pt-0.5"
                  >
                    <span>Try Direct Redirect Sign-In</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchAuthTab('email', 'login')}
                    className="inline-flex items-center gap-1 font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer pt-0.5"
                  >
                    <span>Switch to Email or Google Sign-In</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-rose-600 ml-1 cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <Check className="w-4 h-4 text-[#2D5A3D] shrink-0" />
              <span className="font-medium leading-relaxed flex-1">{successMsg}</span>
            </div>
          )}

          {/* ==================================================================== */}
          {/* METHOD: DEDICATED GOOGLE AUTH PAGE                                   */}
          {/* ==================================================================== */}
          {authMethod === 'google' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center shadow-2xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[#0B2545]">Sign In with Google</h3>
                <p className="text-xs text-slate-500">
                  Fast, verified 1-tap sign-in. Syncs your itineraries and unlocks the AI Trip Planner.
                </p>
              </div>

              {/* Official Google OAuth Sign-In via Firebase Auth Proxy */}
              <div className="flex flex-col items-center justify-center w-full min-h-[48px] py-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleTriggerGoogleAuth(false)}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#2D5A3D]" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                {/* Direct Redirect Mode (100% immune to Safari pop-up blockers) */}
                <button
                  type="button"
                  onClick={() => handleTriggerGoogleAuth(true)}
                  disabled={isLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:bg-slate-100 text-slate-600 font-medium text-[11px] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  title="Direct Redirect navigates to Google directly without opening a popup window, ensuring 100% compatibility on iPhone Safari and privacy browsers"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Direct Redirect Sign-In (Recommended for Safari & Mobile)</span>
                </button>

                {isLoading && (
                  <button
                    type="button"
                    onClick={() => switchAuthTab('google')}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 underline cursor-pointer mt-1"
                  >
                    Taking long? Tap to reset
                  </button>
                )}
              </div>

              {/* Benefits of Google Account */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2D5A3D] shrink-0" />
                  <span>Google Cloud Verified OAuth 2.0 Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Full access to AI Day-by-Day Itinerary Planner</span>
                </div>
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Instant cross-device itinerary sync</span>
                </div>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => switchAuthTab('email')}
                  className="text-xs text-slate-500 hover:text-[#2D5A3D] font-semibold cursor-pointer underline"
                >
                  Prefer email & password? Switch to Email tab
                </button>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* METHOD: INSTANT GUEST EXPLORER (Genuine Supabase Cloud Session)      */}
          {/* ==================================================================== */}
          {authMethod === 'guest' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#0B2545]">Instant Guest Explorer</h3>
                <p className="text-xs text-slate-500">
                  Explore destinations, road trips, and travel deals freely without an account.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-left text-xs text-amber-900 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block text-amber-950">Explore-Only Mode</span>
                  <span className="text-[11px] text-amber-800 leading-relaxed block">
                    Guest Explorer lets you browse destinations, highway amenities, and transport deals. To generate custom day-by-day itineraries with the AI Planner, sign in with Google or Email.
                  </span>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                    Your Name (Optional)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Explorer Friend"
                      className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                    Your Travel Style
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TRAVELER_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setEmailTravelerStyle(style.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          emailTravelerStyle === style.id
                            ? 'bg-[#2D5A3D] text-white shadow-2xs scale-102'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstantGuestSignIn}
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initializing Explorer Session...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start Exploring as Verified Guest</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A3D]" />
                <span>Genuine cloud session with persistent database storage</span>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* METHOD 2: REAL EMAIL & PASSWORD                                      */}
          {/* ==================================================================== */}
          {authMethod === 'email' && (
            <div className="space-y-4">
              
              {/* Email Submode Switcher (Sign In vs Create Account) */}
              {emailSubMode !== 'forgot-password' && emailSubMode !== 'verify-email' && (
                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => switchAuthTab('email', 'login')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      emailSubMode === 'login'
                        ? 'bg-white text-[#0B2545] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAuthTab('email', 'signup')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      emailSubMode === 'signup'
                        ? 'bg-white text-[#0B2545] shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* 1. EMAIL SIGN IN */}
              {emailSubMode === 'login' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold text-[#0B2545]">Welcome Back</h3>
                    <p className="text-xs text-slate-500">
                      Sign in with your email to access your itineraries and saved places.
                    </p>
                  </div>

                  <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. traveler@domain.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold uppercase text-slate-600">Password</label>
                        <button
                          type="button"
                          onClick={() => { 
                            setEmailSubMode('forgot-password'); 
                            setErrorMsg(null); 
                            setSuccessMsg(null); 
                            setResetEmailSent(false); 
                          }}
                          className="text-[11px] text-[#2D5A3D] hover:underline font-semibold cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="p-1 text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="remember_me"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#2D5A3D] focus:ring-[#2D5A3D] accent-[#2D5A3D]"
                      />
                      <label htmlFor="remember_me" className="text-xs text-slate-600 cursor-pointer">
                        Remember me for 30 days
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Signing In...</span>
                        </>
                      ) : (
                        <span>Sign In to TripVerse</span>
                      )}
                    </button>
                  </form>

                  <div className="text-center pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailSubMode('verify-email');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-[#2D5A3D] hover:underline font-semibold cursor-pointer"
                    >
                      Already have a 6-digit confirmation code? Enter it here
                    </button>
                  </div>
                </div>
              )}

              {/* 2. EMAIL SIGN UP */}
              {emailSubMode === 'signup' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold text-[#0B2545]">Create Account</h3>
                    <p className="text-xs text-slate-500">
                      Join TripVerse to plan trips, save spots, and discover destinations.
                    </p>
                  </div>

                  <form onSubmit={handleCreateAccount} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@domain.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Home Location (Optional)</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={emailLocation}
                          onChange={(e) => setEmailLocation(e.target.value)}
                          placeholder="e.g. Mumbai, India"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 6 chars"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Confirm Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Traveler Persona selection */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                        Your Travel Style
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {TRAVELER_STYLES.map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setEmailTravelerStyle(style.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              emailTravelerStyle === style.id
                                ? 'bg-[#2D5A3D] text-white shadow-2xs scale-102'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Create Account & Start Exploring</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* 3. FORGOT PASSWORD */}
              {emailSubMode === 'forgot-password' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => { 
                      setEmailSubMode('login'); 
                      setErrorMsg(null); 
                      setSuccessMsg(null); 
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>

                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0B2545]">Reset Your Password</h3>
                    <p className="text-xs text-slate-500">
                      Enter your account email and we will send a secure password reset link directly to your inbox.
                    </p>
                  </div>

                  {resetEmailSent ? (
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-900 text-xs">Reset Link Dispatched</h4>
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Check your email inbox (and spam folder) for the reset link sent to:
                        </p>
                        <p className="text-xs font-mono font-bold text-slate-800 mt-1">{email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { 
                          setEmailSubMode('login'); 
                          setErrorMsg(null); 
                          setSuccessMsg(null); 
                        }}
                        className="w-full py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        Return to Sign In
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSendResetEmail} className="space-y-3.5">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Your Account Email</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@domain.com"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending Reset Email...</span>
                          </>
                        ) : (
                          <span>Send Password Reset Link</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* 4. VERIFY EMAIL OTP */}
              {emailSubMode === 'verify-email' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => { 
                      setEmailSubMode('login'); 
                      setErrorMsg(null); 
                      setSuccessMsg(null); 
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>

                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#2D5A3D] mx-auto flex items-center justify-center">
                      <Mail className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0B2545]">Verify Your Email</h3>
                    <p className="text-xs text-slate-500">
                      Check your inbox for the 6-digit verification code from TripVerse:
                    </p>
                    {email ? (
                      <p className="text-xs font-mono font-bold text-[#0B2545]">{email}</p>
                    ) : null}
                  </div>

                  <form onSubmit={handleVerifyEmailToken} className="space-y-3.5">
                    {!email && (
                      <div className="text-left">
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. traveler@domain.com"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        6-Digit Confirmation Code
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={emailOtpToken}
                          onChange={(e) => setEmailOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="e.g. 123456"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-center font-mono text-base font-bold tracking-widest text-slate-800 focus:outline-hidden focus:border-[#2D5A3D]"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || emailOtpToken.length !== 6}
                      className="w-full py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Confirm Email & Start Exploring</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400">Didn't receive the email?</span>
                    {emailResendCountdown > 0 ? (
                      <span className="font-semibold text-slate-500 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3 text-slate-400 animate-spin" />
                        Resend in {emailResendCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendEmailToken}
                        disabled={isLoading}
                        className="font-bold text-[#2D5A3D] hover:underline cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
