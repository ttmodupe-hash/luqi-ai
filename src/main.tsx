import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// Core screens use explicit REST clients. Optional query tools load their
// existing provider with their route instead of adding it to every startup.

// The public shell registers its worker in index.html. Keep one registration
// owner so competing script URLs cannot replace each other on every page load.

// Keep optional diagnostics outside the initial static graph. Privacy choices
// are local and telemetry is never started for visitors without prior consent.
try {
  if (typeof window !== 'undefined' &&
      window.localStorage.getItem('luqi_analytics_consent') === 'yes') {
    void import('./lib/uiTelemetry')
      .then(({ startUiTelemetry }) => startUiTelemetry())
      .catch(() => { /* Diagnostics must never block the application. */ });
  }
} catch { /* Storage may be unavailable in private/older browsers. */ }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
