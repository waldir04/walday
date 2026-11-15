# Contract: Task Slot Storage

**Feature**: `006-daily-agenda` | **Date**: 2026-11-15

Internal guest-store contract for the optional task slot. There is no HTTP API in this feature.

## Key and envelope

- Key: `walday:tasks` (unchanged)
- Version: `2` (`TASKS_STORAGE_VERSION`)
- Envelope: `{ version, revision, updatedAt, tasks }`, strict schema
- Write lock name: `walday:tasks` (unchanged)

Version 2 differs from version 1 only in that a task record may carry `plannedDate` and `plannedStartTime`. No other field, key, or envelope property changes.

## Task record

```ts
interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'completed'
  priority: 'low' | 'medium' | 'high'
  dueDate?: LocalDate
  estimatedMinutes?: number
  plannedDate?: LocalDate       // new, optional
  plannedStartTime?: LocalTime  // new, optional, present iff plannedDate
  createdAt: string
}
```

Schema rules:

- Strict object: unknown fields still fail.
- `plannedDate` and `plannedStartTime` are validated with the existing local-date and local-time predicates.
- A cross-field refinement rejects a record where exactly one of the pair is present.
- A cross-field refinement rejects a record whose slot pair is present without `estimatedMinutes` (`SLOT_DURATION_REQUIRED`); a scheduled task always has a duration.
- `estimatedMinutes` keeps its existing 1–1440 integer range.

## Migration

| From | To | Behavior |
|---|---|---|
| 1 | 2 | Pass `tasks` through unchanged; empty quarantine; set envelope version 2 on the next write |
| legacy array | 2 | Existing legacy mapping, then the same version 2 validation |
| > 2 | — | `unsupported`; no read of task records, no write |

- The migration is registered in `REGISTERED_MIGRATIONS` and exercised by a test with a realistic version 1 envelope.
- Migration never fabricates, clears, or guesses a slot.
- A record failing version 2 validation is quarantined per record; readable records still load and the result is `partial`.

## Write paths

| Operation | Effect on slot | Persistence |
|---|---|---|
| `createTask` | No slot | Single envelope write |
| `updateTask` | **Preserved** unchanged | Single envelope write |
| `toggleTask` | Preserved unchanged | Single envelope write |
| `deleteTask` | Removed with the record | Single envelope write |
| `scheduleTask(id, slot)` | Sets `plannedDate` and `plannedStartTime`; writes the resolved `estimatedMinutes` (the task's own value when it already had one, otherwise the validated input) in the same write | Single envelope write |
| `unscheduleTask(id)` | Clears both fields | Single envelope write |

All six go through `runMutation`, so they inherit: pending guard, external-change conflict guard, revision baseline, `STORAGE_CONFLICT`, quota and write-failure handling, memory-only fallback with a session-only notice, and the multi-tab storage event behavior.

## Failure semantics

| Outcome | Result | Data state |
|---|---|---|
| Validation rejected | No mutation called | Unchanged |
| Slot fails the storage schema at write time | `scheduleTask` returns `false`, no write | Unchanged |
| External change detected | `scheduleTask`/`unscheduleTask` return `false`, conflict notice | Unchanged |
| Storage conflict | Returns `false`, conflict notice, `externalChange = true` | Unchanged |
| Write blocked / unavailable | Applies in memory, session-only notice (same as Task Management) | In-memory only; clearly warned |
| Quota exceeded | Applies in memory, session-only notice | In-memory only; clearly warned |

The agenda must never present a schedule result as saved when the result was session-only; it shows the same warning copy Task Management uses.

## Read-side rules for the agenda

- Timeline: `plannedDate === selectedDate` (pending or completed).
- Unscheduled: `status === 'pending' && plannedDate === undefined`.
- Derived end: `plannedStartTime + estimatedMinutes`, clipped to 1440 with `exceedsDayEnd`.
- Slot fields are never read by Task Management's forms, sorting, due-date logic, or completion logic.

## Prohibited behaviors

- Writing a slot from any Task Management operation.
- Inferring a slot from a due date, ordering, priority, or availability.
- Clearing a slot as a side effect of completing, editing, sorting, or viewing.
- Reading or writing the slot outside `entities/task` and the `useTasks` controller.
