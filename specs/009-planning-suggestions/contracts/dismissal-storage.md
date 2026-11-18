# Contract: Dismissal Storage

**Feature**: `009-planning-suggestions` | **Date**: 2026-11-18

Device-local persistence for suggestion dismissals. This is a **display decision**, not plan data.
It never changes a task, commitment, planned slot, preference, or the agenda.

---

## 1. Key and version

| Item | Value |
|---|---|
| Storage key | `walday:suggestion-dismissals` |
| Version | `1` |
| Store | `localStorage` (existing `guestStore` helpers) |
| Scope | Current device + current local date |
| Account sync | None |

The key is defined once in `shared/config/suggestions.ts`; it MUST NOT be repeated as a literal in
components or tests outside the constants module.

---

## 2. Payload

```ts
export interface DismissalEntry {
  suggestionId: string
  activityKey: string      // 'task:<id>' | 'commitment:<id>'
  changeSignature: string  // canonical resulting change
  dismissedAt: string      // ISO timestamp
}

export interface DismissalRecord {
  version: 1
  localDate: string        // 'YYYY-MM-DD'
  entries: DismissalEntry[]
}
```

```ts
export const dismissalRecordSchema = z
  .object({
    version: z.literal(SUGGESTIONS_STORAGE_VERSION),
    localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    entries: z
      .array(
        z
          .object({
            suggestionId: z.string().min(1).max(200),
            activityKey: z.string().min(1).max(200),
            changeSignature: z.string().min(1).max(400),
            dismissedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
          })
          .strict(),
      )
      .max(SUGGESTION_DISMISSAL_LIMIT),
  })
  .strict()
```

Additional validation:
- `SUGGESTIONS_STORAGE_VERSION` and `SUGGESTION_DISMISSAL_LIMIT` come from
  `shared/config/suggestions.ts`; no duplicated literals.
- `localDate` must be a real calendar date (`isLocalDate`), not merely the regex shape.
- Duplicate `suggestionId` values are collapsed on read, keeping the latest `dismissedAt`.
- Entries with an empty/oversized field are dropped; if more than zero entries are invalid, the whole
  payload is treated as empty (strict boundary), matching the project's guest-store policy.

---

## 3. Read contract

```ts
export interface DismissalState {
  localDate: LocalDate
  entries: DismissalEntry[]
  persistence: 'persisted' | 'session-only'
}

export function loadDismissals(input: {
  today: LocalDate
  storage?: GuestStorage | null
}): DismissalState
```

Rules:
- No storage available → `{ localDate: today, entries: [], persistence: 'session-only' }`.
- Missing key → empty persisted state.
- Invalid JSON, schema failure, unsupported version, or a different `localDate` → empty state. A
  different date's payload MUST NOT be shown and MUST be replaced on the next write.
- Valid payload → stored entries for today, `persistence: 'persisted'`.
- Read is synchronous and side-effect free. It never throws.

---

## 4. Write contract

```ts
export type DismissalWriteCode =
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_WRITE_FAILED'

export type DismissalWriteResult =
  | { ok: true; state: DismissalState }
  | { ok: false; code: DismissalWriteCode; state: DismissalState }

export function dismissSuggestion(input: {
  state: DismissalState
  suggestion: {
    id: string
    activityKey: string
    changeSignature: string
  }
  now: Date
  today: LocalDate
  storage?: GuestStorage | null
}): Promise<DismissalWriteResult>

export function restoreSuggestion(input: {
  state: DismissalState
  suggestionId: string
  today: LocalDate
  storage?: GuestStorage | null
}): Promise<DismissalWriteResult>
```

Dismiss rules:
1. Re-read the key and merge valid entries for `today` by `suggestionId` (current tab wins for the
   same ID; other IDs are preserved).
2. Add or replace the entry with `dismissedAt = now.toISOString()`.
3. Drop entries where `localDate !== today`.
4. Cap at 100 entries, keeping the most recently dismissed.
5. Serialize through `enqueueWrite`; write once.
6. On success return the written state with `persistence: 'persisted'`.
7. On storage failure return `ok: false` **and** the in-memory state with the dismissal applied and
   `persistence: 'session-only'`. The card MUST still disappear for the session. The UI MUST NOT say
   it was permanently recorded.
8. Storage exceptions MUST NOT propagate to React or the agenda.

Restore rules:
1. Remove the matching entry from the in-memory state immediately.
2. Persist the remaining entries; if empty, remove the key (`removeItem` when available, otherwise
   write an empty record).
3. On failure, keep the in-memory restore for the session and report `session-only`.
4. Restoring never applies a suggestion and never changes plan data.

---

## 5. Concurrency and retention

- `enqueueWrite` serializes writes within a tab.
- Multi-tab writes merge by `suggestionId` after re-reading, so one tab cannot erase another tab's
  dismissal for the same day; last write wins only for the same suggestion ID.
- A `storage` event is optional for UI freshness; it MUST NOT re-apply or change plan data. The
  surface may refresh its dismissed list on focus/reload.
- Day rollover: when `today` changes, old entries are ignored and pruned on the next write.
- No expiry beyond the local day; no cross-device or account scope.

---

## 6. Security and privacy

- The payload contains only stable suggestion IDs, activity keys, change signatures, and timestamps.
- It MUST NOT contain task titles, descriptions, due dates, commitment details, weather, location,
  coordinates, account identifiers, or free text.
- It is read as untrusted input and validated with Zod; it is never rendered as HTML.
- It is never sent to the backend.
- Storage clearing or a different device loses dismissals; this is acceptable and must not be
  described as permanent account state.

---

## 7. Test obligations

- Missing storage, throwing storage, quota failure, and `removeItem` absence.
- Invalid JSON, unknown keys, wrong version, wrong date, invalid timestamp, > 100 entries.
- Same-day reload keeps entries; next-day load starts empty.
- Dismiss twice for the same ID keeps one entry with the latest timestamp.
- Dismissing a different change for the same activity creates a distinct entry.
- Restore removes only the matching entry and does not apply.
- Merge across two writes preserves both IDs.
- No task/commitment storage key is touched by this module.
