import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { makeCommitment } from './helpers/commitmentFixtures'
import { makeTask } from './helpers/taskFixtures'
import { buildAgendaDay, DailyAgenda } from '@/features/agenda'
import '@/shared/i18n'

const DATE = '2026-11-15'

function day(input: Partial<Parameters<typeof buildAgendaDay>[0]> = {}) {
  return buildAgendaDay({
    date: DATE,
    tasks: [],
    commitments: [],
    now: new Date('2026-11-15T06:00:00.000Z'),
    locale: 'en-US',
    sources: 'complete',
    ...input,
  })
}

function renderAgenda(built: ReturnType<typeof day>) {
  return render(
    <MemoryRouter>
      <DailyAgenda
        day={built}
        selectedDate={DATE}
        today={DATE}
        locale="en-US"
        dateStyle="medium"
        scheduling={{ enabled: true, reasonKey: null }}
        pending={false}
        onSelectDate={() => undefined}
        onSchedule={() => undefined}
        onAdjust={() => undefined}
        onUnschedule={() => undefined}
        onOpenTasks={() => undefined}
        onOpenCommitments={() => undefined}
        onCreateTask={() => undefined}
        onCreateCommitment={() => undefined}
        liveMessage={null}
      />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('agenda conflict presentation', () => {
  const conflicting = day({
    commitments: [
      makeCommitment({
        id: 'fixed',
        title: 'Morning sync',
        date: DATE,
        startTime: '08:00',
        endTime: '09:00',
      }),
      makeCommitment({
        id: 'flex',
        title: 'Evening review',
        date: DATE,
        startTime: '08:30',
        endTime: '09:30',
        type: 'flexible',
      }),
    ],
    tasks: [
      makeTask({
        id: 'task',
        title: 'Plan the week',
        plannedDate: DATE,
        plannedStartTime: '08:45',
        estimatedMinutes: 30,
      }),
    ],
  })

  it('names every counterpart and range on each involved row', () => {
    renderAgenda(conflicting)
    const timeline = screen.getByRole('region', {
      name: 'Timeline for Nov 15, 2026',
    })
    const morning = within(timeline).getByText('Morning sync').closest('li')
    expect(morning).not.toBeNull()
    if (!morning) return
    expect(
      within(morning).getByText(/Conflicts with Evening review/),
    ).toBeInTheDocument()
    expect(
      within(morning).getByText(/Conflicts with Plan the week/),
    ).toBeInTheDocument()
    expect(within(morning).getAllByText(/8:30/).length).toBeGreaterThan(0)
  })

  it('counts one conflict per group and states how many activities it involves', () => {
    renderAgenda(conflicting)
    const summary = screen.getByRole('region', {
      name: 'Conflicts for Nov 15, 2026',
    })
    expect(
      within(summary).getByText(/Conflict 1: 3 activities/),
    ).toBeInTheDocument()
    expect(
      within(summary).getByText('1 conflicts, 3 activities involved'),
    ).toBeInTheDocument()
    expect(within(summary).queryAllByRole('button')).toHaveLength(0)
  })

  it('labels a flexible commitment as adjustable in text', () => {
    renderAgenda(conflicting)
    expect(screen.getByText('Evening review is adjustable')).toBeInTheDocument()
  })

  it('reports nothing for boundary-touching activities', () => {
    renderAgenda(
      day({
        commitments: [
          makeCommitment({
            id: 'first',
            title: 'First',
            date: DATE,
            startTime: '08:00',
            endTime: '09:00',
          }),
          makeCommitment({
            id: 'second',
            title: 'Second',
            date: DATE,
            startTime: '09:00',
            endTime: '10:00',
            type: 'flexible',
          }),
        ],
      }),
    )
    expect(
      screen.queryByRole('region', { name: /Conflicts for/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Coincides with/)).not.toBeInTheDocument()
  })

  it('renders without writing storage', () => {
    localStorage.setItem('walday:tasks', '{}')
    const snapshot = localStorage.getItem('walday:tasks')
    renderAgenda(conflicting)
    expect(localStorage.getItem('walday:tasks')).toBe(snapshot)
  })
})
