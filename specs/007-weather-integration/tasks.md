---
description: "Atomic task list for Weather Integration"
---

# Tasks: Weather Integration

**Input**: Design documents from `/specs/007-weather-integration/`

**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`, `research.md`, `quickstart.md`, `.specify/memory/constitution.md`

**Tests**: Included because Constitution Principle VII is non-negotiable and the plan defines the test suites below. Write each test task first and confirm it fails before implementing the corresponding production task.

**Organization**: Tasks are grouped by user story so each story can be implemented, tested, and delivered independently. Every path is absolute from the repository root unless stated otherwise.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different files and no dependency on an incomplete task; safe to run in parallel.
- **[Story]**: `[US1]`, `[US2]`, `[US3]`, or `[US4]`; setup, foundational, and polish tasks carry no story label.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the first backend application skeleton and centralize weather configuration without changing runtime behavior.

- [X] T001 Verify Node.js 24 LTS pinning in `.nvmrc` (`24`) and root `package.json` (`"engines": { "node": ">=24 <25", "npm": ">=11" }`); leave all other root fields unchanged.
- [X] T002 Create `backend/package.json` with `"type": "module"`, Node 24 engines, runtime dependencies `express@^5` and `zod@^4`, and dev dependencies TypeScript 5.9, Vitest 5, `@types/node`, `@types/express`, ESLint, and Prettier; expose `dev`, `build`, `start`, `lint`, `format:check`, `typecheck`, `test`, and `test:coverage` scripts.
- [X] T003 [P] Create `backend/tsconfig.json` and `backend/tsconfig.build.json` enabling `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`, with `src/` compiled to `dist/` for the build config.
- [X] T004 [P] Create `backend/eslint.config.js` as a flat config for Node/TypeScript that mirrors the frontend lint severity, forbids `any`, and ignores `dist/`.
- [X] T005 [P] Create `backend/.env.example` documenting every variable from `quickstart.md` and `research.md` R9: `PORT=8787`, `CORS_ALLOWED_ORIGINS=http://localhost:5173`, `OPEN_METEO_FORECAST_BASE_URL`, `OPEN_METEO_GEOCODING_BASE_URL`, `REQUEST_TIMEOUT_MS=4000`, `WEATHER_CACHE_TTL_MS=600000`, `LOCATION_CACHE_TTL_MS=600000`, `NEGATIVE_CACHE_TTL_MS=30000`, `RATE_LIMIT_WINDOW_MS=60000`, `LOCATION_RATE_LIMIT=30`, `WEATHER_RATE_LIMIT=60`, `TRUST_PROXY=false`.
- [X] T006 Update root `package.json` to add `dev:backend`, `lint:backend`, `typecheck:backend`, `test:backend`, and `build:backend` scripts plus aggregate `dev`, `lint`, `typecheck`, `test`, and `build` scripts that run both applications; add backend `*.{ts,json,md}` patterns to `lint-staged`.
- [X] T007 [P] Create `frontend/src/shared/config/weather.ts` exporting the single source of truth for `WEATHER_FRESHNESS_WINDOW_MS = 1_800_000`, `WEATHER_MAX_RETENTION_MS = 21_600_000`, `WEATHER_REFRESH_INTERVAL_MS = 600_000`, `WEATHER_QUERY_STALE_TIME_MS = 600_000`, `WEATHER_CLIENT_TIMEOUT_MS = 10_000`, `WEATHER_OBSERVATION_SKEW_MS = 300_000`, and `WEATHER_MATERIAL_OBSERVATION_DIFF_MS = 300_000`.
- [X] T008 [P] Create `frontend/src/entities/weather/model/constants.ts` with `WEATHER_STORAGE_KEY = 'walday:weather'`, `WEATHER_STORAGE_VERSION = 1`, `PROVIDER_PLACE_ID_MIN_LENGTH = 1`, `PROVIDER_PLACE_ID_MAX_LENGTH = 128`, and the storage future-clock tolerance of `60_000` ms.

**Checkpoint**: Both workspaces install, lint, typecheck, and build from the root; no weather behavior exists yet.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stateless backend, validated provider boundary, stable API, and the frontend weather entity/API plumbing required by every user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend foundation

- [X] T009 Create `backend/src/config/env.ts` with a Zod schema for every documented environment variable; parse `process.env` once, fail fast with a clear non-secret message on missing or invalid values, apply defaults (`PORT=8787`, timeouts/TTLs/limits from `.env.example`, `TRUST_PROXY=false`), and export typed config plus derived named constants.
- [X] T010 [P] Create `backend/src/domain/weather.ts` defining `WeatherCondition = 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog' | 'unknown'`, `CurrentConditions`, `HourlyForecastEntry`, and `WeatherSnapshot` exactly as `data-model.md` §1: `units` is literal `'metric'`, `retrievedAt` is an ISO 8601 UTC completion instant, `observedAt` is an ISO instant or `null`, `current` is `CurrentConditions | null`, and `hourly` is chronological `HourlyForecastEntry[]`.
- [X] T011 [P] Create `backend/src/domain/errors.ts` with `AppError`, stable codes `WEATHER_UNAVAILABLE`, `WEATHER_LOCATION_INVALID`, `WEATHER_RATE_LIMITED`, `LOCATION_QUERY_INVALID`, `LOCATION_RATE_LIMITED`, `LOCATION_SERVICE_UNAVAILABLE`, `NOT_FOUND`, `INTERNAL_ERROR`, and their fixed HTTP statuses (503, 400, 429, 400, 429, 503, 404, 500).
- [X] T012 [P] Create `backend/src/domain/condition.ts` mapping WMO codes exactly as `research.md` R8 (`0 → clear`; `1,2 → partly-cloudy`; `3 → cloudy`; `45,48 → fog`; `51,53,55,56,57,61,63,65,66,67,80,81,82 → rain`; `71,73,75,77,85,86 → snow`; `95,96,99 → storm`; anything else `unknown`) and enforcing bounds that coerce violations to `null`, never zero: temperature `−90…60`, apparent temperature `−100…70`, humidity integer `0…100`, wind `0…500`, precipitation `0…500`, precipitation probability integer `0…100` with `0` distinct from `null`.
- [X] T013 [P] Create `backend/src/lib/time.ts` with injected-clock helpers for computing ISO instants and Unix-second comparisons, so tests can control time without touching process state.
- [X] T014 [P] Create `backend/src/lib/cache.ts` implementing a bounded TTL cache with `get`, `set`, positive TTL, negative TTL, a 1,000-entry cap, and expired-first pruning; entries must store only mapped internal values, never provider bodies.
- [X] T015 [P] Create `backend/src/lib/retry.ts` implementing a configurable `AbortController` timeout (default `REQUEST_TIMEOUT_MS`, 4 s) and one GET-only retry on timeout/network error/5xx/429 with 250 ms base backoff plus up to 250 ms jitter and exactly two total attempts; never retry non-429 4xx.
- [X] T015a [P] Create `backend/tests/retry.test.ts` asserting exactly two total attempts, retry only for GET on timeout/network/5xx/429, no retry for other 4xx or non-GET calls, 250 ms base backoff with bounded jitter, and an abort at `REQUEST_TIMEOUT_MS`; control time and timers deterministically.
- [X] T016 [P] Create `backend/src/providers/schemas.ts` with strict Zod schemas for Open-Meteo forecast and geocoding DTOs; validate arrays and length before index access, allow `null`/missing optional measurements, and reject wrong types, non-finite numbers, and unexpected top-level shapes.
- [X] T017 Create `backend/src/providers/openMeteoForecast.ts` building the internal URL from `contracts/weather-api.md` §1 (`current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code`, `hourly=temperature_2m,weather_code,precipitation_probability`, `timeformat=unixtime`, `timezone=UTC`, `forecast_days=2`, `temperature_unit=celsius`, `wind_speed_unit=kmh`, `precipitation_unit=mm`), fetching with the T016 schema and T015 retry/timeout, and mapping to T010 domain types without exposing provider DTOs; emit `current` only when the provider returned a current block with at least one usable value, otherwise emit `null`; map a provider coverage/no-data response for otherwise valid coordinates to `WEATHER_UNAVAILABLE` or an empty snapshot, never to `WEATHER_LOCATION_INVALID` (FR-027); set `observedAt` only when the provider time is finite and not more than 5 min in the future, retaining older finite observation times unchanged so the client can label them outdated; drop hourly entries with unusable `time`, keep entries whose measurements are all unusable, sort ascending, de-duplicate by exact timestamp, and cap at 48 entries (schema may tolerate 96).
- [X] T018 Create `backend/src/providers/openMeteoGeocoding.ts` building `GET {OPEN_METEO_GEOCODING_BASE_URL}?name&count&language&format=json`, validating with T016, mapping to `{ providerPlaceId, name, region, countryCode, latitude, longitude }`, de-duplicating by `providerPlaceId`, and returning an empty array rather than `null` when no result exists.
- [X] T019 [P] Create `backend/src/middleware/cors.ts` applying an explicit `CORS_ALLOWED_ORIGINS` allowlist, echoing only allowed origins, never a wildcard, and setting `Access-Control-Allow-Methods` to GET/OPTIONS only.
- [X] T020 [P] Create `backend/src/middleware/rateLimit.ts` with an in-memory fixed-window limiter, location limit 30 req/min/IP and weather limit 60 req/min/IP, a bounded 10,000-key map with periodic pruning, `TRUST_PROXY` support, and `429` responses carrying `WEATHER_RATE_LIMITED` or `LOCATION_RATE_LIMITED`.
- [X] T021 [P] Create `backend/src/middleware/errorHandler.ts` as the single error middleware producing `{ error: { code, message, details?: unknown } }` with stable developer-facing English messages, correct status mapping, no stack traces, provider hosts, upstream bodies, or coordinates, and `500 INTERNAL_ERROR` for unexpected failures; include `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer` on every response.
- [X] T022 [P] Create `backend/src/middleware/notFound.ts` returning `404` with `{ error: { code: 'NOT_FOUND', ... } }` for unknown routes.
- [X] T023 [P] Create `backend/src/middleware/requestLogger.ts` logging method, path without query string, status, and duration only; never log coordinates, query text, headers, or provider URLs.
- [X] T024 Create `backend/src/services/weatherService.ts` orchestrating T014 cache (`(latitude, longitude, 'metric', 2)`, weather TTL 10 min, negative TTL 30 s), T017 provider, and mapping to `WeatherSnapshot`; store the mapped snapshot with its original `retrievedAt`/`observedAt` and never refresh `retrievedAt` on a cache hit (it is the client's freshness fallback); a successful provider response with no usable values must return `200` with `current: null` and/or `hourly: []`, not an error.
- [X] T025 Create `backend/src/services/locationService.ts` orchestrating T014 cache (`(normalized query, language, limit)`, TTL 10 min, negative TTL 30 s), T018 provider, and candidate mapping; it must not depend on Express request/response objects.
- [X] T026 [P] Create `backend/src/controllers/weatherController.ts` reading validated `latitude`/`longitude`, calling T024, and returning `200` with `Cache-Control: no-store` or delegating a typed `AppError`; no business logic in the controller.
- [X] T027 [P] Create `backend/src/controllers/locationController.ts` reading validated `query`/`language`/`limit`, calling T025, and returning `200` with `{ results }` and `Cache-Control: no-store`.
- [X] T028 [P] Create `backend/src/routes/weatherRoutes.ts` defining `GET /api/weather` with a strict Zod query schema: required finite `latitude` in `[−90, 90]` and `longitude` in `[−180, 180]`, unknown keys rejected.
- [X] T029 [P] Create `backend/src/routes/locationRoutes.ts` defining `GET /api/weather/locations` with a strict Zod query schema: `query` trimmed, 1…80 grapheme clusters with no control characters, `language` in `{en, es}`, `limit` integer `1…10` default `5`.
- [X] T030 Create `backend/src/app.ts` exporting `createApp(config, dependencies)` that wires JSON body limit 16 KB, CORS, request logging, rate limiting, T028/T029 routes, not-found handling, and the single error middleware; allow injecting `fetchImpl` and clock for tests without mocking modules.
- [X] T031 Create `backend/src/server.ts` that loads T009 config, listens on `PORT`, logs only startup metadata, and performs graceful shutdown on `SIGTERM`/`SIGINT`; do not import it from tests.
- [X] T032 [P] Create `backend/tests/config.test.ts` asserting valid configuration parses, defaults apply, missing required variables and malformed URLs/numbers fail fast, and error messages contain no secrets.
- [X] T033 [P] Create `backend/tests/condition-mapping.test.ts` asserting every WMO mapping above, unmapped/negative codes become `unknown`, and each out-of-range/non-finite measurement becomes `null` while a valid `0` probability remains `0`.
- [X] T034 [P] Create `backend/tests/provider-schema.test.ts` covering missing arrays, short arrays, `null` values, wrong types, non-finite numbers, and out-of-range values, asserting invalid values become `null` rather than throwing past the validation boundary.
- [X] T035 [P] Create `backend/tests/cache.test.ts` covering hits, positive expiry, negative expiry, 1,000-entry bound, expired-first pruning, and replacement of an existing key.
- [X] T036 [P] Create `backend/tests/rate-limit.test.ts` asserting 30/min for locations, 60/min for weather, per-client isolation, 429 stable codes, window reset with a controlled clock, and bounded-map pruning.
- [X] T037 [P] Create `backend/tests/helpers/request.ts` booting the real T030 app on an ephemeral port with an injected fake `fetchImpl`, exposing a helper returning status, headers, and parsed JSON, and closing the server after each test.
- [X] T038 [P] Create `backend/tests/location-route.test.ts` asserting the spec 003 contract: `200` `{ results: [...] }` with duplicates removed and results never `null`, `400 LOCATION_QUERY_INVALID`, `429 LOCATION_RATE_LIMITED`, `503 LOCATION_SERVICE_UNAVAILABLE`, `Cache-Control: no-store`, allowlisted CORS only, and no provider hosts or text leaked.

### Frontend foundation

- [X] T039 [P] Create `frontend/src/entities/weather/model/types.ts` defining `Conditions`, `CurrentConditions`, `HourlyEntry`, `WeatherSnapshot`, and `StoredWeatherSnapshot` with `version: 1`, `providerPlaceId`, `localDate` (`yyyy-mm-dd`), `fetchedAt` (ISO instant), and the exact validated `snapshot`.
- [X] T040 Create `frontend/src/entities/weather/model/schema.ts` with Zod schemas for the API response and stored envelope: `units` literal `'metric'`, ISO `retrievedAt`, `observedAt` ISO or `null`, nullable measurements, condition literals, chronological `hourly` entries, `providerPlaceId` 1…128 trimmed characters, `localDate` `yyyy-mm-dd`, and `version` literal `1`; reject missing or wrongly typed known fields while ignoring unknown extra response fields per `contracts/weather-api.md` §3 stability rules (backend query schemas stay strict).
- [X] T041 [P] Create `frontend/src/entities/weather/model/format.ts` adapting canonical values to the existing `WeatherMeasurement` union: `{ kind: 'temperature', celsius }`, `{ kind: 'wind-speed', kilometersPerHour }`, `{ kind: 'precipitation', millimeters }`; pass `null` through unchanged and never substitute zero.
- [X] T042 [P] Create `frontend/src/entities/weather/index.ts` exporting only public entity types, schemas, constants, and format helpers.
- [X] T043 [P] Update `frontend/src/app/queryKeys.ts` to add `weather: (providerPlaceId: string, localDate: string) => [...]` under the existing hierarchical `queryKeys` factory; do not create ad-hoc key arrays elsewhere.
- [X] T044 Create `frontend/src/features/weather/model/api.ts` using the validated `VITE_API_BASE_URL` from `shared/config/env.ts`, native `fetch`, `AbortController` with `WEATHER_CLIENT_TIMEOUT_MS`, Zod validation through T040, and typed failure classification; never log or embed coordinates, query text, or raw provider details.
- [X] T045 [P] Create `frontend/tests/weather-schema.test.ts` asserting valid API payloads parse and malformed payloads (wrong `units`, non-integer probability, missing `current`/`hourly`, invalid ISO dates, out-of-range probability, unknown condition) are rejected; assert unknown extra fields are tolerated per `contracts/weather-api.md` §3; assert stored envelopes with wrong version/date/provider id are rejected.
- [X] T046 [P] Create `frontend/tests/weather-api.test.ts` asserting the T044 adapter uses the configured base URL, aborts after 10 s, surfaces stable error codes, and never includes coordinates in thrown messages or logs.

**Checkpoint**: Backend serves both contracts and passes foundational tests; frontend validates API payloads and exposes a typed API adapter. User story work can now begin.

---

## Phase 3: User Story 1 — See current conditions for the day (Priority: P1) 🎯 MVP

**Goal**: Show the saved location label, current temperature in the selected units, localized condition text, a last-updated indicator, and the no-location state without affecting tasks, commitments, or the agenda.

**Independent Test**: Save a location and measurement units in Settings, open Home, and verify current conditions appear for that location in those units; change either preference and verify the display updates without reload; clear the location and verify only the no-location state with a Settings action appears.

### Tests for User Story 1

- [X] T047 [P] [US1] Create `backend/tests/weather-route.test.ts` asserting `GET /api/weather` returns `200` with `units: 'metric'`, `retrievedAt` preserved across cache hits, `observedAt` or `null`, a current block with valid condition and nullable measurements, `Cache-Control: no-store`, `nosniff`, `Referrer-Policy`, CORS only for allowlisted origins, and cache hits after one provider call; assert bounded retry counts on a transient provider failure. Error-code coverage lives in T082 to avoid duplicating the same assertions in two files.
- [X] T048 [P] [US1] Create `frontend/tests/weather-current.test.tsx` asserting the ready card shows the saved location label, current temperature with localized unit and tabular numerals, localized condition text with no icon-only meaning, an explicit "Current" label, a last-updated time drawn from `retrievedAt`, a keyboard-reachable attribution link, and the capability to distinguish current from forecast structure; assert a `null` current temperature renders the unavailable label rather than `0`; assert metric and imperial renders use the correct converted values, localized unit labels, and preference display precision, and that changing units updates the display without issuing a new weather request; assert the weather surface is absent when the selected date is not today (FR-002); assert the no-location state shows the Settings action and makes zero requests.

### Implementation for User Story 1

- [X] T049 [P] [US1] Create `frontend/src/features/weather/model/condition.ts` mapping the canonical condition union to presentation keys/labels including `unknown` as a localized generic condition, with no provider text and no color-only meaning.
- [X] T050 [US1] Create `frontend/src/features/weather/model/useWeather.ts` with one TanStack Query `useQuery` using T043's key, disabled when no location is selected (zero requests, FR-041/SC-011), calling T044, and returning the current snapshot, loading state, and last-updated reference; no `useEffect` fetching; also create `frontend/src/features/weather/index.ts` exporting `useWeather` and its public state types as the slice's only widget-facing entry.
- [X] T051 [US1] Replace the `WeatherView`/`WeatherCardState` definitions in `frontend/src/widgets/WeatherCard.tsx` with the discriminated union from `data-model.md` §4 and render the `ready` current block (location label, current heading, temperature, condition text, freshness string), the localized provider attribution link required by FR-065, and the `no-location` state; render optional supporting measurements only when available (unavailable ones are omitted) and label a missing required current temperature as unavailable; keep the component presentational with explicit props for unit, locale, and actions.
- [X] T052 [US1] Update `frontend/src/widgets/HomeDashboard.tsx` to accept and pass the richer weather state, unit, locale, and callbacks to `WeatherCard`; do not fetch weather in the widget.
- [X] T053 [US1] Update `frontend/src/pages/HomePage.tsx` to import from `@/features/weather`, call T050, pass the state/unit/locale to `HomeDashboard`, preserve the existing `showTodaySurfaces` today-only gating (FR-002) and add no new route or navigation entry (FR-006), and wire the no-location action to `/settings#weather-location`; weather must remain outside task, commitment, and agenda calculations.
- [X] T054 [P] [US1] Update `frontend/src/shared/i18n/locales/en/home.json` with `weather.*` keys for current heading, current label, location-required explanation, Settings action, last-updated label, unavailable-value label, condition labels including `unknown`, unit-bearing value labels, and the provider attribution sentence plus its link label.
- [X] T055 [P] [US1] Update `frontend/src/shared/i18n/locales/es/home.json` with the same `weather.*` key set and Spanish translations, keeping condition text and units localized.

**Checkpoint**: US1 is independently functional: current conditions and no-location work end to end, unit changes update the display without retrieval, and no weather value appears without a selected location.

---

## Phase 4: User Story 2 — Plan the remaining hours with an hourly forecast (Priority: P2)

**Goal**: Show every remaining hour of the current device-local day with hour, temperature, condition text, and precipitation probability, marking the current hour, excluding elapsed hours, and stating coverage gaps without fabricated values.

**Independent Test**: Open Home with a saved location and verify each remaining device-local hour exposes its time, temperature, condition, and labeled precipitation percentage; verify a 0% probability is distinct from unavailable, the current hour is marked once, elapsed hours are absent, and a partial forecast states the uncovered part.

### Tests for User Story 2

- [X] T056 [P] [US2] Create `backend/tests/weather-hourly-route.test.ts` with hourly assertions: chronological order, de-duplication by `time`, invalid `time` dropped, all-unusable-measurement entry retained, `precipitationProbability: 0` preserved as `0`, unavailable probability preserved as `null`, and at most 48 entries.
- [X] T057 [P] [US2] Create `frontend/tests/weather-device-day.test.ts` with injected timezones covering UTC, positive offset, negative offset, DST spring-forward, DST fall-back, a location timezone different from the device timezone, the last hour of the day, and the remaining-day boundary; assert elapsed hours are excluded, the current hour is marked once, no next-day hours are invented, and the same result follows the device timezone.
- [X] T058 [P] [US2] Create `frontend/tests/weather-forecast.test.tsx` asserting chronological rows expose hour (`Now` for the current hour), temperature, condition text, and labeled probability in reading order; assert `0%` renders as zero, unavailable renders as unavailable rather than `0%`, partial coverage states the missing part, and current conditions remain visible when hourly data is empty.

### Implementation for User Story 2

- [X] T059 [US2] Create `frontend/src/features/weather/model/deviceDay.ts` slicing the provider's hourly series to the remaining hours of the device-local day using `Intl`/`Date` only, marking the current device-local hour, excluding elapsed hours, preserving chronological order, handling DST transitions without fabricating or merging clock hours, and returning coverage `'complete' | 'partial' | 'unavailable'` based on whether the provider covers the remaining day.
- [X] T060 [US2] Create `frontend/src/features/weather/model/presentation.ts` projecting each usable hour to `ForecastHour = { timeMs, hourLabel, isCurrentHour, temperature, condition, precipitationProbability }`, using T041 adapters and preserving `null` for missing values.
- [X] T061 [P] [US2] Create `frontend/src/widgets/WeatherForecastList.tsx` as a presentational chronological `<ol>` with an "Hourly forecast" heading, an accessible `Now` marker, tabular numerals, localized units/labels, and rows ordered hour → temperature → condition → precipitation probability; icons remain `aria-hidden`.
- [X] T062 [US2] Update `frontend/src/widgets/WeatherCard.tsx` to render T061 after current conditions, keep current and forecast distinguishable by headings and text, and show the coverage note only for partial/unavailable coverage without filling gaps.
- [X] T063 [US2] Update `frontend/src/features/weather/model/useWeather.ts` to call T059/T060 and return the device-local hours, current-hour marker, and coverage alongside the snapshot; do not create a second request and do not reorder entries on unit or language changes.
- [X] T064 [P] [US2] Update `frontend/src/shared/i18n/locales/en/home.json` with hourly-forecast heading, `Now`, precipitation-probability label, coverage-gap strings, and all hourly labels.
- [X] T065 [P] [US2] Update `frontend/src/shared/i18n/locales/es/home.json` with the same hourly keys and Spanish translations.

**Checkpoint**: US1 and US2 work independently: the forecast reflects the remaining device-local day, marks the current hour, excludes elapsed hours, and never fabricates missing values or coverage.

---

## Phase 5: User Story 3 — Keep weather context current and trustworthy (Priority: P3)

**Goal**: Refresh on open, location change, date change, outdated display, and cadence; retain one bounded last-known-good snapshot as outdated; provide a non-duplicating manual refresh; discard results for a no-longer-selected place.

**Independent Test**: Load Home, change location and units, let the surface become outdated, simulate successful and failed refreshes, reload and return to Home, and confirm updated, outdated, and recovered states, with no values from the previous location and no duplicate refresh requests.

### Tests for User Story 3

- [X] T066 [P] [US3] Create `frontend/tests/weather-freshness.test.ts` asserting the freshness reference is `observedAt ?? retrievedAt` (never `fetchedAt`), the 30-minute boundary is inclusive on the current side, a newly fetched but old observation is outdated, an old finite observation is retained rather than dropped for age, observation age is `null` when absent, a future observation within the 5 min skew is treated as age 0 while one beyond it falls back to `retrievedAt`, and observation age exceeding 5 minutes is reported materially.
- [X] T067 [P] [US3] Create `frontend/tests/weather-retention.test.ts` asserting a snapshot is usable only while its freshness reference (`observedAt ?? retrievedAt`) is within 6 h, a reference older than 6 h produces the unavailable presentation instead of outdated values, a future `fetchedAt` beyond 60 s is unusable, a different `localDate` is unusable, and a place mismatch is not rendered.
- [X] T068 [P] [US3] Create `frontend/tests/weather-storage.test.ts` covering every read/write rule in `contracts/weather-snapshot-storage.md`: valid restore, missing key, unparseable JSON, wrong type, unknown version, date mismatch, place mismatch retained but unused, future `fetchedAt` deletion, reference-over-6 h deletion, schema-failed write skipped, stale place/date write skipped, storage throwing leaves the surface functional, and no coordinates in the serialized record.
- [X] T069 [P] [US3] Create `frontend/tests/weather-refresh.test.tsx` asserting no request without a location, a new request on location change with old values removed immediately, an in-flight result for the previous location discarded, a stored snapshot shown immediately as outdated while fetching, exactly one request while stale, manual refresh disabled while in flight, repeated failures settling into unavailable with no automatic retry loop, clearing the location while displayed switching immediately to no-location, and the device-local date change discarding the previous-day snapshot and requesting the new day.
- [X] T070 [P] [US3] Create `frontend/tests/weather-announcements.test.tsx` asserting one announcement per meaningful transition, silent successful automatic refreshes that leave the state unchanged, no announcement when a refresh completes while Home is unmounted, announcements for becoming outdated, outdated-to-current updates, recovery, and manual refresh start/success/failure, and no duplicate live-region text.

### Implementation for User Story 3

- [X] T071 [P] [US3] Create `frontend/src/features/weather/model/freshness.ts` deriving `isOutdated`, `lastRetrievedAt`, and `observationAgeMs` from the reference `observedAt ?? retrievedAt` (a future observation beyond `WEATHER_OBSERVATION_SKEW_MS` falls back to `retrievedAt`; a future observation within the skew is age 0), using `WEATHER_FRESHNESS_WINDOW_MS` and `WEATHER_MATERIAL_OBSERVATION_DIFF_MS` from `shared/config/weather.ts`; inject the clock for tests.
- [X] T072 [P] [US3] Create `frontend/src/features/weather/model/retention.ts` with a pure predicate enforcing `WEATHER_MAX_RETENTION_MS` against the freshness reference (`observedAt ?? retrievedAt`), the 60 s future tolerance for `fetchedAt`, and current-device-local-date equality.
- [X] T073 [US3] Create `frontend/src/entities/weather/model/storage.ts` implementing the read/write algorithms in `contracts/weather-snapshot-storage.md`: single atomic `walday:weather` envelope at version `1`, try/catch around every access, delete on corrupt/unknown-version/date-mismatch/future-`fetchedAt`/reference-older-than-6-h records, ignore without deleting a different-place record, and write only after API schema validation and a still-matching `(place, date)` context; persist `fetchedAt` as the client completion instant for the future-clock guard only; never store coordinates or converted values.
- [X] T074 [US3] Update `frontend/src/features/weather/model/useWeather.ts` to hydrate T073 as `initialData` only when usable and present it as outdated until the first successful fetch replaces it, use `WEATHER_QUERY_STALE_TIME_MS` and `WEATHER_REFRESH_INTERVAL_MS`, refresh on first open/location change/date change/when outdated, expose `refresh()` with single-flight suppression, discard late results for a different place or date, derive last-updated/freshness from `observedAt ?? retrievedAt`, and persist each successful validated response atomically with `fetchedAt` set to the client completion instant (used only for the storage clock guard).
- [X] T075 [US3] Create `frontend/src/features/weather/model/useWeatherAnnouncements.ts` producing one polite announcement per transition per `data-model.md` §5 and `contracts/ui-contracts.md` §3; successful automatic refreshes that leave the presentation unchanged must emit nothing.
- [X] T076 [US3] Update `frontend/src/features/weather/model/presentation.ts` to derive `ready` with `isOutdated`, the last-successful-update time from `retrievedAt`, observation age, and `isRefreshing`, switch to `unavailable` when the freshness reference exceeds the 6 h maximum staleness, and retain the last readable values during refresh and failure.
- [X] T077 [US3] Update `frontend/src/widgets/WeatherCard.tsx` to render the outdated label with last-updated time and material observation age, never label outdated values current, and expose a Refresh button that is disabled during refresh and preserves values while pending.
- [X] T078 [US3] Update `frontend/src/pages/HomePage.tsx` to pass `refresh`, announce via T075, and keep the weather surface from blanking or displacing tasks, commitments, and agenda during refresh or failure.
- [X] T079 [P] [US3] Update `frontend/src/shared/i18n/locales/en/home.json` with outdated, last-updated, observation-age, refreshing, refresh, and refresh-outcome strings.
- [X] T080 [P] [US3] Update `frontend/src/shared/i18n/locales/es/home.json` with the same refresh/freshness keys and Spanish translations.
- [X] T081 [US3] Update `frontend/src/features/weather/index.ts` to export only `useWeather`, `useWeatherAnnouncements`, the presentation state types, and the public actions needed by `HomePage`/widgets; do not export model internals.

**Checkpoint**: US1, US2, and US3 work independently: weather refreshes on open/location/date/cadence, retained data is always labeled outdated, manual refresh cannot duplicate requests, and no previous-place value can appear.

---

## Phase 6: User Story 4 — Stay informed when weather cannot be shown (Priority: P3)

**Goal**: Explain loading, unavailable, invalid-location, no-location, incomplete coverage, and provider-coverage gaps in text, offer recovery actions where meaningful, and leave all core actions fully usable.

**Independent Test**: Simulate loading, provider failure, offline start with and without a snapshot, invalid location, valid place with no coverage, and malformed values; confirm each state is explained in text, retry or Settings actions are correct, no technical details or fabricated values appear, and tasks, commitments, agenda, and preferences remain operable.

### Tests for User Story 4

- [X] T082 [P] [US4] Create `backend/tests/weather-errors.test.ts` asserting a successful provider response with no usable values returns `200` with `current: null` and/or `hourly: []`; a provider coverage/no-data response for valid coordinates maps to the empty result or `503 WEATHER_UNAVAILABLE` and never to `WEATHER_LOCATION_INVALID`; `400 WEATHER_LOCATION_INVALID` only for local coordinate validation; `429 WEATHER_RATE_LIMITED`; `503 WEATHER_UNAVAILABLE`; `500 INTERNAL_ERROR` without internals; no provider text/hosts/coordinates in any error envelope; and correct status/headers.
- [X] T083 [P] [US4] Create `frontend/tests/weather-states.test.tsx` asserting loading (skeleton preserves layout, text status, `aria-busy`), unavailable with retry, unavailable coverage (valid place, no data, no Settings action), invalid-location with Settings action, no-location, offline with and without a usable snapshot, clearing the location while weather is displayed, a reference older than 6 h yielding unavailable rather than outdated values, a `null` current temperature labeled unavailable, and malformed/partial values treated as unavailable; assert no state displays previous-location values or fabricated zeros/defaults, and that task, commitment, agenda, and preference controls remain enabled and operable in every weather state (FR-005/FR-049, SC-005/SC-006).
- [X] T083a [P] [US4] Create `frontend/tests/weather-presentation.test.ts` as a pure model test for `presentation.ts` derivation: every state and ready variant, current-vs-outdated boundaries, the 6 h unavailable cutover, `coverage: true` for an empty successful payload versus `coverage: false` for failures, independent `current`/`hourly` availability, and preservation of last readable values during refresh and failure.
- [X] T084 [P] [US4] Create `frontend/tests/weather-a11y.test.tsx` asserting axe passes in every state, retry/refresh are keyboard operable with visible focus, the skeleton is hidden from assistive technology, one polite live region announces each state, every value exposes an accessible description with its meaning and unit, reading order is hour → temperature → condition → probability, and reduced-motion/200% zoom remain usable.

### Implementation for User Story 4

- [X] T085 [US4] Update `frontend/src/features/weather/model/api.ts` to classify `400 WEATHER_LOCATION_INVALID` as invalid location, `429`/`503`/timeout/network/malformed payload as unavailable, and unknown failures as unavailable without exposing technical details; never log coordinates or query text.
- [X] T086 [US4] Update `frontend/src/features/weather/model/presentation.ts` to derive `loading`, `invalid-location`, `unavailable` with `coverage: true` for a valid place with an empty successful payload, and `unavailable` with `coverage: false` for service/network failures or when the freshness reference exceeds the 6 h maximum staleness; keep `current` and `hourly` failing independently.
- [X] T087 [US4] Update `frontend/src/widgets/WeatherCard.tsx` to render the loading skeleton matching final layout, invalid-location explanation with `/settings#weather-location`, unavailable message with retry, coverage-specific text for a valid place with no data, and never show placeholders, examples, old-place values, or technical diagnostics; keep `role="status"` as the single live region.
- [X] T088 [US4] Update `frontend/src/features/weather/model/useWeatherAnnouncements.ts` to announce initial loading, unavailable, invalid location, no location, recovery, and manual-refresh outcomes exactly once per transition, while successful automatic refreshes that leave the state unchanged stay silent.
- [X] T089 [P] [US4] Update `frontend/src/shared/i18n/locales/en/home.json` with loading, unavailable, coverage-unavailable, invalid-location, retry, Settings-action, recovery, and announcement strings.
- [X] T090 [P] [US4] Update `frontend/src/shared/i18n/locales/es/home.json` with the same degraded-state keys and Spanish translations.

**Checkpoint**: All seven presentation states (with incomplete coverage counted as one of the seven) are independently testable; every failure is text-explained, correctly actionable, and isolated from core functionality.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Prove i18n parity, responsiveness, security, documentation, and full-repository quality gates.

- [X] T091 [P] Create `frontend/tests/weather-i18n.test.ts` asserting EN/ES define the same complete `home.weather.*` key set, condition/state/unit/attribution strings are localized, hours/numbers use the active locale, changing language changes labels only (not units or the selected location), and changing units changes measurements and precision only without issuing a new weather request, covering both metric and imperial conversions.
- [X] T092 [P] Create `frontend/tests/weather-responsive.test.tsx` asserting 360, 768, 1024, and 1440 px and 200% zoom have no page-level horizontal scrolling, every forecast hour is reachable, reduced motion is respected, and state changes produce no layout shift that moves agenda/task/commitment content across all presentation states.
- [X] T093 [P] Create `backend/tests/security.test.ts` asserting no coordinates/query text appear in logs, `Cache-Control: no-store` on weather and location responses, `nosniff`/`Referrer-Policy` headers, explicit CORS without wildcard, 16 KB body limit, and rate-limit isolation by client IP.
- [X] T094 [P] Create `docs/adr/0011-weather-backend-and-last-known-good.md` recording: the mandated stateless backend proxy (building on ADR 0008's location-proxy decision) and why the frontend never calls Open-Meteo, canonical metric retrieval with client-side unit display, in-process TTL cache/rate-limit limits and single-instance assumptions, the versioned `walday:weather` last-known-good snapshot and its 6 h/date-change deletion, freshness authority (`observedAt ?? retrievedAt`) and the 30 min window plus 6 h maximum staleness, the spec 005 `stale` → `outdated` terminology mapping and why no `WEATHER_STALE` code is emitted, the guest-storage notice already provided by spec 003, and Open-Meteo/GeoNames CC-BY 4.0 attribution plus the commercial-deployment gate.
- [X] T095 Update `specs/007-weather-integration/quickstart.md` with the final backend install/build/dev commands, validated `.env` variables, smoke checks, and the eight validation scenarios mapped to the automated suites; keep it runnable exactly as written.
- [X] T096 Run the full quality gates using the root `package.json` scripts from the repository root: `npm install`, `npm --prefix backend install`, `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, and `npm run build`; fix every failure, confirm backend and frontend coverage meet the constitution's 80%/90% targets, and verify `backend/.env` is not committed.
- [ ] T097 Record the manual validation evidence the automated suites cannot produce: measured Home-open-to-current-conditions time on typical broadband for SC-009 (≥95% within 3 s), retry/recovery success for SC-010 (≥95% without reload), the five-participant comprehension check for SC-012, a manual screen-reader pass over all seven presentation states and an hourly entry for SC-013, and contrast measurement in every state for FR-059; attach the results to the feature validation notes referenced by `quickstart.md`.
  - **Status**: automated gates complete; human-run SC-009/SC-010/SC-012/SC-013/FR-059 evidence remains pending in `validation-notes.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **User Stories (Phases 3–6)**: Depend on Foundational completion. They are independently testable but not file-independent: US2 and US3 both modify `useWeather.ts`; US3 and US4 both modify `presentation.ts`, `WeatherCard.tsx`, `useWeather.ts`, and the `home.json` locales. Run them sequentially in priority order (or coordinate ownership) when working concurrently.
- **Polish (Phase 7)**: Depends on every desired user story being complete.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational. No dependency on US2–US4; MVP slice.
- **US2 (P2)**: Starts after Foundational; consumes the same foundational snapshot/API; independently testable with current conditions present.
- **US3 (P3)**: Starts after Foundational; adds persistence/freshness/refresh. Integrates with US1/US2 presentation but remains independently testable through stored snapshots and refresh scenarios.
- **US4 (P3)**: Starts after Foundational; adds degraded states. It can be developed alongside US3 only with coordinated file ownership, because both modify `presentation.ts`, `useWeather.ts`, `WeatherCard.tsx`, and the `home.json` locales; its recovery announcements depend on the US3 announcement hook, so integrate after T075 exists.

### Within Each User Story

- Tests are written first and must fail before implementation.
- Models/derivations precede services/hooks; hooks precede widgets; widgets precede page wiring.
- Story complete and tested before moving to the next priority when working sequentially.

---

## Parallel Opportunities

- **Setup**: T003, T004, T005, T007, and T008 touch distinct files and can run together after T002.
- **Foundational backend**: T010–T016 are independent domain/lib/schema files; T019–T023 are independent middleware files.
- **Foundational frontend**: T039–T043 and T045–T046 touch distinct files; T040 depends on T039's types.
- **US1**: T047/T048 tests run in parallel; T049/T054/T055 are independent files.
- **US2**: T056–T058 tests run in parallel; T061/T064/T065 are independent files.
- **US3**: T066–T070 tests run in parallel; T071/T072/T079/T080 are independent files. US3 and US4 share `presentation.ts`, `WeatherCard.tsx`, `useWeather.ts`, and the locale files, so do not run those implementation tasks concurrently without coordinated ownership.
- **US4**: T082–T084 and T083a tests run in parallel; T089/T090 are independent files.
- **Polish**: T091–T094 are independent files and can run in parallel before T096; T097 records manual evidence after T096.

## Parallel Example: User Story 1

```bash
# Tests first
npm --prefix backend exec -- vitest run tests/weather-route.test.ts
npm --prefix frontend exec -- vitest run tests/weather-current.test.tsx

# Independent implementation files
# T049 features/weather/model/condition.ts
# T054 shared/i18n/locales/en/home.json
# T055 shared/i18n/locales/es/home.json
```

## Parallel Example: User Story 3

```bash
# Tests first
npm --prefix frontend exec -- vitest run tests/weather-freshness.test.ts tests/weather-retention.test.ts \
  tests/weather-storage.test.ts tests/weather-refresh.test.tsx tests/weather-announcements.test.tsx

# Independent implementation files
# T071 features/weather/model/freshness.ts
# T072 features/weather/model/retention.ts
# T079 shared/i18n/locales/en/home.json
# T080 shared/i18n/locales/es/home.json
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) only.
3. Validate: saved location and units render current conditions; changing either preference updates without reload; no location yields the no-location state and zero requests; tasks/commitments/agenda are unaffected.
4. Stop and ship the MVP if current conditions alone are the desired increment.

### Incremental Delivery

1. US1 → current conditions and no-location.
2. US2 → remaining-day hourly forecast and coverage gaps.
3. US3 → freshness, last-known-good, refresh, and recovery.
4. US4 → loading/unavailable/invalid/coverage states and announcements.
5. Polish → i18n parity, responsiveness, security, ADR, quickstart, and full gates.

### Notes

- Weather is optional context: no task may make a task, commitment, agenda, preference, or navigation action depend on weather.
- Every missing value is `null` and renders a localized unavailable label; never substitute `0`, a blank, a default, or a plausible value.
- Device timezone defines the day, hours, and current-hour marker; the selected location supplies data only.
- Coordinates and query text never enter logs, errors, storage, or user-facing copy.
- No new frontend runtime dependency and no provider SDK are introduced.
