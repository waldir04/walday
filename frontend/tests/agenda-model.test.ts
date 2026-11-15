import { describe, expect, it } from 'vitest'
import { makeCommitment } from './helpers/commitmentFixtures'
import { makeTask } from './helpers/taskFixtures'
import {
  buildAgendaDay,
  deriveConflicts,
  deriveAvailability,
  minutesFromTime,
  minutesToTimeLabel,
  clampDayEnd,
  sortAgendaEntries,
  type AgendaCategory,
  type AgendaEntry,
} from '@/features/agenda'
import {
  shiftLocalDate,
  minuteOfDayRoundedUp,
} from '@/shared/lib/localDateTime'

const DATE = '2026-11-15'
const NOW = new Date('2026-11-15T09:00:00.000Z')

interface EntryOptions {
  key: string
  category?: AgendaCategory
  title?: string
  startMinutes?: number
  endMinutes?: number
  exceedsDayEnd?: boolean
}

function entry(options: EntryOptions): AgendaEntry {
  const base = {
    key: options.key,
    sourceId: options.key,
    title: options.title ?? options.key,
    startMinutes: options.startMinutes ?? 540,
    endMinutes: options.endMinutes ?? 600,
    conflicts: [],
    exceedsDayEnd: options.exceedsDayEnd ?? false,
  }

  if (
    options.category === 'fixed-commitment' ||
    options.category === 'flexible-commitment'
  ) {
    return { ...base, category: options.category }
  }

  return {
    ...base,
    category: 'task',
    status: 'pending',
    priority: 'low',
  }
}

function day(entries: AgendaEntry[], nowMinutes = 0) {
  return deriveAvailability({
    entries,
    date: DATE,
    today: DATE,
    nowMinutes,
    sources: 'complete',
  })
}

function time(minutes: number): string {
  const safe = ((minutes % 1440) + 1440) % 1440
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

describe('agenda day derivation', () => {
  it('includes commitments and scheduled tasks on the selected date only', () => {
    const tasks = [
      makeTask({
        id: 'scheduled',
        title: 'Scheduled task',
        plannedDate: DATE,
        plannedStartTime: '10:00',
        estimatedMinutes: 30,
      }),
      makeTask({
        id: 'other-date',
        title: 'Other date',
        plannedDate: '2026-11-16',
        plannedStartTime: '10:00',
        estimatedMinutes: 30,
      }),
    ]
    const commitments = [
      makeCommitment({
        id: 'fixed',
        date: DATE,
        startTime: '08:00',
        endTime: '08:30',
      }),
      makeCommitment({
        id: 'tomorrow',
        date: '2026-11-16',
        startTime: '08:00',
        endTime: '08:30',
      }),
    ]

    const built = buildAgendaDay({
      date: DATE,
      tasks,
      commitments,
      now: NOW,
      locale: 'en-US',
      sources: 'complete',
    })

    expect(built.entries.map((item) => item.sourceId)).toEqual([
      'fixed',
      'scheduled',
    ])
    expect(built.entries[1]).toMatchObject({
      category: 'task',
      startMinutes: 600,
      endMinutes: 630,
      status: 'pending',
      priority: 'medium',
    })
  })

  it('orders by start, then category rank, end, localized title, and key', () => {
    const entries = [
      entry({ key: 'task:z', title: 'Zulu' }),
      entry({ key: 'fixed:b', category: 'fixed-commitment', title: 'Beta' }),
      entry({
        key: 'flex:a',
        category: 'flexible-commitment',
        title: 'Alpha',
        endMinutes: 570,
      }),
      entry({ key: 'task:a', title: 'Alpha', endMinutes: 590 }),
    ]

    expect(sortAgendaEntries(entries, 'en-US').map((item) => item.key)).toEqual(
      ['fixed:b', 'flex:a', 'task:a', 'task:z'],
    )
  })

  it('does not let task priority affect chronological order', () => {
    const entries = [
      entry({ key: 'task:low', startMinutes: 600, endMinutes: 660 }),
      entry({ key: 'task:high', startMinutes: 540, endMinutes: 600 }),
    ]
    expect(sortAgendaEntries(entries, 'en-US').map((item) => item.key)).toEqual(
      ['task:high', 'task:low'],
    )
  })

  it('keeps completed scheduled tasks in the timeline and out of the unscheduled area', () => {
    const tasks = [
      makeTask({
        id: 'done',
        status: 'completed',
        plannedDate: DATE,
        plannedStartTime: '10:00',
        estimatedMinutes: 30,
      }),
      makeTask({ id: 'due-today', dueDate: DATE }),
      makeTask({
        id: 'scheduled-other',
        plannedDate: '2026-11-16',
        plannedStartTime: '10:00',
        estimatedMinutes: 30,
      }),
    ]

    const built = buildAgendaDay({
      date: DATE,
      tasks,
      commitments: [],
      now: NOW,
      locale: 'en-US',
      sources: 'complete',
    })
    expect(built.entries.map((item) => item.sourceId)).toEqual(['done'])
    expect(built.unscheduledTasks.map((task) => task.id)).toEqual(['due-today'])
  })

  it('orders unscheduled tasks with Task Management ordering', () => {
    const tasks = [
      makeTask({ id: 'old', createdAt: '2026-11-10T10:00:00.000Z' }),
      makeTask({ id: 'new', createdAt: '2026-11-12T10:00:00.000Z' }),
    ]
    const built = buildAgendaDay({
      date: DATE,
      tasks,
      commitments: [],
      now: NOW,
      locale: 'en-US',
      sources: 'complete',
    })
    expect(built.unscheduledTasks.map((task) => task.id)).toEqual([
      'new',
      'old',
    ])
  })

  it('marks an oversize slot at the end of the day without changing stored values', () => {
    const task = makeTask({
      id: 'late',
      plannedDate: DATE,
      plannedStartTime: '23:30',
      estimatedMinutes: 60,
    })
    const built = buildAgendaDay({
      date: DATE,
      tasks: [task],
      commitments: [],
      now: NOW,
      locale: 'en-US',
      sources: 'complete',
    })
    expect(built.entries[0]).toMatchObject({
      startMinutes: 1410,
      endMinutes: 1440,
      exceedsDayEnd: true,
    })
    expect(task.estimatedMinutes).toBe(60)
  })

  it('computes empty and activity flags', () => {
    const empty = buildAgendaDay({
      date: DATE,
      tasks: [],
      commitments: [],
      now: NOW,
      locale: 'en-US',
      sources: 'complete',
    })
    expect(empty.timelineEmpty).toBe(true)
    expect(empty.hasAnyActivity).toBe(false)

    const withPending = buildAgendaDay({
      date: DATE,
      tasks: [makeTask({ id: 'pending' })],
      commitments: [],
      now: NOW,
      locale: 'en-US',
      sources: 'complete',
    })
    expect(withPending.timelineEmpty).toBe(true)
    expect(withPending.hasAnyActivity).toBe(true)
  })

  it('handles 100 activities within a generous budget', () => {
    const commitments = Array.from({ length: 100 }, (_, index) =>
      makeCommitment({
        id: `c-${index}`,
        title: `Activity ${index}`,
        date: DATE,
        startTime: time(index * 13),
        endTime: time(index * 13 + 10),
      }),
    )
    const started = Date.now()
    const built = buildAgendaDay({
      date: DATE,
      tasks: [],
      commitments,
      now: NOW,
      locale: 'en-US',
      sources: 'complete',
    })
    expect(built.entries).toHaveLength(100)
    expect(Date.now() - started).toBeLessThan(1000)
  })
})

describe('conflict derivation', () => {
  it('detects partial overlap, containment, and identical periods', () => {
    const entries = [
      entry({ key: 'a', startMinutes: 540, endMinutes: 600 }),
      entry({ key: 'b', startMinutes: 570, endMinutes: 630 }),
      entry({ key: 'c', startMinutes: 545, endMinutes: 560 }),
      entry({ key: 'd', startMinutes: 570, endMinutes: 630 }),
    ]
    const { conflicts, entries: linked } = deriveConflicts(entries)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({
      entryKeys: ['a', 'b', 'c', 'd'],
      activityCount: 4,
      startMinutes: 540,
      endMinutes: 630,
    })
    expect(linked[0]?.conflicts.map((link) => link.entryKey)).toEqual([
      'b',
      'c',
      'd',
    ])
  })

  it('excludes boundary-touching and chained activities', () => {
    const entries = [
      entry({ key: 'a', startMinutes: 540, endMinutes: 600 }),
      entry({ key: 'b', startMinutes: 600, endMinutes: 660 }),
      entry({ key: 'c', startMinutes: 660, endMinutes: 720 }),
    ]
    expect(deriveConflicts(entries).conflicts).toEqual([])
  })

  it('counts a three-way overlap once and names both counterparts on each row', () => {
    const entries = [
      entry({ key: 'a', startMinutes: 540, endMinutes: 660 }),
      entry({ key: 'b', startMinutes: 550, endMinutes: 650 }),
      entry({
        key: 'c',
        category: 'flexible-commitment',
        startMinutes: 560,
        endMinutes: 640,
      }),
    ]
    const { conflicts, entries: linked } = deriveConflicts(entries)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.activityCount).toBe(3)
    expect(conflicts[0]?.adjustableKeys).toEqual(['c'])
    expect(linked[0]?.conflicts).toHaveLength(2)
    expect(linked[1]?.conflicts).toHaveLength(2)
    expect(linked[2]?.conflicts).toHaveLength(2)
  })

  it('returns originals unchanged when there are no edges', () => {
    const entries = [entry({ key: 'a' })]
    const result = deriveConflicts(entries)
    expect(result.conflicts).toEqual([])
    expect(result.entries[0]?.conflicts).toEqual([])
  })
})

describe('availability derivation', () => {
  it('presents a 30-minute gap and omits a 29-minute gap', () => {
    const thirty = day([
      entry({ key: 'a', startMinutes: 0, endMinutes: 600 }),
      entry({ key: 'b', startMinutes: 630, endMinutes: 1440 }),
    ])
    expect(thirty).toMatchObject({
      kind: 'available',
      periods: [{ startMinutes: 600, endMinutes: 630 }],
      totalMinutes: 30,
    })

    const twentyNine = day([
      entry({ key: 'a', startMinutes: 0, endMinutes: 600 }),
      entry({ key: 'b', startMinutes: 629, endMinutes: 1440 }),
    ])
    expect(twentyNine).toMatchObject({
      kind: 'available',
      periods: [],
      totalMinutes: 0,
    })
  })

  it('merges overlapping and touching occupied intervals', () => {
    const result = day([
      entry({ key: 'a', startMinutes: 0, endMinutes: 100 }),
      entry({ key: 'b', startMinutes: 50, endMinutes: 200 }),
      entry({ key: 'c', startMinutes: 200, endMinutes: 300 }),
    ])
    expect(result).toMatchObject({
      kind: 'available',
      periods: [{ startMinutes: 300, endMinutes: 1440 }],
      totalMinutes: 1140,
    })
  })

  it('trims today to the current minute and treats past dates as unavailable', () => {
    const todayResult = deriveAvailability({
      entries: [entry({ key: 'a', startMinutes: 0, endMinutes: 500 })],
      date: DATE,
      today: DATE,
      nowMinutes: 600,
      sources: 'complete',
    })
    expect(todayResult).toMatchObject({
      kind: 'available',
      periods: [{ startMinutes: 600, endMinutes: 1440 }],
    })

    expect(
      deriveAvailability({
        entries: [],
        date: '2026-11-14',
        today: DATE,
        nowMinutes: 0,
        sources: 'complete',
      }),
    ).toEqual({ kind: 'none', reason: 'past-date' })

    expect(
      deriveAvailability({
        entries: [],
        date: DATE,
        today: DATE,
        nowMinutes: 0,
        sources: 'incomplete',
      }),
    ).toEqual({ kind: 'none', reason: 'incomplete-sources' })
  })

  it('treats an oversized slot as occupied until 1440', () => {
    const result = deriveAvailability({
      entries: [
        entry({
          key: 'late',
          startMinutes: 1410,
          endMinutes: 1440,
          exceedsDayEnd: true,
        }),
      ],
      date: DATE,
      today: DATE,
      nowMinutes: 0,
      sources: 'complete',
    })
    expect(result).toMatchObject({
      kind: 'available',
      periods: [{ startMinutes: 0, endMinutes: 1410 }],
      totalMinutes: 1410,
    })
  })
})

describe('time and date helpers', () => {
  it('converts times, clamps the day end, and labels the end of day', () => {
    expect(minutesFromTime('00:00')).toBe(0)
    expect(minutesFromTime('23:59')).toBe(1439)
    expect(clampDayEnd(1410, 60)).toEqual({
      endMinutes: 1440,
      exceedsDayEnd: true,
    })
    expect(clampDayEnd(540, 60)).toEqual({
      endMinutes: 600,
      exceedsDayEnd: false,
    })
    expect(minutesToTimeLabel(1440, 'en-US', 'End of day')).toBe('End of day')
  })

  it('shifts local dates across month and year boundaries without UTC drift', () => {
    expect(shiftLocalDate('2026-01-31', 1)).toBe('2026-02-01')
    expect(shiftLocalDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftLocalDate('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('rounds the minute of day up', () => {
    expect(minuteOfDayRoundedUp(new Date(2026, 10, 15, 9, 30, 0, 0))).toBe(570)
    expect(minuteOfDayRoundedUp(new Date(2026, 10, 15, 9, 30, 0, 1))).toBe(571)
    expect(minuteOfDayRoundedUp(new Date(2026, 10, 15, 23, 59, 59, 999))).toBe(
      1440,
    )
  })
})
