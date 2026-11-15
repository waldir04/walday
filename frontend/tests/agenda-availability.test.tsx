import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { makeCommitment } from './helpers/commitmentFixtures'
import { buildAgendaDay, DailyAgenda } from '@/features/agenda'
import '@/shared/i18n'

const DATE = '2026-11-15'
const TOMORROW = '2026-11-16'
const YESTERDAY = '2026-11-14'

function build(input: Partial<Parameters<typeof buildAgendaDay>[0]>) {
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

function renderAgenda(built: ReturnType<typeof build>, selectedDate = DATE) {
  return render(
    <MemoryRouter>
      <DailyAgenda
        day={built}
        selectedDate={selectedDate}
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

function commitment(startTime: string, endTime: string) {
  return makeCommitment({
    id: `${startTime}-${endTime}`,
    title: 'Occupied',
    date: DATE,
    startTime,
    endTime,
  })
}

function availabilityRegion() {
  return screen.getByRole('region', { name: /Available time for/ })
}

describe('agenda availability presentation', () => {
  it('lists periods and a total equal to their sum', () => {
    renderAgenda(
      build({
        commitments: [commitment('08:00', '09:00')],
      }),
    )
    const region = availabilityRegion()
    expect(within(region).getByText(/Available 6:00 AM/)).toBeInTheDocument()
    expect(within(region).getByText(/Available 9:00 AM/)).toBeInTheDocument()
    expect(
      within(region).getByText('Total available: 17 hours'),
    ).toBeInTheDocument()
  })

  it('starts today at the current minute using the injected clock', () => {
    renderAgenda(
      build({
        now: new Date('2026-11-15T06:30:00.000Z'),
        commitments: [commitment('08:00', '09:00')],
      }),
    )
    const region = availabilityRegion()
    expect(within(region).getByText(/Available 6:30 AM/)).toBeInTheDocument()
    expect(
      within(region).queryByText(/Available 12:00 AM/),
    ).not.toBeInTheDocument()
  })

  it('starts a future date at midnight', () => {
    renderAgenda(
      build({
        date: TOMORROW,
        commitments: [
          makeCommitment({
            id: 'future',
            title: 'Future',
            date: TOMORROW,
            startTime: '08:00',
            endTime: '09:00',
          }),
        ],
      }),
      TOMORROW,
    )
    const region = availabilityRegion()
    expect(within(region).getByText(/Available 12:00 AM/)).toBeInTheDocument()
  })

  it('shows the past-date explanation and no periods', () => {
    renderAgenda(
      build({
        date: YESTERDAY,
        commitments: [
          makeCommitment({
            id: 'past',
            title: 'Past',
            date: YESTERDAY,
            startTime: '08:00',
            endTime: '09:00',
          }),
        ],
      }),
      YESTERDAY,
    )
    const region = availabilityRegion()
    expect(
      within(region).getByText('Available time is not shown for past dates.'),
    ).toBeInTheDocument()
    expect(within(region).queryAllByText(/^Available \d/)).toHaveLength(0)
  })

  it('shows the incomplete explanation when a source is unreadable', () => {
    renderAgenda(
      build({
        sources: 'incomplete',
        commitments: [commitment('08:00', '09:00')],
      }),
    )
    const region = availabilityRegion()
    expect(
      within(region).getByText(
        'Available time cannot be calculated because not all data could be read.',
      ),
    ).toBeInTheDocument()
  })

  it('exposes no action that assigns or moves an activity', () => {
    renderAgenda(build({ commitments: [commitment('08:00', '09:00')] }))
    const region = availabilityRegion()
    expect(within(region).queryAllByRole('button')).toHaveLength(0)
    expect(within(region).queryAllByRole('link')).toHaveLength(0)
  })
})
