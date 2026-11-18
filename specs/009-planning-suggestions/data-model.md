# Phase 1 Data Model: Planning Suggestions

**Feature**: `009-planning-suggestions` | **Date**: 2026-11-18

This feature adds **no stored user plan data**. It defines derived recommendation types and one
device-local, versioned display record (dismissals). Tasks, commitments, their planned slots, and
weather remain owned by their existing entities and stores. Field names below are the agreed contract
for implementation and tests.

---

## 1. Inputs (owned elsewhere, consumed read-only)

### 1.1 Agenda snapshot

`AgendaDay` from `features/agenda` (public contract types only):

| Field | Type | Use |
|---|---|---|
| `date` | `LocalDate` | Must equal the current local date; otherwise the surface is hidden. |
| `entries` | `AgendaEntry[]` | Current activities, category, source ID, title, start/end minutes, conflicts. |
| `unscheduledTasks` | `Task[]` | Candidate tasks with no planned date/time. |
| `conflicts` | `TimeConflict[] \| null` | Connected conflict groups; `null` means incomplete sources. |
| `availability` | `AvailabilityResult` | Presented periods for slot placement; `none` carries the reason. |

The suggestions feature never mutates `AgendaDay` and never re-derives conflicts or availability for
slot suggestions.

### 1.2 Task and commitment source lists

`readonly Task[]` and `readonly Commitment[]` as loaded by the existing controllers. They supply due
date, priority, estimated duration, status, planned slot, commitment type, date, and times. Source
array order is the final stable tie-breaker for "stable source order".

### 1.3 Weather port

Supplied by Home from the existing `useWeather` presentation state.

```ts
export interface SuggestionWeatherHour {
  /** Device-local minute of day, 0..1439. */
  startMinutes: number
  /** Device-local end minute, 1..1440; derived from the next timestamp. */
  endMinutes: number
  condition: Conditions
  precipitationProbability: number | null
}

export type SuggestionWeatherContext =
  | { status: 'available'; hours: readonly SuggestionWeatherHour[] }
  | { status: 'unavailable' }
```

Rules:
- `unavailable` when the weather surface is not `ready`, `freshness.isOutdated` is true, or there
  are no hours.
- Hours are sorted by `startMinutes`; overlapping or duplicate hours are removed by the adapter.
- Partial coverage is represented by missing hours, never by invented values.
- The port carries no location, coordinates, units, or provider identifiers.

### 1.4 Runtime context

| Value | Type | Rules |
|---|---|---|
| `now` | `Date` | Device clock; drives current-minute and past rejection. |
| `today` | `LocalDate` | `getLocalToday(now)`; must equal `day.date` for the surface. |
| `locale` | `string` | Active language and formatting locale for copy, dates, times, durations, and units. |
| `dateStyle` | `Intl.DateTimeFormatOptions['dateStyle']` | Passed to existing formatters. |
| `weatherUnit` | `WeatherUnit` | Used only to format cited weather facts. |

---

## 2. PlanningSuggestion (derived, never stored)

```ts
export type SuggestionCategory = 'conflict' | 'slot' | 'flexible-adjustment'

export type SuggestionTarget =
  | { kind: 'task'; taskId: string; title: string }
  | { kind: 'commitment'; commitmentId: string; title: string }

export interface PlanningSuggestion {
  id: string
  category: SuggestionCategory
  target: SuggestionTarget
  change: ProposedChange
  reasons: readonly SuggestionReason[]
  weather: WeatherEvidence | null
  /** Stable sort inputs; not rendered directly. */
  rank: SuggestionRank
}
```

| Field | Rules |
|---|---|
| `id` | Stable, locale-independent, deterministic (see §7). Unique within one generation. |
| `category` | One of the three literal categories. Fixed commitments never appear as targets. |
| `target` | Exactly one activity. `title` is the current title at generation time. |
| `change` | Exactly one permitted change; see §3. |
| `reasons` | At least one; first is primary; all reason values are data-grounded. |
| `weather` | Non-null only when weather materially influenced the choice. |
| `rank` | Derived numeric/text tuple for ordering, not persisted or shown. |

### 2.1 Ranking tuple

```ts
export interface SuggestionRank {
  categoryRank: 0 | 1 | 2 | 3 // conflict, deadline slot, other slot, flexible
  dueRank: 0 | 1 | 2 | 3 | 4 // overdue, today, future, no-date, not-applicable
  dueDate: string | null     // ISO local date or null
  priorityRank: 0 | 1 | 2    // high, medium, low (higher importance = lower number)
  proposedStartMinutes: number
  sourceOrder: number
  suggestionId: string       // final stable tie-breaker
}
```

Category ranks:
- `0` conflict
- `1` slot for a task with a due date (deadline-driven)
- `2` slot for a task without a due date
- `3` flexible adjustment

`dueRank` applies only to slot tasks. Conflict suggestions use the moved activity's due rank and
priority and the conflict's overlap start for `proposedStartMinutes`; flexible-adjustment suggestions
use the beneficiary task's due rank and priority and the proposed commitment start. `sourceOrder` is
the target activity's index in its source array, and `suggestionId` is the final stable tie-breaker.

---

## 3. ProposedChange (exactly one permitted modification)

```ts
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
```

Rules:
- `durationMinutes` is always the activity's existing duration; it is never invented or shortened.
- `plannedDate`/`date` always equal the current local date.
- `startMinutes` is at or after the current minute; `endMinutes <= 1440`.
- `move-commitment` preserves duration and the commitment stays `flexible` on the same date.
- `schedule-task` is only for a pending task with no planned slot on any date and a defined
  `estimatedMinutes`.
- `move-task` is only for a pending scheduled task with a defined duration.
- A fixed commitment can never be the target of any variant.

### 3.1 Apply mapping

| Change kind | Adapter | Existing validation reused |
|---|---|---|
| `schedule-task` | `applyTaskSlot(taskId, startTime, duration, acknowledged)` | Agenda `validateScheduleDraft` + `tasks.scheduleTask` |
| `move-task` | `applyTaskSlot(taskId, startTime, duration, acknowledged)` | Same; `acknowledged` is true only for a user-adjusted overlapping time |
| `move-commitment` | `applyCommitmentMove(id, startTime, endTime, acknowledged)` | Commitments `update` with overlap acknowledgment |

Exactly one store write happens per accepted suggestion.

---

## 4. SuggestionReason (data-grounded explanation)

```ts
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
```

Rules:
- The first reason is the primary explanation; order is stable.
- Reasons never claim optimality, guaranteed completion, or that acceptance is required.
- A weather reason appears only when `weather` evidence decided the choice.
- A conflict reason names every member of the group and, when applicable, the remaining overlap
  pairs after the move.
- `no-duration` is used only in the no-suggestion explanation, never on a card (no card exists for a
  task without a duration).

---

## 5. WeatherEvidence

```ts
export interface WeatherEvidence {
  basis:
    | 'precipitation'
    | 'condition-severity'
    | 'severe-condition'
  chosenStartMinutes: number
  chosenEndMinutes: number
  chosenCondition: Conditions
  chosenPrecipitationProbability: number | null
  comparedCondition: Conditions | null
  comparedPrecipitationProbability: number | null
}
```

Rules:
- Only present when weather changed the selected period, not merely when weather is available.
- The evidence references the actual activity span, not the whole free period.
- Missing values are `null`; no zero is invented.
- Temperature is neither a deciding basis nor supporting evidence; it is not carried in the evidence
  and not cited in any suggestion (see research R5).

---

## 6. DismissalRecord (device-local persisted)

Storage key: `walday:suggestion-dismissals`.

```ts
export interface DismissalEntry {
  suggestionId: string      // stable ID from §7
  activityKey: string       // 'task:<id>' or 'commitment:<id>'
  changeSignature: string   // canonical change fingerprint
  dismissedAt: string       // ISO timestamp
}

export interface DismissalRecord {
  version: 1
  localDate: LocalDate      // the local day the dismissals belong to
  entries: DismissalEntry[]
}
```

Validation (Zod, strict):
- `version === 1`.
- `localDate` matches `YYYY-MM-DD` and is a real calendar date.
- `entries` is an array of at most 100 records.
- `suggestionId`, `activityKey`, and `changeSignature` are non-empty bounded strings.
- `dismissedAt` is an ISO timestamp parseable by `Date.parse`.
- Unknown keys are rejected.

Load/write behavior:
- Load only when `record.localDate === today`; otherwise return empty and ignore the old day.
- Invalid JSON/schema/version → return empty; the next dismiss replaces the key.
- Dismiss: re-read, merge by `suggestionId`, update `dismissedAt`, prune other days, cap at 100,
  write through `enqueueWrite`.
- Restore: remove matching `suggestionId`; keep the record when other entries remain, remove the key
  when empty.
- Storage unavailable/quota/blocked: keep the decision in memory for the session and expose a
  non-blocking status; never claim persistence.
- Never sent to the backend; never keyed by account or device identifier.

### 6.1 Change signature

A canonical, locale-independent string:

```text
schedule-task:<taskId>:<date>:<start>-<end>
move-task:<taskId>:<date>:<fromStart>-<fromEnd>:<start>-<end>
move-commitment:<commitmentId>:<date>:<fromStart>-<fromEnd>:<start>-<end>
```

Dismissal scope is `activityKey + changeSignature`, so a different proposal for the same activity is
still shown (FR-045).

---

## 7. Identity

`PlanningSuggestion.id` is composed only of stable domain values:

```text
conflict:task:<taskId>:<fromStart>-<toStart>
conflict:commitment:<commitmentId>:<fromStart>-<toStart>-<toEnd>
slot:task:<taskId>:<date>:<start>
flex:commitment:<commitmentId>:<date>:<fromStart>-<toStart>-<toEnd>:task:<beneficiaryId>
```

Rules:
- No localized text, weather value, reason text, timestamp, random value, or array index.
- Changing language, units, or weather refresh leaves the ID unchanged.
- A different proposed time produces a different ID, so an old dismissal does not suppress a new
  recommendation.

---

## 8. Surface state (not persisted)

```ts
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

export type NoSuggestionReason =
  | 'all-dismissed'
  | 'day-already-planned'
  | 'missing-durations'
  | 'no-free-period'
  | 'nothing-actionable'
```

`SuggestionView` is the render projection defined in `contracts/ui-contract.md` §3 (ID, category,
target title, localized current/proposed labels, reasons, weather evidence, and duration label). It is
derived per render and never stored.

`loading` applies while task/commitment sources are not ready. `incomplete` applies when either
source is quarantined, unsupported, protected, or recovery-blocked. `error` applies only when
generation throws unexpectedly; it must not be used for unavailable weather. The `incomplete` and
`error` states carry no callbacks: their retry affordance is supplied by the `onRetry` prop defined in
`contracts/ui-contract.md` §2, so the state remains serializable and free of React references.

### 8.1 State transitions

| From | Event | To | Render |
|---|---|---|---|
| loading | sources ready | ready | Cards or no-suggestion reason |
| loading | sources incomplete | incomplete | Explanation + retry |
| ready | dismiss | ready (recomputed) | Card removed, announcement, focus next |
| ready | restore | ready (recomputed) | Card returned, announcement |
| ready | weather becomes unavailable/outdated | ready (recomputed) | A still-valid presented card is retained; weather evidence removed and not cited (FR-033) |
| ready | accept | ready + applyingId | Controls disabled, busy announcement |
| ready + applying | success | ready (recomputed) | Applied card removed, `applyError` cleared, success announcement, focus next |
| ready + applying | failure | ready | Card retained, `applyError` set, error text + retry, no data change |
| ready + incomplete after source change | source becomes incomplete | incomplete | No stale cards presented as complete |
| any | selected date ≠ today | surface hidden | Nothing rendered (FR-002) |

### 8.2 Application outcome (not persisted)

The controller returns one outcome for Accept and Adjust. The UI uses it only to render the card
error/acknowledgment affordances; it never stores it.

```ts
export type SuggestionApplyFailureCode =
  | 'stale-target'
  | 'invalid-time'
  | 'needs-acknowledgment'
  | 'apply-failed'

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

export type SuggestionApplyFailure = Extract<SuggestionApplyOutcome, { ok: false }>
```

- `needs-acknowledgment` always carries every conflicting activity and time range and is retryable.
- `stale-target` covers completed, deleted, no-longer-pending, re-scheduled, duration-changed, or
  commitment-type/date-changed targets (FR-047, FR-051).
- A failure outcome never implies a partial write; exactly zero store mutations occurred (FR-053).
- `SuggestionConflictLink` is the same shape exposed as `conflictsFor` results to the adjust dialog.

---

## 9. Selection invariants

1. Fixed commitments never appear in `target` or `change`.
2. At most one suggestion per `activityKey`.
3. At most one suggestion per `(activityKey, changeSignature)`.
4. Dismissed `(activityKey, changeSignature)` pairs are excluded from active suggestions.
5. At most three active suggestions are rendered.
6. Identical inputs produce identical IDs, content, and order.
7. Suggestions target the current local date only.
8. Every active suggestion has at least one reason and a concrete permitted change.
9. A conflict suggestion is produced only if the chosen activity is fully removed from every overlap
   it participates in.
10. Applying a suggestion revalidates all of the above against current data before the adapter runs.

---

## 10. Configuration (single source of truth)

`frontend/src/shared/config/suggestions.ts`:

```ts
export const SUGGESTIONS_STORAGE_KEY = 'walday:suggestion-dismissals' as const
export const SUGGESTIONS_STORAGE_VERSION = 1 as const
export const SUGGESTION_DISPLAY_LIMIT = 3 as const
export const SUGGESTION_DISMISSAL_LIMIT = 100 as const
export const SUGGESTION_WEATHER_PRECIPITATION_DIFF = 30 as const
export const SUGGESTION_WEATHER_SEVERITY_DIFF = 2 as const
export const CONDITION_SEVERITY: Record<Conditions, number> = {
  clear: 0,
  'partly-cloudy': 1,
  cloudy: 2,
  fog: 3,
  rain: 4,
  snow: 5,
  storm: 6,
  unknown: 6, // treated as unusable weather, never better than known conditions
}
```

`CONDITION_SEVERITY` lives in the suggestions model if importing `Conditions` into shared config is
undesirable; the key point is one named source, no duplicated literals. Named constants must be used
by generation, ordering, storage, and tests.
