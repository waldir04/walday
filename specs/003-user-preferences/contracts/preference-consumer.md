# Contract: Preference Consumer Interface

**Owner**: `entities/preferences` | **Consumers**: `features/tasks`, `features/commitments`, future agenda/dashboard/weather surfaces | **Status**: Target for this feature

This contract defines how consuming features read the applied preferences. It is the only sanctioned access path. Consumers must not read `localStorage`, must not mutate preferences, and must not hold stale values after a change (FR-005, FR-064, VR-001).

## 1. Public surface

`entities/preferences/index.ts` exposes the following surface. `PreferenceField`, `PreferencePersistenceStatus`, `WeatherMeasurement`, and `LocalDateString` are defined in `entities/preferences/model/types.ts`; `SupportedLanguage` is canonically defined in `shared/config/i18n.ts` and re-exported by the entity.

```ts
// Read-only applied state
interface PreferenceConsumerValue {
  preferences: UserPreferences
  effectiveLanguage: SupportedLanguage
  languageSource: 'explicit' | 'browser'
  formattingLocale: string
  timeZone: string
  persistence: PreferencePersistenceStatus
}

type PreferencePersistenceStatus =
  | { mode: 'normal' }
  | { mode: 'session-only'; reason: 'unavailable' | 'quota' | 'write-failed' | 'cleared' }
  | { mode: 'recovery-blocked'; fields: PreferenceField[] }
  | { mode: 'protected'; reason: 'corrupt' | 'migration-failed' }
  | { mode: 'unsupported'; detectedVersion: number }
  | { mode: 'conflict' }

function usePreferences(): PreferenceConsumerValue
```

`usePreferences` throws when used outside the provider. The provider is composed at `app` level by the preferences feature. No setter, repository, or raw record is exposed to consumers.

Formatting and unit helpers are also public, because they encode preference-driven presentation rules:

```ts
function formatPreferenceDate(date: Date, ctx: PreferenceFormattingContext): string
function formatPreferenceDateTime(date: Date, ctx: PreferenceFormattingContext): string
function formatPreferenceLocalDate(value: LocalDateString, ctx: PreferenceFormattingContext): string
function formatMeasurement(
  measurement: WeatherMeasurement | undefined,
  unit: WeatherUnit,
  locale: string,
): string | null
```

`PreferenceFormattingContext` is `{ presentation: DateTimePresentation; locale: string; timeZone: string }`. Helpers are pure and never read storage or React state. `formatMeasurement` returns `null` for a missing measurement; the consuming surface renders the localized unavailable text. It never fabricates a numeric value.

## 2. Value semantics

| Field | Guarantees |
| --- | --- |
| `preferences.language` | `'en'`, `'es'`, or `null`; `null` means browser resolution. Never an invalid or unknown value. |
| `preferences.dateTimePresentation` | Always a supported option; invalid stored values have already fallen back. |
| `preferences.weatherUnits` | Always `metric` or `imperial`. |
| `preferences.weatherLocation` | A validated resolved location or `null`. Label is plain text and is never re-localized or replaced by a language change. |
| `effectiveLanguage` | The language currently applied to the interface; always `en` or `es`. |
| `languageSource` | `'browser'` exactly when `preferences.language` is `null`; used to show that language follows the browser rather than a saved explicit choice. |
| `formattingLocale` | A valid BCP 47 locale derived from the browser regional variant or the documented default (`en-US`, `es-ES`). |
| `timeZone` | The device IANA timezone; `UTC` as a safe fallback. Never a user preference. |
| `persistence` | The current storage mode. A consumer may show a status or defer a destructive action, but must not write storage. |

Persistence status is derived from the store load/write outcome as follows:

| Store outcome | `persistence.mode` | Notes |
| --- | --- | --- |
| Valid record or successful write | `normal` | Applied values are persisted. |
| Storage unavailable, quota exceeded, or write failed | `session-only` | Applied values are memory-only; no success claim. |
| Storage cleared externally while open | `session-only` (`reason: 'cleared'`) | Defaults are applied with a clean draft; the UI states that preferences are not currently persisted. A dirty draft surfaces `conflict` instead. |
| Partial restore, or a migration with un-restored fields | `recovery-blocked` | Valid fields are applied; `fields` lists the invalid and not-restored fields; writes require replace confirmation. |
| Corrupt or migration-failed record | `protected` | Defaults are shown; the raw payload is preserved. |
| Unsupported newer version | `unsupported` | Defaults are shown; the record is read-only until explicit replacement is confirmed. |
| Cross-tab conflict with a dirty draft | `conflict` | The previous applied values remain; the local draft is preserved. |

## 3. Reactivity

- A successful save updates the provider value in the same session without a reload (FR-064).
- A language change updates translations, `<html lang>`, the document title, route announcements, and locale-dependent formatting without a reload (FR-013, FR-098, FR-102).
- An external tab change updates the provider only when the preferences surface reports a clean draft; otherwise the provider exposes `conflict` and the previous applied values (FR-078).
- Consumers must not cache preference values across renders in module-level state. Reading through the hook is the only supported reactivity mechanism.
- No `useEffect` may be used to fetch preferences; the value is available synchronously from the provider.

## 4. Formatting rules

- Dates and date-times use `formattingLocale` and `timeZone`.
- Date-only values use the date portion of the selected presentation and never display a time; they are not shifted by timezone (FR-022, FR-025).
- Unformattable input falls back to a safe locale-aware format; never `Invalid Date`, a raw pattern, an error string, or a blank (FR-026).
- Weather measurements convert only for display using the selected unit system and documented precision. `formatMeasurement` returns `null` for a missing measurement; the consuming surface renders localized unavailable text (FR-030–FR-035).
- `Intl` is the only formatting engine. No date, unit, or number library is introduced.

## 5. Boundaries

| Allowed | Prohibited |
| --- | --- |
| Import `entities/preferences` from `features/*`, `pages/*`, `widgets/*`, `app/*`. | Importing feature internals, reading `walday:preferences`, or constructing preference records in a consumer. |
| Use the read hook and formatting/unit helpers. | Calling the feature store, mutating the record, or passing a setter through props. |
| Show localized status derived from `persistence`. | Treating a `session-only` or `conflict` value as persisted. |
| Pass explicit props into presentational components. | Hiding a persistence/conflict state to keep a UI simpler. |

`entities/task` must not import `entities/preferences` (same-layer rule). Task due-date formatting receives a resolved generic `Intl` date style from the composing feature/page; the preference-to-style mapping stays in `entities/preferences`.

## 6. Contract tests

- Consumers re-render with new values after a save and after an external update.
- A language change updates text and formatting without remounting the route or losing drafts.
- Consumers cannot mutate preferences (no setter is exposed by the type).
- A session-only save surfaces a status that consumers can communicate; no success state is shown for it.
- Formatting and unit helpers are deterministic for fixed locale/timezone/date inputs, including date-only boundaries, DST transitions, invalid timezones, missing measurements, and both unit systems.
