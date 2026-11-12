# ADR 0004: Mechanism-Only Language Switching

- **Status**: Superseded by [ADR 0007](./0007-browser-language-resolution.md)
- **Date**: 2026-11-12

## Context

The product requires English and Spanish. The foundation needs a language mechanism without adding a
new product surface. Existing behavior resolved the browser language at startup.

## Decision

- English is canonical and the fallback.
- The application starts in English when no explicit stored preference exists.
- An explicit stored preference may override the default.
- Implicit browser-language detection at startup is deferred.
- `applyLanguage` updates translations, the document title, and `<html lang>` without reload.
- The foundation exposes the mechanism only; no visible language selector is added. The existing
  preferences consumer may apply a language.
- Missing keys fall back to English and never render raw keys.

## Consequences

- Language behavior is deterministic and testable.
- English/Spanish parity is enforced by a test.
- Browser-language auto-detection requires a future product decision.
