# Tasks: Task Management

**Input**: Design documents from `/specs/002-task-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Status**: Regenerated on 2026-11-12 from the reconciled plan. The previous list is superseded; its checked items do not evidence compliance with the updated specification.

**Tests**: Required by Constitution VII and the specification readiness gate. Unit and story tests are written before the implementation they cover; integration, performance, routing, and zero-network verification tests may follow the features they exercise.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1–US7)
- Exact repository paths are included.

## Path Conventions

- Frontend application: `frontend/src/`
- Frontend tests: `frontend/tests/`
- Feature documentation: `specs/002-task-management/`
- No backend paths exist for this feature.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the domain and configuration foundation without changing behavior yet.

- [X] T001 [P] Record ADR 0006 for task domain placement in `docs/adr/0006-task-domain-placement.md` and update the follow-up note in `docs/adr/0003-fsd-boundaries.md`
- [X] T002 [P] Create persistence configuration in `frontend/src/shared/config/tasks.ts` (storage key, version, lock name) and domain constants in `frontend/src/entities/task/model/constants.ts` (grapheme limits, duration bounds, defaults)
- [X] T003 [P] Create task domain types in `frontend/src/entities/task/model/types.ts` (`Task`, `TaskId`, `TaskStatus`, `Priority`, `LocalDate`, `TaskDraft`, validation/store result unions)
- [X] T004 Create Zod schemas in `frontend/src/entities/task/model/schema.ts` (task, draft, stored record, envelope) with schema-inferred types; depends on T002 and T003
- [X] T005 Create deterministic test helpers in `frontend/tests/helpers/taskFixtures.ts` and, if needed, `frontend/tests/helpers/fakeStorage.ts` (fixed clock, valid/invalid records, envelope builders)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain rules, persistence boundary, shared dialog, and hook skeleton required by every story.

**CRITICAL**: No user story is complete until this phase is complete.

- [X] T006 [P] Add domain unit tests in `frontend/tests/task-domain.test.ts` (graphemes, limits, duration including bare-number rejection and the 1440 bound, dates, ordering)
- [X] T007 [P] Add storage unit tests in `frontend/tests/task-storage.test.ts` (migration, failed migration preservation, quarantine, unsupported, corrupt, discard replacement, quota, unavailable, CAS, locks, protected mode, and validated domain objects rather than raw envelopes)
- [X] T008 [P] Add i18n parity and fallback tests in `frontend/tests/tasks-i18n.test.tsx`
- [X] T009 [P] Add generic dialog primitive tests in `frontend/tests/confirm-dialog.test.tsx` (focus containment, Escape, focus restoration)
- [X] T010 [P] Implement grapheme counting with `Intl.Segmenter` in `frontend/src/entities/task/model/validation.ts`
- [X] T011 Implement title, description, priority, date, and duration validation with typed codes in `frontend/src/entities/task/model/validation.ts`
- [X] T012 [P] Implement friendly duration parsing to canonical minutes in `frontend/src/entities/task/model/duration.ts`
- [X] T013 Implement localized duration formatting with `Intl.NumberFormat` and `Intl.ListFormat` in `frontend/src/entities/task/model/duration.ts`; depends on T012 in the same file
- [X] T014 [P] Implement date-only validation, local-today derivation, past-due logic, and localized formatting in `frontend/src/entities/task/model/dueDate.ts`
- [X] T015 [P] Implement the deterministic pending/completed comparator and grouping in `frontend/src/entities/task/model/ordering.ts`
- [X] T016 Implement per-record sanitization, duplicate-identity quarantine, and quarantine summaries in `frontend/src/entities/task/model/sanitize.ts`
- [X] T017 Implement envelope read, version inspection before strict validation, legacy-array migration, unsupported-version detection, failed-migration preservation, and typed load results in `frontend/src/entities/task/model/storage.ts`
- [X] T018 Implement envelope write, revision compare-and-swap, explicit empty/legacy/unknown baseline protection, unexpected-legacy protection, discard-unreadable intent, Web Locks with fallback, memory-only retry, protected-mode blocking, and typed write results in `frontend/src/entities/task/model/storage.ts`
- [X] T019 Export the entity public API from `frontend/src/entities/task/index.ts`
- [X] T020 [P] Create the generic accessible dialog primitive in `frontend/src/shared/ui/ConfirmDialog.tsx` (native `<dialog>`, focus containment, Escape, focus restoration)
- [X] T021 Create the reducer and `useTasks` hook skeleton in `frontend/src/features/tasks/model/useTasks.ts` (tasks, persistence mode, revision baseline including `empty`/`legacy`/`unknown`, pending guard, notices)
- [X] T022 Export the new hook and types through `frontend/src/features/tasks/index.ts`; add component exports as they land (finalized in T084)
- [X] T023 Rewrite the task i18n resources with the full key set in `frontend/src/shared/i18n/locales/en/tasks.json` and `frontend/src/shared/i18n/locales/es/tasks.json`, including pluralized recovery-count keys
- [X] T024 Create `frontend/src/features/tasks/ui/TasksPageSkeleton.tsx` and `GuestStorageNotice.tsx`, export both through the feature public API, wire the skeleton as the `/tasks` lazy-route fallback in `app/router.tsx`, and rewire `frontend/src/pages/TasksPage.tsx` to render the hook and guest notice only; remove page-level storage effects and mutation logic. Form/list composition lands in US1 T031

**Checkpoint**: Domain and storage contracts are testable independently; user stories can proceed.

---

## Phase 3: User Story 1 - Create and view tasks as a guest (Priority: P1) 🎯 MVP

**Goal**: Create tasks with a meaningful title and optional details, see them with correct defaults, and complete the journey without an account or network.

**Independent Test**: Open `/tasks` with no tasks, create a title-only task and one with all fields, and verify defaults, values, feedback, and focus.

### Tests

- [X] T025 [P] [US1] Add creation, default, trimming, grapheme-boundary, duplicate-title, and double-submit tests in `frontend/tests/tasks-create-edit.test.tsx`
- [X] T026 [P] [US1] Add validation and error-association tests for create in `frontend/tests/tasks-a11y.test.tsx`

### Implementation

- [X] T027 [P] [US1] Build the create form in `frontend/src/features/tasks/ui/TaskForm.tsx` with controlled fields, shared validation, pending guard, field errors, and summary
- [X] T028 [P] [US1] Build metadata presentation in `frontend/src/features/tasks/ui/TaskMetadata.tsx`
- [X] T029 [US1] Implement creation and draft reset in `frontend/src/features/tasks/model/taskDraft.ts` and `useTasks.ts`
- [X] T030 [US1] Implement success announcement, focus return to the title field, and session-only wording on write failure
- [X] T031 [US1] Build the base list and task item rendering (title, description when present, completion control, metadata mount) and the empty state with a primary action that focuses the title field in `frontend/src/features/tasks/ui/TaskList.tsx` and `TaskItem.tsx`; export `TaskForm`/`TaskList` through the feature public API, compose them into `TasksPage`, and suppress the empty state while recovery is unresolved or the store is unsupported
- [X] T032 [US1] Ensure task content renders as plain text and is excluded from logs and error output

**Checkpoint**: US1 is functional and independently verifiable.

---

## Phase 4: User Story 2 - Edit tasks safely (Priority: P1)

**Goal**: Edit every editable field with explicit Save and Cancel, preserve identity/order, and handle stale-store conflicts.

**Independent Test**: Edit all fields, save, reload, then reopen, change, and cancel; verify originals remain and invalid edits apply nothing.

### Tests

- [X] T033 [P] [US2] Add explicit save/cancel, no-blur-commit, identity/order preservation, non-status editing preserving status, and invalid-edit tests in `frontend/tests/tasks-create-edit.test.tsx`
- [X] T034 [P] [US2] Add stale-edit conflict tests in `frontend/tests/task-store-conflict.test.ts`

### Implementation

- [X] T035 [P] [US2] Build the edit form in `frontend/src/features/tasks/ui/TaskEditForm.tsx` with all editable fields, Save, Cancel, and error summary; export it through the feature public API
- [X] T036 [US2] Implement edit, cancel, and draft mapping in `useTasks.ts` and `taskDraft.ts`
- [X] T037 [US2] Integrate edit mode into `frontend/src/features/tasks/ui/TaskItem.tsx` and `TaskList.tsx`
- [X] T038 [US2] Preserve the task's `id` and `createdAt` on save and reject partial updates
- [X] T039 [US2] Abort saves based on a stale revision, preserve the draft, and surface the conflict with a reload action
- [X] T040 [US2] Return focus to a logical control after cancel and announce save success or failure

**Checkpoint**: US1 and US2 work independently.

---

## Phase 5: User Story 3 - Delete tasks with explicit confirmation (Priority: P1)

**Goal**: Delete only after an explicit, accessible confirmation that identifies the task; support cancellation and safe focus behavior.

**Independent Test**: Request deletion, cancel, request again, confirm; verify persistence and focus, including deleting the last task.

### Tests

- [X] T041 [P] [US3] Add confirmation, cancel, Escape, task-identification, focus-restoration, last-task, and completed-task deletion tests in `frontend/tests/tasks-delete.test.tsx`
- [X] T042 [P] [US3] Add deletion persistence-failure tests in `frontend/tests/task-storage.test.ts`

### Implementation

- [X] T043 [P] [US3] Build `frontend/src/features/tasks/ui/DeleteTaskDialog.tsx` using `ConfirmDialog`, with the task title in the message
- [X] T044 [US3] Implement delete orchestration, pending guard, and success/session-only failure announcement in `useTasks.ts`
- [X] T045 [US3] Integrate delete triggers and invoking-control focus restoration in `TaskItem.tsx`
- [X] T046 [US3] Move focus to the next logical element or empty-state action after confirmed deletion
- [X] T047 [US3] Ensure completion never opens deletion confirmation and never deletes a task

**Checkpoint**: US1–US3 work independently.

---

## Phase 6: User Story 4 - Persist and restore guest tasks (Priority: P1)

**Goal**: Restore all task data in the same browser/device; survive unavailable, corrupt, partial, quota-limited, legacy, unsupported, cleared, and multi-tab storage states without silent loss.

**Independent Test**: Mutate tasks, reload, and verify restoration; then execute every failure drill in `quickstart.md` §5 and the multi-tab scenarios in §6.

### Tests

- [X] T048 [P] [US4] Add restore, legacy migration, unsupported version, corrupt/partial quarantine, discard replacement over corrupt/quarantined/migration-failed data, unsupported-never-overwritten, and cancel tests in `frontend/tests/task-storage.test.ts`
- [X] T049 [P] [US4] Add unavailable, quota, memory-only retry, empty/unknown baseline non-empty conflicts, legacy baseline over empty/v1 conflicts, unexpected-legacy conflict, external-clear (idle and in-progress), storage-event, unsupported external payload, and conflict tests in `frontend/tests/task-store-conflict.test.ts`
- [X] T050 [P] [US4] Add recovery, warning, session-only feedback, always-visible guest notice, and empty-state suppression during recovery/unsupported tests in `frontend/tests/tasks-states.test.tsx`

### Implementation

- [X] T051 [US4] Build `frontend/src/features/tasks/ui/StorageWarning.tsx` for memory-only, recovery-blocked, protected, and unsupported modes; keep the separate always-visible `GuestStorageNotice` in place
- [X] T052 [US4] Build `frontend/src/features/tasks/ui/RecoveryNotice.tsx` for quarantined and unsupported data with localized, pluralized counts
- [X] T053 [US4] Add the explicit discard-unreadable-records confirmation, identifying how many records are at risk, the blocked-write flow, and the discard intent that replaces corrupt/quarantined data but never unsupported newer data; cancellation enters `protected` with the raw payload untouched
- [X] T054 [US4] Implement the `storage` event subscription, external-change application, and newer-data notice
- [X] T055 [US4] Implement explicit retry for retryable write failures in `memory-only` while retaining in-memory changes; write only over an empty store when the baseline is unknown, and return to `normal` on success
- [X] T056 [US4] Ensure external clear, absent storage, and unavailable storage produce the localized empty state and device/browser notice where applicable, and never produce a false persistence claim
- [X] T057 [US4] Verify no task content or raw payload is logged in any failure path

**Checkpoint**: US1–US4 are independently functional, including persistence and recovery.

---

## Phase 7: User Story 5 - Mark tasks complete or pending (Priority: P2)

**Goal**: Toggle completion without deleting data, move between groups, preserve metadata, and retain focus on the completion control.

**Independent Test**: Toggle a task both ways, verify grouping, metadata, persistence, announcements, and focus retention.

### Tests

- [X] T058 [P] [US5] Add toggle, group movement, metadata preservation, focus retention, announcement, and persistence tests in `frontend/tests/tasks-completion.test.tsx`

### Implementation

- [X] T059 [US5] Implement the completion mutation and pending guard in `useTasks.ts`
- [X] T060 [US5] Update `TaskItem.tsx` completion control with semantic state, task-specific accessible names, and at least a 24 by 24 CSS pixel target area
- [X] T061 [US5] Restore focus to the moved task's completion control by task id after re-grouping
- [X] T062 [US5] Announce status changes and persist them with session-only failure wording

**Checkpoint**: US5 works independently.

---

## Phase 8: User Story 6 - Prioritize, schedule context, and organize (Priority: P2)

**Goal**: Assign priority, date-only due date, and canonical duration; display past-due correctly and order tasks deterministically.

**Independent Test**: Create mixed tasks, edit metadata, clear optional values, and verify display, grouping, past-due, and stable ordering.

### Tests

- [X] T063 [P] [US6] Add priority defaults/labels, date-only behavior, timezone independence, past-due, clearing, duration parsing, and ordering tests in `frontend/tests/task-domain.test.ts`
- [X] T064 [P] [US6] Add all-completed, grouped display, long-content, metadata rendering, and empty-state suppression tests in `frontend/tests/tasks-states.test.tsx`

### Implementation

- [X] T065 [US6] Add priority, due date, and duration controls to create/edit forms with field-level errors
- [X] T066 [US6] Render priority, due date, duration, and past-due text in `TaskMetadata.tsx` using localized `Intl` formatting
- [X] T067 [US6] Implement labelled pending/completed group rendering and deterministic ordering in `TaskList.tsx`
- [X] T068 [US6] Ensure editing does not reorder a task and completion moves it to the correct group
- [X] T069 [US6] Keep the all-completed group visible and suppress the global empty state

**Checkpoint**: US6 works independently.

---

## Phase 9: User Story 7 - Accessible, localized English/Spanish experience (Priority: P2)

**Goal**: Every journey is keyboard/VoiceOver operable and fully localized in English and Spanish with locale-aware formatting.

**Independent Test**: Complete all journeys by keyboard and VoiceOver in both languages; verify announcements, focus, zoom, reflow, and formatting.

### Tests

- [X] T070 [P] [US7] Add keyboard, visible focus, roles, accessible names, error summary, live-region, aria-busy, target-size, guest-notice, and axe tests in `frontend/tests/tasks-a11y.test.tsx`
- [X] T071 [P] [US7] Add runtime language switch, draft and user-content preservation, document language, date/duration formatting, pluralization, and raw-key tests in `frontend/tests/tasks-i18n.test.tsx`
- [X] T072 [US7] Add responsive reflow and reduced-motion structural checks in `frontend/tests/tasks-a11y.test.tsx`; depends on T070 in the same file

### Implementation

- [X] T073 [US7] Associate every form label and error, mark invalid fields, and add the multi-error summary
- [X] T074 [US7] Add live regions for mutations, restoration, conflicts, and persistence failures without stealing focus
- [X] T075 [US7] Ensure all repeated action controls include the task title in accessible names
- [X] T076 [US7] Verify language changes preserve tasks, drafts, open edit forms, and open confirmations
- [X] T077 [US7] Verify localized duration and date formatting uses the active language and preferences
- [X] T078 [US7] Verify `document.documentElement.lang`, 200% text resizing, 400% zoom, supported widths, and reduced motion
- [ ] T079 [US7] Perform the manual VoiceOver with Safari pass on macOS and iOS for all critical journeys

**Checkpoint**: All user stories are functional and accessible in both languages.

---

## Phase 10: Polish and Cross-Cutting Concerns

- [X] T080 [P] Add the automated 500-task render and ordering test with a generous smoke budget in `frontend/tests/tasks-performance.test.tsx`; the formal SC-010 action-budget measurement is performed on the production build in T085
- [X] T081 [P] Add the `/tasks` lazy-route test in `frontend/tests/tasks-routing.test.tsx`, asserting the layout-matching `TasksPageSkeleton`, `aria-busy`, and hidden decorative shapes
- [X] T082 [P] Add a zero-network test in `frontend/tests/tasks-no-network.test.tsx` that spies on `fetch` and `XMLHttpRequest` across all task operations and recovery paths
- [X] T083 Remove the superseded implementation files under `frontend/src/features/tasks/model/task.ts`, `model/schema.ts`, and `lib/storage.ts` after all imports move to `entities/task`
- [X] T084 Reconcile plan, research, data model, contracts, quickstart, and this task list with the final implementation, and finalize the feature public API exports
- [ ] T085 Run the full `quickstart.md` validation, including storage, multi-tab, accessibility, and the SC-010 production-build measurement via `npm run build` and `npm run preview`
- [X] T086 Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, and `npm run build` from the repository root
- [X] T087 Verify coverage is at least 80% globally and 90% for `entities/task`
- [X] T088 Confirm no new runtime dependency, secret, task-content log, out-of-scope capability, or unmocked network call was introduced

---

## Dependencies and Execution Order

### Phase dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks every user story.
- US1–US7 depend on Foundational.
- Polish depends on the applicable user stories.

### Story dependencies

- US1 is the MVP.
- US2, US3, and US5 build on the task list and persistence from US1/Foundational.
- US4 is foundational for persistence but is validated end to end after the task mutations exist; its primitives are implemented in Phase 2.
- US6 depends on US1 and US2 forms.
- US7 spans all stories; its tests are completed as each story lands, with the final verification after US1–US6.

### Parallel opportunities

- T002–T003, T006–T009, T010, T012–T015, T020, T080–T082.
- US1 tests T025–T026; US3 dialog tests T041.
- US7 test authoring T070–T071 can proceed once the components and copy exist; T072 depends on T070 in the same file.

## Implementation Strategy

### MVP first

1. Complete Phase 1 and Phase 2.
2. Complete US1 (create/view) and validate independently.
3. Keep the feature shippable behind the existing `/tasks` route.

### Incremental delivery

1. Setup + Foundational.
2. US1 → create/view MVP.
3. US2 → safe editing.
4. US3 → confirmed deletion.
5. US4 → persistence failure and multi-tab hardening.
6. US5 → completion.
7. US6 → planning metadata and ordering.
8. US7 → full accessibility and localization verification.

## Notes

- `[P]` tasks touch different files and have no dependency on each other.
- Tests are part of the definition of done; a story without its tests is incomplete.
- Do not introduce TanStack Query usage for tasks, a backend endpoint, a Prisma model, or any new runtime dependency.
- Do not log task content, raw storage payloads, or user input.
- Commit after each task or logical group; do not bypass hooks or CI.
