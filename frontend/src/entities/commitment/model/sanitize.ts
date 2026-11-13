import { commitmentSchema } from './schema'
import type {
  Commitment,
  QuarantineReasonCode,
  QuarantineSummary,
} from './types'

export function emptyQuarantine(): QuarantineSummary {
  return { invalidRecords: 0, duplicateIdentities: 0, reasonCodes: [] }
}

export function quarantineTotal(summary: QuarantineSummary): number {
  return summary.invalidRecords + summary.duplicateIdentities
}

function reasonForIssue(path: PropertyKey[]): QuarantineReasonCode {
  const field = String(path[0] ?? '')
  switch (field) {
    case 'title':
      return 'INVALID_TITLE'
    case 'description':
      return 'INVALID_DESCRIPTION'
    case 'date':
      return 'INVALID_DATE'
    case 'startTime':
    case 'endTime':
      return 'INVALID_TIME'
    case 'type':
      return 'MISSING_TYPE'
    case 'id':
      return 'MISSING_ID'
    case 'createdAt':
      return 'MISSING_CREATED_AT'
    default:
      return 'INVALID_SHAPE'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export interface SanitizeResult {
  commitments: Commitment[]
  quarantine: QuarantineSummary
}

export interface SanitizeOptions {
  now?: Date
  assignMissingCreatedAt?: boolean
}

export function sanitizeCommitments(
  input: unknown,
  options: SanitizeOptions = {},
): SanitizeResult {
  if (!Array.isArray(input)) {
    return {
      commitments: [],
      quarantine: {
        invalidRecords: 1,
        duplicateIdentities: 0,
        reasonCodes: ['INVALID_SHAPE'],
      },
    }
  }

  const now = (options.now ?? new Date()).toISOString()
  const seen = new Set<string>()
  const commitments: Commitment[] = []
  const reasons = new Set<QuarantineReasonCode>()
  let invalidRecords = 0
  let duplicateIdentities = 0

  for (const raw of input) {
    if (!isRecord(raw)) {
      invalidRecords += 1
      reasons.add('INVALID_SHAPE')
      continue
    }

    const candidate = { ...raw }
    if (options.assignMissingCreatedAt && candidate.createdAt === undefined) {
      candidate.createdAt = now
    }

    if (typeof candidate.id === 'string' && seen.has(candidate.id)) {
      duplicateIdentities += 1
      reasons.add('DUPLICATE_ID')
      continue
    }

    const result = commitmentSchema.safeParse(candidate)
    if (!result.success) {
      invalidRecords += 1
      for (const issue of result.error.issues) {
        reasons.add(reasonForIssue(issue.path))
      }
      continue
    }

    seen.add(result.data.id)
    commitments.push(result.data)
  }

  return {
    commitments,
    quarantine: {
      invalidRecords,
      duplicateIdentities,
      reasonCodes: [...reasons],
    },
  }
}

export function migrateLegacyRecords(
  input: unknown,
  now: Date = new Date(),
): unknown[] {
  if (!Array.isArray(input)) return []
  return input.map((raw) => {
    if (!isRecord(raw)) return raw
    if (raw.createdAt !== undefined) return raw
    return { ...raw, createdAt: now.toISOString() }
  })
}
