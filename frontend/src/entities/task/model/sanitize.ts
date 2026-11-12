import {
  DESCRIPTION_MAX_GRAPHEMES,
  DURATION_MAX_MINUTES,
  DURATION_MIN_MINUTES,
  TITLE_MAX_GRAPHEMES,
  TITLE_MIN_GRAPHEMES,
} from './constants'
import { isLocalDate } from './dueDate'
import { parseDurationInput } from './duration'
import {
  isPriority,
  type LegacyMigrationResult,
  type QuarantineReasonCode,
  type QuarantineSummary,
  type Task,
} from './types'
import { countGraphemes, validateStoredTask } from './validation'

const LEGACY_RECORD_KEYS = new Set([
  'id',
  'title',
  'description',
  'priority',
  'dueDate',
  'estimatedDuration',
  'completed',
  'createdAt',
])

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addReason(
  reasons: QuarantineReasonCode[],
  code: QuarantineReasonCode,
): void {
  if (!reasons.includes(code)) {
    reasons.push(code)
  }
}

interface CandidateRecord {
  task: Task
  reasonCode?: undefined
}

interface InvalidRecord {
  task?: undefined
  reasonCode: QuarantineReasonCode
}

function mapLegacyRecord(input: unknown): CandidateRecord | InvalidRecord {
  if (!isPlainObject(input)) {
    return { reasonCode: 'LEGACY_MAPPING_FAILED' }
  }

  for (const key of Object.keys(input)) {
    if (!LEGACY_RECORD_KEYS.has(key)) {
      return { reasonCode: 'LEGACY_MAPPING_FAILED' }
    }
  }

  const id = input.id
  if (typeof id !== 'string' || id.trim().length === 0) {
    return { reasonCode: 'TASK_ID_INVALID' }
  }

  if (typeof input.title !== 'string') {
    return { reasonCode: 'TITLE_REQUIRED' }
  }
  const title = input.title.trim()
  const titleLength = countGraphemes(title)
  if (titleLength === 0) return { reasonCode: 'TITLE_REQUIRED' }
  if (titleLength < TITLE_MIN_GRAPHEMES) {
    return { reasonCode: 'TITLE_TOO_SHORT' }
  }
  if (titleLength > TITLE_MAX_GRAPHEMES) {
    return { reasonCode: 'TITLE_TOO_LONG' }
  }

  let description: string | undefined
  if (input.description !== undefined) {
    if (typeof input.description !== 'string') {
      return { reasonCode: 'DESCRIPTION_TOO_LONG' }
    }
    const trimmed = input.description.trim()
    if (trimmed.length > 0) {
      if (countGraphemes(trimmed) > DESCRIPTION_MAX_GRAPHEMES) {
        return { reasonCode: 'DESCRIPTION_TOO_LONG' }
      }
      description = trimmed
    }
  }

  if (typeof input.priority !== 'string' || !isPriority(input.priority)) {
    return { reasonCode: 'PRIORITY_INVALID' }
  }

  let dueDate: Task['dueDate']
  if (input.dueDate !== undefined) {
    if (typeof input.dueDate !== 'string') {
      return { reasonCode: 'DUE_DATE_INVALID' }
    }
    const trimmed = input.dueDate.trim()
    if (trimmed.length > 0) {
      if (!isLocalDate(trimmed)) {
        return { reasonCode: 'DUE_DATE_INVALID' }
      }
      dueDate = trimmed
    }
  }

  let estimatedMinutes: number | undefined
  if (input.estimatedDuration !== undefined) {
    if (typeof input.estimatedDuration !== 'string') {
      return { reasonCode: 'DURATION_INVALID' }
    }
    const trimmed = input.estimatedDuration.trim()
    if (trimmed.length > 0) {
      const parsed = parseDurationInput(trimmed)
      if (!parsed.ok) {
        return { reasonCode: parsed.code }
      }
      if (
        parsed.minutes < DURATION_MIN_MINUTES ||
        parsed.minutes > DURATION_MAX_MINUTES
      ) {
        return { reasonCode: 'DURATION_OUT_OF_RANGE' }
      }
      estimatedMinutes = parsed.minutes
    }
  }

  if (typeof input.completed !== 'boolean') {
    return { reasonCode: 'LEGACY_MAPPING_FAILED' }
  }

  if (
    typeof input.createdAt !== 'number' ||
    !Number.isFinite(input.createdAt)
  ) {
    return { reasonCode: 'TASK_CREATED_AT_INVALID' }
  }

  return {
    task: {
      id,
      title,
      ...(description ? { description } : {}),
      status: input.completed ? 'completed' : 'pending',
      priority: input.priority,
      ...(dueDate ? { dueDate } : {}),
      ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
      createdAt: new Date(input.createdAt).toISOString(),
    },
  }
}

function finalizeCandidates(
  candidates: ReadonlyArray<CandidateRecord | InvalidRecord>,
  initialReasons: QuarantineReasonCode[],
): LegacyMigrationResult {
  const reasonCodes = [...initialReasons]
  let invalidRecords = 0
  const valid: Task[] = []

  for (const candidate of candidates) {
    if (candidate.task) {
      valid.push(candidate.task)
    } else {
      invalidRecords += 1
      addReason(reasonCodes, candidate.reasonCode)
    }
  }

  const identityCounts = new Map<string, number>()
  for (const task of valid) {
    identityCounts.set(task.id, (identityCounts.get(task.id) ?? 0) + 1)
  }

  let duplicateIdentities = 0
  const tasks: Task[] = []
  for (const task of valid) {
    const count = identityCounts.get(task.id) ?? 0
    if (count > 1) {
      duplicateIdentities += 1
    } else {
      tasks.push(task)
    }
  }

  if (duplicateIdentities > 0) {
    addReason(reasonCodes, 'TASK_DUPLICATE_ID')
  }

  const quarantine: QuarantineSummary = {
    invalidRecords,
    duplicateIdentities,
    reasonCodes,
  }

  return { tasks, quarantine }
}

export function sanitizeTaskRecords(
  records: readonly unknown[],
): LegacyMigrationResult {
  const candidates: Array<CandidateRecord | InvalidRecord> = records.map(
    (record) => {
      const result = validateStoredTask(record)
      return result.ok ? { task: result.value } : { reasonCode: result.code }
    },
  )
  return finalizeCandidates(candidates, [])
}

export function migrateLegacyRecords(
  records: readonly unknown[],
): LegacyMigrationResult {
  const candidates = records.map((record) => mapLegacyRecord(record))
  return finalizeCandidates(candidates, [])
}

export function emptyQuarantine(): QuarantineSummary {
  return { invalidRecords: 0, duplicateIdentities: 0, reasonCodes: [] }
}

export function quarantineTotal(quarantine: QuarantineSummary): number {
  return quarantine.invalidRecords + quarantine.duplicateIdentities
}
