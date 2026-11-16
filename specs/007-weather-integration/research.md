# Phase 0 Research: Weather Integration

**Feature**: `007-weather-integration` | **Date**: 2026-11-16

Every Technical Context item is resolved; there is no `NEEDS CLARIFICATION`. Each decision records
what was chosen, why, and what was rejected. Provider facts were verified against the Open-Meteo
Terms and API documentation on 2026-11-16.

## R1. Where weather data is retrieved

**Decision**: Add the repository's first backend application under `backend/` and expose two GET
endpoints through it: `GET /api/weather` (current conditions + hourly series) and
`GET /api/weather/locations` (geocoding search, contract already consumed by spec 003). The backend
calls Open-Meteo with native `fetch`.

**Rationale**: Constitution XIX states the frontend MUST NOT call the provider directly and that
all weather access goes through a backend proxy. Spec 003 §2 explicitly transferred ownership of the
location endpoint to this feature. Choosing anything else would fail a NON-NEGOTIABLE gate and leave
the already-implemented location resolver permanently unavailable.

**Alternatives considered**:
- *Direct browser calls to Open-Meteo*: prohibited by Principle XIX (and would expose users' derived
  locations to a third party from the client).
- *Static fixtures only*: satisfies neither FR-008 nor any success criterion.
- *A serverless function outside the repository*: adds deployment technology not in the closed stack
  and no testable application boundary; rejected.

## R2. Backend framework, structure, and persistence

**Decision**: Express 5 with the constitutional backend structure: routes → controllers → services →
provider clients, plus single error middleware, typed env config, CORS allowlist, request size limit,
and rate-limit middleware. No repositories, no Prisma, no PostgreSQL, no database connection. Node 24
LTS, TypeScript strict, Zod 4, Vitest 5. `express` and `zod` are the only runtime dependencies; no
CORS/cache/rate-limit/logger/dotenv packages.

**Rationale**: Express and Zod are in the approved stack. Express 5 propagates rejected promises to
error middleware, which keeps async error handling simple and testable. Weather is read-only and
user-agnostic, so adding a database would be unused infrastructure (Principle IX/XVIII: only model
persistence when a feature needs it). A repository layer without a data store is indirection
(Principle I). Node's built-in `fetch`, `AbortController`, `--env-file`, and timers cover everything a
library would otherwise provide (Principle XX).

**Alternatives considered**:
- *Prisma/PostgreSQL with a weather table*: rejected; caching fresh provider data in a database adds
  schema, migrations, and cost with no product requirement.
- *Framework other than Express*: outside the closed stack.
- *`cors`, `express-rate-limit`, `pino`, `dotenv`*: each is avoidable with a dozen lines of explicit
  code; adding them requires written justification and bundle/ops review for no benefit.

## R3. Freshness window and the authority timestamp

**Decision**: Current conditions are current only while the reference timestamp is at most
**30 minutes** old. Reference = provider `observedAt` when the backend supplies it, otherwise the
server's retrieval time (`retrievedAt`). A response that arrived seconds ago but whose observation is
90 minutes old is **outdated**. An observation more than 5 minutes in the future (clock skew or
provider defect) is ignored in favor of `retrievedAt`. An old but finite observation is never discarded
for age alone: it is labeled outdated up to the 6 h maximum staleness, beyond which the surface uses
the unavailable state instead of displaying it (FR-044).

**Rationale**: Clarification 2 makes observation time authoritative; Open-Meteo documents current
conditions as 15-minutely model data, so 30 minutes tolerates one missed update cycle while never
presenting hour-old readings as current. Ignoring implausible future timestamps avoids a permanent
"current" verdict from a bad clock.

**Alternatives considered**:
- *10 minutes*: too tight against a 15-minute provider cadence; frequent false "outdated" states.
- *60 minutes*: would present hour-old observations as current, contradicting FR-034/SC-008.
- *Fetch time only*: explicitly rejected by clarification 2.

## R4. Maximum retention for last-known-good

**Decision**: A retained snapshot is usable for at most **6 hours**, measured from the freshness
reference (`observedAt ?? retrievedAt`), and only while its `localDate` equals the current
device-local date. At the device-local date change the snapshot is discarded immediately, even inside
6 hours (clarification 3), and a new retrieval is attempted; the surface shows loading, then
unavailable if retrieval fails. On read, stale-format, wrong-location, wrong-date, future-dated, or
over-age snapshots are deleted.

**Rationale**: Weather remains useful for continuity during a short outage, but a 6-hour-old reading
is the practical limit for same-day planning; the date rule implements SC-016 and the midnight edge
case. Keeping dates out of the retention window is what makes "yesterday's weather" impossible.

**Alternatives considered**:
- *No retention*: loses offline/reload continuity required by FR-040 and US3/US4.
- *24 hours*: presents morning weather at night and complicates the midnight rule.
- *Persist a per-date history*: unnecessary; single snapshot satisfies the contract.

## R5. Refresh cadence, staleTime, and duplicate suppression

**Decision**:
- Client `staleTime` = 10 minutes; automatic `refetchInterval` = 10 minutes **only while visible**
  (`refetchIntervalInBackground: false`); `refetchOnWindowFocus: true` so returning to Home refreshes.
- Refetch on mount, on selected-location change (new query key), and on device-local date change (new
  query key).
- `retry: false` on the client: the backend already retries; a failed fetch becomes a stable
  unavailable/outdated state with explicit retry. TanStack Query deduplicates concurrent fetches for
  the same key, and the refresh button is disabled while pending.
- Server cache TTL = 10 minutes; negative cache = 30 seconds.

**Rationale**: 10 minutes keeps displayed data well inside the 30-minute window, aligns with the
provider's 15-minutely current data, and cuts provider calls by at least an order of magnitude
against free-tier limits. Backend retries plus client non-retry avoids request storms (FR-038).
Refetch-on-focus converts "returning to the surface" into a concrete trigger.

**Alternatives considered**:
- *Refetch every minute*: unnecessary load, no better user outcome, risks provider limits.
- *30-minute cadence*: touches the outdated boundary and can show outdated data on a visible
  surface.
- *Client retry loops*: duplicate with backend retries and risk storms.

## R6. Location and units in retrieval

**Decision**: The backend requests canonical **metric** values (Celsius, km/h, mm) and the frontend
converts at display time with the existing preference formatter. The server cache key is
`(coordinates, units: 'metric', forecast window)`; `units` is a named canonical constant, not a
user-selectable variant. Changing units never refetches (FR-029).

**Rationale**: FR-029 requires units to change without a new retrieval; requesting each unit system
would double provider traffic and contradict the requirement. Display conversion already exists in
`entities/preferences/model/units.ts` and applies preference precision. Naming the canonical units in
the cache key keeps Principle XIX's "keyed by location, units, and time window" honest.

**Alternatives considered**:
- *Request the selected unit system per user*: doubles traffic, makes cache sharing impossible, and
  violates FR-029.
- *Convert on the server per request*: adds a units parameter for no benefit and still requires a
  request on change.

## R7. Timezone authority and hourly slicing

**Decision**: Retrieve a two-day provider series as **Unix timestamps** (`timeformat=unixtime`,
`timezone=UTC`) and do every day/hour decision on the client using the **device** timezone
(`Intl.DateTimeFormat().resolvedOptions().timeZone`, injectable for tests). The current device-local
day, remaining hours, current-hour marker, and displayed hour labels all use that zone; the selected
location supplies weather values only.

**Rationale**: Clarification 1 and FR-015/FR-016 make the device timezone authoritative. Unix
timestamps avoid the provider's fixed-offset ISO strings, which ignore DST transitions inside the
range. Conversions with `Intl` handle DST correctly: 23- and 25-hour days emerge naturally, duplicate
local hours in a fall-back transition remain distinct absolute hours (each with its own entry and
timestamp), and no hour is fabricated or merged. Two days are required because the remaining
device-local day can extend up to 24 hours beyond "now"; two UTC days cover the worst ±14-hour offset.

**Alternatives considered**:
- *Provider `timezone=auto`*: labels hours in the selected place, contradicting clarification 1.
- *Fixed-offset ISO strings*: wrong across DST transitions and offset changes.
- *Slicing by location date*: would add/drop hours relative to the user's day.

## R8. Provider request shape and mapping

**Decision**: Forecast request:
`GET {OPEN_METEO_FORECAST_BASE_URL}?latitude&longitude&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&timeformat=unixtime&timezone=UTC&forecast_days=2&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm`.
Geocoding request: `GET {OPEN_METEO_GEOCODING_BASE_URL}?name&count&language&format=json`.
Both responses are Zod-validated; arrays are length-checked before index access.

Internal condition model: `clear | partly-cloudy | cloudy | rain | snow | storm | fog | unknown`.
WMO mapping: 0 → clear; 1, 2 → partly-cloudy; 3 → cloudy; 45, 48 → fog; 51, 53, 55, 56, 57, 61, 63,
65, 66, 67, 80, 81, 82 → rain; 71, 73, 75, 77, 85, 86 → snow; 95, 96, 99 → storm; anything else →
unknown (localized generic text; never invented).

Plausibility bounds (violations become `null`, not zero): temperature −90…60 °C, apparent temperature
−100…70 °C, wind 0…500 km/h, humidity 0…100 %, precipitation 0…500 mm, probability integer 0…100.
`current.time` becomes `observedAt` only if finite and at most 5 minutes ahead; an older finite
observation is preserved so the client can mark the data outdated rather than silently treating it as
current.

**Rationale**: These are exactly the provider variables needed to satisfy FR-008/FR-010/FR-015/FR-016
without daily aggregates (high/low, sunrise, alerts are out of scope). Mapping to a small internal
union keeps provider codes out of the UI and makes localization a fixed key set. Bounds implement
FR-047/FR-011: implausible values are unavailable, never displayed as data.

**Alternatives considered**:
- *Expose raw `weather_code` to the UI*: violates provider-DTO isolation and FR-052.
- *Use provider condition text (`weather_code` descriptions)*: English-only and not switchable.
- *Include daily high/low*: optional and would need daily arrays; current spec does not require them.
- *Request `is_day`*: not required for text-based conditions; omitted to keep payload minimal.

## R9. Backend caching, retries, timeouts, and rate limits

**Decision**:
- Provider timeout **4 s** via `AbortController`.
- One retry for GET only, on timeout/network error/5xx/429, with 250 ms base backoff and up to 250 ms
  jitter; never retry 4xx except 429; total attempts = 2.
- TTL cache keyed by `(latitude, longitude, units: 'metric', forecastDays)` and by
  `(normalized query, language, limit)` for locations; bounded (1,000 entries) with expired-first
  pruning. Weather TTL 10 min; location TTL 10 min; negative cache 30 s.
- In-memory fixed-window rate limiter: locations **30 req/min/IP**, weather **60 req/min/IP**, bounded
  key map (10,000) with periodic pruning; `trust proxy` configurable for deployments behind a proxy.
- `Cache-Control: no-store` on responses; CORS allowlist from env (no wildcard); JSON body limit 16 KB.

**Rationale**: Principles IX and XIX prescribe explicit timeouts, bounded retries with backoff,
caching with a TTL, and isolation. A small cache converts each location's traffic into at most one
provider call per 10 minutes per instance, keeping the app far below 600/min. Rate limiting protects
the shared free-tier quota and satisfies spec 003's requirement for the location endpoint. In-process
state is correct for a single instance and avoids premature distributed infrastructure; multi-instance
deployment simply multiplies capacity while keeping per-instance provider calls bounded.

**Alternatives considered**:
- *Redis/shared cache*: no current multi-instance requirement; Principle IX rejects premature
  distributed infrastructure.
- *Unbounded cache/limiter maps*: memory-growth risk; bounded maps with pruning avoid it.
- *Three or more retries*: increases worst-case latency past the 4 s timeout budget and amplifies
  provider incidents.

## R10. Error mapping and the cost of "no data"

**Decision**: Stable codes:
- `WEATHER_UNAVAILABLE` → 503 (provider unreachable, timeout, 5xx, malformed payload, negative cache).
- `WEATHER_LOCATION_INVALID` → 400 (local request validation: missing, malformed, or out-of-range
  coordinates). A provider response indicating no coverage for otherwise valid coordinates is **not**
  invalid location; it maps to an empty successful snapshot or `503 WEATHER_UNAVAILABLE` (FR-027).
- `WEATHER_RATE_LIMITED` → 429.
- `LOCATION_QUERY_INVALID` → 400; `LOCATION_RATE_LIMITED` → 429;
  `LOCATION_SERVICE_UNAVAILABLE` → 503 (spec 003 contract).
A successful provider response with no usable values returns **200** with `current: null` and/or
`hourly: []`, so the client can distinguish "valid place, no coverage" from a service failure and use
the unavailable presentation with retry (clarification 4 / FR-046) without sending the user to
Settings. Error bodies are the single envelope and never include provider text, hosts, or stack
traces.

**Rationale**: The UI needs to choose between invalid-location (Settings action) and
unavailable/coverage (retry action); collapsing them would contradict FR-027. 2xx-with-empty payload
is the honest representation of "provider answered, no data", while 5xx stays reserved for failures.

**Alternatives considered**:
- *503 `WEATHER_NO_DATA`*: would look like a transient failure and lose the coverage distinction.
- *Treat empty as invalid location*: explicitly prohibited by FR-027.
- *Expose provider error text*: prohibited by FR-046 and Principle X.

## R11. Client last-known-good persistence

**Decision**: Store one snapshot envelope at `walday:weather` version 1:
`{version, providerPlaceId, localDate, fetchedAt, snapshot}`. The `snapshot` is the exact validated
API response (canonical metric). Read path validates with Zod and a usability predicate (same place,
same device-local date, freshness reference `observedAt ?? retrievedAt` within 6 hours, not
future-dated); any failure deletes the record and returns nothing, except a different-place record,
which is ignored but retained. Writes are atomic single-envelope writes in `entities/weather`; no
component reads localStorage directly. The snapshot seeds TanStack Query only when a fetch has not
completed, and is overwritten on every success. `fetchedAt` is the client persistence timestamp used
for the future-clock guard, not the freshness reference.

**Rationale**: FR-040/FR-044 require continuity across reloads and offline starts, which in-memory
state cannot provide. This is a cache of server state mandated by the constitution, not a parallel
store: it is write-through from the query, read only as `initialData`, always labeled outdated until a
successful refresh replaces it (FR-040), and discarded at the date boundary (SC-016).

**Alternatives considered**:
- *TanStack persistence plugin*: a new dependency for one small record; unnecessary.
- *`sessionStorage`*: lost on tab close, defeating continuity.
- *Storing display-unit values*: would break unit changes without refetch and duplicate conversion.
- *Persisting coordinates separately*: coordinates already live in preferences; the snapshot is keyed
  by place ID and never duplicates them.

## R12. Frontend query and state composition

**Decision**: One `useQuery` with key
`['walday','weather','snapshot', providerPlaceId, deviceLocalDate]`, `queryFn` = injected HTTP
adapter, enabled only when a location exists and `VITE_API_BASE_URL` is configured. `useWeather`
returns a discriminated `WeatherCardState` (`no-location | loading | invalid-location | unavailable |
ready`) plus `isOutdated`, `coverage` (`complete | partial | unavailable`), current conditions,
remaining hours, freshness text inputs, `isRefreshing`, `refresh()`, and `announcement`.
`HomePage` composes; `WeatherCard` renders. No `useEffect` performs network work.

**Rationale**: Principle XVII permits server state only through TanStack Query and requires key-factory
keys, deliberate staleness, and loading/empty/error states. Including the device-local date in the key
makes the midnight transition a key change, which structurally drops the previous day (SC-016)
instead of relying on render-time filtering. A single hook keeps widgets presentational.

**Alternatives considered**:
- *Direct `fetch` in `WeatherCard`*: prohibited and untestable.
- *Client store for weather*: prohibited parallel server-state store.
- *Date filtering inside the component without a key*: leaves a window where previous-day data renders
  and makes announcements ambiguous.

## R13. Accessibility, announcements, and localization

**Decision**: One polite `role="status"` live region inside the weather card. Announce: initial
loading, outdated, unavailable, invalid location, no location, recovery to ready, and every manual
refresh outcome. Do not announce a successful automatic periodic refresh that leaves the presentation
state unchanged; do not duplicate the same state message. Skeleton is `aria-busy="true"` with
`aria-hidden` skeleton visuals and one text status. All values carry localized meaning and units
(`Intl.NumberFormat` unit style via the existing formatter); precipitation probability is a labeled
percentage; 0 % and "unavailable" are distinct. Hourly entries are a semantic ordered list in
chronological order. Attribution ("Weather data by Open-Meteo.com", CC-BY 4.0 link) is localized,
non-intrusive, and keyboard reachable.

**Rationale**: FR-042/FR-057/SC-017 distinguish meaningful transitions from routine refreshes;
announcing every 10-minute poll would be noise. A single live region avoids duplicate announcements.
Attribution satisfies the provider's CC-BY 4.0 terms and FR-065.

**Alternatives considered**:
- *Announce every refresh*: violates SC-017.
- *Visual-only condition icons*: violates FR-052/SC-013.
- *Multiple live regions per widget section*: duplicate/noisy announcements.

## R14. Provider terms and deployment gate

**Decision**: Proceed with Open-Meteo's free API for development and non-commercial deployment;
display CC-BY 4.0 attribution; keep provider host configurable so a paid or self-hosted endpoint can
be substituted without code changes. Record in the ADR that commercial deployment requires a paid API
plan or self-hosting (free tier: 600 calls/min, 5,000/h, 10,000/day, non-commercial only).

**Rationale**: The product overview lists weather as an initial candidate and does not state a
commercial model; the spec excludes paid tiers from feature scope but requires honoring usage terms.
Configuration plus attribution satisfies the terms now and keeps the decision reversible later.

**Alternatives considered**:
- *Ignore commercial terms*: unacceptable legal/compliance risk.
- *Implement paid tiers now*: out of scope and requires product/billing decisions.
- *Hardcode the free host*: prevents migration; violates Principle XI.

## R15. Test strategy specifics

**Decision**:
- Backend integration tests boot the real Express app on an ephemeral port (no new test dependency)
  and inject a fake `fetchImpl`; assert status, envelope, CORS headers, no-store, validation, no
  provider text leakage, retry counts, cache hits, and rate-limit responses.
- Provider schema tests cover missing arrays, short arrays, nulls, wrong types, and out-of-range
  values.
- Retry tests assert exactly two total attempts, retry only on timeout/network/5xx/429, no retry on
  other 4xx, bounded backoff with jitter, and abort at `REQUEST_TIMEOUT_MS`.
- Frontend model tests pass an explicit timezone to day-slicing/freshness functions: UTC, a
  negative-offset zone, a positive-offset zone, a DST spring-forward date, and a fall-back date, plus
  the "location timezone differs from device timezone" case. A pure presentation-derivation test
  covers every state, ready variant, and the 6 h unavailable cutover before the component tests.
- Component tests cover all seven presentation states (including incomplete coverage), current-hour
  marking, elapsed-hour exclusion, precipitation 0 vs unavailable, retry/refresh, announcements
  (asserting silence for an unchanged automatic refresh), keyboard access, responsive widths, and axe.
- Storage tests cover valid restore, corrupt payload, wrong version, date mismatch, place mismatch,
  future `fetchedAt`, and over-age retention.

**Rationale**: Principle VII requires testing observable behavior, controlled time, and mocked
networks; explicit timezone injection makes DST/timezone claims testable without changing process
state.

**Alternatives considered**:
- *Supertest*: new dev dependency for a capability Node's `fetch` + ephemeral server already provides.
- *Mocking modules*: injected `fetchImpl` tests the real mapping and retry code.
