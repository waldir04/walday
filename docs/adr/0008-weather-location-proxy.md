# ADR 0008: Weather Location Resolution Through a Backend Proxy

- **Status**: Accepted
- **Date**: 2026-11-12

## Context

Specification 003 lets a guest select a weather location. Constitution XIX requires all weather and
geocoding access to go through the backend, and the frontend must not call Open-Meteo or any other
provider directly. The backend weather proxy does not exist yet.

## Decision

- The frontend defines a `LocationResolver` port in `features/user-preferences` and validates every
  response with Zod at the boundary.
- Production uses an HTTP adapter targeting
  `GET {VITE_API_BASE_URL}/api/weather/locations?query=…&language=…&limit=…`, documented in
  [contracts/location-resolution.md](../../specs/003-user-preferences/contracts/location-resolution.md).
- When no base URL is configured, or the endpoint is unavailable, the adapter reports
  `LOCATION_SERVICE_UNAVAILABLE` without attempting a provider request. Search shows an accessible
  explanation and retry action; saved locations remain displayable and clearable offline.
- Tests inject a deterministic fake resolver. No test or frontend code calls a provider host.
- A selected candidate is validated and stored as a resolved `WeatherLocation`; free-text labels are
  never persisted. Coordinates are never rendered, logged, or sent anywhere except the backend proxy.

## Consequences

- Location search is partially delivered until the backend geocoding proxy is deployed
  (FR-039–FR-041 in production). All other preference behavior is independent of that deployment.
- The backend contract, error codes, rate limiting, caching, and attribution requirements are owned
  by the future weather feature.
