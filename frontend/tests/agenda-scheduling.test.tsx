import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import {
  makeEnvelope as makeTaskEnvelope,
  makeStoredTask,
} from './helpers/taskFixtures'
import { renderApp } from './helpers/renderApp'

const today = getLocalToday()

function seedTask(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(
      makeTaskEnvelope(
        [
          makeStoredTask({
            id: 'task-1',
            title: 'Plan the week',
            estimatedMinutes: 60,
            ...overrides,
          }),
        ],
        { version: 2 },
      ),
    ),
  )
}

function storedTask(): Record<string, unknown> {
  const raw = localStorage.getItem(TASKS_STORAGE_KEY)
  if (!raw) throw new Error('task store is empty')
  const envelope = JSON.parse(raw) as { tasks: Array<Record<string, unknown>> }
  const task = envelope.tasks[0]
  if (!task) throw new Error('task is missing')
  return task
}

async function openScheduleDialog(index = 0) {
  renderApp(['/'])
  await screen.findByRole('heading', { level: 1 })
  const buttons = screen.getAllByRole('button', { name: 'Schedule' })
  const button = buttons[index]
  if (!button) throw new Error('missing Schedule action')
  fireEvent.click(button)
  return screen.getByRole('dialog')
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('explicit task scheduling', () => {
  it('schedules a pending task and shows it in the timeline', async () => {
    seedTask()
    const dialog = await openScheduleDialog()

    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '10:00' },
    })
    expect(within(dialog).getByText(/Ends at 11:00/)).toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    )

    await screen.findByText('Task scheduled.')
    await waitFor(() => {
      expect(storedTask()).toMatchObject({
        plannedDate: today,
        plannedStartTime: '10:00',
        estimatedMinutes: 60,
      })
    })
    const timeline = screen.getByRole('region', { name: /Timeline for/ })
    expect(within(timeline).getByText('Plan the week')).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('region', { name: 'Unscheduled tasks' }),
      ).queryByText('Plan the week'),
    ).not.toBeInTheDocument()
  })

  it('asks for a duration when the task has none and saves it in the same write', async () => {
    seedTask({ estimatedMinutes: undefined })
    const dialog = await openScheduleDialog()

    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '10:00' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    )
    expect(within(dialog).getByText('Enter a duration')).toBeInTheDocument()
    expect(storedTask().plannedDate).toBeUndefined()

    fireEvent.change(within(dialog).getByLabelText('Duration'), {
      target: { value: '45 min' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    )

    await waitFor(() => {
      expect(storedTask()).toMatchObject({
        plannedStartTime: '10:00',
        estimatedMinutes: 45,
      })
    })
  })

  it('moves an existing slot without changing any other field', async () => {
    seedTask({
      plannedDate: today,
      plannedStartTime: '09:00',
      estimatedMinutes: 60,
    })
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(
      screen.getByRole('button', { name: 'Change time: Plan the week' }),
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '11:00' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Move schedule' }),
    )

    await screen.findByText('Schedule moved.')
    await waitFor(() => {
      expect(storedTask()).toMatchObject({
        title: 'Plan the week',
        plannedDate: today,
        plannedStartTime: '11:00',
        estimatedMinutes: 60,
      })
    })
  })

  it('removes a schedule and returns the task to the unscheduled area unchanged', async () => {
    seedTask({
      plannedDate: today,
      plannedStartTime: '09:00',
      estimatedMinutes: 60,
      priority: 'high',
      dueDate: today,
    })
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove schedule: Plan the week' }),
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Remove schedule' }),
    )

    await screen.findByText('Schedule removed.')
    await waitFor(() => {
      expect(storedTask().plannedDate).toBeUndefined()
    })
    const unscheduled = screen.getByRole('region', {
      name: 'Unscheduled tasks',
    })
    expect(within(unscheduled).getByText('Plan the week')).toBeInTheDocument()
    expect(storedTask()).toMatchObject({
      title: 'Plan the week',
      priority: 'high',
      dueDate: today,
      status: 'pending',
    })
  })

  it('rejects a period that would end after midnight without writing', async () => {
    seedTask()
    const dialog = await openScheduleDialog()
    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '23:30' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    )

    expect(
      within(dialog).getByText(
        'The planned period cannot extend past midnight',
      ),
    ).toBeInTheDocument()
    expect(storedTask().plannedDate).toBeUndefined()
  })

  it('rejects a missing start time and an invalid time', async () => {
    seedTask()
    const dialog = await openScheduleDialog()
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    )
    expect(within(dialog).getByText('Enter a start time')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '10:00' },
    })
    expect(within(dialog).queryByText('Enter a start time')).toBeNull()
    expect(storedTask().plannedDate).toBeUndefined()
  })

  it('offers no scheduling action for a completed task', async () => {
    seedTask({
      status: 'completed',
      plannedDate: today,
      plannedStartTime: '09:00',
      estimatedMinutes: 60,
    })
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    expect(screen.queryByRole('button', { name: /Change time/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Remove schedule/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Schedule' })).toBeNull()
  })

  it('schedules a task on a past date', async () => {
    seedTask()
    renderApp([`/?date=2026-11-10`])
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '10:00' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    )

    await waitFor(() => {
      expect(storedTask()).toMatchObject({ plannedDate: '2026-11-10' })
    })
    expect(
      screen.getByText('Available time is not shown for past dates.'),
    ).toBeInTheDocument()
  })

  it('moves a task to another date through remove and reschedule without bleeding back', async () => {
    seedTask({
      plannedDate: today,
      plannedStartTime: '09:00',
      estimatedMinutes: 60,
    })
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove schedule: Plan the week' }),
    )
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Remove schedule',
      }),
    )
    await screen.findByText('Schedule removed.')

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '10:00' },
    })
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    )

    const destination = new Date(`${today}T00:00:00`)
    destination.setDate(destination.getDate() + 1)
    const nextDate = `${destination.getFullYear()}-${String(destination.getMonth() + 1).padStart(2, '0')}-${String(destination.getDate()).padStart(2, '0')}`
    await waitFor(() => {
      expect(storedTask().plannedDate).toBe(nextDate)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByText('Plan the week')).toBeNull()
  })

  it('preserves the draft when the write is refused', async () => {
    seedTask()
    const dialog = await openScheduleDialog()
    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '10:00' },
    })

    const raw = localStorage.getItem(TASKS_STORAGE_KEY)
    const envelope = raw ? (JSON.parse(raw) as Record<string, unknown>) : null
    if (!envelope) throw new Error('missing envelope')
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify({ ...envelope, revision: 'newer-revision' }),
    )

    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    )

    await screen.findByText(
      'The schedule could not be saved. Your changes are kept.',
    )
    expect(within(dialog).getByLabelText('Start time')).toHaveValue('10:00')
    expect(storedTask().plannedDate).toBeUndefined()
  })
})
