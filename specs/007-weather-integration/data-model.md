# Data Model: Weather Integration

**Feature**: `007-weather-integration` | **Date**: 2026-11-16 | **Storage**: none on the backend; one versioned client snapshot

This document defines the internal weather domain, the wire contract shapes it is validated from,
the single persisted client structure, and the presentation-state transitions. Provider DTOs are not
part of this model; they are validated and discarded at the backend boundary.

## 1. Backend domain (in-memory only)

### 1.1 WeatherCondition (value union)

```ts
type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'fog'
  | 'unknown'
```

Rules:
- Produced by mapping WMO codes (see `research.md` R8). An unmapped/missing code becomes `unknown`.
- Never derived from text, colors, or other variables.
- `unknown` renders a localized generic condition; it is not a missing value indicator.

### 1.2 Measurement (nullable scalar with a unit fixed by the field)

| Field | Unit | Plausible range | Notes |
|---|---|---|---|
| `temperatureCelsius` | °C | −90…60 | Required for a usable current temperature; otherwise `null` |
| `apparentTemperatureCelsius` | °C | −100…70 | Optional |
| `relativeHumidityPercent` | % | 0…100 | Optional integer |
| `windSpeedKilometersPerHour` | km/h | 0…500 | Optional |
| `precipitationMillimeters` | mm | 0…500 | Optional; preceding hour for hourly values |
| `precipitationProbability` | % | 0…100 | Optional integer; `0` and `null` are distinct |

Values outside the range, non-finite numbers, and type mismatches become `null`. Missing is never
coerced to `0`, `''`, or a default.

### 1.3 CurrentConditions

| Field | Type | Required | Invariant |
|---|---|---|---|
| `temperatureCelsius` | number \| null | yes | plausible range or `null` |
| `condition` | WeatherCondition | yes | `unknown` when unmapped |
| `apparentTemperatureCelsius` | number \| null | yes | optional data, explicit null |
| `relativeHumidityPercent` | number \| null | yes | integer or null |
| `windSpeedKilometersPerHour` | number \| null | yes | plausible range or `null` |
| `precipitationMillimeters` | number \| null | yes | plausible range or `null` |

A `CurrentConditions` object is emitted only when the provider returned a current block with at least
one usable value; otherwise the backend emits `null`. Temperature may be individually `null` while
condition/supporting values are present; the surface then labels temperature unavailable and does not
invent one.

### 1.4 HourlyForecastEntry

| Field | Type | Required | Invariant |
|---|---|---|---|
| `time` | integer (Unix seconds, UTC instant) | yes | finite, positive, in chronological order |
| `temperatureCelsius` | number \| null | yes | plausible range or `null` |
| `condition` | WeatherCondition | yes | `unknown` when unmapped |
| `precipitationProbability` | number \| null | yes | integer 0…100 or `null` |

Entries with an unusable `time` are dropped; entries with only unusable measurements are kept so the
surface can say the hour exists but its values are unavailable. The series is sorted ascending by
`time`, de-duplicated by exact timestamp, and capped at the provider's two-day window (≤ 48 entries
today; the schema tolerates up to 96).

### 1.5 WeatherSnapshot (wire + client domain)

| Field | Type | Required | Invariant |
|---|---|---|---|
| `units` | `'metric'` | yes | canonical retrieval units; literal |
| `retrievedAt` | ISO 8601 instant | yes | server fetch completion time; UTC |
| `observedAt` | ISO 8601 instant \| null | yes | provider observation time when plausible |
| `current` | CurrentConditions \| null | yes | independent of `hourly` |
| `hourly` | HourlyForecastEntry[] | yes | may be empty; chronological |

Invariants:
- `current` and `hourly` fail independently: either, both, or neither may be empty.
- If both are empty, the payload is still a successful retrieval (coverage unavailable), not an
  error.
- `observedAt` is `null` when absent, non-finite, or more than 5 min in the future. An old but
  finite observation is retained unchanged so the client can label the data outdated (FR-034) or
  withhold it once it exceeds the maximum staleness (FR-044); the backend never nulls it merely for
  age.
- `units` is always `'metric'`; display conversion happens on the client.
- `retrievedAt` is the original successful provider retrieval instant and is preserved across backend
  cache hits; serving a cached snapshot must not refresh it.

## 2. Backend request/response contracts

Detailed HTTP contracts live in [contracts/weather-api.md](./contracts/weather-api.md). Summary:

- `GET /api/weather?latitude&longitude` → `WeatherSnapshot` or stable error envelope.
- `GET /api/weather/locations?query&language&limit` → `{results: LocationCandidate[]}` or stable
  error envelope (contract owned by spec 003).

Validation at the boundary: query strings parsed with strict Zod schemas; unknown keys rejected where
practical; latitude ∈ [−90, 90], longitude ∈ [−180, 180], both finite and required; `limit` integer
1…10 (default 5); `language` ∈ {en, es}; `query` 1…80 grapheme clusters after trimming with no control
characters.

## 3. Client persisted structure: last-known-good snapshot

Storage key: `walday:weather`. Version: `1`.

```ts
interface StoredWeatherSnapshot {
  version: 1
  providerPlaceId: string        // 1…128 trimmed characters
  localDate: string              // yyyy-mm-dd, device-local date of retrieval
  fetchedAt: string              // ISO instant when the client completed and persisted the fetch
  snapshot: WeatherSnapshot      // exact validated API payload (canonical metric)
}
```

`fetchedAt` is the client's persistence/clock-sanity timestamp; it is used only for the future-clock
guard and diagnostics. The displayed "last updated" time and the freshness/retention reference are
`snapshot.observedAt ?? snapshot.retrievedAt`, so a server cache hit cannot make data look newer than
it is (FR-009/FR-034).

Read rules (`entities/weather/model/storage.ts`):
1. Missing key → no snapshot, no warning.
2. Unparseable JSON, invalid shape, unknown/newer version, or failed Zod validation → delete the
   record, return no snapshot. No quarantine UI; weather is optional context.
3. `localDate` ≠ current device-local date → delete, return no snapshot (SC-016).
4. `fetchedAt` in the future (beyond 60 s tolerance) → delete, return no snapshot.
5. Reference age `now − (snapshot.observedAt ?? snapshot.retrievedAt)` > 6 h → delete, return no
   snapshot (FR-044). The age is measured from the data's own reference, not from `fetchedAt`, so an
   old observation cannot be kept alive by a fresh retrieval.
6. `providerPlaceId` ≠ the currently selected place → ignore without deleting (the selected place may
   have changed and changed back); it is never rendered.

Write rules:
- One atomic single-envelope write on every successful fetch; replaces the previous record.
- Written only after the API response passes Zod validation and the location still matches the
  request context (FR-043).
- Contains no coordinates, no unit-converted values, no user identifiers, no provider payload beyond
  the validated `WeatherSnapshot`.
- Corrupt/unwritable storage never blocks the surface; the query still displays the in-memory result
  for the session.

Unusable or mismatched records are never shown as weather; only the query result or a usable snapshot
can produce a ready/outdated presentation.

## 4. Presentation state model

```ts
type WeatherCardState =
  | { status: 'no-location' }
  | { status: 'loading' }
  | { status: 'invalid-location' }
  | { status: 'unavailable'; coverage: boolean }   // true => valid place with no data; false => failure or nothing recent enough
  | {
      status: 'ready'
      locationLabel: string
      current: CurrentConditions | null
      hours: ForecastHour[]              // remaining device-local day, chronological, current hour marked
      freshness: { isOutdated: boolean; lastRetrievedAt: Date; observationAgeMs: number | null }
      coverage: 'complete' | 'partial' | 'unavailable'
      isRefreshing: boolean
    }
```

`ForecastHour` is a presentation projection: `{ timeMs, hourLabel, isCurrentHour, temperature,
condition, precipitationProbability }`, where `temperature` is a `WeatherMeasurement` for the existing
formatter and each missing value is `null` (rendered as unavailable).

`lastRetrievedAt` is `snapshot.retrievedAt`, shown as the last successful update time. `isOutdated` is
true when the reference `observedAt ?? retrievedAt` is older than 30 min, and a snapshot hydrated from
storage is always `isOutdated: true` until a successful fetch for the current query replaces it
(FR-040). When that reference is older than the 6 h maximum staleness, derivation MUST return
`unavailable` (`coverage: false`) and no weather values, even if the fetch just completed.

The seven presentation states are `no-location`, `loading`, `invalid-location`, `unavailable`,
`ready` (current), `ready` (outdated), and incomplete coverage (`ready` with
`coverage: 'partial' | 'unavailable'`). `outdated` and incomplete coverage are variants of `ready`,
not additional states. `stale` from spec 005 is presented as **outdated** here; spec 005's generic
`error` state maps to `unavailable` for service/network failures or `invalid-location` when the saved
place itself is unusable. The JSON contract has no staleness code because freshness is derived
client-side.

## 5. State transitions

| From | Trigger | To | Notes |
|---|---|---|---|
| any | no selected location | `no-location` | query disabled; zero requests (FR-041, SC-011) |
| `no-location` | location saved | `loading` | new query key |
| `loading` | fetch succeeds with data | `ready` (current or outdated) | outdated if reference > 30 min |
| `loading` | fetch succeeds with empty payload | `unavailable` (coverage) | retry action, not Settings |
| `loading` | 400 `WEATHER_LOCATION_INVALID` | `invalid-location` | Settings action |
| `loading` | network/timeout/429/503/malformed | `unavailable` | retry action |
| `loading` | usable stored snapshot exists | `ready` (outdated) while fetching | never blocks the card |
| `ready` / `outdated` | reference age crosses 30 min while visible | `ready` with `isOutdated: true` | text + last update + observation age; no data change |
| `ready` / `outdated` | reference age crosses 6 h while visible or on hydration | `unavailable` | values must not remain visible; retry action (FR-044) |
| `ready` / `outdated` | manual refresh starts | same state, `isRefreshing: true` | existing values stay readable; duplicate refresh prevented |
| `ready` / `outdated` | refresh fails, snapshot usable | `ready` (outdated) | failure does not blank data |
| `ready` / `outdated` | refresh fails, snapshot unusable | `unavailable` | retry action |
| `outdated` / `unavailable` / `invalid-location` | fetch succeeds | `ready` | recovery announced once |
| any | selected location changes | `loading` | old values removed immediately; stale result discarded (FR-043) |
| any | device-local date changes | `loading` | previous snapshot deleted; new-day retrieval |
| `invalid-location` | user fixes/clears location in Settings | `loading` / `no-location` | new key or disabled query |
| `unavailable` | place cleared | `no-location` | no request |

Announcement matrix:

| Transition | Announce |
|---|---|
| initial `loading` | yes |
| `ready`/`outdated` from `loading` on automatic fetch | only if presentation state changed |
| automatic periodic refresh leaving `ready` unchanged | **no** |
| `ready` → outdated (crossing window) | yes |
| `outdated` → `ready` (current) on refresh | yes (state changed) |
| → `unavailable`, `invalid-location`, `no-location` | yes |
| recovery to `ready` | yes |
| manual refresh start/outcome | yes |

## 6. Validation and derivation ownership

| Concern | Owner | Tested as |
|---|---|---|
| Provider payload validation | backend `providers/schemas.ts` | schema fixtures |
| Provider → domain mapping, bounds, condition mapping | backend `domain/` + `services/` | pure mapping tests |
| API request validation | backend `routes/` Zod schemas | route integration |
| API response validation | frontend `entities/weather/model/schema.ts` | malformed payload tests |
| Stored snapshot validation/migration | frontend `entities/weather/model/storage.ts` | storage tests |
| Device-day slicing, current-hour marker, coverage gap | frontend `features/weather/model/deviceDay.ts` | timezone/DST tests |
| Freshness, outdated, observation age | frontend `features/weather/model/freshness.ts` | clock-injected tests |
| Retention usability | frontend `features/weather/model/retention.ts` | boundary tests |
| Presentation derivation + announcements | frontend `features/weather/model/presentation.ts` | model + component tests |

## 7. Constants (named, single source)

| Constant | Value | Location |
|---|---|---|
| `WEATHER_FRESHNESS_WINDOW_MS` | 1 800 000 (30 min) | `shared/config/weather.ts` |
| `WEATHER_MAX_RETENTION_MS` | 21 600 000 (6 h) | `shared/config/weather.ts` |
| `WEATHER_REFRESH_INTERVAL_MS` | 600 000 (10 min) | `shared/config/weather.ts` |
| `WEATHER_QUERY_STALE_TIME_MS` | 600 000 (10 min) | `shared/config/weather.ts` |
| `WEATHER_CLIENT_TIMEOUT_MS` | 10 000 | `shared/config/weather.ts` |
| `WEATHER_OBSERVATION_SKEW_MS` | 300 000 (5 min) | `shared/config/weather.ts` |
| `WEATHER_MATERIAL_OBSERVATION_DIFF_MS` | 300 000 (5 min) | `shared/config/weather.ts` |
| `WEATHER_STORAGE_KEY` / `VERSION` | `walday:weather` / `1` | `entities/weather/model/constants.ts` |
| Provider timeout / retries / backoff / cache TTLs / rate limits | see research R9 | `backend/src/config/env.ts` |

`WEATHER_OBSERVATION_SKEW_MS` is the client's tolerated future clock skew for `observedAt`: an
observation at most 5 min ahead is treated as age 0, and one further ahead is unusable, so
`retrievedAt` becomes the reference. `WEATHER_MATERIAL_OBSERVATION_DIFF_MS` controls when the
observation age is stated alongside the last successful update time (FR-035).

No timezone, coordinate, or unit literal is scattered through components.
