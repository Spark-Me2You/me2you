import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { messagesService } from '../services/messagesService'
import { MessagesView } from './MessagesView'

vi.mock('@/core/auth', () => ({ useAuth: () => ({ session: { user: { id: 'u1' } } }) }))
vi.mock('../services/messagesService', () => ({
  messagesService: { listInbox: vi.fn(), deleteMessage: vi.fn() },
}))

const svc = vi.mocked(messagesService)
const rows = [
  { id: 'm1', body: 'hi there', created_at: new Date().toISOString(), sender: { id: 's', name: 'Ann' } },
] as never

function renderView() {
  render(
    <MemoryRouter>
      <MessagesView />
    </MemoryRouter>,
  )
}

describe('MessagesView delete', () => {
  beforeEach(() => {
    svc.listInbox.mockReset().mockResolvedValue(rows)
    svc.deleteMessage.mockReset()
  })

  it('keeps the message and shows an inline error when deletion fails', async () => {
    svc.deleteMessage.mockRejectedValue(new Error('could not delete message'))
    renderView()

    fireEvent.click(await screen.findByLabelText('delete message'))

    expect((await screen.findByRole('alert')).textContent).toBe('could not delete message')
    expect(screen.getByText('hi there')).toBeTruthy()
    expect((screen.getByLabelText('delete message') as HTMLButtonElement).disabled).toBe(false)
  })

  it('removes the message after a successful delete', async () => {
    svc.deleteMessage.mockResolvedValue(undefined)
    renderView()

    fireEvent.click(await screen.findByLabelText('delete message'))

    await waitFor(() => expect(screen.queryByText('hi there')).toBeNull())
  })
})
