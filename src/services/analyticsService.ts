// TripVerse Unified Analytics & Error Monitoring Service
// Safe initialization for Google Analytics 4 (GA4) and Sentry
// Functions as a resilient no-op when env keys are omitted

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    Sentry?: any;
  }
}

let isInitialized = false;

/**
 * Initialize Google Analytics 4 (GA4) dynamically if Measurement ID is present
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined' || isInitialized) return;

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (gaId && typeof gaId === 'string' && gaId.startsWith('G-')) {
    try {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer?.push(arguments);
      };

      window.gtag('js', new Date());
      window.gtag('config', gaId, {
        send_page_view: true,
        anonymize_ip: true
      });
    } catch {
      // Non-critical, swallow analytics failure
    }
  }

  isInitialized = true;
}

/**
 * Track custom user interaction events (e.g. trip_created, booking_confirmed, ai_chat_prompt)
 */
export function trackEvent(eventName: string, params: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  if (window.gtag) {
    try {
      window.gtag('event', eventName, params);
    } catch {}
  }
}

/**
 * Track virtual page views for Single Page App navigation
 */
export function trackPageView(pagePath: string, pageTitle?: string): void {
  if (typeof window === 'undefined' || !window.gtag) return;

  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!gaId) return;

  try {
    window.gtag('config', gaId, {
      page_path: pagePath,
      page_title: pageTitle || document.title
    });
  } catch {}
}

/**
 * Capture runtime exceptions and report to Sentry / monitoring
 */
export function captureError(error: Error | unknown, context: Record<string, any> = {}): void {
  if (typeof window === 'undefined') return;

  if (window.Sentry?.captureException) {
    try {
      window.Sentry.captureException(error, { extra: context });
    } catch {}
  }
}
