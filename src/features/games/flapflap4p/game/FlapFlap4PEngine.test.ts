import type { Application } from 'pixi.js'
import { Container } from 'pixi.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FLAPFLAP_CONFIG } from '../../flapflap/config/flapflapConfig'
import { FlapFlap4PEngine } from './FlapFlap4PEngine'
import type { PlayerId } from '../types/flapflap4p'

vi.mock('pixi.js', () => import('@/test/pixiStub'))

const STEP = 0.05
const NONE = { P1: false, P2: false, P3: false, P4: false }

function setup() {
  const engine = new FlapFlap4PEngine({ stage: new Container() } as unknown as Application)
  const onStateChange = vi.fn()
  const onReadyChange = vi.fn()
  const onEliminatedChange = vi.fn()
  engine.setCallbacks(onStateChange, onReadyChange, onEliminatedChange)
  return { engine, onStateChange, onReadyChange, onEliminatedChange }
}

function startPlaying(engine: FlapFlap4PEngine, ids: PlayerId[]) {
  // Detected players hold the countdown until they have all joined.
  engine.setPresent({
    P1: ids.includes('P1'),
    P2: ids.includes('P2'),
    P3: ids.includes('P3'),
    P4: ids.includes('P4'),
  })
  for (const id of ids) engine.flap(id)
  engine.update(FLAPFLAP_CONFIG.COUNTDOWN_SECONDS + 0.1)
}

/** Peek at a bird for assertions the public API doesn't expose. */
function bird(engine: FlapFlap4PEngine, id: PlayerId) {
  return (engine as unknown as { players: Record<PlayerId, { bird: { velocity: number; y: number; container: { visible: boolean } } }> }).players[id].bird
}

describe('FlapFlap4PEngine', () => {
  let ctx: ReturnType<typeof setup>

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    ctx = setup()
  })

  it('needs at least two joined players before counting down', () => {
    ctx.engine.flap('P1')
    expect(ctx.engine.getState()).toBe('WAITING')
    ctx.engine.flap('P4')
    expect(ctx.engine.getState()).toBe('COUNTDOWN')
    expect(ctx.onStateChange).toHaveBeenLastCalledWith('COUNTDOWN')
    expect(ctx.onReadyChange).toHaveBeenLastCalledWith({ P1: true, P2: false, P3: false, P4: true })
  })

  it('waits for every detected player to join', () => {
    ctx.engine.setPresent({ P1: true, P2: true, P3: true, P4: false })
    ctx.engine.flap('P1')
    ctx.engine.flap('P2')
    expect(ctx.engine.getState()).toBe('WAITING')
    ctx.engine.flap('P3')
    expect(ctx.engine.getState()).toBe('COUNTDOWN')
  })

  it('starts when the last unjoined player leaves the camera', () => {
    ctx.engine.setPresent({ P1: true, P2: true, P3: true, P4: false })
    ctx.engine.flap('P1')
    ctx.engine.flap('P2')
    ctx.engine.setPresent({ ...NONE, P1: true, P2: true })
    expect(ctx.engine.getState()).toBe('COUNTDOWN')
  })

  it('counts down, then starts playing', () => {
    ctx.engine.flap('P1')
    ctx.engine.flap('P2')
    ctx.engine.update(1)
    expect(ctx.engine.getState()).toBe('COUNTDOWN')
    ctx.engine.update(FLAPFLAP_CONFIG.COUNTDOWN_SECONDS)
    expect(ctx.engine.getState()).toBe('PLAYING')
  })

  it('eliminates a crashed player and keeps the round going', () => {
    startPlaying(ctx.engine, ['P1', 'P2', 'P3'])
    for (let i = 0; i < 400 && ctx.onEliminatedChange.mock.calls.length === 0; i++) ctx.engine.update(STEP)

    // P3 starts lowest, so it hits the ground first.
    expect(ctx.engine.getEliminated()).toEqual({ P1: false, P2: false, P3: true, P4: false })
    expect(ctx.engine.getState()).toBe('PLAYING')
    expect(bird(ctx.engine, 'P3').container.visible).toBe(false)
    expect(bird(ctx.engine, 'P1').container.visible).toBe(true)
  })

  it('ignores flaps from eliminated players', () => {
    startPlaying(ctx.engine, ['P1', 'P2', 'P3'])
    for (let i = 0; i < 400 && !ctx.engine.getEliminated().P3; i++) ctx.engine.update(STEP)
    const before = bird(ctx.engine, 'P3').velocity
    ctx.engine.flap('P3')
    expect(bird(ctx.engine, 'P3').velocity).toBe(before)
  })

  it('ignores flaps from players who never joined', () => {
    startPlaying(ctx.engine, ['P1', 'P2'])
    ctx.engine.flap('P4')
    expect(bird(ctx.engine, 'P4').velocity).toBe(0)
  })

  it('ends with the last survivor as winner', () => {
    startPlaying(ctx.engine, ['P1', 'P2', 'P3'])
    for (let i = 0; i < 400 && ctx.engine.getState() === 'PLAYING'; i++) ctx.engine.update(STEP)

    expect(ctx.engine.getState()).toBe('GAME_OVER')
    expect(ctx.engine.getResult()).toBe('P1')
    expect(ctx.engine.getFinalists()).toEqual(['P1'])
    expect(ctx.engine.getEliminated()).toEqual({ P1: false, P2: true, P3: true, P4: false })
  })

  it('declares a draw when the last birds crash on the same step', () => {
    startPlaying(ctx.engine, ['P1', 'P2', 'P3', 'P4'])
    ctx.engine.update(10)
    expect(ctx.engine.getState()).toBe('GAME_OVER')
    expect(ctx.engine.getResult()).toBe('DRAW')
    expect(ctx.engine.getFinalists()).toEqual(['P1', 'P2', 'P3', 'P4'])
  })

  it('restart resets every player, including eliminated ones', () => {
    startPlaying(ctx.engine, ['P1', 'P2', 'P3'])
    for (let i = 0; i < 400 && ctx.engine.getState() === 'PLAYING'; i++) ctx.engine.update(STEP)
    ctx.engine.restart()

    expect(ctx.engine.getState()).toBe('WAITING')
    expect(ctx.engine.getResult()).toBeNull()
    expect(ctx.engine.getFinalists()).toEqual([])
    expect(ctx.engine.getScore()).toBe(0)
    expect(ctx.engine.getEliminated()).toEqual(NONE)
    expect(ctx.onReadyChange).toHaveBeenLastCalledWith(NONE)
    expect(ctx.onEliminatedChange).toHaveBeenLastCalledWith(NONE)
    expect(bird(ctx.engine, 'P3').velocity).toBe(0)
  })
})
