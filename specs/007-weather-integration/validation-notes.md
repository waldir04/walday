# Validation Notes: Weather Integration

**Feature**: `007-weather-integration` | **Date**: 2026-11-16

Automated evidence is recorded here; manual evidence required by tasks T096/T097 is tracked
separately below. Do not treat a pending manual item as passed.

## Automated evidence

| Gate | Command | Result | Date |
|---|---|---|---|
| Backend tests | `npm --prefix backend run test` | 66 passed (11 files) | 2026-11-16 |
| Frontend tests | `npm --prefix frontend run test` | 708 passed (107 files) | 2026-11-16 |
| Backend lint | `npm --prefix backend run lint` | pass | 2026-11-16 |
| Frontend lint | `npm --prefix frontend run lint` | pass | 2026-11-16 |
| Backend typecheck | `npm --prefix backend run typecheck` | pass | 2026-11-16 |
| Frontend typecheck | `npm --prefix frontend run typecheck` | pass | 2026-11-16 |
| Backend build | `npm --prefix backend run build` | pass | 2026-11-16 |
| Frontend build | `npm --prefix frontend run build` | pass | 2026-11-16 |
| Formatting | `npm run format:check` | pass | 2026-11-16 |

Coverage (`npm run test:coverage`): frontend 90.57% statements / 82.86% branches / 94.42% functions
/ 92.82% lines, with the `entities/` and `features/` thresholds satisfied; backend 88.66% statements /
81.31% branches / 90.1% functions / 90.86% lines. HTML reports are written to `frontend/coverage/` and
`backend/coverage/`.

### Scenario → suite mapping

| Scenario | Automated suites |
|---|---|
| V1 current conditions/units | `frontend/tests/weather-current.test.tsx`, `backend/tests/weather-route.test.ts` |
| V2 remaining-day forecast | `frontend/tests/weather-device-day.test.ts`, `weather-forecast.test.tsx`, `backend/tests/weather-hourly-route.test.ts` |
| V3 outdated/refresh/recovery | `frontend/tests/weather-freshness.test.ts`, `weather-retention.test.ts`, `weather-refresh.test.tsx`, `weather-announcements.test.tsx` |
| V4 degraded states | `frontend/tests/weather-states.test.tsx`, `weather-presentation.test.ts`, `backend/tests/weather-errors.test.ts` |
| V5 midnight/date change | `frontend/tests/weather-refresh.test.tsx` (date-change case), storage date rule |
| V6 provider defects/bounds | `backend/tests/condition-mapping.test.ts`, `provider-schema.test.ts`, `weather-errors.test.ts` |
| V7 accessibility/responsive | `frontend/tests/weather-a11y.test.tsx`, `weather-responsive.test.tsx`, `weather-card.test.tsx` |
| V8 storage/privacy | `frontend/tests/weather-storage.test.ts`, `backend/tests/security.test.ts` |

## Manual evidence required (T097)

These outcomes cannot be produced by the automated jsdom/node suites and have **not** been executed
in this implementation run:

- SC-009: measured Home-open-to-current-conditions time on typical broadband (target ≥95% within 3 s).
- SC-010: manual retry/recovery success rate without reload (target ≥95%).
- SC-012: five-participant comprehension check of all weather states and units.
- SC-013: manual screen-reader pass over the seven presentation states and an hourly entry.
- FR-059: contrast measurement in every presentation state using a contrast checker.
- V7 keyboard-only traversal at 360, 768, 1024, 1440 px and 200% zoom in a real browser.

Record each result, browser/screen-reader version, and date below when performed.
