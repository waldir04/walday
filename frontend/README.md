# Walday Frontend

React 19 + TypeScript + Vite single-page application organized with Feature-Sliced Design (FSD).

Specification 001 (`specs/001-initial-app-foundation/`) establishes the application foundation:
strict TypeScript, a semantic responsive shell, routing and recovery, design tokens and accessible
primitives, bilingual resources, error/loading/empty/success states, TanStack Query at the root,
validated environment configuration, and canonical quality gates. Existing features 002–004
(tasks, preferences, commitments) remain in place.

## Requirements

- Node.js 24 LTS (see `.nvmrc`)
- npm 11+

```bash
nvm use            # or install Node 24 LTS
npm ci             # root development tooling (Husky, lint-staged)
npm ci --prefix frontend
```

## Run

```bash
npm run dev
```

The development server starts at the Vite URL and renders the shell at `/`. No environment
variables are required.

## Canonical scripts

Run from the repository root (delegates to `frontend`):

| Script                  | Purpose                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| `npm run lint`          | ESLint with import boundaries, hooks rules, and `no-explicit-any`. |
| `npm run format:check`  | Prettier check.                                                    |
| `npm run typecheck`     | `tsc -b`, including tests.                                         |
| `npm run test`          | Vitest + React Testing Library.                                    |
| `npm run test:coverage` | Vitest with v8 coverage thresholds.                                |
| `npm run build`         | Typecheck plus production Vite build.                              |
| `npm run dev`           | Vite development server.                                           |

Each script also runs from `frontend/` directly, so the frontend stays independently runnable.

### Coverage thresholds

- Global: 80% statements, branches, functions, and lines.
- `src/entities/**` (business rules): 90% statements/functions/lines, 80% branches.
- `src/features/**`: 80% statements/functions, 85% lines, 70% branches.

Non-executable bootstrap/tooling files (`src/main.tsx`, `src/test/**`, type-only and public API
`index.ts` files) are excluded and documented in `frontend/vite.config.ts`.

## Environment configuration

Configuration is read only through `src/shared/config/env.ts`, validated with Zod at bootstrap
before the first render. Invalid values fail fast with a safe message and the app does not render.

| Variable            | Required | Notes                                                               |
| ------------------- | -------- | ------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | No       | Optional future backend boundary; must be a valid URL when present. |

No secret may use the `VITE_*` prefix. See `.env.example`.

## Git hooks and CI

Husky is installed by `npm ci` through the root `prepare` script.

- **pre-commit**: `lint-staged` (ESLint/Prettier on staged files) plus `format:check`.
- **pre-push**: `typecheck`, `test:coverage`, and `build`.
- **CI** (`.github/workflows/ci.yml`): clean installs, then `lint`, `format:check`, `typecheck`,
  `test`, `test:coverage`, and `build` on Node 24.

If hooks do not run, reinstall from the repository root with `npm ci` and verify `.husky/pre-commit`
and `.husky/pre-push`. CI is authoritative and hooks are a local convenience; bypassing either is
exceptional and must be reviewed.

**Repository workflow**: the default branch is protected, changes integrate through pull requests
only, and all CI checks are required before merge (enforced in repository settings, not in this
repository's files). Pull requests require at least one review that checks constitutional
compliance, accessibility, type safety, and test quality.

## Route map

| Path           | Surface                   | Navigation | Loading         |
| -------------- | ------------------------- | ---------- | --------------- |
| `/`            | Home                      | Yes        | Eager           |
| `/foundation`  | Foundation placeholder    | Yes        | Eager           |
| `/tasks`       | Tasks (feature 002)       | Yes        | Lazy + skeleton |
| `/settings`    | Preferences (feature 003) | Yes        | Lazy + skeleton |
| `/commitments` | Commitments (feature 004) | Yes        | Lazy + skeleton |
| `*`            | Localized not-found       | No         | Eager           |

Routes are declared in `src/app/router.tsx` as a route table with a browser factory and a memory
factory for tests. Every route has a localized document title, and route changes move focus to the
page heading and announce through a polite live region.

The `/foundation` placeholder can be removed once the first business feature provides a replacement
surface.

## Architecture (FSD)

Layers flow downward only: `app → pages → widgets → features → entities → shared`.

- `app`: providers, router, query client/key factory, bootstrap, route announcement/errors.
- `pages`/`widgets`: page composition and shell/navigation.
- `features`: user interactions for tasks, preferences, and commitments.
- `entities`: preference and commitment domain rules and storage.
- `shared`: UI primitives, i18n, config, formatting, test helpers.

Each slice exposes a public `index.ts`; importing another slice's internals is blocked by ESLint.
`shared` must not import `entities` or `features`. Use the `@/` alias instead of climbing directories.

### How to add a route

1. Add the page in `src/pages/`.
2. Add a route object in `src/app/router.tsx` with `handle: { titleKey, titleNamespace }`.
3. Lazy-load non-initial pages inside `LazyRoute`.
4. Add the navigation entry only when the route is user-facing.
5. Add route, title, focus, and not-found tests.

### How to add a shared primitive

1. Create `src/shared/ui/YourPrimitive.tsx` with explicit typed props.
2. Use semantic tokens only; no raw hex, data fetching, or business rules.
3. Provide accessible names, visible focus, and at least a 24×24 CSS pixel target (44×44 recommended).
4. Add behavior-focused tests in `frontend/tests/`.

### How to add a translation key

1. Add the key to the appropriate namespace under `src/shared/i18n/locales/en/` and `es/`.
2. Use a feature namespace for business text and `common` for shared interface text.
3. Reference it with `useTranslation(namespace)`; never hardcode user-facing text.
4. Run `frontend/tests/i18n.test.ts`, which enforces English/Spanish parity.

## Internationalization

- English is canonical and the fallback. English and Spanish have key parity.
- The application starts in English when no explicit stored preference exists. An explicit stored
  preference may override it. Implicit browser-language detection at startup is deferred.
- `applyLanguage` updates the UI, document title, and `<html lang>` without a reload.
- The foundation exposes the mechanism only; it does not add a visible language selector. The
  existing preferences consumer (Settings) may apply a language.
- Missing keys fall back to English and never render raw dotted keys.

## Design tokens and styling

Tailwind CSS 4 is the only styling mechanism. `src/index.css` `@theme` is the sole token source; the
legacy `tailwind.config.ts` was removed. Tokens cover the semantic palette (`primary`, `surface`,
`muted`, `border`, `danger`, `success`, `warning`, `focus`, text), typography, spacing, radius,
shadow, and density. Components must not contain raw hex colors.

The typography uses a system font stack (`ui-sans-serif`, `system-ui`, platform fonts). No
third-party font is loaded, so there is no render-blocking font request and no unnecessary startup
resource. This is the font loading strategy until a reviewed webfont decision exists.

## Async UX and error handling

- `ErrorBoundary` provides an app-level localized fallback with retry, reload, and home recovery.
- Route errors use `RouteError` with route-level containment and chunk-specific retry copy.
- `Skeleton`/`Loading` provide layout-matching placeholders with `aria-busy` and a live region.
- `EmptyState`, `ErrorState`, and `SuccessState` primitives cover empty, error, and success feedback.
- Unhandled promise rejections and global errors are logged generically without stack traces or
  personal data.

## Testing and verification

```bash
npm run test
npm run test:coverage
```

Tests cover shell landmarks, skip link, routing/history/not-found, route announcements, keyboard
focus, axe-core checks, token contrast, English/Spanish parity and fallback, tasks copy, storage
validation, environment startup, error/loading/empty/success states, QueryClient/key factory, UI
primitives, hooks/scripts, security baseline, and existing feature behavior.

Manual verification at 360, 768, 1024, and 1440 CSS pixels, 200% text resizing, 400% zoom, keyboard
only, and VoiceOver + Safari remains required for accessibility sign-off; see
`specs/001-initial-app-foundation/quickstart.md` for the scenario checklist.

## Performance baseline

Production build (2026-11-12):

| Asset                                | Raw       | Gzip      |
| ------------------------------------ | --------- | --------- |
| `index.html`                         | 0.97 kB   | 0.49 kB   |
| `assets/index-*.css`                 | 19.44 kB  | 4.74 kB   |
| `assets/jsx-runtime-*.js`            | 148.08 kB | 44.61 kB  |
| `assets/index-*.js`                  | 351.92 kB | 110.20 kB |
| `assets/TasksPage-*.js` (lazy)       | 6.57 kB   | 1.98 kB   |
| `assets/SettingsPage-*.js` (lazy)    | 0.36 kB   | 0.26 kB   |
| `assets/CommitmentsPage-*.js` (lazy) | 11.54 kB  | 3.04 kB   |

Initial load is approximately 520 kB raw / 160 kB gzip before the lazy feature chunks. Non-initial
routes are code-split. Use this table as the regression reference.

## Security baseline

- No secrets, credentials, or tokens are committed or stored in `localStorage`.
- No `dangerouslySetInnerHTML`, raw `innerHTML`, or `eval`.
- External links, when added, must use `rel="noopener noreferrer"` with `target="_blank"`.
- Client logs are generic and do not include stack traces or personal data.
- Deployment-specific CSP and security headers are deferred with hosting configuration and must be
  added when the production host is selected.

## Known follow-up debt

- Business-form surfaces (task, preference, and commitment forms) still use some legacy utility
  colors; adopting the semantic tokens there is follow-up styling work, not a foundation blocker.
- The task domain model remains in `features/tasks`; moving it to `entities/task` is follow-up
  domain refactoring.
- Commitment deletion uses the localized native confirm dialog; a custom accessible dialog is
  follow-up UI work.
- All user-facing copy is externalized; there is no remaining hardcoded-copy debt.

## Reference

- Specification: `specs/001-initial-app-foundation/spec.md`
- Plan: `specs/001-initial-app-foundation/plan.md`
- Data model and contracts: `specs/001-initial-app-foundation/data-model.md`,
  `specs/001-initial-app-foundation/contracts/README.md`
- Validation guide: `specs/001-initial-app-foundation/quickstart.md`
- Architecture decisions: `docs/adr/`
