import { describe, expect, it } from 'vitest'
import { AppState, transitions } from './appStateMachine'

describe('appStateMachine transitions', () => {
  const states = Object.values(AppState)

  it('only references defined states', () => {
    for (const t of transitions) {
      expect(states).toContain(t.from)
      expect(states).toContain(t.to)
    }
  })

  it('has no duplicate from/to pairs or event names from the same state', () => {
    const pairs = transitions.map((t) => `${t.from}>${t.to}`)
    expect(new Set(pairs).size).toBe(pairs.length)
    const events = transitions.map((t) => `${t.from}:${t.event}`)
    expect(new Set(events).size).toBe(events.length)
  })

  it('lets every state other than AUTH and ONBOARDING reach IDLE or be reachable from it', () => {
    const fromIdle = transitions.filter((t) => t.from === AppState.IDLE).map((t) => t.to)
    expect(fromIdle).toEqual(expect.arrayContaining([AppState.AUTH, AppState.DISCOVERY, AppState.HUB, AppState.GAMES]))
    for (const s of [AppState.DISCOVERY, AppState.HUB, AppState.GAMES]) {
      expect(transitions).toContainEqual(expect.objectContaining({ from: s, to: AppState.IDLE }))
    }
  })

  it('routes AUTH to ONBOARDING for new users and HUB for existing ones', () => {
    expect(transitions).toContainEqual({ from: AppState.AUTH, to: AppState.ONBOARDING, event: 'NEW_USER' })
    expect(transitions).toContainEqual({ from: AppState.AUTH, to: AppState.HUB, event: 'EXISTING_USER' })
  })
})
