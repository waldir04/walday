# Implementation Plan: Weather Integration

**Branch**: `007-weather-integration` | **Date**: 2026-11-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-weather-integration/spec.md`

## Summary

Supply the weather information that spec 005 already presents on Home: current conditions, the
remaining hours of the user's device-local day, freshness, location/unit behavior, and every
degraded state, without ever affecting tasks, commitments, or the agenda.

The work introduces the repository's **first backend application** (`backend/`). Constitution
Principle XIX forbids the frontend from calling Open-Meteo directly, and spec 003 explicitly
assigned the location-search endpoint to this feature. The backend is a stateless Express 5 service
that proxies two GET endpoints with native `fetch`, Zod-validated provider payloads, bounded
timeouts/retries, a TTL cache, and rate limiting: `GET /api/weather/locations` (the contract already
consumed by spec 003) and `GET /api/weather` (current conditions plus an hourly series). No database
is involved; Prisma/PostgreSQL remain unused until a feature needs persistence.

The frontend gains an `entities/weather` domain/storage slice and a `features/weather` slice. The
slice owns a TanStack Query hook (the only server-state mechanism), canonical metric-to-display unit
handling, device-timezone day slicing, freshness/outdated derivation, and a bounded last-known-good
snapshot retained in versioned guest storage. `widgets/WeatherCard` remains presentational and is
extended with current-vs-forecast structure, hourly entries, invalid-location and incomplete-coverage
states, retry/refresh actions, attribution, and a single live region.

All five 2026-11-16 clarifications are treated as decided inputs. No `NEEDS CLARIFICATION` remains.

## Technical Context

**Language/Version**: TypeScript 5.9 strict (`strict`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax`, `erasableSyntaxOnly`) on both apps; React 19.3; Node.js 24 LTS pinned
(`.nvmrc`, `engines`), which is also the backend runtime.

**Primary Dependencies**: Backend: Express 5 (approved backend framework), Zod 4 (approved
validation library). Frontend: existing React 19, TanStack Query 5, Zod 4, i18next 26 /
react-i18next 17, Tailwind CSS 4, `lucide-react`, `@fontsource-variable/inter`. **No new frontend
runtime dependency.** No provider SDK, no HTTP client library, no caching/rate-limit package, no
CORS package, no logger package, no `dotenv` (Node's `--env-file`).

**Storage**: Backend is stateless: in-process bounded TTL caches only. No Prisma, no PostgreSQL, no
user data persistence. Frontend keeps one versioned guest snapshot under `walday:weather` (version
1) so last-known-good weather survives a reload; it is validated on read, bounded to the current
device-local date and the retention limit, and is never a second source of truth. A version bump is
not expected; an unknown version is discarded as unusable rather than migrated.

**Testing**: Backend: Vitest 5 route-integration tests that exercise the real Express app with
provider `fetch` mocked, plus provider-schema, mapping, retry, cache, rate-limit, config, and error
envelope tests. Frontend: Vitest 5 + React Testing Library 16 + jest-dom + axe-core, covering API
schema validation, condition mapping, device-timezone day slicing (including DST and cross-timezone
cases), freshness/retention, snapshot storage validation, query behavior (no request without a
location), every presentation state, announcements, keyboard/a11y, responsive behavior, and EN/ES
parity.

**Target Platform**: Backend: Node.js 24 LTS on any container/VM. Frontend: responsive SPA at 360,
768, 1024, and 1440 px and 200% zoom (`en`, `es`; dark theme only).

**Project Type**: Two independently deployable applications in one repository: an existing React SPA
(`frontend/`) and a new stateless JSON API (`backend/`).

**Performance Goals**: Current conditions visible within 3 s on typical broadband once data exists
(SC-009); a warm server cache answers in <50 ms; one provider call per uncached
`(coordinates, canonical units, forecast window)` per TTL; at most one in-flight weather request per
`(place, device-local date)` from a client; no request waterfalls; response payload <20 KB.

**Constraints**: WCAG 2.2 AA; no weather request without a selected location; no provider failure may
block Home; missing values never fabricated; outdated data never presented as current; device
timezone defines the day/hour labels; provider free-tier limits (600/min, 5,000/h, 10,000/day) and
CC-BY 4.0 attribution; coordinates and query text never logged; no client-side provider access;
English and Spanish copy; provider terms may require a paid plan or self-hosting for commercial
deployment.

**Scale/Scope**: One selected location per guest, one device-local day, up to 48 provider hours
filtered to the remaining day, two GET endpoints, seven presentation states (incomplete coverage is
one of the seven), one Home surface. Backend scale is read-only and horizontally replicable with
per-instance caches; no distributed cache or queue is introduced.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence / Plan |
|---|---|---|
| I. Clean code, SOLID, simplicity | PASS | Two small slices plus one small backend app; route → controller → service → provider client split; pure mapping/freshness/day-slicing functions; one snapshot repository; no speculative abstraction (no generic provider framework, no repository for a nonexistent DB). |
| II. Strict TypeScript and type safety | PASS | Same strict flags both apps; literal unions for conditions, states, and error codes; `z.infer` contract types; provider payloads, backend responses, environment, and storage all validated with Zod; no `any`, no assertions at boundaries. |
| III. Feature-Sliced Design | PASS | `entities/weather` holds domain types, API schema, and snapshot storage; `features/weather` holds query/state/business rules; `widgets` stay presentational; `HomePage` composes. No same-layer imports; `shared` receives only configuration constants and presentation-neutral formatting helpers. |
| IV. Backend architecture | PASS | New `backend/` uses routes/controllers → services → provider clients, a single error middleware with stable codes, Zod validation on every endpoint, typed fail-fast config, explicit CORS allowlist, request size limit, and rate limiting. Services never touch Express request/response objects. No repositories because there is no persistence in this feature. |
| V. React component design | PASS | `WeatherCard` and a new forecast-list component are presentational with explicit discriminated-union props; fetching, freshness, and announcements live in the feature hook; no prop drilling beyond `HomePage` → `HomeDashboard` → weather components. |
| VI. Styling, design tokens, visual consistency | PASS | Walday Dark UI tokens only (`canvas`, `surface`, `border`, `text`, `text-muted`, `primary`, `warm`, `cool`, `warning`, `danger`, `focus`); 16 px cards, 8 px controls, `tabular-nums` for temperatures/hours/percentages, skeleton matching final layout, reduced-motion support, 360/768/1024/1440 verification. |
| VII. Testing strategy and QA | PASS | Backend route integration with mocked network, provider schema/error mapping, retry backoff, cache TTL/negative cache, rate limiting; frontend model tests for timezone/DST/freshness, storage validation, every state, announcements, a11y, responsive, i18n parity. Time and timers controlled; no real network in unit tests. |
| VIII. Performance and resource efficiency | PASS | TanStack Query with deliberate `staleTime`/cadence, deduplicated requests, server TTL cache with bounded size, no new frontend dependency, tiny payload, no render loops (freshness flips on the existing minute clock); route-level loading unchanged. |
| IX. Scalability, resilience, fault isolation | PASS | Weather is isolated: its hook and surface degrade independently; provider failures map to stable codes; last-known-good is shown as outdated; bounded retries with backoff and jitter; explicit timeouts; no core dependency on weather; no premature distributed infrastructure. |
| X. API contracts and independent deployment | PASS | Zod schemas are the contract source of truth; documented request/response for both endpoints; single error envelope `{error:{code,message,details?}}`; stable codes; correct statuses; no provider internals or stack traces; explicit CORS; `no-store` weather responses; apps deploy independently. |
| XI. Constants and configuration | PASS | Freshness window, retention, cadence, timeouts, TTLs, rate limits, bounds, provider URLs, and cache sizes are named constants/env variables validated by Zod at startup; frontend config centralized in `shared/config/weather.ts` and `shared/config/env.ts`; `.env.example` in both apps. |
| XII. Security and data protection | PASS | GET-only public endpoints with no auth or user identifiers; provider responses treated as untrusted and validated; coordinates/query text never logged; no secrets near the client; body limit and rate limits; `Cache-Control: no-store`; CORS allowlist; no HTML injection surface. |
| XIII. Accessibility and inclusive design | PASS | Text-only conditions/states; labeled percentages and units; chronological reading order; `aria-busy` skeleton hidden from AT; one polite live region for meaningful transitions and manual refresh; keyboard-operable retry/refresh; reduced motion; 200% zoom; contrast via tokens. |
| XIV. Internationalization and localization | PASS | New keys in the existing `home` namespace for `en`/`es`; condition text, states, units, attribution, and announcements localized; `Intl` for hour, time, and number formatting; units independent of language; provider condition codes mapped to localized text, never raw. |
| XV. Documentation and technical communication | PASS | ADR for backend bootstrap/proxy decisions, provider attribution/terms, last-known-good storage, and in-process cache/rate-limit limits; API contracts and quickstart updated; spec 003's location contract referenced, not duplicated. |
| XVI. Automated quality gates and git hooks | PASS | `backend/package.json` exposes `lint`, `typecheck`, `test`, `build`; root scripts run both apps; hooks keep their existing fast pre-commit / full pre-push split; CI runs the same commands. |
| XVII. Frontend server state and async UX | PASS | Weather is server state and uses one `useQuery` through a key factory; no `useEffect` fetching, no manual component `fetch`, no parallel store. localStorage holds only a validated last-known-good cache behind `entities/weather` storage, justified by FR-040/FR-044 and Principle XIX, and never overrides fresh data. Skeleton, empty (no location), error/retry, and success states are all defined. |
| XVIII. Data integrity and persistence with Prisma | PASS (N/A for DB) | No database is touched; the only persisted client structure is versioned, Zod-validated on read, bounds-checked, and atomically written as one envelope; unreadable data is discarded without affecting Home. |
| XIX. External integrations and weather resilience | PASS | Open-Meteo via native `fetch` from the backend only; Zod-validated provider DTOs mapped to internal models; 4 s `AbortController` timeout; one bounded GET retry with backoff+jitter; TTL cache keyed by location, canonical units, and forecast window; last-known-good client fallback labeled outdated; stable `WEATHER_*`/`LOCATION_*` codes; no precise coordinates in logs; CC-BY 4.0 attribution shown; weather never blocks core features. |
| XX. Technology stack governance and dependency discipline | PASS | Uses only approved technologies (Express, Zod, Node, Vitest). Runtime dependencies added: `express` and `zod` for the new backend (both in the closed stack table). Everything else is platform API or existing. Dev-only tooling (TypeScript, Vitest, ESLint, Prettier) is documented; lockfile committed; Node pinned. |
| Visual Identity and Design System (Walday Dark UI) | PASS | Calm dark card with subtle border, no pure black, Inter, `tabular-nums` for every numeric weather value, 16 px radius, 8 px actions, token-only colors, text accompanying every condition, visible `focus-visible`, 12–16 px row gaps, no layout-shifting state changes. |

**Scope-sensitive notes**

- **Backend bootstrap is required, not optional**: Principle XIX and spec 003 §2 assign both the
  location endpoint and weather retrieval to the backend. The plan creates the smallest compliant
  backend (no DB) rather than violating the "frontend never calls the provider" rule.
- **Canonical metric retrieval**: the backend always requests Celsius, km/h, and mm, and display
  conversion stays in the existing preference formatter. This is why units are not a retrieval
  variant; the server cache key still names the canonical `metric` units explicitly per Principle
  XIX, while FR-029 is satisfied without a new request on unit change.
- **`stale` vs `outdated`**: Principle XIX and spec 005 use `stale`; this specification's user-facing
  term is `outdated`. The internal backend code keeps `WEATHER_UNAVAILABLE` and does not emit a
  stale code because freshness is derived on the client from `observedAt`/`retrievedAt`.
- **Provider terms**: the free Open-Meteo tier is non-commercial (600/min, 5,000/h, 10,000/day,
  CC-BY 4.0). Attribution is user-visible; commercial deployment requires a subscription or
  self-hosting and is recorded as a deployment gate, not silently assumed.
- **No paid tier integration, no billing, and no per-user accounts** are added; commercial
  deployment terms remain a recorded deployment gate.

**Post-design re-check**: PASS. Phase 1 adds no database, no new frontend runtime dependency, no
provider SDK, and no cross-slice import. The only persistence added is a bounded, validated client
snapshot cache; the only infrastructure added is the mandated stateless proxy.

## Project Structure

### Documentation (this feature)

```text
specs/007-weather-integration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── weather-api.md
│   ├── weather-snapshot-storage.md
│   └── ui-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created by /speckit.tasks
```

### Source Code (repository root)

```text
backend/                                  # NEW: first backend application
├── package.json                          # lint/typecheck/test/build scripts
├── tsconfig.json                         # strict app config
├── tsconfig.build.json
├── eslint.config.js
├── .env.example                          # every documented variable
├── src/
│   ├── server.ts                         # load config, listen, graceful shutdown
│   ├── app.ts                            # createApp(config): middleware + routes
│   ├── config/
│   │   └── env.ts                        # Zod-validated typed configuration
│   ├── domain/
│   │   ├── weather.ts                    # WeatherSnapshot, CurrentConditions, HourlyEntry
│   │   ├── condition.ts                  # WMO code -> condition + plausibility bounds
│   │   └── errors.ts                     # stable codes, AppError
│   ├── providers/
│   │   ├── openMeteoForecast.ts          # URL build, fetch, Zod parse, retry/timeout
│   │   ├── openMeteoGeocoding.ts
│   │   └── schemas.ts                    # provider DTO schemas (untrusted input)
│   ├── services/
│   │   ├── weatherService.ts             # cache + map to internal snapshot
│   │   └── locationService.ts            # cache + map + dedupe candidates
│   ├── routes/
│   │   ├── weatherRoutes.ts              # GET /api/weather
│   │   └── locationRoutes.ts             # GET /api/weather/locations
│   ├── controllers/
│   │   ├── weatherController.ts
│   │   └── locationController.ts
│   ├── middleware/
│   │   ├── errorHandler.ts               # single envelope, status mapping
│   │   ├── notFound.ts
│   │   ├── cors.ts                       # explicit allowlist
│   │   ├── rateLimit.ts                  # bounded in-memory fixed window
│   │   └── requestLogger.ts              # method/path/status only
│   └── lib/
│       ├── cache.ts                      # bounded TTL cache
│       ├── retry.ts                      # bounded GET retry + backoff + jitter
│       └── time.ts
└── tests/
    ├── weather-route.test.ts
    ├── weather-hourly-route.test.ts
    ├── weather-errors.test.ts
    ├── security.test.ts
    ├── location-route.test.ts
    ├── provider-schema.test.ts
    ├── condition-mapping.test.ts
    ├── cache.test.ts
    ├── retry.test.ts
    ├── rate-limit.test.ts
    ├── config.test.ts
    └── helpers/request.ts                # real app on an ephemeral port

frontend/src/
├── app/
│   ├── queryKeys.ts                      # + weather snapshot key
│   └── providers.tsx                     # unchanged
├── entities/
│   └── weather/                          # NEW entity slice
│       ├── index.ts
│       └── model/
│           ├── types.ts                  # Conditions, HourlyEntry, WeatherSnapshot
│           ├── constants.ts              # storage key/version, plausibility bounds
│           ├── schema.ts                 # API response + stored snapshot Zod schemas
│           ├── storage.ts                # versioned, validated last-known-good repository
│           └── format.ts                 # celsius -> WeatherMeasurement adapters
├── features/
│   └── weather/                          # NEW feature slice
│       ├── index.ts                      # public widget-facing exports
│       ├── model/
│       │   ├── api.ts                    # HTTP adapter, timeout, code mapping
│       │   ├── condition.ts              # presentation condition union + mapping
│       │   ├── deviceDay.ts              # device-timezone hour slicing, DST-safe
│       │   ├── freshness.ts              # current/outdated + observation age
│       │   ├── retention.ts              # usable snapshot predicate
│       │   ├── presentation.ts           # WeatherCardState derivation
│       │   ├── useWeather.ts             # TanStack Query + persistence + announcements
│       │   └── useWeatherAnnouncements.ts
│       └── ui/                           # (none; presentation stays in widgets)
├── widgets/
│   ├── HomeDashboard.tsx                 # passes the richer weather state/actions
│   ├── WeatherCard.tsx                   # states, current block, freshness, actions
│   └── WeatherForecastList.tsx           # chronological hourly entries
├── pages/
│   └── HomePage.tsx                      # consumes useWeather, wires announcements/retry
├── shared/
│   ├── config/
│   │   ├── weather.ts                    # freshness/retention/cadence/timeout/params
│   │   └── env.ts                        # unchanged base-URL validation
│   └── i18n/locales/{en,es}/home.json    # weather states, forecast, attribution, a11y

frontend/tests/                           # new weather suites alongside existing tests

docs/adr/
└── 0011-weather-backend-and-last-known-good.md   # NEW

package.json                              # root scripts also run backend
```

**Structure Decision**: Keep the existing FSD frontend and add a sibling `backend/` application, as
the constitution requires two deployable applications. Weather domain/storage lives in
`entities/weather`; server-state orchestration and business rules live in `features/weather`;
visual composition stays in `widgets`. The backend mirrors the constitution's backend structure
(routes, controllers, services, provider clients, middleware) without repositories because this
feature has no persistence.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| New `backend/` application in this feature | Principle XIX forbids frontend provider access; spec 003 assigns `/api/weather/locations` to this feature; weather cannot be delivered at all without a proxy | Direct provider `fetch` from the SPA violates a NON-NEGOTIABLE principle; shipping UI against a nonexistent contract would fail spec 003 and every weather success criterion |
| Client-side last-known-good snapshot store | FR-040/FR-044 and Principle XIX require showing acceptable last-known data labeled outdated, surviving reloads and offline starts | Memory-only cache loses continuity on reload/offline and cannot satisfy US3/US4; storing fresh data only would render the unavailable state where the spec requires outdated data |
| In-process TTL cache and rate limiter | Principle IX forbids premature distributed infrastructure; provider free tier has hard per-minute/hour/day limits; one instance is the current deployment shape | Redis/edge infra adds operational surface with no current need; no cache would multiply provider calls and risk exhaustion |
| Canonical metric retrieval (units not a provider variant) | FR-029 requires unit changes without a new retrieval; display conversion already exists in preferences | Requesting each unit system doubles provider traffic and contradicts FR-029's no-new-retrieval rule |
