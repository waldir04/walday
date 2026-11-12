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
  isTaskStatus,
  type Task,
  type TaskDraft,
  type TaskFieldError,
  type TaskRecordValidationCode,
} from './types'

const segmenter =
  typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

const RECORD_KEYS = new Set([
  'id',
  'title',
  'description',
  'status',
  'priority',
  'dueDate',
  'estimatedMinutes',
  'createdAt',
])

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T/

export function countGraphemes(value: string): number {
  if (!segmenter) {
    return Array.from(value).length
  }
  return [...segmenter.segment(value)].length
}

export function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_TIMESTAMP_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateTitle(title: string): TaskFieldError[] {
  const trimmed = title.trim()
  const length = countGraphemes(trimmed)

  if (length === 0) {
    return [{ field: 'title', code: 'TITLE_REQUIRED' }]
  }
  if (length < TITLE_MIN_GRAPHEMES) {
    return [{ field: 'title', code: 'TITLE_TOO_SHORT' }]
  }
  if (length > TITLE_MAX_GRAPHEMES) {
    return [{ field: 'title', code: 'TITLE_TOO_LONG' }]
  }
  return []
}

function validateDescription(description: string): TaskFieldError[] {
  const trimmed = description.trim()
  if (
    trimmed.length > 0 &&
    countGraphemes(trimmed) > DESCRIPTION_MAX_GRAPHEMES
  ) {
    return [{ field: 'description', code: 'DESCRIPTION_TOO_LONG' }]
  }
  return []
}

export function validateTaskDraft(draft: TaskDraft): TaskFieldError[] {
  const errors: TaskFieldError[] = [
    ...validateTitle(draft.title),
    ...validateDescription(draft.description),
  ]

  if (!isPriority(draft.priority)) {
    errors.push({ field: 'priority', code: 'PRIORITY_INVALID' })
  }

  const dueDate = draft.dueDate.trim()
  if (dueDate.length > 0 && !isLocalDate(dueDate)) {
    errors.push({ field: 'dueDate', code: 'DUE_DATE_INVALID' })
  }

  const durationInput = draft.estimatedDurationInput.trim()
  if (durationInput.length > 0) {
    const parsed = parseDurationInput(durationInput)
    if (!parsed.ok) {
      errors.push({ field: 'estimatedMinutes', code: parsed.code })
    }
  }

  return errors
}

export type StoredTaskValidationResult =
  { ok: true; value: Task } | { ok: false; code: TaskRecordValidationCode }

export function validateStoredTask(input: unknown): StoredTaskValidationResult {
  if (!isPlainObject(input)) {
    return { ok: false, code: 'TASK_ID_INVALID' }
  }

  for (const key of Object.keys(input)) {
    if (!RECORD_KEYS.has(key)) {
      return { ok: false, code: 'TASK_UNKNOWN_FIELD' }
    }
  }

  const id = input.id
  if (typeof id !== 'string' || id.trim().length === 0) {
    return { ok: false, code: 'TASK_ID_INVALID' }
  }

  if (!isIsoTimestamp(input.createdAt)) {
    return { ok: false, code: 'TASK_CREATED_AT_INVALID' }
  }

  if (typeof input.status !== 'string' || !isTaskStatus(input.status)) {
    return { ok: false, code: 'TASK_STATUS_INVALID' }
  }

  if (typeof input.priority !== 'string' || !isPriority(input.priority)) {
    return { ok: false, code: 'PRIORITY_INVALID' }
  }

  if (typeof input.title !== 'string') {
    return { ok: false, code: 'TITLE_REQUIRED' }
  }
  const titleErrors = validateTitle(input.title)
  if (titleErrors.length > 0) {
    const error = titleErrors[0]
    return {
      ok: false,
      code: error ? error.code : 'TITLE_REQUIRED',
    }
  }

  let description: string | undefined
  if (input.description !== undefined) {
    if (typeof input.description !== 'string') {
      return { ok: false, code: 'DESCRIPTION_TOO_LONG' }
    }
    const trimmed = input.description.trim()
    if (trimmed.length > 0) {
      const descriptionErrors = validateDescription(trimmed)
      if (descriptionErrors.length > 0) {
        return { ok: false, code: 'DESCRIPTION_TOO_LONG' }
      }
      description = trimmed
    }
  }

  let dueDate: Task['dueDate']
  if (input.dueDate !== undefined) {
    if (typeof input.dueDate !== 'string') {
      return { ok: false, code: 'DUE_DATE_INVALID' }
    }
    const trimmed = input.dueDate.trim()
    if (trimmed.length > 0) {
      if (!isLocalDate(trimmed)) {
        return { ok: false, code: 'DUE_DATE_INVALID' }
      }
      dueDate = trimmed
    }
  }

  let estimatedMinutes: number | undefined
  if (input.estimatedMinutes !== undefined) {
    const value = input.estimatedMinutes
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { ok: false, code: 'DURATION_INVALID' }
    }
    if (!Number.isInteger(value)) {
      return { ok: false, code: 'DURATION_FRACTIONAL' }
    }
    if (value < DURATION_MIN_MINUTES || value > DURATION_MAX_MINUTES) {
      return { ok: false, code: 'DURATION_OUT_OF_RANGE' }
    }
    estimatedMinutes = value
  }

  return {
    ok: true,
    value: {
      id,
      title: input.title.trim(),
      ...(description ? { description } : {}),
      status: input.status,
      priority: input.priority,
      ...(dueDate ? { dueDate } : {}),
      ...(estimatedMinutes !== undefined ? { estimatedMinutes } : {}),
      createdAt: input.createdAt,
    },
  }
}
