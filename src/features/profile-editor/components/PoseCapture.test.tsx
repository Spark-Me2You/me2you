import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PoseCapture } from './PoseCapture'

const capture = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  capturePhoto: vi.fn(),
  retakePhoto: vi.fn(),
  startCamera: vi.fn(),
  stopCamera: vi.fn(),
}))

vi.mock('../hooks/usePhotoCapture', () => ({
  usePhotoCapture: () => ({
    videoRef: { current: null },
    canvasRef: { current: null },
    capturePhoto: capture.capturePhoto,
    retakePhoto: capture.retakePhoto,
    startCamera: capture.startCamera,
    stopCamera: capture.stopCamera,
    ...capture.state,
  }),
}))

const PHOTO = new Blob(['x'])
const ready = {
  photo: null,
  previewUrl: null,
  phase: 'live',
  liveCategory: null,
  detectedCategory: null,
  isCameraReady: true,
  isGestureReady: true,
  gestureError: null,
  cameraError: null,
}

describe('PoseCapture', () => {
  const onSubmit = vi.fn()
  const onBack = vi.fn()

  beforeEach(() => {
    capture.state = { ...ready }
    for (const fn of [capture.capturePhoto, capture.retakePhoto, capture.startCamera, capture.stopCamera, onSubmit, onBack]) fn.mockReset()
  })

  const renderIt = (props: Partial<Parameters<typeof PoseCapture>[0]> = {}) =>
    render(<PoseCapture onSubmit={onSubmit} onBack={onBack} isSubmitting={false} {...props} />)

  it('starts the camera and stops it on unmount', () => {
    const { unmount } = renderIt()
    expect(capture.startCamera).toHaveBeenCalled()
    unmount()
    expect(capture.stopCamera).toHaveBeenCalled()
  })

  it('shows the live pose and takes a photo', () => {
    capture.state = { ...ready, liveCategory: 'thumbs_up' }
    renderIt()
    expect(screen.getByText('✓ thumbs up')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'take photo' }))
    expect(capture.capturePhoto).toHaveBeenCalled()
  })

  it('shows "show a pose" when nothing is detected yet', () => {
    renderIt()
    expect(screen.getByText('show a pose')).toBeInTheDocument()
  })

  it('shows a loading indicator while the pose is checked', () => {
    capture.state = { ...ready, phase: 'classifying', photo: PHOTO, previewUrl: 'blob:x' }
    renderIt()
    expect(screen.getByRole('status')).toHaveTextContent('checking your pose')
    expect(screen.getByRole('button', { name: /looks good/ })).toBeDisabled()
  })

  it('says the pose failed and offers to try again', () => {
    capture.state = { ...ready, phase: 'failed', photo: PHOTO, previewUrl: 'blob:x' }
    renderIt()
    expect(screen.getByRole('alert')).toHaveTextContent("we couldn't see your pose!")
    expect(screen.getByRole('button', { name: /looks good/ })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /try again/ }))
    expect(capture.retakePhoto).toHaveBeenCalled()
  })

  it('submits the photo with its detected pose', async () => {
    capture.state = { ...ready, phase: 'detected', photo: PHOTO, previewUrl: 'blob:x', detectedCategory: 'wave' }
    onSubmit.mockResolvedValue(true)
    renderIt()
    expect(screen.getByText('✓ wave')).toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /looks good/ })) })
    expect(onSubmit).toHaveBeenCalledWith(PHOTO, 'wave')
  })

  it('shows a save failure on screen', async () => {
    capture.state = { ...ready, phase: 'detected', photo: PHOTO, previewUrl: 'blob:x', detectedCategory: 'wave' }
    onSubmit.mockRejectedValue(new Error('upload failed'))
    renderIt()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /looks good/ })) })
    expect(screen.getByRole('alert')).toHaveTextContent('upload failed')
  })

  it('reports pose detection that failed to load', () => {
    capture.state = { ...ready, isGestureReady: false, gestureError: "couldn't load pose detection" }
    renderIt()
    expect(screen.getByRole('alert')).toHaveTextContent("couldn't load pose detection")
    expect(screen.getByRole('button', { name: 'take photo' })).toBeDisabled()
  })

  it('uses the given back label', () => {
    renderIt({ backLabel: 'cancel' })
    fireEvent.click(screen.getByRole('button', { name: /cancel/ }))
    expect(onBack).toHaveBeenCalled()
  })
})
