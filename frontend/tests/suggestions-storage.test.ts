import { describe, expect, it } from 'vitest'
import {
  SUGGESTIONS_STORAGE_KEY,
  SUGGESTION_DISMISSAL_LIMIT,
} from '../src/shared/config/suggestions'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import type { GuestStorage } from '../src/shared/lib/guestStore'
import {
  dismissSuggestion,
  loadDismissals,
  restoreSuggestion,
} from '../src/features/suggestions/model/dismissalStorage'

const TODAY = '2026-11-18'
const NOW = new Date('2026-11-18T10:00:00.000Z')

class MemoryStorage implements GuestStorage {
  data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }
}

function record(entries: unknown[], localDate = TODAY): string {
  return JSON.stringify({ version: 1, localDate, entries })
}

async function seedDismissal(
  storage: GuestStorage,
  id: string,
  activityKey = 'task:one',
  changeSignature = 'schedule-task:one:2026-11-18:480-540',
): Promise<void> {
  const state = loadDismissals({ today: TODAY, storage })
  await dismissSuggestion({
    state,
    suggestion: { id, activityKey, changeSignature },
    now: NOW,
    today: TODAY,
    storage,
  })
}

describe('dismissal storage load', () => {
  it('returns session-only empty state without storage', () => {
    expect(loadDismissals({ today: TODAY, storage: null })).toEqual({
      localDate: TODAY,
      entries: [],
      persistence: 'session-only',
    })
  })

  it('never throws when storage read fails', () => {
    const throwing: GuestStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => undefined,
    }
    expect(loadDismissals({ today: TODAY, storage: throwing })).toMatchObject({
      entries: [],
      persistence: 'session-only',
    })
  })

  it('returns empty persisted state for a missing key', () => {
    expect(
      loadDismissals({ today: TODAY, storage: new MemoryStorage() }),
    ).toEqual({ localDate: TODAY, entries: [], persistence: 'persisted' })
  })

  it('rejects invalid JSON, unknown keys, wrong version, wrong date and bad timestamps', () => {
    const cases = [
      '{not-json',
      JSON.stringify({
        version: 1,
        localDate: TODAY,
        entries: [
          {
            suggestionId: 'a',
            activityKey: 'task:a',
            changeSignature: 'signature',
            dismissedAt: NOW.toISOString(),
            extra: true,
          },
        ],
      }),
      record([], TODAY).replace('"version":1', '"version":2'),
      record([], '2026-11-19'),
      record([
        {
          suggestionId: 'a',
          activityKey: 'task:a',
          changeSignature: 'signature',
          dismissedAt: 'not-a-timestamp',
        },
      ]),
    ]

    for (const raw of cases) {
      const storage = new MemoryStorage()
      storage.setItem(SUGGESTIONS_STORAGE_KEY, raw)
      expect(loadDismissals({ today: TODAY, storage })).toMatchObject({
        entries: [],
      })
    }
  })

  it('rejects more than the dismissal limit', () => {
    const storage = new MemoryStorage()
    const entries = Array.from(
      { length: SUGGESTION_DISMISSAL_LIMIT + 1 },
      (_, index) => ({
        suggestionId: `suggestion-${index}`,
        activityKey: `task:${index}`,
        changeSignature: `signature-${index}`,
        dismissedAt: NOW.toISOString(),
      }),
    )
    storage.setItem(SUGGESTIONS_STORAGE_KEY, record(entries))
    expect(loadDismissals({ today: TODAY, storage }).entries).toEqual([])
  })

  it('keeps same-day entries and collapses duplicate ids to the latest', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      SUGGESTIONS_STORAGE_KEY,
      record([
        {
          suggestionId: 'a',
          activityKey: 'task:a',
          changeSignature: 'one',
          dismissedAt: '2026-11-18T08:00:00.000Z',
        },
        {
          suggestionId: 'a',
          activityKey: 'task:a',
          changeSignature: 'one',
          dismissedAt: '2026-11-18T09:00:00.000Z',
        },
      ]),
    )

    const state = loadDismissals({ today: TODAY, storage })
    expect(state.entries).toHaveLength(1)
    expect(state.entries[0]?.dismissedAt).toBe('2026-11-18T09:00:00.000Z')
  })
})

describe('dismissal storage write', () => {
  it('dismisses twice for one id keeping one latest entry', async () => {
    const storage = new MemoryStorage()
    const state = loadDismissals({ today: TODAY, storage })
    const first = await dismissSuggestion({
      state,
      suggestion: {
        id: 'a',
        activityKey: 'task:a',
        changeSignature: 'one',
      },
      now: NOW,
      today: TODAY,
      storage,
    })
    expect(first.ok).toBe(true)

    const later = new Date('2026-11-18T11:00:00.000Z')
    const second = await dismissSuggestion({
      state: first.state,
      suggestion: {
        id: 'a',
        activityKey: 'task:a',
        changeSignature: 'one',
      },
      now: later,
      today: TODAY,
      storage,
    })

    expect(second.ok).toBe(true)
    expect(second.state.entries).toHaveLength(1)
    expect(second.state.entries[0]?.dismissedAt).toBe(later.toISOString())
  })

  it('keeps a distinct entry for a different change of the same activity', async () => {
    const storage = new MemoryStorage()
    await seedDismissal(storage, 'a', 'task:a', 'signature-one')
    await seedDismissal(storage, 'b', 'task:a', 'signature-two')

    const state = loadDismissals({ today: TODAY, storage })
    expect(state.entries.map((entry) => entry.suggestionId).sort()).toEqual([
      'a',
      'b',
    ])
  })

  it('merges writes from another tab and starts empty on the next day', async () => {
    const storage = new MemoryStorage()
    await seedDismissal(storage, 'a')
    await seedDismissal(storage, 'b')

    const state = loadDismissals({ today: TODAY, storage })
    expect(state.entries).toHaveLength(2)

    expect(loadDismissals({ today: '2026-11-19', storage })).toMatchObject({
      entries: [],
    })
  })

  it('keeps a session-only decision when storage write fails', async () => {
    const storage: GuestStorage = {
      getItem: () => null,
      setItem: () => {
        const error = new Error('quota')
        error.name = 'QuotaExceededError'
        throw error
      },
    }

    const result = await dismissSuggestion({
      state: { localDate: TODAY, entries: [], persistence: 'persisted' },
      suggestion: {
        id: 'a',
        activityKey: 'task:a',
        changeSignature: 'signature',
      },
      now: NOW,
      today: TODAY,
      storage,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('STORAGE_QUOTA_EXCEEDED')
      expect(result.state.persistence).toBe('session-only')
      expect(result.state.entries).toHaveLength(1)
    }
  })

  it('restores only the matching entry and removes the key when empty', async () => {
    const storage = new MemoryStorage()
    await seedDismissal(storage, 'a')
    await seedDismissal(storage, 'b')
    const state = loadDismissals({ today: TODAY, storage })

    const result = await restoreSuggestion({
      state,
      suggestionId: 'a',
      today: TODAY,
      storage,
    })

    expect(result.state.entries.map((entry) => entry.suggestionId)).toEqual([
      'b',
    ])

    await restoreSuggestion({
      state: result.state,
      suggestionId: 'b',
      today: TODAY,
      storage,
    })
    expect(storage.getItem(SUGGESTIONS_STORAGE_KEY)).toBeNull()
  })

  it('writes an empty record when removeItem is unavailable', async () => {
    const data = new Map<string, string>()
    const storage: GuestStorage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value)
      },
    }
    const state = loadDismissals({ today: TODAY, storage })
    const dismissed = await dismissSuggestion({
      state,
      suggestion: {
        id: 'a',
        activityKey: 'task:a',
        changeSignature: 'signature',
      },
      now: NOW,
      today: TODAY,
      storage,
    })

    await restoreSuggestion({
      state: dismissed.state,
      suggestionId: 'a',
      today: TODAY,
      storage,
    })

    const raw = data.get(SUGGESTIONS_STORAGE_KEY)
    expect(raw).toBeDefined()
    expect(JSON.parse(raw ?? '{}')).toMatchObject({
      localDate: TODAY,
      entries: [],
    })
  })

  it('never touches task or commitment storage keys', async () => {
    const storage = new MemoryStorage()
    storage.setItem(TASKS_STORAGE_KEY, 'tasks')
    storage.setItem(COMMITMENTS_STORAGE_KEY, 'commitments')

    await seedDismissal(storage, 'a')
    const state = loadDismissals({ today: TODAY, storage })
    await restoreSuggestion({
      state,
      suggestionId: 'a',
      today: TODAY,
      storage,
    })

    expect(storage.getItem(TASKS_STORAGE_KEY)).toBe('tasks')
    expect(storage.getItem(COMMITMENTS_STORAGE_KEY)).toBe('commitments')
  })
})
