import type { Commitment } from './types'
import { validateCommitment } from './validation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function sanitizeField(
  value: unknown,
  field: keyof Commitment,
): Commitment[keyof Commitment] | undefined {
  if (field === 'description') {
    return isString(value) ? value.trim() : undefined
  }
  if (!isString(value)) return undefined
  return value.trim()
}

export function sanitizeCommitment(input: unknown): Commitment | null {
  if (!isRecord(input)) return null

  const title = sanitizeField(input.title, 'title')
  if (typeof title !== 'string' || title.length === 0) return null

  const date = sanitizeField(input.date, 'date')
  const startTime = sanitizeField(input.startTime, 'startTime')
  const endTime = sanitizeField(input.endTime, 'endTime')
  const type = sanitizeField(input.type, 'type')

  if (
    typeof date !== 'string' ||
    date.length === 0 ||
    typeof startTime !== 'string' ||
    startTime.length === 0 ||
    typeof endTime !== 'string' ||
    endTime.length === 0 ||
    typeof type !== 'string' ||
    type.length === 0
  ) {
    return null
  }

  const description = sanitizeField(input.description, 'description')

  const candidate: Commitment = {
    id: typeof input.id === 'string' && input.id.trim().length > 0
      ? input.id.trim()
      : crypto.randomUUID(),
    title,
    ...(description ? { description } : {}),
    date,
    startTime,
    endTime,
    type: type as Commitment['type'],
  }

  const validationErrors = validateCommitment(candidate)
  if (validationErrors.length > 0) return null

  return candidate
}

export function sanitizeCommitments(input: unknown): Commitment[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => sanitizeCommitment(item))
    .filter((item): item is Commitment => item !== null)
}