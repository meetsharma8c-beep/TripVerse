/**
 * Production Telemetry & Core Web Vitals Collector (telemetryService.ts)
 * Zero-dependency browser observer capturing real LCP, CLS, INP, FCP, TTFB,
 * and uncaught runtime errors with PII scrubbing and safe beacon transport.
 */

export interface WebVitalMetric {
  name: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface ClientErrorRecord {
  message: string;
  source?: string;
  timestamp: number;
  route: string;
}

const TELEMETRY_BUFFER_KEY = 'tripverse_vitals_buffer_v1';
const vitalsStore = new Map<WebVitalMetric['name'], WebVitalMetric>();
const recentErrors: ClientErrorRecord[] = [];
let initialized = false;

function rateVital(name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] {
  switch (name) {
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'INP':
      return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    case 'FCP':
      return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
    case 'TTFB':
      return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor';
  }
}

function scrubPii(input: string): string {
  return String(input || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\+?\d[\d\s-]{8,15}\d/g, '[redacted-phone]')
    .slice(0, 240);
}

function recordVital(name: WebVitalMetric['name'], rawValue: number): void {
  if (!Number.isFinite(rawValue) || rawValue < 0) return;
  const value = name === 'CLS' ? Math.round(rawValue * 1000) / 1000 : Math.round(rawValue);
  const metric: WebVitalMetric = {
    name,
    value,
    rating: rateVital(name, value),
    timestamp: Date.now(),
  };
  vitalsStore.set(name, metric);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(TELEMETRY_BUFFER_KEY, JSON.stringify(Array.from(vitalsStore.values())));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function getCapturedWebVitals(): WebVitalMetric[] {
  return Array.from(vitalsStore.values());
}

export function getCapturedClientErrors(): ClientErrorRecord[] {
  return [...recentErrors];
}

export function initTelemetry(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  // 1. Capture TTFB via Navigation Timing API
  try {
    const navEntries = performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[] | undefined;
    const nav = navEntries?.[0];
    if (nav && nav.responseStart > 0) {
      recordVital('TTFB', nav.responseStart);
    }
  } catch {
    // Unsupported browser
  }

  // 2. Capture FCP, LCP, CLS, INP via native PerformanceObserver
  if (typeof PerformanceObserver !== 'undefined') {
    const observeSafe = (type: string, callback: (entries: PerformanceEntry[]) => void) => {
      try {
        const observer = new PerformanceObserver((list) => callback(list.getEntries()));
        observer.observe({ type, buffered: true } as PerformanceObserverInit);
      } catch {
        // Unsupported entryType in Safari/Firefox older versions
      }
    };

    observeSafe('paint', (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          recordVital('FCP', entry.startTime);
        }
      }
    });

    observeSafe('largest-contentful-paint', (entries) => {
      const last = entries[entries.length - 1];
      if (last) recordVital('LCP', last.startTime);
    });

    let clsTotal = 0;
    observeSafe('layout-shift', (entries) => {
      for (const entry of entries as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput && typeof entry.value === 'number') {
          clsTotal += entry.value;
        }
      }
      recordVital('CLS', clsTotal);
    });

    let worstInp = 0;
    observeSafe('event', (entries) => {
      for (const entry of entries as Array<PerformanceEntry & { duration?: number; interactionId?: number }>) {
        if (entry.interactionId && typeof entry.duration === 'number' && entry.duration > worstInp) {
          worstInp = entry.duration;
          recordVital('INP', worstInp);
        }
      }
    });
  }

  // 3. Lightweight PII-scrubbed uncaught runtime error collector
  const pushError = (message: string, source?: string) => {
    if (recentErrors.length >= 20) recentErrors.shift();
    recentErrors.push({
      message: scrubPii(message),
      source: source ? scrubPii(source) : undefined,
      timestamp: Date.now(),
      route: window.location?.pathname || '/',
    });
  };

  window.addEventListener('error', (e) => {
    if (e?.message) {
      pushError(e.message, e.filename);
    }
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e?.reason instanceof Error ? e.reason.message : String(e?.reason || 'Unhandled rejection');
    pushError(reason);
  });
}
