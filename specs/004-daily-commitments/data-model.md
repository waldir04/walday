# Data Model: Daily Commitments

**Feature**: 004-daily-commitments | **Date**: 2026-11-12 | **Plan**: [plan.md](./plan.md)

## Scope

This feature has no relational database, Prisma schema, or HTTP API. Its persisted model is the versioned browser-local guest store defined in [contracts/commitment-storage.md](./contracts/commitment-storage.md). Types beneath the storage boundary are domain types; they are never Prisma models or provider DTOs.

## Type Aliases

| Alias | Definition | Notes |
|---|---|---|
| `LocalDate` | String matching `^\d{4}-\d{2}-\d{2}$` and naming a real calendar day | Local wall-clock date; never converted through UTC |
| `LocalTime` | String matching `^([01]\d|2[0-3]):[0-5]\d$` | 24-hour clock, minute precision |
| `CommitmentType` | `'fixed' \| 'flexible'` | Literal union; no TypeScript `enum` |
| `CommitmentId` | Non-empty UUID string | Generated once on create with `crypto.randomUUID()` |

## Entities

### Commitment (stored and displayed)

A user-defined activity occupying one continuous period on one calendar day, distinct from a task.

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | `CommitmentId` | Yes | Stable across edits; unique within the store; never regenerated on read |
| `title` | `string` | Yes | Trimmed; 1–120 Unicode grapheme clusters; may not be whitespace-only |
| `description` | `string` | No | Trimmed; at most 500 Unicode grapheme clusters; blank/whitespace-only is omitted |
| `date` | `LocalDate` | Yes | Real calendar date; same-day periods only |
| `startTime` | `LocalTime` | Yes | Strictly earlier than `endTime` |
| `endTime` | `LocalTime` | Yes | Must be later than `startTime`; `00:00` is always invalid as an end time (cross-midnight) |
| `type` | `CommitmentType` | Yes | Explicitly chosen; no default |
| `createdAt` | ISO-8601 timestamp | Yes | Technical metadata; set on create, preserved on edit; not shown in the UI |

**Invariants**

1. `startTime < endTime` under 24-hour string comparison (zero-padded values).
2. `date` is a real local calendar date; no normalization to another day.
3. A commitment never spans midnight, multiple days, or an all-day period.
4. Fixed commitments are never changed automatically; every change requires explicit user action.
5. Flexible commitments are never rescheduled automatically; future planning may only suggest.
6. No field is mutated as a side effect of viewing, validating, saving another commitment, acknowledging a conflict, changing language, or changing the device timezone.

### CommitmentDraft (UI-only)

| Field | Type | Required | Rules |
|---|---|---|---|
| `title` | `string` | Yes | Raw input; trimmed for validation and persistence |
| `description` | `string` | No | Raw input; trimmed; blank becomes absent |
| `date` | `string` | Yes | Initialized to the viewed date; must parse as `LocalDate` |
| `startTime` | `string` | Yes | Must parse as `LocalTime` |
| `endTime` | `string` | Yes | Must parse as `LocalTime` |
| `type` | `'' \| CommitmentType` | Yes | Starts as `''`; save is rejected until `fixed` or `flexible` is chosen |

The draft is never persisted. It is converted to a `Commitment` only after validation succeeds.

### Stored envelope

| Field | Type | Rules |
|---|---|---|
| `version` | `1` | Literal; future versions are read-only until supported |
| `revision` | UUID string | Regenerated on every successful write; used for concurrency detection |
| `updatedAt` | ISO-8601 timestamp | Time of the last successful write |
| `commitments` | `unknown[]` in the stored schema; sanitized to `Commitment[]` on read | Invalid entries are quarantined, never fabricated |

The envelope is strict: unknown top-level keys are rejected. The complete wire format and examples are in the storage contract.

### Quarantine summary (derived)

| Field | Type | Meaning |
|---|---|---|
| `invalidRecords` | number | Records that failed record validation |
| `duplicateIdentities` | number | Later records sharing an already-seen `id` |
| `reasonCodes` | `QuarantineReasonCode[]` | Stable machine-readable reasons |

`QuarantineReasonCode`: `INVALID_SHAPE`, `INVALID_TITLE`, `INVALID_DESCRIPTION`, `INVALID_DATE`, `INVALID_TIME`, `INVALID_RANGE`, `MISSING_TYPE`, `DUPLICATE_ID`.

### TimeConflict / Overlap (derived, not stored)

| Field | Type | Meaning |
|---|---|---|
| `overlaps` | boolean | Whether at least one conflict exists |
| `conflictingCommitments` | `Commitment[]` | All conflicting records, ordered by start time |
| `conflictingCommitmentIds` | `CommitmentId[]` | Stable identities of the same records |

**Detection rule**: for a candidate commitment `C` and an existing commitment `E`:

```text
E.id ≠ C.id
AND E.date = C.date
AND C.startTime < E.endTime
AND E.startTime < C.endTime
```

This models half-open `[start, end)` intervals. Periods that only touch at a boundary are not conflicts. The commitment being edited is excluded from its own check.

**Presentation rule**: every conflict is listed by title and time range; the list is never truncated to the first conflict. The list item continues to show an overlap indication with text for as long as a conflict exists (FR-024, FR-027).

## Validation

### Field and form error codes

| Code | Field | Condition | Requirement |
|---|---|---|---|
| `TITLE_REQUIRED` | `title` | Empty or whitespace-only after trim | FR-014 |
| `TITLE_TOO_LONG` | `title` | More than 120 grapheme clusters | FR-014 |
| `DESCRIPTION_TOO_LONG` | `description` | More than 500 grapheme clusters | FR-004 |
| `DATE_REQUIRED` | `date` | Empty | FR-015 |
| `DATE_INVALID` | `date` | Not `YYYY-MM-DD` or not a real calendar date | FR-015 |
| `START_TIME_REQUIRED` | `startTime` | Empty | FR-016 |
| `START_TIME_INVALID` | `startTime` | Not `HH:mm` | FR-016 |
| `END_TIME_REQUIRED` | `endTime` | Empty | FR-016 |
| `END_TIME_INVALID` | `endTime` | Not `HH:mm` | FR-016 |
| `RANGE_INVALID` | `endTime` / summary | `startTime >= endTime` (equal or reversed) | FR-017 |
| `CROSS_MIDNIGHT` | `endTime` / summary | `endTime = '00:00'` or any multi-day representation | FR-018 |
| `TYPE_REQUIRED` | `type` | No type selected | FR-002 |
| `TYPE_INVALID` | `type` | Not `fixed` or `flexible` | FR-002 |

### Error precedence

1. Missing/invalid fields are reported together.
2. If the time range is invalid, `RANGE_INVALID` is shown and the overlap check is not presented (FR-029). An end time of `00:00` reports `CROSS_MIDNIGHT` instead of `RANGE_INVALID`.
3. Only an otherwise valid draft proceeds to overlap detection and acknowledgment.
4. When more than one error exists, the form shows an accessible summary and moves focus to the summary or first invalid field; field messages are associated with their inputs (FR-021).
5. After the first submit attempt, corrected fields are revalidated on change and resolved messages disappear (FR-022).

### Sanitization rules on read

1. Parse the envelope; reject non-objects and unsupported versions.
2. Validate each record with the strict record schema.
3. Drop or quarantine invalid records; preserve all valid records.
4. Never invent a missing `id`; a record without a stable identity is quarantined.
5. On duplicate identities, keep the first valid record and quarantine the duplicate.
6. Never write sanitized data back automatically; the first successful user save writes the v1 envelope.
7. Legacy records without `createdAt` receive the migration time as non-user-facing metadata; no other field is fabricated.

## Ordering

For one selected `date`:

1. Ascending `startTime` (zero-padded `HH:mm` compares correctly).
2. Ascending `title` using `Intl.Collator` configured with the active interface language.
3. Ascending `id` as the stable final tie-break.

The order is deterministic across reloads and independent of storage insertion order (FR-031).

## Lifecycle and State Transitions

```text
(empty | restored | partial | legacy)
        │
        ├── create (valid, no conflict) ─────────────► saved
        ├── create (valid, conflict) ──ack───────────► saved
        ├── create (valid, conflict) ──decline───────► draft preserved, no save
        ├── create (invalid) ─────────────────────────► form errors, no save
        ├── create (storage failure) ────────────────► form preserved, no list entry
        │
        ├── edit (schedule unchanged) ────────────────► saved without re-acknowledgment
        ├── edit (date/time changed, conflict) ──ack──► saved
        ├── edit (date/time changed, conflict) ─decline► draft preserved, no save
        │
        ├── delete ──confirm──────────────────────────► removed
        ├── delete ──cancel───────────────────────────► unchanged
        │
        ├── newer data detected ──────────────────────► writes blocked until reload
        ├── partial/corrupt/unsupported store ────────► write-blocked; informed; no destructive recovery
        └── storage unavailable/quota/write failure ──► failure reported; no false success
```

**Created**: valid commitment saved through explicit user action.
**Updated**: existing commitment modified through explicit user action; revalidated and rechecked for overlaps.
**Deleted**: removed through explicit confirmation; no undo in this version.
**Restored**: loaded from the versioned store on return in the same browser/device.
**Blocked**: writes disabled after newer data is detected or while unreadable data must be protected.

## Persistence Outcomes

### Read

| Kind | UI behavior |
|---|---|
| `empty` | Normal, empty state with create action |
| `restored` | Normal, list rendered |
| `partial` | Valid records rendered; writes blocked to protect unreadable data; user informed that some data could not be restored |
| `legacy` | Compatible records migrated in memory; valid records rendered; no automatic write |
| `corrupt` | No records; write-blocked notice; no automatic write that could destroy data; user informed |
| `migration-failed` | No records; write-blocked notice; user informed |
| `unsupported` | No records; unsupported-version notice; writes blocked |
| `unavailable` | Empty list with storage warning and retry; saves fail with an explicit error |

### Write

| Result | Effect |
|---|---|
| `ok` | Commit list, revision, and `updatedAt`; announce success |
| `STORAGE_UNAVAILABLE` | No list change; form stays open; error + retry (FR-040) |
| `STORAGE_QUOTA_EXCEEDED` | Same as unavailable, with a storage-full explanation |
| `STORAGE_WRITE_FAILED` | Same as unavailable |
| `STORAGE_CONFLICT` | No list change; reload-required block (FR-042) |
| `STORAGE_WRITE_BLOCKED` | No list change; blocked notice with cause `corrupt`, `partial`, `unsupported`, `migration-failed`, or `external-change`; no destructive recovery path |

**Persistence mode**: `normal` (read/write), `recovery-blocked` (partial/corrupt/migration-failed; writes blocked to protect unreadable data), or `unsupported` (future version; writes blocked). There is no session-only success mode for commitments.

Saving is atomic at the envelope level: a failed `setItem` leaves the previous stored data untouched, so no partial write is observable.

## Relationships

- **Guest context → Commitments**: zero-to-many commitments stored locally per browser/device; no account, cloud, or cross-device synchronization.
- **Commitments → Future Daily Agenda**: the agenda retrieves commitments by local date and reads every field plus stable identity. No agenda-specific field is required here (FR-043).
- **Commitments → Tasks**: separate concepts and separate stores. A commitment has no completion status or priority and is never converted into a task.
- **Commitments → Preferences**: language and date-time presentation affect labels and formatting only; they never alter stored dates or times.

## Future Daily Agenda Read Contract

A consumer filtering the store by date receives, in the deterministic order above:

```ts
interface CommitmentForDate {
  id: string
  title: string
  description?: string
  date: string // LocalDate
  startTime: string // LocalTime
  endTime: string // LocalTime
  type: 'fixed' | 'flexible'
  createdAt: string // ISO-8601
}
```

The consumer must not mutate the returned records and must not assume they belong to a signed-in user.

## Non-Entities / Out of Scope

- No Prisma model, PostgreSQL table, migration, or API DTO.
- No recurrence, reminder, all-day, multi-day, or cross-midnight entity.
- No server-side conflict resolution or automatic rescheduling.
- No persisted acknowledgment flag; acknowledgment is derived per save action.
- No undo history after a confirmed deletion.
