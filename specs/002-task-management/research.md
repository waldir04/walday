# Research: Task Management

**Feature**: `002-task-management` | **Date**: 2026-11-12

This document resolves the technical decisions deferred by [spec.md](./spec.md) §1.4. All previous `NEEDS CLARIFICATION` items are resolved; no open research question remains.

## 1. Scope and stack boundary

- **Decision**: Implement the feature as a frontend-only FSD slice using React 19, TypeScript 5.9, Vite, Tailwind, React Router, Zod, i18next, and Vitest. Do not create any Express endpoint, PostgreSQL schema, Prisma model, or authentication flow.
- **Rationale**: Spec §1.2–§1.3 and FR-001–FR-006 define guest-only behavior with no backend, API, database, or network dependency. The constitution's backend, Prisma, and API principles are therefore not applicable, while the frontend, validation, accessibility, i18n, testing, and persistence principles are.
- **Alternatives considered**:
  - Build the future backend now: rejected as out of scope and a direct violation of the specification.
  - Use TanStack Query against `localStorage`: rejected because guest tasks are local state, not server state (Constitution XVII); wrapping a synchronous local store in query/mutation semantics would be a speculative abstraction.

## 2. Domain placement in Feature-Sliced Design

- **Decision**: Move the task entity to `entities/task` (types, schemas, validation, ordering, duration, due date, storage) and keep `features/tasks` for use cases and UI. `pages/TasksPage.tsx` composes the feature. `shared` gains only a generic `ConfirmDialog` and persistence configuration; domain limits and defaults stay in the entity.
- **Rationale**: Constitution III assigns domain models, validation, business rules, and persistence ownership to entities, and user interactions/use cases to features. ADR 0003 explicitly records the current placement in `features/tasks` as follow-up debt.
- **Alternatives considered**:
  - Keep everything in `features/tasks`: violates the entity responsibility split and leaves recorded debt unresolved.
  - Put storage in `shared/lib`: prohibited because `shared` must not contain business rules and would create an upward dependency on the task domain.

## 3. Guest persistence mechanism

- **Decision**: Use browser `localStorage` under the existing key `walday:tasks`.
- **Rationale**: The data volume is small (500 tasks of a few hundred bytes), access is synchronous, the specification requires same-browser/device persistence only, and the existing code and entity patterns already use `localStorage`. No backend or offline sync is in scope.
- **Alternatives considered**:
  - IndexedDB: asynchronous and more complex; unnecessary for the specified data size and synchronous restoration.
  - Cookies: wrong capacity, sent to servers, and unsuitable for task content.
  - In-memory only: fails FR-054 and the core guest persistence promise.

## 4. Versioned storage envelope

- **Decision**: Store `{ version: 1, revision: string, updatedAt: string, tasks: StoredTask[] }` at `walday:tasks`.
- **Rationale**: Spec §1.3 defers the envelope shape, while FR-056–FR-059 require explicit versioning, safe migration, unsupported-version preservation, and write blocking. A revision token also provides the compare-and-swap basis for multi-tab protection. Keeping the existing key allows migration of already-saved guest tasks.
- **Alternatives considered**:
  - Keep the bare array: cannot express version or revision; every future shape change becomes ambiguous.
  - Separate keys per version: complicates migration and can strand data.
  - Add a per-record version only: does not protect the aggregate during writes or cross-tab changes.

## 5. Legacy migration

- **Decision**: Treat a top-level bare array as legacy v0 and migrate it to v1 during the next successful write. Map `completed` to `status`, convert numeric `createdAt` to ISO, parse legacy free-text `estimatedDuration` into canonical minutes, and quarantine any record that cannot be mapped without silent loss. Keep a small ordered migration registry keyed by source version for future supported versions. A failed migration preserves the original payload and enters protected read-only mode.
- **Rationale**: FR-056 requires safe migration without destroying original data. The current prototype already stored a bare array with number timestamps and free-text durations, so existing users must not lose tasks or have unparseable durations silently discarded.
- **Alternatives considered**:
  - Change the storage key: would orphan existing data.
  - Reject legacy data as corrupt: destroys valid guest tasks and violates the no-silent-loss requirement.
  - Drop unparseable legacy durations: silent data loss; quarantine preserves the raw payload instead.

## 6. Partial corruption and quarantine

- **Decision**: Validate the envelope first, then validate each record individually. Restore valid records, isolate invalid records and duplicate identities, and return a quarantine summary. Preserve the raw payload untouched. Block any write that would replace unreadable records until the guest explicitly confirms discarding them; confirming writes a fresh envelope over corrupt or quarantined data but never over an unsupported newer version, while canceling keeps the session in protected read-only mode and leaves storage unchanged.
- **Rationale**: FR-057–FR-058 and VR-013 require valid records to survive corruption, duplicate identities to be treated as invalid, and no silent destruction of unreadable data.
- **Alternatives considered**:
  - Fail the whole load on one bad record: loses valid tasks.
  - Silently overwrite on the next save: violates explicit-confirmation requirements.
  - Quarantine only in memory without preserving raw data: violates the no-silent-loss requirement.

## 7. Unsupported newer versions

- **Decision**: If `version` is greater than the current supported version, do not parse, downgrade, overwrite, or delete it. Enter unsupported read-only mode, inform the guest, and keep the raw payload intact.
- **Rationale**: FR-059 and VR-013 require newer data to be preserved and reported as unreadable, not silently replaced.
- **Alternatives considered**:
  - Best-effort parse: risks presenting partially valid data from an unknown schema as authoritative.
  - Overwrite with v1: destroys data written by a newer application version.

## 8. Storage failure semantics

- **Decision**: Return typed results instead of swallowing errors. Distinguish unavailable storage, quota/permission failure, corrupt payload, partial corruption, unsupported version, and conflict. Successful in-memory mutations that cannot be persisted produce success feedback explicitly marked as session-only and never claim persistence. Retry is offered when meaningful.
- **Rationale**: FR-060–FR-061, FR-086, and VR-014 prohibit false persistence claims and require retained in-memory changes plus accessible communication.
- **Alternatives considered**:
  - Keep the current silent `catch` blocks: produces false success and hides data loss.
  - Disable task management when storage fails: violates the requirement that in-memory use remains available.

## 9. Multi-tab synchronization and write conflicts

- **Decision**: Subscribe to `window.storage` for `walday:tasks`. Apply valid external changes when no draft, dialog, or write is active; otherwise surface a persistent conflict notice and block the stale save. On an external clear with no local work, apply the empty store and inform the user; if local work exists, preserve it, surface the conflict, and never resurrect cleared data. Ignore invalid or unsupported external payloads while preserving the raw value. Serialize writes with the Web Locks API (`navigator.locks.request('walday:tasks', ...)`) when available, re-read the persisted revision inside the lock, and abort with `STORAGE_CONFLICT` if it differs from the last seen revision. Without Web Locks, use the same read-verify-write sequence as a best-effort fallback.
- **Rationale**: FR-062 and VR-014 require external changes to be reflected or surfaced and stale tabs never to overwrite newer data. Web Locks is a platform API available in modern evergreen browsers and adds no dependency; the revision check also protects against non-cooperating writers.
- **Alternatives considered**:
  - Last-write-wins full-state writes: silently overwrites newer data.
  - Polling: unnecessary, wasteful, and not event-driven.
  - BroadcastChannel: useful for messages but does not provide mutual exclusion; `storage` already covers cross-tab notification for this key.
  - Server-side locking: no server exists.

## 10. Canonical duration

- **Decision**: Store `estimatedMinutes?: number` in the inclusive range `1..1440`. Accept friendly input only through a deterministic grammar with an explicit unit: hours and/or minutes with recognized aliases, such as `1h`, `30 min`, or `1 h 30 min`. Reject bare numbers, fractional, zero, negative, ambiguous, unparseable, or out-of-range results. Format with `Intl.NumberFormat` unit parts and join with `Intl.ListFormat` in the active locale.
- **Rationale**: The 2026-11-12 clarification supersedes free text so future planning features can consume a reliable numeric value. FR-037–FR-039 and VR-006 require canonical minutes and localized display.
- **Alternatives considered**:
  - Keep free text: cannot be consumed by planning logic and was explicitly superseded.
  - Store hours: fractional values and locale ambiguity; minutes are the smallest common unit.
  - Add a date/duration library: constitution XX prefers platform `Intl`; no dependency is justified.

## 11. User-perceived character counting

- **Decision**: Count grapheme clusters with `Intl.Segmenter(undefined, { granularity: 'grapheme' })` after `String.prototype.trim()`.
- **Rationale**: FR-010, FR-011, and VR-002/VR-003 require user-perceived characters so emoji and combined characters count as one. `Intl.Segmenter` is a platform API available in the supported browsers and adds no dependency.
- **Alternatives considered**:
  - `String.length`: counts UTF-16 code units and overcounts emoji.
  - `Array.from`: counts code points, not grapheme clusters; still overcounts combined characters.
  - A Unicode segmentation library: adds a runtime dependency for a platform capability.

## 12. Due dates, timezones, and past due

- **Decision**: Store due dates as `YYYY-MM-DD` strings validated by parsing the components and round-tripping the calendar date. Never store a time or convert through UTC. Compute "today" from local date parts and compare date strings. Past-due applies only when `status === 'pending'` and `dueDate < localToday`. Format using the existing `formatDate` helper and the active date presentation preference when available.
- **Rationale**: FR-034–FR-036, VR-005, and the specification's timezone edge cases require a date-only value that never shifts across timezones. String comparison of ISO calendar dates is direct and stable.
- **Alternatives considered**:
  - Store ISO timestamps at midnight UTC: shifts the calendar day in some timezones.
  - Store local `Date` objects in JSON: serializes to a UTC instant and loses the date-only meaning.
  - Recompute past-due from `Date.now()` on every render: correct but should be isolated in a selector and tested with a controlled clock.

## 13. Identity and deterministic ordering

- **Decision**: Use `crypto.randomUUID()` for task identity and a requirement-ordered ISO `createdAt`. Sort pending before completed, then `createdAt` descending (newest first), then `id` ascending as a stable tie-break. Editing never changes `createdAt`; completion changes only the group.
- **Rationale**: FR-044–FR-047 and VR-010 require pending/completed grouping, newest-first within groups, and deterministic order for equal creation times. Persisting both `createdAt` and `id` makes the order reproducible after reload.
- **Alternatives considered**:
  - Array insertion order only: JSON order is preserved in practice but is not a documented ordering contract and can be disturbed by migrations.
  - A monotonic numeric sequence: collisions across tabs and no natural tie-break.
  - Sorting by title: violates newest-created ordering.

## 14. State management

- **Decision**: Use a reducer plus the `useTasks` feature hook. The reducer owns the in-memory task collection, last seen revision, persistence status, pending mutation guard, and conflict/recovery notices. `useEffect` is used only for local persistence synchronization, the `storage` subscription, and focus management.
- **Rationale**: Constitution XVII prohibits server-state libraries for local data and permits `useEffect` for non-network persistence synchronization. A reducer keeps transitions testable and prevents partial multi-step updates.
- **Alternatives considered**:
  - TanStack Query: no server endpoint; would misclassify local state and add meaningless cache configuration.
  - Zustand/Redux: prohibited parallel stores and unnecessary for one slice.
  - Ad hoc `useState` in the page: the current pattern already couples persistence, orchestration, and presentation and makes conflicts/feedback hard to express.

## 15. Forms and validation architecture

- **Decision**: Define Zod schemas for the domain record, form payload, stored record, and envelope. Derive TypeScript types from the schemas. Use `.strict()` for form payloads. Return typed validation codes from the domain and map them to `tasks:validation.*` keys in the feature. Use a single controlled draft type with an explicit save action.
- **Rationale**: Constitution II and X require Zod as the contract source and types derived from schemas. FR-011, FR-017, FR-069–FR-071, and VR-002–VR-008 require field-associated localized errors, preserved input, and no partial updates. The current inline title-only edit and blur commit violate FR-015.
- **Alternatives considered**:
  - Separate hand-written types and validators: duplicated contracts and drift.
  - React Hook Form or another form library: constitution XX discourages form libraries that duplicate Zod validation; the feature can use controlled inputs and a small draft reducer.
  - Browser-native validation only: does not provide consistent localized, accessible errors or grapheme-aware limits.

## 16. Confirmation dialog pattern

- **Decision**: Add a generic, business-agnostic `shared/ui/ConfirmDialog` built on native `<dialog>` with `showModal()`. It names the task by title, provides explicit confirm and cancel actions, supports Escape when cancellation is safe, contains focus while open, and returns focus to the invoking control. Task-specific content is composed in `features/tasks/ui/DeleteTaskDialog.tsx`. A second composition handles "discard unreadable records" confirmation.
- **Rationale**: FR-020–FR-023, FR-068, and VR-009 require explicit confirmation, task identification, keyboard operation, focus management, and cancellation. Native `<dialog>` supplies modal semantics and focus containment without a component library or dependency.
- **Alternatives considered**:
  - `window.confirm`: cannot identify the task accessibly, style consistently, or manage focus; used by the commitments prototype but unsuitable here.
  - Inline confirmation row: current behavior; cannot provide dialog semantics or focus containment.
  - A custom focus-trap component: more code and risk when native semantics suffice.
  - A UI library: prohibited by the approved stack.

## 17. Focus retention after completion moves

- **Decision**: After a completion mutation, record the task id that must retain focus. After the list re-renders into the other group, locate that task's completion control by id and focus it. Keep the announcement in a live region.
- **Rationale**: FR-027, FR-107 clarification, and VR-015 explicitly require focus to remain on the task's completion control after it moves between groups.
- **Alternatives considered**:
  - Rely on DOM focus retention: the keyed item may unmount or move, losing focus.
  - Focus the group heading: does not satisfy the requirement and adds navigation work.

## 18. Feedback and asynchronous UX

- **Decision**: Model mutations with a pending guard and typed outcomes (`saved`, `session-only`, `failed`, `conflict`). Announce outcomes through a polite live region. Show a persistent storage warning in memory-only, recovery-blocked, protected, or unsupported mode. Use the existing `Skeleton`, `EmptyState`, `ErrorState`, and `SuccessState` primitives, plus a task-specific `TasksPageSkeleton` for the lazy route. Restoration is synchronous, so the empty state is derived only from a completed successful load.
- **Rationale**: FR-086–FR-090, VR-011, VR-017, and Constitution VI/XVII require pending, success, empty, error, and retry behavior with accessible announcements and no false success.
- **Alternatives considered**:
  - Artificial loading delays: misleading and unnecessary.
  - Toast-only feedback: harder to associate with the task and less accessible without a live region.
  - Treating localStorage writes as instantaneous success: current behavior; produces false persistence claims.

## 19. Localization and formatting

- **Decision**: Extend the existing `tasks` namespace in English and Spanish for all labels, validation, confirmations, status, priority, past-due, feedback, storage, recovery, and accessibility text. Add a test that compares the key sets of both locales and fails on raw-key output. Use the active i18n language and preferences date presentation for formatting. Runtime language changes preserve tasks and drafts.
- **Rationale**: FR-078–FR-085, VR-016, and Constitution XIV require complete en/es coverage, fallback, runtime switching, and `Intl` formatting. The existing i18n bootstrap already updates `document.documentElement.lang`.
- **Alternatives considered**:
  - Inline English strings: prohibited.
  - A second i18n library: prohibited by the approved stack.
  - Manual date/duration strings: violates locale-aware formatting and plural/unit conventions.

## 20. Testing approach

- **Decision**: Use Vitest and React Testing Library. Inject a clock and storage adapter into domain and hook tests. Mock `localStorage` behavior for failure modes and `navigator.locks` for lock behavior. Add tests for failed migration preservation, external clear, layout-matching route loading, the always-visible guest notice, target sizes, user-content preservation across language switches, and zero network requests. Use axe-core for automated checks and manual keyboard/VoiceOver validation from the quickstart. Keep coverage thresholds at the configured 80% global and 90% entity levels.
- **Rationale**: Constitution VII and the existing toolchain require deterministic tests of business rules, storage boundaries, error middleware equivalents, accessibility, and critical journeys. No source test currently covers storage failure, conflicts, or full editing.
- **Alternatives considered**:
  - Playwright end-to-end tests: not part of the approved stack and unnecessary for this slice; routing and component behavior can be covered with RTL.
  - Snapshot-only tests: explicitly not evidence of correctness.
  - Real browser storage in unit tests: non-deterministic and not isolated.

## 21. Performance and large lists

- **Decision**: Compute ordered groups once per store change and render 500 tasks without virtualization initially. Measure the stated 500-task scenario in the production build on the reference environment. Introduce virtualization only if the measurement shows a real bottleneck, and record the threshold decision when that happens.
- **Rationale**: FR-053, FR-092, SC-010, and Constitution VIII require correct usability at 500 tasks and warn against premature optimization. Virtualization adds complexity and can harm accessibility if not carefully implemented.
- **Alternatives considered**:
  - Virtualize from the start: speculative complexity for an unmeasured list size.
  - Paginate: not requested and changes the visible grouping behavior.
  - Ignore the requirement: unverified performance would fail the readiness gate.

## 22. Dependency discipline

- **Decision**: Add no runtime dependency. Use `Intl.Segmenter`, `Intl.NumberFormat`, `Intl.ListFormat`, `crypto.randomUUID`, native `<dialog>`, the `storage` event, and Web Locks when available.
- **Rationale**: Constitution XX requires written justification for new runtime dependencies and prefers platform APIs. The feature can be implemented entirely with the approved stack.
- **Alternatives considered**:
  - `uuid`, `date-fns`, `luxon`, `lodash`, `react-hook-form`, `focus-trap-react`, `zod-validation-error`: each duplicates a platform or existing capability and would require constitutional justification.

## 23. Repository observations

The following observations from the current repository are relevant to implementation. They do not change the constitution but supersede stale statements in its known-gaps register, which can only be updated through an amendment:

- TanStack Query is installed (`frontend/package.json`) and `QueryClientProvider` is configured in `frontend/src/app/providers.tsx`.
- The strict TypeScript flags named by Principle II are enabled in `frontend/tsconfig.app.json`.
- A `Skeleton` component already exists in `frontend/src/shared/ui/Skeleton.tsx`; the shared `Loading` component uses it.
- The frontend environment module and root quality-gate scripts already exist; see ADR 0005.
- The task domain now lives in `entities/task` (ADR 0006); the commitments flow still uses `window.confirm` as tracked debt for its own feature work.

## 24. Deferred presentation decisions

- **Decision**: Use an inline create form, inline edit mode with explicit Save/Cancel, a modal confirmation for deletion and discard, and two labelled group sections (pending then completed) rendered as list items with a metadata row. Do not show task counts, summary indicators, drag-and-drop, custom sorting, filtering, or bulk actions.
- **Rationale**: Spec §1.4 leaves presentation open provided behavior, accessibility, and localization are met. These choices reuse existing primitives, keep the surface simple per the product principles, and avoid out-of-scope capabilities. Task counts are optional and add no required value; omitting them also avoids implying incomplete work that the specification does not define.
- **Alternatives considered**:
  - Dedicated create/edit routes: more navigation and focus-management work without a product requirement.
  - Cards with per-task dialogs for editing: heavier interaction for a simple form.
  - Inline confirmation rows: cannot provide accessible dialog semantics or focus containment.
  - Counts, filters, drag-and-drop, or bulk actions: explicitly out of scope or not required.
