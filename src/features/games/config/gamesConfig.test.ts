import { describe, expect, it, vi } from 'vitest'

vi.mock('../components/FlapFlapLauncher', () => ({ FlapFlapLauncher: () => null }))
vi.mock('../drawit/components/DrawItGame', () => ({ DrawItGame: () => null }))

import { GAMES_REGISTRY } from './gamesConfig'

describe('GAMES_REGISTRY', () => {
  it('registers flapflap and drawit', () => {
    expect(GAMES_REGISTRY.map((g) => g.id)).toEqual(['flapflap', 'drawit'])
  })

  it('has unique ids and complete entries', () => {
    expect(new Set(GAMES_REGISTRY.map((g) => g.id)).size).toBe(GAMES_REGISTRY.length)
    for (const game of GAMES_REGISTRY) {
      expect(game.name).toBeTruthy()
      expect(game.description).toBeTruthy()
      expect(typeof game.component).toBe('function')
    }
  })
})
