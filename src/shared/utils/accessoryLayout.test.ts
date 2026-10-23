import { describe, expect, it } from 'vitest'
import {
  HUB_ACCESSORY_TUNING,
  HUB_DELTA_DENOMINATOR,
  HUB_DELTA_SCALE,
  convertPreviewDeltaToHubPixels,
  getAccessoryPlacement,
  getBalloonCenterFromHandAnchor,
} from './accessoryLayout'

describe('convertPreviewDeltaToHubPixels', () => {
  it('scales preview percent deltas by face width and per-axis multipliers', () => {
    const faceWidth = HUB_DELTA_DENOMINATOR * 2 // 2px per percent
    expect(convertPreviewDeltaToHubPixels(faceWidth, 10, -5)).toEqual({
      x: 10 * 2 * HUB_DELTA_SCALE.x,
      y: -5 * 2 * HUB_DELTA_SCALE.y,
    })
  })

  it('defaults to no movement', () => {
    expect(convertPreviewDeltaToHubPixels(100)).toEqual({ x: 0, y: 0 })
  })
})

describe('getAccessoryPlacement', () => {
  const base = { faceWidth: 200, faceHeight: 300, accessoryAspectRatio: 2 }

  it.each(['sunglasses', 'hat'] as const)('anchors %s to the face', (accessory) => {
    const tuning = HUB_ACCESSORY_TUNING[accessory]
    const placement = getAccessoryPlacement({ ...base, accessory })

    expect(placement.anchor).toBe('face')
    expect(placement.width).toBeCloseTo(200 * tuning.widthFactor)
    expect(placement.height).toBeCloseTo(placement.width / 2)
    expect(placement.offsetX).toBeCloseTo(200 * tuning.offsetXFactor)
    expect(placement.offsetY).toBeCloseTo(300 * tuning.offsetYFactor)
    expect(placement.baseRotation).toBe(0)
  })

  it('applies scale and user offsets', () => {
    const plain = getAccessoryPlacement({ ...base, accessory: 'hat' })
    const moved = getAccessoryPlacement({ ...base, accessory: 'hat', scale: 1.5, relativeX: 10, relativeY: 10 })
    const delta = convertPreviewDeltaToHubPixels(base.faceWidth, 10, 10)

    expect(moved.width).toBeCloseTo(plain.width * 1.5)
    expect(moved.offsetX).toBeCloseTo(plain.offsetX + delta.x)
    expect(moved.offsetY).toBeCloseTo(plain.offsetY + delta.y)
  })

  it('anchors the balloon to the hand with only the user offset and a base tilt', () => {
    const placement = getAccessoryPlacement({ ...base, accessory: 'balloon', relativeX: 4 })

    expect(placement.anchor).toBe('balloon-hand')
    expect(placement.width).toBeCloseTo(200 * HUB_ACCESSORY_TUNING.balloon.widthFactor)
    expect(placement.offsetX).toBeCloseTo(convertPreviewDeltaToHubPixels(200, 4).x)
    expect(placement.offsetY).toBe(0)
    expect(placement.baseRotation).toBe(HUB_ACCESSORY_TUNING.balloon.tiltRadians)
  })
})

describe('getBalloonCenterFromHandAnchor', () => {
  const { stringEndU, stringEndV } = HUB_ACCESSORY_TUNING.balloon

  it('places the string end on the hand when unrotated', () => {
    const center = getBalloonCenterFromHandAnchor({
      handX: 100,
      handY: 200,
      balloonWidth: 40,
      balloonHeight: 80,
      rotationRadians: 0,
    })
    expect(center.x).toBeCloseTo(100 - 40 * (stringEndU - 0.5))
    expect(center.y).toBeCloseTo(200 - 80 * (stringEndV - 0.5))
  })

  it('keeps the string end on the hand under rotation, then applies user deltas', () => {
    const rotation = 0.5
    const input = { handX: 100, handY: 200, balloonWidth: 40, balloonHeight: 80, rotationRadians: rotation }
    const center = getBalloonCenterFromHandAnchor(input)

    // Rotate the local string-end offset and add it back to the center: should land on the hand.
    const dx = 40 * (stringEndU - 0.5)
    const dy = 80 * (stringEndV - 0.5)
    expect(center.x + dx * Math.cos(rotation) - dy * Math.sin(rotation)).toBeCloseTo(100)
    expect(center.y + dx * Math.sin(rotation) + dy * Math.cos(rotation)).toBeCloseTo(200)

    const shifted = getBalloonCenterFromHandAnchor({ ...input, userDeltaX: 5, userDeltaY: -3 })
    expect(shifted.x).toBeCloseTo(center.x + 5)
    expect(shifted.y).toBeCloseTo(center.y - 3)
  })
})
