import { describe, expect, it } from 'vitest'
import { seededRandom, todayKey } from './seededRandom'

describe('seededRandom', () => {
  it('returns the same value for the same seed', () => {
    expect(seededRandom('2026-10-19')).toBe(seededRandom('2026-10-19'))
  })

  it('returns different values for different seeds', () => {
    expect(seededRandom('2026-10-19')).not.toBe(seededRandom('2026-10-20'))
  })

  it('returns values in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const n = seededRandom(`seed-${i}`)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })
})

describe('todayKey', () => {
  it('formats a date as zero-padded YYYY-MM-DD in local time', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(todayKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})
