# Quickstart: User Preferences and Localization Validation

**Feature**: `003-user-preferences` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

This guide validates the feature end to end against the specification. It is a run and verification guide, not an implementation plan. Details live in [plan.md](./plan.md), [data-model.md](./data-model.md), [research.md](./research.md), and [contracts/](./contracts/).

## 1. Prerequisites

- Node.js 24 LTS (pinned in `.nvmrc`) and npm 11.
- A modern evergreen browser.
- No account, backend, database, or network connection is required for core preference management.
- Location **search** requires the future backend weather geocoding proxy. Until it is deployed, production search reports unavailable; search behavior is verified with the injected fake resolver in the test suite. See [contracts/location-resolution.md](./contracts/location-resolution.md).

## 2. Setup and run

From the repository root:

```bash
npm install
npm run dev
```

Open `http://localhost:5173/settings` (or the URL Vite prints). The route is lazy-loaded and must show a settings-specific skeleton before the form appears, not a generic spinner or "Loading…" text.

## 3. Quality gates

Run each command from the repository root:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

Expected:

- All commands pass from a clean install.
- Coverage meets the existing `frontend/vite.config.ts` thresholds: 80% global and the `src/entities/**` threshold (90% statements/functions/lines, 80% branches).
- No `any`, unjustified type assertion, suppressed error, or new runtime dependency.
- No new bundle-size warning attributable to this feature (preferences reuse existing i18n, Zod, and shared primitives).

Run a focused suite:

```bash
npm --prefix frontend run test -- tests/preferences-storage.test.ts
npm --prefix frontend run test -- tests/preferences-a11y.test.tsx
```

## 4. Core validation scenarios

Record pass/fail and the requirement or success criterion each scenario covers.

### 4.1 First use and defaults (US1, FR-051–FR-055, VR-008)

1. Clear site data for the origin. Open `/settings`.
2. Verify the form is usable immediately: no wizard, account prompt, or blocking setup.
3. Verify effective defaults: standard presentation, metric units, no location, and a language resolved from the browser (English when the browser offers neither `en` nor `es`).
4. Verify no `walday:preferences` key was created merely by viewing the page:

   ```js
   localStorage.getItem('walday:preferences') // null
   ```

5. Change nothing and save. Verify no misleading "changed" claim and no unnecessary write.
6. Time the first-use journey from opening `/settings` to a completed save. It must take under 2 minutes without assistance, account creation, or sign-in (SC-001).

### 4.2 Language resolution (US2, FR-007–FR-012, SC-002)

1. With no explicit language, set the browser's preferred languages to `fr-FR, es-MX, en-US`. Reload. Verify Spanish is used.
2. Set preferred languages to `fr-FR, de-DE`. Reload. Verify English is used.
3. Select Spanish explicitly, save, then change the browser languages to English-only and reload. Verify Spanish remains active and the surface no longer says the language follows the browser.
4. Select "Use browser language", save, and reload. Verify the explicit choice is gone (`language: null` in storage), the language follows the browser again, and later browser-language changes are honored on the next load.
5. Change units or presentation without touching language, save, and verify the stored `language` is still `null` (an implicit language is never converted to explicit).
6. Verify regional variants resolve by base subtag regardless of case: `ES-mx`, `en-GB`, and `es-419` map to Spanish/English as expected.
7. With English already effective, explicitly select English and save. Verify the stored `language` is `'en'` (explicit), not `null`.

### 4.3 Runtime language switching (US2, US6, FR-013–FR-019, FR-102)

1. On `/settings`, edit a field so a draft exists, then change the draft language and save.
2. Verify without a full reload:
   - all preference labels, options, help text, validation text, notices, and accessibility names switch language;
   - `<html lang>` matches the effective language;
   - the current route and draft context are preserved;
   - the success announcement is in the newly active language.
3. Temporarily remove one Spanish key in a test fixture and verify English fallback renders, with no raw key, blank label, or runtime error.
4. Verify language names are identifiable without reading the active language (each option is named in its own language).

### 4.4 Date and time presentation (FR-020–FR-028, SC-010)

1. Select each presentation (`compact`, `standard`, `full`) and save.
2. Verify dates and date-times use the effective formatting locale and the device timezone, and that the three options differ consistently.
3. Verify date-only values (task due dates) display no time and do not shift by one day when the timezone changes. Simulate timezones with the browser's DevTools sensors or a temporary `TZ`-controlled test.
4. Verify an invalid timezone or unformattable date falls back to a safe localized value; no `Invalid Date`, raw pattern, error string, or blank appears.
5. Verify changing the presentation does not change stored timestamps, due dates, or any other preference.

### 4.5 Weather units and precision (FR-029–FR-036, SC-011)

The weather surface does not exist yet, so verify the entity helpers through the test suite and any temporary development harness:

1. Metric: temperature in whole °C, wind in whole km/h, precipitation to one decimal in mm.
2. Imperial: temperature in whole °F, wind in whole mph, precipitation to two decimals in in.
3. Verify conversions are presentation-only and reversible from canonical metric values; stored values are unchanged.
4. Verify `formatMeasurement` returns `null` for a missing measurement and the consuming surface renders localized "unavailable" text, never `0` or a default.
5. Verify changing units never changes language, location, or presentation.

### 4.6 Weather location (US5, FR-037–FR-050)

1. With the fake resolver in the test harness, search for a name that matches several places. Verify each result shows enough context (name, region, localized country) and that no result is auto-selected.
2. Select one candidate, review the composed label, save, and verify the stored label. Clear it and save; verify it becomes unset and is not restored.
3. Change the language and verify the place identity and stored label are unchanged; only surrounding interface text localizes.
4. With the production resolver unavailable, verify:
   - search explains the limitation accessibly and offers retry;
   - units, presentation, and language remain fully usable;
   - a saved location can still be displayed and cleared;
   - no unverified text is saved as a location.
5. Use a resolver fixture with candidate names at the 1- and 121-grapheme boundaries. Verify a 1-grapheme label is accepted, a 121-grapheme candidate is rejected as a resolved location, and the query/draft is preserved. The search query itself is validated at 1–80 graphemes.
6. Verify no geolocation prompt appears at any point and no provider host is contacted from the browser (Network tab).

### 4.7 Safe updates, validation, and drafts (US3, FR-056–FR-067, SC-006, SC-007)

1. Change several fields, cancel, and verify the draft is discarded and the applied values remain unchanged.
2. Submit an invalid draft (where a field can be invalid, for example an over-long location search query). Verify:
   - no field is applied or persisted;
   - each error is associated with its field and `aria-invalid` is set;
   - an error summary appears when multiple errors exist;
   - focus moves to the first invalid field;
   - the draft is preserved.
3. While a save is pending, activate Save repeatedly. Verify exactly one write occurs and the control reflects the pending state.
4. Save successfully. Verify the success message appears only after persistence and is announced in the new language.
5. Simulate a write failure. Verify the values apply for the session only, the message explicitly says they were not saved, and retry is offered. Never show a success claim.
6. With a differing draft, attempt in-app navigation and verify the accessible confirmation lets the user stay or discard. With a differing draft, reload or close the tab and verify the browser's standard unsaved-changes prompt appears. With no differing draft, verify no prompt.

### 4.8 Storage resilience (US4, FR-068–FR-083, SC-012)

Inspect the record with:

```js
JSON.parse(localStorage.getItem('walday:preferences'))
```

1. **Restore**: save preferences, reload, and verify every field including the implicit/explicit language distinction is restored.
2. **Corrupt**: set `localStorage.setItem('walday:preferences', '{not-json')` and reload. Verify defaults, no crash, a non-blocking notice, and that the raw value is not overwritten until an explicit save with confirmation.
3. **Partially invalid**: write a valid v1 envelope with one invalid field (for example `"weatherUnits": "kelvin"`). Reload. Verify valid fields are restored, the invalid field falls back, the user is told some preferences could not be restored, the raw record is preserved, and the next save requires replacement confirmation.
4. **Unsupported newer version**: write a valid envelope with `"version": 2`. Reload. Verify the record is preserved, the user is told it cannot be read safely, writes are blocked, and replacement requires explicit confirmation. Confirm cancel leaves the data untouched.
5. **Legacy v0**: write the prototype bare record `{ "language": "es", "dateTimePresentation": "locale-short", "weatherUnits": "imperial", "weatherLocation": { "name": "Quito" } }`. Reload. Verify Spanish/imperial/compact are migrated, the free-text location is not presented as valid and is reported through `notRestoredFields`, the user is informed, and the raw value is replaced only on an explicit save with replacement confirmation. Also verify the v0 language rule: `es` migrates explicit; `en` with a Spanish browser migrates explicit; `en` with an English or unsupported browser migrates implicit (`null`).
6. **Storage cleared while open**: clear site data in another tab and continue using the form. Verify no crash, no false persistence claim, and an explanatory notice.
7. **Quota/unavailable**: these are covered deterministically by `preferences-storage.test.ts`; verify the suite asserts session-only wording, preserved draft, and retry.

### 4.9 Multi-tab behavior (FR-078–FR-079, SC-013)

1. Open `/settings` in two windows with a clean draft. Save in window A. Verify window B reflects the new values (or explicitly surfaces the change) without a stale overwrite.
2. Create a differing draft in window B, then save in window A. Verify window B surfaces a conflict, keeps its draft, and does not overwrite the newer saved values.
3. Clear storage in window A while window B has a draft. Verify window B preserves the draft, surfaces the conflict, and does not claim persistence or resurrect cleared data.

### 4.10 Accessibility (US6, FR-084–FR-099, SC-008)

1. Complete every journey with the keyboard only: navigate, change each control, save, cancel, recover, confirm/cancel dialogs. Verify logical focus order, visible focus, and no keyboard trap.
2. With VoiceOver and Safari, verify:
   - each control has a visible and programmatic label and its current value is announced;
   - grouped choices are announced with their group label;
   - when language is browser-derived, the surface communicates that rather than claiming an explicit saved choice;
   - errors are associated with fields, the summary is announced, and focus moves to the first invalid field;
   - save success, session-only, restore warnings, storage warnings, conflicts, and language changes are announced without unexpected focus movement;
   - dialogs move focus in, support Escape where safe, and return focus to the invoking element.
3. Run automated checks (`npm run test` includes axe assertions). Verify zero critical or serious violations on the preferences route in both languages.
4. Verify the guest-storage notice explains that locally stored preferences may be lost if storage is cleared or the device changes.

### 4.11 Responsive, zoom, and motion (FR-095–FR-097, SC-016)

1. Verify at 360, 768, 1024, and 1440 px widths in English and Spanish: no clipping, overlap, lost functionality, or horizontal scrolling, including longer Spanish labels and a long location label.
2. Verify 200% text resizing and 400% zoom.
3. Enable `prefers-reduced-motion: reduce` and verify no essential information depends on animation and skeletons remain usable.

### 4.12 Non-mutation and privacy (FR-004, FR-014, FR-031, FR-049, FR-082, SC-004)

1. With existing tasks and commitments, note their stored records. Change language, presentation, units, and location. Verify `walday:tasks` and `walday:commitments` are byte-identical and user-entered content is not translated or reordered.
2. Verify only `walday:preferences` changes.
3. Verify the preferences record contains no secrets, tokens, or authentication data, and that coordinates/labels never appear in the interface, console logs, analytics, or error output. Saved coordinates may be sent only to the backend weather proxy when weather retrieval requires them; the browser must never send them to a provider host.
4. Verify a weather or geocoding outage does not block task management, commitments, or preference management beyond new location search.

## 5. Traceability

| Scenario | Requirements | Success criteria |
| --- | --- | --- |
| 4.1 | FR-051–FR-055, VR-008 | SC-001 |
| 4.2 | FR-007–FR-012, VR-002–VR-004 | SC-002 |
| 4.3 | FR-013–FR-019, FR-100–FR-108, VR-014 | SC-009 |
| 4.4 | FR-020–FR-028, VR-005 | SC-010 |
| 4.5 | FR-029–FR-036, VR-006 | SC-011 |
| 4.6 | FR-037–FR-050, VR-007 | SC-011, SC-015 |
| 4.7 | FR-056–FR-067, VR-009 | SC-006, SC-007 |
| 4.8 | FR-068–FR-083, VR-010–VR-012 | SC-003, SC-012, SC-014 |
| 4.9 | FR-078–FR-079, VR-012 | SC-013 |
| 4.10 | FR-084–FR-099, VR-013 | SC-008 |
| 4.11 | FR-095–FR-097 | SC-016 |
| 4.12 | FR-004, FR-014, FR-031, FR-049, FR-082, VR-015 | SC-004, SC-014 |

## 6. Troubleshooting

- **Settings shows English after reloading with a Spanish browser**: confirm no explicit `language` is stored and that the browser's preferred-language list actually contains an `es-*` entry. Browser settings sometimes keep a stale order.
- **Storage notices on every load**: clear site data and reload; an unreadable or newer-version record is preserved by design until an explicit save with confirmation.
- **Two tabs fight**: close one, reload the other, and re-test. A dirty draft intentionally blocks automatic application of another tab's values.
- **Location search unavailable**: expected until the backend geocoding proxy is deployed; verify the fake-resolver tests instead and confirm no direct provider request appears in the Network tab.
- **Wrong date boundary**: the device timezone governs date-times; date-only values must never shift. Check the browser timezone emulation, not the stored value.

## 7. References

- [spec.md](./spec.md) — requirements, scenarios, validation rules, success criteria
- [plan.md](./plan.md) — technical approach, audit, constitution check
- [data-model.md](./data-model.md) — entities, envelope, lifecycle, validation
- [research.md](./research.md) — resolved technical decisions
- [contracts/preference-store.md](./contracts/preference-store.md) — local persistence contract
- [contracts/preference-consumer.md](./contracts/preference-consumer.md) — read-only consumer contract
- [contracts/location-resolution.md](./contracts/location-resolution.md) — location port and backend dependency

## 8. Validation notes (2026-11-12)

- Automated validation runs with the Vitest jsdom environment, `TZ=UTC`, an injected `StorageLike`,
  deterministic clock/UUID, a lock stub, and a fake `LocationResolver`. No test performs a network
  request or calls a weather provider host.
- The preference storage key and version are verified by the storage and migration suites; the
  v0 migration is exercised with English, Spanish, unsupported, and bilingual browser-language
  inputs.
- Production location search requires `VITE_API_BASE_URL` and the backend weather geocoding proxy.
  The proxy is not part of this repository, so FR-039–FR-041 are validated with the injected fake
  resolver only; a deployed proxy must be confirmed before production sign-off.
- Manual VoiceOver with Safari for the critical preference journeys is a release activity and is
  recorded separately from the automated axe and keyboard suites.
