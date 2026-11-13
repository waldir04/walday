# Implementation Plan: Daily Commitments

**Branch**: `004-daily-commitments` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-daily-commitments/spec.md` (updated 2026-11-12 clarifications)

> This plan revision was an audit and documentation alignment; implementation followed it on 2026-11-12. Completion evidence is recorded in [tasks.md](./tasks.md) and [quickstart.md](./quickstart.md).

## Summary

Enable guest users to capture, view, edit, and delete time-bound commitments (title, optional description, local date, start/end time, fixed or flexible type) without an account. The feature keeps all data in the browser, validates time ranges and date semantics, identifies overlaps on the same date, requires explicit acknowledgment only when the specification requires it, and never mutates a commitment as a side effect. It exposes a stable, versioned local data shape that the future Daily Agenda can read by date.

The existing implementation already provides a working FSD slice, Zod validation scaffolding, overlap detection, local persistence, EN/ES resources, and a route. It is too thin for the updated specification: it preselects a type, has no viewed-date navigation, blocks overlaps instead of acknowledging them, silently ignores storage failures, does not detect newer data from other tabs, enforces no title/description limits, does not validate calendar dates or time formats, does not filter the list by date, and bypasses shared primitives and semantic design tokens. This plan reuses the slice layout and shared primitives, adopts the mature versioned guest-store design already proven by `entities/task`, and specifies the refactors required to meet `spec.md` and the constitution.

## Technical Context

**Language/Version**: TypeScript 5.9 with the constitution's strict compiler flags; React 19.3
**Build**: Vite 8 (`@vitejs/plugin-react`), Tailwind CSS 4 via `@tailwindcss/vite`
**Primary Dependencies**: React Router 7, Zod 4, i18next 26 / react-i18next 17, TanStack Query 5 (installed at the app root), Vitest 5 with React Testing Library and jest-dom
**Storage**: Browser `localStorage`, key `walday:commitments`, versioned envelope (version, revision, updatedAt, commitments). No PostgreSQL, Prisma, or backend persistence in this feature (spec FR-044, SC-008)
**Backend**: Node.js LTS / Express / Prisma / PostgreSQL are part of the approved stack but are **not exercised** by this feature. No endpoints, schema, or migration are created.
**Testing**: Vitest 5 and React Testing Library for model, storage, component, accessibility, i18n, and integration behavior, following Arrange-Act-Assert
**Target Platform**: Responsive web application (phone, tablet, desktop; browser zoom up to 200%)
**Project Type**: Frontend-only feature slice in an existing FSD single-page application
**Performance Goals**: No network calls. Synchronous validation and overlap detection for a typical day of commitments stay imperceptible; the route remains lazily loaded; overlap computation is linear in the number of commitments on the selected date.
**Constraints**: WCAG 2.2 AA; EN/ES with locale-aware formatting; local wall-clock date/time semantics; no silent modification; no automatic rescheduling; guest-only storage; fixed/flexible conveyed by text, not color; no new runtime dependency
**Scale/Scope**: One guest per browser/device; tens of commitments per day and hundreds stored; one date view at a time

## Stack Alignment

The approved stack is closed (Constitution Principle XX). This feature uses only what the stack already provides.

| Stack element | Applicability to 004 | Decision / evidence |
|---|---|---|
| React 19 | Required | Function components and hooks; no class components |
| TypeScript 5 (strict) | Required | `frontend/tsconfig.app.json` already enables `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, and `verbatimModuleSyntax` |
| Vite | Required | Existing dev/build pipeline |
| Tailwind CSS 4 | Required | Semantic tokens from the `@theme` block only; no raw hex or palette utilities |
| React Router 7 | Required | `/commitments` route already registered; viewed date moves to the URL search string |
| TanStack Query 5 | Not applicable | Commitment data is guest local state, not server state (Constitution XVII, "Boundary with local persistence"). No `useQuery`/`useMutation` and no parallel store is introduced; the app-level `QueryClientProvider` remains untouched |
| Zod 4 | Required | Runtime validation at the storage boundary and for the form draft; contract types derived with `z.infer` |
| Node.js LTS | Development runtime only | `>=24 <25` per `frontend/package.json` |
| Express | Not applicable | No HTTP surface; FR-044 forbids sending commitment data to a server |
| PostgreSQL | Not applicable | No relational persistence in this feature |
| Prisma | Not applicable | No schema or client usage; Principle XVIII's guest-data clauses are satisfied by the versioned local store |
| Vitest 5 + RTL | Required | Model, storage, UI, a11y, i18n, and no-network regression tests |
| i18next / react-i18next | Required | New keys in the `commitments` namespace for both `en` and `es` |

Moving commitments to the backend would contradict FR-044 and the spec's Constitution Alignment and therefore requires a specification change, not an implementation decision. The plan deliberately does not add a second persistence path.

## Constitution Check

*GATE: evaluated before Phase 0 and re-checked after Phase 1.*

| Principle | Status | Evidence / notes |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | PASS | Pure domain logic in `entities/commitment`; UI/controller logic in `features/commitments`; one responsibility per module. A shared guest-store primitive is extracted only because two existing copies already exist, not speculatively |
| II. Strict TypeScript and Type Safety | PASS | Strict flags already enabled; no `any`; discriminated unions for load/write/mutation results; Zod schemas are the single source of truth for stored and draft types. Current `StoredCommitment extends Commitment` alias is replaced |
| III. Frontend FSD | PASS | `entities/commitment` → `features/commitments` → `pages/CommitmentsPage`; public `index.ts` per slice; no cross-feature imports; shared helpers contain no business rules |
| IV. Backend Architecture | N/A | No backend in scope; no route/controller/service/repository introduced |
| V. React Component Design | PASS | Controlled form with a shared Zod schema; presentational list/item components; logic in `useCommitments`; explicit prop types |
| VI. Styling, Design Tokens, Visual Consistency | PASS (after refactor) | Current components use raw `red/amber/blue/green/gray` utilities; implementation replaces them with semantic tokens and shared primitives. Skeleton, empty, error, success, and pending states are specified |
| VII. Testing Strategy and QA | PASS | Behavior-focused tests for validation, overlap, persistence outcomes, multi-tab conflict, a11y, i18n parity, and no-network behavior; AAA; deterministic timers/ids via injected dependencies |
| VIII. Performance and Resource Efficiency | PASS | No network or waterfalls; derived overlap and ordering computed from the selected date only; route stays lazily loaded |
| IX. Scalability, Resilience, Fault Isolation | PASS | Storage unavailable/quota/corrupt/partial/unsupported outcomes are explicit; commitment failure never breaks tasks or preferences; recovery is user-driven |
| X. API Contracts and Independent Deployment | PASS | No HTTP API. The internal persistence contract is documented in `contracts/commitment-storage.md` with stable machine-readable codes; no internal details leak to users |
| XI. Constants and Configuration | PASS | Storage key, version, lock name, type union, and length limits live in named constants; no magic values in components |
| XII. Security and Data Protection | PASS | Stored data is treated as untrusted and validated on read; no secrets or network transmission; IDs are UUIDs; no HTML injection path |
| XIII. Accessibility (WCAG 2.2 AA) | PASS | Error summary, associated field errors, focus management for form/dialog/list changes, keyboard-only journeys, live-region notices, non-color conflict indication, 24px+ targets, reduced motion |
| XIV. Internationalization | PASS | All UI strings moved to the `commitments` namespace in EN/ES; dates/times formatted with `Intl`; document language remains driven by preferences |
| XV. Documentation | PASS | Plan, research, data model, storage contract, quickstart, and checklist aligned in this revision |
| XVI. Quality Gates and Hooks | PASS | `lint`, `typecheck`, `test`, `build` already exist in `frontend/package.json`; no new tooling |
| XVII. Frontend Server State and Async UX | PASS | Guest data is encapsulated behind an entity repository; no network fetching; mutations expose pending/failure and prevent duplicates; TanStack Query is intentionally not used for local data |
| XVIII. Data Integrity and Persistence | PASS | No Prisma. Guest data has an explicit versioned schema, is validated on read, migrates compatible legacy arrays, and never overwrites valid data silently |
| XIX. External Integrations | N/A | No weather or third-party integration; the feature remains usable offline |
| XX. Technology and Dependency Governance | PASS | No new runtime dependency; no alternative to the approved stack |

**Result**: No violations. Principle VI is a known gap in the current UI (raw palette utilities) and is closed by this plan's specified refactor, not accepted as compliant.

## Existing Implementation Audit

Audited on 2026-11-12 against the updated spec and constitution. Decisions: **Keep** (works and is aligned), **Refactor** (reuse structure, change behavior), **Replace** (design is incompatible).

| Area / file | Current state | Decision | Key gaps |
|---|---|---|---|
| `entities/commitment/model/types.ts` | Thin `Commitment` interface; `StoredCommitment` alias | Refactor | No draft, storage-result, or quarantine types |
| `entities/commitment/model/schema.ts` | Shallow strings; no `.strict()`; no date/time/limit refinements | Replace | FR-014–FR-018; Zod is present but underused |
| `entities/commitment/model/validation.ts` | Required-field and range checks only | Refactor | Title/description limits, valid calendar date, `HH:mm` format, cross-midnight, missing type accepted (`undefined` passes) |
| `entities/commitment/model/overlap.ts` | Correct half-open intersection and self-exclusion | Keep | Reuse; add conflict list formatting helpers and stable ordering |
| `entities/commitment/model/sanitize.ts` | Generates a new UUID when an ID is missing; no dedupe | Refactor | Unstable identity violates FR-043; add quarantine and duplicate handling |
| `entities/commitment/model/storage.ts` | Swallows read/write errors; raw array | Replace | FR-038–FR-042: no version, revision, lock, migration, failure codes, or conflict detection |
| `shared/config/commitments.ts` | `DEFAULT_COMMITMENT_TYPE = 'fixed'` | Refactor | Directly violates FR-002 (no preselection); add version, lock, limits |
| `features/commitments/model/useCommitments.ts` | Synchronous state, auto-save via `useEffect`, overlap blocks save | Replace | No pending, failure, acknowledgment, newer-data block, or success feedback |
| `features/commitments/ui/CommitmentForm.tsx` | Basic labeled inputs | Refactor | No error summary, limits, cross-midnight, pending lock, acknowledgment panel, retry, or type-required handling |
| `features/commitments/ui/CommitmentList.tsx` | Sorts all dates and shows an empty state unconditionally | Refactor | FR-030/031/033/034: no selected-date filter, locale tie-break, or storage-check-aware empty state |
| `features/commitments/ui/CommitmentItem.tsx` | Dead `/commitments/:id/edit` link; raw colors; no conflict text | Refactor | FR-032/037/049; remove dead route reference |
| `pages/CommitmentsPage.tsx` | Draft defaults to `type: 'fixed'`; no date navigation; `window.confirm` | Replace | FR-002, FR-005, FR-030, FR-047, FR-048 |
| `app/router.tsx` | Lazy route registered | Keep | Add a commitments page skeleton entry for the lazy fallback, mirroring the tasks pattern |
| `shared/ui/*` (`Button`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `SuccessState`, `Skeleton`, `Loading`) | Mature, accessible primitives | Keep | Reuse instead of native buttons/`window.confirm` |
| `entities/task/model/storage.ts` | Versioned envelope, Web Locks, revision baseline, quarantine, memory-only mode (task-store-specific, not adopted by 004) | Reuse architecture | Source of the guest-store design; no cross-slice import |
| `entities/preferences/model/graphemes.ts`, `formatting.ts` | Grapheme counting and local-date parsing/formatting | Extract to `shared/lib` | Avoid a third copy in the commitment entity; formatting has no business rules |
| Existing commitment tests | Cover the thin behavior, including the old preselected type and blocking overlaps | Refactor | Tests must assert the updated spec, not preserve obsolete behavior |

## Architecture and Design Decisions

### Domain and layer responsibilities

- `entities/commitment/model`: pure TypeScript, no React. Owns types, Zod schemas, validation codes, date/time helpers usage, overlap rules, ordering, sanitization/migration, and the persistence adapter.
- `features/commitments/model`: `useCommitments` controller and draft helpers. Owns load/mutation state, notices, focus targets, and acknowledgment flow.
- `features/commitments/ui`: form, list, item, date navigation, storage/blocked notices, delete dialog usage, skeleton. Presentational; no persistence access.
- `pages/CommitmentsPage.tsx`: composition, URL date state, page-level heading and notices.
- `shared`: UI primitives, `Intl` formatting helpers, grapheme/date-time utilities, and the generic guest-store primitive.

No new `widgets` slice is required; the page composes the feature directly, as the tasks page does.

### Persistence architecture

The commitment store mirrors the proven task-store design and fixes its silent-failure behavior:

- Document shape: `{ version: 1, revision: uuid, updatedAt: ISO-8601, commitments: Commitment[] }` under `walday:commitments`.
- Reads return a discriminated union: `empty`, `restored`, `partial`, `legacy`, `corrupt`, `migration-failed`, `unsupported`, `unavailable`. Valid records are always preserved; invalid records are quarantined with reason codes.
- Writes run through a serialized queue and the Web Locks `walday:commitments` lock when available, and compare the caller's revision baseline with the currently stored revision. A mismatch returns `STORAGE_CONFLICT` with the latest data.
- Write results are explicit: `ok`, `STORAGE_UNAVAILABLE`, `STORAGE_QUOTA_EXCEEDED`, `STORAGE_WRITE_FAILED`, `STORAGE_CONFLICT`, `STORAGE_WRITE_BLOCKED` (cause `corrupt`, `partial`, `unsupported`, `migration-failed`, or `external-change`). Errors are never swallowed.
- A `storage` event that reveals a different revision blocks further writes and shows an accessible reload action until the tab is reloaded (FR-042). Unlike the task store, the commitment store does **not** auto-adopt newer data or offer an overwrite path, because the spec explicitly requires reload-before-continue.
- A failed save never adds the commitment to the list and never reports success. The form keeps the entered values, shows an error, and offers retry or cancel (FR-040).
- Corrupt/partial/unsupported stores are write-blocked to protect unreadable data; the user is informed and no destructive recovery is offered in this version (FR-041).

The duplicated envelope/lock/conflict logic already exists in `entities/task` and `entities/preferences`. During implementation, extract only the generic primitive (storage resolution, lock adapter, write queue, envelope write, baseline comparison, quota classification) into `shared/lib/guestStore/`; keep entity-specific classification, migration, and quarantine in each entity. Tasks and preferences tests must stay green during that refactor.

### Validation rules

Validation is centralized in `entities/commitment` and reused by the form and the storage boundary. The full rule set and error codes are in [data-model.md](./data-model.md). Summary:

- Title: trimmed, 1–120 Unicode grapheme clusters.
- Description: trimmed, at most 500 grapheme clusters; blank becomes absent.
- Date: strict `YYYY-MM-DD` for a real local calendar date; never normalized to another day.
- Times: strict 24-hour `HH:mm`; start strictly earlier than end; `00:00` as an end time is rejected as cross-midnight.
- Type: `fixed` or `flexible`, explicitly required; the draft starts with no type selected.
- Equal, reversed, malformed, cross-midnight, and multi-day requests are rejected before save; all-day is not an input. An invalid range takes precedence over an overlap message (FR-029).

### Overlap and acknowledgment

Overlap is derived, never stored: two commitments on the same local date conflict when `[start, end)` intervals intersect. Boundary-touching periods do not conflict and the commitment being edited is excluded.

Acknowledgment rules (FR-025, SC-015):

- Create with one or more overlaps: list every conflict by title and time range and require an explicit acknowledgment before saving.
- Edit that changes `date`, `startTime`, or `endTime` and still overlaps: require a new acknowledgment.
- Edit that changes only title, description, or type: never require another acknowledgment, but the conflict indication remains visible.
- Declining the acknowledgment cancels the save and preserves the draft.
- No persisted acknowledgment flag is needed; the rule is derived from the original schedule versus the submitted schedule.

### Mutation and UI state

`useCommitments` exposes typed results rather than booleans:

- `create(draft)` / `update(id, draft)` → `{ ok: true }` or `{ ok: false, reason: 'validation' | 'overlap-acknowledgment' | 'storage' | 'conflict' }`.
- Pending state prevents duplicate submissions; the form and delete button are disabled while a mutation runs.
- Success updates the list and announces a localized success message; failure leaves the list unchanged and keeps the form open.
- Delete uses the shared `ConfirmDialog`, naming the commitment; cancel leaves data untouched; focus moves to the next item or the empty-state action.
- A blocked store (newer data, corrupt, partial) disables create, update, and delete, and exposes the relevant notice and the applicable reload or retry action.

### Form lifecycle and unsaved changes

- Closing the form or navigating away with a non-empty draft requires confirmation; discard returns the page to its normal state and keeping the form preserves the draft (US2, acceptance scenario 8).
- Use the shared `ConfirmDialog` for the warning and React Router's navigation blocker for route changes, so keyboard and focus behavior match deletion confirmation.
- A successful save or an explicit cancel clears the draft and removes the guard.

### Date view and ordering

- The viewed date is the source of truth for the list and lives in the URL as `/commitments?date=YYYY-MM-DD`; missing or invalid values fall back to today's local date.
- Navigation offers previous day, next day, today, and a native date input.
- A new commitment opened from a viewed date pre-fills that date and leaves it editable (FR-030, SC-016).
- The list contains only the selected date, sorted by `startTime`, then by title using `Intl.Collator` for the active interface language (`i18n.language`), then by stable `id` (FR-031).
- Local wall-clock semantics are preserved: no `Date` parsing that converts `YYYY-MM-DD` to UTC, no timezone shifting, and no DST-based movement.

### Async UX states

- Initial read is synchronous, so an empty state is shown only after the check completes. The route-level lazy fallback uses a layout-matching commitments skeleton (FR-034, Principle VI).
- Retryable read failures show the shared error/notice pattern with a retry action (FR-035).
- Every mutation has pending, success, and failure feedback; storage warnings and conflict-block notices use appropriate live regions (FR-010, FR-011, FR-037, FR-047).
- The guest-storage warning is visible before or at first save (FR-039, SC-013).

### Internationalization and formatting

- Add keys to `shared/i18n/locales/{en,es}/commitments.json` for type descriptions, all new validation codes, overlap details and acknowledgment, storage warnings, write-blocked notices, conflict-block reload, date navigation, and success messages.
- Format dates and times with `Intl` using the active formatting locale and date-time presentation preference; keep the timezone independent from interface language. A language switch must not alter stored dates or times, and this version adds no separate time-format preference.
- User-entered titles and descriptions are never translated.

### Styling and accessibility

- Replace raw palette utilities with semantic tokens (`bg-surface`, `text-text`, `border-border`, `text-danger`, `text-warning`, `text-success`, `bg-surface-subtle`) and existing spacing/radius/shadow tokens.
- Use `Button`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `SuccessState`, `Skeleton`, and `Loading` instead of ad hoc controls.
- Provide a form error summary, `aria-describedby` field errors, focus to the summary or first invalid field, and revalidation as fields are corrected (FR-021, FR-022).
- Dialog focus trap/return is already implemented by `ConfirmDialog`; the page must supply meaningful labels and manage focus after create, update, and delete.
- Conflicts, types, validation, and success states always include text; never color alone.

## Project Structure

### Documentation (this feature)

```text
specs/004-daily-commitments/
├── plan.md                          # This file (audit and alignment revision)
├── spec.md                          # Requirements (source of truth)
├── research.md                      # Phase 0 decisions
├── data-model.md                    # Phase 1 domain, validation, lifecycle
├── quickstart.md                    # Phase 1 validation guide
├── checklists/requirements.md       # Re-validated after clarifications
├── contracts/
│   ├── README.md                    # Contract index and scope
│   └── commitment-storage.md        # Versioned local persistence contract
└── tasks.md                         # Phase 2 output (generated 2026-11-12)
```

### Source code (repository root, current)

```text
frontend/
├── src/
│   ├── app/                         # providers, query client, router
│   ├── pages/CommitmentsPage.tsx
│   ├── features/commitments/        # model/useCommitments.ts + ui/*
│   ├── entities/commitment/         # types, schema, validation, overlap, sanitize, storage
│   ├── entities/task/               # mature guest-store reference implementation
│   ├── entities/preferences/        # grapheme and local-date helpers to reuse
│   └── shared/
│       ├── config/commitments.ts
│       ├── i18n/locales/{en,es}/commitments.json
│       ├── lib/{dateTimeFormat.ts,includes.ts}
│       └── ui/                      # Button, ConfirmDialog, states, Skeleton, Loading
├── tests/                           # Vitest/RTL suites
└── package.json                     # lint/typecheck/test/build script contract
```

### Planned source changes (implementation phase only)

```text
frontend/src/entities/commitment/model/
├── constants.ts        # title/description limits (storage key, version, lock stay in shared/config)
├── types.ts            # Commitment, CommitmentDraft, result unions, quarantine
├── schema.ts           # strict record, draft, and envelope schemas
├── validation.ts       # draft validation + stored-record validation
├── overlap.ts          # conflict detection and conflict presentation helpers
├── ordering.ts         # date filter, active-language ordering
├── sanitize.ts         # migration, quarantine, duplicate handling
├── storage.ts          # load/save with baseline and locks
└── index.ts            # public entity API

frontend/src/features/commitments/
├── model/commitmentDraft.ts     # empty draft, mapping, field-error helpers
├── model/useCommitments.ts      # controller/state machine
├── skeleton.ts                  # narrow lazy-route entry (tasks pattern)
└── ui/
    ├── CommitmentForm.tsx
    ├── CommitmentDateNav.tsx
    ├── CommitmentList.tsx
    ├── CommitmentItem.tsx
    ├── CommitmentNotices.tsx    # success/storage/conflict/blocked
    ├── DeleteCommitmentDialog.tsx
    └── CommitmentsPageSkeleton.tsx

frontend/src/shared/lib/
├── graphemes.ts                 # extracted from preferences
├── localDateTime.ts             # parse/format local date and time (no business rules)
└── guestStore/                  # extracted envelope/lock/baseline primitive
```

**Structure Decision**: Frontend-only FSD slice. Domain behavior is testable without React; the feature slice composes it; the page composes the feature. No backend, HTTP contract, or Prisma model is introduced.

## Phase 0: Research

Completed in [research.md](./research.md). All five 2026-11-12 clarifications are resolved, plus storage concurrency, migration, time semantics, acknowledgment scope, and save-failure behavior. No `NEEDS CLARIFICATION` remains.

## Phase 1: Design and Contracts

Completed in this revision:

- [data-model.md](./data-model.md): entities, draft, envelope, validation codes, overlap and acknowledgment rules, lifecycle, and ordering.
- [contracts/commitment-storage.md](./contracts/commitment-storage.md): versioned local persistence contract consumed by this feature and the future Daily Agenda.
- [quickstart.md](./quickstart.md): runnable end-to-end validation scenarios and current audit status.

## Spec Traceability

| Requirement group | Plan/artifact coverage |
|---|---|
| FR-001–FR-013 (management, types, explicit control, feedback) | Domain model, controller mutation results, form/list UI, success announcements |
| FR-014–FR-022 (validation and error UX) | Data model validation codes, Zod schemas, form error summary and focus rules |
| FR-023–FR-029 (overlaps and acknowledgment) | Overlap section, data model rules, research decision 6 |
| FR-030–FR-037 (date view, ordering, states) | Date view and ordering, async UX states, skeleton entry |
| FR-038–FR-044 (local persistence, integrity, agenda availability) | Persistence architecture, storage contract, migration/quarantine |
| FR-045–FR-054 (accessibility, localization, responsive) | Styling and accessibility, i18n section, quickstart scenarios 3, 5, 8, 9 |
| FR-055 and Out of Scope | Explicitly excluded; no server, sync, recurrence, reminders, or scheduling algorithm |

## Risks and Follow-Ups

- Extracting the shared guest-store primitive touches task and preference storage. Keep their suites green; if extraction slips, implement commitments against the same design without modifying the other entities, and record the temporary duplication as debt.
- Legacy data is currently a raw array under the same key. The migration path must preserve valid records and quarantine invalid ones without writing until the next successful user save.
- Existing commitment tests assert obsolete behavior (preselected type, blocked overlaps). They must be rewritten to the updated spec; deleting a test is acceptable only when the replaced behavior is explicitly obsolete.
- Semantic-token migration is mechanical but touches every commitment component; do not mix it with behavior changes in the same commit where avoidable.
- Implementation must follow the regenerated `tasks.md` (2026-11-12); the previous list asserted a preselected type and blocking overlaps and must not be reused.

## Complexity Tracking

No constitution violations. The only structural addition, `shared/lib/guestStore`, removes an existing three-way duplication of envelope/lock/conflict logic and is justified by current code, not anticipated needs.

| Change | Why needed | Simpler alternative rejected because |
|---|---|---|
| Extract generic guest-store primitive | Tasks, preferences, and commitments need identical envelope, lock, and baseline behavior | Leaving three divergent copies risks inconsistent multi-tab protection and violates Principle I; a commitments-only copy adds duplication |

## Next Step

Implementation is complete against the regenerated `tasks.md` (2026-11-12). Quality gates and coverage pass; manual screen-reader, forced-colors, and 200% zoom checks remain for assistive-technology validation.
