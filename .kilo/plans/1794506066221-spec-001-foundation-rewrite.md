# Implementation Plan: Initial Application Foundation

**Branch**: `001-initial-app-foundation` | **Date**: 2026-11-12 | **Spec**: `specs/001-initial-app-foundation/spec.md`

## Goal

Bring the existing Walday frontend into compliance with Specification 001 without removing or regressing the already-implemented task, preferences, and commitments features.

The plan establishes: strict TypeScript, FSD boundaries and public APIs, a semantic responsive shell, routing and not-found behavior, design tokens and accessible primitives, skeleton/error/empty/success conventions, English/Spanish localization with a mechanism-only language switch, TanStack Query at the root without business queries, validated environment configuration, and canonical local/CI quality gates.

Existing features 002–004 are consumers of the foundation, not new scope. No new business behavior is introduced.

## Implementation Status

This plan is approved for documentation alignment. The companion artifacts (`data-model.md`, `research.md`, `quickstart.md`, and `contracts/README.md`) and the 90-task `tasks.md` are updated to match this plan and `spec.md`. No `.ts` or `.tsx` source code is changed by this documentation pass.

## Code Inspection Findings (2026-11-12)

### Working Tree State

- `specs/001-initial-app-foundation/spec.md` is the updated source of truth.
- `frontend/package.json` and `frontend/package-lock.json` contain `@tanstack/react-query` and `zod` from an interrupted implementation attempt. Treat them as Phase 1 prerequisites or revert and reapply intentionally; do not assume the other new dependencies are installed.
- `specs/001-initial-app-foundation/tasks.md` contains the regenerated 90-task plan.
- No source files were changed by the interrupted attempt beyond package metadata.

### Current Gaps and Exact Impact

| Area | Evidence in the repository | Plan adjustment |
|---|---|---|
| Shell and landmarks | `frontend/src/widgets/AppShell.tsx` is a `div` with `Navigation` and `main`; no skip link, no named navigation landmark, no `main` target, raw `text-gray-900`. `Navigation.tsx` uses `Link` without active state or `aria-current`. | Phase 3 must replace the shell structure and navigation behavior. |
| Pages and routing | `app/router.tsx` creates the router at module scope; no route metadata, titles, error element, lazy loading, or memory-router factory. `HomePage` and `NotFoundPage` render only an `h1`; no home link on not-found. | Phase 3 must introduce the route table/factory, titles, focus/announcer, not-found recovery, and route error handling. |
| Document shell | `frontend/index.html` still has `<title>frontend</title>` and no `<noscript>` fallback. | Phase 3 must set the Walday base title and add the no-JS message. |
| Design tokens | `src/index.css` defines only `primary`, `surface`, `muted`, `font-sans`, and `radius-card`. `frontend/tailwind.config.ts` duplicates those tokens. Required `border`, `danger`, `success`, `warning`, `focus`, text, type, spacing, shadow, and density tokens are missing. | Phase 4 must consolidate in `@theme` and remove the legacy config. |
| Error and loading | `shared/ui/ErrorBoundary.tsx` is a pass-through; `shared/ui/Loading.tsx` is a text placeholder. | Phase 5 must implement the error boundary, route error surface, and skeleton primitive. |
| i18n | `shared/i18n/index.ts` hardcodes app/nav strings and merges feature JSON; `applyLanguage` takes a string and does not set `document.documentElement.lang`. `main.tsx` applies stored/resolved preferences before render. Existing `entities/preferences/model/defaults.ts` performs browser-language detection, and `tests/preferences-localization.test.ts` plus `tests/preferences-model.test.ts` require that behavior. | Phase 6 must add `common.json`, set `lang`, and preserve the existing preferences consumer behavior. Do not remove browser detection from feature 003 in this plan. |
| Business copy | `features/tasks/ui/TaskForm.tsx`, `TaskItem.tsx`, and `TaskList.tsx` contain hardcoded English labels and empty-state text. `PreferencesForm` and commitments UI use raw business colors. | Keep this plan scoped to foundation surfaces; record business copy/token adoption as follow-up debt. Do not claim full-app i18n completion in the readiness report. |
| FSD boundaries | `shared/lib/preferencesStorage.ts` and `shared/lib/commitmentsStorage.ts` import entity modules (upward dependency). Pages import feature internals (`features/.../model/...`, `features/.../ui/...`). `src/App.tsx` is a re-export shim. No feature/entity `index.ts` public APIs exist. | Phase 2 must move storage, add public APIs, update imports and tests, and remove the shim. |
| Task model location | `Task` and task storage live in `features/tasks`, not `entities/task`. | Keep the task model in place for this plan; moving it is follow-up domain refactoring, not a foundation blocker. |
| Strict TypeScript | `tsconfig.app.json` and `tsconfig.node.json` omit `strict`, `noUncheckedIndexedAccess`, and `noImplicitOverride`; tests are outside `tsconfig.app` and are not typechecked. Existing assertions include `TaskForm` priority cast, three `PreferencesForm` casts, `defaults.ts` casts, `sanitize.ts` type cast, and `validation.ts` type cast. | Phase 1 must enable all flags, add `tsconfig.test.json`, and audit/justify or replace the assertions. |
| Storage validation | `features/tasks/lib/storage.ts` uses `JSON.parse(raw) as Task[]`. Preferences and commitments use handwritten sanitizers, not Zod. | Phase 2 must add Zod storage schemas for tasks, preferences, and commitments while preserving current fallback/drop semantics and tests. |
| Environment config | `shared/config/env.ts` is an empty typed stub; `frontend/.env.example` is empty (0 bytes). No `import.meta.env` validation exists. | Phase 7 must add the Zod schema and document optional `VITE_API_BASE_URL`. |
| Server state | No `QueryClient` or `QueryClientProvider` exists. `@tanstack/react-query` and `zod` are already present in package metadata. | Phase 7 must add the root client/provider and preserve the no-business-query boundary. |
| Root mount | `main.tsx` uses `document.getElementById('root')!`. | Phase 3 must replace the non-null assertion with a guarded root lookup and a safe failure message. |
| Lint and formatting | `eslint.config.js` uses only the TypeScript parser; no `@typescript-eslint` plugin, no `no-explicit-any`, no import-boundary rules, and `eslint-config-prettier` is not wired in. `oxlint` and `.oxlintrc.json` exist but are not used by scripts. There is no `format:check` or `test:coverage` script. | Phase 1 must standardize on ESLint + Prettier, remove unused oxlint, and add scripts/rules. |
| Hooks and CI | `.husky/pre-commit` runs `npm run lint` and `.husky/pre-push` runs `npm run typecheck && npm test && npm run build` from the repository root, but there is no root `package.json`. CI runs `cd frontend && npm ci ...` on Node 20. | Phase 8 must fix hooks and CI. Add a root development-only package or update hooks to delegate with `npm --prefix frontend`; choose one and document it. |
| Tests | `tests/shell.test.tsx` only checks that “Walday” appears. Tests import `../src/App`, `shared/lib/*Storage`, and feature internals. No tests cover skip link, landmarks, route titles/focus, error boundary, skeleton, env validation, or foundation i18n parity. | Phase 8 must update imports and add the missing tests. |
| Docs | `frontend/README.md` is feature-oriented and lacks foundation setup, hook troubleshooting, viewport matrix, route map, and extension guidance. No ADRs. | Phase 8 must update documentation and add ADRs. |

### Decisions From Findings

1. **Preserve feature 003 browser detection.** The foundation i18n module initializes English; the existing preferences feature remains a consumer that may resolve and apply a supported browser language. Do not change `resolveLanguage` or its tests in this plan. Document that the effective full-app startup language can follow the preferences feature.
2. **Keep the task model in `features/tasks`.** Record the move to `entities/task` as follow-up debt; it does not block the foundation.
3. **Scope foundation cleanup.** Foundation surfaces (shell, navigation, not-found, error, loading, common translations) must comply. Existing business copy/tokens and `window.confirm` in commitments are tracked follow-up items, not silently claimed as complete.
4. **Use Zod at storage boundaries.** Add schemas for tasks, preferences, and commitments while preserving the existing default/drop behavior. This is required by the constitution even though the current code uses manual sanitizers.
5. **Fix hooks with a root development package.** Add a minimal root `package.json` that delegates to `frontend` scripts and installs Husky/lint-staged; keep the frontend independently runnable. This is the smallest reliable way to make the existing root `.husky` hooks work.
6. **Update tests with the refactor.** Moving storage and public APIs will require test import updates; do them in the same change as each move.

## Source Reuse vs Refactor

### Reuse Without Rewrite

- The existing FSD-oriented folder split: `app`, `pages`, `widgets`, `features`, `entities`, `shared`.
- React Router 7 and the existing route set: `/`, `/tasks`, `/settings`, `/commitments`, and catch-all not-found.
- Tailwind CSS 4 via `@tailwindcss/vite` and the existing `@theme` block with `primary`, `surface`, `muted`, `font-sans`, and `radius-card`.
- i18next 26/react-i18next 17 initialization and the existing English/Spanish feature namespaces.
- Existing guest behavior and storage keys for tasks, preferences, and commitments.
- Existing domain logic: preference sanitization, commitment validation/overlap, task creation/validation.
- Existing tests for tasks, preferences, commitments, storage, validation, and localization.

### Refactor Because It Is Too Simple or Constitutionally Incomplete

- `frontend/src/widgets/AppShell.tsx`: replace the plain `div` with semantic header/nav/main, skip-link target, and tokenized shell.
- `frontend/src/widgets/Navigation.tsx`: replace `Link` with `NavLink`, active state, `aria-current`, and accessible navigation naming.
- `frontend/src/app/router.tsx`: replace the module-scope browser router with a route table/factory, route titles, focus/announcement, error element, and lazy non-initial routes.
- `frontend/src/shared/ui/ErrorBoundary.tsx`: replace the pass-through with a real error boundary and localized recovery.
- `frontend/src/shared/ui/Loading.tsx`: replace the text placeholder with a layout-matching skeleton and live-region behavior.
- `frontend/src/pages/NotFoundPage.tsx`: add explanation, title, and working home recovery.
- `frontend/src/shared/config/env.ts`: replace the stub with a Zod-validated config module.
- `frontend/src/shared/i18n/index.ts`: move common strings to resources, set `document.lang`, and type the language-change mechanism.
- `frontend/src/index.css`: add the required semantic palette, typography, spacing, radius, shadow, density, focus, and reduced-motion tokens.
- `frontend/src/main.tsx`: remove the root non-null assertion and add the safe bootstrap/global-error boundary.
- `frontend/vite.config.ts`, `frontend/tsconfig*.json`, `frontend/eslint.config.js`: add strictness, aliases, test typechecking, coverage, and import/a11y rules.
- `.husky/*`, `.github/workflows/ci.yml`, `frontend/README.md`: make hooks runnable and align documentation/CI with the canonical scripts.

### Do Not Rewrite

- Do not change task, preference, or commitment domain behavior, storage keys, or existing user-visible feature routes.
- Do not move the task model to `entities/task` in this plan; record it as follow-up debt.
- Do not refactor business forms for token/i18n adoption in this foundation plan; record the debt.
- Do not add backend, database, authentication, weather, or PWA code.

## Technical Context

**Language/Version**: TypeScript 5.9 with all constitutional strict flags; React 19; Node.js 24 LTS pinned in the repository and CI.

**Primary Dependencies**: React 19, React Router 7, Tailwind CSS 4 via `@tailwindcss/vite`, i18next 26, react-i18next 17, TanStack Query, Zod, Vitest 5, React Testing Library, jest-dom, axe-core, ESLint, Prettier, Husky, lint-staged. Remove oxlint if it is not the canonical linter, to avoid duplicate tooling.

**Storage**: N/A for the foundation. Existing guest storage for features 002–004 remains; no new persistence. Storage modules currently in `shared/lib` that depend on entities move behind entity public APIs.

**Testing**: Vitest + React Testing Library + jest-dom + jsdom; axe-core helper; `@vitest/coverage-v8`; manual keyboard and VoiceOver + Safari checks.

**Target Platform**: Modern evergreen browsers; responsive at 360, 768, 1024, and 1440 pixel widths; macOS and iOS Safari for the manual screen-reader baseline.

**Project Type**: Frontend single-page application. Express, PostgreSQL, Prisma, backend Vitest, and the backend application are independently developed later and are out of scope for this feature.

**Performance Goals**: Record baseline production bundle and initial-load measurement; lazy-load non-initial routes where meaningful; no hard numeric budget until the baseline is measured. Use the baseline as a regression reference.

**Constraints**: WCAG 2.2 AA; light theme by default; calm, friendly, minimalist direction; English and Spanish; no required environment variables; no business features, Express backend, PostgreSQL, Prisma, authentication, weather, or PWA; strict TypeScript; FSD; preserve existing feature behavior.

**Scale/Scope**: One frontend SPA; home route, one foundation placeholder route, not-found route, and existing feature routes; foundation infrastructure only.

### Production Stack Applicability

| Layer | Technologies | This feature |
|---|---|---|
| Frontend runtime | React 19, React DOM 19, React Router 7, Tailwind CSS 4 via `@tailwindcss/vite`, TanStack Query, Zod, i18next 26, react-i18next 17, Vite | Used now; TanStack Query is configured at the root without business queries. |
| Frontend testing | Vitest 5, React Testing Library, jest-dom, jsdom, axe-core, `@vitest/coverage-v8` | Used now for unit/component tests, accessibility checks, and coverage. |
| Runtime and tooling | Node.js 24 LTS, npm, ESLint, Prettier, Husky, lint-staged | Used now; Node pinned and lockfiles committed. |
| Backend runtime and API | Node.js LTS, Express, Zod, Vitest | **Not implemented in this feature.** Future backend boundary only; no Express routes, middleware, or server code. |
| Persistence | PostgreSQL, Prisma | **Not implemented in this feature.** No schema, migrations, Prisma client, or database calls. Existing guest `localStorage` is not server state. |
| Deferred product areas | Authentication, cloud sync, weather, PWA, analytics, deployment | Out of scope for Specification 001. |

**Stack boundary**: The production backend stack is documented so the foundation does not block it, but Specification 001 remains frontend-only. Express, PostgreSQL, and Prisma MUST NOT be introduced until a backend feature specification authorizes them.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | Evidence / gate |
|---|---|---|---|
| I | Clean Code, SOLID, and Simplicity | PASS | Minimal shell primitives; no speculative state or abstraction layer; explicit FSD composition. |
| II | Strict TypeScript and Type Safety | PASS | Enable every strict flag; remove `any` and unjustified assertions; validate configuration and storage boundaries with Zod. |
| III | Frontend Architecture: Feature-Sliced Design | PASS | Public `index.ts` APIs; downward imports; aliases; move shared storage that depends on entities; remove cross-slice internals. |
| IV | Backend Architecture and Modular Design | N/A | No backend is implemented. Future backend boundary documented in FR-029. |
| V | React Component Design and Reusability | PASS | Shell primitives are small, typed, presentational, and composition-based. |
| VI | Styling, Design Tokens, and Visual Consistency | PASS | Consolidate tokens in `@theme`; required semantic palette and type/spacing scales; skeleton loading and mandatory async states. |
| VII | Testing Strategy and Quality Assurance | PASS | Vitest/RTL/axe-core; behavior-focused tests; coverage provider and thresholds; manual keyboard and screen-reader checks. |
| VIII | Performance and Resource Efficiency | PASS | Lazy non-initial routes; no unnecessary startup dependencies; record bundle/initial-load baseline. |
| IX | Scalability, Resilience, and Fault Isolation | PASS | App-level and route-level error containment; localized recovery; scoped failure handling. |
| X | API Contracts and Independent Deployment | PARTIAL / N/A | No API exists. Frontend/backend remain independently deployable; no endpoint contract introduced. |
| XI | Constants, Hardcoded Values, and Configuration Management | PASS | Centralized Zod-validated configuration; named tokens/constants; no scattered environment access. |
| XII | Security and Data Protection | PASS | No secrets, tokens in storage, unsafe HTML, or sensitive logging; deployment CSP/headers remain deferred with hosting. |
| XIII | Accessibility and Inclusive Design | PASS | Skip link, landmarks, focus management, AA contrast, target sizes, reduced motion, automated checks, VoiceOver + Safari baseline. |
| XIV | Internationalization and Localization | PASS | English/Spanish resources, English fallback, externalized text, runtime language-change mechanism, document language synchronization. |
| XV | Documentation and Technical Communication | PASS | README, ADRs, route/primitive/translation extension guidance, hook troubleshooting. |
| XVI | Automated Quality Gates and Git Hooks | PASS | Canonical scripts, runnable hooks, required CI, no hook-only validation. |
| XVII | Frontend Server State and Async UX | PASS | Single TanStack Query client/provider at the root with documented defaults; no business queries or manual fetch in components. |
| XVIII | Data Integrity and Persistence with Prisma | N/A | No database or persistence implemented. Existing guest storage is not server state. |
| XIX | External Integrations and Weather Resilience | N/A | Weather integration is explicitly out of scope. |
| XX | Technology Stack Governance and Dependency Discipline | PASS | Approved stack only; new dependencies justified; Node pinned and lockfiles committed. |

**Gate result**: PASS. No constitutional violations require a Complexity Tracking entry.

## Project Structure

### Spec Kit artifacts

```text
specs/001-initial-app-foundation/
├── plan.md              # This plan
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 foundation contracts
├── quickstart.md        # Phase 1 validation guide
├── contracts/README.md  # Internal frontend contracts
└── tasks.md             # 90-task regenerated plan
```

### Source Code

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx
│   │   ├── queryClient.ts
│   │   ├── router.tsx
│   │   └── RouteAnnouncer.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── FoundationPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── existing feature pages
│   ├── widgets/
│   │   ├── AppShell.tsx
│   │   └── Navigation.tsx
│   ├── features/
│   │   ├── tasks/index.ts
│   │   ├── user-preferences/index.ts
│   │   └── commitments/index.ts
│   ├── entities/
│   │   ├── preferences/index.ts
│   │   │   └── model/storage.ts
│   │   └── commitment/index.ts
│   │       └── model/storage.ts
│   ├── shared/
│   │   ├── ui/                  # Button, Link, Container, Skeleton, EmptyState, ErrorState
│   │   ├── lib/                 # formatting and framework-agnostic utilities
│   │   ├── config/              # env schema and shared constants
│   │   ├── i18n/                # init, language mechanism, en/es resources
│   │   └── test/                # setup and axe helper
│   └── main.tsx
├── tests/
├── index.html
├── vite.config.ts
├── tsconfig.app.json
├── tsconfig.node.json
├── tsconfig.test.json
├── eslint.config.js
├── .prettierrc
├── .env.example
└── package.json
.husky/
.github/workflows/ci.yml
package.json                     # root development tooling + delegating scripts
```

**Structure Decision**: Frontend-only FSD application. Existing feature slices remain; the foundation adds public APIs, aliases, shell, shared primitives, and quality infrastructure. `frontend/tailwind.config.ts` is removed after token consolidation so `src/index.css` `@theme` is the sole token source.

## Implementation Phases

### Phase 1 — Tooling, strictness, and dependency baseline

1. Pin Node.js 24 LTS in `.nvmrc` and `frontend/package.json` `engines`; update `.github/workflows/ci.yml` from Node 20 to Node 24. The current CI and `@types/node` versions disagree; make them consistent.
2. Enable `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` in `frontend/tsconfig.app.json` and `frontend/tsconfig.node.json`. Add `frontend/tsconfig.test.json` covering `src`, `tests`, and `src/test/setup.ts`, with the Vitest globals/types needed; reference it from `frontend/tsconfig.json` so `tsc -b` typechecks tests.
3. Reconcile the partially installed dependencies: `frontend/package.json` and its lock already contain `@tanstack/react-query` and `zod` from the interrupted attempt. Install the still-missing approved dependencies: `@vitest/coverage-v8`, `axe-core`, and `@typescript-eslint/eslint-plugin`; add `husky` and `lint-staged` through the root development package. Do not add business/runtime dependencies.
4. Add `@/*` → `src/*` path aliases in TypeScript and Vite. Replace directory-climbing relative imports with aliases.
5. Add a minimal root `package.json` for development tooling only, with delegating scripts: `lint`, `typecheck`, `test`, `test:coverage`, `build`, `format:check`, and `prepare: husky`. Keep `frontend/` scripts independently runnable and deployable. Commit a root lockfile if the root package has dependencies.
6. Standardize on ESLint + Prettier. Wire `eslint-config-prettier` into `eslint.config.js`; remove `oxlint` and `.oxlintrc.json` if it remains unused by scripts. Add `format:check` and `test:coverage` scripts.
7. Add ESLint rules: `@typescript-eslint/no-explicit-any`, hooks rules, no directory-climbing imports, and `no-restricted-imports` patterns that block deep imports into `@/features/*/*`, `@/entities/*/*`, and upward layer imports from `shared`, `entities`, and `features`.
8. Audit the existing assertions and replace UI-level casts where practical: `TaskForm` priority cast, `PreferencesForm` language/date/unit casts, `defaults.ts` casts, `sanitize.ts` commitment type cast, and `validation.ts` commitment type cast. Keep only assertions at validated boundaries with written justification.

**Acceptance**: `typecheck` fails on a deliberately introduced `any` or deep import; `lint` blocks directory-climbing imports; tests are included in typechecking; Node version is documented and CI matches.

### Phase 2 — FSD public APIs and boundary cleanup

1. Add `index.ts` public APIs:
   - `features/tasks/index.ts`: `TaskForm`, `TaskList`, task types, `createTask`, `validateTitle`, `loadTasks`, `saveTasks`.
   - `features/user-preferences/index.ts`: `PreferencesProvider`, `usePreferencesContext`, `PreferencesForm`, preference types.
   - `features/commitments/index.ts`: `useCommitments`, `CommitmentForm`, `CommitmentList`, draft/error types.
   - `entities/preferences/index.ts`: preference types, defaults, validation, storage.
   - `entities/commitment/index.ts`: commitment types, validation, sanitization, overlap, storage.
2. Update `pages/*` and `app/*` to import only public slice APIs. Remove imports such as `features/.../model/...` and `features/.../ui/...` from higher layers.
3. Move `shared/lib/preferencesStorage.ts` and `shared/lib/commitmentsStorage.ts` into `entities/preferences/model/storage.ts` and `entities/commitment/model/storage.ts`, keeping storage keys in `shared/config`. Update `main.tsx`, `usePreferences`, `useCommitments`, pages, and tests.
4. Remove the redundant `frontend/src/App.tsx` re-export and update `tests/shell.test.tsx` to import `app/App` (or the new router factory) directly.
5. Add Zod storage schemas and use `safeParse` at read boundaries:
   - `entities/preferences/model/schema.ts` and storage.
   - `entities/commitment/model/schema.ts` and storage.
   - `features/tasks/model/schema.ts` and `features/tasks/lib/storage.ts`.
   Preserve current semantics: corrupt preferences fall back to defaults, invalid commitments are dropped, invalid tasks are dropped, and unavailable storage does not throw. Add tests for these cases.
6. Verify no circular dependencies, no cross-slice internal imports, and no `shared` → `entities`/`features` imports. Leave the task model in `features/tasks` and record the future move to `entities/task` as debt.

**Acceptance**: FSD boundary review and ESLint checks pass; existing 002–004 tests still pass after import updates; storage validation tests cover corrupt and invalid data.

### Phase 3 — Shell, routing, titles, and focus

1. Refactor `app/router.tsx`: it currently creates the router at module scope. Export the route table and a router factory usable with `createMemoryRouter` in tests; keep the browser router for production.
2. Add a non-business `/foundation` placeholder page with localized scaffold content; include it in navigation only as a temporary foundation surface and document its removal when the first business feature provides a replacement page.
3. Replace the current `AppShell` `div` structure with `<header>`/banner, named `<nav>`, `<main id="main-content" tabIndex={-1}>`, and a visible-on-focus skip link. Preserve the existing feature pages inside the shell.
4. Replace `Navigation`'s plain `Link` list with `NavLink`/route metadata, active styling, and `aria-current="page"`. Ensure every navigable foundation route is reachable at all supported widths without hover-only behavior.
5. Add a `RouteAnnouncer`/page-title hook: set a localized document title per route, move focus to the new page heading or main region, and announce the route change through a polite live region.
6. Extend `NotFoundPage` with localized explanation and a home link; no redirect loop. Add a route-level `RouteError` with retry/navigation actions.
7. Replace `document.getElementById('root')!` in `main.tsx` with a guarded lookup and a safe failure message.
8. Add a static `<noscript>` fallback in `index.html` and change the base title from `frontend` to Walday.

**Acceptance**: Direct load/refresh, back/forward, unknown nested routes, skip link, focus, titles, and announcements work; existing feature routes remain reachable; a missing root element fails safely.

### Phase 4 — Design tokens and accessible primitives

1. Consolidate tokens in `src/index.css` `@theme`: required semantic colors (`primary`, `surface`, `muted`, `border`, `danger`, `success`, `warning`, `focus`), text color, typography hierarchy (display/title/body/caption), spacing, radius, shadow, and density scales.
2. Choose AA-compliant color pairs and verify normal text (4.5:1), large text/interface elements (3:1), and focus visibility. Remove `frontend/tailwind.config.ts` after confirming no non-token configuration is needed.
3. Add `shared/ui` primitives required by the shell: `Button`, `Link`, `Container`, `Skeleton`. Add `EmptyState` and `ErrorState` primitives for the required conventions. Use discriminated-union variants where appropriate; no boolean-prop sprawl.
4. Update shell/navigation/not-found/error/loading surfaces to use semantic tokens and primitives. Do not perform a wholesale redesign of existing business forms in this feature; record remaining token adoption in business features as follow-up debt.
5. Add global `focus-visible` styles, `prefers-reduced-motion` handling, and minimum 24×24 CSS pixel targets (44×44 recommended).

**Acceptance**: No raw hex in shell/foundation components; no unjustified arbitrary values; token changes propagate; primitives have tests and accessible names.

### Phase 5 — Error, loading, empty, and success conventions

1. Implement a real app-level `ErrorBoundary` class component with localized fallback, reset/reload/home actions, focus to heading, alert announcement, and safe logging without stack traces or personal data.
2. Add a route-level `RouteError` using React Router error data; contain failures to the route where practical.
3. Replace the text `Loading` component with a `Skeleton` primitive that matches the final layout, sets `aria-busy` on the loading region, hides non-informative skeletons from assistive technology, and announces completion/failure through a live region.
4. Add `EmptyState` and `ErrorState` primitives with localized copy and optional CTA/retry. Test them even though the foundation has no business async surfaces.
5. Add a safe convention for unhandled promise rejections/global errors without exposing sensitive data.
6. Lazy-load non-initial feature pages and use the skeleton as the route fallback; provide a retryable error state for failed chunks.

**Acceptance**: Forced render error, route error, slow chunk, failed chunk, and successful retry produce the specified states; no layout shift from loading placeholders.

### Phase 6 — Localization foundation

1. Move shell/common strings (`app.name`, navigation labels, not-found, error, loading, empty, success, document titles) from `shared/i18n/index.ts` into `shared/i18n/locales/{en,es}/common.json`. Keep existing feature namespaces.
2. Initialize i18n with `lng: 'en'` and `fallbackLng: 'en'`. Do not add new browser-language detection or persistence in the foundation module.
3. Preserve the existing preferences consumer: `entities/preferences/model/defaults.ts` currently resolves a supported browser language, and `tests/preferences-localization.test.ts` plus `tests/preferences-model.test.ts` require it. Do not remove that behavior in this plan. Document that the foundation default is English while the existing preferences feature may apply a resolved browser language at startup.
4. Expose a stable, typed language-change mechanism (`applyLanguage`) that updates `document.documentElement.lang` and the document title. Do not add a visible language selector; the existing preferences feature may consume the mechanism, but the foundation does not add a new selector.
5. Ensure missing translations fall back to English and never render raw keys. Add a test that verifies English/Spanish key parity for foundation resources.
6. Replace hardcoded foundation-surface text and aria labels. Keep existing business copy changes out of this plan: `TaskForm`, `TaskItem`, and `TaskList` still contain hardcoded English; record them as follow-up i18n debt. Do not claim full-app i18n completion.

**Acceptance**: The foundation i18n module defaults to English; applying Spanish updates foundation UI, title, and `lang` without reload; missing keys fall back; no raw keys in foundation surfaces; foundation strings externalized; existing preferences language-resolution tests still pass.

### Phase 7 — Server state, environment, and backend boundary

1. Add `app/queryClient.ts` with a single `QueryClient`, deliberate defaults (`staleTime`, `gcTime`, retry, refetch behavior), and a documented query-key convention. Wrap the app in `QueryClientProvider`. No `QueryClient` exists today; `@tanstack/react-query` is already in package metadata. Do not add business queries, mutations, or a speculative key factory.
2. Replace the empty `shared/config/env.ts` stub with a Zod schema. No variables are required. Add optional `VITE_API_BASE_URL` (valid URL when present) as the documented future backend boundary; invalid values fail fast with a non-sensitive message.
3. Centralize `import.meta.env` access in the config module. Ensure no other module reads environment values directly.
4. Replace the empty `frontend/.env.example` with documentation stating that no variables are required and `VITE_API_BASE_URL` is optional.
5. Ensure the frontend/backend boundary remains deployment-independent; do not add an API client or mock backend.

**Acceptance**: App starts with no env vars; invalid optional URL fails fast; no `import.meta.env` outside config; `QueryClientProvider` is configured but unused by business data.

### Phase 8 — Quality gates, documentation, and validation

1. Configure `@vitest/coverage-v8` with 80% global and ~90% critical-business-logic thresholds. Document justified exclusions for bootstrap/config/tooling files.
2. Expand `src/test/setup.ts` (currently only imports jest-dom) with RTL cleanup, deterministic timers/timezone/locale, `matchMedia` mock, and an axe-core helper. Add `createMemoryRouter` route tests using the Phase 3 route factory.
3. Update existing test imports for the Phase 2 moves: `tests/shell.test.tsx` (`src/App` → `app/App`), `tests/preferences-storage.test.ts`, `tests/commitments-storage.test.ts`, `tests/preferences-non-mutation.test.ts`, `tests/preferences-ui.test.tsx`, and `tests/preferences-feedback.test.tsx` (feature internals → public APIs). Add tests for shell landmarks/skip link/active nav, direct routes/404/back-forward, route announcements, error boundary, skeleton, empty/error states, i18n parity/document language, env validation, storage schemas, and critical keyboard roles.
4. Fix `.husky/pre-commit` and `.husky/pre-push`: they currently run root `npm run ...` with no root package. Add the root development package and delegating scripts, or change both hooks to `npm --prefix frontend run ...`; choose one strategy and document it. Pre-commit runs fast lint/format checks; pre-push runs typecheck, tests with coverage, and build. Hooks must be installable from a fresh clone.
5. Update `.github/workflows/ci.yml`: Node 24, clean installs from lockfiles (root and frontend if a root package is added), `lint`, `format:check`, `typecheck`, `test:coverage`, `build`. CI is mandatory for PRs; hooks remain a local convenience.
6. Update `frontend/README.md` and add ADRs for the foundation baseline, token consolidation, FSD boundaries, i18n mechanism-only decision, and quality gates. Document route map, viewports, env vars, hooks, testing, and how to add a route/primitive/translation.
7. Record the production bundle baseline and initial-load measurement; verify lazy routes and no render-blocking third-party font.
8. Run manual validation at 360/768/1024/1440, 200% text resizing, 400% zoom, keyboard-only, VoiceOver + Safari, and reduced motion.

**Acceptance**: All canonical scripts pass from a clean install; CI is green; manual accessibility/responsive checks pass; documentation and ADRs are complete; no secrets or raw hex values in foundation surfaces. Existing feature tests pass; remaining business-copy/token debt is recorded separately.

## Companion Artifact Status

| Artifact | Status | Contents |
|---|---|---|
| `plan.md` | Updated | Production stack applicability, source reuse/refactor decisions, 90-task reference, and frontend-only/backend-future boundary. |
| `data-model.md` | Updated | Six foundation entities, storage contracts, relationships, state transitions, and FR/VR mapping; explicitly no Express/PostgreSQL/Prisma models. |
| `research.md` | Updated | 19 decisions with rationale/alternatives, exact stack versions, known conflicts, and backend boundary. |
| `quickstart.md` | Updated | Node 24/npm setup, canonical commands, nine validation scenarios, expected outcomes, and links to the data model/contracts. |
| `contracts/README.md` | Created | Route, environment, i18n, UI primitive, error/loading/empty/success, storage validation, quality-gate, and future-backend-boundary contracts. |
| `tasks.md` | Updated | 90 tasks across six user stories plus Phase 10 companion-artifact alignment. |

**Alignment result**: all companion artifacts now align with `spec.md`, `constitution.md`, and the production stack. No document is stale. No `.ts` or `.tsx` source code was changed by this documentation pass.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| FSD refactor breaks existing features | Add public APIs first, move one slice at a time, and run the existing suite after each move. Update tests in the same commit as each import/path move. |
| Strict TypeScript exposes pre-existing errors | Fix with safe narrowing/validation, not suppressions; justify and review any boundary assertion. Address the known casts listed in Phase 1. |
| Coverage thresholds fail on existing feature code | Measure first, test critical paths, and document only non-executable exclusions; do not lower thresholds. |
| Token consolidation changes visuals | Apply tokens incrementally to shell surfaces; verify contrast and visual direction before touching business forms. |
| Node 24 upgrade breaks tooling | Verify lockfile install, build, tests, and CI in the same change; pin local and CI versions. |
| Root tooling package adds complexity | Keep it development-only, delegate to frontend scripts, and keep the frontend independently runnable. |
| Existing hardcoded business copy remains | Scope this plan to foundation surfaces and record remaining feature copy as follow-up debt; do not claim full-app i18n completion. |
| Existing preferences browser detection conflicts with the clarified English default | Preserve `resolveLanguage` and its tests; document that the foundation module defaults to English while the existing preferences consumer may apply a detected language. |
| Zod storage migration changes fallback behavior | Preserve the existing defaults/drop semantics and add regression tests for corrupt, invalid, and unavailable storage. |
| Interrupted dependency install leaves partial package metadata | Review `frontend/package.json` and `package-lock.json` before continuing; either keep the added TanStack Query/Zod entries intentionally or revert and reapply in Phase 1. Do not assume the dev dependencies are installed. |
| Business feature accessibility debt (`window.confirm`, raw form styles) | Keep foundation acceptance scoped to foundation surfaces; record the commitments confirmation and business form styling as follow-up work. |
| Companion artifacts drift from the spec | Re-run the Phase 10 cross-check (T090) whenever `spec.md`, the plan, or the production stack changes; validate against the constitution before implementation. |
| Backend stack is accidentally introduced | Keep Express, PostgreSQL, and Prisma explicitly out of scope; record them only as a future boundary in research/data-model/contracts. |

## Validation Plan

**Automated**

```bash
npm ci
npm ci --prefix frontend
npm run lint
npm run format:check
npm run typecheck
npm run test:coverage
npm run build
```

**Manual**

1. Open `/`, `/foundation`, an existing feature route, and an unknown route. Verify shell, navigation, titles, focus, and not-found recovery.
2. Verify direct URLs, refresh, back/forward, and no full page reload during client navigation.
3. Verify 360, 768, 1024, and 1440 widths; no horizontal scrolling; 200% text resizing and 400% zoom.
4. Verify skip link, logical focus order, visible focus, `aria-current`, and route announcements with keyboard and VoiceOver + Safari.
5. Force a render error and a failed lazy chunk; verify localized fallback, focus, announcement, and retry.
6. Apply Spanish through the language-change mechanism; verify UI, `lang`, and title update without reload; verify missing-key fallback.
7. Start with no env vars; verify normal startup. Set an invalid optional `VITE_API_BASE_URL`; verify fail-fast behavior.
8. Stage a formatting/lint violation and confirm pre-commit blocks; create a type/test/build failure and confirm pre-push blocks.
9. Record the production bundle output and initial-load baseline.

## Post-Design Constitution Re-check

After the Phase 1 design artifacts, all gates remain PASS. The design introduces no backend, database, weather, authentication, or new business behavior. Principles IV, X, XVIII, and XIX remain not applicable or partial. No Complexity Tracking entries are required.

## Complexity Tracking

No violations.

## Open Questions

No open questions. The spec clarifications resolved the language-selector scope, initial language default, and screen-reader baseline. The code inspection resolved the browser-detection conflict by preserving feature 003 behavior and keeping the foundation i18n default at English. Remaining items are explicitly deferred in the spec or recorded as follow-up debt and do not block implementation.
