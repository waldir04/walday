import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import {
  formatLocalDate,
  getLocalToday,
  shiftLocalDate,
} from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import { makeEnvelope, makeStoredTask } from './helpers/taskFixtures'
import { renderApp } from './helpers/renderApp'

const today = getLocalToday()

beforeEach(() => {
  localStorage.clear()
  applyLanguage('en')
})

function seed() {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(
      makeEnvelope(
        [
          makeStoredTask({
            id: 'today-task',
            title: 'Today task',
            plannedDate: today,
            plannedStartTime: '09:00',
            estimatedMinutes: 30,
          }),
          makeStoredTask({
            id: 'tomorrow-task',
            title: 'Tomorrow task',
            plannedDate: shiftLocalDate(today, 1),
            plannedStartTime: '09:00',
            estimatedMinutes: 30,
          }),
        ],
        { version: 2 },
      ),
    ),
  )
}

async function ready() {
  await screen.findByRole('heading', { level: 1 })
}

describe('agenda date navigation', () => {
  it('selects today on first load and keeps ?date= updated', async () => {
    seed()
    const { router } = renderApp(['/'])
    await ready()

    const input = screen.getByLabelText('Selected date')
    expect(input).toHaveValue(today)

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    await waitFor(() =>
      expect(router.state.location.search).toContain(
        `date=${shiftLocalDate(today, 1)}`,
      ),
    )
    expect(screen.getByLabelText('Selected date')).toHaveValue(
      shiftLocalDate(today, 1),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Selected date')).toHaveValue(today),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    await waitFor(() =>
      expect(screen.getByLabelText('Selected date')).toHaveValue(today),
    )
  })

  it('accepts a direct date and survives a reload', async () => {
    seed()
    const { router, unmount } = renderApp(['/'])
    await ready()

    const target = '2026-12-24'
    fireEvent.change(screen.getByLabelText('Selected date'), {
      target: { value: target },
    })
    await waitFor(() =>
      expect(router.state.location.search).toContain(`date=${target}`),
    )

    unmount()
    renderApp([`/?date=${target}`])
    expect(await screen.findByLabelText('Selected date')).toHaveValue(target)
  })

  it('falls back to today for an invalid date parameter', async () => {
    renderApp(['/?date=not-a-date'])
    expect(await screen.findByLabelText('Selected date')).toHaveValue(today)
  })

  it('announces the selected date and its timeline activity count once', async () => {
    seed()
    renderApp(['/'])
    await ready()

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    const next = shiftLocalDate(today, 1)
    const label = formatLocalDate(next, 'en-US', 'medium')

    await waitFor(() => {
      const regions = within(screen.getByRole('main')).getAllByRole('status')
      const withAnnouncement = regions.filter((region) =>
        region.textContent?.includes(`${label}: 1 activities`),
      )
      expect(withAnnouncement).toHaveLength(1)
    })
  })

  it('reaches any date in at most three interactions', async () => {
    renderApp(['/'])
    await ready()

    fireEvent.change(screen.getByLabelText('Selected date'), {
      target: { value: '2031-01-05' },
    })
    await waitFor(() =>
      expect(screen.getByLabelText('Selected date')).toHaveValue('2031-01-05'),
    )
  })

  it('keeps per-date data from bleeding and writes nothing while navigating', async () => {
    seed()
    const before = localStorage.getItem(TASKS_STORAGE_KEY)
    renderApp(['/'])
    await ready()

    expect(screen.getByText('Today task')).toBeInTheDocument()
    expect(screen.queryByText('Tomorrow task')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Next day' }))
    await waitFor(() =>
      expect(screen.getByText('Tomorrow task')).toBeInTheDocument(),
    )
    expect(screen.queryByText('Today task')).toBeNull()

    expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBe(before)
  })
})
