# Contract: Commitment Local Store

**Feature**: 004-daily-commitments | **Contract version**: 1 | **Date**: 2026-11-12
**Related**: [data-model.md](../data-model.md) | [spec.md](../spec.md)

## Purpose

Define the versioned browser-local persistence contract for guest commitments. It is consumed by:

1. `entities/commitment/model/storage.ts` and `features/commitments` (read/write).
2. The future Daily Agenda, which reads commitments by date (FR-043).

There is **no HTTP API** for this feature. FR-044 forbids sending commitment data to a server, external calendar, or third party. Request/response envelopes, status codes, and CORS do not apply.

## Storage identity

| Parameter | Value |
|---|---|
| Storage mechanism | `localStorage` (treated as untrusted on read) |
| Key | `walday:commitments` |
| Current version | `1` |
| Lock name (Web Locks, when available) | `walday:commitments` |
| Write atomicity | Single `setItem` of the whole envelope; failure leaves the previous value untouched |

## Version 1 envelope

```json
{
  "version": 1,
  "revision": "6f1c2f1e-6d47-4d6a-9a2f-8f0f2a7b9c11",
  "updatedAt": "2026-11-12T18:30:00.000Z",
  "commitments": []
}
```

| Field | Type | Constraints |
|---|---|---|
| `version` | number | Must equal `1`; unknown values are reported as `unsupported` and are not written |
| `revision` | string | Non-empty UUID; changes on every successful write |
| `updatedAt` | string | ISO-8601 timestamp of the successful write |
| `commitments` | array | Array of unknown records validated individually; invalid entries are quarantined on read and never invented; unknown top-level keys are rejected |

The envelope is **strict**: unknown top-level keys make the payload invalid. Records are validated individually so one bad record cannot discard the whole store.

## Commitment record (version 1)

```json
{
  "id": "d0f8f0d6-7a1e-4f5f-9e20-3a6c1a2b3c4d",
  "title": "Team sync",
  "description": "Weekly planning",
  "date": "2026-11-12",
  "startTime": "09:00",
  "endTime": "10:00",
  "type": "fixed",
  "createdAt": "2026-11-12T08:12:00.000Z"
}
```

| Field | Type | Required | Rule |
|---|---|---|---|
| `id` | string | Yes | Non-empty; stable; unique within the store |
| `title` | string | Yes | Trimmed; 1–120 grapheme clusters |
| `description` | string | No | Trimmed; 1–500 grapheme clusters; omitted when blank |
| `date` | string | Yes | `^\d{4}-\d{2}-\d{2}$` naming a real calendar date |
| `startTime` | string | Yes | `^([01]\d|2[0-3]):[0-5]\d$` |
| `endTime` | string | Yes | Same pattern; strictly later than `startTime`; `00:00` invalid |
| `type` | string | Yes | `fixed` or `flexible` |
| `createdAt` | string | Yes | ISO-8601 timestamp; preserved across edits |

Records are strict and reject unknown fields. No Prisma type, database row, or provider DTO is exposed through this contract.

## Read contract

### Algorithm

1. Resolve `localStorage`; if unavailable, return `unavailable`.
2. Read `walday:commitments`; if absent, return `empty`.
3. Parse JSON. On parse failure, return `corrupt` with the raw payload retained for recovery.
4. If the parsed value is an array, treat it as the legacy v0 shape and sanitize each record (`legacy`).
5. If it is a plain object, reject unknown shapes as `corrupt`.
6. If `version` is greater than `1`, return `unsupported`.
7. If `version` is lower than `1`, attempt the registered migration; if it fails, return `migration-failed`.
8. Validate the envelope, then validate and sanitize each record, producing `restored` or `partial` with a quarantine summary and the stored `revision`/`updatedAt`.

### Result union

| Kind | Required payload | Meaning |
|---|---|---|
| `empty` | — | No stored value |
| `restored` | `commitments`, `revision`, `updatedAt` | All records valid |
| `partial` | `commitments`, `quarantine`, `revision`, `updatedAt`, `raw` | Some records were quarantined; valid data is usable |
| `legacy` | `commitments`, `quarantine`, `raw` | Current raw-array shape; migrated in memory |
| `corrupt` | `raw` | Unparseable/invalid envelope; do not overwrite |
| `migration-failed` | `fromVersion`, `raw` | Known older version that cannot be migrated; do not overwrite |
| `unsupported` | `detectedVersion`, `raw` | Future version; read-only |
| `unavailable` | — | Storage cannot be accessed |

**Guarantees**

- A missing `id` is **not** replaced with a new one; such a record is quarantined.
- Duplicate IDs keep the first valid record and quarantine later duplicates.
- No read path writes to storage.
- Valid records are never discarded because another record is invalid.

## Write contract

### Inputs

| Input | Type | Meaning |
|---|---|---|
| `commitments` | `Commitment[]` | Complete desired list, already validated |
| `baselineRevision` | string \| `'empty'` \| `'legacy'` \| `'unknown'` | Revision observed by the caller when the data was loaded/adopted |
| `mode` | `'normal' \| 'recovery-blocked' \| 'unsupported'` | Current persistence mode; only `normal` accepts writes |
| `intent` | `'automatic' \| 'retry'` | Retry is a user-initiated attempt after an unavailable/write failure; it never overwrites unreadable data |

### Algorithm

1. Reject writes unless the mode is `normal`; return `STORAGE_WRITE_BLOCKED` with the matching cause.
2. Validate every record; reject the whole write if any record is invalid.
3. Resolve storage and the lock adapter; return `STORAGE_UNAVAILABLE` when storage is absent.
4. Re-read the current store inside the queued/locked operation.
5. Refuse to write over `corrupt`, `migration-failed`, `partial`, or `unsupported` states during automatic saves.
6. Compare the current revision with `baselineRevision`. A mismatch returns `STORAGE_CONFLICT` with the latest commitments and revision.
7. Generate a new revision and `updatedAt`, then write the complete envelope in one `setItem`.

### Result union

| Code | Extra fields | Meaning |
|---|---|---|
| `ok` | `revision`, `updatedAt` | Envelope written atomically |
| `STORAGE_UNAVAILABLE` | — | Storage missing or inaccessible |
| `STORAGE_QUOTA_EXCEEDED` | — | Storage full (quota error detected) |
| `STORAGE_WRITE_FAILED` | — | Any other write failure or invalid record |
| `STORAGE_CONFLICT` | `latest?`, `latestRevision?` | Newer data exists; caller must block and require reload |
| `STORAGE_WRITE_BLOCKED` | `cause` | `corrupt`, `partial`, `unsupported`, `migration-failed`, or `external-change` |

**Guarantees**

- There is no partial write: the old envelope remains intact on failure.
- Raw storage/exception messages never reach the UI. The feature maps codes to localized messages.
- No destructive recovery path is offered in this version; a blocked store remains read-only until storage is cleared externally or a future recovery feature is specified.
- A write never runs automatically to overwrite unreadable data.

## Multi-tab contract (FR-042)

- The tab holds the revision it loaded or last wrote.
- Every write re-checks the stored revision; a mismatch means another tab wrote newer data.
- A `storage` event for `walday:commitments` with a different value also marks the tab as outdated.
- In both cases: keep the current list, **block further saves**, announce that newer data exists, and provide a reload action. Saving stays unavailable until the tab reloads.
- No merge, overwrite, or automatic adoption is permitted by this contract.

## Migration and compatibility

| From | To | Behavior |
|---|---|---|
| v0 raw array (current implementation) | v1 envelope | Sanitize records in memory; valid records are shown; invalid ones quarantined; missing `createdAt` is set to the migration time; envelope written on the next successful user save |
| v1 | v1 | Normal read/write |
| future version | — | `unsupported`; read-only; no destructive write |

Compatibility rules:

- Additive, optional record fields may be introduced within a version only if the schema remains able to read existing data and the contract version is bumped when semantics change.
- Removing or renaming fields requires a new version plus a registered migration.
- Migration must never fabricate identity or silently drop valid data.
- Applied migrations are not rewritten; older payloads are converted on read and persisted only after an explicit save.

## Daily Agenda consumption

The future Daily Agenda reads the store through the entity public API, not by touching `localStorage` directly. For a given `date` it receives the full commitment records in this deterministic order:

1. `startTime` ascending.
2. `title` ascending using the active interface language (`Intl.Collator`).
3. `id` ascending.

The consumer must treat records as read-only and must not assume authenticated ownership.

## Out of scope

- HTTP endpoints, request/response Zod DTOs, authentication, authorization, CORS, and rate limiting.
- Server-side conflict resolution, transactions, or PostgreSQL/Prisma models.
- Cloud synchronization, cross-device access, external calendar sync, recurrence, reminders, and automatic rescheduling.
