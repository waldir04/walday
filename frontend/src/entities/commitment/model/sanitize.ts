import type { Commitment } from './types'
import { commitmentSchema } from './schema'

export function sanitizeCommitment(input: unknown): Commitment | null {
  const result = commitmentSchema.safeParse(input)
  if (!result.success) return null

  const value = result.data
  return {
    id: value.id ?? crypto.randomUUID(),
    title: value.title,
    ...(value.description ? { description: value.description } : {}),
    date: value.date,
    startTime: value.startTime,
    endTime: value.endTime,
    type: value.type,
  }
}

export function sanitizeCommitments(input: unknown): Commitment[] {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => sanitizeCommitment(item))
    .filter((item): item is Commitment => item !== null)
}
