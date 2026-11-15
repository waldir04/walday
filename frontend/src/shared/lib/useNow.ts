import { useEffect, useState } from 'react'

export type Clock = () => Date

const MINUTE_MS = 60_000

function defaultClock(): Date {
  return new Date()
}

function millisecondsUntilNextMinute(now: Date): number {
  const remainder = now.getTime() % MINUTE_MS
  return remainder === 0 ? MINUTE_MS : MINUTE_MS - remainder
}

/**
 * A minute-aligned clock. It re-reads the injected clock on the next whole
 * minute and when the tab becomes visible again, never once per second.
 */
export function useNow(clock: Clock = defaultClock): Date {
  const [now, setNow] = useState<Date>(() => clock())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    const tick = () => {
      const current = clock()
      setNow((previous) =>
        previous.getTime() === current.getTime() ? previous : current,
      )
      timer = setTimeout(tick, millisecondsUntilNextMinute(current))
    }

    const refresh = () => {
      if (timer !== undefined) clearTimeout(timer)
      tick()
    }

    timer = setTimeout(tick, millisecondsUntilNextMinute(clock()))

    document.addEventListener('visibilitychange', refresh)
    return () => {
      if (timer !== undefined) clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [clock])

  return now
}
