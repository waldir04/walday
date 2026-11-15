import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import { makeEnvelope, makeStoredTask } from './helpers/taskFixtures'
import { renderApp } from './helpers/renderApp'
import { AgendaSkeleton } from '@/features/agenda'

const today = getLocalToday()

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('agenda loading and state feedback', () => {
  it('shows an aria-hidden agenda skeleton with a busy timeline while Home loads', () => {
    const { container } = render(<AgendaSkeleton />)
    const busy = container.querySelector('[aria-busy="true"]')
    expect(busy).not.toBeNull()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it('offers both creation actions on an empty day', async () => {
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    expect(
      screen.getByRole('button', { name: 'Create a commitment' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Create a task' }),
    ).toBeInTheDocument()
  })

  it('explains an empty unscheduled area and opens Tasks', async () => {
    localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify(
        makeEnvelope(
          [
            makeStoredTask({
              id: 'task-1',
              title: 'Plan the week',
              plannedDate: today,
              plannedStartTime: '09:00',
              estimatedMinutes: 30,
            }),
          ],
          { version: 2 },
        ),
      ),
    )
    const { router } = renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })

    expect(
      screen.getByText('No pending tasks without a scheduled time.'),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Tasks' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/tasks'))
  })

  it('shows a retry action when storage is unavailable and recovers', async () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('denied')
      })

    renderApp(['/'])
    await screen.findByRole('heading', { level: 1 })
    expect(screen.getByText('Changes may not be saved')).toBeInTheDocument()

    getItem.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }))

    await waitFor(() =>
      expect(screen.queryByText('Changes may not be saved')).toBeNull(),
    )
  })
})
