import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { loadGuestTaskStore } from '@/entities/task'
import { useTasks } from '@/features/tasks'
import type { TaskDraft } from '@/entities/task'
import { FakeStorage } from './helpers/fakeStorage'
import {
  createIdSequence,
  fixedClock,
  makeEnvelope,
  makeStoredTask,
  makeTask,
  seedStore,
} from './helpers/taskFixtures'

function draft(title: string): TaskDraft {
  return {
    title,
    description: '',
    priority: 'medium',
    dueDate: '',
    estimatedDurationInput: '',
  }
}

describe('task store conflicts', () => {
  it('aborts a stale edit and preserves the newer store', async () => {
    const storage = new FakeStorage()
    const deps = {
      storage,
      now: fixedClock,
      randomId: createIdSequence('revision'),
      locks: null,
    }
    const { result } = renderHook(() => useTasks(deps))

    await act(async () => {
      await result.current.createTask(draft('Original task'))
    })

    const taskId = result.current.tasks[0]?.id
    expect(taskId).toBeDefined()

    seedStore(
      storage,
      makeEnvelope([makeStoredTask({ id: taskId, title: 'Newer task' })], {
        revision: 'newer-revision',
      }),
    )

    let saved = true
    await act(async () => {
      saved = await result.current.updateTask(taskId ?? '', draft('Stale edit'))
    })

    expect(saved).toBe(false)
    expect(result.current.externalChange).toBe(true)
    expect(result.current.notice).toMatchObject({
      kind: 'conflict',
      messageKey: 'feedback.conflict',
    })
    expect(result.current.tasks[0]?.title).toBe('Original task')

    const stored = loadGuestTaskStore({ storage })
    expect(stored.kind).toBe('restored')
    if (stored.kind !== 'restored') return
    expect(stored.revision).toBe('newer-revision')
    expect(stored.tasks[0]?.title).toBe('Newer task')
  })

  it('aborts a stale creation and keeps the draft out of the store', async () => {
    const storage = new FakeStorage()
    const deps = {
      storage,
      now: fixedClock,
      randomId: createIdSequence('revision'),
      locks: null,
    }
    const { result } = renderHook(() => useTasks(deps))
    seedStore(
      storage,
      makeEnvelope([makeStoredTask()], { revision: 'external' }),
    )

    let saved = true
    await act(async () => {
      saved = await result.current.createTask(draft('Conflicting task'))
    })

    expect(saved).toBe(false)
    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.externalChange).toBe(true)

    const stored = loadGuestTaskStore({ storage })
    expect(stored.kind).toBe('restored')
    if (stored.kind !== 'restored') return
    expect(stored.tasks).toHaveLength(1)
    expect(stored.tasks[0]?.title).toBe('Write the weekly report')
  })

  it('returns to normal after a successful retry in memory-only mode', async () => {
    const storage = new FakeStorage()
    storage.getError = new Error('denied')
    const deps = {
      storage,
      now: fixedClock,
      randomId: createIdSequence('revision'),
      locks: null,
    }
    const { result } = renderHook(() => useTasks(deps))
    expect(result.current.mode).toBe('memory-only')

    await act(async () => {
      await result.current.createTask(draft('Session task'))
    })
    expect(result.current.mode).toBe('memory-only')
    expect(result.current.notice).toMatchObject({ kind: 'session-only' })

    storage.getError = null
    await act(async () => {
      await result.current.retryPersistence()
    })

    expect(result.current.mode).toBe('normal')
    expect(result.current.notice).toMatchObject({
      kind: 'success',
      messageKey: 'feedback.retrySucceeded',
    })
    expect(storage.setItemCalls).toBe(1)
  })

  it('surfaces a conflict when a retry finds newer data', async () => {
    const storage = new FakeStorage()
    storage.getError = new Error('denied')
    const deps = {
      storage,
      now: fixedClock,
      randomId: createIdSequence('revision'),
      locks: null,
    }
    const { result } = renderHook(() => useTasks(deps))
    expect(result.current.mode).toBe('memory-only')

    await act(async () => {
      await result.current.createTask(draft('Session task'))
    })

    storage.getError = null
    seedStore(
      storage,
      makeEnvelope([makeStoredTask()], { revision: 'external' }),
    )
    await act(async () => {
      await result.current.retryPersistence()
    })

    expect(result.current.externalChange).toBe(true)
    expect(result.current.notice).toMatchObject({ kind: 'conflict' })
  })

  it('discards unreadable data only after explicit confirmation', async () => {
    const storage = new FakeStorage()
    storage.data.set('walday:tasks', '{not-json')
    const deps = {
      storage,
      now: fixedClock,
      randomId: createIdSequence('revision'),
      locks: null,
    }
    const { result } = renderHook(() => useTasks(deps))
    expect(result.current.mode).toBe('recovery-blocked')

    await act(async () => {
      await result.current.createTask(draft('New after recovery'))
    })
    expect(result.current.mode).toBe('recovery-blocked')
    expect(storage.data.get('walday:tasks')).toBe('{not-json')

    await act(async () => {
      await result.current.discardUnreadable()
    })
    expect(result.current.mode).toBe('normal')

    const stored = loadGuestTaskStore({ storage })
    expect(stored.kind).toBe('restored')
    if (stored.kind !== 'restored') return
    expect(stored.tasks.map((task) => task.title)).toEqual([
      'New after recovery',
    ])
  })

  it('protects unreadable data when discard is cancelled', async () => {
    const storage = new FakeStorage()
    storage.data.set('walday:tasks', '{not-json')
    const { result } = renderHook(() =>
      useTasks({ storage, now: fixedClock, locks: null }),
    )

    act(() => {
      result.current.protectStore()
    })
    expect(result.current.mode).toBe('protected')

    await act(async () => {
      await result.current.createTask(draft('Protected task'))
    })
    expect(storage.data.get('walday:tasks')).toBe('{not-json')
    expect(result.current.tasks[0]?.title).toBe('Protected task')
  })

  it('never overwrites an unsupported newer payload', async () => {
    const storage = new FakeStorage()
    const raw = JSON.stringify(makeEnvelope([], { version: 99 }))
    storage.data.set('walday:tasks', raw)
    const { result } = renderHook(() =>
      useTasks({ storage, now: fixedClock, locks: null }),
    )
    expect(result.current.mode).toBe('unsupported')

    await act(async () => {
      await result.current.createTask(draft('Unsupported task'))
    })
    await act(async () => {
      await result.current.discardUnreadable()
    })

    expect(storage.data.get('walday:tasks')).toBe(raw)
    expect(result.current.tasks[0]?.title).toBe('Unsupported task')
  })

  it('applies a valid external change while idle', async () => {
    const storage = new FakeStorage()
    const deps = {
      storage,
      now: fixedClock,
      randomId: createIdSequence('revision'),
      locks: null,
    }
    const { result } = renderHook(() => useTasks(deps))

    const externalTask = makeTask({ id: 'external', title: 'From another tab' })
    const raw = JSON.stringify(
      makeEnvelope([externalTask], { revision: 'tab-2' }),
    )
    storage.data.set('walday:tasks', raw)

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'walday:tasks',
          newValue: raw,
        }),
      )
    })

    expect(result.current.tasks[0]?.title).toBe('From another tab')
    expect(result.current.baseline).toBe('tab-2')
    expect(result.current.notice).toMatchObject({
      messageKey: 'feedback.updatedElsewhere',
    })
  })

  it('surfaces a conflict instead of applying an external change during a draft', async () => {
    const storage = new FakeStorage()
    const deps = {
      storage,
      now: fixedClock,
      randomId: createIdSequence('revision'),
      locks: null,
    }
    const { result } = renderHook(() => useTasks(deps))

    act(() => {
      result.current.reportDraftActive(true)
    })
    const raw = JSON.stringify(
      makeEnvelope([makeTask({ title: 'External draft conflict' })], {
        revision: 'tab-2',
      }),
    )
    storage.data.set('walday:tasks', raw)

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'walday:tasks',
          newValue: raw,
        }),
      )
    })

    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.externalChange).toBe(true)
    expect(result.current.notice).toMatchObject({
      kind: 'conflict',
      messageKey: 'feedback.newerData',
    })
  })

  it('applies an external clear when idle and requires a draft conflict otherwise', async () => {
    const storage = new FakeStorage()
    const deps = {
      storage,
      now: fixedClock,
      randomId: createIdSequence('revision'),
      locks: null,
    }
    const { result } = renderHook(() => useTasks(deps))
    await act(async () => {
      await result.current.createTask(draft('Will be cleared'))
    })

    storage.data.delete('walday:tasks')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'walday:tasks',
          newValue: null,
        }),
      )
    })

    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.baseline).toBe('empty')
    expect(result.current.notice).toMatchObject({
      messageKey: 'feedback.clearedElsewhere',
    })

    act(() => {
      result.current.reportDraftActive(true)
    })
    storage.data.set(
      'walday:tasks',
      JSON.stringify(makeEnvelope([makeStoredTask()], { revision: 'tab-3' })),
    )
    storage.data.delete('walday:tasks')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'walday:tasks',
          newValue: null,
        }),
      )
    })

    expect(result.current.externalChange).toBe(true)
    let saved = true
    await act(async () => {
      saved = await result.current.createTask(draft('Resurrect attempt'))
    })
    expect(saved).toBe(false)
    expect(storage.data.has('walday:tasks')).toBe(false)
  })
})

describe('external storage events', () => {
  it('ignores an unsupported external payload and preserves it', () => {
    const storage = new FakeStorage()
    const { result } = renderHook(() =>
      useTasks({ storage, now: fixedClock, locks: null }),
    )
    const raw = JSON.stringify(makeEnvelope([], { version: 99 }))
    storage.data.set('walday:tasks', raw)

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'walday:tasks',
          newValue: raw,
        }),
      )
    })

    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.externalChange).toBe(true)
    expect(result.current.notice).toMatchObject({ kind: 'error' })
    expect(storage.data.get('walday:tasks')).toBe(raw)
  })

  it('surfaces an external clear while local work is in progress', async () => {
    const storage = new FakeStorage()
    const { result } = renderHook(() =>
      useTasks({ storage, now: fixedClock, locks: null }),
    )
    await act(async () => {
      await result.current.createTask(draft('Local work'))
    })
    act(() => {
      result.current.reportDraftActive(true)
    })

    storage.data.delete('walday:tasks')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'walday:tasks',
          newValue: null,
        }),
      )
    })

    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.externalChange).toBe(true)
    expect(result.current.notice).toMatchObject({
      kind: 'conflict',
      messageKey: 'feedback.clearedElsewhere',
    })
  })

  it('applies an external legacy payload when idle', () => {
    const storage = new FakeStorage()
    storage.data.set(
      'walday:tasks',
      '[{"id":"legacy","title":"Legacy tab","priority":"medium","completed":false,"createdAt":1762958400000}]',
    )
    const { result } = renderHook(() =>
      useTasks({ storage, now: fixedClock, locks: null }),
    )
    expect(result.current.baseline).toBe('legacy')
    expect(result.current.tasks[0]?.title).toBe('Legacy tab')
  })
})
