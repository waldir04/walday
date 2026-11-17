# Phase 0 Research: Hourly Forecast Redesign

**Feature**: `008-hourly-forecast-cards` | **Date**: 2026-11-17

All unknowns from the plan's Technical Context are resolved below. No `NEEDS CLARIFICATION` remains.

---

## R1. How should the forecast row scroll horizontally without the page ever scrolling?

**Decision**: Implement the row as a native overflow container on the ordered list itself:
`overflow-x-auto` + `overscroll-x-contain` + `min-w-0` + `flex` with `shrink-0` cards, inside the
existing weather surface. No negative margins, no absolutely positioned track, no fixed pixel widths
in inline styles, and no `100vw`-based sizing. Page overflow is prevented by the existing page
padding tokens and by the container's own `min-w-0`/`max-w-full` chain.

**Rationale**: Native scrolling preserves momentum, touch, trackpad, and assistive-technology
behavior; `overscroll-behavior-x: contain` prevents scroll chaining to the page; `min-w-0` lets the
flex container shrink below content width instead of forcing ancestor overflow. The project already
uses Tailwind utilities exclusively (Principle VI).

**Alternatives considered**:
- *Transform/translate carousel with JS-driven offsets*: rejected — reimplements native scroll,
  breaks touch/momentum and scroll anchoring, and adds state and motion complexity.
- *CSS `columns` or wrapping grid*: rejected — cannot satisfy a single chronological row with a
  partially visible next card, and hides hours below the fold rather than off-screen.
- *Paged carousel with arrow buttons*: rejected — the spec forbids new interactive scroll controls
  (FR-012) and the section must stay display-only.
- *Scroll snap (`snap-x`)*: rejected for this iteration — not required by the spec, and mandatory
  snapping fights free reading and can move the row unexpectedly; free scrolling plus a static hint
  meets FR-009/FR-012 with less behavior to verify.

---

## R2. What fixed card width meets "two complete cards + partial next at 360 px" with tokens?

**Decision**: Add one theme token, `--spacing-forecast-card: 6rem` (96 px), to the `@theme` block in
`frontend/src/index.css`, used as `w-forecast-card` on every card. Card gap stays on the existing
`gap-2` (8 px). Cards use `shrink-0`, `h-full`, and internal `p-3`.

Geometry at 360 px: viewport minus `px-page` (16 px × 2) = 328 px, minus surface `p-5` (20 px × 2)
= 288 px of row. Two complete cards + two gaps = 208 px; the third card starts at 208 px and shows
80 px — a clearly partial next card. At 768/1024/1440 px the same width yields 6–9 complete cards,
always with the static hint when any hour remains off-screen.

**Rationale**: FR-011 requires one identical compact width at every viewport, so a responsive or
`flex-1` card is forbidden. A 96 px card fits the widest required value (`"Partly cloudy"`,
`"No disponible"`, `"100 %"`) in 2–3 wrapped lines at caption size without clipping; the list uses
`items-stretch` and the card `h-full` so unequal label lengths do not create ragged heights. The
token satisfies Principle VI's ban on arbitrary values and Principle XI's single source of truth.

**Alternatives considered**:
- *`w-[96px]` arbitrary value*: rejected — the design system can express this as a token.
- *`min-w-24` without a max*: rejected — longer Spanish labels would stretch cards and break the
  identical-width and partial-next-card requirements.
- *Fixed height*: rejected — would clip 200 % text resizing; height must follow content.

---

## R3. How does the row become one accessible tab stop with arrow-key scrolling?

**Decision**: The `<ol>` is the single focusable element: `tabIndex={0}`, `aria-labelledby` pointing
at the section heading, `aria-describedby` pointing at the static hint **only when the hint is
rendered**, and `focus-visible` ring classes using the `focus` token with `ring-offset-surface`.
Cards are plain `<li>` with no `tabIndex` and no interactive children. One `onKeyDown` handler on the
list handles `ArrowLeft`/`ArrowRight` (scroll by one card + gap), `Home`/`End` (scroll to the ends),
calls `preventDefault()` only for those handled keys, and never traps Tab. Scroll behavior is
`smooth` unless `usePrefersReducedMotion()` reports reduce, in which case it is `auto`.

**Rationale**: Native focusable scrollers scroll with arrow keys in Chromium/Firefox but not
consistently in Safari, and the spec requires arrow-key scrolling explicitly. Handling only the four
keys preserves normal page scrolling with `ArrowUp`/`ArrowDown`, avoids a keyboard trap, and keeps
one tab stop. A focusable list is announced as a list with its item count, satisfying FR-013/FR-015
without ARIA overreach. The scroll step is measured from the first card's `offsetWidth` plus the
computed gap, with a named `FALLBACK_SCROLL_STEP_PX = 96` used when layout is unavailable (jsdom).

**Alternatives considered**:
- *Rely on native arrow scrolling only*: rejected — inconsistent in Safari and untestable against
  the explicit requirement.
- *`role="region"` with `tabIndex` on a wrapper div*: rejected — loses ordered-list semantics and
  needs manual ARIA; a focusable `<ol>` is native and sufficient.
- *Per-card tab stops*: rejected — violates FR-013 and creates up to 24 stops.
- *Scroll buttons*: rejected — FR-012 forbids new interactive controls.

---

## R4. How is "more hours are available" communicated without hover or new controls?

**Decision**: Two simultaneous, static cues:
1. Cards are laid out so the next card is partially visible (a consequence of fixed width and no
   stretching); no clipping of card content, only the row edge.
2. A visible `<p>` hint (`home.weather.forecastScrollHint`, localized) renders whenever the row
   actually overflows, and is absent when all hours fit. The hint is not hover-dependent, not a
   button, and is referenced by `aria-describedby` when present.

Overflow is measured with `useHorizontalOverflow`: compares `scrollWidth > clientWidth + 1`, runs on
mount, on `ResizeObserver` callbacks for the scroller, and when `hours.length`/`locale`/`unit`
change; falls back to a `window` `resize` listener when `ResizeObserver` is unavailable.

**Rationale**: A partially visible card alone is unreliable at some widths (a narrow sliver), while a
hint alone does not match the approved "partial card plus static hint" clarification. Measuring
instead of guessing avoids showing the hint for a single hour (Edge Case) or hiding it when labels
grow in Spanish.

**Alternatives considered**:
- *Always show the hint*: rejected — misleading when all hours fit (FR-012 forbids).
- *Hover-only gradient/fade*: rejected — hover-only affordances are barred by the constitution.
- *CSS-only detection*: not available reliably; measurement is the simplest correct approach.

---

## R5. Which card holds the initial scroll position, and what survives a refresh?

**Decision**: No initial scroll programmatic move is needed: `sliceDeviceDay` already orders
remaining hours chronologically starting with the current hour (or the first available hour when the
current hour is absent), so `scrollLeft = 0` shows the required card. The scroller is uncontrolled;
React re-renders do not reset `scrollLeft`, so refresh, unit, and language changes preserve the
reading position and focus. No effect writes `scrollLeft` except user input.

**Rationale**: FR-017 and FR-026 are satisfied by the existing `ForecastHour[]` invariant and by not
adding position-resetting effects. This also avoids a layout read on every render.

**Alternatives considered**:
- *Scroll the current card into view on mount*: rejected — redundant for the first card and would
  fight FR-026 on refresh if keyed to data changes.
- *Storing scroll position in state*: rejected — native scroll offset already persists across
  re-renders; state would add re-render churn.

---

## R6. How are missing values, unknown conditions, and 0 % rendered?

**Decision**: Reuse existing, already-localized presentation rules:
- Temperature: `formatMeasurement(temperature ?? undefined, unit, locale)`; `null` renders the
  existing `home.weather.unavailableValue` text with the sr-only temperature label. No `0`, dash,
  blank, or placeholder number.
- Precipitation: `home.weather.precipitationProbability` with
  `formatWholePercent(value, locale)`; `null` renders
  `home.weather.precipitationProbabilityUnavailable`. `0` renders an explicit `0 %` because the
  formatter receives a real number.
- Condition: `conditionLabelKey` → `home.weather.conditions.*`; `unknown` renders
  `home.weather.conditions.unknown` with the neutral `border-border-strong text-text-muted` tone and
  the Cloud icon (`aria-hidden`). The text always carries the meaning.
- Temperature and percentage formatting use the same helpers as the current summary
  (`formatMeasurement` uses `MEASUREMENT_PRECISION.temperature = 0`; `formatWholePercent` is the
  extracted whole-number formatter used by the summary's humidity), so cards and summary cannot show
  different rounding for the same value.

**Rationale**: FR-006–FR-008 and FR-021 require exact rounding parity and honest gaps. Extracting the
percentage formatter into `shared/lib/numberFormat.ts` removes the existing duplicate
`Intl.NumberFormat` calls in `WeatherCard` and `WeatherForecastList`.

**Alternatives considered**:
- *New per-card formatting logic*: rejected — duplicates and risks divergence from the summary.
- *Hiding the probability when null*: rejected — FR-007 requires it labeled unavailable, not omitted.

---

## R7. How does the existing loading skeleton gain card placeholders without a second busy state?

**Decision**: Keep the single `status === 'loading'` branch in `WeatherCard` with its one
`aria-busy="true"`, its existing `sr-only` loading text, and its existing live region. Replace the
generic 3-line `Skeleton` with a fixed-height placeholder area containing 3–4 card-shaped blocks at
`--spacing-forecast-card` width, all inside one `aria-hidden="true"` wrapper that is
`overflow-hidden` (not scrollable). Blocks use `animate-pulse bg-surface-subtle` and card radius;
`prefers-reduced-motion` already disables pulse behavior globally.

**Rationale**: FR-018 requires placeholders matching the final row, one announced busy state, and no
layout shift. Placeholder `<div>`s avoid list semantics so assistive technology never hears fake
forecast items (weather-states test asserts no list in loading). `overflow-hidden` guarantees no page
overflow at 360 px while the real row is absent.

**Alternatives considered**:
- *Reuse the real scroll row with dummy items*: rejected — placeholders would be announced as
  forecast content and could be focused.
- *Section-level skeleton*: rejected — the spec forbids an independent hourly loading state.

---

## R8. Which tests change, and how is scrolling/keyboard behavior tested in jsdom?

**Decision**:
- New `tests/hourly-forecast-cards.test.tsx`: card content and reading order, 0 % vs unavailable,
  missing temperature, unknown condition, exactly one current-hour marker, one tab stop and no
  focusable cards, `ArrowRight`/`ArrowLeft`/`Home`/`End` scroll calls (stub `scrollBy`/`scrollTo` and
  `offsetWidth` on the list/card), hint present when metrics indicate overflow and absent otherwise
  (stub `scrollWidth`/`clientWidth`), hint wired via `aria-describedby`, reduced-motion behavior.
- `tests/weather-forecast.test.tsx`: keep chronological, 0 %, coverage, and empty-forecast
  assertions; assert cards (`listitem`) expose hour, condition text, temperature, probability.
- `tests/weather-card.test.tsx`: keep the reading-order assertion, now over card text; keep the
  summary assertions unchanged.
- `tests/weather-a11y.test.tsx`: add a scroll-region case (focusable list with accessible name, axe
  rule `scrollable-region-focusable` satisfied, visible focus classes), and assert the loading
  placeholders are `aria-hidden` and not list items.
- `tests/weather-responsive.test.tsx`: replace the "vertical rows rather than a horizontal scroller"
  test with assertions that exactly one contained scroller exists (`overflow-x-auto` /
  `overscroll-x-contain` on the list), no inline pixel width is used, all 16 hours render at every
  width, and no ancestor adds overflow.

jsdom has no layout: overflow and scroll tests must stub `scrollWidth`, `clientWidth`, `offsetWidth`,
and `scrollBy`/`scrollTo` on the specific elements and restore them per test. `prefers-reduced-motion`
is already stubbed false in `src/test/setup.ts`; tests override `window.matchMedia` for the reduce
case.

**Rationale**: Constitution VII requires observable behavior, keyboard coverage, and accessible
roles; jsdom cannot verify geometry, so tests verify the measurable contract (contained class scope,
single scroller, focusability, no inline widths) and leave visual verification to `quickstart.md`.

**Alternatives considered**:
- *Snapshot tests*: rejected — no evidence of correctness.
- *A real browser (Playwright)*: not in the approved stack/tooling; out of scope.

---

## R9. Where do the extracted condition icon/tone and percentage helper live?

**Decision**:
- `widgets/conditionPresentation.ts` exports `CONDITION_ICONS` (condition → lucide icon component)
  and `conditionBadgeTone()` verbatim from the current `WeatherCard`, imported by both
  `WeatherCard` and `HourlyForecastCard`. It stays in `widgets` because it maps a domain union to
  React visual presentation.
- `shared/lib/numberFormat.ts` exports `formatWholePercent(value, locale)`, replacing the duplicated
  `formatPercent`/`percentage` helpers in `WeatherCard` and `WeatherForecastList`. It is
  presentation-neutral formatting, appropriate for `shared/lib`.

**Rationale**: Avoids two condition→icon maps that could drift (Principle I) and two percent
formatters that could round differently (FR-006). Neither module contains business rules, so layer
boundaries remain intact.

**Alternatives considered**:
- *Put icons in `entities/weather`*: rejected — an entity must not import React/lucide UI.
- *Keep duplicated maps*: rejected — violates DRY with visible drift risk.

---

## R10. Does anything need documentation beyond the code?

**Decision**: Add `docs/adr/0012-hourly-forecast-contained-horizontal-scroll.md` recording the
Principle VI exception (scope, guarantees, verification, remediation intent), and the feature's
`contracts/ui-contract.md`, `data-model.md`, and `quickstart.md`. No product-overview change: the
redesign improves presentation of existing optional weather context and adds no product capability,
consistent with spec 008's relationship section.

**Rationale**: Constitution XV requires ADRs for constitutional exceptions; the specification
workflow requires design artifacts before tasks.
