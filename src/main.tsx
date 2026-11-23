import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/liquid-glass.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'
import { initDeviceServices } from './services/deviceService'
import { initAnalytics } from './services/analyticsService'
import { initTelemetry } from './services/telemetryService'

// Initialize native Capacitor status bar, splash screen, PWA Service Worker, Analytics, and Web Vitals Telemetry
initDeviceServices();
initAnalytics();
initTelemetry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

