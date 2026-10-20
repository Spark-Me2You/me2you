import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { HOLE_IN_THE_WALL_CONFIG as C } from '../config/holeInTheWallConfig'
import type { HoleInTheWallState, PlayerId } from '../types/holeInTheWall'
import { HoleInTheWallEngine, type PlayerInputs } from './HoleInTheWallEngine'

const STEP = 0.05 // seconds

const both = (matched: boolean): PlayerInputs => ({
  P1: { present: true, matched },
  P2: { present: true, matched },
})

function run(engine: HoleInTheWallEngine, ms: number, input: PlayerInputs) {
  for (let t = 0; t < ms; t += STEP * 1000) engine.update(STEP, input)
}

/** Advances a fresh engine to the first approaching wall. */
function startPlaying(engine: HoleInTheWallEngine) {
  run(engine, C.PRESENCE_MS + STEP * 1000, both(false))
  run(engine, C.COUNTDOWN_MS + STEP * 1000, both(false))
}

/** Plays one full wall to its verdict, with each player's pose held or not. */
function playWall(engine: HoleInTheWallEngine, p1: boolean, p2: boolean) {
  const input: PlayerInputs = {
    P1: { present: true, matched: p1 },
    P2: { present: true, matched: p2 },
  }
  run(engine, C.WALL_DURATION_MS + STEP * 1000, input)
  run(engine, C.RESOLVE_MS + STEP * 1000, input)
}

describe('HoleInTheWallEngine', () => {
  let engine: HoleInTheWallEngine
  let onState: Mock<(state: HoleInTheWallState) => void>
  let onResolved: Mock<(outcome: Record<PlayerId, boolean>) => void>

  beforeEach(() => {
    engine = new HoleInTheWallEngine()
    onState = vi.fn()
    onResolved = vi.fn()
    engine.setCallbacks(onState, onResolved)
  })

  it('stays WAITING until both players are present', () => {
    run(engine, 5000, { P1: { present: true, matched: false }, P2: { present: false, matched: false } })
    expect(engine.getState()).toBe('WAITING')
  })

  it('counts down once both players are present, then spawns a wall', () => {
    run(engine, C.PRESENCE_MS + STEP * 1000, both(false))
    expect(engine.getState()).toBe('COUNTDOWN')
    expect(engine.getCountdownSeconds()).toBe(3)

    run(engine, C.COUNTDOWN_MS + STEP * 1000, both(false))
    expect(engine.getState()).toBe('PLAYING')
    expect(engine.getWall()).toMatchObject({ phase: 'APPROACH' })
  })

  it('returns to WAITING if a player leaves during the countdown', () => {
    run(engine, C.PRESENCE_MS + STEP * 1000, both(false))
    engine.update(STEP, { P1: { present: true, matched: false }, P2: { present: false, matched: false } })
    expect(engine.getState()).toBe('WAITING')
  })

  it('advances the wall toward the camera', () => {
    startPlaying(engine)
    run(engine, C.WALL_DURATION_MS / 2, both(false))
    expect(engine.getWall()!.progress).toBeGreaterThan(0.4)
    expect(engine.getWall()!.progress).toBeLessThan(0.6)
  })

  it('passes a player who held the pose through arrival and costs the other a life', () => {
    startPlaying(engine)
    playWall(engine, true, false)
    expect(onResolved).toHaveBeenCalledWith({ P1: true, P2: false })
    expect(engine.getLives()).toEqual({ P1: C.LIVES, P2: C.LIVES - 1 })
    expect(engine.getPassed()).toEqual({ P1: 1, P2: 0 })
  })

  it('fails a player who only hits the pose briefly (resets hold when it breaks)', () => {
    startPlaying(engine)
    // Hold the pose for most of the approach, drop it for the last stretch.
    run(engine, C.WALL_DURATION_MS - 300, both(true))
    run(engine, 400, both(false))
    expect(engine.getLives()).toEqual({ P1: C.LIVES - 1, P2: C.LIVES - 1 })
  })

  it('fails a player who leaves the frame even if their last pose matched', () => {
    startPlaying(engine)
    run(engine, C.WALL_DURATION_MS - 200, both(true))
    run(engine, 400, { P1: { present: false, matched: true }, P2: { present: true, matched: true } })
    expect(engine.getLives()).toEqual({ P1: C.LIVES - 1, P2: C.LIVES })
  })

  it('spawns the next wall after the resolve pause', () => {
    startPlaying(engine)
    playWall(engine, true, true)
    expect(engine.getState()).toBe('PLAYING')
    expect(engine.getWall()).toMatchObject({ phase: 'APPROACH' })
    expect(engine.getWall()!.progress).toBeLessThan(0.1)
  })

  it('ends the game when a player runs out of lives; the other wins', () => {
    startPlaying(engine)
    for (let i = 0; i < C.LIVES; i++) playWall(engine, true, false)
    expect(engine.getState()).toBe('GAME_OVER')
    expect(engine.getResult()).toBe('P1')
    expect(onState).toHaveBeenLastCalledWith('GAME_OVER')
  })

  it('calls it a draw when both run out on the same wall', () => {
    startPlaying(engine)
    for (let i = 0; i < C.LIVES; i++) playWall(engine, false, false)
    expect(engine.getResult()).toBe('DRAW')
  })

  it('restart resets lives, scores and returns to WAITING', () => {
    startPlaying(engine)
    for (let i = 0; i < C.LIVES; i++) playWall(engine, true, false)
    engine.restart()
    expect(engine.getState()).toBe('WAITING')
    expect(engine.getLives()).toEqual({ P1: C.LIVES, P2: C.LIVES })
    expect(engine.getPassed()).toEqual({ P1: 0, P2: 0 })
    expect(engine.getResult()).toBeNull()
    expect(engine.getWall()).toBeNull()
  })
})
