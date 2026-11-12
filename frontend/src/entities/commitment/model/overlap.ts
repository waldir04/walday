import type { Commitment } from './types'

export interface OverlapResult {
  overlaps: boolean
  conflictingCommitmentIds: string[]
  conflictingCommitments: Commitment[]
}

export function findOverlaps(
  candidate: Commitment,
  existing: Commitment[],
): OverlapResult {
  const startA = candidate.startTime
  const endA = candidate.endTime

  const conflicting = existing.filter((commitment) => {
    if (commitment.id === candidate.id) return false
    if (commitment.date !== candidate.date) return false
    return startA < commitment.endTime && commitment.startTime < endA
  })

  return {
    overlaps: conflicting.length > 0,
    conflictingCommitmentIds: conflicting.map((c) => c.id),
    conflictingCommitments: conflicting,
  }
}