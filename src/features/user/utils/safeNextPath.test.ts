import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safeNextPath'

describe('safeNextPath', () => {
  it('keeps in-app user and claim destinations', () => {
    expect(safeNextPath('/user/messages')).toBe('/user/messages')
    expect(safeNextPath('/claim/123e4567-e89b-12d3-a456-426614174000')).toBe('/claim/123e4567-e89b-12d3-a456-426614174000')
    expect(safeNextPath('/user/gallery?tab=mine')).toBe('/user/gallery?tab=mine')
  })

  it('falls back to the profile for anything else', () => {
    expect(safeNextPath(null)).toBe('/user/profile')
    expect(safeNextPath('')).toBe('/user/profile')
    expect(safeNextPath('/app')).toBe('/user/profile')
    expect(safeNextPath('https://evil.com/user/x')).toBe('/user/profile')
    expect(safeNextPath('//evil.com/user/x')).toBe('/user/profile')
  })
})
