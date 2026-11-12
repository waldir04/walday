# Data Model: Daily Commitments

**Feature**: 004-daily-commitments | **Date**: 2026-11-10

## Entities

### Commitment

A user-defined scheduled activity occupying a specific period of a day (distinct from tasks).

| Field | Type (conceptual) | Required | Validation / Rules |
|-------|-------------------|----------|--------------------|
| id | stable identifier (string) | yes | Unique within stored commitments; stable across edits |
| title | string | yes | Non-empty after trim (clear, user-provided title) |
| description | string | no | Optional; may be empty/omitted |
| date | calendar date (clear day) | yes | Required; represents a specific calendar day |
| startTime | time of day | yes | Required; defines period start on `date` |
| endTime | time of day | yes | Required; defines period end on `date` |
| type | enum: `fixed` \| `flexible` | yes | Required; determines scheduling behavior expectations |

**Invariants**:
- `startTime` MUST be earlier than `endTime` (strict). Equal or inverted ranges are invalid and MUST be rejected before save (FR-008, FR-009).
- Fixed commitments are not automatically changed; time/schedule changes require explicit user action (FR-012).
- Flexible commitments are never rescheduled automatically without user approval; may be considered by future Planning Suggestions (FR-013).
- Existing commitments MUST NOT be silently modified (FR-018).

### CommitmentType

- **fixed**: Activity must happen at a specific time; respected as scheduled; changed only by explicit user action.
- **flexible**: Activity can potentially be moved to another available time; may inform future Planning Suggestions; never auto-rescheduled without user approval.

### TimeConflict (Overlap) — derived

A condition, not necessarily a stored entity, where two or more commitments on the same `date` have intersecting time periods.

**Identification rule (conceptual)**: For commitments A and B on the same date, overlap exists when their `[startTime, endTime)` periods intersect (any shared time). Exact boundary handling aligns with strict `start < end` and clear user communication.

**Behavior**:
- Identified and communicated clearly on create/edit and in relevant displays (FR-017).
- No commitment is silently modified to resolve conflicts (FR-018).

## Relationships

- **Guest user context -> Commitments**: zero-to-many commitments persisted locally per browser/device (when available).
- **Commitments -> Future Daily Agenda**: commitment data must be available/consumable by the future Daily Agenda feature (FR-020); no agenda-specific fields required by this spec.
- **Commitments vs Tasks**: distinct concepts; commitments require a defined date/time period. Changes to commitments do not imply mutation of task data.

## State / Lifecycle

- **Created**: valid commitment saved via explicit user action.
- **Updated**: existing commitment modified via explicit user action; revalidated (fields and time range) and rechecked for overlaps.
- **Deleted**: removed via explicit user action and confirmation.
- **Persisted/Restored (guest)**: stored locally and restored on return in same browser/device context when storage available.
- **Invalid/Unavailable storage**: on corrupt/unavailable/cleared storage, handle gracefully (no restored records from cleared storage; no fabricated data).

## Validation Notes

- Validate required fields (title, date, startTime, endTime, type) and time range (`start < end`) before save; reject and communicate clearly on failure.
- Treat persisted data as untrusted on read; sanitize/ignore invalid records safely.
- Identify overlaps on the same date and communicate them accessibly without altering data.
- All user-facing labels/messages (including validation/conflict/type) available in English and Spanish.
