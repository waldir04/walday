import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import {
  makeEnvelope as makeTaskEnvelope,
  makeStoredTask,
} from './helpers/taskFixtures'
import {
  makeCommitment,
  makeEnvelope as makeCommitmentEnvelope,
} from './helpers/commitmentFixtures'
import { renderApp } from './helpers/renderApp'

const today = getLocalToday()

function seed(overrides: Record<string, unknown> = {}) {
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
  localStorage.setItem(
    COMMITMENTS_STORAGE_KEY,
    makeCommitmentEnvelope([
      makeCommitment({
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Team sync',
        date: today,
        startTime: '10:00',
        endTime: '11:00',
      }),
    ]),
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

async function openDialog() {
  renderApp(['/'])
  await screen.findByRole('heading', { level: 1 })
  fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
  const dialog = screen.getByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Start time'), {
    target: { value: '10:30' },
  })
  return dialog
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('scheduling conflict acknowledgment', () => {
  it('blocks confirmation until every conflict is acknowledged and names its range', async () => {
    seed()
    const dialog = await openDialog()

    expect(
      within(dialog).getByText('Team sync (10:30 AM – 11:00 AM)'),
    ).toBeInTheDocument()
    const confirm = within(dialog).getByRole('button', {
      name: 'Save schedule',
    })
    expect(confirm).toBeDisabled()

    fireEvent.click(
      within(dialog).getByLabelText('I understand these activities overlap'),
    )
    expect(confirm).toBeEnabled()

    fireEvent.click(confirm)
    await waitFor(() => {
      expect(storedTask()).toMatchObject({
        plannedStartTime: '10:30',
        plannedDate: today,
      })
    })

    const timeline = screen.getByRole('region', { name: /Timeline for/ })
    expect(
      within(timeline).getAllByText(/Conflicts with Team sync/).length,
    ).toBeGreaterThan(0)
  })

  it('clears the acknowledgment when the start time changes', async () => {
    seed()
    const dialog = await openDialog()

    const checkbox = within(dialog).getByLabelText(
      'I understand these activities overlap',
    )
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()

    fireEvent.change(within(dialog).getByLabelText('Start time'), {
      target: { value: '10:45' },
    })
    expect(checkbox).not.toBeChecked()
    expect(
      within(dialog).getByRole('button', { name: 'Save schedule' }),
    ).toBeDisabled()
    expect(storedTask().plannedDate).toBeUndefined()
  })

  it('cancels without writing when the conflict is not acknowledged', async () => {
    seed()
    const dialog = await openDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(storedTask().plannedDate).toBeUndefined()
    expect(storedTask().plannedStartTime).toBeUndefined()
  })

  it('offers an adjust action for an oversized slot without changing stored data', async () => {
    seed({
      plannedDate: today,
      plannedStartTime: '23:30',
      estimatedMinutes: 60,
    })
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    const before = localStorage.getItem(TASKS_STORAGE_KEY)
    expect(
      screen.getByText('Planned period exceeds the end of the day.'),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Adjust time or duration: Plan the week',
      }),
    )
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe(before)
  })
})
