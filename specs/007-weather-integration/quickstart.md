# Quickstart: Weather Integration

**Feature**: `007-weather-integration` | **Date**: 2026-11-16

Runnable validation guide. It proves the feature end-to-end; implementation detail lives in
[plan.md](./plan.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

## Prerequisites

- Node.js 24 LTS (`.nvmrc` at the repository root).
- Repository dependencies installed: `npm install` at the root, then `npm --prefix frontend install`
  and `npm --prefix backend install` once the backend app exists.
- An Open-Meteo endpoint reachable from this machine. The free API requires attribution and is
  non-commercial; see [research.md](./research.md) R14 before any paid/commercial deployment.
- No API key is required for development.

## Configuration

Backend (`backend/.env`, copy from `backend/.env.example`):

```dotenv
PORT=8787
CORS_ALLOWED_ORIGINS=http://localhost:5173
OPEN_METEO_FORECAST_BASE_URL=https://api.open-meteo.com/v1/forecast
OPEN_METEO_GEOCODING_BASE_URL=https://geocoding-api.open-meteo.com/v1/search
REQUEST_TIMEOUT_MS=4000
WEATHER_CACHE_TTL_MS=600000
LOCATION_CACHE_TTL_MS=600000
NEGATIVE_CACHE_TTL_MS=30000
RATE_LIMIT_WINDOW_MS=60000
LOCATION_RATE_LIMIT=30
WEATHER_RATE_LIMIT=60
TRUST_PROXY=false
```

Frontend (`frontend/.env.local`):

```dotenv
VITE_API_BASE_URL=http://localhost:8787
```

Every value is validated at startup; a missing or malformed required backend variable must fail fast
with a clear error.

## Run

```bash
npm --prefix backend run build
npm --prefix backend run dev        # terminal 1 — API on :8787
npm --prefix frontend run dev       # terminal 2 — SPA on :5173
```

Open `http://localhost:5173` (Home).

## API smoke checks

```bash
curl -s "http://localhost:8787/api/weather?latitude=40.4165&longitude=-3.7026" | head -c 600
curl -s "http://localhost:8787/api/weather/locations?query=Madrid&language=en&limit=5"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8787/api/weather?latitude=999&longitude=0"
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:8787/api/weather?latitude=40.4&longitude=-3.7" \
  -H "Origin: http://localhost:5173" -D - | grep -i "access-control-allow-origin"
```

Expected: JSON with `units: "metric"`, `retrievedAt`, `observedAt` (or `null`), `current` and an
`hourly` array; locations results with `providerPlaceId`; `400` with
`{"error":{"code":"WEATHER_LOCATION_INVALID",...}}`; and the allowlisted origin echoed only for the
configured origin. Responses must be `Cache-Control: no-store` and must never contain provider hosts,
stack traces, or coordinates in error text.

## Validation scenarios

### V1 — Current conditions and units (US1, FR-008–FR-014, SC-001/SC-002)

1. In Settings, search "Madrid", select a candidate, and keep metric units.
2. Open Home. Expect the saved label, a current temperature with a unit, a localized condition, and
   an "Updated HH:MM" freshness line; current is visually and textually distinct from forecast.
3. Switch to imperial in Settings and return to Home. Measurements convert without a reload, use the
   per-measurement display precision from Preferences, and issue no weather network request (check
   DevTools); the selected location is unchanged.
4. Switch language to Spanish and back. Condition, labels, and states localize; units do not change.
5. Change the location. Old values disappear immediately; the new place's values appear.

### V2 — Remaining-day hourly forecast (US2, FR-015–FR-023, SC-003/SC-004)

1. Open Home with a valid location and complete provider coverage.
2. Verify every remaining hour of the device-local day appears in chronological order; elapsed hours
   are absent; the current hour is marked "Now"/current and is not styled as a future hour.
3. Verify each entry shows hour, temperature with unit, localized condition, and a labeled
   precipitation percentage; a `0%` hour and an "unavailable" probability are visually distinct.
4. Set the device timezone/locale to a zone far from the selected location's zone. Confirm the day,
   hour labels, and current-hour marker still follow the device clock; no hours are added, dropped,
   or relabeled to match the location.
5. Simulate partial coverage (see V6). Confirm available hours remain and a text note states the gap;
   no values are invented.

### V3 — Outdated, refresh, and recovery (US3, FR-034–FR-044, SC-008/SC-010)

1. Load Home and note the "Updated" time.
2. Using the browser clock or by returning after the freshness window, let the data exceed 30 minutes.
   Expect an outdated label, last successful update time, observation age when materially different,
   and a retry/refresh action; nothing is labeled current.
3. Trigger a manual refresh. Existing values stay readable, a pending announcement is emitted, the
   refresh control is disabled, and no duplicate request is issued.
4. Stop the backend, then refresh: an existing acceptable snapshot stays visible as outdated; with no
   acceptable snapshot, the unavailable state with retry appears. Tasks, commitments, agenda, and
   preferences remain fully usable throughout.
5. Restart the backend and retry: the surface recovers, the freshness indicator updates, and the
   recovery is announced once.

### V4 — Degraded states (US4, FR-045–FR-051, FR-057, SC-005/SC-006)

1. Clear the location in Settings. Home shows the no-location state with a Settings action and no
   weather request (verify Network tab); no guessed or previous place is shown.
2. Set `VITE_API_BASE_URL` to an unreachable host (or run with it unset) and reload. Expect the
   unavailable state with retry, no technical details, and zero effect on the rest of Home.
3. Force a `WEATHER_LOCATION_INVALID` response (e.g. temporarily point the frontend at a stub that
   returns that code) and confirm the invalid-location state links to Settings rather than offering
   only retry.
4. Simulate a valid place with no provider data (stub `200` with `current: null`, `hourly: []`) and
   confirm the unavailable/coverage state with retry; the user is not sent to Settings.
5. While any weather state is shown, create, complete, and schedule tasks, edit commitments, and
   navigate dates. Nothing is blocked, delayed, or reordered by weather.

### V5 — Midnight and date change (clarification 3, FR-036/FR-044, SC-016)

1. Load Home with weather displayed.
2. Advance the browser/system clock past local midnight (or use a test harness that advances `useNow`).
3. Verify the card switches to loading, the previous day's snapshot is no longer shown or restorable
   (reload before the new fetch completes), and a new-day retrieval is issued. If the new day fetch
   fails, the unavailable state appears — never yesterday's values.

### V6 — Provider defects and bounds (FR-011/FR-047)

In the backend tests, or with a local stub provider, return: a missing hourly array, short/mismatched
arrays, `null` values, a `weather_code` of `999`, a temperature of `500`, and a precipitation
probability of `-1`. Expected: no crash; affected values are unavailable (`null`), unmapped condition
is the localized generic condition; no zero or invented value appears. Malformed provider payloads
map to `503 WEATHER_UNAVAILABLE` and never leak provider text.

### V7 — Accessibility and responsive (FR-052–FR-064, SC-013–SC-015)

1. Keyboard only: reach the location/Settings link, retry, refresh, and attribution link in a logical
   order with visible focus; no trap.
2. Screen reader: the loading skeleton is not read as data; states and manual refresh outcomes are
   announced once; automatic refreshes that change nothing are silent; each hourly entry reads hour →
   temperature → condition → precipitation.
3. Verify every condition/state is understandable without icons or color, and measure text and
   non-text contrast with a contrast checker in every presentation state.
4. Check 360, 768, 1024, and 1440 px and 200% zoom: no page-level horizontal scrolling, every hour
   reachable, no clipped text, no layout shift that displaces agenda content.
5. With a screen reader, confirm each state transition is announced once and each value's accessible
   description includes its meaning and unit.

### V8 — Storage and privacy (contracts/weather-snapshot-storage.md, Principle XII)

1. With weather ready, reload while the backend is stopped. Acceptable last-known data appears
   immediately, labeled outdated.
2. Inspect `localStorage["walday:weather"]`: version 1, place id, device-local date, `fetchedAt`,
   canonical metric payload; no coordinates, no user identifiers.
3. Corrupt the JSON or set an unknown version and reload. The record is discarded, Home works, and the
   unavailable/loading state behaves normally.
4. Confirm browser and backend logs contain no coordinates, no location query text, and no provider
   payloads.

## Automated checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Also run coverage: `npm run test:coverage` (global ≥ 80 %; critical weather mapping/freshness/day
slicing ≥ 90 %). The backend must pass the same four scripts from `backend/`.

## Done criteria

- All scenarios above pass in `en` and `es` at all supported widths.
- Manual evidence is recorded for the outcomes automation cannot measure: 3 s current-conditions
  timing (SC-009), one-retry/one-cycle recovery (SC-010), the five-participant comprehension check
  (SC-012), and the screen-reader/contrast review (SC-013, FR-059).
- No frontend request goes to an Open-Meteo host at any point.
- Zero weather requests when no location is selected.
- No task, commitment, agenda, or preference change is ever caused by weather.
