# Contract: Agenda Domain

**Feature**: `006-daily-agenda` | **Date**: 2026-11-15

Pure functions and types in `frontend/src/features/agenda/model/` for `timeOfDay`, `ordering`, `slot`, `conflicts`, `availability`, `agendaDay`, and `scheduleDraft`. No React, no storage, no network. All functions are total over their declared inputs and never mutate their arguments. `model/useAgendaDate.ts` is a React Router hook in the same folder and is outside this contract; it holds no domain rules.

## Types

```ts
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
  startMinutes: number        // 0..1439
  endMinutes: number          // 1..1440 (1440 = end of day)
  conflicts: ConflictLink[]
  exceedsDayEnd: boolean
}

export type AgendaEntry =
  | (AgendaEntryBase & { category: 'fixed-commitment' | 'flexible-commitment' })
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
  adjustableKeys: string[]    // flexible commitment members, for the text label
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
```

## Functions

```ts
buildAgendaDay(input: BuildAgendaDayInput): AgendaDay
```

- Filters commitments by `date`, derives scheduled task entries by `plannedDate`, and computes unscheduled tasks.
- Derives conflicts and availability when `sources === 'complete'`; otherwise `conflicts = null` and `availability = { kind: 'none', reason: 'incomplete-sources' }`.
- `entries` are returned already ordered by `compareAgendaEntries`.
- Never mutates or rewrites any task or commitment.

```ts
sortAgendaEntries(entries: readonly AgendaEntry[], locale: string): AgendaEntry[]
```

- Returns a new array ordered by the `compareAgendaEntries` rule; the input array is untouched.

```ts
buildTaskEntry(task: Task): AgendaEntry
selectScheduledTasks(tasks: readonly Task[], date: LocalDate): Task[]
selectUnscheduledTasks(tasks: readonly Task[]): Task[]
```

- `buildTaskEntry` derives `startMinutes` from `plannedStartTime` and `endMinutes`/`exceedsDayEnd` from `clampDayEnd`; it is only called for a task with a valid slot and duration.
- `selectScheduledTasks` returns tasks whose `plannedDate === date`, pending or completed.
- `selectUnscheduledTasks` returns pending tasks with no `plannedDate` on any date, ordered by the task entity's `sortTasks`.

```ts
compareAgendaEntries(a: AgendaEntry, b: AgendaEntry, locale: string): number
AGENDA_CATEGORY_RANK: Readonly<Record<AgendaCategory, number>> // fixed 0, flexible 1, task 2
```

- Start minutes ascending; then category rank; then end minutes; then title via `localeCompare(locale)`; then `key`.
- Total and deterministic: equal inputs always produce the same order.

```ts
deriveConflicts(entries: readonly AgendaEntry[]): {
  conflicts: TimeConflict[]
  entries: AgendaEntry[]      // same entries with ConflictLink lists filled
}
```

- Pair rule: same date (guaranteed by construction), `startA < endB && startB < endA`.
- Boundary-touching pairs produce no edge (FR-029).
- Groups are connected components; one `TimeConflict` per group (FR-033).
- Output groups and members are deterministically ordered.
- When there are no edges, returns the originals with empty conflict lists.

```ts
deriveAvailability(input: {
  entries: readonly AgendaEntry[]
  date: LocalDate
  today: LocalDate
  nowMinutes: number
  sources: AgendaSourcesState
}): AvailabilityResult
```

- Past date → `{ kind: 'none', reason: 'past-date' }` regardless of `sources`.
- `sources === 'incomplete'` → `{ kind: 'none', reason: 'incomplete-sources' }`.
- Today → lower bound is `nowMinutes`; future → 0; upper bound 1440.
- Merges overlapping and touching occupied intervals; presents gaps `>= AVAILABLE_GAP_MINUTES` (30).
- `totalMinutes` sums presented periods only.

```ts
minutesToTimeLabel(minutes: number, locale: string, endOfDayLabel: string): string
minutesFromTime(time: LocalTime): number
formatMinuteDuration(minutes: number, locale: string): string
clampDayEnd(startMinutes: number, durationMinutes: number): {
  endMinutes: number
  exceedsDayEnd: boolean
}
```

- `minutesToTimeLabel(1440, locale, endOfDayLabel)` renders the localized end-of-day label, never an invalid `HH:MM`.
- `formatMinuteDuration` delegates to the existing `formatDuration` so the agenda and Task Management format durations identically.
- `clampDayEnd` returns `endMinutes = 1440` and `exceedsDayEnd = true` when the sum exceeds the day.

```ts
isScheduled(task: Task): boolean                       // plannedDate !== undefined
isUnscheduledPending(task: Task): boolean              // pending && plannedDate === undefined
```

## Schedule draft

```ts
export const scheduleDraftSchema: z.ZodType<ScheduleDraft>

export interface ScheduleDraft {
  taskId: string
  date: string
  startTime: string
  durationInput: string
  acknowledgedConflicts: boolean
}

export type ScheduleField =
  | 'taskId'
  | 'date'
  | 'startTime'
  | 'durationInput'
  | 'acknowledgedConflicts'

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
  plannedDate: LocalDate
  plannedStartTime: LocalTime
  estimatedMinutes: number
}

export type ScheduleValidationResult =
  | { ok: true; slot: ScheduleSlot; conflicts: ConflictLink[] }
  | { ok: false; errors: ScheduleFieldError[] }

validateScheduleDraft(
  draft: ScheduleDraft,
  context: { tasks: readonly Task[]; day: AgendaDay; date: LocalDate },
): ScheduleValidationResult
```

- Any valid calendar date is accepted, including past dates (FR-016, clarification).
- Duration comes from the task when present; otherwise `durationInput` is required (FR-019).
- Rejects a non-valid time, a non-positive end, and an end past 24:00 (FR-020).
- Rejects a non-pending task (FR-025).
- `conflicts` lists every existing entry the proposed span would overlap, with time ranges (FR-021). The overlap rule is identical to `deriveConflicts`, so the dialog preview and the final validation cannot disagree.
- Validation never writes and never reorders anything.

## Ordering hint contract

The UI must render a localized sentence describing the comparator: ordered by start time; on equal start times, fixed commitments, then flexible commitments, then tasks. The comparator and the hint must be derived from `AGENDA_CATEGORY_RANK` so they cannot disagree (FR-003).
