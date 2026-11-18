import { beforeEach, describe, expect, it } from 'vitest'
import type { Task } from '../src/entities/task'
import type { AgendaEntry } from '../src/features/agenda'
import {
  generateCandidates,
  selectSuggestions,
} from '../src/features/suggestions'
import {
  generateConflictCandidates,
  findAlternativeStart,
} from '../src/features/suggestions/model/conflicts'
import { generateFlexibleAdjustmentCandidates } from '../src/features/suggestions/model/flexibleAdjustment'
import {
  collectConflictCommitmentCandidates,
  collectConflictTaskCandidates,
  compareConflictTaskCandidates,
  conflictDueRank,
  conflictPriorityRank,
  isEligibleUnscheduledTask,
  isMovableScheduledTask,
  priorityRank,
  slotDueRank,
} from '../src/features/suggestions/model/eligibility'
import {
  activityKeyFor,
  changeSignatureFor,
  suggestionIdFor,
} from '../src/features/suggestions/model/identity'
import { openPeriodsExcluding } from '../src/features/suggestions/model/openPeriods'
import {
  compareSuggestions,
  dedupeSuggestions,
} from '../src/features/suggestions/model/ordering'
import {
  buildWeatherContext,
  choosePeriodByWeather,
} from '../src/features/suggestions/model/weather'
import {
  SUGGESTION_DATE,
  availablePeriods,
  availableWeather,
  commitmentEntry,
  resetSuggestionSequence,
  suggestionCommitment,
  suggestionTask,
  unavailableWeather,
  weatherHour,
} from './helpers/suggestionFixtures'

function entryForTask(
  task: ReturnType<typeof suggestionTask>,
  startMinutes: number,
  endMinutes: number,
): AgendaEntry {
  return {
    key: `task:${task.id}`,
    sourceId: task.id,
    category: 'task',
    title: task.title,
    startMinutes,
    endMinutes,
    status: task.status,
    priority: task.priority,
    conflicts: [],
    exceedsDayEnd: false,
  }
}

beforeEach(() => {
  resetSuggestionSequence()
})

describe('identity and ordering', () => {
  it('builds stable ids and canonical change signatures', () => {
    const task = suggestionTask({ id: 'task-stable' })
    const change = {
      kind: 'schedule-task' as const,
      taskId: task.id,
      plannedDate: SUGGESTION_DATE,
      startMinutes: 480,
      endMinutes: 540,
      durationMinutes: 60,
      current: null,
    }
    const target = { kind: 'task' as const, taskId: task.id, title: task.title }

    expect(suggestionIdFor({ category: 'slot', target, change })).toBe(
      `slot:task:task-stable:${SUGGESTION_DATE}:480`,
    )
    expect(changeSignatureFor(change)).toBe(
      `schedule-task:task-stable:${SUGGESTION_DATE}:480-540`,
    )
    expect(activityKeyFor(target)).toBe('task:task-stable')
  })

  it('orders by category, due rank, priority, start, source and id', () => {
    const make = (
      categoryRank: 0 | 1 | 2 | 3,
      dueRank: 0 | 1 | 2 | 3 | 4,
      priorityRank: 0 | 1 | 2,
      start: number,
      id: string,
    ) => ({
      id,
      category: 'slot' as const,
      target: { kind: 'task' as const, taskId: id, title: id },
      change: {
        kind: 'schedule-task' as const,
        taskId: id,
        plannedDate: SUGGESTION_DATE,
        startMinutes: start,
        endMinutes: start + 30,
        durationMinutes: 30,
        current: null,
      },
      reasons: [],
      weather: null,
      rank: {
        categoryRank,
        dueRank,
        dueDate: null,
        priorityRank,
        proposedStartMinutes: start,
        sourceOrder: 0,
        suggestionId: id,
      },
    })

    const ordered = [
      make(3, 0, 0, 0, 'flex'),
      make(2, 3, 2, 900, 'other'),
      make(1, 2, 1, 700, 'future'),
      make(0, 1, 2, 500, 'conflict'),
      make(1, 0, 1, 600, 'overdue'),
      make(1, 1, 0, 650, 'today'),
    ].sort(compareSuggestions)

    expect(ordered.map((suggestion) => suggestion.id)).toEqual([
      'conflict',
      'overdue',
      'today',
      'future',
      'other',
      'flex',
    ])
  })

  it('uses future due date, source order and id as final tie-breakers', () => {
    const make = (input: {
      id: string
      dueDate: string | null
      sourceOrder?: number
    }) => ({
      id: input.id,
      category: 'slot' as const,
      target: { kind: 'task' as const, taskId: input.id, title: input.id },
      change: {
        kind: 'schedule-task' as const,
        taskId: input.id,
        plannedDate: SUGGESTION_DATE,
        startMinutes: 480,
        endMinutes: 540,
        durationMinutes: 60,
        current: null,
      },
      reasons: [],
      weather: null,
      rank: {
        categoryRank: 1 as const,
        dueRank: 2 as const,
        dueDate: input.dueDate,
        priorityRank: 1 as const,
        proposedStartMinutes: 480,
        sourceOrder: input.sourceOrder ?? 0,
        suggestionId: input.id,
      },
    })

    expect(
      compareSuggestions(
        make({ id: 'later', dueDate: '2026-11-20' }),
        make({ id: 'earlier', dueDate: '2026-11-19' }),
      ),
    ).toBeGreaterThan(0)
    expect(
      compareSuggestions(
        make({ id: 'second', dueDate: '2026-11-19', sourceOrder: 1 }),
        make({ id: 'first', dueDate: '2026-11-19', sourceOrder: 0 }),
      ),
    ).toBeGreaterThan(0)
    expect(
      compareSuggestions(
        make({ id: 'b', dueDate: '2026-11-19' }),
        make({ id: 'a', dueDate: '2026-11-19' }),
      ),
    ).toBeGreaterThan(0)
  })

  it('deduplicates by activity and activity/change, keeping the first', () => {
    const task = suggestionTask({ id: 'dup' })
    const base = {
      category: 'slot' as const,
      target: { kind: 'task' as const, taskId: task.id, title: task.title },
      reasons: [],
      weather: null,
      rank: {
        categoryRank: 1 as const,
        dueRank: 2 as const,
        dueDate: null,
        priorityRank: 1 as const,
        proposedStartMinutes: 480,
        sourceOrder: 0,
        suggestionId: 'first',
      },
    }
    const first = {
      ...base,
      id: 'first',
      change: {
        kind: 'schedule-task' as const,
        taskId: task.id,
        plannedDate: SUGGESTION_DATE,
        startMinutes: 480,
        endMinutes: 540,
        durationMinutes: 60,
        current: null,
      },
    }
    const second = {
      ...base,
      id: 'second',
      change: {
        kind: 'schedule-task' as const,
        taskId: task.id,
        plannedDate: SUGGESTION_DATE,
        startMinutes: 600,
        endMinutes: 660,
        durationMinutes: 60,
        current: null,
      },
    }

    expect(dedupeSuggestions([first, second]).map((item) => item.id)).toEqual([
      'first',
    ])
  })
})

describe('eligibility rules', () => {
  it('classifies due dates for slots and conflict selection', () => {
    const task = (dueDate?: Task['dueDate']) =>
      suggestionTask({ dueDate, plannedDate: SUGGESTION_DATE })

    expect(slotDueRank(task('2026-11-17'), SUGGESTION_DATE)).toBe(0)
    expect(slotDueRank(task(SUGGESTION_DATE), SUGGESTION_DATE)).toBe(1)
    expect(slotDueRank(task('2026-11-20'), SUGGESTION_DATE)).toBe(2)
    expect(slotDueRank(task(), SUGGESTION_DATE)).toBe(3)

    expect(conflictDueRank(task(), SUGGESTION_DATE)).toBe(0)
    expect(conflictDueRank(task('2026-11-20'), SUGGESTION_DATE)).toBe(1)
    expect(conflictDueRank(task(SUGGESTION_DATE), SUGGESTION_DATE)).toBe(2)
    expect(conflictDueRank(task('2026-11-17'), SUGGESTION_DATE)).toBe(3)

    expect(priorityRank('high')).toBe(0)
    expect(priorityRank('medium')).toBe(1)
    expect(priorityRank('low')).toBe(2)
    expect(conflictPriorityRank('low')).toBe(0)
    expect(conflictPriorityRank('medium')).toBe(1)
    expect(conflictPriorityRank('high')).toBe(2)
  })

  it('requires pending status, a planned slot and a duration for movable tasks', () => {
    const scheduled = suggestionTask({
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:00',
      estimatedMinutes: 30,
    })
    expect(isMovableScheduledTask(scheduled)).toBe(true)
    expect(isMovableScheduledTask({ ...scheduled, status: 'completed' })).toBe(
      false,
    )
    expect(
      isMovableScheduledTask({ ...scheduled, estimatedMinutes: undefined }),
    ).toBe(false)
    expect(
      isMovableScheduledTask({ ...scheduled, plannedDate: undefined }),
    ).toBe(false)

    expect(
      isEligibleUnscheduledTask(suggestionTask({ estimatedMinutes: 30 })),
    ).toBe(true)
    expect(
      isEligibleUnscheduledTask(
        suggestionTask({ estimatedMinutes: 30, plannedDate: SUGGESTION_DATE }),
      ),
    ).toBe(false)
    expect(
      isEligibleUnscheduledTask(
        suggestionTask({ estimatedMinutes: undefined }),
      ),
    ).toBe(false)
  })

  it('collects only movable task members and applies stable tie-breakers', () => {
    const first = suggestionTask({
      id: 'first',
      title: 'First',
      estimatedMinutes: 30,
      priority: 'low',
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:00',
    })
    const second = suggestionTask({
      id: 'second',
      title: 'Second',
      estimatedMinutes: 30,
      priority: 'low',
      dueDate: '2026-11-20',
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:00',
    })
    const later = suggestionTask({
      id: 'later',
      title: 'Later',
      estimatedMinutes: 30,
      priority: 'low',
      dueDate: '2026-11-25',
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:00',
    })
    const firstEntry = entryForTask(first, 540, 570)
    const secondEntry = entryForTask(second, 540, 570)
    const laterEntry = entryForTask(later, 540, 570)
    const fixed = commitmentEntry({
      id: 'fixed',
      startMinutes: 540,
      endMinutes: 570,
    })

    const missingEntry: AgendaEntry = {
      ...firstEntry,
      key: 'task:missing',
      sourceId: 'missing',
    }
    const candidates = collectConflictTaskCandidates({
      entryKeys: [
        firstEntry.key,
        secondEntry.key,
        laterEntry.key,
        fixed.key,
        'task:missing',
      ],
      entries: [firstEntry, secondEntry, laterEntry, fixed, missingEntry],
      tasks: [first, second, later],
    })

    expect(candidates).toHaveLength(3)
    const ordered = [...candidates].sort((a, b) =>
      compareConflictTaskCandidates(a, b, SUGGESTION_DATE),
    )
    expect(ordered.map((candidate) => candidate.task.id)).toEqual([
      'first',
      'later',
      'second',
    ])
  })

  it('collects flexible commitments on the current date ordered by start then key', () => {
    const a = suggestionCommitment({
      id: 'a',
      type: 'flexible',
      startTime: '09:00',
    })
    const b = suggestionCommitment({
      id: 'b',
      type: 'flexible',
      startTime: '09:00',
    })
    const otherDay = suggestionCommitment({
      id: 'other-day',
      type: 'flexible',
      date: '2026-11-19',
    })
    const fixed = suggestionCommitment({ id: 'fixed', type: 'fixed' })
    const entries = [
      commitmentEntry({ id: 'a', type: 'flexible', startMinutes: 540 }),
      commitmentEntry({ id: 'b', type: 'flexible', startMinutes: 540 }),
      commitmentEntry({ id: 'other-day', type: 'flexible', startMinutes: 540 }),
      commitmentEntry({ id: 'fixed', type: 'fixed', startMinutes: 540 }),
    ]

    const candidates = collectConflictCommitmentCandidates({
      entryKeys: entries.map((entry) => entry.key),
      entries,
      commitments: [b, otherDay, fixed, a],
      date: SUGGESTION_DATE,
    })

    expect(candidates.map((candidate) => candidate.commitment.id)).toEqual([
      'a',
      'b',
    ])

    const tieA = suggestionCommitment({ id: 'aaa', type: 'flexible' })
    const tieB = suggestionCommitment({ id: 'bbb', type: 'flexible' })
    const tieEntries = [
      commitmentEntry({ id: 'aaa', type: 'flexible', startMinutes: 540 }),
      commitmentEntry({ id: 'bbb', type: 'flexible', startMinutes: 540 }),
    ]
    expect(
      collectConflictCommitmentCandidates({
        entryKeys: tieEntries.map((entry) => entry.key),
        entries: tieEntries,
        commitments: [tieB, tieA],
        date: SUGGESTION_DATE,
      }).map((candidate) => candidate.commitment.id),
    ).toEqual(['aaa', 'bbb'])

    const orphanEntry = commitmentEntry({
      id: 'missing-commitment',
      type: 'flexible',
      startMinutes: 540,
    })
    expect(
      collectConflictCommitmentCandidates({
        entryKeys: [orphanEntry.key],
        entries: [orphanEntry],
        commitments: [],
        date: SUGGESTION_DATE,
      }),
    ).toEqual([])
  })
})

describe('open periods and alternatives', () => {
  it('merges overlapping and touching intervals and clips to now', () => {
    const entries = [
      commitmentEntry({ id: 'a', startMinutes: 480, endMinutes: 540 }),
      commitmentEntry({ id: 'b', startMinutes: 540, endMinutes: 600 }),
      commitmentEntry({ id: 'c', startMinutes: 700, endMinutes: 800 }),
    ]

    const periods = openPeriodsExcluding(entries, 'none', 500)
    expect(periods).toEqual([
      { startMinutes: 600, endMinutes: 700 },
      { startMinutes: 800, endMinutes: 1440 },
    ])
  })

  it('finds the earliest valid alternative without a presentation minimum', () => {
    const task = suggestionTask({ id: 'movable', estimatedMinutes: 60 })
    const entries = [
      entryForTask(task, 570, 630),
      commitmentEntry({ id: 'fixed', startMinutes: 540, endMinutes: 600 }),
    ]

    expect(
      findAlternativeStart({
        entries,
        excludedKey: `task:${task.id}`,
        durationMinutes: 60,
        nowMinutes: 480,
        currentStartMinutes: 570,
      }),
    ).toBe(480)
  })
})

describe('weather selection', () => {
  const periods = [
    { startMinutes: 480, endMinutes: 540 },
    { startMinutes: 600, endMinutes: 660 },
  ]

  it('uses the baseline when weather is unavailable', () => {
    expect(
      choosePeriodByWeather({
        fittingPeriods: periods,
        durationMinutes: 60,
        weather: unavailableWeather(),
      }),
    ).toEqual({ period: periods[0], evidence: null })
  })

  it('chooses a materially better covered period', () => {
    const result = choosePeriodByWeather({
      fittingPeriods: periods,
      durationMinutes: 60,
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'rain',
          precipitationProbability: 80,
        }),
        weatherHour({
          startMinutes: 600,
          endMinutes: 660,
          condition: 'clear',
          precipitationProbability: 10,
        }),
      ]),
    })

    expect(result.period).toEqual(periods[1])
    expect(result.evidence?.basis).toBe('precipitation')
    expect(result.evidence?.chosenCondition).toBe('clear')
  })

  it('keeps the baseline when any compared span is not covered', () => {
    const result = choosePeriodByWeather({
      fittingPeriods: periods,
      durationMinutes: 60,
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'rain',
          precipitationProbability: 80,
        }),
      ]),
    })
    expect(result).toEqual({ period: periods[0], evidence: null })
  })

  it('treats a severe condition change and a large severity change as material', () => {
    const severe = choosePeriodByWeather({
      fittingPeriods: periods,
      durationMinutes: 60,
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'storm',
          precipitationProbability: 50,
        }),
        weatherHour({
          startMinutes: 600,
          endMinutes: 660,
          condition: 'rain',
          precipitationProbability: 50,
        }),
      ]),
    })
    expect(severe.period).toEqual(periods[1])
    expect(severe.evidence?.basis).toBe('severe-condition')

    const severity = choosePeriodByWeather({
      fittingPeriods: periods,
      durationMinutes: 60,
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'rain',
          precipitationProbability: 50,
        }),
        weatherHour({
          startMinutes: 600,
          endMinutes: 660,
          condition: 'clear',
          precipitationProbability: 50,
        }),
      ]),
    })
    expect(severity.evidence?.basis).toBe('condition-severity')
  })

  it('ignores unknown conditions and missing precipitation', () => {
    const unknown = choosePeriodByWeather({
      fittingPeriods: periods,
      durationMinutes: 60,
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'unknown',
          precipitationProbability: 10,
        }),
        weatherHour({
          startMinutes: 600,
          endMinutes: 660,
          condition: 'clear',
          precipitationProbability: 0,
        }),
      ]),
    })
    expect(unknown).toEqual({ period: periods[0], evidence: null })

    const missing = choosePeriodByWeather({
      fittingPeriods: periods,
      durationMinutes: 60,
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'rain',
          precipitationProbability: 80,
        }),
        weatherHour({
          startMinutes: 600,
          endMinutes: 660,
          condition: 'clear',
          precipitationProbability: null,
        }),
      ]),
    })
    expect(missing).toEqual({ period: periods[0], evidence: null })
  })

  it('returns the earliest of equally good periods', () => {
    const third = { startMinutes: 720, endMinutes: 780 }
    const result = choosePeriodByWeather({
      fittingPeriods: [...periods, third],
      durationMinutes: 60,
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'rain',
          precipitationProbability: 90,
        }),
        weatherHour({
          startMinutes: 600,
          endMinutes: 660,
          condition: 'clear',
          precipitationProbability: 5,
        }),
        weatherHour({
          startMinutes: 720,
          endMinutes: 780,
          condition: 'clear',
          precipitationProbability: 5,
        }),
      ]),
    })
    expect(result.period).toEqual(periods[1])
    expect(result.evidence?.chosenStartMinutes).toBe(600)
  })

  it('keeps the baseline when the difference is not material', () => {
    const result = choosePeriodByWeather({
      fittingPeriods: periods,
      durationMinutes: 60,
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'rain',
          precipitationProbability: 55,
        }),
        weatherHour({
          startMinutes: 600,
          endMinutes: 660,
          condition: 'rain',
          precipitationProbability: 50,
        }),
      ]),
    })
    expect(result.evidence).toBeNull()
    expect(result.period).toEqual(periods[0])
  })
})

describe('weather adapter', () => {
  const at = (iso: string): number => new Date(iso).getTime()

  it('returns unavailable when the surface is not ready, outdated, or empty', () => {
    const hours = [
      {
        timeMs: at('2026-11-18T08:00:00.000Z'),
        condition: 'clear' as const,
        precipitationProbability: 0,
      },
    ]
    expect(
      buildWeatherContext({
        hours,
        today: SUGGESTION_DATE,
        isReady: false,
        isOutdated: false,
      }),
    ).toEqual({ status: 'unavailable' })
    expect(
      buildWeatherContext({
        hours,
        today: SUGGESTION_DATE,
        isReady: true,
        isOutdated: true,
      }),
    ).toEqual({ status: 'unavailable' })
    expect(
      buildWeatherContext({
        hours: [],
        today: SUGGESTION_DATE,
        isReady: true,
        isOutdated: false,
      }),
    ).toEqual({ status: 'unavailable' })
  })

  it('maps current-day hours to device minutes and drops other days', () => {
    const context = buildWeatherContext({
      hours: [
        {
          timeMs: at('2026-11-18T08:00:00.000Z'),
          condition: 'clear',
          precipitationProbability: 10,
        },
        {
          timeMs: at('2026-11-18T09:00:00.000Z'),
          condition: 'rain',
          precipitationProbability: 70,
        },
        {
          timeMs: at('2026-11-19T00:00:00.000Z'),
          condition: 'snow',
          precipitationProbability: 80,
        },
      ],
      today: SUGGESTION_DATE,
      isReady: true,
      isOutdated: false,
    })

    expect(context).toEqual({
      status: 'available',
      hours: [
        {
          startMinutes: 480,
          endMinutes: 540,
          condition: 'clear',
          precipitationProbability: 10,
        },
        {
          startMinutes: 540,
          endMinutes: 1440,
          condition: 'rain',
          precipitationProbability: 70,
        },
      ],
    })
  })

  it('preserves timestamp-derived span lengths and removes overlaps', () => {
    const context = buildWeatherContext({
      hours: [
        {
          timeMs: at('2026-11-18T08:00:00.000Z'),
          condition: 'clear',
          precipitationProbability: 0,
        },
        {
          timeMs: at('2026-11-18T08:30:00.000Z'),
          condition: 'cloudy',
          precipitationProbability: 20,
        },
        {
          timeMs: at('2026-11-18T09:00:00.000Z'),
          condition: 'rain',
          precipitationProbability: 60,
        },
      ],
      today: SUGGESTION_DATE,
      isReady: true,
      isOutdated: false,
    })

    if (context.status !== 'available') throw new Error('expected available')
    expect(
      context.hours.map((hour) => [hour.startMinutes, hour.endMinutes]),
    ).toEqual([
      [480, 510],
      [510, 540],
      [540, 600],
    ])
  })

  it('never invents values for missing hours', () => {
    const context = buildWeatherContext({
      hours: [
        {
          timeMs: at('2026-11-18T08:00:00.000Z'),
          condition: 'clear',
          precipitationProbability: null,
        },
      ],
      today: SUGGESTION_DATE,
      isReady: true,
      isOutdated: false,
    })
    if (context.status !== 'available') throw new Error('expected available')
    expect(context.hours[0]?.precipitationProbability).toBeNull()
  })
})

describe('conflict candidates', () => {
  it('prefers a movable flexible commitment over a task', () => {
    const task = suggestionTask({
      id: 'task-a',
      estimatedMinutes: 60,
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:30',
    })
    const flexible = suggestionCommitment({
      id: 'flex-1',
      type: 'flexible',
      startTime: '09:00',
      endTime: '10:00',
    })
    const taskEntryValue = entryForTask(task, 570, 630)
    const flexibleEntry = commitmentEntry({
      id: flexible.id,
      type: 'flexible',
      startMinutes: 540,
      endMinutes: 600,
    })
    const group = {
      id: 'group',
      entryKeys: [taskEntryValue.key, flexibleEntry.key],
      activityCount: 2,
      startMinutes: 570,
      endMinutes: 600,
      adjustableKeys: [flexibleEntry.key],
    }

    const candidates = generateConflictCandidates({
      date: SUGGESTION_DATE,
      group,
      entries: [taskEntryValue, flexibleEntry],
      tasks: [task],
      commitments: [flexible],
      nowMinutes: 480,
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.target).toMatchObject({
      kind: 'commitment',
      commitmentId: 'flex-1',
    })
    expect(candidates[0]?.change.kind).toBe('move-commitment')
  })

  it('moves the least deadline-urgent task and names every member', () => {
    const urgent = suggestionTask({
      id: 'urgent',
      title: 'Urgent',
      estimatedMinutes: 60,
      dueDate: '2026-11-17',
      priority: 'high',
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:10',
    })
    const relaxed = suggestionTask({
      id: 'relaxed',
      title: 'Relaxed',
      estimatedMinutes: 60,
      priority: 'low',
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:20',
    })
    const fixed = commitmentEntry({
      id: 'fixed',
      startMinutes: 540,
      endMinutes: 600,
    })
    const urgentEntry = entryForTask(urgent, 550, 610)
    const relaxedEntry = entryForTask(relaxed, 560, 620)

    const candidates = generateConflictCandidates({
      date: SUGGESTION_DATE,
      group: {
        id: 'group',
        entryKeys: [urgentEntry.key, relaxedEntry.key, fixed.key],
        activityCount: 3,
        startMinutes: 550,
        endMinutes: 620,
        adjustableKeys: [],
      },
      entries: [urgentEntry, relaxedEntry, fixed],
      tasks: [urgent, relaxed],
      commitments: [],
      nowMinutes: 480,
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.target).toMatchObject({ taskId: 'relaxed' })
    const reason = candidates[0]?.reasons[0]
    expect(reason?.kind).toBe('conflict')
    if (reason?.kind === 'conflict') {
      expect(reason.conflictingTitles).toEqual(
        expect.arrayContaining(['Urgent', 'Relaxed', 'Team sync']),
      )
      expect(reason.fixedProtected).toBe(true)
    }
  })

  it('names the overlaps that remain between other group members', () => {
    const urgent = suggestionTask({
      id: 'urgent',
      title: 'Urgent',
      estimatedMinutes: 60,
      dueDate: '2026-11-17',
      priority: 'high',
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:10',
    })
    const relaxed = suggestionTask({
      id: 'relaxed',
      title: 'Relaxed',
      estimatedMinutes: 60,
      priority: 'low',
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:20',
    })
    const fixed = commitmentEntry({
      id: 'fixed',
      startMinutes: 540,
      endMinutes: 600,
    })
    const urgentEntry = entryForTask(urgent, 550, 610)
    const relaxedEntry = entryForTask(relaxed, 560, 620)

    const candidates = generateConflictCandidates({
      date: SUGGESTION_DATE,
      group: {
        id: 'group',
        entryKeys: [urgentEntry.key, relaxedEntry.key, fixed.key],
        activityCount: 3,
        startMinutes: 550,
        endMinutes: 620,
        adjustableKeys: [],
      },
      entries: [urgentEntry, relaxedEntry, fixed],
      tasks: [urgent, relaxed],
      commitments: [],
      nowMinutes: 480,
    })

    const reason = candidates[0]?.reasons[0]
    expect(reason?.kind).toBe('conflict')
    if (reason?.kind === 'conflict') {
      expect(reason.remainingOverlaps.length).toBeGreaterThan(0)
      expect(reason.remainingOverlaps[0]?.titles).toEqual(
        expect.arrayContaining(['Urgent', 'Team sync']),
      )
      expect(reason.remainingOverlaps[0]?.overlapStartMinutes).toBe(550)
      expect(reason.remainingOverlaps[0]?.overlapEndMinutes).toBe(600)
    }
  })

  it('never proposes a past start or a span past the end of the day', () => {
    expect(
      findAlternativeStart({
        entries: [],
        excludedKey: 'none',
        durationMinutes: 60,
        nowMinutes: 1400,
        currentStartMinutes: 480,
      }),
    ).toBeNull()
  })

  it('produces no candidate for a fixed-only group or a duration-less task', () => {
    const fixedA = commitmentEntry({
      id: 'a',
      startMinutes: 540,
      endMinutes: 600,
    })
    const fixedB = commitmentEntry({
      id: 'b',
      startMinutes: 570,
      endMinutes: 630,
    })
    expect(
      generateConflictCandidates({
        date: SUGGESTION_DATE,
        group: {
          id: 'g',
          entryKeys: [fixedA.key, fixedB.key],
          activityCount: 2,
          startMinutes: 570,
          endMinutes: 600,
          adjustableKeys: [],
        },
        entries: [fixedA, fixedB],
        tasks: [],
        commitments: [],
        nowMinutes: 480,
      }),
    ).toEqual([])

    const task = suggestionTask({
      id: 'no-duration',
      plannedDate: SUGGESTION_DATE,
      plannedStartTime: '09:30',
    })
    const taskEntryValue = entryForTask(task, 570, 630)
    expect(
      generateConflictCandidates({
        date: SUGGESTION_DATE,
        group: {
          id: 'g',
          entryKeys: [taskEntryValue.key, fixedA.key],
          activityCount: 2,
          startMinutes: 570,
          endMinutes: 600,
          adjustableKeys: [],
        },
        entries: [taskEntryValue, fixedA],
        tasks: [task],
        commitments: [],
        nowMinutes: 480,
      }),
    ).toEqual([])
  })
})

describe('slot candidates', () => {
  it('schedules an unscheduled task at the earliest fitting period', () => {
    const task = suggestionTask({
      id: 'unscheduled',
      estimatedMinutes: 60,
      dueDate: SUGGESTION_DATE,
      priority: 'high',
    })
    const candidates = generateCandidates({
      date: SUGGESTION_DATE,
      entries: [],
      conflicts: [],
      unscheduledTasks: [task],
      availability: availablePeriods([
        { startMinutes: 480, endMinutes: 540 },
        { startMinutes: 600, endMinutes: 720 },
      ]),
      tasks: [task],
      commitments: [],
      weather: unavailableWeather(),
      nowMinutes: 480,
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.change).toMatchObject({
      kind: 'schedule-task',
      startMinutes: 480,
      endMinutes: 540,
    })
    expect(candidates[0]?.reasons.map((reason) => reason.kind)).toEqual([
      'fit',
      'due-date',
      'priority',
    ])
  })

  it('produces no slot candidates without presented periods', () => {
    const task = suggestionTask({ id: 'no-periods', estimatedMinutes: 30 })
    expect(
      generateCandidates({
        date: SUGGESTION_DATE,
        entries: [],
        conflicts: [],
        unscheduledTasks: [task],
        availability: availablePeriods([]),
        tasks: [task],
        commitments: [],
        weather: unavailableWeather(),
        nowMinutes: 480,
      }),
    ).toEqual([])
  })

  it('skips missing durations and tasks that fit no period', () => {
    const noDuration = suggestionTask({ id: 'no-duration', status: 'pending' })
    const tooLong = suggestionTask({ id: 'too-long', estimatedMinutes: 200 })
    const candidates = generateCandidates({
      date: SUGGESTION_DATE,
      entries: [],
      conflicts: [],
      unscheduledTasks: [noDuration, tooLong],
      availability: availablePeriods([{ startMinutes: 480, endMinutes: 540 }]),
      tasks: [noDuration, tooLong],
      commitments: [],
      weather: unavailableWeather(),
      nowMinutes: 480,
    })
    expect(candidates).toEqual([])
  })

  it('orders slot candidates by urgency and priority', () => {
    const overdue = suggestionTask({
      id: 'overdue',
      estimatedMinutes: 30,
      dueDate: '2026-11-17',
    })
    const todayLow = suggestionTask({
      id: 'today-low',
      estimatedMinutes: 30,
      dueDate: SUGGESTION_DATE,
      priority: 'low',
    })
    const noDateHigh = suggestionTask({
      id: 'no-date-high',
      estimatedMinutes: 30,
      priority: 'high',
    })

    const candidates = generateCandidates({
      date: SUGGESTION_DATE,
      entries: [],
      conflicts: [],
      unscheduledTasks: [noDateHigh, todayLow, overdue],
      availability: availablePeriods([
        { startMinutes: 480, endMinutes: 540 },
        { startMinutes: 600, endMinutes: 660 },
        { startMinutes: 720, endMinutes: 780 },
      ]),
      tasks: [noDateHigh, todayLow, overdue],
      commitments: [],
      weather: unavailableWeather(),
      nowMinutes: 480,
    })

    expect(
      candidates.map((candidate) =>
        candidate.target.kind === 'task'
          ? candidate.target.taskId
          : candidate.target.commitmentId,
      ),
    ).toEqual(['overdue', 'today-low', 'no-date-high'])
  })

  it('adds weather only when it decided the period', () => {
    const task = suggestionTask({ id: 'weather-task', estimatedMinutes: 60 })
    const candidates = generateCandidates({
      date: SUGGESTION_DATE,
      entries: [],
      conflicts: [],
      unscheduledTasks: [task],
      availability: availablePeriods([
        { startMinutes: 480, endMinutes: 540 },
        { startMinutes: 600, endMinutes: 660 },
      ]),
      tasks: [task],
      commitments: [],
      weather: availableWeather([
        weatherHour({
          startMinutes: 480,
          endMinutes: 540,
          condition: 'rain',
          precipitationProbability: 90,
        }),
        weatherHour({
          startMinutes: 600,
          endMinutes: 660,
          condition: 'clear',
          precipitationProbability: 5,
        }),
      ]),
      nowMinutes: 480,
    })

    expect(candidates[0]?.change.startMinutes).toBe(600)
    expect(candidates[0]?.weather?.chosenCondition).toBe('clear')
    expect(candidates[0]?.reasons.map((reason) => reason.kind)).toContain(
      'weather',
    )
  })
})

describe('flexible adjustment', () => {
  it('moves a flexible commitment to make room without scheduling the task', () => {
    const task = suggestionTask({
      id: 'beneficiary',
      estimatedMinutes: 180,
      dueDate: SUGGESTION_DATE,
    })
    const flexible = suggestionCommitment({
      id: 'flex',
      type: 'flexible',
      startTime: '09:00',
      endTime: '10:00',
    })
    const fixed = suggestionCommitment({
      id: 'fixed-block',
      startTime: '12:00',
      endTime: '18:00',
    })
    const flexibleEntry = commitmentEntry({
      id: flexible.id,
      type: 'flexible',
      startMinutes: 540,
      endMinutes: 600,
    })
    const fixedEntry = commitmentEntry({
      id: fixed.id,
      startMinutes: 720,
      endMinutes: 1080,
    })

    const candidates = generateCandidates({
      date: SUGGESTION_DATE,
      entries: [flexibleEntry, fixedEntry],
      conflicts: [],
      unscheduledTasks: [task],
      availability: availablePeriods([
        { startMinutes: 480, endMinutes: 540 },
        { startMinutes: 600, endMinutes: 720 },
      ]),
      tasks: [task],
      commitments: [flexible, fixed],
      weather: unavailableWeather(),
      nowMinutes: 480,
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.category).toBe('flexible-adjustment')
    expect(candidates[0]?.change).toMatchObject({
      kind: 'move-commitment',
      startMinutes: 480,
      endMinutes: 540,
    })
    expect(candidates[0]?.reasons[0]?.kind).toBe('beneficiary')
  })

  it('produces nothing when the task already fits, no flexible commitment exists, or the beneficiary is targeted', () => {
    const task = suggestionTask({ id: 'beneficiary', estimatedMinutes: 60 })
    const flexible = suggestionCommitment({
      id: 'flex',
      type: 'flexible',
      startTime: '09:00',
      endTime: '10:00',
    })
    const flexibleEntry = commitmentEntry({
      id: flexible.id,
      type: 'flexible',
      startMinutes: 540,
      endMinutes: 600,
    })
    const base = {
      date: SUGGESTION_DATE,
      entries: [flexibleEntry],
      unscheduledTasks: [task],
      tasks: [task],
      commitments: [flexible],
      nowMinutes: 480,
    }

    expect(
      generateFlexibleAdjustmentCandidates({
        ...base,
        periods: [{ startMinutes: 480, endMinutes: 600 }],
        occupiedActivityKeys: new Set(),
      }),
    ).toEqual([])

    expect(
      generateFlexibleAdjustmentCandidates({
        ...base,
        commitments: [],
        periods: [{ startMinutes: 480, endMinutes: 540 }],
        occupiedActivityKeys: new Set(),
      }),
    ).toEqual([])

    expect(
      generateFlexibleAdjustmentCandidates({
        ...base,
        periods: [{ startMinutes: 480, endMinutes: 540 }],
        occupiedActivityKeys: new Set(['task:beneficiary']),
      }),
    ).toEqual([])
  })

  it('iterates beneficiaries in slot urgency order', () => {
    const low = suggestionTask({
      id: 'low',
      title: 'Low',
      estimatedMinutes: 180,
      dueDate: SUGGESTION_DATE,
      priority: 'low',
    })
    const high = suggestionTask({
      id: 'high',
      title: 'High',
      estimatedMinutes: 180,
      dueDate: SUGGESTION_DATE,
      priority: 'high',
    })
    const flexible = suggestionCommitment({
      id: 'flex',
      type: 'flexible',
      startTime: '09:00',
      endTime: '10:00',
    })
    const candidates = generateFlexibleAdjustmentCandidates({
      date: SUGGESTION_DATE,
      entries: [
        commitmentEntry({
          id: flexible.id,
          type: 'flexible',
          startMinutes: 540,
          endMinutes: 600,
        }),
        commitmentEntry({
          id: 'block',
          type: 'fixed',
          startMinutes: 720,
          endMinutes: 1080,
        }),
      ],
      unscheduledTasks: [low, high],
      tasks: [low, high],
      commitments: [flexible],
      periods: [
        { startMinutes: 480, endMinutes: 540 },
        { startMinutes: 600, endMinutes: 720 },
      ],
      nowMinutes: 480,
      occupiedActivityKeys: new Set(),
    })

    expect(
      candidates.map((candidate) => {
        const reason = candidate.reasons[0]
        return reason?.kind === 'beneficiary' ? reason.taskId : null
      }),
    ).toEqual(['high', 'low'])
  })

  it('orders future-due beneficiaries by earliest date', () => {
    const later = suggestionTask({
      id: 'later-due',
      estimatedMinutes: 180,
      dueDate: '2026-11-21',
      priority: 'medium',
    })
    const earlier = suggestionTask({
      id: 'earlier-due',
      estimatedMinutes: 180,
      dueDate: '2026-11-20',
      priority: 'medium',
    })
    const flexible = suggestionCommitment({
      id: 'flex-order',
      type: 'flexible',
      startTime: '09:00',
      endTime: '10:00',
    })
    const candidates = generateFlexibleAdjustmentCandidates({
      date: SUGGESTION_DATE,
      entries: [
        commitmentEntry({
          id: flexible.id,
          type: 'flexible',
          startMinutes: 540,
          endMinutes: 600,
        }),
        commitmentEntry({
          id: 'block',
          type: 'fixed',
          startMinutes: 720,
          endMinutes: 1080,
        }),
      ],
      unscheduledTasks: [later, earlier],
      tasks: [later, earlier],
      commitments: [flexible],
      periods: [
        { startMinutes: 480, endMinutes: 540 },
        { startMinutes: 600, endMinutes: 720 },
      ],
      nowMinutes: 480,
      occupiedActivityKeys: new Set(),
    })

    expect(
      candidates.map((candidate) => {
        const reason = candidate.reasons[0]
        return reason?.kind === 'beneficiary' ? reason.taskId : null
      }),
    ).toEqual(['earlier-due', 'later-due'])
  })

  it('produces no flexible suggestion when no alternative start exists', () => {
    const task = suggestionTask({ id: 'beneficiary', estimatedMinutes: 60 })
    const flexible = suggestionCommitment({
      id: 'flex',
      type: 'flexible',
      startTime: '10:00',
      endTime: '11:00',
    })
    expect(
      generateFlexibleAdjustmentCandidates({
        date: SUGGESTION_DATE,
        entries: [
          commitmentEntry({
            id: 'block-a',
            startMinutes: 480,
            endMinutes: 520,
          }),
          commitmentEntry({
            id: flexible.id,
            type: 'flexible',
            startMinutes: 520,
            endMinutes: 580,
          }),
          commitmentEntry({
            id: 'block-b',
            startMinutes: 580,
            endMinutes: 1440,
          }),
        ],
        unscheduledTasks: [task],
        tasks: [task],
        commitments: [flexible],
        periods: [{ startMinutes: 480, endMinutes: 520 }],
        nowMinutes: 480,
        occupiedActivityKeys: new Set(),
      }),
    ).toEqual([])
  })

  it('skips a flexible commitment on another date and one with no matching entry', () => {
    const task = suggestionTask({ id: 'beneficiary', estimatedMinutes: 180 })
    const otherDay = suggestionCommitment({
      id: 'other-day',
      type: 'flexible',
      date: '2026-11-19',
    })
    const context = {
      date: SUGGESTION_DATE,
      entries: [
        commitmentEntry({
          id: 'other-day',
          type: 'flexible',
          startMinutes: 540,
          endMinutes: 600,
        }),
      ],
      unscheduledTasks: [task],
      tasks: [task],
      commitments: [otherDay],
      periods: [{ startMinutes: 480, endMinutes: 540 }],
      nowMinutes: 480,
      occupiedActivityKeys: new Set<string>(),
    }

    expect(generateFlexibleAdjustmentCandidates(context)).toEqual([])

    expect(
      generateFlexibleAdjustmentCandidates({
        ...context,
        commitments: [suggestionCommitment({ id: 'flex', type: 'flexible' })],
      }),
    ).toEqual([])
  })

  it('skips a commitment already targeted by a higher-precedence suggestion', () => {
    const task = suggestionTask({ id: 'beneficiary', estimatedMinutes: 180 })
    const flexible = suggestionCommitment({
      id: 'flex',
      type: 'flexible',
      startTime: '09:00',
      endTime: '10:00',
    })
    const flexibleEntry = commitmentEntry({
      id: flexible.id,
      type: 'flexible',
      startMinutes: 540,
      endMinutes: 600,
    })

    const candidates = generateFlexibleAdjustmentCandidates({
      date: SUGGESTION_DATE,
      entries: [flexibleEntry],
      unscheduledTasks: [task],
      tasks: [task],
      commitments: [flexible],
      periods: [{ startMinutes: 480, endMinutes: 540 }],
      nowMinutes: 480,
      occupiedActivityKeys: new Set(['commitment:flex']),
    })

    expect(candidates).toEqual([])
  })
})

describe('selection and no-suggestion reasons', () => {
  const slotCandidate = (() => {
    const task = suggestionTask({
      id: 'candidate',
      estimatedMinutes: 60,
      dueDate: SUGGESTION_DATE,
    })
    return {
      id: 'slot:task:candidate:2026-11-18:480',
      category: 'slot' as const,
      target: { kind: 'task' as const, taskId: task.id, title: task.title },
      change: {
        kind: 'schedule-task' as const,
        taskId: task.id,
        plannedDate: SUGGESTION_DATE,
        startMinutes: 480,
        endMinutes: 540,
        durationMinutes: 60,
        current: null,
      },
      reasons: [],
      weather: null,
      rank: {
        categoryRank: 1 as const,
        dueRank: 1 as const,
        dueDate: SUGGESTION_DATE,
        priorityRank: 1 as const,
        proposedStartMinutes: 480,
        sourceOrder: 0,
        suggestionId: 'slot:task:candidate:2026-11-18:480',
      },
    }
  })()

  it('returns matching dismissals and all-dismissed', () => {
    const result = selectSuggestions({
      candidates: [slotCandidate],
      dismissals: [
        {
          suggestionId: slotCandidate.id,
          activityKey: 'task:candidate',
          changeSignature: changeSignatureFor(slotCandidate.change),
          dismissedAt: '2026-11-18T08:00:00.000Z',
        },
      ],
      hasPendingUnscheduledTasks: true,
      allUnscheduledDurationsMissing: false,
      hasConflicts: false,
      hasOnlyFixedConflicts: false,
    })

    expect(result.active).toHaveLength(0)
    expect(result.dismissed).toHaveLength(1)
    expect(result.noSuggestionReason).toBe('all-dismissed')
  })

  it('uses the documented reason precedence', () => {
    const base = {
      candidates: [] as (typeof slotCandidate)[],
      dismissals: [],
      hasPendingUnscheduledTasks: false,
      allUnscheduledDurationsMissing: false,
      hasConflicts: false,
      hasOnlyFixedConflicts: false,
    }

    expect(selectSuggestions(base).noSuggestionReason).toBe(
      'day-already-planned',
    )
    expect(
      selectSuggestions({
        ...base,
        hasPendingUnscheduledTasks: true,
        allUnscheduledDurationsMissing: true,
      }).noSuggestionReason,
    ).toBe('missing-durations')
    expect(
      selectSuggestions({
        ...base,
        hasPendingUnscheduledTasks: true,
      }).noSuggestionReason,
    ).toBe('no-free-period')
    expect(
      selectSuggestions({
        ...base,
        hasConflicts: true,
        hasOnlyFixedConflicts: true,
      }).noSuggestionReason,
    ).toBe('nothing-actionable')
  })

  it('limits active suggestions to three', () => {
    const candidates = Array.from({ length: 5 }, (_, index) => ({
      ...slotCandidate,
      id: `slot-${index}`,
      target: {
        kind: 'task' as const,
        taskId: `task-${index}`,
        title: `Task ${index}`,
      },
      rank: {
        ...slotCandidate.rank,
        sourceOrder: index,
        suggestionId: `slot-${index}`,
      },
    }))

    const result = selectSuggestions({
      candidates,
      dismissals: [],
      hasPendingUnscheduledTasks: true,
      allUnscheduledDurationsMissing: false,
      hasConflicts: false,
      hasOnlyFixedConflicts: false,
    })

    expect(result.active).toHaveLength(3)
  })
})

describe('generation performance and determinism', () => {
  it('handles 50 tasks and 20 commitments deterministically', () => {
    const tasks = Array.from({ length: 50 }, (_, index) =>
      suggestionTask({
        id: `task-${index}`,
        estimatedMinutes: 30,
        dueDate: index % 2 === 0 ? SUGGESTION_DATE : undefined,
      }),
    )
    const commitments = Array.from({ length: 20 }, (_, index) =>
      suggestionCommitment({
        id: `commitment-${index}`,
        startTime: `${String(10 + Math.floor(index / 2)).padStart(2, '0')}:00`,
        endTime: `${String(10 + Math.floor(index / 2)).padStart(2, '0')}:30`,
      }),
    )
    const input = {
      date: SUGGESTION_DATE,
      entries: [],
      conflicts: [],
      unscheduledTasks: tasks,
      availability: availablePeriods([{ startMinutes: 480, endMinutes: 1440 }]),
      tasks,
      commitments,
      weather: unavailableWeather(),
      nowMinutes: 480,
    }

    const start = performance.now()
    const first = generateCandidates(input)
    const elapsed = performance.now() - start
    const second = generateCandidates(input)

    const selection = selectSuggestions({
      candidates: first,
      dismissals: [],
      hasPendingUnscheduledTasks: true,
      allUnscheduledDurationsMissing: false,
      hasConflicts: false,
      hasOnlyFixedConflicts: false,
    })

    expect(elapsed).toBeLessThan(1000)
    expect(selection.active).toHaveLength(3)
    expect(first.map((item) => item.id)).toEqual(second.map((item) => item.id))
  })
})
