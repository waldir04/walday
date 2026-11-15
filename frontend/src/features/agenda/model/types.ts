import type { Priority, Task, TaskStatus } from '@/entities/task'
import type { Commitment } from '@/entities/commitment'
import type { LocalDate } from '@/shared/lib/localDateTime'

export type AgendaCategory = 'fixed-commitment' | 'flexible-commitment' | 'task'

export interface ConflictLink {
  entryKey: string
  title: string
  category: AgendaCategory
  overlapStartMinutes: number
  overlapEndMinutes: number
}

interface AgendaEntryBase {
  key: string
  sourceId: string
  title: string
  /** 0..1439 */
  startMinutes: number
  /** 1..1440; 1440 means the end of the day. */
  endMinutes: number
  conflicts: ConflictLink[]
  exceedsDayEnd: boolean
}

export type AgendaEntry =
  | (AgendaEntryBase & {
      category: 'fixed-commitment' | 'flexible-commitment'
    })
  | (AgendaEntryBase & {
      category: 'task'
      status: TaskStatus
      priority: Priority
    })

export interface TimeConflict {
  id: string
  entryKeys: string[]
  activityCount: number
  startMinutes: number
  endMinutes: number
  /** Flexible commitment members, for the adjustable text label. */
  adjustableKeys: string[]
}

export interface AvailablePeriod {
  startMinutes: number
  endMinutes: number
}

export type AvailabilityResult =
  | { kind: 'available'; periods: AvailablePeriod[]; totalMinutes: number }
  | { kind: 'none'; reason: 'past-date' | 'incomplete-sources' }

export interface AgendaDay {
  date: LocalDate
  entries: AgendaEntry[]
  unscheduledTasks: Task[]
  conflicts: TimeConflict[] | null
  availability: AvailabilityResult
  timelineEmpty: boolean
  hasAnyActivity: boolean
}

export type AgendaSourcesState = 'complete' | 'incomplete'

export interface BuildAgendaDayInput {
  date: LocalDate
  tasks: readonly Task[]
  commitments: readonly Commitment[]
  now: Date
  locale: string
  sources: AgendaSourcesState
}

export interface AgendaSchedulingState {
  enabled: boolean
  reasonKey: string | null
}
