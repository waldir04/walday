# Research: User Preferences and Localization

**Feature**: `003-user-preferences` | **Date**: 2026-11-12

This document resolves the technical decisions deferred by [spec.md](./spec.md) §1.4. All previous `NEEDS CLARIFICATION` items are resolved; no open research question remains. Each decision states what was chosen, why, and which alternatives were rejected.

## 1. Scope and production-stack boundary

- **Decision**: Implement the feature as a frontend-only FSD entity and feature using React 19, TypeScript 5.9, Vite, Tailwind, React Router 7, Zod 4, i18next 26 / react-i18next 17, and Vitest 5. Do not create an Express endpoint, PostgreSQL schema, Prisma model, or authentication flow.
- **Rationale**: Spec §1.2–§1.3 and FR-001–FR-006 define guest-only preferences with no backend preference storage. Principles IV, X, and XVIII are therefore not applicable, while II, III, V–IX, XI–XVII, and XIX apply.
- **Alternatives considered**:
  - Add a preferences API and database now: rejected as out of scope and a direct contradiction of FR-006 and spec §1.3.
  - Store preferences in TanStack Query: rejected; guest preferences are local state, and Principle XVII reserves Query for server state.
  - Add a state library: rejected; one small preference state composes cleanly with React state and context (Principle XX).

## 2. FSD placement and the `shared` boundary

- **Decision**: Put domain types, constants, schemas, defaults/resolution, per-field validation, formatting mapping, unit conversion, storage, and the read-only consumer context in `entities/preferences`. Put the draft/save orchestration, storage-status handling, location port, and UI in `features/user-preferences`. Compose the provider and route in `app`, and keep `pages/SettingsPage.tsx` composition-only. `shared/config/preferences.ts` keeps only the storage key, version, and lock name. The canonical `SUPPORTED_LANGUAGES` list and `SupportedLanguage` union live in `shared/config/i18n.ts` because the i18n bootstrap consumes them; `entities/preferences` imports and re-exports them rather than duplicating the type.
- **Rationale**: Principle III assigns domain rules and validation to entities, use cases and interactions to features, providers/routing to `app`, and forbids business rules or upward dependencies in `shared`. The current code puts domain vocabulary in `shared/config/preferences.ts` and exposes a mutating context from the feature, which lets consumers change preferences and forces `shared` to know domain types.
- **Alternatives considered**:
  - Keep everything in `features/user-preferences`: leaves the entity responsibility empty and keeps `shared` domain-coupled.
  - Put the read context in `shared`: prohibited, because `shared` must not contain business rules and must not import entities.
  - Have `entities/task` import `entities/preferences`: entity-to-entity imports are prohibited. Task due-date formatting instead takes a resolved generic `Intl` date style from the composing feature.

## 3. Language resolution and explicit/implicit choice

- **Decision**: Resolve the effective language as (1) the stored explicit `language`, else (2) the first entry in `navigator.languages` whose base subtag matches `en` or `es`, case-insensitively, else (3) `en`. Store the user's explicit choice as `'en'`/`'es'`, and store `null` for the "Use browser language" choice. An implicit language is never written as an explicit value when unrelated preferences are saved. Resolution is recomputed on every application load while `language` is `null`.
- **Rationale**: FR-009–FR-012 and VR-002–VR-004 define this order and the explicit/implicit distinction. Using the ordered `navigator.languages` list (not only `navigator.language`) honors the browser's preference order. A nullable field expresses absence of an explicit choice without inventing a third language value.
- **Alternatives considered**:
  - Single `navigator.language` read: ignores user-ordered preferences.
  - Store `'browser'` as a third language: explicitly forbidden by VR-004.
  - Coerce an invalid stored language to English and persist it: contradicts FR-012 and §7.1; invalid values are treated as absent.
  - Re-resolve on every render: unnecessary and can change language mid-session without a reload.

## 4. Formatting locale and default regional variants

- **Decision**: Derive `formattingLocale` independently of the effective language: use the first browser language whose base subtag matches the effective language (for example `es-MX` for Spanish), normalized through `Intl.getCanonicalLocales`; otherwise use the documented default `en-US` for English and `es-ES` for Spanish. The effective interface language stays `en`/`es`. Use `Intl.DateTimeFormat` with `dateStyle`/`timeStyle` and the device timezone. Date-only values are formatted from `YYYY-MM-DD` as calendar dates with no time and no timezone shift.
- **Rationale**: FR-021 defers the default regional variant and requires locale-aware formatting; FR-022/FR-025 require date-only values to avoid timezone shifts. Deriving formatting locale separately preserves a user's regional convention while keeping the interface language selection simple. `Intl` is a platform API (Principle XX).
- **Alternatives considered**:
  - Format with the base language only (`es`): loses regional differences and makes the "documented default variant" undefined.
  - Format with `navigator.language` always: ignores an explicit Spanish choice when the browser is English.
  - Hardcode format patterns or use a date library: prohibited by Principles XIV and XX.

## 5. Presentation option values

- **Decision**: Store `compact`, `standard`, and `full` mapped to `Intl` `dateStyle`/`timeStyle` (`short`/`short`, `medium`/`short`, `long`/`medium`). `standard` is the default. Labels live in translations; no format pattern is stored.
- **Rationale**: FR-020/FR-027 require at least three presentations with a standard default, and FR-021 requires locale-aware formatting. Semantic values are portable for future migration (FR-109) and survive translation changes.
- **Alternatives considered**:
  - Keep prototype values `locale-short`/`locale-medium`/`locale-long`: non-semantic and tied to an implementation naming accident; migrated to the new values.
  - Store raw `Intl` option objects: brittle, over-specified, and not user-facing.

## 6. Guest persistence mechanism and envelope

- **Decision**: Use `localStorage` at the existing key `walday:preferences` with a versioned envelope `{ version: 1, revision, updatedAt, preferences }`. Regenerate `revision` (UUID v4) and `updatedAt` (ISO 8601) on every successful write.
- **Rationale**: FR-068–FR-070 require same-browser/device persistence, an explicit schema version, validated reads, and safe migration. The payload is under 1 KB, synchronous restore is required before first paint (FR-080/FR-017), and the key preserves existing guest data. A revision token provides the compare-and-swap basis for FR-078.
- **Alternatives considered**:
  - IndexedDB: asynchronous, more complex, and unnecessary for a sub-kilobyte record; it would complicate applying language before first paint.
  - Cookies: sent to servers, unsuitable for preferences and privacy.
  - In-memory only: fails the core guest persistence promise.
  - New storage key: would orphan the prototype's stored data.
  - Unversioned record: cannot migrate or distinguish newer-version data safely.

## 7. Field-level recovery and partial restoration

- **Decision**: Parse the envelope first, then validate each preference field independently. Restore valid fields, replace invalid fields with their defaults, and return a typed `partial` result with `invalidFields` plus `notRestoredFields` where a field (such as a v0 free-text location) could not be preserved. Leave the raw payload untouched until the next explicit save and inform the user that some preferences could not be restored.
- **Rationale**: FR-071/FR-072 and VR-011 require valid fields to survive invalid siblings and forbid silent data destruction. The current all-or-nothing schema discards all preferences if one value is bad.
- **Alternatives considered**:
  - All-or-nothing parsing: loses valid data and violates FR-071.
  - Overwrite the raw record immediately with repaired values: destroys evidence and violates the "no overwrite until explicit save" rule.
  - Coerce invalid values silently: hides the problem and contradicts FR-072's notice requirement.

## 8. Corrupt, unsupported, and migration-failed payloads

- **Decision**: Classify load outcomes as `corrupt`, `migration-failed`, or `unsupported`. For `corrupt` and `migration-failed`, use defaults, inform the user, preserve the raw value, and require explicit replace confirmation before writing. For `unsupported` (newer `version`), never parse or rewrite; remain read-only for the session and require explicit confirmation before any replacement.
- **Rationale**: FR-070, FR-073, FR-074, and VR-011 require preservation and explicit confirmation. Treating unknown versions as corrupt would let a newer application's data be destroyed by an older tab.
- **Alternatives considered**:
  - Best-effort parse of newer versions: risks presenting unknown-shape data as authoritative.
  - Automatic overwrite on save: violates explicit-confirmation requirements.
  - Disable preference use entirely: violates in-memory availability and FR-083.

## 9. Storage failure semantics

- **Decision**: Return typed load/write results and never swallow errors. Distinguish unavailable storage, quota/permission failure, generic write failure, blocked writes, and conflicts. If a save cannot persist, apply the values only for the current session, state that explicitly, keep the draft, and offer retry where meaningful. Success is announced only after a successful write.
- **Rationale**: FR-061, FR-075–FR-077, and VR-009/VR-012 prohibit false persistence claims. The current code ignores write errors and always shows a saved message.
- **Alternatives considered**:
  - Keep silent catch blocks: produces false success and hides data loss.
  - Block preference management when storage fails: violates FR-075/FR-083.

## 10. Multi-tab synchronization and conflict detection

- **Decision**: Subscribe to `window.storage` for `walday:preferences`. Apply external changes when the draft is clean and no dialog or write is active; otherwise mark an external change and surface a conflict without overwriting the newer saved values. Serialize writes with `navigator.locks.request('walday:preferences', …)` when available, then re-read the envelope inside the lock and compare `revision` with the tab's baseline. Without Web Locks, perform the same read-verify-write sequence as a best-effort fallback. Writes over unreadable, partially restored, or unsupported payloads require explicit confirmation and never target a newer version.
- **Rationale**: FR-078/FR-079 and VR-012 require external changes to be reflected or surfaced and stale tabs never to overwrite newer data. The task feature already proves this protocol with the same platform APIs, so the approach is consistent and dependency-free.
- **Alternatives considered**:
  - Last-write-wins full-record writes: silently overwrites newer data.
  - Polling storage: wasteful and not event-driven.
  - `BroadcastChannel`: useful for messages but does not provide mutual exclusion.
  - Server-side locking: no server exists.

## 11. Legacy migration

- **Decision**: Treat the prototype's bare record as v0 and migrate it on read: map `locale-short`/`locale-medium`/`locale-long` to `compact`/`standard`/`full`, preserve units, and resolve the v0 language from evidence rather than assuming it was explicit. `es` migrates explicit; `en` migrates explicit only when the first supported browser language is `es`, otherwise it becomes implicit `null` because the prototype could store its English default. Set a v0 free-text `weatherLocation` to `null` and report it through `notRestoredFields: ['weatherLocation']` because it has no resolvable identity or coordinates. The migration is pure and receives browser-language resolution as an input. Report the migration result; rewrite the envelope only on the next explicit save, and require replacement confirmation when the result is `partial`; preserve the raw value on failure. Keep a registry keyed by source version.
- **Rationale**: FR-070 requires safe migration, and FR-040/FR-047 forbid presenting unverified text as a valid location. The current stored v0 values must not be silently reinterpreted.
- **Alternatives considered**:
  - Keep the legacy free-text location as a valid place: violates the resolved-location and unverified-location rules.
  - Drop the whole record: destroys valid language/unit preferences.
  - Change the storage key: orphans existing data.

## 12. Location search and resolution

- **Decision**: Define a frontend `LocationResolver` port that takes a trimmed query and the active interface language and returns validated `LocationCandidate[]` or a typed failure (`LOCATION_QUERY_INVALID`, `LOCATION_SERVICE_UNAVAILABLE`, `LOCATION_TIMEOUT`, `LOCATION_RATE_LIMITED`). An empty candidate list is a successful result, not an error code. The UI uses an explicit "Search" action followed by a radio list of disambiguated results (name, region, localized country) and an explicit selection; it never auto-selects the first result. The production adapter calls the future backend proxy endpoint documented in [contracts/location-resolution.md](./contracts/location-resolution.md). The frontend must never call Open-Meteo or any provider directly. Until the proxy is deployed, the adapter reports `LOCATION_SERVICE_UNAVAILABLE`; search shows an accessible explanation, other preferences remain fully usable, and the saved-location display/clear actions still work. Saving an unchanged, already-resolved location never requires the service. That endpoint contract documents an external dependency owned by the future weather feature; it does not introduce backend work, an API, or a database model into this feature (spec §1.3, FR-006).
- **Rationale**: FR-039–FR-047 require search, disambiguation, validation, and graceful degradation. Principle XIX forbids direct provider access and requires a backend proxy. A submitted-search + radio list avoids the complexity and risk of a custom ARIA combobox while remaining fully keyboard accessible (Principles I and XIII). Injecting the resolver makes every behavior testable without a network.
- **Alternatives considered**:
  - Direct `fetch` to Open-Meteo geocoding: prohibited by Principle XIX and FR-082 privacy constraints.
  - Custom combobox with `aria-activedescendant`: more complex to implement and verify; not required by the spec.
  - Static/local gazetteer: unmaintainable and not an approved data source.
  - Device geolocation: explicitly prohibited by FR-038.
  - Defer the entire location preference: violates FR-037/FR-039.

## 13. Save-based interaction, drafts, and unload protection

- **Decision**: Keep explicit save and cancel. Track a draft and compare persisted fields to detect dirtiness. Validate the whole record before applying or writing. Prevent duplicate submissions while pending. Block in-route navigation with React Router's data-router `useBlocker` and the shared `ConfirmDialog`; register `beforeunload` only when a differing draft exists. A successful save applies the new values and language together, then announces in the newly active language. A session-only save applies values but states clearly that they were not persisted.
- **Rationale**: FR-056–FR-067 require explicit save, atomic validation, a pending state, truthful feedback, and unsaved-change protection. `useBlocker` is available because the application uses `createBrowserRouter` (a data router). The browser's standard unload prompt cannot be styled or localized, so the in-app confirmation remains the accessible pattern.
- **Alternatives considered**:
  - Auto-save on control change: contradicts FR-056.
  - `window.confirm`: not accessible or styleable; the shared dialog is already tested.
  - Route `unstable_usePrompt` only: does not cover cancel or pre-unload; a draft diff plus `beforeunload` is precise.
  - Persisting the draft: not required and risks presenting unsaved values as authoritative.

## 14. Consumer contract and application composition

- **Decision**: Expose a read-only context from `entities/preferences` containing applied preferences, `effectiveLanguage`, `languageSource`, `formattingLocale`, `timeZone`, and persistence status. The feature's `PreferencesRoot` owns `usePreferencesStore` and supplies the context value; `app/providers.tsx` composes it. Consumers read via the entity hook; no consumer receives an update function. Preference changes notify all consumers within the same render cycle; no reload is required.
- **Rationale**: FR-005/FR-064 require one consistent contract, no stale values, and no direct storage reads or mutation. FSD permits features to import entities; entities are the shared domain layer for consumers.
- **Alternatives considered**:
  - Keep the context in the feature: other features cannot import it, and every consumer gets a setter.
  - Read preferences from storage in each component: violates FR-005 and Principle XVII.
  - Use TanStack Query: preferences are local state; Query adds caching semantics the feature does not need.

## 15. i18n resource strategy and document updates

- **Decision**: Keep both language resources statically bundled in the existing namespaces. Add a complete `preferences` namespace (labels, options, source indication, storage states, validation, dialogs, location, accessibility names) in `en` and `es`. Keep English as the canonical fallback. Update `<html lang>` and document title on language change, and ensure route announcements use the active language. Add an en/es key-parity test.
- **Rationale**: Principle XIV requires runtime switching, fallback, and localized accessibility text. The resources are small, and bundling avoids a missing-translation flash before first paint (FR-017/FR-080). Lazy loading is appropriate for large resource sets, not this one; the decision is recorded rather than left implicit.
- **Alternatives considered**:
  - Lazy-load namespaces over the network: adds a load state and risks untranslated first paint for a tiny payload.
  - Humanize missing keys as the primary strategy: fallback must be English; the existing `parseMissingKeyHandler` remains a last-resort safety net, not a substitute for parity.
  - Hardcode Spanish strings: prohibited.

## 16. Units, precision, and weather coupling

- **Decision**: Implement pure conversion and display-precision helpers in `entities/preferences`: temperature °C→°F, wind km/h→mph, precipitation mm→in, with 0/0/1/2 decimal places respectively. Format with `Intl.NumberFormat` and localized unit display. Treat stored measurements as canonical metric provider data; conversion is display-only and reversible from canonical values. A missing measurement is `undefined` and `formatMeasurement` returns `null`; the consuming surface renders localized "unavailable" text.
- **Rationale**: FR-030–FR-036 and VR-006 require documented precision, reversibility, presentation-only behavior, and no fabricated values. Keeping helpers in the preference entity lets future weather surfaces consume one implementation.
- **Alternatives considered**:
  - Convert and store in the selected system: violates FR-031/FR-032 and makes history unstable.
  - Round stored values: destroys precision and reverses poorly.
  - Couple units to language: prohibited by FR-003/FR-030.

## 17. Accessibility and form strategy

- **Decision**: Use native form controls grouped in `<fieldset>`/`<legend>`; selects for language, presentation, and units; a search input plus a submit action and a radio group for location candidates. On validation failure: an accessible error summary, `aria-describedby` on each invalid control, `aria-invalid`, and focus to the first invalid field. Announce save success, session-only, storage warnings, restore warnings, conflicts, and language changes through polite live regions; dialogs use the shared `ConfirmDialog` (focus trap, Escape, focus return). Provide the guest-storage notice. Add a layout-matching settings skeleton for the lazy route.
- **Rationale**: FR-084–FR-099 and VR-013 require keyboard operation, programmatic values, associated errors, announcements, and focus management. Native controls reduce custom ARIA risk (Principle XIII). The existing `ConfirmDialog` and `Skeleton` already satisfy the dialog and loading primitives.
- **Alternatives considered**:
  - Custom listbox/combobox: higher risk, more test surface, no requirement.
  - Individual toast only: not sufficiently discoverable or accessible for field errors.
  - Generic spinner fallback: violates the mandatory skeleton rule (Principle VI).

## 18. Testing strategy

- **Decision**: Use Vitest and RTL with AAA. Cover: resolution order and browser variants, explicit/implicit persistence, presentation mapping, formatting locale and date-only behavior, unit conversion/precision/missing values, envelope restore, v0 migration including the explicit/implicit language evidence rule, partial/corrupt/unsupported/quota/unavailable outcomes, revision conflicts, cross-tab storage events, draft diff/save/cancel/no-op/blocker/unload, consumer-contract reactivity, location port success/ambiguity/failure/clear, en/es parity and interpolation, keyboard/focus/error summary/live regions/axe, responsive and 200%/400% checks, and non-mutation plus preference independence. Stub clock, storage, locks, and resolver for determinism. Maintain the existing 80% global and `src/entities/**` threshold (90% statements/functions/lines, 80% branches).
- **Rationale**: Principle VII requires meaningful tests for business rules, critical journeys, edge cases, and boundaries, including storage and accessibility; the spec readiness gate and SC-001–SC-016 define the observable outcomes.
- **Alternatives considered**:
  - Snapshot-only UI tests: not evidence of correctness.
  - Real network geocoding in tests: nondeterministic and prohibited by Principle VII.
  - Testing storage internals rather than observable outcomes: brittle.

## 19. Decision log tied to ADRs

- **Decision**: Implementation must supersede ADR 0004 (mechanism-only language switching, browser detection deferred) with the browser-resolution behavior defined here, and must record the location-proxy dependency in an ADR or the implementation notes.
- **Rationale**: Spec §7.1 and Principle XV require documentation alignment when behavior and architecture change. ADR 0004 currently states behavior that this specification replaces.
- **Alternatives considered**: Leave ADR 0004 unchanged: would leave the documented architecture contradicting the implementation.

## NEEDS CLARIFICATION

None. All technical and contextual choices are resolved within the specification and constitution constraints. The only external dependency (the backend geocoding proxy) is explicitly identified rather than left ambiguous.
