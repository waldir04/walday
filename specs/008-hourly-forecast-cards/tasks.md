---

description: "Task list for Hourly Forecast Redesign"

---

# Tasks: Hourly Forecast Redesign

**Input**: Design documents from `/specs/008-hourly-forecast-cards/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-contract.md](./contracts/ui-contract.md), [quickstart.md](./quickstart.md), `.specify/memory/constitution.md`

**Tests**: Included. The plan's Testing section and Constitution Principle VII require component tests for card content, missing values, keyboard behavior, overflow hint, loading placeholders, and updates to the existing weather tests. Write each test task before its implementation task and confirm it fails for the expected reason.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and demoed independently. The change is frontend-only and presentation-only; no backend, API, storage, cache, or freshness rule changes.

**Feature**: Presentation-only redesign of the hourly forecast inside the existing Home weather surface. All file paths below are repository-relative to `frontend/` unless stated otherwise.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: User story label from spec.md (`US1`–`US4`); omitted in Setup, Foundational, and Polish
- Every description names the exact file to create or edit

## Path Conventions

- Web app: `frontend/src/` (source) and `frontend/tests/` (Vitest + RTL + jest-dom + axe-core)
- Feature design artifacts: `specs/008-hourly-forecast-cards/`
- ADR: `docs/adr/`
- FSD layering: domain/business logic stays in `entities/*` and `features/weather`; new presentation lives in `widgets/`; generic hooks and formatters live in `shared/lib/`; no new cross-slice or upward imports.

## Resolved Inputs (recorded by T002–T006)

These are the default resolutions for the conflicts found before implementation. T002–T006 record them in the design artifacts before any component code starts; if a decision is rejected, update the affected tasks before starting Phase 2.

- **Card geometry (C1)**: keep the plan's 96 px `w-forecast-card` and `p-3` (12 px); record the Visual Identity §4 compact-card exception in ADR 0012 and the plan's Constitution Check.
- **Contained scrolling (C2)**: formalize the narrow forecast-only scrolling exception in the constitution or record explicit acceptance under Governance; page-level horizontal overflow must still measure zero.
- **Outdated state (I1)**: `weather.now` marks the device clock hour and remains visible when the surface is outdated; freshness is communicated only at surface level with `weather.outdatedDescription`.
- **FR-026 (A1)**: "when practical" means no programmatic `scrollLeft` writes and the focused row remains mounted.
- **SC-003 (G2)**: the ≥90 %/10 s usability outcome is post-implementation/manual validation and is not automated by this task list.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the baseline and record the already-identified constitutional and specification exceptions before touching code.

- [X] T001 Confirm the baseline is green by running `npm --prefix frontend run lint`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run test`, and `npm --prefix frontend run build`; record results against `frontend/package.json`
- [X] T002 [P] Record the compact-card padding exception (96 px card, `p-3`/12 px) in `docs/adr/0012-hourly-forecast-contained-horizontal-scroll.md` and reference it in the Visual Identity row of `specs/008-hourly-forecast-cards/plan.md` (C1)
- [X] T003 Formalize the contained forecast-only scroll exception in `.specify/memory/constitution.md` (Principle VI and Visual Identity §6) or record its explicit acceptance under Governance, then update the Principle VI row of `specs/008-hourly-forecast-cards/plan.md`; keep `docs/adr/0012-hourly-forecast-contained-horizontal-scroll.md` as the scope and evidence record (C2)
- [X] T004 [P] Add the 2026-11-17 clarification that `weather.now` marks the device clock hour and is retained when the surface is outdated, with freshness stated only at surface level, to `specs/008-hourly-forecast-cards/spec.md`; update the outdated row in `specs/008-hourly-forecast-cards/contracts/ui-contract.md` §7 (I1)
- [X] T005 Define FR-026's "when practical" as "no programmatic `scrollLeft` writes and the focused row remains mounted" in `specs/008-hourly-forecast-cards/spec.md` (A1)
- [X] T006 [P] Record in `specs/008-hourly-forecast-cards/quickstart.md` that SC-003 is a post-implementation usability validation (≥90 % within 10 s) and is not automated by this task list (G2)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared tokens, formatters, presentation mappings, hooks, and strings that every user story consumes. No user story work starts until this phase is complete.

**⚠️ CRITICAL**: `HourlyForecastCard` and `WeatherForecastList` import these modules; completing this phase first prevents duplicate condition maps, duplicate percentage formatters, and hardcoded text.

- [X] T007 [P] Add `--spacing-forecast-card: 6rem` (96 px) inside the `@theme` spacing block in `frontend/src/index.css`, next to `--spacing-control`, so cards use `w-forecast-card` and never an arbitrary value
- [X] T008 [P] Create `frontend/src/shared/lib/numberFormat.ts` exporting `formatWholePercent(value: number, locale: string): string` using `Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value / 100)` with the existing `catch` fallback `${value}%`
- [X] T009 [P] Create `frontend/src/widgets/conditionPresentation.ts` exporting `CONDITION_ICONS: Record<Conditions, typeof Sun>` and `conditionBadgeTone(condition: Conditions): string`, moved verbatim from `frontend/src/widgets/WeatherCard.tsx` (clear/partly-cloudy → `warm`; rain/snow/storm/fog → `cool`; unknown and default → `border-border-strong text-text-muted`), including the `lucide-react` icon imports
- [X] T010 Refactor `frontend/src/widgets/WeatherCard.tsx` to import `CONDITION_ICONS`, `conditionBadgeTone`, and `formatWholePercent`, deleting the local `CONDITION_ICONS`, `badgeTone`, and `formatPercent` definitions and removing the now-unused `lucide-react` icon imports; the summary's rendered icons, classes, values, and order MUST stay byte-identical (FR-001)
- [X] T011 [P] Create `frontend/src/shared/lib/usePrefersReducedMotion.ts` returning a boolean for `(prefers-reduced-motion: reduce)`, subscribing via `addEventListener`/`removeEventListener` when available and falling back to `addListener`/`removeListener`, guarding `typeof window === 'undefined'`, and defaulting to `false`
- [X] T012 [P] Create `frontend/src/shared/lib/useHorizontalOverflow.ts` accepting a ref to the scroller and change dependencies, returning `isOverflowing` measured as `scrollWidth > clientWidth + 1` on mount, on `ResizeObserver` notifications for the scroller, and when the supplied `hours.length`/`locale`/`unit` values change, with a `window` `resize` fallback when `ResizeObserver` is unavailable (data-model §3 and §4)
- [X] T013 [P] Add `weather.forecastScrollHint` = "More hours are available. Scroll or use the arrow keys." and `weather.hourLabel` = "Hour" to `frontend/src/shared/i18n/locales/en/home.json` (ui-contract §5)
- [X] T014 [P] Add the matching `weather.forecastScrollHint` = "Hay más horas disponibles. Desplázate o usa las teclas de flecha." and `weather.hourLabel` = "Hora" to `frontend/src/shared/i18n/locales/es/home.json`, and correct `specs/008-hourly-forecast-cards/contracts/ui-contract.md` §5 from "three NEW keys" to "two NEW keys" (FR-021, I2)
- [X] T015 Extend `frontend/tests/weather-i18n.test.ts` to assert both NEW keys are present, truthy, and differ between English and Spanish, alongside the existing complete-key-set parity assertion

**Checkpoint**: Tokens, formatters, condition presentation, overflow/reduced-motion hooks, and both locale files are ready; user stories can start.

---

## Phase 3: User Story 1 - Scan the rest of the day at a glance (Priority: P1) 🎯 MVP

**Goal**: Render one compact card per forecast hour showing hour label, condition icon plus text, temperature in the saved unit, and precipitation probability — without changing the current weather summary.

**Independent Test**: Save a location and units, open Home on a day with forecast data, and confirm the hourly section shows one compact card per forecasted hour with all four data points, while the current summary is unchanged in content, order, and behavior.

### Tests for User Story 1

- [X] T016 [P] [US1] Add failing card-content tests to `frontend/tests/hourly-forecast-cards.test.tsx` using `makeForecastHour`/`makeReadyState` from `frontend/tests/helpers/weatherFixtures.ts`: exactly one `listitem` per hour in input order; sr-only `weather.hourLabel`; `weather.now` for the current hour; condition icon `aria-hidden` plus condition text; temperature with localized unit and `tabular-nums`; probability rendered through `t('weather.precipitationProbability', { value })` rather than a bare percentage; exactly one current-hour marker; no focusable element inside a card; missing values show the localized unavailable text

### Implementation for User Story 1

- [X] T017 [US1] Create `frontend/src/widgets/HourlyForecastCard.tsx` implementing `HourlyForecastCardProps { hour: ForecastHour; unit: WeatherUnit; locale: string }`: one `<li>` with `shrink-0 w-forecast-card h-full p-3 rounded-2xl bg-surface-raised border border-border text-caption`, and no state, effects, handlers, or `tabIndex`; render sr-only `weather.hourLabel` then `hour.isCurrentHour ? t('weather.now') : hour.hourLabel`; render the decorative icon with `aria-hidden="true"` plus the always-present `t('weather.conditions.<conditionLabelKey>')` text; render `formatMeasurement(temperature ?? undefined, unit, locale)` or `t('weather.unavailableValue')` with the sr-only `weather.temperatureLabel`; render `t('weather.precipitationProbability', { value: formatWholePercent(hour.precipitationProbability, locale) })` when the value is non-null or `t('weather.precipitationProbabilityUnavailable')` when it is null; use `conditionBadgeTone` with a neutral tone for `unknown`; apply `tabular-nums` to hour, temperature, and probability
- [X] T018 [US1] Rewrite `frontend/src/widgets/WeatherForecastList.tsx` to keep `WeatherForecastListProps { hours; unit; locale }`, return `null` when `hours.length === 0`, and otherwise render a section with `<h3>` using `weather.forecastHeading`, a single `<ol>` in input order, and one `HourlyForecastCard` per hour keyed by `hour.timeMs`; delete the local `percentage()` helper and add no fetching, retry, freshness, or coverage logic
- [X] T019 [US1] Update `frontend/src/widgets/WeatherCard.tsx` wiring so `ready` and outdated states pass `state.hours`, `unit`, and `locale` to `WeatherForecastList` unchanged, and confirm the summary header, current conditions, attribution, freshness, refresh action, and text stay untouched (FR-001)
- [X] T020 [P] [US1] Update `frontend/tests/weather-forecast.test.tsx` from vertical-row assertions to card assertions for chronological order, one card per hour, 0 % vs unavailable distinction, partial coverage text, and empty forecast keeping current conditions visible
- [X] T021 [P] [US1] Update `frontend/tests/weather-card.test.tsx` so the reading-order test reads card text (hour → temperature → condition → probability) and every summary assertion (content, order, attribution, freshness, actions) remains unchanged

**Checkpoint**: The forecast renders as cards with all four data points; US1 is independently demoable and is the MVP increment.

---

## Phase 4: User Story 2 - Read the forecast comfortably on any device (Priority: P2)

**Goal**: Make the card row the only horizontally scrollable area, keep the page free of horizontal overflow at 360/768/1024/1440 px and 200 % zoom, expose a static overflow hint, and provide one keyboard tab stop with arrow/Home/End scrolling.

**Independent Test**: At 360, 768, 1024, and 1440 px and at 200 % zoom, confirm at least two complete cards (with a partial next card) at 360 px, no card stretching or clipping, zero page-level horizontal overflow, a visible hint only when hours are off-screen, and full row reachability by touch, mouse, and keyboard.

### Tests for User Story 2

- [X] T022 [US2] Add failing overflow/hint tests to `frontend/tests/hourly-forecast-cards.test.tsx` by stubbing `scrollWidth`/`clientWidth` on the list: hint absent when all hours fit, hint visible and wired via `aria-describedby` when `scrollWidth > clientWidth + 1`, hint removed when content later fits, and no hint for a single hour or zero hours
- [X] T023 [US2] Add failing keyboard/scroll tests to `frontend/tests/hourly-forecast-cards.test.tsx` by stubbing `scrollBy`/`scrollTo` and `offsetWidth`: exactly one tab stop on the row, no focusable cards, `ArrowRight`/`ArrowLeft` scroll by one card width plus gap, `Home`/`End` scroll to the ends, `preventDefault()` only for handled keys, Tab is not trapped, and `ArrowUp`/`ArrowDown`/`PageUp`/`PageDown` are not intercepted

### Implementation for User Story 2

- [X] T024 [US2] Add the contained scroller to the `<ol>` in `frontend/src/widgets/WeatherForecastList.tsx`: `flex items-stretch gap-2 overflow-x-auto overscroll-x-contain min-w-0 max-w-full` with `tabIndex={0}`; guarantee no ancestor forces page overflow, no inline pixel widths, no scroll snap, and cards remain `shrink-0` at the single `w-forecast-card` width (FR-009, FR-011, FR-014)
- [X] T025 [US2] Render the static hint `<p id="hourly-forecast-hint">` in `frontend/src/widgets/WeatherForecastList.tsx` only when `useHorizontalOverflow` reports overflow, keep it non-interactive and non-hover-only, and set `aria-describedby="hourly-forecast-hint"` on the list only while the hint exists (FR-012)
- [X] T026 [US2] Add the row `onKeyDown` handler in `frontend/src/widgets/WeatherForecastList.tsx` for `ArrowRight`, `ArrowLeft`, `Home`, and `End`, scrolling by the first card's `offsetWidth` plus the measured gap, using a named `FALLBACK_SCROLL_STEP_PX = 96` constant with a comment for jsdom/layout-unavailable cases, and calling `preventDefault()` only for those four keys (ui-contract §3)
- [X] T027 [US2] Select `behavior: 'smooth'` in the row scroll handler unless `usePrefersReducedMotion()` reports reduce, in which case use `behavior: 'auto'`; do not remove information or state changes for reduced-motion users (FR-022)
- [X] T028 [US2] Add the visible focus indicator to the row in `frontend/src/widgets/WeatherForecastList.tsx` using the `focus` token (`focus-visible:ring-2 ring-focus ring-offset-2 ring-offset-surface outline-none`), keep cards non-focusable `<li>` elements, and confirm the row meets the minimum target of at least 24 by 24 CSS pixels (44 recommended) with no other new interactive targets (FR-013, FR-014)
- [X] T029 [P] [US2] Guarantee card geometry in `frontend/src/widgets/HourlyForecastCard.tsx`: identical compact width at every viewport, `shrink-0`, `h-full`, wrapping (never truncating or overflowing) long Spanish labels such as "Parcialmente nublado", no stretched card to fill the row, and `tabular-nums` on hour, temperature, and probability (FR-010, FR-011)
- [X] T030 [US2] Ensure `frontend/src/widgets/WeatherForecastList.tsx` performs no programmatic initial scroll and contains no effect that writes `scrollLeft` or scrolls on data, unit, locale, or location change, so `scrollLeft = 0` shows the current hour (or first available hour) and refreshes preserve position and focus (FR-017, FR-026)
- [X] T031 [P] [US2] Replace the vertical-rows assertion in `frontend/tests/weather-responsive.test.tsx` with assertions that exactly one contained scroller exists (`overflow-x-auto` and `overscroll-x-contain` on the list), no inline pixel width is used, no pointer/drag handler is registered, all remaining hours render at every tested width, and no ancestor adds overflow (FR-010, FR-014)
- [X] T032 [P] [US2] Update `frontend/tests/weather-a11y.test.tsx` with a scroll-region case: the list is focusable with an accessible name, axe rule `scrollable-region-focusable` reports no violations, and visible focus classes are present

**Checkpoint**: The row scrolls only inside its own box, the page never scrolls horizontally, the hint appears only when hours are hidden, and keyboard users can traverse the whole row.

---

## Phase 5: User Story 3 - Understand and navigate the forecast with assistive technology (Priority: P3)

**Goal**: Expose the hourly section as a labeled region with a heading and an ordered sequence of hours, announce each card's four data points exactly once in a predictable order, hide decorative icons, and keep all information available under reduced motion and live preference changes.

**Independent Test**: With keyboard only and a screen reader, confirm the section is announced with its heading, hours are announced chronologically, each card announces hour, temperature with unit, condition text, and precipitation probability once, every covered hour is reachable, and decorative icons are not announced.

### Tests for User Story 3

- [X] T033 [US3] Add failing assistive-technology tests to `frontend/tests/hourly-forecast-cards.test.tsx`: section is a region named by its heading, the list is a `list` with the expected item count, each card announces hour → temperature with unit → condition text → probability exactly once, icons are absent from the accessibility tree, and the current hour is announced in text exactly once

### Implementation for User Story 3

- [X] T034 [US3] Wire the ARIA contract in `frontend/src/widgets/WeatherForecastList.tsx`: `<section aria-labelledby="hourly-forecast-heading">`, `<h3 id="hourly-forecast-heading">`, list `aria-labelledby` pointing at the heading, and no new live region (ui-contract §2)
- [X] T035 [US3] Audit and adjust `frontend/src/widgets/HourlyForecastCard.tsx` so each of the four data points is announced once: keep sr-only `weather.hourLabel` before the hour, `weather.temperatureLabel` before the temperature, `weather.conditionLabel` before the condition text, and ensure the probability value is not duplicated by an extra label
- [X] T036 [US3] Audit `frontend/src/widgets/HourlyForecastCard.tsx` and `frontend/src/widgets/WeatherCard.tsx` so every condition icon is `aria-hidden="true"`, the condition text is always rendered next to it, and `unknown` carries meaning in text with the neutral `border-border-strong text-text-muted` tone
- [X] T037 [US3] Add live-update tests to `frontend/tests/hourly-forecast-cards.test.tsx`: switching `unit` from metric to imperial updates every card to °F with no mixed units; switching `locale` updates hour, condition, probability, and accessibility labels without clipping; changing location from A to B leaves no stale A values, exactly one current marker, `scrollLeft === 0`, and no overflow; changing the hours array does not reset the row's scroll position; focus stays on the row after each update (FR-025, FR-026)
- [X] T038 [P] [US3] Extend the condition/value reading-order test in `frontend/tests/weather-a11y.test.tsx` to assert card-level announcements for hour, temperature with unit, condition text, and probability in the documented order
- [X] T039 [US3] Add a reduced-motion information-parity test to `frontend/tests/hourly-forecast-cards.test.tsx` by overriding `window.matchMedia`, confirming scroll behavior becomes immediate while the hint, focus indicator, and all card text remain available

**Checkpoint**: Screen reader and keyboard users get the same forecast information in a predictable, chronological order, and assistive-technology behavior survives language, unit, location, and reduced-motion changes.

---

## Phase 6: User Story 4 - Trust incomplete or degraded forecast information (Priority: P3)

**Goal**: Never fabricate hours or values when coverage is partial, values are missing, the condition is unknown, the data is outdated, or no hours exist — and make loading use the single surface skeleton with card-shaped placeholders.

**Independent Test**: Simulate partial coverage, missing temperature, missing precipitation probability, an unknown condition, fractional values, outdated data, and an empty forecast, confirming gaps are stated in text, values are labeled unavailable rather than filled, no empty scroller appears, and the current summary remains usable.

### Tests for User Story 4

- [X] T040 [P] [US4] Update the loading test in `frontend/tests/weather-card.test.tsx` to assert one busy state, placeholders visible but hidden from assistive technology, no `listitem` or list semantics in loading, and no layout-shifting generic skeleton
- [X] T041 [P] [US4] Update `frontend/tests/weather-a11y.test.tsx` to assert the loading placeholders are inside an `aria-hidden` wrapper, are not list items, are never announced as forecast content, and axe reports no violations in the loading state
- [X] T042 [US4] Replace the generic skeletons in the `status === 'loading'` branch of `frontend/src/widgets/WeatherCard.tsx` with 3–4 card-shaped placeholders at `w-forecast-card` with card radius and `animate-pulse bg-surface-subtle`, inside one `aria-hidden="true"` and `overflow-hidden` (non-scrollable) container, keeping exactly one `aria-busy="true"`, one existing polite live region, and the existing `weather.loading` sr-only text (FR-018)

### Implementation for User Story 4

- [X] T043 [US4] Verify gap messaging integration in `frontend/src/widgets/WeatherForecastList.tsx` and `frontend/src/widgets/WeatherCard.tsx`: partial coverage renders only covered hours with the existing `weather.coveragePartial` text at surface level, zero hours renders `null` from the list with no empty scroller or hint and the existing `weather.coverageUnavailableForecast` text, and no section-level retry or loading UI is added (FR-019)
- [X] T044 [US4] Add degraded-value tests to `frontend/tests/hourly-forecast-cards.test.tsx`: `temperature: null` shows localized `weather.unavailableValue` with no `0`, dash, blank, or invented value; `precipitationProbability: null` shows `weather.precipitationProbabilityUnavailable` and never a zero percentage; `precipitationProbability: 0` shows an explicit localized zero percent (`0%` in en-US, `0 %` in es-ES); `condition: 'unknown'` shows localized unknown text with a neutral icon/tone; fractional `21.4 °C` and `12.5 %` render whole values consistent with the summary's rounding (FR-007, FR-008, SC-006)
- [X] T045 [US4] Implement and test the outdated-state rule recorded by T004 in `frontend/src/widgets/WeatherForecastList.tsx` and `frontend/src/widgets/HourlyForecastCard.tsx`: with the retained-"Now" decision, assert exactly one `weather.now` marker on the current-hour card, no card-level stale or current-observation label, and `weather.outdatedDescription` at surface level; if the alternative is chosen, assert `hour.hourLabel` and zero `weather.now` markers; add no card-level freshness logic (FR-020)
- [X] T046 [US4] Add no-fabrication invariants to `frontend/tests/hourly-forecast-cards.test.tsx`: the card count equals the covered-hour count, no duplicate or invented `timeMs`, empty input renders no row/hint, and the current summary remains visible and usable in every degraded case (FR-019, SC-001)

**Checkpoint**: Gaps, missing values, unknown conditions, outdated data, and empty forecasts are all honest and text-stated; loading has one accessible surface-level busy state.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Constitution-level audits and end-to-end verification that span all stories.

- [X] T047 [P] Audit `frontend/src/widgets/HourlyForecastCard.tsx`, `frontend/src/widgets/WeatherForecastList.tsx`, and `frontend/src/widgets/WeatherCard.tsx` for hardcoded user-facing text, moving any literal string into `frontend/src/shared/i18n/locales/en/home.json` and `frontend/src/shared/i18n/locales/es/home.json` (FR-021, SC-008)
- [X] T048 [P] Audit the same three widgets for arbitrary Tailwind values (`w-[...]`), inline pixel styles, raw color utilities, and non-token spacing/radius, replacing them with `w-forecast-card`, semantic color tokens, and `rounded-2xl` (FR-023)
- [X] T049 [P] Remove obsolete vertical-row assertions, helpers, and comments left in `frontend/tests/weather-forecast.test.tsx`, `frontend/tests/weather-card.test.tsx`, `frontend/tests/weather-responsive.test.tsx`, and `frontend/tests/weather-a11y.test.tsx`, keeping every assertion that still expresses required behavior
- [X] T050 Run the full quality gate and fix all failures: `npm --prefix frontend run lint`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run test`, and `npm --prefix frontend run build`
- [X] T051 Execute the manual and responsive scenarios in `specs/008-hourly-forecast-cards/quickstart.md` at exactly 360, 768, 1024, and 1440 CSS pixels and at 200 % zoom, including a pointer/touch scroll check, recording that `document.documentElement.scrollWidth` never exceeds the viewport width and that every card measures the same width
- [X] T052 Verify no new runtime capability: confirm `frontend/package.json` and its lockfile are unchanged, no new endpoint or `fetch` is introduced in `frontend/src/widgets/`, and the weather request count is unchanged (FR-024, SC-009)
- [X] T053 [P] Update `docs/adr/0012-hourly-forecast-contained-horizontal-scroll.md` with the final verification evidence from T050–T052 (gates passed, zero page overflow, one contained scroller) and reference the T003 exception decision, so the recorded exception has an audit trail

---

## Phase 8: Clarification 2026-11-18 — Compact Precipitation Probability

**Purpose**: Replace the wrapping full probability phrase in cards with a compact single-line value
while preserving the explicit `0 %`, the unavailable distinction, and a single accessible
announcement. Applies after the completed feature; supersedes the earlier visible-full-template
detail in T016/T017/T044.

- [X] T054 [P] Record the 2026-11-18 compact-probability clarification and revise FR-007/FR-016 in `specs/008-hourly-forecast-cards/spec.md`, `specs/008-hourly-forecast-cards/contracts/ui-contract.md` §1/§2/§5/§7, `specs/008-hourly-forecast-cards/data-model.md` §2, and `specs/008-hourly-forecast-cards/quickstart.md` §4
- [X] T055 [P] Add `weather.precipitationProbabilityUnavailableShort` (`N/A` in English, `N/D` in Spanish) to both `frontend/src/shared/i18n/locales/{en,es}/home.json` files and extend `frontend/tests/weather-i18n.test.ts`
- [X] T056 Update `frontend/tests/hourly-forecast-cards.test.tsx` for the compact visible value, the `whitespace-nowrap` one-line guarantee, and the full sr-only accessible phrase
- [X] T057 Implement the compact probability in `frontend/src/widgets/HourlyForecastCard.tsx`: decorative droplet icon, `aria-hidden` compact value (`formatWholePercent` or the compact unavailable key), and the existing full phrase in an sr-only span
- [X] T058 Update dependent probability assertions in `frontend/tests/weather-forecast.test.tsx`, `frontend/tests/weather-card.test.tsx`, and `frontend/tests/weather-a11y.test.tsx`
- [X] T059 Run the full quality gate and re-verify at 360 and 1440 CSS px that the probability occupies one line and page horizontal overflow remains zero

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately. T002/T003 share `plan.md`; T004/T005 share `spec.md`, so run those pairs sequentially.
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** every user story.
- **US1 (Phase 3)**: Depends on Foundational. Produces `HourlyForecastCard` and the rewritten `WeatherForecastList`, which all later stories build on.
- **US2 (Phase 4)**: Depends on US1 (scroll container and card geometry).
- **US3 (Phase 5)**: Depends on US1 and on the `aria-describedby` wiring from US2's T025 for the full described-by contract.
- **US4 (Phase 6)**: Depends on US1; T043/T046 also depend on US2's hint and overflow behavior. T045 depends on the T004 decision.
- **Polish (Phase 7)**: Depends on all desired stories.

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational — MVP. No dependency on US2–US4.
- **US2 (P2)**: Builds on US1's list markup but is independently testable via viewport geometry, hint visibility, and keyboard handling.
- **US3 (P3)**: Builds on US1/US2 markup but is independently testable through the accessibility tree and screen reader announcements.
- **US4 (P3)**: Builds on US1/US2 but is independently testable with fixture-backed partial, missing, unknown, outdated, and empty data.

### Within Each User Story

- Test tasks run first and MUST fail for the expected reason before implementation.
- Shared primitives (Foundational) before components.
- Card component before list container.
- Container markup before overflow, hint, and keyboard behavior.
- Core behavior before accessibility and live-update coverage.
- Run the targeted Vitest file after each task; a story is complete only when its checkpoint passes.

### Shared-File Hazard

`frontend/src/widgets/WeatherForecastList.tsx`, `frontend/src/widgets/HourlyForecastCard.tsx`, `frontend/tests/hourly-forecast-cards.test.tsx`, and `frontend/tests/weather-a11y.test.tsx` are edited by more than one story. Do not run those edits in parallel across stories; only the `[P]` test-writing tasks that touch different files may overlap.

---

## Parallel Opportunities

- **Setup**: T002, T004, and T006 can run in parallel; T003 follows T002 (shared `plan.md`) and T005 follows T004 (shared `spec.md`).
- **Foundational**: T007, T008, T009, T011, T012, T013, and T014 touch seven different files and can run in parallel; T010 depends on T008/T009, and T015 depends on T013/T014.
- **US1**: T016 (test file) can run in parallel with reading the fixtures; T017 → T018 → T019 are strictly sequential; T020 and T021 edit different test files and can run in parallel after T019.
- **US2**: T022 and T023 write different test blocks but the same file, so run them sequentially; T024 → T025/T026/T028/T030 → T027; T029 can run in parallel with T024; T031 and T032 edit different test files and can run in parallel after T024.
- **US3**: T033 (tests) first; T034 → T035/T036; T037, T038, and T039 edit different files or disjoint blocks and can run after T034.
- **US4**: T040/T041 → T042; T043 and T044 can follow US1 independently; T045 requires the T004 decision; T046 follows T043.
- **Polish**: T047, T048, T049, and T053 touch different files and can run in parallel; T050 and T051 must run last.

## Parallel Example: Foundational Phase

```bash
Task: "Add --spacing-forecast-card to @theme in frontend/src/index.css"
Task: "Create formatWholePercent in frontend/src/shared/lib/numberFormat.ts"
Task: "Extract CONDITION_ICONS and conditionBadgeTone to frontend/src/widgets/conditionPresentation.ts"
Task: "Create usePrefersReducedMotion in frontend/src/shared/lib/usePrefersReducedMotion.ts"
Task: "Create useHorizontalOverflow in frontend/src/shared/lib/useHorizontalOverflow.ts"
Task: "Add NEW weather keys to frontend/src/shared/i18n/locales/en/home.json"
Task: "Add NEW weather keys to frontend/src/shared/i18n/locales/es/home.json"
```

## Parallel Example: User Story 1

```bash
Task: "Add card-content tests to frontend/tests/hourly-forecast-cards.test.tsx"
# then sequentially:
Task: "Create frontend/src/widgets/HourlyForecastCard.tsx"
Task: "Rewrite frontend/src/widgets/WeatherForecastList.tsx composition"
# then in parallel (different test files):
Task: "Update frontend/tests/weather-forecast.test.tsx card assertions"
Task: "Update frontend/tests/weather-card.test.tsx reading-order assertions"
```

## Parallel Example: User Story 2

```bash
Task: "Add overflow/hint tests to frontend/tests/hourly-forecast-cards.test.tsx"
Task: "Add keyboard/scroll tests to frontend/tests/hourly-forecast-cards.test.tsx"
# implementation order:
Task: "Add contained scroller classes to the <ol> in WeatherForecastList.tsx"
Task: "Render the static hint and aria-describedby in WeatherForecastList.tsx"
Task: "Add Arrow/Home/End key handling in WeatherForecastList.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup and record the C1/C2/I1/A1/G2 decisions.
2. Complete Phase 2: Foundational (blocking — tokens, formatter, condition map, hooks, locale strings).
3. Complete Phase 3: User Story 1 (card component + list composition + updated forecast/card tests).
4. **STOP and VALIDATE**: Confirm one card per hour with hour, icon + text, temperature with unit, and probability, and confirm the current summary is unchanged.
5. Deploy/demo as the MVP increment.

### Incremental Delivery

1. Setup + Foundational → shared primitives ready.
2. US1 → cards render (MVP) → validate independently.
3. US2 → contained scrolling, hint, keyboard access, responsive containment → validate at four widths and 200 % zoom.
4. US3 → labeled region, ordered-list announcements, announce-once, reduced motion, live updates including location changes → validate with VoiceOver.
5. US4 → honest gaps, unavailable values, unknown conditions, outdated status, empty forecast, card placeholders in the single loading skeleton → validate with degraded fixtures.
6. Polish → hardcoded-text and token audits, full gates, quickstart validation, ADR evidence.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (the seven `[P]` primitive tasks are safe to split).
2. One developer owns US1, since US2–US4 all extend its components.
3. After US1: one developer takes US2 (scroll, hint, keyboard), another drafts US3 tests in a separate file; US3 implementation follows US2's `aria-describedby` task.
4. US4's loading-placeholder work can start in parallel with US2 because it only touches `WeatherCard.tsx` and its tests; its gap/outdated work waits for US1/US2 and the T004 decision.
5. Polish runs after all desired stories, with audits in parallel and T050–T051 last.

---

## Notes

- `[P]` means different files with no dependency on incomplete work — not merely "can be done at the same time".
- Cards are display-only `<li>` elements: no `tabIndex`, no buttons, no links, no hover-only information, no new interactive controls.
- Exactly one contained scroller is allowed; page-level horizontal overflow must measure zero at every supported width and at 200 % zoom.
- Exactly one card width (`w-forecast-card`, 96 px) at every viewport; wider screens show more complete cards rather than wider cards.
- Missing temperature or probability is never rendered as `0`, a dash, a blank, or an invented value; a localized zero percent is a real value and must stay visible.
- The probability uses a compact single-line visible value (droplet icon + whole percentage, or the compact `N/A`/`N/D` unavailable abbreviation); the full `weather.precipitationProbability` template remains the sr-only accessible name, so the probability is announced once and never wraps.
- All new strings live in `home.json` for `en` and `es`; no user-facing text is hardcoded.
- No new dependency, endpoint, request field, cache key, TTL, retry, freshness rule, storage key, or persisted version.
- The `weather.now` marker identifies the clock hour, not data freshness; outdated status remains surface-level (T004/T045).
- T002, T003, T004, and T005 close the C1, C2, I1, and A1 findings before implementation; do not start Phase 2 until they are recorded.
- Commit after each task or logical group, and stop at every checkpoint to validate that story independently.
