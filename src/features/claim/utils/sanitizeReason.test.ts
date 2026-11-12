import { describe, expect, it } from 'vitest'
import { sanitizeReason } from './sanitizeReason'

describe('sanitizeReason', () => {
  it('keeps a normal server message', () => {
    expect(sanitizeReason('Token is not claimable — already claimed, expired, or not found')).toBe(
      'Token is not claimable — already claimed, expired, or not found',
    )
  })

  it('falls back when empty or missing', () => {
    expect(sanitizeReason(null)).toBe('something went wrong')
    expect(sanitizeReason('  \n\t ')).toBe('something went wrong')
  })

  it('strips control characters', () => {
    expect(sanitizeReason('bad\u0000\u0007thing\r\nhere')).toBe('bad thing here')
  })

  it('caps the length at 200 characters', () => {
    expect(sanitizeReason('a'.repeat(5000))).toHaveLength(200)
  })
})
