# Plan: Upgrade `constitution.md` to Commercial Production Standard (v2.0.0)

## Answer on plan-file lifecycle

Plan files are working artifacts saved under `.kilo/plans/`. They are **not deleted automatically** after implementation; they remain on disk until removed manually. They are not part of the application deliverable and should not be committed (`.kilo/plans/` is currently untracked but not git-ignored, so exclude it explicitly when staging). All project documents and code authored here are in English.

## Objective

Rewrite `.specify/memory/constitution.md` in English as an enforceable production standard that locks the approved stack and adds architecture, UX, data, integration, and Definition of Done requirements. **Only that file changes.** No code, scaffolding, dependencies, or feature specs.

## Audit findings

- Current constitution (v1.0.0, 405 lines) is a compressed copy of `docs/prompt_constitution_walday.md`: 16 principles (I–XVI) but shallow, with the stack still framed as "candidate"/"preferred".
- Gaps to fix: TanStack Query merely "preferred"; backend lacks mandatory layers and `body/params/query` validation; no skeleton/empty/error requirements; no Prisma/transaction rules; Open-Meteo without timeout/cache/fallback; Tailwind without palette, type scale, or `focus-visible`; quality gates without Definition of Done.
- Prompt inconsistencies: says "15 principles" but defines 16; calls the stack mutable, which conflicts with the current instruction to lock it.
- Repo gaps the new constitution must set as targets (do not fix now):
  - `frontend/package.json` has no `@tanstack/react-query`.
  - `frontend/tsconfig.app.json` does not set `"strict": true`.
  - `frontend/src/shared/ui/Loading.tsx` is a text placeholder, not a skeleton.
  - Tokens duplicated between `frontend/tailwind.config.ts` and `frontend/src/index.css` (`@theme`).
  - `frontend/src/shared/config/env.ts` is an unvalidated stub.
  - No `backend/` directory exists yet.
- Existing `specs/001..004/plan.md` reference "Principle I–XVI": **preserve numbering and names** for traceability; append XVII–XX.

## Design decisions

1. **Version 2.0.0 (MAJOR)**: existing rules are tightened (e.g., TanStack Query becomes exclusive) and new mandatory principles are added. Keep `Ratified: 2026-10-30`; set `Last Amended: 2026-11-12`.
2. **Keep I–XVI** and enrich in place; add XVII–XX at the end of `Core Principles`.
3. **Lock the stack** in a dedicated section; stack changes require a constitutional amendment, not a feature decision.
4. **Transitional compliance clause**: new code complies immediately; existing code is brought into compliance when touched. Prevents blocking features on prior debt without weakening the standard.
5. **No new libraries by mandate**: Lighthouse, axe-core, Husky, lint-staged are evaluation/CI tools, never forced runtime dependencies. Open-Meteo uses native `fetch`. TanStack Query is the only necessary runtime addition and is part of the approved stack.
6. **Anti-false-positive clarification**: `useEffect` is forbidden for HTTP; allowed for non-network side effects (localStorage persistence sync, subscriptions, focus, timers). Guest mode uses localStorage and is not server state.

## Target document structure

```text
# Walday Constitution
## Core Principles            (I–XX, explicit MUST/SHOULD)
## Technology Stack and Architectural Boundaries
## Development Workflow, Quality Gates, and Definition of Done
## Architectural Decisions Intentionally Deferred
## Governance                  (versioning, amendments, transitional compliance)
**Version**: 2.0.0 | **Ratified**: 2026-10-30 | **Last Amended**: 2026-11-12
```

## Normative content by section

### I. Clean Code, SOLID, and Simplicity (NON-NEGOTIABLE)
Keep current rules; add: reviewable file/component/function size; one reason to change per module; no speculative abstractions; self-documenting code; comments only for non-obvious decisions; business logic outside UI/HTTP/infrastructure.

### II. Strict TypeScript and Type Safety (NON-NEGOTIABLE)
- `strict: true` mandatory in every `tsconfig`; also `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.
- `any` prohibited (explicit and implicit). `@ts-ignore`/`@ts-expect-error` require adjacent justification; `as` and `!` only at validated boundaries with justification.
- `unknown` plus narrowing for all external data; runtime Zod validation at HTTP, localStorage, env, and third-party API boundaries.
- Contracts derived from Zod schemas (`z.infer`) as the single source; no duplicated types across layers.
- Prefer literal unions over TS `enum`; never expose Prisma types through the API.

### III. Frontend Architecture: Feature-Sliced Design (NON-NEGOTIABLE)
- Layers `app → pages → widgets → features → entities → shared`; imports flow downward only; no cross-imports between features/entities; public API via `index.ts`.
- `shared` holds no business rules; data hooks live in `entities`/`features`; no fetching in `shared`.
- No deep `../../../` imports; use path aliases.
- Tests colocated or mirrored in `tests/` without breaking layer structure.

### IV. Backend Layered Architecture (NON-NEGOTIABLE)
- Mandatory flow `routes → controllers → services → repositories`, with validation, auth, 404, and error middleware.
- `routes`: path + middleware wiring only; `controllers`: parse validated input, call service, map HTTP response, no business logic or Prisma; `services`: framework-agnostic rules, transaction orchestration, typed domain errors; `repositories`: sole Prisma access point, no HTTP.
- Zod validation mandatory on **every** endpoint for `body`, `params`, and `query`; `.strict()` bodies unless justified; handler types inferred from schemas.
- Centralized error middleware: single envelope, stable codes, HTTP status mapping, no stack traces or internals in production, correlated logging; async errors must reach it without unhandled rejections.
- Typed config validated at startup (fail-fast); per-environment CORS allowlist (no `*` with credentials); body limits; rate limiting on sensitive endpoints (edge/proxy or approved middleware).
- Never couple Express or Prisma to business rules.

### V. React Component Design and Reusability
Keep current rules; add: presentational components perform no fetching or business logic; typed props and discriminated-union variants; composition over configuration; state as local as possible; memoization only with evidence; avoid deep prop drilling via composition, not indiscriminate global context; controlled forms with a shared Zod schema and errors linked via `aria-describedby`.

### VI. UI System, Styling, and Visual Consistency (NON-NEGOTIABLE)
- Tailwind CSS is the **only** styling mechanism: no CSS-in-JS, no component kits, no inline styles without justified technical need.
- Tokens in **one source** (Tailwind v4 `@theme`); consistent semantic palette (`primary`, `surface`, `muted`, `border`, `danger`, `success`, `warning`, `focus`) meeting AA contrast; no raw hex in components; arbitrary values only when justified.
- Explicit type hierarchy (display/title/body/caption) and coherent spacing, radius, shadow, and density scales.
- Semantic HTML; `focus-visible` mandatory on every interactive element; mobile-first, fully responsive, verified at 360/768/1024/1440 px; no horizontal scroll; touch targets ≥24×24 px (44 px recommended).
- Mandatory async UX states on every async surface: **skeleton** matching the final layout (not a spinner or loose text), **empty state** with explanation and primary CTA, **error state** with localized message and retry, success feedback; `aria-busy` and live-region announcements; avoid CLS.
- Minimal motion respecting `prefers-reduced-motion`; calm, friendly, minimalist identity; light theme by default.

### VII. Testing Strategy and Quality Assurance (NON-NEGOTIABLE)
- Vitest + React Testing Library (frontend); Vitest for backend services/repositories; route integration against the real app with network mocked.
- AAA structure, observable behavior, no implementation-coupled tests or snapshot-only evidence; deterministic time/timers; no real network in unit tests.
- Cover loading/success/empty/error, Zod validation, authorization/ownership, transactions and rollback, error middleware, critical UI journeys, keyboard, and accessible roles.
- Minimum 80% global coverage, ~90% on critical logic; exclusions justified and documented; coverage never chased at the expense of quality.
- **No task is complete without relevant tests written and green.**

### VIII. Performance and Resource Efficiency
Keep current rules; add: route-level code splitting, deliberate TanStack Query `staleTime`, no request waterfalls, optimized images, bundle-size review for new dependencies, Core Web Vitals/Lighthouse; backend: explicit `select`, no N+1 or unbounded queries; concrete budgets stay deferred.

### IX. Resilience, Fault Isolation, and Degradation
- Failure of non-critical services (weather) never blocks tasks, agenda, or dashboard; explicit localized `stale`/`unavailable` states.
- Timeouts, bounded retries with backoff, TTL cache, fallback to last-known-good data; never propagate raw provider errors; stable codes.
- Per-feature isolation; partial degradation where the contract allows; no premature distributed infrastructure.

### X. API Contracts and Independent Deployment (NON-NEGOTIABLE)
- Zod as contract source of truth; shared/synchronized schemas with contract tests; error envelope `{ error: { code, message, details? } }` with machine-readable codes.
- Correct HTTP status codes; no internal leakage; explicit CORS; appropriate cache headers; never cache user-specific responses in shared caches.
- Frontend and backend deploy independently; API versioning deferred.

### XI. Constants, Configuration, and Environment Management (NON-NEGOTIABLE)
- Typed env validated with Zod at startup (frontend and backend); fail fast on missing config.
- Frontend exposes only public `VITE_*` values; **never** secrets in the client; env access centralized in a config module (no scattered `import.meta.env`).
- Timeouts, TTLs, limits, and origins as named per-environment config; `.env.example` maintained; no hardcoded URLs/credentials.
- Pragmatic exception retained: simple self-explanatory literals may stay inline.

### XII. Security and Data Protection (NON-NEGOTIABLE)
Keep current rules; add: authorization and ownership checks on every protected resource (anti-IDOR); password hashing with an established algorithm; `httpOnly`/`Secure`/`SameSite` cookies if cookie auth is chosen; no tokens in localStorage; CSRF where applicable; CSP and security headers; payload limits; rate limiting on auth; logs free of PII/secrets; `dangerouslySetInnerHTML` prohibited without justified sanitization; parameterized Prisma queries; localStorage treated as untrusted and validated on read; guest data-loss warning.

### XIII. Accessibility and Inclusive Design (NON-NEGOTIABLE)
Keep all current requirements; reinforce: visible consistent `focus-visible`; 4.5:1 text / 3:1 UI contrast; minimum WCAG 2.2 target size (24 px); skip link; heading hierarchy; focus management in dialogs/menus; field errors associated plus accessible error summary; async states announced (skeleton `aria-busy`, live regions with i18n text); weather/suggestions never conveyed by icon/color alone; document `lang` follows locale; keyboard and screen-reader checks on critical journeys; violations on critical journeys are defects.

### XIV. Internationalization and Localization (NON-NEGOTIABLE)
Keep current rules; use the existing `i18next`/`react-i18next` (introduce no other i18n library); zero hardcoded user-facing text; descriptive per-feature keys; safe pluralization/interpolation; `Intl` for dates/numbers/units; language, timezone, and units independent; switch without reload; English fallback; backend returns codes, not localized messages.

### XV. Documentation and Technical Communication
Keep current rules; ADRs for durable architectural decisions; setup/env/workflow docs; API contracts; documentation in English; update docs with architectural changes.

### XVI. Automated Quality Gates and Git Hooks
Keep current rules; define the script contract: `lint`, `typecheck`, `test`, `build` in each app; fast pre-commit (lint/format), pre-push (`typecheck + test + build`); CI mandatory on PR using the same commands; hooks never replace CI; bypass only exceptional.

### XVII. Frontend Server State and Async UX (NON-NEGOTIABLE) — new
- TanStack Query is the **only** server-state mechanism: `useQuery`/`useMutation`; forbidden: `useEffect` for HTTP, manual `fetch` in components, parallel stores for server data.
- Single `QueryClient`; query-key factory; deliberate `staleTime`/`gcTime`/refetch; invalidation after mutations; optimistic updates only with rollback and error feedback; clear cache on sign-out; never persist sensitive query data.
- Every mutation exposes pending state, prevents double submit, and never fails silently.
- Explicit exception: `useEffect` is allowed for non-network effects (local persistence sync, subscriptions, focus, timers). Guest localStorage data is not server state and must be encapsulated in a storage/repository layer, never scattered in components.
- Every async surface implements skeleton/empty-with-CTA/error-with-retry (see VI).

### XVIII. Data Integrity and Persistence with Prisma (NON-NEGOTIABLE) — new
- PostgreSQL + Prisma are the official persistence layer; `schema.prisma` is the source of truth; migrations versioned and committed; `db push` forbidden in production.
- Typed Prisma Client; explicit `select`; no `$queryRaw` without justification and parameterization; no Prisma types leaking into the API; map to domain models/DTOs.
- Transactions mandatory for multi-write invariants (guest→account migration, accepting rescheduling suggestions, create/update with conflict checks); no partial writes; keep transactions short.
- Constraints and indexes for real filters (e.g., `userId` + date); explicit FKs and `onDelete`; timestamps; UUIDs; enums for status/type.
- Every user-resource query includes `userId`; the repository enforces ownership; optimistic concurrency (`updatedAt`/version) where it matters.
- Guest data: versioned schema, validated on read, explicit safe migration; never mix local and remote without a defined strategy.

### XIX. External Integrations and Weather Resilience (NON-NEGOTIABLE) — new
- Open-Meteo via native `fetch` through a **backend proxy** (no SDK); the client never calls the provider directly; validate responses with Zod and map to an own domain model (no provider DTOs in the UI).
- Timeout via `AbortController` (configurable, ~3–5 s); bounded retries on GET only; backoff with jitter.
- TTL cache by location/units/time window; background revalidation; brief negative caching; fallback to last valid data marked `stale`.
- Provider errors map to stable codes (`WEATHER_UNAVAILABLE`, `WEATHER_STALE`); log without PII; honor usage terms/attribution.
- Weather is optional context: never a dependency for tasks, agenda, or dashboard.

### XX. Technology Stack Governance and Dependency Discipline (NON-NEGOTIABLE) — new
- Approved stack (table in the stack section): React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, i18next/react-i18next, Vitest, RTL; Node.js, Express, Zod, Prisma, PostgreSQL; Open-Meteo.
- A new runtime dependency requires documented justification: need, alternatives, weight/impact, license, security, constitutional fit; prefer platform APIs and existing dependencies.
- Duplicated concerns prohibited by default: axios (use `fetch`), Redux/MobX/Zustand for server state, CSS-in-JS or UI kits, form libraries duplicating Zod, date libraries (use `Intl`), `lodash`/`moment` without justification.
- Dev-only tooling (ESLint/oxlint, Prettier, Husky, lint-staged, axe/Lighthouse in CI) is allowed without amendment, documented.
- Lockfiles committed; Node version pinned; updates reviewed; nothing deprecated/unmaintained.

### Technology Stack and Architectural Boundaries
- Closed frontend/backend/data/integration/testing table, with major versions where clarity helps.
- Boundaries: React SPA + independent JSON API; no GraphQL or microservices; `frontend/` and future `backend/`; configurable environments/origins.
- Stack changes require a constitutional amendment (MAJOR/MINOR), not a feature decision.

### Development Workflow, Quality Gates, and Definition of Done
- Spec Kit flow: review `product-overview.md` + constitution → spec → plan (with Constitution Check) → tasks → implementation.
- **Task DoD**: `lint`, `typecheck`, `test`, `build` green; new tests for critical logic/flow; no `any`; Zod validation at boundaries; loading/empty/error states; keyboard + responsive verified; copy in `en` and `es`; docs/ADR updated; no secrets; CI green.
- Code review against the constitution; exceptions recorded and justified; AI-generated code held to the same standard.

### Architectural Decisions Intentionally Deferred (update)
Remove already-decided items (database, ORM, backend stack, server state, weather provider). Keep: auth provider and session/token strategy; guest→account migration strategy; API versioning; offline/PWA and sync; hosting/deployment; observability; performance budgets; shared-contract mechanism; where rate limiting is enforced.

### Governance
- Constitution prevails over specs/plans/tasks; conflicts resolved explicitly.
- Amendments intentional and reviewed; never weaken principles for convenience; exceptions documented as ADRs.
- Semantic versioning; this revision is **2.0.0** because existing rules tighten and new mandatory principles are added.
- Transitional compliance clause (prior code aligns when touched; new code complies now) and a known-gaps register.

## Implementation tasks

1. Rewrite `.specify/memory/constitution.md` with the structure and content above, preserving I–XVI and appending XVII–XX.
2. Add the closed stack table and boundaries section; remove "candidate/preferred" language for decided items.
3. Replace the deferred-decisions section with the pruned list.
4. Add Workflow/DoD and the transitional compliance clause.
5. Update Governance and the footer to v2.0.0 with `2026-10-30` / `2026-11-12`.
6. Verify consistency: no internal contradictions, no new required libraries, no code, uniform `MUST`/`SHOULD` terminology, valid Markdown.

## Validation checklist

- [ ] All 20 principles exist; I–XVI keep name and number.
- [ ] Explicit prohibitions: `any`, `useEffect` for HTTP, non-Tailwind styling, wildcard CORS with credentials, client secrets, `db push` in production.
- [ ] Stack matches the user's instruction exactly; nothing new is mandatory beyond the approved list.
- [ ] Backend: layers, Zod `body/params/query`, error middleware, typed env.
- [ ] Data: typed Prisma, transactions, ownership, migrations.
- [ ] Open-Meteo: timeout, TTL cache, fallback, validation, decoupling.
- [ ] UI/a11y: palette, typography, semantics, `focus-visible`, responsive, skeleton/empty/error.
- [ ] Testing and DoD mandatory before task completion.
- [ ] Deferred decisions coherent (no re-deciding settled items).
- [ ] Correct version/dates; document entirely in English.

## Out of scope / follow-ups (do not execute now)

- Add `@tanstack/react-query` and `QueryClientProvider`.
- Harden `tsconfig` (`strict`, `noUncheckedIndexedAccess`, etc.).
- Replace `Loading.tsx` with skeletons; unify Tailwind tokens in `@theme`.
- Implement typed frontend env and backend scaffolding.
- Update existing specs/plans that cite now-stricter requirements.

## Risks

- The repo currently violates several points (TanStack Query, `strict`, skeletons, duplicate tokens, no backend): the constitution sets the target; do not claim compliance.
- "No `useEffect`" may be misread for localStorage: mitigated by the explicit exception and storage-vs-server-state separation.
- Over-specifying auth/versioning/PWA: keep deferred to avoid blocking future decisions.
