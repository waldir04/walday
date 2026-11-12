# ADR 0002: Tailwind `@theme` as the Sole Design-Token Source

- **Status**: Accepted
- **Date**: 2026-11-12

## Context

Design tokens were duplicated between `src/index.css` `@theme` and a legacy `tailwind.config.ts`.
The constitution requires a single token source, a complete semantic palette, WCAG AA contrast, and
no raw hex colors in components.

## Decision

All design tokens live in the Tailwind CSS 4 `@theme` block in `src/index.css`. The legacy
`frontend/tailwind.config.ts` was removed. Tokens cover color, typography, spacing, radius, shadow,
and density scales. Components use semantic utility classes such as `bg-surface`, `text-text-muted`,
and `rounded-control`.

The palette uses system fonts and AA-compliant color pairs; contrast is verified by an automated
token test and manual review.

## Consequences

- One place changes a token.
- No duplicated token definitions or raw hex values in foundation components.
- Business-form token adoption remains follow-up debt and is recorded in the README.
