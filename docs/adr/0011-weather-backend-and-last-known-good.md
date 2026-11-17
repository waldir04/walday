# ADR 0011: Weather Backend Proxy and Last-Known-Good Snapshot

- **Status**: Accepted
- **Date**: 2026-11-16
- **Supersedes/extends**: ADR 0008 (weather location proxy)

## Context

Specification 007 delivers current conditions and an hourly forecast on Home. Constitution XIX
mandates that the frontend never calls Open-Meteo directly, that provider payloads are validated and
mapped to an internal model, that requests use bounded timeouts and GET-only retries, and that a
provider failure degrades the weather surface without affecting tasks, commitments, or the agenda.
Specification 003 had already transferred `GET /api/weather/locations` to this feature.

## Decision

### Stateless backend proxy

- Add `backend/`, the repository's first independent JSON API: Express 5, TypeScript strict, Zod 4,
  Node 24, native `fetch`. No provider SDK, HTTP client, CORS, cache, rate-limit, logger, or dotenv
  package is added.
- Expose two unauthenticated GET endpoints: `GET /api/weather` and
  `GET /api/weather/locations`. Routes validate strict Zod query schemas; controllers only map input
  to a service result; services hold business rules and never touch Express request/response objects;
  provider clients own URL building, timeout, retry, Zod parsing, and mapping.
- One error middleware emits `{ error: { code, message, details? } }` with stable codes:
  `WEATHER_UNAVAILABLE`, `WEATHER_LOCATION_INVALID`, `WEATHER_RATE_LIMITED`,
  `LOCATION_QUERY_INVALID`, `LOCATION_RATE_LIMITED`, `LOCATION_SERVICE_UNAVAILABLE`, `NOT_FOUND`,
  `INTERNAL_ERROR`. Provider text, hosts, stack traces, and coordinates never appear in responses or
  logs.
- The frontend never calls a provider host; it calls the backend with `VITE_API_BASE_URL`.

### Canonical metric retrieval

- The backend always requests Celsius, km/h, and mm. Display units are applied client-side by the
  existing preference formatter, so changing units never issues a new request (FR-029).
- The in-process cache key is `(latitude, longitude, 'metric', 2)`, TTL 10 minutes, negative TTL
  30 seconds. Location search uses `(normalized query, language, limit)`, TTL 10 minutes, negative
  TTL 30 seconds. Both caches are bounded to 1,000 entries with expired-first pruning.

### In-process limits and their consequences

- Timeout 4 seconds via `AbortController`; one retry only for GET on timeout, network error, 429, or
  5xx, with 250 ms base backoff plus up to 250 ms jitter (two total attempts).
- Fixed-window rate limiting: weather 60 requests/min/IP, locations 30 requests/min/IP, bounded
  10,000-key map with periodic pruning, `TRUST_PROXY` configurable.
- Cache and limiter state are per instance and reset on restart. Horizontal deployment multiplies
  capacity and provider calls per instance; a distributed cache or queue is deliberately not
  introduced while only one instance is required.

### Last-known-good client snapshot

- One guest-only envelope is stored at `walday:weather` version 1:
  `{ version, providerPlaceId, localDate, fetchedAt, snapshot }`. It contains the exact validated
  metric API payload, keyed by place id; no coordinates, converted values, language, units
  preference, or user identifier is stored.
- The record is validated with Zod on every read. Corrupt records, unknown versions, a different
  device-local date, a `fetchedAt` more than 60 seconds in the future, or a freshness reference older
  than 6 hours are deleted. A record for a different place is ignored but retained so a rapid switch
  back can reuse it.
- Writes are atomic single-envelope replacements, performed only after API schema validation and
  while the `(place, date)` context still matches. Storage failure is non-fatal: the in-memory result
  remains visible for the session. The guest-storage warning from spec 003 already covers this data;
  no weather-specific warning is added.

### Freshness authority

- The freshness and retention reference is `observedAt ?? retrievedAt`, never `fetchedAt` and never
  the client's fetch completion time. A backend cache hit preserves the original `retrievedAt`, so
  cached data cannot look newer than it is.
- Current means at most 30 minutes old (inclusive). Outdated data remains visible up to 6 hours with
  an explicit outdated label, last successful update time, and material observation age. Beyond
  6 hours the card switches to unavailable and shows no values. A hydrated snapshot is always
  presented as outdated until a successful fetch for the current query replaces it.
- Spec 005's `stale` presentation term maps to this feature's user-facing **outdated**. The JSON
  contract emits no `WEATHER_STALE` code because freshness is derived on the client; the backend
  only distinguishes unavailable service failures from successful empty coverage.

### Attribution and deployment gate

- Open-Meteo data and GeoNames-derived location data require CC-BY 4.0 attribution; the weather card
  renders a localized, keyboard-reachable "Weather data by Open-Meteo.com" link, and location
  attribution is documented in the feature contract and UI copy.
- Development and non-commercial use may rely on the free Open-Meteo tier (600/min, 5,000/h,
  10,000/day). Commercial deployment requires a paid API plan or self-hosting; provider base URLs
  are environment configuration so the endpoint can change without code changes. This is a recorded
  deployment gate, not an assumption.

## Consequences

- Weather remains optional context: no task, commitment, agenda, or preference action depends on it,
  and every failure produces a localized, text-explained state with an appropriate retry or Settings
  action.
- The backend is read-only and deployable independently from the SPA. Prisma/PostgreSQL remain unused
  until a feature needs persistence.
- Automated tests cover provider schema/mapping, retry, cache, rate limiting, config, both route
  contracts, security headers/log hygiene, frontend schema, device-day slicing including DST,
  freshness/retention, storage, refresh, announcements, every presentation state, a11y, i18n parity,
  and responsive behavior. Manual evidence is tracked in
  `specs/007-weather-integration/validation-notes.md`.
