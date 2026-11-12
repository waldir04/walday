# Data Model: Task Management

**Feature**: `002-task-management` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

This model is the canonical technical contract for the task domain and the guest task store. It refines spec §3.14 and the validation rules in §3.13. It introduces no server, API, Prisma, or PostgreSQL model.

## 1. Conventions

| Concept               | Representation                            | Rules                                                                                                   |
| --------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Task identity         | UUID v4 string via `crypto.randomUUID()`  | Stable for the task lifetime; unique within the store; duplicates invalidate the affected records.      |
| Creation timestamp    | ISO 8601 UTC string                       | Assigned once at creation; never changed by editing; used for ordering.                                 |
| Due date              | `YYYY-MM-DD` string                       | Calendar date only; no time, no timezone conversion; must be a real date.                               |
| Estimated duration    | Integer number of minutes                 | Inclusive range 1–1440 when present; absent when cleared.                                               |
| User-perceived length | Grapheme cluster count                    | Computed with `Intl.Segmenter` after trimming; emoji and combined characters count as one.              |
| Persistence revision  | UUID v4 string                            | Regenerated on every successful store write; used for compare-and-swap conflict detection.              |
| Revision baseline     | v1 revision or `empty`/`legacy`/`unknown` | Last observed store state; sentinels distinguish absent, legacy, and unavailable storage during writes. |
| Storage timestamp     | ISO 8601 UTC string                       | Time of the last successful write to the guest store.                                                   |

## 2. Domain Entities

### 2.1 Task

| Field              | Type                       | Required | Constraints                                                       | Notes                                                           |
| ------------------ | -------------------------- | -------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `id`               | `TaskId` (UUID string)     | Yes      | Non-empty, unique within the store                                | Assigned once; never reused.                                    |
| `title`            | `string`                   | Yes      | Trimmed; 3–200 grapheme clusters; not whitespace-only             | Stored and displayed trimmed; user content is never translated. |
| `description`      | `string`                   | No       | Trimmed; 1–2000 grapheme clusters when present; absent when empty | Stored as `undefined`/absent when blank.                        |
| `status`           | `TaskStatus`               | Yes      | `'pending' \| 'completed'`                                        | New tasks are `pending`; completion never deletes data.         |
| `priority`         | `Priority`                 | Yes      | `'low' \| 'medium' \| 'high'`                                     | New tasks default to `'medium'`.                                |
| `dueDate`          | `LocalDate` (`YYYY-MM-DD`) | No       | Valid calendar date; date-only; may be past, today, or future     | Absent when cleared; never shifts with timezone changes.        |
| `estimatedMinutes` | `number`                   | No       | Whole number, 1–1440                                              | Canonical planning context; not a scheduled time.               |
| `createdAt`        | ISO 8601 string            | Yes      | Valid timestamp                                                   | Used for newest-first ordering; editing does not change it.     |

Example:

```json
{
  "id": "6f1c2d7e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  "title": "Write the weekly report",
  "description": "Include the planning metrics section.",
  "status": "pending",
  "priority": "high",
  "dueDate": "2026-11-20",
  "estimatedMinutes": 90,
  "createdAt": "2026-11-12T14:30:00.000Z"
}
```

### 2.2 Task Status

| Value       | Meaning                                  | Allowed transitions                        |
| ----------- | ---------------------------------------- | ------------------------------------------ |
| `pending`   | The task is not complete.                | `pending → completed` via explicit toggle. |
| `completed` | The task is complete but fully retained. | `completed → pending` via explicit toggle. |

Invariants:

- Completion never deletes the task, removes metadata, or changes `createdAt`.
- Editing non-status fields never changes `status`.
- A completed task retains `title`, `description`, `priority`, `dueDate`, `estimatedMinutes`, and `id`.
- Past-due display is derived only for `pending` tasks.

### 2.3 Priority

| Value    | Default for new tasks | Display rule                             |
| -------- | --------------------- | ---------------------------------------- |
| `low`    | No                    | Localized text label, never color alone. |
| `medium` | Yes                   | Localized text label, never color alone. |
| `high`   | No                    | Localized text label, never color alone. |

### 2.4 Derived values (not stored)

| Value         | Derivation                                                              | Rule                                                                 |
| ------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `isPastDue`   | `status === 'pending' && dueDate !== undefined && dueDate < localToday` | Uses the user's local calendar date; never true for completed tasks. |
| `group`       | `status`                                                                | Pending group precedes completed group.                              |
| `titleLength` | Grapheme count of `title` after trim                                    | Diagnostic only; not persisted.                                      |

## 3. Validation Rules

### 3.1 Field rules

| Field       | Rule code               | Condition                                                      | Localized key                   |
| ----------- | ----------------------- | -------------------------------------------------------------- | ------------------------------- |
| Title       | `TITLE_REQUIRED`        | Trimmed title is empty.                                        | `validation.titleRequired`      |
| Title       | `TITLE_TOO_SHORT`       | Trimmed title has fewer than 3 grapheme clusters.              | `validation.titleTooShort`      |
| Title       | `TITLE_TOO_LONG`        | Trimmed title has more than 200 grapheme clusters.             | `validation.titleTooLong`       |
| Description | `DESCRIPTION_TOO_LONG`  | Trimmed description has more than 2000 grapheme clusters.      | `validation.descriptionTooLong` |
| Priority    | `PRIORITY_INVALID`      | Value is not `low`, `medium`, or `high`.                       | `validation.priorityInvalid`    |
| Due date    | `DUE_DATE_INVALID`      | Value is present and is not a real `YYYY-MM-DD` calendar date. | `validation.dueDateInvalid`     |
| Duration    | `DURATION_INVALID`      | Input does not resolve to a whole number of minutes.           | `validation.durationInvalid`    |
| Duration    | `DURATION_OUT_OF_RANGE` | Resolved minutes are outside 1–1440.                           | `validation.durationRange`      |
| Duration    | `DURATION_FRACTIONAL`   | Input resolves to a fractional value.                          | `validation.durationFractional` |

Validation behavior:

- Trimming is applied before length and emptiness checks.
- An empty description after trim is stored as absent, not as `''`.
- Validation returns typed codes and field names; it never returns localized strings.
- Invalid input prevents the mutation, preserves the draft, and produces no partial task change.
- Form payloads, stored records, and the envelope use strict schemas; unknown keys invalidate the payload or record instead of being silently stripped. This prevents silent field loss when shapes drift.
- Stored records are validated field by field; a failure quarantines that record instead of accepting a coerced value.

### 3.2 Cross-field and domain rules

| Rule code                 | Condition                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `TASK_ID_INVALID`         | Record `id` is missing, empty, or not a valid non-empty string.                                                    |
| `TASK_DUPLICATE_ID`       | Two or more otherwise valid stored records share the same `id`; all affected records are quarantined as ambiguous. |
| `TASK_CREATED_AT_INVALID` | `createdAt` is missing or not a valid ISO timestamp.                                                               |
| `TASK_STATUS_INVALID`     | `status` is not `pending` or `completed`.                                                                          |
| `STORAGE_CONFLICT`        | The persisted revision changed before a write could commit.                                                        |
| `TASK_NOT_FOUND`          | A mutation targets a task that no longer exists in the current store.                                              |

### 3.3 Duration input grammar

Accepted forms (case-insensitive, surrounding whitespace ignored):

| Input            | Result   | Notes                                                   |
| ---------------- | -------- | ------------------------------------------------------- |
| `30 min`         | 30       | `min`, `mins`, `minute`, `minutes`, `m`.                |
| `1h`             | 60       | `h`, `hr`, `hrs`, `hour`, `hours`.                      |
| `1 h 30 min`     | 90       | Hours and minutes combined.                             |
| `90 min`         | 90       | Canonical result is minutes.                            |
| `24h`            | 1440     | Upper bound is inclusive.                               |
| `30`             | Rejected | Bare number is ambiguous; an explicit unit is required. |
| `1.5h`           | Rejected | Fractional result.                                      |
| `0`, `-5`, `25h` | Rejected | Out of range.                                           |
| `soon`, `1h 30`  | Rejected | Unparseable or missing unit context.                    |

Grammar details: units are case-insensitive and may be attached to the number or separated by whitespace; hours and minutes may be adjacent or separated by whitespace; no other characters are allowed. A bare number is rejected. Formatted output is generated with `Intl.NumberFormat` unit parts (hours, minutes) joined in the active locale; user input is never stored as text.

## 4. Ordering

The canonical comparator is:

1. `pending` tasks before `completed` tasks.
2. Within a group, `createdAt` descending (most recently created first).
3. For equal `createdAt`, `id` ascending as a deterministic tie-break.

Rules:

- Editing a task never changes its `createdAt` or its position within its group.
- Changing `status` moves the task to the other group.
- The comparator is pure and total; given the same records it produces the same order across reloads.
- The list renders two labelled groups; the all-completed state keeps the completed group visible and never shows the global empty state.

## 5. Guest Task Store

### 5.1 Envelope v1

Storage key: `walday:tasks`

| Field       | Type                | Required | Rules                                                                |
| ----------- | ------------------- | -------- | -------------------------------------------------------------------- |
| `version`   | integer literal `1` | Yes      | Current supported schema version.                                    |
| `revision`  | UUID string         | Yes      | New value on every successful write; used for conflict detection.    |
| `updatedAt` | ISO 8601 string     | Yes      | Time of the successful write.                                        |
| `tasks`     | array               | Yes      | Each element is validated individually; may contain invalid records. |

Example:

```json
{
  "version": 1,
  "revision": "0b7c2f5a-4c1d-4e8b-9a3f-2d6c8e1b7a90",
  "updatedAt": "2026-11-12T14:35:10.000Z",
  "tasks": [
    {
      "id": "6f1c2d7e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
      "title": "Write the weekly report",
      "status": "pending",
      "priority": "high",
      "createdAt": "2026-11-12T14:30:00.000Z"
    }
  ]
}
```

### 5.2 Legacy v0 shape

The prototype stored a bare array at the same key. It is treated as v0 and migrated on the next successful write:

| Source field        | v0 shape                    | v1 mapping                                                                                                    |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `id`                | string                      | Keep when non-empty; otherwise quarantine the record.                                                         |
| `title`             | string                      | Trim; keep when 3–200 grapheme clusters; otherwise quarantine.                                                |
| `description`       | optional string             | Trim; absent when empty; keep when ≤2000 grapheme clusters; otherwise quarantine.                             |
| `priority`          | `low \| medium \| high`     | Keep when valid; otherwise quarantine. Never coerce an invalid value.                                         |
| `dueDate`           | optional string             | Keep when a valid `YYYY-MM-DD` calendar date; otherwise quarantine.                                           |
| `estimatedDuration` | optional free text          | Parse with the v1 duration grammar. Keep canonical minutes when parseable and in range; otherwise quarantine. |
| `completed`         | boolean                     | `true` → `status: 'completed'`; `false` → `status: 'pending'`; any other type quarantines.                    |
| `createdAt`         | number (epoch milliseconds) | Convert to an ISO 8601 string when finite; otherwise quarantine.                                              |
| Unknown fields      | any                         | Quarantine the record rather than silently stripping data.                                                    |

Migration rules:

- A legacy payload with no quarantined records is migrated to v1 on the next successful write.
- A legacy payload with quarantined records enters `recovery-blocked`; writing the migrated valid set requires explicit discard confirmation, and canceling preserves the original array and enters `protected` (read-only session).
- Migration never mutates the parsed original and never writes a partial result as authoritative.
- No prior v1 data exists in production. The migration registry must remain ordered for future supported versions.

### 5.3 Read algorithm and outcomes

```text
loadGuestTaskStore():
  unavailable?                -> { kind: 'unavailable' }
  absent?                     -> { kind: 'empty' }
  parse JSON fails?           -> { kind: 'corrupt', raw }
  top-level array?            -> validate legacy records
                                 -> { kind: 'legacy', tasks, quarantine, raw }
  version integer > CURRENT?  -> { kind: 'unsupported', detectedVersion, raw }
  version integer < CURRENT?  -> apply migration
    migration fails?          -> { kind: 'migration-failed', fromVersion, raw }
    migration succeeds?       -> continue
  version missing/invalid or envelope invalid? -> { kind: 'corrupt', raw }
  envelope valid:
    validate each record      -> valid tasks + quarantine
    no quarantine             -> { kind: 'restored', tasks, revision, updatedAt, migratedFrom? }
    some quarantine           -> { kind: 'partial', tasks, quarantine, raw, revision, updatedAt, migratedFrom? }
```

Rules:

- `quarantine` contains only counts and non-sensitive reason codes; it must not expose task content in logs.
- `raw` is preserved exactly for legacy, corrupt, migration-failed, unsupported, and partial outcomes.
- The reader never writes during load, so unsupported and unreadable payloads remain intact.

### 5.4 Write protocol and outcomes

```text
type RevisionBaseline = string | 'empty' | 'legacy' | 'unknown'

saveGuestTaskStore(tasks, lastSeenRevision: RevisionBaseline, mode, intent = 'automatic'):
  intent is 'discard-unreadable' and mode is neither 'recovery-blocked' nor 'protected'? -> { ok: false, code: 'STORAGE_WRITE_BLOCKED' }
  intent is not 'discard-unreadable' and mode is unsupported, recovery-blocked, or protected? -> { ok: false, code: 'STORAGE_WRITE_BLOCKED' }
  mode is memory-only and intent is 'automatic'? -> { ok: false, code: 'STORAGE_WRITE_BLOCKED' }
  acquire Web Lock 'walday:tasks' when available
  read current envelope
    unavailable? -> failure STORAGE_UNAVAILABLE
    current store is unsupported? -> failure STORAGE_WRITE_BLOCKED (never overwrite newer data)
    current store is corrupt and intent is not 'discard-unreadable'? -> failure STORAGE_WRITE_BLOCKED
    current store is corrupt and intent is 'discard-unreadable'? -> allow write (skip baseline checks)
    current store needs migration and migration fails?
      intent is 'discard-unreadable'? -> allow write (skip baseline checks)
      otherwise -> failure STORAGE_WRITE_BLOCKED
    lastSeenRevision is 'empty' or 'unknown' and current store is a v1 envelope or a non-empty legacy array? -> failure STORAGE_CONFLICT with latest tasks
    current store is absent or an empty legacy array, and lastSeenRevision is 'empty' or 'unknown'? -> allow write
    current store is absent and lastSeenRevision is a v1 revision? -> failure STORAGE_CONFLICT (do not resurrect cleared data)
    lastSeenRevision is 'legacy' and current store is empty? -> failure STORAGE_CONFLICT (do not resurrect cleared data)
    current store is legacy and lastSeenRevision is a v1 revision? -> failure STORAGE_CONFLICT with latest tasks
    legacy with a 'legacy' baseline? -> skip revision comparison and migrate on this write
    valid v1 with revision != lastSeenRevision? -> failure STORAGE_CONFLICT with latest tasks
  write envelope { version: 1, revision: new UUID, updatedAt: now, tasks }
    quota/permission error? -> failure STORAGE_QUOTA_EXCEEDED or STORAGE_WRITE_FAILED
    success? -> { ok: true, revision, updatedAt }
  release lock
```

When Web Locks is unavailable, the same read-verify-write sequence runs without mutual exclusion. The revision check still aborts stale writers. A failed automatic write enters `memory-only`; an explicit retry passes `intent = 'retry'` and returns to `normal` on success. Baselines are explicit: `'empty'` for an absent key, `'legacy'` for a loaded bare array, `'unknown'` for unavailable storage, or a v1 revision string. Intent is `'automatic'`, `'retry'`, or `'discard-unreadable'`; only the last may replace corrupt/quarantined data, and it may never overwrite an unsupported newer version. A retry from `'empty'`/`'unknown'` writes only when the now-readable store is empty; a `'legacy'` baseline migrates only over an unchanged legacy payload and conflicts if the store became empty or v1. Legacy-to-legacy concurrent writes from an older application cannot be distinguished without a revision; that cross-version case is documented as outside the compatibility guarantee.

### 5.5 Persistence modes

| Mode               | Entered when                                                                            | Reads                      | Writes                                             | User communication                                              |
| ------------------ | --------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------- | --------------------------------------------------------------- |
| `normal`           | Load succeeded or store is empty.                                                       | Allowed                    | Allowed                                            | Guest storage notice only.                                      |
| `memory-only`      | Storage unavailable or a retryable automatic write failure.                             | Memory only                | Automatic writes suspended; explicit retry allowed | Persistent warning that changes may not be saved.               |
| `recovery-blocked` | Corrupt payload or partial recovery with quarantined records, before the guest chooses. | Valid records only, if any | Blocked until explicit discard confirmation        | Recovery notice listing how many tasks could not be restored.   |
| `protected`        | Guest cancels discarding unreadable records, or a supported migration fails.            | Valid records only, if any | Blocked until discard confirmation or reload       | Notice that stored data is preserved and writes are disabled.   |
| `unsupported`      | Newer schema version detected.                                                          | Memory only                | Blocked for the session                            | Notice that stored data cannot be read safely and is preserved. |

Explicit discard confirmation transitions `recovery-blocked` or `protected` to `normal` and performs the pending write with a fresh envelope. Cancellation from `recovery-blocked` transitions to `protected`.

### 5.6 Stable store error codes

| Code                          | Source       | Meaning                                                                             | Retryable                                                                       |
| ----------------------------- | ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `STORAGE_UNAVAILABLE`         | Load / write | `localStorage` is absent or access throws.                                          | No                                                                              |
| `STORAGE_QUOTA_EXCEEDED`      | Write        | Write failed because the quota was exceeded.                                        | Yes                                                                             |
| `STORAGE_WRITE_FAILED`        | Write        | Any other write failure (permissions, I/O).                                         | Yes                                                                             |
| `STORAGE_CORRUPT`             | Load outcome | Payload cannot be parsed or the envelope is invalid.                                | No                                                                              |
| `STORAGE_MIGRATION_FAILED`    | Load outcome | A supported older payload could not be migrated safely.                             | No                                                                              |
| `STORAGE_PARTIAL_CORRUPT`     | Load outcome | Some records were isolated; valid records were restored.                            | No                                                                              |
| `STORAGE_UNSUPPORTED_VERSION` | Load outcome | Payload was written by a newer unsupported schema version.                          | No                                                                              |
| `STORAGE_WRITE_BLOCKED`       | Write        | A write was attempted while the store was protected or awaiting retry/confirmation. | After explicit retry (memory-only) or discard confirmation; not for unsupported |
| `STORAGE_CONFLICT`            | Write        | The stored revision changed before the write committed.                             | Yes, after reload                                                               |

These codes are domain codes for the UI. Load outcomes map to codes as follows: `corrupt` → `STORAGE_CORRUPT`, `partial` → `STORAGE_PARTIAL_CORRUPT`, `migration-failed` → `STORAGE_MIGRATION_FAILED`, and `unsupported` → `STORAGE_UNSUPPORTED_VERSION`. They are not an HTTP error envelope and are not sent over a network.

## 6. Cross-Tab Synchronization Model

| Event                                         | State precondition                                    | Behavior                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `storage` event with valid newer envelope     | No draft, dialog, or pending write, and `normal` mode | Replace in-memory tasks and last seen revision; announce that tasks were updated elsewhere.              |
| `storage` event with valid newer envelope     | Draft, dialog, pending write, or non-normal mode      | Keep local work; set `externalChange`; show persistent notice with a reload action; block stale writes.  |
| `storage` event with `newValue === null`      | No draft, dialog, pending write, and `normal` mode    | Apply the empty store, inform the user, and never claim current changes are saved.                       |
| `storage` event with `newValue === null`      | Draft, dialog, pending write, or non-normal mode      | Preserve local work, surface the conflict, block writes, offer reload, and never resurrect cleared data. |
| `storage` event with invalid/unsupported data | Any                                                   | Do not apply it; surface the problem and preserve the raw stored value.                                  |
| Save attempt with revision mismatch           | Any                                                   | Abort the write, preserve the draft, surface the conflict, and offer reload.                             |
| Concurrent writes in two tabs                 | Both in `normal`                                      | Web Lock serializes writers; the later writer aborts if its base revision is stale.                      |

The store never merges records automatically across tabs. Conflicting data is surfaced rather than silently combined; there is no conflict-resolution policy beyond reloading the newer store because cross-device sync is out of scope.

## 7. Invariants

1. A persisted task always has a unique identity, a valid title, valid status and priority, and a valid creation timestamp.
2. Invalid stored records never prevent valid records from being restored, and never cause an unhandled exception.
3. A write that would discard unreadable records is impossible without explicit user confirmation.
4. A stale tab cannot silently overwrite a newer revision.
5. Editing never changes identity or creation order; completion never deletes or mutates metadata.
6. A task with no description, due date, or duration remains fully valid.
7. Stored task content is treated as plain text and is never logged, executed, or interpreted as markup.
8. No secret, credential, token, or data beyond user-entered task content is stored.

## 8. Future Consumer Contract

Daily Agenda and Planning Suggestions must consume validated `Task` domain objects, not raw storage payloads. The minimum consumer view is:

```ts
interface TaskPlanningView {
  id: string
  title: string
  status: 'pending' | 'completed'
  priority: 'low' | 'medium' | 'high'
  dueDate?: string
  estimatedMinutes?: number
  createdAt: string
}
```

Consumers must not assume that a task has a due date, a duration, or a time slot. They must treat `estimatedMinutes` as planning context, not a guaranteed execution time. The current feature exposes no scheduling, rescheduling, or agenda mutation behavior.

## 9. Business Constants

| Constant                    | Value          | Location                                        |
| --------------------------- | -------------- | ----------------------------------------------- |
| `TASKS_STORAGE_KEY`         | `walday:tasks` | `frontend/src/shared/config/tasks.ts`           |
| `TASKS_STORAGE_VERSION`     | `1`            | `frontend/src/shared/config/tasks.ts`           |
| `TASKS_LOCK_NAME`           | `walday:tasks` | `frontend/src/shared/config/tasks.ts`           |
| `TITLE_MIN_GRAPHEMES`       | `3`            | `frontend/src/entities/task/model/constants.ts` |
| `TITLE_MAX_GRAPHEMES`       | `200`          | `frontend/src/entities/task/model/constants.ts` |
| `DESCRIPTION_MAX_GRAPHEMES` | `2000`         | `frontend/src/entities/task/model/constants.ts` |
| `DURATION_MIN_MINUTES`      | `1`            | `frontend/src/entities/task/model/constants.ts` |
| `DURATION_MAX_MINUTES`      | `1440`         | `frontend/src/entities/task/model/constants.ts` |
| `DEFAULT_PRIORITY`          | `medium`       | `frontend/src/entities/task/model/constants.ts` |
| `DEFAULT_STATUS`            | `pending`      | `frontend/src/entities/task/model/constants.ts` |

The specification notes that the 1–1440 duration range and the title/description limits are business constants that may be adjusted without changing surrounding behavior.
