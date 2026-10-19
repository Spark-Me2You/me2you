import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryResult, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { DEFAULT_ACCESSORY_SETTINGS } from '../types/profileTypes'
import { accessoryService } from './accessoryService'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))

describe('accessoryService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('getAccessorySettings', () => {
    it('maps a stored row to settings', async () => {
      supabaseMock.from.mockReturnValue(
        queryResult({
          data: { selected_accessory: 'hat', relative_x: 3, relative_y: -2, scale: 1.5 },
        }),
      )

      await expect(accessoryService.getAccessorySettings('u1')).resolves.toEqual({
        selected_accessory: 'hat',
        relative_x: 3,
        relative_y: -2,
        scale: 1.5,
      })
    })

    it('fills missing or non-numeric columns with neutral defaults', async () => {
      supabaseMock.from.mockReturnValue(
        queryResult({ data: { selected_accessory: null, relative_x: null, scale: 'big' } }),
      )

      await expect(accessoryService.getAccessorySettings('u1')).resolves.toEqual({
        selected_accessory: null,
        relative_x: 0,
        relative_y: 0,
        scale: 1,
      })
    })

    it('returns defaults when the user has no row', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: null }))
      await expect(accessoryService.getAccessorySettings('u1')).resolves.toEqual(
        DEFAULT_ACCESSORY_SETTINGS,
      )
    })

    it('returns defaults instead of throwing on a query error', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'x' } }))
      await expect(accessoryService.getAccessorySettings('u1')).resolves.toEqual(
        DEFAULT_ACCESSORY_SETTINGS,
      )
    })
  })

  describe('upsertAccessorySettings', () => {
    const settings = { selected_accessory: 'sunglasses', relative_x: 1, relative_y: 2, scale: 0.8 } as const

    it('upserts keyed on user_id with the org', async () => {
      const query = queryResult()
      supabaseMock.from.mockReturnValue(query)

      await accessoryService.upsertAccessorySettings('u1', 'org1', settings)

      expect(supabaseMock.from).toHaveBeenCalledWith('accessories')
      expect(query.upsert).toHaveBeenCalledWith(
        { user_id: 'u1', org_id: 'org1', ...settings },
        { onConflict: 'user_id' },
      )
    })

    it('throws a descriptive error on failure', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'rls' } }))
      await expect(accessoryService.upsertAccessorySettings('u1', 'o', settings)).rejects.toThrow(
        'Failed to save accessory settings: rls',
      )
    })
  })

  describe('getSettingsForOwners', () => {
    it('skips the query for an empty id list', async () => {
      await expect(accessoryService.getSettingsForOwners([])).resolves.toEqual(new Map())
      expect(supabaseMock.from).not.toHaveBeenCalled()
    })

    it('returns settings keyed by user id', async () => {
      supabaseMock.from.mockReturnValue(
        queryResult({
          data: [
            { user_id: 'a', selected_accessory: 'hat', relative_x: 1, relative_y: 1, scale: 2 },
            { user_id: 'b', selected_accessory: null },
          ],
        }),
      )

      const result = await accessoryService.getSettingsForOwners(['a', 'b'])

      expect(result.get('a')?.selected_accessory).toBe('hat')
      expect(result.get('b')).toEqual(DEFAULT_ACCESSORY_SETTINGS)
    })

    it('returns an empty map on error', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'x' } }))
      await expect(accessoryService.getSettingsForOwners(['a'])).resolves.toEqual(new Map())
    })
  })
})
