# Implementation Plan: Hourly Forecast Redesign

**Branch**: `008-hourly-forecast-cards` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-hourly-forecast-cards/spec.md`

## Summary

Replace the current vertical hourly-forecast rows inside the existing weather surface with a single
horizontally scrollable row of compact, fixed-width forecast cards. Each card shows the device-local
hour label, a condition icon paired with its text label, the temperature in the saved unit, and the
precipitation probability. The current weather summary, retrieval, freshness, caching, attribution,
and refresh/retry behavior are untouched.

The change is **presentation-only and frontend-only**. `entities/weather` already supplies
`ForecastHour` values (hour label, current-hour flag, temperature measurement, condition,
precipitation probability) through `derivePresentationState`. `widgets/WeatherForecastList` is
rewritten into a contained scroll region composed of a new presentational
`widgets/HourlyForecastCard`; `widgets/WeatherCard` keeps its structure except for (a) card-shaped
placeholders in the existing loading skeleton and (b) moving the condition icon/tone mapping to a
small shared widget-local module so both the summary and the cards use one source.

The specification's 2026-11-17 clarifications are treated as decided inputs: contained scrolling
only, one keyboard tab stop with arrow-key scrolling, partial next card plus a static hint, inherited
surface states, at least two complete cards at 360 px, and whole-degree/whole-percent formatting.
No `NEEDS CLARIFICATION` remains.

## Technical Context

**Language/Version**: TypeScript 5.9 strict (`strict`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax`, `erasableSyntaxOnly`); React 19.3; Vite 8; Tailwind CSS 4.

**Primary Dependencies**: Existing only — React, react-i18next/i18next, `lucide-react` (condition
icons), Tailwind CSS. **No new runtime or development dependency is introduced.**

**Storage**: None. The existing versioned `walday:weather` last-known-good snapshot is read through
`useWeather` exactly as before; this feature neither reads nor writes new persisted shape.

**Testing**: Vitest 5 + React Testing Library + jest-dom + axe-core. New component tests for cards,
scroll region, keyboard behavior, overflow hint, loading placeholders, and missing values; updates to
the four existing weather test files that assert the old vertical rows.

**Target Platform**: Responsive React SPA, dark theme only, English and Spanish, 360/768/1024/1440 px
and 200 % browser zoom.

**Project Type**: Web application — one existing frontend app (`frontend/`) and one existing backend
app (`backend/`). This feature touches only `frontend/`.

**Performance Goals**: Keep the existing single weather request and render path. Up to 24 remaining
hours render as 24 small cards with no per-card state or effects; scrolling is native compositor
scrolling; overflow detection costs one `ResizeObserver` measurement per size/content change; no
layout shift when data arrives.

**Constraints**: Zero page-level horizontal overflow at every supported width and at 200 % zoom; only
the forecast row scrolls; one tab stop with a visible focus indicator and no keyboard trap; WCAG 2.2
AA contrast and target size; `prefers-reduced-motion` respected; no new data source, contract,
retrieval, cache, or freshness rule; no hardcoded user-facing text; Walday Dark UI tokens only.

**Scale/Scope**: One Home weather surface, one forecast row of at most the remaining hours of a
device-local day (~24 cards), one new card component, one rewritten list component, small additions to
one loading state, two locale files, and no backend change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence / Plan |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | PASS | One presentational card component, one container component, one small overflow hook, one small percentage helper. No new abstraction beyond what the requirement needs; all card rendering stays pure and stateless. |
| II. Strict TypeScript and Type Safety | PASS | Props typed from exported domain types (`ForecastHour`, `WeatherUnit`); no `any`, no assertions, no non-null assertions; discriminated `WeatherCardState` is unchanged. |
| III. Frontend Architecture (FSD) | PASS | Model/business logic stays in `features/weather`; `entities/weather` and `entities/preferences` already own types/formatting; new UI is presentational in `widgets`; generic hooks/formatting go to `shared/lib`. No new cross-slice imports and no upward imports. |
| IV. Backend Architecture | PASS (N/A) | No backend change; no route, controller, service, validation, or error-contract modification. |
| V. React Component Design and Reusability | PASS | `HourlyForecastCard` is small and fully controlled; scroll region owns only local presentation concerns (overflow flag, arrow-key scrolling); no data fetching in presentational components; no speculative memoization. |
| VI. Styling, Design Tokens, Visual Consistency | PASS WITH RECORDED EXCEPTION | Tokens only (`surface-raised`, `border`, `text`, `text-muted`, `primary`, `warm`, `cool`, `focus`), `rounded-2xl` for the weather surface and forecast cards, `rounded-full` for condition pills, `tabular-nums`, card width is a new `@theme` spacing token, not an arbitrary value. **Exception:** Principle VI prohibits introduced horizontal scrolling; the spec's clarification permits a contained forecast-only scroller with zero page overflow. Formally accepted under the constitution's Governance recorded-exceptions register (2026-11-17) and recorded in ADR 0012 and Complexity Tracking. |
| VII. Testing Strategy and QA | PASS | Component tests cover card content, missing values, unknown condition, 0 % vs unavailable, current-hour marking, single tab stop, arrow-key scrolling, hint visibility, skeleton hidden from AT, axe, i18n parity, and responsive widths. Existing weather tests are updated rather than deleted where they still express required behavior. |
| VIII. Performance and Resource Efficiency | PASS | No new requests, dependencies, or stores; one `ResizeObserver` per row; native scrolling; no virtualization needed for ≤24 cards; no render loops. |
| IX. Scalability, Resilience, Fault Isolation | PASS | Inherits the weather surface's existing loading/unavailable/outdated handling; no independent fetch, retry, or failure path; current conditions remain usable when hourly data is missing. |
| X. API Contracts and Independent Deployment | PASS (N/A) | No API contract changes; the feature consumes the existing `ForecastHour` view model. |
| XI. Constants and Configuration Management | PASS | Numeric geometry that must be shared (card width) becomes a `@theme` token; the keyboard scroll fallback is a named constant with a comment; no magic values scattered in JSX. |
| XII. Security and Data Protection | PASS (N/A) | Display-only rendering of already-validated data; no new input, storage, network, or HTML injection surface; decorative icons are `aria-hidden`. |
| XIII. Accessibility and Inclusive Design | PASS | Labeled region + heading, ordered list semantics, one tab stop, visible `focus-visible`, arrow/Home/End support without trapping, text condition labels, explicit current-hour text, `aria-hidden` icons, unavailable text instead of fabricated values, axe coverage. |
| XIV. Internationalization and Localization | PASS | All new strings added to `home.weather` in `en` and `es`; hour/percentage formatting via `Intl` with the active locale; units stay independent of language; parity test enforces key equality. |
| XV. Documentation and Technical Communication | PASS | ADR 0012 records the contained-scroll exception; `contracts/ui-contract.md`, `data-model.md`, and `quickstart.md` document the component contract, states, and verification. |
| XVI. Automated Quality Gates and Git Hooks | PASS | Existing `lint`, `typecheck`, `test`, `build` scripts are the gate; no hook or CI change required. |
| XVII. Frontend Server State and Async UX | PASS | No new server state; `useWeather` remains the only source. The surface keeps its single skeleton/busy state, extended with card placeholders; no section-level fetch, mutation, or duplicate store. |
| XVIII. Data Integrity and Persistence with Prisma | PASS (N/A) | No database or persistence change. |
| XIX. External Integrations and Weather Resilience | PASS | No provider access, retrieval, cache TTL, retry, timeout, or freshness change; outdated status is inherited from the surface and remains text-stated. |
| XX. Technology Stack Governance and Dependency Discipline | PASS | Uses only approved stack items; no dependency added or removed. |
| Visual Identity and Design System (Walday Dark UI) | PASS | Compact dark cards using `surface-raised` + `border`, Inter with `tabular-nums`, 16 px surface radius, token-only colors, text alongside every icon/colour signal, visible focus, 150 ms ease-out affordances, reduced-motion support, verified at 360/768/1024/1440 and 200 % zoom. The compact-card geometry (96 px card, `p-3`/12 px padding) is recorded as a limited Walday Dark UI §4 padding exception in ADR 0012 (C1). |

**Scope-sensitive notes**

- **Contained-scroll exception**: Principle VI forbids horizontal scrolling "at supported widths".
  The spec clarification resolves the conflict narrowly: only the forecast row scrolls inside its own
  box, page `scrollWidth` never exceeds the viewport, and the affordance plus keyboard access make it
  intentional rather than overflow. ADR 0012 records scope and remediation intent.
- **Display-only cards**: cards are `<li>` elements, never buttons or links. The row is the only new
  focusable element, satisfying FR-013/FR-014 without adding interactive targets.
- **Summary untouched**: the only edit to the summary region is extracting its existing icon map and
  condition-tone helper verbatim into a widget-local module so the same mapping serves cards; tests
  assert the summary's text/order/actions are unchanged.

**Post-design re-check**: PASS. Phase 1 introduces no dependency, no network/data contract change, no
new async state, and no cross-layer import. The only constitutional exception remains the contained
forecast-only horizontal scroller, recorded and justified.

## Project Structure

### Documentation (this feature)

```text
specs/008-hourly-forecast-cards/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ui-contract.md   # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── entities/
│   │   ├── preferences/model/units.ts        # existing formatMeasurement (unchanged)
│   │   └── weather/                          # existing ForecastHour-producing domain (unchanged)
│   ├── features/weather/                     # existing useWeather/presentation (unchanged)
│   ├── shared/
│   │   ├── config/weather.ts                 # unchanged (no new timing/retrieval config)
│   │   ├── lib/
│   │   │   ├── numberFormat.ts               # NEW: shared whole-percent formatter
│   │   │   ├── useHorizontalOverflow.ts      # NEW: overflow detection hook
│   │   │   └── usePrefersReducedMotion.ts    # NEW: reduced-motion media query hook
│   │   ├── i18n/locales/{en,es}/home.json    # new forecast strings
│   ├── index.css                             # add --spacing-forecast-card token
│   └── widgets/
│       ├── WeatherCard.tsx                   # loading placeholders; import shared condition map
│       ├── WeatherForecastList.tsx           # rewritten: contained scroll row + hint
│       ├── HourlyForecastCard.tsx            # NEW: compact display-only card
│       └── conditionPresentation.ts          # NEW: extracted icon/tone mapping
└── tests/
    ├── helpers/weatherFixtures.ts            # unchanged (ForecastHour fixtures reused)
    ├── hourly-forecast-cards.test.tsx        # NEW: card content, keyboard, hint, a11y
    ├── weather-forecast.test.tsx             # updated row → card expectations
    ├── weather-card.test.tsx                 # updated reading-order assertion
    ├── weather-a11y.test.tsx                 # updated for scroll region and tab stop
    └── weather-responsive.test.tsx           # replaced vertical-row assertion with contained scroll

docs/adr/
└── 0012-hourly-forecast-contained-horizontal-scroll.md   # NEW: recorded exception
```

**Structure Decision**: Keep the existing FSD frontend. Business/domain behavior remains in
`features/weather` and `entities/*`; the redesign adds two presentational components in the flat
`widgets/` layer used by this repository, plus generic measurement/media-query hooks and one number
formatter in `shared/lib`. The backend is not touched.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Contained horizontal scrolling inside the forecast row, an exception to Principle VI's "no horizontal scrolling" rule | The approved specification explicitly requires horizontally scrollable forecast cards to fit a scannable row on narrow screens while keeping every remaining hour reachable; the clarification mandates contained-only scrolling with zero page overflow | A vertically stacked list (current implementation) cannot present compact cards side by side and was the redesign's explicit target; a paged carousel would add interactive controls the specification forbids; allowing page-level horizontal scroll violates the same principle, the spec, and SC-004 |
