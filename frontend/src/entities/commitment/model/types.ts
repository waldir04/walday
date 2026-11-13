import type { CommitmentType } from '@/shared/config/commitments'
import type { GuestLockManager, GuestStorage } from '@/shared/lib/guestStore'

export type { CommitmentType }

export type CommitmentId = string
export type LocalDate = string
export type LocalTime = string

export interface Commitment {
  id: CommitmentId
  title: string
  description?: string
  date: LocalDate
  startTime: LocalTime
  endTime: LocalTime
  type: CommitmentType
  createdAt: string
}

export interface CommitmentDraft {
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  type: '' | CommitmentType
}

export type QuarantineReasonCode =
  | 'INVALID_SHAPE'
  | 'INVALID_TITLE'
  | 'INVALID_DESCRIPTION'
  | 'INVALID_DATE'
  | 'INVALID_TIME'
  | 'INVALID_RANGE'
  | 'MISSING_TYPE'
  | 'DUPLICATE_ID'
  | 'MISSING_ID'
  | 'MISSING_CREATED_AT'

export interface QuarantineSummary {
  invalidRecords: number
  duplicateIdentities: number
  reasonCodes: QuarantineReasonCode[]
}

export type CommitmentLoadResult =
  | { kind: 'empty' }
  | {
      kind: 'restored'
      commitments: Commitment[]
      revision: string
      updatedAt: string
    }
  | {
      kind: 'partial'
      commitments: Commitment[]
      quarantine: QuarantineSummary
      revision: string
      updatedAt: string
      raw: string
    }
  | {
      kind: 'legacy'
      commitments: Commitment[]
      quarantine: QuarantineSummary
      raw: string
    }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'migration-failed'; fromVersion: number; raw: string }
  | { kind: 'unsupported'; detectedVersion: number; raw: string }
  | { kind: 'unavailable' }

export type WriteBlockCause =
  'corrupt' | 'partial' | 'unsupported' | 'migration-failed' | 'external-change'

export type CommitmentWriteErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_CONFLICT'
  | 'STORAGE_WRITE_BLOCKED'

export type CommitmentWriteResult =
  | { ok: true; revision: string; updatedAt: string }
  | {
      ok: false
      code: CommitmentWriteErrorCode
      cause?: WriteBlockCause
      latest?: Commitment[]
      latestRevision?: string
    }

export type PersistenceMode = 'normal' | 'recovery-blocked' | 'unsupported'

export type RevisionBaseline =
  { revision: string } | { revision: 'empty' | 'legacy' | 'unknown' }

export interface CommitmentStorageDependencies {
  storage?: GuestStorage | null
  locks?: GuestLockManager | null
  now?: () => Date
  randomId?: () => string
}
