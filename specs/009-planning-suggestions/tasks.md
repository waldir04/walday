# Tasks: Planning Suggestions

**Input**: Design documents from `/specs/009-planning-suggestions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md, `.specify/memory/constitution.md`

**Tests**: Included. The plan and Constitution Principle VII require the new model, storage, surface, integration, accessibility, responsive, i18n-parity, and no-network tests listed in `plan.md`.

**Organization**: Tasks are grouped by user story. All paths are relative to the repository root; the app lives under `frontend/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story from `spec.md` (`US1`–`US5`)
- Every task includes an exact file path and one atomic change

## Path Conventions

- Single frontend app: `frontend/src/`, `frontend/tests/`
- Feature slice: `frontend/src/features/suggestions/`
- Existing composition roots: `frontend/src/pages/HomePage.tsx`, `frontend/src/widgets/`
- New test files: `frontend/tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Named configuration, snapshot-free time helper, and the `suggestions` i18n namespace.

- [X] T001 [P] Create `frontend/src/shared/config/suggestions.ts` exporting `SUGGESTIONS_STORAGE_KEY = 'walday:suggestion-dismissals'`, `SUGGESTIONS_STORAGE_VERSION = 1`, `SUGGESTION_DISPLAY_LIMIT = 3`, `SUGGESTION_DISMISSAL_LIMIT = 100`, `SUGGESTION_WEATHER_PRECIPITATION_DIFF = 30`, and `SUGGESTION_WEATHER_SEVERITY_DIFF = 2` as consts
- [X] T002 [P] Add `deviceMinuteRange(startEpochMs: number, endEpochMs: number): { startMinutes: number; endMinutes: number }` to `frontend/src/shared/lib/localDateTime.ts`, returning device-local minutes with `startMinutes` in 0..1439 and `endMinutes` in 1..1440, and `endMinutes = 1440` when the end falls on the following local date
- [X] T003 [P] Create `frontend/src/shared/i18n/locales/en/suggestions.json` with every key family required by `contracts/ui-contract.md` §7 (`heading`, `loading`, `error`, `incomplete`, `categories.*`, `actions.*`, `states.noSuggestions.*`, `reasons.*`, `adjust.*`, `feedback.*`, `weather.influencedBy`)
- [X] T004 [P] Create `frontend/src/shared/i18n/locales/es/suggestions.json` as a full Spanish translation with exactly the same key set as the English file
- [X] T005 Register the `suggestions` namespace in `frontend/src/shared/i18n/index.ts` (import both locale files, extend `namespaces`, and add both entries to `resources`)

**Checkpoint**: Constants, device-minute mapping, and both locales exist; no runtime behavior changes yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contract types and pure primitives reused by every story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Create `frontend/src/features/suggestions/model/types.ts` with the exact contracts from `data-model.md` §1.3–§6 and §8: `SuggestionCategory`, `SuggestionTarget`, `PlanningSuggestion`, `SuggestionRank`, `ProposedChange` (`schedule-task`, `move-task`, `move-commitment`), `SuggestionReason` (all eight kinds), `WeatherEvidence`, `SuggestionWeatherHour`, `SuggestionWeatherContext`, `DismissalEntry`, `DismissalRecord`, `DismissalState`, `DismissalWriteCode`, `DismissalWriteResult`, `SuggestionsSurfaceState`, `NoSuggestionReason`, `SuggestionView`, `SuggestionApplyFailureCode`, `SuggestionConflictLink`, `SuggestionApplyOutcome`, and `SuggestionApplyFailure`; encode discriminated unions, not optional grab-bags; the surface state carries no callbacks (`incomplete`/`error` retry comes from the `onRetry` prop)
- [X] T007 Write failing foundational tests in `frontend/tests/suggestions-model.test.ts` for stable identity (§7), change signatures (§6.1), `compareSuggestions` ordering and dedupe by `activityKey` and `activityKey + changeSignature` (contract §6), `openPeriodsExcluding`, and `choosePeriodByWeather` baseline/materiality behavior
- [X] T008 [P] Implement `frontend/src/features/suggestions/model/identity.ts` with `activityKeyFor` (`task:<id>` / `commitment:<id>`), `changeSignatureFor` using the canonical `schedule-task:` / `move-task:` / `move-commitment:` formats, and `suggestionIdFor` using only the stable `conflict:` / `slot:` / `flex:` components from `data-model.md` §7; no localized text, weather, timestamps, random values, or array indexes
- [X] T009 [P] Implement `frontend/src/features/suggestions/model/ordering.ts` with `compareSuggestions` ordered by `categoryRank`, `dueRank`, earliest future `dueDate`, `priorityRank`, `proposedStartMinutes`, `sourceOrder`, then `suggestionId`, and a dedupe helper keeping the first in that order
- [X] T010 [P] Implement `frontend/src/features/suggestions/model/openPeriods.ts` with `openPeriodsExcluding(entries, excludedKey, nowMinutes)` that clips to `[nowMinutes, 1440]`, merges overlapping and touching occupied intervals, inverts them, and applies no 30-minute presentation minimum
- [X] T011 [P] Implement `frontend/src/features/suggestions/model/weather.ts` exporting `CONDITION_SEVERITY` (`clear` 0 … `storm` 6, `unknown` 6) and `choosePeriodByWeather({ fittingPeriods, durationMinutes, weather })`: baseline is the earliest fitting period; return baseline with `evidence: null` when weather is `unavailable`, any compared activity span is not fully covered, `condition === 'unknown'`, precipitation is `null`, or no material difference exists; material means a severity difference of at least `SUGGESTION_WEATHER_SEVERITY_DIFF`, either span containing `storm`/`snow` while the other does not, or a precipitation-probability difference of at least `SUGGESTION_WEATHER_PRECIPITATION_DIFF`; ties choose the earliest period; selection uses no locale or unit (formatting happens in the UI)
- [X] T012 [P] Create `frontend/tests/helpers/suggestionFixtures.ts` with builders for pending/scheduled/completed `Task`, fixed/flexible `Commitment`, `AgendaEntry`, `TimeConflict`, `AvailabilityResult`/`AvailablePeriod`, `SuggestionWeatherContext`, and `DismissalEntry`; fixtures must produce deterministic IDs and source order
- [X] T013 Review T007 together with T008–T012, run the foundational suite, and add any missing case to `frontend/tests/suggestions-model.test.ts` without weakening the public-contract assertions

**Checkpoint**: Shared contracts and pure primitives are green; every user story can build on them independently.

---

## Phase 3: User Story 1 — Understand a conflict suggestion and decide what happens (Priority: P1) 🎯 MVP

**Goal**: One explainable conflict card proposes moving exactly one movable activity; Accept applies only that task slot, Dismiss changes nothing, fixed commitments are never moved.

**Independent Test**: Seed a fixed commitment overlapping a scheduled pending task, open Home, verify one card names both activities and the overlap, proposes a new time for the task only, names the fixed commitment as protected, and changes nothing until Accept.

### Tests for User Story 1

- [X] T014 [US1] Add failing conflict tests to `frontend/tests/suggestions-model.test.ts`: exactly one candidate per conflict group; flexible commitment preferred when it has a valid alternative; otherwise least deadline-urgent task (`no due date` → latest future due date → due today → overdue, then low → medium → high priority, then latest original start, then source order); fixed-only groups produce none; a task without `estimatedMinutes` is not movable; chosen activity has zero overlaps afterward; `remainingOverlaps` names pairs that still overlap; touching boundaries produce no conflict; past times and spans past 1440 are never proposed
- [X] T015 [US1] Add failing surface tests to `frontend/tests/suggestions-surface.test.tsx`: a conflict card shows category label, activity heading, current → proposed time, visible conflict reason (including every group member, fixed protection, and any remaining overlap), Accept/Dismiss actions with accessible names containing the activity and proposed time, one `<li>`, `<h3>` card heading, and `pending` disables both actions

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement `frontend/src/features/suggestions/model/eligibility.ts` with fixed commitments excluded before any selection, movable-task rules (`status === 'pending'`, defined `estimatedMinutes`, a valid alternative start), flexible-commitment eligibility (same date, `type === 'flexible'`, valid alternative), and the conflict comparator from contract §3
- [X] T017 [P] [US1] Implement `frontend/src/features/suggestions/model/conflicts.ts` with `findAlternativeStart` (earliest valid start, `start >= now`, `start + duration <= 1440`, no intersection with any non-excluded entry, not the current start) and `generateConflictCandidates` (one candidate per `TimeConflict` group, reasons naming every member, `fixedProtected` when a fixed commitment participates, and `remainingOverlaps`)
- [X] T018 [US1] Implement `frontend/src/features/suggestions/model/generate.ts` with `GenerateCandidatesInput` and `generateCandidates` for conflict candidates, returning `[]` when `conflicts === null`, sorting with `compareSuggestions`, plus `selectSuggestions` returning the first `SUGGESTION_DISPLAY_LIMIT` active candidates with empty dismissal/reason fields for now; date hiding stays in the controller because the contract input carries no `today`
- [X] T019 [US1] Implement `frontend/src/features/suggestions/model/useSuggestions.ts` controller core: accept `day` (`AgendaDay`), `tasks`, `commitments`, `sources` (`'loading' | 'complete' | 'incomplete'`), `weather`, `now`, `applyTaskSlot`, `applyCommitmentMove`, `locale`, `dateStyle`, and `weatherUnit`; export `SuggestionController`, `UseSuggestionsOptions`, `SuggestionApplier`, `SuggestionApplyOutcome`, `SuggestionApplyFailure`, and `SuggestionApplyFailureCode`; derive `SuggestionsSurfaceState` synchronously in one memo; expose `loading` for the loading source state and `incomplete` for incomplete sources; return an empty ready state when `day.date !== getLocalToday(now)` so the page's `showTodaySurfaces` keeps the widget unmounted
- [X] T020 [US1] Extend `frontend/src/features/suggestions/model/useSuggestions.ts` with Accept and in-session Dismiss: revalidate that the target still exists and is eligible, duration/date are unchanged, and the proposed start still fits without new overlaps; do not require the recomputed weather-influenced choice to keep the same suggestion ID, and retain a still-valid presented card when only weather became unavailable/outdated (FR-033); set `applyingId` and reject duplicates; call exactly one adapter; on success recompute, remove the card, announce the activity and applied time, and move focus metadata to the next suggestion or the section heading; on failure keep the card, return a localized error, and leave all stores untouched
- [X] T021 [P] [US1] Implement `frontend/src/features/suggestions/ui/SuggestionCard.tsx` per `contracts/ui-contract.md` §3 with one `<li>`, `<h3>`, category text pill, current → proposed time with `tabular-nums`, an `aria-describedby` reason paragraph, conflict reason text, and no raw hex/inline styles
- [X] T022 [P] [US1] Implement `frontend/src/features/suggestions/ui/SuggestionActions.tsx` with visible Accept/Dismiss buttons and localized `actions.acceptLabel`/`actions.dismissLabel` accessible names containing the activity and proposed time; visible text must be contained in the accessible name; `pending` disables both actions and shows a localized pending label on the activated action
- [X] T023 [P] [US1] Create `frontend/src/features/suggestions/controller.ts` as the narrow Home entry, exporting `useSuggestions` and its public types exactly as `contracts/suggestion-domain.md` §1
- [X] T024 [P] [US1] Create `frontend/src/features/suggestions/index.ts` with the exports that exist after US1: `generateCandidates`, `selectSuggestions`, `suggestionIdFor`, the model types, and `SuggestionCard` (the dialog and dismissed-review exports are added in T069 once those components exist)
- [X] T025 [US1] Rewrite `frontend/src/widgets/SmartSuggestions.tsx` as a presentational surface: keep `suggestions-heading`, render `aria-busy` only for loading or a pending apply, render at most three cards in an ordered list, render no card for incomplete/error states, and own exactly one `aria-live="polite"` region
- [X] T026 [US1] Update `frontend/src/widgets/HomeDashboard.tsx` to accept the feature `SuggestionsSurfaceState` plus `dateStyle`, `onAccept`, and `onDismiss`, reuse the existing `formattingLocale`/`weatherUnit` props, and forward them to `SmartSuggestions` (keep `showTodaySurfaces` behavior)
- [X] T027 [US1] Wire `frontend/src/pages/HomePage.tsx`: import `useSuggestions` from `@/features/suggestions/controller`, build the existing `AgendaDay`, pass the real `sources` state (`'loading'` while `!commitments.ready`, `'incomplete'` when either source is quarantined/unsupported/recovery-blocked/protected, otherwise `'complete'`) and a temporary `{ status: 'unavailable' }` weather port, implement `applyTaskSlot` through `validateScheduleDraft` + `tasks.scheduleTask`, implement `applyCommitmentMove` through `commitments.update` preserving title/description/date/type and duration, and pass state/callbacks to `HomeDashboard` without new storage writes
- [X] T028 [US1] Add failing-to-passing Home integration tests in `frontend/tests/suggestions-integration.test.tsx`: fixed commitment at 09:00–10:00 plus task 09:30–10:30 shows one conflict card; no store changes before Accept; Accept updates only the task planned time, leaves the fixed commitment untouched, and the agenda reflects the change without reload; the accepted suggestion is not presented again after its change is reflected; Dismiss changes no data and keeps the agenda conflict visible; fixed-only overlap produces no card; stale-context cases are refused with no write and a recovery message — target completed, target deleted, task scheduled elsewhere, estimated duration changed, commitment changed to fixed, and a new fixed overlap added after presentation without acknowledgment

**Checkpoint**: US1 is independently functional and testable; this is the MVP surface.

---

## Phase 4: User Story 2 — Find time for an unscheduled task (Priority: P2)

**Goal**: Pending unscheduled tasks with durations are placed inside presented available periods in the documented urgency order; flexible commitments may move only to unblock a named beneficiary task.

**Independent Test**: Seed pending tasks with different due dates, priorities, and durations alongside commitments; verify each proposed start is inside a presented period, contains the full duration, avoids every other activity, respects urgency/priority order, and never schedules a task without approval.

### Tests for User Story 2

- [X] T029 [US2] Add failing slot and flexible-adjustment tests to `frontend/tests/suggestions-model.test.ts`: eligible task is pending, has no `plannedDate`, `estimatedMinutes >= 1`, and fits a presented period; the proposal uses `schedule-task` with `endMinutes <= 1440`; tasks longer than every period get no suggestion; tasks without durations get none; urgency order is overdue → due today → earliest future due date → no due date, then high → medium → low; past periods are excluded; flexible move names the beneficiary, targets only `move-commitment`, preserves duration/date, is skipped when the activity already has a higher-precedence suggestion, and is skipped when the alternative is the current period or creates a new overlap; the generated change targets only the commitment and never schedules the beneficiary

### Implementation for User Story 2

- [X] T030 [P] [US2] Implement `frontend/src/features/suggestions/model/slots.ts` with `generateSlotCandidates`: one candidate per eligible task, use only `day.availability.periods`, propose the chosen period's `startMinutes`, set `endMinutes = startMinutes + estimatedMinutes` with `endMinutes <= 1440`, always include a `fit` reason, include `due-date` and `priority` when applicable, and include `weather` only when `choosePeriodByWeather` returns non-null evidence
- [X] T031 [P] [US2] Implement `frontend/src/features/suggestions/model/flexibleAdjustment.ts` with `generateFlexibleAdjustmentCandidates`: beneficiaries are pending unscheduled tasks with a duration that no presented period fits, iterated in slot urgency order; flexible commitments on the current date iterate by earliest original start then stable key; alternative starts iterate ascending and the first simulated move that yields an open interval fitting the beneficiary wins, applying the agenda's 30-minute presentation minimum from `frontend/src/shared/config/agenda.ts`; the only change is `move-commitment`; reasons include `beneficiary` and `fit`
- [X] T032 [US2] Extend `frontend/src/features/suggestions/model/generate.ts` to append slot and flexible-adjustment candidates, handle `availability.kind === 'none'` for slot generation while still allowing conflict candidates, pass occupied activity keys to the flexible generator, and dedupe/order across all three categories
- [X] T033 [US2] Extend `frontend/src/features/suggestions/model/useSuggestions.ts` for `move-commitment`: revalidate that the commitment is still flexible and on the current date, keep the same duration/date, call only `applyCommitmentMove`, recompute afterward so the beneficiary task can appear as a separate slot suggestion, and never schedule the beneficiary in the same action
- [X] T034 [P] [US2] Extend `frontend/src/features/suggestions/ui/SuggestionCard.tsx` to render slot and flexible-adjustment reason kinds (`fit`, `due-date`, `priority`, `beneficiary`), their category labels, and the `currentLabel === null` unscheduled state, using only `suggestions` namespace copy and `Intl`-based formatters
- [X] T035 [US2] Add Home integration tests to `frontend/tests/suggestions-integration.test.tsx`: accepting a slot saves the planned start/end and removes the task from unscheduled; a duration longer than every period produces no card; missing durations produce no slot; accepting a flexible move changes only the commitment times and a later recalculation offers a separate slot suggestion

**Checkpoint**: US1 and US2 work independently; flexible adjustment never schedules two records in one action.

---

## Phase 5: User Story 3 — Let weather influence the choice only when it matters (Priority: P2)

**Goal**: Weather changes a slot choice only among periods that already fit, only when the activity span is fully covered by current weather and the difference is material; otherwise suggestions are identical and never cite weather.

**Independent Test**: Prepare two equally suitable periods with clearly different forecast conditions; with available current weather the better period is chosen and cited, while with outdated, unavailable, or partial weather the earliest period is chosen, no weather is cited, and all non-weather suggestions still appear.

### Tests for User Story 3

- [X] T036 [US3] Add failing weather-adapter tests to `frontend/tests/suggestions-model.test.ts`: `buildWeatherContext` returns `unavailable` when `isReady` is false, `isOutdated` is true, or there are no current-day hours; maps epoch hours to device-local `startMinutes`/`endMinutes`; drops other-day and duplicate/overlapping hours; preserves DST-derived hour length; never invents values for missing hours

### Implementation for User Story 3

- [X] T037 [US3] Add `buildWeatherContext` to `frontend/src/features/suggestions/model/weather.ts`: accept a local structural input `{ hours: readonly { timeMs: number; condition: Conditions; precipitationProbability: number | null }[]; today: LocalDate; isReady: boolean; isOutdated: boolean }` (no import from `features/weather`), keep only hours on the current device-local date, map ranges with `deviceMinuteRange`, sort by `startMinutes`, remove overlapping/duplicate hours, and return `{ status: 'available', hours }` or `{ status: 'unavailable' }` with no location, coordinates, units, or provider identifiers
- [X] T038 [US3] Extend `frontend/src/features/suggestions/ui/SuggestionCard.tsx` to render `WeatherEvidence` as text (condition and precipitation in the selected units and time span) only when `weatherEvidence !== null`; never rely on an icon or color and never claim guaranteed completion
- [X] T039 [US3] Replace the temporary weather port in `frontend/src/pages/HomePage.tsx` with `buildWeatherContext`, mapping `weather.state` (`status === 'ready'`, `freshness.isOutdated`, and `hours[].timeMs/condition/precipitationProbability`) so stale, unavailable, or partial weather yields `unavailable` without any new request or error state
- [X] T040 [US3] Add weather integration tests to `frontend/tests/suggestions-integration.test.tsx`: available material difference chooses the better fitting period and cites the factual condition; unavailable/outdated/partial weather keeps the baseline earliest period, cites no weather, and renders no error; when only one period fits the duration, that period is chosen regardless of weather; a language or unit change updates cited values without applying anything; a weather-influenced suggestion remains presented and applicable after weather becomes unavailable, with weather no longer cited and no automatic change

**Checkpoint**: US1–US3 work independently; weather is optional context and never blocks or fabricates a recommendation.

---

## Phase 6: User Story 4 — Adjust a suggestion before accepting it (Priority: P3)

**Goal**: The user can choose a different valid start time, see current/original-proposed/adjusted times together, acknowledge conflicts explicitly, and apply only the adjusted change.

**Independent Test**: Open Adjust on a card, choose a different free start time, apply it, and confirm only the adjusted values were saved; repeat with an overlapping time and confirm nothing is saved without explicit acknowledgment.

### Tests for User Story 4

- [X] T041 [US4] Add failing adjust-dialog tests to `frontend/tests/suggestions-surface.test.tsx`: current, originally proposed, and adjusted times appear together; duration is read-only; flexible adjustments edit only the start time; invalid, past, outside-day, and after-midnight times show inline errors and change nothing; overlapping times name every conflicting activity and time range and block confirm until acknowledged; cancelling changes nothing and returns focus; a failed save keeps the dialog, values, acknowledgment, and retry

### Implementation for User Story 4

- [X] T042 [P] [US4] Implement `frontend/src/features/suggestions/ui/SuggestionAdjustDialog.tsx` as a native `<dialog>` with `aria-modal="true"`, heading label, existing `useDialogFocusTrap`, time input, read-only duration, current/proposed/adjusted display, inline `aria-describedby` errors, conflict acknowledgment checkbox, preserved values on failure, and focus return to the invoking button
- [X] T043 [US4] Extend `frontend/src/features/suggestions/ui/SuggestionActions.tsx` with the Adjust action and localized `actions.adjustLabel` accessible name; keep all three actions disabled while pending
- [X] T044 [US4] Extend `frontend/src/features/suggestions/model/useSuggestions.ts` with the adjusted-apply path: reject empty/invalid times, starts before `now`, spans leaving the current local day, and spans ending after 1440; for a flexible commitment derive the end from the preserved duration; compute overlaps against current entries and return `needs-acknowledgment` with every conflicting title/range unless `acknowledged`; revalidate the target before calling exactly one adapter; never mutate a store on refusal
- [X] T045 [US4] Update `frontend/src/widgets/SmartSuggestions.tsx` to hold only presentation-local dialog state, wire `onAdjust`/`onConfirm`/`onClose`, keep one announcement per outcome, and return focus to the invoking control on cancel
- [X] T046 [US4] Update `frontend/src/widgets/HomeDashboard.tsx` to accept and forward `onAdjust` without adding derivation to widgets
- [X] T047 [US4] Update `frontend/src/pages/HomePage.tsx` to pass `onAdjust` from the controller through `HomeDashboard`
- [X] T048 [US4] Add adjust integration tests to `frontend/tests/suggestions-integration.test.tsx`: adjusted valid time applies only the adjusted change; overlapping adjusted time requires the agenda's explicit acknowledgment and declining leaves all data unchanged; a flexible commitment keeps its duration and date and stays flexible; repeated confirm applies exactly once; a target that becomes stale between opening the dialog and confirming is refused with no write and kept values

**Checkpoint**: US1–US4 work independently; adjustment reuses agenda scheduling semantics rather than bypassing them.

---

## Phase 7: User Story 5 — Keep suggestions calm, limited, and recoverable (Priority: P3)

**Goal**: At most three suggestions, dismissals remembered on this device for the local day across reloads, review/restore without applying, and every no-suggestion or incomplete-data case explained with a next action.

**Independent Test**: Build an overloaded day, verify count/order, dismiss and reload, dismiss all, review/restore, change the local day, and check the no-suggestion explanations for planned, unplanned, duration-less, and unavailable-data days.

### Tests for User Story 5

- [X] T049 [US5] Create `frontend/tests/suggestions-storage.test.ts` with failing tests for: missing storage, throwing storage, quota failure, absent `removeItem`; invalid JSON, unknown keys, wrong version, wrong date, invalid timestamp, and more than 100 entries invalidate the payload; same-day reload keeps entries; next-day load starts empty; dismissing twice for one ID keeps one latest entry; a different change for the same activity creates a distinct entry; restore removes only the match and applies nothing; merging two writes preserves both IDs; no task or commitment storage key is touched
- [X] T050 [P] [US5] Implement `frontend/src/features/suggestions/model/dismissalSchema.ts` with the strict Zod schema from `contracts/dismissal-storage.md` §2: `version` literal `SUGGESTIONS_STORAGE_VERSION`; `localDate` matches `YYYY-MM-DD` and passes `isLocalDate`; `entries` max `SUGGESTION_DISMISSAL_LIMIT`; `suggestionId` 1–200 chars; `activityKey` 1–200 chars; `changeSignature` 1–400 chars; `dismissedAt` parses with `Date.parse`; unknown keys rejected
- [X] T051 [P] [US5] Add failing selection tests to `frontend/tests/suggestions-model.test.ts`: dismissed `activityKey + changeSignature` pairs are excluded; stale dismissals whose candidate no longer exists are dropped; at most one candidate per activity; at most three active; hidden candidates are never counted or placeholdered; no-suggestion precedence is `all-dismissed` → `day-already-planned` → `missing-durations` → `no-free-period` → `nothing-actionable`

### Implementation for User Story 5

- [X] T052 [US5] Implement `frontend/src/features/suggestions/model/dismissalStorage.ts` with `loadDismissals`, `dismissSuggestion`, and `restoreSuggestion`: synchronous side-effect-free read that never throws; re-read/merge by `suggestionId`; prune other days; cap at `SUGGESTION_DISMISSAL_LIMIT` keeping the most recent; write once through `enqueueWrite`; return `session-only` with the in-memory decision on storage failure; remove the key through `removeItem` when the storage object supports it, otherwise write an empty record; never persist titles, descriptions, due dates, weather, location, or account identifiers
- [X] T053 [US5] Extend `frontend/src/features/suggestions/model/generate.ts` `selectSuggestions` to partition by `activityKey + changeSignature` using `DismissalEntry[]`, return matching dismissed candidates, drop stale dismissals, limit active to `SUGGESTION_DISPLAY_LIMIT`, and compute `noSuggestionReason` with the research R9 precedence
- [X] T054 [US5] Extend `frontend/src/features/suggestions/model/useSuggestions.ts` to load dismissals for the current date once per mount (lazy initializer, not inside the generation memo), exclude dismissed candidates, persist dismiss/restore, expose `persistence: 'persisted' | 'session-only'` without claiming permanence, recompute on restore, and keep the card removed for the session when storage fails
- [X] T055 [P] [US5] Implement `frontend/src/features/suggestions/ui/SuggestionDismissedReview.tsx` with a disclosure button using `aria-expanded`/`aria-controls`, no Accept/Adjust actions, activity plus proposed-change text, Restore per item, keyboard operation, hidden content until expanded, and sensible focus after restore
- [X] T056 [P] [US5] Implement `frontend/src/features/suggestions/ui/SuggestionSurfaceStates.tsx` with the loading skeleton (matching final card geometry, skeletons `aria-hidden`, one sr-only status), incomplete/unavailable explanation plus Retry, generic error plus Retry, and the no-suggestion reason state with its relevant next action
- [X] T057 [US5] Extend `frontend/src/widgets/SmartSuggestions.tsx` to render loading, incomplete, error, ready-with-cards, ready-no-suggestions, all-dismissed, and dismissed-review states; keep `aria-busy` correct, render no disabled placeholders, and announce applied/dismissed/restored/failure exactly once
- [X] T058 [US5] Update `frontend/src/widgets/HomeDashboard.tsx` to accept and forward `onRestore` and `onRetry`
- [X] T059 [US5] Update `frontend/src/pages/HomePage.tsx` to pass `onRestore`, `onRetry`, the real incomplete/error state derived from task and commitment sources, and to keep the surface hidden whenever `selectedDate !== today`
- [X] T060 [US5] Add integration tests to `frontend/tests/suggestions-integration.test.tsx`: dismiss then reload suppresses the same activity/change for the same device-day; the next local day starts empty; restore returns the card without applying; all-dismissed shows review plus next action; a guest with no tasks or commitments shows the `day-already-planned` explanation plus a relevant creation/next action and never an error; incomplete task/commitment sources show the unavailable explanation with Retry, no partial cards, and usable rest-of-Home content; a session-only dismissal shows the `feedback.dismissalNotSaved` notice and never claims permanence; selecting another date hides the surface and neither generates nor applies anything; after resolving one of more-than-three candidates the newly relevant hidden suggestion appears without a reload (FR-048); repeated Accept applies exactly one change

**Checkpoint**: All user stories are independently functional; dismissal memory is device-local and day-scoped.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, localization parity, responsive behavior, existing-test updates, documentation, performance, and end-to-end validation.

- [X] T061 [P] Create `frontend/tests/suggestions-a11y.test.tsx` covering axe in loading, ready, no-suggestion, dismissed, and incomplete states; keyboard-only Accept/Adjust/Dismiss, dialog open/confirm/cancel, review and restore; visible focus and no trap; one polite announcement per outcome; focus landing on the next action, surface heading, or restored card; reason exposed through `aria-describedby`; reduced-motion behavior
- [X] T062 [P] Create `frontend/tests/suggestions-i18n.test.ts` asserting full `en`/`es` parity for the `suggestions` namespace, no hardcoded user-facing strings in `frontend/src/features/suggestions/ui/` and `frontend/src/widgets/SmartSuggestions.tsx`, locale-correct dates, times, durations, and precipitation from the selected preferences, no reason or action copy that claims optimality, guaranteed completion, required acceptance, or vague productivity/mood/predicted-success benefits (FR-037, FR-039), and that switching language while cards are displayed re-renders all copy and reasons without applying anything or losing the suggestion
- [X] T063 Extend `frontend/tests/suggestions-surface.test.tsx` with responsive checks at 360, 768, 1024, and 1440 px plus 200 % zoom: no page-level horizontal scrolling, no clipped action labels, primary actions visible without hover, interactive targets at least 24 by 24 CSS pixels (44 recommended), category/weather/conflict meaning always carried by text, and no more than three cards
- [X] T064 Update `frontend/tests/smart-suggestions.test.tsx` for the working surface: loading/error/incomplete states, actionable cards, the no-suggestion state replacing the previously empty region, and one live region
- [X] T065 Update `frontend/tests/home-dashboard.test.tsx` for the new Smart Suggestions props/state and verify the surface still renders after weather and before the agenda
- [X] T066 [P] Create `docs/adr/0013-planning-suggestions-client-derived.md` recording client-derived deterministic generation, type-only agenda coupling, existing agenda/commitment mutation adapters, device-local day-scoped dismissals, and the no-new-dependency decision
- [X] T067 Add performance assertions to `frontend/tests/suggestions-model.test.ts`: one synchronous `generateCandidates`/`selectSuggestions` pass for 50 tasks and 20 commitments stays within the test budget, returns at most three active suggestions, and produces identical output for identical inputs
- [X] T068 Add a no-network assertion to `frontend/tests/suggestions-integration.test.tsx`: rendering and recalculating the surface issues no new fetch/XHR beyond the existing weather transport and performs no storage read on recalculation, with dismissal storage read at most once per mount
- [X] T069 Extend `frontend/src/features/suggestions/index.ts` with the `SuggestionAdjustDialog` and `SuggestionDismissedReview` exports required by `contracts/suggestion-domain.md` §1, so the slice exposes its complete public API
- [X] T070 Run `npm --prefix frontend run lint`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run test`, and `npm --prefix frontend run build`; fix any failures inside `frontend/src/features/suggestions/**`, `frontend/src/widgets/SmartSuggestions.tsx`, or `frontend/src/pages/HomePage.tsx`
- [X] T071 Execute the automated and manual scenarios in `specs/009-planning-suggestions/quickstart.md` §1–§12 against `frontend/` (including the separate SC-009 usability check and SC-010 screen-reader review) and fix functional discrepancies in `frontend/src/features/suggestions/**`; do not claim SC-009/SC-010 from automated tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup; blocks every user story.
- **US1 (Phase 3)**: Depends on Foundational; delivers the first end-to-end slice.
- **US2 (Phase 4)**: Depends on Foundational and reuses US1's controller/surface; independently testable through slot candidates.
- **US3 (Phase 5)**: Depends on Foundational and US2's slot generation; independently testable with weather on/off.
- **US4 (Phase 6)**: Depends on Foundational and US1's card/actions; independently testable through the dialog.
- **US5 (Phase 7)**: Depends on Foundational and US1–US2 for candidates to limit/dismiss; independently testable through storage and surface states.
- **Polish (Phase 8)**: Depends on all desired user stories.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after Foundational.
- **US2 (P2)**: Uses the US1 controller/surface but its model contracts are independently testable; flexible adjustment depends only on the shared interval and ordering primitives.
- **US3 (P2)**: Uses US2 slot generation; with `unavailable` weather the baseline behavior is identical to US2.
- **US4 (P3)**: Uses US1 card/actions; independent of US2/US3.
- **US5 (P3)**: Uses US1–US2 candidates; independent of US3/US4 except for final combined regression tests.

### Within Each User Story

- Tests are written first and must fail.
- Model modules before generation orchestration.
- Controller before Home composition.
- Feature UI before widget wiring.
- Widget/dashboard before page composition.
- Integration test last.

### Parallel Opportunities

- T001–T004 (config, time helper, both locales) are different files.
- T008–T012 (identity, ordering, open periods, weather selector, fixtures) are different files.
- T016/T017 (eligibility, conflicts) are different files.
- T021/T022 (card, actions) and T023/T024 (barrels) are different files.
- T030/T031 (slots, flexible adjustment) are different files.
- T034 touches a different file from T032/T033.
- T042 is independent of T043–T047.
- T050/T051 and T055/T056 are separate files.
- T061/T062/T066 are separate files.

---

## Parallel Example: Phase 2

```bash
Task: "Implement identity.ts per data-model §7"
Task: "Implement ordering.ts per contract §6"
Task: "Implement openPeriods.ts interval inversion"
Task: "Implement weather.ts choosePeriodByWeather"
Task: "Create tests/helpers/suggestionFixtures.ts"
```

## Parallel Example: User Story 1

```bash
Task: "Implement eligibility.ts movable-task comparator"
Task: "Implement conflicts.ts group generation"
Task: "Implement SuggestionCard.tsx"
Task: "Implement SuggestionActions.tsx"
Task: "Create controller.ts public entry"
Task: "Create index.ts public API"
```

## Parallel Example: User Story 2

```bash
Task: "Implement slots.ts"
Task: "Implement flexibleAdjustment.ts"
Task: "Extend SuggestionCard.tsx for slot/flexible reasons"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: US1.
4. **STOP and VALIDATE**: run T014, T015, T028; verify no data changes before Accept and the agenda updates immediately after.
5. Demo the conflict card surface.

### Incremental Delivery

1. Setup + Foundational → contracts and pure primitives ready.
2. US1 → conflict card, accept/dismiss, agenda apply (MVP).
3. US2 → slot placement, urgency ordering, flexible adjustment.
4. US3 → weather influence with graceful degradation.
5. US4 → adjust dialog with acknowledgment.
6. US5 → limit, dismissal memory, review/restore, no-suggestion and incomplete states.
7. Polish → accessibility, i18n parity, responsive, performance, no-network, ADR, quickstart.

### Parallel Team Strategy

1. One developer completes Setup + Foundational.
2. After Foundational:
   - Developer A: US1 (model + controller + surface).
   - Developer B: US2 model modules against fixtures, then integrates with US1's controller.
   - Developer C: US5 storage module and schema independently, then surface states.
3. US3 and US4 integrate after US1/US2 land; Polish runs last.

---

## Notes

- [P] tasks touch different files and have no dependency on an incomplete task.
- Every user story ends with a checkpoint that can be validated without later stories.
- Tests must fail before implementation in each phase.
- Never write tasks, commitments, or planned slots from suggestion code; only adapters supplied by `HomePage` perform exactly one existing store mutation.
- Fixed commitments are excluded from every candidate list and every `ProposedChange` variant.
- No new runtime dependency, backend call, AI/ML, or cross-device persistence is introduced.
