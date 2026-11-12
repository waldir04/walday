import { describe, expect, it } from 'vitest'
import {
  compareTasks,
  countGraphemes,
  formatDueDate,
  formatDuration,
  getLocalToday,
  groupTasks,
  isLocalDate,
  isPastDue,
  orderedTasks,
  parseDurationInput,
  validateTaskDraft,
  type Task,
  type TaskDraft,
} from '@/entities/task'
import { makeTask } from './helpers/taskFixtures'

function draft(overrides: Partial<TaskDraft> = {}): TaskDraft {
  return {
    title: 'Valid title',
    description: '',
    priority: 'medium',
    dueDate: '',
    estimatedDurationInput: '',
    ...overrides,
  }
}

describe('grapheme counting', () => {
  it('counts user-perceived characters, not code units', () => {
    expect(countGraphemes('abc')).toBe(3)
    expect(countGraphemes('👍🏽')).toBe(1)
    expect(countGraphemes('e\u0301')).toBe(1)
    expect(countGraphemes('👨‍👩‍👧‍👦')).toBe(1)
    expect(countGraphemes('a👍🏽')).toBe(2)
  })
})

describe('task draft validation', () => {
  it('requires a non-empty title', () => {
    expect(validateTaskDraft(draft({ title: '   ' }))).toContainEqual({
      field: 'title',
      code: 'TITLE_REQUIRED',
    })
  })

  it('enforces the title grapheme boundaries', () => {
    expect(validateTaskDraft(draft({ title: 'ab' }))).toContainEqual({
      field: 'title',
      code: 'TITLE_TOO_SHORT',
    })
    expect(validateTaskDraft(draft({ title: 'abc' }))).toEqual([])
    expect(validateTaskDraft(draft({ title: 'a'.repeat(200) }))).toEqual([])
    expect(validateTaskDraft(draft({ title: 'a'.repeat(201) }))).toContainEqual(
      { field: 'title', code: 'TITLE_TOO_LONG' },
    )
  })

  it('counts emoji and combined characters as single graphemes', () => {
    expect(validateTaskDraft(draft({ title: '👍🏽👍🏽' }))).toContainEqual({
      field: 'title',
      code: 'TITLE_TOO_SHORT',
    })
    expect(validateTaskDraft(draft({ title: '👍🏽👍🏽👍🏽' }))).toEqual([])
    expect(
      validateTaskDraft(draft({ title: 'e\u0301e\u0301e\u0301' })),
    ).toEqual([])
  })

  it('trims before checking title and description lengths', () => {
    expect(validateTaskDraft(draft({ title: '  abc  ' }))).toEqual([])
    expect(
      validateTaskDraft(draft({ description: `  ${'a'.repeat(2000)}  ` })),
    ).toEqual([])
    expect(
      validateTaskDraft(draft({ description: `  ${'a'.repeat(2001)}  ` })),
    ).toContainEqual({ field: 'description', code: 'DESCRIPTION_TOO_LONG' })
  })

  it('validates priority, due date, and duration and reports every error', () => {
    // Invalid literal values are intentionally constructed at this test boundary.
    const invalidPriority = {
      ...draft(),
      priority: 'urgent' as TaskDraft['priority'],
    }
    const errors = validateTaskDraft(
      draft({
        ...invalidPriority,
        title: 'ab',
        dueDate: '2026-02-30',
        estimatedDurationInput: '30',
      }),
    )
    expect(errors).toContainEqual({
      field: 'priority',
      code: 'PRIORITY_INVALID',
    })
    expect(errors).toContainEqual({
      field: 'dueDate',
      code: 'DUE_DATE_INVALID',
    })
    expect(errors).toContainEqual({
      field: 'estimatedMinutes',
      code: 'DURATION_INVALID',
    })
    expect(errors.length).toBe(4)
  })

  it('accepts real calendar dates and rejects nonexistent dates', () => {
    expect(validateTaskDraft(draft({ dueDate: '2024-02-29' }))).toEqual([])
    expect(validateTaskDraft(draft({ dueDate: '2023-02-29' }))).toContainEqual({
      field: 'dueDate',
      code: 'DUE_DATE_INVALID',
    })
  })
})

describe('duration parsing', () => {
  it.each([
    ['30 min', 30],
    ['30m', 30],
    ['1h', 60],
    ['1HR', 60],
    ['1 h 30 min', 90],
    ['90 min', 90],
    ['2 hours 15 minutes', 135],
    ['24h', 1440],
  ])('parses %s to %i minutes', (input, minutes) => {
    expect(parseDurationInput(input)).toEqual({ ok: true, minutes })
  })

  it.each([
    ['30', 'DURATION_INVALID'],
    ['soon', 'DURATION_INVALID'],
    ['1h 30', 'DURATION_INVALID'],
    ['', 'DURATION_INVALID'],
    ['1.5h', 'DURATION_FRACTIONAL'],
    ['0 min', 'DURATION_OUT_OF_RANGE'],
    ['-5 min', 'DURATION_OUT_OF_RANGE'],
    ['25h', 'DURATION_OUT_OF_RANGE'],
  ])('rejects %s with %s', (input, code) => {
    expect(parseDurationInput(input)).toEqual({ ok: false, code })
  })
})

describe('localized duration formatting', () => {
  it('formats canonical minutes with locale-aware units', () => {
    expect(formatDuration(90, 'en')).toContain('1 hour')
    expect(formatDuration(90, 'en')).toContain('30 minutes')
    expect(formatDuration(90, 'es')).toContain('hora')
    expect(formatDuration(90, 'es')).toContain('30')
    expect(formatDuration(30, 'en')).toContain('30 minutes')
    expect(formatDuration(1440, 'en')).toContain('24 hours')
  })
})

describe('date-only due dates', () => {
  it('validates real calendar dates only', () => {
    expect(isLocalDate('2026-11-20')).toBe(true)
    expect(isLocalDate('2024-02-29')).toBe(true)
    expect(isLocalDate('2023-02-29')).toBe(false)
    expect(isLocalDate('2026-13-01')).toBe(false)
    expect(isLocalDate('2026-04-31')).toBe(false)
    expect(isLocalDate('2026-1-01')).toBe(false)
    expect(isLocalDate('2026-11-12T00:00:00Z')).toBe(false)
  })

  it('derives today from local date parts', () => {
    expect(getLocalToday(new Date(2026, 10, 5, 23, 30))).toBe('2026-11-05')
    expect(getLocalToday(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01')
  })

  it('marks only pending tasks with a due date before today as past due', () => {
    const base = makeTask({ dueDate: '2026-11-11' })
    expect(isPastDue(base, '2026-11-12')).toBe(true)
    expect(isPastDue(base, '2026-11-11')).toBe(false)
    expect(isPastDue({ ...base, status: 'completed' }, '2026-11-12')).toBe(
      false,
    )
    expect(isPastDue(makeTask(), '2026-11-12')).toBe(false)
  })

  it('formats the stored date without shifting the calendar day', () => {
    const expected = new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
    }).format(new Date(2026, 10, 20, 12))
    expect(formatDueDate('2026-11-20', 'en', 'locale-medium')).toBe(expected)
  })
})

describe('deterministic ordering', () => {
  it('orders pending before completed, newest first, then by id', () => {
    const pendingOld = makeTask({
      id: 'b',
      status: 'pending',
      createdAt: '2026-11-10T10:00:00.000Z',
    })
    const pendingNew = makeTask({
      id: 'c',
      status: 'pending',
      createdAt: '2026-11-12T10:00:00.000Z',
    })
    const completedNew = makeTask({
      id: 'a',
      status: 'completed',
      createdAt: '2026-11-13T10:00:00.000Z',
    })
    const tieOne = makeTask({
      id: 'a',
      status: 'pending',
      createdAt: '2026-11-11T10:00:00.000Z',
    })
    const tieTwo = makeTask({
      id: 'b',
      status: 'pending',
      createdAt: '2026-11-11T10:00:00.000Z',
    })

    expect(
      [completedNew, pendingOld, pendingNew]
        .sort(compareTasks)
        .map((t) => t.id),
    ).toEqual(['c', 'b', 'a'])
    expect([tieTwo, tieOne].sort(compareTasks).map((t) => t.id)).toEqual([
      'a',
      'b',
    ])
  })

  it('groups without mutating the input and combines pending then completed', () => {
    const input: Task[] = [
      makeTask({ id: 'done', status: 'completed' }),
      makeTask({ id: 'open', status: 'pending' }),
    ]
    const snapshot = input.map((task) => task.id)
    const groups = groupTasks(input)
    expect(groups.pending.map((task) => task.id)).toEqual(['open'])
    expect(groups.completed.map((task) => task.id)).toEqual(['done'])
    expect(input.map((task) => task.id)).toEqual(snapshot)
    expect(orderedTasks(input).map((task) => task.id)).toEqual(['open', 'done'])
  })
})

describe('task defaults and priority values', () => {
  it('defines the documented defaults and literal unions', async () => {
    const entity = await import('@/entities/task')
    expect(entity.DEFAULT_PRIORITY).toBe('medium')
    expect(entity.DEFAULT_STATUS).toBe('pending')
    expect([...entity.TASK_PRIORITIES]).toEqual(['low', 'medium', 'high'])
    expect([...entity.TASK_STATUSES]).toEqual(['pending', 'completed'])
  })
})

import { vi } from 'vitest'
import {
  guestTaskStoreSchema,
  isLocalDate as isLocalDateFn,
  taskDraftSchema,
  taskSchema,
  validateStoredTask,
  type LocalDate,
} from '@/entities/task'

describe('stored record validation', () => {
  it('returns a trimmed domain object for a valid record', () => {
    const result = validateStoredTask({
      id: 'valid-id',
      title: '  Valid stored title  ',
      description: '  Description  ',
      status: 'pending',
      priority: 'high',
      dueDate: '2026-12-01',
      estimatedMinutes: 90,
      createdAt: '2026-11-12T14:30:00.000Z',
    })
    expect(result).toEqual({
      ok: true,
      value: {
        id: 'valid-id',
        title: 'Valid stored title',
        description: 'Description',
        status: 'pending',
        priority: 'high',
        dueDate: '2026-12-01',
        estimatedMinutes: 90,
        createdAt: '2026-11-12T14:30:00.000Z',
      },
    })
  })

  it.each([
    [null, 'TASK_ID_INVALID'],
    [{}, 'TASK_ID_INVALID'],
    [{ id: '   ' }, 'TASK_ID_INVALID'],
    [{ id: 'a', createdAt: 'nope' }, 'TASK_CREATED_AT_INVALID'],
    [
      { id: 'a', createdAt: '2026-11-12T14:30:00.000Z', status: 'done' },
      'TASK_STATUS_INVALID',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'urgent',
      },
      'PRIORITY_INVALID',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
      },
      'TITLE_REQUIRED',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'ab',
      },
      'TITLE_TOO_SHORT',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'a'.repeat(201),
      },
      'TITLE_TOO_LONG',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        description: 5,
      },
      'DESCRIPTION_TOO_LONG',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        description: 'd'.repeat(2001),
      },
      'DESCRIPTION_TOO_LONG',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        dueDate: 5,
      },
      'DUE_DATE_INVALID',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        dueDate: '2026-02-30',
      },
      'DUE_DATE_INVALID',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        estimatedMinutes: '90',
      },
      'DURATION_INVALID',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        estimatedMinutes: 1.5,
      },
      'DURATION_FRACTIONAL',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        estimatedMinutes: 0,
      },
      'DURATION_OUT_OF_RANGE',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        estimatedMinutes: 1441,
      },
      'DURATION_OUT_OF_RANGE',
    ],
    [
      {
        id: 'a',
        createdAt: '2026-11-12T14:30:00.000Z',
        status: 'pending',
        priority: 'low',
        title: 'Valid title',
        unexpected: true,
      },
      'TASK_UNKNOWN_FIELD',
    ],
  ])('rejects %j with %s', (input, code) => {
    expect(validateStoredTask(input)).toEqual({ ok: false, code })
  })

  it('normalizes blank optional values to absent', () => {
    const result = validateStoredTask({
      id: 'valid',
      title: 'Valid title',
      description: '   ',
      status: 'completed',
      priority: 'low',
      dueDate: '   ',
      createdAt: '2026-11-12T14:30:00.000Z',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.description).toBeUndefined()
    expect(result.value.dueDate).toBeUndefined()
  })
})

describe('zod schemas', () => {
  it('parses valid domain records and rejects unknown keys', () => {
    expect(taskSchema.safeParse(makeTask()).success).toBe(true)
    expect(taskSchema.safeParse({ ...makeTask(), extra: true }).success).toBe(
      false,
    )
  })

  it('parses draft payloads strictly', () => {
    const draftValue = {
      title: 'Title',
      description: '',
      priority: 'medium',
      dueDate: '',
      estimatedDurationInput: '',
    }
    expect(taskDraftSchema.safeParse(draftValue).success).toBe(true)
    expect(
      taskDraftSchema.safeParse({ ...draftValue, extra: true }).success,
    ).toBe(false)
  })

  it('validates the guest store envelope', () => {
    const envelope = {
      version: 1,
      revision: 'revision',
      updatedAt: '2026-11-12T14:30:00.000Z',
      tasks: [],
    }
    expect(guestTaskStoreSchema.safeParse(envelope).success).toBe(true)
    expect(
      guestTaskStoreSchema.safeParse({ ...envelope, version: 2 }).success,
    ).toBe(false)
    expect(
      guestTaskStoreSchema.safeParse({ ...envelope, extra: true }).success,
    ).toBe(false)
  })
})

describe('formatting edge cases', () => {
  it('formats zero and negative durations safely', () => {
    expect(formatDuration(0, 'en')).toContain('0 minutes')
    expect(formatDuration(-5, 'en')).toContain('0 minutes')
  })

  it('falls back to plain units when Intl formatting fails', () => {
    const spy = vi.spyOn(Intl, 'NumberFormat').mockImplementation(() => {
      throw new Error('no Intl')
    })
    expect(formatDuration(90, 'en')).toBe('1 h 30 min')
    spy.mockRestore()
  })

  it('rejects impossible date parts and year zero', () => {
    expect(isLocalDateFn('0000-01-01')).toBe(false)
    expect(isLocalDateFn('2026-00-10')).toBe(false)
    expect(isLocalDateFn('2026-11-32')).toBe(false)
    expect(isLocalDateFn('2026-02-30')).toBe(false)
  })

  it('returns the raw value when formatting an invalid date', () => {
    expect(
      formatDueDate('not-a-date' as LocalDate, 'en', 'locale-medium'),
    ).toBe('not-a-date')
  })

  it('derives today from the current local date by default', () => {
    expect(getLocalToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
