export const OBSERVATION_SKEW_MS = 5 * 60_000

export type Clock = () => Date

export function defaultClock(): Date {
  return new Date()
}

export function toIsoInstant(value: Date): string {
  return value.toISOString()
}

export function isFiniteUnixSeconds(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  )
}

export function unixSecondsToDate(value: number): Date {
  return new Date(value * 1000)
}

export function observedAtInstant(
  unixSeconds: unknown,
  now: Date,
  skewMs: number = OBSERVATION_SKEW_MS,
): string | null {
  if (!isFiniteUnixSeconds(unixSeconds)) return null
  const observed = unixSecondsToDate(unixSeconds)
  if (observed.getTime() - now.getTime() > skewMs) return null
  return observed.toISOString()
}

export function elapsedMs(fromIso: string, now: Date): number | null {
  const parsed = Date.parse(fromIso)
  if (Number.isNaN(parsed)) return null
  return now.getTime() - parsed
}
