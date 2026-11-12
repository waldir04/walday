# Implementation Plan: Task Management

**Branch**: `002-task-management` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-task-management/spec.md`

**Status**: Reconciled with the updated specification. Source code is intentionally unchanged by this plan; the audit below defines the refactoring contract for the implementation phase.

## Summary

Deliver guest task management end to end without an account, backend, or network dependency. The feature covers creation, explicit-save editing, confirmed deletion, completion toggling, priority, date-only due dates, canonical duration in minutes, deterministic grouping and ordering, accessible feedback, English/Spanish localization, and versioned browser-local persistence.

The technical approach:

- Move the task domain (types, validation, ordering, duration/date rules, storage) into the FSD `entities/task` slice. Keep user interactions and UI in `features/tasks`. This closes the debt recorded in `docs/adr/0003-fsd-boundaries.md`.
- Replace the current bare-array `localStorage` payload with a versioned envelope (`version`, `revision`, `updatedAt`, `tasks`) that supports per-record isolation, safe migration, unsupported-version preservation, write blocking for unreadable records, and cross-tab conflict detection.
- Represent estimated duration canonically as whole minutes (`1..1440`) and accept friendly input only when it resolves deterministically.
- Count title and description limits in grapheme clusters using the platform `Intl.Segmenter`.
- Keep dates as timezone-independent `YYYY-MM-DD` values and compute past-due from the user's local calendar date.
- Use existing shared primitives, i18n infrastructure, preferences formatting utilities, strict TypeScript, Zod, Vitest, and React Testing Library. Add no runtime dependency.
- Do not use TanStack Query for tasks: guest tasks are local persisted state, not server state (Constitution XVII). The existing `QueryClientProvider` remains for future server-backed features.

## Technical Context

**Language/Version**: TypeScript 5.9 with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`; React 19.3; Node.js 24 LTS pinned in `.nvmrc`.

**Primary Dependencies**: React 19.3, React Router 7.18, Zod 4.6, i18next 26 / react-i18next 17, Tailwind CSS 4 (existing tokens), TanStack Query 5.107 (installed and configured, not used for this feature), Vitest 5, React Testing Library 16, jest-dom, axe-core.

**Storage**: Browser `localStorage` under the existing key `walday:tasks`, using a versioned guest-store envelope. No PostgreSQL, Prisma, or server persistence is introduced by this feature.

**Testing**: Vitest 5 with jsdom, React Testing Library, jest-dom, axe-core for automated accessibility checks, v8 coverage with 80% global and 90% entity thresholds already configured in `frontend/vite.config.ts`.

**Target Platform**: Modern evergreen browsers on desktop and mobile; supported viewport widths 360, 768, 1024, and 1440 px; 200% text resizing and 400% zoom; `prefers-reduced-motion`.

**Project Type**: React single-page application; one FSD feature within the existing `frontend/` application.

**Performance Goals**: A 500-task list renders, groups, and orders correctly; create, edit, delete, and completion actions complete within 1 second on the reference environment defined in the specification; interactions must not block the interface or produce request waterfalls (there are no network requests).

**Constraints**: WCAG 2.2 AA; English and Spanish with English fallback; no backend, authentication, network, weather, or external service dependency; no secrets or task content in logs; no new runtime dependency; Tailwind tokens only; no horizontal scrolling at supported widths.

**Scale/Scope**: One task list per browser and device context, at least 500 tasks, four user-facing surfaces (create form, task list/groups, edit form, delete/recovery dialogs), one persistence boundary, and no server contract.

**Unknowns**: None. Every `NEEDS CLARIFICATION` item from the previous plan is resolved by the specification clarifications of 2026-11-06 and 2026-11-12 and by the decisions recorded in [research.md](./research.md).

### Production Stack Alignment

The approved production stack is applied as follows. Backend technologies are listed to make the boundary explicit; they are not exercised by this feature because the specification excludes backend, API, database, and authentication work (spec §1.2–§1.3, FR-001–FR-006).

| Stack area           | Technology                    | Applicability to this feature                                                                                                                                   |
| -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI runtime           | React 19.3                    | Used: functional components and hooks only.                                                                                                                     |
| Language             | TypeScript 5.9 (strict)       | Used: all domain, storage, and UI code; types derived from Zod schemas.                                                                                         |
| Build tool           | Vite 8                        | Used: existing dev/build/test configuration.                                                                                                                    |
| Styling              | Tailwind CSS 4                | Used: semantic tokens and existing shared primitives; no raw hex colors, inline styles, or additional styling library.                                          |
| Routing              | React Router 7                | Used: existing lazy `/tasks` route and `AppShell`; no new route is required.                                                                                    |
| Server state         | TanStack Query 5              | Not used for tasks. Guest tasks are local persisted state (Constitution XVII), so no query/mutation keys, caching, or optimistic server updates are introduced. |
| Validation           | Zod 4                         | Used at the form and storage boundaries; schema-inferred types are the single source of truth.                                                                  |
| Internationalization | i18next 26 / react-i18next 17 | Used: `tasks` namespace in English and Spanish; no hardcoded user-facing text.                                                                                  |
| Frontend testing     | Vitest 5 + RTL + jest-dom     | Used: unit, component, route-level, accessibility, localization, and storage tests.                                                                             |
| Backend runtime      | Node.js 24 / Express          | Not applicable: no backend endpoint is created. Express remains the future target for authenticated sync.                                                       |
| Database / ORM       | PostgreSQL / Prisma           | Not applicable: no server model or migration is created. Local persistence satisfies versioning, validation, and no-silent-loss rules instead.                  |
| Backend testing      | Vitest                        | Not applicable to this feature; no backend service exists.                                                                                                      |
| Weather integration  | Open-Meteo via backend        | Boundary only: FR-002 requires weather unavailability to have no effect. No weather code is called.                                                             |

## Constitution Check

_GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design._

| Principle                                                         | Status | Evidence and required action                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **I. Clean Code, SOLID, and Simplicity**                          | Pass   | One cohesive feature; domain rules move to `entities/task`; presentation stays in `features/tasks`; no speculative scheduling or sync abstractions.                                                                                                                                        |
| **II. Strict TypeScript and Type Safety**                         | Pass   | Strict flags already enabled. Domain types derive from Zod; storage input is `unknown` and narrowed; no `any`, no unjustified assertions; no Prisma leakage.                                                                                                                               |
| **III. Frontend Architecture: Feature-Sliced Design**             | Pass   | `entities/task` owns the domain and storage; `features/tasks` owns use cases and UI; `pages` composes; `shared` gains only generic primitives and persistence configuration. Imports use `@/` and slice public APIs.                                                                       |
| **IV. Backend Architecture and Modular Design**                   | N/A    | No backend or HTTP endpoint is introduced (spec §1.3).                                                                                                                                                                                                                                     |
| **V. React Component Design and Reusability**                     | Pass   | Controlled forms with one shared Zod schema; explicit props; discriminated unions for priority/status; focused components; form error summary; no business rules in presentational components.                                                                                             |
| **VI. Styling, Design Tokens, and Visual Consistency**            | Pass   | Semantic tokens only; a task-specific layout-matching route skeleton, empty-with-CTA, error-with-retry, and success feedback; responsive at 360/768/1024/1440; reduced motion respected.                                                                                                   |
| **VII. Testing Strategy and Quality Assurance**                   | Pass   | Test matrix covers domain rules, storage failure modes, conflicts, forms, dialogs, keyboard/focus, a11y, i18n parity, no-network behavior, and the 500-task scenario; AAA pattern; deterministic clock and storage.                                                                        |
| **VIII. Performance and Resource Efficiency**                     | Pass   | Bounded list work (`O(n log n)` ordering), memoized selectors only where measured, no network, route-level code splitting already present. Virtualization is deferred until the 500-task measurement shows a need.                                                                         |
| **IX. Scalability, Resilience, and Fault Isolation**              | Pass   | Storage unavailability, quota failure, corruption, unsupported versions, and cross-tab changes are isolated behind typed results; tasks remain usable in memory; no external service is required.                                                                                          |
| **X. API Contracts and Independent Deployment**                   | N/A    | No API or HTTP error envelope is introduced. Stable domain error codes are still defined for UI mapping and future backend reuse.                                                                                                                                                          |
| **XI. Constants, Hardcoded Values, and Configuration Management** | Pass   | Domain limits/defaults live in `entities/task/model/constants.ts`; persistence key/version/lock name live in `shared/config/tasks.ts`; clock and storage access are injectable for tests.                                                                                                  |
| **XII. Security and Data Protection**                             | Pass   | Stored payloads are untrusted and validated; no secrets or tokens stored; task content rendered as text; content excluded from logs; Prisma/raw SQL not applicable.                                                                                                                        |
| **XIII. Accessibility and Inclusive Design**                      | Pass   | Keyboard-only journeys, native dialog semantics, focus containment and restoration, completion-control focus retention, associated errors, live-region announcements, non-color status, target size, contrast, zoom/reflow.                                                                |
| **XIV. Internationalization and Localization**                    | Pass   | All copy in the `tasks` namespace for `en`/`es`; English fallback preserved; runtime switching without reload preserves tasks and drafts; `Intl` for date and duration formatting; `document.documentElement.lang` updated by existing config.                                             |
| **XV. Documentation and Technical Communication**                 | Pass   | This plan, research, data model, contracts, and quickstart are synchronized. Implementation must add ADR 0006 for task domain placement and update ADR 0003's follow-up note.                                                                                                              |
| **XVI. Automated Quality Gates and Git Hooks**                    | Pass   | Existing root and frontend script contract (`lint`, `typecheck`, `test`, `build`) is the canonical gate; no new tooling.                                                                                                                                                                   |
| **XVII. Frontend Server State and Async UX**                      | Pass   | Guest tasks are not server state, so TanStack Query is deliberately not used. `useEffect` is limited to local persistence synchronization, cross-tab subscriptions, and focus management. Storage is encapsulated in the entity repository; no ad hoc `localStorage` access in components. |
| **XVIII. Data Integrity and Persistence with Prisma**             | N/A    | No PostgreSQL/Prisma model exists. The local store still implements explicit versioning, validation, migration, duplicate-identity rejection, and write conflict protection.                                                                                                               |
| **XIX. External Integrations and Weather Resilience**             | N/A    | No external integration or provider call. Weather must have zero effect on this feature (FR-002).                                                                                                                                                                                          |
| **XX. Technology Stack Governance and Dependency Discipline**     | Pass   | No runtime dependency added. `Intl.Segmenter`, `Intl.NumberFormat`, `Intl.ListFormat`, native `<dialog>`, `crypto.randomUUID`, and Web Locks (with fallback) are platform APIs.                                                                                                            |

**Gate result**: PASS. No constitutional violation requires justification; Complexity Tracking is empty.

**Post-design re-evaluation**: PASS. The design in Phases 0–1 preserves the same conclusions. The only deliberate non-use of an approved technology is TanStack Query, which is correct because guest tasks are local state, not server state. The backend rows remain not applicable by specification.

## Current Implementation Audit

The existing implementation is a working prototype but does not meet the updated specification or the constitution. The following table is the refactoring contract; no source file is changed in this planning step.

| Area                         | Current state                                                                                                                                                                                                                                                            | Decision           | Target                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain placement             | Task types, validation, and storage live in `features/tasks` (`model/task.ts`, `model/schema.ts`, `lib/storage.ts`), recorded as debt in ADR 0003.                                                                                                                       | Move and refactor  | `entities/task/model/*` with a public `entities/task/index.ts`; `features/tasks` consumes only the public API.                                  |
| Duration                     | `estimatedDuration?: string` free text (`model/task.ts:10`, `model/schema.ts:17`), displayed raw.                                                                                                                                                                        | Replace            | `estimatedMinutes?: number` in `1..1440`, deterministic friendly-input parser, localized `Intl` formatting.                                     |
| Title and description limits | Title checks only `< 3` JS code units (`model/task.ts:30`); no 200-upper bound, no 2000 description bound, no grapheme counting.                                                                                                                                         | Replace            | Zod validation with grapheme counting after trim and typed, localized field codes.                                                              |
| Due dates                    | Stored and displayed as raw strings; no calendar validity, past-due, or timezone-safe semantics.                                                                                                                                                                         | Replace            | Validated `YYYY-MM-DD`, date-only, local-date past-due comparison, locale formatting, cleared as absent.                                        |
| Identity and ordering        | `createdAt: number` (`Date.now()`), no deterministic tie-break; list sorts only by `createdAt`.                                                                                                                                                                          | Refactor           | UUID identity, ISO `createdAt`, comparator: status group, then newest creation, then `id` for stable ties.                                      |
| Persistence shape            | Bare JSON array at `walday:tasks`; no version, revision, migration, or quarantine (`lib/storage.ts`).                                                                                                                                                                    | Replace            | Versioned envelope v1 with `version`, `revision`, `updatedAt`, and `tasks`; migration from the legacy bare array; per-record isolation.         |
| Storage failures             | Read/write errors are swallowed and return `[]` / no-op (`lib/storage.ts:18`, `lib/storage.ts:27`), producing false persistence claims.                                                                                                                                  | Replace            | Typed `TaskStoreLoadResult`/`TaskStoreWriteResult`; memory-only and protected modes; accessible warning; session-only success messaging; retry. |
| Unreadable records           | Invalid records are silently dropped; raw data is left in place but the user is never informed and writes proceed.                                                                                                                                                       | Replace            | Restore valid records, isolate invalid ones, preserve raw payload, block replacing writes until explicit discard confirmation.                  |
| Unsupported versions         | Not detected.                                                                                                                                                                                                                                                            | Replace            | Preserve newer payloads untouched, inform the user, and remain in unsupported read-only mode for the session.                                   |
| Multi-tab behavior           | No `storage` event listener and no conflict detection; every tab blindly writes its full state.                                                                                                                                                                          | Add                | `storage` listener, revision compare-and-swap, Web Locks when available, conflict banner and write abort.                                       |
| Task creation form           | Single title error only; no max length, duration resolution, pending state, error summary, or focus return (`ui/TaskForm.tsx`).                                                                                                                                          | Refactor           | Full controlled form, shared Zod schema, per-field + summary errors, pending guard, focus return and announcement on success.                   |
| Editing                      | Title-only inline input; saves on blur (`ui/TaskItem.tsx:41`), violating FR-015; cannot edit description, priority, due date, or duration.                                                                                                                               | Replace            | Explicit edit mode with all editable fields, Save/Cancel, error preservation, stale-data conflict handling, no blur commits.                    |
| Deletion                     | Inline "Confirm delete?" text with generic labels and no dialog semantics, focus management, Escape, or task identification (`ui/TaskItem.tsx:88`).                                                                                                                      | Replace            | Shared accessible dialog primitive; names the task title; explicit confirm/cancel; Escape where safe; focus restoration.                        |
| List view                    | Sorts and renders a flat list; text-only empty state; no distinct groups, all-completed state, loading/error distinction, or recovery affordances.                                                                                                                       | Refactor           | Pending/completed sections, deterministic ordering, CTA empty state, all-completed group, storage warnings, recovery notice, dialog triggers.   |
| Route loading                | The `/tasks` lazy chunk uses the generic `Loading` placeholder, not a task-layout skeleton (`app/router.tsx`).                                                                                                                                                           | Add                | `TasksPageSkeleton` matching the final heading, guest notice, form, and list layout, with `aria-busy` and hidden decorative shapes.             |
| Completion                   | Checkbox toggles and moves item, but focus is not restored to the moved task's completion control.                                                                                                                                                                       | Refactor           | Focus the completion control by task id after the move; accessible live announcement.                                                           |
| Feedback                     | No pending, success, failure, retry, or live-region feedback for mutations.                                                                                                                                                                                              | Add                | `aria-busy`/status regions with `SuccessState`; session-only wording when a write fails; retry actions where meaningful.                        |
| Localization                 | Minimal English/Spanish keys; raw ISO dates and raw duration text; no past-due, storage, recovery, or dialog copy.                                                                                                                                                       | Extend             | Complete `tasks` namespace, no raw keys, key-parity test, `Intl` formatting, document language already handled by i18n config.                  |
| Styling and controls         | Task UI uses raw palette utilities such as `border-gray-300` and `text-gray-500` (`TaskForm.tsx:59`, `TaskItem.tsx:24`, `TasksPage.tsx:49`); Edit/Delete accessible names omit the task title; new controls must preserve the existing global `focus-visible` indicator. | Refactor           | Semantic tokens only; task-specific accessible names; verify global focus-visible on every new control; target sizes verified.                  |
| Tests                        | Two smoke tests; `tasks-ui.test.tsx` asserts blur-save behavior that contradicts FR-015; no storage, a11y, i18n-parity, conflict, or 500-task coverage.                                                                                                                  | Replace and expand | Test plan in this document and in [quickstart.md](./quickstart.md).                                                                             |
| Reuse                        | `shared/ui` primitives, i18n bootstrap, preferences provider/formatting, entity storage pattern, strict tsconfig, Zod, Vitest/RTL/axe, lazy route.                                                                                                                       | Keep               | Reuse without duplication; extend only with generic primitives such as a confirm dialog.                                                        |

## Project Structure

### Documentation (this feature)

```text
specs/002-task-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── task-domain.md
│   └── guest-task-store.md
├── checklists/
└── tasks.md
```

### Source Code (repository root)

```text
frontend/src/
├── entities/
│   ├── task/
│   │   ├── index.ts                 # Public API for the task domain
│   │   └── model/
│   │       ├── types.ts             # Task, TaskStatus, Priority, LocalDate, ids
│   │       ├── constants.ts         # Domain limits, duration bounds, defaults
│   │       ├── schema.ts            # Zod domain + stored-record + envelope schemas
│   │       ├── validation.ts        # Typed validation codes and field mapping
│   │       ├── sanitize.ts          # Per-record isolation, duplicate-id rejection, quarantine
│   │       ├── ordering.ts          # Deterministic pending/completed comparison
│   │       ├── duration.ts          # Friendly parse -> canonical minutes; Intl formatting
│   │       ├── dueDate.ts           # Calendar validity and local past-due comparison
│   │       └── storage.ts           # Envelope read/write, migration, CAS and lock protocol
│   ├── commitment/                  # Existing; unchanged
│   └── preferences/                 # Existing; unchanged
├── features/
│   └── tasks/
│       ├── index.ts                 # Public API for the feature slice
│       ├── model/
│       │   ├── useTasks.ts          # State orchestration, storage status, cross-tab sync
│       │   └── taskDraft.ts         # Form draft <-> domain mapping and error mapping
│       └── ui/
│           ├── TaskForm.tsx         # Create form
│           ├── TaskEditForm.tsx     # Explicit save/cancel edit form
│           ├── TaskList.tsx         # Groups, ordering, empty/all-completed states
│           ├── TaskItem.tsx         # Presentation and action controls
│           ├── TaskMetadata.tsx     # Priority, due date, duration, past-due text
│           ├── TasksPageSkeleton.tsx # Layout-matching lazy-route loading state
│           ├── GuestStorageNotice.tsx # Always-visible guest storage notice
│           ├── DeleteTaskDialog.tsx # Confirmation content composed over ConfirmDialog
│           ├── StorageWarning.tsx   # Unavailable / session-only persistence notice
│           └── RecoveryNotice.tsx   # Unreadable-record summary and discard action
├── pages/
│   └── TasksPage.tsx                # Composition only
├── shared/
│   ├── config/
│   │   └── tasks.ts                 # Persistence key, version, and lock name only
│   ├── i18n/locales/en/tasks.json   # Extended
│   ├── i18n/locales/es/tasks.json   # Extended
│   └── ui/
│       └── ConfirmDialog.tsx        # Generic accessible dialog primitive
└── test/
    └── (existing setup and axe helpers)

frontend/tests/
├── task-domain.test.ts              # Validation, duration, date, ordering
├── task-storage.test.ts             # Envelope, migration, quarantine, failures, locks
├── task-store-conflict.test.ts      # Revision/CAS and cross-tab behavior
├── tasks-create-edit.test.tsx       # Creation and explicit-save editing
├── tasks-delete.test.tsx            # Confirmation, cancel, focus
├── confirm-dialog.test.tsx          # Generic dialog primitive behavior
├── tasks-completion.test.tsx        # Toggle, groups, focus retention
├── tasks-states.test.tsx            # Empty, all-completed, loading, error, recovery
├── tasks-i18n.test.tsx              # en/es parity, fallback, runtime switch
├── tasks-a11y.test.tsx              # Keyboard, roles, labels, live regions, axe
├── tasks-performance.test.tsx       # 500-task render/order/action budget
├── tasks-no-network.test.tsx        # No fetch/XHR during task operations
└── tasks-routing.test.tsx           # `/tasks` route and layout-matching lazy fallback
```

**Structure Decision**: The task domain moves to `entities/task` because the constitution assigns domain models, validation, and persistence to entities and use cases to features. Domain constants live in `entities/task/model/constants.ts`; `shared/config/tasks.ts` holds only persistence configuration (key, version, lock name) because `shared` must not contain business rules. `features/tasks` keeps the interaction layer (`useTasks`, forms, list, dialogs, notices, skeleton). `pages/TasksPage.tsx` only composes the feature and heading. `shared` receives one generic, business-agnostic `ConfirmDialog`. The router imports the skeleton through the feature's public API, never from `features/tasks/ui` directly. Imports flow downward only and use the `@/` alias.

## Design Overview

### Domain and validation

- `Task` fields: `id` (UUID), `title`, optional `description`, `status` (`pending | completed`), `priority` (`low | medium | high`), optional `dueDate` (`YYYY-MM-DD`), optional `estimatedMinutes` (`1..1440`), and `createdAt` (ISO timestamp).
- Zod schemas validate at the form boundary and at the storage boundary. Types are inferred from schemas. Prisma types do not exist in this feature.
- Title: 3–200 grapheme clusters after trim. Description: absent when empty, otherwise 1–2000 grapheme clusters after trim. Priority: literal union with `medium` default. Due date: real calendar date with no time component. Duration: whole minutes in range. Form payloads, stored records, and the envelope use strict schemas; unknown keys invalidate the payload or record instead of being silently stripped, and a bad record is isolated rather than accepted.
- Validation returns typed codes, not localized strings. The feature maps codes to `tasks:validation.*` keys.

### Persistence protocol

- Storage key: `walday:tasks` (unchanged, so existing guest data can migrate).
- Envelope v1: `{ version: 1, revision: string, updatedAt: string, tasks: StoredTask[] }`.
- Read algorithm: absent key → empty; legacy bare array → treat as v0 and migrate on the next successful write; envelope with a supported older version → apply registered migration, and a failed migration preserves the raw payload and enters protected read-only mode; a top-level `version > 1` detected before strict envelope validation → unsupported (preserve, unsupported read-only, inform); malformed JSON or an invalid current-version envelope → corrupt (preserve raw, recovery-blocked, require confirmation to replace). Records are validated individually; invalid records and duplicate identities are quarantined while valid records are restored.
- Write protocol: serialize writes per tab, acquire the cross-tab Web Lock `walday:tasks` when available, re-read the stored revision, abort with `STORAGE_CONFLICT` if it differs from the last seen revision, otherwise write a new envelope with a fresh UUID revision and ISO timestamp. Fallback without Web Locks uses the same read-verify-write sequence.
- Write results are typed: success (new revision), quota/permission/unavailable failure (retain the in-memory change, enter memory-only, and expose an explicit retry), or conflict (preserve the draft and surface newer data). Baselines are explicit: `'empty'`, `'legacy'`, `'unknown'`, or a v1 revision. A retry from `'empty'`/`'unknown'` writes only if the now-readable store is empty; a `'legacy'` baseline migrates only over an unchanged legacy payload and conflicts if the store became empty or v1; an unexpected legacy payload over a v1 baseline conflicts. This prevents overwriting existing tasks or resurrecting cleared data. The UI never claims persistence when a write failed.
- Memory-only suspends automatic persistence but permits an explicit user-initiated retry; a successful retry returns to normal. Unsupported mode blocks writes for the session. Recovery-blocked and protected modes block writes until the guest confirms discarding unreadable records; canceling enters protected read-only mode and leaves the raw payload untouched, while confirming writes a fresh envelope over corrupt or quarantined data but never over an unsupported newer version.
- Security: stored payloads are untrusted, validated, and never logged. No secrets, tokens, or credentials are stored.

### Cross-tab behavior

- Subscribe to `window.storage` for `walday:tasks`. On a valid external write, apply it immediately when there is no unsaved edit, open dialog, or pending write and persistence is normal; otherwise show a persistent "newer data exists" notice with a reload action and block the stale save.
- On an external clear with no draft, dialog, pending write, and normal persistence, apply the empty store and inform the user. If local work is in progress or the store is not normal, preserve it, surface the conflict, block writes, and offer reload; never silently resurrect cleared data.
- An invalid or unsupported external payload is not applied; the feature surfaces the problem and preserves the stored raw value.
- External unavailability updates the persistence status and informs the user; it must not crash or claim current changes are saved.
- Completion toggle focus retention is handled after the list re-groups by locating the completion control by task id and restoring focus there.

### User experience and async states

- Restoration is synchronous from `localStorage`. The route's lazy chunk uses a task-specific `TasksPageSkeleton` matching the heading, guest notice, form, and list layout, with `aria-busy` and decorative shapes hidden from assistive technology. A distinct storage-recovery error state is shown instead of the empty state until the user acknowledges it.
- Empty state appears only when no tasks exist and loading has completed; it uses `EmptyState` with a primary action that focuses the creation title input. The all-completed state keeps the completed group visible.
- Every mutation has a pending guard against duplicate activation and announces success/failure through a polite live region. When persistence fails, success copy explicitly says the change applies only to the current session and was not saved.
- Editing requires explicit Save and Cancel. Save validates the full draft; errors are associated with fields and summarized when multiple exist; input is preserved. Cancel restores the original task and focus.
- Deletion uses a shared accessible `<dialog>` with the task title in the message, explicit confirm/cancel, Escape when safe, focus containment, and focus restoration to the invoking control. Confirmed deletion announces success and moves focus to the next logical element or the empty-state action.
- The guest-storage notice required by FR-064 is always visible in normal mode. A persistent storage warning adds failure details while the feature is in memory-only, recovery-blocked, protected, or unsupported mode.

### Accessibility

- Every action is keyboard reachable with a visible `focus-visible` indicator; dialogs contain focus, close on Escape when safe, and restore focus.
- Form fields have visible labels, programmatically associated errors, and an accessible summary when multiple errors exist. Invalid fields set `aria-invalid`.
- Live regions announce mutations, restoration, conflicts, and persistence failures; skeletons are hidden from assistive technology while `aria-busy` communicates loading.
- Repeated controls include the task title in their accessible name. Completion, priority, and past-due meaning is conveyed by text, not color alone.
- Controls meet the WCAG 2.2 minimum target size (the shared Button already provides a 44 px minimum height and width); layouts reflow at 360/768/1024/1440 px, 200% text resizing, and 400% zoom; reduced-motion preferences are respected.

### Formatting and localization

- Duration input requires an explicit unit: `30 min`, `1h`, `90 min`, and `1 h 30 min` resolve to whole minutes. A bare number such as `30` is ambiguous and is rejected, along with unparseable, fractional, zero, negative, or out-of-range input.
- Duration display composes localized `Intl.NumberFormat` unit parts (hours/minutes) and joins them with `Intl.ListFormat` in the active locale.
- Due dates are formatted with the existing `formatDate` utility and the user's date presentation preference when available; no time zone conversion is applied to the stored date.
- Priority, status, past-due, storage, recovery, dialog, and announcement copy live in `en/tasks.json` and `es/tasks.json`; a key-parity test prevents drift and raw key rendering.

### Boundaries

- No API, Express route, Prisma model, PostgreSQL migration, or authentication work is part of this feature. The domain contract is deliberately shaped so a future backend can consume or sync it without exposing Prisma models.
- No commitment data is read, written, or modified; task operations never assign time slots or reschedule anything (FR-003).
- No TanStack Query usage for tasks. The query client is untouched; guest task data is not persisted to the query cache.
- No new runtime dependencies. Platform APIs provide grapheme segmentation, formatting, UUIDs, dialogs, storage events, and cross-tab locking.

## Testing Strategy

- **Domain unit tests**: grapheme counting at 2/3/200/201 and emoji/combined characters; description trimming and 2000 limit; priority literal union; calendar-date validity including nonexistent dates; timezone independence; duration parsing and formatting; ordering with equal `createdAt` values.
- **Storage unit/integration tests**: legacy-array migration; failed migration preserving the original; v1 round-trip; per-record quarantine; duplicate identity rejection; unsupported version preservation; corrupt JSON preservation; unavailable and quota failures; blocked writes until discard confirmation; discard replacement over corrupt/quarantined data but never unsupported newer data; protected cancellation with no overwrite; revision conflict abort; lock fallback; external clear behavior; no task content in logs.
- **Store hook tests**: hydrate from storage; create/edit/delete/toggle; pending guards; session-only success copy; cross-tab event application and conflict surfacing; focus retention after completion moves.
- **Component tests**: controlled forms, per-field and summary errors, input preservation, explicit save/cancel, delete dialog focus and Escape, empty/all-completed/loading/error states, suppression of the empty state during recovery/unsupported modes, the always-visible guest notice, storage warning, and recovery notice.
- **Accessibility tests**: keyboard-only journeys, accessible names containing task titles, dialog roles and focus containment/restoration, live-region announcements, `aria-busy`, target-size classes for all controls, axe-core with zero critical/serious violations, and the existing design-token contrast tests (axe color-contrast is disabled in jsdom because there is no layout engine).
- **Localization tests**: every key exists in both locales; Spanish switch updates copy, document language, dates, and durations without altering user-entered task content; unsaved input survives switching; recovery-count pluralization uses i18n plural rules; no raw keys.
- **Network test**: spy on `fetch` and `XMLHttpRequest` and assert that creation, editing, deletion, completion, restore, and storage-failure drills make zero network requests.
- **Performance test**: render 500 tasks, assert correct grouping/order, and record the SC-010 production-build measurement on the documented reference environment. Virtualization is introduced only if the measurement fails the stated budget.
- **Route test**: `/tasks` renders through the lazy route and shows the layout-matching skeleton fallback while the chunk loads.

## Risks and Mitigations

| Risk                                                             | Mitigation                                                                                                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localStorage` has no transactional compare-and-swap             | Use Web Locks when available; otherwise read-verify-write immediately before writing, abort on revision mismatch, and surface the conflict.                      |
| Storage quota is shared with preferences and commitments         | Keep task records compact, report quota failures explicitly, retain in-memory data, and offer retry after the user frees space.                                  |
| Native `<dialog>` behavior differs in jsdom/browsers             | Use semantic native support; if the test environment lacks `showModal`, provide a test-only polyfill in setup rather than a custom modal in production code.     |
| Synchronous restoration can flash an empty state                 | Compute the initial state from storage in a single reducer initializer; the empty state is derived only from a completed, successful load.                       |
| 500-task list can become sluggish if every row re-renders        | Compute ordered groups once per store change; memoize item callbacks/rows only if measurement shows a need; consider virtualization only after the budget fails. |
| Concurrent saves in two tabs arriving within the same event loop | The Web Lock serializes writers; the revision check prevents a stale writer from committing; residual fallback risk is documented in the store contract.         |

## Complexity Tracking

No constitutional violations. No additional abstraction, dependency, backend service, or distributed infrastructure is introduced. The versioned envelope, lock protocol, and quarantine model are required by FR-054–FR-064 and VR-012–VR-014, not speculative.

## Implementation Follow-ups

- Record ADR 0006 for the move of task domain and storage ownership to `entities/task`, and update the follow-up note in ADR 0003.
- Update the constitution's known-gaps register only through a separate amendment; this plan does not modify the constitution. Its entries for TanStack Query, strict flags, and the shared skeleton are stale relative to the observed repository; see research §23.
- Reconcile `tasks.md` with this plan before implementation.
- Keep domain validation limits in `entities/task/model/constants.ts`; `shared/config/tasks.ts` must contain persistence configuration only.
