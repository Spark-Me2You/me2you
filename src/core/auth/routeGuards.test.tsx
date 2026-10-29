import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { AuthContext, type AuthContextType, type AuthMode } from './AuthContext'
import { AdminOnlyRoute } from './AdminOnlyRoute'
import { ProtectedRoute } from './ProtectedRoute'
import { UserProtectedRoute } from './UserProtectedRoute'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))

function renderGuard(
  Guard: React.ComponentType<{ children: React.ReactNode }>,
  auth: { authMode: AuthMode; isLoading?: boolean },
) {
  const value = {
    authMode: auth.authMode,
    isLoading: auth.isLoading ?? false,
    isAuthenticated: auth.authMode !== 'unauthenticated',
  } as AuthContextType

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/secret']}>
        <Routes>
          <Route path="/secret" element={<Guard><p>secret</p></Guard>} />
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/app" element={<p>app page</p>} />
          <Route path="/user" element={<p>user landing</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('route guards', () => {
  beforeEach(() => silenceConsole())

  describe('ProtectedRoute (admin or kiosk)', () => {
    it.each(['admin', 'kiosk'] as const)('renders children for %s', (authMode) => {
      renderGuard(ProtectedRoute, { authMode })
      expect(screen.getByText('secret')).toBeInTheDocument()
    })

    it.each(['unauthenticated', 'user'] as const)('redirects %s to /login', (authMode) => {
      renderGuard(ProtectedRoute, { authMode })
      expect(screen.getByText('login page')).toBeInTheDocument()
    })

    it('shows a loading state instead of redirecting while auth resolves', () => {
      renderGuard(ProtectedRoute, { authMode: 'unauthenticated', isLoading: true })
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByText('login page')).not.toBeInTheDocument()
    })
  })

  describe('AdminOnlyRoute', () => {
    it('renders children for admin', () => {
      renderGuard(AdminOnlyRoute, { authMode: 'admin' })
      expect(screen.getByText('secret')).toBeInTheDocument()
    })

    it('sends kiosk sessions to /app', () => {
      renderGuard(AdminOnlyRoute, { authMode: 'kiosk' })
      expect(screen.getByText('app page')).toBeInTheDocument()
    })

    it('sends unauthenticated visitors to /login', () => {
      renderGuard(AdminOnlyRoute, { authMode: 'unauthenticated' })
      expect(screen.getByText('login page')).toBeInTheDocument()
    })

    it('waits while loading', () => {
      renderGuard(AdminOnlyRoute, { authMode: 'unauthenticated', isLoading: true })
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('UserProtectedRoute', () => {
    it('renders children for a mobile user', () => {
      renderGuard(UserProtectedRoute, { authMode: 'user' })
      expect(screen.getByText('secret')).toBeInTheDocument()
    })

    it.each(['admin', 'kiosk', 'unauthenticated'] as const)('redirects %s to /user', (authMode) => {
      renderGuard(UserProtectedRoute, { authMode })
      expect(screen.getByText('user landing')).toBeInTheDocument()
    })

    it('waits while loading', () => {
      renderGuard(UserProtectedRoute, { authMode: 'unauthenticated', isLoading: true })
      expect(screen.getByText('loading...')).toBeInTheDocument()
    })
  })
})

describe('useAuth', () => {
  it('throws outside an AuthProvider', async () => {
    silenceConsole('error')
    const { useAuth } = await import('./AuthContext')
    function Probe() {
      useAuth()
      return null
    }
    expect(() => render(<Probe />)).toThrow('useAuth must be used within AuthProvider')
  })
})
