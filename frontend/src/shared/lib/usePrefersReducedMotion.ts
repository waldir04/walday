import { useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function getMediaQuery(): MediaQueryList | null {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null
  }
  return window.matchMedia(REDUCED_MOTION_QUERY)
}

function subscribe(onStoreChange: () => void): () => void {
  const mediaQuery = getMediaQuery()
  if (!mediaQuery) return () => undefined

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onStoreChange)
    return () => mediaQuery.removeEventListener('change', onStoreChange)
  }

  mediaQuery.addListener(onStoreChange)
  return () => mediaQuery.removeListener(onStoreChange)
}

function getSnapshot(): boolean {
  return getMediaQuery()?.matches ?? false
}

function getServerSnapshot(): boolean {
  return false
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
