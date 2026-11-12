# Quickstart: Initial Application Foundation

**Purpose**: Validate the foundation end to end without implementing business features.

**Prerequisites**

- Node.js 24 LTS and npm.
- A fresh clone of the repository.
- A modern evergreen browser.
- VoiceOver available on macOS (built in; enable with `Cmd+F5`).

No backend, Express server, PostgreSQL database, Prisma schema, or API client is required. The backend remains a future feature.

## 1. Install

```bash
npm ci
npm ci --prefix frontend
```

The root package installs development tooling (Husky, lint-staged) and delegates the canonical
scripts to `frontend`; each script also runs from `frontend/` directly.

No environment variables are required. Copy `frontend/.env.example` only when you want to exercise the optional `VITE_API_BASE_URL` validation.

## 2. Run

```bash
npm run dev
```

Expected: the development server starts and the shell renders at `/` without console errors.

## 3. Automated quality gates

From the repository root:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

Expected:

- Zero lint and formatting errors.
- TypeScript passes with all strict flags, including tests.
- Tests pass and coverage meets the configured thresholds or documented exclusions.
- The production build succeeds.

## 4. Validation scenarios

### 4.1 Responsive shell

1. Open `/` at 360, 768, 1024, and 1440 CSS pixel widths.
2. Confirm the banner/header, named navigation, main region, and one page `h1` are present.
3. Confirm there is no horizontal scrolling, clipped control, or overlapping content.
4. Set browser zoom to 200% and 400%; confirm content reflows without losing information or functionality.

Expected: the shell remains usable at every width and zoom level.

### 4.2 Routing, deep links, and history

1. Open `/`, `/foundation`, `/tasks`, `/settings`, and `/commitments` directly.
2. Refresh each route; confirm it renders inside the shell.
3. Use browser back and forward; confirm the correct route, title, and focus state.
4. Open an unknown nested path; confirm the localized not-found page appears with a working home link and no redirect loop.
5. Confirm the active navigation item is marked visually and with `aria-current="page"`.

Expected: no full-page reload during client navigation; every defined route resolves directly; unknown routes recover.

### 4.3 Keyboard and screen reader

1. Reload a page and press Tab from the browser chrome.
2. Confirm the skip link appears first and moves focus to the main region.
3. Traverse navigation, route content, error actions, and not-found recovery with the keyboard only.
4. Confirm focus is always visible, order is logical, and no keyboard trap occurs.
5. Enable VoiceOver (`Cmd+F5`) with Safari and use `VO+Right`/`VO+Left` through the banner, named navigation, main landmark, and page `h1`.
6. Navigate with `VO+Space` on each navigation item; confirm `aria-current="page"` is announced for the active route.
7. Navigate to `/foundation`, an unknown path, and a forced error; confirm the title, focused heading, not-found recovery, and polite route-change announcement.
8. Trigger the error boundary and confirm the fallback heading is focused and announced; confirm no stack trace is exposed.
9. At 200% text resizing and 400% zoom, repeat the keyboard traversal and confirm reflow without loss of content or focus visibility.

Expected: keyboard-only and VoiceOver + Safari critical journeys pass; automated axe checks report no critical or serious violations. Automated keyboard/focus and axe checks are in `frontend/tests/keyboard.test.tsx` and `frontend/tests/a11y.test.tsx`; the VoiceOver pass requires a human reviewer on macOS Safari.

### 4.4 English and Spanish

1. Load the app with no explicit stored language preference; confirm it starts in English.
2. Set the browser language to Spanish while keeping no explicit stored preference; confirm the app still starts in English because implicit browser detection is deferred.
3. Use the existing preferences consumer (Settings) or the language-change mechanism in a test to apply Spanish explicitly.
4. Confirm all user-facing labels, task copy, titles, error/loading/empty/success copy, and aria labels change without a full reload.
5. Confirm `<html lang>` and the document title update.
6. Use the parity/fallback test, or temporarily remove a Spanish key in a test fixture; confirm English fallback is shown instead of a raw key.
7. Run the updated preferences localization tests; confirm English is the default without an explicit preference and an explicit stored preference may override it.

Expected: English/Spanish parity for all user-facing text, fallback, document language, and mechanism-only switching work. No new visible selector is introduced by the foundation.

### 4.5 Error, loading, and empty states

1. Force a rendering error (for example with a test harness); confirm the app-level fallback is localized, offers recovery, focuses its heading, and exposes no stack trace.
2. Trigger a route-level error; confirm containment and retry/navigation.
3. Throttle the network or delay a lazy chunk; confirm the layout-matching skeleton and `aria-busy` state.
4. Force a chunk request failure; confirm the retryable error state.
5. Complete or retry loading; confirm the live region announces the transition and no avoidable layout shift occurs.
6. Verify empty and error primitives offer a CTA/retry only when actionable.
7. Trigger a successful user-visible mutation or the success primitive; confirm localized success feedback is announced through a live region.

Expected: all async UX states are localized, accessible, and recoverable.

### 4.6 Environment configuration

1. Start with no environment variables; confirm the app starts normally.
2. Set `VITE_API_BASE_URL` to an invalid value; confirm startup fails fast with a safe, non-sensitive message.
3. Set it to a valid URL; confirm startup succeeds.
4. Confirm no module outside the central config reads `import.meta.env`.

Expected: optional configuration validates correctly; no secrets are exposed.

### 4.7 Storage boundaries

1. Seed `walday:preferences`, `walday:commitments`, or `walday:tasks` with corrupt JSON; confirm the app falls back to defaults or an empty list without throwing.
2. Seed invalid records; confirm invalid records are dropped and valid records remain.
3. Simulate unavailable storage; confirm reads/writes do not crash the app.
4. Confirm existing feature behavior and storage keys are unchanged.

Expected: untrusted localStorage is validated at the boundary; no data loss beyond invalid records.

### 4.8 Hooks and CI

1. Stage a formatting or lint violation and commit; confirm pre-commit blocks with an actionable message.
2. Create a type, test, or build failure and push; confirm pre-push blocks.
3. Open a pull request; confirm CI runs the same canonical commands from a clean install and is required for merge.
4. Confirm the default branch is protected, changes integrate through PRs, and review expectations are documented.
5. Confirm hook installation and troubleshooting are documented.

Expected: local hooks and CI enforce the same gates; bypassing them is exceptional.

### 4.9 Performance baseline

1. Run the production build.
2. Record the bundle output and initial-load measurement in the project documentation.
3. Confirm non-initial routes are code-split where meaningful.
4. Confirm the system-font fallback strategy is documented and no render-blocking third-party font or unnecessary startup dependency is introduced.

Expected: a documented baseline exists for future regression comparison.

### 4.10 Security baseline

1. Confirm no secrets, credentials, or sensitive configuration appear in the client bundle, logs, or committed files.
2. Confirm `dangerouslySetInnerHTML` is not used without a justified sanitization mechanism.
3. Confirm external links use safe opener/referrer behavior.
4. Confirm deployment-specific CSP and security headers are recorded as deferred hosting work.

Expected: the foundation introduces no security regression and documents deferred hosting controls.

## 5. Verification record (2026-11-12)

Automated gates were executed from the repository root:

| Command | Result |
|---|---|
| `npm run lint` | Pass, zero errors/warnings |
| `npm run format:check` | Pass |
| `npm run typecheck` | Pass, including tests |
| `npm run test` | Pass, 38 files / 133 tests |
| `npm run test:coverage` | Pass, 90.46% statements / 82.35% branches / 89.01% functions / 92.12% lines; per-area thresholds pass |
| `npm run build` | Pass |

Hook gate (T100): `.husky/pre-commit` runs `npx lint-staged` then `npm run format:check`;
`.husky/pre-push` runs `npm run typecheck && npm run test:coverage && npm run build`. The commands
are the same canonical scripts used by CI, and `frontend/tests/scripts.test.ts` asserts the contract.
Hook installation is verified by the root `prepare` script (`husky`) after `npm ci`. A staged
`@typescript-eslint/no-explicit-any` violation was verified to make `lint-staged` exit non-zero and
revert the staged change.

Performance baseline (T101): initial load is approximately 520 kB raw / 160 kB gzip; `TasksPage`,
`SettingsPage`, and `CommitmentsPage` are separate lazy chunks. The font strategy is the system font
stack, so no render-blocking third-party font is requested. Full asset sizes are recorded in
`frontend/README.md`.

Security baseline (T102): no secrets, `dangerouslySetInnerHTML`, raw `innerHTML`, `eval`, or tokens in
storage; external-link rules and deferred CSP/headers are documented in `frontend/README.md` and
asserted by `frontend/tests/security.test.ts`.

Manual-only verification still required before accessibility sign-off: the VoiceOver + Safari pass
in 4.3 and visual inspection at the four viewport widths, 200% text resizing, and 400% zoom. These
cannot be executed by the automated test runner.

## 6. Reference Documents

- [Data model](./data-model.md): entities, storage contracts, state transitions, and validation mapping.
- [Contracts](./contracts/README.md): route, environment, i18n, UI, server-state, error/loading, storage, quality-gate, and future-backend boundaries.
- [Implementation plan](./plan.md): phases and acceptance criteria.
- [Specification](./spec.md): functional requirements, success criteria, and readiness gate.

## 7. Scope Notes

- Existing features 002–004 remain in place and must keep passing their tests.
- The task model remains in `features/tasks` for this plan; its move to `entities/task` is follow-up debt.
- Business-form token adoption and a custom accessible commitment-deletion dialog are follow-up debt; the current native confirm is localized, and all user-facing copy is externalized.
- Backend setup, Express, PostgreSQL, Prisma, migrations, and API clients are intentionally absent.
