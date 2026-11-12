# Contract: Location Resolution

**Owner (frontend port)**: `features/user-preferences` | **Owner (server endpoint)**: future backend weather feature | **Status**: Frontend port implemented by this feature; server endpoint is an external dependency, not implemented here

This contract defines how a user's place search becomes a validated `WeatherLocation`. It exists because the specification requires search and disambiguation (FR-039–FR-041) while Principle XIX prohibits the frontend from calling Open-Meteo or any weather provider directly. The frontend consumes this capability through a port; the backend owns the provider call.

## 1. Frontend port

`SupportedLanguage` is imported from `shared/config/i18n.ts`, the canonical i18n configuration owned by `shared`; `entities/preferences` re-exports it for domain consumers. `LocationCandidate` is a transient port type owned by `features/user-preferences` and is never persisted. The saved result is the entity `WeatherLocation` ([data-model.md](../data-model.md) §2.2).

```ts
import type { SupportedLanguage } from '@/shared/config/i18n'

interface LocationCandidate {
  providerPlaceId: string // 1–128 trimmed characters
  name: string // 1–120 grapheme clusters
  region?: string // 1–120 grapheme clusters when present
  countryCode: string // ISO 3166-1 alpha-2, uppercase
  latitude: number // finite, -90..90
  longitude: number // finite, -180..180
}

type LocationResolutionResult =
  | { ok: true; candidates: LocationCandidate[] }
  | { ok: false; code: 'LOCATION_QUERY_INVALID' | 'LOCATION_SERVICE_UNAVAILABLE' | 'LOCATION_TIMEOUT' | 'LOCATION_RATE_LIMITED' }

interface LocationResolver {
  resolve(
    query: string,
    options: { language: SupportedLanguage; signal?: AbortSignal },
  ): Promise<LocationResolutionResult>
}
```

Rules:

1. The resolver is injected into the feature store/UI. Production selects the HTTP adapter; tests inject a deterministic fake.
2. The query is trimmed and validated before the call: 1–80 grapheme clusters. An invalid query returns `LOCATION_QUERY_INVALID` without a request.
3. The request is aborted after a configurable timeout (default 5 seconds) using `AbortController`; the timeout maps to `LOCATION_TIMEOUT`.
4. Responses are validated with Zod at the boundary. A malformed payload maps to `LOCATION_SERVICE_UNAVAILABLE`; raw provider or server errors never reach the UI.
5. The resolver performs no automatic retries; a retry is an explicit user action. Network failures during an outage must not affect other preferences.
6. The resolver never receives or returns a saved location's coordinates for validation of an unchanged location; saving an unchanged, already-resolved location is local and offline (FR-057).
7. The frontend never imports a provider SDK and never calls a provider host. Only the backend base URL is used.
8. A `null`/empty candidate list is a successful empty result; the UI shows a localized "no places found" message and preserves the query.
9. The UI never auto-selects the first candidate. The user selects a candidate explicitly.

## 2. Backend endpoint contract (dependency)

This endpoint is owned by the future weather feature. It is documented here because the preference feature consumes it and the contract must not drift.

### Request

```http
GET /api/weather/locations?query={query}&language={en|es}&limit={1..10}
```

| Parameter | Required | Rules |
| --- | --- | --- |
| `query` | Yes | 1–80 grapheme clusters after trimming; URL-encoded; no control characters. |
| `language` | Yes | `en` or `es`; used for provider result naming where supported. |
| `limit` | No | Integer `1..10`; default `5`. |

Authentication: none for guest access. The endpoint returns only public place data and no user-specific data.

### Success response

```http
200 OK
Content-Type: application/json
Cache-Control: no-store
```

```json
{
  "results": [
    {
      "providerPlaceId": "3117735",
      "name": "Madrid",
      "region": "Community of Madrid",
      "countryCode": "ES",
      "latitude": 40.4165,
      "longitude": -3.7026
    }
  ]
}
```

- `results` may be empty. It is never `null`.
- Field rules match the frontend `LocationCandidate` contract: `providerPlaceId` is 1–128 trimmed characters, `name`/`region` are 1–120 grapheme clusters, `countryCode` is uppercase ISO 3166-1 alpha-2, and coordinates are finite and in range.
- The backend validates the provider response with Zod and maps it to this internal contract. Provider DTOs are not exposed.
- Duplicate `providerPlaceId` values are removed before responding.

### Error response

The single error envelope from Principle X:

```json
{
  "error": {
    "code": "LOCATION_SERVICE_UNAVAILABLE",
    "message": "Location search is temporarily unavailable.",
    "details": null
  }
}
```

| HTTP status | Code | When |
| --- | --- | --- |
| `400` | `LOCATION_QUERY_INVALID` | Missing, malformed, or out-of-range `query`/`language`/`limit`. |
| `429` | `LOCATION_RATE_LIMITED` | Rate limit exceeded for the client. |
| `503` | `LOCATION_SERVICE_UNAVAILABLE` | Provider unreachable, timeout, malformed provider payload, or negative-cache window. |

Requirements:

- Messages are stable machine-readable codes; the frontend translates them. No raw provider error, stack trace, host, or upstream body is returned.
- The provider request uses a configurable timeout (about 3–5 seconds), bounded retries with backoff and jitter for GET only, and a short negative cache. The frontend does not retry automatically.
- The backend rate-limits this endpoint (it is a privacy-sensitive lookup and a third-party dependency), whether at the edge or in middleware.
- Server-side caching is short-lived and keyed by normalized query + language. No per-user cache and no user identifiers are attached.
- Logs must not contain raw query text paired with user identifiers, precise coordinates, or upstream payloads. Counts and stable error codes are sufficient.
- Provider usage terms and attribution are honored. If the provider requires attribution, the backend and UI document it and the UI displays the localized attribution text near search.
- The endpoint must remain independent of tasks, agenda, and the dashboard: its failure must not affect those features (FR-050, Principle XIX).

## 3. Failure mapping

| Frontend outcome | User-facing behavior |
| --- | --- |
| `LOCATION_QUERY_INVALID` | Localized field error, no request, draft/query preserved. |
| Empty candidates | Localized "no places found" message, query preserved, other preferences usable. |
| `LOCATION_SERVICE_UNAVAILABLE` / `LOCATION_TIMEOUT` | Localized non-blocking explanation plus retry; saved location untouched; other preferences usable. |
| `LOCATION_RATE_LIMITED` | Localized retry-later message; no automatic polling. |
| Malformed/unexpected payload | Same as unavailable; never rendered raw. |
| No backend base URL configured | Frontend adapter reports unavailable without attempting a request. |

## 4. Persistence interaction

- A selected candidate becomes a `WeatherLocation` (see [data-model.md](../data-model.md) §2.2). Its label is composed once at selection time and stored verbatim.
- Clearing the location is local and requires no service call.
- Changing language, units, or presentation never triggers a lookup and never re-resolves a stored location.
- A failed lookup never stores a partial or unverified location (FR-047).
- Coordinates are used only for weather retrieval; they are never rendered or logged (FR-049, FR-082).

## 5. Contract tests

- Fake resolver: success with multiple same-name candidates, empty results, invalid query, unavailable, timeout, malformed payload.
- UI: explicit selection required, no auto-selection, query and draft preserved on failure, retry, clear action, unchanged saved location on language change, label stability after language switch.
- Adapter: request path/params, Zod validation, timeout abort, error-code mapping, no provider host usage, no automatic retry, no coordinate logging.
- Backend proxy (owned by the future weather feature): route validation, provider error mapping, rate limiting, negative cache, attribution, and no raw provider leakage.
