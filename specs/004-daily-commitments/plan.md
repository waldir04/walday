# Implementation Plan: Daily Commitments

**Branch**: `004-daily-commitments` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-daily-commitments/spec.md`

## Summary

Enable guest users to register, edit, delete, and view scheduled daily commitments (time-bound activities distinct from tasks) with title, optional description, clear date, start/end times, and type (fixed or flexible). The frontend implementation (React, TypeScript strict, Vite, Tailwind, FSD, existing i18n) validates time ranges, identifies and clearly communicates overlapping commitments on the same date without silently modifying data, persists commitments locally for guest use, and exposes commitment data for the future Daily Agenda feature. No automatic rescheduling, recurrence, external sync, notifications, or scheduling algorithm is included.

## Technical Context

**Language/Version**: TypeScript (strict), React 18+, Vite (existing frontend)
**Primary Dependencies**: Existing stack (React Router, Tailwind, i18next/react-i18next), browser Web APIs for date/time inputs and local persistence
**Storage**: Browser-local persistence for guest commitments (dedicated key, resilient read/write); data structured to be consumable by future Daily Agenda
**Testing**: Vitest, React Testing Library (AAA), behavior-focused tests for validation, overlap identification, persistence, accessibility, and i18n
**Target Platform**: Responsive web (desktop and mobile browsers)
**Project Type**: Web application (frontend-only, Feature-Sliced Design)
**Performance Goals**: Commitment CRUD, validation, and overlap feedback feel immediate; avoid unnecessary renders (Constitution Principle VIII)
**Constraints**: WCAG 2.2 AA, accessible time inputs and conflict communication, fixed/flexible distinguished by more than color, EN/ES user-facing content, start < end, clear date required, no silent modifications, no auto-reschedule, no auth/cloud sync, FSD boundaries
**Scale/Scope**: Single guest user per browser/device; typical daily commitment counts (small local dataset)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Code/SOLID/Simplicity | PASS | Focused commitment domain/feature slices; explicit validation and overlap logic |
| II. Strict TypeScript, no `any` | PASS | Typed commitment model, enums/unions for type, runtime validation/sanitization at storage boundary |
| III. FSD Frontend | PASS | `entities/commitment`, `features/commitments` (or equivalent per plan), shared helpers; respect layer dependencies |
| IV. Backend Modular | N/A | No backend in scope |
| V. React Components | PASS | Small components, hooks for state/logic, predictable composition |
| VI. Styling/Tokens | PASS | Tailwind + existing design tokens; consistent, accessible states |
| VII. Testing & QA | PASS | Vitest/RTL for rules, persistence, overlaps, UI states, and regressions |
| VIII. Performance | PASS | Local operations; derived overlap/status computed efficiently |
| IX. Resilience/Fault Isolation | PASS | Graceful handling of unavailable/cleared/corrupt storage; safe fallbacks |
| X. API Contracts | N/A | No external API; internal module boundaries only |
| XI. Constants/Config | PASS | Named storage keys, types, and validation limits/constants |
| XII. Security | PASS | No secrets; treat persisted data as untrusted on read |
| XIII. Accessibility WCAG 2.2 AA | PASS | Accessible date/time inputs, labels, keyboard operation, perceivable validation/conflict messages, non-color distinction |
| XIV. i18n/l10n (en/es) | PASS | All user-facing content in EN/ES; locale-aware presentation consistent with preferences |
| XV. Documentation | PASS | Spec/plan/research/data-model/quickstart artifacts |
| XVI. Quality Gates/Hooks | PASS | Existing lint/typecheck/test/build and CI apply |

**Result**: No violations. Proceed.

## Project Structure

### Documentation (this feature)

```text
specs/004-daily-commitments/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A for this feature)
└── tasks.md             # Phase 2 output (/speckit.tasks - not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/                         # routing/composition
│   ├── pages/                       # commitments page/surface
│   ├── widgets/                     # composed UI blocks if needed
│   ├── features/
│   │   └── commitments/             # create/edit/delete flows, form, list UI, hooks
│   ├── entities/
│   │   └── commitment/              # commitment model/types, validation, overlap rules
│   └── shared/
│       ├── ui/                      # reusable primitives (existing)
│       ├── lib/                      # persistence/formatting helpers
│       ├── config/                  # constants/keys
│       └── i18n/                    # translations/resources (en/es)
└── tests/                           # unit/component tests (Vitest/RTL)
```

**Structure Decision**: Frontend-only feature in existing `frontend/` using FSD. Commitment domain logic (model, validation, overlap identification) in `entities/commitment`; user interactions in `features/commitments`; persistence/config/i18n in shared slices as appropriate. No backend or external contracts.

## Complexity Tracking

No constitution violations to justify.
