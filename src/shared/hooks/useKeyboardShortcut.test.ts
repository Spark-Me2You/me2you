import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcut } from './useKeyboardShortcut'

const press = (key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key, cancelable: true, ...init })
  window.dispatchEvent(event)
  return event
}

describe('useKeyboardShortcut', () => {
  it('fires on the matching key and prevents default', () => {
    const cb = vi.fn()
    renderHook(() => useKeyboardShortcut('k', cb))
    const event = press('k')
    expect(cb).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('ignores other keys', () => {
    const cb = vi.fn()
    renderHook(() => useKeyboardShortcut('k', cb))
    press('j')
    expect(cb).not.toHaveBeenCalled()
  })

  it('requires the declared modifiers', () => {
    const cb = vi.fn()
    const modifiers = { ctrl: true, shift: true }
    renderHook(() => useKeyboardShortcut('k', cb, modifiers))
    press('k')
    press('k', { ctrlKey: true })
    expect(cb).not.toHaveBeenCalled()
    press('k', { ctrlKey: true, shiftKey: true })
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('removes the listener on unmount', () => {
    const cb = vi.fn()
    const { unmount } = renderHook(() => useKeyboardShortcut('k', cb))
    unmount()
    press('k')
    expect(cb).not.toHaveBeenCalled()
  })
})
