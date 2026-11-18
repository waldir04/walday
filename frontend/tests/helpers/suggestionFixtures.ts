import type { Commitment } from '@/entities/commitment'
import type { Conditions } from '@/entities/weather'
import type { Priority, Task, TaskStatus } from '@/entities/task'
import type {
  AgendaEntry,
  AvailabilityResult,
  AvailablePeriod,
  TimeConflict,
} from '@/features/agenda'
import type {
  DismissalEntry,
  SuggestionWeatherContext,
  SuggestionWeatherHour,
} from '@/features/suggestions'

export const SUGGESTION_DATE = '2026-11-18'
export const SUGGESTION_NOW_MINUTES = 480

let sequence = 0

function nextId(prefix: string): string {
  sequence += 1
  return `${prefix}-${sequence}`
}

export function resetSuggestionSequence(): void {
  sequence = 0
}

export function suggestionTask(overrides: Partial<Task> = {}): Task {
  return {
    id: nextId('task'),
    title: 'Write the report',
    status: 'pending' as TaskStatus,
    priority: 'medium' as Priority,
    createdAt: '2026-11-18T08:00:00.000Z',
    ...overrides,
  }
}

export function suggestionCommitment(
  overrides: Partial<Commitment> = {},
): Commitment {
  return {
    id: nextId('commitment'),
    title: 'Team sync',
    date: SUGGESTION_DATE,
    startTime: '09:00',
    endTime: '10:00',
    type: 'fixed',
    createdAt: '2026-11-18T08:00:00.000Z',
    ...overrides,
  }
}

export function taskEntry(
  overrides: Partial<Task> & { key?: string } = {},
): AgendaEntry {
  const task = suggestionTask(overrides)
  return {
    key: overrides.key ?? `task:${task.id}`,
    sourceId: task.id,
    category: 'task',
    title: task.title,
    startMinutes: 540,
    endMinutes: 600,
    status: task.status,
    priority: task.priority,
    conflicts: [],
    exceedsDayEnd: false,
  }
}

export function commitmentEntry(
  input: {
    id?: string
    title?: string
    type?: 'fixed' | 'flexible'
    startMinutes?: number
    endMinutes?: number
  } = {},
): AgendaEntry {
  const id = input.id ?? nextId('commitment')
  const type = input.type ?? 'fixed'
  return {
    key: `${type}-commitment:${id}`,
    sourceId: id,
    category: type === 'fixed' ? 'fixed-commitment' : 'flexible-commitment',
    title: input.title ?? 'Team sync',
    startMinutes: input.startMinutes ?? 540,
    endMinutes: input.endMinutes ?? 600,
    conflicts: [],
    exceedsDayEnd: false,
  } as AgendaEntry
}

export function timeConflict(input: {
  entryKeys: string[]
  startMinutes?: number
  endMinutes?: number
  id?: string
  adjustableKeys?: string[]
}): TimeConflict {
  const keys = [...input.entryKeys].sort((a, b) => a.localeCompare(b))
  return {
    id: input.id ?? keys[0] ?? 'conflict',
    entryKeys: input.entryKeys,
    activityCount: input.entryKeys.length,
    startMinutes: input.startMinutes ?? 540,
    endMinutes: input.endMinutes ?? 600,
    adjustableKeys: input.adjustableKeys ?? [],
  }
}

export function availablePeriods(
  periods: AvailablePeriod[],
): AvailabilityResult {
  return {
    kind: 'available',
    periods,
    totalMinutes: periods.reduce(
      (total, period) => total + period.endMinutes - period.startMinutes,
      0,
    ),
  }
}

export function noAvailability(
  reason: 'past-date' | 'incomplete-sources' = 'past-date',
): AvailabilityResult {
  return { kind: 'none', reason }
}

export function weatherHour(
  overrides: Partial<SuggestionWeatherHour> = {},
): SuggestionWeatherHour {
  return {
    startMinutes: 480,
    endMinutes: 540,
    condition: 'clear' as Conditions,
    precipitationProbability: 10,
    ...overrides,
  }
}

export function availableWeather(
  hours: SuggestionWeatherHour[] = [weatherHour()],
): SuggestionWeatherContext {
  return { status: 'available', hours }
}

export function unavailableWeather(): SuggestionWeatherContext {
  return { status: 'unavailable' }
}

export function dismissalEntry(
  overrides: Partial<DismissalEntry> = {},
): DismissalEntry {
  return {
    suggestionId: nextId('suggestion'),
    activityKey: `task:${nextId('task')}`,
    changeSignature: 'schedule-task:task-1:2026-11-18:480-540',
    dismissedAt: '2026-11-18T08:00:00.000Z',
    ...overrides,
  }
}
