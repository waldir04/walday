import type { Commitment } from './types'

export interface OverlapResult {
  overlaps: boolean
  conflictingCommitmentIds: string[]
  conflictingCommitments: Commitment[]
}

export function findOverlaps(
  candidate: Commitment,
  existing: readonly Commitment[],
): OverlapResult {
  const conflicting = existing
    .filter((commitment) => {
      if (commitment.id === candidate.id) return false
      if (commitment.date !== candidate.date) return false
      return (
        candidate.startTime < commitment.endTime &&
        commitment.startTime < candidate.endTime
      )
    })
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))

  return {
    overlaps: conflicting.length > 0,
    conflictingCommitmentIds: conflicting.map((commitment) => commitment.id),
    conflictingCommitments: conflicting,
  }
}

export function hasAnyOverlap(commitments: readonly Commitment[]): boolean {
  return commitments.some((commitment, index) =>
    commitments
      .slice(index + 1)
      .some(
        (other) =>
          other.date === commitment.date &&
          commitment.startTime < other.endTime &&
          other.startTime < commitment.endTime,
      ),
  )
}
