import { sortTasks, type Task } from '@/entities/task'
import type { LocalDate } from '@/shared/lib/localDateTime'
import { AGENDA_ENTRY_KEY_SEPARATOR } from './constants'
import { clampDayEnd, minutesFromTime } from './timeOfDay'
import type { AgendaEntry } from './types'

export function isScheduled(task: Task): boolean {
  return task.plannedDate !== undefined
}

export function isUnscheduledPending(task: Task): boolean {
  return task.status === 'pending' && task.plannedDate === undefined
}

export function buildTaskEntry(task: Task): AgendaEntry {
  const startMinutes = task.plannedStartTime
    ? minutesFromTime(task.plannedStartTime)
    : 0
  const { endMinutes, exceedsDayEnd } = clampDayEnd(
    startMinutes,
    task.estimatedMinutes ?? 1,
  )

  return {
    key: `task${AGENDA_ENTRY_KEY_SEPARATOR}${task.id}`,
    sourceId: task.id,
    category: 'task',
    title: task.title,
    startMinutes,
    endMinutes,
    status: task.status,
    priority: task.priority,
    conflicts: [],
    exceedsDayEnd,
  }
}

export function selectScheduledTasks(
  tasks: readonly Task[],
  date: LocalDate,
): Task[] {
  return tasks.filter((task) => task.plannedDate === date)
}

export function selectUnscheduledTasks(tasks: readonly Task[]): Task[] {
  return sortTasks(tasks.filter(isUnscheduledPending))
}
