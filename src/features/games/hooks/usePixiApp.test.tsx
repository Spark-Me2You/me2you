import { useEffect } from 'react'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePixiApp } from './usePixiApp'

const init = vi.hoisted(() => vi.fn())

vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas')
    ticker = { stop: vi.fn() }
    init = init
    destroy = vi.fn()
  },
}))

let latest: Pick<ReturnType<typeof usePixiApp>, 'isReady' | 'error'>
function Harness() {
  const { containerRef, isReady, error } = usePixiApp({ width: 100, height: 100 })
  useEffect(() => {
    latest = { isReady, error }
  })
  return <div ref={containerRef} />
}

describe('usePixiApp', () => {
  beforeEach(() => {
    init.mockReset()
  })

  it('becomes ready when init resolves', async () => {
    init.mockResolvedValue(undefined)
    render(<Harness />)
    await act(async () => {})
    expect(latest.isReady).toBe(true)
    expect(latest.error).toBeNull()
  })

  it('exposes the error instead of an unhandled rejection when init fails', async () => {
    init.mockRejectedValue(new Error('no webgl'))
    render(<Harness />)
    await act(async () => {})
    expect(latest.isReady).toBe(false)
    expect(latest.error?.message).toBe('no webgl')
  })
})
