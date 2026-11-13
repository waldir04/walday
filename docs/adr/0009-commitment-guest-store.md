# ADR 0009: Versioned Guest Store for Commitments

**Status**: Accepted
**Date**: 2026-11-12
**Feature**: 004-daily-commitments

## Context

Daily commitments are guest-local data: they must never be transmitted to a server (FR-044), must survive reloads, and must remain trustworthy when the stored payload is corrupt or written by another tab. The task and preference stores already implement a versioned envelope with revision tracking, Web Locks, and quarantine behavior; commitments would otherwise become a third divergent copy.

## Decision

1. Persist commitments under `walday:commitments` as a strict v1 envelope: `{ version, revision, updatedAt, commitments }`.
2. Validate every record individually with Zod; quarantine invalid or duplicate records instead of discarding valid data or fabricating identities.
3. Treat the current raw array as legacy v0, migrate it in memory, and write the envelope only after the next successful user save.
4. Serialize writes, use `navigator.locks` when available, and compare the caller's revision baseline before writing. A mismatch returns `STORAGE_CONFLICT`.
5. On a conflict or a newer `storage` event, keep the current list, block create/update/delete, inform the user, and require a reload. Do not merge or auto-adopt newer data.
6. On write failure, return an explicit code, never update the list, keep the form open with its values, and offer retry or cancel.
7. Corrupt, partial, unsupported, and migration-failed stores are write-blocked to protect existing data; no destructive recovery path is offered in this version.
8. Extract only the generic envelope/lock/serialization/quota primitive into `shared/lib/guestStore` and have the task, preference, and commitment adapters consume it.

## Alternatives rejected

- **Raw array with last-write-wins**: violates FR-042 and silently loses another tab's work.
- **Optimistic insert with rollback**: contradicts FR-040, which requires the form to stay open and the list to remain unchanged.
- **Session-only success like the task store**: would show commitments that are not persisted.
- **Auto-adopt newer tab data**: the specification requires reload-before-continue and forbids overwrite.
- **Persisted overlap acknowledgment flag**: unnecessary; the acknowledgment requirement is derived from whether date/time changed on save.
- **Backend/Prisma persistence**: directly contradicts FR-044 and the spec's guest-only scope.

## Consequences

- Storage behavior is testable without a browser or network, using injected storage, clock, and ID dependencies.
- Corrupt data can leave saving blocked until browser storage is cleared externally; this is preferable to silently destroying user data.
- The acknowledgment rule is simple and avoids stale persisted flags, but conflict indicators remain derived and must be recomputed on every render.
- The shared primitive must keep the task and preference suites green during extraction.
