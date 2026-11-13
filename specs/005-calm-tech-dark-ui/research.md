# Research: Calm Tech Dark UI Redesign

**Feature**: `005-calm-tech-dark-ui` | **Date**: 2026-11-13

This research resolves the design and implementation decisions needed for the UI rewrite. There are no unresolved `NEEDS CLARIFICATION` items.

## Decision 1 — Canonical token migration in Tailwind `@theme`

**Decision**: Replace the light values in `frontend/src/index.css` with the canonical Walday Dark UI values and keep the existing semantic class names (`surface`, `surface-subtle`, `text`, `text-muted`, `border`, `primary`, `primary-hover`, `focus`, etc.) mapped to dark values. Add `canvas`, `surface-raised`, `border-strong`, `warm`, `cool`, `suggestion-surface`, `suggestion-surface-strong`, `suggestion-text`, `suggestion-cta`, `tag-border`, and `tag-text`.

**Canonical mapping**

| Token | Value | Purpose |
|---|---|---|
| `canvas` | `#0B1215` | Application background |
| `surface` | `#131D22` | Cards, rows, containers |
| `surface-raised` | `#152026` | Nested panels and hover surfaces |
| `surface-subtle` | `#152026` | Existing alias retained for nested/hover surfaces |
| `border` | `#23323A` | Decorative card and separator boundaries |
| `border-strong` | `#5B6B73` | Interactive control boundaries (derived) |
| `text` | `#F3F4F6` | Headings and primary content |
| `text-muted` | `#8B9BA3` | Metadata, timestamps, labels |
| `primary` | `#34D399` | Brand, primary indicators, primary actions |
| `primary-hover` / `primary-strong` | `#10B981` | Primary hover/active |
| `danger` | `#F87171` | Error/destructive text and controls (derived) |
| `success` | `#34D399` | Success text and indicators |
| `warning` | `#FBBF24` | Warning text and indicators |
| `focus` | `#34D399` | Global focus ring |
| `warm` | `#FBBF24` | Warm-weather context |
| `cool` | `#38BDF8` | Cool/rain context |
| `suggestion-surface` | `#A7F3D0` | Smart Suggestions background |
| `suggestion-surface-strong` | `#6EE7B7` | Suggestion accent/border |
| `suggestion-text` | `#064E3B` | Suggestion copy |
| `suggestion-cta` | `#0F172A` | Suggestion action surface |
| `tag-border` | `#2A3B44` | Category pill border |
| `tag-text` | `#9CA3AF` | Category pill label |

**Rationale**: A single `@theme` source satisfies Principles VI and XI and lets the existing class names migrate without a file-by-file rename. `canvas` is separated from `surface` because the old light theme used `surface` for both page background and cards; the dark identity requires distinct canvas and elevated card surfaces.

**Alternatives considered**:
- Keep light token names and add parallel `dark-*` classes: rejected because components would need conditional theme logic and the constitution approves only dark mode.
- Hardcode dark hex values in components: rejected by Principle VI.
- Change every class name to new semantic names: rejected as unnecessary churn with a larger regression surface.

## Decision 2 — Derived `border-strong` token for interactive controls

**Decision**: Keep the canonical `border` (`#23323A`) for decorative card boundaries and add a derived `border-strong` (`#5B6B73`) for inputs, selects, textareas, checkboxes, radios, secondary buttons, and other interactive control boundaries. Update the existing contrast test to assert AA for `border-strong` rather than the decorative border.

**Rationale**: `#23323A` on `#131D22` is approximately 1.3:1, which is appropriate for a subtle separator but not for a control boundary that must be perceivable. `#5B6B73` on `#131D22` is approximately 3.1:1, satisfying the 3:1 interface-component threshold. The canonical palette explicitly permits derived variants that preserve the approved hue and contrast relationships.

**Alternatives considered**:
- Change the canonical `border` value: rejected because the constitution defines it.
- Keep `border-border` on inputs and rely only on focus rings: rejected because controls must be distinguishable before focus.
- Use the focus mint for all control boundaries: rejected because it would make every control look active and collapse state meaning.

## Decision 3 — `WaldayLogo` uses currentColor, not a raw hex

**Decision**: Implement `frontend/src/shared/ui/WaldayLogo.tsx` with the supplied monogram geometry, `viewBox`, stroke width, line caps, and wordmark. Replace `stroke="#34D399"` with `stroke="currentColor"` and apply `text-primary` on the SVG. Correct the SVG namespace to `http://www.w3.org/2000/svg`. Keep the `className` and `showText` props, `aria-hidden="true"` on the decorative SVG, and `select-none`.

**Rationale**: The constitution prohibits raw hex in components and requires the mint brand mark. `text-primary` resolves to the canonical `#34D399` token, preserving the exact visual result while keeping a single color source. The supplied `xmlns="http://w3.org"` is not a valid SVG namespace.

**Alternatives considered**:
- Keep the raw string exactly as supplied: rejected because it violates Principle VI and the component review gate.
- Load the logo from an image: rejected by the constitution, which requires an inline vector component.

## Decision 4 — Responsive navigation with a native dialog drawer

**Decision**: Use CSS breakpoints for the header (`md:flex` desktop row, `md:hidden` trigger) and a native `<dialog>` for the mobile drawer. `showModal()` supplies top-layer rendering, background inertness, Escape handling, and focus containment. A small shared `useDialogFocusTrap` hook adds deterministic focus trapping, focus return, scroll lock, and jsdom testability. The drawer closes on destination selection, Escape, close control, route change, and resize to `md`.

**Rationale**: Native dialog semantics are the smallest robust solution for a modal navigation drawer and align with the existing `ConfirmDialog` implementation. A third-party drawer library would add bundle weight and duplicate focus logic. Rendering the drawer only when open avoids duplicate navigation in the accessibility tree.

**Alternatives considered**:
- Custom fixed overlay with `aria-modal`: viable but requires hand-written inert/focus/scroll behavior that native `<dialog>` already provides.
- A JS `matchMedia` switch for the entire header: adds a resize listener and a hydration-style flash without improving the breakpoint behavior.
- A third-party headless UI package: rejected under dependency discipline.

## Decision 5 — Row actions: CSS reveal on desktop, native disclosure on touch

**Decision**: Add `shared/ui/RowActions.tsx`. Fine-pointer wide screens (`min-width: 768px`, `hover: hover`, and `pointer: fine`) render inline edit/delete controls inside a container that is `opacity-0` by default and becomes visible through `group-hover` and `group-focus-within`, with a `150ms ease-out` opacity transition and reserved space so the row does not shift. Coarse-pointer and narrow/touch contexts render a persistent native `<details>` disclosure with a compact trigger and 44 px action targets. Both modes preserve the exact accessible labels already used by tests.

**Rationale**: CSS-only mode visibility preserves the desktop row density and reveals actions on keyboard focus. The coarse-pointer/narrow mode uses a native `<details>` disclosure that mounts its action buttons only while open, so a closed row exposes a single action set and avoids duplicate accessible names. Using native `<details>` avoids another popover dependency and gives keyboard/touch behavior for free.

**Alternatives considered**:
- Always-visible edit/delete buttons: rejected because it contradicts the calm row density and the spec's hidden-by-default requirement.
- A JS media-query switch: unnecessary; CSS `display:none` removes the inactive mode from the accessibility tree in real browsers.
- A custom popover with outside-click logic: more code and more failure modes than `<details>`.

## Decision 6 — Home dashboard data composition

**Decision**: `HomePage` calls the existing `useTasks` and `useCommitments` hooks through new narrow public entries (`features/tasks/controller.ts`, `features/commitments/controller.ts`). It computes pending/completed counts, renders the same task collection as the Tasks page, filters commitments to the current local day with existing `commitmentsForDate`/`orderedCommitments`, and passes plain domain data to presentational widgets. Home rows are read-only.

**Rationale**: Reusing the existing hooks preserves guest-storage behavior, cross-tab synchronization, and validation. Narrow entries avoid importing TaskForm, TaskItem, dialogs, and commitment UI into the initial bundle; the lazy Tasks and Commitments routes still use their existing skeletons. No new API or storage adapter is introduced.

**Alternatives considered**:
- Read `localStorage` directly in Home: rejected; it bypasses the repositories and the guest-storage rules.
- Add a new dashboard query/endpoint: rejected; there is no backend and the feature is presentation-only.
- Show only counts: rejected by the spec clarification that Home mirrors the Tasks collection.

## Decision 7 — Weather and suggestion presentation contracts

**Decision**: Define typed presentation unions in `widgets/WeatherCard.tsx` and `widgets/SmartSuggestions.tsx` (documented in `contracts/ui-contracts.md`). Weather supports `no-location`, `loading`, `ready`, `stale`, `unavailable`, and `error`; suggestions support `loading`, `ready`, and `error`, with an empty ready list rendering nothing. Home supplies `no-location` when the preference has no location and `unavailable` otherwise because no provider is in scope. Measurements use the existing `formatMeasurement(measurement, unit, locale)` helper. Copy lives under the `home` namespace.

**Rationale**: The presentation layer is ready for the future weather and suggestions features without pretending that data exists. The unions make every state explicit and testable, and the zero-data Home path is honest to users.

**Alternatives considered**:
- Static sample weather/suggestions: rejected because it would misrepresent data and violate the spec clarification.
- A shared generic card state type: rejected; weather and suggestions have different content and actions, and a generic state would obscure the contract.
- Defer the components entirely: rejected because the feature explicitly requires the surfaces.

## Decision 8 — Dependency additions: Lucide React and self-hosted Inter

**Decision**: Add `lucide-react@1.72.0` and `@fontsource-variable/inter@5.3.0`.

**Lucide React**
- **Need**: The specification explicitly requires Lucide `Menu`/`X` icons, and row actions benefit from consistent `MoreHorizontal`, `Pencil`, and `Trash2` icons.
- **Alternatives**: Inline SVGs would require hand-maintained path data and duplicate icon conventions; an icon font adds a larger blocking asset; no icon set leaves the interface inconsistent.
- **Bundle/performance**: ESM and tree-shakable; import named icons only. Expected runtime cost is a few kilobytes after tree shaking. No icon component uses dynamic imports.
- **License/security**: ISC license; no runtime network access; widely maintained.

**@fontsource-variable/inter**
- **Need**: The constitution requires Inter as the primary typeface with `system-ui` fallback. The current `@theme` uses only system fonts.
- **Alternatives**: A remote Google Fonts request adds a third-party dependency, privacy exposure, and a render-blocking request; relying on system fonts does not satisfy the Inter requirement.
- **Bundle/performance**: Self-hosted variable WOFF2 with the package's unicode-range subsets; browsers fetch only the subsets they need. One font face, no runtime network request, `font-display: swap` controlled by the package CSS.
- **License/security**: SIL Open Font License 1.1; static asset served from the application origin.

Both additions are recorded in `plan.md` and must be reflected in `package.json` and the committed lockfile. No other runtime dependency is added.

## Decision 9 — Motion and reduced motion

**Decision**: Use a short CSS entry animation for the drawer and `150ms ease-out` opacity/border transitions for hover and row-action reveal. Keep the global `prefers-reduced-motion` rule that reduces animation and transition durations to effectively zero. Do not add an animation library.

**Rationale**: The spec requires a smooth drawer mount and hover fades, while the constitution requires reduced-motion support and minimal motion. CSS handles both without JavaScript timers or layout animation.

**Alternatives considered**:
- Framer Motion or similar: rejected as unnecessary runtime weight.
- Transitioning height or transform on the row: rejected because it can shift layout; opacity-only reveal is used.

## Decision 10 — Test migration and coverage

**Decision**: Update the existing shell and token tests to the new intentional markup. Add focused tests for the drawer, logo, Home dashboard, weather, suggestions, row actions, and locale parity. Keep the existing task, commitment, preference, storage, security, and accessibility suites intact; they are the regression evidence that business behavior was preserved.

**Rationale**: Existing tests encode real behaviors (focus return, delete confirmation, storage validation, i18n). They must continue to pass except where the visual markup intentionally changes. New tests target the new contracts rather than snapshots.

**Alternatives considered**:
- Snapshot-heavy UI tests: rejected by Principle VII.
- Manual-only verification for the drawer: rejected; focus and Escape behavior are critical journeys.
