# Implementation Plan: Daily Agenda

**Branch**: `006-daily-agenda` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-daily-agenda/spec.md`

## Summary

Replace Home's separate commitments list and task summary with one chronological daily agenda that combines fixed commitments, flexible commitments, and explicitly scheduled tasks, and keeps every pending task with no planned slot visible in a separate unscheduled area. The agenda also derives conflict groups and available periods, and lets the user explicitly place a pending task at a start time on any date, move that slot, or remove it.

The work is frontend-only and uses the existing guest-storage repositories and feature hooks. The only persisted change is an optional task slot (`plannedDate`, `plannedStartTime`) owned by the agenda; it requires a versioned task-store migration (`walday:tasks` v1 → v2), not a new storage key. Scheduling reuses Task Management's persistence path and storage-state policy, so the agenda can never offer a change that Task Management would refuse. All agenda derivation is pure, testable TypeScript in a new `features/agenda` slice; `HomePage` composes the existing `useTasks` and `useCommitments` controllers and a presentational dashboard shell.

No clarification remains open; the seven 2026-11-15 clarifications in `spec.md` are treated as decided inputs.

## Technical Context

**Language/Version**: TypeScript 5.9 (strict, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`), React 19.3, Node.js 24 LTS (frontend application)

**Primary Dependencies**: React Router 7.18, i18next 26 / react-i18next 17, Zod 4.6, TanStack Query 5.107 (installed at the app root, unused by this feature), Tailwind CSS 4.3 via `@tailwindcss/vite`, existing `lucide-react` icons. **No new runtime dependency.**

**Storage**: Existing versioned guest `localStorage`. Tasks move from version 1 to version 2 of the existing `walday:tasks` envelope to carry the optional slot; a registered 1 → 2 migration preserves every existing record. Commitments and preferences storage are unchanged and read-only for this feature. No PostgreSQL, Prisma, or backend persistence is exercised. No new storage key is introduced.

**Testing**: Vitest 5, React Testing Library 16, jest-dom, axe-core, existing `frontend/tests` suite plus new agenda model, component, storage-migration, scheduling, loading/empty/error-state, live-update, and i18n-parity suites

**Target Platform**: Modern desktop and mobile browsers; single-page application served by Vite; supported widths 360, 768, 1024, and 1440 px at up to 200% zoom

**Project Type**: Web frontend feature slice in an existing Feature-Sliced Design monorepo; no backend source exists in this repository

**Performance Goals**: Agenda derivation is linear-logarithmic in the day's activities (one sort plus a single sweep); recomputation is memoized per `(tasks, commitments, selectedDate, currentMinute)` so unrelated renders do not recompute; no network request, no request waterfall, no virtualization required for tens of activities per day; conflict and availability work stays under 1 ms for 100 activities

**Constraints**: WCAG 2.2 AA; local wall-clock date/time semantics with no timezone conversion; English and Spanish; dark theme only; Tailwind tokens as the single color source; conflict, category, completion, and availability conveyed by text; no automatic scheduling or rescheduling; no edit/delete of tasks or commitments from the agenda; no backend or API change

**Scale/Scope**: One guest per browser/device; tens of activities per selected day and hundreds of stored tasks; one selected date at a time; timeline, conflict summary, availability summary, unscheduled list, two scheduling dialogs, date navigation, and Home integration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence / Plan |
|---|---|---|
| I. Clean code, SOLID, simplicity | PASS | One slice with a model/UI split; pure derivation functions with single responsibilities; one scheduling dialog reused for create and move. No speculative abstraction, no repository or scheduler engine. |
| II. Strict TypeScript and type safety | PASS | Discriminated unions for agenda entries, availability results, and schedule validation outcomes; `z.infer` contract types for the slot and the schedule draft; no `any`, no assertions at boundaries; slot pair and duration presence validated at both form and storage boundaries. |
| III. Feature-Sliced Design | PASS | New `features/agenda` imports only `entities/*` and `shared/*`; `HomePage` composes the tasks and commitments controllers, so no same-layer feature-to-feature import is added; shared receives only presentation-neutral date/clock utilities. |
| IV. Backend architecture | N/A | No backend file, endpoint, or service is touched. |
| V. React component design | PASS | Presentational timeline, row, summary, unscheduled, and availability components with explicit props; state and mutations stay in the page/hook layer; dialog is a controlled component with a typed draft. |
| VI. Styling, design tokens, visual consistency | PASS | Agenda uses `canvas`/`surface`/`border`/`tag-*`/`warning`/`danger` tokens only, `rounded-2xl` cards, `rounded-lg` controls, `tabular-nums` for every time, 12–16 px row gaps, and no raw hex. |
| VII. Testing and QA | PASS | Model tests for ordering, conflicts (partial, containment, identical, three-way, boundary-touching), availability (30-minute boundary, clipping, past dates), storage migration, scheduling validation/acknowledgment, component and a11y tests, loading/empty/error and live-update state tests, and EN/ES parity. |
| VIII. Performance and resource efficiency | PASS | Single sort plus sweep, memoized derivation, no new dependency, no network, no unnecessary re-render of unchanged rows; no virtualization needed at the stated scale. |
| IX. Resilience and fault isolation | PASS | Unreadable source degrades to a labeled incomplete overview instead of failing Home; conflicts and availability are withheld rather than shown as complete; weather and suggestions remain independent. |
| X. API contracts | N/A | No HTTP contract exists or changes; the persisted slot schema is an internal guest-store contract documented in `contracts/task-slot-storage.md`. |
| XI. Constants and configuration | PASS | The 30-minute availability threshold, day bounds, and category ordering rank are named constants in `shared/config/agenda.ts` and the feature model; no scattered magic numbers. |
| XII. Security and data protection | PASS | No new personal data, network call, or secret; stored slots are validated on read through the existing sanitize path; no raw storage access from components. |
| XIII. Accessibility and inclusive design | PASS | Timeline and unscheduled area are separate labeled regions; entries expose category, title, time range, completion, and conflicts in their accessible name; one live region announces date, conflict, availability, and schedule results; keyboard date navigation and dialogs with focus trap/return; text-only status communication. |
| XIV. Internationalization and localization | PASS | New `agenda` namespace in English and Spanish; all copy externalized; dates and times formatted through the existing `Intl` helpers and user date-style preference; no hardcoded user-facing text. |
| XV. Documentation and technical communication | PASS | ADR 0010 records the agenda-owned task slot and why a separate slot store was rejected. The refinement notes already present in spec 002 FR-003 and spec 005 FR-033 are confirmed and linked, not silently contradicted. |
| XVI. Automated quality gates and git hooks | PASS | Work runs through the existing `lint`, `typecheck`, `test`, and `build` scripts; no hook change is required. |
| XVII. Frontend server state and async UX | PASS | Guest data is local persistence, not server state; the slot write goes through the entity repository inside `useTasks`. No `useQuery`/`useMutation`, no parallel store, no ad-hoc `localStorage` access from components. Success, empty, error, and skeleton states are defined in `contracts/ui-contracts.md`. |
| XVIII. Data integrity and persistence with Prisma | PASS (analogous, local store) | The task envelope is versioned, migrated, validated on read, and written atomically as one envelope; invalid slot data quarantines the record instead of silently dropping it; no partial write path exists. Prisma/PostgreSQL are not exercised. |
| XIX. External integrations and weather resilience | N/A | Weather integration and its presentation are untouched; the agenda does not call any provider. |
| XX. Technology stack governance | PASS | No runtime or development dependency is added; `Intl`, existing Zod, and existing primitives cover every need. |
| Visual Identity and Design System (Walday Dark UI) | PASS | Dark tokens only, 16 px cards, 8 px controls, Inter, tabular times, token-only category pills, calm empty states, hover/focus-revealed row scheduling actions with persistent touch access, reduced-motion support. |

**Scope-sensitive notes**

- **Task Management refinement**: scheduling writes `plannedDate`/`plannedStartTime` only through the agenda's explicit action. `createTask`, `updateTask`, `toggleTask`, and the Tasks page forms never set or infer a slot. `updateTask` must preserve an existing slot, because it rebuilds the task object today.
- **Home supersession**: spec 005 FR-033's agenda prohibition is already annotated as superseded by this specification; the visual, focus, motion, responsive, and storage-notice rules from 005 continue to apply to the agenda.
- **Storage parity (FR-053 / SC-014)**: scheduling availability derives from the same predicate and state that Task Management uses for task changes (`pending` and `externalChange`), and the same notices are reused. No persistence mode blocks task writes today (blocked writes fall back to memory with the session-only notice), so scheduling is offered wherever tasks are readable; `externalChange` disables it until resolved. States where the data itself is not trusted (`quarantine`, `unsupported`, `recovery-blocked`, `protected`, or a commitments source that is not ready) keep the agenda readable, label the overview incomplete, and withhold conflict and availability results. `memory-only` keeps the overview complete and shows the existing session-only warning.

**Post-design re-check**: PASS. Phase 1 adds no backend, provider, or API contract, adds no dependency, and keeps FSD boundaries intact. The task-store version bump is a registered, tested migration with a documented rollback-free path (readers reject newer versions as `unsupported` rather than corrupting data).

## Project Structure

### Documentation (this feature)

```text
specs/006-daily-agenda/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── agenda-domain.md
│   ├── task-slot-storage.md
│   └── ui-contracts.md
├── checklists/           # Created by /speckit.checklist when requested
└── tasks.md              # Created by /speckit.tasks, not this command
```

### Source Code (repository root)

```text
frontend/
├── package.json                          # Unchanged dependency set
└── src/
    ├── app/
    │   ├── router.tsx                    # Home becomes a lazy route with AgendaSkeleton fallback
    │   ├── queryKeys.ts                  # Unchanged (guest data is not server state)
    │   └── ...
    ├── pages/
    │   └── HomePage.tsx                  # Composition: date, controllers, derivation, notices
    ├── widgets/
    │   ├── HomeDashboard.tsx             # Heading/date region, today-only weather + suggestions, agenda slot
    │   ├── WeatherCard.tsx               # Unchanged
    │   └── SmartSuggestions.tsx          # Unchanged
    ├── features/
    │   ├── agenda/
    │   │   ├── index.ts                  # Public API: DailyAgenda, model types/helpers
    │   │   ├── controller.ts             # Narrow entry for Home (agenda types + date helpers)
    │   │   ├── skeleton.ts               # Public AgendaSkeleton entry for the lazy route
    │   │   ├── model/
    │   │   │   ├── constants.ts          # Category rank, day bounds, entry keys
    │   │   │   ├── types.ts              # AgendaEntry, TimeConflict, AvailablePeriod, AgendaDay
    │   │   │   ├── timeOfDay.ts          # Minute conversion, day clipping, end-of-day label input
    │   │   │   ├── ordering.ts           # Deterministic timeline ordering
    │   │   │   ├── conflicts.ts          # Connected-group conflict derivation
    │   │   │   ├── availability.ts       # Occupancy union, gaps, 30-minute threshold, now clipping
    │   │   │   ├── agendaDay.ts          # buildAgendaDay orchestration
    │   │   │   ├── slot.ts               # Slot derivation, oversize clipping, unscheduled filter
    │   │   │   ├── scheduleDraft.ts      # Zod schema, validation codes, draft <-> slot mapping
    │   │   │   └── useAgendaDate.ts      # Selected date bound to the URL search string
    │   │   └── ui/
    │   │       ├── DailyAgenda.tsx       # Agenda region orchestrator
    │   │       ├── AgendaDateNav.tsx
    │   │       ├── AgendaTimeline.tsx
    │   │       ├── AgendaEntryRow.tsx
    │   │       ├── AgendaUnscheduledList.tsx
    │   │       ├── AgendaConflictSummary.tsx
    │   │       ├── AgendaAvailability.tsx
    │   │       ├── AgendaEmptyState.tsx
    │   │       ├── AgendaIncompleteNotice.tsx
    │   │       ├── AgendaLiveRegion.tsx
    │   │       ├── ScheduleTaskDialog.tsx
    │   │       ├── RemoveScheduleDialog.tsx
    │   │       └── AgendaSkeleton.tsx
    │   ├── tasks/
    │   │   ├── controller.ts             # Exports scheduling actions and their types
    │   │   └── model/useTasks.ts         # scheduleTask / unscheduleTask; updateTask preserves slot
    │   └── commitments/
    │       └── controller.ts             # Unchanged read-only consumption
    ├── entities/
    │   ├── task/
    │   │   ├── model/types.ts            # Optional plannedDate/plannedStartTime + schedule input
    │   │   ├── model/schema.ts           # Strict schema with the optional slot pair
    │   │   ├── model/validation.ts       # Slot validation at the storage boundary
    │   │   └── model/storage.ts          # Registered 1 -> 2 migration
    │   └── commitment/                   # Unchanged
    └── shared/
        ├── config/
        │   ├── agenda.ts                 # AVAILABLE_GAP_MINUTES, day bounds
        │   └── tasks.ts                  # TASKS_STORAGE_VERSION = 2
        ├── lib/
        │   ├── localDateTime.ts          # Adds shiftLocalDate/minutes helpers (no behavior change)
        │   └── useNow.ts                 # Minute-aligned clock for current-day availability
        ├── i18n/
        │   ├── index.ts                  # Register `agenda` namespace
        │   └── locales/{en,es}/agenda.json
        └── ui/
            └── DateNav.tsx               # Shared localized date navigation (labels via props)
frontend/tests/
├── agenda-model.test.ts                  # Ordering, conflicts, availability, slot derivation
├── agenda-storage-migration.test.ts      # v1 -> v2, quarantine, unsupported newer version
├── agenda-timeline.test.tsx              # Rendering, categories, completion, empty states
├── agenda-conflicts.test.tsx             # Conflict text, summary counts, no mutation
├── agenda-availability.test.tsx          # Periods, total, today trimming, past dates
├── agenda-scheduling.test.tsx            # Create, duration prompt, move, remove, overshoot rejection
├── agenda-scheduling-conflicts.test.tsx  # Acknowledgment gate and decline
├── agenda-storage-states.test.tsx        # Parity with Task Management notices and gating
├── agenda-states.test.tsx                # Skeleton/busy, empty actions, incomplete notice, error retry, success
├── agenda-live-updates.test.tsx          # Cross-source edits, due-date non-promotion, recalculation, no writes
├── agenda-date-nav.test.tsx              # Navigation, keyboard, announcements, URL state
├── agenda-a11y.test.tsx                  # Regions, accessible names, live regions, axe
├── agenda-responsive.test.tsx            # 360/768/1024/1440, no horizontal scroll
├── agenda-i18n-parity.test.tsx           # en/es key parity and localized formatting
├── agenda-no-network.test.ts             # No fetch/network in the slice
└── home-dashboard.test.tsx               # Migrated to the agenda composition
```

**Structure Decision**: One frontend SPA in `frontend/`, following the existing Feature-Sliced Design layers. The derived agenda is business logic about combining two entities, so it belongs in `features/agenda`, not `shared` (no business rules) and not a new entity (which would force a same-layer entity-to-entity import). `HomePage` remains the only container: it reads `useTasks` and `useCommitments`, owns the selected date, calls the pure `buildAgendaDay`, and passes data plus scheduling callbacks down. `HomeDashboard` stays a presentational layout that keeps weather and suggestions today-only and renders the agenda through a composition slot.

## Implementation Strategy

### Workstream 1 — Task slot storage and repository contract

- Extend `Task` with optional `plannedDate` and `plannedStartTime`, constrained as a pair: either both are present and valid, or neither is. A slot is also invalid without an `estimatedMinutes`, so a scheduled task can never reach derivation without an end time. Add the corresponding strict Zod fields and pair-consistency refinements.
- Bump `TASKS_STORAGE_VERSION` to `2` and register a `1 → 2` migration that passes the existing task array through unchanged, so no record is lost and no slot is invented. Keep the existing newer-version rejection (`unsupported`) so an older build never downgrades newer data.
- Propagate the slot through `sanitize`, `validateStoredTask`, persistence, and multi-tab reconciliation. An invalid slot quarantines its record through the existing per-record validation path and is surfaced by the existing recovery notice.
- Fix `updateTask` to carry the existing slot forward; `createTask` must never accept a slot from the task form. Confirm `toggleTask` and `deleteTask` keep their current semantics (slot retained on completion, removed with the task).
- Add `scheduleTask(taskId, slot)` and `unscheduleTask(taskId)` to `useTasks`, implemented through the existing `runMutation` path so pending, external-change, storage-conflict, quota, and session-only behavior is identical to every other task mutation. Both are single-envelope atomic writes.

### Workstream 2 — Agenda domain model

- `timeOfDay.ts`: convert `HH:MM` to minutes and back, clip to `[0, 1440]`, derive an end from start plus duration, and detect oversized periods. Keep the 1440 end representable for display as end of day.
- `slot.ts`: derive the scheduled-task entry for a date (`plannedDate === selectedDate`), clip an oversized end to 1440 and flag `exceedsDayEnd`, and compute the unscheduled set as pending tasks with no `plannedDate` on any date. It assumes storage validation already rejected a slot without a duration.
- `ordering.ts`: sort by start minutes, then category rank (fixed commitment, flexible commitment, task), then end minutes, then locale-aware title, then source id. The rank order is exported so the UI can explain it in text.
- `conflicts.ts`: build pairwise intersections within the date (`startA < endB && startB < endA`, boundary-touching excluded), merge them into connected groups, and emit one `TimeConflict` per group plus per-entry conflict links with the overlap interval. Groups are internally ordered and deterministic.
- `availability.ts`: union the occupied intervals (clipped to the day, and to the current minute for today), invert them into gaps, keep gaps of at least `AVAILABLE_GAP_MINUTES` (30), and total only the presented gaps. Return `past-date` and `incomplete-sources` outcomes explicitly instead of an empty-looking complete result.
- `agendaDay.ts`: orchestrate entries, unscheduled tasks, conflicts, and availability into `AgendaDay`; withhold conflicts and availability when either source is incomplete.
- `useAgendaDate.ts`: hold the selected date in the `?date=YYYY-MM-DD` search string, defaulting to the local today, validating at the boundary, and reusing a shared `shiftLocalDate` helper instead of duplicating the commitments page date arithmetic.

### Workstream 3 — Scheduling use case

- `scheduleDraft.ts`: a strict Zod schema and explicit validation codes for start time, duration input, task eligibility, and end-of-day overflow; parse the duration only when the task has none and the user supplies it.
- The schedule dialog pre-fills the current slot when moving, pre-fills duration when the task has one, requires a duration otherwise, and shows the derived end time before confirmation.
- Evaluate the proposed span against the current day's entries with the same overlap rule as `deriveConflicts`; when conflicts exist, the dialog lists every conflicting activity with its time range and requires explicit acknowledgment. Declining closes without calling the mutation and preserves the entered values and the previous slot.
- Announce success and failure through the agenda live region; keep the user's values when the mutation returns `false`.
- Remove-schedule uses a confirmation dialog, then returns the task to the unscheduled area with its content untouched.

### Workstream 4 — Agenda UI and Home recomposition

- `DailyAgenda` renders: date navigation with the localized selected date; the conflict summary; the timeline region with ordering hint and entries; the availability section; the unscheduled region; and empty states for "nothing scheduled", "no pending tasks", and "no activities at all". It does not render the page heading or the storage/recovery notices.
- Each entry shows title, `tabular-nums` time range, and a token-only category pill, plus a muted secondary line for completion status, priority for task entries, oversize warning, and conflict names. Row scheduling actions use the existing `RowActions` reveal behavior with persistent touch access and no layout shift.
- `HomePage` reads both controllers, derives the day from the selected date, computes the incomplete-source flag from both hooks, renders the existing storage/recovery notices, the incomplete-overview notice, and their links, and wires the agenda callbacks. `HomeDashboard` renders the page heading with the selected date (replacing the old today-only label), the weather and suggestion surfaces only when the selected date is today, and the agenda slot after them.
- Make the Home route lazy with an `AgendaSkeleton` fallback that matches the final layout, completing the mandated loading state without adding a spinner.
- Add the `agenda` namespace in both locales, including ordering explanation, category labels, conflict and availability copy, dialog labels, validation messages, empty states, and announcements; remove the obsolete Home commitment/task section copy.

### Workstream 5 — Verification

- Model tests for every conflict shape in SC-003, availability in SC-004 (including 29/30-minute boundaries, overlap union, current-time trimming, past dates), ordering determinism, and oversize clipping.
- Storage tests for v1 → v2 migration, invalid slot quarantine, newer-version rejection, atomic failure, and slot preservation through task edits.
- Component tests for categories, priority text, completion text, conflict text and summary counts, empty and incomplete states, loading skeleton and `aria-busy`, error-with-retry, scheduling create/move/remove, duration prompt, conflict acknowledgment and decline, and no-mutation-on-view (SC-008).
- Live-update tests for edits, creations, deletions, completion changes, and duration changes made in Tasks or Commitments becoming visible without reload, plus due dates never promoting a task into the timeline (FR-011, FR-014, SC-011).
- Accessibility and responsive tests: labeled regions, reading/focus order, accessible names, live-region announcements for date, conflicts, availability, and schedule results, keyboard-only date and schedule operation, 200% zoom, and widths 360–1440 without horizontal scrolling.
- Manual checks from `quickstart.md`, including a screen-reader pass, the SC-005/SC-006 interaction budgets, a five-participant usability check (SC-012), and an audit that viewing never mutates data.

## Complexity Tracking

No constitutional violations require justification.

Two decisions are recorded rather than treated as routine:

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Bump `walday:tasks` to version 2 with a registered migration | The slot must be atomic with the task and must survive edits, completion, and multi-tab reconciliation (FR-017, FR-058). | A separate `walday:task-slots` store would split ownership, allow orphaned slots, break atomicity, and duplicate conflict detection; see ADR 0010. |
| Put derivation in `features/agenda` rather than a new entity | A new entity would import two other entity slices, violating the same-layer rule (Principle III). | Importing `entities/task` and `entities/commitment` from an entity is prohibited; the feature layer is the lowest layer that may compose both. |
