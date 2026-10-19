import { beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { fakeChannel, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { croppedImageService } from './croppedImageService'
import { hubRealtimeService } from './hubRealtimeService'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))
vi.mock('./croppedImageService', () => ({ croppedImageService: { getCroppedImageById: vi.fn() } }))

const getCroppedImageById = vi.mocked(croppedImageService.getCroppedImageById)

describe('hubRealtimeService', () => {
  let fake: ReturnType<typeof fakeChannel>

  beforeEach(() => {
    resetSupabaseMock()
    silenceConsole()
    getCroppedImageById.mockReset()
    fake = fakeChannel()
    supabaseMock.channel.mockReturnValue(fake.channel)
  })

  describe('subscribeToNewCroppedImages', () => {
    it('loads the full row for an insert in this org and passes it on', async () => {
      const row = { id: 'c1' } as never
      getCroppedImageById.mockResolvedValue(row)
      const onInsert = vi.fn()
      hubRealtimeService.subscribeToNewCroppedImages('org', onInsert)

      await fake.emit('INSERT', 'cropped_image', { id: 'c1', org_id: 'org' })

      expect(supabaseMock.channel).toHaveBeenCalledWith('hub-cropped-image-org')
      expect(getCroppedImageById).toHaveBeenCalledWith('c1', 'org')
      expect(onInsert).toHaveBeenCalledWith(row)
    })

    it('ignores inserts from other orgs', async () => {
      const onInsert = vi.fn()
      hubRealtimeService.subscribeToNewCroppedImages('org', onInsert)

      await fake.emit('INSERT', 'cropped_image', { id: 'c1', org_id: 'other' })

      expect(getCroppedImageById).not.toHaveBeenCalled()
      expect(onInsert).not.toHaveBeenCalled()
    })

    it('does not call back when the row cannot be loaded', async () => {
      getCroppedImageById.mockResolvedValue(null)
      const onInsert = vi.fn()
      hubRealtimeService.subscribeToNewCroppedImages('org', onInsert)

      await fake.emit('INSERT', 'cropped_image', { id: 'c1', org_id: 'org' })

      expect(onInsert).not.toHaveBeenCalled()
    })

    it('drops a late row if unsubscribed while it was loading', async () => {
      let resolveRow!: (row: never) => void
      getCroppedImageById.mockReturnValue(new Promise((resolve) => (resolveRow = resolve)))
      const onInsert = vi.fn()
      const unsubscribe = hubRealtimeService.subscribeToNewCroppedImages('org', onInsert)

      const pending = fake.emit('INSERT', 'cropped_image', { id: 'c1', org_id: 'org' })
      unsubscribe()
      resolveRow({} as never)
      await pending

      expect(onInsert).not.toHaveBeenCalled()
    })

    it('unsubscribes once, however many times it is called', () => {
      const unsubscribe = hubRealtimeService.subscribeToNewCroppedImages('org', vi.fn())
      unsubscribe()
      unsubscribe()
      expect(supabaseMock.removeChannel).toHaveBeenCalledTimes(1)
      expect(supabaseMock.removeChannel).toHaveBeenCalledWith(fake.channel)
    })
  })

  describe('subscribeToProfilePictureUpdates', () => {
    it('reports the owner and new storage path for this org', async () => {
      const onUpdate = vi.fn()
      hubRealtimeService.subscribeToProfilePictureUpdates('org', onUpdate)

      await fake.emit('UPDATE', 'cropped_image', { org_id: 'org', owner_id: 'u1', storage_path: 'new.png' })
      await fake.emit('UPDATE', 'cropped_image', { org_id: 'other', owner_id: 'u2', storage_path: 'x.png' })

      expect(onUpdate).toHaveBeenCalledTimes(1)
      expect(onUpdate).toHaveBeenCalledWith('u1', 'new.png')
    })

    it('stops reporting after unsubscribe', async () => {
      const onUpdate = vi.fn()
      hubRealtimeService.subscribeToProfilePictureUpdates('org', onUpdate)()

      await fake.emit('UPDATE', 'cropped_image', { org_id: 'org', owner_id: 'u1', storage_path: 'n.png' })

      expect(onUpdate).not.toHaveBeenCalled()
    })
  })

  describe('subscribeToAccessoryUpdates', () => {
    const row = { org_id: 'org', user_id: 'u1', selected_accessory: 'hat', relative_x: 2, relative_y: 3, scale: 1.2 }

    it('handles both inserts and updates', async () => {
      const onUpdate = vi.fn()
      hubRealtimeService.subscribeToAccessoryUpdates('org', onUpdate)

      await fake.emit('INSERT', 'accessories', row)
      await fake.emit('UPDATE', 'accessories', row)

      expect(onUpdate).toHaveBeenCalledTimes(2)
      expect(onUpdate).toHaveBeenCalledWith('u1', {
        selected_accessory: 'hat',
        relative_x: 2,
        relative_y: 3,
        scale: 1.2,
      })
    })

    it('defaults missing numbers and ignores other orgs', async () => {
      const onUpdate = vi.fn()
      hubRealtimeService.subscribeToAccessoryUpdates('org', onUpdate)

      await fake.emit('UPDATE', 'accessories', { org_id: 'org', user_id: 'u1', selected_accessory: null })
      await fake.emit('UPDATE', 'accessories', { ...row, org_id: 'other' })

      expect(onUpdate).toHaveBeenCalledTimes(1)
      expect(onUpdate).toHaveBeenCalledWith('u1', {
        selected_accessory: null,
        relative_x: 0,
        relative_y: 0,
        scale: 1,
      })
    })
  })
})
