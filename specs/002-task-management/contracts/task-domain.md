# Contract: Task Domain

**Feature**: `002-task-management` | **Date**: 2026-11-12

This contract defines the task domain exposed by `entities/task` to `features/tasks`, `pages`, and future consumers such as Daily Agenda and Planning Suggestions. It is an internal TypeScript module contract. There is no HTTP endpoint, API version, or server error envelope in this feature.

## 1. Public API

`entities/task/index.ts` is the only import surface. Consumers must not import files under `entities/task/model/` directly.

```ts
export type {
  Task,
  TaskId,
  TaskStatus,
  Priority,
  LocalDate,
  TaskDraft,
  TaskValidationCode,
  TaskRecordValidationCode,
  TaskFieldError,
  TaskStoreLoadResult,
  TaskStoreWriteResult,
  PersistenceMode,
  QuarantineSummary,
} from './model/types'

export { TASK_PRIORITIES, TASK_STATUSES } from './model/types'

export {
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  TITLE_MIN_GRAPHEMES,
  TITLE_MAX_GRAPHEMES,
  DESCRIPTION_MAX_GRAPHEMES,
  DURATION_MIN_MINUTES,
  DURATION_MAX_MINUTES,
} from './model/constants'

export {
  taskSchema,
  taskDraftSchema,
  storedTaskSchema,
  guestTaskStoreSchema,
} from './model/schema'

export {
  validateTaskDraft,
  validateStoredTask,
  countGraphemes,
} from './model/validation'

export { compareTasks, groupTasks } from './model/ordering'
export { parseDurationInput, formatDuration } from './model/duration'
export {
  isLocalDate,
  getLocalToday,
  isPastDue,
  formatDueDate,
} from './model/dueDate'
export { loadGuestTaskStore, saveGuestTaskStore } from './model/storage'
```

## 2. Domain types

```ts
type TaskId = string
type LocalDate = `${number}-${number}-${number}`

type TaskStatus = 'pending' | 'completed'
type Priority = 'low' | 'medium' | 'high'

interface Task {
  id: TaskId
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  dueDate?: LocalDate
  estimatedMinutes?: number
  createdAt: string
}

interface TaskDraft {
  title: string
  description: string
  priority: Priority
  dueDate: string
  estimatedDurationInput: string
}
```

`Task` is the validated domain object. `TaskDraft` is the controlled form shape; it may contain raw input and is never persisted as-is.

## 3. Domain invariants

1. `id` is a non-empty UUID assigned once at creation and never reused.
2. `title` is trimmed, not whitespace-only, and has 3–200 grapheme clusters.
3. `description`, when present, is trimmed and has 1–2000 grapheme clusters; blank descriptions are absent.
4. `status` is `pending` or `completed`; new tasks are `pending`.
5. `priority` is `low`, `medium`, or `high`; new tasks are `medium`.
6. `dueDate`, when present, is a real calendar date in `YYYY-MM-DD` form with no time or timezone.
7. `estimatedMinutes`, when present, is a whole number from 1 to 1440.
8. `createdAt` is a valid ISO 8601 timestamp assigned once and never changed by editing.
9. Completion never deletes a task or changes any field other than `status`.
10. Editing never changes `id` or `createdAt`.

## 4. Validation contract

```ts
type TaskValidationCode =
  | 'TITLE_REQUIRED'
  | 'TITLE_TOO_SHORT'
  | 'TITLE_TOO_LONG'
  | 'DESCRIPTION_TOO_LONG'
  | 'PRIORITY_INVALID'
  | 'DUE_DATE_INVALID'
  | 'DURATION_INVALID'
  | 'DURATION_OUT_OF_RANGE'
  | 'DURATION_FRACTIONAL'

type TaskRecordValidationCode =
  | TaskValidationCode
  | 'TASK_ID_INVALID'
  | 'TASK_CREATED_AT_INVALID'
  | 'TASK_STATUS_INVALID'

interface TaskFieldError {
  field: 'title' | 'description' | 'priority' | 'dueDate' | 'estimatedMinutes'
  code: TaskValidationCode
}

validateTaskDraft(draft: TaskDraft): TaskFieldError[]
validateStoredTask(
  input: unknown,
): { ok: true; value: Task } | { ok: false; code: TaskRecordValidationCode }
countGraphemes(value: string): number
```

Rules:

- Validation functions are pure and return codes, never localized messages.
- `validateTaskDraft` applies trimming before length checks and checks every field; it never returns only the first error.
- Form payloads use `.strict()` schemas; unknown keys are rejected.
- `validateStoredTask` accepts `unknown`, never throws, and never coerces invalid values into valid domain values. Duplicate identities are detected by the store's sanitizer, not by this single-record validator.
- Grapheme counting uses `Intl.Segmenter` with `granularity: 'grapheme'` after trimming.
- An invalid record is quarantined by the store; it is not passed to the domain.

## 5. Ordering contract

```ts
compareTasks(a: Task, b: Task): number
groupTasks(tasks: readonly Task[]): {
  pending: Task[]
  completed: Task[]
}
```

`compareTasks` defines a total order:

1. `pending` before `completed`.
2. Within the same status, newer `createdAt` first.
3. Equal `createdAt` values are ordered by `id` ascending.

`groupTasks` must not mutate its input. The combined render order is `pending` followed by `completed`, each already sorted by `compareTasks`. Editing a task does not alter its position; toggling status moves it to the other group.

## 6. Duration contract

```ts
parseDurationInput(
  input: string,
): { ok: true; minutes: number } | { ok: false; code: TaskValidationCode }

formatDuration(minutes: number, locale: string): string
```

`parseDurationInput`:

- Trims surrounding whitespace and is case-insensitive for unit aliases.
- Requires an explicit unit; a bare number such as `30` is ambiguous and rejected.
- Units are case-insensitive and may be attached or separated by whitespace; combined parts may be adjacent or whitespace-separated; no other characters are allowed.
- Accepts hours and/or minutes with recognized aliases (`h`, `hr`, `hrs`, `hour`, `hours`, `m`, `min`, `mins`, `minute`, `minutes`).
- Accepts combined “hours and minutes” forms such as `1 h 30 min`.
- Rejects zero, negative, fractional, out-of-range, ambiguous, and unparseable input with the applicable code.
- Returns canonical whole minutes from 1 to 1440; the upper bound is inclusive, so `24h` resolves to 1440.

`formatDuration`:

- Uses `Intl.NumberFormat` unit parts for hours and minutes in the requested locale.
- Joins parts with `Intl.ListFormat` in the same locale.
- Never returns raw stored text and never uses a hardcoded English unit.

## 7. Due-date contract

```ts
import type { DateTimePresentation } from '@/shared/config/preferences'

isLocalDate(value: string): value is LocalDate
getLocalToday(now?: Date): LocalDate
isPastDue(task: Task, today?: LocalDate): boolean
formatDueDate(
  dueDate: LocalDate,
  locale: string,
  presentation: DateTimePresentation,
): string
```

Rules:

- `isLocalDate` validates real calendar dates by component round-trip; nonexistent dates are rejected.
- `getLocalToday` derives the date from local parts, never from a UTC ISO string slice.
- `isPastDue` is true only when `task.status === 'pending'`, `task.dueDate` exists, and the stored date is before the local today.
- `formatDueDate` uses the existing date formatting helper and the user's presentation preference; it constructs the display date from the stored components and does not convert it through another timezone.

## 8. Consumer contract

Future consumers receive validated `Task` values and may rely on:

- `id` stability and uniqueness.
- `status` and `priority` literal unions.
- Date-only `dueDate` semantics.
- Canonical `estimatedMinutes`.
- ISO `createdAt` suitable for deterministic ordering.

Future consumers must not:

- Read `localStorage` directly.
- Assume a task has a due date, duration, or time slot.
- Treat `estimatedMinutes` as a guaranteed execution duration.
- Mutate tasks in place or bypass the entity API.
- Expect cross-device or server synchronization.

## 9. Evolution

- Additive optional domain fields may be introduced with a schema version change if storage shape changes.
- Removing or renaming fields is a breaking change and requires a migration.
- Consumers must tolerate optional fields being absent.
- This contract has no HTTP version. API versioning remains deferred by the constitution.
