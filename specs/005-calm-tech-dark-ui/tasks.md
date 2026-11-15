---
description: "Atomic implementation tasks for the Calm Tech Dark UI redesign"
---

# Tasks: Calm Tech Dark UI Redesign

**Input**: Design documents from `/specs/005-calm-tech-dark-ui/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-contracts.md`, `quickstart.md`, and `.specify/memory/constitution.md`

**Tests**: Included. `plan.md` and the constitution require tests for accessibility, critical journeys, storage behavior, and the new presentation contracts. Write each story’s tests before its implementation tasks and verify they fail for the expected reason.

**Organization**: Tasks are grouped by user story so each story has an independent test checkpoint. This feature is frontend-only; every path below is under `frontend/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different files, no dependency on an incomplete task
- **[Story]**: `[US1]`, `[US2]`, or `[US3]`
- Every task includes the exact file path(s) it changes

## Path Conventions

Web application frontend: `frontend/src/`, `frontend/tests/`, `frontend/index.html`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the two approved runtime assets and the document-level theme metadata.

- [X] T001 Add `lucide-react@1.72.0` and `@fontsource-variable/inter@5.3.0` to `frontend/package.json` and update `frontend/package-lock.json`; verify both install cleanly and record the final bundle-relevant versions.
- [X] T002 [P] Import `@fontsource-variable/inter` in `frontend/src/app/bootstrap.tsx` so the variable face is self-hosted; rely on the package's unicode-range subsets so browsers fetch only the needed WOFF2, and do not add a remote font request.
- [X] T003 [P] Add `<meta name="theme-color" content="#0B1215" />` to `frontend/index.html` so the browser chrome matches the canvas.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Theme tokens, global dark styles, shared copy, and shared primitives that every story consumes.

**⚠️ CRITICAL**: Complete this phase before starting US1, US2, or US3.

- [X] T004 Replace the light values in `frontend/src/index.css` `@theme` with the canonical palette: `canvas #0B1215`, `surface #131D22`, `surface-raised #152026`, `surface-subtle #152026`, `border #23323A`, `border-strong #5B6B73`, `text #F3F4F6`, `text-muted #8B9BA3`, `text-inverse #0B1215`, `primary #34D399`, `primary-hover #10B981`, `primary-strong #10B981`, `muted #8B9BA3`, `danger #F87171`, `success #34D399`, `warning #FBBF24`, `focus #34D399`, `warm #FBBF24`, `cool #38BDF8`, `suggestion-surface #A7F3D0`, `suggestion-surface-strong #6EE7B7`, `suggestion-text #064E3B`, `suggestion-cta #0F172A`, `tag-border #2A3B44`, and `tag-text #9CA3AF`; set `--radius-card: 1rem`, `--radius-control: 0.5rem`, and update `--font-sans` to Inter with `system-ui` fallback.
- [X] T005 Update `frontend/src/index.css` global styles: `html { color-scheme: dark; }`, body background `canvas`, body text `text`, Inter font, the existing 2px focus outline on `focus`, a short drawer entry keyframe, row-action media utilities (`row-actions-inline` only for `min-width: 768px` plus `hover: hover` and `pointer: fine`; `row-actions-compact` otherwise), and the existing reduced-motion override; keep the existing spacing and typography tokens.
- [X] T006 [P] Add `nav.openMenu`, `nav.closeMenu`, `nav.drawerTitle`, and `actions.menuLabel` (for example, "Actions for {{title}}") to `frontend/src/shared/i18n/locales/en/common.json`; remove the now-unused `nav.foundation` key and keep the four destination labels.
- [X] T007 [P] Add the Spanish equivalents of the T006 keys to `frontend/src/shared/i18n/locales/es/common.json`; remove `nav.foundation`.
- [X] T008 [P] Create `frontend/src/shared/i18n/locales/en/home.json` with `title`, `heading`, `description`, `today`, `tasks.*`, `commitments.*`, `storageNotice.*`, `weather.*` (including all six state labels and all seven condition labels), and `suggestions.*`.
- [X] T009 [P] Create the Spanish counterpart `frontend/src/shared/i18n/locales/es/home.json` with the same key structure, including `storageNotice.*`, and Latin American Spanish copy.
- [X] T010 Import the English and Spanish `home` resources in `frontend/src/shared/i18n/index.ts`, add `home` to `namespaces`, and expose it in both `resources` entries.
- [X] T011 [P] Restyle `frontend/src/shared/ui/Button.tsx`: primary uses `bg-primary text-text-inverse hover:bg-primary-hover`; danger uses `bg-danger text-text-inverse`; secondary uses `border-border-strong bg-surface text-text hover:bg-surface-raised`; ghost uses `text-primary hover:bg-surface-raised`; preserve `min-h-11 min-w-11` and focus-visible behavior.
- [X] T012 [P] Restyle `frontend/src/shared/ui/Link.tsx`: inline links use mint `text-primary hover:text-primary-hover`; navigation links use `text-text-muted` with `hover:bg-surface hover:text-primary`; preserve `min-h-11 min-w-11`.
- [X] T013 [P] Update `frontend/src/shared/ui/Container.tsx` to use `max-w-6xl` with the existing responsive page padding for the wider dashboard.
- [X] T014 [P] Restyle `frontend/src/shared/ui/EmptyState.tsx`: elevated surface card, `border-border`, `rounded-2xl`, `p-5`, off-white heading, muted description, and a small decorative mint `Inbox` icon (`aria-hidden`) above the heading.
- [X] T015 [P] Restyle `frontend/src/shared/ui/ErrorState.tsx`: `bg-surface`, `border-danger`, `rounded-2xl`, `p-5`, danger heading, off-white description, and visible action area.
- [X] T016 [P] Restyle `frontend/src/shared/ui/SuccessState.tsx`: mint success text, off-white description, and the existing `role="status"` live announcement.
- [X] T017 [P] Restyle `frontend/src/shared/ui/Skeleton.tsx`: skeleton blocks use `bg-surface-raised` on the dark canvas and remain `aria-hidden`.
- [X] T018 [P] Restyle `frontend/src/shared/ui/Loading.tsx`: retain the busy and live-region attributes and use the dark skeleton surface.
- [X] T019 [P] Add `frontend/src/shared/lib/useDialogFocusTrap.ts`: shared native-dialog behavior that calls `showModal()`/`close()`, stores and restores the previously focused element, traps Tab within the dialog, closes on Escape, optionally locks body scroll, and falls back safely when dialog methods are unavailable.
- [X] T020 Refactor `frontend/src/shared/ui/ConfirmDialog.tsx` to use `useDialogFocusTrap`, keep its existing accessible name/description and cancel/confirm behavior, and restyle the panel to `bg-surface border-border rounded-2xl p-5 text-text` with `backdrop:bg-canvas/80`.
- [X] T021 [P] Restyle `frontend/src/app/RouteError.tsx` with the dark canvas, danger heading, off-white description, and the shared button/link tokens; preserve focus-to-heading and reload behavior.
- [X] T022 [P] Restyle `frontend/src/shared/ui/ErrorBoundary.tsx` fallback with the dark canvas, danger heading, off-white copy, and shared button/link tokens; preserve reset/reload behavior.

**Checkpoint**: Theme tokens, dark globals, shared copy, and shared primitives are ready. User stories can begin.

---

## Phase 3: User Story 1 — Navigate a Branded, Responsive Shell (Priority: P1) 🎯 MVP

**Goal**: Deliver the sticky branded header, exactly four destinations, the desktop link row, and the mobile hamburger drawer with complete keyboard and focus behavior.

**Independent Test**: At 360 px and 1440 px widths, load any page, confirm the brand mark, reach Home/Tasks/Commitments/Settings, open and close the mobile drawer with pointer and keyboard, and identify the active destination without relying on color alone.

### Tests for User Story 1

- [X] T023 [P] [US1] Update `frontend/tests/shell.test.tsx`: assert one banner, one named navigation, one main region, one page `h1`, the Walday brand, exactly four navigation destination links, no Foundation destination, and an active link with `aria-current="page"` plus a non-color indicator.
- [X] T024 [P] [US1] Update `frontend/tests/shell-responsive.test.tsx`: assert the sticky header contains `sticky`, `top-0`, `backdrop-blur-md`, and `bg-canvas/80`; the desktop row is `hidden md:flex`; the mobile trigger is `md:hidden`; all four destination links keep `min-h-11`; the viewport declaration remains; and no fixed-width overflow is introduced.
- [X] T025 [P] [US1] Add `frontend/tests/walday-logo.test.tsx`: assert the inline SVG `viewBox="0 0 32 32"`, the supplied monogram path, `stroke="currentColor"`, `text-primary`, visible wordmark by default, and no wordmark when `showText={false}`.
- [X] T026 [P] [US1] Add `frontend/tests/navigation-drawer.test.tsx`: mobile trigger opens a named dialog; focus enters the drawer and stays within it; Escape closes; focus returns to the trigger; selecting a destination closes it; route change closes it; widening past 768 px closes it; body scroll is locked while open; the background navigation is not duplicated in the accessibility tree; open and close state transitions complete within the 200 ms budget.

### Implementation for User Story 1

- [X] T027 [P] [US1] Create `frontend/src/shared/ui/WaldayLogo.tsx` with the exact supplied monogram geometry, `stroke="currentColor"`, `strokeWidth="3.6"`, rounded caps/joins, `aria-hidden`, the valid SVG namespace, `className` and `showText` props, and the off-white `Walday` wordmark using `text-text`.
- [X] T028 [P] [US1] Create `frontend/src/widgets/MobileNavigationDrawer.tsx`: controlled by `open`/`onClose` props; native `<dialog>` opened with `showModal()`, `aria-modal="true"` and an `aria-labelledby` title, canvas/95 blurred full-width panel, four stacked `p-4 rounded-2xl` destinations with at least 44 px height, an explicit close control, `useDialogFocusTrap` with body scroll lock, close on route change and on `matchMedia('(min-width: 768px)')`, and a destination list rendered inside the single parent navigation landmark rather than a second `<nav>`.
- [X] T029 [US1] Rewrite `frontend/src/widgets/Navigation.tsx`: own the drawer open state; render exactly Home (`/`), Tasks, Commitments, and Settings in that order; desktop inline row at `md` and above; mobile-only `Menu`/`X` trigger with `aria-expanded` and `aria-controls`; mint active state on `bg-surface` plus a non-color underline/indicator and `aria-current="page"`; set `aria-hidden`/`inert` on the desktop row while the drawer is open; render `MobileNavigationDrawer` inside the single navigation landmark.
- [X] T030 [US1] Rewrite `frontend/src/widgets/AppShell.tsx`: sticky `top-0 z-40` header with `bg-canvas/80 backdrop-blur-md border-b border-border`, brand link containing `WaldayLogo`, one navigation region, canvas main area, and the existing skip link and route announcer; preserve the `main-content` id and heading focus target.

**Checkpoint**: User Story 1 is independently demonstrable and testable at mobile and desktop widths.

---

## Phase 4: User Story 2 — Read Every Screen in One Calm Dark Visual Language (Priority: P2)

**Goal**: Re-skin the four working sections and their rows, forms, notices, empty/error states, and dialogs with the shared dark system while preserving behavior.

**Independent Test**: Visit Home, Tasks, Commitments, and Settings at 360, 768, 1024, and 1440 px widths and confirm every surface uses the dark canvas, deep-slate cards, subtle borders, off-white/muted typography, token-only pills, and accessible control boundaries, with no light surface remaining.

### Tests for User Story 2

- [X] T031 [P] [US2] Update `frontend/tests/a11y-tokens.test.tsx`: assert all canonical tokens exist, text/muted/primary/danger/success/warning meet 4.5:1 on `surface`, `border-strong` meets 3:1, `border` is treated as decorative, focus meets 3:1, `canvas` is `#0B1215`, and `suggestion-text` on `suggestion-surface` plus `text` on `suggestion-cta` meet 4.5:1.
- [X] T032 [P] [US2] Add `frontend/tests/row-actions.test.tsx`: fine-pointer inline actions use the hover/focus-within opacity behavior with reserved space; the inline mode is gated by the `row-actions-inline` fine-pointer media utility while the compact disclosure remains available outside that media query for coarse pointers and wide tablets; exact accessible labels are preserved; closed rows expose only one action set; opening the disclosure mounts edit/delete within it without hover.

### Implementation for User Story 2

- [X] T033 [US2] Create `frontend/src/shared/ui/RowActions.tsx`: `actions` and `menuLabel` props; inline mode uses the `row-actions-inline` fine-pointer media utility with `opacity-0`, `group-hover:opacity-100`, `group-focus-within:opacity-100`, and `transition-opacity duration-150 ease-out`; compact mode uses the `row-actions-compact` utility with a persistent native `<details>` disclosure whose summary uses `border-border-strong`, a `MoreHorizontal` icon, and `min-h-11 min-w-11`, and whose action buttons mount only while open; action buttons keep `min-h-11 min-w-11`; danger tone uses the danger token; no layout shift.
- [X] T034 [P] [US2] Restyle `frontend/src/features/tasks/ui/TaskItem.tsx`: `group rounded-2xl border border-border bg-surface p-5`, completion checkbox at `h-6 w-6 min-h-6 min-w-6` with `border-border-strong`, off-white pending title and muted completed title, `TaskMetadata` as the compact priority/status/category treatment, and `RowActions` replacing the always-visible edit/delete buttons with `menuLabel={t('actions.menuLabel', { title: task.title, ns: 'common' })}`; preserve the exact `Edit <title>` and `Delete <title>` labels and all focus behavior.
- [X] T035 [P] [US2] Restyle `frontend/src/features/tasks/ui/TaskList.tsx`: pending/completed groups use `space-y-3` row gaps, off-white headings, and the shared dark empty state; preserve group ids and focus-after-delete behavior.
- [X] T036 [P] [US2] Restyle `frontend/src/features/tasks/ui/TaskMetadata.tsx`: keep the exact existing `Priority: …`, `Pending`/`Completed`, due, and duration strings so behavior tests remain valid; style priority/status as compact token-only pills, keep due/duration muted and wrapping, and use semantic danger plus text for past due rather than color alone.
- [X] T037 [P] [US2] Restyle `frontend/src/features/tasks/ui/TaskForm.tsx`: `rounded-2xl border border-border bg-surface p-5`, off-white labels, muted help text, `border-border-strong` inputs/selects, visible error associations, and existing pending/validation behavior.
- [X] T038 [P] [US2] Restyle `frontend/src/features/tasks/ui/TaskEditForm.tsx` with the same dark control and error treatment as T037, preserving focus and cancel/save behavior.
- [X] T039 [P] [US2] Restyle `frontend/src/features/tasks/ui/GuestStorageNotice.tsx`: `bg-surface-raised border border-border rounded-2xl p-5` panel, off-white heading, muted body, and readable link/action tokens.
- [X] T040 [P] [US2] Restyle `frontend/src/features/tasks/ui/StorageWarning.tsx`: `bg-surface border border-warning rounded-2xl p-5` warning surface with off-white text and a mint/dark-safe retry action.
- [X] T041 [P] [US2] Restyle `frontend/src/features/tasks/ui/RecoveryNotice.tsx`: danger/warning surfaces with `rounded-2xl p-5`, off-white copy, and accessible discard/cancel actions; preserve dialog behavior.
- [X] T042 [P] [US2] Restyle `frontend/src/features/commitments/ui/CommitmentItem.tsx`: `group rounded-2xl border border-border bg-surface p-5`, keep the existing `h3` title heading and accessible structure, off-white title, muted `tabular-nums` time range, fixed/flexible pill using `tag-border`/`tag-text`, the existing type description as secondary text, conflict text with warning icon/text, and `RowActions` with `menuLabel={t('actions.menuLabel', { title: commitment.title, ns: 'common' })}`; preserve `Edit commitment: <title>`/`Delete commitment: <title>` labels and all existing type/description strings.
- [X] T043 [P] [US2] Restyle `frontend/src/features/commitments/ui/CommitmentList.tsx`: `space-y-3` gaps and the shared dark empty state with an accessible create action.
- [X] T044 [P] [US2] Restyle `frontend/src/features/commitments/ui/CommitmentForm.tsx`: dark card, off-white labels, muted help, `border-border-strong` controls, warning/conflict styling, and existing validation/acknowledgment behavior.
- [X] T045 [P] [US2] Restyle `frontend/src/features/commitments/ui/CommitmentDateNav.tsx`: dark surface, `border-border-strong` select/control, off-white/muted labels, and the existing previous/next/today behavior.
- [X] T046 [P] [US2] Restyle `frontend/src/features/commitments/ui/CommitmentNotices.tsx`: dark status surfaces with semantic warning/error/success tokens and text labels; preserve live-region behavior.
- [X] T047 [P] [US2] Restyle `frontend/src/pages/TasksPage.tsx`: dark page header, `space-y-section` layout, off-white/muted hierarchy, and notice regions using the new tokens; preserve all hook wiring and focus refs.
- [X] T048 [P] [US2] Restyle `frontend/src/pages/CommitmentsPage.tsx`: dark page header, section spacing, and notice/dialog layout; preserve all hook wiring, date-view state, and focus behavior.
- [X] T049 [P] [US2] Restyle `frontend/src/pages/SettingsPage.tsx`: off-white heading and muted description on the dark canvas, with the existing preferences notices and form composition intact.
- [X] T050 [P] [US2] Restyle `frontend/src/features/user-preferences/ui/PreferencesForm.tsx`: `bg-surface border border-border rounded-2xl p-5` grouping cards, off-white section headings, muted help/errors, and token-only status colors.
- [X] T051 [P] [US2] Restyle `frontend/src/features/user-preferences/ui/DateTimeField.tsx`, `frontend/src/features/user-preferences/ui/LanguageField.tsx`, and `frontend/src/features/user-preferences/ui/WeatherUnitsField.tsx`: off-white legends/labels, muted help, `border-border-strong` radios and controls.
- [X] T052 [P] [US2] Restyle `frontend/src/features/user-preferences/ui/WeatherLocationField.tsx` and add `id="weather-location"` with `scroll-mt-24` to the weather-location section so `/settings#weather-location` works below the sticky header; use `border-border-strong` for the search control.
- [X] T053 [P] [US2] Restyle `frontend/src/features/user-preferences/ui/GuestStorageNotice.tsx` and `frontend/src/features/user-preferences/ui/StorageNotice.tsx` with `bg-surface border border-border rounded-2xl p-5` raised dark panels and warning/danger semantic text.
- [X] T054 [P] [US2] Restyle `frontend/src/features/tasks/ui/TasksPageSkeleton.tsx`, `frontend/src/features/commitments/ui/CommitmentsPageSkeleton.tsx`, and `frontend/src/features/user-preferences/ui/PreferencesPageSkeleton.tsx` with canvas/surface/raised dark skeletons and no light placeholders.
- [X] T055 [P] [US2] Restyle the existing Home placeholder heading/description in `frontend/src/pages/HomePage.tsx`, plus `frontend/src/pages/NotFoundPage.tsx` and `frontend/src/pages/FoundationPage.tsx`, with the dark canvas, off-white headings, muted descriptions, and mint inline links; do not remove the Foundation route. Home is replaced with the full dashboard in US3.

**Checkpoint**: User Story 2 is independently demonstrable across all four sections and the retained placeholder/error pages.

---

## Phase 5: User Story 3 — Scan the Day with Clear Priorities and Calm Detail (Priority: P3)

**Goal**: Deliver the read-only Home dashboard, weather and Smart Suggestions presentation surfaces, tabular schedules, and clear empty/unavailable states.

**Independent Test**: On a Home screen containing weather, representative suggestion content, and scheduled activities, verify number alignment, suggestion separation, row spacing, and read-only Home rows; on an editable Tasks or Commitments list, verify destructive actions remain hidden until hover or keyboard focus and reveal without shifting layout, at desktop and mobile widths.

### Tests for User Story 3

- [X] T056 [P] [US3] Add `frontend/tests/home-dashboard.test.tsx`: Home shows pending/completed counts, the same task collection as Tasks with priority/status labels, only today's commitments, read-only rows with no edit/delete/completion actions, `tabular-nums` time rendering, the abnormal-storage notice, empty task/commitment cards with working links, and the no-location weather action.
- [X] T057 [P] [US3] Add `frontend/tests/weather-card.test.tsx`: every `WeatherCardState` — including the `error` state — renders correctly; no-location links to `/settings#weather-location`; ready/stale use `formatMeasurement`; metric/imperial values change with the preference unit; timestamps and temperatures use `tabular-nums`; unavailable/error never block sibling content; `error` renders a retry action only when `onRetry` is supplied.
- [X] T058 [P] [US3] Add `frontend/tests/smart-suggestions.test.tsx`: loading/ready/error states; empty ready list renders nothing; mint token classes; rationale is text; no accept/dismiss/adjust controls; representative content is identifiable as system-generated.

### Implementation for User Story 3

- [X] T059 [P] [US3] Add `frontend/src/features/tasks/controller.ts` as a narrow public entry that re-exports `useTasks` and its public types only, so Home does not pull TaskForm/TaskItem/dialogs into the initial bundle.
- [X] T060 [P] [US3] Add `frontend/src/features/commitments/controller.ts` as a narrow public entry that re-exports `useCommitments` and its public types only.
- [X] T061 [P] [US3] Create `frontend/src/widgets/WeatherCard.tsx` and export `WeatherCondition`, `WeatherView`, `WeatherCardState`, and `WeatherCardProps`; accept `state`, `unit`, `locale`, and optional `onRetry`; implement the exact `no-location | loading | ready | stale | unavailable | error` union, a layout-matched `aria-busy` skeleton for `loading`, calm dark card, location and condition labels, large `tabular-nums` temperature, high/low/precipitation/wind, soft warm/cool badges with text, updated time, no-location Settings action, and localized stale/unavailable/error text with a retry affordance for `error` when `onRetry` is provided.
- [X] T062 [P] [US3] Create `frontend/src/widgets/SmartSuggestions.tsx` and export `SuggestionView`, `SmartSuggestionsState`, and `SmartSuggestionsProps`; implement the exact `loading | ready | error` union, `bg-suggestion-surface border-suggestion-surface-strong text-suggestion-text` card, one card per suggestion with title and reason, loading skeleton, localized error, no action controls, and `null` for an empty ready list.
- [X] T063 [US3] Create `frontend/src/widgets/HomeDashboard.tsx` and export `HomeDashboardProps`; presentational composition of the page heading/date, WeatherCard, conditional SmartSuggestions, today's commitments in chronological order, and the full task collection grouped pending/completed with counts; task rows show off-white title, a priority/status pill, and muted due/duration metadata with no checkbox or action; commitment rows show title, tabular time, and type pill; use `space-y-3` for rows, `tabular-nums` for times, dark empty cards with links to `/tasks` and `/commitments`, and no row actions.
- [X] T064 [US3] Rewrite `frontend/src/pages/HomePage.tsx`: call `useTasks` from `frontend/src/features/tasks/controller.ts` and `useCommitments` from `frontend/src/features/commitments/controller.ts`, read preferences/date style/formatting locale/weather units, derive a localized `todayLabel` with the existing date formatter, filter commitments with `commitmentsForDate(..., getLocalToday())` and order them with `orderedCommitments`, group tasks with `groupTasks`, derive `no-location` vs `unavailable` weather, pass `{ status: 'ready', suggestions: [] }`, and render `HomeDashboard`.
- [X] T065 [P] [US3] Update the Home route handle in `frontend/src/app/router.tsx` to use `home.title` with `titleNamespace: 'home'`; keep the Foundation route and all other route definitions unchanged.
- [X] T066 [US3] Add a non-blocking Home storage notice in `frontend/src/pages/HomePage.tsx` when either hook reports a non-normal mode — task `recovery-blocked`, `protected`, `unsupported`, or `memory-only`; commitment `recovery-blocked` or `unsupported` — render a `role="status"` dark notice with a localized explanation and a link to the affected section, while still rendering any available data.

**Checkpoint**: User Story 3 is independently demonstrable on Home at desktop and mobile widths without any provider or suggestion engine.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final audits and quality gates across all stories.

- [X] T067 [P] Update `frontend/tests/i18n-language.test.ts` to assert English/Spanish parity for `common.nav`, `common.actions.menuLabel`, and every key family in `frontend/src/shared/i18n/locales/{en,es}/home.json`.
- [X] T068 [P] Audit `frontend/src` for raw component hex colors, light-theme classes, and forbidden synonyms: no `bg-[#`, `text-[#`, `border-[#`, `text-gray-100`, `bg-white`, `text-black`, or `color-scheme: light`; canonical hex values remain only in `frontend/src/index.css` and `index.html` metadata.
- [X] T069 Audit every interactive boundary in `frontend/src/features/**` and `frontend/src/shared/ui/**`: inputs, selects, textareas, checkboxes, radios, secondary buttons, and disclosure controls use `border-border-strong`; decorative card/separator borders may keep `border-border`.
- [X] T070 Run the `typecheck`, `lint`, `test`, and `build` scripts from `frontend/package.json`; fix every failure without changing feature behavior or weakening tests.
- [ ] T071 Run the manual matrix in `specs/005-calm-tech-dark-ui/quickstart.md` at 360/768/1024/1440 px, 200% zoom, reduced motion, English, Spanish, keyboard-only, touch, and a fresh guest profile; record outcomes.
- [X] T072 [P] Review the production bundle in `frontend/dist/` and the dependency entries in `frontend/package.json`: confirm Lucide icons are tree-shaken to the named imports, the Inter font is self-hosted/subset, and no dashboard or weather/suggestion code creates a new request waterfall or duplicate route chunk.
- [X] T073 [P] Run the `format:check` script in `frontend/package.json`, fix formatting only, and confirm the final diff contains no backend, API, storage-schema, or unrelated source changes.
- [X] T074 [P] Add `frontend/tests/dark-surfaces.test.tsx`: render Home, Tasks, Commitments, and Settings through the app router and assert the shell uses `bg-canvas`, page content uses `bg-surface` cards, no light-theme class is present, and each route retains one `h1` and one main landmark.
- [ ] T075 [P] Conduct the SC-009 usability check (at least five participants locating Commitments and Settings within two taps on mobile) and the SC-011 design review (representative suggestion content identified as system-generated); record results in `specs/005-calm-tech-dark-ui/quickstart.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 first; T002 and T003 can run after T001.
- **Foundational (Phase 2)**: Depends on Setup. Blocks all user stories. T005 depends on T004; T010 depends on T006–T009; T020 depends on T011 and T019; T021/T022 depend on T011/T012 and the tokens.
- **US1 (Phase 3)**: Starts after Foundational. Tests T023–T026 first; T028 depends on T019; T029 depends on T028; T030 depends on T027/T029.
- **US2 (Phase 4)**: Starts after Foundational. Tests T031–T032 first; T033 before T034/T042; all row/form/page tasks can otherwise run in parallel.
- **US3 (Phase 5)**: Starts after Foundational. Tests T056–T058 first; T061/T062 depend on tokens/primitives; T063 depends on T061/T062; T064 depends on T059/T060/T063; T066 depends on T064.
- **Polish (Phase 6)**: Depends on all desired stories being complete. T070 runs after T067–T069 and T074 so the full suite includes the new surface test; T071–T073 follow T070; T075 follows T071.

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational; MVP.
- **US2 (P2)**: Independent after Foundational; does not require US1, though both use the header tokens.
- **US3 (P3)**: Independent after Foundational; reuses only shared primitives and existing hooks, not US2 row components.

### Within Each User Story

- Write tests first and confirm the expected failure.
- Shared primitive before its consumers.
- Component before page composition.
- Run the story’s independent test before moving to the next priority.

### Parallel Opportunities

- T003, T006/T007, T008/T009, T011–T018, T019, T021/T022.
- US1 tests T023–T026; T027 and T028 can run in parallel.
- US2 tests T031/T032; T033 first, then T034/T042 and all form/notice tasks in parallel.
- US3 tests T056–T058; T059/T060/T061/T062/T065 can run in parallel after their prerequisites.
- Polish audits T067–T069 and the surface test T074 can run in parallel; T070 follows, then T071–T073 and T075.

---

## Parallel Example: User Story 1

```bash
# Tests first, in parallel:
Task: "Update shell tests in frontend/tests/shell.test.tsx"
Task: "Update responsive shell tests in frontend/tests/shell-responsive.test.tsx"
Task: "Add logo tests in frontend/tests/walday-logo.test.tsx"
Task: "Add drawer tests in frontend/tests/navigation-drawer.test.tsx"

# Then independent implementation:
Task: "Create WaldayLogo in frontend/src/shared/ui/WaldayLogo.tsx"
Task: "Create MobileNavigationDrawer in frontend/src/widgets/MobileNavigationDrawer.tsx"

# Then sequential composition:
Task: "Rewrite Navigation in frontend/src/widgets/Navigation.tsx"
Task: "Rewrite AppShell in frontend/src/widgets/AppShell.tsx"
```

## Parallel Example: User Story 2

```bash
# After RowActions exists:
Task: "Restyle TaskItem in frontend/src/features/tasks/ui/TaskItem.tsx"
Task: "Restyle CommitmentItem in frontend/src/features/commitments/ui/CommitmentItem.tsx"
Task: "Restyle TaskForm in frontend/src/features/tasks/ui/TaskForm.tsx"
Task: "Restyle CommitmentForm in frontend/src/features/commitments/ui/CommitmentForm.tsx"
Task: "Restyle SettingsPage in frontend/src/pages/SettingsPage.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "Add tasks narrow entry in frontend/src/features/tasks/controller.ts"
Task: "Add commitments narrow entry in frontend/src/features/commitments/controller.ts"
Task: "Create WeatherCard in frontend/src/widgets/WeatherCard.tsx"
Task: "Create SmartSuggestions in frontend/src/widgets/SmartSuggestions.tsx"
Task: "Update Home route handle in frontend/src/app/router.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. **STOP and VALIDATE**: run the US1 tests and the 360/1440 px shell checks.
4. Deliver/demo the branded responsive shell.

### Incremental Delivery

1. Setup + Foundational → theme and shared primitives ready.
2. US1 → branded responsive shell (MVP).
3. US2 → all four sections share the dark visual language.
4. US3 → read-only Home dashboard with weather and suggestion presentation surfaces.
5. Polish → audits, gates, quickstart, bundle review.

### Notes

- Tests are included because the constitution and plan require them; do not replace them with snapshots.
- `[P]` means different files and no incomplete dependency; never parallelize edits to the same file.
- Preserve existing accessible names and focus behavior while changing visual structure.
- No backend, API, storage-schema, weather-provider, or suggestion-engine work belongs in this feature.
