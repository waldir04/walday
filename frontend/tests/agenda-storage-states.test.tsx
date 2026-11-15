import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import { makeEnvelope, makeStoredTask } from './helpers/taskFixtures'
import { renderApp } from './helpers/renderApp'

const today = getLocalToday()

function seed(tasks: unknown[], version = 2) {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(makeEnvelope(tasks, { version })),
  )
}

function snapshot() {
  return localStorage.getItem(TASKS_STORAGE_KEY)
}

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

describe('agenda storage states', () => {
  it('keeps readable entries and withholds conflicts and availability when a source is incomplete', async () => {
    seed([
      makeStoredTask({
        id: 'good',
        title: 'Readable task',
        plannedDate: today,
        plannedStartTime: '09:00',
        estimatedMinutes: 30,
      }),
      makeStoredTask({
        id: 'bad',
        title: 'Unreadable slot',
        plannedDate: today,
      }),
    ])
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    expect(screen.getByText('Overview incomplete')).toBeInTheDocument()
    const timeline = screen.getByRole('region', { name: /Timeline for/ })
    expect(within(timeline).getByText('Readable task')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Conflicts for/ })).toBeNull()
    expect(
      screen.getByText(
        'Available time cannot be calculated because not all data could be read.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the storage notice when a task source needs attention', async () => {
    seed([], 3)
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    expect(screen.getByText('Storage notice')).toBeInTheDocument()
    expect(screen.getByText('Review Tasks')).toBeInTheDocument()
    expect(screen.getByText('Overview incomplete')).toBeInTheDocument()
  })

  it('does not write when viewing or navigating', async () => {
    seed([
      makeStoredTask({
        id: 'task-1',
        title: 'Plan the week',
        plannedDate: today,
        plannedStartTime: '09:00',
        estimatedMinutes: 30,
      }),
    ])
    const before = snapshot()
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    await screen.findByRole('heading', { level: 1 })
    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    await screen.findByRole('heading', { level: 1 })

    expect(snapshot()).toBe(before)
  })

  it('disables scheduling after an external change and explains why', async () => {
    seed([
      makeStoredTask({
        id: 'task-1',
        title: 'Plan the week',
        estimatedMinutes: 30,
      }),
    ])
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify(makeEnvelope([], { version: 3 })),
    )
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: TASKS_STORAGE_KEY,
        newValue: localStorage.getItem(TASKS_STORAGE_KEY),
      }),
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Schedule' })).toBeDisabled()
    })
    expect(
      screen.getAllByText(/Scheduling is unavailable: changes from another tab/)
        .length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Review Tasks' })).toHaveAttribute(
      'href',
      '/tasks',
    )
  })
})
