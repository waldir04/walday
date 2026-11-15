import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeCommitment } from './helpers/commitmentFixtures'
import { makeTask } from './helpers/taskFixtures'
import { buildAgendaDay, DailyAgenda } from '@/features/agenda'
import type { DailyAgendaProps } from '@/features/agenda'
import '@/shared/i18n'

const DATE = '2026-11-15'

function makeDay(
  overrides: Partial<Parameters<typeof buildAgendaDay>[0]> = {},
) {
  return buildAgendaDay({
    date: DATE,
    tasks: [],
    commitments: [],
    now: new Date('2026-11-15T06:00:00.000Z'),
    locale: 'en-US',
    sources: 'complete',
    ...overrides,
  })
}

function renderAgenda(day = makeDay(), props: Partial<DailyAgendaProps> = {}) {
  return render(
    <MemoryRouter>
      <DailyAgenda
        day={day}
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
        {...props}
      />
    </MemoryRouter>,
  )
}

const seeded = makeDay({
  commitments: [
    makeCommitment({
      id: 'fixed',
      title: 'Morning sync',
      date: DATE,
      startTime: '08:00',
      endTime: '08:30',
      type: 'fixed',
    }),
    makeCommitment({
      id: 'flex',
      title: 'Evening review',
      date: DATE,
      startTime: '18:00',
      endTime: '19:00',
      type: 'flexible',
    }),
  ],
  tasks: [
    makeTask({
      id: 'task-scheduled',
      title: 'Plan the week',
      priority: 'high',
      plannedDate: DATE,
      plannedStartTime: '10:00',
      estimatedMinutes: 45,
    }),
    makeTask({
      id: 'task-unscheduled',
      title: 'Clear the inbox',
      priority: 'low',
      createdAt: '2026-11-10T10:00:00.000Z',
    }),
  ],
})

describe('agenda timeline rendering', () => {
  it('renders categories as text, tabular times, and the ordering hint', () => {
    renderAgenda(seeded)

    const timeline = screen.getByRole('region', {
      name: 'Timeline for Nov 15, 2026',
    })
    expect(within(timeline).getByText('Fixed commitment')).toBeInTheDocument()
    expect(
      within(timeline).getByText('Flexible commitment'),
    ).toBeInTheDocument()
    expect(within(timeline).getByText('Task')).toBeInTheDocument()
    expect(
      within(timeline).getByText(
        /fixed commitments, then flexible commitments, then tasks/i,
      ),
    ).toBeInTheDocument()

    const times = within(timeline).getByText(/8:00/)
    expect(times.className).toContain('tabular-nums')
  })

  it('states completion, priority, and keeps committed times unchanged', () => {
    renderAgenda(seeded)
    const timeline = screen.getByRole('region', {
      name: 'Timeline for Nov 15, 2026',
    })
    const plan = within(timeline).getByText('Plan the week').closest('li')
    expect(plan).not.toBeNull()
    if (!plan) return
    expect(within(plan).getByText('Pending')).toBeInTheDocument()
    expect(within(plan).getByText('High')).toBeInTheDocument()
    expect(within(plan).getByText(/10:00/)).toBeInTheDocument()
  })

  it('renders a completed scheduled task at its time position', () => {
    const day = makeDay({
      tasks: [
        makeTask({
          id: 'done',
          title: 'Finished task',
          status: 'completed',
          plannedDate: DATE,
          plannedStartTime: '09:00',
          estimatedMinutes: 30,
        }),
      ],
    })
    renderAgenda(day)
    const timeline = screen.getByRole('region', {
      name: 'Timeline for Nov 15, 2026',
    })
    const row = within(timeline).getByText('Finished task').closest('li')
    expect(row).not.toBeNull()
    if (!row) return
    expect(within(row).getByText('Completed')).toBeInTheDocument()
    expect(within(row).queryByRole('button')).toBeNull()
  })

  it('renders unscheduled tasks outside the timeline in Task Management order', () => {
    renderAgenda(seeded)

    const timeline = screen.getByRole('region', {
      name: 'Timeline for Nov 15, 2026',
    })
    const unscheduled = screen.getByRole('region', {
      name: 'Unscheduled tasks',
    })
    expect(
      within(timeline).queryByText('Clear the inbox'),
    ).not.toBeInTheDocument()
    expect(within(unscheduled).getByText('Clear the inbox')).toBeInTheDocument()
    expect(
      within(unscheduled).getByText(/no assigned time/i),
    ).toBeInTheDocument()
  })

  it('explains an empty timeline while keeping pending tasks visible', () => {
    const day = makeDay({
      tasks: [makeTask({ id: 'pending', title: 'Still pending' })],
    })
    renderAgenda(day)

    const timeline = screen.getByRole('region', {
      name: 'Timeline for Nov 15, 2026',
    })
    expect(
      within(timeline).getByText('Nothing is scheduled for this date'),
    ).toBeInTheDocument()
    expect(screen.getByText('Still pending')).toBeInTheDocument()
  })

  it('renders no edit or delete controls anywhere', () => {
    renderAgenda(seeded)
    expect(screen.queryByRole('button', { name: /edit|delete/i })).toBeNull()
  })
})
