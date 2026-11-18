import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

const OVERFLOW_THRESHOLD_PX = 1

/**
 * Reports whether a horizontally scrollable element has hidden content.
 * Re-measures on mount, on resize notifications, and whenever the supplied
 * content/layout dependencies change.
 */
export function useHorizontalOverflow(
  ref: RefObject<HTMLElement | null>,
  hoursLength: number,
  locale: string,
  unit: string,
): boolean {
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => {
      setIsOverflowing(
        element.scrollWidth > element.clientWidth + OVERFLOW_THRESHOLD_PX,
      )
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, hoursLength, locale, unit])

  return isOverflowing
}
