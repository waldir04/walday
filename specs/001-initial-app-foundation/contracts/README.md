# Contracts: Initial Application Foundation

**Scope**: Internal frontend contracts for Specification 001.

**No external API contract is introduced.** There is no Express application, HTTP endpoint, PostgreSQL schema, Prisma model, API client, or network call in this feature. Express, PostgreSQL, Prisma, and backend Vitest are future stack only.

Contracts are behavioral and structural. They do not prescribe component bodies, test bodies, migrations, or module implementation details. Entity fields and invariants live in [`../data-model.md`](../data-model.md); this document defines the boundaries between them.

## 1. Route Contract

A route definition MUST expose:

| Field | Contract |
|---|---|
| `path` | Unique path; direct load and refresh resolve it. |
| `page` | Page element or lazy page boundary; no business logic in the route table. |
| `titleKey` | Localized document-title key. |
| `navLabelKey` | Present when the route is visible in navigation. |
| `navVisible` | Boolean; every user-facing foundation destination is reachable. |
| `errorElement` | Route-level error surface with recovery. |
| `isIndex` | Exactly one home/index route. |
| `isCatchAll` | Exactly one not-found route. |
| `loadingFallback` | Layout-stable skeleton for lazy chunks. |

**Behavioral rules**

- Client-side navigation updates URL/content without a full reload.
- The current route is indicated with `aria-current="page"`.
- Route changes update the localized document title, move focus to the page heading/main region, and announce the change.
- Unknown nested paths render a localized not-found page with a working home link and no redirect loop.
- Browser back/forward restores route, title, and focus.

**Related requirements**: FR-006–FR-009; VR-005; SC-003.

## 2. Environment Configuration Contract

- Configuration is accessed only through `frontend/src/shared/config/env.ts`.
- A Zod schema validates values at startup, before the first application render.
- No environment variables are required by the foundation.
- `VITE_API_BASE_URL` is optional and MUST be a valid URL when present.
- Only public, non-sensitive values may use the `VITE_*` prefix.
- Secrets MUST NOT be committed, loaded into the client, or logged.
- Invalid values fail fast with a clear, non-sensitive message.
- With no variables, startup succeeds with documented defaults.
- `.env.example` documents every variable, its required/optional status, and safe defaults.

**Related requirements**: FR-027, FR-028; VR-004.

## 3. Translation Resource Contract

- English is the canonical source and fallback language.
- Spanish is required for all user-facing text.
- Foundation and existing feature strings live in the `common` or feature namespaces; no hardcoded user-facing text remains.
- Missing Spanish keys fall back to English; raw keys, blank labels, and runtime errors are prohibited.
- User-facing text, page titles, error/loading/empty/success copy, task copy, and aria labels are externalized.
- Applying a language change updates the UI, document title, and `<html lang>` without a full reload.
- The foundation exposes a typed language-change mechanism but no visible selector.
- The application starts in English when no explicit stored preference exists; an explicit stored preference may override it, and implicit browser detection at startup is deferred.
- Dates, times, numbers, and units use locale-aware formatting when introduced; timezone and weather-unit preferences remain independent from interface language.

**Related requirements**: FR-020–FR-022; VR-006; SC-006.

## 4. UI Primitive Contract

Each primitive MUST declare:

| Contract | Rule |
|---|---|
| Props | Explicit TypeScript types; no `any`; no untyped pass-through. |
| Variants | Explicit unions or discriminated variants; only variants required by the shell. |
| States | Default, visible `focus-visible`, disabled, and pending where relevant. |
| Accessible name | Provided by the caller or derived from visible content. |
| Target size | At least 24×24 CSS pixels; 44×44 recommended. |
| Contrast | Meets WCAG 2.2 AA with semantic tokens. |
| Data access | No fetching, storage, or server-state access. |
| Business logic | No domain rules or feature imports. |

The foundation introduces only the primitives required by the shell: button, link, layout container, skeleton, empty state, error state, and success feedback. A full component library is out of scope.

**Related requirements**: FR-012, FR-018; VR-008, VR-009.

## 5. Error, Loading, Empty, and Success Contract

### Error surfaces

- The app-level error boundary catches unhandled rendering errors.
- Route-level errors are contained to the route where practical.
- Fallbacks are localized, expose no stack traces/internal identifiers/personal data, and provide retry/reload/home recovery where reliable.
- Focus moves to the fallback heading and the failure is announced to assistive technologies.
- Logging is safe and contains no secrets or personal data.

### Loading surfaces

- Use a layout-matching skeleton, not a spinner or loose “Loading…” text as the sole treatment.
- Loading regions expose `aria-busy`; non-informative skeletons are hidden from assistive technology.
- Completion and failure are announced through an appropriate live region.
- Avoid avoidable layout shift.
- Motion respects `prefers-reduced-motion`.
- Lazy route chunks have a retryable failure state.

### Empty, error, and success content

- Empty states explain why no content is shown and provide a primary action only when the user can act.
- Error states offer retry only when retry is meaningful.
- Successful mutations provide visible success feedback when they change user-visible data.
- A localized `SuccessState`/success-feedback primitive announces success through an appropriate live region.

**Related requirements**: FR-013–FR-016; VR-011; SC-007.

## 6. Storage Validation Contract

Guest `localStorage` is untrusted and is not TanStack Query server state.

| Contract | Key | Validation | Failure behavior |
|---|---|---|---|
| Preferences | `walday:preferences` | Zod schema for language, date/time presentation, weather units, and optional weather location | Corrupt/unavailable → defaults; unsupported language → English |
| Commitments | `walday:commitments` | Zod schema for id, title, optional description, date, start/end time, and type | Corrupt/unavailable → `[]`; invalid records dropped; start must precede end |
| Tasks | `walday:tasks` | Zod schema for id, title, optional description, priority, optional due date, optional estimated duration, completed, and createdAt | Corrupt/unavailable → `[]`; invalid records dropped; title at least 3 characters |

**Rules**

- Schemas are the source of truth for stored types; types SHOULD be derived with `z.infer`.
- Reads and writes never throw for unavailable, corrupt, or quota-limited storage.
- Existing storage keys and feature behavior are preserved.
- No authentication tokens or sensitive data are stored in `localStorage`.
- Storage is encapsulated behind entity/feature storage modules, not read ad hoc in components.

**Related requirements**: FR-024, FR-027; VR-014; Constitution storage rules.

## 7. Quality-Gate Contract

The canonical commands are:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

- `lint`, `typecheck`, `test`, and `build` MUST be runnable from `frontend/`.
- `test:coverage` is the coverage-enforcing variant of the canonical `test` command.
- Root scripts, when present, MUST delegate to the frontend scripts.
- `build` MUST fail when type checking fails.
- Git hooks and CI MUST invoke the same commands, not duplicate their logic.
- Pre-commit runs fast lint/format checks; pre-push runs typecheck, tests with coverage, and build.
- CI runs from a clean install with a pinned Node.js 24 LTS version and committed lockfiles.
- The default branch is protected; changes integrate through pull requests with required CI checks and review.
- Coverage thresholds are 80% global and approximately 90% for critical business logic, with documented exclusions.
- Hooks and CI are mandatory gates; bypassing them is exceptional and reviewed.

**Related requirements**: FR-030–FR-036; VR-012, VR-013; SC-002, SC-010, SC-011.

## 8. Server-State Contract

- Exactly one `QueryClient` and `QueryClientProvider` exist at the application root.
- Defaults for `staleTime`, `gcTime`, retry, and refetch behavior are deliberate and documented.
- All query keys are produced by a minimal `queryKeys` factory; ad-hoc key arrays are prohibited.
- No business queries, mutations, or cache persistence are introduced in this feature.
- `useEffect`, manual `fetch`, and parallel server-state stores are prohibited for server data.
- Future entity/feature data hooks extend the key factory and follow the documented resource conventions.

**Related requirements**: FR-025; VR-012; Constitution Principle XVII.

## 9. Future Backend Boundary

This feature does **not** define an HTTP/API contract.

- No Express routes, middleware, controllers, or services.
- No PostgreSQL tables, migrations, or connection configuration.
- No Prisma schema, client, models, or seed data.
- No API client, mock backend, or network calls.
- The future backend stack is Node.js LTS, Express, Zod, PostgreSQL, Prisma, and Vitest, introduced by a separate backend specification.
- A future backend base URL MUST be supplied through the validated frontend configuration; it is not hardcoded.
- Future API errors MUST use stable machine-readable codes translated into localized user messages.
- Future contracts SHOULD be Zod-first and shared or synchronized with contract tests.
- Frontend and backend MUST remain independently deployable.

**Related requirements**: FR-029; Constitution Principles IV, X, XVIII, XIX, XX.
