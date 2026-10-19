import { describe, expect, it } from 'vitest'
import { floodFill } from './floodFill'

type RGBA = [number, number, number, number]

const WHITE: RGBA = [255, 255, 255, 255]
const BLACK: RGBA = [0, 0, 0, 255]
const RED: RGBA = [255, 0, 0, 255]

/**
 * jsdom has no canvas backend, so fake the slice of the 2D context floodFill
 * uses. `rows` is a grid of '.' (white) and '#' (black) pixels.
 */
function makeContext(rows: string[]) {
  const height = rows.length
  const width = rows[0].length
  const data = new Uint8ClampedArray(width * height * 4)
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => data.set(ch === '#' ? BLACK : WHITE, (y * width + x) * 4)),
  )
  let putCount = 0
  const ctx = {
    canvas: { width, height },
    getImageData: () => ({ data }),
    putImageData: () => {
      putCount++
    },
  } as unknown as CanvasRenderingContext2D

  const pixel = (x: number, y: number) => [...data.slice((y * width + x) * 4, (y * width + x) * 4 + 4)]
  return { ctx, data, pixel, putCount: () => putCount }
}

describe('floodFill', () => {
  it('fills the connected region and stops at borders', () => {
    const { ctx, pixel } = makeContext([
      '.....',
      '.###.',
      '.#.#.',
      '.###.',
      '.....',
    ])

    floodFill(ctx, 0, 0, '#ff0000')

    expect(pixel(0, 0)).toEqual(RED)
    expect(pixel(4, 4)).toEqual(RED)
    expect(pixel(1, 1)).toEqual(BLACK)
    // Enclosed pixel is not reachable from outside the ring.
    expect(pixel(2, 2)).toEqual(WHITE)
  })

  it('fills only the enclosed area when started inside it', () => {
    const { ctx, pixel } = makeContext([
      '.....',
      '.###.',
      '.#.#.',
      '.###.',
      '.....',
    ])

    floodFill(ctx, 2.7, 2.2, '#ff0000')

    expect(pixel(2, 2)).toEqual(RED)
    expect(pixel(0, 0)).toEqual(WHITE)
  })

  it('treats near-matching (antialiased) pixels within tolerance as the same region', () => {
    const { ctx, data, pixel } = makeContext(['...'])
    data.set([240, 240, 240, 255], 4) // middle pixel, 15 off white

    floodFill(ctx, 0, 0, '#ff0000', 24)
    expect(pixel(2, 0)).toEqual(RED)
  })

  it('does nothing when the start point is outside the canvas', () => {
    const { ctx, putCount } = makeContext(['..'])
    floodFill(ctx, -1, 0, '#ff0000')
    floodFill(ctx, 2, 0, '#ff0000')
    expect(putCount()).toBe(0)
  })

  it('does nothing when the target already has the fill color', () => {
    const { ctx, putCount } = makeContext(['..'])
    floodFill(ctx, 0, 0, '#ffffff')
    expect(putCount()).toBe(0)
  })
})
