# ADR 0003: FSD Public APIs and Storage Ownership

- **Status**: Accepted
- **Date**: 2026-11-12

## Context

Pages imported feature internals, `shared/lib` storage modules imported `entities` (an upward
dependency), and no slice exposed a public API. This violated the FSD boundary rules.

## Decision

- Every feature/entity slice exposes a public `index.ts`.
- Higher layers import slices only through their public APIs.
- Preference and commitment storage moved into their owning entity slices
  (`entities/preferences/model/storage.ts`, `entities/commitment/model/storage.ts`).
- `shared` no longer imports `entities` or `features`.
- Directory-climbing imports use the `@/` alias.
- ESLint blocks deep cross-slice imports and `../../` chains.

The task model intentionally remains in `features/tasks`; moving it to `entities/task` is recorded
follow-up debt.

## Consequences

- Boundaries are enforceable by lint and review.
- Existing feature behavior and storage keys are preserved.
- `shared` remains free of business rules.
