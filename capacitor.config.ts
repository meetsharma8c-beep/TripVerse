import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.tripverse.app',
  appName: 'TripVerse',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#070C16',
  },
  android: {
    backgroundColor: '#070C16',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false,
      launchFadeOutDuration: 300,
      backgroundColor: '#070C16',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
    SystemBars: {
      style: 'DEFAULT',
      insetsHandling: 'css',
    },
  },
};

export default config;
