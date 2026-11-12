# Data Model: User Preferences and Localization

**Feature**: `003-user-preferences` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

This document is the canonical technical contract for the preference domain, the derived locale context, and the guest preference store. It refines spec §4.12 (validation rules), §4.13 (key entities), and §4.8 (persistence). It introduces no server, API, Prisma, or PostgreSQL model.

## 1. Conventions

| Concept                     | Representation                                            | Rules                                                                                                                       |
| --------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Language tag                | `'en' \| 'es'` (base subtag only)                         | Stored and compared lowercase. Regional variants are resolved for formatting but never stored as the interface language.    |
| Language tag owner          | `shared/config/i18n.ts`                                   | Canonical `SUPPORTED_LANGUAGES` and `SupportedLanguage` union. `entities/preferences/model/types.ts` imports and re-exports them so the i18n bootstrap never imports the entity layer. |
| Explicit language           | `SupportedLanguage`                                       | Persisted only when the user explicitly saves English or Spanish, or when a supported v0 record provides evidence of an explicit choice (see §3.4). |
| Implicit language           | `null`                                                    | The "Use browser language" choice. Re-resolved from `navigator.languages` on every load; never persisted as a concrete value. |
| Presentation option         | `'compact' \| 'standard' \| 'full'`                       | Stable semantic values; default `standard`; never store labels or format patterns.                                           |
| Weather unit system         | `'metric' \| 'imperial'`                                  | Default `metric`; presentation-only.                                                                                         |
| Local date string           | `YYYY-MM-DD` calendar date                                | `LocalDateString` is a validated plain string; it is never shifted by timezone and never carries a time of day.             |
| User-perceived length       | Grapheme cluster count via `Intl.Segmenter`               | Computed after trimming. Emoji and combining sequences count as one.                                                         |
| Persistence revision        | UUID v4 via `crypto.randomUUID()`                         | Regenerated on every successful write; basis for compare-and-swap conflict detection.                                        |
| Storage timestamp           | ISO 8601 UTC string                                       | Time of the last successful write.                                                                                           |
| Coordinate                  | Finite number                                             | Latitude `-90..90`, longitude `-180..180`; never displayed or logged.                                                        |

## 2. Domain Entities

### 2.1 UserPreferences

The complete configurable preference set for a guest context. Preferences are presentation and configuration data only; they are never a source of truth for tasks, commitments, weather observations, or any other feature data.

| Field                  | Type                                  | Required | Default                                            | Validation / Rules                                                                                     |
| ---------------------- | ------------------------------------- | -------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `language`             | `SupportedLanguage \| null`           | Yes      | `null` (browser resolution; English fallback)      | `'en'`, `'es'`, or `null`. Unsupported/malformed stored values are treated as absent (FR-012, VR-004).  |
| `dateTimePresentation` | `DateTimePresentation`                | Yes      | `'standard'`                                       | One of `compact`, `standard`, `full`; invalid stored values fall back to `standard` (FR-027, VR-005).   |
| `weatherUnits`         | `WeatherUnit`                         | Yes      | `'metric'`                                         | `metric` or `imperial`; invalid stored values fall back to `metric` (FR-036, VR-006).                   |
| `weatherLocation`      | `WeatherLocation \| null`             | Yes      | `null` (unset)                                     | Optional, explicitly selected, resolved place; `null` means unset. Never inferred or geolocated (FR-037–FR-047). |

Invariants:

- `language`, `dateTimePresentation`, `weatherUnits`, and `weatherLocation` are independent. Changing one never changes another (FR-003, VR-001).
- A change to any field never mutates task, commitment, weather, or other feature data (FR-004, VR-015).
- Changing `language` keeps `weatherLocation.label` exactly as stored (FR-043, FR-106).
- Changing `weatherUnits` never converts or rewrites stored measurements (FR-031, FR-032).
- Viewing preferences never creates a stored record (FR-053, VR-008).

Example (effective values, no explicit language):

```json
{
  "language": null,
  "dateTimePresentation": "standard",
  "weatherUnits": "metric",
  "weatherLocation": null
}
```

### 2.2 WeatherLocation

A place selected by explicit user action and resolved through the location-resolution port.

| Field             | Type     | Required | Constraints                                   | Notes                                                                    |
| ----------------- | -------- | -------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `providerPlaceId` | `string` | Yes      | 1–128 characters, trimmed, non-empty          | Stable identity returned by the resolver; used for deduplication.        |
| `label`           | `string` | Yes      | 1–120 grapheme clusters after trimming         | Plain text; rendered as text, never HTML; retained unchanged (FR-048).   |
| `latitude`        | `number` | Yes      | Finite, `-90..90`                              | Used only for weather retrieval; never displayed or logged (FR-049).      |
| `longitude`       | `number` | Yes      | Finite, `-180..180`                            | Same as latitude.                                                        |

The `label` is composed once, at selection time, from the candidate's name, optional region, and country using `Intl.ListFormat` and `Intl.DisplayNames` in the active formatting locale. It is then stored verbatim. Later language changes do not re-localize, replace, re-resolve, or translate it.

Example:

```json
{
  "providerPlaceId": "3117735",
  "label": "Madrid, Community of Madrid, Spain",
  "latitude": 40.4165,
  "longitude": -3.7026
}
```

### 2.3 LocationCandidate (transient port type)

A search result shown before selection. It is owned by the `features/user-preferences` location port described in [contracts/location-resolution.md](./contracts/location-resolution.md), validated at the boundary, and never persisted in the preference record or exported from the entity. The persisted result is `WeatherLocation` (§2.2).

| Field             | Type      | Required | Constraints                    | Notes                                              |
| ----------------- | --------- | -------- | ------------------------------ | -------------------------------------------------- |
| `providerPlaceId` | `string`  | Yes      | Non-empty, unique per response | Identity used when the user selects the result.    |
| `name`            | `string`  | Yes      | 1–120 grapheme clusters        | Provider place name; untrusted external data.      |
| `region`          | `string`  | No       | 1–120 grapheme clusters        | Shown for disambiguation.                          |
| `countryCode`     | `string`  | Yes      | ISO 3166-1 alpha-2, uppercase  | Localized for display with `Intl.DisplayNames`.    |
| `latitude`        | `number`  | Yes      | Finite, `-90..90`              | Carried into the saved location.                   |
| `longitude`       | `number`  | Yes      | Finite, `-180..180`            | Carried into the saved location.                   |

The UI must never silently choose the first result. The user selects one candidate explicitly before saving (FR-039, VR-007).

### 2.4 PreferenceDraft

| Field                  | Type                                  | Notes                                                                                     |
| ---------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `language`             | `SupportedLanguage \| null`           | Includes the "Use browser language" choice.                                               |
| `dateTimePresentation` | `DateTimePresentation`                |                                                                                           |
| `weatherUnits`         | `WeatherUnit`                         |                                                                                           |
| `locationQuery`        | `string`                              | 0–80 grapheme clusters after trimming; search input only, never persisted.                |
| `weatherLocation`      | `WeatherLocation \| null`             | Existing saved location is preserved until replaced or cleared.                           |

The draft is *dirty* when any persisted field differs from the applied preferences. `locationQuery` alone does not make the draft dirty.

### 2.5 Effective Language and Locale Context (derived)

Never persisted as a separate record.

| Field              | Type                            | Derivation                                                                                                                       |
| ------------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `effectiveLanguage`| `SupportedLanguage`             | Explicit `language` if present; else first supported entry in `navigator.languages` matched by base subtag case-insensitively; else `'en'`. |
| `languageSource`   | `'explicit' \| 'browser'`       | `'explicit'` when a stored language exists; `'browser'` when `language` is `null`. Used to communicate browser-follow behavior (FR-087). |
| `formattingLocale` | BCP 47 locale string            | First browser language whose base matches `effectiveLanguage`, normalized; else the documented default (`en` → `en-US`, `es` → `es-ES`). |
| `timeZone`         | IANA timezone string            | Device timezone from `Intl.DateTimeFormat().resolvedOptions().timeZone`; `'UTC'` fallback. Independent of language (FR-023, FR-028). |

The consumer contract also exposes persistence status (`normal`, `session-only`, `recovery-blocked`, `protected`, `unsupported`, `conflict`), derived from the load/write outcomes in §3; see [contracts/preference-consumer.md](./contracts/preference-consumer.md) §2.

### 2.6 Guest Preference Store (envelope)

Persisted at `walday:preferences` (v1).

```json
{
  "version": 1,
  "revision": "6f1c2d7e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  "updatedAt": "2026-11-12T15:04:05.000Z",
  "preferences": {
    "language": "es",
    "dateTimePresentation": "standard",
    "weatherUnits": "imperial",
    "weatherLocation": null
  }
}
```

Storage invariants:

- The envelope is versioned; the version lives inside the payload, not in the key.
- The key `walday:preferences` is preserved to allow migration of existing guest data.
- Validation is field-by-field after envelope parsing. Valid fields survive invalid siblings (FR-071).
- A stored record is untrusted input; it is never assumed to match its TypeScript description.
- No secrets, credentials, tokens, or authentication data are stored (FR-082).
- The payload is small and not cached in shared caches or TanStack Query.

## 3. Persistence Lifecycle

### 3.1 Load results

| Result              | Meaning                                                                                       | Behavior                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `empty`             | No stored record                                                                              | Effective defaults; implicit language; no write; no error state (FR-053).                                           |
| `restored`          | Valid v1 envelope, or a v0 bare record fully migrated (`migratedFrom` set)                    | Apply restored fields before presenting preferences as authoritative; announce successful restore only if meaningful. A fully migrated record rewrites only on the next explicit save. |
| `partial`           | Valid envelope with one or more invalid fields, or a migrated record with un-restorable fields | Restore valid fields, fall back per invalid field, report `invalidFields` and `notRestoredFields`, preserve raw payload, and require replace confirmation on the next write (FR-071–FR-072). |
| `migration-failed`  | A supported older shape could not be migrated safely                                          | Preserve the raw value, use defaults, inform the user, block replacing writes until explicit confirmation (FR-070).  |
| `corrupt`           | Unparseable JSON or unreadable envelope                                                       | Safe defaults, non-blocking accessible notice, do not overwrite until the user explicitly saves and confirms replacement (FR-073). |
| `unsupported`       | `version` greater than the supported version                                                  | Preserve untouched, read-only for the session, inform the user, require explicit confirmation before any write (FR-074). |
| `unavailable`       | Storage access throws or `localStorage` is absent                                             | Memory-only mode, accessible warning, never claim persistence (FR-075).                                             |

### 3.2 Write results

| Code                       | Meaning                                                                 | UI behavior                                                                                       |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ok`                       | Envelope written; new `revision` and `updatedAt` returned                | Success feedback, announced in the newly active language (FR-060).                                |
| `STORAGE_UNAVAILABLE`      | Storage cannot be reached or throws on access                            | Apply for the session, state session-only, offer retry (FR-061, FR-076).                          |
| `STORAGE_QUOTA_EXCEEDED`   | Quota or recovery error recognized                                       | Retain draft and in-memory values, state session-only, offer retry (FR-076).                      |
| `STORAGE_WRITE_FAILED`     | Any other write failure                                                  | Retain draft, state session-only, never claim success (FR-061).                                   |
| `STORAGE_WRITE_BLOCKED`    | Corrupt, migration-failed, partial, or unsupported payload               | Require explicit replace confirmation where allowed; otherwise remain read-only (FR-073–FR-074). The first save after a partial restore is a confirmed `replace-unreadable` write. |
| `STORAGE_CONFLICT`         | Persisted revision differs from the tab's baseline                       | Surface a conflict, keep the draft, never overwrite newer data (FR-078, VR-012).                  |

### 3.3 Write protocol

1. Validate the complete draft with the shared Zod schema before applying or persisting anything (FR-057, VR-009).
2. Serialize writes per browser using `navigator.locks.request('walday:preferences', …)` when available; otherwise use the same read-verify-write sequence as a best-effort fallback.
3. Re-read the persisted envelope inside the lock and compare `revision` with the caller's baseline (`RevisionBaseline`). A mismatch returns `STORAGE_CONFLICT`.
4. Block automatic writes over `unsupported`, `corrupt`, `migration-failed`, or `partial` payloads unless the user confirmed replacement. A normal explicit save after `partial` is presented as a replace confirmation because the raw payload is preserved; an unsupported newer version is never replaced automatically.
5. Write `{ version: 1, revision: <new UUID>, updatedAt: <ISO now>, preferences }` as a single `setItem` call.
6. On success, apply the values in memory, update the baseline revision, and announce success. On failure, keep the draft and apply or retain values in memory with explicit session-only wording.

### 3.4 Legacy migration (v0 → v1)

v0 is the prototype shape currently stored by the existing implementation: a bare object `{ language, dateTimePresentation, weatherUnits, weatherLocation }` with no envelope.

| v0 value                              | v1 value                                  |
| ------------------------------------- | ----------------------------------------- |
| `language: 'es'`                      | `language: 'es'` (explicit; the prototype never defaulted to Spanish) |
| `language: 'en'` and first supported browser language is `es` | `language: 'en'` (explicit; the saved value contradicts the browser) |
| `language: 'en'` and first supported browser language is `en` or absent | `language: null` (implicit; the value may have been the prototype default) |
| `language` invalid or absent          | `language: null` (browser resolution)     |
| `dateTimePresentation: 'locale-short'`| `'compact'`                               |
| `dateTimePresentation: 'locale-medium'`| `'standard'`                             |
| `dateTimePresentation: 'locale-long'` | `'full'`                                  |
| unknown presentation                  | `'standard'`                              |
| `weatherUnits: 'metric' \| 'imperial'`| preserved                                 |
| unknown units                         | `'metric'`                                |
| `weatherLocation: { name }`           | `null`, reported through `notRestoredFields: ['weatherLocation']` |
| `weatherLocation: null`               | `null`                                    |

The migration is a pure function over the parsed v0 value plus the first supported browser language, which is injected so the storage layer never reads `navigator` directly. The v0 location has only a free-text name: it has no resolvable identity or coordinates, so it is **not** presented as a valid location (FR-040, FR-047). It is reported through `notRestoredFields: ['weatherLocation']`. The v0 `language` value also cannot be assumed explicit because the prototype could store its English default. The migration uses the first supported browser language as evidence: a v0 `en` that matches the browser (or has no supported browser match) becomes implicit `null`, while a v0 `es`, or a v0 `en` that contradicts a Spanish browser, remains explicit. The resulting `language` value and `migratedFrom` make the conversion visible. The migration never destroys the raw v0 payload; a fully migrated record is replaced only on the next explicit save, and a partial migration requires replace confirmation because the location could not be restored.

A migration registry keyed by source version is used so future supported versions can be added without changing the read path. An unknown older version or a failed migration enters `migration-failed`; the raw payload is preserved.

### 3.5 Cross-tab behavior

- Subscribe to `window.storage` filtered to `walday:preferences`.
- If the tab has a clean draft and normal persistence, apply the external change and announce it.
- If the tab has a dirty draft, a pending save, or an open confirmation, mark an external change and surface a conflict; never overwrite the newer saved values silently.
- If storage is cleared externally with a clean tab, apply defaults, report `session-only` with reason `cleared`, and inform the user; with a dirty draft, preserve the draft, surface the conflict, and never claim persistence.
- Unsupported or unreadable external payloads are not applied and are not overwritten; the raw value is preserved.

## 4. Formatting and Units

### 4.1 Presentation mapping

| Preference  | `Intl` dateStyle | `Intl` timeStyle | Date-only values                    |
| ----------- | ---------------- | ---------------- | ----------------------------------- |
| `compact`   | `short`          | `short`          | Date portion of `short`; no time.   |
| `standard`  | `medium`         | `short`          | Date portion of `medium`; no time.  |
| `full`      | `long`           | `medium`         | Date portion of `long`; no time.    |

- Formatting always uses `formattingLocale` and the device `timeZone` for date-time values.
- Date-only values (`YYYY-MM-DD`) are parsed as calendar dates and are never shifted by timezone; only their date portion is formatted (FR-022, FR-025).
- An unformattable date or timezone falls back to a safe locale-aware format; never `Invalid Date`, a raw pattern, an error string, or a blank (FR-026).
- Changing the presentation never changes stored timestamps or date-only values (FR-024).

### 4.2 Unit conversion and display precision

Canonical stored measurements are metric (the future weather provider's native unit line). Preference conversion is applied only at display time and never rewrites stored data (FR-030–FR-032).

| Measurement   | Canonical | Metric display                | Imperial display              | Conversion                       |
| ------------- | --------- | ----------------------------- | ----------------------------- | -------------------------------- |
| Temperature   | °C        | °C, 0 decimal places          | °F, 0 decimal places          | `F = C × 9/5 + 32`              |
| Wind speed    | km/h      | km/h, 0 decimal places        | mph, 0 decimal places         | `mph = km/h ÷ 1.609344`         |
| Precipitation | mm        | mm, 1 decimal place           | in, 2 decimal places          | `in = mm ÷ 25.4`                |

- Rounding is display-only and uses `Intl.NumberFormat` with the active locale.
- Conversions are reversible from canonical values; the rounded display string is not an input to a reverse conversion.
- A missing measurement is represented by `undefined` (or a missing union member) and the formatter returns `null`; the consuming surface MUST render localized unavailable text and MUST NOT fabricate `0` or a default (FR-035).
- Unit symbols and names are localized by `Intl` in the active language; the underlying system remains the user's selected system (FR-104).

The public measurement input is a discriminated union so the conversion cannot be applied to the wrong quantity:

```ts
type WeatherMeasurement =
  | { kind: 'temperature'; celsius: number }
  | { kind: 'wind-speed'; kilometersPerHour: number }
  | { kind: 'precipitation'; millimeters: number }
```

## 5. Validation Rules

| Rule    | Field / concern              | Validation                                                                                                                   | Fallback / behavior                                                                 |
| ------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| VR-001  | Independence                 | Each field is validated and applied independently.                                                                           | No cross-field coercion.                                                            |
| VR-002  | Language resolution          | Explicit language, else first supported `navigator.languages` entry by base subtag, else English.                             | Unsupported browser entries are skipped; resolution is recomputed per load.         |
| VR-003  | Explicit/implicit            | Only explicit English/Spanish is persisted; browser choice is `null`. Saving other fields never converts implicit to explicit. | `null` remains `null` across saves.                                                 |
| VR-004  | Language validity            | `'en'`, `'es'`, or `null`.                                                                                                   | Invalid stored/input language is treated as absent and reported as not restored.    |
| VR-005  | Presentation validity        | One of `compact`, `standard`, `full`.                                                                                        | Invalid stored value → `standard`.                                                  |
| VR-006  | Units validity               | `metric` or `imperial`.                                                                                                      | Invalid stored value → `metric`.                                                    |
| VR-007  | Location validity            | `null` or a resolved location with non-empty `providerPlaceId`, 1–120 grapheme `label`, finite in-range coordinates.         | Unresolved text is rejected; the draft is preserved; no unverified location is saved. |
| VR-008  | Defaults and first use       | Defaults are effective immediately; viewing creates no record.                                                               | First explicit save writes a complete record.                                       |
| VR-009  | Update atomicity             | Validate all fields, then apply and persist as one operation; block duplicate submissions.                                   | On failure, keep the draft and never claim persistence.                             |
| VR-010  | Restore completeness         | All fields including implicit language are restored in the same browser/device.                                              | Missing/invalid fields fall back and are reported.                                  |
| VR-011  | Storage integrity            | Versioned on read; supported older shapes migrate; newer versions preserved; field isolation; explicit replace confirmation. | No silent destruction; no partial data presented as authoritative.                  |
| VR-012  | Storage failure and conflict | Typed failure results; revision compare-and-swap; cross-tab conflict surface.                                                 | In-memory use continues; stale writes never overwrite newer data.                   |
| VR-013  | Accessibility                | Labels, fieldsets, errors, summary, focus, live regions, targets, contrast, zoom, reduced motion.                            | Blocking defects are fixed, not waived.                                             |
| VR-014  | Localization                 | en/es parity, English fallback, no raw keys or hardcoded text, locale-aware formatting.                                      | Missing key falls back to English.                                                  |
| VR-015  | Non-mutation and privacy     | Preference writes touch only the preference key; coordinates and labels are never logged; no secrets.                        | Any other write is a defect.                                                        |
| VR-016  | Migration readiness          | Stable semantic values and explicit version; no auth, sync, or migration behavior.                                           | Local record remains available for a future explicit migration.                     |

## 6. Relationships and Boundaries

- **UserPreferences → consuming features**: read-only. Consumers receive validated values through the entity context and react to changes; they never read `localStorage` and never mutate preferences (FR-005).
- **UserPreferences → task/commitment entities**: none. Preference changes do not read or write their stores (FR-004, VR-015).
- **WeatherLocation → location resolution port**: one-way selection and validation; the port never receives previously saved coordinates unless the user re-searches.
- **Guest store → future account**: portable semantics and version only. No server call, merge, or synchronization is implemented (FR-110–FR-112).
- **Date/time formatting → `shared/lib/dateTimeFormat`**: generic `Intl` styles only; the preference mapping stays in the entity, so `shared` has no domain dependency.

## 7. Out of Scope for This Model

- Server-side preference records, Prisma models, API persistence, and cross-device synchronization.
- Multiple profiles, preference profiles, per-feature overrides, favorites, location history, or automatic location switching.
- User-selectable timezone, dark mode, theme, accessibility overrides, notifications, import/export, and backup.
- Guest-to-account migration conflict resolution.
