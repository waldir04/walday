# Contract: Suggestion Domain

**Feature**: `009-planning-suggestions` | **Date**: 2026-11-18

The pure generation modules live in `frontend/src/features/suggestions/model/`. Apart from the two
explicit boundary modules below, they contain no React, storage, network, or localization side
effects; all functions are total over their declared inputs, never mutate arguments, and are
deterministic.

Boundary modules in the same folder (per `plan.md`):
- `model/useSuggestions.ts` is the React controller hook. It may use React, read the current clock,
  and call the supplied adapters and dismissal storage; it never writes task or commitment storage.
- `model/dismissalSchema.ts` and `model/dismissalStorage.ts` are the single dismissal-storage
  boundary. They may use Zod and the existing `guestStore` helpers and never touch task or
  commitment storage keys.

Every other `model/*` module must stay pure and must not import React, storage, i18n, or the network.

---

## 1. Public entry points

```ts
// features/suggestions/controller.ts (narrow entry for Home)
export { useSuggestions } from './model/useSuggestions'
export type {
  SuggestionApplier,
  SuggestionApplyFailure,
  SuggestionApplyOutcome,
  SuggestionController,
  SuggestionView,
  SuggestionsSurfaceState,
  UseSuggestionsOptions,
} from './model/useSuggestions'

// features/suggestions/index.ts (full public API)
export { generateCandidates } from './model/generate'
export { selectSuggestions } from './model/generate'
export { suggestionIdFor } from './model/identity'
export type {
  PlanningSuggestion,
  ProposedChange,
  SuggestionCategory,
  SuggestionRank,
  SuggestionReason,
  SuggestionTarget,
  SuggestionWeatherContext,
  SuggestionWeatherHour,
  NoSuggestionReason,
} from './model/types'
export { SuggestionCard } from './ui/SuggestionCard'
export { SuggestionAdjustDialog } from './ui/SuggestionAdjustDialog'
export { SuggestionDismissedReview } from './ui/SuggestionDismissedReview'
```

Internals (`model/*`) MUST NOT be imported from outside the slice.

```ts
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
```

`SuggestionApplyOutcome`, `SuggestionApplyFailure`, and `SuggestionConflictLink` are defined in
`data-model.md` §8.2. `SuggestionApplier` is defined in §7 below.

---

## 2. Generation input and output

```ts
export interface GenerateCandidatesInput {
  date: LocalDate
  entries: readonly AgendaEntry[]
  conflicts: readonly TimeConflict[] | null
  unscheduledTasks: readonly Task[]
  availability: AvailabilityResult
  tasks: readonly Task[]
  commitments: readonly Commitment[]
  weather: SuggestionWeatherContext
  nowMinutes: number // 0..1440, rounded up
}

export function generateCandidates(
  input: GenerateCandidatesInput,
): PlanningSuggestion[]
```

Guarantees:
- Returns every generated candidate, sorted, **before** dismissal filtering. The controller filters;
  a candidate is never suppressed inside generation.
- Returns an empty array when `conflicts === null` (incomplete sources; the controller renders the
  `incomplete` surface state instead of calling generation). Generation never decides which date is
  "today": the controller withholds generation unless `date === getLocalToday(now)`.
- Conflict candidates are generated from `entries` and do not depend on `availability`. Slot and
  flexible-adjustment candidates are generated only when `availability.kind !== 'none'`.
- Never throws for valid typed input. Unexpected shape is prevented by upstream domain types.
- Every returned suggestion satisfies §9 of `data-model.md`.

```ts
export interface SelectSuggestionsInput {
  candidates: readonly PlanningSuggestion[]
  dismissals: readonly DismissalEntry[]
  hasPendingUnscheduledTasks: boolean
  allUnscheduledDurationsMissing: boolean
  hasConflicts: boolean
  hasOnlyFixedConflicts: boolean
}

export interface SelectSuggestionsResult {
  active: PlanningSuggestion[] // at most 3
  dismissed: PlanningSuggestion[] // candidates matching a dismissal
  noSuggestionReason: NoSuggestionReason | null
}

export function selectSuggestions(
  input: SelectSuggestionsInput,
): SelectSuggestionsResult
```

Rules:
- Partition by `activityKey + changeSignature`.
- Dropped dismissals whose candidate no longer exists are not returned.
- `active` is the first three candidates after filtering; hidden candidates are not represented.
- `noSuggestionReason` is `null` when `active.length > 0`. Otherwise, evaluate in this order and take
  the first match:
  1. `all-dismissed` — candidates exist and every candidate matches a dismissal.
  2. `day-already-planned` — `!hasPendingUnscheduledTasks && !hasConflicts`.
  3. `missing-durations` — `hasPendingUnscheduledTasks && allUnscheduledDurationsMissing`.
  4. `no-free-period` — `hasPendingUnscheduledTasks` and no candidate was generated.
  5. `nothing-actionable` — otherwise, including `hasOnlyFixedConflicts` and conflicts with no
     permitted improvement.
- The `incomplete` surface state is not a `NoSuggestionReason`; the controller renders it before
  selection runs.

---

## 3. Conflict generation

```ts
export interface ConflictCandidateContext {
  group: TimeConflict
  entries: readonly AgendaEntry[]
  tasks: readonly Task[]
  commitments: readonly Commitment[]
  nowMinutes: number
}

export function generateConflictCandidates(
  context: ConflictCandidateContext,
): PlanningSuggestion[]
```

Contract:
- One candidate per conflict group at most.
- Candidate selection:
  1. Flexible commitment with a valid alternative; deterministic tie: earliest original start, then
     entry key.
  2. Otherwise least deadline-urgent scheduled task: no due date, latest future due date, due today,
     overdue; then low, medium, high priority; then latest original start; then source order.
  3. Otherwise none.
- Fixed commitments are excluded before any selection.
- A task without `estimatedMinutes` is not a movable task candidate for a conflict.
- The chosen activity's alternative start comes from `findAlternativeStart` and must remove it from
  every overlap it participates in.
- `remainingOverlaps` are computed on the simulated move for every pair of other group members that
  still overlap. They are empty when the rest of the group is conflict-free.
- The reason names every group member and sets `fixedProtected` when a fixed commitment is a member.

```ts
export function findAlternativeStart(input: {
  entries: readonly AgendaEntry[]
  excludedKey: string
  durationMinutes: number
  nowMinutes: number
  currentStartMinutes: number
}): number | null
```

- Returns the earliest valid start, or `null`.
- Valid means `start >= now`, `start + duration <= 1440`, the span intersects no non-excluded entry,
  and `start !== currentStartMinutes`.
- Uses merged open intervals; no 30-minute minimum.

---

## 4. Slot generation

```ts
export interface SlotCandidateContext {
  tasks: readonly Task[]
  unscheduledTasks: readonly Task[]
  periods: readonly AvailablePeriod[]
  weather: SuggestionWeatherContext
  nowMinutes: number
}

export function generateSlotCandidates(
  context: SlotCandidateContext,
): PlanningSuggestion[]
```

Contract:
- One candidate per eligible task.
- Eligible: status `pending`, no `plannedDate`, `estimatedMinutes >= 1`, and at least one presented
  period with length `>= estimatedMinutes`.
- Proposed start is the chosen period's `startMinutes`; end is start + duration; end must be
  `<= 1440` (already guaranteed by the period).
- Weather selection follows the `choosePeriodByWeather` contract below.
- Reasons always include `fit`, plus `due-date` and `priority` when applicable, plus `weather` only
  when weather decided.

```ts
export function choosePeriodByWeather(input: {
  fittingPeriods: readonly AvailablePeriod[]
  durationMinutes: number
  weather: SuggestionWeatherContext
}): {
  period: AvailablePeriod
  evidence: WeatherEvidence | null
}
```

- Selection is locale- and unit-independent; it compares numeric precipitation probabilities and
  condition severity only. The returned `WeatherEvidence` carries condition and numeric values, and
  the UI formats them with the user's locale and weather unit.

- Baseline is the earliest fitting period.
- If weather is `unavailable`, coverage of any compared span is incomplete, or no material
  difference exists, return the baseline with `evidence: null`.
- Otherwise choose the fitting period whose **activity span** has the best weather, only when it is
  materially better than the baseline span; ties return the earliest.
- `unknown` condition or a null precipitation probability makes the span unusable for weather
  comparison.
- Material difference and severity rank are defined in `research.md` R5 and
  `shared/config/suggestions.ts`.

---

## 5. Flexible-adjustment generation

```ts
export interface FlexibleAdjustmentContext {
  tasks: readonly Task[]
  unscheduledTasks: readonly Task[]
  entries: readonly AgendaEntry[]
  commitments: readonly Commitment[]
  periods: readonly AvailablePeriod[]
  nowMinutes: number
  occupiedActivityKeys: ReadonlySet<string>
}

export function generateFlexibleAdjustmentCandidates(
  context: FlexibleAdjustmentContext,
): PlanningSuggestion[]
```

Contract:
- Beneficiary: pending unscheduled task with `estimatedMinutes` and no fitting presented period.
- Beneficiaries iterate in the slot urgency order.
- Commitments iterate by earliest original start then stable key; only `type === 'flexible'` and
  `commitment.date === currentDate`.
- Alternative starts iterate ascending; the first that, after simulation, yields a presented period
  fitting the beneficiary wins.
- Candidate change is `move-commitment` only. Reason includes `beneficiary` and `fit`.
- Skip any commitment whose `activityKey` is already used by a higher-precedence suggestion.
- Skip when the only alternative equals the current period or creates a new overlap.

---

## 6. Ordering and deduplication

```ts
export function compareSuggestions(
  a: PlanningSuggestion,
  b: PlanningSuggestion,
): number
```

Order:
1. `categoryRank` ascending (conflict, deadline slot, other slot, flexible).
2. `dueRank` ascending (overdue, today, future, none).
3. For future due dates, earliest date first.
4. `priorityRank` ascending (high, medium, low).
5. `proposedStartMinutes` ascending.
6. `sourceOrder` ascending.
7. `suggestionId` lexical ascending.

Deduplication runs before ordering and keeps the first in the above order:
- Same `activityKey` → one.
- Same `activityKey + changeSignature` → one.

---

## 7. Application contract

The controller calls the supplied adapters; it never writes storage directly.

```ts
export interface SuggestionApplier {
  applyTaskSlot(input: {
    taskId: string
    startTime: string // 'HH:mm'
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
```

Controller guarantees before calling an adapter:
- Recompute current candidates and confirm the target still exists, is still eligible, and the
  proposed change still satisfies every non-weather constraint. Do **not** require the recomputed
  candidate list to contain the same `suggestion.id`: a weather refresh or weather becoming
  unavailable may change which period would be chosen now, but FR-033 requires the already-presented,
  still-fitting change to remain applicable and never be reversed automatically.
- Confirm duration and date are unchanged.
- Confirm start is not past, ends by 24:00, and is a valid `HH:mm`.
- For an adjusted start, compute conflicts against current entries; if any and not acknowledged,
  return `needs-acknowledgment` with the conflict titles instead of applying.
- Set `applyingId`, reject duplicate calls for the same or another suggestion, and clear it in a
  `finally`.
- On success, recompute, announce, and return `{ ok: true, appliedId }`.
- On failure, keep the suggestion and adjusted values, return `{ ok: false, code, retryable: true }`,
  and never mutate any store.

Stale cases that MUST return a refusal without applying: target completed, deleted, no longer
pending, duration changed, commitment changed to fixed or different date, task already scheduled
differently, proposed/adjusted time now in the past or overlapping a newly added fixed activity
without acknowledgment.

The success/failure values are exactly `SuggestionApplyOutcome` from `data-model.md` §8.2:
`{ ok: true, appliedId }` or `{ ok: false, code, retryable, conflicts }`. A `needs-acknowledgment`
outcome carries every conflicting title and range; every failure is retryable unless the target has
become ineligible, and every failure guarantees zero store mutations.

---

## 8. Purity and boundary rules

- Pure `model/*` modules may import `entities/task`, `entities/commitment`, `entities/weather` (types
  and pure formatters), `shared/lib/*`, and `shared/config/suggestions`.
- Pure `model/*` modules may import **types only** from `features/agenda` public API
  (`AgendaEntry`, `TimeConflict`, `AvailablePeriod`, `AgendaDay`). No runtime agenda import.
- `model/useSuggestions.ts` may additionally import React and the clock helper; it must not write
  task or commitment storage.
- `model/dismissalSchema.ts` and `model/dismissalStorage.ts` may additionally import Zod and the
  existing `guestStore` helpers; they must not read or write task or commitment keys.
- `ui/*` may import React, i18n, shared UI, and its own model types.
- `widgets/SmartSuggestions` may import the feature's public UI and types; it must not import
  `features/suggestions/model/*`.
- `pages/HomePage` is the only place that composes agenda, tasks, commitments, weather, and
  suggestions.
