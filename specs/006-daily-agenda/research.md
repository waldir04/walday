# Phase 0 Research: Daily Agenda

**Feature**: `006-daily-agenda` | **Date**: 2026-11-15

Every item in the Technical Context is resolved. There is no `NEEDS CLARIFICATION` left. Each decision below records what was chosen, why, and what was rejected.

## R1. Where the task's planned slot is stored

**Decision**: Add optional `plannedDate` and `plannedStartTime` to the existing task record inside the `walday:tasks` envelope, bump the envelope from version 1 to 2, and register a `1 → 2` migration that passes existing tasks through unchanged.

**Rationale**: The slot is owned by exactly one task (FR-017), must be written atomically with any duration the scheduling flow adds (FR-058), and must disappear when the task is deleted. Storing it on the task makes those invariants structural instead of coordinated. The store already has versioning, read validation, quarantine, revision baseline, lock handling, and multi-tab reconciliation; the migration registry in `entities/task/model/storage.ts` already anticipates version transitions.

**Alternatives considered**:
- *Separate `walday:task-slots` key*: rejected. Two writes cannot be atomic, slots outlive deleted tasks, multi-tab reconciliation doubles, and FR-017's "exactly one slot" becomes an application convention instead of a record invariant.
- *New agenda entity with its own store*: rejected. It duplicates task identity and status, violating FR-060 (derive, never maintain a separate editable copy).
- *Deriving the slot from a due date*: prohibited by FR-011, FR-026, and spec 002 VR-005.

**Consequences**: Older builds see version 2 as `unsupported` and refuse to write, which is the existing safe behavior. The bump is documented in ADR 0010 and in `contracts/task-slot-storage.md`.

## R2. Slot shape and invariant

**Decision**: `plannedDate?: LocalDate` and `plannedStartTime?: LocalTime`, constrained as a pair: both present and valid, or both absent, and a present pair requires `estimatedMinutes`. No stored end time; the end is derived from `estimatedMinutes`.

**Rationale**: A stored end would duplicate derived data and drift after a duration change (spec edge case: duration changed outside the agenda). The pair constraint prevents half-scheduled tasks from entering the timeline or the unscheduled area. `LocalDate`/`LocalTime` reuse the existing validated formats, so no new date representation is introduced.

**Alternatives considered**:
- *Stored `plannedEndTime`*: rejected as denormalized state that must be recomputed and could contradict the duration.
- *Optional independent fields*: rejected because a lone `plannedDate` has no defined presentation and would create an ambiguous fourth state.

## R3. Layer placement of the derivation

**Decision**: Pure derivation lives in `features/agenda/model/`; `HomePage` composes the task and commitment controllers and calls `buildAgendaDay`.

**Rationale**: Principle III forbids direct imports between slices at the same layer. A new `entities/agenda` would need both `entities/task` and `entities/commitment`. `shared` may not hold business rules. A feature composing two entities is the canonical case the layer exists for. Pure functions in that slice are trivially unit-testable without React.

**Alternatives considered**:
- *`entities/agenda`*: rejected for the same-layer import violation.
- *Logic in `widgets/HomeDashboard`*: rejected; presentational widgets must not contain business rules (Principle V), and conflict logic must be testable independently.
- *Duplicating logic in `shared/lib`*: rejected; shared must not contain business rules.

## R4. Timeline ordering and tie-breaking

**Decision**: Ascending start minutes; on equal starts: category rank (fixed commitment, flexible commitment, task), then ascending end minutes, then locale-aware title comparison, then source id. The rank is exported and the timeline shows a localized ordering hint.

**Rationale**: FR-003 requires deterministic, consistent order and requires the visible category order to explain it. Using the same rank in the comparator and in the hint guarantees the explanation is true. Locale-aware title and id avoid unstable order across renders.

**Alternatives considered**:
- *Rank by category first, then time*: rejected; it breaks the primary chronological requirement.
- *Insertion-order tie-break*: rejected; it is not stable across reloads or data sources.

## R5. Conflict model

**Decision**: Compute pairwise intersections within the selected date with `startA < endB && startB < endA`, merge intersecting pairs into connected groups, and emit one conflict per group. Each entry stores a link per counterpart with the overlap interval. Boundary-touching periods produce no pair.

**Rationale**: FR-033 and the clarification require one conflict per connected group, so a three-way overlap counts once with three involved activities. Connected components via union-find over pairwise edges is `O(n²)` with a tiny constant for tens of activities and is far easier to verify than a sweep with group bookkeeping. Per-entry links satisfy FR-031/FR-032 without recomputation in the UI.

**Alternatives considered**:
- *One conflict per intersecting pair*: rejected; it double-counts three-way overlaps and contradicts FR-033.
- *Sweep-line segment grouping without a union step*: rejected as more intricate for no measurable gain at this scale.

## R6. Availability computation

**Decision**: Clip all entry intervals to the selected day, union them into occupied blocks, invert to gaps, keep gaps of at least 30 minutes, and sum only those gaps. For the current date the lower bound is the current local minute rounded up to the next whole minute; for past dates the result is `past-date` with no periods; when a source is incomplete the result is `incomplete-sources`.

**Rationale**: FR-037 to FR-043 and SC-004 require exactly this arithmetic, including the inclusive 30-minute threshold and union treatment of overlaps. Rounding the current time up prevents presenting already-elapsed seconds as available (FR-041). Explicit result variants keep "no gaps", "past date", and "incomplete data" distinguishable in the UI instead of collapsing into an ambiguous empty list.

**Alternatives considered**:
- *Floor the current minute*: rejected; it advertises elapsed time, violating FR-041.
- *Continuous ticking*: explicitly not required by the spec; a minute-aligned refresh plus recompute on navigation and data change is enough.
- *Presenting availability from only the readable source*: rejected by FR-052 and SC-004 correctness.

## R7. Oversized slot (duration pushes past midnight)

**Decision**: Keep the stored slot unchanged. For display, clip the end to 24:00, mark `exceedsDayEnd`, occupy the period to the end of the day in conflict and availability math, and offer "Adjust time or duration" in the entry.

**Rationale**: FR-018 and SC-013 require exactly this and explicitly forbid silent correction. Clipping to the day boundary keeps every downstream computation within the single-day model without inventing an overnight activity, which the product declares out of scope.

**Alternatives considered**:
- *Hide the task*: rejected; it would lose an activity the user scheduled.
- *Auto-shorten the duration*: rejected as an unauthorized data change (FR-055–FR-057).
- *Allow an end after 24:00 in availability math*: rejected; it complicates every downstream range comparison for no user value.

## R8. Unscheduled set

**Decision**: Pending tasks with no `plannedDate` at all. A task with a slot on any date is excluded from every date's unscheduled area, and completed tasks are excluded entirely.

**Rationale**: FR-009, FR-013, and the clarification fix this definition. Deriving from `plannedDate` alone keeps the rule stable when the user navigates dates. Ordering reuses `orderedTasks`/`sortTasks` from the task entity so the agenda matches Task Management (FR-012).

**Alternatives considered**:
- *Include tasks planned on other dates*: rejected by the clarification.
- *Filter by due date on the selected day*: rejected by FR-011.

## R9. Scheduling validation and conflict acknowledgment

**Decision**: A strict Zod draft schema plus explicit validation codes; validation covers start-time format, task eligibility (exists, pending), duration within the existing 1–1440 range, and end not past 24:00. Conflicts are evaluated against the current day before saving; if any exist, the dialog lists each conflicting activity with its time range and requires an explicit acknowledgment checkbox/confirmation before the mutation runs. Declining cancels with no write and preserves the draft.

**Rationale**: FR-019 to FR-023 require a duration prompt, rejection of past-midnight periods, and acknowledgment without automatic movement. Reusing the existing duration constants keeps the same limits as Task Management. Separating "validate" from "acknowledge" keeps the mutation atomic and the decline path side-effect free.

**Alternatives considered**:
- *Block overlapping schedules*: rejected; Daily Commitments treats overlap as advisory and FR-023 requires the acknowledged conflict to remain.
- *Warn after saving*: rejected; FR-021 requires the acknowledgment before saving.
- *Silent duration default*: rejected; FR-019 requires the user's explicit value.

## R10. Storage-state parity with Task Management

**Decision**: Scheduling calls the existing `runMutation` in `useTasks`. Availability of scheduling is derived from the same state Task Management uses (`pending` and `externalChange`), and the same notices and links are reused. When a source is incomplete (quarantine, `recovery-blocked`, `protected`, `unsupported`, `unavailable`), the agenda stays readable, labels the overview incomplete, and withholds conflict and availability results as complete.

**Rationale**: FR-053 and SC-014 demand exact parity and no action that can only fail. Reusing the single mutation path makes divergent policies impossible. Withholding derived results when a source is missing prevents presenting a wrong available-time total (FR-052).

**Alternatives considered**:
- *Separate agenda storage policy*: rejected; it would drift from Task Management.
- *Disabling scheduling in memory-only mode*: rejected; Task Management allows session-only task changes with a warning, and FR-053 requires parity.

## R11. Selected date state

**Decision**: Keep the selected date in the `?date=YYYY-MM-DD` search parameter, validated on read, defaulting to the local today. Previous/next/today and the date input update that parameter.

**Rationale**: It matches the commitments page's viewed-date pattern, keeps the date shareable and preserved across reloads, and lets navigation updates be announced without duplicating state between a hook and the URL. Invalid or missing values fall back to today rather than throwing.

**Alternatives considered**:
- *Component state only*: rejected; it loses position on reload and diverges from the existing commitments pattern.
- *Path segment `/day/:date`*: rejected; it adds a route for what is still Home (spec: no new destination).

## R12. Current-time source

**Decision**: A small `useNow` hook in `shared/lib` returns the current time, refreshes on `visibilitychange` and on a minute-aligned interval only while the selected date is today, and is not used elsewhere.

**Rationale**: FR-041 and FR-044 require trimming availability to the remaining day and recomputing when the view changes. A minute-aligned, visibility-aware clock avoids per-second renders while keeping "remaining time" honest for a session left open. It is a non-network side effect, permitted by Principle XVII.

**Alternatives considered**:
- *Per-render `new Date()`*: rejected; a long-open tab would show stale availability indefinitely.
- *One-second timer*: rejected as unnecessary render cost.
- *Global clock store*: rejected as a parallel store for a trivial value.

## R13. No new dependency

**Decision**: Use `Intl` through the existing `shared/lib/localDateTime.ts`, existing Zod, existing React Router search params, and existing Tailwind tokens and primitives.

**Rationale**: Principle XX requires justification for any new runtime dependency; nothing here needs one. Date arithmetic is limited to day shifts and minute math, both of which are a few lines.

**Alternatives considered**: date libraries (explicitly prohibited by the constitution), a drag-and-drop library (drag-and-drop is out of scope), a calendar component kit (styling is Tailwind-only).

## R14. Loading state without async reads

**Decision**: Make the Home route lazy with an `AgendaSkeleton` fallback that matches the final agenda layout, and keep the agenda's own data path synchronous.

**Rationale**: Guest storage reads are synchronous, so there is no data-fetch latency to represent; the only real wait is the route chunk. A layout-matched skeleton satisfies FR-051 and Principle VI without inventing fake loading or shifting layout, and the pattern already exists for the other routes. The skeleton is `aria-hidden` while the region announces `aria-busy`.

**Alternatives considered**:
- *Spinner*: prohibited by Principle VI.
- *Skeleton on every mutation*: rejected; mutations already expose pending states on their controls and a full skeleton would flicker.

## R15. Reusing date navigation instead of duplicating it

**Decision**: Extract the local-date day-shift helper into `shared/lib/localDateTime.ts` and add a presentation-neutral `shared/ui/DateNav.tsx` with labels passed as props; both the commitments page and the agenda use it.

**Rationale**: The agenda needs identical previous/next/today/direct-date behavior, and copying `CommitmentDateNav` would duplicate logic that the constitution asks to consolidate when the area is touched. Keeping labels as props keeps the shared primitive free of feature copy while i18n stays in each slice.

**Alternatives considered**:
- *Copy the commitments component into the agenda slice*: rejected as duplication.
- *Import the commitments component into the agenda feature*: prohibited same-layer feature import.

## R16. Announcements and i18n

**Decision**: One `agenda` namespace with English and Spanish resources; `DailyAgenda` renders one polite live region, and `HomePage` supplies its message so date changes with activity counts, the conflict summary, availability totals, and schedule outcomes are announced. Success announcements come from the agenda, not from the task notice region, so nothing is announced twice.

**Rationale**: FR-047, FR-064, FR-068, and FR-027 require announcements without duplication; Principle XIV requires externalized copy and `Intl` formatting. Keeping one region per agenda avoids competing announcements while still separating the timeline and unscheduled regions semantically.

**Alternatives considered**:
- *Reusing the tasks notice region*: rejected; Home does not render it and it resolves keys in another namespace, which would produce duplicate or missing text.
- *`aria-live` on every row*: rejected as excessive announcement noise.
