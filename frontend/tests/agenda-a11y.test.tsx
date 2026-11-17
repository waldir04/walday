import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TASKS_STORAGE_KEY } from '../src/shared/config/tasks'
import { COMMITMENTS_STORAGE_KEY } from '../src/shared/config/commitments'
import { getLocalToday } from '../src/shared/lib/localDateTime'
import { applyLanguage } from '../src/shared/i18n'
import { checkA11y, seriousViolations } from '../src/test/axe'
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

// Today's availability window is trimmed to the current minute, so a real clock
// makes the seeded 09:00 periods vanish when the suite runs late. Pin the clock;
// faking only `Date` keeps timers real so Testing Library's `waitFor` still works.
const today = getLocalToday(FIXED_NOW)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(FIXED_NOW)
  localStorage.clear()
  applyLanguage('en')
})

function seed() {
  localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify(
      makeTaskEnvelope(
        [
          makeStoredTask({
            id: 'task-1',
            title: 'Plan the week',
            priority: 'high',
            plannedDate: today,
            plannedStartTime: '09:30',
            estimatedMinutes: 60,
          }),
          makeStoredTask({
            id: 'task-2',
            title: 'Clear the inbox',
            priority: 'low',
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
        startTime: '09:00',
        endTime: '10:00',
        type: 'fixed',
      }),
    ]),
  )
}

async function ready() {
  await screen.findByRole('heading', { level: 1 })
}

describe('agenda accessibility', () => {
  it('has no serious automated violations', async () => {
    seed()
    renderApp(['/'])
    await ready()
    const results = await checkA11y(screen.getByRole('main'))
    expect(seriousViolations(results)).toEqual([])
  })

  it('exposes timeline, conflicts, availability, and unscheduled as separate regions', async () => {
    seed()
    renderApp(['/'])
    await ready()

    expect(
      screen.getByRole('region', { name: /Timeline for/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /Conflicts for/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: /Available time for/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Unscheduled tasks' }),
    ).toBeInTheDocument()

    const timeline = screen.getByRole('region', { name: /Timeline for/ })
    expect(
      within(timeline).queryByRole('region', { name: 'Unscheduled tasks' }),
    ).toBeNull()
  })

  it('gives each row an accessible name with category, title, time, status, and conflicts', async () => {
    seed()
    renderApp(['/'])
    await ready()

    const row = screen.getByRole('listitem', {
      name: /Task: Plan the week, .*9:30.*10:30.*Pending.*Conflicts with Team sync/,
    })
    expect(row).toBeInTheDocument()

    const commitment = screen.getByRole('listitem', {
      name: /Fixed commitment: Team sync/,
    })
    expect(commitment).toBeInTheDocument()
  })

  it('names available periods as available and unassigned', async () => {
    seed()
    renderApp(['/'])
    await ready()

    expect(
      screen.getAllByRole('listitem', {
        name: /^Available and unassigned:/,
      }).length,
    ).toBeGreaterThan(0)
  })

  it('keeps one agenda live region inside the main content', async () => {
    seed()
    renderApp(['/'])
    await ready()

    const regions = within(screen.getByRole('main'))
      .getAllByRole('status')
      .filter((region) => region.getAttribute('aria-atomic') === 'true')
    expect(regions).toHaveLength(1)
    expect(regions[0]).toHaveAttribute('aria-live', 'polite')
    expect(regions[0]).toHaveAttribute('aria-atomic', 'true')
  })

  it('operates date navigation and scheduling by keyboard and returns focus from the dialog', async () => {
    seed()
    renderApp(['/'])
    await ready()

    const next = screen.getByRole('button', { name: 'Next day' })
    next.focus()
    expect(next).toHaveFocus()

    const schedule = screen.getByRole('button', { name: 'Schedule' })
    schedule.focus()
    fireEvent.click(schedule)
    await waitFor(() =>
      expect(screen.getByLabelText('Start time')).toHaveFocus(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(schedule).toHaveFocus())
  })
})
