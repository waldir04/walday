# Tasks: Daily Commitments

**Input**: Design documents from `/specs/004-daily-commitments/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included as behavior-focused tests (Vitest/RTL, AAA) aligned with constitution quality gates and quickstart scenarios. Tests are not implementation-coupled.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (frontend-only, FSD)**: `frontend/src/`, `frontend/tests/`
- Paths below follow the structure in `specs/004-daily-commitments/plan.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature-specific structure and shared scaffolding

- [X] T001 Create feature and entity directories per plan in `frontend/src/features/commitments/` and `frontend/src/entities/commitment/`
- [X] T002 [P] Define commitment constants and dedicated storage key(s) in `frontend/src/shared/config/commitments.ts` (no magic strings scattered)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core commitment model, validation, overlap rules, persistence, and i18n scaffolding required by all stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `Commitment` and `CommitmentType` types in `frontend/src/entities/commitment/model/types.ts` with fields/constraints: `id` (stable identifier, string, required, unique within stored commitments, stable across edits), `title` (string, required, non-empty after trim), `description` (string, optional, may be empty/omitted), `date` (calendar date, required, represents a specific calendar day), `startTime` (time of day, required, defines period start on `date`), `endTime` (time of day, required, defines period end on `date`), `type` (enum `fixed` | `flexible`, required).
- [X] T004 [P] Implement commitment validation helpers in `frontend/src/entities/commitment/model/validation.ts` enforcing invariants: required fields (`title`, `date`, `startTime`, `endTime`, `type`), `title` non-empty after trim, `date` clear, and `startTime` MUST be earlier than `endTime` (strict; equal or inverted ranges invalid and rejected before save) with clear user-facing error reasons; no silent modification of existing data.
- [X] T005 [P] Implement overlap identification helpers in `frontend/src/entities/commitment/model/overlap.ts` to detect derived time conflicts as intersecting `[startTime, endTime)` periods between commitments on the same `date`, returning affected commitments/periods for clear communication without altering any commitment.
- [X] T006 [P] Implement read-boundary sanitization in `frontend/src/entities/commitment/model/sanitize.ts` to treat persisted data as untrusted, safely ignore/normalize invalid records or fields, and never fabricate commitments (graceful handling of corrupt data).
- [X] T007 Implement local persistence adapter in `frontend/src/shared/lib/commitmentsStorage.ts` to load/save guest commitments using key(s) from `frontend/src/shared/config/commitments.ts`, restoring sanitized data when available and handling unavailable/cleared/corrupt storage gracefully (no app-breaking failure, no restored records from cleared storage).
- [X] T008 [P] Add English and Spanish i18n resources for commitment labels, form fields, type names (fixed/flexible), actions, validation errors, overlap/conflict messages, and empty states in `frontend/src/shared/i18n/locales/en/commitments.json` and `frontend/src/shared/i18n/locales/es/commitments.json`.
- [X] T009 Wire commitments translations into i18n resources/initialization in `frontend/src/shared/i18n/index.ts` so all user-facing commitment content is available in English and Spanish.

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Create and view daily commitments as a guest (Priority: P1) 🎯 MVP

**Goal**: Guest users can create commitments (title, optional description, clear date, start/end times, type fixed/flexible) without an account, view them clearly distinguished by type, and have them persist/restore locally in the same browser/device context.

**Independent Test**: Create valid fixed and flexible commitments, confirm they are saved, displayed, and clearly identified by type (not color alone), reload, and verify restored; no account required.

### Tests for User Story 1

- [X] T010 [P] [US1] Add model/validation/sanitization tests for required fields, strict `startTime < endTime`, type enum, optional description, and stable `id` handling in `frontend/tests/commitment-model.test.ts` (AAA).
- [X] T011 [P] [US1] Add storage tests for save/load/restore and graceful behavior with unavailable/cleared/corrupt data in `frontend/tests/commitments-storage.test.ts`.

### Implementation for User Story 1

- [X] T012 [P] [US1] Implement commitments state/hook to load, create, and persist commitments in `frontend/src/features/commitments/model/useCommitments.ts` (uses `frontend/src/entities/commitment/model/*` and `frontend/src/shared/lib/commitmentsStorage.ts`; explicit user actions only, no silent modification).
- [X] T013 [US1] Create commitment form UI for title, optional description, date, start time, end time, and type (fixed/flexible) in `frontend/src/features/commitments/ui/CommitmentForm.tsx` with accessible labeled inputs and clear type selection.
- [X] T014 [US1] Create commitment list/item UI to display commitments with date/time period and clearly distinguished type (text/labels, not color alone) in `frontend/src/features/commitments/ui/CommitmentList.tsx` and `frontend/src/features/commitments/ui/CommitmentItem.tsx`.
- [X] T015 [US1] Create commitments page and integrate form/list in `frontend/src/pages/CommitmentsPage.tsx` for guest management and display.
- [X] T016 [US1] Add commitments route and navigation entry in `frontend/src/app/router.tsx` and `frontend/src/widgets/Navigation.tsx` so commitments are accessible in the application.
- [X] T017 [US1] Add/extend UI tests for creating fixed/flexible commitments, display/type distinction, guest persistence/restore, and no-account flow in `frontend/tests/commitments-ui.test.tsx`.

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP)

---

## Phase 4: User Story 2 - Edit and delete commitments with explicit control (Priority: P2)

**Goal**: Users can edit or delete commitments only through explicit actions/confirmation; fixed times remain unchanged unless explicitly edited and flexible commitments are never auto-rescheduled.

**Independent Test**: Edit and delete existing commitments with explicit confirmation and verify only intended changes apply; fixed/flexible schedules unchanged without explicit edit and no silent modifications.

### Tests for User Story 2

- [X] T018 [P] [US2] Add tests for explicit edit/delete behavior and persistence updates in `frontend/tests/commitments-edit-delete.test.ts`.
- [X] T019 [P] [US2] Add tests ensuring fixed commitments are not auto-changed and flexible commitments are never auto-rescheduled without explicit user action in `frontend/tests/commitments-control.test.tsx`.

### Implementation for User Story 2

- [X] T020 [US2] Extend commitments hook to support explicit edit and delete operations (stable `id`, revalidation on edit, no silent mutation) in `frontend/src/features/commitments/model/useCommitments.ts`.
- [X] T021 [US2] Add edit flow (prefill/update) and explicit save/cancel behavior in `frontend/src/features/commitments/ui/CommitmentForm.tsx` and `frontend/src/features/commitments/ui/CommitmentItem.tsx`.
- [X] T022 [US2] Add explicit delete confirmation and removal handling in `frontend/src/features/commitments/ui/CommitmentItem.tsx` and wire updates in `frontend/src/pages/CommitmentsPage.tsx`.
- [X] T023 [US2] Ensure UI and state logic preserve fixed/flexible semantics (no automatic time/type changes; changes only via explicit user action) across `frontend/src/features/commitments/model/useCommitments.ts` and `frontend/src/features/commitments/ui/*`.

**Checkpoint**: User Stories 1 and 2 work independently with explicit control

---

## Phase 5: User Story 3 - Validate times and understand conflicts (Priority: P3)

**Goal**: Users receive clear, accessible validation and overlap/conflict communication on create/edit without silent changes, and type/conflict distinctions do not rely on color alone.

**Independent Test**: Attempt invalid/equal/inverted ranges and missing required fields (rejected with clear accessible feedback); create/edit overlapping same-date commitments and verify overlaps identified/communicated while data remains unchanged unless explicitly edited.

### Tests for User Story 3

- [X] T024 [P] [US3] Add tests for rejecting invalid time ranges (equal/inverted) and missing required fields/unclear date with clear feedback in `frontend/tests/commitments-validation.test.ts`.
- [X] T025 [P] [US3] Add tests for overlap identification and communication on same-date intersecting periods (including multiple overlaps, create and edit) in `frontend/tests/commitments-overlap.test.ts`.
- [X] T026 [P] [US3] Add accessibility/i18n UI tests for perceivable validation/conflict messages, non-color type/conflict distinction, and EN/ES content in `frontend/tests/commitments-a11y-i18n.test.tsx`.

### Implementation for User Story 3

- [X] T027 [US3] Integrate validation and accessible error messaging into create/edit flows in `frontend/src/features/commitments/ui/CommitmentForm.tsx` (reject invalid saves, communicate reasons clearly).
- [X] T028 [US3] Integrate overlap detection and clear conflict communication in `frontend/src/features/commitments/model/useCommitments.ts`, `frontend/src/features/commitments/ui/CommitmentList.tsx`, and `frontend/src/features/commitments/ui/CommitmentItem.tsx` without silently modifying commitments.
- [X] T029 [US3] Refine non-color visual/textual indicators and accessible announcements for fixed/flexible types and conflicts in `frontend/src/features/commitments/ui/CommitmentItem.tsx` and `frontend/src/features/commitments/ui/CommitmentList.tsx` (WCAG 2.2 AA).
- [X] T030 [US3] Ensure commitment form/list display and messages use locale-aware, translated content (EN/ES) and remain consumable for future Daily Agenda in `frontend/src/pages/CommitmentsPage.tsx` and `frontend/src/features/commitments/ui/*`.

**Checkpoint**: All user stories are independently functional with validation and conflict communication

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, quality, and documentation touch-ups across stories

- [X] T031 [P] Run quickstart validation scenarios and update notes if needed in `specs/004-daily-commitments/quickstart.md`
- [X] T032 [P] Update frontend documentation for commitments behavior, persistence key, and i18n/accessibility notes in `frontend/README.md`
- [X] T033 Run quality checks (`npm test`, `npm run lint`, `npm run typecheck` from `frontend/`) and fix issues in touched files to satisfy project gates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3–5)**: Depend on Foundational completion
  - Proceed in priority order (P1 → P2 → P3) or in parallel after Phase 2 if staffed, respecting file-level dependencies
- **Polish (Phase 6)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 2 - no dependencies on other stories (MVP)
- **User Story 2 (P2)**: Starts after Phase 2 - extends US1 create/view flows but remains independently testable
- **User Story 3 (P3)**: Starts after Phase 2 - integrates validation/overlap communication into create/edit/display flows; independently testable

### Within Each User Story

- Tests can be authored alongside implementation and must pass for the story’s acceptance criteria
- Types/validation/overlap/storage foundations before hooks/UI
- Hooks/state before UI wiring
- Core flows before route/page integration refinements
- Complete and validate story before moving to next priority (when sequential)

### Parallel Opportunities

- **Phase 1**: T002 can run in parallel with T001 context once directories exist
- **Phase 2**: T003, T004, T005, T006, T008 can run in parallel (different files); T007 depends on T002–T006; T009 depends on T008
- **US1**: T010 and T011 in parallel; T012 in parallel with test prep after foundation; T013 and T014 can proceed in parallel then integrate in T015/T016; T017 follows UI
- **US2**: T018 and T019 in parallel; T020 then T021/T022/T023 with coordination on shared files
- **US3**: T024, T025, T026 in parallel; T027 then T028–T030 with coordination on shared UI/hook files
- **Polish**: T031 and T032 in parallel; T033 after code/doc changes

---

## Parallel Example: User Story 1

```text
# In parallel after Phase 2:
T010 [US1] frontend/tests/commitment-model.test.ts
T011 [US1] frontend/tests/commitments-storage.test.ts
T012 [US1] frontend/src/features/commitments/model/useCommitments.ts

# Then (can split UI files):
T013 [US1] frontend/src/features/commitments/ui/CommitmentForm.tsx
T014 [US1] frontend/src/features/commitments/ui/CommitmentList.tsx + CommitmentItem.tsx

# Then integrate:
T015 [US1] frontend/src/pages/CommitmentsPage.tsx
T016 [US1] frontend/src/app/router.tsx, frontend/src/widgets/Navigation.tsx
T017 [US1] frontend/tests/commitments-ui.test.tsx
```

## Parallel Example: User Story 2

```text
# In parallel after Phase 2:
T018 [US2] frontend/tests/commitments-edit-delete.test.ts
T019 [US2] frontend/tests/commitments-control.test.tsx

# Then (coordinate shared files):
T020 [US2] frontend/src/features/commitments/model/useCommitments.ts
T021 [US2] frontend/src/features/commitments/ui/CommitmentForm.tsx, CommitmentItem.tsx
T022 [US2] frontend/src/features/commitments/ui/CommitmentItem.tsx, frontend/src/pages/CommitmentsPage.tsx
T023 [US2] frontend/src/features/commitments/model/useCommitments.ts, frontend/src/features/commitments/ui/*
```

## Parallel Example: User Story 3

```text
# In parallel after Phase 2:
T024 [US3] frontend/tests/commitments-validation.test.ts
T025 [US3] frontend/tests/commitments-overlap.test.ts
T026 [US3] frontend/tests/commitments-a11y-i18n.test.tsx

# Then (coordinate shared files):
T027 [US3] frontend/src/features/commitments/ui/CommitmentForm.tsx
T028 [US3] frontend/src/features/commitments/model/useCommitments.ts, CommitmentList.tsx, CommitmentItem.tsx
T029 [US3] frontend/src/features/commitments/ui/CommitmentItem.tsx, CommitmentList.tsx
T030 [US3] frontend/src/pages/CommitmentsPage.tsx, frontend/src/features/commitments/ui/*
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently (create fixed/flexible, display/type distinction, guest persistence/restore, no account)
5. Demo/review if ready

### Incremental Delivery

1. Setup + Foundational → commitment core ready
2. Add US1 → test independently → MVP (create/view/persist)
3. Add US2 → test independently → explicit edit/delete and user control
4. Add US3 → test independently → validation, overlap communication, a11y/i18n completeness
5. Polish → quickstart/docs/gates

### Parallel Team Strategy

1. Complete Setup + Foundational together
2. After Foundational:
   - Developer A: User Story 1
   - Developer B: User Story 2 (coordinate on shared form/item/hook files)
   - Developer C: User Story 3 (coordinate on shared validation/overlap/UI files)
3. Integrate and run Phase 6 checks

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work
- [Story] label maps task to a specific user story for traceability
- Each user story is independently completable and testable
- Enforce data-model/spec constraints in implementation and tests: `id` stable string (required, unique, stable across edits), `title` required non-empty after trim, `description` optional, `date` required clear calendar day, `startTime`/`endTime` required, `type` enum `fixed|flexible` required, `startTime` MUST be earlier than `endTime` (strict; equal/inverted rejected), fixed not auto-changed, flexible never auto-rescheduled without user approval, overlaps are intersecting `[startTime,endTime)` periods on same `date` identified/communicated without silent modification, persisted data treated as untrusted/sanitized, all user-facing content in EN/ES, accessible inputs/messages, type/conflict not color-only
- Commit after each task or logical group; stop at checkpoints to validate
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence, automatic rescheduling, recurrence, notifications, cloud/external sync
- Commitment data must remain available/consumable for future Daily Agenda feature (FR-020)
