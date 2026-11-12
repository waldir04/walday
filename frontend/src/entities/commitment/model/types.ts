import type { CommitmentType } from '@/shared/config/commitments'
export type { CommitmentType }

export interface Commitment {
  id: string
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  type: CommitmentType
}

export interface StoredCommitment extends Commitment {}
