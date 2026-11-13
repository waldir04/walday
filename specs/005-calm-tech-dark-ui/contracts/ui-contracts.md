# UI Contracts: Calm Tech Dark UI Redesign

**Feature**: `005-calm-tech-dark-ui` | **Date**: 2026-11-13

These contracts define the presentation surface consumed by pages, widgets, and shared primitives. They are UI contracts only; there are no HTTP, database, or provider contracts in this feature.

## 1. Theme Token Contract

Source of truth: `frontend/src/index.css` `@theme` block.

| Token | Value | Required use |
|---|---|---|
| `--color-canvas` | `#0B1215` | Application background and header overlay base |
| `--color-surface` | `#131D22` | Cards, containers, editable rows |
| `--color-surface-raised` | `#152026` | Nested panels and hover surfaces |
| `--color-surface-subtle` | `#152026` | Existing alias for raised/hover surfaces |
| `--color-border` | `#23323A` | Decorative card and separator borders |
| `--color-border-strong` | `#5B6B73` | Inputs, selects, textareas, checkboxes, radios, secondary button borders |
| `--color-text` | `#F3F4F6` | Headings and primary content |
| `--color-text-muted` | `#8B9BA3` | Metadata, timestamps, secondary labels |
| `--color-text-inverse` | `#0B1215` | Text on mint/danger filled controls |
| `--color-primary` | `#34D399` | Brand mark, active navigation, primary controls |
| `--color-primary-hover` | `#10B981` | Primary hover |
| `--color-primary-strong` | `#10B981` | Alias for stronger primary emphasis |
| `--color-muted` | `#8B9BA3` | Legacy semantic alias |
| `--color-danger` | `#F87171` | Error/destructive indicators and controls |
| `--color-success` | `#34D399` | Success indicators |
| `--color-warning` | `#FBBF24` | Warning indicators and warm context |
| `--color-focus` | `#34D399` | Global focus ring |
| `--color-warm` | `#FBBF24` | Warm-weather context |
| `--color-cool` | `#38BDF8` | Cool/rain context |
| `--color-suggestion-surface` | `#A7F3D0` | Smart Suggestions background |
| `--color-suggestion-surface-strong` | `#6EE7B7` | Suggestion accent/border |
| `--color-suggestion-text` | `#064E3B` | Suggestion copy |
| `--color-suggestion-cta` | `#0F172A` | Suggestion action surface |
| `--color-tag-border` | `#2A3B44` | Category pill border |
| `--color-tag-text` | `#9CA3AF` | Category pill label |

Radius contract:

| Token | Value | Use |
|---|---|---|
| `--radius-card` | `1rem` | Cards, containers, rows |
| `--radius-control` | `0.5rem` | Buttons, inputs, compact controls |
| Pill shape | `rounded-full` | Category/status tags and compact indicators |

Rules:

- Components MUST NOT contain raw hex colors. The values above appear only in `@theme` and in `index.html` metadata.
- `#000000` MUST NOT be a canvas or primary surface.
- `border` is decorative; `border-strong` is required for interactive control boundaries.
- Contrast: normal text at least 4.5:1, large text and interface components at least 3:1. `text-muted`, `text`, `primary`, `danger`, `success`, and `warning` on `surface` are verified in the token test; `border-strong` is verified at approximately 3.1:1.
- `html` uses `color-scheme: dark`; `body` uses `canvas` and `text`.

## 2. WaldayLogo Contract

File: `frontend/src/shared/ui/WaldayLogo.tsx`

```ts
interface WaldayLogoProps {
  className?: string;
  showText?: boolean;
}
```

- Root is an inline-flex, non-selectable element with a 2.5-unit gap.
- Renders an inline `<svg width="28" height="28" viewBox="0 0 32 32">` with the exact supplied two-wave monogram geometry, `stroke="currentColor"`, `strokeWidth="3.6"`, rounded line caps and joins, `fill="none"`, `aria-hidden="true"`, and a decorative class.
- The SVG MUST inherit the mint color from `text-primary`.
- When `showText` is true (default), renders the `Walday` wordmark in `text-text` with the existing `text-xl font-semibold tracking-tight` treatment.
- The mark MUST scale without raster blur and MUST NOT be an `<img>` or external asset.

## 3. Navigation Contract

### Destinations

Exactly four, in order:

| Label key | Path | Active matching |
|---|---|---|
| `nav.home` | `/` | exact |
| `nav.tasks` | `/tasks` | prefix |
| `nav.commitments` | `/commitments` | prefix |
| `nav.settings` | `/settings` | prefix |

Foundation and any other placeholder MUST NOT appear in primary navigation. The `/foundation` route may remain reachable directly.

### Desktop (`min-width: 768px`)

- The four destinations render as an inline horizontal row.
- The hamburger trigger and mobile drawer MUST NOT be visible.
- Resting link: `text-muted`, transparent/elevated hover surface.
- Hover/focus: mint `text-primary` on `bg-surface`.
- Active link: mint text, `bg-surface`, plus a non-color underline/indicator and `aria-current="page"`.

### Mobile (`max-width: 767px`)

- Horizontal destination links MUST be hidden.
- One trigger button MUST be visible with an accessible name from `nav.openMenu`/`nav.closeMenu` and `aria-expanded`.
- Activating the trigger renders a full-width overlay drawer on `bg-canvas/95` with `backdrop-blur-lg` and a subtle border.
- The drawer contains the four destinations stacked with `p-4 rounded-2xl` and at least 44 px target height, plus an explicit close control. The trigger's icon reflects the open/close state; the drawer's close control is the visible close affordance while the modal covers the header, and focus returns to the trigger on close.
- Drawer behavior:
  - Native modal dialog semantics (`role="dialog"`, `aria-modal="true"`, labelled by the drawer heading).
  - Focus moves to the close control on open; focus remains within the drawer; focus returns to the trigger on close.
  - Escape and the close control close the drawer.
  - Selecting a destination closes the drawer before/while navigation proceeds.
  - Route changes and viewport growth to `md` close the drawer.
  - Background page scroll is locked while open.
  - The desktop navigation is not duplicated in the accessibility tree while the drawer is open.
- Drawer entry uses a short fade/translate animation disabled by `prefers-reduced-motion`.

## 4. RowActions Contract

File: `frontend/src/shared/ui/RowActions.tsx`

```ts
interface RowActionView {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
}

interface RowActionsProps {
  actions: RowActionView[];
  menuLabel: string;
  className?: string;
}
```

- Fine-pointer desktop (`min-width: 768px`, `hover: hover`, and `pointer: fine`): actions sit in an inline container with reserved space. They are `opacity-0` at rest and fade in on row `group-hover` or `group-focus-within` over `150ms ease-out`; the row MUST NOT change height or position.
- Coarse-pointer (touch) or narrow (`max-md`) contexts: a persistent compact disclosure control (`<details>`) is visible with at least a 44 px target. Opening it exposes the same actions with 44 px targets, and its action buttons mount only while open so a closed row exposes exactly one set of action controls. A wide touch device at 768 px or above MUST still use the persistent control, not the hover-only mode.
- Every action has a text label or accessible name and uses `border-strong`/focus tokens.
- `tone: 'danger'` uses the danger token and still includes a textual label.
- Existing accessible label formats are preserved:
  - `Edit <task title>`
  - `Delete <task title>`
  - `Edit commitment: <title>`
  - `Delete commitment: <title>`

## 5. WeatherCard Contract

File: `frontend/src/widgets/WeatherCard.tsx`

```ts
type WeatherCardState =
  | { status: 'no-location' }
  | { status: 'loading' }
  | { status: 'ready'; data: WeatherView }
  | { status: 'stale'; data: WeatherView }
  | { status: 'unavailable' }
  | { status: 'error' };

interface WeatherCardProps {
  state: WeatherCardState;
  unit: 'metric' | 'imperial';
  locale: string;
  onRetry?: () => void;
}
```

Presentation:

| State | Required rendering |
|---|---|
| `no-location` | Calm card: weather needs a location; action link to `/settings#weather-location`; no fake values |
| `loading` | `aria-busy` region with layout-matched skeleton; localized loading label |
| `ready` | Location label, condition label + badge, large temperature, high/low, precipitation/wind when present, updated time |
| `stale` | Same data as ready plus an explicit localized stale label; no color-only signal |
| `unavailable` | Calm text explaining weather is unavailable; no fake values; does not block other content |
| `error` | Calm localized unexpected-error text with a retry affordance when meaningful; never a raw error |

Formatting:

- Measurements use `formatMeasurement` with the configured unit and locale.
- Temperature, high/low, precipitation, wind, and updated time use `tabular-nums`.
- Badges use `warm`/`cool`/neutral tokens with text; color is never the only signal.
- Long location labels wrap; no horizontal overflow.

## 6. SmartSuggestions Contract

File: `frontend/src/widgets/SmartSuggestions.tsx`

```ts
type SmartSuggestionsState =
  | { status: 'loading' }
  | { status: 'ready'; suggestions: SuggestionView[] }
  | { status: 'error' };
```

Presentation:

| State | Required rendering |
|---|---|
| `loading` | `aria-busy` mint container with layout-matched skeleton |
| `ready` with items | Mint card (`suggestion-surface`), deep slate text (`suggestion-text`), strong mint border, heading, one card per suggestion with title and reason |
| `ready` with empty array | Render `null`; no placeholder, sample, or empty decorated shell |
| `error` | Calm localized error text; no raw error message |

Rules:

- No accept, dismiss, or adjust controls exist in this feature.
- The dark CTA token is reserved for future suggestion actions; no CTA is rendered now.
- Suggestions are visually distinct from user-owned surfaces.
- The rationale is always rendered as text.
- The region is omitted from Home when the state is empty.

## 7. HomeDashboard Contract

File: `frontend/src/widgets/HomeDashboard.tsx`

```ts
interface HomeDashboardProps {
  tasks: Task[];
  todayCommitments: Commitment[];
  taskCounts: { pending: number; completed: number };
  weather: WeatherCardState;
  suggestions: SmartSuggestionsState;
  formattingLocale: string;
  dateStyle: Intl.DateTimeFormatOptions['dateStyle'];
  weatherUnit: 'metric' | 'imperial';
  todayLabel: string;
}
```

- Presentational only: no hooks, storage access, or mutations.
- Renders a single page heading, the weather card, the conditional suggestions card, today's commitments, and the task collection grouped pending/completed with counts.
- Home task and commitment rows are read-only: no edit, delete, or completion controls.
- Empty task/commitment regions use calm dark empty cards with links to `/tasks` or `/commitments`.
- All list gaps are 12–16 px; all times and temperatures use tabular numerals.
- Cards use `surface`, `border`, `rounded-2xl`, and 20–24 px padding.

## 8. Internationalization Contract

New namespace: `home`, registered in `frontend/src/shared/i18n/index.ts`, available in `en` and `es`.

Required key families:

| Family | Examples |
|---|---|
| `home` | `title`, `heading`, `description`, `today` |
| `home.tasks` | `heading`, `pending`, `completed`, `emptyHeading`, `emptyDescription`, `emptyAction`, `viewAll` |
| `home.commitments` | `heading`, `emptyHeading`, `emptyDescription`, `emptyAction`, `viewAll` |
| `home.weather` | `heading`, `loading`, `noLocationHeading`, `noLocationDescription`, `noLocationAction`, `ready`, `unavailable`, `stale`, `error`, `high`, `low`, `precipitation`, `wind`, condition labels |
| `home.suggestions` | `heading`, `loading`, `error`, `why` |
| `common.nav` | existing labels plus `openMenu`, `closeMenu`, `drawerTitle` |
| `common.actions` | `menuLabel` with a `{{title}}` interpolation for row action disclosures |

Rules:

- No user-facing string is hardcoded in a component.
- The `document.documentElement.lang` behavior and existing route announcements are unchanged.
- Spanish labels use the existing Latin American Spanish register.

## 9. Non-Goals

- No backend route, database table, Prisma schema, migration, or API response.
- No Open-Meteo request, weather cache, or provider mapping.
- No suggestion generation, accept, dismiss, or apply behavior.
- No new task/commitment/preference field or storage migration.
- No theme switch, light theme, or parallel design system.
- No redesign of authentication screens that do not exist yet.
