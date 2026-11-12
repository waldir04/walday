# ADR 0006: Task Domain and Storage Ownership

- **Status**: Accepted
- **Date**: 2026-11-12

## Context

ADR 0003 recorded that the task model intentionally remained in `features/tasks` and that moving it
to `entities/task` was follow-up debt. The task prototype also stored a bare array in
`localStorage`, with no version, revision, migration, or failure reporting.

The constitution assigns domain models, validation, business rules, and persistence ownership to
`entities`, and user interactions and use cases to `features`.

## Decision

- The task domain moves to `entities/task`: types, constants, Zod schemas, validation, duration and
  due-date rules, ordering, sanitization, legacy migration, and the guest store boundary.
- `features/tasks` keeps the interaction layer: the `useTasks` hook, forms, list, dialogs, notices,
  and the route skeleton.
- `pages/TasksPage.tsx` composes the feature; `app/router.tsx` uses the feature skeleton as the
  lazy-route fallback.
- `shared/config/tasks.ts` contains only persistence configuration (key, version, lock name).
  Domain limits and defaults live in `entities/task/model/constants.ts`.
- The persisted value becomes a versioned envelope (`version`, `revision`, `updatedAt`, `tasks`)
  under the unchanged key `walday:tasks`, so existing guest data can migrate.
- Storage failures are reported through typed results. No component claims persistence after a
  failed write.
- `features/tasks/skeleton.ts` is a narrow secondary public entry for `TasksPageSkeleton`. The app
  router imports it so the route fallback does not pull the interactive task slice into the initial
  bundle; the main feature API remains `features/tasks/index.ts`.

## Consequences

- FSD boundaries are restored and enforceable by lint and review.
- Existing guest tasks stored as a bare array remain readable and migrate on the next successful
  write; unreadable records are quarantined instead of silently dropped.
- Cross-tab writes use a revision compare-and-swap and Web Locks when available.
- A future backend can consume validated `Task` objects without exposing storage internals.
