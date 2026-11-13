import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { accessoryService } from '@/features/profile-editor/services/accessoryService'
import { CustomizeAvatarView } from './CustomizeAvatarView'

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))

vi.mock('@/core/auth', () => ({ useAuth: () => auth.value }))
vi.mock('./UserMiiPixiPreview', () => ({ UserMiiPixiPreview: () => null }))
vi.mock('@/features/profile-editor/services/profileService', () => ({
  profileService: { getCurrentProfile: vi.fn().mockResolvedValue(null) },
}))
vi.mock('@/features/profile-editor/services/accessoryService', () => ({
  accessoryService: { getAccessorySettings: vi.fn(), upsertAccessorySettings: vi.fn() },
}))

function renderView() {
  render(
    <MemoryRouter>
      <CustomizeAvatarView />
    </MemoryRouter>,
  )
}

describe('CustomizeAvatarView save', () => {
  beforeEach(() => {
    vi.mocked(accessoryService.upsertAccessorySettings).mockReset()
    vi.mocked(accessoryService.getAccessorySettings).mockResolvedValue({} as never)
  })

  it('shows an error instead of silently doing nothing when the profile is not loaded', async () => {
    auth.value = { user: { id: 'u1' }, userProfile: null }
    renderView()

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText(/profile isn't loaded yet/)).toBeTruthy()
    expect(accessoryService.upsertAccessorySettings).not.toHaveBeenCalled()
  })
})
