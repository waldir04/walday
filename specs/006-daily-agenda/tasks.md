---

description: "Atomic task list for the Daily Agenda feature"
---

# Tasks: Daily Agenda

**Feature**: `006-daily-agenda` | **Branch**: `006-daily-agenda` | **Date**: 2026-11-15

**Input**: `specs/006-daily-agenda/plan.md`, `spec.md`, `data-model.md`, `research.md`, `quickstart.md`, `contracts/agenda-domain.md`, `contracts/task-slot-storage.md`, `contracts/ui-contracts.md`, `.specify/memory/constitution.md`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included. Constitution Principle VII is non-negotiable ("No task is complete without the relevant tests written and passing") and plan.md Workstream 5 defines the required suites. Test tasks are inside the story they verify.

**Organization**: Tasks are grouped by user story so each story is independently implementable and testable. All paths are repository-relative; the frontend root is `frontend/`.

**Format**: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: different files, no dependency on an incomplete task
- **[Story]**: US1–US4 from `spec.md`; setup, foundational, and polish tasks carry no story label

## Path Conventions

Existing Feature-Sliced Design SPA: `frontend/src/{app,pages,widgets,features,entities,shared}`, tests in `frontend/tests/`. No backend, no new dependency, no new storage key.

## Cross-Cutting Rules Binding Every Task

- No `any`, no unjustified assertions, no suppression comments; `verbatimModuleSyntax` and `noUncheckedIndexedAccess` stay satisfied.
- No raw `localStorage` access outside `frontend/src/entities/task/model/storage.ts` and the `useTasks` controller.
- No new runtime dependency (Principle XX); only `Intl`, existing Zod, existing React Router, existing Tailwind tokens and primitives.
- No user-facing string hardcoded in a component; every key exists in both `en` and `es`.
- FSD: `features/agenda` imports only `entities/*` and `shared/*`; never another feature.
- Tests control time deterministically (`now` injected) and never touch the network.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Decisions, shared constants, shared date/clock helpers, and the i18n namespace all workstreams build on.

- [x] T001 Write ADR `docs/adr/0010-agenda-owned-task-slot.md`: record that the task slot is two optional fields on the `walday:tasks` record, why a separate `walday:task-slots` key was rejected (atomicity, orphan slots, duplicate reconciliation), the 1 → 2 envelope migration with `unsupported` rejection for newer versions, and that Task Management operations never write a slot.
- [x] T002 [P] Create `frontend/src/shared/config/agenda.ts` exporting `AVAILABLE_GAP_MINUTES = 30`, `DAY_START_MINUTES = 0`, `DAY_END_MINUTES = 1440`, and `AGENDA_DATE_PARAM = 'date'`; no component may hardcode 30, 1440, or the `date` query key (Principle XI).
- [x] T003 [P] Extend `frontend/src/shared/lib/localDateTime.ts` with `shiftLocalDate(date: LocalDate, days: number): LocalDate` (calendar-safe across month/year boundaries, no UTC conversion) and `minuteOfDayRoundedUp(now: Date): number` (0–1440, rounded up to the next whole minute); keep all existing exports and behavior unchanged.
- [x] T004 [P] Register the `agenda` namespace: create `frontend/src/shared/i18n/locales/en/agenda.json` and `frontend/src/shared/i18n/locales/es/agenda.json` as `{}`, import them and add `'agenda'` to `namespaces` and to both `resources` language maps in `frontend/src/shared/i18n/index.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The persisted slot, its storage migration, and the mutation entry points every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Add the optional slot pair to `frontend/src/entities/task/model/types.ts`: `plannedDate?: LocalDate` ("Optional. Must be a real calendar date. Present if and only if `plannedStartTime` is present.") and `plannedStartTime?: LocalTime` ("Optional. Present if and only if `plannedDate` is present.") on `Task` and `StoredTask` (import `LocalTime` from `@/shared/lib/localDateTime`), plus `export interface ScheduleSlot { plannedDate: LocalDate; plannedStartTime: LocalTime; estimatedMinutes: number }` (matching `contracts/agenda-domain.md`) and the new `TaskRecordValidationCode` members `SLOT_DATE_INVALID`, `SLOT_TIME_INVALID`, `SLOT_INCOMPLETE`, `SLOT_DURATION_REQUIRED`. Task form field types are unchanged; slot validation errors use the schedule-draft contract, not `TaskFieldError`.
- [x] T006 Extend `frontend/src/entities/task/model/schema.ts`: add `plannedDate` validated by the existing `isLocalDate` predicate and `plannedStartTime` validated by the shared `isLocalTime` predicate, both `.optional()`, keep `.strict()`, and add `.superRefine` cross-field rules rejecting a record where exactly one of the pair is present and a record whose pair is present without `estimatedMinutes`. `estimatedMinutes` keeps its existing `1–1440` integer range. Export the extended `taskSchema` unchanged in name and shape.
- [x] T007 Update `frontend/src/entities/task/model/validation.ts`: add `plannedDate` and `plannedStartTime` to `RECORD_KEYS`, validate both fields, map the four new failures to `SLOT_DATE_INVALID` (`plannedDate` present but not a real `YYYY-MM-DD`), `SLOT_TIME_INVALID` (`plannedStartTime` present but not a valid `HH:MM`), `SLOT_INCOMPLETE` (exactly one field present), and `SLOT_DURATION_REQUIRED` (pair present without `estimatedMinutes`) inside `validateStoredTask`, return the slot fields on the successful `value`, and keep the same `StoredTaskValidationResult` shape without throwing.
- [x] T008 Update `frontend/src/entities/task/model/sanitize.ts` so `sanitizeTaskRecords` keeps valid slot fields on the returned record and routes a record that fails any slot code through the existing per-record quarantine path (never silently strips a slot, never drops a readable record's other fields); confirm existing duplicate-id and unknown-field handling is unchanged.
- [x] T009 Change `frontend/src/shared/config/tasks.ts` to `export const TASKS_STORAGE_VERSION = 2 as const` and leave `TASKS_STORAGE_KEY` and `TASKS_LOCK_NAME` unchanged.
- [x] T010 Register the migration in `frontend/src/entities/task/model/storage.ts`: add `REGISTERED_MIGRATIONS[1]` returning the version 1 `tasks` array unchanged with an empty quarantine, set the envelope `version` to `TASKS_STORAGE_VERSION` on the next write, keep the legacy-array path followed by version 2 validation, and keep `detectedVersion > TASKS_STORAGE_VERSION` returning `{ kind: 'unsupported', detectedVersion }` with no read or write. Migration must never fabricate, clear, or guess a slot.
- [x] T011 Fix `updateTask` in `frontend/src/features/tasks/model/useTasks.ts` to carry `plannedDate` and `plannedStartTime` forward from the existing record while rebuilding the task from the `TaskDraft`; `createTask` must continue to produce records with no slot. `toggleTask` keeps the slot, `deleteTask` removes it with the record.
- [x] T012 Add `scheduleTask(id: string, slot: ScheduleSlot): Promise<boolean>` and `unscheduleTask(id: string): Promise<boolean>` to `frontend/src/features/tasks/model/useTasks.ts`, implemented through the existing `runMutation` path: `scheduleTask` validates the slot against the same schema pair and duration rule before writing (returning `false` with no write on failure), then sets `plannedDate`, `plannedStartTime`, and `estimatedMinutes` in one single-envelope write (validation always supplies a duration, reusing the task's own value when it already has one); `unscheduleTask` clears both pair fields; both return `false` on external change or `STORAGE_CONFLICT`, apply the existing session-only/quota fallback in memory with the existing notice keys, and never write from a component. Export both in the returned controller object and add its exported type.
- [x] T013 Write `frontend/tests/agenda-storage-migration.test.ts`: a realistic version 1 envelope loads with no task lost and no slot invented and is rewritten as version 2 after the next write; a legacy array maps and validates; a record with an invalid `plannedDate`, invalid `plannedStartTime`, exactly one pair field, or a slot pair without `estimatedMinutes` is quarantined while readable records load as `partial`; version 3 returns `unsupported`; `updateTask` preserves the slot; `toggleTask` preserves it; `deleteTask` removes it; `unscheduleTask` clears it; a refused write leaves the stored envelope byte-identical.
- [x] T014 [P] Create `frontend/src/shared/lib/useNow.ts`: a minute-aligned clock returning `Date`, refreshing on `visibilitychange` and on a timer aligned to the next whole minute, starting/stopping the timer through the hook lifecycle, with the clock injectable for tests; no global store, no per-second interval.

**Checkpoint**: Task records persist an optional slot atomically, old data migrates, and every mutation inherits Task Management's storage-state policy.

---

## Phase 3: User Story 1 - See the whole day in one chronological agenda (Priority: P1) 🎯 MVP

**Goal**: Home renders one chronological timeline of fixed commitments, flexible commitments, and scheduled tasks, plus a separate unscheduled area for every pending task with no slot on any date.

**Independent Test**: Seed a day with two commitments, two scheduled tasks, and pending tasks without slots; open Home and confirm every activity appears exactly once in ascending start-time order with title, time range, text category, and task completion status, while unscheduled tasks stay outside the timeline in Task Management order.

### Implementation for User Story 1

- [x] T015 [P] [US1] Create `frontend/src/features/agenda/model/constants.ts`: `AGENDA_CATEGORIES = ['fixed-commitment', 'flexible-commitment', 'task'] as const`, `AGENDA_CATEGORY_RANK: Readonly<Record<AgendaCategory, number>>` with fixed `0`, flexible `1`, task `2`, and `AGENDA_ENTRY_KEY_SEPARATOR = ':'`; re-export `DAY_START_MINUTES`, `DAY_END_MINUTES`, and `AVAILABLE_GAP_MINUTES` from `frontend/src/shared/config/agenda.ts` instead of redefining them.
- [x] T016 [P] [US1] Create `frontend/src/features/agenda/model/types.ts` with the agenda-domain contract: `AgendaCategory`; `ConflictLink { entryKey, title, category, overlapStartMinutes, overlapEndMinutes }`; `AgendaEntry` as a discriminated union over `AgendaEntryBase { key, sourceId, title, startMinutes /* 0..1439 */, endMinutes /* 1..1440; 1440 = end of day */, conflicts, exceedsDayEnd }` with the task variant adding `status: TaskStatus` and `priority: Priority`; `TimeConflict { id, entryKeys, activityCount, startMinutes, endMinutes, adjustableKeys }`; `AvailablePeriod { startMinutes, endMinutes }` (documented constraint `endMinutes - startMinutes >= 30`); `AvailabilityResult` (`available` with `periods`/`totalMinutes` or `none` with `reason: 'past-date' | 'incomplete-sources'`); `AgendaSourcesState = 'complete' | 'incomplete'`; `AgendaDay { date, entries, unscheduledTasks, conflicts, availability, timelineEmpty, hasAnyActivity }`; `BuildAgendaDayInput { date, tasks, commitments, now, locale, sources }`.
- [x] T017 [P] [US1] Create `frontend/src/features/agenda/model/timeOfDay.ts`: `minutesFromTime(time: LocalTime): number` for `00:00`–`23:59`; `clampDayEnd(startMinutes: number, durationMinutes: number): { endMinutes: number; exceedsDayEnd: boolean }` returning `1440` and `true` when the sum exceeds the day; `minutesToTimeLabel(minutes: number, locale: string, endOfDayLabel: string): string` using the existing `formatLocalTime` below 1440 and `endOfDayLabel` at 1440 so no invalid `HH:MM` is ever rendered; `formatMinuteDuration(minutes, locale)` delegating to the existing `formatDuration`.
- [x] T018 [US1] Create `frontend/src/features/agenda/model/ordering.ts`: `compareAgendaEntries(a, b, locale)` ordering by `startMinutes` ascending, then `AGENDA_CATEGORY_RANK[category]`, then `endMinutes` ascending, then `title.localeCompare(other, locale)`, then `key`; `sortAgendaEntries(entries, locale)` returning a new array. Comparator and the UI ordering hint must both read `AGENDA_CATEGORY_RANK` so they cannot disagree (FR-003).
- [x] T019 [US1] Create `frontend/src/features/agenda/model/slot.ts`: `isScheduled(task)` (`plannedDate !== undefined`), `isUnscheduledPending(task)` (`status === 'pending' && plannedDate === undefined`), `buildTaskEntry(task)` producing the task entry with `key` equal to `'task:' + task.id`, minutes from `plannedStartTime`, and `endMinutes`/`exceedsDayEnd` from `clampDayEnd`; `selectScheduledTasks(tasks, date)` (`plannedDate === date`, pending or completed); `selectUnscheduledTasks(tasks)` filtered by `isUnscheduledPending` and ordered with the existing `sortTasks` from `frontend/src/entities/task/model/ordering.ts` (FR-009, FR-012, FR-013, FR-018).
- [x] T020 [US1] Create `frontend/src/features/agenda/model/agendaDay.ts`: `buildAgendaDay(input: BuildAgendaDayInput): AgendaDay` filtering commitments by `commitment.date === date` into entries whose `key` is `'fixed-commitment:'` or `'flexible-commitment:'` concatenated with the commitment id using `AGENDA_ENTRY_KEY_SEPARATOR` (so two entries can never share a key), with times converted by `minutesFromTime` and never adjusted (FR-007, FR-008), adding scheduled task entries, computing `unscheduledTasks`, `timelineEmpty`, and `hasAnyActivity`, and returning entries already ordered by `sortAgendaEntries`. When `sources === 'incomplete'` return `conflicts: null` and `availability: { kind: 'none', reason: 'incomplete-sources' }`. Interim: when `sources === 'complete'`, return `conflicts: []` and `availability: { kind: 'available', periods: [], totalMinutes: 0 }`; Phase 4 replaces both with `deriveConflicts`/`deriveAvailability`. Pure: no storage, no React, no mutation of inputs.
- [x] T021 [US1] Create `frontend/src/features/agenda/ui/AgendaEntryRow.tsx` per `contracts/ui-contracts.md` §4: title, `tabular-nums` time range via `minutesToTimeLabel`, trailing token-only category pill (`tag-border`/`tag-text`), muted secondary line with "Completed"/"Pending" for tasks, the task's priority label, and the oversize warning, accessible name `"{Category}: {title}, {start} to {end}, {completion status if task}, conflicts with {titles and ranges}, planned period exceeds the end of the day {if applicable}"`, and no edit/delete control (FR-004, FR-005, FR-006, FR-062, FR-076). Scheduling actions arrive in Phase 5; render the row without them here. Task priority labels reuse the existing `tasks.priorityOptions` keys.
- [x] T022 [US1] Create `frontend/src/features/agenda/ui/AgendaTimeline.tsx`: `<section aria-labelledby>` region named "Timeline for {date}", the always-visible ordering hint sentence derived from `AGENDA_CATEGORY_RANK`, the ordered rows, and the empty-timeline message when `entries.length === 0` (FR-003, FR-065).
- [x] T023 [US1] Create `frontend/src/features/agenda/ui/AgendaUnscheduledList.tsx`: separate labeled region "Unscheduled tasks" that states these tasks have no assigned time, renders tasks from the `Task` record as-is (title, priority, optional due date, completion status) in the received order, never nested in the timeline region, always rendered even when the timeline is empty (FR-009, FR-010, FR-065).
- [x] T024 [US1] Create `frontend/src/features/agenda/ui/AgendaEmptyState.tsx` and `frontend/src/features/agenda/ui/AgendaIncompleteNotice.tsx`: the empty state explains nothing is scheduled for the date, and the incomplete notice states the overview is incomplete because not all data could be read, without presenting conflicts or availability as complete (FR-052). Wire the create-commitment/create-task actions and no-pending-tasks copy in Phase 6.
- [x] T025 [US1] Create `frontend/src/features/agenda/ui/AgendaLiveRegion.tsx`: a single `<div role="status" aria-live="polite" aria-atomic="true">` that renders a message only when it changes, is not focusable, and replaces its text on every new message so no announcement is duplicated (FR-068).
- [x] T026 [US1] Create `frontend/src/features/agenda/ui/DailyAgenda.tsx` with the `DailyAgendaProps` from `contracts/ui-contracts.md` §2, including `liveMessage: string | null`. It renders the timeline, the unscheduled region, and the single live region fed by `liveMessage`, in the documented order; date navigation arrives in Phase 6, and the conflict summary and availability in Phase 4. The page heading stays in `HomeDashboard` and the storage/recovery and incomplete notices stay in `HomePage`. `DailyAgenda` announces nothing on its own; the page owns every message so nothing is announced twice. No conflict summary or availability yet.
- [x] T027 [US1] Create the slice public API: `frontend/src/features/agenda/index.ts` re-exporting `DailyAgenda` and its props plus the model types/helpers, and `frontend/src/features/agenda/controller.ts` as the narrow Home entry re-exporting only the agenda types, `buildAgendaDay`, and date helpers, with a comment explaining that Home consumes the narrow entry. T056 later adds `useAgendaDate` to this same narrow entry.
- [x] T028 [US1] Rewrite `frontend/src/pages/HomePage.tsx` as the only container: read `useTasks()` from `@/features/tasks/controller` and `useCommitments()` from `@/features/commitments/controller`, derive the selected local date with `getLocalToday()` (URL state arrives in Phase 6), compute `sources` as `'complete'` only when both controllers report a trusted state (a source is incomplete when `quarantine !== null`, `unsupported === true`, `mode` is `recovery-blocked` or `protected`, or the commitments controller is not `ready`), call `buildAgendaDay` directly (memoization is T065), render the existing storage/recovery notices with their existing retry/discard actions and links plus `AgendaIncompleteNotice` when `sources === 'incomplete'`, and pass data plus the agenda callbacks (`onOpenTasks`, `onOpenCommitments`, `onCreateTask`, `onCreateCommitment`) to `HomeDashboard`. Viewing must mutate nothing (FR-001, FR-014, FR-052, FR-053, SC-008).
- [x] T029 [US1] Recompose `frontend/src/widgets/HomeDashboard.tsx`: replace the `todayCommitments`, `tasks`, and `taskCounts` props and the rendered commitments list/task summary with an `agenda: ReactNode` slot rendered after `WeatherCard` and `SmartSuggestions`; replace `todayLabel` with a localized `selectedDateLabel` so the heading always shows the selected date. Keep the heading as the route's `h1`, keep the weather and suggestion surfaces, and keep the heading/date region's structure. Presentational only — no derivation or controller access in the widget (Principle V, FR-015).
- [x] T030 [US1] Write `frontend/tests/agenda-model.test.ts` covering entry construction (commitments on the date only, scheduled tasks on the date only), deterministic ordering including equal-start category rank, equal-start/equal-category end-minute and locale-title tie-breaks, two equal-start tasks whose differing priorities do not affect their order (FR-006), `endMinutes = 1440` with `exceedsDayEnd` for an oversize slot, unscheduled selection excluding completed tasks and tasks with a slot on another date, a pending task whose due date matches the selected date remaining unscheduled with no time assigned (FR-011), unscheduled tasks following `sortTasks` order (FR-012), `hasAnyActivity`/`timelineEmpty`, `shiftLocalDate` across month and year boundaries with no UTC shift, and a 100-activity derivation smoke test within a generous performance budget (SC-001, SC-002).
- [x] T031 [P] [US1] Write `frontend/tests/agenda-timeline.test.tsx` with React Testing Library: categories rendered as text, `tabular-nums` time ranges, the visible ordering hint naming fixed commitments, flexible commitments, then tasks, completion stated in text, task priority stated in text (FR-006), committed start/end values unchanged, a completed scheduled task remaining at its time position, unscheduled area rendered outside the timeline region with no implied time and in Task Management order, empty-timeline-with-tasks state, and no edit/delete controls present.
- [x] T032 [P] [US1] Write `frontend/tests/agenda-no-network.test.ts` asserting the agenda slice and `HomePage` perform no `fetch`, `XMLHttpRequest`, or network-module import, mirroring the existing `commitments-no-network.test.ts` approach.
- [x] T033 [P] [US1] Add the US1 keys to `frontend/src/shared/i18n/locales/en/agenda.json` and `es/agenda.json`: headings (timeline, unscheduled), ordering hint, category labels, entry metadata (completed, pending, time-range separator, end-of-day label, oversize warning), unscheduled heading and no-assigned-time statement, empty timeline message, incomplete-overview notice. Reuse the existing `tasks.priorityOptions` keys for priority text instead of duplicating them. No component string literal remains.

**Checkpoint**: US1 is independently functional — Home shows the chronological agenda and the unscheduled area with zero changes to stored data.

---

## Phase 4: User Story 2 - Understand conflicts and available time at a glance (Priority: P2)

**Goal**: The agenda derives and presents conflict groups and available periods exactly as calculated, changing nothing.

**Independent Test**: Build days with boundary-touching, partially overlapping, fully contained, identical, and three-way overlapping activities plus days with 29- and 30-minute gaps; verify one conflict per connected group, every counterpart named with its overlap range, 30-minute gaps listed, 29-minute gaps omitted, totals equal to the listed periods, today trimmed to the current minute, and past dates with no availability.

### Implementation for User Story 2

- [x] T034 [P] [US2] Create `frontend/src/features/agenda/model/conflicts.ts` implementing `deriveConflicts(entries): { conflicts: TimeConflict[]; entries: AgendaEntry[] }` per `contracts/agenda-domain.md`: edge only when `startA < endB && startB < endA` (boundary-touching excluded, FR-029), groups as connected components of the pair graph with union-find or an equivalent deterministic merge, exactly one `TimeConflict` per group (three-way overlap = one group of three, FR-033), `id` from the smallest member key, members ordered by entry order, `adjustableKeys` for flexible commitment members, and per-entry `ConflictLink` listing every counterpart with its pairwise overlap interval. Return the originals with empty lists when there are no edges. Never mutate inputs (FR-028–FR-036).
- [x] T035 [P] [US2] Create `frontend/src/features/agenda/model/availability.ts` implementing `deriveAvailability({ entries, date, today, nowMinutes, sources })` per `contracts/agenda-domain.md` and data-model §6: past date returns `{ kind: 'none', reason: 'past-date' }` before any other check; `sources === 'incomplete'` returns `{ kind: 'none', reason: 'incomplete-sources' }`; lower bound is `nowMinutes` for today and `0` for future dates, upper bound `1440`; merge overlapping and touching occupied intervals clipped to the day; invert to gaps; keep only gaps with `endMinutes - startMinutes >= AVAILABLE_GAP_MINUTES` (30 inclusive, 29 excluded); `totalMinutes` sums presented periods only; never assigns anything (FR-037–FR-044).
- [x] T036 [US2] Replace the interim values in `frontend/src/features/agenda/model/agendaDay.ts`: call `deriveConflicts` for ordered entries and `deriveAvailability` with `today = getLocalToday(now)` from `frontend/src/shared/lib/localDateTime.ts` and `nowMinutes = minuteOfDayRoundedUp(now)`; return `conflicts: null` and the incomplete availability variant when `sources === 'incomplete'`, and `[]`/`available` when no group exists. Conflict detection stays confined to the selected date (FR-030) and must not alter any entry time (FR-035).
- [x] T037 [P] [US2] Create `frontend/src/features/agenda/ui/AgendaConflictSummary.tsx`: `<section aria-labelledby>` named "Conflicts for {date}", one line per group ("Conflict {n}: {count} activities — {titles with ranges}"), the total conflict and involved-activity counts, the adjustable label for flexible members, nothing rendered when there are no conflicts, and no action that resolves, moves, or applies anything (FR-033, FR-034, FR-036).
- [x] T038 [P] [US2] Create `frontend/src/features/agenda/ui/AgendaAvailability.tsx` with `AvailablePeriodRow` per `contracts/ui-contracts.md` §6: `<section aria-labelledby>` named "Available time for {date}", "Available {start} – {end}" rows with accessible name "Available and unassigned: {start} to {end}", "Total available: {duration}" from the existing duration formatter, and the four documented empty/past/incomplete states. Periods are text only: no button, link, or assignment affordance (FR-039, FR-040, FR-063).
- [x] T039 [US2] Wire `AgendaConflictSummary` and `AgendaAvailability` into `frontend/src/features/agenda/ui/DailyAgenda.tsx` in the documented order (conflict summary, timeline, availability, unscheduled; T058 later inserts date navigation ahead of the conflict summary), render nothing for the summary when `conflicts` is `null` or empty, pass `isToday` to availability, and stay announcement-free: `HomePage` (T050, T058) derives the date, conflict, and availability message from `day` and feeds `liveMessage` (FR-064, FR-068).
- [x] T040 [US2] Extend `frontend/tests/agenda-model.test.ts` with every SC-003 shape (partial overlap, containment, identical periods, two independent overlaps, three-way connected group counted once with each entry naming both counterparts, task against commitment, chain with no conflict, activities on different dates with intersecting clock times producing no conflict), every SC-004 case (29 vs 30 minutes, merged overlaps, touching intervals merged for occupancy, today lower-bound trimming, past date, incomplete sources), and an oversize slot occupying time until 1440 in both conflict and availability results (FR-018, FR-030, SC-013).
- [x] T041 [P] [US2] Write `frontend/tests/agenda-conflicts.test.tsx`: conflict text on each involved row names every counterpart and range, summary counts one per group and how many activities each involves, flexible commitment labeled adjustable, no stored data changed by rendering (assert the storage snapshot is unchanged), and boundary-touching activities report nothing.
- [x] T042 [P] [US2] Write `frontend/tests/agenda-availability.test.tsx`: listed periods and total equality, no period under 30 minutes, today starts at the current minute (injected clock), future date starts at 00:00, past date shows the past-date explanation, incomplete sources show the incomplete explanation, and periods expose no action.
- [x] T043 [P] [US2] Add the US2 keys to `frontend/src/shared/i18n/locales/en/agenda.json` and `es/agenda.json`: conflict indicator line, adjustable label, conflict summary line and totals, availability period label, total label, no-gap states for today and future, past-date state, incomplete state, unassigned label, and the conflict/availability announcements.

**Checkpoint**: US1 and US2 both work independently; every conflict and available period matches an independent manual calculation with no data change.

---

## Phase 5: User Story 3 - Place a pending task into the day and take it back out (Priority: P3)

**Goal**: The user explicitly schedules a pending task at a start time on any date, moves that slot, or removes it, with duration prompting, conflict acknowledgment, and no other change.

**Independent Test**: Schedule a pending task, verify its derived end time and timeline position; move it; remove the schedule and confirm it returns to the unscheduled area unchanged; attempt a past-midnight period and confirm rejection; attempt an overlapping time and confirm the acknowledgment gate and the decline path.

### Implementation for User Story 3

- [x] T044 [P] [US3] Create `frontend/src/features/agenda/model/scheduleDraft.ts`: strict `scheduleDraftSchema` with `ScheduleDraft { taskId, date, startTime, durationInput, acknowledgedConflicts }`; `validateScheduleDraft(draft, { tasks, day, date })` returning `{ ok: true, slot, conflicts }` or `{ ok: false, errors }`; codes exactly `START_TIME_REQUIRED`, `START_TIME_INVALID`, `DURATION_REQUIRED`, `DURATION_INVALID`, `DURATION_OUT_OF_RANGE`, `END_NOT_AFTER_START`, `ENDS_AFTER_MIDNIGHT`, `TASK_NOT_FOUND`, `TASK_NOT_PENDING`, `CONFLICTS_NOT_ACKNOWLEDGED`; duration from the task when present, otherwise `durationInput` parsed by the existing `parseDurationInput` within `1–1440`; any valid calendar date accepted including past dates; conflicts computed against the proposed span with each existing entry's range using the same overlap rule as `deriveConflicts`; pure and side-effect free (FR-016, FR-019–FR-022, FR-025).
- [x] T045 [P] [US3] Create `frontend/src/features/agenda/ui/ScheduleTaskDialog.tsx` per `contracts/ui-contracts.md` §8: native `<dialog>` with `showModal()`, the existing `useDialogFocusTrap`, Escape and explicit cancel, focus returned to the invoking control, read-only date text, `type="time"` start input, duration input only when the task has none, derived end-time preview, field errors linked with `aria-describedby` plus a visible error summary, a conflict list from `conflictsFor` using the same overlap rule as `deriveConflicts`, the explicit "I understand these activities overlap" checkbox that disables confirm until checked and is cleared whenever the start time changes, one `onConfirm` call guarded by `pending`, close on success only, and draft preservation with the failure message when `onConfirm` returns `false` (FR-021, FR-022, FR-027).
- [x] T046 [P] [US3] Create `frontend/src/features/agenda/ui/RemoveScheduleDialog.tsx` using the existing `frontend/src/shared/ui/ConfirmDialog.tsx`: states in plain language that only the schedule is removed and the task is kept, closes on success only, and returns focus to the row action (FR-024).
- [x] T047 [US3] Add scheduling actions to `frontend/src/features/agenda/ui/AgendaEntryRow.tsx` using the existing `RowActions` behavior (revealed on hover and keyboard focus without layout shift, persistently available on coarse pointers and narrow viewports with 44 px targets): "Change time" and "Remove schedule" for a scheduled entry, plus "Adjust time or duration" when `exceedsDayEnd`; render no scheduling action for a completed task (FR-025, FR-055, FR-067).
- [x] T048 [P] [US3] Add the "Schedule" action to `frontend/src/features/agenda/ui/AgendaUnscheduledList.tsx` for each pending task, disabled with the plain reason from `scheduling.reasonKey` when `scheduling.enabled` is `false`, passing the selected date to the dialog (FR-016, FR-053).
- [x] T049 [US3] Update `frontend/src/features/agenda/ui/DailyAgenda.tsx` to thread `scheduling: { enabled, reasonKey }`, `pending`, `onSchedule`, `onAdjust`, and `onUnschedule` to the timeline and unscheduled regions, matching `contracts/ui-contracts.md` §4 and §7, and disable all scheduling actions while a mutation is pending. `DailyAgenda` stays presentational: it must not call the controllers.
- [x] T050 [US3] Implement the scheduling use case in `frontend/src/pages/HomePage.tsx`: own dialog state (`create`/`move`, task id, initial start time and duration), call `validateScheduleDraft`, open `ScheduleTaskDialog` or `RemoveScheduleDialog`, invoke `scheduleTask`/`unscheduleTask` exactly once on confirm, set `liveMessage` (the `DailyAgenda` prop from T026) with the created/moved/removed success or the failure copy, keep the draft and the previous slot on `false`, and derive `scheduling.enabled` with the same policy `runMutation` enforces: `true` in every persistence mode unless an external change is pending; session-only, quota, recovery-blocked, and protected modes stay enabled with the existing "changes may not be preserved" warning, and a detected external change disables scheduling with a plain explanation and a link to Task Management. Actions are additionally disabled while `pending`, so no action is offered that can only fail (FR-023, FR-027, FR-053, FR-057, FR-058, SC-014).
- [x] T051 [US3] Export `ScheduleTaskDialog`, `RemoveScheduleDialog`, and the schedule draft types from `frontend/src/features/agenda/index.ts`, keeping `frontend/src/features/agenda/controller.ts` narrow.
- [x] T052 [P] [US3] Write `frontend/tests/agenda-scheduling.test.tsx`: create with an existing duration, duration prompt and explicit save for a task without one, derived end display, move overwriting the same slot with no other activity changed, moving across dates showing the task only on the destination date and never in the origin date's unscheduled area, remove returning the task to the unscheduled area with title/priority/due date/status intact, `23:30` + 60 minutes rejected with no data change, missing or invalid time format, non-positive end, missing duration, non-existent task, and non-pending task each producing their documented validation code with no write, scheduling on a past date succeeding with no availability shown, completed task offering no scheduling action, pending state disabling actions, and failure preserving the draft and previous slot.
- [x] T053 [P] [US3] Write `frontend/tests/agenda-scheduling-conflicts.test.tsx`: confirm blocked until acknowledgment, every conflicting activity listed with its range, acknowledgment cleared after a start-time change, decline closing with no write and preserved values, acknowledged save leaving the conflict visible and nothing rescheduled, and an oversized entry offering "Adjust time or duration" without changing stored data.
- [x] T054 [P] [US3] Write `frontend/tests/agenda-storage-states.test.tsx`: in each storage state (normal, memory-only, recovery-blocked, protected, unsupported) and after a detected external change, scheduling availability matches what Task Management allows for the equivalent task change, the same notices are rendered, session-only scheduling is not presented as durable, and no scheduling control is enabled that can only fail; when a source is incomplete the incomplete-overview notice appears once, conflict and availability results are withheld, readable entries stay visible, and no storage write occurs from viewing or navigating (FR-052, FR-053, SC-008, SC-014).
- [x] T055 [P] [US3] Add the US3 keys to `frontend/src/shared/i18n/locales/en/agenda.json` and `es/agenda.json`: both dialog titles, field labels, duration hint, derived-end label, conflict acknowledgment label, confirm/cancel/pending/failure labels, all validation codes, scheduling actions, scheduling-unavailable explanation, and created/moved/removed/failure announcements.

**Checkpoint**: US1–US3 work independently; scheduling round-trips atomically and Task Management data is never modified beyond the slot and a prompted duration.

---

## Phase 6: User Story 4 - Navigate to any day, including days with nothing planned (Priority: P4)

**Goal**: The selected date lives in the URL, navigation works by pointer and keyboard, each date shows the right data and empty state, and today-only surfaces appear only for today.

**Independent Test**: Open Home and confirm today is selected; step backward and forward, jump to a distant date, return to today, reload and confirm the date persists; check a day with nothing at all, a day with only unscheduled tasks, a day with only scheduled entries, and confirm weather and suggestions appear only for today.

### Implementation for User Story 4

- [x] T056 [US4] Create `frontend/src/features/agenda/model/useAgendaDate.ts`: read and write the selected date in the `?date=YYYY-MM-DD` search parameter via React Router, validate with `isLocalDate`, fall back to `getLocalToday()` for missing or invalid values, and accept any valid date including past dates. Do not duplicate the day-shift arithmetic — use `shiftLocalDate`.
- [x] T057 [P] [US4] Create `frontend/src/features/agenda/ui/AgendaDateNav.tsx` per `contracts/ui-contracts.md` §3 on top of a new `frontend/src/shared/ui/DateNav.tsx` (previous, next, today, labeled native `type="date"` input; all labels passed as props; `rounded-lg`, minimum 44 px targets, `focus-visible` ring). Refactor `frontend/src/features/commitments/ui/CommitmentDateNav.tsx` to consume `shared/ui/DateNav` with its existing translation keys and delete its private `shiftDate` in favor of `shiftLocalDate` (no behavior change for the commitments page).
- [x] T058 [US4] Replace the local-date state in `frontend/src/pages/HomePage.tsx` with `useAgendaDate`, exported through `frontend/src/features/agenda/controller.ts` so Home keeps using the narrow entry, pass `onSelectDate` down, pass `selectedDateLabel` (formatted with `formatLocalDate`, the selected locale, and the date-style preference) to `HomeDashboard`, compute and set `liveMessage` so the newly selected date and its timeline entry count are announced once on change, and when they change, the conflict summary and availability total are announced once each without duplicates (FR-064, FR-068). Keep `?date=` updated on previous/next/today/direct selection. Focus stays where the user left it; navigation is fully keyboard operable (FR-045–FR-047).
- [x] T059 [US4] Gate today-only surfaces in `frontend/src/pages/HomePage.tsx` and `frontend/src/widgets/HomeDashboard.tsx` on `selectedDate === getLocalToday()`: render `WeatherCard` and `SmartSuggestions` only for today and omit them entirely, without placeholders, for any other date (FR-054).
- [x] T060 [US4] Complete the empty states in `frontend/src/features/agenda/ui/AgendaEmptyState.tsx`, `AgendaTimeline.tsx`, and `AgendaUnscheduledList.tsx`: a date with no activities of any kind explains nothing is scheduled and offers both a create-commitment and a create-task action in the same view, each navigating to the existing creation surface (FR-048, FR-059, SC-007); an empty timeline with pending tasks explains nothing is scheduled while keeping them visible; an unscheduled area with no pending tasks explains that and offers an "Open Tasks" action (FR-048–FR-050).
- [x] T061 [P] [US4] Create `frontend/src/features/agenda/ui/AgendaSkeleton.tsx` matching the final layout with `aria-hidden` on the skeleton, and `frontend/src/features/agenda/skeleton.ts` as its public entry; make Home lazy in `frontend/src/app/router.tsx` with a `Suspense` fallback of `AgendaSkeleton` and mark the timeline region `aria-busy="true"` during load (FR-051, Principle VI: no spinner).
- [x] T062 [P] [US4] Write `frontend/tests/agenda-date-nav.test.tsx`: today is selected on first load, `?date=` updates on previous/next/today/direct input and survives reload, invalid `?date=` falls back to today, each navigation announces the date and activity count once, conflict and availability changes are announced once, keyboard-only operation of every control, any date reachable in at most three interactions (SC-005), navigation performs no storage write (SC-008), and per-date data with no bleed between dates.
- [x] T063 [P] [US4] Update `frontend/tests/home-dashboard.test.tsx` for the agenda composition: the heading and date region show the selected date, the agenda slot renders after the weather and suggestions, weather and suggestions are present only for today, and no leftover commitments-list or task-summary assertions remain.
- [x] T064 [P] [US4] Add the US4 keys to `frontend/src/shared/i18n/locales/en/agenda.json` and `es/agenda.json`: date navigation labels, selected-date label, empty-day heading/explanation/create actions, timeline-empty and no-pending-tasks copy, date-changed announcement with activity count, and loading labels.

**Checkpoint**: All four stories are independently functional; the URL is the single source of the selected date.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T065 Memoize agenda derivation in `frontend/src/pages/HomePage.tsx` with `useMemo` keyed on `tasks`, `commitments`, `selectedDate`, and the current minute from `useNow` (used only when the selected date is today), so unrelated renders do not recompute; verify no per-second render and no unnecessary re-render of unchanged rows (Principle VIII, plan performance goal).
- [x] T066 [P] Write `frontend/tests/agenda-a11y.test.tsx`: timeline, conflict, availability, and unscheduled regions as separate labeled regions; reading and focus order chronological within the timeline and never folding the unscheduled region into it; row accessible names including category, title, time range, completion, and conflicts; availability period accessible names; one live region with a single announcement for date, conflict, availability, and schedule results; keyboard-only date and scheduling operation with visible focus; focus enters and returns from dialogs; `axe-core` reports no violations.
- [x] T067 [P] Write `frontend/tests/agenda-responsive.test.tsx`: no horizontal scrolling at 360, 768, 1024, and 1440 px or at 200% zoom; stacked card layout below 768 px with chronological order preserved; reduced-motion suppression keeps all information; token-only category pills, `rounded-2xl` rows, `tabular-nums` times, no raw hex, and at most three primary data points per row (FR-072, FR-075).
- [x] T068 [P] Write `frontend/tests/agenda-i18n-parity.test.tsx`: `en` and `es` have identical key sets for the `agenda` namespace, dates and times follow the locale and date-style preference, no English leakage in Spanish, and switching language mutates no task or commitment.
- [x] T069 Remove the obsolete Home copy: delete the `tasks` and `commitments` blocks from `frontend/src/shared/i18n/locales/en/home.json` and `es/home.json`, update the Home heading/description to the agenda wording, keep `storageNotice` and the today-only surface keys, and confirm `frontend/tests/i18n.test.ts` and `home-dashboard.test.tsx` still pass.
- [x] T070 Run every scenario in `frontend/../specs/006-daily-agenda/quickstart.md` (Scenarios 1–8 plus the manual audit checklist) against the dev server, including the screen-reader pass, the SC-005 and SC-006 interaction budgets, the SC-012 five-participant usability check, and the SC-008 non-mutation audit (snapshot storage before and after viewing, navigating, changing language, and displaying conflicts).
- [x] T071 Confirm the cross-spec refinements still read correctly in `specs/002-task-management/spec.md` (FR-003) and `specs/005-calm-tech-dark-ui/spec.md` (FR-033), and that `docs/adr/0010-agenda-owned-task-slot.md` matches the shipped migration and write paths; adjust the ADR text if implementation diverged.
- [x] T072 Run the quality gates in `frontend/`: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, all passing, then verify coverage of the agenda model, storage migration, scheduling, and a11y suites stays at or above the 80% global / ~90% critical-path thresholds in Constitution VII.
- [x] T073 [P] Write `frontend/tests/agenda-states.test.tsx`: the lazy Home route shows `AgendaSkeleton` with `aria-hidden` and an `aria-busy` timeline while loading; a day with no activities shows the explanation plus create-commitment and create-task actions in the same view (SC-007); an empty unscheduled area shows its explanation and "Open Tasks"; an empty timeline with pending tasks keeps them visible; an incomplete source shows the incomplete-overview notice once and withholds conflicts and availability; a read failure shows the localized error with a working retry action and no duplicate live announcements; a successful schedule shows success feedback while a failed one preserves the draft (FR-048–FR-053, Constitution VI/VII).
- [x] T074 [P] Write `frontend/tests/agenda-live-updates.test.tsx`: editing a task title, changing its priority, due date, completion status, or estimated duration in Tasks updates the agenda without a restart; creating and deleting tasks and commitments updates the timeline, unscheduled area, conflicts, and availability; a task with a matching due date but no slot stays unscheduled; changes on one date do not leak into another; and none of these flows writes a slot except through an explicit schedule confirmation (FR-011, FR-014, FR-030, FR-044, SC-008, SC-011).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T002–T004 are parallel after T001 starts.
- **Foundational (Phase 2)**: Depends on Setup; T005 → T006 → T007 → T008 are strictly ordered (types → schema → validation → sanitize); T009 → T010 ordered; T011 and T012 depend on T005–T010; T013 depends on T005–T012; T014 is independent of the storage chain.
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion.
- **Polish (Phase 7)**: Depends on all four stories.

### User Story Dependencies

- **US1 (P1)**: Needs the slot fields and `buildAgendaDay`; no dependency on US2–US4. Inside the story: T015/T016 first, then T017–T019, then T020, then T021–T025 (parallel), then T026, then T027/T028, then T029, then T030–T033.
- **US2 (P2)**: Needs US1's `AgendaEntry`/`AgendaDay` types and `DailyAgenda`; adds conflict and availability derivation plus their regions. `deriveConflicts` and `deriveAvailability` are independent of each other; T036 needs both. Deliverable is independently testable on the same seeded data as US1.
- **US3 (P3)**: Needs US1's timeline/unscheduled regions and Phase 2's `scheduleTask`/`unscheduleTask`. It does not require US2, though conflicts are visible in the same data. `ScheduleTaskDialog` and `RemoveScheduleDialog` are independent of each other.
- **US4 (P4)**: Needs US1's composition. `useAgendaDate` and `AgendaDateNav` are independent of each other; the URL integration and today-only gating depend on both.

### Within Each User Story

- Model before UI; UI before wiring; wiring before integration tests; each story complete and green before the next priority starts.
- Tests are written with the implementation they verify in the same phase and must pass before the checkpoint.

---

## Parallel Opportunities

- **Setup**: T002, T003, T004 in parallel (distinct files).
- **Foundational**: T013 and T014 in parallel with T011/T012 (different files).
- **US1**: T015 and T016 in parallel; then T017, T018, T019 in parallel; T021–T025 in parallel once types exist.
- **US2**: T034 and T035 in parallel; T037 and T038 in parallel; T041 and T042 in parallel.
- **US3**: T044, T045, T046 in parallel; T047 and T048 in parallel.
- **US4**: T056, T057, T061 in parallel.
- **Polish**: T066, T067, T068, T073, T074 in parallel.

### Parallel Example: User Story 1

```text
# After T015/T016 land, launch the pure model files together:
Task: "Create frontend/src/features/agenda/model/timeOfDay.ts"
Task: "Create frontend/src/features/agenda/model/ordering.ts"
Task: "Create frontend/src/features/agenda/model/slot.ts"

# Then the presentational rows/regions together:
Task: "Create frontend/src/features/agenda/ui/AgendaEntryRow.tsx"
Task: "Create frontend/src/features/agenda/ui/AgendaTimeline.tsx"
Task: "Create frontend/src/features/agenda/ui/AgendaUnscheduledList.tsx"
```

### Parallel Example: User Story 3

```text
Task: "Create frontend/src/features/agenda/model/scheduleDraft.ts"
Task: "Create frontend/src/features/agenda/ui/ScheduleTaskDialog.tsx"
Task: "Create frontend/src/features/agenda/ui/RemoveScheduleDialog.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup.
2. Phase 2 Foundational (blocks everything).
3. Phase 3 US1: chronological timeline, unscheduled area, Home recomposition.
4. **STOP and VALIDATE**: run `frontend/tests/agenda-model.test.ts`, `agenda-timeline.test.tsx`, `agenda-no-network.test.ts`, and quickstart Scenario 1.
5. Demo Home as a single chronological agenda.

### Incremental Delivery

1. US1 → unified timeline and unscheduled area (MVP).
2. US2 → conflict groups and available periods, read-only.
3. US3 → explicit scheduling, move, remove, acknowledgment gate.
4. US4 → URL-backed date navigation, empty states, lazy Home with skeleton.
5. Polish → a11y, responsive, i18n parity, copy cleanup, full gates.

Each increment leaves earlier stories working and mutates no stored data except through an explicit schedule confirmation.

---

## Notes

- `[P]` tasks touch different files and have no incomplete dependency.
- `[US#]` maps every story-phase task to `spec.md` for traceability; setup, foundational, and polish tasks are intentionally unlabeled.
- No task adds a dependency, a storage key, a backend call, or a second source of task data.
- Any implementation that deviates from `contracts/` or `data-model.md` must update the contract first, then the task.
