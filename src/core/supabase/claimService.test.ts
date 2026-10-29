import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSupabaseMock, supabaseMock } from '@/test/supabaseMock'
import { claimService } from './claimService'

vi.mock('./client', () => import('@/test/supabaseMockModule'))

const invoke = supabaseMock.functions.invoke
const payload = { type: 'drawing' } as never

describe('claimService edge function calls', () => {
  beforeEach(() => {
    resetSupabaseMock()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('generateClaimToken', () => {
    const ok = { success: true, token_id: 't', claim_url: 'https://x/claim/t', expires_at: 'soon' }

    it('invokes generate-claim-token and returns the claim', async () => {
      invoke.mockResolvedValue({ data: ok, error: null })

      await expect(claimService.generateClaimToken(payload)).resolves.toEqual({
        token_id: 't',
        claim_url: 'https://x/claim/t',
        expires_at: 'soon',
      })
      expect(invoke).toHaveBeenCalledWith('generate-claim-token', { body: { payload } })
    })

    it('throws the transport error message', async () => {
      invoke.mockResolvedValue({ data: null, error: { message: 'network' } })
      await expect(claimService.generateClaimToken(payload)).rejects.toThrow('network')
    })

    it('throws the function error when success is false', async () => {
      invoke.mockResolvedValue({ data: { success: false, error: 'rate limited' }, error: null })
      await expect(claimService.generateClaimToken(payload)).rejects.toThrow('rate limited')
    })

    it('throws when the response is missing required fields', async () => {
      invoke.mockResolvedValue({ data: { success: true, token_id: 't' }, error: null })
      await expect(claimService.generateClaimToken(payload)).rejects.toThrow(
        'Failed to generate claim token',
      )
    })
  })

  describe('executeClaim', () => {
    it('returns the claimed payload', async () => {
      invoke.mockResolvedValue({ data: { success: true, token_id: 't', payload }, error: null })

      await expect(claimService.executeClaim('t')).resolves.toEqual({
        success: true,
        token_id: 't',
        payload,
      })
      expect(invoke).toHaveBeenCalledWith('execute-claim', { body: { token_id: 't' } })
    })

    it('throws when no payload comes back', async () => {
      invoke.mockResolvedValue({ data: { success: true, token_id: 't' }, error: null })
      await expect(claimService.executeClaim('t')).rejects.toThrow('Failed to execute claim')
    })
  })

  describe('executeDrawingClaim', () => {
    it('returns the drawing ids', async () => {
      invoke.mockResolvedValue({
        data: { success: true, token_id: 't', drawing_id: 'd', image_path: 'o/d.png' },
        error: null,
      })

      await expect(claimService.executeDrawingClaim('t')).resolves.toEqual({
        success: true,
        token_id: 't',
        drawing_id: 'd',
        image_path: 'o/d.png',
      })
      expect(invoke).toHaveBeenCalledWith('claim-drawing', { body: { token_id: 't' } })
    })

    it('surfaces the function error', async () => {
      invoke.mockResolvedValue({ data: { success: false, error: 'expired' }, error: null })
      await expect(claimService.executeDrawingClaim('t')).rejects.toThrow('expired')
    })
  })

  describe('executeMessageClaim', () => {
    it('sends the message body with the token', async () => {
      invoke.mockResolvedValue({
        data: { success: true, token_id: 't', message_id: 'm' },
        error: null,
      })

      await expect(claimService.executeMessageClaim('t', 'hi')).resolves.toEqual({
        success: true,
        token_id: 't',
        message_id: 'm',
      })
      expect(invoke).toHaveBeenCalledWith('claim-message', { body: { token_id: 't', body: 'hi' } })
    })

    it('falls back to a default message when the error has none', async () => {
      invoke.mockResolvedValue({ data: null, error: { message: '' } })
      await expect(claimService.executeMessageClaim('t', 'hi')).rejects.toThrow(
        'Failed to send message',
      )
    })
  })
})

describe('claimService.subscribeToClaim', () => {
  type UpdateHandler = (event: { new: unknown }) => void
  let handler: UpdateHandler
  const channel = { on: vi.fn(), subscribe: vi.fn() }

  beforeEach(() => {
    resetSupabaseMock()
    channel.on.mockReset().mockImplementation((_type: string, _filter: unknown, cb: UpdateHandler) => {
      handler = cb
      return channel
    })
    channel.subscribe.mockReset().mockReturnValue(channel)
    supabaseMock.channel.mockReturnValue(channel)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('listens for updates to the specific claim token row', () => {
    claimService.subscribeToClaim('tok', vi.fn())

    expect(supabaseMock.channel).toHaveBeenCalledWith('claim-token-tok')
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'claim_tokens', filter: 'id=eq.tok' }),
      expect.any(Function),
    )
  })

  it('calls back once and unsubscribes when the token is claimed', () => {
    const onClaimed = vi.fn()
    claimService.subscribeToClaim('tok', onClaimed)

    handler({ new: { status: 'claimed', payload, claimed_by: 'user-1' } })
    handler({ new: { status: 'claimed', payload, claimed_by: 'user-1' } })

    expect(onClaimed).toHaveBeenCalledWith(payload, 'user-1')
    expect(supabaseMock.removeChannel).toHaveBeenCalledTimes(1)
  })

  it('ignores updates that are not a claim', () => {
    const onClaimed = vi.fn()
    claimService.subscribeToClaim('tok', onClaimed)

    handler({ new: { status: 'pending' } })

    expect(onClaimed).not.toHaveBeenCalled()
    expect(supabaseMock.removeChannel).not.toHaveBeenCalled()
  })

  it('returns an idempotent unsubscribe function', () => {
    const unsubscribe = claimService.subscribeToClaim('tok', vi.fn())
    unsubscribe()
    unsubscribe()
    expect(supabaseMock.removeChannel).toHaveBeenCalledTimes(1)
  })
})
