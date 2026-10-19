import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FLAPFLAP_CONFIG as C } from '../config/flapflapConfig'
import { PipeManager } from './PipeManager'

vi.mock('pixi.js', () => import('@/test/pixiStub'))

const SPAWN_TIME = C.PIPE_SPAWN_INTERVAL + 1
const PLAYABLE = C.GAME_HEIGHT - C.GROUND_HEIGHT
const MIN_GAP_Y = C.MIN_PIPE_HEIGHT + C.PIPE_GAP / 2
const MAX_GAP_Y = PLAYABLE - C.MIN_PIPE_HEIGHT - C.PIPE_GAP / 2

/** Bird hitbox centered vertically at `y` at the bird's fixed X. */
const birdAt = (y: number) => ({
  x: C.BIRD_X - C.BIRD_WIDTH / 2,
  y: y - C.BIRD_HEIGHT / 2,
  width: C.BIRD_WIDTH,
  height: C.BIRD_HEIGHT,
})

/** Seconds until a pipe spawned at the right edge overlaps the bird's X. */
const SECONDS_TO_BIRD = (C.GAME_WIDTH + 50 - C.BIRD_X) / C.PIPE_SPEED

describe('PipeManager', () => {
  let pipes: PipeManager

  beforeEach(() => {
    pipes = new PipeManager()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('does not spawn before the spawn interval elapses', () => {
    pipes.update(0.016, C.PIPE_SPAWN_INTERVAL)
    expect(pipes.container.children).toHaveLength(0)
  })

  it('spawns a top and bottom pipe once the interval elapses, only once per interval', () => {
    pipes.update(0, SPAWN_TIME)
    expect(pipes.container.children).toHaveLength(2)
    pipes.update(0, SPAWN_TIME + 10)
    expect(pipes.container.children).toHaveLength(2)
    pipes.update(0, SPAWN_TIME + SPAWN_TIME)
    expect(pipes.container.children).toHaveLength(4)
  })

  it('keeps the gap within the playable area', () => {
    for (const roll of [0, 1]) {
      const fresh = new PipeManager()
      vi.spyOn(Math, 'random').mockReturnValue(roll)
      fresh.update(0, SPAWN_TIME)
      const bottomY = fresh.container.children[1].y
      const gapY = bottomY - C.PIPE_GAP / 2
      expect(gapY).toBeGreaterThanOrEqual(MIN_GAP_Y)
      expect(gapY).toBeLessThanOrEqual(MAX_GAP_Y)
    }
  })

  it('limits how far the gap can rise between consecutive pipes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1)
    pipes.update(0, SPAWN_TIME)
    const firstGapY = pipes.container.children[1].y - C.PIPE_GAP / 2

    vi.spyOn(Math, 'random').mockReturnValue(0)
    pipes.update(0, SPAWN_TIME * 2)
    const secondGapY = pipes.container.children[3].y - C.PIPE_GAP / 2

    expect(firstGapY).toBe(MAX_GAP_Y)
    expect(secondGapY).toBe(firstGapY - C.MAX_PIPE_RISE)
  })

  it('moves pipes left at PIPE_SPEED', () => {
    pipes.update(0, SPAWN_TIME)
    const startX = pipes.container.children[0].x
    pipes.update(0.5, SPAWN_TIME)
    expect(pipes.container.children[0].x).toBeCloseTo(startX - C.PIPE_SPEED * 0.5)
  })

  it('scores exactly once when a pipe passes the bird', () => {
    pipes.update(0, SPAWN_TIME)
    expect(pipes.update(SECONDS_TO_BIRD, SPAWN_TIME)).toBe(0)
    expect(pipes.update(0.5, SPAWN_TIME)).toBe(1)
    expect(pipes.update(0.1, SPAWN_TIME)).toBe(0)
  })

  it('removes and destroys pipes that leave the screen', () => {
    pipes.update(0, SPAWN_TIME)
    const [top, bottom] = pipes.container.children
    pipes.update(10, SPAWN_TIME)
    expect(pipes.container.children).toHaveLength(0)
    expect(top.destroyed).toBe(true)
    expect(bottom.destroyed).toBe(true)
  })

  describe('checkCollision', () => {
    // With random = 0 the gap is centered on MIN_GAP_Y.
    beforeEach(() => {
      pipes.update(0, SPAWN_TIME)
      pipes.update(SECONDS_TO_BIRD, SPAWN_TIME) // pipe now overlaps the bird's X
    })

    it('is clear when the bird is inside the gap', () => {
      expect(pipes.checkCollision(birdAt(MIN_GAP_Y))).toBe(false)
    })

    it('collides with the top pipe', () => {
      expect(pipes.checkCollision(birdAt(MIN_GAP_Y - C.PIPE_GAP / 2))).toBe(true)
    })

    it('collides with the bottom pipe', () => {
      expect(pipes.checkCollision(birdAt(MIN_GAP_Y + C.PIPE_GAP / 2))).toBe(true)
    })

    it('ignores pipes that are not horizontally overlapping', () => {
      pipes.update(1, SPAWN_TIME) // pipe has moved fully past the bird
      expect(pipes.checkCollision(birdAt(0))).toBe(false)
    })
  })

  it('reset clears pipes and allows spawning from the start again', () => {
    pipes.update(0, SPAWN_TIME)
    pipes.reset()
    expect(pipes.container.children).toHaveLength(0)
    pipes.update(0, SPAWN_TIME)
    expect(pipes.container.children).toHaveLength(2)
  })
})
