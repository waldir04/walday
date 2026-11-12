# Data Model: Initial Application Foundation

**Source of truth**: `spec.md`, `plan.md`, and `.specify/memory/constitution.md`

**Scope**: Foundation contracts only. There are **no Express server models, no PostgreSQL tables, no Prisma schema or migrations, and no API entities** in Specification 001. Existing guest `localStorage` data for features 002–004 remains client-side and is not server state.

## 1. Foundation Entities

### 1.1 Design Token

| Field | Type / allowed values | Notes |
|---|---|---|
| `name` | string | Semantic token name. |
| `category` | `color`, `typography`, `spacing`, `radius`, `shadow`, `density` | Token family. |
| `semanticRole` | string | Purpose such as `surface`, `danger`, or `focus`. |
| `value` | CSS value | Defined only in the Tailwind v4 `@theme` block. |
| `theme` | `light` | Dark theme is deferred. |
| `contrastPair` | optional color pair | Required where the token is used for text or interface contrast. |

**Invariants**

- `src/index.css` `@theme` is the single source of truth; no duplicated token definitions in a legacy Tailwind config.
- The semantic palette includes at least `primary`, `surface`, `muted`, `border`, `danger`, `success`, `warning`, and `focus`.
- Typography defines display, title, body, and caption levels; spacing, radius, shadow, and density scales are explicit.
- Text contrast is at least 4.5:1; large text and interface components are at least 3:1.
- Components do not contain raw hexadecimal colors; arbitrary values are used only when no token exists.

**Validation**: FR-010, FR-011; VR-009; SC-008.

### 1.2 Route Definition

| Field | Type / allowed values | Notes |
|---|---|---|
| `path` | string | Unique route path. |
| `page` | element or lazy component | Page composition stays in `pages`/`widgets`. |
| `titleKey` | translation key | Localized document title. |
| `navLabelKey` | optional translation key | Present when the route appears in navigation. |
| `navVisible` | boolean | Whether the route is intended for primary navigation. |
| `errorElement` | optional route error surface | Route-level containment and recovery. |
| `isIndex` | boolean | Exactly one home/index route. |
| `isCatchAll` | boolean | Exactly one not-found catch-all route. |
| `loadingFallback` | skeleton/loading contract | Used for lazy route chunks. |

**Invariants**

- Paths are unique and every declared route resolves on direct load.
- The route table includes a home route, at least one non-business foundation placeholder, and a catch-all not-found route.
- Every route has a localized title and a page heading; route changes update focus and announce the change.
- Navigation exposes all routes intended for users and marks the current route with `aria-current="page"`.
- Client-side navigation does not perform a full reload; browser back/forward restores the correct state.
- Route definitions are extensible by later feature specifications without rewriting the shell.

**Validation**: FR-006–FR-009; VR-005; SC-003.

### 1.3 Application Shell Region

| Field | Type / allowed values | Notes |
|---|---|---|
| `regionName` | `banner`, `navigation`, `main` | Semantic application region. |
| `element` | semantic HTML element | Prefer native landmarks over ARIA. |
| `landmarkRole` | implicit or explicit role | Must be exposed correctly to assistive technology. |
| `skipLinkTarget` | optional element id | The main region is the target. |
| `pageContainer` | layout contract | Shared max-width and responsive padding. |
| `responsiveBehavior` | layout rules | Mobile-first and reflowable. |

**Invariants**

- One banner/header, one named navigation landmark, and one main landmark.
- The main region is the skip-link target and has a logical focus target.
- Each page has one primary `h1` and a logical heading hierarchy.
- The shell owns structure and responsive behavior, not business data.
- At 360, 768, 1024, and 1440 CSS pixels there is no horizontal scrolling, clipping, or lost navigation.
- The shell reflows at 400% zoom and remains usable at 200% text resizing.

**Validation**: FR-004, FR-005, FR-017; VR-007, VR-008; SC-004, SC-005.

### 1.4 UI Primitive

| Field | Type / allowed values | Notes |
|---|---|---|
| `name` | string | Primitive name, such as `Button` or `Skeleton`. |
| `props` | explicit typed contract | No untyped or boolean-prop sprawl. |
| `variants` | explicit union/discriminated variants | Only variants required by the shell. |
| `states` | `default`, `focus-visible`, `disabled`, `pending` where relevant | Predictable visual and interaction states. |
| `accessibleName` | caller-provided or derived | Every interactive control has a meaningful name. |
| `targetSize` | at least 24×24 CSS px, 44×44 recommended | WCAG 2.2 target size. |
| `dataFetching` | `false` | Primitives never fetch data. |
| `businessRules` | `false` | Primitives never contain business rules. |

**Invariants**

- Only shell-required primitives are introduced: button, link, container, skeleton, empty state, error state, and success feedback.
- Presentational primitives have no feature imports, network access, or domain logic.
- Focus is always visible and consistent with the shared focus token.
- Success feedback is localized, announced through an appropriate live region, and used when a user-visible mutation succeeds.
- A full component library is out of scope.

**Validation**: FR-012, FR-018; VR-008, VR-009.

### 1.5 Translation Resource

| Field | Type / allowed values | Notes |
|---|---|---|
| `locale` | `en`, `es` | English is canonical and the fallback. |
| `namespace` | string | `common` for shared UI; feature namespaces for business text; no hardcoded copy. |
| `keys` | string map | Descriptive keys for labels, titles, errors, loading, empty, success, task copy, and accessibility text. |
| `fallback` | `en` | Missing keys fall back without raw keys. |
| `interpolation` | library-managed | No ad hoc string concatenation. |
| `pluralization` | library-managed | Correct plural forms. |
| `documentLang` | active locale | Updated when the language changes. |
| `languageChangeMechanism` | typed function/API | Visible selector is out of scope. |

**Invariants**

- English and Spanish resources have parity for all user-facing text; missing keys fall back to English.
- No user-facing text or aria label is hardcoded.
- Applying a language change updates the UI, document title, and `<html lang>` without a reload.
- The application starts in English when no explicit stored language preference exists; an explicit stored preference may override it. Implicit browser-language detection at startup is deferred.
- Timezone and weather-unit preferences remain independent from the interface language.

**Validation**: FR-020–FR-022; VR-006; SC-006.

### 1.6 Environment Configuration Value

| Field | Type / allowed values | Notes |
|---|---|---|
| `name` | string | For example `VITE_API_BASE_URL`. |
| `type` | explicit type | Derived from the Zod schema. |
| `required` | boolean | No variables are required by the foundation. |
| `default` | optional safe default | Documented when present. |
| `visibility` | `public` or `secret` | Only public values may use `VITE_*`. |
| `schema` | Zod schema | Validated at startup before the first render. |
| `failureBehavior` | `fail-fast` | Safe, non-sensitive message. |

**Invariants**

- `VITE_API_BASE_URL` is optional and must be a valid URL when present.
- No mandatory environment variable is introduced for the initial foundation.
- Only public, non-sensitive values are exposed to the client; no secrets are committed or shipped.
- `import.meta.env` is accessed only through the centralized configuration module.
- Invalid configuration fails fast with a safe message; with no variables, the application starts normally.

**Validation**: FR-027, FR-028; VR-004; Readiness Gate 10 (validated configuration, no secrets exposed).

## 2. Storage Boundary Contracts

Guest storage is untrusted and MUST be validated on read with Zod. Storage is not TanStack Query server state.

| Contract | Storage key | Shape | Fallback / invalid behavior |
|---|---|---|---|
| Stored Preferences | `walday:preferences` | `language: en \| es`; `dateTimePresentation: locale-short \| locale-medium \| locale-long`; `weatherUnits: metric \| imperial`; `weatherLocation: { name: string } \| null` | Corrupt or unavailable storage returns defaults. Unsupported language falls back to English. |
| Stored Commitments | `walday:commitments` | `id`; `title`; optional `description`; `date`; `startTime`; `endTime`; `type: fixed \| flexible` | Corrupt or unavailable storage returns `[]`; invalid records are dropped; `startTime` must be earlier than `endTime`. |
| Stored Tasks | `walday:tasks` | `id`; `title`; optional `description`; `priority: low \| medium \| high`; optional `dueDate`; optional `estimatedDuration`; `completed`; `createdAt` | Corrupt or unavailable storage returns `[]`; invalid records are dropped; title must be at least 3 characters after trimming. |

**Invariants**

- Schemas are the source of truth for stored types; types SHOULD be derived with `z.infer`.
- Reads and writes never throw for unavailable or corrupt storage.
- Existing keys and user-visible feature behavior are preserved.
- No authentication tokens or sensitive data are stored in `localStorage`.

**Validation**: FR-024, FR-027; VR-014; constitution Principle XVIII storage rules.

## 3. Relationships

- **Route Definition → Application Shell Region**: every route renders inside the shell's main region and contributes navigation/title metadata.
- **Design Token → UI Primitive / Shell**: primitives and shell surfaces consume semantic tokens; tokens do not depend on components.
- **Translation Resource → Route Definition / Shell / Error / Loading**: titles, navigation labels, error recovery, loading announcements, and aria labels come from translation keys.
- **Environment Configuration Value → Application Startup / QueryClient**: configuration is validated before render and provides a future backend base URL boundary.
- **Query Key Factory → QueryClient / Future Queries**: a minimal `queryKeys` root factory produces hierarchical keys; future entity/feature resources extend it and never use ad-hoc key arrays.
- **Storage Contract → Existing Features**: preferences, commitments, and tasks remain behind their entity/feature storage boundaries.

No relationship represents a server resource, database table, or HTTP endpoint in this feature.

## 4. State Transitions

### Route lifecycle

`idle → loading (lazy chunk) → ready | error`

- On success: render the route, update the title, move focus to the heading/main region, and announce the change.
- On error: render the route error surface with retry/navigation; keep the shell usable where practical.

### Language state

`default(en) → en | es`

- With no explicit stored preference, the application starts in `en`.
- An explicit stored preference may override the default.
- Applying a supported language updates the UI, document title, and `<html lang>` without reload.
- Unsupported values fall back to `en`.
- Implicit browser-language detection at startup is deferred.

### Configuration lifecycle

`unvalidated → valid → application starts`

`unvalidated → invalid → fail-fast safe message`

### Storage lifecycle

`read → parsed → valid → normalized`

`read → invalid/corrupt/unavailable → defaults or drop`

## 5. Validation Mapping

| Entity / contract | Spec requirements | Validation rules | Success criteria |
|---|---|---|---|
| Design Token | FR-010, FR-011 | VR-009 | SC-008 |
| Route Definition | FR-006–FR-009 | VR-005 | SC-003 |
| Application Shell Region | FR-004, FR-005, FR-017, FR-018 | VR-007, VR-008 | SC-004, SC-005 |
| UI Primitive | FR-012, FR-018 | VR-008, VR-009 | SC-008 |
| Translation Resource | FR-020–FR-022 | VR-006 | SC-006 |
| Environment Configuration Value | FR-027, FR-028 | VR-004 | Readiness Gate 10 |
| Storage contracts | FR-024, FR-027 | VR-014 | SC-012 |
| Error/loading/empty/success states | FR-013–FR-016 | VR-011 | SC-007 |
| Query key factory / server-state contract | FR-025 | VR-012 | Readiness Gate 13 |
| FSD boundaries | FR-023, FR-024 | VR-010, VR-001, VR-002 | SC-009 |
| Quality gates | FR-030–FR-036 | VR-012, VR-013 | SC-002, SC-010, SC-011 |

## 6. Explicit Backend Boundary

- No Express application, routes, middleware, controllers, or services.
- No PostgreSQL database, tables, migrations, or connection configuration.
- No Prisma schema, client, models, or seed data.
- No backend API contract or client; no network calls.
- The future backend stack remains Node.js LTS, Express, Zod, PostgreSQL, Prisma, and Vitest, introduced only by a separate backend specification.
- A future backend base URL will be supplied through validated frontend configuration; frontend and backend remain independently deployable.

## 7. Scale and Data Volume Assumptions

- No server data volume or concurrency assumptions apply to this feature.
- Guest storage is small, per-browser, and bounded by the existing feature behavior.
- There are no pagination, streaming, or bulk-import contracts in the foundation.
