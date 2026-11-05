# Research: Initial Application Foundation

## Decision: Frontend stack
- Decision: React + TypeScript + Vite + Tailwind CSS + React Router (per Constitution initial direction).
- Rationale: Aligns with Constitution; Vite provides fast dev/build; Tailwind enables token-based styling.
- Alternatives considered: Next.js (SSR not needed for MVP), CRA (deprecated).

## Decision: Testing
- Decision: Vitest + React Testing Library with AAA pattern.
- Rationale: Constitution-mandated; fast, Vite-native.
- Alternatives considered: Jest (slower, extra config).

## Decision: Quality gates
- Decision: Husky + lint-staged (evaluate) for pre-commit (format/lint); pre-push (typecheck, tests, build); CI independent.
- Rationale: Constitution guidance; fast pre-commit, comprehensive pre-push.
- Alternatives considered: lefthook.

## Decision: i18n
- Decision: i18next + react-i18next, lazy loading, en/es, English fallback.
- Rationale: Constitution guidance; established solution.

## Decision: Accessibility tooling
- Decision: axe-core + Lighthouse in tests; manual keyboard verification.
- Rationale: Constitution requirement; automated alone insufficient.

## Decision: Environment config
- Decision: `.env.example` with documented variables; validate required vs optional at startup; fail fast only for required.
- Rationale: Spec requirement; no mandatory vars unless genuinely required (likely none for foundation).