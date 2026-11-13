import type { Commitment } from './types'

export function commitmentsForDate(
  commitments: readonly Commitment[],
  date: string,
): Commitment[] {
  return commitments.filter((commitment) => commitment.date === date)
}

export function compareCommitments(
  languageTag: string,
): (a: Commitment, b: Commitment) => number {
  let collator: Intl.Collator
  try {
    collator = new Intl.Collator(languageTag, { sensitivity: 'base' })
  } catch {
    collator = new Intl.Collator('en', { sensitivity: 'base' })
  }

  return (a, b) => {
    if (a.startTime !== b.startTime) {
      return a.startTime < b.startTime ? -1 : 1
    }
    const byTitle = collator.compare(a.title, b.title)
    if (byTitle !== 0) return byTitle
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  }
}

export function orderedCommitments(
  commitments: readonly Commitment[],
  languageTag: string,
): Commitment[] {
  return [...commitments].sort(compareCommitments(languageTag))
}
