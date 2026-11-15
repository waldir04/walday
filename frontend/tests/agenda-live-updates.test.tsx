import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import type { Commitment } from '../src/entities/commitment'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import {
  FIXED_NOW,
  makeEnvelope as makeTaskEnvelope,
  makeStoredTask,
} from './helpers/taskFixtures'
import {
  makeCommitment,
  makeEnvelope as makeCommitmentEnvelope,
} from './helpers/commitmentFixtures'
import { renderApp } from './helpers/renderApp'

// The app reads `new Date()` through `useNow`; faking only `Date` keeps
// timers real so Testing Library's `waitFor` still works.
const today = getLocalToday(FIXED_NOW)

type TestRouter = ReturnType<typeof renderApp>['router']

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_NOW)
  localStorage.clear()
  applyLanguage('en')
})

function seedTasks(tasks: unknown[], revision: string) {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(makeTaskEnvelope(tasks, { version: 2, revision })),
  )
}

function seedCommitments(commitments: Commitment[], revision: string) {
  localStorage.setItem(
    COMMITMENTS_STORAGE_KEY,
    makeCommitmentEnvelope(commitments, { revision }),
  )
}

// jsdom does not emit `storage` for same-document writes, so an external
// write is simulated explicitly. `act` flushes the resulting store update.
function notify(key: string) {
  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue: localStorage.getItem(key),
      }),
    )
  })
}

async function ready(name: string) {
  await screen.findByRole('heading', { level: 1, name })
}

// `useCommitments` does not reload on `storage` events, so a route change is
// required to remount it and read the updated envelope.
async function visit(router: TestRouter, path: string, heading: string) {
  await act(async () => {
    await router.navigate(path)
  })
  await ready(heading)
}

function storedTask(id: string): Record<string, unknown> | undefined {
  const raw = localStorage.getItem(TASKS_STORAGE_KEY)
  if (raw === null) return undefined
  const envelope = JSON.parse(raw) as {
    tasks?: Array<Record<string, unknown>>
  }
  return envelope.tasks?.find((task) => task.id === id)
}

function scheduledTask(): Record<string, unknown> {
  return makeStoredTask({
    id: 'task-1',
    title: 'Scheduled task',
    plannedDate: today,
    plannedStartTime: '09:00',
    estimatedMinutes: 30,
  })
}

function pendingTask(): Record<string, unknown> {
  return makeStoredTask({
    id: 'task-2',
    title: 'New pending task',
    dueDate: today,
  })
}

describe('agenda live updates', () => {
  it('reflects task edits without a restart and never writes a slot', async () => {
    seedTasks(
      [
        makeStoredTask({
          id: 'task-1',
          title: 'Original title',
          plannedDate: today,
          plannedStartTime: '09:00',
          estimatedMinutes: 30,
        }),
      ],
      'revision-1',
    )
    renderApp(['/'])
    await ready('Today')
    expect(screen.getByText('Original title')).toBeInTheDocument()

    seedTasks(
      [
        makeStoredTask({
          id: 'task-1',
          title: 'Edited title',
          priority: 'high',
          dueDate: today,
          estimatedMinutes: 60,
          plannedDate: today,
          plannedStartTime: '09:00',
        }),
      ],
      'revision-2',
    )
    notify(TASKS_STORAGE_KEY)

    await waitFor(() =>
      expect(screen.getByText('Edited title')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Original title')).toBeNull()
    expect(screen.getAllByText('High').length).toBeGreaterThan(0)

    const stored = storedTask('task-1')
    expect(stored?.plannedDate).toBe(today)
    expect(stored?.plannedStartTime).toBe('09:00')
  })

  it('adds and removes tasks from storage events and commitments across visits', async () => {
    seedTasks([scheduledTask()], 'revision-1')
    seedCommitments([], 'revision-1')
    const { router } = renderApp(['/'])
    await ready('Today')

    expect(screen.getByText('Scheduled task')).toBeInTheDocument()

    // A new unscheduled task arrives from another tab.
    seedTasks([scheduledTask(), pendingTask()], 'revision-2')
    notify(TASKS_STORAGE_KEY)

    const unscheduled = await screen.findByRole('region', {
      name: 'Unscheduled tasks',
    })
    expect(
      within(unscheduled).getByText('New pending task'),
    ).toBeInTheDocument()
    expect(storedTask('task-2')?.plannedDate).toBeUndefined()

    seedCommitments(
      [
        makeCommitment({
          id: '11111111-1111-4111-8111-111111111111',
          title: 'New commitment',
          date: today,
          startTime: '12:00',
          endTime: '13:00',
        }),
      ],
      'revision-2',
    )
    await visit(router, '/commitments', 'Daily commitments')
    await visit(router, '/', 'Today')
    expect(await screen.findByText('New commitment')).toBeInTheDocument()

    // Tasks are removed live, including the previously unscheduled one.
    seedTasks([], 'revision-3')
    notify(TASKS_STORAGE_KEY)
    await waitFor(() => expect(screen.queryByText('Scheduled task')).toBeNull())
    expect(screen.queryByText('New pending task')).toBeNull()

    seedCommitments([], 'revision-3')
    await visit(router, '/commitments', 'Daily commitments')
    await visit(router, '/', 'Today')
    expect(screen.queryByText('New commitment')).toBeNull()
  })

  it('keeps a due date from creating a time slot', async () => {
    seedTasks(
      [
        makeStoredTask({
          id: 'task-1',
          title: 'Due today',
          dueDate: today,
        }),
      ],
      'revision-1',
    )
    renderApp(['/'])
    await ready('Today')

    const unscheduled = screen.getByRole('region', {
      name: 'Unscheduled tasks',
    })
    expect(within(unscheduled).getByText('Due today')).toBeInTheDocument()
    expect(storedTask('task-1')?.plannedDate).toBeUndefined()
  })
})
