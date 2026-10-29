import type { Application } from 'pixi.js'
import { Container } from 'pixi.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlapFlapEngine } from './FlapFlapEngine'

vi.mock('pixi.js', () => import('@/test/pixiStub'))

const STEP = 0.05

function setup() {
  const engine = new FlapFlapEngine({ stage: new Container() } as unknown as Application)
  const onStateChange = vi.fn()
  const onScoreChange = vi.fn()
  engine.setCallbacks(onStateChange, onScoreChange)
  return { engine, onStateChange, onScoreChange }
}

/** Let the bird fall untouched until the engine leaves PLAYING. */
function fallUntilOver(engine: FlapFlapEngine) {
  for (let i = 0; i < 400 && engine.getState() === 'PLAYING'; i++) engine.update(STEP)
}

describe('FlapFlapEngine', () => {
  let ctx: ReturnType<typeof setup>

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ctx = setup()
  })

  it('starts in READY and ignores updates', () => {
    ctx.engine.update(1)
    expect(ctx.engine.getState()).toBe('READY')
    expect(ctx.engine.getScore()).toBe(0)
  })

  it('the first flap starts the game', () => {
    ctx.engine.flap()
    expect(ctx.engine.getState()).toBe('PLAYING')
    expect(ctx.onStateChange).toHaveBeenCalledWith('PLAYING')
  })

  it('ends the game when the bird hits the ground', () => {
    ctx.engine.flap()
    fallUntilOver(ctx.engine)
    expect(ctx.engine.getState()).toBe('GAME_OVER')
    expect(ctx.onStateChange).toHaveBeenLastCalledWith('GAME_OVER')
  })

  it('ends the game when the bird hits the ceiling', () => {
    ctx.engine.flap()
    for (let i = 0; i < 400 && ctx.engine.getState() === 'PLAYING'; i++) {
      ctx.engine.flap()
      ctx.engine.update(STEP)
    }
    expect(ctx.engine.getState()).toBe('GAME_OVER')
  })

  it('reports score and high score when the game ends', () => {
    ctx.engine.flap()
    fallUntilOver(ctx.engine)
    expect(ctx.onScoreChange).toHaveBeenLastCalledWith(0, 0)
  })

  it('a flap after game over restarts, unless restart is locked', () => {
    ctx.engine.flap()
    fallUntilOver(ctx.engine)

    ctx.engine.setRestartLocked(true)
    ctx.engine.flap()
    expect(ctx.engine.getState()).toBe('GAME_OVER')

    ctx.engine.setRestartLocked(false)
    ctx.engine.flap()
    expect(ctx.engine.getState()).toBe('READY')
  })

  it('restart() unlocks and resets to READY', () => {
    ctx.engine.flap()
    fallUntilOver(ctx.engine)
    ctx.engine.setRestartLocked(true)
    ctx.engine.restart()
    expect(ctx.engine.getState()).toBe('READY')
    expect(ctx.engine.getScore()).toBe(0)
  })
})
