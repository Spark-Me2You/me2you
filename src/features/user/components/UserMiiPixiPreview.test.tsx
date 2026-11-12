import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_ACCESSORY_SETTINGS } from '@/features/profile-editor/types/profileTypes'
import type { AccessorySettings, AvatarLandmarkPoints } from '@/features/profile-editor/types/profileTypes'
import { UserMiiPixiPreview } from './UserMiiPixiPreview'

// Just enough of pixi.js to observe what's on the stage and how it's sized.
const pixi = vi.hoisted(() => {
  class FakeSprite {
    texture: { width: number; height: number; src: string }
    x = 0
    y = 0
    rotation = 0
    width: number
    height: number
    /** Set by `scale.set`, so a test can tell a sprite was laid out. */
    scaled = false
    anchor = { set: () => {} }
    scale = { set: () => { this.scaled = true } }
    constructor(texture: { width: number; height: number; src: string }) {
      this.texture = texture
      this.width = texture.width
      this.height = texture.height
    }
  }
  const stage = {
    children: [] as FakeSprite[],
    addChild(s: FakeSprite) { this.children.push(s); return s },
    removeChildren() { const old = this.children; this.children = []; return old },
  }
  const pending = new Map<string, () => void>()
  const held = new Set<string>()
  return {
    FakeSprite,
    stage,
    pending,
    held,
    load: (src: string) => {
      const texture = { width: 400, height: 400, src }
      if (!held.has(src)) return Promise.resolve(texture)
      return new Promise((resolve) => pending.set(src, () => resolve(texture)))
    },
  }
})

vi.mock('pixi.js', () => ({
  Application: vi.fn(function () {
    return {
      init: () => Promise.resolve(),
      canvas: document.createElement('canvas'),
      stage: pixi.stage,
      destroy: () => {},
    }
  }),
  Assets: { load: (src: string) => pixi.load(src) },
  Sprite: pixi.FakeSprite,
}))

const point = { x: 0.5, y: 0.5 }
const LANDMARKS: AvatarLandmarkPoints = {
  centroid_point: point,
  left_eye_point: point,
  right_eye_point: point,
  forehead_top_point: point,
}
const FACE = 'https://example.com/face.png'
const withAccessory = (selected_accessory: AccessorySettings['selected_accessory']): AccessorySettings => ({
  ...DEFAULT_ACCESSORY_SETTINGS,
  selected_accessory,
})

describe('UserMiiPixiPreview', () => {
  beforeEach(() => {
    pixi.stage.children = []
    pixi.pending.clear()
    pixi.held.clear()
  })

  const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

  it('renders body, face and accessory once loaded, all laid out', async () => {
    render(<UserMiiPixiPreview bobbleheadUrl={FACE} accessorySettings={withAccessory('hat')} landmarks={LANDMARKS} />)
    await flush()

    expect(pixi.stage.children.map((s) => s.texture.src)).toEqual([
      expect.stringContaining('mii_body'),
      FACE,
      '/accessories/hat.svg',
    ])
    const [body, face] = pixi.stage.children
    expect(body.scaled && face.scaled).toBe(true)
  })

  // Regression: the body and face were put on the stage unscaled before the
  // other textures had loaded, so they flashed at full image size.
  it('puts nothing on the stage until every texture has loaded', async () => {
    const { rerender } = render(
      <UserMiiPixiPreview bobbleheadUrl={FACE} accessorySettings={withAccessory(null)} landmarks={LANDMARKS} />,
    )
    await flush()
    const before = [...pixi.stage.children]

    pixi.held.add('/accessories/sunglasses.svg')
    rerender(<UserMiiPixiPreview bobbleheadUrl={FACE} accessorySettings={withAccessory('sunglasses')} landmarks={LANDMARKS} />)
    await flush()

    // Still loading the accessory: the previous, laid-out scene stays as is.
    expect(pixi.stage.children).toEqual(before)

    await act(async () => { pixi.pending.get('/accessories/sunglasses.svg')!() })
    await flush()

    expect(pixi.stage.children).toHaveLength(3)
    expect(pixi.stage.children.every((s) => s !== before[0])).toBe(true)
    const [body, face] = pixi.stage.children
    expect(body.scaled && face.scaled).toBe(true)
  })
})
