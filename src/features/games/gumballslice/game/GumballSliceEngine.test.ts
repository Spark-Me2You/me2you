import type { Application, Texture } from 'pixi.js'
import { Texture as StubTexture } from 'pixi.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HandTrackSample } from '@/core/cv/cursor'
import { GUMBALL_SLICE_CONFIG as C } from '../config/gumballSliceConfig'
import type { HudSnapshot, RoundEndReason, RoundStats } from '../types/gumballSlice'
import { GumballSliceEngine } from './GumballSliceEngine'

/**
 * A scene-graph-only pixi stand-in, richer than src/test/pixiStub (which lacks
 * Sprite, GraphicsContext, Texture, position/scale and the v8 Graphics shape API).
 * Defined here because the shared stub is out of scope for this file.
 */
vi.mock('pixi.js', () => {
  class Point {
    x = 0
    y = 0
    set(x: number, y: number = x) {
      this.x = x
      this.y = y
    }
  }
  class Base {
    position = new Point()
    scale = new Point()
    anchor = new Point()
    children: Base[] = []
    visible = true
    alpha = 1
    tint: unknown = 0xffffff
    rotation = 0
    blendMode = 'normal'
    destroyed = false
    addChild(...kids: Base[]) {
      this.children.push(...kids)
      return kids[0]
    }
    destroy() {
      this.destroyed = true
    }
  }
  class Container extends Base {}
  class Sprite extends Base {
    texture: unknown = null
  }
  class Text extends Base {
    text: string
    constructor(options: { text?: string } = {}) {
      super()
      this.text = options.text ?? ''
    }
  }
  class TextStyle {}
  class GraphicsContext {
    circle() {
      return this
    }
    rect() {
      return this
    }
    fill() {
      return this
    }
    destroy() {}
  }
  class Graphics extends Base {
    context: unknown
    constructor(context?: unknown) {
      super()
      this.context = context
    }
    circle() {
      return this
    }
    rect() {
      return this
    }
    fill() {
      return this
    }
    moveTo() {
      return this
    }
    lineTo() {
      return this
    }
    closePath() {
      return this
    }
    clear() {
      return this
    }
  }
  class Rectangle {
    x: number
    y: number
    width: number
    height: number
    constructor(x: number, y: number, width: number, height: number) {
      this.x = x
      this.y = y
      this.width = width
      this.height = height
    }
  }
  class Texture {
    label: string
    source: unknown
    frame: { x: number; y: number; width: number; height: number }
    constructor(options: { label?: string; source?: unknown; frame?: Texture['frame'] } = {}) {
      this.label = options.label ?? 'half'
      this.source = options.source ?? null
      this.frame = options.frame ?? { x: 0, y: 0, width: 100, height: 100 }
    }
    destroy() {}
  }
  return { Container, Sprite, Text, TextStyle, GraphicsContext, Graphics, Rectangle, Texture }
})

interface StubNode {
  children: StubNode[]
  visible: boolean
  position: { x: number; y: number }
  texture?: { label: string }
  destroyed?: boolean
  text?: string
}

const W = 1600
const H = 900
const FRAME_MS = 50
const BAD_STRIKES = C.BROCCOLI_STRIKES

let tickFn: (ticker: { deltaMS: number }) => void
let stage: StubNode
let ticker: { add: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
let engine: GumballSliceEngine
let sample: HandTrackSample
let onHud: ReturnType<typeof vi.fn<(hud: HudSnapshot) => void>>
let onRoundEnd: ReturnType<typeof vi.fn<(stats: RoundStats, reason: RoundEndReason) => void>>

const texture = (label: string) => new StubTexture({ label } as never) as unknown as Texture

function createEngine() {
  stage = { children: [], visible: true, position: { x: 0, y: 0 } }
  ticker = {
    add: vi.fn((fn: typeof tickFn) => {
      tickFn = fn
    }),
    remove: vi.fn(),
  }
  const app = {
    screen: { width: W, height: H },
    stage: { addChild: (...kids: StubNode[]) => stage.children.push(...kids) },
    ticker,
  } as unknown as Application
  onHud = vi.fn()
  onRoundEnd = vi.fn()
  return new GumballSliceEngine(
    app,
    () => sample,
    { onHud, onRoundEnd },
    {
      candies: [{ texture: texture('candy'), particleColor: '#fff' }],
      rainbow: { texture: texture('rainbow'), particleColor: '#fff' },
      broccoli: texture('broccoli'),
    },
  )
}

// --- scene inspection (pools hang off world.children: halves, items, particles, popups) ---
const world = () => stage.children[0]
const cursorDot = () => stage.children[2]
const itemViews = () => world().children[1].children
const visibleItems = (label?: string) =>
  itemViews().filter(
    (v) => v.visible && (label === undefined || v.children[0].texture?.label === label),
  )

// --- driving the engine ---
const nowMs = () => performance.now()

function setSample(patch: Partial<HandTrackSample> = {}) {
  sample = { ...sample, frameId: sample.frameId + 1, timestamp: nowMs(), ...patch }
}

/** Advance the clock and run one engine frame, with a fresh stationary hand sample unless `hand` is false. */
function frame(ms = FRAME_MS, hand = true) {
  vi.advanceTimersByTime(ms)
  if (hand) setSample()
  tickFn({ deltaMS: ms })
}

function startPlaying() {
  engine.lockPlayer({ ...sample })
  engine.startRound()
}

function playUntil(done: () => boolean, maxFrames = 2500) {
  for (let i = 0; i < maxFrames && !done(); i++) frame()
  expect(done()).toBe(true)
}

const ended = () => onRoundEnd.mock.calls.length > 0
const lastHud = () => onHud.mock.calls.at(-1)![0] as HudSnapshot

/** One fast stroke from A to B (starts a fresh stroke so no stray segment is swept first). */
function swipe(ax: number, ay: number, bx: number, by: number) {
  frame(16, false) // hand lost: breaks the previous stroke
  setSample({ tipX: ax, tipY: ay })
  tickFn({ deltaMS: 16 })
  vi.advanceTimersByTime(16)
  setSample({ tipX: bx, tipY: by })
  tickFn({ deltaMS: 16 })
}

/** Slash straight through a visible item. */
function sliceItem(view: StubNode) {
  const { x, y } = view.position
  swipe(x - 120, y, x + 120, y)
}

/** Let a stationary hand sit still long enough for the current swipe to end. */
function settle() {
  for (let i = 0; i < 6; i++) frame(50)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.advanceTimersByTime(10_000)
  vi.spyOn(Math, 'random').mockReturnValue(0.5) // wave 0 and later: plain candy
  sample = {
    detected: true,
    tipX: 10,
    tipY: 10,
    handScale: 0.2,
    wristX: 0.5,
    wristY: 0.5,
    timestamp: nowMs(),
    frameId: 0,
  }
  engine = createEngine()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GumballSliceEngine round end', () => {
  it('registers its tick on the ticker and removes it on destroy', () => {
    expect(ticker.add).toHaveBeenCalledTimes(1)
    engine.destroy()
    expect(ticker.remove).toHaveBeenCalledWith(tickFn)
    expect(world().destroyed).toBe(true)
  })

  it('does not end a round or count time while idle', () => {
    for (let i = 0; i < 100; i++) frame()
    expect(onRoundEnd).not.toHaveBeenCalled()
    expect(visibleItems()).toHaveLength(0)
  })

  it('ends a full untouched round with TIME_UP, reporting a complete duration and the missed candies', () => {
    startPlaying()
    playUntil(ended)

    expect(onRoundEnd).toHaveBeenCalledTimes(1)
    const [stats, reason] = onRoundEnd.mock.calls[0]
    expect(reason).toBe('TIME_UP')
    expect(stats.durationMs).toBeGreaterThanOrEqual(C.ROUND_SECONDS * 1000)
    expect(stats.durationMs).toBeLessThan(C.ROUND_SECONDS * 1000 + 100)
    expect(stats).toMatchObject({ score: 0, slicedCount: 0, broccoliHits: 0, bestCombo: 0 })
    expect(stats.missedCount).toBeGreaterThan(0)
    expect(lastHud().secondsLeft).toBe(0)
  })

  it('never fires onRoundEnd twice, however long the engine keeps ticking', () => {
    startPlaying()
    playUntil(ended)
    for (let i = 0; i < 200; i++) frame()
    expect(onRoundEnd).toHaveBeenCalledTimes(1)
  })

  it('stops launching items once the round has ended', () => {
    startPlaying()
    playUntil(ended)
    for (let i = 0; i < 80; i++) frame() // long enough for everything to fall away
    expect(visibleItems()).toHaveLength(0)
  })

  it('warns that the player is missing, then ends with PLAYER_LOST at the configured timeout', () => {
    startPlaying()
    // Hand stops reporting new frames: same frameId, so nothing is accepted.
    const lostFor = (ms: number) => {
      vi.advanceTimersByTime(ms)
      tickFn({ deltaMS: ms })
    }
    lostFor(C.PLAYER_LOST_WARNING_MS - 100)
    expect(lastHud().playerMissing).toBe(false)

    lostFor(200)
    expect(lastHud().playerMissing).toBe(true)
    expect(onRoundEnd).not.toHaveBeenCalled()

    lostFor(C.PLAYER_LOST_TIMEOUT_MS - C.PLAYER_LOST_WARNING_MS)
    expect(onRoundEnd).toHaveBeenCalledTimes(1)
    expect(onRoundEnd.mock.calls[0][1]).toBe('PLAYER_LOST')
    expect(lastHud().playerMissing).toBe(false)

    lostFor(1000)
    expect(onRoundEnd).toHaveBeenCalledTimes(1)
  })

  it('clears the missing warning when the player comes back', () => {
    startPlaying()
    vi.advanceTimersByTime(C.PLAYER_LOST_WARNING_MS + 200)
    tickFn({ deltaMS: 50 })
    expect(lastHud().playerMissing).toBe(true)

    frame() // fresh sample from the locked hand
    expect(lastHud().playerMissing).toBe(false)
    expect(onRoundEnd).not.toHaveBeenCalled()
  })

  it('treats a much smaller (bystander) hand as the player being gone', () => {
    startPlaying()
    const tooSmall = sample.handScale * C.LOCK_MIN_SCALE_RATIO * 0.5
    for (let i = 0; i < 100 && !ended(); i++) {
      vi.advanceTimersByTime(FRAME_MS)
      setSample({ handScale: tooSmall })
      tickFn({ deltaMS: FRAME_MS })
    }
    expect(onRoundEnd).toHaveBeenCalledTimes(1)
    expect(onRoundEnd.mock.calls[0][1]).toBe('PLAYER_LOST')
  })

  it('locks onto the first hand seen when the round starts with no hand in view', () => {
    engine.lockPlayer(null)
    engine.startRound()
    for (let i = 0; i < 100; i++) frame() // hand present from the first frame
    expect(onRoundEnd).not.toHaveBeenCalled()
  })

  it('ignores stale samples: the cursor dot hides when the sample is older than the stale window', () => {
    engine.setTrailVisible(true)
    frame()
    expect(cursorDot().visible).toBe(true)

    vi.advanceTimersByTime(10)
    setSample({ timestamp: nowMs() - C.SAMPLE_STALE_MS - 50 })
    tickFn({ deltaMS: 10 })
    expect(cursorDot().visible).toBe(false)
  })

  it('hides the cursor dot when the trail is switched off', () => {
    engine.setTrailVisible(true)
    frame()
    expect(cursorDot().visible).toBe(true)
    engine.setTrailVisible(false)
    frame()
    expect(cursorDot().visible).toBe(false)
  })
})

describe('GumballSliceEngine scoring', () => {
  it('scores CANDY_POINTS for a sliced candy and removes it from play', () => {
    startPlaying()
    playUntil(() => visibleItems('candy').length > 0)
    const candy = visibleItems('candy')[0]

    sliceItem(candy)
    frame()

    expect(candy.visible).toBe(false)
    expect(lastHud()).toMatchObject({ score: C.CANDY_POINTS, slicedCount: 1, broccoliHits: 0 })
  })

  it('slices an item only once per pass', () => {
    startPlaying()
    playUntil(() => visibleItems('candy').length > 0)
    const candy = visibleItems('candy')[0]
    sliceItem(candy)
    // Sweep the same spot again: nothing left to hit.
    const { x, y } = candy.position
    swipe(x - 120, y, x + 120, y)
    frame()
    expect(lastHud().slicedCount).toBe(1)
  })

  it('scores RAINBOW_POINTS for the secret rainbow candy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // wave 0 rolls the rainbow
    startPlaying()
    playUntil(() => visibleItems('rainbow').length > 0)

    sliceItem(visibleItems('rainbow')[0])
    frame()

    expect(lastHud()).toMatchObject({ score: C.RAINBOW_POINTS, slicedCount: 1 })
  })

  it('applies BAD_POINTS for broccoli without counting it as a sliced candy', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // wave 0 rainbow, later waves broccoli
    startPlaying()
    playUntil(() => visibleItems('rainbow').length > 0)
    sliceItem(visibleItems('rainbow')[0])
    playUntil(() => visibleItems('broccoli').length > 0)

    sliceItem(visibleItems('broccoli')[0])
    frame()

    expect(lastHud()).toMatchObject({
      score: C.RAINBOW_POINTS + C.BAD_POINTS,
      slicedCount: 1,
      broccoliHits: 1,
    })
    expect(onRoundEnd).not.toHaveBeenCalled()
  })

  it('never lets the score go below zero', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // wave 0 candy, later waves broccoli
    startPlaying()
    playUntil(() => visibleItems('candy').length > 0)
    sliceItem(visibleItems('candy')[0])
    playUntil(() => visibleItems('broccoli').length > 0)
    expect(C.CANDY_POINTS + C.BAD_POINTS).toBeLessThan(0)

    sliceItem(visibleItems('broccoli')[0])
    frame()

    expect(lastHud().score).toBe(0)
  })

  it('awards the combo bonus for one swipe through several candies, using the real config', () => {
    startPlaying()
    playUntil(() => visibleItems('candy').length >= C.COMBO_MIN)
    const candies = visibleItems('candy')
    const n = candies.length
    const x = candies[0].position.x

    swipe(x, -200, x, H + 200)
    frame()
    expect(lastHud()).toMatchObject({ slicedCount: n, comboCount: n })
    const beforeBonus = lastHud().score
    expect(beforeBonus).toBe(n * C.CANDY_POINTS)

    settle() // swipe ends: the bonus lands
    expect(lastHud().comboCount).toBe(0)
    expect(lastHud().score).toBe(n * C.CANDY_POINTS + n * C.COMBO_POINTS_PER_CANDY)

    playUntil(ended)
    expect(onRoundEnd.mock.calls[0][0]).toMatchObject({
      slicedCount: n,
      bestCombo: n,
      score: n * C.CANDY_POINTS + n * C.COMBO_POINTS_PER_CANDY,
    })
  })

  it('gives no combo bonus below COMBO_MIN slices in a swipe', () => {
    startPlaying()
    playUntil(() => visibleItems('candy').length > 0)
    expect(C.COMBO_MIN).toBeGreaterThan(1)
    sliceItem(visibleItems('candy')[0])
    settle()

    expect(lastHud().score).toBe(C.CANDY_POINTS)
  })

  it('does not slice anything before the round starts', () => {
    // Items only exist in a round, but a swipe through the field must be harmless while idle.
    swipe(0, 0, W, H)
    frame()
    expect(lastHud().score).toBe(0)
    expect(lastHud().slicedCount).toBe(0)
  })
})

describe('GumballSliceEngine strike-out', () => {
  function sliceBroccoliUntilHits(hits: number) {
    for (let i = 0; i < 3000 && lastHud().broccoliHits < hits; i++) {
      frame()
      const broccoli = visibleItems('broccoli')[0]
      if (broccoli) sliceItem(broccoli)
    }
    expect(lastHud().broccoliHits).toBe(hits)
  }

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // wave 0 candy, every later wave broccoli
    startPlaying()
    frame()
  })

  it('does not end the round before the configured number of broccoli hits', () => {
    sliceBroccoliUntilHits(BAD_STRIKES - 1)
    for (let i = 0; i < 40; i++) frame(FRAME_MS)
    expect(onRoundEnd).not.toHaveBeenCalled()
  })

  it('ends with STRUCK_OUT once, after the strikeout delay, reporting the strikes', () => {
    sliceBroccoliUntilHits(BAD_STRIKES)
    expect(onRoundEnd).not.toHaveBeenCalled() // held for the delay so the last burst is seen

    playUntil(ended, 100)
    expect(onRoundEnd).toHaveBeenCalledTimes(1)
    const [stats, reason] = onRoundEnd.mock.calls[0]
    expect(reason).toBe('STRUCK_OUT')
    expect(stats.broccoliHits).toBe(BAD_STRIKES)
    expect(stats.durationMs).toBeLessThan(C.ROUND_SECONDS * 1000)

    for (let i = 0; i < 400; i++) frame() // past where TIME_UP would have fired
    expect(onRoundEnd).toHaveBeenCalledTimes(1)
  })

  it('ignores further slices once struck out', () => {
    sliceBroccoliUntilHits(BAD_STRIKES)
    const scoreAtStrikeOut = lastHud().score
    for (let i = 0; i < 6; i++) {
      frame()
      for (const item of visibleItems()) sliceItem(item)
    }
    frame()
    expect(lastHud().broccoliHits).toBe(BAD_STRIKES)
    expect(lastHud().score).toBe(scoreAtStrikeOut)
  })

  it('does not fire PLAYER_LOST on top of a strike-out hold', () => {
    sliceBroccoliUntilHits(BAD_STRIKES)
    // The hand vanishes during the hold; the strike-out must still be the only reason reported.
    for (let i = 0; i < 60; i++) frame(FRAME_MS, false)
    expect(onRoundEnd).toHaveBeenCalledTimes(1)
    expect(onRoundEnd.mock.calls[0][1]).toBe('STRUCK_OUT')
  })
})

describe('GumballSliceEngine reset and restart', () => {
  it('reset clears items, combo and the field, and the next round starts from zero', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01) // wave 0 rainbow
    startPlaying()
    playUntil(() => visibleItems('rainbow').length > 0)
    sliceItem(visibleItems('rainbow')[0])
    frame()
    expect(lastHud().score).toBe(C.RAINBOW_POINTS)
    playUntil(() => visibleItems().length > 0)

    engine.reset()
    frame()

    expect(visibleItems()).toHaveLength(0)
    expect(lastHud().comboCount).toBe(0)
    expect(lastHud().secondsLeft).toBe(C.ROUND_SECONDS)

    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    startPlaying()
    frame()
    expect(lastHud()).toMatchObject({ score: 0, slicedCount: 0, broccoliHits: 0, comboCount: 0 })

    playUntil(ended)
    expect(onRoundEnd).toHaveBeenCalledTimes(1)
    const [stats, reason] = onRoundEnd.mock.calls[0]
    expect(reason).toBe('TIME_UP')
    expect(stats).toMatchObject({ score: 0, slicedCount: 0, bestCombo: 0 })
    expect(stats.durationMs).toBeLessThan(C.ROUND_SECONDS * 1000 + 100)
  })

  it('reset after a finished round allows a second round to end exactly once on its own', () => {
    startPlaying()
    playUntil(ended)
    engine.reset()
    startPlaying()
    playUntil(() => onRoundEnd.mock.calls.length === 2)
    for (let i = 0; i < 100; i++) frame()

    expect(onRoundEnd).toHaveBeenCalledTimes(2)
    expect(onRoundEnd.mock.calls.map((c) => c[1])).toEqual(['TIME_UP', 'TIME_UP'])
  })

  it('reset unlocks the player so a different hand can start the next round', () => {
    startPlaying()
    engine.reset()
    // A hand far smaller than the one that was locked would be rejected if the lock survived.
    setSample({ handScale: sample.handScale * 0.1 })
    engine.lockPlayer(null)
    engine.startRound()
    for (let i = 0; i < 100; i++) frame()
    expect(onRoundEnd).not.toHaveBeenCalled()
  })

  it('startRound mid-round restarts cleanly without ending the old round', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.01)
    startPlaying()
    playUntil(() => visibleItems('rainbow').length > 0)
    sliceItem(visibleItems('rainbow')[0])
    frame()
    expect(lastHud().score).toBe(C.RAINBOW_POINTS)

    engine.startRound()
    frame()

    expect(onRoundEnd).not.toHaveBeenCalled()
    expect(visibleItems()).toHaveLength(0)
    expect(lastHud()).toMatchObject({ score: 0, slicedCount: 0 })
  })

  it('does not call onHud again for an identical snapshot', () => {
    frame()
    const calls = onHud.mock.calls.length
    for (let i = 0; i < 10; i++) frame()
    expect(onHud.mock.calls.length).toBe(calls)
  })
})

describe('GumballSliceEngine missed candies', () => {
  it('counts candies that fall away but not broccoli', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.05) // wave 0 candy, broccoli waves, rainbow suspense beats
    startPlaying()
    // Count launches by watching pooled views flip to visible, split by kind.
    const wasVisible = new Map<StubNode, boolean>()
    let goodLaunches = 0
    let broccoliLaunches = 0
    while (!ended()) {
      frame()
      for (const view of itemViews()) {
        if (view.visible && !wasVisible.get(view)) {
          if (view.children[0].texture?.label === 'broccoli') broccoliLaunches += 1
          else goodLaunches += 1
        }
        wasVisible.set(view, view.visible)
      }
      if (onHud.mock.calls.length > 5000) break
    }

    const stats = onRoundEnd.mock.calls[0][0]
    expect(broccoliLaunches).toBeGreaterThan(0)
    expect(goodLaunches).toBeGreaterThan(0)
    expect(stats.missedCount).toBe(goodLaunches)
    expect(stats.broccoliHits).toBe(0)
  })
})
