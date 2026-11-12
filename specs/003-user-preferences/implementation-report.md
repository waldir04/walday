# Implementation Report: User Preferences and Localization

**Feature**: `003-user-preferences` | **Date**: 2026-11-12

This report records the validation evidence for the implemented feature and the remaining gaps
against [spec.md](./spec.md) §4, §4.12, and §8. It is not a substitute for the requirement text.

## Quality gates

Run from the repository root on 2026-11-12:

| Gate | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | Pass |
| Typecheck | `npm run typecheck` | Pass |
| Tests | `npm run test` | 58 files, 410 tests pass |
| Coverage | `npm run test:coverage` | Pass: 89.14% statements, 80.45% branches, 92.16% functions, 91.57% lines |
| Build | `npm run build` | Pass; preferences UI remains in the lazy `SettingsPage` chunk |

Coverage thresholds in `frontend/vite.config.ts` were not changed and no new exclusion was added.
Preference entity tests exercise resolution, formatting, units, storage, migration, conflicts, and
non-mutation; feature tests exercise the store, draft, UI, localization, recovery, location, a11y,
responsiveness, and the consumer contract.

## Requirement status

- §4.1–§4.7: implemented and verified by the preference model, UI, draft, localization, location,
  and non-mutation suites.
- §4.8 and §4.12 (VR-010–VR-012): versioned envelope, field-level recovery, v0 migration,
  unsupported-version preservation, explicit replacement confirmation, revision compare-and-swap,
  Web Locks with fallback, session-only feedback, and cross-tab conflict handling are implemented
  and tested.
- §4.9: axe, keyboard, fieldset/legend, error association, focus, live regions, dialog focus, and
  responsive/reduced-motion checks pass. Manual VoiceOver with Safari is not performed in this
  environment (see gaps).
- §4.10: English/Spanish parity, English fallback, interpolation, document language/title, and
  runtime switching are verified.
- §4.11: only portable local semantics and explicit versioning exist; no account migration,
  synchronization, or server preference storage is implemented.
- §8: items 1, 2, 4–8, 10, and 11 are satisfied by the gates, tests, and artifact reconciliation.
  Item 3 remains partially open because the manual VoiceOver pass was not executed here. Item 9 is
  satisfied for every preference except new location resolution, which correctly degrades while
  the external proxy is undeployed.

## Remaining gaps

1. **Manual VoiceOver with Safari (T061, §8 item 3)** — not executed in this headless development
   environment. Automated axe and keyboard coverage pass, but the manual screen-reader pass for the
   critical preference journeys remains required before production sign-off.
2. **Backend geocoding proxy (T067, FR-039–FR-041)** — the repository contains no backend endpoint;
   only the frontend port and HTTP adapter exist. Production location search therefore reports
   `LOCATION_SERVICE_UNAVAILABLE`. Search, disambiguation, selection, label stability, and failure
   behavior are verified with the injected fake resolver. Confirm the deployed proxy before signing
   off FR-039–FR-041 in production.
3. **Weather display surface** — no weather feature exists yet. Unit conversion, precision, missing
   measurement (`null`), and localized unavailable text are verified at the entity boundary and with
   a test consumer; FR-034 will be exercised when the weather surface consumes the helper.
4. **Device timezone changes** — the consumer refreshes the device timezone on window focus and
   `visibilitychange`. Browsers expose no direct timezone-change event, so a display refresh occurs
   on the next focus/visibility change rather than synchronously at the moment the OS timezone
   changes. Stored values are never altered.

## Artifact reconciliation

- ADR 0004 is superseded by [ADR 0007](../../docs/adr/0007-browser-language-resolution.md).
- The backend geocoding dependency and fallback are recorded in
  [ADR 0008](../../docs/adr/0008-weather-location-proxy.md).
- [quickstart.md](./quickstart.md) §8 records environment-specific validation details.
- `frontend/README.md` documents the preference surface, storage key/version, language resolution,
  consumer contract, and location dependency.
