# Contract: Weather API

**Owner**: `backend/` (this feature) | **Consumer**: `features/weather` (frontend)

Two public, unauthenticated, read-only GET endpoints. Both use the single error envelope from
Principle X. Provider DTOs and provider hosts never appear in responses.

---

## 1. `GET /api/weather`

Returns current conditions and an hourly series for a coordinate pair. The backend always requests
canonical metric units; display units are applied by the client.

### Request

```http
GET /api/weather?latitude={number}&longitude={number}
Accept: application/json
```

| Parameter | Required | Rules |
|---|---|---|
| `latitude` | yes | finite number, −90…90, decimal degrees |
| `longitude` | yes | finite number, −180…180, decimal degrees |

No other parameters are accepted or needed: the client's device-local day, units, and language are
not retrieval inputs. There is no authentication and no user identifier.

### Success response

```http
200 OK
Content-Type: application/json
Cache-Control: no-store
```

```json
{
  "units": "metric",
  "retrievedAt": "2026-11-16T05:18:07.120Z",
  "observedAt": "2026-11-16T05:00:00.000Z",
  "current": {
    "temperatureCelsius": 12.4,
    "apparentTemperatureCelsius": 11.8,
    "relativeHumidityPercent": 74,
    "windSpeedKilometersPerHour": 9.3,
    "precipitationMillimeters": 0,
    "condition": "partly-cloudy"
  },
  "hourly": [
    {
      "time": 1763269200,
      "temperatureCelsius": 12.4,
      "condition": "partly-cloudy",
      "precipitationProbability": 5
    },
    {
      "time": 1763272800,
      "temperatureCelsius": 13.1,
      "condition": "cloudy",
      "precipitationProbability": null
    }
  ]
}
```

Field rules:

- `units` is the literal `"metric"`.
- `retrievedAt` is the server's successful provider fetch completion time (ISO 8601, UTC). It is the
  displayed "last updated" value and the freshness fallback when `observedAt` is absent; a backend
  cache hit preserves the original value instead of refreshing it. The client's freshness and
  retention reference is `observedAt ?? retrievedAt`; the stored envelope's `fetchedAt` is only a
  client clock-sanity value.
- `observedAt` is the provider's current-conditions time when finite and not more than 5 minutes in the
  future; otherwise `null`. An older finite observation is retained so the client can label the data
  outdated, and the client withholds it once it exceeds the 6 h maximum staleness (FR-034/FR-044).
- `current` is `null` when no usable current block exists. Every measurement inside it may be `null`;
  `condition` is always present and is one of `clear`, `partly-cloudy`, `cloudy`, `rain`, `snow`,
  `storm`, `fog`, `unknown`. A `null` current temperature is rendered as unavailable, never as `0`.
- `hourly` is chronological, de-duplicated by `time`, may be empty, and may omit hours the provider
  did not return. It is capped at 48 entries (the provider schema tolerates up to 96).
  `precipitationProbability` is an integer 0…100 when present; `0` is a real value, `null` means
  unavailable.
- Out-of-range or malformed individual values are `null`, never `0` or a substitute.
- A null/empty payload is a genuine result, not an error: it means the place is valid but coverage is
  unavailable. A provider response that reports no coverage for otherwise valid coordinates MUST map
  to this empty result or to `503 WEATHER_UNAVAILABLE`, never to `400 WEATHER_LOCATION_INVALID`
  (FR-027).
- Response is not cached by shared caches (`no-store`); the backend keeps its own short TTL cache.

### Error responses

```json
{
  "error": {
    "code": "WEATHER_UNAVAILABLE",
    "message": "Weather is temporarily unavailable.",
    "details": null
  }
}
```

| HTTP | Code | When | Frontend presentation |
|---|---|---|---|
| 400 | `WEATHER_LOCATION_INVALID` | local request validation fails: missing, malformed, non-finite, or out-of-range coordinates | invalid-location with Settings action |
| 429 | `WEATHER_RATE_LIMITED` | client exceeded the per-minute limit | unavailable with retry |
| 503 | `WEATHER_UNAVAILABLE` | provider unreachable, timeout, 5xx, malformed provider payload, negative cache | unavailable with retry |
| 404 | `NOT_FOUND` | unknown route | client bug; unavailable |

Rules:
- `message` is a stable developer-facing English sentence; the frontend renders localized copy keyed
  by `code`. Raw provider errors, hosts, upstream bodies, stack traces, and coordinates are never
  returned.
- `details` is absent or `null` for these codes.
- Unexpected failures return 500 `INTERNAL_ERROR` with no internals.
- CORS: only configured origins receive `Access-Control-Allow-Origin`; no wildcard with credentials.
- Every response includes `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.

### Upstream call (internal, not part of the public contract)

```text
GET {OPEN_METEO_FORECAST_BASE_URL}
  ?latitude=…
  &longitude=…
  &current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code
  &hourly=temperature_2m,weather_code,precipitation_probability
  &timeformat=unixtime
  &timezone=UTC
  &forecast_days=2
  &temperature_unit=celsius
  &wind_speed_unit=kmh
  &precipitation_unit=mm
```

Timeout 4 s; at most one retry for GET on timeout/network/5xx/429 with backoff and jitter. Provider
response validated with Zod before mapping. Cache key: `(latitude, longitude, 'metric', 2)`; TTL
10 min, negative TTL 30 s. Coordinates are not logged.

---

## 2. `GET /api/weather/locations`

Contract originally owned by spec 003
([location-resolution.md](../../003-user-preferences/contracts/location-resolution.md) §2) and
implemented here unchanged. Summary:

```http
GET /api/weather/locations?query={query}&language={en|es}&limit={1..10}
```

- 200: `{ "results": [{ "providerPlaceId", "name", "region", "countryCode", "latitude", "longitude" }] }`
  with duplicates by `providerPlaceId` removed; `results` may be empty, never `null`.
- 400 `LOCATION_QUERY_INVALID`; 429 `LOCATION_RATE_LIMITED`; 503 `LOCATION_SERVICE_UNAVAILABLE`.
- Upstream: `GET {OPEN_METEO_GEOCODING_BASE_URL}?name&count&language&format=json`.
- Cache TTL 10 min; rate limit 30 req/min per client IP; `Cache-Control: no-store`; provider
  attribution applies to location data (GeoNames) and is documented in the ADR and UI.

---

## 3. Stability rules

- Field names and condition literals are the internal contract; renaming requires updating both apps
  and this document.
- Adding optional fields is allowed; removing or retyping a field is a breaking change.
- Clients must ignore unknown fields, but are not expected to receive them today.
- Contract tests exist on both sides: backend route tests assert the shape; frontend schema tests
  reject malformed payloads.
