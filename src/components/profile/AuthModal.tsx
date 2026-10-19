import React, { useState, useEffect, useRef } from 'react';
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
  Phone,
  RotateCcw,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../../types/trip';
import { 
  signInWithEmail, 
  sendPasswordResetCode,
  signInWithGooglePopup, 
  signInWithGoogleCredential,
  ensureGoogleIdentityServices,
  createAccountWithSupabase, 
  sendPhoneOtp,
  verifyPhoneOtp,
  clearPhoneAuthSession,
  formatE164PhoneNumber,
  getPhoneAuthErrorMessage,
  toUserProfile,
  verifyEmailOtp,
  resendEmailConfirmation,
  getSavedAccounts,
  getCurrentUser,
  syncAccountToLocal,
  toDeterministicUuid,
  AuthUser
} from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: UserProfile) => void;
}

const TRAVELER_STYLES = [
  { id: 'Budget explorer', label: 'Budget Explorer' },
  { id: 'Heritage & Culture', label: 'Heritage & Culture' },
  { id: 'Nature & Trekking', label: 'Nature & Trekking' },
  { id: 'Food & Cafe Hunter', label: 'Foodie & Cafes' },
  { id: 'Luxury & Leisure', label: 'Luxury & Leisure' }
];

const COUNTRY_CODES = [
  { code: '+91', country: 'India', placeholder: '98765 43210' },
  { code: '+1', country: 'US / Canada', placeholder: '(555) 000-0000' },
  { code: '+44', country: 'United Kingdom', placeholder: '7911 123456' },
  { code: '+971', country: 'UAE', placeholder: '50 123 4567' },
  { code: '+65', country: 'Singapore', placeholder: '8123 4567' },
  { code: '+61', country: 'Australia', placeholder: '412 345 678' },
  { code: '+49', country: 'Germany', placeholder: '151 23456789' },
  { code: '+33', country: 'France', placeholder: '6 12 34 56 78' },
  { code: '+966', country: 'Saudi Arabia', placeholder: '50 123 4567' },
  { code: '+977', country: 'Nepal', placeholder: '984 1234567' },
  { code: '+880', country: 'Bangladesh', placeholder: '1712 345678' },
  { code: '+94', country: 'Sri Lanka', placeholder: '71 234 5678' },
  { code: '+81', country: 'Japan', placeholder: '90 1234 5678' }
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  // Main Authentication mode - Default to email
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [emailSubMode, setEmailSubMode] = useState<'login' | 'signup' | 'forgot-password' | 'verify-email'>('login');
  
  // Real Phone Auth state
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<'number' | 'otp'>('number');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [phoneUserName, setPhoneUserName] = useState('');
  const [phoneTravelerStyle, setPhoneTravelerStyle] = useState('Budget explorer');
  const [phoneLocation, setPhoneLocation] = useState('India');
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
  const [pendingConfirmationUser, setPendingConfirmationUser] = useState<AuthUser | null>(null);
  const [emailResendCountdown, setEmailResendCountdown] = useState(0);

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Google GIS Official Button integration
  const googleBtnPhoneRef = useRef<HTMLDivElement>(null);
  const googleBtnLoginRef = useRef<HTMLDivElement>(null);
  const googleBtnSignupRef = useRef<HTMLDivElement>(null);
  const [gisRendered, setGisRendered] = useState<{ phone?: boolean; login?: boolean; signup?: boolean }>({});

  // Resend Countdown Timer effects
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (emailResendCountdown <= 0) return;
    const timer = setInterval(() => {
      setEmailResendCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailResendCountdown]);

  // Clean up phone verifier when modal closes
  const handleModalClose = () => {
    clearPhoneAuthSession();
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  // Close modal with Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Google Identity Services (GIS) Official Credential Callback
  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const user = await signInWithGoogleCredential(response.credential);
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Welcome, ${user.displayName}! Signed in with Google.`);
      setTimeout(() => {
        onSuccess(toUserProfile(user));
        handleModalClose();
      }, 500);
    } catch (err: any) {
      console.error('Google credential login error:', err);
      setErrorMsg(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Identity Services (GIS) Button Lifecycle
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    const renderGis = () => {
      const g = (window as any).google?.accounts?.id;
      if (!g || !clientId || !isMounted) return;

      try {
        g.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse
        });

        const activeKey =
          authMethod === 'phone' ? 'phone' :
          emailSubMode === 'signup' ? 'signup' :
          emailSubMode === 'login' ? 'login' : null;

        const targetEl =
          activeKey === 'phone' ? googleBtnPhoneRef.current :
          activeKey === 'signup' ? googleBtnSignupRef.current :
          activeKey === 'login' ? googleBtnLoginRef.current : null;

        if (targetEl && activeKey && isMounted) {
          targetEl.innerHTML = '';
          const computedWidth = typeof window !== 'undefined'
            ? Math.min(340, Math.max(240, window.innerWidth - 64))
            : 320;

          g.renderButton(targetEl, {
            theme: 'outline',
            size: 'large',
            width: computedWidth,
            text: activeKey === 'signup' ? 'signup_with' : 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          });

          setGisRendered(prev => ({ ...prev, [activeKey]: true }));
        }
      } catch (err) {
        console.warn('[GIS] renderButton notice:', err);
      }
    };

    ensureGoogleIdentityServices().then((ready) => {
      if (ready && isMounted) {
        setTimeout(() => {
          if (isMounted) renderGis();
        }, 50);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, authMethod, emailSubMode]);

  if (!isOpen) return null;

  // Selected country details helper
  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];

  // ----------------------------------------------------------------------
  // 1. Real Phone Auth: Send SMS OTP
  // ----------------------------------------------------------------------
  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanDigits = phoneNumber.trim().replace(/\D/g, '');
    if (cleanDigits.length < 7) {
      setErrorMsg('Please enter a valid mobile number (at least 7 to 10 digits).');
      return;
    }

    const fullPhoneNumber = formatE164PhoneNumber(phoneNumber, countryCode);

    setIsLoading(true);
    try {
      const sendRes = await sendPhoneOtp(fullPhoneNumber, 'tripverse-recaptcha-container');
      setPhoneStep('otp');
      setResendCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      const providerLabel = sendRes.provider === 'fast2sms'
        ? 'Fast2SMS'
        : 'Supabase SMS';
      setSuccessMsg(sendRes.message || `SMS verification code dispatched to ${fullPhoneNumber} via ${providerLabel}.`);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error('Phone SMS dispatch error:', err);
      const friendly = getPhoneAuthErrorMessage(err);
      setErrorMsg(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // 2. Real Phone Auth: Verify 6-digit SMS OTP
  // ----------------------------------------------------------------------
  const handleVerifyOtp = async (codeToVerify?: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const code = (codeToVerify || otpDigits.join('')).trim();
    if (code.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit code received via SMS.');
      return;
    }

    setIsLoading(true);
    try {
      const fullPhoneNumber = formatE164PhoneNumber(phoneNumber, countryCode);
      const user = await verifyPhoneOtp(
        code, 
        phoneUserName.trim() || undefined,
        phoneTravelerStyle,
        phoneLocation.trim() || 'India',
        fullPhoneNumber
      );
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Welcome, ${user.displayName}! Phone verified.`);
      setTimeout(() => {
        onSuccess(toUserProfile(user));
        handleModalClose();
      }, 500);
    } catch (err: any) {
      console.error('OTP confirmation error:', err);
      const friendly = getPhoneAuthErrorMessage(err);
      setErrorMsg(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP digit box input
  const handleOtpBoxChange = (index: number, val: string) => {
    // Handle paste event of multi-character string
    if (val.length > 1) {
      const pasted = val.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const next = [...otpDigits];
        for (let i = 0; i < 6; i++) {
          next[i] = pasted[i] || '';
        }
        setOtpDigits(next);
        const focusIdx = Math.min(pasted.length, 5);
        otpInputRefs.current[focusIdx]?.focus();
        if (pasted.length === 6) {
          handleVerifyOtp(pasted);
        }
        return;
      }
    }

    const singleDigit = val.replace(/\D/g, '').slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = singleDigit;
    setOtpDigits(nextDigits);

    // Auto-advance to next box if digit was typed
    if (singleDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits completed
    const fullCode = nextDigits.join('');
    if (fullCode.length === 6) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // ----------------------------------------------------------------------
  // 3. Google Sign-In & Sign-Up with GIS Official Button / OAuth2 Popup
  // ----------------------------------------------------------------------

  const handleTriggerGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const user = await signInWithGooglePopup();
      try {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Welcome, ${user.displayName}! Signed in with Google.`);
      setTimeout(() => {
        onSuccess(toUserProfile(user));
        handleModalClose();
      }, 500);
    } catch (err: any) {
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
      console.warn('Google Auth notice:', err);
      if (err.code === 'auth/operation-not-allowed') {
        setErrorMsg("Google Sign-In is not enabled yet in your Firebase Console (Authentication -> Sign-in method -> Google -> Enable).");
      } else if (err.code === 'auth/unauthorized-domain' || msg.includes('Authorized domains')) {
        setErrorMsg("Firebase Domain Notice: Please add this domain to 'Authorized domains' in Firebase Console (Authentication -> Settings -> Authorized domains).");
      } else if (msg.toLowerCase().includes('origin') || msg.toLowerCase().includes('not allowed')) {
        setErrorMsg("Google OAuth Origin Notice: Please ensure 'https://tripverse-pied.vercel.app' is listed under Authorized JavaScript Origins in Google Cloud Console.");
      } else {
        setErrorMsg(msg || 'Google Sign-In encountered an issue. Please try again.');
      }
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
    try {
      const user = await signInWithEmail({ email, password, rememberMe });
      if ((user as any).emailConfirmationPending && !(user as any).emailVerified) {
        setPendingConfirmationUser(user);
        setEmailSubMode('verify-email');
        setEmailResendCountdown(60);
        setErrorMsg('Email address not yet confirmed. You can click the link in your email, enter the 6-digit code, or click "Skip for Now" to start using TripVerse.');
        return;
      }
      try {
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
      } catch {}
      setSuccessMsg(`Welcome back, ${user.displayName}!`);
      setTimeout(() => {
        onSuccess(toUserProfile(user));
        handleModalClose();
      }, 500);
    } catch (err: any) {
      console.error('Email sign in error:', err);
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setErrorMsg('Email address not yet confirmed. Click the link in your email, enter the 6-digit confirmation code below, or click "Skip for Now" to explore.');
        setEmailSubMode('verify-email');
        setEmailResendCountdown(60);
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
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

    setIsLoading(true);
    try {
      const user = await createAccountWithSupabase({
        name: name.trim(),
        email: email.trim(),
        password,
        travelerStyle: emailTravelerStyle,
        location: emailLocation || 'India'
      });

      const isPending = (user as any).isPendingEmailConfirmation || (user as any).emailConfirmationPending;
      if (isPending) {
        setPendingConfirmationUser(user);
        setEmailSubMode('verify-email');
        setEmailResendCountdown(60);
        if ((user as any).isRateLimited) {
          setErrorMsg('Note: Supabase shared email limit was reached (3 emails/hour). You can click "Skip for Now & Explore" below to enter immediately without waiting for the confirmation email.');
        } else {
          setSuccessMsg(`Account created! A confirmation link & 6-digit code was sent to ${email.trim()}.`);
        }
      } else {
        try {
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        } catch {}
        setSuccessMsg(`Welcome to TripVerse, ${user.displayName}! Account created.`);
        setTimeout(() => {
          onSuccess(toUserProfile(user));
          handleModalClose();
        }, 600);
      }
    } catch (err: any) {
      console.error('Account creation error:', err);
      setErrorMsg(err.message || 'Could not create account.');
    } finally {
      setIsLoading(false);
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
    setIsLoading(true);
    try {
      await resendEmailConfirmation(email.trim());
      setEmailResendCountdown(60);
      setSuccessMsg(`Confirmation code re-dispatched to ${email.trim()}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not resend confirmation email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinuePendingUser = () => {
    if (pendingConfirmationUser) {
      onSuccess(toUserProfile(pendingConfirmationUser));
      handleModalClose();
      return;
    }
    const current = getCurrentUser();
    if (current) {
      onSuccess(toUserProfile(current));
      handleModalClose();
      return;
    }
    const accounts = getSavedAccounts();
    const match = accounts.find(a => a.email && a.email.toLowerCase() === email.trim().toLowerCase());
    if (match) {
      onSuccess(toUserProfile(match));
      handleModalClose();
      return;
    }
    const fallbackUser: AuthUser = {
      uid: toDeterministicUuid('email:' + (email.trim().toLowerCase() || 'explorer')),
      email: email.trim() || 'explorer@tripverse.app',
      displayName: name.trim() || (email ? email.split('@')[0] : 'Explorer'),
      photoURL: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || email || 'Explorer')}&backgroundColor=2D5A3D,0B2545`,
      travelerStyle: 'Budget explorer',
      travelStyleTag: 'Verified Explorer',
      location: 'India',
      occupation: 'Explorer',
      age: 25,
      emailVerified: false,
      provider: 'email',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      savedPlaceIds: []
    };
    syncAccountToLocal(fallbackUser);
    onSuccess(toUserProfile(fallbackUser));
    handleModalClose();
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

        {/* Primary Method Navigation: Phone OTP vs Email */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/60">
          <button
            type="button"
            onClick={() => { 
              setAuthMethod('phone'); 
              setErrorMsg(null); 
              setSuccessMsg(null); 
            }}
            className={`py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              authMethod === 'phone'
                ? 'border-[#2D5A3D] text-[#0B2545] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>Mobile OTP</span>
          </button>

          <button
            type="button"
            onClick={() => { 
              setAuthMethod('email'); 
              setErrorMsg(null); 
              setSuccessMsg(null); 
            }}
            className={`py-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              authMethod === 'email'
                ? 'border-[#2D5A3D] text-[#0B2545] bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-[#2D5A3D]" />
            <span>Email & Password</span>
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-4 max-h-[82vh] overflow-y-auto">
          
          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <span className="font-medium leading-relaxed block">{errorMsg}</span>
                {authMethod !== 'email' && errorMsg.includes('Email & Password') && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('email');
                      setEmailSubMode('login');
                      setErrorMsg(null);
                    }}
                    className="inline-flex items-center gap-1 font-bold text-rose-800 underline hover:text-rose-950 cursor-pointer pt-0.5"
                  >
                    <span>Switch to Email & Password</span>
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
          {/* METHOD 1: REAL PHONE AUTH (SMS OTP via Fast2SMS / Supabase)           */}
          {/* ==================================================================== */}
          {authMethod === 'phone' && (
            <div className="space-y-4">
              
              {/* STEP 1: Phone Number Input */}
              {phoneStep === 'number' && (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold text-[#0B2545]">Sign In with Mobile</h3>
                    <p className="text-xs text-slate-500">
                      Enter your phone number to receive a real 6-digit SMS verification code.
                    </p>
                  </div>

                  {/* 1-Click Google OAuth Shortcut */}
                  <div className="flex flex-col items-center justify-center w-full min-h-[44px]">
                    <div ref={googleBtnPhoneRef} className="w-full flex justify-center items-center" />
                    {!gisRendered.phone && (
                      <button
                        type="button"
                        onClick={handleTriggerGoogleAuth}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="flex-1 h-px bg-slate-200" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">or verify with SMS</span>
                    <span className="flex-1 h-px bg-slate-200" />
                  </div>

                  <form onSubmit={handleSendPhoneOtp} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Mobile Phone Number
                      </label>
                      <div className="flex gap-2">
                        {/* Country Dial Code Selector */}
                        <div className="relative shrink-0">
                          <select
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                            className="appearance-none pl-3 pr-7 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-hidden focus:border-[#2D5A3D] cursor-pointer"
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code} ({c.country})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Phone Number Input */}
                        <div className="relative flex-1">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder={selectedCountry.placeholder}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold tracking-wide text-slate-800 focus:outline-hidden focus:border-[#2D5A3D]"
                            required
                            autoFocus
                          />
                        </div>
                      </div>
                    </div>

                    {/* Optional Traveler Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Full Name (Optional)
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={phoneUserName}
                            onChange={(e) => setPhoneUserName(e.target.value)}
                            placeholder="Enter your name"
                            className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                          Home City (Optional)
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={phoneLocation}
                            onChange={(e) => setPhoneLocation(e.target.value)}
                            placeholder="e.g. Mumbai, India"
                            className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#2D5A3D]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Travel Style Selector */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1.5">
                        Travel Style
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {TRAVELER_STYLES.map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setPhoneTravelerStyle(style.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              phoneTravelerStyle === style.id
                                ? 'bg-[#2D5A3D] text-white shadow-2xs scale-102'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Invisible reCAPTCHA container element */}
                    <div id="tripverse-recaptcha-container" className="flex justify-center my-1" />

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Dispatching SMS OTP...</span>
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4" />
                          <span>Send SMS Verification Code</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2D5A3D]" />
                    <span>Secure Phone Authentication with carrier SMS</span>
                  </div>
                </div>
              )}

              {/* STEP 2: 6-Digit SMS OTP Verification */}
              {phoneStep === 'otp' && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      clearPhoneAuthSession();
                      setPhoneStep('number');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change phone number</span>
                  </button>

                  <div className="text-center space-y-1">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#2D5A3D] mx-auto flex items-center justify-center">
                      <Phone className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[#0B2545]">Enter SMS Code</h3>
                    <p className="text-xs text-slate-500">
                      We sent a 6-digit verification code to
                    </p>
                    <p className="text-xs font-mono font-bold text-[#0B2545]">
                      {formatE164PhoneNumber(phoneNumber, countryCode)}
                    </p>
                  </div>


                  {/* 6 Individual Digit Boxes */}
                  <div className="flex justify-center items-center gap-2 py-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpBoxChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono rounded-xl border transition-all focus:outline-hidden ${
                          digit
                            ? 'border-[#2D5A3D] bg-emerald-50/40 text-[#0B2545] shadow-2xs'
                            : 'border-slate-300 bg-white text-slate-800 focus:border-[#2D5A3D] focus:ring-2 focus:ring-[#2D5A3D]/20'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleVerifyOtp()}
                    disabled={isLoading || otpDigits.join('').length !== 6}
                    className="w-full py-3 rounded-xl bg-trip-gradient hover:bg-trip-gradient-hover text-white font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying SMS Code...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify & Start Exploring</span>
                      </>
                    )}
                  </button>

                  {/* Resend SMS Counter */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-400">Didn't receive the SMS?</span>
                    {resendCountdown > 0 ? (
                      <span className="font-semibold text-slate-500 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3 text-slate-400 animate-spin" />
                        Resend in {resendCountdown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendPhoneOtp()}
                        disabled={isLoading}
                        className="font-bold text-[#2D5A3D] hover:underline cursor-pointer"
                      >
                        Resend SMS Code
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                    onClick={() => { 
                      setEmailSubMode('login'); 
                      setErrorMsg(null); 
                      setSuccessMsg(null); 
                    }}
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
                    onClick={() => { 
                      setEmailSubMode('signup'); 
                      setErrorMsg(null); 
                      setSuccessMsg(null); 
                    }}
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

                  {/* Real Google OAuth Button */}
                  <div className="flex flex-col items-center justify-center w-full min-h-[44px]">
                    <div ref={googleBtnLoginRef} className="w-full flex justify-center items-center" />
                    {!gisRendered.login && (
                      <button
                        type="button"
                        onClick={handleTriggerGoogleAuth}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="flex-1 h-px bg-slate-200" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">or enter credentials</span>
                    <span className="flex-1 h-px bg-slate-200" />
                  </div>

                  <form onSubmit={handleEmailSignIn} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Email Address</label>
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

                  {/* Real Google OAuth Button */}
                  <div className="flex flex-col items-center justify-center w-full min-h-[44px]">
                    <div ref={googleBtnSignupRef} className="w-full flex justify-center items-center" />
                    {!gisRendered.signup && (
                      <button
                        type="button"
                        onClick={handleTriggerGoogleAuth}
                        disabled={isLoading}
                        className="w-full py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <span>Sign up with Google</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-300">
                    <span className="flex-1 h-px bg-slate-200" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">or register with email</span>
                    <span className="flex-1 h-px bg-slate-200" />
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
                      Check your inbox to click the confirmation link or enter the 6-digit code below:
                    </p>
                    <p className="text-xs font-mono font-bold text-[#0B2545]">{email}</p>
                  </div>

                  <form onSubmit={handleVerifyEmailToken} className="space-y-3.5">
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

                    <button
                      type="button"
                      onClick={handleContinuePendingUser}
                      className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Skip for Now & Explore TripVerse</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
