# ADR 0010: Agenda-Owned Task Slot on the Task Record

**Status**: Accepted
**Date**: 2026-11-15
**Feature**: 006-daily-agenda

## Context

The agenda lets a user place a pending task at a start time on a specific date. That planned slot is the only persisted change this feature introduces. It must be atomic with the task itself, must never be inferred from a due date or from available time, and must not be written by any Task Management operation.

## Decision

1. The slot is two optional fields on the existing task record: `plannedDate` (`LocalDate`) and `plannedStartTime` (`LocalTime`). They are present together or not at all.
2. The slot lives in the existing `walday:tasks` envelope. No separate storage key is introduced.
3. The task envelope moves from version 1 to version 2. A registered `1 → 2` migration passes the stored `tasks` array through unchanged with an empty quarantine and never fabricates, clears, or guesses a slot. The next successful write persists version 2.
4. A version greater than 2 is rejected as `unsupported`; the store is not read or written.
5. A scheduled task requires `estimatedMinutes`. A record with a slot and no duration, an invalid date or time, or exactly one field of the pair is quarantined per record under the existing sanitize path. The slot is never silently dropped.
6. `scheduleTask(id, slot)` and `unscheduleTask(id)` are the only slot writers. Both go through the existing `runMutation` path, so they inherit the pending guard, external-change guard, revision baseline, conflict handling, quota fallback, session-only notice, and multi-tab behavior. `scheduleTask` writes the slot and the resolved duration in one envelope write.
7. Task Management's `createTask` never writes a slot; `updateTask` and `toggleTask` preserve it; `deleteTask` removes it with the record. When a scheduled task is edited without a duration, `updateTask` preserves its existing `estimatedMinutes` so the slot remains valid at the storage boundary.

## Alternatives rejected

- **Separate `walday:task-slots` key**: a second key cannot be written atomically with the task record, creates orphan slots when a task is deleted, and requires duplicate-record reconciliation across two stores. It also introduces a second source of task data, which the specification forbids.
- **Encode the slot in `dueDate` or metadata**: conflates a deadline with a planned time, contradicts FR-011, and is not reversible without guessing.
- **Infer a slot from available time**: violates FR-026; scheduling must be explicit.
- **Persist a separate agenda copy of tasks**: violates FR-060 and creates drift.

## Consequences

- Old data loads without loss, and a v1 envelope is rewritten as v2 only after the next user-initiated write.
- The storage boundary rejects an invalid slot instead of quietly moving a planned activity.
- Task Management forms, sorting, due-date logic, and completion logic never read or write the slot.
- The migration and write paths are covered by deterministic tests with injected storage, clock, and IDs.
