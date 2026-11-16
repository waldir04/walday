# Contract: Weather UI Presentation

**Owner**: `widgets/WeatherCard.tsx`, `widgets/WeatherForecastList.tsx` | **Composed by**: `HomePage` → `HomeDashboard`

Presentational only. The widgets receive a discriminated `WeatherCardState`, a `WeatherUnit`, a
formatting locale, and action callbacks. They never fetch, read storage, or compute business rules.

## 1. Structure (ready state)

```text
<section aria-labelledby="weather-heading" aria-busy="true only while loading">
  <h2 id="weather-heading">Weather</h2>
  <p>{location label}</p>                         ← saved preference label, never coordinates
  <p role="status">{announcement}</p>             ← single polite live region (sr-only)

  <div role="group" aria-label="Current conditions">
    <h3>Current</h3>
    <p>temperature, tabular-nums</p>              ← e.g. 12 °C, or "unavailable"
    <p>condition text</p>                         ← localized; icon decorative only
    <dl>feels-like / wind / humidity only when available; unavailable optional values omitted</dl>
  </div>

  <p>{freshness}</p>                              ← "Updated 05:18" + observation age when material
  <p>{outdated label}</p>                         ← only when outdated
  <p>{attribution link}</p>

  <WeatherForecastList>                           ← only when hours exist
    <h3>Hourly forecast</h3>
    <ol>                                          ← chronological; current hour marked
      <li> Now · 12 °C · Partly cloudy · 5% rain probability </li>
      <li> 14:00 · 13 °C · Cloudy · rain probability unavailable </li>
    </ol>
  </WeatherForecastList>
  <p>{coverage note}</p>                          ← only when coverage is partial/unavailable

  <button>Refresh</button>                        ← disabled while refreshing
</section>
```

Rules:
- Current conditions appear before forecast in DOM order and visible hierarchy (FR-062).
- Current and forecast are distinguished by headings, text labels, and structure, not color alone.
- Every numeric value uses `tabular-nums`; every temperature/wind/precipitation value includes its
  localized unit; every percentage is labeled as precipitation probability.
- A missing required value renders a localized "unavailable" label; it never renders `0`, `—` alone
  without explanation, or a plausible substitute. An unavailable optional supporting measurement is
  omitted rather than shown as a placeholder (FR-010/FR-011).
- A precipitation probability of `0` renders a labeled `0%`, distinct from unavailable.
- The current hour appears once, marked `Now` / "current hour", and is not presented as upcoming;
  elapsed hours are absent (FR-017/FR-018).
- Coverage gap text states which part of the remaining day has no forecast; gaps are not filled.
- Icons are `aria-hidden`; condition and state meaning is always in text (FR-052).

## 2. States

| State | Visible content | Actions | `aria-busy` |
|---|---|---|---|
| `no-location` | Heading, explanation that a location is required | Link "Choose a location" → `/settings#weather-location` | no |
| `loading` | Heading + skeleton matching final layout; text status "Loading weather" (sr-only) | none | yes |
| `invalid-location` | Heading, localized explanation, no weather values | Link "Review location in Settings" → `/settings#weather-location` | no |
| `unavailable` | Heading, localized unavailable message; when `coverage` also states the place is valid but has no data | Button "Try again" | no |
| `ready` (current) | Full structure above, labeled current | Refresh | no |
| `ready` (outdated) | Full structure + outdated label + last successful update + observation age; values never labeled current | Refresh | no (unless refreshing) |
| `ready` + partial/unavailable forecast | Current block still shown; forecast area states its own unavailability/gap (FR-022) | Refresh | no |

These are the seven presentation states: `no-location`, `loading`, `invalid-location`, `unavailable`,
`ready` (current), `ready` (outdated), and incomplete coverage (`ready` with a partial/unavailable
forecast). `aria-busy` is `true` only while loading or refreshing.

The widget must never show values from a previous location or date in any state.

## 3. Announcements (single live region, `role="status"`, `aria-live="polite"`)

| Event | Announcement |
|---|---|
| Initial loading | "Loading weather" |
| Automatic periodic success, presentation unchanged | none (SC-017) |
| Automatic refresh changes state to ready | e.g. "Weather updated" |
| Becomes outdated | "Weather is outdated" + update time |
| Unavailable / invalid location / no location | localized state message |
| Recovery to ready | "Weather is available again" |
| Manual refresh started | "Refreshing weather" |
| Manual refresh success | "Weather updated" |
| Manual refresh failure | "Weather could not be updated" |

- Each state message is announced once per transition; repeating renders with the same state emit
  nothing.
- The refresh control has an accessible name and is disabled while a request is in flight; a manual
  refresh is never duplicated.
- Screen-reader reading order of an hour entry is: hour (or Now) → temperature → condition →
  precipitation probability.

## 4. Accessibility and responsiveness

- Keyboard: link/button reachable in DOM order; visible `focus-visible` ring from the focus token;
  no hover-only behavior.
- Every value exposes an accessible name or description that includes its meaning and unit, so
  temperature, wind, and precipitation are understandable without interpreting layout or symbols
  (FR-053).
- Skeleton is hidden from assistive technology; the busy state and text status remain announced.
- `prefers-reduced-motion`: no entrance/transition animation required; state changes are instant.
- Widths 360, 768, 1024, 1440 px: no page-level horizontal scrolling. Hourly entries are a vertical
  list of rows (or wrapped rows) so every hour remains reachable without horizontal scrolling; rows
  keep 12–16 px gaps.
- 200% zoom remains usable; no fixed pixel heights that clip text.
- State changes cause no layout shift that moves agenda, task, or commitment content (reserve the
  final layout in the loading skeleton; do not collapse the card between states).
- Contrast uses Walday Dark UI semantic tokens only; no raw hex.

## 5. Copy and localization

- All text comes from the `home` namespace (`weather.*`); no hardcoded user-facing strings.
- English and Spanish must both define: all state messages, current/forecast headings, "Now", all
  condition labels including `unknown`, unit-bearing labels, precipitation-probability label,
  unavailable-value label, freshness/outdated/observation-age strings, coverage-gap string,
  retry/refresh labels, and the attribution sentence with a link label.
- Hours are formatted with `Intl.DateTimeFormat` using the device timezone and active locale; numbers
  via the existing measurement/number formatters.
- Changing language relabels everything but changes neither the selected location nor the unit
  system.
