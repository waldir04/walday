import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeCommitment } from './helpers/commitmentFixtures'
import { makeTask } from './helpers/taskFixtures'
import { buildAgendaDay, DailyAgenda } from '@/features/agenda'
import '@/shared/i18n'

const DATE = '2026-11-15'

function renderAgenda() {
  const day = buildAgendaDay({
    date: DATE,
    tasks: [
      makeTask({
        id: 'task-1',
        title: 'Plan the week',
        priority: 'high',
        plannedDate: DATE,
        plannedStartTime: '10:00',
        estimatedMinutes: 45,
      }),
      makeTask({ id: 'pending', title: 'Pending task' }),
    ],
    commitments: [
      makeCommitment({
        id: 'fixed',
        title: 'Morning sync',
        date: DATE,
        startTime: '08:00',
        endTime: '08:30',
      }),
    ],
    now: new Date('2026-11-15T06:00:00.000Z'),
    locale: 'en-US',
    sources: 'complete',
  })

  render(
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
      />
    </MemoryRouter>,
  )
}

describe('agenda responsive and visual contract', () => {
  it('uses rounded card rows, tabular times, and token-only category pills', () => {
    renderAgenda()

    const row = screen.getByText('Plan the week').closest('li')
    expect(row).not.toBeNull()
    if (!row) return
    expect(row.className).toContain('rounded-2xl')
    expect(row.className).toContain('border-border')
    expect(row.className).toContain('bg-surface')

    const time = screen.getAllByText(/10:00/)[0]
    expect(time?.className).toContain('tabular-nums')

    const pill = screen.getAllByText('Task')[0]
    expect(pill?.className).toContain('border-tag-border')
    expect(pill?.className).toContain('text-tag-text')
  })

  it('keeps the card header wrapping for narrow viewports without reordering', () => {
    renderAgenda()
    const row = screen.getByText('Plan the week').closest('li')
    const header = row?.querySelector('div')
    expect(header?.className).toContain('flex-wrap')

    const commitments = screen.getByText('Morning sync')
    const task = screen.getByText('Plan the week')
    expect(
      commitments.compareDocumentPosition(task) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('contains no raw hex color in rendered class names', () => {
    renderAgenda()
    const elements = document.querySelectorAll('[class]')
    for (const element of elements) {
      expect(element.getAttribute('class')).not.toMatch(/#[0-9a-f]{3,8}/i)
    }
  })

  it('keeps secondary metadata muted and compact', () => {
    renderAgenda()
    const pending = screen.getAllByText('Pending')[0]
    expect(pending?.parentElement?.className).toContain('text-text-muted')
    expect(pending?.parentElement?.className).toContain('text-caption')
  })
})
