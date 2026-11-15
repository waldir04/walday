# Phase 1 Data Model: Daily Agenda

**Feature**: `006-daily-agenda` | **Date**: 2026-11-15

Two kinds of data exist here: one small persisted addition (the task slot) and a set of derived, read-only agenda structures. Derived structures are never stored.

## 1. Persisted: Scheduled Task Slot

The slot is two optional fields on the existing `Task` record.

| Field | Type | Rules |
|---|---|---|
| `plannedDate` | `LocalDate` (`YYYY-MM-DD`) | Optional. Must be a real calendar date. Present if and only if `plannedStartTime` is present. |
| `plannedStartTime` | `LocalTime` (`HH:MM`, 00:00–23:59) | Optional. Present if and only if `plannedDate` is present. |

Derived, never stored:

| Value | Derivation |
|---|---|
| Planned end | `plannedStartTime` minutes + `estimatedMinutes` |
| Oversized | Planned end `> 1440`; stored data is never changed, the display clips to 24:00 |
| Scheduled | `plannedDate !== undefined` |
| Unscheduled | `status === 'pending' && plannedDate === undefined` |

Invariants:

1. At most one slot per task; moving a slot overwrites the same two fields.
2. `estimatedMinutes` is required for a scheduled task (FR-019). The scheduling flow refuses a task without a duration until the user supplies one, saves it in the same write as the slot, and the storage boundary rejects a slot without a duration so an invalid record can never reach derivation.
3. A slot never exists without a task; deleting the task removes the slot with the record.
4. Completing a scheduled task leaves the slot untouched and keeps the entry in the timeline.
5. Task Management's create/update/complete flows never read, write, infer, or clear a slot. `updateTask` must preserve existing slot fields.

### Validation at the storage boundary

| Code | Condition |
|---|---|
| `SLOT_DATE_INVALID` | `plannedDate` present but not a real `YYYY-MM-DD` date |
| `SLOT_TIME_INVALID` | `plannedStartTime` present but not a valid `HH:MM` time |
| `SLOT_INCOMPLETE` | Exactly one of the two fields is present |
| `SLOT_DURATION_REQUIRED` | The slot pair is present but `estimatedMinutes` is absent |
| `DURATION_OUT_OF_RANGE` | Existing code; `estimatedMinutes` outside 1–1440 |

A record that fails any code is quarantined under the existing per-record sanitize path and is reported through the existing recovery notice. The slot is not silently dropped, because a dropped slot would move a user's planned activity without authorization.

### Envelope change

`walday:tasks` version 1 → 2. The envelope keeps `version`, `revision`, `updatedAt`, and `tasks`. Version 2 differs only in that task records may carry the slot pair. Migration reads version 1 tasks and returns them unchanged; any record that fails version 2 validation is quarantined as above. A version greater than 2 is rejected as `unsupported`.

## 2. Derived: Agenda Day

Root aggregate for one selected local date.

| Field | Type | Notes |
|---|---|---|
| `date` | `LocalDate` | Selected date |
| `entries` | `AgendaEntry[]` | Timeline entries, already ordered (see §3) |
| `unscheduledTasks` | `Task[]` | Pending tasks with no slot on any date, in Task Management order |
| `conflicts` | `TimeConflict[] \| null` | `null` when a source is incomplete |
| `availability` | `AvailabilityResult` | Discriminated result (see §6) |
| `timelineEmpty` | `boolean` | `entries.length === 0` |
| `hasAnyActivity` | `boolean` | Entries or unscheduled tasks exist |

Computed from `{ date, tasks, commitments, now, locale, sources }`. Pure, no side effects, no storage access.

## 3. Derived: Agenda Entry

Read-only projection of one commitment or one scheduled task. Never edited directly.

| Field | Type | Notes |
|---|---|---|
| `key` | `string` | `${category}:${sourceId}`, stable render key |
| `sourceId` | `string` | Task or commitment id |
| `category` | `'fixed-commitment' \| 'flexible-commitment' \| 'task'` | Drives label, pill, and ordering rank |
| `title` | `string` | Source title, unmodified |
| `startMinutes` | `number` | 0–1439 |
| `endMinutes` | `number` | 1–1440; 1440 means end of day (oversized task only) |
| `status` | `'pending' \| 'completed'` | Task entries only; commitments omit it |
| `priority` | `Priority` | Task entries only |
| `conflicts` | `ConflictLink[]` | Empty when no group or when conflicts are withheld |
| `exceedsDayEnd` | `boolean` | Task slot whose derived end passes 24:00 |

`ConflictLink`: `{ entryKey, title, category, overlapStartMinutes, overlapEndMinutes }`.

Entry construction rules:

- Fixed and flexible commitments are included when `commitment.date === date`; times are converted from stored `HH:MM` without adjustment (FR-007, FR-008).
- A task entry is included when `task.plannedDate === date`, for both pending and completed status.
- A task whose derived end exceeds 24:00 is clipped to `endMinutes = 1440` and flagged.
- Two entries can never share a `key`.

## 4. Derived: Time Conflict

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable group id from the smallest member key |
| `entryKeys` | `string[]` | Members, ordered by entry order |
| `activityCount` | `number` | `entryKeys.length`, always ≥ 2 |
| `startMinutes` | `number` | Earliest start among members |
| `endMinutes` | `number` | Latest end among members |
| `adjustableKeys` | `string[]` | Flexible commitment members, for the text label |

Rules:

- A pair conflicts when `startA < endB && startB < endA` on the same date. Equal boundaries do not conflict (FR-029).
- Groups are the connected components of the pair graph. A three-way overlap is one group with three members (FR-033).
- Two disjoint overlaps on the same date are two groups.
- Conflicting entries list every member they overlap, with the pairwise overlap interval, so each activity names every counterpart (FR-031, FR-032).
- Flexible commitment members are listed in `adjustableKeys` for the text label; nothing moves (FR-034).
- Conflicts are presentational only and never alter source data (FR-035).

## 5. Derived: Unscheduled Task

| Field | Type | Notes |
|---|---|---|
| Source | `Task` | Presented as-is: title, priority, due date, status |
| Eligibility | `status === 'pending' && plannedDate === undefined` | A slot on any other date excludes the task |
| Order | `sortTasks` | Same order as Task Management (FR-012), not chronological |

## 6. Derived: Availability

```ts
type AvailabilityResult =
  | { kind: 'available'; periods: AvailablePeriod[]; totalMinutes: number }
  | { kind: 'none'; reason: 'past-date' | 'incomplete-sources' }
```

`AvailablePeriod`: `{ startMinutes, endMinutes }`, both whole minutes, `endMinutes - startMinutes >= 30`.

Rules:

1. Occupied intervals are all entries clipped to the selected day, with overlapping and touching intervals merged.
2. For the current date the lower bound is the current local minute rounded up to the next whole minute; for future dates it is 0.
3. Gaps are the complements of occupied intervals within `[lowerBound, 1440]`.
4. Only gaps of at least `AVAILABLE_GAP_MINUTES` (30) are presented; 29 minutes is not (FR-037).
5. `totalMinutes` is the sum of presented periods only (FR-038).
6. Past dates return `{ kind: 'none', reason: 'past-date' }` (FR-042).
7. When either source is incomplete the result is `{ kind: 'none', reason: 'incomplete-sources' }` (FR-052).
8. Periods are informational, expose no action, and assign nothing (FR-039, FR-040).

## 7. Schedule Draft (form state)

| Field | Type | Validation |
|---|---|---|
| `taskId` | `string` | Must exist and be pending |
| `date` | `string` | Real `YYYY-MM-DD`; any past, present, or future date is valid |
| `startTime` | `string` | Required, valid `HH:MM` |
| `durationInput` | `string` | Required when the task has no duration; integer minutes within 1–1440 |
| `acknowledgedConflicts` | `boolean` | Required `true` when the proposed span conflicts |

Validation outcome: `{ ok: true, slot: { plannedDate, plannedStartTime, estimatedMinutes }, conflicts: ConflictLink[] }` or `{ ok: false, errors: ScheduleFieldError[] }`, where `ScheduleFieldError` is `{ field, code }`.

Codes: `START_TIME_REQUIRED`, `START_TIME_INVALID`, `DURATION_REQUIRED`, `DURATION_INVALID`, `DURATION_OUT_OF_RANGE`, `END_NOT_AFTER_START`, `ENDS_AFTER_MIDNIGHT`, `TASK_NOT_FOUND`, `TASK_NOT_PENDING`, `CONFLICTS_NOT_ACKNOWLEDGED`.

## 8. State Transitions

Scheduled slot lifecycle:

| From | Action | To | Side effects |
|---|---|---|---|
| None | Confirm schedule | Scheduled on `date` | Writes `plannedDate`, `plannedStartTime`, and the resolved `estimatedMinutes` (the task's own value when it already had one) |
| Scheduled A | Confirm move | Scheduled B | Overwrites the same pair; no other task or commitment changes |
| Scheduled | Remove schedule | None | Clears the pair; task returns to the unscheduled area unchanged otherwise |
| Scheduled | Task completed | Scheduled | Slot kept; entry stays in place with text completion status |
| Scheduled | Task edited in Tasks | Scheduled | Slot preserved; title, priority, due date may change |
| Scheduled | Duration changed in Tasks | Scheduled | Derived end changes; conflicts and availability recompute; oversize warning may appear |
| Scheduled | Task deleted | Removed | Entry and slot disappear with the record |
| Any | Validation failure / declined acknowledgment / storage conflict | Unchanged | No write; draft values preserved for correction |

## 9. Relationship Map

- `Task` 1 — 0..1 `Scheduled Task Slot` (fields on the record)
- `Commitment` 1 — 0..1 `Agenda Entry` per its date
- `Task` 1 — 0..1 `Agenda Entry` per its planned date
- `Agenda Day` 1 — * `Agenda Entry`, `Time Conflict` (each ≥ 2 entries), `Available Period`, `Unscheduled Task`
- `Agenda Entry` * — * `Agenda Entry` through `Time Conflict` membership

No new foreign keys, no backend schema, no Prisma model. The only persistence change is the additive pair on the guest task record.
