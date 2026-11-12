# Tasks: Initial Application Foundation

**Input**: Design documents from `/specs/001-initial-app-foundation/`

**Prerequisites**: `specs/001-initial-app-foundation/spec.md`, `.kilo/plans/1794506066221-spec-001-foundation-rewrite.md`, `specs/001-initial-app-foundation/research.md`, `specs/001-initial-app-foundation/data-model.md`, `specs/001-initial-app-foundation/quickstart.md`

**Tests**: Required by the specification (FR-019, FR-030, FR-031 and the checklist). Add tests before or with implementation for each story.

**Organization**: Tasks are grouped by user story. The repository already contains features 002–004; these tasks preserve them and do not introduce new business behavior.

## Companion Artifact Status (2026-11-12)

| Artifact | Status | Contents |
|---|---|---|
| `specs/001-initial-app-foundation/plan.md` | Updated | Production stack applicability, source reuse/refactor decisions, 102-task reference, and frontend-only/backend-future boundary. |
| `specs/001-initial-app-foundation/data-model.md` | Updated | Six foundation entities, storage contracts, relationships, state transitions, and FR/VR mapping; explicit no Express/PostgreSQL/Prisma models. |
| `specs/001-initial-app-foundation/research.md` | Updated | 19 decisions with rationale/alternatives, exact stack versions, known conflicts, and backend boundary. |
| `specs/001-initial-app-foundation/quickstart.md` | Updated | Node 24/npm setup, canonical commands, nine validation scenarios, expected outcomes, and links to the data model/contracts. |
| `specs/001-initial-app-foundation/contracts/README.md` | Created | Route, environment, i18n, UI primitive, server-state, error/loading/empty/success, storage validation, quality-gate, and future-backend-boundary contracts. |
| `specs/001-initial-app-foundation/tasks.md` | Implemented | 102 tasks across six user stories, Phase 10 companion alignment, and Phase 11 analysis remediation; only manual visual/VoiceOver checks remain. |
| Production backend stack | Future boundary only | Express, PostgreSQL, Prisma, and backend Vitest are not implemented in Specification 001. |

**Alignment result**: all companion artifacts align with `spec.md`, `constitution.md`, and the production stack. No document is stale. No `.ts` or `.tsx` source code was changed by this documentation pass.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`US1`–`US6`) for user-story tasks only
- Every task includes an exact file path

## Path Conventions

- Frontend source: `frontend/src/`
- Frontend tests: `frontend/tests/`
- Repository tooling: `.husky/`, `.github/workflows/`, root `package.json`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the toolchain, strictness, and test/build configuration required by every story.

- [x] T001 Pin Node.js 24 LTS in `.nvmrc`, `frontend/package.json` `engines`, and `.github/workflows/ci.yml`.
- [x] T002 [P] Reconcile `frontend/package.json` and `frontend/package-lock.json`: keep `@tanstack/react-query` and `zod`, add `@vitest/coverage-v8`, `axe-core`, and `@typescript-eslint/eslint-plugin`; do not add runtime business dependencies.
- [x] T003 [P] Add root `package.json` and root lockfile with development-only Husky/lint-staged and delegating scripts: `lint`, `typecheck`, `test`, `test:coverage`, `build`, `format:check`, `prepare`.
- [x] T004 Enable `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax` in `frontend/tsconfig.app.json` and `frontend/tsconfig.node.json`; add `frontend/tsconfig.test.json` covering `src` and `tests`; update `frontend/tsconfig.json` references.
- [x] T005 Add the `@/*` → `frontend/src/*` alias to `frontend/tsconfig.app.json`, `frontend/tsconfig.test.json`, and `frontend/vite.config.ts`; replace directory-climbing imports.
- [x] T006 [P] Update `frontend/eslint.config.js`: wire `eslint-config-prettier`, add `@typescript-eslint/no-explicit-any`, hooks rules, `no-restricted-imports` for `../../*` and deep `@/features/*/*` / `@/entities/*/*` imports; remove `frontend/.oxlintrc.json` and the unused `oxlint` dependency if not used by scripts.
- [x] T007 [P] Expand `frontend/src/test/setup.ts` with RTL cleanup, deterministic timers/timezone/locale, and `matchMedia` mocking.
- [x] T008 Add `format:check` and `test:coverage` scripts to `frontend/package.json`; the root package already delegates them via T003.

**Checkpoint**: Strict TypeScript, test typechecking, formatting, lint boundaries, and coverage tooling are runnable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared contracts and primitives that every user story consumes.

**⚠️ CRITICAL**: Complete this phase before starting user-story implementation.

- [x] T009 Consolidate design tokens in `frontend/src/index.css` `@theme`: add `border`, `danger`, `success`, `warning`, `focus`, text, typography, spacing, radius, shadow, and density tokens; remove duplicate token definitions from `frontend/tailwind.config.ts` and remove the legacy config if no non-token configuration remains.
- [x] T010 [P] Add shared UI primitives in `frontend/src/shared/ui/`: `Button.tsx`, `Link.tsx`, `Container.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, and `ErrorState.tsx`; use typed props, accessible names, visible focus, and no business logic.
- [x] T011 [P] Configure the common i18n namespace in `frontend/src/shared/i18n/index.ts` and create empty `frontend/src/shared/i18n/locales/en/common.json` and `frontend/src/shared/i18n/locales/es/common.json`; keep English as `lng` and fallback, and expose a typed `applyLanguage` mechanism.
- [x] T012 [P] Add `frontend/src/app/queryClient.ts` with one `QueryClient` and documented defaults, plus `frontend/src/app/queryKeys.ts` with a minimal query-key factory convention; add `frontend/src/app/providers.tsx` wrapping the app in `QueryClientProvider` without adding business queries.
- [x] T013 [P] Replace the empty `frontend/src/shared/config/env.ts` with a Zod schema supporting optional `VITE_API_BASE_URL`; document no required variables in `frontend/.env.example`.
- [x] T014 Add public `index.ts` APIs to `frontend/src/features/tasks`, `frontend/src/features/user-preferences`, `frontend/src/features/commitments`, `frontend/src/entities/preferences`, and `frontend/src/entities/commitment` after the storage move in T015.
- [x] T015 Move `frontend/src/shared/lib/preferencesStorage.ts` to `frontend/src/entities/preferences/model/storage.ts` and `frontend/src/shared/lib/commitmentsStorage.ts` to `frontend/src/entities/commitment/model/storage.ts`; update imports in `frontend/src/main.tsx`, feature hooks, pages, and tests.
- [x] T016 Add Zod storage schemas in `frontend/src/entities/preferences/model/schema.ts`, `frontend/src/entities/commitment/model/schema.ts`, and `frontend/src/features/tasks/model/schema.ts` after T015; use `safeParse` in the corresponding storage modules while preserving defaults/drop behavior for corrupt or unavailable storage.
- [x] T017 Remove `frontend/src/App.tsx` and update `frontend/tests/shell.test.tsx` plus any imports to use `frontend/src/app/App.tsx` or the router factory.
- [x] T018 [P] Replace UI-level casts in `frontend/src/features/tasks/ui/TaskForm.tsx`, `frontend/src/features/user-preferences/ui/PreferencesForm.tsx`, `frontend/src/entities/preferences/model/defaults.ts`, `frontend/src/entities/commitment/model/sanitize.ts`, and `frontend/src/entities/commitment/model/validation.ts` with validated guards or documented boundary assertions.

**Checkpoint**: Tokens, primitives, i18n initialization, server-state provider, validated config, FSD public APIs, storage ownership, and strict typing are ready.

---

## Phase 3: User Story 1 — Open a responsive application shell (Priority: P1) 🎯 MVP

**Goal**: A semantic, responsive shell at the root route with global navigation and a default page.

**Independent Test**: Render the shell at 360, 768, 1024, and 1440 widths; verify banner/nav/main/default heading, no horizontal overflow, and no runtime errors.

### Tests for User Story 1

- [x] T019 [P] [US1] Add shell structure and default-page tests in `frontend/tests/shell.test.tsx`.
- [x] T020 [P] [US1] Add a responsive markup assertion test for the shell container and navigation in `frontend/tests/shell-responsive.test.tsx`; document manual width checks in `specs/001-initial-app-foundation/quickstart.md`.

### Implementation for User Story 1

- [x] T021 [US1] Replace the `div` shell in `frontend/src/widgets/AppShell.tsx` with `<header>`, `<nav aria-label>`, `<main id="main-content" tabIndex={-1}>`, and a consistent page container.
- [x] T022 [US1] Update `frontend/src/widgets/Navigation.tsx` to render the foundation navigation links with semantic markup and touch-sized targets.
- [x] T023 [US1] Update `frontend/src/pages/HomePage.tsx` to use the shell typography/container tokens and a single page `h1`.
- [x] T024 [US1] Apply semantic color/typography/spacing tokens to shell/navigation surfaces in `frontend/src/index.css`, `frontend/src/widgets/AppShell.tsx`, and `frontend/src/widgets/Navigation.tsx`; no raw hex colors.
- [x] T025 [US1] Add the Walday base title and accessible `<noscript>` fallback in `frontend/index.html`.

**Checkpoint**: The shell is independently renderable, responsive, and uses foundation tokens.

---

## Phase 4: User Story 2 — Navigate routes and recover from unknown URLs (Priority: P1)

**Goal**: Declarative route behavior, active navigation, direct URLs, history, titles, focus, and not-found recovery.

**Independent Test**: Navigate links, open direct URLs, refresh, use back/forward, and open unknown nested paths; verify content, URL, title, focus, and home recovery.

### Tests for User Story 2

- [x] T026 [P] [US2] Add routing tests in `frontend/tests/routing.test.tsx` for direct load, unknown route, back/forward, and active navigation.
- [x] T027 [P] [US2] Add not-found recovery tests in `frontend/tests/not-found.test.tsx`.

### Implementation for User Story 2

- [x] T028 [US2] Refactor `frontend/src/app/router.tsx` to export a route table and a router factory compatible with `createMemoryRouter`; keep the production browser router.
- [x] T029 [P] [US2] Add `frontend/src/pages/FoundationPage.tsx` as a localized, non-business placeholder route.
- [x] T030 [US2] Update `frontend/src/widgets/Navigation.tsx` to use `NavLink`, active styling, and `aria-current="page"`.
- [x] T031 [US2] Add `frontend/src/app/RouteAnnouncer.tsx` (or an equivalent hook) to set localized document titles, move focus to the page heading/main region, and announce route changes via a polite live region.
- [x] T032 [US2] Extend `frontend/src/pages/NotFoundPage.tsx` with a localized explanation, meaningful heading/title, and a working home link; no redirect loop.
- [x] T033 [US2] Add a route-level error surface in `frontend/src/app/RouteError.tsx` and wire it as the router `errorElement`.
- [x] T034 [US2] Wire `RouteAnnouncer`, `RouteError`, and the foundation placeholder into `frontend/src/app/App.tsx` and `frontend/src/app/router.tsx`.
- [x] T035 [US2] Update `frontend/tests/shell.test.tsx` and existing page tests for the new router/import structure.

**Checkpoint**: Navigation, deep links, history, titles, focus, and not-found behavior work independently.

---

## Phase 5: User Story 3 — Operate with keyboard and assistive technology (Priority: P1)

**Goal**: WCAG 2.2 AA foundation for landmarks, keyboard operation, focus, contrast, target sizes, and announcements.

**Independent Test**: Complete the shell/routing journey with keyboard only and VoiceOver + Safari; run automated accessibility checks on shell, navigation, not-found, error, and loading states.

### Tests for User Story 3

- [x] T036 [P] [US3] Add an axe-core helper in `frontend/src/test/axe.ts` and accessibility tests in `frontend/tests/a11y.test.tsx`.
- [x] T037 [P] [US3] Add keyboard and focus-order tests in `frontend/tests/keyboard.test.tsx`.
- [x] T038 [P] [US3] Add automated contrast/token and target-size assertions where feasible in `frontend/tests/a11y-tokens.test.tsx`.

### Implementation for User Story 3

- [x] T039 [US3] Add the visible-on-focus skip link and main-content target in `frontend/src/widgets/AppShell.tsx`.
- [x] T040 [US3] Add global `focus-visible`, reduced-motion, and minimum target-size styling in `frontend/src/index.css`.
- [x] T041 [US3] Ensure navigation has an accessible name, logical heading hierarchy, and `aria-current`; update `frontend/src/widgets/Navigation.tsx` and pages.
- [x] T042 [US3] Wire route-change focus/announcements from `frontend/src/app/RouteAnnouncer.tsx` and ensure error/loading states use live regions.
- [x] T043 [US3] Add the manual VoiceOver + Safari checklist and viewport/zoom checks to `specs/001-initial-app-foundation/quickstart.md`.

**Checkpoint**: Keyboard and assistive-technology users can operate the foundation; automated checks pass.

---

## Phase 6: User Story 4 — Use the foundation in English or Spanish (Priority: P2)

**Goal**: English/Spanish resources, English fallback, document language synchronization, and a mechanism-only language change.

**Independent Test**: Apply English and Spanish through the language-change mechanism; verify all foundation strings, title, and `lang` update without reload; verify missing keys fall back to English.

### Tests for User Story 4

- [x] T044 [P] [US4] Add English/Spanish key-parity and missing-key fallback tests in `frontend/tests/i18n.test.ts`.
- [x] T045 [P] [US4] Add language-change/document-language tests in `frontend/tests/i18n-language.test.ts`.
- [x] T046 [P] [US4] Update and verify preferences language-resolution tests for the English default: no explicit stored preference starts in English; an explicit stored preference may override; implicit browser detection does not silently override. Update `frontend/tests/preferences-localization.test.ts` and `frontend/tests/preferences-model.test.ts`.

### Implementation for User Story 4

- [x] T047 [US4] Populate `frontend/src/shared/i18n/locales/en/common.json` and `frontend/src/shared/i18n/locales/es/common.json` with app, navigation, not-found, error, loading, empty, success, title, and accessibility strings.
- [x] T048 [US4] Update `frontend/src/shared/i18n/index.ts` to load the common namespace, use `lng: 'en'`, `fallbackLng: 'en'`, and a typed `applyLanguage` that updates `document.documentElement.lang`.
- [x] T049 [US4] Externalize foundation text in `frontend/src/widgets/AppShell.tsx`, `frontend/src/widgets/Navigation.tsx`, `frontend/src/pages/NotFoundPage.tsx`, `frontend/src/pages/FoundationPage.tsx`, `frontend/src/app/RouteError.tsx`, and loading/error/empty primitives.
- [x] T050 [US4] Ensure missing translations fall back to English and never render raw keys in `frontend/src/shared/i18n/index.ts`; add a development-safe fallback check without exposing keys to users.
- [x] T051 [US4] Document the boundary in `frontend/README.md`: the app starts in English when no explicit stored preference exists; an explicit stored preference may override; implicit browser detection is deferred; do not add a visible language selector in this foundation.
- [x] T052 [US4] After T091/T092, update `frontend/README.md` to remove the obsolete business-copy debt note, document that all user-facing text is externalized, and retain only business-form token adoption and native confirm behavior as follow-up debt.

**Checkpoint**: Foundation UI is fully bilingual and locale-aware without adding a new selector.

---

## Phase 7: User Story 5 — See clear loading and error states (Priority: P2)

**Goal**: Localized, accessible error/loading/empty/success states with recovery and no avoidable layout shift.

**Independent Test**: Force a render error, route error, slow chunk, failed chunk, and successful retry; verify fallback, skeleton, focus, announcements, and layout stability.

### Tests for User Story 5

- [x] T053 [P] [US5] Add app-level ErrorBoundary tests in `frontend/tests/error-boundary.test.tsx`.
- [x] T054 [P] [US5] Add Skeleton/`aria-busy`/live-region tests in `frontend/tests/loading.test.tsx`.
- [x] T055 [P] [US5] Add route-error and failed-chunk retry tests in `frontend/tests/route-error.test.tsx`.
- [x] T056 [P] [US5] Add EmptyState/ErrorState primitive tests in `frontend/tests/state-primitives.test.tsx`.

### Implementation for User Story 5

- [x] T057 [US5] Implement a real class-based `ErrorBoundary` in `frontend/src/shared/ui/ErrorBoundary.tsx` with localized fallback, reset/reload/home actions, focus to heading, alert announcement, and safe logging.
- [x] T058 [US5] Replace the text placeholder in `frontend/src/shared/ui/Loading.tsx` with a layout-matching `Skeleton` usage and `aria-busy`/live-region behavior.
- [x] T059 [US5] Implement localized `EmptyState` and `ErrorState` usage with optional CTA/retry in `frontend/src/shared/ui/EmptyState.tsx` and `ErrorState.tsx`.
- [x] T060 [US5] Lazy-load non-initial pages in `frontend/src/app/router.tsx` with a `Suspense` skeleton and a retryable chunk-error fallback.
- [x] T061 [US5] Add a safe unhandled-promise/global-error convention in `frontend/src/main.tsx` without exposing stack traces or sensitive data.
- [x] T062 [US5] Wire app-level and route-level error surfaces in `frontend/src/app/providers.tsx`, `frontend/src/app/RouteError.tsx`, and `frontend/src/app/router.tsx`.

**Checkpoint**: Loading, empty, error, and success states are accessible, localized, and recoverable.

---

## Phase 8: User Story 6 — Set up, validate, and contribute (Priority: P2)

**Goal**: Canonical scripts, working hooks, coverage, CI, environment validation, and documentation.

**Independent Test**: From a fresh clone, follow the README, run all scripts, trigger hook failures, and verify CI behavior.

### Tests for User Story 6

- [x] T063 [P] [US6] Add environment validation tests in `frontend/tests/env.test.ts`.
- [x] T064 [P] [US6] Add storage-schema regression tests in `frontend/tests/storage-validation.test.ts`.
- [x] T065 [P] [US6] Add a script-contract smoke test in `frontend/tests/scripts.test.ts` asserting `lint`, `typecheck`, `test`, `test:coverage`, `build`, and `format:check` are defined.

### Implementation for User Story 6

- [x] T066 [US6] Fix `.husky/pre-commit` to run fast lint/format checks and `.husky/pre-push` to run typecheck, tests with coverage, and build via the canonical scripts; document installation/troubleshooting.
- [x] T067 [US6] Configure coverage thresholds (80% global, ~90% critical business logic) and documented exclusions in `frontend/vite.config.ts`.
- [x] T068 [US6] Update `.github/workflows/ci.yml` to Node 24 and run clean-install `lint`, `format:check`, `typecheck`, `test`, `test:coverage`, and `build`.
- [x] T069 [US6] Update `frontend/README.md` with setup, Node version, scripts, env vars, hooks, route map, viewports, architecture, testing, and extension guidance.
- [x] T070 [US6] Add ADRs under `docs/adr/` for the foundation baseline, token consolidation, FSD boundaries, i18n mechanism-only decision, and quality gates.
- [x] T071 [US6] Document how to add a route, shared primitive, and translation key without violating FSD in `frontend/README.md`.
- [x] T072 [US6] Verify fresh-clone install and all canonical scripts; record non-executable coverage exclusions in `frontend/README.md` and validate with `specs/001-initial-app-foundation/quickstart.md`.

**Checkpoint**: A new contributor can set up, validate, and contribute using only the repository documentation.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across all stories.

- [x] T073 [P] Run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, and `npm run build` from the repository root using the scripts in `frontend/package.json` and root `package.json`; fix regressions.
- [ ] T074 [P] MANUAL (pending human review): verify responsive behavior at 360, 768, 1024, and 1440 widths, 200% text resizing, and 400% zoom in `frontend/index.html` and shell surfaces.
- [ ] T075 [P] MANUAL (pending human review): verify keyboard-only and VoiceOver + Safari journeys for shell, navigation, not-found, error, and loading states using `specs/001-initial-app-foundation/quickstart.md`.
- [x] T076 [P] Verify no `any`, unjustified assertions, raw hex colors, deep slice imports, directory-climbing imports, or secrets in `frontend/src/` and `frontend/tests/`.
- [x] T077 [P] Record the production bundle and initial-load baseline from `frontend/dist` and document it in `frontend/README.md`.
- [x] T078 [P] Verify existing feature tests for tasks, preferences, and commitments still pass after the refactor in `frontend/tests/`.
- [ ] T079 MANUAL (pending human review): run the complete `specs/001-initial-app-foundation/quickstart.md` validation scenarios end to end.
- [x] T080 Review and update `specs/001-initial-app-foundation/plan.md` and `specs/001-initial-app-foundation/tasks.md` only after implementation is complete.

---

## Phase 10: Companion Technical Artifact Alignment (Completed 2026-11-12)

**Purpose**: Make the companion design artifacts match the updated spec, constitution, and production stack before implementation depends on them.

**Status**: T081–T090 are complete. The companion artifacts are aligned; no document is stale.

- [x] T081 [P] Rewrite `specs/001-initial-app-foundation/data-model.md` with the six spec entities, storage boundary schemas, relationships, state transitions, validation rules, and FR/VR mapping; state explicitly that there are no PostgreSQL/Prisma entities, tables, migrations, or server models in this feature.
- [x] T082 [P] Rewrite `specs/001-initial-app-foundation/research.md` with the 19 decisions, exact mandated stack versions, rationale, alternatives, constitutional references, and known conflicts, including the future backend-stack boundary.
- [x] T083 [P] Rewrite `specs/001-initial-app-foundation/quickstart.md` with prerequisites, install/run/quality commands, and the complete validation scenarios with expected outcomes and links to the data model and contracts; do not add backend/Express/PostgreSQL/Prisma setup.
- [x] T084 [P] Create `specs/001-initial-app-foundation/contracts/README.md` with route, environment, i18n, UI primitive, server-state, error/loading/empty/success, storage validation, quality-gate, and future-backend-boundary contracts; state that no external API contract is introduced and Express/PostgreSQL/Prisma are future technologies only.
- [x] T085 [P] Cross-check the five artifacts (`plan.md`, `data-model.md`, `research.md`, `quickstart.md`, `contracts/README.md`) against `spec.md` (FR/VR/SC), `constitution.md` (I–XX), and the production stack; remove stale statements such as Tailwind-config tokens, “evaluate” hooks, missing TanStack Query/Zod/Node pin, pnpm-only setup, or backend code presented as in scope.
- [x] T086 [P] Replace `specs/001-initial-app-foundation/tasks.md` with `.kilo/plans/1794506066221-spec-001-tasks.md` or apply the same 102-task content; ensure six user stories, sequential IDs, and story labels.
- [x] T087 Validate the five artifacts: Markdown structure, cross-links, no contradictions with `spec.md`/`constitution.md`, no stale stack versions, and no unimplemented decisions presented as complete.
- [x] T088 [P] Update `specs/001-initial-app-foundation/plan.md` with the production-stack applicability table, source reuse/refactor decisions, backend-future boundary, and companion-artifact audit.
- [x] T089 [P] Add the backend-stack boundary to `data-model.md`, `research.md`, `quickstart.md`, and `contracts/README.md`: Node.js LTS, Express, Zod, PostgreSQL, Prisma, and backend Vitest are future stack, not implemented in Specification 001.
- [x] T090 Run the final five-artifact consistency audit and confirm no document is left stale, no backend scope is implied, and all tasks reference the updated spec and constitution.

**Checkpoint**: Companion artifacts are consistent, implementation-ready, and cite the same decisions as `spec.md` and `plan.md`.

---

## Historical Companion Artifact Requirements (Completed in Phase 10)

**Status**: Historical reference only. The artifacts are updated; do not re-run these instructions. See the Companion Artifact Status table at the top of this file.

### `data-model.md`

Include:

- Scope note: no business entities, no Express server, no PostgreSQL/Prisma entities, tables, migrations, or server models, and no network entities; existing guest storage remains for features 002–004.
- **Design Token**: category, semantic name, value, theme, contrast pair; invariants: `@theme` single source, AA contrast, no raw hex in components.
- **Route Definition**: path, page/lazy import, title key, navigation label/visibility, loading and error boundaries, default/not-found flags; invariants: unique paths, home route, one non-business placeholder, catch-all not-found.
- **Application Shell Region**: region name, semantic element/landmark, skip-link target, responsive behavior; invariants: one banner, one named navigation, one main, one page `h1`.
- **UI Primitive**: name, typed props, variants/states, accessible name, focus/target-size requirements; invariant: no data fetching or business rules.
- **Translation Resource**: locale, namespace, key set, fallback, interpolation/pluralization; invariants: English canonical, Spanish required, fallback without raw keys, document `lang` matches locale.
- **Environment Configuration Value**: name, type, required/optional, default, public/secret, Zod schema; invariants: no required variables, optional `VITE_API_BASE_URL`, fail fast on invalid values, no secrets in `VITE_*`.
- **Storage boundary contracts**: Stored Preferences, Stored Commitments, Stored Tasks; Zod schema, fallback/drop semantics, unavailable-storage behavior, untrusted `localStorage`.
- **Relationships**: Route → shell/navigation/page; Token → primitives/shell; Translation → titles/navigation/errors; Environment → startup/QueryClient; Storage → entities/features.
- **State transitions**: route `idle → loading → ready | error`; language `default(en) → en | es` with invalid fallback; configuration `unvalidated → valid | invalid-fail-fast`; storage `read → valid | fallback/drop`.
- **Mapping** from entity invariants to the spec’s FR/VR identifiers (FR-007, FR-010/011, FR-012, FR-017/018, FR-020/021/022, FR-027/028; VR-005/006/009/010/014).

### `research.md`

Use **Decision / Rationale / Alternatives considered** for:

1. Node.js 24 LTS, npm, committed lockfiles, CI parity.
2. Strict TypeScript flags and a separate test tsconfig.
3. FSD aliases, public APIs, storage ownership, and removal of the `src/App.tsx` shim.
4. Single TanStack Query client/provider, deliberate defaults, no business queries.
5. i18n default English, English fallback, en/es parity, mechanism-only language change, document `lang`; English default without an explicit stored preference, explicit preference override, implicit browser detection deferred.
6. Tailwind 4 `@theme` as the sole token source; remove the legacy config; required semantic palette and AA contrast.
7. App-level error boundary plus React Router route error handling.
8. Skeleton/empty/error/success conventions, `aria-busy`, live regions, no layout shift.
9. Zod environment validation, optional `VITE_API_BASE_URL`, no required variables, fail-fast behavior.
10. Zod storage schemas for preferences, commitments, and tasks, preserving existing fallback/drop semantics.
11. axe-core in tests plus manual keyboard and VoiceOver + Safari baseline; Lighthouse only as a development/CI measurement tool.
12. ESLint + Prettier, import-boundary rules, removal of unused oxlint.
13. Husky/lint-staged with a root development package and delegating scripts; CI remains independent.
14. CI Node 24 and the canonical `lint`, `format:check`, `typecheck`, `test`, `test:coverage`, `build` commands.
15. Coverage v8 thresholds (80% global, ~90% critical business logic) with justified exclusions.
16. Route table/router factory using `createMemoryRouter` for tests.
17. Lazy loading of non-initial routes and recording the bundle/initial-load baseline.
18. Preserving features 002–004, externalizing all user-facing copy, and deferring only token adoption, task-model relocation, and a custom commitment dialog.
19. Backend-stack boundary: Node.js LTS, Express, Zod, PostgreSQL, Prisma, and backend Vitest are the future production stack but are not implemented in Specification 001.

Reference the exact mandated versions: React 19, TypeScript 5, Vite, Tailwind CSS 4 via `@tailwindcss/vite`, React Router 7, TanStack Query, Zod, i18next 26, react-i18next 17, Vitest 5, React Testing Library, jest-dom, Node.js 24 LTS, ESLint/Prettier, Husky/lint-staged, axe-core.

### `quickstart.md`

Include:

- Prerequisites: Node.js 24 LTS, npm, committed lockfiles.
- Install: `npm ci` at the repository root and `npm ci --prefix frontend`; no required environment variables; `.env.example` documents optional `VITE_API_BASE_URL`.
- Run: `npm run dev`.
- Quality: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, `npm run build`.
- Automated expectations: zero lint/format errors, typecheck passes including tests, coverage thresholds pass, build succeeds.
- Manual scenarios:
  1. Shell at 360/768/1024/1440 widths; landmarks; no horizontal scrolling; 200% text resizing and 400% zoom.
  2. Direct route loads, `/foundation`, existing feature routes, unknown nested paths, back/forward, active navigation, titles, and focus.
  3. Keyboard-only skip link/focus order and VoiceOver + Safari shell/navigation/error/loading checks.
  4. Default English; apply Spanish through the language-change mechanism (or the existing preferences consumer); verify all user-facing text, title, `lang`, and missing-key fallback; verify English default without an explicit preference and explicit preference override; implicit browser detection is deferred.
  5. Forced render error, route error, slow lazy chunk, failed chunk, and retry; verify localized fallback, skeleton, `aria-busy`, live region, focus, and no avoidable layout shift.
  6. No env vars starts normally; invalid optional `VITE_API_BASE_URL` fails fast with a safe message.
  7. Corrupt, invalid, and unavailable localStorage falls back or drops records without throwing.
  8. Staged lint/format violation blocks pre-commit; type/test/build failure blocks pre-push; CI runs the same canonical checks.
  9. Record the production bundle and initial-load baseline; no render-blocking third-party font.
- Links to `data-model.md` and `contracts/README.md`; note that all user-facing copy is externalized and only business-form token adoption/native confirm remain as debt.
- No backend, Express, PostgreSQL, Prisma, migration, or API setup; the backend remains a future feature.
- No full implementation code, service bodies, migrations, or complete test suites.

### `contracts/README.md`

Create the file and state that no external API/HTTP contract is introduced. Document:

- **Route contract**: unique paths, home/placeholder/not-found, title key, navigation visibility, loading/error boundary, focus/announcement behavior.
- **Environment contract**: Zod schema, optional `VITE_API_BASE_URL`, no required variables, public-only `VITE_*`, fail-fast, no secrets.
- **Translation contract**: English canonical, Spanish required, namespace/key parity, fallback without raw keys, document `lang`, mechanism-only switching.
- **UI primitive contract**: typed props, variants/states, accessible name, focus-visible, target size, no data fetching/business rules.
- **Error/loading/empty/success contract**: app and route error surfaces, localized recovery, skeleton/`aria-busy`/live region, retry, no layout shift.
- **Storage validation contract**: Zod schemas, untrusted `localStorage`, defaults/drop semantics, unavailable storage, storage keys.
- **Quality-gate contract**: canonical scripts, root/frontend invocation, Node 24, lockfiles, same commands in hooks and CI.
- **Future backend boundary**: no endpoint/client in this feature; Express, PostgreSQL, Prisma, and backend Vitest are future technologies; future base URL through validated config; stable error codes and Zod-first contracts; independent deployment.
- Cross-reference `data-model.md` for fields and invariants instead of duplicating them.

### `plan.md`

Update `specs/001-initial-app-foundation/plan.md` with:

- Production stack applicability: frontend stack used now; Node.js LTS shared; Express/PostgreSQL/Prisma/backend Vitest explicitly future and out of scope.
- Source reuse vs refactor decisions: keep existing FSD folders, routes, feature behavior, storage keys, and tests; refactor only the shell, routing, tokens, error/loading, config, i18n, type safety, public APIs, and quality gates.
- Companion-artifact audit and the rule that no artifact remains stale.
- Backend boundary and no server/database/migration/API-client work.

### `tasks.md`

Replace the stale three-story, all-checked file with the 102-task regenerated plan in `.kilo/plans/1794506066221-spec-001-tasks.md`; preserve the six user stories, sequential IDs, Phase 10 companion alignment, and config.

---

## Phase 11: Analysis Remediation (Critical/High)

**Purpose**: Resolve the cross-artifact findings C1–C6 and add the missing coverage gates before implementation.

**Status**: Complete except manual-only visual and VoiceOver verification (T074, T075, T079). All other remediation tasks are implemented and covered by tests.

- [x] T091 [US4] Externalize all user-facing copy and aria labels in `frontend/src/features/tasks/ui/TaskForm.tsx`, `TaskItem.tsx`, and `TaskList.tsx` into English/Spanish resources; include labels, options, buttons, placeholders, empty state, and confirmation text; add tests.
- [x] T092 [US4] Audit remaining `frontend/src/features` and `frontend/src/pages` surfaces for hardcoded user-facing text or aria labels and externalize them; add English/Spanish parity and no-raw-key tests.
- [x] T093 [US4] Change preferences startup resolution so English is the default without an explicit stored preference, an explicit stored preference may override, and implicit browser detection does not silently override; update `frontend/src/entities/preferences/model/defaults.ts`, `frontend/src/main.tsx`, and the affected tests.
- [x] T094 [US5] Add a localized `SuccessState`/success-feedback primitive with a live-region announcement and tests; wire it into `frontend/src/shared/ui/` and the success convention documentation.
- [x] T095 [US6] Parse the Zod environment configuration at bootstrap before the first render; add a test proving invalid optional `VITE_API_BASE_URL` fails fast with a safe message and the app does not render.
- [x] T096 [US6] Document/configure the protected default branch, PR-only integration, required CI checks, and review expectations in `frontend/README.md` and the repository workflow documentation.
- [x] T097 [US1] Add a no-JS fallback test that verifies `frontend/index.html` contains an accessible `<noscript>` message and does not present the app as functional without JavaScript.
- [x] T098 [US3] Add direct tests for `frontend/src/shared/ui/Button.tsx`, `Link.tsx`, `Container.tsx`, and `Skeleton.tsx` covering accessible names, focus, disabled states, and target size.
- [x] T099 [US6] Add `frontend/tests/query-client.test.tsx` covering the single `QueryClient`, provider composition, deliberate defaults, and the query-key factory convention.
- [x] T100 [US6] Add an automated or explicitly documented gate proving `.husky/pre-commit` and `.husky/pre-push` block lint/format/type/test/build violations; record the verification in `quickstart.md`.
- [x] T101 [US6] Define the font loading strategy/system fallback and verify no render-blocking third-party font or unnecessary startup resource; record the result with the bundle baseline.
- [x] T102 [US6] Add a security verification task for no secrets in the client bundle/logs, no unsafe HTML, safe external-link behavior, and documented deferred CSP/header work.

**Checkpoint**: C1–C6 are resolved and the missing test/verification gates exist and pass; only manual visual/screen-reader sign-off remains.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately.
- **Foundational (Phase 2)**: Depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: Depends on Foundational.
- **US2 (Phase 4)**: Depends on Foundational; can start after US1 or in parallel with it if the shell markup is stable.
- **US3 (Phase 5)**: Depends on Foundational and benefits from US1/US2 markup; can start after US1.
- **US4 (Phase 6)**: Depends on Foundational; can run in parallel with US1–US3 once the common namespace exists.
- **US5 (Phase 7)**: Depends on Foundational and US1/US2 for shell/route integration; can start after US2.
- **US6 (Phase 8)**: Depends on Setup and Foundational; documentation and CI can run in parallel with stories, but final verification follows them.
- **Polish (Phase 9)**: Depends on all desired stories.
- **Companion Artifacts (Phase 10)**: Complete. The five artifacts are aligned and T090 passed. Setup and Foundational work can proceed.
- **Analysis Remediation (Phase 11)**: Depends on the companion artifacts and the affected story primitives. T091–T093 must complete before US4 acceptance; T094 before US5 acceptance; T095, T096, and T099–T102 before US6/final validation; T097 before US1 final acceptance; T098 before US3 acceptance. T052 follows T091/T092; T046 follows T093; T099 follows T012; T100 follows T066; T101 follows T077; T102 follows T076.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories after Foundational.
- **US2 (P1)**: Integrates with US1 shell/navigation; independently testable with a memory router.
- **US3 (P1)**: Integrates with US1/US2; accessibility tests can run once markup exists.
- **US4 (P2)**: Independent of US1–US3 once the i18n foundation is ready; UI copy adoption depends on the relevant surfaces.
- **US5 (P2)**: Integrates with US1/US2; error/loading primitives can be tested independently.
- **US6 (P2)**: Independent tooling/docs work; final CI verification depends on implementation.

### Parallel Opportunities

- Setup: T002, T003, T006, and T007 can run in parallel; T004/T005 touch the same TypeScript files and must be sequential; T008 follows T002 because both edit `frontend/package.json`.
- Foundational: T009, T010, T011, T012, T013, and T018 can run in parallel by file; T014 and T016 depend on T015; T017 follows T014/T015.
- US1: T019/T020 tests can run in parallel; T021–T024 touch shell/navigation and should be sequenced where files overlap; T025 is independent.
- US2: T026/T027 tests can run in parallel; T028/T029 can run in parallel; T030/T031 follow the route factory; T033/T034 follow the not-found/error work.
- US3: T036–T038 tests can run in parallel; T039–T042 should be sequenced against the shell markup after T021/T022.
- US4: T044–T046 tests can run in parallel; T047/T048 can be prepared in parallel before T049.
- US5: T053–T056 tests can run in parallel; T057/T058/T059 can proceed in parallel by file; T060–T062 follow the route/provider work.
- US6: T063–T065 tests can run in parallel; T066–T068 are independent of documentation tasks; T069/T071 both edit `frontend/README.md` and must be sequential.
- Companion Artifacts: Phase 10 is complete; no companion-artifact work remains in the parallel queue.
- Analysis Remediation: T091–T102 can run in parallel by file where dependencies allow; T091/T092 are sequential against shared task copy, T093 is independent, and T094–T102 touch separate test/tooling files.

---

## Parallel Example: User Story 1

```text
Task: "Add shell structure tests in frontend/tests/shell.test.tsx"
Task: "Add responsive markup assertions in frontend/tests/shell-responsive.test.tsx"
```

## Parallel Example: User Story 4

```text
Task: "Add i18n parity tests in frontend/tests/i18n.test.ts"
Task: "Add language-change tests in frontend/tests/i18n-language.test.ts"
Task: "Verify existing preferences browser-language resolution in frontend/tests/preferences-localization.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1: responsive shell).
3. Stop and validate US1 independently at the required widths.
4. Use the shell as the base for US2, US3, and US5.

### Incremental Delivery

1. Phase 10 companion artifacts are complete and aligned.
2. Apply Phase 11 remediation (T091–T102) within the affected stories before final story acceptance.
3. Setup + Foundational → foundation ready.
4. US1 → responsive shell MVP.
5. US2 → routing/navigation and not-found.
6. US3 → keyboard/assistive-technology compliance.
7. US4 → English/Spanish foundation.
8. US5 → loading/error/empty/success states.
9. US6 → quality gates, hooks, CI, and documentation.
10. Polish → full validation and baseline recording.

### Preservation Rule

Existing features 002–004 must keep working. Do not remove their routes, storage keys, or behavior. Apply foundation changes around them and update tests in the same task as each import/path move.

---

## Notes

- Tests are required by the specification; write or update them with each story.
- `[P]` tasks touch different files and have no incomplete-task dependencies.
- Do not edit `specs/001-initial-app-foundation/spec.md` while implementing these tasks.
- Do not implement business features, authentication, backend, weather, or persistence beyond the existing guest storage.
- Express, PostgreSQL, Prisma, and backend Vitest remain future stack; do not add servers, schemas, migrations, or API clients in this feature.
- Record only business-form token adoption, task-model relocation, and custom commitment-dialog debt in `frontend/README.md`; all user-facing copy must be externalized.
