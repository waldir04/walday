import {
  SUGGESTIONS_STORAGE_KEY,
  SUGGESTIONS_STORAGE_VERSION,
  SUGGESTION_DISMISSAL_LIMIT,
} from '@/shared/config/suggestions'
import type { GuestStorage } from '@/shared/lib/guestStore'
import {
  enqueueWrite,
  isQuotaExceeded,
  resolveStorage,
} from '@/shared/lib/guestStore'
import type { LocalDate } from '@/shared/lib/localDateTime'
import { dismissalRecordSchema } from './dismissalSchema'
import type {
  DismissalEntry,
  DismissalRecord,
  DismissalState,
  DismissalWriteCode,
  DismissalWriteResult,
} from './types'

interface StorageWithRemove extends GuestStorage {
  removeItem?: (_key: string) => void
}

function asStorageWithRemove(
  storage: GuestStorage | null,
): StorageWithRemove | null {
  return storage as StorageWithRemove | null
}

function readEntries(
  storage: GuestStorage | null,
  today: LocalDate,
): DismissalEntry[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(SUGGESTIONS_STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    const result = dismissalRecordSchema.safeParse(parsed)
    if (!result.success) return []
    if (result.data.localDate !== today) return []
    return collapseDuplicates(result.data.entries)
  } catch {
    return []
  }
}

function collapseDuplicates(
  entries: readonly DismissalEntry[],
): DismissalEntry[] {
  const byId = new Map<string, DismissalEntry>()
  for (const entry of entries) {
    const existing = byId.get(entry.suggestionId)
    if (
      !existing ||
      Date.parse(entry.dismissedAt) >= Date.parse(existing.dismissedAt)
    ) {
      byId.set(entry.suggestionId, entry)
    }
  }
  return [...byId.values()]
}

function capEntries(entries: readonly DismissalEntry[]): DismissalEntry[] {
  const sorted = [...entries].sort(
    (a, b) => Date.parse(b.dismissedAt) - Date.parse(a.dismissedAt),
  )
  return sorted.slice(0, SUGGESTION_DISMISSAL_LIMIT).reverse()
}

function recordFor(
  today: LocalDate,
  entries: DismissalEntry[],
): DismissalRecord {
  return {
    version: SUGGESTIONS_STORAGE_VERSION,
    localDate: today,
    entries,
  }
}

function writeCode(error: unknown): DismissalWriteCode {
  return isQuotaExceeded(error)
    ? 'STORAGE_QUOTA_EXCEEDED'
    : 'STORAGE_WRITE_FAILED'
}

function writeRecord(
  storage: GuestStorage,
  today: LocalDate,
  entries: DismissalEntry[],
): Promise<DismissalWriteCode | null> {
  return enqueueWrite(async () => {
    try {
      if (entries.length === 0) {
        const removable = asStorageWithRemove(storage)
        if (removable?.removeItem) {
          removable.removeItem(SUGGESTIONS_STORAGE_KEY)
        } else {
          storage.setItem(
            SUGGESTIONS_STORAGE_KEY,
            JSON.stringify(recordFor(today, [])),
          )
        }
      } else {
        storage.setItem(
          SUGGESTIONS_STORAGE_KEY,
          JSON.stringify(recordFor(today, entries)),
        )
      }
      return null
    } catch (error) {
      return writeCode(error)
    }
  })
}

export function loadDismissals(input: {
  today: LocalDate
  storage?: GuestStorage | null
}): DismissalState {
  const { today } = input
  let storage: GuestStorage | null
  try {
    storage = resolveStorage(input.storage)
  } catch {
    storage = null
  }

  if (!storage) {
    return { localDate: today, entries: [], persistence: 'session-only' }
  }

  let raw: string | null
  try {
    raw = storage.getItem(SUGGESTIONS_STORAGE_KEY)
  } catch {
    return { localDate: today, entries: [], persistence: 'session-only' }
  }

  if (raw === null) {
    return { localDate: today, entries: [], persistence: 'persisted' }
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    const result = dismissalRecordSchema.safeParse(parsed)
    if (!result.success) {
      return { localDate: today, entries: [], persistence: 'persisted' }
    }
    if (result.data.localDate !== today) {
      return { localDate: today, entries: [], persistence: 'persisted' }
    }
    return {
      localDate: today,
      entries: collapseDuplicates(result.data.entries),
      persistence: 'persisted',
    }
  } catch {
    return { localDate: today, entries: [], persistence: 'persisted' }
  }
}

export async function dismissSuggestion(input: {
  state: DismissalState
  suggestion: {
    id: string
    activityKey: string
    changeSignature: string
  }
  now: Date
  today: LocalDate
  storage?: GuestStorage | null
}): Promise<DismissalWriteResult> {
  const { state, suggestion, now, today } = input
  const storage = resolveStorage(input.storage)
  const timestamp = now.toISOString()

  const merged = new Map<string, DismissalEntry>()
  for (const entry of readEntries(storage, today)) {
    merged.set(entry.suggestionId, entry)
  }
  if (state.localDate === today) {
    for (const entry of state.entries) {
      merged.set(entry.suggestionId, entry)
    }
  }
  merged.set(suggestion.id, {
    suggestionId: suggestion.id,
    activityKey: suggestion.activityKey,
    changeSignature: suggestion.changeSignature,
    dismissedAt: timestamp,
  })

  const entries = capEntries([...merged.values()])
  const nextState: DismissalState = {
    localDate: today,
    entries,
    persistence: 'persisted',
  }

  if (!storage) {
    return {
      ok: false,
      code: 'STORAGE_UNAVAILABLE',
      state: { ...nextState, persistence: 'session-only' },
    }
  }

  const code = await writeRecord(storage, today, entries)
  if (code) {
    return {
      ok: false,
      code,
      state: { ...nextState, persistence: 'session-only' },
    }
  }

  return { ok: true, state: nextState }
}

export async function restoreSuggestion(input: {
  state: DismissalState
  suggestionId: string
  today: LocalDate
  storage?: GuestStorage | null
}): Promise<DismissalWriteResult> {
  const { state, suggestionId, today } = input
  const storage = resolveStorage(input.storage)

  const current = state.localDate === today ? state.entries : []
  const entries = current.filter((entry) => entry.suggestionId !== suggestionId)
  const nextState: DismissalState = {
    localDate: today,
    entries,
    persistence: 'persisted',
  }

  if (!storage) {
    return {
      ok: false,
      code: 'STORAGE_UNAVAILABLE',
      state: { ...nextState, persistence: 'session-only' },
    }
  }

  const code = await writeRecord(storage, today, entries)
  if (code) {
    return {
      ok: false,
      code,
      state: { ...nextState, persistence: 'session-only' },
    }
  }

  return { ok: true, state: nextState }
}
