import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'
import { initDeviceServices } from './services/deviceService'
import { initAnalytics } from './services/analyticsService'

// Initialize native Capacitor status bar, splash screen, PWA Service Worker, and Analytics
initDeviceServices();
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

