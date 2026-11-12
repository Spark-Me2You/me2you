import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { messagesService } from '../services/messagesService'
import { MessageComposePage } from './MessageComposePage'

vi.mock('../services/messagesService', () => ({ messagesService: { sendMessage: vi.fn() } }))
const navigate = vi.fn()
vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}))

const send = vi.mocked(messagesService.sendMessage)

function renderPage() {
  render(
    <MemoryRouter>
      <MessageComposePage tokenId="t1" recipientName="Ann" />
    </MemoryRouter>,
  )
  const box = screen.getByPlaceholderText('write your message...') as HTMLTextAreaElement
  fireEvent.change(box, { target: { value: 'hello there' } })
  return box
}

describe('MessageComposePage', () => {
  beforeEach(() => {
    send.mockReset()
    navigate.mockReset()
  })

  it('keeps the typed text and explains an expired code, without navigating', async () => {
    send.mockRejectedValue(new Error('Token is not claimable — already claimed, expired, or not found'))
    const box = renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'send' }))

    expect(await screen.findByText(/scan a new code at the kiosk/)).toBeTruthy()
    expect(box.value).toBe('hello there')
    expect(navigate).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: 'send' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows other errors as-is and keeps the text', async () => {
    send.mockRejectedValue(new Error('Recipient unavailable'))
    const box = renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'send' }))
    expect(await screen.findByText('Recipient unavailable')).toBeTruthy()
    expect(box.value).toBe('hello there')
  })

  it('navigates to the success page only when the send works', async () => {
    send.mockResolvedValue({ success: true, token_id: 't1', message_id: 'm1' })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'send' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/claim/success', expect.anything()))
    expect(send).toHaveBeenCalledWith('t1', 'hello there')
  })
})
