import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FLAPFLAP_CONFIG as C } from '../config/flapflapConfig'
import { Bird } from './Bird'

vi.mock('pixi.js', () => import('@/test/pixiStub'))

describe('Bird', () => {
  let bird: Bird

  beforeEach(() => {
    bird = new Bird()
  })

  it('starts at vertical center, at rest, at the fixed X', () => {
    expect(bird.y).toBe(C.GAME_HEIGHT / 2)
    expect(bird.velocity).toBe(0)
    expect(bird.container.x).toBe(C.BIRD_X)
    expect(bird.container.y).toBe(C.GAME_HEIGHT / 2)
  })

  it('honours a custom start Y', () => {
    expect(new Bird({ startY: 100 }).y).toBe(100)
  })

  it('accelerates downward under gravity', () => {
    bird.update(0.1)
    expect(bird.velocity).toBeCloseTo(C.GRAVITY * 0.1)
    expect(bird.y).toBeGreaterThan(C.GAME_HEIGHT / 2)
    expect(bird.container.y).toBe(bird.y)
  })

  it('never exceeds the max fall speed', () => {
    for (let i = 0; i < 100; i++) bird.update(0.1)
    expect(bird.velocity).toBe(C.MAX_FALL_SPEED)
  })

  it('flap sets an upward velocity that moves the bird up', () => {
    const startY = bird.y
    bird.flap()
    expect(bird.velocity).toBe(C.FLAP_VELOCITY)
    bird.update(0.01)
    expect(bird.y).toBeLessThan(startY)
  })

  it('reset restores position and velocity', () => {
    bird.flap()
    bird.update(0.5)
    bird.reset()
    expect(bird.y).toBe(C.GAME_HEIGHT / 2)
    expect(bird.velocity).toBe(0)
  })

  it('reports hitbox bounds centered on the bird', () => {
    expect(bird.getBounds()).toEqual({
      x: C.BIRD_X - C.BIRD_WIDTH / 2,
      y: C.GAME_HEIGHT / 2 - C.BIRD_HEIGHT / 2,
      width: C.BIRD_WIDTH,
      height: C.BIRD_HEIGHT,
    })
  })
})
