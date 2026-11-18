# ADR 0013: Client-Derived Planning Suggestions

- **Status**: Accepted
- **Date**: 2026-11-18
- **Related**: Constitution Principles III (Frontend Architecture), VIII (Performance), IX (Resilience), XVII (Async UX), XIX (Weather Resilience); specification 009 (`specs/009-planning-suggestions/spec.md`)

## Context

The Home Smart Suggestions region was a placeholder. Specification 009 requires an explainable,
rule-based recommendation surface for the current local day derived from activities the client
already has: agenda entries, conflict groups, unscheduled tasks, presented available periods, and the
weather already displayed on Home. Suggestions must be deterministic, explainable, limited to three,
dismissible per device and local day, and must never bypass the existing agenda and commitment
mutation paths.

The product is a guest-local application: tasks and commitments live in device storage, and the only
server interaction is the existing weather proxy. There is no account-scoped plan data and no AI/ML
or optimization engine in the approved stack.

## Decision

### Client-derived, deterministic generation

- `features/suggestions/model/*` contains pure modules for identity, eligibility, open-period
  inversion, conflict selection, slot selection, flexible adjustment, weather materiality, ordering,
  and selection. Generation is a synchronous pass over in-memory inputs in one `useMemo`.
- Identical inputs produce identical suggestion IDs, content, and order. IDs are built only from
  stable domain values (category, target, date, minute values), never localized text, weather,
  timestamps, random values, or array indexes.
- No new runtime dependency, backend endpoint, AI/ML, optimization engine, or background job is
  introduced.

### Type-only agenda coupling

- The feature imports only the agenda public **types** (`AgendaDay`, `AgendaEntry`,
  `TimeConflict`, `AvailablePeriod`). It never imports agenda runtime modules, so suggestions and
  the agenda cannot disagree about what the day contains while the bundle stays free of agenda UI.
- `pages/HomePage` remains the only composition root. It builds the agenda snapshot, maps the
  weather presentation state into a small weather port, and supplies mutation adapters.

### Existing mutation paths only

- Accepting a suggestion calls exactly one adapter supplied by Home. Task changes go through
  `validateScheduleDraft` + `tasks.scheduleTask`; commitment moves go through `commitments.update`
  with the existing overlap acknowledgment behavior. Suggestion code never writes task or
  commitment storage directly.
- Applying revalidates the target against current data and refuses with zero store mutations when
  the target became stale. Dismissing or restoring never changes plan data.

### Device-local, day-scoped dismissals

- One new key, `walday:suggestion-dismissals` (version `1`), stores only stable suggestion IDs,
  activity keys, change signatures, timestamps, and the local date. It is Zod-validated on read,
  written through the existing `enqueueWrite` helper, capped at 100 entries, and scoped to the
  current local day.
- Storage failure degrades to a session-only decision. The UI never claims persistence.
- No titles, descriptions, due dates, weather, location, coordinates, or account identifiers are
  stored. Nothing is sent to the backend or synchronized across devices.

### Optional weather influence

- Weather participates only when the existing Home surface is `ready`, not outdated, and every
  compared activity span is fully covered. Influence requires a material difference (condition
  severity, a severe condition, or at least 30 percentage points of precipitation probability).
- Unavailable, stale, or partial weather keeps the baseline earliest fitting period and cites no
  weather. Weather never gates, fabricates, or reverses a suggestion.

## Alternatives considered

- **Generate on the backend**: rejected. Plan data is guest-local, recalculating on local changes is
  required, and a network dependency would reduce resilience for no user benefit.
- **Rebuild the day inside the feature**: rejected. Duplicating agenda derivation risks disagreement
  about conflicts and availability.
- **Persist suggestions or dismissal state as plan data**: rejected. Suggestions are derived and
  dismissals are a display decision; persisting either would create a second source of truth.
- **Add a scheduling library or optimizer**: rejected. The rules are bounded and explainable, and
  the constitution forbids unnecessary dependencies.
- **Move multiple activities per conflict or schedule a beneficiary task together with a flexible
  move**: rejected. One suggestion is exactly one permitted change, which keeps every action
  reviewable and reversible.

## Consequences

- Suggestion behavior is testable without React, network, or storage, and is fast enough to run in
  a single synchronous pass for the spec's typical day.
- The feature stays decoupled from agenda internals and cannot mutate stores outside the supplied
  adapters.
- Dismissal memory is intentionally local and temporary; clearing storage or using another device
  loses it, and the UI must describe it as session or device state, never as account state.
- Weather can improve a choice only when the data is complete and material; otherwise suggestions
  remain identical and silent about weather.
