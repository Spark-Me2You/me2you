import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StateProvider } from '@/core/state-machine'
import './index.css'
import App from './App.tsx'

/**
 * Main entry point
 * TODO: Add all necessary providers (state, theme, etc.)
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StateProvider>
      <App />
    </StateProvider>
  </StrictMode>,
)
