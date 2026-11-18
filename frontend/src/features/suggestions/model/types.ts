import type { Commitment } from '@/entities/commitment'
import type { Priority, Task } from '@/entities/task'
import type { Conditions } from '@/entities/weather'
import type { WeatherUnit } from '@/entities/preferences'
import type {
  AgendaDay,
  AvailablePeriod,
  TimeConflict,
} from '@/features/agenda'
import type { LocalDate } from '@/shared/lib/localDateTime'

export type SuggestionCategory = 'conflict' | 'slot' | 'flexible-adjustment'

export type SuggestionTarget =
  | { kind: 'task'; taskId: string; title: string }
  | { kind: 'commitment'; commitmentId: string; title: string }

export interface SuggestionRank {
  categoryRank: 0 | 1 | 2 | 3
  dueRank: 0 | 1 | 2 | 3 | 4
  dueDate: string | null
  priorityRank: 0 | 1 | 2
  proposedStartMinutes: number
  sourceOrder: number
  suggestionId: string
}

export type ProposedChange =
  | {
      kind: 'schedule-task'
      taskId: string
      plannedDate: LocalDate
      startMinutes: number
      endMinutes: number
      durationMinutes: number
      current: null
    }
  | {
      kind: 'move-task'
      taskId: string
      plannedDate: LocalDate
      fromStartMinutes: number
      fromEndMinutes: number
      startMinutes: number
      endMinutes: number
      durationMinutes: number
      current: { startMinutes: number; endMinutes: number }
    }
  | {
      kind: 'move-commitment'
      commitmentId: string
      date: LocalDate
      fromStartMinutes: number
      fromEndMinutes: number
      startMinutes: number
      endMinutes: number
      durationMinutes: number
      current: { startMinutes: number; endMinutes: number }
    }

export interface SuggestionWeatherHour {
  /** Device-local minute of day, 0..1439. */
  startMinutes: number
  /** Device-local end minute, 1..1440. */
  endMinutes: number
  condition: Conditions
  precipitationProbability: number | null
}

export type SuggestionWeatherContext =
  | { status: 'available'; hours: readonly SuggestionWeatherHour[] }
  | { status: 'unavailable' }

export interface WeatherEvidence {
  basis: 'precipitation' | 'condition-severity' | 'severe-condition'
  chosenStartMinutes: number
  chosenEndMinutes: number
  chosenCondition: Conditions
  chosenPrecipitationProbability: number | null
  comparedCondition: Conditions | null
  comparedPrecipitationProbability: number | null
}

export type SuggestionReason =
  | {
      kind: 'conflict'
      conflictingTitles: readonly string[]
      overlapStartMinutes: number
      overlapEndMinutes: number
      fixedProtected: boolean
      remainingOverlaps: readonly {
        titles: readonly [string, string]
        overlapStartMinutes: number
        overlapEndMinutes: number
      }[]
    }
  | {
      kind: 'due-date'
      urgency: 'overdue' | 'due-today' | 'future'
      dueDate: LocalDate
    }
  | { kind: 'priority'; priority: Priority }
  | {
      kind: 'fit'
      periodStartMinutes: number
      periodEndMinutes: number
      durationMinutes: number
    }
  | { kind: 'beneficiary'; taskId: string; taskTitle: string }
  | {
      kind: 'weather'
      condition: Conditions
      precipitationProbability: number | null
      spanStartMinutes: number
      spanEndMinutes: number
    }
  | { kind: 'protected-fixed'; titles: readonly string[] }
  | { kind: 'no-duration'; taskId: string }

export interface PlanningSuggestion {
  id: string
  category: SuggestionCategory
  target: SuggestionTarget
  change: ProposedChange
  reasons: readonly SuggestionReason[]
  weather: WeatherEvidence | null
  rank: SuggestionRank
}

export interface DismissalEntry {
  suggestionId: string
  activityKey: string
  changeSignature: string
  dismissedAt: string
}

export interface DismissalRecord {
  version: 1
  localDate: string
  entries: DismissalEntry[]
}

export interface DismissalState {
  localDate: LocalDate
  entries: DismissalEntry[]
  persistence: 'persisted' | 'session-only'
}

export type DismissalWriteCode =
  'STORAGE_UNAVAILABLE' | 'STORAGE_QUOTA_EXCEEDED' | 'STORAGE_WRITE_FAILED'

export type DismissalWriteResult =
  | { ok: true; state: DismissalState }
  | { ok: false; code: DismissalWriteCode; state: DismissalState }

export type NoSuggestionReason =
  | 'all-dismissed'
  | 'day-already-planned'
  | 'missing-durations'
  | 'no-free-period'
  | 'nothing-actionable'

export interface SuggestionView {
  id: string
  category: SuggestionCategory
  targetTitle: string
  /** Internal stable activity key used to exclude the target from conflicts. */
  activityKey: string
  currentLabel: string | null
  proposedLabel: string
  proposedStartMinutes: number
  durationMinutes: number
  change: ProposedChange
  changeSignature: string
  reasons: readonly SuggestionReason[]
  weatherEvidence: WeatherEvidence | null
  durationLabel: string | null
}

export type SuggestionsSurfaceState =
  | { status: 'loading' }
  | { status: 'incomplete' }
  | { status: 'error' }
  | {
      status: 'ready'
      suggestions: readonly SuggestionView[]
      dismissed: readonly SuggestionView[]
      noSuggestionReason: NoSuggestionReason | null
      applyingId: string | null
      applyError: { suggestionId: string; code: string } | null
      announcement: string | null
    }

export type SuggestionApplyFailureCode =
  'stale-target' | 'invalid-time' | 'needs-acknowledgment' | 'apply-failed'

export interface SuggestionConflictLink {
  title: string
  startMinutes: number
  endMinutes: number
}

export type SuggestionApplyOutcome =
  | { ok: true; appliedId: string }
  | {
      ok: false
      code: SuggestionApplyFailureCode
      retryable: boolean
      conflicts: readonly SuggestionConflictLink[]
    }

export type SuggestionApplyFailure = Extract<
  SuggestionApplyOutcome,
  { ok: false }
>

export interface SuggestionApplier {
  applyTaskSlot(input: {
    taskId: string
    startTime: string
    durationMinutes: number
    acknowledged: boolean
  }): Promise<{ ok: true } | { ok: false; reason: string }>
  applyCommitmentMove(input: {
    commitmentId: string
    startTime: string
    endTime: string
    acknowledged: boolean
  }): Promise<{ ok: true } | { ok: false; reason: string }>
}

export interface GenerateCandidatesInput {
  date: LocalDate
  entries: AgendaDay['entries']
  conflicts: readonly TimeConflict[] | null
  unscheduledTasks: readonly Task[]
  availability: AgendaDay['availability']
  tasks: readonly Task[]
  commitments: readonly Commitment[]
  weather: SuggestionWeatherContext
  nowMinutes: number
}

export interface SelectSuggestionsInput {
  candidates: readonly PlanningSuggestion[]
  dismissals: readonly DismissalEntry[]
  hasPendingUnscheduledTasks: boolean
  allUnscheduledDurationsMissing: boolean
  hasConflicts: boolean
  hasOnlyFixedConflicts: boolean
}

export interface SelectSuggestionsResult {
  active: PlanningSuggestion[]
  dismissed: PlanningSuggestion[]
  noSuggestionReason: NoSuggestionReason | null
}

export interface ConflictCandidateContext {
  date: LocalDate
  group: TimeConflict
  entries: AgendaDay['entries']
  tasks: readonly Task[]
  commitments: readonly Commitment[]
  nowMinutes: number
}

export interface SlotCandidateContext {
  date: LocalDate
  tasks: readonly Task[]
  unscheduledTasks: readonly Task[]
  periods: readonly AvailablePeriod[]
  weather: SuggestionWeatherContext
  nowMinutes: number
}

export interface FlexibleAdjustmentContext {
  date: LocalDate
  tasks: readonly Task[]
  unscheduledTasks: readonly Task[]
  entries: AgendaDay['entries']
  commitments: readonly Commitment[]
  periods: readonly AvailablePeriod[]
  nowMinutes: number
  occupiedActivityKeys: ReadonlySet<string>
}

export interface UseSuggestionsOptions {
  day: AgendaDay
  tasks: readonly Task[]
  commitments: readonly Commitment[]
  sources: 'loading' | 'complete' | 'incomplete'
  weather: SuggestionWeatherContext
  now: Date
  applyTaskSlot: SuggestionApplier['applyTaskSlot']
  applyCommitmentMove: SuggestionApplier['applyCommitmentMove']
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  weatherUnit: WeatherUnit
}

export interface SuggestionController {
  state: SuggestionsSurfaceState
  persistence: 'persisted' | 'session-only'
  accept: (suggestionId: string) => Promise<SuggestionApplyOutcome>
  adjust: (input: {
    suggestionId: string
    startTime: string
    acknowledged: boolean
  }) => Promise<SuggestionApplyOutcome>
  dismiss: (suggestionId: string) => Promise<void>
  restore: (suggestionId: string) => Promise<void>
  retry: () => void
}
