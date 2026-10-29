import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryResult, resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { claimService } from '@/core/supabase/claimService'
import { messagesService } from './messagesService'

vi.mock('@/core/supabase/client', () => import('@/test/supabaseMockModule'))

describe('messagesService', () => {
  beforeEach(resetSupabaseMock)

  describe('listInbox', () => {
    it("queries the user's inbox newest first", async () => {
      const query = queryResult({ data: [] })
      supabaseMock.from.mockReturnValue(query)

      await messagesService.listInbox('user-1')

      expect(supabaseMock.from).toHaveBeenCalledWith('messages')
      expect(query.eq).toHaveBeenCalledWith('to_user_id', 'user-1')
      expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('normalizes the embedded sender whether it arrives as an object or an array', async () => {
      supabaseMock.from.mockReturnValue(
        queryResult({
          data: [
            { id: 'a', sender: { id: 's1', name: 'Ann' } },
            { id: 'b', sender: [{ id: 's2', name: 'Bo' }] },
            { id: 'c', sender: [] },
            { id: 'd', sender: null },
          ],
        }),
      )

      const inbox = await messagesService.listInbox('user-1')

      expect(inbox.map((m) => m.sender)).toEqual([
        { id: 's1', name: 'Ann' },
        { id: 's2', name: 'Bo' },
        null,
        null,
      ])
    })

    it('returns an empty list when there is no data', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ data: null }))
      await expect(messagesService.listInbox('user-1')).resolves.toEqual([])
    })

    it('throws the database error message', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'boom' } }))
      await expect(messagesService.listInbox('user-1')).rejects.toThrow('boom')
    })
  })

  describe('deleteMessage', () => {
    it('deletes by id', async () => {
      const query = queryResult()
      supabaseMock.from.mockReturnValue(query)

      await messagesService.deleteMessage('m1')

      expect(query.delete).toHaveBeenCalled()
      expect(query.eq).toHaveBeenCalledWith('id', 'm1')
    })

    it('throws the database error message', async () => {
      supabaseMock.from.mockReturnValue(queryResult({ error: { message: 'denied' } }))
      await expect(messagesService.deleteMessage('m1')).rejects.toThrow('denied')
    })
  })

  it('sendMessage delegates to the claim-message flow', async () => {
    const spy = vi
      .spyOn(claimService, 'executeMessageClaim')
      .mockResolvedValue({ success: true, token_id: 't', message_id: 'm' })

    await messagesService.sendMessage('token-1', 'hello')

    expect(spy).toHaveBeenCalledWith('token-1', 'hello')
  })
})
