# Implementation Plan: User Preferences and Localization

**Branch**: `003-user-preferences` | **Date**: 2026-11-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-user-preferences/spec.md`

**Status**: Planning audited and rewritten on 2026-11-12 against the final specification and Constitution 2.0.0. No source file is changed by this plan. The implementation audit below records where the current code diverges and what must be refactored.

## Summary

Deliver guest-owned preferences (effective language, date and time presentation, weather measurement units, weather location) that persist locally, restore safely, apply consistently without reload, and never mutate task, commitment, or weather data.

The technical approach:

- Own the preference domain in the FSD entity `entities/preferences`: literal-union types, Zod schemas, defaults and resolution, effective-locale derivation, formatting mapping, unit conversion and display precision, and the versioned local repository.
- Keep the interaction in `features/user-preferences`: draft state, explicit save, validation summary, unsaved-change blocking, storage status and conflict handling, location search port, and all preference UI.
- Expose a **read-only consumer contract** from `entities/preferences` (applied preferences, effective language source, formatting locale, device timezone, persistence status). Consumers can read and react but cannot mutate preferences or read storage. The provider is composed at `app` level.
- Replace the current bare `localStorage` record with a versioned envelope (`version`, `revision`, `updatedAt`, `preferences`) that supports field-level recovery, safe legacy migration, unsupported-version preservation, replace confirmation, quota/unavailable handling, and revision-based cross-tab conflict detection under the Web Locks API.
- Resolve language as explicit choice → first supported browser preferred language (base subtag, case-insensitive) → English, and keep the explicit/implicit distinction: an implicit language is never persisted as an explicit choice.
- Keep the save-based interaction model: locale-aware validation, atomic apply-and-persist semantics, truthful success/session-only feedback, in-app discard confirmation, and the browser's standard `beforeunload` prompt for a differing draft.
- Keep locale-aware formatting in generic `shared` primitives that use `Intl` styles, while the preference-specific style mapping stays in the entity. This prevents domain vocabulary from leaking into `shared` and prevents entity-to-entity imports.
- Do **not** use TanStack Query: guest preferences are local persisted state, not server state (Principle XVII). The existing `QueryClientProvider` remains for future server-backed features.
- Do **not** call the weather provider directly. Location search is defined as a frontend port backed by the future backend weather proxy required by Principle XIX. Until that proxy exists, search degrades to an explicit unavailable state; see "Dependencies and Risks".
- Add no runtime dependency. `Intl`, `crypto.randomUUID`, Web Locks (with fallback), `storage` events, and native `<dialog>` are platform APIs.

## Technical Context

**Language/Version**: TypeScript 5.9 with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`; React 19.3; Node.js 24 LTS pinned in `.nvmrc`.

**Primary Dependencies**: React 19.3, React Router 7.18, Zod 4.6, i18next 26 / react-i18next 17, Tailwind CSS 4 (existing `@theme` tokens), TanStack Query 5.107 (installed and configured, deliberately unused by this feature), Vitest 5, React Testing Library 16, jest-dom, axe-core.

**Storage**: Browser `localStorage` under the existing key `walday:preferences`, using a versioned guest-preference envelope. No PostgreSQL, Prisma, Express, or server persistence is introduced by this feature.

**Testing**: Vitest 5 with jsdom, React Testing Library, jest-dom, axe-core, v8 coverage with the existing 80% global and 90% `entities` thresholds in `frontend/vite.config.ts`.

**Target Platform**: Modern evergreen browsers on desktop and mobile; supported widths 360, 768, 1024, and 1440 px; 200% text resizing and 400% zoom; `prefers-reduced-motion`.

**Project Type**: React single-page application; one FSD entity and one FSD feature inside the existing `frontend/` application.

**Performance Goals**: Preferences are read synchronously before the first meaningful paint and applied without reload; save interactions complete within 1 second on the specification's reference environment, excluding genuine external location-resolution latency; no request waterfalls; no duplicated preference reads.

**Constraints**: WCAG 2.2 AA; English and Spanish with English fallback; explicit language overrides browser locale; language, units, presentation, and location are independent; no data mutation on preference changes; no authentication, cloud sync, backend preference storage, geolocation, or timezone selection; Versioned/validated local persistence with no silent data loss and no false persistence claims; FSD boundaries; Tailwind tokens only; no new runtime dependency.

**Scale/Scope**: One guest context per browser and device; a small preference payload (well under 1 KB); four preference surfaces (settings route, storage-status notices, discard/replace dialogs, location search results); one persistence boundary; one deferred external contract for location resolution.

**Unknowns**: None. Every `NEEDS CLARIFICATION` item is resolved by spec §1.4, the 2026-11-12 clarifications, and the decisions in [research.md](./research.md).

### Production Stack Alignment

The approved production stack is applied as follows. Backend technologies are listed to make the boundary explicit; they are not exercised because the specification excludes backend, API, database, and authentication work (spec §1.2–§1.3, FR-006).

| Stack area           | Technology                    | Applicability to this feature                                                                                                                                                                                                     |
| -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI runtime           | React 19.3                    | Used: functional components and hooks only; no class components.                                                                                                                                                                  |
| Language             | TypeScript 5.9 (strict)       | Used: all domain, storage, formatting, and UI code; contract types derive from Zod schemas with `z.infer`.                                                                                                                         |
| Build tool           | Vite 8                        | Used: existing dev/build/test configuration; settings route remains lazy-loaded.                                                                                                                                                   |
| Styling              | Tailwind CSS 4                | Used: `@theme` semantic tokens and shared primitives only; no raw hex colors, inline styles, `!important`, or additional styling library.                                                                                          |
| Routing              | React Router 7                | Used: existing lazy `/settings` route; `useBlocker` (data-router API) for in-app unsaved-change blocking.                                                                                                                          |
| Server state         | TanStack Query 5              | Not used. Guest preferences are local persisted state (Principle XVII); no query keys, cache, or mutations are introduced. The installed provider remains untouched.                                                               |
| Validation           | Zod 4                         | Used for the stored envelope, per-field recovery, the form draft, and every boundary read (storage, injected location resolver output). Schemas are the single source of truth.                                                    |
| Internationalization | i18next 26 / react-i18next 17 | Used: `preferences` namespace in English and Spanish; runtime switching; English fallback; document `lang` and title updates.                                                                                                     |
| Frontend testing     | Vitest 5 + RTL + jest-dom     | Used: domain, storage, conflict, form, dialog, localization, formatting, accessibility, and responsive tests; AAA pattern.                                                                                                         |
| Backend runtime      | Node.js 24 / Express          | Not applicable: no endpoint is created. The backend remains the mandated owner of the future weather geocoding proxy (Principle XIX) consumed through a documented port.                                                            |
| Database / ORM       | PostgreSQL / Prisma           | Not applicable: no server model or migration is created. Local persistence implements explicit versioning, validation, migration, and no-silent-loss rules instead.                                                                |
| Backend testing      | Vitest                        | Not applicable to this feature; no backend service exists. The future proxy contract is documented in [contracts/location-resolution.md](./contracts/location-resolution.md).                                                      |
| Weather integration  | Open-Meteo via backend proxy  | Boundary only: no provider call and no SDK from the frontend. Location search goes through the backend-proxy port; weather unavailability must never block preference management (FR-002, FR-050).                                  |

## Constitution Check

_GATE: evaluated before Phase 0 and re-evaluated after Phase 1 design._

| Principle                                                         | Status | Evidence and required action                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Clean Code, SOLID, and Simplicity**                          | Pass   | One cohesive feature; preference rules live in the entity, interactions in the feature; no speculative profiles, sync, or personalization abstractions; a submitted-search + result-list location pattern avoids a custom combobox.                                                                                                                             |
| **II. Strict TypeScript and Type Safety**                         | Pass   | Strict flags already enabled. Literal unions for language, presentation, and units; domain types derive from Zod; storage and resolver input are `unknown` and narrowed; no `any`; no unjustified assertions; Prisma types do not exist here.                                                                                                                  |
| **III. Frontend Architecture: Feature-Sliced Design**             | Pass   | `entities/preferences` owns the model, validation, formatting mapping, units, storage, and read context; `features/user-preferences` owns use cases and UI; `pages/SettingsPage` composes; `app` provides and routes. Imports flow downward through public `index.ts` APIs. `shared/config/i18n.ts` owns the supported-language tag union because the i18n bootstrap consumes it; the entity imports and re-exports it. `shared` remains free of preference business rules. |
| **IV. Backend Architecture and Modular Design**                   | N/A    | No backend, route, controller, service, or repository is created (spec §1.3, FR-006).                                                                                                                                                                                                                                                                          |
| **V. React Component Design and Reusability**                     | Pass   | Controlled form with a shared Zod schema; explicit props; focused components; logic in hooks; validation summary and field association; no business rules in presentational components.                                                                                                                                                                          |
| **VI. Styling, Design Tokens, and Visual Consistency**            | Pass   | Semantic tokens only; layout-matching settings skeleton; empty-with-CTA, error-with-retry, warning, and success states; responsive at 360/768/1024/1440; reduced motion respected.                                                                                                                                                                               |
| **VII. Testing Strategy and Quality Assurance**                   | Pass   | Test matrix covers resolution order, explicit/implicit language, formatting, unit precision, storage envelope/migration/partial/corrupt/unsupported/quota, multi-tab conflicts, draft blocking, no-op save, consumer-contract reactivity, preference independence, non-mutation, keyboard/focus, a11y, and en/es parity; deterministic clock, storage, and resolver. |
| **VIII. Performance and Resource Efficiency**                     | Pass   | Synchronous restore before render; one shared preference state; derived locale memoized; no network on load; no repeated reads; route-level code splitting preserved.                                                                                                                                                                                             |
| **IX. Scalability, Resilience, and Fault Isolation**              | Pass   | Storage unavailability, quota, corruption, migration failure, unsupported versions, and cross-tab changes are typed and isolated; preferences remain usable in memory; location-service failure degrades without blocking other preferences.                                                                                                                     |
| **X. API Contracts and Independent Deployment**                   | N/A    | No endpoint or cross-service contract is introduced by this feature. The frontend/backend boundary that will exist for location search is documented as an external dependency contract in [contracts/location-resolution.md](./contracts/location-resolution.md), including the single error envelope and machine-readable codes; it is owned by the future weather feature. |
| **XI. Constants, Hardcoded Values, and Configuration Management** | Pass   | Domain limits, option sets, defaults, precision, locale fallbacks, location timeout, and result limit are named constants in the entity/feature; the location proxy base URL comes from validated `shared/config/env.ts`; storage key/version/lock name live in `shared/config/preferences.ts`; the canonical supported-language union lives in `shared/config/i18n.ts`; clock, storage, locks, and resolver are injectable. |
| **XII. Security and Data Protection**                             | Pass   | Stored preferences are untrusted and validated per field; no secrets or tokens; location labels are rendered as text; coordinates are never logged, displayed, or sent anywhere except the future weather proxy; no geolocation.                                                                                                                               |
| **XIII. Accessibility and Inclusive Design**                      | Pass   | Keyboard-only journeys, fieldsets/legends for grouped choices, visible and programmatic labels, error summary with focus to the first invalid field, `aria-describedby`, live-region save/storage announcements, focus management for dialogs, target size, contrast, zoom/reflow, reduced motion.                                                               |
| **XIV. Internationalization and Localization**                    | Pass   | Complete `preferences` namespace in `en`/`es`; English fallback; runtime switching without reload; document language set before paint; `Intl` for dates, numbers, units, and region names; region-independent language resolution; no hardcoded interface text.                                                                                                 |
| **XV. Documentation and Technical Communication**                 | Pass   | This plan, research, data model, contracts, and quickstart are synchronized. Implementation must supersede ADR 0004 for browser-language resolution and record the location-proxy dependency.                                                                                                                                                                     |
| **XVI. Automated Quality Gates and Git Hooks**                   | Pass   | The root and frontend `lint`, `typecheck`, `test`, `build`, and `test:coverage` scripts remain the canonical gates; no new tooling.                                                                                                                                                                                                                             |
| **XVII. Frontend Server State and Async UX**                      | Pass   | Preferences are not server state, so TanStack Query is deliberately not used. Persistence is encapsulated in the entity repository; `useEffect` is limited to local persistence synchronization, `storage` subscriptions, and draft/unload guards. Components never read or write storage directly.                                                              |
| **XVIII. Data Integrity and Persistence with Prisma**             | N/A    | No PostgreSQL or Prisma model exists. The local store still implements explicit versioning, read validation, supported-shape migration, unsupported-version preservation, field isolation, and write conflict protection.                                                                                                                                       |
| **XIX. External Integrations and Weather Resilience**             | Pass   | No provider call from the frontend. The location port maps failures to stable codes, location remains optional, and weather unavailability has no effect on preference management or other features. The backend proxy that will supply results is an explicit dependency, not a frontend shortcut.                                                              |
| **XX. Technology Stack Governance and Dependency Discipline**     | Pass   | No runtime dependency added. `Intl`, `crypto.randomUUID`, Web Locks with fallback, `storage` events, and native `<dialog>` are platform APIs; existing approved tools are reused.                                                                                                                                                                                |

**Gate result**: PASS. No constitutional violation requires justification; Complexity Tracking is empty.

**Post-design re-evaluation**: PASS. The Phase 0–1 design preserves these conclusions. The only deliberate non-use of an approved technology is TanStack Query, which is correct because guest preferences are local state. `shared` stays free of preference business rules through generic `Intl` style primitives and i18n configuration; the supported-language tag union is configuration, not a preference rule. The entity-to-entity import prohibition is respected.

## Current Implementation Audit

The existing code is a functional prototype that does not meet the updated specification. The following table is the refactoring contract. No source file is changed in this planning step.

| Area                            | Current state                                                                                                                                                                             | Decision          | Target                                                                                                                                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain vocabulary in `shared`   | `shared/config/preferences.ts` mixes presentation/unit/language domain types and defaults with the storage key; `shared/lib/dateTimeFormat.ts` and `entities/task/model/dueDate.ts` import `DateTimePresentation` from `shared`. | Refactor          | Presentation and unit constants/types move to `entities/preferences/model/constants.ts` and `types.ts`; the `SupportedLanguage` tag union and supported-language list stay in `shared/config/i18n.ts` because the i18n bootstrap consumes them, and the entity imports/re-exports them. `shared` keeps only the storage key/version/lock name and generic `Intl` style helpers. |
| Language resolution             | `resolveLanguage` ignores the browser entirely and falls back to English (`entities/preferences/model/defaults.ts:13`), contradicting FR-009.                                               | Replace           | Ordered `navigator.languages` scan with base-subtag, case-insensitive matching, then English; explicit preference always wins; implicit language never persisted.                                                          |
| Explicit vs implicit language   | Not modeled; `language` is always a concrete `en`/`es` value, so a browser-derived language cannot be saved back as implicit.                                                             | Replace           | Stored `language: SupportedLanguage \| null`; `null` means the "Use browser language" choice; the consumer contract exposes `languageSource: 'explicit' \| 'browser'`.                                                      |
| Formatting locale               | Context sets `formattingLocale: preferences.language` (`features/user-preferences/model/preferencesContext.tsx:26`), losing regional variants and default regional fallbacks.              | Replace           | Derive the formatting locale from the first matching browser regional variant, else a documented per-language default (`en-US`, `es-ES`), while the effective interface language stays `en`/`es`.                           |
| Date/time presentation values   | Values are `locale-short`/`locale-medium`/`locale-long`; the spec requires compact/standard/full semantics with standard as default.                                                       | Replace + migrate | Stable semantic values `compact`/`standard`/`full`; v0 migration maps short→compact, medium→standard, long→full.                                                                                                           |
| Persistence shape               | A single bare JSON record at `walday:preferences`, no version, revision, or timestamp (`entities/preferences/model/storage.ts`).                                                           | Replace           | Versioned envelope v1: `{ version, revision, updatedAt, preferences }`; revision UUID for compare-and-swap.                                                                                                                 |
| Legacy v0 language ambiguity    | The prototype stored a concrete `language` even when it was only the English default, so a stored value cannot automatically be treated as an explicit user choice.                        | Replace           | v0 migration treats `es` as explicit; treats `en` as explicit only when the first supported browser language is `es` (the saved value contradicts the browser); otherwise migrates to `null` (implicit). The migration is reported, never silent. See [data-model.md](./data-model.md) §3.4. |
| Corrupt/partial data            | `userPreferencesSchema.safeParse` is all-or-nothing; any invalid field discards every stored preference and no one is informed.                                                           | Replace           | Field-by-field validation: restore valid fields, fall back per invalid field, report `invalidFields`/`notRestoredFields`, preserve the raw payload, and require replace confirmation on the next save.                     |
| Unsupported/migration failures  | Not detected; a newer-version payload is treated as corrupt and would be overwritten on the next save.                                                                                    | Replace           | Preserve newer payloads untouched in read-only mode; explicit replace confirmation before any write; failed migration preserves the original raw value.                                                                   |
| Storage failures                | `savePreferences` swallows all errors (`storage.ts:26`) while the form always reports success, producing false persistence claims.                                                       | Replace           | Typed load/write/status results: unavailable, quota exceeded, write failed, blocked, conflict, and externally cleared. Session-only application is stated explicitly; retry is offered.                                             |
| Multi-tab behavior              | No `storage` listener; each tab blindly writes its full record.                                                                                                                          | Add               | `storage` subscription; apply external changes only when the draft is clean; otherwise surface a conflict; writes use Web Locks plus revision compare-and-swap.                                                             |
| Save interaction                | The form saves on submit with no validation errors, pending guard, draft-difference tracking, cancel, or exit protection (`ui/PreferencesForm.tsx`).                                       | Replace           | Explicit save/cancel, Zod validation, error summary and first-invalid focus, pending guard, truthful feedback, `useBlocker` confirmation, and `beforeunload` guard.                                                        |
| Language choices                | The select offers only `en`/`es`; the "Use browser language" choice required by FR-007 is missing.                                                                                         | Add               | Three choices: English, Spanish, and "Use browser language" (represented by `null`), with an explicit indication when the effective language is browser-derived.                                                          |
| Weather location                | A plain text input stored as `{ name }` with no resolution, disambiguation, or length validation (`ui/PreferencesForm.tsx:117`).                                                          | Replace           | Location search port with candidate disambiguation, explicit selection, resolved-location validation (1–120 graphemes), clear action, and a bounded label retained unchanged across language changes.                     |
| Units and precision             | Only the `metric`/`imperial` preference exists; no conversion or display-precision helpers, so FR-030/FR-032 cannot be consumed consistently.                                             | Add               | Entity helpers convert and format temperature, wind speed, and precipitation with the documented per-measurement precision, presentation-only.                                                                           |
| Consumer contract               | Context lives in the feature and exposes `updatePreferences` to every consumer; consumers could mutate preferences.                                                                       | Move + restrict   | Read-only context in the entity (`preferences`, `locale`, `languageSource`, persistence status); the feature supplies the value; no consumer receives a setter.                                                            |
| Formatting ownership            | `shared/lib/dateTimeFormat.ts` formats dates by preference value; task entity depends on it.                                                                                              | Refactor          | `shared/lib/dateTimeFormat.ts` accepts generic `Intl` date/time styles; the entity maps presentation to those styles and exposes a formatter; `entities/task` takes a resolved style instead of a preference type.        |
| i18n resources and document     | Basic preference keys exist, but there is no browser-language copy, storage-status copy, validation copy, location copy, or key-parity test; `applyLanguage` sets `lang` but the title/route announcement path must be verified. | Extend            | Complete `en`/`es` parity, English fallback, document title and route announcement refresh on language change, and a parity test.                                                                                          |
| Route loading                   | The lazy `/settings` route falls back to the generic `Loading` placeholder, not a layout-matching skeleton (`app/router.tsx:38`).                                                          | Add               | `PreferencesPageSkeleton` matching the heading, form groups, and notice area, with `aria-busy` and decorative shapes hidden from assistive technology.                                                                    |
| Accessibility                   | Labels exist, but there is no fieldset/legend grouping, no error association/summary, no first-invalid focus, no live-region pending/error/session-only feedback, no guest-storage notice, and no discard dialog.           | Replace + extend  | Accessible form structure, described-by errors, error summary, focus management, status announcements, guest-storage notice, and shared `ConfirmDialog` for discard/replace decisions.                                     |
| Tests                           | Seven preference test files assert the prototype behavior (including `resolveLanguage` defaulting to English), not the updated requirements.                                              | Replace + expand  | Test plan in this document and in [quickstart.md](./quickstart.md), mapped to FR/VR/SC identifiers.                                                                                                                        |
| Reuse                           | `shared/ui` primitives (`ConfirmDialog`, `Skeleton`, `Button`, `ErrorState`, `SuccessState`), i18n bootstrap and namespaces, the entity storage/result pattern from `entities/task`, strict tsconfig, Zod, Vitest/RTL/axe, root scripts, and the lazy route. | Keep              | Extend shared primitives only when generic; do not duplicate the task storage protocol or the i18n bootstrap.                                                                                                            |

## Project Structure

### Documentation (this feature)

```text
specs/003-user-preferences/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── README.md
│   ├── preference-store.md
│   ├── preference-consumer.md
│   └── location-resolution.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root, target state)

```text
frontend/src/
├── app/
│   ├── providers.tsx                 # Composes the preferences root provider
│   ├── router.tsx                    # Lazily loads /settings with PreferencesPageSkeleton
│   └── bootstrap.tsx                 # Resolves and applies language before first paint
├── entities/
│   ├── preferences/
│   │   ├── index.ts                  # Public API: types, schema, resolution, storage, context, formatting, units
│   │   └── model/
│   │       ├── types.ts              # Domain literal unions (re-exports SupportedLanguage), WeatherLocation, WeatherMeasurement, LocalDateString, UserPreferences, load/write result unions
│   │       ├── constants.ts          # Presentations, units, defaults, locale fallbacks, limits, precision
│   │       ├── schema.ts             # Zod envelope, per-field record schemas, draft schema
│   │       ├── defaults.ts           # Language resolution, formatting locale, default preferences
│   │       ├── validation.ts         # Per-field recovery and typed invalid-field reporting
│   │       ├── sanitize.ts           # Envelope parsing, migration registry, quarantine summary
│   │       ├── formatting.ts         # Presentation -> Intl styles; date/date-time helpers using shared primitives
│   │       ├── units.ts              # Conversion and per-measurement display precision
│   │       ├── storage.ts            # Envelope read/write, migration, revision CAS, Web Locks
│   │       └── context.tsx           # Read-only consumer context and hook
│   ├── task/                         # Existing; due-date formatting takes a resolved style
│   └── commitment/                   # Existing; unchanged
├── features/
│   └── user-preferences/
│       ├── index.ts
│       ├── skeleton.ts               # Narrow public entry for the lazy-route fallback
│       ├── model/
│       │   ├── usePreferencesStore.ts # Applied state, draft, save, storage status, cross-tab sync
│       │   ├── PreferencesRoot.tsx    # Owns the store and supplies the entity context
│       │   ├── preferencesDraft.ts    # Draft <-> record mapping, diffing, field error mapping
│       │   └── locationResolver.ts    # LocationResolver port and typed unavailable fallback
│       └── ui/
│           ├── PreferencesForm.tsx    # Controlled form, fieldsets, error summary, save/cancel
│           ├── LanguageField.tsx      # English / Spanish / Use browser language
│           ├── DateTimeField.tsx
│           ├── WeatherUnitsField.tsx
│           ├── WeatherLocationField.tsx # Search, disambiguation list, clear action
│           ├── StorageNotice.tsx      # Unavailable / partial / unsupported / conflict messaging
│           ├── PreferencesPageSkeleton.tsx
│           └── DiscardDraftDialog.tsx # Composition over shared ConfirmDialog
├── pages/
│   └── SettingsPage.tsx               # Composition only
├── shared/
│   ├── config/
│   │   ├── i18n.ts                    # Canonical SupportedLanguage union/list and default locales (shared with i18n)
│   │   └── preferences.ts             # Storage key, version, lock name only
│   ├── i18n/index.ts                  # Consumes shared config; no entity import
│   ├── lib/dateTimeFormat.ts          # Generic Intl date/time formatting by style
│   └── ui/                            # Existing primitives reused
└── test/                              # Existing setup and axe helpers

frontend/tests/
├── preferences-model.test.ts
├── preferences-storage.test.ts
├── preferences-migration.test.ts
├── preferences-conflict.test.ts
├── preferences-draft.test.tsx
├── preferences-ui.test.tsx
├── preferences-location.test.tsx
├── preferences-units.test.ts
├── preferences-formatting.test.ts
├── preferences-localization.test.tsx
├── preferences-a11y.test.tsx
├── preferences-i18n-parity.test.ts
├── preferences-storage-recovery.test.tsx
├── preferences-responsive.test.tsx
├── preferences-consumer-contract.test.tsx
├── location-resolver.test.ts
└── preferences-non-mutation.test.ts
```

**Structure Decision**: Frontend-only FSD feature in the existing `frontend/` application. The entity owns the domain, persistence, and read contract; the feature owns use cases and UI; `app` composes the provider and route; `shared` gains only domain-free formatting and configuration. No backend or database structure is added.

## Implementation Phases (post-planning)

1. **Foundation and boundaries**: entity constants/types/schemas, resolution, formatting mapping, units, read context; shared generic formatting; i18n config split. Update consumers and provider composition.
2. **Persistence**: envelope v1, per-field recovery, v0 migration, unsupported/corrupt protection, quota/unavailable typing, revision compare-and-swap, Web Locks, `storage` subscription.
3. **Interaction**: store/draft model, validation summary, pending guard, atomic apply/persist, session-only feedback, retry, discard and replace confirmations, `beforeunload`.
4. **UI and accessibility**: form structure, fieldset/legend groups, browser-language source indication, guest-storage notice, storage notices, settings skeleton, dialog composition.
5. **Location**: resolver port, candidate disambiguation UI, saved-label stability, clear action, unavailable degradation. Full search remains blocked on the backend proxy dependency below.
6. **Quality**: test matrix, en/es parity, keyboard/focus/VoiceOver, responsive and zoom checks, coverage thresholds, ADR updates, source-doc reconciliation, and a final spec re-read.

## Dependencies and Risks

- **Location search depends on the backend weather proxy (release-blocking for FR-039–FR-041 in production).** Constitution XIX requires all weather and geocoding access to go through the backend. This feature ships the port, candidate model, validation, UI, and tests with an injected fake resolver, plus an HTTP adapter targeting the documented endpoint. Until the proxy exists, the production adapter reports `LOCATION_SERVICE_UNAVAILABLE`; the UI explains the limitation, keeps other preferences usable, and never calls Open-Meteo directly. The readiness gate for location-search scenarios must not be signed off before that endpoint is deployed.
- **Foundation reconciliation.** ADR 0004 records English-only startup with browser detection deferred. This specification supersedes that behavior. Implementation must update the ADR (or add a superseding ADR) and reconcile foundation tests; the runtime language-change mechanism remains authoritative.
- **Legacy v0 language ambiguity.** The prototype could persist `language: 'en'` as a default rather than an explicit choice. Migration therefore follows the rule in [data-model.md](./data-model.md) §3.4: `es` is explicit; `en` is explicit only when it contradicts the first supported browser language; otherwise it becomes `null` (implicit). This avoids pinning users to English while preserving a likely Spanish choice.
- **No server-side preference storage.** Guest preferences are device-local; lost storage is communicated, never silently hidden. Future account migration is explicitly out of scope.
- **Weather consumers do not exist yet.** Formatting and unit helpers are implemented and tested at the entity boundary; the weather surface will consume them when that feature is implemented. They must not be duplicated later.
- **Browser standard unload prompt** cannot be styled, localized, or focus-managed; only its presence is controlled. The in-app accessible confirmation covers navigation and cancellation.

## Complexity Tracking

No constitution violations to justify. The only added complexity (versioned envelope, field-level recovery, revision compare-and-swap) is required by FR-068–FR-080 and VR-010–VR-012, not speculative.
