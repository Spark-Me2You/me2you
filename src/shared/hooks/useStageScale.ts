import { useEffect, useState } from 'react'

const fit = (width: number, height: number) =>
  Math.min(window.innerWidth / width, window.innerHeight / height)

/**
 * Scale factor that fits a fixed-size design stage (e.g. the 1920×1080 kiosk
 * canvas) inside the viewport, updated on resize. Computed in JS because CSS
 * `scale(calc(100vw / 1920))` is invalid: `100vw / 1920` is a length, not a number.
 */
export function useStageScale(width = 1920, height = 1080): number {
  const [scale, setScale] = useState(() => fit(width, height))

  useEffect(() => {
    const update = () => setScale(fit(width, height))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [width, height])

  return scale
}
