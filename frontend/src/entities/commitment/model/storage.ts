import {
  COMMITMENTS_LOCK_NAME,
  COMMITMENTS_STORAGE_KEY,
  COMMITMENTS_STORAGE_VERSION,
} from '@/shared/config/commitments'
import {
  enqueueWrite,
  isQuotaExceeded,
  resolveLocks,
  resolveStorage,
} from '@/shared/lib/guestStore'
import { commitmentSchema, commitmentStoreSchema } from './schema'
import {
  migrateLegacyRecords,
  quarantineTotal,
  sanitizeCommitments,
} from './sanitize'
import type {
  Commitment,
  CommitmentLoadResult,
  CommitmentStorageDependencies,
  CommitmentWriteResult,
  PersistenceMode,
  RevisionBaseline,
  WriteBlockCause,
} from './types'

function nowOf(deps: CommitmentStorageDependencies | undefined): Date {
  return (deps?.now ?? (() => new Date()))()
}

function idOf(deps: CommitmentStorageDependencies | undefined): string {
  return (deps?.randomId ?? (() => crypto.randomUUID()))()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function blocked(cause: WriteBlockCause): CommitmentWriteResult {
  return { ok: false, code: 'STORAGE_WRITE_BLOCKED', cause }
}

function conflict(
  latest?: Commitment[],
  latestRevision?: string,
): CommitmentWriteResult {
  return {
    ok: false,
    code: 'STORAGE_CONFLICT',
    ...(latest ? { latest } : {}),
    ...(latestRevision ? { latestRevision } : {}),
  }
}

function failure(
  code:
    'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA_EXCEEDED' | 'STORAGE_WRITE_FAILED',
): CommitmentWriteResult {
  return { ok: false, code }
}

function baselineRevision(baseline: RevisionBaseline): string {
  return baseline.revision
}

export function loadCommitments(
  deps?: CommitmentStorageDependencies,
): CommitmentLoadResult {
  const storage = resolveStorage(deps?.storage)
  if (!storage) return { kind: 'unavailable' }

  let raw: string | null
  try {
    raw = storage.getItem(COMMITMENTS_STORAGE_KEY)
  } catch {
    return { kind: 'unavailable' }
  }

  if (raw === null) return { kind: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'corrupt', raw }
  }

  const now = nowOf(deps)

  if (Array.isArray(parsed)) {
    const migrated = migrateLegacyRecords(parsed, now)
    const { commitments, quarantine } = sanitizeCommitments(migrated, {
      now,
      assignMissingCreatedAt: true,
    })
    return { kind: 'legacy', commitments, quarantine, raw }
  }

  if (!isRecord(parsed)) return { kind: 'corrupt', raw }

  const detectedVersion = parsed.version
  if (
    typeof detectedVersion === 'number' &&
    Number.isInteger(detectedVersion) &&
    detectedVersion > COMMITMENTS_STORAGE_VERSION
  ) {
    return { kind: 'unsupported', detectedVersion, raw }
  }

  const envelope = commitmentStoreSchema.safeParse(parsed)
  if (!envelope.success) {
    if (
      typeof detectedVersion === 'number' &&
      Number.isInteger(detectedVersion) &&
      detectedVersion < COMMITMENTS_STORAGE_VERSION
    ) {
      return { kind: 'migration-failed', fromVersion: detectedVersion, raw }
    }
    return { kind: 'corrupt', raw }
  }

  const { commitments, quarantine } = sanitizeCommitments(
    envelope.data.commitments,
    { now },
  )

  if (quarantineTotal(quarantine) > 0) {
    return {
      kind: 'partial',
      commitments,
      quarantine,
      revision: envelope.data.revision,
      updatedAt: envelope.data.updatedAt,
      raw,
    }
  }

  return {
    kind: 'restored',
    commitments,
    revision: envelope.data.revision,
    updatedAt: envelope.data.updatedAt,
  }
}

/** Legacy-compatible read helper for consumers that only need valid records. */
export function loadCommitmentList(
  deps?: CommitmentStorageDependencies,
): Commitment[] {
  const result = loadCommitments(deps)
  switch (result.kind) {
    case 'restored':
    case 'partial':
    case 'legacy':
      return result.commitments
    default:
      return []
  }
}

function writeEnvelope(
  storage: { setItem: (_key: string, _value: string) => void },
  commitments: Commitment[],
  deps: CommitmentStorageDependencies | undefined,
): CommitmentWriteResult {
  const revision = idOf(deps)
  const updatedAt = nowOf(deps).toISOString()

  try {
    storage.setItem(
      COMMITMENTS_STORAGE_KEY,
      JSON.stringify({
        version: COMMITMENTS_STORAGE_VERSION,
        revision,
        updatedAt,
        commitments,
      }),
    )
  } catch (error) {
    return failure(
      isQuotaExceeded(error)
        ? 'STORAGE_QUOTA_EXCEEDED'
        : 'STORAGE_WRITE_FAILED',
    )
  }

  return { ok: true, revision, updatedAt }
}

function performWrite(
  commitments: Commitment[],
  baseline: RevisionBaseline,
  storage: {
    getItem: (_key: string) => string | null
    setItem: (_key: string, _value: string) => void
  },
  deps: CommitmentStorageDependencies | undefined,
): CommitmentWriteResult {
  const current = loadCommitments(deps)
  const expected = baselineRevision(baseline)

  switch (current.kind) {
    case 'unavailable':
      return failure('STORAGE_UNAVAILABLE')
    case 'corrupt':
      return blocked('corrupt')
    case 'migration-failed':
      return blocked('migration-failed')
    case 'partial':
      return blocked('partial')
    case 'unsupported':
      return blocked('unsupported')
    case 'legacy':
      if (expected !== 'legacy') return conflict(current.commitments)
      break
    case 'restored':
      if (expected !== current.revision) {
        return conflict(current.commitments, current.revision)
      }
      break
    case 'empty':
      if (expected !== 'empty' && expected !== 'unknown') {
        return conflict([])
      }
      break
    default:
      break
  }

  return writeEnvelope(storage, commitments, deps)
}

export async function saveCommitments(
  commitments: Commitment[],
  baseline: RevisionBaseline,
  mode: PersistenceMode = 'normal',
  deps?: CommitmentStorageDependencies,
): Promise<CommitmentWriteResult> {
  if (mode === 'unsupported') return blocked('unsupported')
  if (mode === 'recovery-blocked') {
    const loaded = loadCommitments(deps)
    return blocked(
      loaded.kind === 'partial'
        ? 'partial'
        : loaded.kind === 'migration-failed'
          ? 'migration-failed'
          : loaded.kind === 'unsupported'
            ? 'unsupported'
            : 'corrupt',
    )
  }

  for (const commitment of commitments) {
    if (!commitmentSchema.safeParse(commitment).success) {
      return failure('STORAGE_WRITE_FAILED')
    }
  }

  const storage = resolveStorage(deps?.storage)
  if (!storage) return failure('STORAGE_UNAVAILABLE')

  const locks = resolveLocks(deps?.locks)
  const operation = async () =>
    performWrite(commitments, baseline, storage, deps)

  return enqueueWrite(() =>
    locks ? locks.request(COMMITMENTS_LOCK_NAME, operation) : operation(),
  )
}
