import { describe, expect, it } from 'vitest'
import {
  CATEGORY_LIST,
  GESTURE_MAPPINGS,
  getCategoryFromGesture,
  getGestureMapping,
  isSupportedGesture,
} from './gestureMapping'

describe('gestureMapping', () => {
  it('maps known MediaPipe gestures to database categories', () => {
    expect(getCategoryFromGesture('Victory')).toBe('peace_sign')
    expect(getCategoryFromGesture('Open_Palm')).toBe('wave')
    expect(getCategoryFromGesture('Thumb_Up')).toBe('thumbs_up')
  })

  it.each([null, '', 'Closed_Fist', 'victory'])('returns null for unsupported gesture %j', (gesture) => {
    expect(getCategoryFromGesture(gesture)).toBeNull()
    expect(getGestureMapping(gesture)).toBeNull()
    expect(isSupportedGesture(gesture)).toBe(false)
  })

  it('returns the full mapping for a supported gesture', () => {
    expect(getGestureMapping('Victory')).toMatchObject({
      category: 'peace_sign',
      displayName: 'Peace Sign',
    })
    expect(isSupportedGesture('Victory')).toBe(true)
  })

  it('has unique gesture names and categories, and a complete CATEGORY_LIST', () => {
    const names = GESTURE_MAPPINGS.map((m) => m.gestureName)
    const categories = GESTURE_MAPPINGS.map((m) => m.category)
    expect(new Set(names).size).toBe(names.length)
    expect(new Set(categories).size).toBe(categories.length)
    expect(CATEGORY_LIST).toEqual(categories)
  })
})
