import {
  TASKS_LOCK_NAME,
  TASKS_STORAGE_KEY,
  TASKS_STORAGE_VERSION,
} from '@/shared/config/tasks'
import {
  migrateLegacyRecords,
  quarantineTotal,
  sanitizeTaskRecords,
} from './sanitize'
import { guestTaskStoreSchema } from './schema'
import type {
  LockManagerLike,
  PersistenceMode,
  QuarantineSummary,
  RevisionBaseline,
  StorageLike,
  Task,
  TaskStorageDependencies,
  TaskStoreLoadResult,
  TaskStoreWriteErrorCode,
  TaskStoreWriteResult,
  WriteBlockCause,
  WriteIntent,
} from './types'
import { validateStoredTask } from './validation'

interface MigrationOutcome {
  ok: boolean
  tasks?: unknown[]
  quarantine?: QuarantineSummary
}

type RegisteredMigration = (input: Record<string, unknown>) => MigrationOutcome

const REGISTERED_MIGRATIONS: Record<number, RegisteredMigration> = {}

let writeChain: Promise<unknown> = Promise.resolve()

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeChain.then(operation, operation)
  writeChain = next.catch(() => undefined)
  return next
}

function resolveStorage(
  deps: TaskStorageDependencies | undefined,
): StorageLike | null {
  if (deps && 'storage' in deps) {
    return deps.storage ?? null
  }
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function resolveLocks(
  deps: TaskStorageDependencies | undefined,
): LockManagerLike | null {
  if (deps && 'locks' in deps) {
    return deps.locks ?? null
  }
  try {
    if (typeof navigator === 'undefined' || !navigator.locks) return null
    const locks = navigator.locks
    const adapter: LockManagerLike = {
      request: async <T>(name: string, callback: () => Promise<T>) => {
        return locks.request(name, () => callback())
      },
    }
    return adapter
  } catch {
    return null
  }
}

function resolveNow(deps: TaskStorageDependencies | undefined): Date {
  return (deps?.now ?? (() => new Date()))()
}

function resolveRandomId(deps: TaskStorageDependencies | undefined): string {
  return (deps?.randomId ?? (() => crypto.randomUUID()))()
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isQuotaExceeded(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const candidate = error as { name?: unknown; code?: unknown }
  return (
    candidate.name === 'QuotaExceededError' ||
    candidate.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    candidate.code === 22 ||
    candidate.code === 1014
  )
}

export function loadGuestTaskStore(
  deps?: TaskStorageDependencies,
): TaskStoreLoadResult {
  const storage = resolveStorage(deps)
  if (!storage) return { kind: 'unavailable' }

  let raw: string | null
  try {
    raw = storage.getItem(TASKS_STORAGE_KEY)
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

  if (Array.isArray(parsed)) {
    const { tasks, quarantine } = migrateLegacyRecords(parsed)
    return { kind: 'legacy', tasks, quarantine, raw }
  }

  if (!isPlainObject(parsed)) {
    return { kind: 'corrupt', raw }
  }

  const detectedVersion = parsed.version
  if (
    typeof detectedVersion === 'number' &&
    Number.isInteger(detectedVersion)
  ) {
    if (detectedVersion > TASKS_STORAGE_VERSION) {
      return { kind: 'unsupported', detectedVersion, raw }
    }

    if (detectedVersion < TASKS_STORAGE_VERSION) {
      const migration = REGISTERED_MIGRATIONS[detectedVersion]
      const outcome = migration ? migration(parsed) : { ok: false }
      if (!outcome.ok || !outcome.tasks || !outcome.quarantine) {
        return { kind: 'migration-failed', fromVersion: detectedVersion, raw }
      }
      const { tasks, quarantine } = sanitizeTaskRecords(outcome.tasks)
      const revision =
        typeof parsed.revision === 'string' ? parsed.revision : ''
      const updatedAt =
        typeof parsed.updatedAt === 'string' ? parsed.updatedAt : ''
      if (quarantineTotal(quarantine) > 0) {
        return {
          kind: 'partial',
          tasks,
          quarantine,
          raw,
          revision,
          updatedAt,
          migratedFrom: detectedVersion,
        }
      }
      return {
        kind: 'restored',
        tasks,
        revision,
        updatedAt,
        migratedFrom: detectedVersion,
      }
    }
  }

  const envelope = guestTaskStoreSchema.safeParse(parsed)
  if (!envelope.success) {
    return { kind: 'corrupt', raw }
  }

  const { tasks, quarantine } = sanitizeTaskRecords(envelope.data.tasks)
  if (quarantineTotal(quarantine) > 0) {
    return {
      kind: 'partial',
      tasks,
      quarantine,
      raw,
      revision: envelope.data.revision,
      updatedAt: envelope.data.updatedAt,
    }
  }

  return {
    kind: 'restored',
    tasks,
    revision: envelope.data.revision,
    updatedAt: envelope.data.updatedAt,
  }
}

function isBaselineSentinel(
  baseline: RevisionBaseline,
): baseline is 'empty' | 'legacy' | 'unknown' {
  return baseline === 'empty' || baseline === 'legacy' || baseline === 'unknown'
}

function blocked(cause?: WriteBlockCause): TaskStoreWriteResult {
  return {
    ok: false,
    code: 'STORAGE_WRITE_BLOCKED',
    ...(cause ? { cause } : {}),
  }
}

function conflict(
  latest?: Task[],
  latestRevision?: string,
): TaskStoreWriteResult {
  return {
    ok: false,
    code: 'STORAGE_CONFLICT',
    ...(latest ? { latest } : {}),
    ...(latestRevision ? { latestRevision } : {}),
  }
}

function failure(code: TaskStoreWriteErrorCode): TaskStoreWriteResult {
  return { ok: false, code }
}

function modeBlockCause(mode: PersistenceMode): WriteBlockCause {
  if (mode === 'unsupported') return 'unsupported'
  if (mode === 'recovery-blocked') return 'recovery-blocked'
  return 'protected'
}

function checkBaseline(
  current: TaskStoreLoadResult,
  baseline: RevisionBaseline,
): TaskStoreWriteResult | null {
  switch (current.kind) {
    case 'empty': {
      if (isBaselineSentinel(baseline)) {
        return baseline === 'legacy' ? conflict([]) : null
      }
      return conflict([])
    }
    case 'legacy': {
      if (baseline === 'legacy') return null
      if (isBaselineSentinel(baseline)) {
        return current.tasks.length > 0 ? conflict(current.tasks) : null
      }
      return conflict(current.tasks)
    }
    case 'restored': {
      if (isBaselineSentinel(baseline)) {
        return conflict(current.tasks, current.revision)
      }
      if (baseline !== current.revision) {
        return conflict(current.tasks, current.revision)
      }
      return null
    }
    default:
      return null
  }
}

function writeEnvelope(
  storage: StorageLike,
  tasks: Task[],
  deps: TaskStorageDependencies | undefined,
): TaskStoreWriteResult {
  const revision = resolveRandomId(deps)
  const updatedAt = resolveNow(deps).toISOString()
  const envelope = {
    version: TASKS_STORAGE_VERSION,
    revision,
    updatedAt,
    tasks,
  }

  try {
    storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(envelope))
  } catch (error) {
    return failure(
      isQuotaExceeded(error)
        ? 'STORAGE_QUOTA_EXCEEDED'
        : 'STORAGE_WRITE_FAILED',
    )
  }

  return { ok: true, revision, updatedAt }
}

async function performWrite(
  tasks: Task[],
  baseline: RevisionBaseline,
  intent: WriteIntent,
  storage: StorageLike,
  deps: TaskStorageDependencies | undefined,
): Promise<TaskStoreWriteResult> {
  const current = loadGuestTaskStore(deps)

  switch (current.kind) {
    case 'unavailable':
      return failure('STORAGE_UNAVAILABLE')
    case 'unsupported':
      return blocked('unsupported')
    case 'corrupt':
      if (intent !== 'discard-unreadable') return blocked('corrupt')
      break
    case 'migration-failed':
      if (intent !== 'discard-unreadable') return blocked('protected')
      break
    case 'partial':
      if (intent !== 'discard-unreadable') return blocked('recovery-blocked')
      break
    case 'legacy':
      if (
        quarantineTotal(current.quarantine) > 0 &&
        intent !== 'discard-unreadable'
      ) {
        return blocked('recovery-blocked')
      }
      if (intent !== 'discard-unreadable') {
        const conflictResult = checkBaseline(current, baseline)
        if (conflictResult) return conflictResult
      }
      break
    case 'restored':
    case 'empty': {
      if (intent !== 'discard-unreadable') {
        const conflictResult = checkBaseline(current, baseline)
        if (conflictResult) return conflictResult
      }
      break
    }
    default:
      break
  }

  return writeEnvelope(storage, tasks, deps)
}

export async function saveGuestTaskStore(
  tasks: Task[],
  baseline: RevisionBaseline,
  mode: PersistenceMode,
  intent: WriteIntent = 'automatic',
  deps?: TaskStorageDependencies,
): Promise<TaskStoreWriteResult> {
  if (intent === 'discard-unreadable') {
    if (mode !== 'recovery-blocked' && mode !== 'protected') {
      return blocked()
    }
  } else if (
    mode === 'unsupported' ||
    mode === 'recovery-blocked' ||
    mode === 'protected'
  ) {
    return blocked(modeBlockCause(mode))
  }

  if (mode === 'memory-only' && intent === 'automatic') {
    return blocked('memory-only')
  }

  for (const task of tasks) {
    if (!validateStoredTask(task).ok) {
      return failure('STORAGE_WRITE_FAILED')
    }
  }

  const storage = resolveStorage(deps)
  if (!storage) return failure('STORAGE_UNAVAILABLE')

  const operation = () => performWrite(tasks, baseline, intent, storage, deps)

  const locks = resolveLocks(deps)
  return enqueueWrite(() =>
    locks ? locks.request(TASKS_LOCK_NAME, operation) : operation(),
  )
}
