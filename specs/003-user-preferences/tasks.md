# Tasks: User Preferences and Localization

**Input**: Design documents from `/specs/003-user-preferences/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included as meaningful behavior tests (Vitest/RTL, AAA) aligned with constitution quality gates and quickstart scenarios. Tests are behavior-focused, not implementation-coupled.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (frontend-only, FSD)**: `frontend/src/`, `frontend/tests/`
- Paths below follow the structure in `specs/003-user-preferences/plan.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare feature-specific structure and shared scaffolding

- [X] T001 Create feature and entity directories per plan in `frontend/src/features/user-preferences/` and `frontend/src/entities/preferences/`
- [X] T002 [P] Define preference constants and storage key(s) in `frontend/src/shared/config/preferences.ts` (no magic strings scattered)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core preference model, validation, persistence, and i18n scaffolding required by all stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `UserPreferences` types in `frontend/src/entities/preferences/model/types.ts` with fields: `language` (enum `en` | `es`, required), `dateTimePresentation` (locale-aware presentation setting, required), `weatherUnits` (enum supported unit system, e.g. `metric` | `imperial`, required), `weatherLocation` (structured location value or `null`/unset, optional). Encode invariants: language and weather units independent; weather location independent of language.
- [X] T004 [P] Implement default and resolution helpers in `frontend/src/entities/preferences/model/defaults.ts` to resolve `language` as user preference > supported browser locale (`en`/`es`) > `en` (English fallback) and provide sensible defaults for `dateTimePresentation` and `weatherUnits` (neutral default, e.g. metric) with `weatherLocation` unset by default.
- [X] T005 [P] Implement read-boundary validation/sanitization in `frontend/src/entities/preferences/model/validation.ts` to treat stored data as untrusted, normalize/replace unsupported `language` or `weatherUnits` values with safe fallbacks, and handle missing/invalid fields or `weatherLocation` without throwing.
- [X] T006 Implement local persistence adapter in `frontend/src/shared/lib/preferencesStorage.ts` to load/save guest `UserPreferences` using key(s) from `frontend/src/shared/config/preferences.ts`, gracefully handling unavailable/cleared storage and corrupt/invalid data by returning resolved defaults (no app-breaking failure).
- [X] T007 [P] Add English and Spanish i18n resources for preference labels, options, and feedback messages in `frontend/src/shared/i18n/locales/en/preferences.json` and `frontend/src/shared/i18n/locales/es/preferences.json`.
- [X] T008 Wire preferences translations and ensure i18n initialization supports dynamic language application in `frontend/src/shared/i18n/index.ts`.

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Configure basic preferences as a guest (Priority: P1) 🎯 MVP

**Goal**: Guest users can view defaults and select/save language, date/time presentation, weather units, and weather location locally, with persistence and restore on return (same browser/device).

**Independent Test**: Open preferences as a first-time guest, change each setting (including Spanish), reload, and verify values persist and restore without an account.

### Tests for User Story 1

- [X] T009 [P] [US1] Add model/default/validation tests for resolution, fallbacks, and sanitization in `frontend/tests/preferences-model.test.ts` (AAA; cover unsupported/invalid stored values -> safe defaults/fallbacks).
- [X] T010 [P] [US1] Add storage tests for save/load, restore, and graceful behavior when storage unavailable/cleared/corrupt in `frontend/tests/preferences-storage.test.ts`.

### Implementation for User Story 1

- [X] T011 [P] [US1] Implement preferences state/hook to load, read, update, and persist `UserPreferences` in `frontend/src/features/user-preferences/model/usePreferences.ts` (uses `frontend/src/entities/preferences/model/*` and `frontend/src/shared/lib/preferencesStorage.ts`).
- [X] T012 [US1] Create preferences form UI with controls for `language` (en/es), `dateTimePresentation`, `weatherUnits`, and `weatherLocation` in `frontend/src/features/user-preferences/ui/PreferencesForm.tsx` (keyboard accessible, labeled controls, perceivable selected values).
- [X] T013 [US1] Integrate `PreferencesForm` into the settings surface in `frontend/src/pages/SettingsPage.tsx` to display defaults and allow changes.
- [X] T014 [US1] Apply language selection immediately in-session and persist/restore on reload by connecting `frontend/src/features/user-preferences/model/usePreferences.ts` with `frontend/src/shared/i18n/index.ts`.
- [X] T015 [US1] Add/extend UI tests for default display, changing settings (including Spanish), persistence and restore behavior in `frontend/tests/preferences-ui.test.tsx`.

**Checkpoint**: User Story 1 is fully functional and independently testable (MVP)

---

## Phase 4: User Story 2 - Experience consistent localization and formatting (Priority: P2)

**Goal**: User-selected language and locale/timezone-aware date/time formatting apply consistently across application surfaces with correct precedence and fallbacks.

**Independent Test**: Set language/formatting preferences and verify translated UI, English fallback for unsupported/no preference+unsupported browser locale, and consistent date/time formatting in available UI surfaces.

### Tests for User Story 2

- [X] T016 [P] [US2] Add tests for language precedence (user > supported browser locale > `en`) and unsupported-locale/value fallback in `frontend/tests/preferences-localization.test.ts`.
- [X] T017 [P] [US2] Add tests for locale/timezone-aware date/time formatting behavior in `frontend/tests/preferences-formatting.test.ts`.

### Implementation for User Story 2

- [X] T018 [P] [US2] Implement locale/formatting helpers that respect selected locale and appropriate timezone in `frontend/src/shared/lib/dateTimeFormat.ts` (consumes `dateTimePresentation` and effective locale context).
- [X] T019 [US2] Expose a consistent preferences/locale context for consumers (derived `LocaleContext`: effective language, formatting locale, timezone context) in `frontend/src/features/user-preferences/model/preferencesContext.tsx` and compose it at app level in `frontend/src/app/`.
- [X] T020 [US2] Ensure preference-governed UI surfaces use translated strings and formatting helpers consistently (update `frontend/src/pages/SettingsPage.tsx`, `frontend/src/widgets/Navigation.tsx`, and other existing surfaces as needed) without ad-hoc locale reads.
- [X] T021 [US2] Verify and adjust fallback behavior for unsupported browser locale/no preference to English in `frontend/src/entities/preferences/model/defaults.ts` and `frontend/src/shared/i18n/index.ts`.

**Checkpoint**: User Stories 1 and 2 work independently with consistent localization/formatting

---

## Phase 5: User Story 3 - Update preferences safely (Priority: P3)

**Goal**: Users can update preferences any time with clear, perceivable feedback while existing task/commitment content and stored weather information remain unchanged.

**Independent Test**: Update each preference and confirm feedback and persistence; with tasks/weather data present (or mocked), confirm changing language or units does not mutate underlying task/commitment data or stored weather information.

### Tests for User Story 3

- [X] T022 [P] [US3] Add tests confirming preference changes emit perceivable feedback and persist updates in `frontend/tests/preferences-feedback.test.tsx`.
- [X] T023 [P] [US3] Add non-mutation tests verifying language/units changes do not alter task data in `frontend/src/features/tasks/lib/storage.ts` and do not alter stored weather information representations in `frontend/tests/preferences-non-mutation.test.ts`.

### Implementation for User Story 3

- [X] T024 [US3] Implement perceivable update feedback (success/error states as applicable) in `frontend/src/features/user-preferences/ui/PreferencesForm.tsx` and supporting UI in `frontend/src/shared/ui/` if needed.
- [X] T025 [US3] Enforce and document-in-code separation so preference updates never write to task/commitment or weather data stores; audit integration points in `frontend/src/features/user-preferences/model/usePreferences.ts` and consumers.
- [X] T026 [US3] Ensure weather units/location changes are presentation-only and independent settings are preserved across updates in `frontend/src/features/user-preferences/ui/PreferencesForm.tsx` and `frontend/src/features/user-preferences/model/usePreferences.ts`.
- [X] T027 [US3] Add accessibility refinements for preference controls (labels, focus order, keyboard operation, non-color-only feedback) to meet WCAG 2.2 AA in `frontend/src/features/user-preferences/ui/PreferencesForm.tsx`.

**Checkpoint**: All user stories are independently functional with safe updates and feedback

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, quality, and documentation touch-ups across stories

- [X] T028 [P] Run quickstart validation scenarios and update notes if needed in `specs/003-user-preferences/quickstart.md`
- [X] T029 [P] Update frontend documentation for preferences/localization behavior in `frontend/README.md`
- [X] T030 Run quality checks (`npm test`, `npm run lint`, `npm run typecheck` from `frontend/`) and fix issues in touched files to satisfy project gates

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
- **User Story 2 (P2)**: Starts after Phase 2 - builds on preference/i18n foundation; independently testable
- **User Story 3 (P3)**: Starts after Phase 2 - builds on update flow; independently testable; non-mutation checks may reference existing task storage read-only

### Within Each User Story

- Tests written alongside/in support of story and must pass for the story’s acceptance
- Models/types/defaults/validation before services/hooks
- Hooks/state/context before UI integration
- Core implementation before cross-surface integration
- Complete and validate story before moving to next priority (when sequential)

### Parallel Opportunities

- **Phase 1**: T002 can run in parallel with T001 completion context (different concerns) once dirs exist
- **Phase 2**: T003, T004, T005, T007 can run in parallel (different files); T006 depends on T002/T003–T005; T008 depends on T007
- **US1**: T009 and T010 in parallel; T011 in parallel with tests prep once foundation ready; T012 follows types/hook contracts; UI integration follows
- **US2**: T016, T017, T018 in parallel; T019–T021 follow foundation/helpers
- **US3**: T022 and T023 in parallel; T024–T027 iterate on form/hook (same feature area, coordinate sequencing)
- **Polish**: T028 and T029 in parallel; T030 after code/doc changes

---

## Parallel Example: User Story 1

```text
# In parallel after Phase 2:
T009 [US1] frontend/tests/preferences-model.test.ts
T010 [US1] frontend/tests/preferences-storage.test.ts
T011 [US1] frontend/src/features/user-preferences/model/usePreferences.ts

# Then:
T012 [US1] frontend/src/features/user-preferences/ui/PreferencesForm.tsx
T013 [US1] frontend/src/pages/SettingsPage.tsx
T014 [US1] wire i18n/apply + persistence
T015 [US1] frontend/tests/preferences-ui.test.tsx
```

## Parallel Example: User Story 2

```text
# In parallel after Phase 2:
T016 [US2] frontend/tests/preferences-localization.test.ts
T017 [US2] frontend/tests/preferences-formatting.test.ts
T018 [US2] frontend/src/shared/lib/dateTimeFormat.ts

# Then:
T019 [US2] frontend/src/features/user-preferences/model/preferencesContext.tsx (+ frontend/src/app/)
T020 [US2] consistent usage in frontend/src/pages/SettingsPage.tsx, frontend/src/widgets/Navigation.tsx
T021 [US2] fallback adjustments in frontend/src/entities/preferences/model/defaults.ts, frontend/src/shared/i18n/index.ts
```

## Parallel Example: User Story 3

```text
# In parallel after Phase 2:
T022 [US3] frontend/tests/preferences-feedback.test.tsx
T023 [US3] frontend/tests/preferences-non-mutation.test.ts

# Then (coordinate on shared files):
T024 [US3] frontend/src/features/user-preferences/ui/PreferencesForm.tsx (+ frontend/src/shared/ui/)
T025 [US3] frontend/src/features/user-preferences/model/usePreferences.ts (non-mutation audit)
T026 [US3] frontend/src/features/user-preferences/ui/PreferencesForm.tsx, .../model/usePreferences.ts
T027 [US3] frontend/src/features/user-preferences/ui/PreferencesForm.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently (defaults, changes, Spanish, persistence/restore)
5. Demo/review if ready

### Incremental Delivery

1. Setup + Foundational → preference core ready
2. Add US1 → test independently → MVP
3. Add US2 → test independently → consistent localization/formatting
4. Add US3 → test independently → safe updates/feedback/non-mutation
5. Polish → quickstart/docs/gates

### Parallel Team Strategy

1. Complete Setup + Foundational together
2. After Foundational:
   - Developer A: User Story 1
   - Developer B: User Story 2 (coordinate on shared i18n/context surfaces)
   - Developer C: User Story 3 (coordinate on form/hook files)
3. Integrate and run Phase 6 checks

---

## Notes

- [P] tasks = different files, no dependencies on incomplete work
- [Story] label maps task to a specific user story for traceability
- Each user story is independently completable and testable
- Enforce constraints from data-model/spec: `language` enum `en`|`es` (required), `dateTimePresentation` required (locale/timezone-aware), `weatherUnits` required (independent, presentation-only), `weatherLocation` optional `null`/unset (independent); unsupported/invalid stored values -> safe fallbacks; no mutation of task/commitment data or stored weather information
- Commit after each task or logical group; stop at checkpoints to validate
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
- Future guest-to-account migration (FR-019) is out of implementation scope here except portable structure awareness
