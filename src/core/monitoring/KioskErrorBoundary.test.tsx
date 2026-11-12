import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { ErrorBoundary } from './errorBoundary'
import {
  KIOSK_AUTO_RECOVER_MS,
  KIOSK_RELOAD_WINDOW_MS,
  KioskErrorBoundary,
} from './KioskErrorBoundary'

let shouldThrow = true
function Flaky() {
  if (shouldThrow) throw new Error('secret internal detail')
  return <p>kiosk is fine</p>
}

describe('ErrorBoundary reset', () => {
  beforeEach(() => {
    silenceConsole('error')
    shouldThrow = true
  })

  it('does not show the raw error message by default', () => {
    render(<ErrorBoundary><Flaky /></ErrorBoundary>)
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument()
  })

  it('renders children again after reset()', () => {
    render(
      <ErrorBoundary fallback={({ reset }) => <button onClick={reset}>retry</button>}>
        <Flaky />
      </ErrorBoundary>,
    )
    shouldThrow = false
    fireEvent.click(screen.getByText('retry'))
    expect(screen.getByText('kiosk is fine')).toBeInTheDocument()
  })

  it('resets when a reset key changes and calls onReset', () => {
    const onReset = vi.fn()
    const { rerender } = render(
      <ErrorBoundary fallback={<p>crashed</p>} resetKeys={['a']} onReset={onReset}>
        <Flaky />
      </ErrorBoundary>,
    )
    expect(screen.getByText('crashed')).toBeInTheDocument()
    shouldThrow = false
    rerender(
      <ErrorBoundary fallback={<p>crashed</p>} resetKeys={['b']} onReset={onReset}>
        <Flaky />
      </ErrorBoundary>,
    )
    expect(screen.getByText('kiosk is fine')).toBeInTheDocument()
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})

describe('KioskErrorBoundary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    silenceConsole('error')
    shouldThrow = true
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a brand fallback without the raw error', () => {
    render(<KioskErrorBoundary onRestart={vi.fn()}><Flaky /></KioskErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('something went wrong')
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument()
  })

  it('start over restarts and renders the children again', () => {
    const onRestart = vi.fn(() => {
      shouldThrow = false
    })
    render(<KioskErrorBoundary onRestart={onRestart}><Flaky /></KioskErrorBoundary>)
    fireEvent.click(screen.getByRole('button', { name: 'start over' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
    expect(screen.getByText('kiosk is fine')).toBeInTheDocument()
  })

  it('recovers by itself after the auto-recover delay', () => {
    const onRestart = vi.fn(() => {
      shouldThrow = false
    })
    render(<KioskErrorBoundary onRestart={onRestart}><Flaky /></KioskErrorBoundary>)
    act(() => {
      vi.advanceTimersByTime(KIOSK_AUTO_RECOVER_MS - 1)
    })
    expect(onRestart).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onRestart).toHaveBeenCalledTimes(1)
    expect(screen.getByText('kiosk is fine')).toBeInTheDocument()
  })

  it('reloads when it crashes again right after a restart', () => {
    const onReload = vi.fn()
    // restart does not fix the crash
    render(<KioskErrorBoundary onRestart={vi.fn()} onReload={onReload}><Flaky /></KioskErrorBoundary>)
    expect(onReload).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'start over' }))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('does not reload when the next crash is outside the window', () => {
    const onReload = vi.fn()
    const { rerender } = render(
      <KioskErrorBoundary onRestart={() => { shouldThrow = false }} onReload={onReload}>
        <Flaky />
      </KioskErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'start over' }))
    expect(screen.getByText('kiosk is fine')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(KIOSK_RELOAD_WINDOW_MS + 1)
    })
    // crash again later: a plain fallback, no reload
    shouldThrow = true
    rerender(
      <KioskErrorBoundary onRestart={() => { shouldThrow = false }} onReload={onReload}>
        <Flaky key="again" />
      </KioskErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onReload).not.toHaveBeenCalled()
  })
})
