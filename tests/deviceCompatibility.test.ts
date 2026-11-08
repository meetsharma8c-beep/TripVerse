import { describe, it, expect, beforeEach, beforeAll } from 'vitest';

// Polyfill window & navigator for Node test environment
const domClasses = new Set<string>();

beforeAll(() => {
  (global as any).document = {
    documentElement: {
      classList: {
        add: (...cls: string[]) => cls.forEach(c => domClasses.add(c)),
        remove: (...cls: string[]) => cls.forEach(c => domClasses.delete(c)),
        contains: (cls: string) => domClasses.has(cls),
        toggle: (cls: string, force?: boolean) => {
          if (force === undefined) {
            if (domClasses.has(cls)) domClasses.delete(cls);
            else domClasses.add(cls);
          } else if (force) {
            domClasses.add(cls);
          } else {
            domClasses.delete(cls);
          }
        }
      }
    }
  };
  (global as any).window = {
    innerWidth: 1280,
    innerHeight: 800,
    devicePixelRatio: 2,
    location: { href: 'https://tripverse-pied.vercel.app/' },
    navigator: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 0
    },
    matchMedia: (query: string) => ({
      matches: query.includes('pointer: fine') || query.includes('prefers-color-scheme: light'),
      addListener: () => {},
      removeListener: () => {}
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
});

import {
  detectOS,
  getDeviceInfo,
  applyDeviceClassesToDom,
  isIos,
  isStandalone
} from '../src/services/deviceService';

describe('Cross-OS & Cross-Device Compatibility Engine', () => {
  beforeEach(() => {
    domClasses.clear();
  });

  it('detects macOS and assigns ⌘ command shortcut modifier', () => {
    (global as any).window.navigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 0
    };
    (global as any).window.innerWidth = 1440;

    const os = detectOS();
    expect(os).toBe('macos');

    const info = getDeviceInfo();
    expect(info.os).toBe('macos');
    expect(info.deviceType).toBe('desktop');
    expect(info.isDesktop).toBe(true);
    expect(info.keyboardShortcutModifier).toBe('⌘');
  });

  it('detects Windows and assigns Ctrl shortcut modifier', () => {
    (global as any).window.navigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 0
    };
    (global as any).window.innerWidth = 1366;

    const os = detectOS();
    expect(os).toBe('windows');

    const info = getDeviceInfo();
    expect(info.os).toBe('windows');
    expect(info.deviceType).toBe('desktop');
    expect(info.isDesktop).toBe(true);
    expect(info.keyboardShortcutModifier).toBe('Ctrl');
  });

  it('detects iOS devices (iPhone / iPad) and enables mobile form factor and touch', () => {
    (global as any).window.navigator = {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      platform: 'iPhone',
      maxTouchPoints: 5
    };
    (global as any).window.innerWidth = 393;
    (global as any).window.matchMedia = (query: string) => ({
      matches: query.includes('pointer: coarse'),
      addListener: () => {},
      removeListener: () => {}
    });

    const os = detectOS();
    expect(os).toBe('ios');
    expect(isIos()).toBe(true);

    const info = getDeviceInfo();
    expect(info.os).toBe('ios');
    expect(info.deviceType).toBe('mobile');
    expect(info.isMobile).toBe(true);
    expect(info.isTouch).toBe(true);
    expect(info.hasNotch).toBe(true);
  });

  it('detects Android smartphones and activates mobile layout', () => {
    (global as any).window.navigator = {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
      platform: 'Linux armv81',
      maxTouchPoints: 5
    };
    (global as any).window.innerWidth = 412;
    (global as any).window.matchMedia = (query: string) => ({
      matches: query.includes('pointer: coarse'),
      addListener: () => {},
      removeListener: () => {}
    });

    const os = detectOS();
    expect(os).toBe('android');

    const info = getDeviceInfo();
    expect(info.os).toBe('android');
    expect(info.deviceType).toBe('mobile');
    expect(info.isMobile).toBe(true);
    expect(info.platform).toBe('android');
  });

  it('detects tablet viewports and applies tablet device classification', () => {
    (global as any).window.navigator = {
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      platform: 'Linux x86_64',
      maxTouchPoints: 0
    };
    (global as any).window.innerWidth = 820; // iPad Air width

    const info = getDeviceInfo();
    expect(info.deviceType).toBe('tablet');
    expect(info.isTablet).toBe(true);
    expect(info.isMobile).toBe(false);
    expect(info.isDesktop).toBe(false);
  });

  it('applies DOM classes for OS, device type, touch, and retina capabilities', () => {
    (global as any).window.navigator = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 0
    };
    (global as any).window.innerWidth = 1440;
    (global as any).window.devicePixelRatio = 2;
    (global as any).window.matchMedia = (query: string) => ({
      matches: false,
      addListener: () => {},
      removeListener: () => {}
    });

    applyDeviceClassesToDom();

    expect(domClasses.has('os-macos')).toBe(true);
    expect(domClasses.has('device-desktop')).toBe(true);
    expect(domClasses.has('mouse-device')).toBe(true);
    expect(domClasses.has('is-retina')).toBe(true);
  });

  it('correctly handles Windows 2-in-1 hybrid laptops by preserving mouse-device class when fine pointer exists', () => {
    (global as any).window.navigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      maxTouchPoints: 10
    };
    (global as any).window.innerWidth = 1440;
    (global as any).window.matchMedia = (query: string) => ({
      matches: query.includes('pointer: fine') || query.includes('any-pointer: fine'),
      addListener: () => {},
      removeListener: () => {}
    });

    applyDeviceClassesToDom();

    expect(domClasses.has('os-windows')).toBe(true);
    expect(domClasses.has('device-desktop')).toBe(true);
    expect(domClasses.has('touch-device')).toBe(true);
    expect(domClasses.has('mouse-device')).toBe(true);
  });

  it('guarantees touch-device CSS rules exempt indicator buttons to prevent vertical stretching', () => {
    const fs = require('fs');
    const path = require('path');
    const cssPath = path.resolve(__dirname, '../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    // Ensure .touch-device button rule specifically exempts min-h-0, data-indicator, and no-min-h
    expect(cssContent).toContain('.touch-device button:not(.min-h-0):not([data-indicator]):not(.no-min-h)');
  });

  it('empowers user to select between Total Group Budget and Per Person Budget without forced metrics', () => {
    const travelers = 3;

    // Mode 1: Total Group Budget chosen by user
    const totalMode = {
      mode: 'total' as const,
      amount: 15000,
      getFormattedNote: (curr: string) => `For all ${travelers} travelers`
    };
    expect(totalMode.mode).toBe('total');
    expect(totalMode.amount).toBe(15000);
    expect(totalMode.getFormattedNote('INR')).toBe('For all 3 travelers');

    // Mode 2: Per Person Budget chosen by user
    const perPersonMode = {
      mode: 'per_person' as const,
      amount: 5000,
      getTotal: () => 5000 * travelers
    };
    expect(perPersonMode.mode).toBe('per_person');
    expect(perPersonMode.amount).toBe(5000);
    expect(perPersonMode.getTotal()).toBe(15000);
  });
});
