# ADR 0005: Canonical Quality Gates and Hooks

- **Status**: Accepted
- **Date**: 2026-11-12

## Context

The repository had no root package, so root Husky hooks invoked scripts that did not exist. CI ran
Node 20 and did not run formatting or coverage. The constitution requires a shared script contract,
runnable hooks, and mandatory CI.

## Decision

- Add a development-only root `package.json` that delegates `lint`, `format:check`, `typecheck`,
  `test`, `test:coverage`, and `build` to `frontend`.
- Install Husky and lint-staged at the root; `prepare` installs hooks.
- Pre-commit runs lint-staged and formatting; pre-push runs typecheck, coverage, and build.
- CI runs the same canonical commands on Node 24 after clean installs.
- Coverage uses v8 with 80% global thresholds and higher thresholds for entity business rules.
- The default branch is protected and integrates through PRs with required CI checks and review.

## Consequences

- Local hooks and CI cannot drift from the script contract.
- Bypassing hooks or CI remains an exceptional, reviewed action.
- Hook tooling is development-only and adds no runtime dependency.
