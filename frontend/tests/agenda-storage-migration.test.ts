import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  loadGuestTaskStore,
  saveGuestTaskStore,
  type TaskDraft,
} from '@/entities/task'
import { useTasks } from '@/features/tasks'
import { TASKS_STORAGE_KEY } from '@/shared/config/tasks'
import { createFakeLocks, FakeStorage } from './helpers/fakeStorage'
import {
  createIdSequence,
  fixedClock,
  makeEnvelope,
  makeLegacyRecord,
  makeStoredTask,
  readStore,
  seedStore,
} from './helpers/taskFixtures'

const SCHEDULED = {
  plannedDate: '2026-11-15',
  plannedStartTime: '09:00',
  estimatedMinutes: 45,
}

function v2Envelope(tasks: unknown[], revision = 'revision-2') {
  return {
    version: 2,
    revision,
    updatedAt: '2026-11-15T08:00:00.000Z',
    tasks,
  }
}

function writeDeps(storage: FakeStorage) {
  return {
    storage,
    now: fixedClock,
    randomId: createIdSequence('revision'),
    locks: createFakeLocks(),
  }
}

function draft(title: string): TaskDraft {
  return {
    title,
    description: '',
    priority: 'medium',
    dueDate: '',
    estimatedDurationInput: '',
  }
}

describe('agenda task slot storage migration', () => {
  it('loads a realistic version 1 envelope without inventing a slot and rewrites it as version 2', async () => {
    const storage = new FakeStorage()
    seedStore(
      storage,
      makeEnvelope([
        makeStoredTask({ id: 'one', title: 'Older task' }),
        makeStoredTask({ id: 'two', title: 'Second task' }),
      ]),
    )

    const loaded = loadGuestTaskStore({ storage })
    expect(loaded.kind).toBe('restored')
    if (loaded.kind !== 'restored') return

    expect(loaded.migratedFrom).toBe(1)
    expect(loaded.tasks).toHaveLength(2)
    expect(loaded.tasks[0]?.plannedDate).toBeUndefined()
    expect(loaded.tasks[0]?.plannedStartTime).toBeUndefined()

    const saved = await saveGuestTaskStore(
      loaded.tasks,
      loaded.revision,
      'normal',
      'automatic',
      writeDeps(storage),
    )
    expect(saved.ok).toBe(true)
    expect(readStore(storage).version).toBe(2)
  })

  it('maps a legacy array and validates it', () => {
    const storage = new FakeStorage()
    seedStore(storage, [makeLegacyRecord()])

    const loaded = loadGuestTaskStore({ storage })
    expect(loaded.kind).toBe('legacy')
    if (loaded.kind !== 'legacy') return
    expect(loaded.tasks).toHaveLength(1)
    expect(loaded.tasks[0]?.plannedDate).toBeUndefined()
  })

  it('quarantines slot records that cannot be trusted while readable records load', () => {
    const storage = new FakeStorage()
    seedStore(
      storage,
      v2Envelope([
        makeStoredTask({ id: 'ok', ...SCHEDULED }),
        makeStoredTask({
          id: 'bad-date',
          ...SCHEDULED,
          plannedDate: '2026-02-31',
        }),
        makeStoredTask({
          id: 'bad-time',
          ...SCHEDULED,
          plannedStartTime: '25:00',
        }),
        makeStoredTask({ id: 'one-field', plannedDate: '2026-11-15' }),
        makeStoredTask({
          id: 'no-duration',
          plannedDate: '2026-11-15',
          plannedStartTime: '09:00',
        }),
      ]),
    )

    const loaded = loadGuestTaskStore({ storage })
    expect(loaded.kind).toBe('partial')
    if (loaded.kind !== 'partial') return

    expect(loaded.tasks.map((task) => task.id)).toEqual(['ok'])
    expect(loaded.tasks[0]).toMatchObject(SCHEDULED)
    expect(loaded.quarantine.invalidRecords).toBe(4)
    expect(loaded.quarantine.reasonCodes).toEqual(
      expect.arrayContaining([
        'SLOT_DATE_INVALID',
        'SLOT_TIME_INVALID',
        'SLOT_INCOMPLETE',
        'SLOT_DURATION_REQUIRED',
      ]),
    )
  })

  it('rejects a newer envelope as unsupported without reading or writing', () => {
    const storage = new FakeStorage()
    const raw = JSON.stringify(v2Envelope([], 'r').valueOf())
    storage.data.set(
      TASKS_STORAGE_KEY,
      raw.replace('"version":2', '"version":3'),
    )

    expect(loadGuestTaskStore({ storage })).toMatchObject({
      kind: 'unsupported',
      detectedVersion: 3,
    })
    expect(storage.setItemCalls).toBe(0)
  })
})

describe('task slot write paths', () => {
  it('preserves the slot on update and toggle, clears it on unschedule, and removes it with the task', async () => {
    const storage = new FakeStorage()
    seedStore(
      storage,
      v2Envelope([makeStoredTask({ id: 'task-1', ...SCHEDULED })]),
    )
    const deps = writeDeps(storage)
    const { result } = renderHook(() => useTasks(deps))

    await act(async () => {
      await result.current.updateTask('task-1', draft('Renamed task'))
    })
    expect(readStore(storage).tasks).toMatchObject([
      { id: 'task-1', title: 'Renamed task', ...SCHEDULED },
    ])

    await act(async () => {
      await result.current.scheduleTask('task-1', {
        plannedDate: '2026-11-15',
        plannedStartTime: '10:00',
        estimatedMinutes: 30,
      })
    })
    expect(readStore(storage).tasks).toMatchObject([
      {
        id: 'task-1',
        plannedDate: '2026-11-15',
        plannedStartTime: '10:00',
        estimatedMinutes: 30,
      },
    ])

    await act(async () => {
      await result.current.toggleTask('task-1')
    })
    expect(readStore(storage).tasks).toMatchObject([
      {
        id: 'task-1',
        status: 'completed',
        plannedDate: '2026-11-15',
        plannedStartTime: '10:00',
        estimatedMinutes: 30,
      },
    ])

    await act(async () => {
      await result.current.unscheduleTask('task-1')
    })
    const unscheduled = readStore(storage).tasks as Array<
      Record<string, unknown>
    >
    expect(unscheduled[0]?.plannedDate).toBeUndefined()
    expect(unscheduled[0]?.plannedStartTime).toBeUndefined()

    await act(async () => {
      await result.current.deleteTask('task-1')
    })
    expect(readStore(storage).tasks).toEqual([])
  })

  it('leaves the stored envelope byte-identical when a write is refused', async () => {
    const storage = new FakeStorage()
    seedStore(
      storage,
      v2Envelope([makeStoredTask({ id: 'task-1' })], 'revision-old'),
    )
    const deps = writeDeps(storage)
    const { result } = renderHook(() => useTasks(deps))

    const before = storage.data.get(TASKS_STORAGE_KEY)

    seedStore(
      storage,
      v2Envelope([makeStoredTask({ id: 'task-1' })], 'revision-new'),
    )
    const newer = storage.data.get(TASKS_STORAGE_KEY)

    let saved = true
    await act(async () => {
      saved = await result.current.scheduleTask('task-1', {
        plannedDate: '2026-11-15',
        plannedStartTime: '09:00',
        estimatedMinutes: 30,
      })
    })

    expect(saved).toBe(false)
    expect(result.current.externalChange).toBe(true)
    expect(storage.data.get(TASKS_STORAGE_KEY)).toBe(newer)
    expect(before).not.toBe(newer)
  })
})
