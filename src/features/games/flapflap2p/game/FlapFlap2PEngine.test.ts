import type { Application } from 'pixi.js'
import { Container } from 'pixi.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FLAPFLAP_CONFIG } from '../../flapflap/config/flapflapConfig'
import { FlapFlap2PEngine } from './FlapFlap2PEngine'

vi.mock('pixi.js', () => import('@/test/pixiStub'))

const STEP = 0.05

function setup() {
  const engine = new FlapFlap2PEngine({ stage: new Container() } as unknown as Application)
  const onStateChange = vi.fn()
  const onReadyChange = vi.fn()
  engine.setCallbacks(onStateChange, onReadyChange)
  return { engine, onStateChange, onReadyChange }
}

function startPlaying(engine: FlapFlap2PEngine) {
  engine.flap('P1')
  engine.flap('P2')
  engine.update(FLAPFLAP_CONFIG.COUNTDOWN_SECONDS + 0.1)
}

describe('FlapFlap2PEngine', () => {
  let ctx: ReturnType<typeof setup>

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ctx = setup()
  })

  it('waits until both players have flapped to ready', () => {
    ctx.engine.flap('P1')
    expect(ctx.engine.getState()).toBe('WAITING')
    expect(ctx.onReadyChange).toHaveBeenLastCalledWith({ P1: true, P2: false })

    ctx.engine.flap('P2')
    expect(ctx.engine.getState()).toBe('COUNTDOWN')
    expect(ctx.onStateChange).toHaveBeenLastCalledWith('COUNTDOWN')
  })

  it('does not re-emit when a ready player flaps again', () => {
    ctx.engine.flap('P1')
    ctx.engine.flap('P1')
    expect(ctx.onReadyChange).toHaveBeenCalledTimes(1)
  })

  it('counts down, then starts playing', () => {
    ctx.engine.flap('P1')
    ctx.engine.flap('P2')
    ctx.engine.update(1)
    expect(ctx.engine.getState()).toBe('COUNTDOWN')
    ctx.engine.update(FLAPFLAP_CONFIG.COUNTDOWN_SECONDS)
    expect(ctx.engine.getState()).toBe('PLAYING')
  })

  it('the player who crashes first loses (the lower bird hits the ground first)', () => {
    startPlaying(ctx.engine)
    for (let i = 0; i < 400 && ctx.engine.getState() === 'PLAYING'; i++) ctx.engine.update(STEP)

    expect(ctx.engine.getState()).toBe('GAME_OVER')
    // P2 starts lower, so P2 crashes first and P1 wins.
    expect(ctx.engine.getResult()).toBe('P1')
  })

  it('awards the win to the other player when one hits the ceiling', () => {
    startPlaying(ctx.engine)
    for (let i = 0; i < 400 && ctx.engine.getState() === 'PLAYING'; i++) {
      ctx.engine.flap('P1')
      ctx.engine.update(STEP)
    }
    expect(ctx.engine.getResult()).toBe('P2')
  })

  it('declares a draw when both crash on the same frame', () => {
    startPlaying(ctx.engine)
    ctx.engine.update(10)
    expect(ctx.engine.getResult()).toBe('DRAW')
  })

  it('ignores flaps for gameplay while counting down', () => {
    ctx.engine.flap('P1')
    ctx.engine.flap('P2')
    ctx.engine.flap('P1')
    expect(ctx.engine.getState()).toBe('COUNTDOWN')
  })

  it('restart returns to WAITING with nobody ready and no result', () => {
    startPlaying(ctx.engine)
    ctx.engine.update(10)
    ctx.engine.restart()

    expect(ctx.engine.getState()).toBe('WAITING')
    expect(ctx.engine.getResult()).toBeNull()
    expect(ctx.engine.getScore()).toBe(0)
    expect(ctx.onReadyChange).toHaveBeenLastCalledWith({ P1: false, P2: false })
  })
})
