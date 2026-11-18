import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { silenceConsole } from '@/test/console'
import { ErrorBoundary } from './errorBoundary'
import { PageCrashFallback } from './PageCrashFallback'

function Boom(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  beforeEach(() => silenceConsole('error'))

  it('renders children when nothing throws', () => {
    render(<ErrorBoundary fallback={<PageCrashFallback />}><p>fine</p></ErrorBoundary>)
    expect(screen.getByText('fine')).toBeInTheDocument()
  })

  it('shows the page crash fallback with a way out instead of a blank page', () => {
    render(<ErrorBoundary fallback={<PageCrashFallback />}><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('something went wrong')
    expect(screen.getByRole('button', { name: 'try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'go home' })).toBeInTheDocument()
  })
})
