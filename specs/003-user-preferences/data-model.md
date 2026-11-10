# Data Model: User Preferences and Localization

**Feature**: 003-user-preferences | **Date**: 2026-11-10

## Entities

### UserPreferences

Represents the configurable choices for a guest user context. Stored locally; must be portable for future authenticated migration (FR-019).

| Field | Type (conceptual) | Required | Default | Validation / Rules |
|-------|-------------------|----------|---------|--------------------|
| language | enum: `en` \| `es` | yes | Resolved: user pref > supported browser locale > `en` | Only supported values; invalid -> `en` fallback (FR-001–FR-004) |
| dateTimePresentation | locale-aware presentation setting | yes | Locale/timezone-appropriate sensible default | Must enable formatting that respects selected locale and appropriate timezone (FR-005) |
| weatherUnits | enum (supported unit system, e.g. metric/imperial) | yes | Sensible neutral default (e.g. metric) | Independent of language; presentation-only (FR-006, FR-012, FR-015) |
| weatherLocation | structured location value or null/unset | no | unset | Independent of language; may be invalid/missing with clear handling (FR-007, FR-013, Edge Cases) |

**Invariants**:
- Language and weather units are independent.
- Weather location is independent of language.
- Updating preferences MUST NOT mutate existing task/commitment data (FR-014).
- Updating weather units MUST NOT mutate stored weather information (FR-015).
- Preferences applied consistently across consuming features (FR-011).

### LocaleContext (derived)

Derived at runtime for presentation: effective language, locale for formatting, and timezone context. Not necessarily persisted as a separate record beyond `UserPreferences` fields.

## Relationships

- **UserPreferences -> consuming features**: read-only consumption of current preference values (tasks, agenda, weather displays in future). No reverse data mutation.
- **UserPreferences -> future account**: portable structure for explicit migration (behavior defined later).

## State / Lifecycle

- **Uninitialized**: no saved preferences -> resolve defaults (with browser locale consideration for language) and persist on first save or initialize in-memory defaults.
- **Persisted**: valid preferences stored locally for guest; restored on return.
- **Invalid/Unavailable storage**: fall back to defaults; continue operating without restored values (Edge Cases).

## Validation Notes

- Validate and sanitize on read (treat stored data as untrusted).
- Reject/normalize unsupported language or unit values to safe fallbacks.
- Do not assume storage presence or shape.