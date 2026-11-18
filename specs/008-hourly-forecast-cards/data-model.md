# Phase 1 Data Model: Hourly Forecast Redesign

**Feature**: `008-hourly-forecast-cards` | **Date**: 2026-11-17

This feature adds **no persisted data and no new data contract**. It defines only presentation
entities derived from the existing `ForecastHour[]` already produced by
`features/weather/model/presentation.ts`. Field names below reflect existing exported types unless
marked NEW.

---

## 1. Forecast Hour (existing input, unchanged)

`ForecastHour` — one remaining hour of the device-local day, already validated and unit-normalized
upstream.

| Field | Type | Rules |
|---|---|---|
| `timeMs` | `number` | Absolute epoch milliseconds. Chronologically sorted; unique per row (DST duplicates remain distinct by instant). |
| `hourLabel` | `string` | Device-local, active-locale hour label produced by `Intl.DateTimeFormat`. Never empty. |
| `isCurrentHour` | `boolean` | True for at most one entry; never invented when the current hour is absent. |
| `temperature` | `WeatherMeasurement \| null` | `{ kind: 'temperature', celsius }`; `null` when the provider value is missing or non-finite. |
| `condition` | `Conditions` | Literal union: `clear`, `partly-cloudy`, `cloudy`, `rain`, `snow`, `storm`, `fog`, `unknown`. |
| `precipitationProbability` | `number \| null` | Whole or fractional percent as received; `null` when missing. `0` is a real value. |

**Source of truth**: `entities/weather` types + `features/weather` device-day slicing. This feature
does not alter slicing, ordering, unit conversion, or validation.

---

## 2. Forecast Card (NEW presentation entity)

`HourlyForecastCardProps` — the display contract of one card. It is a pure projection of one
`ForecastHour`; it holds no state.

| Field | Type | Rules |
|---|---|---|
| `hour` | `ForecastHour` | Required. One card per hour, one hour per card. |
| `unit` | `WeatherUnit` | `metric` \| `imperial` from saved preferences; default `metric`. |
| `locale` | `string` | Active formatting locale (`en-US` / `es-ES`). |

Derived, per card render:

| Derived value | Derivation | Rules |
|---|---|---|
| Hour text | `isCurrentHour ? t('weather.now') : hour.hourLabel` | Current hour marked in **text**, exactly once per row. |
| Condition text | `t('weather.conditions.<conditionLabelKey>')` | Always rendered; `unknown` → localized unknown label. Never icon-only. |
| Condition icon | `CONDITION_ICONS[condition]` | Decorative: `aria-hidden="true"`; size fixed; neutral styling for `unknown`. |
| Temperature text | `formatMeasurement(temperature ?? undefined, unit, locale)` | Whole degrees in both units (`MEASUREMENT_PRECISION.temperature = 0`), localized unit label, `tabular-nums`. |
| Temperature fallback | `t('weather.unavailableValue')` | When text is `null`. No zero, dash-only, or blank. |
| Probability text (visible) | `hour.precipitationProbability === null ? t('weather.precipitationProbabilityUnavailableShort') : formatWholePercent(value, locale)` | Compact single line with a decorative precipitation icon. Whole percent, localized, `0` → explicit `0 %`. `null` → compact localized abbreviation (`N/A` / `N/D`), never `0 %`. |
| Probability text (accessible) | `t('weather.precipitationProbability', { value })` or `t('weather.precipitationProbabilityUnavailable')` | sr-only full phrase; the compact visible value is `aria-hidden` so the probability is announced exactly once. |

Accessible-name contract per card: hour → temperature label + value or unavailable → condition label
+ text → precipitation label + value or unavailable. Each of the four data points is announced once.
The compact visible probability value is `aria-hidden`; the sr-only full phrase supplies that single
announcement.

---

## 3. Hourly Forecast Section (NEW container state)

`WeatherForecastListProps` (existing name, rewritten behavior).

| Field | Type | Rules |
|---|---|---|
| `hours` | `readonly ForecastHour[]` | May be empty. Empty → render nothing in the row and let the surface state text explain the gap; no empty scroller. |
| `unit` | `WeatherUnit` | Forwarded to every card. |
| `locale` | `string` | Forwarded; also affects label width and hour text. |

Local, non-persisted UI state owned by the section:

| State | Type | Rules |
|---|---|---|
| `isOverflowing` | `boolean` | `scrollWidth > clientWidth + 1` measured on mount, on resize, and when hours/locale/unit change. Drives hint visibility only. |
| Scroll offset | native DOM `scrollLeft` | Not mirrored in React state. Starts at `0`; never reset by re-render or data refresh. |

Structural contract:

- Section wrapper: `<section aria-labelledby="hourly-forecast-heading">` containing an `<h3>`
  (`text-body font-semibold`).
- Row: `<ol tabIndex={0}>` — the single tab stop — with `aria-labelledby` (heading) and
  `aria-describedby` (hint id, only when the hint renders).
- Items: `<li>` per hour, never focusable, never interactive.
- Hint: `<p id="hourly-forecast-hint">`, static and visible, only when `isOverflowing`.

---

## 4. Overflow / Hint State Machine

| From | Event | To | Render |
|---|---|---|---|
| measuring (mount) | `scrollWidth ≤ clientWidth + 1` | fits | no hint |
| measuring | `scrollWidth > clientWidth + 1` | overflows | hint shown, described-by set |
| fits | content/meta change → overflows | overflows | hint appears |
| overflows | content/meta change → fits | fits | hint removed, described-by cleared |
| either | single hour / zero hours | fits (zero hours renders no row) | no hint; no misleading hidden-content cue |
| either | refresh with same hours count | unchanged | scroll offset and focus preserved |

---

## 5. Surface State Interaction (inherited, not owned)

The section never renders its own loading, error, or retry UI. Mapping from the existing
`WeatherCardState`:

| Surface state | Hourly section rendering |
|---|---|
| `loading` | Card-shaped placeholders in the surface skeleton; `aria-hidden`; not list items; one surface `aria-busy`. |
| `ready` + `hours.length > 0` | Card row + optional hint. |
| `ready` + `coverage: 'partial'` | Row of covered hours only + existing partial-coverage text; no fabricated hours. |
| `ready` + `hours.length === 0` | No row, no hint; existing `coverageUnavailableForecast` text; current summary unaffected. |
| `ready` + `freshness.isOutdated` | Row rendered with the same outdated framing as the summary; cards are not presented as current observations. |
| `unavailable` | No row; surface-level message and existing retry action. |
| `no-location` / `invalid-location` | No row; existing Settings action. |

---

## 6. Validation and Invariants (traceability)

| Invariant | Requirement |
|---|---|
| Exactly one card per forecast hour; no duplicates, no invented hours | FR-002, SC-001 |
| Every card shows hour, condition icon **and** text, temperature, probability | FR-003, FR-005 |
| Current hour marked in text exactly once; labels follow device clock + locale | FR-004 |
| Temperature uses saved unit, localized label, whole degrees, aligned numerals | FR-006, FR-021 |
| Probability is whole-number, localized, explicit `0 %`, unavailable when null | FR-007, SC-006 |
| Missing temperature never rendered as `0`, dash, blank, or invented value | FR-008, SC-006 |
| Exactly one contained scroller; page never scrolls horizontally | FR-009, SC-004 |
| One identical compact card width at all widths; no stretching | FR-011, SC-010 |
| Hint + partially visible card only when hours are hidden; no new controls | FR-012 |
| Single tab stop, arrow/Home/End scrolling, visible focus, no trap, cards not focusable | FR-013, SC-005 |
| Labeled region + heading; ordered list; four values announced once; icons hidden | FR-015, FR-016 |
| Initial position shows current or first available hour; refresh preserves position | FR-017, FR-026 |
| Loading uses one surface skeleton with card placeholders, hidden from AT | FR-018 |
| Gaps and outdated status stated in text; current summary untouched | FR-001, FR-019, FR-020, SC-007 |

---

## 7. Persistence and Contracts

- **Persistence**: none added. The existing `StoredWeatherSnapshot` (version 1, `walday:weather`) is
  untouched and remains the only stored weather structure.
- **API**: none changed. No request/response schema, endpoint, cache key, TTL, or freshness rule is
  modified (FR-024, SC-009).
- **Relationships**: `WeatherCardState (ready) → ForecastHour[] → ForecastCard`; the section owns
  only `isOverflowing` and points to `WeatherUnit` from preferences and `ForecastHour` from the
  weather feature.
