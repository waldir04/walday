# Research: Initial Application Foundation

**Sources**: `spec.md`, `plan.md`, `.specify/memory/constitution.md`, current `frontend/` source and configuration.

**Scope**: Frontend-only foundation. No Express, PostgreSQL, Prisma, authentication, weather, or PWA implementation is introduced.

## Decision 1 — Runtime and package management

**Decision**: Node.js 24 LTS, npm, committed lockfiles, and matching CI/runtime versions.

**Rationale**: The constitution requires a pinned Node.js LTS version and committed lockfiles. Node 24 is a supported LTS line aligned with the installed `@types/node` major. npm is already used by the repository and its lockfile.

**Alternatives considered**: Node 22 LTS (supported but older LTS line), Node 20 (end-of-life risk and inconsistent with the installed Node 24 types), pnpm/yarn (would add migration and tooling churn without a current need).

## Decision 2 — Strict TypeScript and test typechecking

**Decision**: Enable `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` in `tsconfig.app.json` and `tsconfig.node.json`; add `tsconfig.test.json` for tests.

**Rationale**: Constitution Principle II makes these settings non-negotiable. The current app config omits strictness and excludes `tests/`, so tests are not typechecked.

**Alternatives considered**: `strict` alone (misses indexed-access and override safety), excluding tests from typechecking (leaves test code unverified), per-file suppressions (violates the no-unjustified-escape rule).

## Decision 3 — FSD aliases, public APIs, and storage ownership

**Decision**: Use `@/*` aliases, add public `index.ts` APIs to feature/entity slices, remove high-layer imports of slice internals, and move entity-dependent storage out of `shared/lib` into entity model/storage modules.

**Rationale**: Constitution Principle III requires downward imports, public APIs, aliases, and no business logic in `shared`. Current `shared/lib/*Storage` imports entities, and pages import feature internals.

**Alternatives considered**: Keeping relative imports (violates alias/boundary rules), keeping storage in `shared` (upward dependency), moving every domain model immediately (larger refactor; task model move is deferred).

## Decision 4 — TanStack Query at the application root

**Decision**: Add one `QueryClient` and `QueryClientProvider` at the root with deliberate documented defaults, plus a minimal `queryKeys` factory/convention. Do not add business queries or mutations.

**Rationale**: Constitution Principle XVII makes TanStack Query the only server-state mechanism and requires query keys to be produced by a key factory. The current app has no provider or key convention; the foundation must establish both without inventing business data.

**Alternatives considered**: Deferring TanStack Query until the first server feature (leaves a known constitutional gap), ad-hoc query-key arrays (prohibited), manual `fetch`/`useEffect` server state (prohibited), multiple clients/stores (prohibited).

## Decision 5 — i18n defaults, switching, and browser detection

**Decision**: Initialize i18next with English as `lng` and `fallbackLng`, require English/Spanish resources for all user-facing text, expose a typed language-change mechanism, update `document.documentElement.lang`, and add no new visible selector. Start in English when no explicit stored preference exists; allow an explicit stored preference to override; defer implicit browser detection.

**Rationale**: The spec clarification chose an English default and mechanism-only switching. English is canonical, Spanish is required, and the constitution prohibits hardcoded user-facing text. Implicit browser detection would contradict the clarified default.

**Alternatives considered**: Adding a visible selector in the foundation (duplicates user-preferences scope), preserving implicit browser detection (contradicts the English default), detecting language in the foundation module (contradicts the clarified boundary).

## Decision 6 — Tailwind `@theme` as the sole token source

**Decision**: Consolidate the semantic palette, typography, spacing, radius, shadow, and density tokens in `src/index.css` `@theme`; remove duplicated token definitions from the legacy Tailwind config.

**Rationale**: Constitution Principle VI requires a single token source in the Tailwind v4 `@theme` block and the required semantic palette. The current CSS has only five tokens and `tailwind.config.ts` duplicates them.

**Alternatives considered**: Keeping the legacy config (duplicate source), CSS-in-JS (prohibited), ad hoc utility values (violates token discipline).

## Decision 7 — Error containment

**Decision**: Implement a real app-level class `ErrorBoundary` and a React Router route-level error surface with localized recovery, focus, announcement, and safe logging.

**Rationale**: Constitution Principles IX and XIII require fault isolation, localized error states, focus management, and accessible announcements. The current `ErrorBoundary` is a pass-through.

**Alternatives considered**: A single app-wide boundary only (loses route containment), unlocalized developer errors (violates i18n/resilience), a third-party boundary dependency (not needed).

## Decision 8 — Loading, empty, error, and success states

**Decision**: Use layout-matching skeletons with `aria-busy` and live regions; provide empty/error/success primitives with actionable CTA/retry only when meaningful.

**Rationale**: Constitution Principle VI requires skeleton loading for async surfaces, and the spec requires defined conventions even before business async data exists. The current `Loading` is loose text.

**Alternatives considered**: Spinner or text-only loading (spec prohibits as sole treatment), layout-shifting placeholders (violates UX requirements), deferring the primitives (leaves the convention unimplemented).

## Decision 9 — Environment configuration

**Decision**: Validate environment configuration with Zod in a centralized module; no variables are required; `VITE_API_BASE_URL` is optional and must be a valid URL when present; invalid values fail fast safely.

**Rationale**: Constitution Principle XI requires typed, centralized, Zod-validated configuration and fail-fast behavior. The current `env.ts` is an empty stub and `.env.example` is empty.

**Alternatives considered**: A required API URL (unnecessary before a backend exists), raw `import.meta.env` access (prohibited), silently ignoring invalid values (unsafe).

## Decision 10 — Zod storage boundaries

**Decision**: Add Zod schemas for stored preferences, commitments, and tasks; parse untrusted `localStorage` with `safeParse`; preserve current defaults/drop semantics and unavailable-storage behavior.

**Rationale**: Constitution Principle II and the storage rules require runtime validation of browser storage. The current preferences/commitments use handwritten sanitizers and tasks use an unchecked `as Task[]` assertion.

**Alternatives considered**: Keeping manual sanitizers (not Zod, weaker contract), trusting `JSON.parse` (unsafe), migrating storage formats (unnecessary and risky).

## Decision 11 — Accessibility verification

**Decision**: Run axe-core checks in component/integration tests, verify keyboard behavior manually, and use VoiceOver + Safari on macOS/iOS as the manual screen-reader baseline. Lighthouse is a development/CI measurement tool, not a runtime dependency.

**Rationale**: Constitution Principle XIII requires automated checks plus manual keyboard and screen-reader verification; the spec clarification selected VoiceOver + Safari.

**Alternatives considered**: Automated checks only (insufficient), Lighthouse alone (not a keyboard/screen-reader test), NVDA on Windows (valuable but unavailable in the current environment; broader matrix deferred).

## Decision 12 — Lint and formatting

**Decision**: Standardize on ESLint + Prettier, wire `eslint-config-prettier`, add TypeScript strictness/import-boundary rules, and remove unused oxlint configuration/dependency.

**Rationale**: Constitution Principle XX permits development-only linters and forbids duplicate concerns. The current ESLint config uses only the TypeScript parser and does not enforce `no-explicit-any`; oxlint is installed but unused.

**Alternatives considered**: oxlint-only (would require a toolchain migration), keeping both linters (duplicate tooling), no import-boundary rules (weakens FSD enforcement).

## Decision 13 — Git hooks and root tooling

**Decision**: Add a minimal root development-only `package.json` with Husky/lint-staged and delegating scripts; keep frontend scripts independently runnable. Pre-commit runs fast lint/format checks; pre-push runs typecheck, tests with coverage, and build.

**Rationale**: The current root `.husky` hooks call root `npm run ...` but no root package exists. Constitution Principle XVI requires runnable, documented hooks that use the canonical scripts.

**Alternatives considered**: Only changing hooks to `npm --prefix frontend` (works locally but leaves hook installation undocumented), moving Husky into `frontend` (awkward `.git` root resolution), no hooks (violates the strategy).

## Decision 14 — CI

**Decision**: CI uses Node 24, installs reproducibly from root/frontend lockfiles, and runs `lint`, `format:check`, `typecheck`, `test:coverage`, and `build`. CI is required for pull requests; the default branch is protected and changes integrate through PRs with review.

**Rationale**: Constitution Principle XVI requires independent CI gates and a documented workflow; the current workflow uses Node 20 and runs only lint/typecheck/test/build from `frontend/`.

**Alternatives considered**: Node 20 (version mismatch), duplicating command logic in CI (drift risk), relying on hooks (not enforceable across contributors), direct pushes to the default branch (bypasses review).

## Decision 15 — Coverage

**Decision**: Use `@vitest/coverage-v8` with 80% global and approximately 90% critical business-logic coverage; document justified exclusions for bootstrap/config/tooling files.

**Rationale**: Constitution Principle VII sets these thresholds. The foundation must configure them now; exclusions prevent meaningless coverage of non-executable entry files.

**Alternatives considered**: No coverage configuration (violates the constitution), 100% targets (encourages artificial tests), lowering thresholds for existing features (hides risk).

## Decision 16 — Router factory for testability

**Decision**: Export the route table and a router factory, keep a browser router for production, and use `createMemoryRouter` in tests.

**Rationale**: The current router is created at module scope, making direct-route, 404, and history tests difficult. A factory keeps production behavior and makes route contracts testable.

**Alternatives considered**: Testing pages directly only (does not verify route behavior), mocking the router module (brittle), adding a browser E2E dependency (outside the approved stack).

## Decision 17 — Lazy loading and performance baseline

**Decision**: Lazy-load non-initial routes where meaningful, use the skeleton as the route fallback, declare the system-font fallback strategy, verify no render-blocking third-party font, and record the production bundle/initial-load baseline before setting a numeric budget.

**Rationale**: Constitution Principle VIII requires route-level efficiency and measured performance. A baseline is needed before a meaningful hard budget can be set.

**Alternatives considered**: Eagerly loading every page (larger initial bundle), setting an arbitrary bundle number (not evidence-based), adding a performance framework (unnecessary).

## Decision 18 — Preserve existing features and record debt

**Decision**: Preserve features 002–004, storage keys, routes, domain behavior, and tests. Externalize all user-facing business copy as required by the constitution. Defer the task-model move to `entities/task`, business-form token adoption, and a custom accessible commitment-deletion dialog (the current native confirm is localized).

**Rationale**: The spec is a foundation feature, not a rewrite. Existing behavior must not regress, and debt should be explicit rather than hidden.

**Alternatives considered**: Refactoring all business features now (scope explosion), ignoring the debt (misleading readiness), removing existing features to match the greenfield spec (regression).

## Decision 19 — Backend stack boundary

**Decision**: Do not implement Express, PostgreSQL, Prisma, backend Vitest, API clients, or database schemas in Specification 001. Document them as the future production backend stack and preserve independent deployment and a validated future base URL boundary.

**Rationale**: The spec explicitly excludes full backend implementation and database design. The production stack includes Node.js, Express, Zod, PostgreSQL, Prisma, and backend Vitest, but they belong to a future backend feature.

**Alternatives considered**: Scaffolding a backend prematurely (violates scope), adding Prisma models without a database feature (unjustified), mixing server code into the foundation (violates independent deployment).

## Known Conflicts and Resolutions

| Conflict | Resolution |
|---|---|
| Foundation English default vs existing preferences browser detection | Start in English when no explicit stored preference exists; allow an explicit stored preference to override; defer implicit browser detection and update the affected tests. |
| Spec excludes business features vs repository already contains 002–004 | Treat existing features as consumers; do not rewrite domain behavior. Externalize all user-facing copy; record the task-model, business-form token-adoption, and custom commitment-dialog debt. |
| Partial dependency metadata from an interrupted attempt | `frontend/package.json`/lock already contain TanStack Query and Zod. Reconcile all dependencies in Phase 1; do not assume the remaining dev dependencies are installed. |
| Companion artifacts drift | Re-run the cross-artifact check whenever `spec.md`, the plan, or the stack changes; the current artifacts are aligned as of 2026-11-12. |
| Backend stack in the stated production stack vs frontend-only spec | Document the backend stack as a future boundary only; no Express/PostgreSQL/Prisma code in this feature. |

## Stack Version Reference

| Area | Approved stack | Use in this feature |
|---|---|---|
| UI | React 19, React DOM 19 | Current frontend runtime. |
| Language/build | TypeScript 5.9, Vite 8 | Strict typechecking and production build. |
| Styling | Tailwind CSS 4 via `@tailwindcss/vite` | `@theme` is the sole token source. |
| Routing | React Router 7 | Route table/factory, deep links, 404. |
| Server state | TanStack Query 5 | Root client/provider only; no business queries. |
| Validation | Zod 4 | Environment and storage boundaries. |
| i18n | i18next 26, react-i18next 17 | English/Spanish resources and switching mechanism. |
| Frontend testing | Vitest 5, React Testing Library, jest-dom, jsdom, axe-core, `@vitest/coverage-v8` | Unit/component/a11y/coverage. |
| Runtime/tooling | Node.js 24 LTS, npm, ESLint, Prettier, Husky, lint-staged | Dev/CI and hooks. |
| Future backend | Node.js LTS, Express, Zod, PostgreSQL, Prisma, Vitest | **Not implemented in Specification 001.** |
