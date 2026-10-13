/**
 * Real SMS Gateway Service using Fast2SMS Dev API
 * Sends real SMS OTP messages to mobile phone numbers.
 */

const FAST2SMS_API_ENDPOINT = 'https://www.fast2sms.com/dev/bulkV2';
const STORAGE_KEY_PENDING_SMS = 'tripverse_pending_sms_otp_v1';
const STORAGE_KEY_CUSTOM_API_KEY = 'tripverse_fast2sms_api_key';

export interface Fast2SmsResult {
  success: boolean;
  message: string;
  requestId?: string;
  statusCode?: number;
}

export interface PendingSmsSession {
  phoneNumber: string; // E.164 e.g. +919876543210
  cleanNumber: string; // 10 digits e.g. 9876543210
  code: string;        // 6-digit numeric OTP
  expiresAt: number;   // Timestamp (10 mins)
  attempts: number;    // Failed attempts count
  dispatchedAt: number;
}

/**
 * Retrieve active Fast2SMS API Key from env or localStorage
 */
export function getFast2SmsApiKey(): string {
  const envKey = import.meta.env.VITE_FAST2SMS_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 10) {
    return envKey.trim();
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_API_KEY);
      if (stored && stored.trim().length > 10) {
        return stored.trim();
      }
    } catch {}
  }

  return '';
}

/**
 * Save custom Fast2SMS API Key
 */
export function saveFast2SmsApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_API_KEY, key.trim());
    } catch {}
  }
}

/**
 * Send real 6-digit SMS OTP via Fast2SMS API
 */
export async function sendRealSmsOtp(
  rawPhoneNumber: string,
  otpCode: string
): Promise<Fast2SmsResult> {
  const apiKey = getFast2SmsApiKey();
  if (!apiKey) {
    throw new Error('Fast2SMS API Key is not configured.');
  }

  // Extract pure digits
  const cleanDigits = rawPhoneNumber.trim().replace(/\D/g, '');
  // For Indian numbers, extract last 10 digits
  const tenDigit = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

  if (tenDigit.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number for SMS dispatch.');
  }

  const payload = {
    route: 'otp',
    variables_values: otpCode,
    numbers: tenDigit
  };

  try {
    let response: Response | null = null;
    let data: any = null;

    // 1. Attempt Vercel serverless proxy (/api/sms) to bypass browser CORS restrictions
    try {
      const proxyRes = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numbers: tenDigit,
          variables_values: otpCode,
          apiKey
        })
      });
      if (proxyRes.ok) {
        data = await proxyRes.json();
      }
    } catch {
      // Offline or local dev fallback to direct endpoint
    }

    // 2. Direct Fast2SMS endpoint fallback
    if (!data) {
      try {
        response = await fetch(FAST2SMS_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'authorization': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (postErr) {
        console.warn('Fast2SMS POST attempt failed, attempting GET fallback:', postErr);
        const getUrl = `${FAST2SMS_API_ENDPOINT}?authorization=${encodeURIComponent(apiKey)}&route=otp&variables_values=${encodeURIComponent(otpCode)}&numbers=${encodeURIComponent(tenDigit)}`;
        response = await fetch(getUrl, { method: 'GET' });
      }
      data = await response.json();
    }

    if (data.return === true || (response?.ok && data.status_code === 200) || data.status_code === 200) {
      const e164 = `+91${tenDigit}`;
      savePendingSmsSession({
        phoneNumber: e164,
        cleanNumber: tenDigit,
        code: otpCode,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes valid
        attempts: 0,
        dispatchedAt: Date.now()
      });

      const messageText = Array.isArray(data.message) ? data.message.join(' ') : (data.message || 'SMS sent successfully.');
      return {
        success: true,
        message: messageText,
        requestId: data.request_id,
        statusCode: data.status_code || 200
      };
    }

    // Handle Fast2SMS specific error responses
    const rawMessage = Array.isArray(data.message) ? data.message.join(' ') : (data.message || '');
    let friendlyMessage = rawMessage || 'Could not send SMS via Fast2SMS.';

    if (data.status_code === 414 || rawMessage.includes('blacklisted') || rawMessage.includes('Dev API')) {
      friendlyMessage = 'Fast2SMS IP Security Restriction: The network IP is temporarily restricted on Fast2SMS Dev API. Please whitelist your public IP in the Fast2SMS Dashboard under Dev API > IP Authorization, or verify network connection.';
    } else if (rawMessage.includes('wallet') || rawMessage.includes('balance') || rawMessage.includes('Low')) {
      friendlyMessage = 'Insufficient Fast2SMS Wallet Balance. Please add wallet credits in your Fast2SMS Dashboard to deliver carrier SMS.';
    } else if (rawMessage.includes('Authorization') || data.status_code === 401) {
      friendlyMessage = 'Invalid Fast2SMS API Key. Please verify your API key in Fast2SMS Dashboard.';
    }

    return {
      success: false,
      message: friendlyMessage,
      statusCode: data.status_code || response?.status || 400
    };
  } catch (err: any) {
    console.error('Fast2SMS Network Request Error:', err);
    throw new Error(err.message || 'Network error connecting to Fast2SMS Gateway.');
  }
}

/**
 * Save pending SMS verification session in sessionStorage
 */
export function savePendingSmsSession(session: PendingSmsSession): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY_PENDING_SMS, JSON.stringify(session));
  } catch {}
}

/**
 * Retrieve current active SMS verification session
 */
export function getPendingSmsSession(): PendingSmsSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY_PENDING_SMS);
    if (!raw) return null;
    const session: PendingSmsSession = JSON.parse(raw);
    if (session.expiresAt && session.expiresAt < Date.now()) {
      clearPendingSmsSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Clear pending SMS session
 */
export function clearPendingSmsSession(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(STORAGE_KEY_PENDING_SMS);
  } catch {}
}

/**
 * Verify input code against pending SMS session
 */
export function verifyRealSmsOtp(
  rawPhoneNumber: string,
  inputCode: string
): { success: boolean; error?: string; session?: PendingSmsSession } {
  const session = getPendingSmsSession();
  if (!session) {
    return {
      success: false,
      error: 'No active SMS verification session found. Please request a new verification code.'
    };
  }

  const cleanDigits = rawPhoneNumber.trim().replace(/\D/g, '');
  const tenDigit = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

  if (session.cleanNumber !== tenDigit && session.phoneNumber !== rawPhoneNumber.trim()) {
    return {
      success: false,
      error: 'Phone number does not match the active SMS verification request.'
    };
  }

  if (Date.now() > session.expiresAt) {
    clearPendingSmsSession();
    return {
      success: false,
      error: 'SMS verification code has expired. Please tap "Resend SMS" to get a fresh code.'
    };
  }

  if (session.attempts >= 5) {
    clearPendingSmsSession();
    return {
      success: false,
      error: 'Too many incorrect attempts. For security, please request a new verification code.'
    };
  }

  const cleanInput = inputCode.trim().replace(/\D/g, '');
  if (cleanInput.length !== 6) {
    return {
      success: false,
      error: 'Please enter the complete 6-digit code.'
    };
  }

  if (session.code !== cleanInput) {
    session.attempts += 1;
    savePendingSmsSession(session);
    return {
      success: false,
      error: `Incorrect verification code. Please check your phone SMS (${5 - session.attempts} attempts remaining).`
    };
  }

  // Verified successfully! Clear pending state
  clearPendingSmsSession();
  return {
    success: true,
    session
  };
}
