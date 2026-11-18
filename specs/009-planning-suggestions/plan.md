# Implementation Plan: Planning Suggestions

**Branch**: `009-planning-suggestions` | **Date**: 2026-11-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-planning-suggestions/spec.md`

## Summary

Turn the existing Walday Smart Suggestions region on Home into a working, explainable
recommendation surface for the current local day. Suggestions are derived on the client from the
agenda's already-computed activities, conflicts, unscheduled tasks, and available periods, plus the
weather already displayed on Home. Three deterministic, rule-based categories are produced:

1. **Conflict** — one movable activity is proposed for a new start time that removes it from every
   overlap it participates in; fixed commitments are never candidates.
2. **Slot** — an unscheduled pending task with an estimated duration is placed at a start time that
   fits a presented available period, ordered by due-date urgency and priority.
3. **Flexible adjustment** — a flexible commitment is moved to a valid alternative period so a
   pending task can then fit, naming the beneficiary task without scheduling it.

Every suggestion states the activity, current state, proposed change, resulting state, and at least
one data-grounded reason. Accept, adjust, and dismiss are explicit user actions; applying reuses the
agenda's existing scheduling validation and mutation paths, so it cannot bypass them. At most three
suggestions appear, dismissals are device-local for the local day, and every no-suggestion case has a
textual explanation and a next action.

The change is **frontend-only**. No backend endpoint, provider call, AI/ML, optimization engine, or
new runtime dependency is introduced. `features/suggestions` owns pure generation, selection,
dismissal memory, and suggestion UI; `widgets/SmartSuggestions` becomes the presentational surface;
`pages/HomePage` remains the composition root and supplies the agenda snapshot, weather port, and
mutation adapters.

All five 2026-11-18 clarifications are treated as decided inputs. No `NEEDS CLARIFICATION` remains.

## Technical Context

**Language/Version**: TypeScript 5.9 strict (`strict`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`,
`verbatimModuleSyntax`, `erasableSyntaxOnly`); React 19.3; Vite 8; Tailwind CSS 4.

**Primary Dependencies**: Existing only — React, react-i18next/i18next, Zod, `lucide-react`,
TanStack Query (unchanged weather transport), and existing shared UI primitives. **No new runtime or
development dependency is introduced.**

**Storage**: One new device-local, versioned key `walday:suggestion-dismissals` (version `1`),
validated with Zod on read and written through the existing `guestStore` helpers. Tasks
(`walday:tasks`) and commitments (`walday:commitments`) remain authoritative and are modified only
through their existing controller mutations. No backend or account persistence is added; dismissal
memory is never synchronized across devices.

**Testing**: Vitest 5 + React Testing Library + jest-dom + axe-core. New pure-model, storage,
component, integration, accessibility, responsive, i18n-parity, and no-network tests. Existing Home,
agenda, weather, and Smart Suggestions tests are updated where they assert the previous placeholder
surface.

**Target Platform**: Responsive React SPA, Walday Dark UI only, English and Spanish, 360/768/1024/1440
px and 200 % browser zoom, current local date only.

**Project Type**: Web application — one existing frontend app (`frontend/`) and one existing backend
app (`backend/`). This feature touches only `frontend/` plus one ADR and the feature documentation.

**Performance Goals**: With the spec's typical day (up to 50 tasks and 20 commitments), generation and
selection complete synchronously in a single `useMemo` pass with no network access and no storage read
inside the generation memo; dismissal memory is read at most once per mount and then kept in memory.
No more than three cards render; recommendation work never delays other Home content (SC-014). The
implementation stays linear in tasks and commitments plus a bounded interval scan per conflict group,
well below a frame budget on a mid-range device.

**Constraints**: Deterministic output for identical inputs; today-only; at most three visible
suggestions; at most one change per suggestion and one suggestion per activity; no AI/ML/optimization;
no background reminders; no cross-device dismissal; no new task/commitment attributes; weather never
gates a suggestion; fixed commitments immutable; no hardcoded user-facing text; WCAG 2.2 AA; no
horizontal page scrolling; existing agenda scheduling semantics preserved.

**Scale/Scope**: One Home region, one new feature slice, one rewritten widget, one new i18n
namespace, one new storage key, one Home composition change, one ADR, and no backend change. The
display limit is three; the review list contains only dismissals for the current day on the device.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Evidence / Plan |
|---|---|---|
| I. Clean Code, SOLID, Simplicity | PASS | Pure, single-purpose modules (`eligibility`, `conflicts`, `slots`, `flexibleAdjustment`, `weather`, `ordering`, `generate`, `dismissalStorage`); no speculative abstraction; interval helpers are local and documented; generation never mutates inputs. |
| II. Strict TypeScript and Type Safety | PASS | Discriminated unions for categories, proposed changes, reasons, and surface states; Zod validates persisted dismissals; no `any`, assertions, or non-null assertions; contract types are inferred where schemas exist. |
| III. Frontend Architecture (FSD) | PASS | Business rules and use case live in `features/suggestions`; presentation in `widgets` and feature `ui`; Home remains the only composition root. The feature imports only the agenda public **types** (erased at build) and consumes the agenda snapshot, weather port, and mutations through props; it never imports agenda feature runtime code or internals. |
| IV. Backend Architecture | PASS (N/A) | No backend route, controller, service, repository, schema, or contract change. |
| V. React Component Design and Reusability | PASS | `SuggestionCard`, `SuggestionActions`, `SuggestionAdjustDialog`, and `SuggestionDismissedReview` are small, controlled, presentational components; derivation lives in pure modules and a controller hook; no data fetching in presentational components; no unjustified memoization. |
| VI. Styling, Design Tokens, Visual Consistency | PASS | Existing mint suggestion tokens, semantic text/border/focus tokens, `rounded-2xl`, `rounded-lg`, 150 ms ease-out states, skeleton matching card geometry, all loading/empty/error/success states. No raw hex, inline styles, or horizontal scrolling. |
| VII. Testing Strategy and QA | PASS | Pure-model tests cover every selection rule and edge case; storage tests cover corruption/quota/unavailable; component tests cover states, actions, keyboard, focus, live regions, and axe; integration tests prove agenda updates and stale-context refusal. Target ≥ 90 % for suggestion business logic and ≥ 80 % global. |
| VIII. Performance and Resource Efficiency | PASS | Synchronous deterministic derivation from in-memory state in one memo; no new request, waterfall, store, or observer; bounded card count; no re-render loops; review list renders only on demand. |
| IX. Scalability, Resilience, Fault Isolation | PASS | Weather failure/outdated/partial data never blocks or errors the surface; incomplete task/commitment sources produce an explicit unavailable state with retry; dismissal storage failure degrades to session-only behavior; suggestion failure cannot affect tasks, commitments, agenda, or weather. |
| X. API Contracts and Independent Deployment | PASS (N/A) | No API contract change; no provider payload reaches the UI. |
| XI. Constants and Configuration Management | PASS | Display limit, weather materiality thresholds, storage key/version, review cap, and message timings are named in `shared/config/suggestions.ts`; no magic values in components. |
| XII. Security and Data Protection | PASS | Dismissal data is non-sensitive, device-local, Zod-validated on read, written without `dangerouslySetInnerHTML`; no secrets, coordinates, or account identifiers are persisted; task/commitment ownership behavior is unchanged. |
| XIII. Accessibility and Inclusive Design | PASS | Semantic section/heading/list, text reasons, explicit accept/adjust/dismiss names, keyboard dialogs with focus return, one polite live region, `aria-busy`, focus to the next meaningful element, WCAG AA contrast, no color/icon-only meaning, 200 % zoom, reduced motion. |
| XIV. Internationalization and Localization | PASS | New `suggestions` namespace in English and Spanish; all copy, reasons, category labels, dialogs, announcements, and no-suggestion states externalized; dates/times/durations/units via `Intl` and existing formatters; parity test extended. |
| XV. Documentation and Technical Communication | PASS | ADR 0013 records client-derived generation, device-local dismissals, and type-only agenda coupling; `research.md`, `data-model.md`, contracts, and `quickstart.md` document rules and verification. |
| XVI. Automated Quality Gates and Git Hooks | PASS | Existing `lint`, `typecheck`, `test`, and `build` scripts are the gate; no hook or CI change required. |
| XVII. Frontend Server State and Async UX | PASS | Suggestions are derived client state, not server state; no manual fetch or new query. Asynchronous apply/dismiss paths expose pending, prevent duplicates, report success/failure, and retain retry. Dismissal persistence is encapsulated behind a storage module, not read ad hoc. |
| XVIII. Data Integrity and Persistence with Prisma | PASS (N/A) | No database or backend persistence change. Applying a suggestion performs exactly one existing store mutation, preserving atomicity; no multi-record transaction is introduced. |
| XIX. External Integrations and Weather Resilience | PASS | No new provider access, retrieval, cache, TTL, retry, or freshness rule. Weather is consumed only from the existing displayed snapshot; stale/unavailable/partial weather is ignored for influence and never cited. |
| XX. Technology Stack Governance and Dependency Discipline | PASS | Uses only approved stack items; no dependency added or removed; no new library for dates, state, forms, or styling. |
| Visual Identity and Design System (Walday Dark UI) | PASS | High-contrast mint suggestion surface with deep slate text and dark CTA, Inter with `tabular-nums` for times, 16 px surface radius, token-only colors, text plus icons for every state, visible focus, generous padding, and responsive verification at all required widths. |

**Scope-sensitive notes**

- **Agenda consumption without runtime coupling**: `HomePage` computes `AgendaDay` and passes it to
  `useSuggestions`. The feature uses the agenda's public contract types only and performs its own
  fit scan for alternative placements because the agenda's presented periods omit the gap currently
  occupied by the activity being moved. Slot suggestions still use the agenda's presented periods
  exactly, so the two features cannot disagree about what is available.
- **Applying through existing semantics**: Home supplies mutation adapters implemented with the
  existing agenda `validateScheduleDraft`/`scheduleTask` and commitments `update`. Suggestion code
  never writes storage directly, preserving agenda conflict acknowledgment and commitment overlap
  validation.
- **Weather is optional**: only `ready` and non-outdated weather participates; an unavailable or
  stale forecast produces the same suggestions without weather evidence. Weather can change a slot
  choice only when every compared candidate span is fully covered and the difference is material.
- **No new fixed-commitment path**: fixed commitments are excluded from every candidate list, and no
  generated `ProposedChange` variant can target one.

**Post-design re-check**: PASS. Phase 1 introduces no dependency, network contract, backend change,
new async server state, or upward FSD import. Phase 1 adds one low-risk local storage key with
validation and a documented failure fallback. No constitutional exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/009-planning-suggestions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── suggestion-domain.md   # Pure generation/selection contract
│   ├── dismissal-storage.md   # Device-local dismissal storage contract
│   └── ui-contract.md         # Surface, actions, states, a11y contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── features/
│   │   ├── agenda/                              # consumed snapshot only (unchanged)
│   │   └── suggestions/                         # NEW feature slice
│   │       ├── index.ts                         # public API
│   │       ├── controller.ts                    # narrow entry for Home
│   │       ├── model/
│   │       │   ├── types.ts                     # suggestions, changes, reasons, state
│   │       │   ├── identity.ts                  # stable IDs and change signatures
│   │       │   ├── eligibility.ts               # task/commitment candidate rules
│   │       │   ├── openPeriods.ts               # interval inversion with target excluded
│   │       │   ├── conflicts.ts                 # conflict suggestion generation
│   │       │   ├── slots.ts                     # slot suggestion generation
│   │       │   ├── weather.ts                   # coverage and materiality comparison
│   │       │   ├── flexibleAdjustment.ts        # beneficiary-driven commitment moves
│   │       │   ├── ordering.ts                  # category/task ordering and dedupe
│   │       │   ├── generate.ts                  # orchestration and no-suggestion reason
│   │       │   ├── dismissalSchema.ts           # Zod schema and version
│   │       │   ├── dismissalStorage.ts          # load/merge/write/prune
│   │       │   └── useSuggestions.ts            # controller hook
│   │       └── ui/
│   │           ├── SuggestionCard.tsx
│   │           ├── SuggestionActions.tsx
│   │           ├── SuggestionAdjustDialog.tsx
│   │           ├── SuggestionDismissedReview.tsx
│   │           └── SuggestionSurfaceStates.tsx
│   ├── pages/HomePage.tsx                       # wire snapshot, weather port, adapters
│   ├── shared/
│   │   ├── config/suggestions.ts                # NEW named limits/thresholds/key
│   │   ├── lib/localDateTime.ts                 # add device-minute helper for forecast hours
│   │   └── i18n/
│   │       ├── index.ts                         # register `suggestions` namespace
│   │       └── locales/{en,es}/suggestions.json # NEW copy, full parity
│   └── widgets/
│       ├── HomeDashboard.tsx                    # new suggestion state prop
│       └── SmartSuggestions.tsx                 # rewritten presentational surface
├── tests/
│   ├── suggestions-model.test.ts                # NEW pure rules and edge cases
│   ├── suggestions-storage.test.ts              # NEW dismissal persistence
│   ├── suggestions-surface.test.tsx             # NEW states/actions/dialog
│   ├── suggestions-a11y.test.tsx                # NEW keyboard/focus/live/axe
│   ├── suggestions-integration.test.tsx         # NEW Home apply/date/weather/incomplete
│   ├── suggestions-i18n.test.ts                 # NEW en/es parity and formatting
│   ├── helpers/suggestionFixtures.ts            # NEW deterministic fixtures/builders
│   └── smart-suggestions.test.tsx               # updated for the working surface
└── index.css                                    # no new tokens expected; reuse suggestion tokens
docs/adr/
└── 0013-planning-suggestions-client-derived.md  # NEW decision record
```

**Structure Decision**: Keep the existing FSD frontend. Suggestion generation and dismissal memory
live in a new `features/suggestions` slice because they are a use case composed from task,
commitment, agenda, weather, and preference entities. The Home region stays a `widgets` component,
and `pages/HomePage` remains the only place where agenda, tasks, commitments, weather, and
suggestions are composed. The backend is not touched.

## Complexity Tracking

No constitutional violations or new exceptions. The feature reuses the approved stack and existing
persistence and mutation paths; the only new persistence is one validated device-local display
preference, which Principle XVII explicitly permits behind a storage module.
