import { describe, expect, it, vi } from 'vitest'

vi.mock('../components/FlapFlapLauncher', () => ({ FlapFlapLauncher: () => null }))
vi.mock('../drawit/components/DrawItGame', () => ({ DrawItGame: () => null }))
vi.mock('../holeinthewall/components/HoleInTheWallGame', () => ({ HoleInTheWallGame: () => null }))

import { GAMES_REGISTRY } from './gamesConfig'

describe('GAMES_REGISTRY', () => {
  it('registers flapflap, drawit and holeinthewall', () => {
    expect(GAMES_REGISTRY.map((g) => g.id)).toEqual(['flapflap', 'drawit', 'holeinthewall'])
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
