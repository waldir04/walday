# ADR 0001: Frontend-Only Foundation Baseline

- **Status**: Accepted
- **Date**: 2026-11-12

## Context

Specification 001 must establish the frontend foundation without introducing business scope or the
future backend stack. Features 002–004 (tasks, preferences, commitments) already exist and must keep
working.

## Decision

Specification 001 is frontend-only. It preserves existing FSD folders, routes, feature behavior,
storage keys, and tests while refactoring the shell, routing, tokens, error/loading states,
configuration, i18n, type safety, public APIs, and quality gates. Express, PostgreSQL, Prisma,
backend Vitest, authentication, weather, and the backend application are future stack and are not
implemented.

Guest `localStorage` remains client-side data, not server state.

## Consequences

- The foundation can ship without a backend or database.
- The future backend boundary is documented through validated `VITE_API_BASE_URL` configuration.
- A separate backend specification is required before server code is added.
