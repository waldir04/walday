# Data Model: Calm Tech Dark UI Redesign

**Feature**: `005-calm-tech-dark-ui` | **Date**: 2026-11-13

This feature is a presentation rewrite. It introduces **no new persisted entities, storage keys, migrations, API payloads, or database tables**. The models below describe existing domain data consumed read-only and the new in-memory presentation contracts.

## Existing Domain Data (read-only)

### Task

Source: `frontend/src/entities/task/model/types.ts`

| Field | Type | UI use |
|---|---|---|
| `id` | string | Row identity and accessible action names |
| `title` | string | Primary row content |
| `description` | string (optional) | Secondary content |
| `status` | `'pending' \| 'completed'` | Completion control and grouping |
| `priority` | priority literal union | Priority pill and metadata |
| `dueDate` | local date string (optional) | Due-date metadata and past-due label |
| `estimatedMinutes` | number (optional) | Duration metadata |
| `createdAt` | ISO timestamp | Existing ordering only |

**Validation**: unchanged. Tasks are validated by the existing entity schema and storage repository. The UI MUST NOT add, remove, or reshape task fields.

**Home behavior**: all tasks are displayed, grouped into pending and completed, with counts. Home rows are read-only and expose no edit, delete, or completion control.

### Commitment

Source: `frontend/src/entities/commitment/model/types.ts`

| Field | Type | UI use |
|---|---|---|
| `id` | string | Row identity and accessible action names |
| `title` | string | Primary row content |
| `description` | string (optional) | Secondary content |
| `date` | local date string | Current-day filter |
| `startTime` / `endTime` | local time strings | Tabular time range |
| `type` | `'fixed' \| 'flexible'` | Category pill and type meaning |
| `createdAt` | ISO timestamp | Existing ordering only |

**Validation**: unchanged. Commitment creation, overlap detection, and storage validation remain in the existing entity/feature layers.

**Home behavior**: only commitments for the current local day are displayed, ordered using the existing `orderedCommitments` helper. Home rows are read-only and expose no edit or delete actions.

### UserPreferences

Source: `frontend/src/entities/preferences/model/types.ts`

Relevant display fields:

| Field | Type | UI use |
|---|---|---|
| `weatherUnits` | `'metric' \| 'imperial'` | Weather measurement formatting |
| `weatherLocation` | `WeatherLocation \| null` | Weather location label and no-location state |
| `dateTimePresentation` | `'compact' \| 'standard' \| 'full'` | Date style in Home and lists |
| `language` | `'en' \| 'es' \| null` | Existing i18n; unchanged |

**Validation**: unchanged. The UI MUST NOT write preferences and MUST NOT perform location resolution or unit conversion beyond the existing `formatMeasurement` helper.

## New Presentation Models (in memory only)

### WeatherCondition

```ts
export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'storm'
  | 'fog';
```

Each condition maps to a localized label and a `warm`/`cool`/neutral badge. Color MUST be accompanied by the label.

### WeatherView

```ts
import type { WeatherMeasurement } from '@/entities/preferences';

export interface WeatherView {
  locationLabel: string;
  temperature: WeatherMeasurement;
  condition: WeatherCondition;
  high?: WeatherMeasurement;
  low?: WeatherMeasurement;
  precipitation?: WeatherMeasurement;
  wind?: WeatherMeasurement;
  updatedAt?: string;
}
```

- `WeatherMeasurement` is the existing discriminated union for temperature, wind speed, and precipitation.
- Measurements are formatted with the existing `formatMeasurement(measurement, unit, locale)`.
- `updatedAt`, when present, is displayed as localized tabular time text.
- No provider DTO may cross into this model.

### WeatherCardState

```ts
export type WeatherCardState =
  | { status: 'no-location' }
  | { status: 'loading' }
  | { status: 'ready'; data: WeatherView }
  | { status: 'stale'; data: WeatherView }
  | { status: 'unavailable' }
  | { status: 'error' };
```

**State transitions** (future provider wiring):

```text
no-location ──(location set)──> loading ──(success)──> ready
                                  ├──(fresh cache missing, last known good)──> stale
                                  ├──(provider failure)──> unavailable
                                  └──(unexpected UI/data error)──> error
stale/ready/unavailable/error ──(location cleared)──> no-location
```

For this feature, Home supplies:

- `no-location` when `preferences.weatherLocation` is `null`;
- `unavailable` otherwise, because no weather provider or cache exists yet.

`loading`, `ready`, `stale`, and `error` are implemented and tested at the component level for future wiring. `error` is the localized unexpected-failure presentation and must not expose a raw error.

### SuggestionView

```ts
export interface SuggestionView {
  id: string;
  title: string;
  reason: string;
}
```

- `id` is stable within a rendered collection.
- `reason` is required and rendered as text; the surface MUST NOT communicate the rationale through color or icon alone.
- No action, proposed change, or apply callback exists in this feature.

### SmartSuggestionsState

```ts
export type SmartSuggestionsState =
  | { status: 'loading' }
  | { status: 'ready'; suggestions: SuggestionView[] }
  | { status: 'error' };
```

**Rendering rules**:

| State | Result |
|---|---|
| `loading` | Accessible busy region with a layout-matched skeleton inside the suggestion surface |
| `ready` with one or more suggestions | High-contrast mint card with title, reason, and no action controls |
| `ready` with an empty array | Render nothing; no placeholder shell |
| `error` | Calm localized error text; no raw provider or engine error |

Home supplies `{ status: 'ready', suggestions: [] }` until a suggestion engine exists, so production renders no suggestion region.

### HomeDashboardData

```ts
import type { Commitment } from '@/entities/commitment';
import type { Task } from '@/entities/task';

export interface HomeDashboardData {
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

`HomePage` computes this shape from the existing hooks, preferences context, and entity helpers. `HomeDashboard` is presentational and performs no data access.

### RowActionView

```ts
export interface RowActionView {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
}
```

- `label` is the exact localized accessible name for the action (for example, `Edit Task title` or `Delete commitment: Team sync`).
- `tone: 'danger'` applies the danger semantic token and keeps a text label.
- Actions are not persisted.

## Validation and Invariants

1. **No new storage**: no new key, schema version, migration, or serialization is introduced.
2. **No writes from Home**: Home reads existing hooks only. Read-only rows expose no mutation callback.
3. **Measurement integrity**: weather measurements must be finite; the existing `formatMeasurement` returns `null` for non-finite values, and the card omits the metric rather than rendering invalid text.
4. **Suggestion integrity**: a suggestion without a title or reason is not rendered; duplicate IDs are not expected from the future engine and do not affect layout.
5. **Locale integrity**: all display labels come from i18n resources; no user-facing string is derived from an untranslated error or provider message.
6. **Accessibility invariants**: weather condition, suggestion rationale, priority, commitment type, and conflict/past-due states always include text, not color alone.
7. **No server-state changes**: TanStack Query usage is unchanged; guest data remains behind the existing repositories.

## Relationships

```text
UserPreferences (units, location, date style, language)
        │
        ├── formats ──> WeatherView (presentation)
        └── formats ──> Home date labels, task metadata, commitment times

Task[] ───────────────> HomeDashboard pending/completed groups
Commitment[] ─────────> filter current local date ──> HomeDashboard today's commitments
Future Weather source ─> WeatherCardState (not wired in this feature)
Future Suggestion engine ─> SmartSuggestionsState (not wired in this feature)
```
