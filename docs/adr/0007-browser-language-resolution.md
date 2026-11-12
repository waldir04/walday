# ADR 0007: Browser-Aware Language Resolution and Explicit Choice

- **Status**: Accepted
- **Date**: 2026-11-12
- **Supersedes**: ADR 0004

## Context

Specification 003 requires an explicit language preference, browser-language following, and a
stable distinction between an explicit choice and an implicit browser-derived language. ADR 0004
deferred browser detection and always started in English.

## Decision

- Effective language resolution order is: stored explicit language, else the first supported entry
  in `navigator.languages` matched by base subtag (case-insensitive), else English.
- `language: null` in the stored record represents "Use browser language" and is re-resolved on
  every load. Saving unrelated preferences never converts `null` to a concrete language.
- An explicit `'en'` or `'es'` always overrides the browser, including when it equals the
  browser-derived language.
- The canonical supported-language list lives in `shared/config/i18n.ts`; the preference entity
  imports and re-exports it.
- Formatting locale is derived separately: the first browser regional variant whose base matches the
  effective language, else `en-US` / `es-ES`.
- `applyLanguage` continues to update translations, the document title, and `<html lang>` without a
  reload. The runtime switching mechanism remains authoritative; only the startup default changes.
- The v0 prototype record is migrated on read: `es` is explicit; `en` is explicit only when it
  contradicts a Spanish browser and is otherwise implicit.

## Consequences

- Browser-language detection is part of the language contract and is tested by
  `preferences-model.test.ts`, `preferences-localization.test.tsx`, and `preferences-migration.test.ts`.
- The interface language and the formatting locale are independent but consistent: language is
  `en`/`es`, while formatting preserves the regional variant.
- Missing translations still fall back to English and never render raw keys.
