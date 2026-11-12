import { describe, expect, it, vi } from 'vitest'
import {
  loadGuestTaskStore,
  saveGuestTaskStore,
  type TaskStorageDependencies,
} from '@/entities/task'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { createFakeLocks, FakeStorage } from './helpers/fakeStorage'
import {
  createIdSequence,
  fixedClock,
  makeEnvelope,
  makeLegacyRecord,
  makeStoredTask,
  makeTask,
  readStore,
  seedStore,
} from './helpers/taskFixtures'

function writeDeps(
  storage: FakeStorage,
  overrides: Partial<TaskStorageDependencies> = {},
): TaskStorageDependencies {
  return {
    storage,
    now: fixedClock,
    randomId: createIdSequence('revision'),
    locks: null,
    ...overrides,
  }
}

describe('guest task store loading', () => {
  it('returns empty for an absent key', () => {
    expect(loadGuestTaskStore({ storage: new FakeStorage() })).toEqual({
      kind: 'empty',
    })
  })

  it('migrates a legacy bare array into validated tasks', () => {
    const storage = new FakeStorage()
    seedStore(storage, [makeLegacyRecord()])

    const result = loadGuestTaskStore({ storage })
    expect(result.kind).toBe('legacy')
    if (result.kind !== 'legacy') return

    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]).toMatchObject({
      id: 'legacy-1',
      title: 'Legacy task',
      description: 'Imported from the prototype',
      priority: 'high',
      dueDate: '2026-12-01',
      estimatedMinutes: 90,
      status: 'pending',
    })
    expect(result.tasks[0]?.createdAt).toBe('2026-11-12T14:30:00.000Z')
    expect(result.quarantine.invalidRecords).toBe(0)
  })

  it('quarantines invalid and unmappable legacy records while keeping valid ones', () => {
    const storage = new FakeStorage()
    seedStore(storage, [
      makeLegacyRecord(),
      makeLegacyRecord({ id: 'legacy-2', title: 'ab' }),
      makeLegacyRecord({ id: 'legacy-3', estimatedDuration: 'soon' }),
      makeLegacyRecord({ id: 'legacy-4', completed: 'yes' }),
    ])

    const result = loadGuestTaskStore({ storage })
    expect(result.kind).toBe('legacy')
    if (result.kind !== 'legacy') return

    expect(result.tasks.map((task) => task.id)).toEqual(['legacy-1'])
    expect(result.quarantine.invalidRecords).toBe(3)
    expect(result.quarantine.reasonCodes).toEqual(
      expect.arrayContaining([
        'TITLE_TOO_SHORT',
        'DURATION_INVALID',
        'LEGACY_MAPPING_FAILED',
      ]),
    )
  })

  it('quarantines duplicate legacy identities', () => {
    const storage = new FakeStorage()
    seedStore(storage, [
      makeLegacyRecord({ id: 'dupe' }),
      makeLegacyRecord({ id: 'dupe' }),
      makeLegacyRecord({ id: 'kept' }),
    ])

    const result = loadGuestTaskStore({ storage })
    expect(result.kind).toBe('legacy')
    if (result.kind !== 'legacy') return

    expect(result.tasks.map((task) => task.id)).toEqual(['kept'])
    expect(result.quarantine.duplicateIdentities).toBe(2)
    expect(result.quarantine.reasonCodes).toContain('TASK_DUPLICATE_ID')
  })

  it('restores a v1 envelope and returns validated domain objects', () => {
    const storage = new FakeStorage()
    seedStore(
      storage,
      makeEnvelope([
        makeStoredTask({ title: '  Trim me  ', description: '   ' }),
      ]),
    )

    const result = loadGuestTaskStore({ storage })
    expect(result.kind).toBe('restored')
    if (result.kind !== 'restored') return

    expect(result.revision).toBe('revision-1')
    expect(result.tasks[0]?.title).toBe('Trim me')
    expect(result.tasks[0]?.description).toBeUndefined()
  })

  it('restores valid records and quarantines invalid records and duplicates', () => {
    const storage = new FakeStorage()
    seedStore(
      storage,
      makeEnvelope([
        makeStoredTask({ id: 'valid' }),
        makeStoredTask({ id: 'short', title: 'ab' }),
        makeStoredTask({ id: 'unknown', extra: true }),
        makeStoredTask({ id: 'dupe' }),
        makeStoredTask({ id: 'dupe' }),
      ]),
    )

    const result = loadGuestTaskStore({ storage })
    expect(result.kind).toBe('partial')
    if (result.kind !== 'partial') return

    expect(result.tasks.map((task) => task.id)).toEqual(['valid'])
    expect(result.quarantine.invalidRecords).toBe(2)
    expect(result.quarantine.duplicateIdentities).toBe(2)
    expect(result.quarantine.reasonCodes).toEqual(
      expect.arrayContaining([
        'TITLE_TOO_SHORT',
        'TASK_UNKNOWN_FIELD',
        'TASK_DUPLICATE_ID',
      ]),
    )
  })

  it('reports an unsupported newer version without writing', () => {
    const storage = new FakeStorage()
    const raw = JSON.stringify(makeEnvelope([], { version: 99 }))
    storage.data.set(TASKS_STORAGE_KEY, raw)

    expect(loadGuestTaskStore({ storage })).toEqual({
      kind: 'unsupported',
      detectedVersion: 99,
      raw,
    })
    expect(storage.setItemCalls).toBe(0)
  })

  it('reports corrupt JSON and invalid envelopes while preserving the raw value', () => {
    const corrupt = new FakeStorage()
    corrupt.data.set(TASKS_STORAGE_KEY, '{not valid json')
    expect(loadGuestTaskStore({ storage: corrupt })).toEqual({
      kind: 'corrupt',
      raw: '{not valid json',
    })

    const invalid = new FakeStorage()
    const raw = JSON.stringify({ version: 1, tasks: [] })
    invalid.data.set(TASKS_STORAGE_KEY, raw)
    expect(loadGuestTaskStore({ storage: invalid })).toEqual({
      kind: 'corrupt',
      raw,
    })
  })

  it('preserves an older payload when no safe migration exists', () => {
    const storage = new FakeStorage()
    const raw = JSON.stringify({ version: 0, tasks: [] })
    storage.data.set(TASKS_STORAGE_KEY, raw)

    expect(loadGuestTaskStore({ storage })).toEqual({
      kind: 'migration-failed',
      fromVersion: 0,
      raw,
    })
  })

  it('reports unavailable storage instead of throwing', () => {
    expect(loadGuestTaskStore({ storage: null })).toEqual({
      kind: 'unavailable',
    })

    const storage = new FakeStorage()
    storage.getError = new Error('denied')
    expect(loadGuestTaskStore({ storage })).toEqual({
      kind: 'unavailable',
    })
  })
})

describe('guest task store writes', () => {
  it('writes a versioned envelope with a fresh revision and timestamp', async () => {
    const storage = new FakeStorage()
    const task = makeTask()

    const result = await saveGuestTaskStore(
      [task],
      'empty',
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result).toEqual({
      ok: true,
      revision: 'revision-1',
      updatedAt: '2026-11-12T14:30:00.000Z',
    })

    const stored = readStore(storage)
    expect(stored).toMatchObject({
      version: 1,
      revision: 'revision-1',
      updatedAt: '2026-11-12T14:30:00.000Z',
    })
    expect(stored.tasks).toEqual([task])
  })

  it('regenerates the revision on every successful write', async () => {
    const storage = new FakeStorage()
    const deps = writeDeps(storage)

    const first = await saveGuestTaskStore(
      [makeTask()],
      'empty',
      'normal',
      undefined,
      deps,
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const second = await saveGuestTaskStore(
      [makeTask({ title: 'Updated title' })],
      first.revision,
      'normal',
      undefined,
      deps,
    )
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.revision).not.toBe(first.revision)
    expect(readStore(storage).revision).toBe(second.revision)
  })

  it('aborts a stale revision and returns the latest tasks', async () => {
    const storage = new FakeStorage()
    const latestTask = makeTask({ id: 'latest', title: 'Latest task' })
    seedStore(
      storage,
      makeEnvelope([latestTask], { revision: 'external-revision' }),
    )

    const result = await saveGuestTaskStore(
      [makeTask({ id: 'mine' })],
      'revision-1',
      'normal',
      undefined,
      writeDeps(storage),
    )

    expect(result).toMatchObject({
      ok: false,
      code: 'STORAGE_CONFLICT',
      latestRevision: 'external-revision',
    })
    if (result.ok) return
    expect(result.latest?.map((task) => task.id)).toEqual(['latest'])
    expect(readStore(storage).revision).toBe('external-revision')
  })

  it.each([
    ['empty baseline over a non-empty v1 store', 'empty'],
    ['unknown baseline over a non-empty v1 store', 'unknown'],
  ] as const)('rejects an %s', async (_label, baseline) => {
    const storage = new FakeStorage()
    seedStore(storage, makeEnvelope([makeStoredTask()]))

    const result = await saveGuestTaskStore(
      [makeTask()],
      baseline,
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result).toMatchObject({ ok: false, code: 'STORAGE_CONFLICT' })
  })

  it('rejects an unknown baseline over non-empty legacy data', async () => {
    const storage = new FakeStorage()
    seedStore(storage, [makeLegacyRecord()])

    const result = await saveGuestTaskStore(
      [makeTask()],
      'unknown',
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result).toMatchObject({ ok: false, code: 'STORAGE_CONFLICT' })
  })

  it('rejects a legacy baseline when the store became empty', async () => {
    const storage = new FakeStorage()
    const result = await saveGuestTaskStore(
      [makeTask()],
      'legacy',
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result).toMatchObject({ ok: false, code: 'STORAGE_CONFLICT' })
  })

  it('rejects a v1 baseline after the store was cleared', async () => {
    const storage = new FakeStorage()
    const first = await saveGuestTaskStore(
      [makeTask()],
      'empty',
      'normal',
      undefined,
      writeDeps(storage),
    )
    if (!first.ok) throw new Error('setup write failed')
    storage.data.delete(TASKS_STORAGE_KEY)

    const result = await saveGuestTaskStore(
      [makeTask({ title: 'Resurrected' })],
      first.revision,
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result).toMatchObject({ ok: false, code: 'STORAGE_CONFLICT' })
  })

  it('rejects a v1 baseline when an unexpected legacy payload appears', async () => {
    const storage = new FakeStorage()
    seedStore(storage, [makeLegacyRecord()])

    const result = await saveGuestTaskStore(
      [makeTask()],
      'revision-1',
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'STORAGE_CONFLICT',
    })
    if (result.ok) return
    expect(result.latest?.map((task) => task.id)).toEqual(['legacy-1'])
  })

  it('migrates unchanged legacy data with a legacy baseline', async () => {
    const storage = new FakeStorage()
    seedStore(storage, [makeLegacyRecord()])

    const result = await saveGuestTaskStore(
      [makeTask()],
      'legacy',
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result.ok).toBe(true)
    expect(readStore(storage).version).toBe(1)
  })

  it('blocks automatic writes in memory-only mode and allows an explicit retry', async () => {
    const storage = new FakeStorage()
    const deps = writeDeps(storage)

    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'empty',
        'memory-only',
        undefined,
        deps,
      ),
    ).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'memory-only',
    })

    const retry = await saveGuestTaskStore(
      [makeTask()],
      'empty',
      'memory-only',
      'retry',
      deps,
    )
    expect(retry.ok).toBe(true)
  })

  it('conflicts when a retry from an unknown baseline finds existing data', async () => {
    const storage = new FakeStorage()
    seedStore(storage, makeEnvelope([makeStoredTask()]))

    const result = await saveGuestTaskStore(
      [makeTask()],
      'unknown',
      'memory-only',
      'retry',
      writeDeps(storage),
    )
    expect(result).toMatchObject({ ok: false, code: 'STORAGE_CONFLICT' })
  })

  it('blocks writes in unsupported mode and never overwrites newer data', async () => {
    const storage = new FakeStorage()
    const raw = JSON.stringify(makeEnvelope([], { version: 99 }))
    storage.data.set(TASKS_STORAGE_KEY, raw)

    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'unknown',
        'unsupported',
        undefined,
        writeDeps(storage),
      ),
    ).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'unsupported',
    })

    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'unknown',
        'unsupported',
        'discard-unreadable',
        writeDeps(storage),
      ),
    ).toMatchObject({ ok: false, code: 'STORAGE_WRITE_BLOCKED' })

    expect(storage.data.get(TASKS_STORAGE_KEY)).toBe(raw)
  })

  it('blocks recovery writes until an explicit discard replaces corrupt data', async () => {
    const storage = new FakeStorage()
    storage.data.set(TASKS_STORAGE_KEY, '{corrupt')
    const deps = writeDeps(storage)

    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'unknown',
        'recovery-blocked',
        undefined,
        deps,
      ),
    ).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'recovery-blocked',
    })

    const discard = await saveGuestTaskStore(
      [makeTask()],
      'unknown',
      'recovery-blocked',
      'discard-unreadable',
      deps,
    )
    expect(discard.ok).toBe(true)
    expect(readStore(storage).version).toBe(1)
  })

  it('blocks legacy migration writes when unreadable records were quarantined', async () => {
    const storage = new FakeStorage()
    seedStore(storage, [
      makeLegacyRecord(),
      makeLegacyRecord({ id: 'bad', title: 'x' }),
    ])

    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'legacy',
        'normal',
        undefined,
        writeDeps(storage),
      ),
    ).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'recovery-blocked',
    })

    const discard = await saveGuestTaskStore(
      [makeTask()],
      'legacy',
      'recovery-blocked',
      'discard-unreadable',
      writeDeps(storage),
    )
    expect(discard.ok).toBe(true)
  })

  it('keeps protected data untouched and allows a confirmed discard', async () => {
    const storage = new FakeStorage()
    storage.data.set(TASKS_STORAGE_KEY, '{protected')
    const deps = writeDeps(storage)

    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'unknown',
        'protected',
        undefined,
        deps,
      ),
    ).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'protected',
    })
    expect(storage.data.get(TASKS_STORAGE_KEY)).toBe('{protected')

    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'unknown',
        'protected',
        'discard-unreadable',
        deps,
      ).then((result) => result.ok),
    ).toBe(true)
  })

  it('classifies quota and general storage write failures', async () => {
    const quotaStorage = new FakeStorage()
    quotaStorage.setError = { name: 'QuotaExceededError' }
    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'empty',
        'normal',
        undefined,
        writeDeps(quotaStorage),
      ),
    ).toMatchObject({ ok: false, code: 'STORAGE_QUOTA_EXCEEDED' })

    const failingStorage = new FakeStorage()
    failingStorage.setError = new Error('disk failure')
    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'empty',
        'normal',
        undefined,
        writeDeps(failingStorage),
      ),
    ).toMatchObject({ ok: false, code: 'STORAGE_WRITE_FAILED' })
  })

  it('reports unavailable storage on write', async () => {
    expect(
      await saveGuestTaskStore([makeTask()], 'empty', 'normal', undefined, {
        storage: null,
      }),
    ).toMatchObject({ ok: false, code: 'STORAGE_UNAVAILABLE' })
  })

  it('serializes writes through Web Locks when available', async () => {
    const storage = new FakeStorage()
    const locks = createFakeLocks()

    const [first, second] = await Promise.all([
      saveGuestTaskStore(
        [makeTask({ id: 'one' })],
        'empty',
        'normal',
        undefined,
        writeDeps(storage, { locks, randomId: createIdSequence('a') }),
      ),
      saveGuestTaskStore(
        [makeTask({ id: 'two' })],
        'empty',
        'normal',
        undefined,
        writeDeps(storage, { locks, randomId: createIdSequence('b') }),
      ),
    ])

    expect(first.ok).toBe(true)
    expect(second).toMatchObject({ ok: false, code: 'STORAGE_CONFLICT' })
    expect(locks.names).toEqual(['walday:tasks', 'walday:tasks'])
    expect(locks.maxConcurrent).toBe(1)
  })

  it('aborts stale writers without Web Locks', async () => {
    const storage = new FakeStorage()
    const [first, second] = await Promise.all([
      saveGuestTaskStore(
        [makeTask({ id: 'one' })],
        'empty',
        'normal',
        undefined,
        writeDeps(storage),
      ),
      saveGuestTaskStore(
        [makeTask({ id: 'two' })],
        'empty',
        'normal',
        undefined,
        writeDeps(storage),
      ),
    ])
    expect(first.ok).toBe(true)
    expect(second).toMatchObject({ ok: false, code: 'STORAGE_CONFLICT' })
  })

  it('does not log task content or raw payloads on failure paths', async () => {
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
    ]

    const storage = new FakeStorage()
    storage.data.set(
      TASKS_STORAGE_KEY,
      JSON.stringify(
        makeEnvelope([makeTask({ title: 'Secret task title' })], {
          version: 99,
        }),
      ),
    )
    loadGuestTaskStore({ storage })
    await saveGuestTaskStore(
      [makeTask()],
      'unknown',
      'unsupported',
      undefined,
      writeDeps(storage),
    )

    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    }
  })
})

describe('deletion persistence failures', () => {
  it('keeps the previous envelope when a deletion write fails', async () => {
    const storage = new FakeStorage()
    const kept = makeTask({ id: 'kept', title: 'Kept task' })
    const removed = makeTask({ id: 'removed', title: 'Removed task' })
    seedStore(
      storage,
      makeEnvelope([kept, removed], { revision: 'revision-kept' }),
    )
    storage.setError = { name: 'QuotaExceededError' }

    const result = await saveGuestTaskStore(
      [kept],
      'revision-kept',
      'normal',
      undefined,
      writeDeps(storage),
    )

    expect(result).toMatchObject({
      ok: false,
      code: 'STORAGE_QUOTA_EXCEEDED',
    })
    const stored = loadGuestTaskStore({ storage })
    expect(stored.kind).toBe('restored')
    if (stored.kind !== 'restored') return
    expect(stored.tasks.map((task) => task.id)).toEqual(['kept', 'removed'])
    expect(stored.revision).toBe('revision-kept')
  })
})

describe('failed migration recovery', () => {
  it('preserves an older payload until a confirmed discard writes a fresh envelope', async () => {
    const storage = new FakeStorage()
    const raw = JSON.stringify({ version: 0, tasks: [] })
    storage.data.set(TASKS_STORAGE_KEY, raw)
    const deps = writeDeps(storage)

    expect(
      await saveGuestTaskStore(
        [makeTask()],
        'unknown',
        'protected',
        undefined,
        deps,
      ),
    ).toMatchObject({
      ok: false,
      code: 'STORAGE_WRITE_BLOCKED',
      cause: 'protected',
    })
    expect(storage.data.get(TASKS_STORAGE_KEY)).toBe(raw)

    const discard = await saveGuestTaskStore(
      [makeTask()],
      'unknown',
      'protected',
      'discard-unreadable',
      deps,
    )
    expect(discard.ok).toBe(true)
    expect(readStore(storage).version).toBe(1)
  })
})

describe('storage defaults and edge cases', () => {
  it('uses default revision and timestamp generators', async () => {
    const storage = new FakeStorage()
    const result = await saveGuestTaskStore(
      [makeTask()],
      'empty',
      'normal',
      undefined,
      { storage, locks: null },
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.revision).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(Number.isFinite(Date.parse(result.updatedAt))).toBe(true)
  })

  it('uses the global Web Locks API when available', async () => {
    const storage = new FakeStorage()
    const locks = createFakeLocks()
    vi.stubGlobal('navigator', { locks })
    try {
      const result = await saveGuestTaskStore(
        [makeTask()],
        'empty',
        'normal',
        undefined,
        { storage },
      )
      expect(result.ok).toBe(true)
      expect(locks.names).toEqual(['walday:tasks'])
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('rejects invalid task objects before writing', async () => {
    const storage = new FakeStorage()
    const invalid = { ...makeTask(), title: '' }
    const result = await saveGuestTaskStore(
      [invalid],
      'empty',
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result).toMatchObject({ ok: false, code: 'STORAGE_WRITE_FAILED' })
    expect(storage.setItemCalls).toBe(0)
  })

  it('allows an empty baseline over an empty legacy payload', async () => {
    const storage = new FakeStorage()
    seedStore(storage, [])
    const result = await saveGuestTaskStore(
      [makeTask()],
      'empty',
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result.ok).toBe(true)
  })

  it('classifies quota failures reported with a legacy numeric code', async () => {
    const storage = new FakeStorage()
    storage.setError = { code: 22 }
    const result = await saveGuestTaskStore(
      [makeTask()],
      'empty',
      'normal',
      undefined,
      writeDeps(storage),
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'STORAGE_QUOTA_EXCEEDED',
    })
  })
})
