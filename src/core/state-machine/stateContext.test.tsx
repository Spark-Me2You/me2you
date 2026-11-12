import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AppState } from './appStateMachine'
import { StateProvider, useAppState } from './stateContext'

const wrapper = ({ children }: { children: ReactNode }) => <StateProvider>{children}</StateProvider>

describe('StateProvider / useAppState', () => {
  it('starts in IDLE', () => {
    const { result } = renderHook(() => useAppState(), { wrapper })
    expect(result.current.currentState).toBe(AppState.IDLE)
  })

  it('transitionTo changes the state', () => {
    const { result } = renderHook(() => useAppState(), { wrapper })
    act(() => result.current.transitionTo(AppState.HUB))
    expect(result.current.currentState).toBe(AppState.HUB)
  })

  it('keeps transitionTo stable across state changes', () => {
    const { result } = renderHook(() => useAppState(), { wrapper })
    const first = result.current.transitionTo
    act(() => result.current.transitionTo(AppState.GAMES))
    expect(result.current.transitionTo).toBe(first)
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useAppState())).toThrow('must be used within a StateProvider')
  })
})
