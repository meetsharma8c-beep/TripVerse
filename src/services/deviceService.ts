import { Capacitor, registerPlugin } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';

const NativeSystemUI = registerPlugin<{
  setTheme: (options: { dark: boolean }) => Promise<void>;
  haptic: (options: { style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' }) => Promise<void>;
}>('NativeSystemUI');

const PRODUCTION_API_ORIGIN = 'https://trip-verse.com';

/**
 * Returns the canonical API origin when executing inside Capacitor iOS (`capacitor://localhost`)
 * or Capacitor Android (`https://localhost`), keeping relative `/api/*` paths on web hosts.
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const protocol = window.location?.protocol || '';
    const hostname = window.location?.hostname || '';
    if (
      protocol === 'capacitor:' ||
      protocol === 'ionic:' ||
      (Capacitor.isNativePlatform() && (hostname === 'localhost' || hostname === '127.0.0.1'))
    ) {
      return PRODUCTION_API_ORIGIN;
    }
  } catch {
    // Ignore window access issues in non-browser tests
  }
  return '';
}

export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

let deferredInstallPrompt: any = null;

// Eagerly listen for PWA install prompt at module load
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('tripverse-can-install', { detail: true }));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent('tripverse-can-install', { detail: false }));
  });
}

export function isIos(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    Capacitor.isNativePlatform()
  );
}

export type OperatingSystem = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'chromeos' | 'unknown';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type PerformanceTier = 'high' | 'balanced' | 'lite';

/**
 * Classifies the current device's GPU/CPU/RAM/network capability so visual effects
 * (Liquid Glass blur passes, 3D WebGL mascot, decorative pulses) automatically adapt
 * to deliver locked 60-120fps smoothness from budget Android phones to 120Hz flagships.
 */
export function detectPerformanceTier(): PerformanceTier {
  if (typeof navigator === 'undefined') return 'balanced';
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  const hasWindow = typeof window !== 'undefined';
  const prefersReducedMotion = hasWindow ? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) : false;
  const saveData = Boolean(nav.connection?.saveData);
  const slowNet = /^(?:slow-2g|2g)$/i.test(nav.connection?.effectiveType || '');
  if (prefersReducedMotion || saveData || slowNet) return 'lite';

  const cores = typeof nav.hardwareConcurrency === 'number' ? nav.hardwareConcurrency : 6;
  const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : undefined;
  const isTouchDevice = (hasWindow ? window.matchMedia?.('(pointer: coarse)').matches : false) || (nav.maxTouchPoints || 0) > 0;
  const isAndroid = /Android/i.test(nav.userAgent || '');

  // Budget Android phones / low-RAM tablets / dual-or-quad-core CPUs
  if ((memory !== undefined && memory <= 4) || cores <= 4) {
    return 'lite';
  }

  // Mid-range mobile & tablets (6GB RAM or Android touch devices): balanced GPU budget
  if (isTouchDevice && (isAndroid || (memory !== undefined && memory <= 6))) {
    return 'balanced';
  }

  return isTouchDevice ? 'balanced' : 'high';
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  os: OperatingSystem;
  deviceType: DeviceType;
  isNative: boolean;
  isStandalone: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouch: boolean;
  hasFinePointer: boolean;
  isRetina: boolean;
  hasNotch: boolean;
  hasHaptics: boolean;
  prefersReducedMotion: boolean;
  keyboardShortcutModifier: '⌘' | 'Ctrl';
}

export function detectOS(): OperatingSystem {
  if (typeof window === 'undefined') return 'unknown';
  const ua = window.navigator.userAgent || '';
  const platform = (window.navigator as any).userAgentData?.platform || window.navigator.platform || '';

  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) {
    return 'android';
  }
  if (/Mac|Macintosh|MacIntel/.test(platform) || /Macintosh/.test(ua)) {
    return 'macos';
  }
  if (/Win|Windows/.test(platform) || /Windows/.test(ua)) {
    return 'windows';
  }
  if (/CrOS/.test(ua)) {
    return 'chromeos';
  }
  if (/Linux/.test(platform) || /Linux/.test(ua)) {
    return 'linux';
  }
  return 'unknown';
}

export function getDeviceInfo(): DeviceInfo {
  const nav = typeof window !== 'undefined' ? window.navigator : (typeof navigator !== 'undefined' ? navigator : null);
  const ua = nav?.userAgent || '';
  const isIosDevice = isIos();
  const isAndroid = /Android/.test(ua);
  const isNative = Capacitor.isNativePlatform();
  const standalone = isStandalone();
  const os = detectOS();

  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isMobile = isIosDevice || isAndroid || width < 768;
  const isTablet = !isIosDevice && !isAndroid && width >= 768 && width < 1024;
  const isDesktop = !isMobile && !isTablet;

  const deviceType: DeviceType = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  const isTouch = typeof window !== 'undefined' ? (
    window.matchMedia('(pointer: coarse)').matches || ((nav?.maxTouchPoints || 0) > 0)
  ) : false;

  const hasFinePointer = typeof window !== 'undefined' ? (
    window.matchMedia('(pointer: fine)').matches || window.matchMedia('(any-pointer: fine)').matches
  ) : true;

  const isRetina = typeof window !== 'undefined' ? (window.devicePixelRatio >= 2) : false;

  const hasNotch = typeof window !== 'undefined' ? (
    isIosDevice || (window.screen?.height >= 812 && isTouch)
  ) : false;

  const hasHaptics = !!nav && 'vibrate' in nav;

  const prefersReducedMotion = typeof window !== 'undefined' ? (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) : false;

  const keyboardShortcutModifier: '⌘' | 'Ctrl' = (os === 'macos' || os === 'ios') ? '⌘' : 'Ctrl';

  let platform: 'ios' | 'android' | 'web' = 'web';
  if (Capacitor.getPlatform() === 'ios' || isIosDevice) {
    platform = 'ios';
  } else if (Capacitor.getPlatform() === 'android' || isAndroid) {
    platform = 'android';
  }

  return {
    platform,
    os,
    deviceType,
    isNative,
    isStandalone: standalone,
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    hasFinePointer,
    isRetina,
    hasNotch,
    hasHaptics,
    prefersReducedMotion,
    keyboardShortcutModifier
  };
}

let lastAppliedDeviceSignature = '';

export function applyDeviceClassesToDom(): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const info = getDeviceInfo();
  const perfTier = detectPerformanceTier();
  const signature = `${info.os}|${info.deviceType}|${info.isTouch}|${info.hasFinePointer}|${info.isStandalone}|${info.isRetina}|${info.hasNotch}|${perfTier}`;
  if (signature === lastAppliedDeviceSignature) return;
  lastAppliedDeviceSignature = signature;

  const root = document.documentElement;

  // OS Classes
  root.classList.remove('os-ios', 'os-android', 'os-macos', 'os-windows', 'os-linux', 'os-chromeos', 'os-unknown');
  root.classList.add(`os-${info.os}`);

  // Device Form Factor Classes
  root.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
  root.classList.add(`device-${info.deviceType}`);

  // Adaptive Hardware Performance Tier Classes (perf-high / perf-balanced / perf-lite)
  root.classList.remove('perf-high', 'perf-balanced', 'perf-lite');
  root.classList.add(`perf-${perfTier}`);

  // Touch vs Mouse
  root.classList.toggle('touch-device', info.isTouch);
  // Guarantee mouse-device classes for devices with a fine pointer (mouse / precision trackpad),
  // including Windows 2-in-1 hybrid touch laptops
  root.classList.toggle('mouse-device', info.hasFinePointer || !info.isTouch);

  // Standalone / PWA
  root.classList.toggle('is-standalone', info.isStandalone);

  // Retina / High-DPI
  root.classList.toggle('is-retina', info.isRetina);

  // Notch / Safe Area
  root.classList.toggle('has-notch', info.hasNotch);
}

export function openExternalUrl(url: string): void {
  const targetUrl = new URL(url, window.location.href);
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    console.error('[TripVerse] Refusing to open an unsupported external URL:', url);
    return;
  }

  if (Capacitor.isNativePlatform()) {
    Browser.open({ url: targetUrl.toString() }).catch((error) => {
      console.error('[TripVerse] Could not open external link:', error);
      window.alert('Could not open this provider link. Please try again or copy the link into your browser.');
    });
    return;
  }

  window.open(targetUrl.toString(), '_blank', 'noopener,noreferrer');
}

export function syncThemeStatusBar(isDark?: boolean): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const darkActive = typeof isDark === 'boolean'
    ? isDark
    : document.documentElement.classList.contains('dark');

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', darkActive ? '#070C16' : '#2D5A3D');
  }

  if (Capacitor.isNativePlatform()) {
    try {
      StatusBar.setStyle({ style: darkActive ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: darkActive ? '#070C16' : '#FFFFFF' }).catch(() => {});
      NativeSystemUI.setTheme({ dark: darkActive }).catch(() => {});
    } catch {
      // Ignore on unsupported platforms
    }
  }
}

export function initDeviceServices(onBackPress?: () => boolean) {
  // 0. Synchronize responsive & OS capability classes on document
  applyDeviceClassesToDom();
  syncThemeStatusBar();

  if (typeof window !== 'undefined') {
    let resizeDebounce: ReturnType<typeof setTimeout> | null = null;
    const onResizeDebounced = () => {
      if (resizeDebounce) clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(applyDeviceClassesToDom, 180);
    };
    window.addEventListener('resize', onResizeDebounced, { passive: true });
    window.addEventListener('orientationchange', applyDeviceClassesToDom, { passive: true });

    // Observe dark mode class changes on <html> to keep native StatusBar and meta theme-color in sync
    if (typeof MutationObserver !== 'undefined' && document.documentElement) {
      const themeObserver = new MutationObserver(() => {
        syncThemeStatusBar();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    // Track visualViewport for iOS Safari & mobile virtual keyboard safe-area adjustment
    if (window.visualViewport && document.documentElement) {
      const updateVisualViewportVars = () => {
        const vv = window.visualViewport;
        if (!vv) return;
        const root = document.documentElement;
        root.style.setProperty('--visual-viewport-height', `${Math.round(vv.height)}px`);
        const keyboardInset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        root.style.setProperty('--keyboard-inset-bottom', `${keyboardInset}px`);
        root.classList.toggle('keyboard-open', keyboardInset > 100);
      };
      updateVisualViewportVars();
      window.visualViewport.addEventListener('resize', updateVisualViewportVars, { passive: true });
      window.visualViewport.addEventListener('scroll', updateVisualViewportVars, { passive: true });
    }
  }

  // 1. Native Capacitor initialization
  if (Capacitor.isNativePlatform()) {
    document.addEventListener('click', (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest<HTMLAnchorElement>('a[target="_blank"]');
      if (!link) return;

      const url = new URL(link.href, window.location.href);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin === window.location.origin) return;

      event.preventDefault();
      openExternalUrl(url.toString());
    }, true);

    try {
      syncThemeStatusBar();
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    } catch (e) {
      console.warn('Status bar configuration error:', e);
    }

    // Schedule safety fallback to hide splash after 3s if React unmounts or crashes
    setTimeout(() => {
      hideNativeSplashScreen(400);
    }, 3000);

    // Deep Links & Universal Links (tripverse:// and https://trip-verse.com/...)
    CapApp.addListener('appUrlOpen', ({ url }) => {
      if (!url || typeof window === 'undefined') return;
      try {
        const parsed = new URL(url);
        let nextPath = '/';
        if (parsed.protocol === 'tripverse:') {
          const hostSegment = parsed.hostname ? `/${parsed.hostname}` : '';
          nextPath = `${hostSegment}${parsed.pathname || ''}${parsed.search || ''}${parsed.hash || ''}` || '/';
        } else if (parsed.hostname === 'trip-verse.com' || parsed.hostname === 'www.trip-verse.com') {
          nextPath = `${parsed.pathname || '/'}${parsed.search || ''}${parsed.hash || ''}`;
        } else {
          return;
        }
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        console.warn('[TripVerse] Ignored malformed deep link:', url, err);
      }
    });

    // Android hardware back button handler
    CapApp.addListener('backButton', ({ canGoBack }) => {
      // 1. Dispatch custom event allowing UI layers (modals, open drawers, active tabs) to handle
      if (typeof window !== 'undefined') {
        const backEvent = new CustomEvent('tripverse-hardware-back', { cancelable: true });
        const wasHandled = !window.dispatchEvent(backEvent);
        if (wasHandled) {
          return;
        }
      }

      if (onBackPress && onBackPress()) {
        return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
  }

  // 2. Service Worker for PWA (Android / iOS Safari / Chrome / Edge)
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update();
          console.log('[TripVerse] Service Worker registered & checked for updates:', reg.scope);
        })
        .catch((err) => {
          console.log('[TripVerse] Service Worker registration failed:', err);
        });
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }

  // 3. Capture PWA beforeinstallprompt event (Android / Desktop Chrome)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      window.dispatchEvent(new CustomEvent('tripverse-can-install', { detail: true }));
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      window.dispatchEvent(new CustomEvent('tripverse-can-install', { detail: false }));
    });
  }
}

export async function promptPWAInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) {
    return 'unavailable';
  }
  try {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return outcome;
  } catch {
    return 'unavailable';
  }
}

export function canInstallPWA(): boolean {
  return deferredInstallPrompt !== null;
}

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined') return;

  try {
    // Native iOS Taptic Engine via TripVerseNativeUIPlugin (iOS WKWebView lacks navigator.vibrate)
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
      NativeSystemUI.haptic({ style: type }).catch(() => {});
      return;
    }

    // Only attempt vibration if user has interacted with the document (browser security requirement)
    if ('userActivation' in navigator && !(navigator as any).userActivation.hasBeenActive) {
      return;
    }

    if ('vibrate' in navigator) {
      switch (type) {
        case 'light':
          navigator.vibrate(15);
          break;
        case 'medium':
          navigator.vibrate(35);
          break;
        case 'heavy':
          navigator.vibrate(60);
          break;
        case 'success':
          navigator.vibrate([20, 50, 30]);
          break;
        case 'warning':
          navigator.vibrate([40, 60, 40]);
          break;
      }
    }
  } catch {
    // Ignore unsupported environments
  }
}

/**
 * Universal cross-browser clipboard helper (works in Chrome, Safari, Firefox, Edge,
 * Samsung Internet, and non-HTTPS/WebView fallbacks without unhandled Promise rejections).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined' || !text) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to execCommand fallback for Firefox/Safari restricted contexts
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Cross-platform file export that works identically on Desktop Web, iOS WKWebView, and Android WebView.
 * Native WebViews ignore `<a download="blob:...">`, so native platforms invoke the OS Share Sheet
 * (Save to Files, Add to Calendar, AirDrop, Nearby Share) with safe clipboard fallback.
 */
export async function saveOrShareFile(options: {
  filename: string;
  content: string;
  mimeType?: string;
  title?: string;
  text?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const mimeType = options.mimeType || 'text/plain;charset=utf-8';
  const blob = new Blob([options.content], { type: mimeType });

  if (Capacitor.isNativePlatform()) {
    try {
      const nav = window.navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (typeof File !== 'undefined' && typeof nav.share === 'function') {
        const file = new File([blob], options.filename, { type: mimeType });
        if (!nav.canShare || nav.canShare({ files: [file] })) {
          await nav.share({
            files: [file],
            title: options.title || options.filename,
            text: options.text,
          });
          return true;
        }
      }
      if (typeof nav.share === 'function') {
        await nav.share({
          title: options.title || options.filename,
          text: options.text || options.content,
        });
        return true;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return false;
    }

    // Last-resort native fallback: copy content cleanly to clipboard
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(options.content);
        return true;
      }
    } catch {
      // Fall through to anchor download attempt
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = options.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return true;
}

/**
 * Cross-platform print / save-PDF helper.
 * Android WebView silently ignores `window.print()`, so native apps fall back to the OS Share Sheet
 * (which exposes AirPrint / Save to Files on iOS and Print / Save PDF on Android).
 */
export async function printOrShareDocument(options?: {
  title?: string;
  text?: string;
  filename?: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  if (Capacitor.isNativePlatform()) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: options?.title || document.title || 'TripVerse Travel Guide',
          text: options?.text || 'TripVerse Travel Itinerary & Dossier (https://trip-verse.com)',
        });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }
  }

  try {
    window.print();
  } catch (err) {
    console.warn('[TripVerse] Print dialog unavailable on this device:', err);
  }
}

/**
 * Programmatically and smoothly dismiss the native Capacitor splash screen with hardware alpha fade.
 */
export async function hideNativeSplashScreen(fadeOutDuration = 400): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await SplashScreen.hide({ fadeOutDuration });
    } catch (e) {
      console.warn('Splash screen hide error:', e);
    }
  }
}

/**
 * Synchronize the application icon badge count across Windows Taskbar and Android Launcher (PWA & Web)
 */
export function syncAppBadge(count: number): void {
  if (typeof navigator === 'undefined') return;
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        (navigator as any).setAppBadge(count).catch(() => {});
      } else {
        (navigator as any).clearAppBadge().catch(() => {});
      }
    }
  } catch {
    // Ignore environments where App Badging is not supported or permitted
  }
}


