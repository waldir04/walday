# Contract: Guest Task Store

**Feature**: `002-task-management` | **Date**: 2026-11-12

This contract defines the browser-local persistence boundary for guest tasks. It is an internal boundary with an untrusted external data source (`localStorage`), not an HTTP API. No server, Prisma, or PostgreSQL contract is introduced.

## 1. Storage location

| Property         | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| Mechanism        | Browser `localStorage`                                 |
| Key              | `walday:tasks`                                         |
| Current version  | `1`                                                    |
| Current envelope | `GuestTaskStoreV1`                                     |
| Lock name        | `walday:tasks` (Web Locks API; same string as the key) |

The key is intentionally unchanged so existing guest data stored as a bare array can migrate without loss.

## 2. Envelope v1

```ts
interface GuestTaskStoreV1 {
  version: 1
  revision: string
  updatedAt: string
  tasks: unknown[]
}
```

| Field       | Contract                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------- |
| `version`   | Integer literal `1`. Any other integer is handled by the version rules below.                 |
| `revision`  | Non-empty UUID string regenerated on every successful write. Used for compare-and-swap.       |
| `updatedAt` | Valid ISO 8601 timestamp of the successful write.                                             |
| `tasks`     | Array of candidate records. Each element is validated individually; the array is not trusted. |

JSON example:

```json
{
  "version": 1,
  "revision": "0b7c2f5a-4c1d-4e8b-9a3f-2d6c8e1b7a90",
  "updatedAt": "2026-11-12T14:35:10.000Z",
  "tasks": []
}
```

## 3. Version handling

| Detected shape              | Outcome                                                                        | Write behavior                                                      |
| --------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Key absent                  | `empty`                                                                        | Normal write allowed.                                               |
| Top-level array (legacy v0) | `legacy`; migrate on next successful write                                     | Normal write allowed after migration.                               |
| `version === 1`             | Validate records                                                               | Allowed, subject to quarantine and revision checks.                 |
| `version` integer `< 1`     | Run registered migration; failure is `migration-failed` and enters `protected` | Allowed only if migration succeeds; otherwise preserve and block.   |
| `version` integer `> 1`     | `unsupported`                                                                  | Blocked for the session; raw payload preserved untouched.           |
| Not JSON / invalid envelope | `corrupt`                                                                      | Blocked until explicit discard confirmation; raw payload preserved. |

Migrations are ordered and one-way. The top-level `version` is inspected before strict envelope validation so a payload written by a newer schema is classified as `unsupported`, not `corrupt`, even when it contains unknown fields. A failed migration must not mutate the parsed original or overwrite storage.

### Legacy v0 field mapping

The prototype stored a bare array containing `{ id, title, description?, priority, dueDate?, estimatedDuration?, completed, createdAt }`.

| v0 field            | Mapping rule                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `id`                | Keep when non-empty; otherwise quarantine.                                                       |
| `title`             | Trim; keep when 3–200 grapheme clusters; otherwise quarantine.                                   |
| `description`       | Trim; absent when empty; keep when ≤2000 grapheme clusters; otherwise quarantine.                |
| `priority`          | Keep only `low`, `medium`, or `high`; otherwise quarantine without coercion.                     |
| `dueDate`           | Keep only a valid `YYYY-MM-DD` calendar date; otherwise quarantine.                              |
| `estimatedDuration` | Parse with the v1 duration grammar; keep only canonical minutes in 1–1440; otherwise quarantine. |
| `completed`         | `true` → `status: 'completed'`; `false` → `status: 'pending'`; other types quarantine.           |
| `createdAt`         | Convert a finite epoch-millisecond number to an ISO timestamp; otherwise quarantine.             |
| Unknown fields      | Quarantine rather than silently strip.                                                           |

If any record is quarantined, the store enters `recovery-blocked`; the migrated valid set may replace the legacy payload only after explicit discard confirmation. Canceling enters `protected`, which preserves the raw payload and blocks writes for the session.

## 4. Read result contract

````ts
type TaskStoreLoadResult =
  | { kind: 'empty' }
  | { kind: 'unavailable' }
  | {
      kind: 'restored'
      tasks: Task[]
      revision: string
      updatedAt: string
      migratedFrom?: number
    }
  | {
      kind: 'partial'
      tasks: Task[]
      revision: string
      updatedAt: string
      migratedFrom?: number
      quarantine: QuarantineSummary
      raw: string
    }
  | {
      kind: 'legacy'
      tasks: Task[]
      quarantine: QuarantineSummary
      raw: string
    }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'migration-failed'; fromVersion: number; raw: string }
  | {
      kind: 'unsupported'
      detectedVersion: number
      raw: string
    }

`TaskRecordValidationCode` is defined in [task-domain.md](./task-domain.md).

```ts
type QuarantineReasonCode =
  | TaskRecordValidationCode
  | 'TASK_DUPLICATE_ID'
  | 'LEGACY_MAPPING_FAILED'
  | 'MIGRATION_FAILED'

interface QuarantineSummary {
  invalidRecords: number
  duplicateIdentities: number
  reasonCodes: QuarantineReasonCode[]
}
````

Rules:

- Reading never writes to storage. Stored records are validated with the strict `storedTaskSchema`; unknown keys quarantine the record rather than being silently stripped.
- `raw` is the exact stored string for corrupt, unsupported, partial, and legacy outcomes.
- Valid records are returned for `partial` and `legacy` outcomes; `corrupt` and `unsupported` outcomes return no tasks.
- Duplicate identities quarantine the affected records so no action can target an ambiguous task.
- `QuarantineSummary` must not contain task titles, descriptions, or raw record content in logs or telemetry.
- A thrown storage access error maps to `unavailable`, never to an unhandled exception.
- UI-facing load codes map as follows: `corrupt` → `STORAGE_CORRUPT`, `partial` → `STORAGE_PARTIAL_CORRUPT`, `migration-failed` → `STORAGE_MIGRATION_FAILED`, and `unsupported` → `STORAGE_UNSUPPORTED_VERSION`. These are not write result codes.

## 5. Write result contract

```ts
type TaskStoreWriteResult =
  | { ok: true; revision: string; updatedAt: string }
  | {
      ok: false
      code:
        | 'STORAGE_UNAVAILABLE'
        | 'STORAGE_QUOTA_EXCEEDED'
        | 'STORAGE_WRITE_FAILED'
        | 'STORAGE_WRITE_BLOCKED'
        | 'STORAGE_CONFLICT'
      cause?:
        | 'corrupt'
        | 'unsupported'
        | 'recovery-blocked'
        | 'protected'
        | 'memory-only'
      latest?: Task[]
      latestRevision?: string
    }
```

Rules:

- Writes are attempted from `normal`, from `memory-only` only when the user explicitly retries, or from `recovery-blocked`/`protected` with `intent: 'discard-unreadable'` after confirmation. A discard may replace corrupt or quarantined data but never an unsupported newer version. `protected` requires reload or a later discard confirmation.
- A conflict returns the latest valid tasks when available so the UI can offer reload.
- A quota or I/O failure retains the in-memory mutation and is retryable.
- The UI must never report persistence success for any `ok: false` result.
- `STORAGE_WRITE_BLOCKED` is not retryable without user action; its `cause` distinguishes corrupt, unsupported, recovery-blocked, protected, and memory-only states.

## 6. Write protocol

```ts
type RevisionBaseline = string | 'empty' | 'legacy' | 'unknown'
type WriteIntent = 'automatic' | 'retry' | 'discard-unreadable'
```

```text
saveGuestTaskStore(tasks, lastSeenRevision: RevisionBaseline, mode, intent: WriteIntent = 'automatic'):
  1. Reject when intent is 'discard-unreadable' and mode is neither
     'recovery-blocked' nor 'protected' with STORAGE_WRITE_BLOCKED.
     Reject when intent is not 'discard-unreadable' and mode is 'unsupported',
     'recovery-blocked', or 'protected'.
     Reject when mode is 'memory-only' and intent is 'automatic'.
  2. Acquire Web Lock 'walday:tasks' when navigator.locks is available.
  3. Read the current envelope without mutating it.
       unavailable            -> STORAGE_UNAVAILABLE
       unsupported            -> STORAGE_WRITE_BLOCKED (never overwrite newer data)
       corrupt without discard intent -> STORAGE_WRITE_BLOCKED
       corrupt with discard intent     -> allow write (skip baseline checks)
       migration failure with discard intent -> allow write (skip baseline checks)
       migration failure without discard intent -> STORAGE_WRITE_BLOCKED
       lastSeenRevision 'empty' or 'unknown' and current store is v1 or a non-empty legacy array
                              -> STORAGE_CONFLICT with latest tasks
       current store absent or an empty legacy array, and baseline 'empty'/'unknown'
                              -> allow write
       current store absent and baseline is a v1 revision
                              -> STORAGE_CONFLICT (do not resurrect cleared data)
       lastSeenRevision 'legacy' and current store empty
                              -> STORAGE_CONFLICT (do not resurrect cleared data)
       current store is legacy and lastSeenRevision is a v1 revision
                              -> STORAGE_CONFLICT with latest tasks
       legacy with a 'legacy' baseline
                              -> skip revision comparison and migrate on this write
       valid v1 revision mismatch -> STORAGE_CONFLICT with latest tasks
  4. Build a new envelope:
       version   = 1
       revision  = crypto.randomUUID()
       updatedAt = new Date().toISOString()
       tasks     = validated current in-memory tasks
  5. localStorage.setItem(key, JSON.stringify(envelope))
       quota error            -> STORAGE_QUOTA_EXCEEDED
       other error            -> STORAGE_WRITE_FAILED
  6. Return the new revision and updatedAt.
  7. Release the lock.
```

- Writes are serialized per tab through a promise chain. `lastSeenRevision` is a v1 revision, `'empty'` for an absent key, `'legacy'` for a loaded bare array, or `'unknown'` for unavailable storage. A retry from `'empty'`/`'unknown'` may write only if the now-readable store is empty. A `'legacy'` baseline migrates only over an unchanged legacy payload and conflicts if the store became empty or v1. Legacy-to-legacy concurrent writes from an older application cannot be distinguished without a revision; that cross-version case is outside the compatibility guarantee.
- Without Web Locks, steps 2 and 7 are skipped; the revision check remains.
- The write is not a transaction over multiple keys. The feature uses one key, so partial multi-key writes cannot occur.
- The envelope is written only after validation; raw user input is never persisted.

## 7. Persistence modes

```ts
type PersistenceMode =
  'normal' | 'memory-only' | 'recovery-blocked' | 'protected' | 'unsupported'
```

| Mode               | Reads                               | Writes                                             | Exit condition                                                                                            |
| ------------------ | ----------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `normal`           | Storage or memory                   | Allowed with revision check                        | Storage failure, corruption, unsupported version.                                                         |
| `memory-only`      | Memory only                         | Automatic writes suspended; explicit retry allowed | Retry succeeds or the page reloads with healthy storage.                                                  |
| `recovery-blocked` | Valid records, if any, + quarantine | Blocked                                            | Explicit discard confirmation → `normal`; cancel → `protected`.                                           |
| `protected`        | Valid records, if any, + quarantine | Blocked until discard confirmation or reload       | Explicit discard confirmation → `normal`; reload with fixed storage. A failed migration enters this mode. |
| `unsupported`      | Memory only                         | Blocked for the session                            | Newer application version or manual user action outside this contract.                                    |

Mode transitions must be announced through the feature's accessible status regions. A storage failure must not disable in-memory task operations.

## 8. Cross-tab contract

| Condition                                             | Required behavior                                                                                                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Another tab writes a valid newer envelope             | Apply it only in `normal` mode with no draft/dialog/pending write; otherwise show a newer-data notice and block stale writes.                                                     |
| Another tab removes the key                           | Apply the empty store only when no draft/dialog/pending write exists and mode is `normal`; otherwise preserve local work, surface the conflict, and never resurrect cleared data. |
| Another tab writes an invalid or unsupported envelope | Do not apply invalid data; surface the problem; preserve raw data.                                                                                                                |
| Local save starts with a stale `lastSeenRevision`     | Abort with `STORAGE_CONFLICT`; preserve the draft; offer reload.                                                                                                                  |
| Two tabs write concurrently                           | Web Lock serializes the critical section; the later stale writer aborts.                                                                                                          |
| Web Locks is unavailable                              | Read-verify-write still aborts stale writers; residual race is limited to the read/write gap.                                                                                     |

The feature does not merge records across tabs and does not resolve semantic conflicts automatically. Automatic merge is out of scope.

## 9. Security and privacy

- Stored payloads are untrusted and are validated on every read.
- Task titles and descriptions are plain text; they are never inserted as HTML.
- Task content must not be written to `console`, analytics, error reporting, or telemetry.
- No credentials, authentication tokens, secrets, or sensitive personal data beyond user-entered task content may be stored.
- The store is scoped to the browser and device; no cross-device availability is implied.
- The guest-storage notice must remain visible so users understand that clearing storage or changing devices can lose data.

## 10. Contract tests

The implementation must cover at least:

1. Absent key → empty.
2. v0 bare array → migrated valid tasks, invalid records quarantined.
3. Failed migration preserves the original payload and enters `protected`.
4. v1 round-trip with revision regeneration.
5. Malformed JSON → corrupt, raw preserved, writes blocked.
6. Invalid record mixed with valid records → partial restore and quarantine.
7. Duplicate identities → both records quarantined.
8. `version: 99` → unsupported, raw preserved, no write.
9. `localStorage` access throws → unavailable, memory-only.
10. Quota error on write → session-only result and retry path.
11. Revision mismatch, an `empty`/`unknown` baseline over a non-empty store, a `legacy` baseline over an empty or v1 store, and an unexpected legacy payload over a v1 baseline → conflict and no overwrite.
12. Explicit discard confirmation → `normal` and a new envelope over corrupt/quarantined data; an unsupported newer payload is never overwritten.
13. Cancellation → `protected` with raw data untouched and no later overwrite.
14. Lock acquisition when available and fallback when absent.
15. Storage event application, external clear, conflict surfacing, and invalid/unsupported external payload handling.
16. No task content in captured logs or error output.
