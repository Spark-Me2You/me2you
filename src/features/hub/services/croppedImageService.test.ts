import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accessoryService } from '@/features/profile-editor/services/accessoryService'
import { silenceConsole } from '@/test/console'
import { queryResult, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { croppedImageService } from './croppedImageService'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))
vi.mock('@/features/profile-editor/services/accessoryService', () => ({
  accessoryService: { getSettingsForOwners: vi.fn() },
}))

const getSettingsForOwners = vi.mocked(accessoryService.getSettingsForOwners)

const row = (id: string, owner: string, extra: Record<string, unknown> = {}) => ({
  id,
  storage_path: `${id}.png`,
  owner_id: owner,
  centroid_point: '(10.5,20)',
  left_eye_point: '(1,2)',
  right_eye_point: '(3,4)',
  forehead_top_point: null,
  ...extra,
})

const settings = { selected_accessory: 'hat', relative_x: 0, relative_y: 0, scale: 1 } as const

describe('croppedImageService', () => {
  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
    getSettingsForOwners.mockReset().mockResolvedValue(new Map())
  })

  describe('getPaginatedCroppedImages', () => {
    it('requires an org id', async () => {
      await expect(croppedImageService.getPaginatedCroppedImages('')).rejects.toThrow('Organization ID is required')
    })

    it('parses Postgres point strings into coordinates', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: [row('a', 'u1')] }))

      const { rows } = await croppedImageService.getPaginatedCroppedImages('org')

      expect(rows[0]).toMatchObject({
        centroid_point: { x: 10.5, y: 20 },
        left_eye_point: { x: 1, y: 2 },
        right_eye_point: { x: 3, y: 4 },
        forehead_top_point: null,
      })
    })

    it("joins each owner's accessory settings, or null when they have none", async () => {
      getSettingsForOwners.mockResolvedValue(new Map([['u1', settings]]))
      supabaseMock.from.mockReturnValue(queryResult({ data: [row('a', 'u1'), row('b', 'u2')] }))

      const { rows } = await croppedImageService.getPaginatedCroppedImages('org')

      expect(getSettingsForOwners).toHaveBeenCalledWith(['u1', 'u2'])
      expect(rows.map((r) => r.accessorySettings)).toEqual([settings, null])
    })

    it('requests the right page range, newest first, public only', async () => {
      const query = queryResult({ data: [] })
      supabaseMock.from.mockReturnValue(query)

      await croppedImageService.getPaginatedCroppedImages('org', 20, 10)

      expect(query.range).toHaveBeenCalledWith(20, 29)
      expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(query.eq).toHaveBeenCalledWith('is_public', true)
    })

    it('reports hasMore only for a full page, and the next offset', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: [row('a', 'u'), row('b', 'u')] }))
      const full = await croppedImageService.getPaginatedCroppedImages('org', 0, 2)
      expect(full.pagination).toEqual({ hasMore: true, offset: 2 })

      supabaseMock.from.mockReturnValue(queryResult({ data: [row('a', 'u')] }))
      const partial = await croppedImageService.getPaginatedCroppedImages('org', 0, 2)
      expect(partial.pagination).toEqual({ hasMore: false, offset: 2 })
    })

    it('throws on a query error', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'bad' } }))
      await expect(croppedImageService.getPaginatedCroppedImages('org')).rejects.toThrow(
        'Failed to fetch cropped images: bad',
      )
    })
  })

  describe('getCroppedImageById', () => {
    it('returns the parsed row with accessory settings', async () => {
      getSettingsForOwners.mockResolvedValue(new Map([['u1', settings]]))
      supabaseMock.from.mockReturnValue(queryResult({ data: row('a', 'u1') }))

      const result = await croppedImageService.getCroppedImageById('a', 'org')

      expect(result).toMatchObject({ id: 'a', owner_id: 'u1', accessorySettings: settings })
    })

    it('returns null when not found or on error', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: null }))
      await expect(croppedImageService.getCroppedImageById('a', 'org')).resolves.toBeNull()

      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'x' } }))
      await expect(croppedImageService.getCroppedImageById('a', 'org')).resolves.toBeNull()
    })
  })
})
