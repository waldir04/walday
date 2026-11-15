import { z } from 'zod'
import {
  getLocalToday,
  isLocalDate as isTaskLocalDate,
  parseDurationInput,
  type LocalDate as TaskLocalDate,
  type Task,
} from '@/entities/task'
import {
  isLocalTime,
  parseLocalTime,
  type LocalDate,
  type LocalTime,
} from '@/shared/lib/localDateTime'
import { DAY_END_MINUTES } from '@/shared/config/agenda'
import { minutesFromTime } from './timeOfDay'
import type { AgendaDay, ConflictLink } from './types'

export interface ScheduleDraft {
  taskId: string
  date: string
  startTime: string
  durationInput: string
  acknowledgedConflicts: boolean
}

export const scheduleDraftSchema: z.ZodType<ScheduleDraft> = z
  .object({
    taskId: z.string(),
    date: z.string(),
    startTime: z.string(),
    durationInput: z.string(),
    acknowledgedConflicts: z.boolean(),
  })
  .strict()

export type ScheduleField =
  'taskId' | 'date' | 'startTime' | 'durationInput' | 'acknowledgedConflicts'

export type ScheduleErrorCode =
  | 'START_TIME_REQUIRED'
  | 'START_TIME_INVALID'
  | 'DURATION_REQUIRED'
  | 'DURATION_INVALID'
  | 'DURATION_OUT_OF_RANGE'
  | 'END_NOT_AFTER_START'
  | 'ENDS_AFTER_MIDNIGHT'
  | 'TASK_NOT_FOUND'
  | 'TASK_NOT_PENDING'
  | 'CONFLICTS_NOT_ACKNOWLEDGED'

export interface ScheduleFieldError {
  field: ScheduleField
  code: ScheduleErrorCode
}

export interface ScheduleSlot {
  plannedDate: TaskLocalDate
  plannedStartTime: LocalTime
  estimatedMinutes: number
}

export type ScheduleValidationResult =
  | { ok: true; slot: ScheduleSlot; conflicts: ConflictLink[] }
  | { ok: false; errors: ScheduleFieldError[] }

const DURATION_MINUTES_MIN = 1
const DURATION_MINUTES_MAX = 1440

function durationFromInput(
  value: string,
):
  { minutes: number } | { code: 'DURATION_INVALID' | 'DURATION_OUT_OF_RANGE' } {
  const trimmed = value.trim()
  if (trimmed.length === 0) return { code: 'DURATION_INVALID' }

  const parsed = parseDurationInput(trimmed)
  if (!parsed.ok) {
    return {
      code:
        parsed.code === 'DURATION_OUT_OF_RANGE'
          ? 'DURATION_OUT_OF_RANGE'
          : 'DURATION_INVALID',
    }
  }

  if (
    parsed.minutes < DURATION_MINUTES_MIN ||
    parsed.minutes > DURATION_MINUTES_MAX
  ) {
    return { code: 'DURATION_OUT_OF_RANGE' }
  }

  return { minutes: parsed.minutes }
}

/** Conflicts between a proposed span and every other entry on the day. */
export function scheduleConflicts(
  entries: AgendaDay['entries'],
  taskId: string,
  startTime: string,
  durationMinutes: number,
): ConflictLink[] {
  const parsed = parseLocalTime(startTime)
  if (!parsed) return []

  const startMinutes = parsed.hours * 60 + parsed.minutes
  const endMinutes = startMinutes + durationMinutes
  if (endMinutes <= startMinutes) return []

  const ownKey = `task:${taskId}`
  const conflicts: ConflictLink[] = []

  for (const entry of entries) {
    if (entry.key === ownKey) continue
    if (startMinutes < entry.endMinutes && entry.startMinutes < endMinutes) {
      conflicts.push({
        entryKey: entry.key,
        title: entry.title,
        category: entry.category,
        overlapStartMinutes: Math.max(startMinutes, entry.startMinutes),
        overlapEndMinutes: Math.min(endMinutes, entry.endMinutes),
      })
    }
  }

  return conflicts
}

export function validateScheduleDraft(
  draft: ScheduleDraft,
  context: { tasks: readonly Task[]; day: AgendaDay; date: LocalDate },
): ScheduleValidationResult {
  const errors: ScheduleFieldError[] = []

  const task = context.tasks.find((candidate) => candidate.id === draft.taskId)
  if (!task) {
    return { ok: false, errors: [{ field: 'taskId', code: 'TASK_NOT_FOUND' }] }
  }
  if (task.status !== 'pending') {
    return {
      ok: false,
      errors: [{ field: 'taskId', code: 'TASK_NOT_PENDING' }],
    }
  }

  const startValue = draft.startTime.trim()
  let startMinutes = 0
  if (startValue.length === 0) {
    errors.push({ field: 'startTime', code: 'START_TIME_REQUIRED' })
  } else if (!isLocalTime(startValue)) {
    errors.push({ field: 'startTime', code: 'START_TIME_INVALID' })
  } else {
    startMinutes = minutesFromTime(startValue)
  }

  let duration: number | null = null
  if (task.estimatedMinutes !== undefined) {
    duration = task.estimatedMinutes
  } else {
    const input = draft.durationInput.trim()
    if (input.length === 0) {
      errors.push({ field: 'durationInput', code: 'DURATION_REQUIRED' })
    } else {
      const parsed = durationFromInput(input)
      if ('code' in parsed) {
        errors.push({ field: 'durationInput', code: parsed.code })
      } else {
        duration = parsed.minutes
      }
    }
  }

  if (errors.length > 0 || duration === null) {
    return { ok: false, errors }
  }

  const endMinutes = startMinutes + duration
  if (endMinutes <= startMinutes) {
    return {
      ok: false,
      errors: [{ field: 'durationInput', code: 'END_NOT_AFTER_START' }],
    }
  }
  if (endMinutes > DAY_END_MINUTES) {
    return {
      ok: false,
      errors: [{ field: 'durationInput', code: 'ENDS_AFTER_MIDNIGHT' }],
    }
  }

  const conflicts = scheduleConflicts(
    context.day.entries,
    draft.taskId,
    startValue,
    duration,
  )

  if (conflicts.length > 0 && !draft.acknowledgedConflicts) {
    return {
      ok: false,
      errors: [
        {
          field: 'acknowledgedConflicts',
          code: 'CONFLICTS_NOT_ACKNOWLEDGED',
        },
      ],
    }
  }

  return {
    ok: true,
    slot: {
      plannedDate: isTaskLocalDate(draft.date)
        ? draft.date
        : isTaskLocalDate(context.date)
          ? context.date
          : getLocalToday(),
      plannedStartTime: startValue,
      estimatedMinutes: duration,
    },
    conflicts,
  }
}
