import { includesValue } from '@/shared/lib/includes'
import type { LocalTime } from '@/shared/lib/localDateTime'

export const TASK_STATUSES = ['pending', 'completed'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type Priority = (typeof TASK_PRIORITIES)[number]

export function isTaskStatus(value: string): value is TaskStatus {
  return includesValue(TASK_STATUSES, value)
}

export function isPriority(value: string): value is Priority {
  return includesValue(TASK_PRIORITIES, value)
}

export type TaskId = string

export type LocalDate = `${number}-${number}-${number}`

export interface Task {
  id: TaskId
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: LocalDate
  estimatedMinutes?: number
  /** Optional. Must be a real calendar date. Present if and only if `plannedStartTime` is present. */
  plannedDate?: LocalDate
  /** Optional. Present if and only if `plannedDate` is present. */
  plannedStartTime?: LocalTime
  createdAt: string
}

/** A planned slot written atomically with the task's estimated duration. */
export interface ScheduleSlot {
  plannedDate: LocalDate
  plannedStartTime: LocalTime
  estimatedMinutes: number
}

export interface TaskDraft {
  title: string
  description: string
  priority: Priority
  dueDate: string
  estimatedDurationInput: string
}

export type TaskValidationCode =
  | 'TITLE_REQUIRED'
  | 'TITLE_TOO_SHORT'
  | 'TITLE_TOO_LONG'
  | 'DESCRIPTION_TOO_LONG'
  | 'PRIORITY_INVALID'
  | 'DUE_DATE_INVALID'
  | 'DURATION_INVALID'
  | 'DURATION_OUT_OF_RANGE'
  | 'DURATION_FRACTIONAL'

export type TaskRecordValidationCode =
  | TaskValidationCode
  | 'TASK_ID_INVALID'
  | 'TASK_CREATED_AT_INVALID'
  | 'TASK_STATUS_INVALID'
  | 'TASK_UNKNOWN_FIELD'
  | 'SLOT_DATE_INVALID'
  | 'SLOT_TIME_INVALID'
  | 'SLOT_INCOMPLETE'
  | 'SLOT_DURATION_REQUIRED'

export type TaskFieldName =
  'title' | 'description' | 'priority' | 'dueDate' | 'estimatedMinutes'

export interface TaskFieldError {
  field: TaskFieldName
  code: TaskValidationCode
}

export type QuarantineReasonCode =
  | TaskRecordValidationCode
  | 'TASK_DUPLICATE_ID'
  | 'LEGACY_MAPPING_FAILED'
  | 'MIGRATION_FAILED'

export interface QuarantineSummary {
  invalidRecords: number
  duplicateIdentities: number
  reasonCodes: QuarantineReasonCode[]
}

export interface StoredTask extends Task {}

export type TaskStoreLoadResult =
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | {
      kind: 'restored'
      tasks: Task[]
      revision: string
      updatedAt: string
      migratedFrom?: number
    }
  | {
      kind: 'partial'
      tasks: Task[]
      revision: string
      updatedAt: string
      migratedFrom?: number
      quarantine: QuarantineSummary
      raw: string
    }
  | {
      kind: 'legacy'
      tasks: Task[]
      quarantine: QuarantineSummary
      raw: string
    }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'migration-failed'; fromVersion: number; raw: string }
  | { kind: 'unsupported'; detectedVersion: number; raw: string }

export type TaskStoreWriteErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_WRITE_BLOCKED'
  | 'STORAGE_CONFLICT'

export type WriteBlockCause =
  'corrupt' | 'unsupported' | 'recovery-blocked' | 'protected' | 'memory-only'

export type TaskStoreWriteResult =
  | { ok: true; revision: string; updatedAt: string }
  | {
      ok: false
      code: TaskStoreWriteErrorCode
      cause?: WriteBlockCause
      latest?: Task[]
      latestRevision?: string
    }

export type PersistenceMode =
  'normal' | 'memory-only' | 'recovery-blocked' | 'protected' | 'unsupported'

export type RevisionBaseline = string | 'empty' | 'legacy' | 'unknown'

export type WriteIntent = 'automatic' | 'retry' | 'discard-unreadable'

export interface StorageLike {
  getItem: (_key: string) => string | null
  setItem: (_key: string, _value: string) => void
}

export interface LockManagerLike {
  request: <T>(_name: string, _callback: () => Promise<T>) => Promise<T>
}

export interface TaskStorageDependencies {
  storage?: StorageLike | null
  now?: () => Date
  randomId?: () => string
  locks?: LockManagerLike | null
}

export interface LegacyMigrationResult {
  tasks: Task[]
  quarantine: QuarantineSummary
}
