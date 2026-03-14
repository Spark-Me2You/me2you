import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/core/auth'
import './index.css'
import App from './App.tsx'

/**
 * Main entry point
 * Wraps app with Router and Auth providers
 * Note: StateProvider is now in AppContainer.tsx
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
