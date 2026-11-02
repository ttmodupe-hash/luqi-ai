import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

// Core screens use explicit REST clients. Optional query tools load their
// existing provider with their route instead of adding it to every startup.

// The public shell registers its worker in index.html. Keep one registration
// owner so competing script URLs cannot replace each other on every page load.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
