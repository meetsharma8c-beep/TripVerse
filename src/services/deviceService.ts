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

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  isNative: boolean;
  isStandalone: boolean;
  isMobile: boolean;
  isTablet: boolean;
}

export function getDeviceInfo(): DeviceInfo {
  const isIosDevice = isIos();
  const isAndroid = typeof navigator !== 'undefined' ? /Android/.test(navigator.userAgent) : false;
  const isNative = Capacitor.isNativePlatform();
  const standalone = isStandalone();

  const isMobile = isIosDevice || isAndroid || (typeof window !== 'undefined' && window.innerWidth < 768);
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024;

  let platform: 'ios' | 'android' | 'web' = 'web';
  if (Capacitor.getPlatform() === 'ios' || isIosDevice) {
    platform = 'ios';
  } else if (Capacitor.getPlatform() === 'android' || isAndroid) {
    platform = 'android';
  }

  return {
    platform,
    isNative,
    isStandalone: standalone,
    isMobile,
    isTablet
  };
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

export function initDeviceServices(onBackPress?: () => boolean) {
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
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {});
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
  } catch (e) {
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
  } catch (e) {
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

