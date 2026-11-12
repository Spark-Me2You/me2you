import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GamesView } from './GamesView'

const setEnabled = vi.hoisted(() => vi.fn())
vi.mock('@/core/cv/cursor', () => ({ useCvCursorEnabled: () => ({ setEnabled }) }))
vi.mock('./GamesHub', () => ({ GamesHub: () => <div /> }))
vi.mock('../config/gamesConfig', () => ({ GAMES_REGISTRY: [] }))

describe('GamesView', () => {
  it('re-enables the hand cursor when unmounted mid-game', () => {
    const { unmount } = render(<GamesView />)
    setEnabled.mockClear()
    unmount()
    expect(setEnabled).toHaveBeenCalledWith(true)
  })
})
