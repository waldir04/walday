import {
  PREFERENCES_LOCK_NAME,
  PREFERENCES_STORAGE_KEY,
  PREFERENCES_STORAGE_VERSION,
} from '@/shared/config/preferences'
import { firstSupportedBrowserLanguage, getBrowserLanguages } from './defaults'
import { classifyStoredPayload, type MigrationContext } from './sanitize'
import { userPreferencesSchema } from './schema'
import type {
  LockManagerLike,
  PreferenceStorageDependencies,
  PreferenceWriteErrorCode,
  PreferenceWriteIntent,
  PreferenceWriteResult,
  PreferenceLoadResult,
  RevisionBaseline,
  StorageLike,
  UserPreferences,
  WriteBlockCause,
} from './types'

let writeChain: Promise<unknown> = Promise.resolve()

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeChain.then(operation, operation)
  writeChain = next.catch(() => undefined)
  return next
}

function resolveStorage(
  deps: PreferenceStorageDependencies | undefined,
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
  deps: PreferenceStorageDependencies | undefined,
): LockManagerLike | null {
  if (deps && 'locks' in deps) {
    return deps.locks ?? null
  }
  try {
    if (typeof navigator === 'undefined' || !navigator.locks) return null
    const locks = navigator.locks
    return {
      request: async <T>(name: string, callback: () => Promise<T>) =>
        locks.request(name, () => callback()),
    }
  } catch {
    return null
  }
}

function resolveNow(deps: PreferenceStorageDependencies | undefined): Date {
  return (deps?.now ?? (() => new Date()))()
}

function resolveRandomId(
  deps: PreferenceStorageDependencies | undefined,
): string {
  return (deps?.randomId ?? (() => crypto.randomUUID()))()
}

function migrationContext(
  deps: PreferenceStorageDependencies | undefined,
): MigrationContext {
  const languages = deps?.browserLanguages ?? getBrowserLanguages()
  return {
    firstSupportedBrowserLanguage: firstSupportedBrowserLanguage(languages),
  }
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

export function loadPreferences(
  deps?: PreferenceStorageDependencies,
): PreferenceLoadResult {
  const storage = resolveStorage(deps)
  if (!storage) return { kind: 'unavailable' }

  let raw: string | null
  try {
    raw = storage.getItem(PREFERENCES_STORAGE_KEY)
  } catch {
    return { kind: 'unavailable' }
  }

  if (raw === null) return { kind: 'empty' }

  return classifyStoredPayload(raw, migrationContext(deps))
}

function failure(code: PreferenceWriteErrorCode): PreferenceWriteResult {
  return { ok: false, code }
}

function blocked(cause: WriteBlockCause): PreferenceWriteResult {
  return {
    ok: false,
    code: 'STORAGE_WRITE_BLOCKED',
    cause,
  }
}

function conflict(latestRevision?: string): PreferenceWriteResult {
  return {
    ok: false,
    code: 'STORAGE_CONFLICT',
    ...(latestRevision ? { latestRevision } : {}),
  }
}

function baselineMatches(
  current: PreferenceLoadResult,
  baseline: RevisionBaseline,
): boolean {
  if (current.kind === 'empty') {
    return baseline.revision === 'unknown'
  }
  if (current.kind === 'restored' || current.kind === 'partial') {
    if (current.revision === undefined) {
      return baseline.revision === 'unknown'
    }
    return baseline.revision === current.revision
  }
  return true
}

function writeEnvelope(
  storage: StorageLike,
  preferences: UserPreferences,
  deps: PreferenceStorageDependencies | undefined,
): PreferenceWriteResult {
  const revision = resolveRandomId(deps)
  const updatedAt = resolveNow(deps).toISOString()
  const envelope = {
    version: PREFERENCES_STORAGE_VERSION,
    revision,
    updatedAt,
    preferences,
  }

  try {
    storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(envelope))
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
  preferences: UserPreferences,
  baseline: RevisionBaseline,
  intent: PreferenceWriteIntent,
  storage: StorageLike,
  deps: PreferenceStorageDependencies | undefined,
): PreferenceWriteResult {
  const current = loadPreferences(deps)

  switch (current.kind) {
    case 'unavailable':
      return failure('STORAGE_UNAVAILABLE')
    case 'unsupported':
      if (intent !== 'replace-unreadable') return blocked('unsupported')
      break
    case 'corrupt':
      if (intent !== 'replace-unreadable') return blocked('corrupt')
      break
    case 'migration-failed':
      if (intent !== 'replace-unreadable') return blocked('migration-failed')
      break
    case 'partial':
      if (intent !== 'replace-unreadable') return blocked('partial')
      break
    case 'restored':
    case 'empty':
      if (
        intent !== 'replace-unreadable' &&
        !baselineMatches(current, baseline)
      ) {
        return conflict(
          current.kind === 'restored' ? current.revision : undefined,
        )
      }
      break
    default:
      break
  }

  return writeEnvelope(storage, preferences, deps)
}

export async function savePreferences(
  preferences: UserPreferences,
  baseline: RevisionBaseline,
  intent: PreferenceWriteIntent = 'automatic',
  deps?: PreferenceStorageDependencies,
): Promise<PreferenceWriteResult> {
  const validation = userPreferencesSchema.safeParse(preferences)
  if (!validation.success) return failure('STORAGE_WRITE_FAILED')

  const storage = resolveStorage(deps)
  if (!storage) return failure('STORAGE_UNAVAILABLE')

  const operation = async () =>
    performWrite(validation.data, baseline, intent, storage, deps)

  const locks = resolveLocks(deps)
  return enqueueWrite(async () => {
    if (!locks) return operation()
    try {
      return await locks.request(PREFERENCES_LOCK_NAME, operation)
    } catch {
      return failure('STORAGE_WRITE_FAILED')
    }
  })
}
