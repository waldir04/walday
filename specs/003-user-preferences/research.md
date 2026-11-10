# Research: User Preferences and Localization

**Feature**: 003-user-preferences | **Date**: 2026-11-10

## Decisions

### 1. Language support and fallback
- **Decision**: Support `en` and `es`. Resolve language as: user-selected preference > supported browser locale (`en`/`es`) > English fallback. Persist user selection; treat unsupported stored values as invalid and fall back to English.
- **Rationale**: Satisfies FR-001–FR-004 and Constitution XIV; deterministic, user-controlled behavior.
- **Alternatives considered**: Browser-only locale (rejected—no user control/precedence); auto-detect without persisted choice (rejected—FR-004).

### 2. Date and time presentation
- **Decision**: Store a date/time presentation preference compatible with locale-aware formatting and use the appropriate timezone context for display. Formatting must respect selected locale and timezone (FR-005); exact option set (e.g., locale-derived defaults vs. explicit format choice) finalized in implementation within spec bounds.
- **Rationale**: Meets FR-005 without prescribing libraries; leverages platform locale/timezone capabilities.
- **Alternatives considered**: Hardcoded formats (rejected—locale-insensitive); free-form patterns (rejected—error-prone/ambiguous).

### 3. Weather measurement units
- **Decision**: Provide selectable weather measurement units as an independent setting (FR-006, FR-012). Default to a sensible, neutral option (e.g., metric) unless refined; changing units affects presentation only, not stored weather data (FR-015).
- **Rationale**: Clear separation of preference vs. data; consistent with product overview independence rules.
- **Alternatives considered**: Coupling units to language/locale (rejected—FR-012).

### 4. Weather location
- **Decision**: Store a user-selected weather location independent of language (FR-007, FR-013). Allow unset/invalid states with clear UI handling; no preselected location required by default unless safely determinable (Assumptions).
- **Rationale**: Supports weather feature consumption without blocking other preferences.
- **Alternatives considered**: Implicit location from locale (rejected—ambiguous/privacy-adjacent, not required).

### 5. Guest persistence and resilience
- **Decision**: Persist preferences locally for guests and restore on return in same browser/device (FR-010). On unavailable/cleared storage or invalid/corrupt data, use defaults/fallbacks gracefully without breaking the app (Edge Cases).
- **Rationale**: Reliable guest experience; Constitution IX/XII (treat stored data as untrusted).
- **Alternatives considered**: In-memory only (rejected—no restore); strict failure on parse error (rejected—poor resilience).

### 6. Consistency and non-mutation guarantees
- **Decision**: Expose preferences through a consistent application-facing interface/state so consumers read current values. Changing language must not modify task/commitment data (FR-014); changing units must not modify stored weather information (FR-015).
- **Rationale**: FR-011, FR-014, FR-015; protects data integrity.
- **Alternatives considered**: Ad-hoc reads per component (rejected—risk of inconsistency).

### 7. Accessibility and feedback
- **Decision**: Keyboard-accessible controls, visible labels/selected values, and perceivable feedback on change (FR-016–FR-018), aligned with WCAG 2.2 AA and existing i18n.
- **Rationale**: Constitution XIII/XIV and spec accessibility requirements.
- **Alternatives considered**: Visual-only feedback (rejected—insufficient).

### 8. Future migration to authenticated account
- **Decision**: Model preferences as a portable, explicit structure to allow future guest-to-account migration (FR-019); migration/merge behavior deferred to a future spec.
- **Rationale**: Aligns with product overview guest-to-account transition without premature design.

## NEEDS CLARIFICATION

None. All technical/context choices resolved within spec and constitution constraints.