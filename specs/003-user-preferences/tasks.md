# Tasks: User Preferences and Localization

**Input**: Design documents from `/specs/003-user-preferences/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Status**: Implemented on 2026-11-12 against the audited specification. All tasks are complete except T061 (manual VoiceOver), which cannot be executed in this environment and is recorded as an open readiness gap in [implementation-report.md](./implementation-report.md). T067 records the undeployed backend geocoding proxy as a partial production delivery for location search.

**Tests**: Included as meaningful behavior tests (Vitest/RTL, AAA) aligned with the constitution quality gates and quickstart scenarios. Tests assert observable behavior, not implementation details.

**Organization**: Foundational phases first; then the six specification user stories in priority order. Each story remains independently implementable after the foundation and persistence layers.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: US1–US6 from the specification
- Include exact file paths in descriptions

## Path Conventions

- Frontend FSD: `frontend/src/entities/preferences`, `frontend/src/features/user-preferences`, `frontend/src/pages`, `frontend/src/app`, `frontend/src/shared`
- Tests: `frontend/tests`
- Paths follow the target structure in [plan.md](./plan.md)

## Requirement Coverage Map

Every functional requirement (FR), validation rule (VR), and success criterion (SC) from [spec.md](./spec.md) has at least one task or a documented manual validation path.

| Requirement group | Primary tasks | Notes |
| --- | --- | --- |
| FR-001–FR-006 | T027–T034, T045, T049, T068 | Guest access, preference independence, consumer contract |
| FR-007–FR-019 | T005, T007, T011, T017, T035, T036, T038, T039 | Language selection, resolution, explicit/implicit distinction |
| FR-020–FR-028 | T006, T013, T018, T031, T037 | Date and time presentation |
| FR-029–FR-036 | T006, T014, T019, T031 | Weather units and display precision |
| FR-037–FR-050 | T010, T025, T051–T055 | Weather location, disambiguation, privacy |
| FR-051–FR-055 | T027, T028, T034, T038 | Defaults and first use |
| FR-056–FR-067 | T027, T028, T040–T045, T068 | Saving, validation, feedback, draft protection |
| FR-068–FR-083 | T009, T010, T020–T026, T045–T050 | Persistence, restoration, resilience |
| FR-084–FR-099 | T030, T032, T041–T044, T056–T061 | Accessibility |
| FR-100–FR-108 | T036, T038, T039, T058, T060 | Localization and formatting |
| FR-109–FR-112 | T008, T020, T025, T067 | Migration readiness and boundary |
| VR-001–VR-016 | T008–T010, T017–T019, T024–T026, T038–T045, T049–T055, T059–T060, T068 | Validation rules exercised by the mapped tests |
| SC-001 | T034, quickstart §4.1 | Manual first-use timing under 2 minutes |
| SC-002–SC-003 | T017, T024, T034, T038 | Resolution and restoration |
| SC-004 | T045 | Non-mutation |
| SC-005 | T037, T038, T068 | Consistent consumer propagation |
| SC-006–SC-007 | T043–T045, T049 | Validation and truthful persistence feedback |
| SC-008 | T059, T061 | Automated and manual accessibility |
| SC-009 | T038, T039, T058 | Localization and runtime switching |
| SC-010 | T018 | Date-only and timezone behavior |
| SC-011 | T019, T045 | Units precision and preference independence |
| SC-012–SC-014 | T024–T026, T032, T049, T050 | Storage resilience, multi-tab, guest warning |
| SC-015 | T045, T049, T054 | Degraded external services |
| SC-016 | T060 | Responsive, zoom, text resizing |

---

## Phase 1: Setup and Documentation Reconciliation

**Purpose**: Establish the feature boundary and record decisions that this specification supersedes.

- [x] T001 [P] Create the target entity folders `frontend/src/entities/preferences/model/` and feature folders `frontend/src/features/user-preferences/model/` and `frontend/src/features/user-preferences/ui/`; keep public `index.ts` files.
- [x] T002 [P] Supersede ADR 0004 with the browser-language resolution decision, or add a new ADR recording the change, in `docs/adr/`; note that the runtime switching mechanism remains authoritative.
- [x] T003 [P] Record the backend geocoding-proxy dependency and its fallback behavior in the implementation notes or a dedicated ADR in `docs/adr/`.
- [x] T004 [P] Update `frontend/README.md` with the preference surface, storage key/version, language resolution, and location dependency.

---

## Phase 2: Foundational Domain (Blocks All Stories)

**Purpose**: Domain types, constants, validation, and derived locale rules required by every story.

- [x] T005 [P] Define literal unions and types in `frontend/src/entities/preferences/model/types.ts`: `DateTimePresentation` (`compact`/`standard`/`full`), `WeatherUnit`, `WeatherLocation`, `WeatherMeasurement` (discriminated union), `LocalDateString`, `UserPreferences`, `PreferenceField`, `PreferencePersistenceStatus`, `PreferenceLoadResult`, `PreferenceWriteResult`, `WriteBlockCause`, `RevisionBaseline`, `PreferenceConsumerValue`. Import and re-export `SupportedLanguage` from `frontend/src/shared/config/i18n.ts`; do not duplicate it.
- [x] T006 [P] Define named constants in `frontend/src/entities/preferences/model/constants.ts`: default locales (`en-US`, `es-ES`), presentation options/default, units/default, location label limit (1–120 graphemes), search query limit (1–80 graphemes), result limit (10), unit precision, and location timeout. Do not duplicate supported language tags (owned by `shared/config/i18n.ts`) or the storage key/version/lock name (owned by `shared/config/preferences.ts`).
- [x] T007 [P] Implement browser-aware language resolution in `frontend/src/entities/preferences/model/defaults.ts`: explicit language, else first supported `navigator.languages` entry by base subtag case-insensitively, else English; derive `formattingLocale` from the matching regional variant or documented default; resolve `languageSource`.
- [x] T008 [P] Implement Zod schemas in `frontend/src/entities/preferences/model/schema.ts`: v1 envelope, per-field preference schemas, and draft schema; derive contract types with `z.infer`; reject unknown envelope keys. The transient `LocationCandidate` schema is not an entity concern and lives with the feature port (T051).
- [x] T009 Implement per-field recovery in `frontend/src/entities/preferences/model/validation.ts`: validate each field independently, keep valid fields, fall back per invalid field, return typed invalid field names, never throw.
- [x] T010 Implement the migration registry and envelope classification in `frontend/src/entities/preferences/model/sanitize.ts`: v0 bare-record mapping (short/medium/long → compact/standard/full); v0 `language: 'es'` → explicit, v0 `language: 'en'` → explicit only when the injected first supported browser language is `es` and otherwise `null` (implicit), invalid language → `null`; v0 free-text location → `null` reported through `notRestoredFields`; failed migration preserved. The migration is pure and receives browser-language resolution as an input.
- [x] T011 [P] Move language tags shared with i18n to `frontend/src/shared/config/i18n.ts`; reduce `frontend/src/shared/config/preferences.ts` to storage key, version, and lock name.
- [x] T012 [P] Refactor `frontend/src/shared/lib/dateTimeFormat.ts` to generic `Intl` date/time styles with locale/timezone parameters and safe fallbacks; remove the preference type import.
- [x] T013 [P] Implement presentation mapping and date helpers in `frontend/src/entities/preferences/model/formatting.ts`, including date-only formatting with no time and no timezone shift.
- [x] T014 [P] Implement unit conversion and display precision in `frontend/src/entities/preferences/model/units.ts` for temperature, wind speed, and precipitation, using `Intl.NumberFormat` and localized unit display; `formatMeasurement` returns `null` for a missing `WeatherMeasurement` so the consuming surface renders localized unavailable text and never fabricates `0`.
- [x] T015 Implement the read-only consumer context and hook in `frontend/src/entities/preferences/model/context.tsx`; export it through `frontend/src/entities/preferences/index.ts`; expose no setter.
- [x] T016 Refactor `frontend/src/entities/task/model/dueDate.ts` to accept a resolved generic date style instead of a preference type; update `frontend/src/features/tasks/ui/TaskMetadata.tsx`, `TaskItem.tsx`, and `TaskList.tsx` props accordingly.

### Foundational tests

- [x] T017 [P] `frontend/tests/preferences-model.test.ts`: resolution order, ordered browser languages, regional variants, unsupported entries, invalid stored language, defaults, formatting locale, `languageSource`.
- [x] T018 [P] `frontend/tests/preferences-formatting.test.ts`: presentation mapping, date-only vs date-time, timezone/DST boundaries, invalid timezone fallback, numeric formatting.
- [x] T019 [P] `frontend/tests/preferences-units.test.ts`: metric/imperial conversion, per-measurement precision, reversibility from canonical values, missing measurements returning `null`, and the consuming surface rendering localized unavailable text instead of `0`.

**Checkpoint**: Domain and derived rules are complete and independently tested.

---

## Phase 3: Persistence Layer (Blocks All Stories)

**Purpose**: Versioned local store with safe migration, recovery, and conflict control.

- [x] T020 Implement envelope read/write in `frontend/src/entities/preferences/model/storage.ts`: typed load/write results, raw preservation, `unknown` narrowing, no silent errors.
- [x] T021 Implement v0→v1 and registered migrations in the storage read path; ensure migration is pure and writes only on explicit save.
- [x] T022 Implement revision compare-and-swap and Web Locks (with fallback) for writes; classify unavailable, quota, write failure, blocked, and conflict; support `replace-unreadable` intent with explicit confirmation.
- [x] T023 Implement the `storage` event subscription behavior in the feature store (`frontend/src/features/user-preferences/model/usePreferencesStore.ts`): apply clean external changes, surface conflicts with a dirty draft, handle external clear, ignore invalid/unsupported payloads.
- [x] T024 [P] `frontend/tests/preferences-storage.test.ts`: empty, restored, partial, corrupt, unavailable, quota, generic failure, blocked writes, replace confirmation, revision CAS, lock presence/absence.
- [x] T025 [P] `frontend/tests/preferences-migration.test.ts`: v0 migration mapping; v0 `es` explicit, v0 `en` explicit when it contradicts a Spanish browser, v0 `en` implicit when the browser is English or unsupported; a v0 location produces a `partial` result with `notRestoredFields: ['weatherLocation']`; invalid v0 fields; migration failure; unsupported newer version preservation; raw payload preserved until explicit save with replacement confirmation.
- [x] T026 [P] `frontend/tests/preferences-conflict.test.ts`: external update, external clear, dirty-draft conflict, stale write rejection, no silent overwrite.

**Checkpoint**: Persistence is safe, typed, and conflict-aware. User stories can now be built.

---

## Phase 4: US1 — Configure preferences as a guest (P1)

**Goal**: A guest can view defaults and save language, presentation, units, and location without an account, with persistence and restoration.

**Independent Test**: Clear storage, open preferences, change each value, save, reload, and verify all values are restored and applied offline.

- [x] T027 [US1] Implement the applied-state store in `frontend/src/features/user-preferences/model/usePreferencesStore.ts`: load before render, applied values, draft, save orchestration, pending guard, persistence status, notices, cross-tab integration.
- [x] T028 [P] [US1] Implement draft mapping/diffing in `frontend/src/features/user-preferences/model/preferencesDraft.ts`: record ↔ draft, dirty detection, location query handling, field error mapping.
- [x] T029 [US1] Implement `PreferencesRoot` in `frontend/src/features/user-preferences/model/PreferencesRoot.tsx` and compose it in `frontend/src/app/providers.tsx`; update `frontend/src/app/bootstrap.tsx` to resolve and apply language before first paint.
- [x] T030 [US1] Build the controlled form in `frontend/src/features/user-preferences/ui/PreferencesForm.tsx` with explicit Save/Cancel, fieldset/legend groups, pending state, and feedback.
- [x] T031 [P] [US1] Build `LanguageField.tsx`, `DateTimeField.tsx`, and `WeatherUnitsField.tsx` in `frontend/src/features/user-preferences/ui/`.
- [x] T032 [US1] Compose the form in `frontend/src/pages/SettingsPage.tsx` with the guest-storage notice and storage-status region; update `frontend/src/features/user-preferences/index.ts` exports.
- [x] T033 [US1] Add `frontend/src/features/user-preferences/ui/PreferencesPageSkeleton.tsx` and use it as the `/settings` lazy fallback in `frontend/src/app/router.tsx`; remove the generic `Loading` fallback for this route.
- [x] T034 [P] [US1] `frontend/tests/preferences-ui.test.tsx`: defaults, save/cancel, restore, first save persisting a complete record including unchanged values while preserving implicit language, pending guard, feedback, route skeleton.

**Checkpoint**: US1 is fully functional and independently testable (MVP).

---

## Phase 5: US2 — Experience consistent language and locale (P1)

**Goal**: Explicit language overrides the browser, implicit language follows the browser, and formatting/document language update consistently without reload.

**Independent Test**: Exercise explicit, implicit, and browser-only cases; verify document language, translations, formatting, and route context without reload.

- [x] T035 [US2] Implement the language source indication in the form (browser-derived vs explicit saved) in `frontend/src/features/user-preferences/ui/LanguageField.tsx`.
- [x] T036 [US2] Ensure `applyLanguage` updates translations, `<html lang>`, document title, and route announcements without reload in `frontend/src/shared/i18n/index.ts` and `frontend/src/app/RouteAnnouncer.tsx`.
- [x] T037 [US2] Wire consumer formatting through the read-only context in `frontend/src/pages/TasksPage.tsx` and `frontend/src/features/tasks/ui/*`; remove feature-to-feature preference imports.
- [x] T038 [P] [US2] `frontend/tests/preferences-localization.test.tsx`: explicit precedence, ordered browser resolution, English fallback, "Use browser language" round trip, implicit persistence across unrelated saves, explicit English stored as explicit even when it equals the effective language, document language/title and no contradictory language flash before first meaningful paint, language names identifiable without reading the active language, formatting without reload, focus/route preservation.
- [x] T039 [P] [US2] `frontend/tests/preferences-i18n-parity.test.ts`: en/es key parity, English fallback, no raw keys, no hardcoded interface text in preference components, and pluralization/interpolation through i18next rather than string concatenation.

**Checkpoint**: US2 is independently verified.

---

## Phase 6: US3 — Update preferences safely (P1)

**Goal**: Validation, atomic apply/persist, truthful feedback, and draft protection with no mutation of feature data.

**Independent Test**: Change each field, trigger validation failures and write failures, and verify no partial apply, no false success, and unchanged task/commitment records.

- [x] T040 [US3] Implement validation-before-write and atomic apply semantics in `usePreferencesStore.ts`; keep applied values unchanged on validation failure; apply session-only values only with explicit wording.
- [x] T041 [US3] Implement the accessible error summary, field association, `aria-invalid`, and first-invalid focus in `PreferencesForm.tsx`.
- [x] T042 [US3] Implement dirty-draft state, `useBlocker` navigation blocking, and the shared `ConfirmDialog` composition in `DiscardDraftDialog.tsx`; register `beforeunload` only when the draft differs.
- [x] T043 [US3] Implement success, session-only, retry, and conflict feedback through live regions in `PreferencesForm.tsx` and `StorageNotice.tsx`.
- [x] T044 [P] [US3] `frontend/tests/preferences-draft.test.tsx`: dirty diff, cancel, in-app blocker stay/discard, `beforeunload` presence/absence, duplicate-save guard, no-op save producing no write or success claim, focus on first invalid field, draft preservation.
- [x] T045 [P] [US3] `frontend/tests/preferences-non-mutation.test.ts`: language/presentation/units/location changes leave `walday:tasks` and `walday:commitments` byte-identical; only `walday:preferences` changes; changing one of the four preferences leaves the other three unchanged; core preferences save and task/commitment operations remain available with network/backend/weather access unavailable; the stored record contains no secrets, tokens, or credentials.

**Checkpoint**: US3 is independently verified.

---

## Phase 7: US4 — Recover from storage problems (P2)

**Goal**: Keep preferences usable and truthfully reported through unavailable, full, cleared, corrupt, partial, and newer-version storage.

**Independent Test**: Simulate each storage condition and verify valid recovery, preserved raw data, accessible notices, and no false persistence or silent overwrite.

- [x] T046 [US4] Implement `StorageNotice.tsx` states: session-only, partial restore, protected, unsupported, conflict, cleared elsewhere, with retry and replace-confirmation actions where allowed.
- [x] T047 [US4] Implement replace-confirmation flow for corrupt, migration-failed, partial, and unsupported payloads in the feature UI; never replace a newer version automatically.
- [x] T048 [US4] Implement retry behavior and persistence-mode transitions in `usePreferencesStore.ts`.
- [x] T049 [P] [US4] `frontend/tests/preferences-storage-recovery.test.tsx`: unavailable, quota, corrupt, partial, unsupported, cleared-while-open, replace cancel/confirm, retry, no false success, and unrelated task/commitment operations remain available during a preference-storage failure.
- [x] T050 [P] [US4] Extend `frontend/tests/preferences-conflict.test.ts` with storage-cleared and unreadable-external-payload cases.

**Checkpoint**: US4 is independently verified.

---

## Phase 8: US5 — Select and maintain a weather location (P2)

**Goal**: Explicit, disambiguated place selection independent of language, with graceful degradation when resolution is unavailable.

**Independent Test**: With a fake resolver, search, disambiguate, select, save, change language, change units, clear, and simulate empty/unavailable/timeout responses.

- [x] T051 [US5] Implement the `LocationResolver` port, `LocationCandidate` Zod schema, and typed failures in `frontend/src/features/user-preferences/model/locationResolver.ts`, plus the HTTP adapter using the validated config from `frontend/src/shared/config/env.ts` (never raw `import.meta.env`); the API base URL, timeout, and result limit are named configuration/constants rather than inline values. Validate responses with Zod.
- [x] T052 [US5] Implement `WeatherLocationField.tsx`: query input validated at 1–80 graphemes, explicit search action, radio-group candidate list with region/country context, resolved-label validation at 1–120 graphemes, clear action, empty/unavailable/timeout/retry states, attribution text where required. The user never types a persisted label directly.
- [x] T053 [US5] Compose the selected location label once at selection with `Intl.ListFormat` and `Intl.DisplayNames`; store it verbatim; never re-localize on language change.
- [x] T054 [P] [US5] `frontend/tests/preferences-location.test.tsx`: no auto-selection, ambiguity context, explicit selection, query/draft preservation on failure, clear, label stability after language change, 1- and 121-grapheme resolved-label boundaries, HTML-like/script-like labels rendered as plain text and never executed, a saved location displays and clears with the resolver unavailable (no network), no geolocation, no direct provider host.
- [x] T055 [P] [US5] `frontend/tests/location-resolver.test.ts`: query validation, request contract, response validation, timeout abort, error mapping, no automatic retry.

**Checkpoint**: US5 is verified with the fake resolver. Production search remains dependent on the backend proxy; do not sign off FR-039–FR-041 in production before it is deployed.

---

## Phase 9: US6 — Accessible use in English and Spanish (P2)

**Goal**: Complete keyboard, screen-reader, localization, responsive, zoom, and reduced-motion support for the preference experience.

**Independent Test**: Keyboard-only journeys, VoiceOver with Safari, axe checks, 200%/400%, 360/768/1024/1440 px, both languages, long Spanish and long location text.

- [x] T056 [US6] Audit and fix focus order, dialog focus management, live regions, target sizes, contrast, and non-color-only communication across `frontend/src/features/user-preferences/ui/`.
- [x] T057 [US6] Ensure skeletons expose `aria-busy`, are hidden from assistive technology when decorative, and announce completion/failure.
- [x] T058 [US6] Complete and review `preferences` namespace copy in `frontend/src/shared/i18n/locales/en/preferences.json` and `frontend/src/shared/i18n/locales/es/preferences.json`, including accessibility names and storage/location copy.
- [x] T059 [P] [US6] `frontend/tests/preferences-a11y.test.tsx`: axe, roles, labels, fieldsets, error summary, live-region states, keyboard operation, focus return, dialog behavior.
- [x] T060 [P] [US6] `frontend/tests/preferences-responsive.test.tsx`: 360/768/1024/1440 widths, long Spanish text, long label wrapping, no horizontal scroll, reduced motion.
- [ ] T061 [US6] Perform and record the manual VoiceOver with Safari pass for the critical preference journeys; fix any blocking defects. — **Open**: not executable in the headless implementation environment; see implementation-report.md.

**Checkpoint**: US6 is verified and accessibility defects affecting critical journeys are closed.

---

## Phase 10: Cross-Cutting Contract Verification

**Purpose**: Verify the single consumer contract and cross-story propagation guarantees. Preference independence is verified in T045.

- [x] T068 [P] `frontend/tests/preferences-consumer-contract.test.tsx`: consumers re-render after a save and after an external update; no setter is exposed; no consumer reads `walday:preferences`; `session-only`, `recovery-blocked`, `protected`, `unsupported`, and `conflict` statuses are never treated as persisted; formatting helpers use the applied locale/timezone and are deterministic for fixed inputs.

---

## Phase 11: Polish, Gates, and Documentation

- [x] T062 [P] Reconcile `frontend/src/entities/task` and all consumers with the generic formatting contract; remove transitional compatibility shims.
- [x] T063 [P] Update [quickstart.md](./quickstart.md) notes with any validated environment-specific details; do not duplicate implementation code.
- [x] T064 Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, and `npm run build` from the repository root; fix all failures in touched files.
- [x] T065 Verify coverage against the existing `frontend/vite.config.ts` thresholds: 80% global, and the `src/entities/**` threshold (90% statements/functions/lines, 80% branches); justify any exclusion in writing.
- [x] T066 Re-read [spec.md](./spec.md) §4, §4.12, and §8 against the implementation; record any remaining gap explicitly rather than marking it complete.
- [x] T067 Confirm the backend geocoding proxy is deployed before signing off FR-039–FR-041; if it is not, record the feature as partially delivered for location search.

---

## Dependencies and Execution Order

### Phase dependencies

- **Phase 1**: No dependencies.
- **Phase 2**: Depends on Phase 1 folder structure.
- **Phase 3**: Depends on Phase 2 (types, schema, migration registry).
- **Phases 4–9 (user stories)**: Depend on Phases 2–3. US1 is the MVP; US2, US3, and US4 build on the same store and form; US5 adds the location port; US6 audits the whole surface.
- **Phase 10 (cross-cutting contract verification)**: Depends on US1 and US2 for the provider and consumer surface; can run alongside US5 and US6.
- **Phase 11 (polish and gates)**: Depends on Phases 1–10.

### Story dependencies

- **US1 (P1)**: No story dependency; MVP.
- **US2 (P1)**: Depends on US1 state and form; independently testable once the form exists.
- **US3 (P1)**: Depends on US1 state and form; its validation and draft logic must not be bypassed by later stories.
- **US4 (P2)**: Depends on Phase 3 persistence and US1 status surface.
- **US5 (P2)**: Depends on US1 form and US3 validation.
- **US6 (P2)**: Audits all preceding stories; can start after US1 and continue as stories land.

### Within each story

- Types/schemas/validation before state and UI.
- Tests written with the story and passing before the story is considered complete.
- Entity public API before feature consumption; feature public API before page composition.
- No story may read `localStorage` directly or mutate the preference record outside the store.

## Parallel Opportunities

- Phase 1: T001–T004.
- Phase 2: T005–T008 and T011–T014 in parallel; T009/T010 after T008; T015 after T005; T016 after T012.
- Phase 2 tests: T017–T019 after their corresponding implementation tasks.
- Phase 3: T024–T026 can be written in parallel once T020–T022 exist.
- US1: T031 in parallel with T030; T034 after T030–T033.
- US2: T038/T039 in parallel after implementation.
- US3: T044/T045 in parallel.
- US4: T049/T050 in parallel.
- US5: T054/T055 in parallel.
- US6: T059/T060 in parallel.
- Phase 10: T068 after US1/US2 provider and consumer work; can run in parallel with US5/US6.

## Implementation Strategy

### MVP first (US1)

1. Complete Phases 1–3 (documentation, domain, persistence).
2. Complete US1 (store, form, provider, route, skeleton).
3. Stop and validate US1 independently: defaults, save/cancel, restore, no account/network, no misleading feedback.
4. Demo/review before continuing.

### Incremental delivery

1. Foundation and persistence → safe local model.
2. US1 → guest configuration MVP.
3. US2 → language/locale consistency.
4. US3 → safe updates and truthful feedback.
5. US4 → storage recovery.
6. US5 → location selection (with the proxy dependency recorded).
7. US6 → accessibility and localization hardening.
8. Phase 10 → consumer-contract and independence verification.
9. Phase 11 → gates, coverage, spec re-read, ADR updates.

## Notes

- [P] tasks touch different files and have no dependency on incomplete work.
- Task IDs are stable audit identifiers; phase order is authoritative where an added task ID is numerically later than an earlier phase.
- The Requirement Coverage Map above is the traceability source of truth; update it when a requirement or task is added.
- The previous task list is superseded; do not reuse its completion checkboxes as evidence.
- No task may introduce a runtime dependency or call a weather provider directly.
- TanStack Query is intentionally unused; do not wrap local preferences in query/mutation hooks.
- A task is complete only when its relevant tests pass and `lint`, `typecheck`, `test`, `build`, and coverage gates hold.
- Commit after each task or logical group; stop at checkpoints to validate.
