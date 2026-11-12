# Research: Daily Commitments

**Feature**: 004-daily-commitments | **Date**: 2026-11-10

## Decisions

### 1. Commitment identity and required fields
- **Decision**: Each commitment has a stable identifier, required title, optional description, required clear date, required start time and end time, and required type (`fixed` | `flexible`). Creation/editing validates required fields before save.
- **Rationale**: Satisfies FR-004–FR-007, FR-010–FR-011, FR-016 and supports explicit edit/delete (FR-002, FR-003).
- **Alternatives considered**: Implicit identity by index (rejected—fragile on edit/delete); optional date/time (rejected—commitments are time-bound).

### 2. Date and time representation and validation
- **Decision**: Treat date as a specific calendar day and times as day-local times defining a period on that date. Enforce start time earlier than end time (strict); reject equal or inverted ranges with clear, accessible feedback (FR-006–FR-009). Invalid edits are rejected without mutating stored data.
- **Rationale**: Directly implements business rules and edge cases; unambiguous validation.
- **Alternatives considered**: Allow equal start/end (rejected—no period); auto-correct ranges (rejected—FR-018 silent modification).

### 3. Commitment types and user control
- **Decision**: Support `fixed` (must happen at specific time; only explicit user edit changes it) and `flexible` (may be considered by future Planning Suggestions; never auto-rescheduled without user approval). Distinguish types with text/labels (and non-color cues as needed), not color alone (FR-010–FR-014, FR-022).
- **Rationale**: Preserves user control and trust; meets accessibility and product principles.
- **Alternatives considered**: Visual-only type distinction (rejected—FR-022); automatic movement of flexible items (rejected—FR-013, out of scope).

### 4. Overlap identification and communication
- **Decision**: Identify overlaps as intersecting time periods between commitments on the same date. Detect and communicate overlaps clearly on create/edit (and in displays as relevant) without silently changing any commitment. Overlaps are surfaced to inform the user; they do not imply automatic resolution (FR-017, FR-018).
- **Rationale**: Meets conflict-identification requirements while preserving explicit control and data integrity.
- **Alternatives considered**: Block all overlapping saves (not required by spec; could reduce flexibility—defer to spec intent of identify/communicate); silent auto-adjustment (rejected—FR-018).

### 5. Display and agenda readiness
- **Decision**: Display commitments so users can understand scheduled activities (including type, date, and time period). Structure and persist data so it is available/consumable for the future Daily Agenda feature (FR-015, FR-020) without implementing agenda timeline in this scope.
- **Rationale**: Delivers immediate value and satisfies downstream dependency.
- **Alternatives considered**: Embedding agenda/timeline UI now (rejected—coordinated with future feature).

### 6. Guest local persistence and resilience
- **Decision**: Persist commitments locally for guests and restore on return in the same browser/device context when available (FR-019). Use a dedicated, named storage key; on unavailable/cleared/corrupt data, handle gracefully (restore none or sanitized data) without breaking the app and without fabricating records.
- **Rationale**: Consistent with existing guest persistence (tasks/preferences) and Constitution IX/XII.
- **Alternatives considered**: Shared storage blob with unrelated features (rejected—coupling/clarity); strict failure on parse errors (rejected—poor resilience).

### 7. Accessibility and localization
- **Decision**: Provide accessible date/time inputs and clearly announced validation/conflict messages (keyboard operable, perceivable labels/feedback). All user-facing content for this feature in English and Spanish, integrated with existing i18n (FR-021–FR-023).
- **Rationale**: Constitution XIII/XIV and spec requirements.
- **Alternatives considered**: English-only or non-semantic inputs (rejected).

### 8. No silent modification and explicit actions
- **Decision**: All saves/edits/deletes occur only via explicit user actions; validation/overlap handling never mutates existing commitments implicitly (FR-002, FR-003, FR-012, FR-013, FR-018).
- **Rationale**: Core trust and control principle.

## NEEDS CLARIFICATION

None. All technical/context choices resolved within spec and constitution constraints.
