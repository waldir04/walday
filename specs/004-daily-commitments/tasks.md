# Tasks: Daily Commitments

**Input**: Design documents from `/specs/004-daily-commitments/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)
**Generated**: 2026-11-12 (audit revision) | **Completed**: 2026-11-12

**Tests**: Included. The user and Constitution Principle VII require Vitest/React Testing Library coverage; test tasks are therefore mandatory, not optional examples.

**Organization**: Tasks are grouped by user story. Checkbox state reflects a production-readiness audit of the current code: `[x]` means the behavior already exists and meets the updated plan/constitution; `[ ]` means the task is still required.

**Completion evidence**: all tasks are implemented and verified. `npm run lint`, `npm run typecheck`, `npm test` (70 files, 452 tests), `npm run build`, and `npm run test:coverage` (statements 89.87%, branches 81.31%, functions 93.83%, lines 91.98%) pass. The obsolete pre-clarification suites were replaced by the tests listed in each phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story label (`[US1]`, `[US2]`, `[US3]`)
- Every task names the exact file path it changes
- No task in this list edits source code now; this file is the implementation plan for a later turn

## Path Conventions

- Frontend: `frontend/src/`
- Tests: `frontend/tests/`
- Feature docs: `specs/004-daily-commitments/`
- No backend or database paths apply to this feature (FR-044)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing slice foundation and fix shared configuration before domain work.

- [x] T001 Verify the FSD slice layout already exists at `frontend/src/entities/commitment/`, `frontend/src/features/commitments/`, and `frontend/src/pages/CommitmentsPage.tsx`; keep the entity → feature → page direction and public `index.ts` exports.
- [x] T002 Verify the `/commitments` route and navigation entry already exist in `frontend/src/app/router.tsx`, `frontend/src/widgets/Navigation.tsx`, and the `commitments` i18n title namespace.
- [x] T003 Verify the `commitments` namespace is registered for both languages in `frontend/src/shared/i18n/index.ts`, `frontend/src/shared/i18n/locales/en/commitments.json`, and `frontend/src/shared/i18n/locales/es/commitments.json`.
- [x] T004 Verify the shared primitives `Button`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `SuccessState`, `Skeleton`, and `Loading` exist under `frontend/src/shared/ui/` and are suitable for reuse.
- [x] T005 [P] Refactor `frontend/src/shared/config/commitments.ts`: remove `DEFAULT_COMMITMENT_TYPE` (FR-002 forbids a preselected type), keep `COMMITMENTS_STORAGE_KEY = 'walday:commitments'` and `COMMITMENT_TYPES = ['fixed', 'flexible']`, and add `COMMITMENTS_STORAGE_VERSION = 1` and `COMMITMENTS_LOCK_NAME = 'walday:commitments'`.
- [x] T006 [P] Create `frontend/src/entities/commitment/model/constants.ts` with `COMMITMENT_TITLE_MIN_GRAPHEMES = 1`, `COMMITMENT_TITLE_MAX_GRAPHEMES = 120`, and `COMMITMENT_DESCRIPTION_MAX_GRAPHEMES = 500`; no component may hardcode these limits.

**Checkpoint**: Shared configuration and constants are single-sourced.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain, validation, ordering, storage contract, and shared helpers that every story depends on.

**⚠️ CRITICAL**: No user story implementation can complete until this phase is done.

### Foundational tests

- [x] T007 [P] Rewrite `frontend/tests/commitment-model.test.ts` to cover: trimmed title of **1–120 Unicode grapheme clusters**, description of **at most 500 grapheme clusters** with blank omitted, strict `YYYY-MM-DD` real calendar dates, strict `HH:mm` times, `startTime < endTime`, `endTime = '00:00'` as `CROSS_MIDNIGHT`, required `fixed | flexible` type with no default, and invalid-range precedence over overlap.
- [x] T008 [P] Rewrite `frontend/tests/commitments-storage.test.ts` to cover the read contract: empty, restored, partial quarantine, legacy raw array, corrupt JSON, migration failure, unsupported future version, unavailable storage, no fabricated IDs, duplicate-ID quarantine, and no automatic write during load.
- [x] T009 [P] Create `frontend/tests/commitments-storage-write.test.ts` to cover the write contract: atomic `ok`, `STORAGE_UNAVAILABLE`, `STORAGE_QUOTA_EXCEEDED`, `STORAGE_WRITE_FAILED`, `STORAGE_CONFLICT` with latest revision, blocked modes, original data intact after failure, and invalid records rejecting the whole write.
- [x] T010 [P] Create `frontend/tests/commitments-multitab.test.ts` to cover revision mismatch, `storage` event detection, blocked writes, no auto-adoption or merge, and saving availability after reload/re-baseline.
- [x] T011 [P] Create `frontend/tests/commitment-ordering.test.ts` to cover filtering by selected date, `startTime` order, active-interface-language title tie-break via `Intl.Collator`, stable `id` final tie-break, conflict ordering, boundary-touching non-conflicts, and an agenda read check returning `id`, `title`, `description`, `date`, `startTime`, `endTime`, and `type` by date (FR-043).

### Shared helpers and domain

- [x] T012 [P] Extract `countGraphemes` into `frontend/src/shared/lib/graphemes.ts`; update `frontend/src/entities/preferences/model/graphemes.ts` and its re-exports so preferences and commitments share one implementation without changing the public preference API.
- [x] T013 [P] Create `frontend/src/shared/lib/localDateTime.ts` with pure helpers to validate real `YYYY-MM-DD` local dates, validate `HH:mm`, compare times, and format local dates/times with `Intl` (reference date for time formatting); keep the timezone independent from interface language and let the hour cycle follow the active formatting locale. Switching language must not change stored values. Extract/reuse `parseLocalDate` from `frontend/src/entities/preferences/model/formatting.ts`.
- [x] T014 Create the generic guest-store primitive under `frontend/src/shared/lib/guestStore/` (storage resolution, Web Locks adapter, serialized write queue, envelope write, revision-baseline comparison, quota classification); refactor `frontend/src/entities/task/model/storage.ts` and `frontend/src/entities/preferences/model/storage.ts` to consume it while keeping `frontend/tests/task-*.test.ts` and `frontend/tests/preferences-storage*.test.ts` green.
- [x] T015 Rewrite `frontend/src/entities/commitment/model/types.ts` with `CommitmentId`, `LocalDate`, `LocalTime`, `CommitmentType`, `Commitment` (including required `createdAt` ISO-8601 metadata), `CommitmentDraft` (`type: '' | CommitmentType`), `QuarantineSummary`, `QuarantineReasonCode`, `CommitmentLoadResult`, `CommitmentWriteResult`, `WriteBlockCause`, `PersistenceMode = 'normal' | 'recovery-blocked' | 'unsupported'`, and `RevisionBaseline`; no session-only/protected modes, no `any`, and `readonly` shapes where appropriate.
- [x] T016 Rewrite `frontend/src/entities/commitment/model/schema.ts` with strict Zod schemas: `commitmentSchema` (no unknown keys; UUID `id`; trimmed title 1–120 graphemes; trimmed description 1–500 graphemes or absent; `LocalDate`; `LocalTime`; `startTime < endTime`; `'00:00'` rejected; `type` enum; ISO `createdAt`), `commitmentDraftSchema` (strict; empty type allowed for the form), and `commitmentStoreSchema` (`version: 1`, non-empty `revision`, ISO `updatedAt`, `commitments: z.array(z.unknown())`, strict).
- [x] T017 Rewrite `frontend/src/entities/commitment/model/validation.ts` to return stable `{ field, code }` errors for `TITLE_REQUIRED`, `TITLE_TOO_LONG`, `DESCRIPTION_TOO_LONG`, `DATE_REQUIRED`, `DATE_INVALID`, `START_TIME_REQUIRED`, `START_TIME_INVALID`, `END_TIME_REQUIRED`, `END_TIME_INVALID`, `RANGE_INVALID`, `CROSS_MIDNIGHT`, `TYPE_REQUIRED`, and `TYPE_INVALID`, with `CROSS_MIDNIGHT` and `RANGE_INVALID` precedence exactly as written in `data-model.md`.
- [x] T018 Verify `frontend/src/entities/commitment/model/overlap.ts` already implements the correct half-open `[start, end)` predicate, same-date restriction, and self-exclusion (FR-023/FR-024); existing coverage in `frontend/tests/commitment-model.test.ts` passes and the predicate is kept.
- [x] T019 Extend `frontend/src/entities/commitment/model/overlap.ts` with typed `OverlapResult`, conflict ordering by `startTime`, and helpers returning all conflicts for presentation (`conflictingCommitments`, `conflictingCommitmentIds`) without mutating input.
- [x] T020 Create `frontend/src/entities/commitment/model/ordering.ts` with `commitmentsForDate(commitments, date)`, `compareCommitments(languageTag)`, and an `Intl.Collator`-based title comparison using the active interface language, followed by `id`, implementing FR-030/FR-031.
- [x] T021 Rewrite `frontend/src/entities/commitment/model/sanitize.ts` to validate records individually, preserve valid data, quarantine invalid entries with `QuarantineReasonCode`, reject duplicate IDs, never generate a missing ID, assign `createdAt` = migration time for legacy records, and never fabricate user data.
- [x] T022 Rewrite `frontend/src/entities/commitment/model/storage.ts` load path: read the v1 envelope, classify `empty | restored | partial | legacy | corrupt | migration-failed | unsupported | unavailable`, support injected `storage`/`now`/`randomId` dependencies for tests, and never write during load; implement the read half of `contracts/commitment-storage.md`.
- [x] T023 Implement the write path in `frontend/src/entities/commitment/model/storage.ts`: serialize writes, use `navigator.locks` when present, compare baseline revision, return the exact `STORAGE_*` codes, reject writes unless the persistence mode is `normal` with `STORAGE_WRITE_BLOCKED` causes, write `{ version, revision, updatedAt, commitments }` atomically, provide no destructive recovery path, and never swallow errors.
- [x] T024 Update `frontend/src/entities/commitment/index.ts` to export the public domain API only: types, constants, schemas, validation, overlap, ordering, sanitize/migration helpers, and load/save functions; no internal file imports from outside the slice.
- [x] T025 Update `frontend/src/shared/i18n/locales/en/commitments.json` and `frontend/src/shared/i18n/locales/es/commitments.json` with keys for every new message: all validation codes, type names/descriptions, guest data-loss warning (local only, not synchronized across devices, lost if storage is cleared or the device changes), overlap heading/details/acknowledgment, decline/cancel, storage unavailable/quota/corrupt/unsupported, retry, reload-required conflict, date navigation (previous/next/today/date label), success/update/delete, unsaved-change warning, and empty-state CTA. The cross-midnight message must instruct the user to split the period into separate same-day commitments. No hardcoded user-facing text may remain in components.

**Checkpoint**: Domain, storage, ordering, and i18n are production-ready and independently testable. User stories can begin.

---

## Phase 3: User Story 1 - Capture and view commitments for a day as a guest (Priority: P1) 🎯 MVP

**Goal**: A guest can create fixed or flexible commitments with no preselected type, view them by date in deterministic order, see an honest empty state, and have valid data restored locally.

**Independent Test**: From a clean profile, open `/commitments`; confirm the viewed-date default, explicit type choice, creation of both types, date navigation/filtering, ordering, empty state CTA, success feedback, and restoration after reload — with no account or network call.

### Tests for User Story 1

- [x] T026 [P] [US1] Rewrite `frontend/tests/commitments-ui.test.tsx` to assert: no account/sign-in prompt, no radio is checked initially, both type descriptions are visible, save is rejected with `TYPE_REQUIRED` until a type is chosen, fixed and flexible creation succeeds with text labels and explanations, each item displays title, date, times, type, and description when present, each item exposes accessible edit and delete controls, a rapid duplicate submit while pending creates one commitment, past and future dates are accepted, and success feedback is announced.
- [x] T027 [P] [US1] Create `frontend/tests/commitments-date-view.test.tsx` to assert: default today, `?date=YYYY-MM-DD` persistence, previous/next/today controls, only the selected date is listed, ordering by start time then title (active interface language) then id, date prefill from the viewed date, editable prefill, dates/times rendered per the active formatting locale, and switching interface language never changing stored dates/times.
- [x] T028 [P] [US1] Create `frontend/tests/commitments-persistence.test.tsx` to assert: create → reload restores all fields and type, empty state appears only after the store is checked, the route skeleton exposes `aria-busy` without a false empty state, a corrupt/unavailable read shows a localized error with retry where meaningful, the empty CTA opens the form, and the guest data-loss warning is visible before/at first save in both languages.

### Implementation for User Story 1

- [x] T029 [US1] Create `frontend/src/features/commitments/model/commitmentDraft.ts` with `emptyCommitmentDraft(date)` (`type: ''`, date = viewed date), `draftFromCommitment`, `isScheduleChanged`, `errorsByField`, and `validationMessageKey`; no default type anywhere.
- [x] T030 [US1] Rewrite `frontend/src/features/commitments/model/useCommitments.ts` load/create foundation: initialize from `loadCommitments()`, expose `commitments`, `mode`, `pending`, `externalChange`, `quarantine`, `notice`, `ready`, `create(draft)` returning a typed result, set `createdAt` from the injected clock, prevent duplicate submissions, never use a session-only success mode, and never add to the list until persistence reports `ok`.
- [x] T031 [P] [US1] Create `frontend/src/features/commitments/ui/CommitmentDateNav.tsx` with previous/next/today buttons and a labeled native date input; update the URL search string and expose an accessible current-date announcement.
- [x] T032 [US1] Rewrite `frontend/src/features/commitments/ui/CommitmentForm.tsx` basic structure: labeled title, description, date, start time, end time, and unchecked fixed/flexible radios with visible explanations; accept the viewed date; disable controls while pending; associate errors with fields; remove the `type: 'fixed'` assumption.
- [x] T033 [US1] Rewrite `frontend/src/features/commitments/ui/CommitmentList.tsx` to render only `commitmentsForDate(commitments, selectedDate)`, use the shared `EmptyState` with a create CTA, pass the active interface language for ordering, and avoid a false empty state while storage is unresolved.
- [x] T034 [P] [US1] Rewrite `frontend/src/features/commitments/ui/CommitmentItem.tsx` to display title, localized date, start/end times, type as visible text with the short fixed/flexible explanation required by FR-008, description when present, semantic-token classes, and accessible edit/delete controls for each item (FR-009); remove the dead `/commitments/:id/edit` link and raw palette utilities.
- [x] T035 [US1] Create `frontend/src/features/commitments/ui/CommitmentNotices.tsx` with a success live region, the guest data-loss warning, a read-error state with retry when stored data cannot be read, a storage warning with retry for unavailable/write-failure conditions, and a separate write-blocked notice for corrupt/partial/unsupported data with no destructive action; use role/aria-live appropriately.
- [x] T036 [US1] Rewrite `frontend/src/pages/CommitmentsPage.tsx` to compose date navigation, form, notices, and list; read/write the viewed date from the URL; seed new drafts with the viewed date; remove the hardcoded fixed default and the `window.confirm` delete path.
- [x] T037 [US1] Create `frontend/src/features/commitments/skeleton.ts` and `frontend/src/features/commitments/ui/CommitmentsPageSkeleton.tsx` (layout-matching skeleton, `aria-busy`, hidden decorative skeletons), and wire the narrow skeleton entry into the lazy route in `frontend/src/app/router.tsx`.

**Checkpoint**: US1 is independently functional; stop and validate the MVP before US2.

---

## Phase 4: User Story 2 - Edit and delete commitments with explicit control (Priority: P2)

**Goal**: Users can edit every attribute only by explicit action and delete with a named confirmation, without silent changes, loss of focus, or unresolved unsaved work.

**Independent Test**: Edit each field, explicitly change type, cancel an edit, delete with confirmation, cancel deletion, and attempt to leave a dirty form; verify only intended changes occur and focus is predictable.

### Tests for User Story 2

- [x] T038 [P] [US2] Create `frontend/tests/commitments-edit.test.tsx` to assert: the form is pre-filled with every field, title/description/date/time/type edits save as one explicit action, changing a fixed commitment to flexible does not alter its schedule, flexible commitments are never auto-rescheduled, viewing or editing another commitment changes nothing, changing language/timezone changes nothing stored, success is announced, and cancel restores the previous data.
- [x] T039 [P] [US2] Create `frontend/tests/commitments-delete.test.tsx` to assert: the dialog names the commitment, cancel leaves data unchanged and returns focus to the delete control, confirm removes only that commitment, success is announced, and focus moves to the next item or the empty-state CTA.
- [x] T040 [P] [US2] Create `frontend/tests/commitments-unsaved-guard.test.tsx` to assert: closing the form or navigating away with a dirty draft warns the user, discard clears the draft, and staying preserves every entered value.

### Implementation for User Story 2

- [x] T041 [US2] Extend `frontend/src/features/commitments/model/useCommitments.ts` with `update(id, draft)` and `deleteCommitment(id)` typed mutations: pending lock, no optimistic list change on failure, success notices, delete focus target, blocked-store rejection, and preservation of the existing `createdAt`.
- [x] T042 [US2] Implement edit mode in `frontend/src/pages/CommitmentsPage.tsx` and `frontend/src/features/commitments/ui/CommitmentForm.tsx`: prefill from the selected commitment, explicit save/cancel, pending lock, and reset only after a successful save.
- [x] T043 [US2] Create `frontend/src/features/commitments/ui/DeleteCommitmentDialog.tsx` using the shared `ConfirmDialog`; move the commitment title into the accessible description, support pending state, and replace the `window.confirm` usage in `CommitmentsPage.tsx`.
- [x] T044 [US2] Add the unsaved-change guard in `frontend/src/pages/CommitmentsPage.tsx` (React Router navigation blocker plus shared `ConfirmDialog`) and clear the guard after a successful save or explicit cancel.
- [x] T045 [US2] Implement focus management for create/update/delete in `frontend/src/pages/CommitmentsPage.tsx`, `frontend/src/features/commitments/ui/CommitmentList.tsx`, and `frontend/src/features/commitments/ui/CommitmentItem.tsx`: return focus to the logical item/heading/empty CTA and never trap focus.

**Checkpoint**: US2 works independently and integrates without breaking US1.

---

## Phase 5: User Story 3 - Validate time ranges and understand conflicts (Priority: P3)

**Goal**: Invalid input is rejected with accessible field/summary feedback; overlaps are fully disclosed and acknowledged only when required; storage failures and outdated tabs are explicit and never report false success.

**Independent Test**: Submit every invalid shape, then exercise overlap creation, boundary, self-exclusion, title-only edits, date/time edits, quota failure, and a two-tab conflict; verify no silent change and no false success.

### Tests for User Story 3

- [x] T046 [P] [US3] Rewrite `frontend/tests/commitments-validation.test.ts` as an RTL suite asserting: field messages linked by `aria-describedby`, an error summary for multiple errors, focus to the summary/first field, all entered values preserved, revalidation as fields are corrected, title 1–120 and description 1–500 grapheme clusters, invalid calendar dates, malformed times, equal/reversed ranges, `CROSS_MIDNIGHT` with split-period guidance, type-required behavior, and invalid-range precedence suppressing the overlap acknowledgment.
- [x] T047 [P] [US3] Rewrite `frontend/tests/commitments-overlap.test.tsx` to assert: all conflicts listed by title and time range, decline preserves the draft and does not save, acknowledgment saves, boundary-touching periods do not conflict, edit self-exclusion, title/description/type-only edits do **not** re-acknowledge, date/time edits do re-acknowledge, the conflict indication remains visible, and no existing commitment is modified or auto-resolved.
- [x] T048 [P] [US3] Create `frontend/tests/commitments-save-failure.test.tsx` to assert: `QuotaExceededError`/unavailable storage keep the form open with all entered values, no list entry is added, no success is announced, retry works after storage recovers, and cancel creates nothing.
- [x] T049 [P] [US3] Create `frontend/tests/commitments-multitab.test.tsx` to assert: a newer revision from another tab blocks create/update/delete, an accessible message and reload action appear, overwriting is impossible, and saving resumes after reload.

### Implementation for User Story 3

- [x] T050 [US3] Implement validation UX in `frontend/src/features/commitments/ui/CommitmentForm.tsx` and `frontend/src/features/commitments/model/commitmentDraft.ts`: accessible error summary, field-level messages, focus to summary/first invalid field, `aria-invalid`, `aria-describedby`, revalidation after the first submit, and limits/date/time/cross-midnight messages.
- [x] T051 [US3] Implement the overlap acknowledgment panel in `frontend/src/features/commitments/ui/CommitmentForm.tsx` and the persistent conflict indication with text in `frontend/src/features/commitments/ui/CommitmentItem.tsx` / `CommitmentList.tsx`; list every conflict with title and time range, and never mutate, merge, move, shorten, extend, discard, or auto-resolve any existing commitment.
- [x] T052 [US3] Implement acknowledgment rules in `frontend/src/features/commitments/model/useCommitments.ts` and `commitmentDraft.ts`: create-with-overlap requires acknowledgment; edit requires it only when `date`/`startTime`/`endTime` changed and the result still overlaps; title/description/type-only edits never re-ask; declining cancels the save and preserves the draft; invalid range wins over overlap.
- [x] T053 [US3] Implement save-failure UX in `frontend/src/features/commitments/model/useCommitments.ts`, `frontend/src/pages/CommitmentsPage.tsx`, and `frontend/src/features/commitments/ui/CommitmentForm.tsx`: form stays open, error is announced, no list mutation/success, retry and cancel are available, and duplicate submission is prevented.
- [x] T054 [US3] Implement outdated-tab blocking in `frontend/src/features/commitments/model/useCommitments.ts` and `frontend/src/features/commitments/ui/CommitmentNotices.tsx`: set `externalChange` on revision conflict or `storage` event, disable create/update/delete, show an accessible reload action, and keep blocking until reload.
- [x] T055 [US3] Verify invalid-range precedence in `frontend/src/pages/CommitmentsPage.tsx` and `CommitmentForm.tsx`: an invalid range or `CROSS_MIDNIGHT` is shown instead of the acknowledgment panel, and no overlap acknowledgment can bypass invalid input.

**Checkpoint**: All three stories are independently functional; overlaps, failures, and concurrency are explicit and safe.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Production hardening, accessibility/i18n proof, documentation, and quality gates.

- [x] T056 [P] Replace all raw palette utilities with semantic tokens in `frontend/src/features/commitments/ui/CommitmentForm.tsx`, `CommitmentDateNav.tsx`, `CommitmentList.tsx`, `CommitmentItem.tsx`, `CommitmentNotices.tsx`, `DeleteCommitmentDialog.tsx`, `CommitmentsPageSkeleton.tsx`, and `frontend/src/pages/CommitmentsPage.tsx`; verify focus-visible, 24×24 minimum targets, and reduced-motion behavior via the existing `frontend/src/index.css`.
- [x] T057 [P] Create `frontend/tests/commitments-i18n-parity.test.tsx` asserting complete EN/ES key parity for the `commitments` namespace, no missing translations, no hardcoded user-facing strings in the commitment components, and that switching EN↔ES while a draft is open preserves the input, updates visible labels, keeps `document.documentElement.lang` in sync, and does not change stored dates/times.
- [x] T058 [P] Create `frontend/tests/commitments-a11y.test.tsx` covering keyboard-only create/edit/delete/date navigation/acknowledgment, dialog focus trap and return, live-region announcements, error summary focus, non-color type/conflict indication, and forced-colors mode (axe checks where appropriate).
- [x] T059 [P] Create `frontend/tests/commitments-responsive.test.tsx` covering 360, 768, 1024, and 1440 px widths, 200% zoom, no horizontal scrolling, touch-target sizing, and no hover-only behavior.
- [x] T060 [P] Create `frontend/tests/commitments-no-network.test.ts` asserting that commitment create/edit/delete/load flows never call `fetch`, `XMLHttpRequest`, TanStack Query, or any network API, and never import `entities/task`, task storage, or task status/priority fields.
- [x] T061 [P] Write `docs/adr/0009-commitment-guest-store.md` recording the versioned local store, revision-baseline conflict policy, no-auto-adopt decision, and the extraction of `shared/lib/guestStore/`, including rejected alternatives from `research.md`.
- [x] T062 Run `npm run test:coverage` in `frontend/` and close gaps in `frontend/src/entities/commitment/**` (approximately 90% critical logic) and `frontend/src/features/commitments/**` (at least 80% global); do not lower the thresholds in `frontend/vite.config.ts`.
- [x] T063 Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in `frontend/`; fix all failures without suppressions or `any`, and confirm strict TypeScript flags remain enabled.
- [x] T064 Execute every scenario in `specs/004-daily-commitments/quickstart.md` against the running app and record pass/fail evidence; include the storage-failure console recipe and the two-tab scenario.
- [x] T065 Final cleanup audit across `frontend/src/shared/config/commitments.ts`, `frontend/src/features/commitments/`, `frontend/src/entities/commitment/`, `frontend/src/pages/CommitmentsPage.tsx`, and `frontend/tests/`: no `DEFAULT_COMMITMENT_TYPE`, no `window.confirm`, no dead `/commitments/:id/edit` link, no raw palette utilities, no cross-slice or `entities/task` internal imports, no network code, no `memory-only`/`protected`/`discard-unreadable` commitment modes, and no obsolete tests. Rewrite or delete `frontend/tests/commitments-edit-delete.test.ts`, `frontend/tests/commitments-control.test.tsx`, and `frontend/tests/commitments-a11y-i18n.test.tsx` so no duplicate or pre-clarification suite remains.

**Checkpoint**: Feature meets the constitution's Definition of Done and the updated quickstart.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T005 and T006 can start immediately and in parallel.
- **Foundational (Phase 2)**: Depends on Setup. Tests T007–T011 are written first; shared helpers T012–T014; domain T015–T024; i18n T025. This phase blocks all stories.
- **US1 (Phase 3)**: Depends on Phase 2. T029 → T030; T031–T035 can proceed in parallel after T029; T036 composes them; T037 is independent of page composition but needs the skeleton component.
- **US2 (Phase 4)**: Depends on US1 form/page. T041 extends the same hook as T030; T042/T043/T044/T045 touch the page/form/list/item sequentially.
- **US3 (Phase 5)**: Depends on US1 and US2 UI. T050–T055 extend the same form/hook/page files and are sequential where they overlap.
- **Polish (Phase 6)**: Depends on all desired stories. T056–T061 are parallel; T062–T065 run after fixes.

### Within Each Story

- Tests first, then implementation.
- Domain/controller before UI integration.
- No story is complete until its tests pass in isolation.
- If a story is deferred, do not ship a partial save path that reports false success.

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2; delivers the MVP.
- **US2 (P2)**: Independent user value but reuses US1's form/page composition.
- **US3 (P3)**: Reuses the form/page/controller from US1 and US2; the storage and overlap rules it exposes are foundational and already available.

---

## Parallel Examples

### Foundational

```text
T007 commitment-model tests
T008 storage read contract tests
T009 storage write contract tests
T010 multi-tab storage tests
T011 ordering/conflict tests
T012 grapheme extraction
T013 local date/time helpers
```

### User Story 1

```text
T026 create/no-default-type UI tests
T027 date navigation/order tests
T028 persistence/empty-state/guest-warning tests
T031 date navigation component
T034 item presentation
```

### User Story 3

```text
T046 validation UX tests
T047 overlap/acknowledgment tests
T048 save-failure tests
T049 multi-tab UI tests
```

### Polish

```text
T056 semantic-token audit
T057 i18n parity test
T058 a11y test
T059 responsive test
T060 no-network test
T061 ADR
```

---

## Implementation Strategy

### MVP first (Phase 1 + Phase 2 + US1)

1. Fix shared config/constants.
2. Complete the domain, storage contract, ordering, and i18n foundation with tests.
3. Implement US1 and run its three suites independently.
4. Validate the quickstart scenarios 1–4 and 9 before moving on.

### Incremental delivery

1. Foundation → US1 (create/view/date view/persistence) → demo.
2. US2 (edit/delete/unsaved guard/focus) → demo.
3. US3 (validation/acknowledgment/storage failure/multi-tab) → demo.
4. Polish (tokens/a11y/i18n/responsive/no-network/ADR/coverage/gates).

### Deferred or excluded

- No backend, Express, Prisma, PostgreSQL, or TanStack Query usage for this feature.
- No recurrence, reminders, cloud sync, auto-rescheduling, all-day/multi-day periods, or scheduling algorithm.
- Do not implement from any older task list; this file supersedes the previous `tasks.md`.

---

## Format Validation

- All tasks use `- [ ]` or `- [x]` followed by a sequential `TNNN` ID.
- Every task after Phase 1 that belongs to a user story carries `[US1]`, `[US2]`, or `[US3]`.
- `[P]` is used only for tasks in different files with no incomplete dependency.
- Every task names at least one exact file path.
- Tests are included and mapped to the story they protect.
- Task IDs are sequential in execution order.
