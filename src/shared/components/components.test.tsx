import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { CharacterCounter } from './CharacterCounter'
import { ConfirmDialog } from './ConfirmDialog'
import { ErrorMessage } from './ErrorMessage'
import { Modal } from './Modal'

describe('Button', () => {
  it('calls onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Go</Button>)
    const button = screen.getByRole('button', { name: 'Go' })
    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal isOpen={false} onClose={vi.fn()}>body</Modal>)
    expect(screen.queryByText('body')).not.toBeInTheDocument()
  })

  it('shows title and children when open', () => {
    render(<Modal isOpen onClose={vi.fn()} title="Hello">body</Modal>)
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('closes on backdrop click but not on content click', async () => {
    const onClose = vi.fn()
    const { container } = render(<Modal isOpen onClose={onClose}>body</Modal>)

    await userEvent.click(screen.getByText('body'))
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.click(container.firstElementChild as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ConfirmDialog', () => {
  it('confirms and cancels via the matching buttons', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog isOpen onConfirm={onConfirm} onCancel={onCancel} message="Delete it?" />)

    expect(screen.getByText('Delete it?')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Confirm' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when closed', () => {
    render(<ConfirmDialog isOpen={false} onConfirm={vi.fn()} onCancel={vi.fn()} message="Delete it?" />)
    expect(screen.queryByText('Delete it?')).not.toBeInTheDocument()
  })
})

describe('ErrorMessage', () => {
  it('shows the message without a dismiss button by default', () => {
    render(<ErrorMessage message="Oops" />)
    expect(screen.getByText('Oops')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('dismisses through the button', async () => {
    const onDismiss = vi.fn()
    render(<ErrorMessage message="Oops" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

describe('CharacterCounter', () => {
  it('shows current / max', () => {
    render(<CharacterCounter current={5} max={100} />)
    expect(screen.getByText('5 / 100')).toBeInTheDocument()
  })

  it.each([
    [50, '#666'],
    [91, '#fa0'],
    [101, '#c00'],
  ])('uses the right colour at %i/100', (current, color) => {
    render(<CharacterCounter current={current} max={100} />)
    expect(screen.getByText(`${current} / 100`)).toHaveStyle({ color })
  })

  it('is not "over" exactly at the limit', () => {
    render(<CharacterCounter current={100} max={100} />)
    expect(screen.getByText('100 / 100')).toHaveStyle({ color: '#fa0' })
  })
})
