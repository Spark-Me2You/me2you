import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DRAW_DURATION_SEC } from '../config/drawitConfig'
import { ConfirmModal } from './ConfirmModal'
import { Timer } from './Timer'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Each tick is scheduled by an effect after a re-render, so advance one second per act().
const tickSeconds = (n: number) => {
  for (let i = 0; i < n; i++) act(() => { vi.advanceTimersByTime(1000) })
}

describe('Timer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts at the full duration', () => {
    render(<Timer onExpire={vi.fn()} />)
    expect(screen.getByText(fmt(DRAW_DURATION_SEC))).toBeInTheDocument()
  })

  it('counts down once per second', () => {
    render(<Timer onExpire={vi.fn()} />)
    tickSeconds(3)
    expect(screen.getByText(fmt(DRAW_DURATION_SEC - 3))).toBeInTheDocument()
  })

  it('calls onExpire exactly when it reaches zero', () => {
    const onExpire = vi.fn()
    render(<Timer onExpire={onExpire} />)

    tickSeconds(DRAW_DURATION_SEC - 1)
    expect(onExpire).not.toHaveBeenCalled()

    tickSeconds(1)
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })
})

describe('ConfirmModal', () => {
  it('shows the message and reports yes / no', () => {
    const onYes = vi.fn()
    const onNo = vi.fn()
    render(<ConfirmModal message="Quit?" onYes={onYes} onNo={onNo} />)
    expect(screen.getByText('Quit?')).toBeInTheDocument()

    screen.getByRole('button', { name: 'yes' }).click()
    screen.getByRole('button', { name: 'no' }).click()
    expect(onYes).toHaveBeenCalledTimes(1)
    expect(onNo).toHaveBeenCalledTimes(1)
  })
})
