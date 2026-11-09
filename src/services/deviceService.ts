import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';

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

export function applyDeviceClassesToDom(): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const info = getDeviceInfo();
  const root = document.documentElement;

  // OS Classes
  root.classList.remove('os-ios', 'os-android', 'os-macos', 'os-windows', 'os-linux', 'os-chromeos', 'os-unknown');
  root.classList.add(`os-${info.os}`);

  // Device Form Factor Classes
  root.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
  root.classList.add(`device-${info.deviceType}`);

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
    window.addEventListener('resize', applyDeviceClassesToDom, { passive: true });
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


