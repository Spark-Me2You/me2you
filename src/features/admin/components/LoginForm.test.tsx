import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('submits the typed email and password', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<LoginForm onSubmit={onSubmit} error={null} isLoading={false} />)

    await userEvent.type(container.querySelector('#email')!, 'a@x.com')
    await userEvent.type(container.querySelector('#password')!, 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))

    expect(onSubmit).toHaveBeenCalledWith('a@x.com', 'secret')
  })

  it('does not submit empty required fields', async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} error={null} isLoading={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the error', () => {
    render(<LoginForm onSubmit={vi.fn()} error="Invalid login" isLoading={false} />)
    expect(screen.getByText('Invalid login')).toBeInTheDocument()
  })

  it('disables inputs and the button while loading', () => {
    const { container } = render(<LoginForm onSubmit={vi.fn()} error={null} isLoading />)
    expect(screen.getByRole('button', { name: 'signing in...' })).toBeDisabled()
    expect(container.querySelector('#email')).toBeDisabled()
    expect(container.querySelector('#password')).toBeDisabled()
  })
})
