# Implementation Plan: Calm Tech Dark UI Redesign

**Branch**: `005-calm-tech-dark-ui` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-calm-tech-dark-ui/spec.md`

## Summary

Rewrite the frontend presentation layer around the Walday Dark UI ("Calm Tech Dark") identity while preserving every existing route, guest-storage repository, state hook, context, validation rule, and business behavior. The change introduces the canonical dark token system, the `WaldayLogo` brand component, a sticky responsive header with a native-dialog mobile navigation drawer, a read-only Home dashboard, weather and Smart Suggestions presentation surfaces, and re-skinned shared primitives, task rows, commitment rows, forms, and page shells.

The work is frontend-only. It adds no backend endpoint, no weather provider call, and no suggestion engine. Weather and suggestions are typed presentation surfaces whose no-location, loading, ready, stale, unavailable, error, and empty states are ready for future wiring. Home uses the existing `useTasks` and `useCommitments` hooks read-only.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.3, Node.js 24 LTS (frontend application)

**Primary Dependencies**: React Router 7.18, i18next 26 / react-i18next 17, TanStack Query 5.107 (existing, no new query usage), Tailwind CSS 4.3 via `@tailwindcss/vite`, Lucide React 1.72.0 (new), `@fontsource-variable/inter` 5.3.0 (new)

**Storage**: Existing versioned guest `localStorage` repositories for tasks, commitments, and preferences. No storage schema, key, or migration change.

**Testing**: Vitest 5, React Testing Library 16, jest-dom, axe-core, existing `frontend/tests` suite plus new component and shell tests

**Target Platform**: Modern desktop and mobile browsers; single-page application served by Vite

**Project Type**: Web frontend in an FSD-structured monorepo; no backend source exists in this repository yet

**Performance Goals**: Drawer mount/close within 200 ms; no horizontal scrolling at 360/768/1024/1440 px or 200% zoom; no layout shift from row-action reveal; no new route-level request waterfall; initial bundle impact limited to tree-shaken icons, the dashboard widgets, and one self-hosted variable font with unicode-range subsets

**Constraints**: Mobile-first responsive design; WCAG 2.2 AA; `prefers-reduced-motion`; English and Spanish; dark theme only; Tailwind tokens as the single color source; no raw hex in components; no backend or API changes

**Scale/Scope**: Four navigation sections, one new Home dashboard, two presentation widgets, existing task/commitment collections, no data-volume change that requires virtualization

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence / Plan |
|---|---|---|
| I. Clean code, SOLID, simplicity | PASS | Small presentational widgets; `RowActions` reused by task and commitment rows; no speculative abstractions. |
| II. Strict TypeScript | PASS | Discriminated unions for weather and suggestion states; explicit prop types; no `any` or assertions at UI boundaries. |
| III. Feature-Sliced Design | PASS | Pages compose widgets/features; presentational widgets do not fetch; new widgets import only lower layers; narrow feature entry points keep lazy chunks intact. |
| IV. Backend architecture | N/A | No backend files or API contracts are touched. |
| V. React component design | PASS | `HomePage` owns data composition; dashboard widgets are presentational; dialog behavior is shared through a small hook. |
| VI. Styling, tokens, visual consistency | PASS | Canonical values live only in the Tailwind `@theme` block; components consume semantic tokens; dark canvas and Inter are global. A derived `border-strong` token is added for interactive control boundaries. |
| VII. Testing and QA | PASS | Existing tests updated for intentional markup changes; new tests cover navigation, logo, tokens, Home, weather, suggestions, row actions, and i18n parity. |
| VIII. Performance | PASS | Icons are individually imported; font is self-hosted and subset; no new runtime state library; route-level lazy loading retained. |
| IX. Resilience and fault isolation | PASS | Weather is always optional; no-location, loading, stale, unavailable, and error states are labeled and never block tasks or commitments. |
| X. API contracts | N/A | No HTTP contract changes. |
| XI. Constants and configuration | PASS | New copy lives in i18n resources; palette values live in one token source; no scattered magic values. |
| XII. Security and privacy | PASS | No new personal data, network call, or storage. Existing guest-storage behavior is untouched. |
| XIII. Accessibility | PASS | Native modal dialog, focus trap/return, visible focus, 44 px touch targets, keyboard and touch access to row actions, reduced-motion support, AA contrast. |
| XIV. Internationalization | PASS | New `home` namespace and navigation keys in English and Spanish; no hardcoded user-facing copy. |
| XVI. Quality gates | PASS | Work runs through `npm run typecheck`, `lint`, `test`, and `build`. |
| XVII. Server state and async UX | PASS | No new server state. Home reads existing guest-storage hooks; loading/empty/error states are available. |
| XIX. Weather integration | PASS | Presentation only; no provider SDK, no frontend provider call, no raw provider errors. |
| XX. Stack governance and dependencies | PASS | Two runtime dependencies are justified in `research.md` (icon set and self-hosted Inter), including need, alternatives, bundle impact, license, and security posture. |
| Visual Identity and Design System | PASS | Canonical palette, 16 px card radius, 8 px control radius, Inter, tabular numerals, 12–16 px row gaps, token-only pills, touch-safe row actions. |

**Border-contrast note**: the canonical decorative border (`#23323A`) is a subtle separator and does not reach 3:1 against the surface. Interactive controls (inputs, selects, buttons, checkboxes, and radio controls) MUST use the derived `border-strong` token (`#5B6B73`, verified at approximately 3.1:1). The existing contrast test is updated to distinguish decorative card boundaries from interactive control boundaries; the canonical border itself is not changed.

**Suggestion CTA note**: the constitutional suggestion-card treatment includes a dark slate CTA with white text. This feature has no suggestion engine or apply behavior, and Home omits the suggestion region entirely when no real suggestion data exists (FR-025). The component contract therefore reserves `suggestion-cta` for future action-bearing suggestions but renders no fake control. When a future suggestion feature adds actions, the dark CTA is mandatory.

**Post-design re-check**: PASS. Phase 1 introduces no persistence, API, or provider contract; FSD boundaries and the approved stack remain intact.

## Project Structure

### Documentation (this feature)

```text
specs/005-calm-tech-dark-ui/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui-contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md              # Created by /speckit.tasks, not this command
```

### Source Code (repository root)

```text
frontend/
├── index.html
├── package.json
├── src/
│   ├── index.css                         # Canonical @theme tokens, dark root, motion keyframes
│   ├── app/
│   │   ├── bootstrap.tsx                 # Inter font import
│   │   ├── router.tsx                    # Home route title namespace; Foundation route retained
│   │   ├── RouteError.tsx
│   │   └── providers.tsx
│   ├── pages/
│   │   ├── HomePage.tsx                  # Data composition for the read-only dashboard
│   │   ├── TasksPage.tsx
│   │   ├── CommitmentsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── FoundationPage.tsx
│   ├── widgets/
│   │   ├── AppShell.tsx                  # Sticky blurred header, canvas, skip link
│   │   ├── Navigation.tsx                # Four destinations, desktop row, mobile trigger
│   │   ├── MobileNavigationDrawer.tsx    # Native dialog, focus trap/return, scroll lock
│   │   ├── HomeDashboard.tsx             # Presentational dashboard composition
│   │   ├── WeatherCard.tsx               # Weather presentation states
│   │   └── SmartSuggestions.tsx          # Mint suggestion presentation states
│   ├── features/
│   │   ├── tasks/
│   │   │   ├── controller.ts             # New narrow public entry for useTasks
│   │   │   └── ui/{TaskItem,TaskList,...}.tsx
│   │   └── commitments/
│   │       ├── controller.ts             # New narrow public entry for useCommitments
│   │       └── ui/{CommitmentItem,CommitmentList,...}.tsx
│   ├── shared/
│   │   ├── ui/
│   │   │   ├── WaldayLogo.tsx            # Inline SVG monogram + wordmark
│   │   │   ├── RowActions.tsx            # Hover/focus reveal + touch actions menu
│   │   │   ├── Button.tsx
│   │   │   ├── Link.tsx
│   │   │   ├── Container.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorState.tsx
│   │   │   ├── SuccessState.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   ├── lib/
│   │   │   └── useDialogFocusTrap.ts     # Shared modal focus/scroll behavior
│   │   └── i18n/
│   │       ├── index.ts                  # Register `home` namespace
│   │       └── locales/{en,es}/
│   │           ├── common.json           # Navigation labels and menu controls
│   │           └── home.json             # Dashboard, weather, suggestions, row actions
│   └── entities/
│       ├── task/
│       ├── commitment/
│       └── preferences/                  # Unchanged domain/storage; existing helpers reused
└── tests/
    ├── shell.test.tsx
    ├── shell-responsive.test.tsx
    ├── a11y-tokens.test.tsx
    ├── home-dashboard.test.tsx           # New
    ├── navigation-drawer.test.tsx        # New
    ├── walday-logo.test.tsx              # New
    ├── weather-card.test.tsx             # New
    ├── smart-suggestions.test.tsx        # New
    ├── row-actions.test.tsx              # New
    └── existing task/commitment/preferences suites
```

**Structure Decision**: One frontend SPA in `frontend/`, following the existing Feature-Sliced Design layers. `HomePage` is the container that reads existing feature hooks; the Home dashboard, weather card, and suggestion card are presentational widgets. Navigation is split into a shell-level desktop row and a mobile dialog drawer. A shared `RowActions` primitive is used by both editable row types, while Home rows remain read-only.

## Implementation Strategy

### Workstream 1 — Tokens, typography, and shared primitives

- Replace the light values in `src/index.css` with the canonical dark palette: `canvas`, `surface`, `surface-raised`, `border`, `border-strong`, `text`, `text-muted`, `primary`, `primary-strong`/`primary-hover`, `warm`, `cool`, `suggestion-*`, `tag-*`, plus accessible `danger`, `success`, `warning`, and `focus` values derived from the approved hues.
- Keep the existing semantic token names where possible (`surface`, `text`, `text-muted`, `border`, `primary`, etc.) so existing components migrate by token value rather than by mass renaming. Add `canvas` and `surface-raised` for the new hierarchy.
- Set `html { color-scheme: dark; }`, a canvas body background, Inter as the primary family with `system-ui` fallback, and the global focus ring on the `focus` token.
- Add the derived `border-strong` token and apply it to every interactive control boundary. Decorative cards, skeletons, and separators continue to use the subtle canonical border.
- Add a short drawer entry keyframe and retain the existing global `prefers-reduced-motion` override.
- Restyle `Button`, `Link`, `Container`, `EmptyState`, `ErrorState`, `SuccessState`, `Skeleton`, `Loading`, `ConfirmDialog`, `RouteError`, and `ErrorBoundary` with the new surfaces, 16 px card radius, 20–24 px card padding, and dark-friendly focus/contrast.
- Add `WaldayLogo.tsx` under `shared/ui/` using the exact supplied geometry and wordmark, but with `currentColor`/`text-primary` instead of a raw hex to comply with the token rule. Correct the SVG namespace to `http://www.w3.org/2000/svg`.
- Add `RowActions.tsx`: desktop inline actions revealed by `group-hover`/`group-focus-within` with no layout shift; narrow/touch mode uses a persistent compact disclosure control with 44 px targets. Preserve the exact accessible action names used by existing tests.

### Workstream 2 — Application shell and navigation

- Rework `AppShell` into a sticky header (`bg-canvas/80 backdrop-blur-md`, subtle bottom border), canvas main region, existing skip link, and one main landmark.
- Move the brand link into the header and render `WaldayLogo` there; keep a single `<nav aria-label>` landmark.
- `Navigation` exposes exactly Home, Tasks, Commitments, and Settings. Desktop renders an inline row at `md` and above; below `md` only the hamburger trigger remains. Active links use mint text, an elevated surface, and a non-color underline/indicator.
- `MobileNavigationDrawer` uses a native `<dialog>` opened with `showModal()`, a canvas/95 blurred full-width panel, stacked `p-4 rounded-2xl` destinations, an explicit close control, Escape handling, focus entry/return, background scroll lock, route-change close, and close-on-resize-to-desktop. Shared focus-trap behavior is extracted into `useDialogFocusTrap`.
- Remove Foundation from primary navigation; keep its route and page in place per spec. Add the new navigation and menu-control strings in both locales.
- Add a mobile-safe `theme-color` meta value in `index.html` for the canvas color.

### Workstream 3 — Home dashboard and presentation surfaces

- Add narrow public entries `features/tasks/controller.ts` and `features/commitments/controller.ts` so Home can import `useTasks`/`useCommitments` without pulling the full feature UI (TaskForm, TaskItem, dialogs) into the initial chunk.
- Recompose `HomePage` as a container: read the existing task and commitment hooks, read preferences/formatting, derive task groups and the current-day commitments, and determine the weather state (`no-location` when no preference location exists; `unavailable` otherwise because no provider is in scope).
- `HomeDashboard` renders: a page-level date/heading region; the weather card; the conditional Smart Suggestions card; today's commitments; the full task collection grouped pending/completed with counts. Home rows are read-only and expose no edit/delete actions. Empty regions use calm dark empty cards with links to Tasks, Commitments, or Settings.
- `WeatherCard` implements the discriminated state union from `contracts/ui-contracts.md` (`no-location`, `loading`, `ready`, `stale`, `unavailable`, `error`), formats measurements through the existing `formatMeasurement` preference helper, uses `tabular-nums`, soft `warm`/`cool` badges with text, and a Settings action for the no-location state.
- `SmartSuggestions` implements the ready/loading/error union, returns `null` for an empty ready list, uses the high-contrast light mint surface/deep slate text/dark CTA tokens, and exposes no accept/dismiss controls until a suggestion engine exists.
- Add `home.json` for English and Spanish and register the `home` namespace; update the Home route title handle to use it.

### Workstream 4 — Editable rows, forms, and page polish

- Re-skin task and commitment rows as elevated deep-slate cards with 16 px radius, comfortable padding, `space-y-3` list gaps, tabular times, and at most the three primary data points defined by the spec. Task rows keep the completion control, title, and a priority/status pill; commitment rows show title/time and a fixed/flexible pill. Secondary metadata stays muted and compact.
- Replace always-visible task/commitment actions with `RowActions`. Fine-pointer wide screens (`min-width: 768px`, hover, fine pointer) reveal on hover/focus without changing row layout; coarse-pointer and narrow/touch contexts always expose the compact actions control, including wide tablets. Keep delete confirmation dialogs and focus-return behavior intact.
- Use token-only pill styles for priority, fixed/flexible, and status labels; conflict or past-due text keeps semantic warning/danger tokens plus a text label.
- Apply the dark surfaces and token-only controls to task forms, commitment forms, date navigation, notices, settings/preferences fields, skeletons, not-found, and the retained Foundation page. Inputs, selects, textareas, checkboxes, and radios move to `border-strong`.
- Add `id="weather-location"`/`scroll-mt-24` to the weather location field so the Home no-location action can deep-link to `/settings#weather-location`.
- Keep all labels, error associations, live regions, and focus behavior from the existing features; no business logic or validation is rewritten.

### Workstream 5 — Verification and test migration

- Update shell tests for the new four-link navigation, mobile trigger, sticky header, active `aria-current`/non-color indicator, and responsive markup; update the contrast test to assert `border-strong` for interactive controls and document the decorative border.
- Add tests for mobile drawer open/close, focus entry/return, Escape, route-change close, resize close, and body scroll lock; logo rendering and text toggle; Home states (including read-only rows and the storage notice); weather states including `error` and units; suggestion states and mint treatment; row-action fine-pointer/coarse-pointer modes; route-level dark surfaces; and English/Spanish parity.
- Run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build`. Coverage must remain at or above the configured global and layer thresholds.
- Perform the manual viewport, zoom, reduced-motion, keyboard, screen-reader spot-check, and raw-hex scans listed in `quickstart.md`, plus the SC-009 usability check and SC-011 design review.

## Complexity Tracking

No constitutional violations require justification. The two dependency additions are permitted under Principle XX and are justified in `research.md`. The `border-strong` token is an allowed derived variant of the canonical palette and is required to keep interactive boundaries at WCAG AA contrast.
