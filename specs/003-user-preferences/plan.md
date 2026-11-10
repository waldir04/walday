# Implementation Plan: User Preferences and Localization

**Branch**: `003-user-preferences` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-user-preferences/spec.md`

## Summary

Enable guest users to configure and persist preferences (language en/es with English fallback, date/time presentation, weather measurement units, weather location) and apply them consistently across Walday. Implementation extends the existing frontend foundation (React, TypeScript, Vite, Tailwind, FSD, i18n) with a preferences feature slice and local persistence, without modifying task/commitment data or stored weather information on preference changes.

## Technical Context

**Language/Version**: TypeScript (strict), React 18+, Vite (existing frontend)
**Primary Dependencies**: Existing stack (React Router, TanStack Query available, Tailwind, i18next/react-i18next foundation), browser Web APIs for locale/timezone/persistence
**Storage**: Browser-local persistence for guest preferences (mechanism chosen in implementation; no backend)
**Testing**: Vitest, React Testing Library (AAA), axe/Lighthouse for a11y checks as applicable
**Target Platform**: Responsive web (desktop and mobile browsers)
**Project Type**: Web application (frontend, Feature-Sliced Design)
**Performance Goals**: Preference reads/writes and UI updates feel immediate; no unnecessary renders (Constitution Principle VIII)
**Constraints**: WCAG 2.2 AA, English fallback, user language > browser locale, language/units/location independent, no data mutation on preference changes, no auth/cloud sync, FSD boundaries
**Scale/Scope**: Single-user guest context per browser/device; small preference payload

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Code/SOLID/Simplicity | PASS | Focused preferences module; no premature abstractions |
| II. Strict TypeScript, no `any` | PASS | Typed preference model and validation at boundaries |
| III. FSD Frontend | PASS | Preferences as feature/entity/shared slices per dependency rules |
| IV. Backend Modular | N/A | No backend in scope |
| V. React Components | PASS | Small components, hooks for logic, composition |
| VI. Styling/Tokens | PASS | Tailwind + existing design tokens, light theme |
| VII. Testing & QA | PASS | Vitest/RTL, observable behavior, loading/success/error/empty as relevant |
| VIII. Performance | PASS | Minimal state, avoid unnecessary renders |
| IX. Resilience/Fault Isolation | PASS | Graceful fallback when storage unavailable/cleared or values invalid |
| X. API Contracts | N/A | No API; future auth migration noted (FR-019) |
| XI. Constants/Config | PASS | Named keys/defaults/constants, no magic values scattered |
| XII. Security | PASS | No secrets; treat stored data as untrusted at read boundary |
| XIII. Accessibility WCAG 2.2 AA | PASS | Keyboard operable controls, labels, perceivable feedback, no color-only |
| XIV. i18n/l10n (en/es) | PASS | en/es, English fallback, user choice precedence, locale-aware formatting |
| XV. Documentation | PASS | Spec/plan/research artifacts; update docs if needed |
| XVI. Quality Gates/Hooks | PASS | Existing pre-commit/pre-push/CI apply |

**Result**: No violations. Proceed.

## Project Structure

### Documentation (this feature)

```text
specs/003-user-preferences/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (empty/N-A for this feature)
└── tasks.md             # Phase 2 output (/speckit.tasks - not created here)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/                    # providers, routing, app-level composition
│   ├── pages/                  # settings/preferences page surface
│   ├── widgets/                # composed UI blocks (if needed)
│   ├── features/
│   │   └── user-preferences/   # preference form/actions, apply logic
│   ├── entities/
│   │   └── preferences/        # preference model/types, defaults, validation
│   └── shared/
│       ├── ui/                 # reusable primitives (existing)
│       ├── lib/                # storage/formatting helpers
│       ├── config/             # constants
│       └── i18n/               # translations/resources (existing en/es)
└── tests/                      # unit/component tests (Vitest/RTL)
```

**Structure Decision**: Frontend-only feature in existing `frontend/` using FSD. Preferences logic lives in `features/user-preferences` and `entities/preferences` with shared helpers as justified; no backend or contracts required for this scope.

## Complexity Tracking

No constitution violations to justify.