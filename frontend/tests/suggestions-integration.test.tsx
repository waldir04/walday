import {
  act,
  renderHook,
  screen,
  waitFor,
  within,
  fireEvent,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { PREFERENCES_STORAGE_KEY } from '../src/shared/config/preferences'
import { WEATHER_STORAGE_KEY } from '../src/entities/weather'
import { SUGGESTIONS_STORAGE_KEY } from '../src/shared/config/suggestions'
import { buildAgendaDay } from '../src/features/agenda'
import { useSuggestions } from '../src/features/suggestions/controller'
import { buildWeatherContext } from '../src/features/suggestions'
import type { Task } from '../src/entities/task'
import type { Commitment } from '../src/entities/commitment'
import type { SuggestionWeatherContext } from '../src/features/suggestions'
import { applyLanguage } from '../src/shared/i18n'
import {
  makeEnvelope as makeTaskEnvelope,
  makeStoredTask,
} from './helpers/taskFixtures'
import {
  makeCommitment,
  makeEnvelope as makeCommitmentEnvelope,
} from './helpers/commitmentFixtures'
import {
  makeEnvelope as makePreferencesEnvelope,
  makePreferences,
} from './helpers/preferencesFixtures'
import { MADRID } from './helpers/weatherFixtures'
import { renderApp } from './helpers/renderApp'

const NOW = new Date('2026-11-18T08:00:00.000Z')
const TODAY = '2026-11-18'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
  applyLanguage('en')
})

function seedTasks(tasks: Record<string, unknown>[]): void {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(makeTaskEnvelope(tasks, { version: 2 })),
  )
}

function seedCommitments(commitments: Commitment[]): void {
  localStorage.setItem(
    COMMITMENTS_STORAGE_KEY,
    makeCommitmentEnvelope(commitments),
  )
}

function readTasks(): Array<Record<string, unknown>> {
  const raw = localStorage.getItem(TASKS_STORAGE_KEY)
  if (!raw) return []
  return (JSON.parse(raw) as { tasks: Array<Record<string, unknown>> }).tasks
}

function readCommitments(): Commitment[] {
  const raw = localStorage.getItem(COMMITMENTS_STORAGE_KEY)
  if (!raw) return []
  return (JSON.parse(raw) as { commitments: Commitment[] }).commitments
}

function scheduledTask(
  id: string,
  title: string,
  start: string,
): Record<string, unknown> {
  return makeStoredTask({
    id,
    title,
    priority: 'medium',
    plannedDate: TODAY,
    plannedStartTime: start,
    estimatedMinutes: 60,
    createdAt: '2026-11-18T07:00:00.000Z',
  })
}

async function ready(): Promise<void> {
  await screen.findByRole('heading', { level: 1 })
}

describe('Home suggestion conflict flow (US1)', () => {
  function seedConflict(): void {
    seedTasks([scheduledTask('task-1', 'Plan the week', '09:30')])
    seedCommitments([
      makeCommitment({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Team sync',
        date: TODAY,
        startTime: '09:00',
        endTime: '10:00',
        type: 'fixed',
      }),
    ])
  }

  it('shows exactly one explainable conflict card and changes nothing before Accept', async () => {
    seedConflict()
    renderApp(['/'])
    await ready()

    const card = await screen.findByRole('heading', {
      level: 3,
      name: 'Move Plan the week',
    })
    expect(card).toBeInTheDocument()
    expect(screen.getByText(/Overlaps Team sync/)).toBeInTheDocument()
    expect(
      screen.getByText(/Fixed commitments are protected/),
    ).toBeInTheDocument()
    expect(readTasks()[0]?.plannedStartTime).toBe('09:30')
  })

  it('accepts only the task change and updates the agenda without reload', async () => {
    seedConflict()
    renderApp(['/'])
    await ready()

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Accept: move Plan the week/,
      }),
    )

    await waitFor(() => {
      expect(readTasks()[0]?.plannedStartTime).toBe('08:00')
    })
    expect(readCommitments()[0]?.startTime).toBe('09:00')
    const timeline = screen.getByRole('region', { name: /Timeline for/ })
    expect(within(timeline).getByText('Plan the week')).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Accept: move Plan the week/ }),
      ).toBeNull()
    })
  })

  it('dismisses without changing data or hiding the agenda conflict', async () => {
    seedConflict()
    renderApp(['/'])
    await ready()

    const acceptBefore = JSON.stringify(readTasks())
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Dismiss the suggestion for Plan the week/,
      }),
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /Dismiss the suggestion/ }),
      ).toBeNull()
    })
    expect(JSON.stringify(readTasks())).toBe(acceptBefore)
    expect(
      screen.getByRole('region', { name: /Conflicts for/ }),
    ).toBeInTheDocument()
  })

  it('produces no card for a fixed-only overlap', async () => {
    seedCommitments([
      makeCommitment({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Team sync',
        date: TODAY,
        startTime: '09:00',
        endTime: '10:00',
      }),
      makeCommitment({
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Review',
        date: TODAY,
        startTime: '09:30',
        endTime: '10:30',
      }),
    ])
    renderApp(['/'])
    await ready()

    await waitFor(() => {
      expect(
        screen.getByText('No recommendations right now'),
      ).toBeInTheDocument()
    })
    expect(screen.queryByRole('listitem', { name: /Move/ })).toBeNull()
    expect(
      screen.getByText(/nothing this surface can safely change/),
    ).toBeInTheDocument()
  })
})

describe('Home suggestion slot and flexible flows (US2)', () => {
  it('schedules an unscheduled task on Accept and removes it from unscheduled', async () => {
    seedTasks([
      makeStoredTask({
        id: 'task-unscheduled',
        title: 'Clear the inbox',
        priority: 'medium',
        estimatedMinutes: 60,
        createdAt: '2026-11-18T07:00:00.000Z',
      }),
    ])
    renderApp(['/'])
    await ready()

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Accept: schedule Clear the inbox/,
      }),
    )

    await waitFor(() => {
      expect(readTasks()[0]).toMatchObject({
        plannedDate: TODAY,
        plannedStartTime: '08:00',
        estimatedMinutes: 60,
      })
    })
    const unscheduled = screen.getByRole('region', {
      name: 'Unscheduled tasks',
    })
    expect(within(unscheduled).queryByText('Clear the inbox')).toBeNull()
  })

  it('produces no slot card when a duration cannot fit', async () => {
    seedTasks([
      makeStoredTask({
        id: 'task-long',
        title: 'Long task',
        estimatedMinutes: 400,
        createdAt: '2026-11-18T07:00:00.000Z',
      }),
    ])
    seedCommitments([
      makeCommitment({
        id: '44444444-4444-4444-8444-444444444444',
        title: 'All day',
        date: TODAY,
        startTime: '08:00',
        endTime: '20:00',
      }),
    ])
    renderApp(['/'])
    await ready()

    await waitFor(() => {
      expect(screen.getByText(/no free period long enough/)).toBeInTheDocument()
    })
  })

  it('shows missing-durations for a task without a duration', async () => {
    seedTasks([
      makeStoredTask({
        id: 'task-no-duration',
        title: 'Underspecified task',
        createdAt: '2026-11-18T07:00:00.000Z',
      }),
    ])
    renderApp(['/'])
    await ready()

    await waitFor(() => {
      expect(
        screen.getByText(/Some tasks have no duration/),
      ).toBeInTheDocument()
    })
  })

  it('moves a flexible commitment to make room without scheduling the task', async () => {
    seedTasks([
      makeStoredTask({
        id: 'task-beneficiary',
        title: 'Deep work',
        estimatedMinutes: 180,
        createdAt: '2026-11-18T07:00:00.000Z',
      }),
    ])
    seedCommitments([
      makeCommitment({
        id: '33333333-3333-4333-8333-333333333333',
        title: 'Team sync',
        date: TODAY,
        startTime: '09:00',
        endTime: '10:00',
        type: 'flexible',
      }),
      makeCommitment({
        id: '44444444-4444-4444-8444-444444444444',
        title: 'Afternoon block',
        date: TODAY,
        startTime: '12:00',
        endTime: '23:00',
      }),
    ])
    renderApp(['/'])
    await ready()

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Accept: move Team sync/,
      }),
    )

    await waitFor(() => {
      const commitment = readCommitments().find(
        (candidate) => candidate.id === '33333333-3333-4333-8333-333333333333',
      )
      expect(commitment).toMatchObject({
        startTime: '08:00',
        endTime: '09:00',
        date: TODAY,
        type: 'flexible',
      })
    })
    expect(readTasks()[0]?.plannedDate).toBeUndefined()
    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /Accept: schedule Deep work/,
        }),
      ).toBeInTheDocument()
    })
  })
})

describe('Home suggestion adjust flow (US4)', () => {
  function seedConflict(): void {
    seedTasks([scheduledTask('task-1', 'Plan the week', '09:30')])
    seedCommitments([
      makeCommitment({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Team sync',
        date: TODAY,
        startTime: '09:00',
        endTime: '10:00',
      }),
    ])
  }

  it('applies only the adjusted start time', async () => {
    seedConflict()
    renderApp(['/'])
    await ready()

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Adjust the time for Plan the week/,
      }),
    )

    const dialog = screen.getByRole('dialog')
    const input = within(dialog).getByLabelText('Start time')
    fireEvent.change(input, { target: { value: '10:30' } })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Apply change' }),
    )

    await waitFor(() => {
      expect(readTasks()[0]?.plannedStartTime).toBe('10:30')
    })
    expect(readTasks()[0]?.estimatedMinutes).toBe(60)
  })

  it('requires explicit acknowledgment for an overlapping adjusted time', async () => {
    seedConflict()
    renderApp(['/'])
    await ready()

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Adjust the time for Plan the week/,
      }),
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '09:45' },
    })

    const confirm = within(dialog).getByRole('button', {
      name: 'Apply change',
    })
    expect(confirm).toBeDisabled()
    expect(
      within(dialog).getByText(/overlaps other activities/),
    ).toBeInTheDocument()

    fireEvent.click(
      within(dialog).getByLabelText('Use this time even though it overlaps'),
    )
    fireEvent.click(confirm)

    await waitFor(() => {
      expect(readTasks()[0]?.plannedStartTime).toBe('09:45')
    })
  })

  it('cancelling changes nothing', async () => {
    seedConflict()
    renderApp(['/'])
    await ready()
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Adjust the time for Plan the week/,
      }),
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '07:30' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(readTasks()[0]?.plannedStartTime).toBe('09:30')
  })
})

describe('Home suggestion dismissal memory and states (US5)', () => {
  function seedSlot(): void {
    seedTasks([
      makeStoredTask({
        id: 'task-unscheduled',
        title: 'Clear the inbox',
        estimatedMinutes: 60,
        createdAt: '2026-11-18T07:00:00.000Z',
      }),
    ])
  }

  it('suppresses a dismissed change after reload for the same device-day', async () => {
    seedSlot()
    const first = renderApp(['/'])
    await ready()
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Dismiss the suggestion for Clear the inbox/,
      }),
    )
    await waitFor(() => {
      expect(localStorage.getItem(SUGGESTIONS_STORAGE_KEY)).not.toBeNull()
    })
    first.unmount()

    renderApp(['/'])
    await ready()
    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: /Accept: schedule Clear the inbox/,
        }),
      ).toBeNull()
    })
    expect(
      screen.getByText(/You dismissed every suggestion/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Review dismissed suggestions' }),
    ).toBeInTheDocument()
  })

  it('starts empty on the next local day', async () => {
    seedSlot()
    const first = renderApp(['/'])
    await ready()
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Dismiss the suggestion for Clear the inbox/,
      }),
    )
    await waitFor(() => {
      expect(localStorage.getItem(SUGGESTIONS_STORAGE_KEY)).not.toBeNull()
    })
    first.unmount()

    const nextDay = new Date('2026-11-19T08:00:00.000Z')
    vi.setSystemTime(nextDay)
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /Accept: schedule Clear the inbox/,
        }),
      ).toBeInTheDocument()
    })
  })

  it('restores a dismissed card without applying it', async () => {
    seedSlot()
    renderApp(['/'])
    await ready()
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Dismiss the suggestion for Clear the inbox/,
      }),
    )
    await screen.findByRole('button', { name: 'Review dismissed suggestions' })
    fireEvent.click(
      screen.getByRole('button', { name: 'Review dismissed suggestions' }),
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: /Restore the suggestion for Clear the inbox/,
      }),
    )

    await screen.findByRole('button', {
      name: /Accept: schedule Clear the inbox/,
    })
    expect(readTasks()[0]?.plannedDate).toBeUndefined()
  })

  it('explains an already-planned empty day with a next action', async () => {
    renderApp(['/'])
    await ready()
    await waitFor(() => {
      expect(screen.getByText(/Today is already planned/)).toBeInTheDocument()
    })
    expect(
      screen.getByRole('link', { name: 'Open Task Management' }),
    ).toBeInTheDocument()
  })

  it('shows the incomplete explanation with retry and no cards', async () => {
    localStorage.setItem(TASKS_STORAGE_KEY, '{corrupt')
    renderApp(['/'])
    await ready()
    await waitFor(() => {
      expect(screen.getByText(/plan is incomplete/)).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Accept:/ })).toBeNull()
  })

  it('hides the surface when another date is selected', async () => {
    renderApp([`/?date=2026-11-19`])
    await ready()
    expect(
      screen.queryByRole('heading', { name: 'Smart Suggestions' }),
    ).toBeNull()
  })

  it('reveals a hidden fourth suggestion after one is resolved', async () => {
    seedTasks(
      Array.from({ length: 4 }, (_, index) =>
        makeStoredTask({
          id: `task-${index + 1}`,
          title: `Task ${index + 1}`,
          estimatedMinutes: 30,
          priority: index % 2 === 0 ? 'high' : 'medium',
          dueDate: TODAY,
          createdAt: `2026-11-18T07:0${index}:00.000Z`,
        }),
      ),
    )
    renderApp(['/'])
    await ready()

    await screen.findByRole('heading', { level: 3, name: 'Schedule Task 1' })
    expect(
      screen.queryByRole('heading', { name: 'Schedule Task 4' }),
    ).toBeNull()

    fireEvent.click(
      screen.getByRole('button', { name: /Accept: schedule Task 1/ }),
    )
    await waitFor(() => {
      expect(readTasks()[0]?.plannedDate).toBe(TODAY)
    })
    await screen.findByRole('heading', { level: 3, name: 'Schedule Task 4' })
  })

  it('keeps a dismissal for the session without claiming persistence when storage fails', async () => {
    seedSlot()
    const originalSetItem = Storage.prototype.setItem
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key: string, value: string) {
        if (key === SUGGESTIONS_STORAGE_KEY) {
          const error = new Error('quota')
          error.name = 'QuotaExceededError'
          throw error
        }
        return originalSetItem.call(this, key, value)
      })

    renderApp(['/'])
    await ready()
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Dismiss the suggestion for Clear the inbox/,
      }),
    )

    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: /Dismiss the suggestion for Clear the inbox/,
        }),
      ).toBeNull()
    })
    const live = document.querySelector(
      '[aria-labelledby="suggestions-heading"] [aria-live="polite"]',
    )
    expect(live?.textContent).toMatch(/session only/)
    setItemSpy.mockRestore()
  })

  it('does not read dismissal storage on recalculation and issues no network request', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem')
    seedSlot()

    renderApp(['/'])
    await ready()
    await screen.findByRole('heading', {
      level: 3,
      name: 'Schedule Clear the inbox',
    })

    const reads = getItemSpy.mock.calls.filter(
      ([key]) => key === SUGGESTIONS_STORAGE_KEY,
    )
    expect(reads.length).toBeLessThanOrEqual(1)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('controller stale revalidation', () => {
  interface HarnessProps {
    tasks: Task[]
    commitments: Commitment[]
    applyTaskSlot: (_input: {
      taskId: string
      startTime: string
      durationMinutes: number
      acknowledged: boolean
    }) => Promise<{ ok: true } | { ok: false; reason: string }>
    applyCommitmentMove: (_input: {
      commitmentId: string
      startTime: string
      endTime: string
      acknowledged: boolean
    }) => Promise<{ ok: true } | { ok: false; reason: string }>
    weather?: SuggestionWeatherContext
  }

  function harness(props: HarnessProps) {
    return renderHook(
      (current: HarnessProps) => {
        const day = buildAgendaDay({
          date: TODAY,
          tasks: current.tasks,
          commitments: current.commitments,
          now: NOW,
          locale: 'en-US',
          sources: 'complete',
        })
        return useSuggestions({
          day,
          tasks: current.tasks,
          commitments: current.commitments,
          sources: 'complete',
          weather: current.weather ?? { status: 'unavailable' },
          now: NOW,
          applyTaskSlot: current.applyTaskSlot,
          applyCommitmentMove: current.applyCommitmentMove,
          locale: 'en-US',
          dateStyle: 'medium',
          weatherUnit: 'metric',
        })
      },
      { initialProps: props },
    )
  }

  const scheduled: Task = {
    id: 'task-1',
    title: 'Plan the week',
    status: 'pending',
    priority: 'medium',
    estimatedMinutes: 60,
    plannedDate: TODAY,
    plannedStartTime: '09:30',
    createdAt: '2026-11-18T07:00:00.000Z',
  }
  const fixed: Commitment = {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Team sync',
    date: TODAY,
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed',
    createdAt: '2026-11-18T07:00:00.000Z',
  }

  function firstSuggestionId(result: {
    current: { state: { status: string; suggestions?: Array<{ id: string }> } }
  }): string {
    const state = result.current.state
    if (state.status !== 'ready' || !state.suggestions?.[0]) {
      throw new Error('no suggestion')
    }
    return state.suggestions[0].id
  }

  function freshHarness(): {
    result: { current: ReturnType<typeof useSuggestions> }
    rerender: (_props: HarnessProps) => void
    base: HarnessProps
    id: string
    applyTaskSlot: ReturnType<typeof vi.fn>
  } {
    const applyTaskSlot = vi.fn(async () => ({ ok: true as const }))
    const base: HarnessProps = {
      tasks: [scheduled],
      commitments: [fixed],
      applyTaskSlot,
      applyCommitmentMove: vi.fn(async () => ({ ok: true as const })),
    }
    const { result, rerender } = harness(base)
    const id = firstSuggestionId(result as never)
    return {
      result: result as never,
      rerender: rerender as never,
      base,
      id,
      applyTaskSlot,
    }
  }

  it('refuses a completed target', async () => {
    const { result, rerender, base, id, applyTaskSlot } = freshHarness()
    rerender({ ...base, tasks: [{ ...scheduled, status: 'completed' }] })
    await act(async () => undefined)
    expect((await result.current.accept(id)).ok).toBe(false)
    expect(applyTaskSlot).not.toHaveBeenCalled()
  })

  it('refuses a deleted target', async () => {
    const { result, rerender, base, id, applyTaskSlot } = freshHarness()
    rerender({ ...base, tasks: [] })
    await act(async () => undefined)
    expect((await result.current.accept(id)).ok).toBe(false)
    expect(applyTaskSlot).not.toHaveBeenCalled()
  })

  it('refuses a target whose duration changed', async () => {
    const { result, rerender, base, id, applyTaskSlot } = freshHarness()
    rerender({ ...base, tasks: [{ ...scheduled, estimatedMinutes: 30 }] })
    await act(async () => undefined)
    expect((await result.current.accept(id)).ok).toBe(false)
    expect(applyTaskSlot).not.toHaveBeenCalled()
  })

  it('refuses a target scheduled elsewhere', async () => {
    const { result, rerender, base, id, applyTaskSlot } = freshHarness()
    rerender({ ...base, tasks: [{ ...scheduled, plannedStartTime: '07:00' }] })
    await act(async () => undefined)
    expect((await result.current.accept(id)).ok).toBe(false)
    expect(applyTaskSlot).not.toHaveBeenCalled()
  })

  it('refuses a commitment that became fixed', async () => {
    const flexible: Commitment = {
      ...fixed,
      id: 'flex-1',
      type: 'flexible',
      startTime: '09:00',
      endTime: '10:00',
    }
    const applyTaskSlot = vi.fn(async () => ({ ok: true as const }))
    const applyCommitmentMove = vi.fn(async () => ({ ok: true as const }))
    const base = {
      tasks: [scheduled],
      commitments: [flexible],
      applyTaskSlot,
      applyCommitmentMove,
    }
    const { result, rerender } = harness(base)
    await act(async () => undefined)
    const id = firstSuggestionId(result as never)

    rerender({ ...base, commitments: [{ ...flexible, type: 'fixed' }] })
    await act(async () => undefined)
    expect((await result.current.accept(id)).ok).toBe(false)
    expect(applyCommitmentMove).not.toHaveBeenCalled()
  })

  it('rejects invalid and past adjusted times without calling an adapter', async () => {
    const { result, id, applyTaskSlot } = freshHarness()

    const invalid = await result.current.adjust({
      suggestionId: id,
      startTime: 'nope',
      acknowledged: false,
    })
    expect(invalid).toMatchObject({ ok: false, code: 'invalid-time' })

    const past = await result.current.adjust({
      suggestionId: id,
      startTime: '07:00',
      acknowledged: false,
    })
    expect(past).toMatchObject({ ok: false, code: 'invalid-time' })
    expect(applyTaskSlot).not.toHaveBeenCalled()
  })

  it('applies a flexible commitment move preserving duration and date', async () => {
    const flexible: Commitment = {
      ...fixed,
      id: '33333333-3333-4333-8333-333333333333',
      type: 'flexible',
      startTime: '09:00',
      endTime: '10:00',
    }
    const applyCommitmentMove = vi.fn(async () => ({ ok: true as const }))
    const base = {
      tasks: [scheduled],
      commitments: [flexible],
      applyTaskSlot: vi.fn(async () => ({ ok: true as const })),
      applyCommitmentMove,
    }
    const { result } = harness(base)
    await act(async () => undefined)
    const id = firstSuggestionId(result as never)

    const outcome = await result.current.accept(id)
    expect(outcome.ok).toBe(true)
    expect(applyCommitmentMove).toHaveBeenCalledWith({
      commitmentId: flexible.id,
      startTime: '08:00',
      endTime: '09:00',
      acknowledged: false,
    })
  })

  it('keeps a weather-influenced presented card when weather becomes unavailable', async () => {
    const task: Task = {
      id: 'weather-task',
      title: 'Weather task',
      status: 'pending',
      priority: 'medium',
      estimatedMinutes: 60,
      createdAt: '2026-11-18T07:00:00.000Z',
    }
    const commitment: Commitment = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Morning sync',
      date: TODAY,
      startTime: '09:00',
      endTime: '10:00',
      type: 'fixed',
      createdAt: '2026-11-18T07:00:00.000Z',
    }
    const available: SuggestionWeatherContext = {
      status: 'available',
      hours: [
        {
          startMinutes: 480,
          endMinutes: 540,
          condition: 'rain',
          precipitationProbability: 90,
        },
        {
          startMinutes: 600,
          endMinutes: 660,
          condition: 'clear',
          precipitationProbability: 5,
        },
      ],
    }
    const base: HarnessProps = {
      tasks: [task],
      commitments: [commitment],
      applyTaskSlot: vi.fn(async () => ({ ok: true as const })),
      applyCommitmentMove: vi.fn(async () => ({ ok: true as const })),
      weather: available,
    }
    const { result, rerender } = harness(base)
    await act(async () => undefined)

    const first = result.current.state
    if (first.status !== 'ready') throw new Error('expected ready')
    expect(first.suggestions[0]?.id).toContain(':600')
    expect(first.suggestions[0]?.weatherEvidence).not.toBeNull()

    rerender({ ...base, weather: { status: 'unavailable' } })
    await act(async () => undefined)

    const next = result.current.state
    if (next.status !== 'ready') throw new Error('expected ready')
    expect(next.suggestions).toHaveLength(1)
    expect(next.suggestions[0]?.id).toContain(':600')
    expect(next.suggestions[0]?.weatherEvidence).toBeNull()
    expect(
      next.suggestions[0]?.reasons.some((reason) => reason.kind === 'weather'),
    ).toBe(false)

    const outcome = await result.current.accept(next.suggestions[0]?.id ?? '')
    expect(outcome.ok).toBe(true)
  })

  it('surfaces an unexpected generation failure as a generic error state', () => {
    const task: Task = {
      id: 'task-error',
      title: 'Triggers weather failure',
      status: 'pending',
      priority: 'medium',
      estimatedMinutes: 30,
      createdAt: '2026-11-18T07:00:00.000Z',
    }
    const day = buildAgendaDay({
      date: TODAY,
      tasks: [task],
      commitments: [],
      now: NOW,
      locale: 'en-US',
      sources: 'complete',
    })
    const throwingWeather = {
      get status(): never {
        throw new Error('boom')
      },
    } as never
    const { result } = renderHook(() =>
      useSuggestions({
        day,
        tasks: [task],
        commitments: [],
        sources: 'complete',
        weather: throwingWeather,
        now: NOW,
        applyTaskSlot: async () => ({ ok: true }),
        applyCommitmentMove: async () => ({ ok: true }),
        locale: 'en-US',
        dateStyle: 'medium',
        weatherUnit: 'metric',
      }),
    )
    expect(result.current.state.status).toBe('error')
  })

  it('maps adapter failures and unexpected errors without mutating data', async () => {
    const failing: HarnessProps = {
      tasks: [scheduled],
      commitments: [fixed],
      applyTaskSlot: async () => ({ ok: false, reason: 'stale' }),
      applyCommitmentMove: async () => ({ ok: false, reason: 'stale' }),
    }
    const first = harness(failing)
    await act(async () => undefined)
    const firstId = firstSuggestionId(first.result as never)
    expect(await first.result.current.accept(firstId)).toMatchObject({
      ok: false,
      code: 'stale-target',
    })

    const throwing: HarnessProps = {
      ...failing,
      applyTaskSlot: async () => {
        throw new Error('boom')
      },
    }
    const second = harness(throwing)
    await act(async () => undefined)
    const secondId = firstSuggestionId(second.result as never)
    expect(await second.result.current.accept(secondId)).toMatchObject({
      ok: false,
      code: 'apply-failed',
    })
  })

  it('applies exactly once when Accept is activated twice', async () => {
    let resolveFirst: ((value: { ok: true }) => void) | null = null
    const applyTaskSlot = vi.fn(
      () =>
        new Promise<{ ok: true }>((resolve) => {
          resolveFirst = resolve
        }),
    )
    const base = {
      tasks: [scheduled],
      commitments: [fixed],
      applyTaskSlot,
      applyCommitmentMove: vi.fn(async () => ({ ok: true as const })),
    }
    const { result } = harness(base)
    await act(async () => undefined)
    const id = firstSuggestionId(result as never)

    let firstOutcome: { ok: boolean } | null = null
    await act(async () => {
      const first = result.current.accept(id)
      const second = result.current.accept(id)
      await second.then((outcome) => {
        firstOutcome = outcome
      })
      resolveFirst?.({ ok: true })
      await first
    })

    expect(applyTaskSlot).toHaveBeenCalledTimes(1)
    expect(firstOutcome).toMatchObject({ ok: false })
  })

  it('refuses an adjusted time that becomes stale before confirmation', async () => {
    const applyTaskSlot = vi.fn(async () => ({ ok: true as const }))
    const base = {
      tasks: [scheduled],
      commitments: [fixed],
      applyTaskSlot,
      applyCommitmentMove: vi.fn(async () => ({ ok: true as const })),
    }
    const { result, rerender } = harness(base)
    await act(async () => undefined)
    const id = firstSuggestionId(result as never)

    rerender({ ...base, tasks: [{ ...scheduled, status: 'completed' }] })
    await act(async () => undefined)
    const outcome = await result.current.adjust({
      suggestionId: id,
      startTime: '07:30',
      acknowledged: false,
    })
    expect(outcome.ok).toBe(false)
    expect(applyTaskSlot).not.toHaveBeenCalled()
  })
})

describe('weather influence on Home (US3)', () => {
  it('chooses and cites the materially better period when weather is ready', async () => {
    const hour = (
      hourValue: number,
      condition: 'rain' | 'clear',
      precipitationProbability: number,
    ) => ({
      time: Date.UTC(2026, 10, 18, hourValue, 0, 0) / 1000,
      temperatureCelsius: 12,
      condition,
      precipitationProbability,
    })

    const hourly = [
      hour(8, 'rain', 90),
      hour(9, 'rain', 90),
      hour(10, 'clear', 5),
      hour(11, 'clear', 5),
    ]

    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify(
        makePreferencesEnvelope(
          makePreferences({ weatherLocation: { ...MADRID } }),
        ),
      ),
    )
    localStorage.setItem(
      WEATHER_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        providerPlaceId: MADRID.providerPlaceId,
        localDate: TODAY,
        fetchedAt: '2026-11-18T07:00:00.000Z',
        snapshot: {
          units: 'metric',
          retrievedAt: '2026-11-18T07:00:00.000Z',
          observedAt: '2026-11-18T06:45:00.000Z',
          current: null,
          hourly,
        },
      }),
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          units: 'metric',
          retrievedAt: '2026-11-18T08:00:00.000Z',
          observedAt: '2026-11-18T07:50:00.000Z',
          current: null,
          hourly,
        }),
      })),
    )

    seedTasks([
      makeStoredTask({
        id: 'task-weather',
        title: 'Weather-aware task',
        estimatedMinutes: 60,
        createdAt: '2026-11-18T07:00:00.000Z',
      }),
    ])
    seedCommitments([
      makeCommitment({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Morning sync',
        date: TODAY,
        startTime: '09:00',
        endTime: '10:00',
      }),
    ])

    renderApp(['/'])
    await ready()

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: /Accept: schedule Weather-aware task/,
        }),
      ).toBeInTheDocument()
    })
    await waitFor(() => {
      const item = screen.getByRole('listitem', {
        name: /Weather-aware task/,
      })
      expect(within(item).getByText(/10:00 AM – 11:00 AM/)).toBeInTheDocument()
      expect(
        within(item).getByText(/Weather influenced this choice/),
      ).toBeInTheDocument()
      expect(within(item).getAllByText(/Clear/).length).toBeGreaterThan(0)
      expect(within(item).getAllByText(/5%/).length).toBeGreaterThan(0)
    })
  })
})

describe('weather port integration', () => {
  it('ignores stale or partial weather and keeps the baseline period', () => {
    expect(
      buildWeatherContext({
        hours: [
          {
            timeMs: new Date('2026-11-18T08:00:00.000Z').getTime(),
            condition: 'clear',
            precipitationProbability: 0,
          },
        ],
        today: TODAY,
        isReady: true,
        isOutdated: true,
      }),
    ).toEqual({ status: 'unavailable' })

    expect(
      buildWeatherContext({
        hours: [],
        today: TODAY,
        isReady: true,
        isOutdated: false,
      }),
    ).toEqual({ status: 'unavailable' })
  })
})
