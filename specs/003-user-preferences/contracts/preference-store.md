# Contract: Guest Preference Store

**Owner**: `entities/preferences` | **Consumer**: `features/user-preferences`, tests | **Status**: Target for this feature

This contract defines the local persistence boundary for guest preferences. It is internal to the frontend: no HTTP endpoint, database, or server-side store is involved. It satisfies FR-068–FR-083 and VR-010–VR-012.

## 1. Storage identity

| Item | Value |
| --- | --- |
| Key | `walday:preferences` |
| Version | `1` (inside the payload) |
| Web Locks name | `walday:preferences` |
| Format | UTF-8 JSON string |
| Scope | One record per browser origin and device |

The key is preserved from the prototype so existing guest data can be migrated. The version is never encoded in the key.

## 2. Envelope schema (v1)

```json
{
  "version": 1,
  "revision": "6f1c2d7e-8a4b-4c3d-9e2f-1a2b3c4d5e6f",
  "updatedAt": "2026-11-12T15:04:05.000Z",
  "preferences": {
    "language": "es",
    "dateTimePresentation": "standard",
    "weatherUnits": "imperial",
    "weatherLocation": null
  }
}
```

| Field | Type | Rules |
| --- | --- | --- |
| `version` | literal `1` | Required. Other versions are handled by the load outcome rules. |
| `revision` | UUID v4 string | Required, non-empty, regenerated on every successful write. |
| `updatedAt` | ISO 8601 UTC string | Required, set at write time. |
| `preferences.language` | `'en' \| 'es' \| null` | `null` means the "Use browser language" choice. |
| `preferences.dateTimePresentation` | `'compact' \| 'standard' \| 'full'` | Default `standard`. |
| `preferences.weatherUnits` | `'metric' \| 'imperial'` | Default `metric`. |
| `preferences.weatherLocation` | object or `null` | Resolved place; see [data-model.md](../data-model.md) §2.2. |

The payload must never contain secrets, credentials, tokens, authentication data, provider responses, or unvalidated user text beyond the location label.

## 3. Read contract

```ts
type PreferenceLoadResult =
  | { kind: 'empty' }
  | { kind: 'restored'; preferences: UserPreferences; revision?: string; updatedAt?: string; migratedFrom?: number; raw?: string }
  | { kind: 'partial'; preferences: UserPreferences; invalidFields: PreferenceField[]; notRestoredFields?: PreferenceField[]; revision?: string; updatedAt?: string; raw: string; migratedFrom?: number }
  | { kind: 'migration-failed'; fromVersion: number; raw: string }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'unsupported'; detectedVersion: number; raw: string }
  | { kind: 'unavailable' }
```

Requirements:

1. Storage access is wrapped; a throw returns `unavailable`.
2. A missing key returns `empty`; the caller uses defaults and does **not** write.
3. JSON parse failure or a non-object envelope returns `corrupt` with the raw string.
4. `version > 1` returns `unsupported` with `detectedVersion` and the raw string; the payload is not parsed, downgraded, or modified.
5. `version < 1` or a legacy bare object is passed through the registered migration for that source version. A missing or failing migration returns `migration-failed`.
6. After envelope parsing, each preference field is validated independently. Invalid fields are replaced by their documented defaults, valid fields are kept, and the result is `partial` with the invalid field names.
7. The raw string is preserved for `partial`, migrated outcomes, `corrupt`, `migration-failed`, and `unsupported` outcomes. It is not overwritten by the read path.
8. Restored and partial results include a validated `revision`/`updatedAt` when present; a missing or malformed revision is treated as `unknown` for write-baseline purposes.
9. A successful v0 migration returns `restored` when every field migrates, or `partial` with `migratedFrom`, `notRestoredFields` (for example `['weatherLocation']`), and `raw` when a field cannot be kept. The migration never writes; a partial migration preserves the raw payload and requires replace confirmation before the next write.

## 4. Write contract

```ts
type PreferenceWriteIntent = 'automatic' | 'retry' | 'replace-unreadable'

type PreferenceWriteResult =
  | { ok: true; revision: string; updatedAt: string }
  | { ok: false; code: PreferenceWriteErrorCode; cause?: WriteBlockCause; latestRevision?: string }

type WriteBlockCause = 'corrupt' | 'migration-failed' | 'partial' | 'unsupported'
type RevisionBaseline = { revision: string } | { revision: 'unknown' }

type PreferenceWriteErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_QUOTA_EXCEEDED'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_WRITE_BLOCKED'
  | 'STORAGE_CONFLICT'
```

Requirements:

1. The caller passes a fully validated `UserPreferences` and the `RevisionBaseline` observed at load or at the last successful write.
2. The write serializes on `navigator.locks.request('walday:preferences', …)` when available. Without Web Locks, the same read-verify-write sequence runs unsynchronized as a best-effort fallback.
3. Inside the lock, the current store is re-read. If the current state is `restored` and its revision differs from the baseline, the write returns `STORAGE_CONFLICT` and includes `latestRevision`. Stale tabs never overwrite newer values.
4. `unsupported`, `corrupt`, `migration-failed`, and `partial` states block automatic writes. `replace-unreadable` is accepted only after the user explicitly confirmed replacement, and never replaces an `unsupported` newer-version payload. A normal explicit save after a `partial` restore is presented as a replace confirmation because the raw payload is preserved; valid restored fields remain visible while the user decides.
5. A missing or unreadable storage backend returns `STORAGE_UNAVAILABLE`; do not throw.
6. Quota and permission errors are classified as `STORAGE_QUOTA_EXCEEDED`; other write errors are `STORAGE_WRITE_FAILED`.
7. A successful write stores the complete record atomically in one `setItem` call, with a new `revision` and `updatedAt`, and returns them to the caller.
8. A failed write never reports success and never removes or truncates the previous payload, except when a confirmed `replace-unreadable` write replaces it.

## 5. Cross-tab contract

- Only the `storage` event for `walday:preferences` triggers synchronization.
- With a clean draft and no pending write/dialog: apply the new valid values (or defaults for an external clear) and announce the change.
- With a dirty draft, pending write, or open dialog: set an external-change/conflict state, keep the local draft, and do not apply or overwrite the newer values automatically.
- Malformed, partial, or unsupported external payloads are not applied and are not overwritten; the user is informed and the raw value is preserved.
- The `storage` listener is removed on unmount.

## 6. Migration contract

| Source | Shape | Handling |
| --- | --- | --- |
| v0 | Bare `{ language, dateTimePresentation, weatherUnits, weatherLocation }` | Registered migration to v1; presentation values map to semantic options, and `language` follows the explicit/implicit evidence rule in [data-model.md](../data-model.md) §3.4. |
| Unknown older | Any `version < 1` without a registered migration | `migration-failed`; raw preserved; explicit replace confirmation required. |
| v1 | This contract | Validate and restore/partial. |
| Newer | `version > 1` | `unsupported`; raw preserved; read-only until explicit confirmation, and never auto-replaced. |

A migration is a pure function over the parsed input; it must not write to storage. Only the subsequent explicit save writes.

## 7. Invariants

- Reading never creates a record (FR-053).
- Writing touches only `walday:preferences`; it never reads or writes task, commitment, weather, or other keys (FR-004, VR-015).
- Defaults are applied in memory when nothing usable is stored; no error state is shown solely because storage is empty.
- No persistence success is claimed without a successful `setItem`.
- The record contains no secrets, credentials, tokens, or authentication data.
- The stored shape is portable: semantic values plus an explicit version, ready for a future explicit account migration (FR-109).

## 8. Contract tests

The storage suite must cover empty, restored, partial field recovery, v0 migration, migration failure, corrupt JSON, unsupported newer version, unavailable storage, quota failure, generic write failure, blocked writes, replace confirmation, revision conflict, Web Locks presence/absence, external clear, external update, and external update with a dirty draft. Tests use an injected `StorageLike`, deterministic clock/UUID, and a lock stub.
