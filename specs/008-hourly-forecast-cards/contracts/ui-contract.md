# Phase 1 UI Contract: Hourly Forecast Cards

**Feature**: `008-hourly-forecast-cards` | **Date**: 2026-11-17

This feature exposes no network API. Its contract is the **presentational and accessibility contract**
between `widgets/WeatherCard`, the rewritten `widgets/WeatherForecastList`, the new
`widgets/HourlyForecastCard`, and the user-facing surface. The existing weather JSON API is unchanged.

---

## 1. Component contracts

### 1.1 `HourlyForecastCard` (NEW, `widgets/HourlyForecastCard.tsx`)

```ts
interface HourlyForecastCardProps {
  hour: ForecastHour
  unit: WeatherUnit
  locale: string
}
```

Guarantees:
- Renders exactly one `<li>`; no focusable element, no click handler, no state, no effects.
- Renders hour text, condition icon (`aria-hidden`) + condition text, temperature with unit or
  localized unavailable text, and probability value or localized unavailable text.
- Never renders `0`, a dash, or a blank for missing temperature; never renders `0 %` for a missing
  probability.
- Uses only semantic tokens; the `<li>` is `shrink-0 w-forecast-card h-full`.

### 1.2 `WeatherForecastList` (REWRITTEN, same file and export name)

```ts
interface WeatherForecastListProps {
  hours: readonly ForecastHour[]
  unit: WeatherUnit
  locale: string
}
```

Guarantees:
- `hours.length === 0` → renders `null` (no empty scroller, no hint).
- Otherwise renders section heading, the single scrollable `<ol>`, one `HourlyForecastCard` per hour
  in input order (already chronological), and the hint only when the row overflows.
- Owns ephemeral UI only: measured overflow flag, keyboard scroll handling, reduced-motion read.
- Does not fetch, retry, or alter freshness/coverage behavior.

### 1.3 `WeatherCard` (loading branch changed, summary unchanged)

- `status: 'loading'` keeps exactly one section `aria-busy="true"`, the existing live region, the
  `sr-only` loading text, and adds card-shaped placeholders in one `aria-hidden` container.
- All other branches keep their current content, order, actions, and text.
- Condition icon map and tone helper are imported from `widgets/conditionPresentation.ts` with
  identical output (icons and classes) as before.

---

## 2. DOM and ARIA contract

```text
<section>                                  aria-labelledby="hourly-forecast-heading"
  <h3 id="hourly-forecast-heading">        "Hourly forecast" / "Pronóstico por hora"
  <p id="hourly-forecast-hint">            only when overflowing; static text
  <ol>                                     tabindex="0", aria-labelledby=heading,
                                           aria-describedby=hint (only when hint exists),
                                           overflow-x-auto, overscroll-x-contain,
                                           focus-visible ring
    <li>                                   one per hour; NOT focusable
      <time?/span> hour                    "Now" text for current hour
      <svg aria-hidden="true">             condition icon, decorative
      <span> condition text                always present
      <span> temperature                   tabular-nums, unit label; or "Unavailable"
      <span> probability                   tabular-nums; or unavailable text
```

| Element | Role / attribute | Rule |
|---|---|---|
| Section | implicit `region` via `aria-labelledby` | Accessible name = forecast heading |
| Heading | `h3` | Logical hierarchy under the surface `h2` |
| Row | implicit `list`, `tabIndex=0` | Single tab stop; announced with item count |
| Item | `listitem` | Never `tabIndex`, button, link, or clickable |
| Icon | `aria-hidden="true"` | Meaning carried by adjacent text |
| Hint | plain paragraph | Visible, non-hover, not interactive |
| Loading placeholders | `aria-hidden="true"` wrapper | Never list items; never announced |

No new live region is introduced. The surface's existing polite status region and `aria-busy`
behavior remain the only asynchronous announcements.

---

## 3. Keyboard contract

| Key (row focused) | Behavior |
|---|---|
| `Tab` / `Shift+Tab` | Moves to the next/previous focusable element; focus is never trapped |
| `ArrowRight` | Scroll by one card width + gap toward later hours |
| `ArrowLeft` | Scroll by one card width + gap toward earlier hours |
| `Home` | Scroll to the first hour |
| `End` | Scroll to the last hour |
| `ArrowUp` / `ArrowDown` / `PageUp` / `PageDown` | Not intercepted; normal page scrolling |
| Other keys | Not intercepted |

- `preventDefault()` is called only for handled horizontal keys.
- Scroll behavior is `smooth` unless `prefers-reduced-motion: reduce`, then `auto`.
- Focus indicator: `focus-visible:ring-2 ring-focus ring-offset-2 ring-offset-surface` plus
  `outline-none`; visible against `surface`.
- Scroll step: first card `offsetWidth` + measured gap; `FALLBACK_SCROLL_STEP_PX = 96` when layout
  is unavailable.

---

## 4. Pointer, touch, and motion contract

- Touch, trackpad, and mouse-wheel horizontal scrolling use native overflow scrolling; momentum is
  preserved. No drag-to-scroll handler is added.
- `overscroll-behavior-x: contain` prevents page scroll chaining.
- No scroll snap, autoplay, or decorative animation.
- Motion limited to existing 150 ms ease-out hover/state affordances inside cards; reduced-motion
  users retain all information and all state changes.

---

## 5. i18n contract (`home` namespace)

Existing keys are reused; only the three NEW keys are added. Both locales must define the identical
set (enforced by `weather-i18n.test.ts`).

| Key | English | Spanish | Use |
|---|---|---|---|
| `weather.forecastHeading` (existing) | Hourly forecast | Pronóstico por hora | Section heading |
| `weather.now` (existing) | Now | Ahora | Current-hour text |
| `weather.temperatureLabel` (existing) | Temperature | Temperatura | sr-only label |
| `weather.conditionLabel` (existing) | Condition | Condición | sr-only label |
| `weather.precipitationProbability` (existing) | {{value}} chance of precipitation | {{value}} de probabilidad de precipitación | Probability value |
| `weather.precipitationProbabilityUnavailable` (existing) | Precipitation probability unavailable | Probabilidad de precipitación no disponible | Missing probability |
| `weather.unavailableValue` (existing) | Unavailable | No disponible | Missing temperature/condition |
| `weather.conditions.*` (existing) | Clear … Conditions unavailable | Despejado … Condiciones no disponibles | Condition text |
| `weather.coveragePartial` (existing) | Some hours later today have no forecast. | Algunas horas más tarde hoy no tienen pronóstico. | Partial coverage |
| `weather.coverageUnavailableForecast` (existing) | No hourly forecast is available for the rest of today. | No hay pronóstico por hora para el resto del día. | Empty forecast |
| `weather.forecastScrollHint` (NEW) | More hours are available. Scroll or use the arrow keys. | Hay más horas disponibles. Desplázate o usa las teclas de flecha. | Overflow hint |
| `weather.hourLabel` (NEW) | Hour | Hora | sr-only label before each card's hour / "Now" text |

Rules: no hardcoded user-facing text; hour labels via `Intl.DateTimeFormat`; percentages via
`Intl.NumberFormat` with `maximumFractionDigits: 0`; temperature via the existing preference
formatter; units independent of language; longer Spanish labels wrap, never clip or widen a card.

---

## 6. Visual and geometry contract

| Property | Value | Source |
|---|---|---|
| Card width | `6rem` (96 px) at every viewport | NEW token `--spacing-forecast-card` in `@theme`, used as `w-forecast-card` |
| Card gap | `0.5rem` (8 px) | existing `gap-2` |
| Card padding | `0.75rem` (12 px) | existing `p-3` |
| Card surface | `bg-surface-raised`, `border border-border` | semantic tokens |
| Card radius | `rounded-2xl` (16 px, card-scale) | Walday Dark UI §4 |
| Surface radius | `rounded-2xl` (16 px) | Walday Dark UI |
| Typography | caption/body, Inter, `tabular-nums` on hour, temperature, probability | existing hierarchy |
| Focus | `focus` token ring on the row | existing `focus-visible` convention |
| Current hour | text marker (`Now`), no color-only signal | FR-004 |
| Condition tone | `warm` for clear/partly-cloudy, `cool` for rain/snow/storm/fog, `border-strong`/`text-muted` for unknown | existing mapping |

Measured expectations (page `px-page`, surface `p-5`):

| Viewport | Row width | Complete cards | Next-card visibility |
|---|---|---|---|
| 360 px | 288 px | ≥ 2 | ≥ ~1 partial card |
| 768 px | 680 px | ≥ 6 | partial remainder + hint |
| 1024 px | 936 px | ≥ 8 | partial remainder + hint |
| 1440 px | ~1,296 px (max-w-6xl cap) | ≥ 9 | partial remainder + hint |
| 200 % zoom | follows CSS pixels above | ≥ 2 at 360-equivalent | no clipping |

Page-level horizontal overflow must measure zero at all widths (`document.documentElement.scrollWidth
<= viewport width`).

---

## 7. State matrix (contract)

| Input condition | Cards | Hint | Gaps stated | Current summary |
|---|---|---|---|---|
| Loading | placeholders, hidden from AT | no | surface loading text | unchanged |
| Ready, complete hours | one per hour | only if overflow | no | unchanged |
| Ready, partial hours | one per covered hour | only if overflow | `coveragePartial` | unchanged |
| Ready, zero hours | none | no | `coverageUnavailableForecast` | unchanged |
| Ready, outdated | one per hour, not labeled current | only if overflow | `outdatedDescription` at surface | unchanged |
| Missing temperature | unavailable text | per overflow | not a coverage gap | unchanged |
| Missing probability | unavailable text | per overflow | not a coverage gap | unchanged |
| Unknown condition | neutral + "Conditions unavailable" | per overflow | not a coverage gap | unchanged |
| Unavailable / no location / invalid location | none | no | existing surface text/action | unchanged |

---

## 8. Explicit non-contracts

- No new API endpoint, request field, response schema, cache key, TTL, retry, or freshness rule.
- No new runtime dependency, global state, storage key, or persisted version.
- No card interaction: no hover expansion, no selection, no detail view, no tooltips carrying unique
  information.
- No `role="button"` cards, no additional tab stops, no scroll buttons or paging controls.
