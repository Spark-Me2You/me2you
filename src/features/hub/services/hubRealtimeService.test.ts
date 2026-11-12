import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { silenceConsole } from '@/test/console'
import { fakeChannel, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { croppedImageService } from './croppedImageService'
import {
  hubRealtimeService,
  RESUBSCRIBE_BASE_DELAY_MS,
  RESUBSCRIBE_MAX_DELAY_MS,
} from './hubRealtimeService'

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

  describe('server-side filter', () => {
    it('filters every subscription by org_id', () => {
      hubRealtimeService.subscribeToNewCroppedImages('org', vi.fn())
      hubRealtimeService.subscribeToProfilePictureUpdates('org', vi.fn())
      hubRealtimeService.subscribeToAccessoryUpdates('org', vi.fn())

      expect(fake.handlers.length).toBe(4)
      for (const h of fake.handlers) expect(h.filter).toMatchObject({ filter: 'org_id=eq.org' })
    })
  })

  describe('recovery', () => {
    type StatusCb = (status: string, err?: { message: string }) => void
    const statusOf = (f: ReturnType<typeof fakeChannel>): StatusCb =>
      (f.channel.subscribe.mock.calls as unknown as StatusCb[][])[0][0]

    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it.each(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'])('resubscribes with a fresh channel after %s', (status) => {
      const second = fakeChannel()
      supabaseMock.channel.mockReturnValueOnce(fake.channel).mockReturnValueOnce(second.channel)
      const onUpdate = vi.fn()
      hubRealtimeService.subscribeToProfilePictureUpdates('org', onUpdate)

      statusOf(fake)(status)
      expect(supabaseMock.removeChannel).toHaveBeenCalledWith(fake.channel)
      expect(supabaseMock.channel).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(RESUBSCRIBE_BASE_DELAY_MS)
      expect(supabaseMock.channel).toHaveBeenCalledTimes(2)
      expect(second.channel.subscribe).toHaveBeenCalled()
      expect(second.handlers[0].filter).toMatchObject({ filter: 'org_id=eq.org' })
    })

    it('backs off exponentially up to a cap and resets after a successful subscribe', () => {
      const fakes: ReturnType<typeof fakeChannel>[] = []
      supabaseMock.channel.mockImplementation(() => {
        const f = fakeChannel()
        fakes.push(f)
        return f.channel
      })
      hubRealtimeService.subscribeToProfilePictureUpdates('org', vi.fn())

      const fail = () => statusOf(fakes[fakes.length - 1])('CHANNEL_ERROR')
      const delays: number[] = []
      for (let i = 0; i < 8; i++) {
        const before = supabaseMock.channel.mock.calls.length
        fail()
        // find the delay by stepping
        let waited = 0
        while (supabaseMock.channel.mock.calls.length === before) {
          vi.advanceTimersByTime(500)
          waited += 500
        }
        delays.push(waited)
      }
      expect(delays.slice(0, 3)).toEqual([1000, 2000, 4000])
      expect(Math.max(...delays)).toBe(RESUBSCRIBE_MAX_DELAY_MS)

      statusOf(fakes[fakes.length - 1])('SUBSCRIBED')
      const before = supabaseMock.channel.mock.calls.length
      fail()
      vi.advanceTimersByTime(RESUBSCRIBE_BASE_DELAY_MS)
      expect(supabaseMock.channel.mock.calls.length).toBe(before + 1)
    })

    it('does not resubscribe once unsubscribed', () => {
      const unsubscribe = hubRealtimeService.subscribeToNewCroppedImages('org', vi.fn())
      unsubscribe()
      statusOf(fake)('CLOSED')
      vi.advanceTimersByTime(RESUBSCRIBE_MAX_DELAY_MS)
      expect(supabaseMock.channel).toHaveBeenCalledTimes(1)
    })

    it('cancels a pending resubscribe when unsubscribed', () => {
      const unsubscribe = hubRealtimeService.subscribeToNewCroppedImages('org', vi.fn())
      statusOf(fake)('CHANNEL_ERROR')
      unsubscribe()
      vi.advanceTimersByTime(RESUBSCRIBE_MAX_DELAY_MS)
      expect(supabaseMock.channel).toHaveBeenCalledTimes(1)
    })
  })
})
