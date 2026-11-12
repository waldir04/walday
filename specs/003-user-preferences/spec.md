# Feature Specification: User Preferences and Localization

**Feature Branch**: `003-user-preferences`

**Created**: 2026-11-10

**Updated**: 2026-11-12

**Status**: Draft

**Input**: User description: "Create a specification for User Preferences and Localization in Walday. Allow users to personalize language (English/Spanish), date and time presentation, weather measurement units, and selected weather location; provide defaults, local persistence for guests, restoration, and consistent application across features. Do not prescribe a localization library, persistence technology, or database structure."

## 1. Purpose and Scope

### 1.1 Purpose

Define the product behavior for Walday's user preferences and localization feature. This specification establishes how guests select, update, persist, restore, and apply interface language, date and time presentation, weather measurement units, and weather location.

Preferences are presentation and configuration data. They MUST NOT become a second source of truth for tasks, commitments, weather observations, or any other feature data. Consuming features read the current preferences and apply them consistently.

This specification defines observable product behavior, validation rules, and user experience states. It does not define the final storage key, storage envelope, persistence implementation, localization library configuration, weather provider integration, or database schema.

This specification is governed by:

- `docs/product-overview.md` for product vision, MVP scope, business rules, accessibility, and localization.
- `.specify/memory/constitution.md` for engineering standards and constitutionally protected behavior.

### 1.2 In Scope

| Area | Included capability |
| --- | --- |
| Guest access | Configure and use core preferences without an account, authenticated session, or backend; language, date and time presentation, and weather units work offline. |
| Language selection | English and Spanish, explicit user choice, a "Use browser language" choice that clears the explicit choice, browser-locale resolution, and English fallback. |
| Language precedence | Explicit user language overrides browser locale and survives later browser-locale changes. |
| Date and time presentation | User-selectable, locale-aware date and time presentation applied across consuming features. |
| Weather measurement units | Metric and imperial systems, independent of language and location, applied only at presentation. |
| Weather location | Explicit search and selection of a place for weather information, independent of language, with an unset state. |
| Defaults | Safe, non-blocking defaults for first-time users that do not require setup. |
| Updating | Explicit save, cancel, validation, atomic application, and truthful feedback. |
| Local persistence | Versioned, validated guest preference storage and restoration in the same browser and device context. |
| Storage resilience | Graceful behavior for unavailable, corrupt, partially invalid, unsupported-version, quota-limited, or externally cleared storage. |
| Consistency | A single application-level preference contract consumed by all features without reload or stale values. |
| Non-mutation | Preference changes never modify task, commitment, weather, or other feature data. |
| Accessibility | Keyboard operation, focus management, selected-value communication, announcements, contrast, targets, zoom, and reduced motion. |
| Localization | Complete English and Spanish preference interfaces, runtime language switching, and locale-aware formatting. |
| Future migration | Portable, versioned preference semantics that can be migrated explicitly to an authenticated account later. |

### 1.3 Out of Scope

The following are explicitly out of scope for this feature:

- User profiles, account creation, authentication, sign-in, session management, and authorization.
- Cloud synchronization, cross-device synchronization, and server-side preference storage.
- Multiple user profiles on one account.
- Guest-to-account migration implementation, conflict resolution, and merge behavior; this feature only preserves migration readiness.
- Planning-related personal preferences, such as preferred planning day boundaries, default task duration, suggestion thresholds, or agenda behavior. These are identified in the product overview as future preference scope and MUST be defined by a separate specification.
- User-selectable timezone. This feature uses the device timezone and keeps it independent of language.
- Per-feature preference overrides and preference profiles.
- Multiple saved weather locations, location history, favorites, and automatic location switching.
- Automatic device geolocation or implicit location inference.
- Notification, reminder, email, and push preferences.
- Accessibility preferences such as font size, contrast mode, or reduced-motion overrides.
- Advanced personalization, recommendation tuning, and adaptive interfaces.
- Theme customization, dark mode, and any theme beyond the initial light theme.
- Preference import, export, backup, and manual restore.
- A blocking onboarding wizard or mandatory preference setup.
- Backend endpoints, database schema, Prisma models, API contracts, localization library selection, and persistence technology.
- Exact visual design, control types, route placement, storage key, storage envelope, and migration code.

### 1.4 Deferred to Planning

The following decisions MUST be evaluated during planning and MUST NOT be treated as fixed by this specification:

- Whether preferences are presented on a dedicated route, a settings section, a dialog, or another surface, provided all requirements in this specification are met.
- Whether controls are selects, radio groups, segmented controls, comboboxes, or another accessible pattern.
- The exact layout, grouping, help text, and whether a read-only summary of effective preferences is displayed.
- The exact labels and styling of the compact, standard, and full date and time presentations, and whether additional options are offered, provided they satisfy the locale-aware behavior and validation rules in this specification.
- The documented default regional variant used for formatting when the user selects a language and no matching browser regional variant is available.
- The exact location search, disambiguation, and resolution mechanism, provided locations are unambiguous and validated.
- The exact storage key, versioned envelope, migration implementation, and multi-tab conflict-detection mechanism.
- The exact unsaved-change confirmation and storage-replacement confirmation patterns, provided no data is lost silently.
- Test organization, coverage exclusions, and accessibility tooling details.
- The future contract by which authenticated migration will read and merge guest preferences.

## 2. Product Overview Alignment

- The product overview requires English and Spanish support, independent language and weather-unit preferences, guest-local persistence, graceful handling of cleared storage, and accessible interfaces. This specification implements those requirements for the preference feature.
- The product overview requires dates, times, and measurement units to respect the relevant user preferences and locale. This specification implements that requirement through the date and time presentation, weather unit, and weather location preferences; it does not introduce a separate planning-preference capability.
- The product overview mentions planning-related personal preferences in its initial preference list. This feature intentionally limits its scope to language, date and time presentation, weather units, and weather location. Planning preferences are explicitly deferred to a future specification and MUST NOT be assumed, invented, or partially implemented here.
- The product overview requires guest data to be stored locally with a clear warning that it may be lost if browser storage is cleared or the device changes. This specification applies that requirement to guest preferences.
- The product overview includes guest-to-account migration in the MVP. This feature does not implement that migration; it preserves migration-ready preference semantics only, as required by FR-109–FR-112 and Section 4.11. Migration behavior remains a separate specification.
- The foundation specification (`001-initial-app-foundation`) temporarily starts in English when no explicit preference exists and defers browser-language detection to the user-preferences feature. This specification now defines browser-locale resolution. Once implemented, the foundation's temporary English-only startup behavior MUST be reconciled with this specification, while the foundation's runtime language-change mechanism remains authoritative.
- No requirement in this specification intentionally contradicts the product overview or the constitution. Where a decision was previously ambiguous, this specification defines the product behavior explicitly and records the resolution in Section 7.1.

## Clarifications

### Session 2026-11-12

- Q: After a user saves an explicit interface language, should they still be able to return to following the browser's preferred language? → A: Yes. The language selection includes a "Use browser language" choice that clears the explicit language; every specific English or Spanish selection is stored as explicit.
- Q: When the interface language changes, should an already saved weather location keep the label stored when the user selected it, or be re-labelled in the new language? → A: Keep the saved label. Changing language preserves the place identity and the stored label; only surrounding interface text localizes, with no automatic re-localization or new resolution.
- Q: Should the selected date and time presentation also govern date-only values, such as task due dates, while never displaying a time for them? → A: Yes. The selected style applies to the date portion of date-only values, which never display a time.
- Q: How should weather measurements be rounded when they are displayed in the selected unit system? → A: Use a documented per-measurement display precision, applied only at display time, with stored values unchanged.
- Q: If a user has unsaved preference changes and reloads the browser page or closes the tab, should the application warn before discarding the draft? → A: Yes. A reload, tab close, or page unload with a differing draft triggers the browser's standard unsaved-changes confirmation.

## 3. User Scenarios and Testing

### User Story 1 - Configure preferences as a guest (Priority: P1)

As a guest user, I can configure my language, date and time presentation, weather measurement units, and weather location without creating an account, so that Walday reflects how I want to see information.

**Why this priority**: Preferences are foundational for a consistent and personalized experience across the product, and guest access is a core product principle.

**Independent Test**: Can be fully tested by clearing storage, opening preferences, changing each preference, saving, reloading, and verifying that all values persist and are applied without an account or network connection.

**Acceptance Scenarios**:

1. **Given** a first-time guest with no saved preferences, **When** the user opens preferences, **Then** the effective defaults are shown, the form is usable immediately, and no account, sign-in, or mandatory setup is required.
2. **Given** a guest user, **When** the user selects Spanish, saves, and reloads the application, **Then** the interface is in Spanish and the explicit choice is restored.
3. **Given** a guest user, **When** the user changes date and time presentation, weather units, or weather location and saves, **Then** the new values persist and are applied consistently wherever those preferences are consumed.
4. **Given** a guest user who has saved preferences, **When** the user returns in a later session on the same browser and device, **Then** all saved preferences are restored before preferences are presented as authoritative.
5. **Given** a guest user, **When** the user chooses not to configure preferences, **Then** the application remains fully usable with defaults and no blocking prompt.

---

### User Story 2 - Experience consistent language and locale (Priority: P1)

As a user, I see interface language, dates, times, and weather measurements applied consistently across the application so that information is clear and predictable.

**Why this priority**: Inconsistent language or formatting undermines trust and can make scheduling information ambiguous.

**Independent Test**: Can be tested by setting each language and presentation option and verifying every consuming surface, including dates, times, document language, and weather units, without reload.

**Acceptance Scenarios**:

1. **Given** an explicit user language, **When** the application loads or the browser locale changes, **Then** the user-selected language remains active and takes precedence over browser locale.
2. **Given** no explicit language preference and a supported browser preferred language, **When** the application loads, **Then** the first supported browser preferred language is used, regardless of region subtag.
3. **Given** no explicit language preference and no supported browser preferred language, **When** the application loads, **Then** English is used.
4. **Given** a selected language and device timezone, **When** a date or time is displayed, **Then** formatting respects the selected locale and device timezone and does not alter the stored value, and a date-only value displays no time of day.
5. **Given** a language change, **When** it is saved, **Then** all user-facing text, the document language, and locale-dependent formatting update without a full application reload and without losing the current route, unsaved input, or task context.
6. **Given** a saved explicit language, **When** the user selects "Use browser language" and saves, **Then** the explicit choice is cleared and the effective language follows browser resolution on this and later loads.

---

### User Story 3 - Update preferences safely (Priority: P1)

As a user, I can update preferences at any time with clear validation and truthful feedback, knowing that changes do not alter my existing data.

**Why this priority**: Safe, predictable changes protect user data and prevent preferences from becoming an unintended source of data mutation.

**Independent Test**: Can be tested by changing each preference, validating invalid input, simulating storage failures, and confirming that existing task, commitment, and weather data remain unchanged.

**Acceptance Scenarios**:

1. **Given** existing preferences, **When** the user changes one or more values and saves, **Then** all valid changes are applied and persisted atomically, and success feedback is announced in the newly active language.
2. **Given** an invalid value, **When** the user attempts to save, **Then** no preference is partially applied or partially persisted, the affected field is identified with accessible feedback, and the user's draft is preserved.
3. **Given** a save that cannot be persisted, **When** the user saves, **Then** the application never claims the change was saved, communicates that it applies only to the current session, and offers retry when meaningful.
4. **Given** existing tasks, commitments, or stored weather information, **When** the user changes language, weather units, date and time presentation, or location, **Then** the underlying records and user-entered content are not modified.
5. **Given** unsaved changes, **When** the user attempts to leave the preferences surface, cancels, reloads, or closes the tab, **Then** the user is warned before discarding the draft and can return to continue editing.

---

### User Story 4 - Recover from storage problems (Priority: P2)

As a guest whose browser storage is unavailable, full, cleared, corrupt, or from a newer version, I can keep using preferences in the current session and understand what was or was not restored.

**Why this priority**: Guest-local persistence is a core product promise, and silent data loss or false success messages would break trust.

**Independent Test**: Can be tested by simulating unavailable storage, quota failures, corrupt records, partially invalid records, unsupported newer versions, storage cleared while open, and conflicting changes in multiple tabs.

**Acceptance Scenarios**:

1. **Given** unavailable storage, **When** the user configures preferences, **Then** preferences apply for the current session, a visible and accessible warning explains that they may not be saved, and the application does not claim persistence.
2. **Given** corrupt or partially invalid stored preferences, **When** the application loads, **Then** valid fields are restored, invalid fields fall back safely, the application does not crash, and the user is informed that some preferences could not be restored.
3. **Given** stored preferences from an unsupported newer version, **When** the application loads, **Then** the stored data is preserved, the user is informed that it cannot be read safely, and no write replaces it without explicit confirmation.
4. **Given** preferences changed in another tab, **When** the current tab has no unsaved changes, **Then** the current tab reflects the newer values; **When** the current tab has unsaved changes, **Then** the user is informed and no newer saved values are overwritten silently.
5. **Given** storage is cleared while the application is open, **When** the user continues, **Then** the application does not crash and does not falsely claim that current preferences are safely persisted.

---

### User Story 5 - Select and maintain a weather location (Priority: P2)

As a user, I can choose the place used for weather information independently of my language, so that weather context is relevant to me.

**Why this priority**: Weather is contextual planning information, and a location preference is required to make it meaningful without coupling it to language.

**Independent Test**: Can be tested by searching for a place, disambiguating similar results, saving, changing language, changing units, clearing the location, and simulating an unresolvable location or weather outage.

**Acceptance Scenarios**:

1. **Given** a new user, **When** preferences are first opened, **Then** no location is preselected, no device geolocation is requested, and weather-dependent surfaces show a clear unset state rather than guessing.
2. **Given** a place search, **When** multiple places share the same name, **Then** the user can distinguish and select the intended place using sufficient context before saving.
3. **Given** an unresolved place name, **When** the user attempts to save, **Then** it is not stored as a valid location, the error is explained accessibly, and the entered text is preserved.
4. **Given** a saved location, **When** the user changes language, **Then** the same place remains selected, its saved label is unchanged, and only surrounding interface text is localized.
5. **Given** a saved location, **When** the user clears it and saves, **Then** the location becomes unset and weather consumers do not reuse the previous location.
6. **Given** a weather outage or unavailable location resolution, **When** the user manages preferences, **Then** language, date and time presentation, and weather units remain fully usable, and the location issue is communicated without blocking the rest of the feature.

---

### User Story 6 - Use preferences accessibly in English or Spanish (Priority: P2)

As a keyboard, screen-reader, English-speaking, or Spanish-speaking user, I can understand, change, save, and recover preferences with clear labels, values, errors, and announcements.

**Why this priority**: Accessibility and English/Spanish support are mandatory product and constitutional requirements from the initial release.

**Independent Test**: Can be tested with keyboard only, VoiceOver with Safari, automated accessibility checks, 200% text resizing, 400% zoom, and viewport widths of 360, 768, 1024, and 1440 pixels in both languages.

**Acceptance Scenarios**:

1. **Given** a keyboard-only user, **When** the user navigates, changes, saves, cancels, and recovers preferences, **Then** every action is reachable and operable without a pointer, in a logical focus order, with visible focus and no keyboard trap.
2. **Given** a preference control, **When** a screen reader encounters it, **Then** it has a visible and programmatic label, its current value is programmatically determinable, and its selected value is communicated in text, not by color or position alone.
3. **Given** a validation failure, **When** submission is attempted, **Then** errors are associated with their fields, invalid fields are marked programmatically, a summary is provided when multiple errors exist, and focus moves to the first invalid field.
4. **Given** a successful save, a failed save, a restoration warning, or a storage failure, **When** the state changes, **Then** the update is announced through an appropriate live region without unexpected focus movement.
5. **Given** English or Spanish, **When** the language is active, **Then** every preference label, option, instruction, validation message, confirmation, warning, error, success message, and accessibility name appears in that language, with English fallback for missing translations.
6. **Given** a language change, **When** it is applied, **Then** the document language updates, the interface does not reload, focus remains in a logical position, and no preference or draft value is lost.
7. **Given** 200% text resizing, 400% zoom, or a 360-pixel viewport, **When** preferences are used, **Then** content reflows without clipping, overlap, lost functionality, or horizontal scrolling.
8. **Given** a user who prefers reduced motion, **When** preference states change, **Then** no essential information depends on animation.

---

### Edge Cases

- **No explicit language preference**: Effective language is the first supported browser preferred language, then English; the resolved language is not persisted as an explicit user choice.
- **Browser locale changes**: If the user has an explicit language, it remains active; if the language was only implicitly resolved, the new browser preference is honored on the next application load.
- **Return to browser language**: After "Use browser language" is saved, any explicit language is cleared, later browser preferred-language changes are honored on subsequent loads, and no previous explicit language is restored.
- **Regional variants**: `es-MX`, `es-419`, and `es-ES` resolve to Spanish; `en-GB` and `en-US` resolve to English; matching is case-insensitive by base language.
- **Browser languages with unsupported entries**: Unsupported entries are skipped; the first supported entry wins; if none is supported, English is used.
- **Invalid stored language**: An unsupported or malformed stored language is treated as absent, the normal resolution order applies, and the user is informed if restoration was partial.
- **Missing translation**: A missing Spanish key falls back to English and never renders a raw key, blank label, or runtime error.
- **Language change with unsaved input**: An open draft or other unsaved form input is preserved; user-entered task and commitment content is never translated or altered.
- **Language and units**: Changing language never changes weather units; changing weather units never changes language.
- **Language and location**: Changing language never changes the selected place identity or its saved label; only surrounding interface text may localize, and no automatic re-resolution occurs.
- **Language and timezone**: Changing language never changes the timezone or shifts date-only values such as task due dates.
- **Date and time presentation boundaries**: Every supported option applies to both date and time; date-only values use the date portion of the selected option and never include a time; no option produces an invalid date, a raw format pattern, or a blank value.
- **Invalid date or timezone at render time**: The application falls back to a safe locale-aware format and does not display an error string, `Invalid Date`, or a blank where a date is required.
- **Date-only values**: Task due dates and other calendar dates do not shift across timezones; they are rendered using the date portion of the selected presentation and never display a time; only date-time values are rendered in the device timezone.
- **Device timezone changes**: Displays reflect the new device timezone without altering stored timestamps or date-only values.
- **Daylight-saving transitions**: Date-time values render with the correct local offset for the device timezone, while stored instants and date-only values remain unchanged.
- **Weather unit conversion**: Changing units converts only displayed measurements; displayed conversions use the documented per-measurement precision; stored provider data, cached weather records, and weather history remain unchanged and reversible.
- **Missing weather measurement**: A missing or unavailable measurement is displayed as unavailable in text, never fabricated as zero or a default value.
- **Location unset**: Weather surfaces show a clear prompt or empty state; they do not use a previous, inferred, or default location.
- **Location ambiguity**: Multiple matches are disambiguated with sufficient context; the system does not silently choose the first result.
- **Location unresolved**: Free text that cannot be resolved is not saved as a valid location; the error is accessible and the draft is preserved.
- **Location unavailable during outage**: The user can continue managing other preferences; an unverified location is not silently saved as valid.
- **Location cleared**: Clearing the location removes it entirely and does not restore a previous value.
- **Storage unavailable**: Preferences remain usable in memory for the session with a visible, accessible warning; no success message claims persistence.
- **Storage quota exceeded**: The draft and in-memory values are preserved, the failure is communicated, retry is offered, and no false success is shown.
- **Storage cleared while open**: The application continues without crashing and does not claim current changes are persisted.
- **Corrupt storage**: Malformed JSON or an unreadable record does not crash the application; defaults are used, the user is informed, and the record is not overwritten until an explicit save.
- **Partially invalid record**: Valid fields are restored, invalid fields fall back to defaults, and the user is informed that some preferences could not be restored.
- **Unsupported newer version**: The stored record is preserved, the user is informed, and overwriting requires explicit confirmation.
- **Migration failure**: A failed migration does not destroy the original stored record or present partially migrated data as authoritative.
- **Multi-tab updates**: A newer save in another tab is reflected or surfaced as a conflict; stale state never silently overwrites newer saved preferences.
- **Storage replacement confirmation**: If a write would replace unreadable or newer-version data, canceling the confirmation leaves the stored data untouched and the session usable.
- **Unsaved draft on unload**: A browser reload, tab close, or page unload with a differing draft triggers the browser's standard unsaved-changes confirmation; without a differing draft, no prompt is shown.
- **No changes**: Saving without changes does not falsely report that a change occurred and does not create unnecessary writes.
- **Duplicate save**: Rapid or repeated save activation applies and persists exactly one result and does not create duplicate records.
- **Save failure after language change**: If language cannot be persisted, the interface may apply it for the current session but must state clearly that it was not saved; it must never claim persistence.
- **Long Spanish text**: Longer translated labels and messages wrap or reflow without clipping, overlap, or horizontal scrolling.
- **Location with long or unusual text**: A selected place label wraps without breaking layout; HTML-like or script-like text is displayed as plain text and never executed.
- **Screen-reader repetition**: Repeated controls are distinguishable by accessible names that include the preference name.
- **External service outage**: Weather, authentication, and backend outages do not block language, date and time presentation, weather units, or previously resolved location management.

## 4. Requirements

### 4.1 Guest Access and Preference Independence

- **FR-001**: The system MUST allow a guest to view, change, save, and restore preferences without an account, authenticated session, or backend. Core preference management, including language, date and time presentation, weather units, and a previously resolved location, MUST work without a network connection; new location resolution may require an external service as described in FR-002.
- **FR-002**: Preference management MUST remain usable when the network, weather service, authentication service, or backend is unavailable. Location resolution that genuinely requires an external service MAY be unavailable, but it MUST be explained and MUST NOT block other preferences.
- **FR-003**: Language, date and time presentation, weather measurement units, and weather location MUST be independent preferences. Changing one MUST NOT change another unless the user explicitly changes it.
- **FR-004**: Preference changes MUST NOT create, modify, or delete tasks, commitments, weather records, cached weather data, or any other feature data. They change presentation and consumption behavior only.
- **FR-005**: Current preferences MUST be exposed to consuming features through a single, consistent application-level contract. Consumers MUST NOT read preference storage directly, MUST NOT hold stale values after a change, and MUST NOT mutate preferences.
- **FR-006**: This feature MUST NOT implement authentication, cloud synchronization, account migration, or any server-side preference storage.

### 4.2 Language Selection and Resolution

- **FR-007**: The system MUST allow users to select an explicit interface language from English and Spanish and MUST provide a "Use browser language" choice that, when saved, clears any explicit language and returns language selection to the resolution order in FR-009.
- **FR-008**: English and Spanish MUST be supported across every preference interface, message, validation state, and accessibility label governed by this feature.
- **FR-009**: When no explicit language preference exists, the system MUST resolve the effective language in this order: the first supported language in the browser's ordered preferred languages, then English. Matching MUST use the language's base subtag case-insensitively, so regional variants such as `es-MX` and `en-GB` resolve to Spanish and English respectively.
- **FR-010**: An explicit user-selected language MUST take precedence over browser locale at all times, including after the browser preferred languages change.
- **FR-011**: A language derived only from the browser MUST NOT be stored as an explicit user choice. Saving unrelated preferences MUST NOT convert an implicitly resolved language into an explicit choice, and the implicit language MUST be re-resolved on each application load while no explicit language is stored. Saving an explicit selection of English or Spanish MUST store that language as explicit even when it equals the currently effective language. Saving the "Use browser language" choice MUST clear any stored explicit language; the resulting effective language is resolved from the browser on each load and is not stored as an explicit choice.
- **FR-012**: An unsupported, malformed, or empty stored language MUST be treated as absent. The normal resolution order in FR-009 MUST then apply, and the user MUST be informed when stored preferences could not be restored fully.
- **FR-013**: A language change MUST apply without a full application reload and MUST update all user-facing text, the document language, and locale-dependent formatting.
- **FR-014**: A language change MUST NOT modify, translate, normalize, or reorder user-entered task, commitment, or location content, and MUST NOT change stored dates, times, priorities, durations, statuses, ordering, or weather data.
- **FR-015**: A language change MUST preserve unsaved input, the current route, open dialogs, and the current task or commitment context.
- **FR-016**: A language change MUST NOT change the device timezone, weather units, or selected location.
- **FR-017**: The document language MUST reflect the effective language at all times, including before the first meaningful paint after restoration.
- **FR-018**: If a translation is missing, the system MUST fall back to English and MUST NOT render a raw key, blank label, or runtime error.
- **FR-019**: Language options MUST be identifiable without requiring the user to read the currently active language, for example by presenting language names in their own language or through another unambiguous convention.

### 4.3 Date and Time Presentation

- **FR-020**: The system MUST allow users to choose a date and time presentation from supported options. The options MUST cover at least a compact, a standard, and a full presentation, with exact labels and styling deferred to planning.
- **FR-021**: Every date and time presentation option MUST be locale-aware. Formatting MUST use the effective locale, derived from the selected language and the user's matching browser regional variant when available, or a documented default regional variant for that language otherwise. Formatting MUST NOT hardcode month order, separators, weekday names, or clock conventions.
- **FR-022**: The selected presentation MUST apply consistently to every date and time displayed by features that consume preferences, including dashboard, agenda, tasks, commitments, and weather surfaces where applicable. Date-only values MUST use the selected presentation for their date portion and MUST NOT display a time.
- **FR-023**: Date and time formatting MUST use the device's current timezone by default. A user-selectable timezone is out of scope for this feature.
- **FR-024**: Changing the date and time presentation MUST NOT change stored timestamps, date-only values, the device timezone, or any other preference.
- **FR-025**: Date-only values, such as task due dates, MUST NOT shift to another calendar day because of timezone changes. Date-time values MUST be rendered in the device timezone.
- **FR-026**: If a date, time, or timezone value cannot be formatted, the system MUST fall back to a safe locale-aware format and MUST NOT display an error string, `Invalid Date`, a raw pattern, or a blank where a date or time is required.
- **FR-027**: The default date and time presentation MUST be the standard option. An invalid or unsupported stored value MUST fall back to the default.
- **FR-028**: When the device timezone changes, displays MUST reflect the new timezone without altering stored data or requiring the user to re-save preferences.

### 4.4 Weather Measurement Units

- **FR-029**: The system MUST allow users to select a weather measurement unit system from metric and imperial.
- **FR-030**: Metric MUST present temperature in degrees Celsius, wind speed in kilometers per hour, and precipitation in millimeters. Imperial MUST present temperature in degrees Fahrenheit, wind speed in miles per hour, and precipitation in inches. Unit labels and symbols MUST be localized where applicable. Displayed measurements MUST be rounded to a documented, per-measurement precision: whole degrees for temperature, whole units for wind speed, and one decimal place in millimeters or two decimal places in inches for precipitation. Rounding MUST occur only at display time and MUST NOT alter stored values.
- **FR-031**: Weather units MUST be a presentation-only preference. Changing units MUST NOT modify stored weather information, cached provider data, weather history, or any other feature record.
- **FR-032**: Conversion between unit systems MUST be reversible and MUST be applied only when displaying measurements; stored values MUST retain their original representation.
- **FR-033**: Changing weather units MUST NOT change language, location, date and time presentation, or any other preference.
- **FR-034**: Every weather measurement displayed by a consuming feature MUST use the selected unit system.
- **FR-035**: A missing or unavailable measurement MUST be presented as unavailable in text and MUST NOT be fabricated as zero or as a default value.
- **FR-036**: The default weather unit system MUST be metric. An invalid or unsupported stored value MUST fall back to metric.

### 4.5 Weather Location

- **FR-037**: The system MUST allow users to select a location for weather information. The location preference MUST be optional and unset by default.
- **FR-038**: The system MUST NOT use device geolocation or infer a location without explicit user action. A new user MUST NOT receive a guessed or default location.
- **FR-039**: Users MUST be able to search for a place by name and select a specific result. When multiple places share a name, the system MUST provide sufficient context, such as region or country, to disambiguate them before saving.
- **FR-040**: A location MUST be resolved to a place that can be identified for weather retrieval and MUST expose a human-readable label. The exact representation is deferred to planning.
- **FR-041**: Free text that cannot be resolved to a place MUST NOT be saved as a valid location. The system MUST explain the problem accessibly and preserve the user's input.
- **FR-042**: Users MUST be able to change or clear the selected location. Clearing MUST remove the location entirely and MUST NOT restore a previously selected place.
- **FR-043**: The selected location MUST be independent of language. Changing language MUST preserve the selected place identity and the label saved when the place was selected; the label MUST NOT be automatically re-localized, replaced, or re-resolved, and no language change may switch the place.
- **FR-044**: Changing the location MUST NOT change language, weather units, date and time presentation, or any other preference.
- **FR-045**: When a location is unset, weather-consuming features MUST show a clear prompt or empty state and MUST NOT use a default, inferred, or previous location.
- **FR-046**: When a location cannot be resolved or becomes unavailable, the system MUST communicate the problem in text, allow correction or retry, and keep other preferences and core application functionality usable.
- **FR-047**: When location resolution is unavailable because of a weather or network outage, the system MUST NOT silently save an unverified location as valid; it MUST explain the limitation and allow retry.
- **FR-048**: A location label MUST be 1 to 120 user-perceived characters after trimming when provided, MUST be stored as plain text, and MUST NOT be interpreted as HTML or executable markup.
- **FR-049**: Location data MUST be used only for weather retrieval and display. Precise coordinates or provider request details MUST NOT be displayed in the interface or written to logs, analytics, or error output.
- **FR-050**: Weather unavailability MUST NOT block preference management, task management, commitments, or the dashboard.

### 4.6 Defaults and First Use

- **FR-051**: A first-time user MUST be able to use the application without configuring preferences. Defaults MUST be active immediately and MUST NOT be presented through a blocking wizard or mandatory step.
- **FR-052**: The default preferences MUST be: effective language resolved by FR-009, standard date and time presentation, metric weather units, and no selected weather location.
- **FR-053**: Viewing preferences MUST NOT create a stored preference record or convert defaults into explicit choices. When no stored preferences exist, the surface MUST present the effective defaults and MUST NOT show an empty or error state solely because nothing is stored.
- **FR-054**: The first explicit save MUST persist a complete preference record atomically, including values the user did not change, while preserving the explicit/implicit language distinction required by FR-055.
- **FR-055**: An implicitly resolved language MUST remain implicit even when other preferences are saved, as required by FR-011.

### 4.7 Updating, Applying, and Feedback

- **FR-056**: Preference changes MUST be committed through an explicit save action. Changes MUST NOT be applied or persisted merely by changing a control, and the user MUST be able to cancel and discard the current draft.
- **FR-057**: Saving MUST validate every preference before applying or persisting any of them. A validation failure MUST NOT partially apply or partially persist the draft. Validating an unchanged, previously resolved location MUST NOT require an external service.
- **FR-058**: When validation fails, the system MUST preserve the draft, associate errors with the affected fields, mark invalid fields programmatically, provide an accessible summary when multiple errors exist, and move focus to the first invalid field.
- **FR-059**: Saving MUST expose a pending state where processing can be perceived, prevent duplicate submission while pending, and report success or failure explicitly.
- **FR-060**: Success feedback MUST be shown only when the change has been persisted. It MUST be announced through an appropriate live region and presented in the newly active language.
- **FR-061**: When a change cannot be persisted but is applied for the current session, feedback MUST state that it applies only to the current session and was not saved, MUST NOT claim persistence, and MUST offer retry when meaningful.
- **FR-062**: When a save fails validation or persistence, the draft MUST remain available for correction or retry, and the previously applied preferences MUST NOT be silently replaced by a partial result.
- **FR-063**: Saving without changes MUST NOT falsely claim that a change occurred and MUST NOT create unnecessary writes.
- **FR-064**: Applying preferences MUST update every consuming feature in the current session without a full reload and without stale values.
- **FR-065**: When a language change is applied, focus MUST remain in a logical position, the current route MUST be preserved, and the interface MUST NOT lose the user's draft or context.
- **FR-066**: The preferences surface MUST indicate when the draft differs from the applied preferences. When the user attempts to leave with unsaved changes, the system MUST warn before discarding the draft, allow the user to stay, and provide an accessible confirmation pattern if discarding is confirmed. When the draft differs, a browser reload, tab close, or page unload MUST also trigger the browser's standard unsaved-changes confirmation; the in-app confirmation remains the accessible pattern for navigation and cancellation.
- **FR-067**: A preference update MUST NOT navigate away from the current route or discard unrelated unsaved work elsewhere in the application.

### 4.8 Persistence, Restoration, and Integrity

- **FR-068**: Guest preferences MUST persist locally between application sessions in the same browser and device context.
- **FR-069**: All preference fields, including the distinction between explicit and implicit language, MUST be restored after a later session.
- **FR-070**: Stored guest preferences MUST have an explicit schema version, MUST be validated when read, and MUST be migrated safely when a supported older shape is encountered. A failed migration MUST NOT destroy the original data or present partially migrated data as authoritative.
- **FR-071**: Stored preferences MUST be treated as untrusted external input and validated field by field. Valid fields MUST be restored, and invalid fields MUST fall back to their defaults without crashing the application.
- **FR-072**: When some stored fields cannot be restored, the system MUST inform the user that some preferences could not be restored and MUST NOT silently destroy the underlying stored data.
- **FR-073**: When the stored record is malformed or unreadable as a whole, the system MUST use safe defaults, show a non-blocking accessible notice, and MUST NOT overwrite the record until the user explicitly saves.
- **FR-074**: When the stored record belongs to an unsupported newer schema version, the system MUST preserve it, MUST NOT downgrade or overwrite it, MUST inform the user that it cannot be read safely, and MUST require explicit confirmation before any write replaces it.
- **FR-075**: When local storage is unavailable, the system MUST keep preferences usable in memory for the session and MUST show an accessible warning that changes may not be saved.
- **FR-076**: When a storage write fails because of quota, permissions, or another recoverable error, the system MUST retain the draft and in-memory values, communicate the failure accessibly, and offer retry when meaningful.
- **FR-077**: When local storage is cleared or becomes unavailable while the application is open, the system MUST continue without crashing, MUST NOT claim that current preferences are safely persisted, and MUST inform the user.
- **FR-078**: When the same guest preferences are open in multiple tabs or windows, the system MUST reflect external changes or explicitly surface a conflict. A stale tab MUST NOT silently overwrite newer saved preferences.
- **FR-079**: When another tab changes the language, the current tab MUST update the interface or surface the change without silently losing the user's unsaved draft.
- **FR-080**: Restoration MUST complete before the interface presents preferences as authoritative. If restoration is asynchronous, the interface MUST show a layout-matching loading state, mark the region busy, avoid avoidable layout shift, and prevent a contradictory language flash.
- **FR-081**: The preferences surface MUST provide an accessible guest-storage notice explaining that locally stored preferences may be lost if browser storage is cleared or the user changes devices.
- **FR-082**: The preference record MUST NOT contain secrets, credentials, authentication tokens, or sensitive personal data beyond the location data required for weather retrieval. Location data MUST be handled as personal data and MUST NOT be logged.
- **FR-083**: A storage problem MUST NOT crash the application, block in-memory preference use, or prevent unrelated features from operating.

### 4.9 Accessibility

- **FR-084**: Every preference action MUST be available through keyboard interaction, with a logical focus order and no keyboard trap.
- **FR-085**: Focus MUST be visible and consistent on every interactive element, including controls, save, cancel, retry, and confirmation actions.
- **FR-086**: Every preference control MUST have a visible, programmatically associated label and, where needed, accessible instructions.
- **FR-087**: The current value of every preference MUST be programmatically determinable and clearly communicated in text. Selected values MUST NOT be conveyed only by color, icon, or visual position. When the language is implicitly resolved, the surface MUST communicate that it follows the browser language rather than an explicit saved choice.
- **FR-088**: Validation errors MUST be associated with their fields, identify the problem in text, mark invalid fields programmatically, and be summarized accessibly when multiple errors exist.
- **FR-089**: User input MUST be preserved after validation failures whenever the data remains valid to retain.
- **FR-090**: Save success, save failure, restoration warnings, storage warnings, and language changes MUST be announced through appropriate live regions without unexpected focus movement.
- **FR-091**: Dialogs and confirmations rendered by the application for unsaved changes or storage replacement MUST manage focus on open and close, support Escape when cancellation is safe, and return focus to the invoking element. The browser's standard confirmation used for page unload is platform-controlled and is exempt from application focus management.
- **FR-092**: Loading and skeleton states MUST expose `aria-busy`, MUST be hidden from assistive technologies when they carry no information, and MUST announce completion or failure.
- **FR-093**: Interactive targets MUST meet the WCAG 2.2 minimum target size, and essential interactions MUST NOT depend on hover or precise pointer movement.
- **FR-094**: Text and interface elements MUST meet WCAG 2.2 AA contrast requirements.
- **FR-095**: The interface MUST support 200% text resizing and 400% zoom without loss of content or functionality.
- **FR-096**: The interface MUST reflow without clipping, overlap, lost functionality, or horizontal scrolling at 360, 768, 1024, and 1440 pixel widths.
- **FR-097**: Motion MUST be minimal and MUST respect `prefers-reduced-motion`; no preference state may depend on animation to be understood.
- **FR-098**: A language change MUST update the document language and MUST expose the active language to assistive technologies without requiring a page reload.
- **FR-099**: All accessibility names, instructions, error text, and announcements MUST be localized in English and Spanish.

### 4.10 Localization and Formatting

- **FR-100**: All user-facing preference text MUST be available in English and Spanish, including labels, options, help text, validation messages, confirmations, warnings, errors, success messages, empty states, and accessibility text.
- **FR-101**: Missing translations MUST fall back to English and MUST NOT render raw keys, blank labels, or hardcoded user-facing text.
- **FR-102**: Users MUST be able to change the interface language without a full application reload and without losing preferences, drafts, tasks, commitments, or the current route.
- **FR-103**: Dates, times, numbers, and measurement units MUST be formatted according to the effective locale and the selected presentation and unit preferences.
- **FR-104**: Unit labels and symbols MUST be presented in the active language where a localized form is required, while the underlying measurement system remains the user's selected system.
- **FR-105**: Longer Spanish text MUST wrap or reflow without clipping, overlap, or horizontal scrolling at supported viewport widths.
- **FR-106**: Location labels, whether entered by the user or selected from search results, and other user content MUST NOT be translated, altered, or normalized beyond the specified trimming rules.
- **FR-107**: Pluralization and interpolation MUST use the approved localization mechanisms safely and MUST NOT rely on ad hoc string concatenation.
- **FR-108**: The document title and route announcements MUST reflect the active language where they are part of the preference experience.

### 4.11 Future Authenticated Migration

- **FR-109**: Preferences MUST use stable, semantic values and an explicit version so that they can be migrated to an authenticated account in a future specification without reinterpreting their meaning.
- **FR-110**: This feature MUST NOT implement, simulate, or partially implement guest-to-account migration, and MUST NOT mix local and remote preference data.
- **FR-111**: Local guest preferences MUST remain available until an explicit future migration process is performed. They MUST NOT be silently deleted, overwritten, or synchronized by this feature.
- **FR-112**: The future migration MUST be explicit and MUST define conflict resolution before replacing or merging guest preferences. This feature only preserves the data needed for that process.

### 4.12 Validation Rules

- **VR-001 — Guest access and independence**: Every core preference journey is fully operable without an account, session, or backend; new location resolution may require an external service and must degrade with an accessible explanation; language, date and time presentation, weather units, and location are independent; changing one never changes another unless explicitly changed.
- **VR-002 — Language resolution**: An explicit stored language takes precedence; otherwise the first supported browser preferred language wins; otherwise English. Regional variants resolve by base language case-insensitively; unsupported browser languages are skipped; an invalid stored language is treated as absent.
- **VR-003 — Explicit versus implicit language**: A browser-derived language is never persisted as an explicit user choice, and saving other preferences does not convert it into one. Saving English or Spanish stores an explicit choice even when it equals the current effective language; saving "Use browser language" clears the explicit choice and returns to browser resolution.
- **VR-004 — Language validation**: Only English and Spanish are valid explicit language values. Unsupported, malformed, or empty values are rejected from input and treated as absent from storage. The browser-language choice is represented by the absence of an explicit language, not by a third stored language value.
- **VR-005 — Date and time presentation**: The preference is one of the supported presentation options; the default is standard; invalid stored values fall back to standard; formatting is locale-aware and uses the device timezone; date-only values use the date portion of the option and never display a time; changing it does not alter stored values or other preferences.
- **VR-006 — Weather units**: The preference is metric or imperial; the default is metric; invalid stored values fall back to metric; conversion is presentation-only, reversible, and never mutates stored weather data; displayed conversions use the documented per-measurement precision.
- **VR-007 — Weather location**: The location is optional, unset by default, explicitly selected, unambiguous, independent of language, clearable, and validated to 1 to 120 trimmed user-perceived characters when provided; unresolved text is rejected; no geolocation or implicit inference is used; changing language preserves both the place identity and its saved label without re-resolution.
- **VR-008 — Defaults and first use**: Defaults are effective immediately, no preference record is created by viewing, and the first explicit save persists a complete atomic record while preserving implicit language.
- **VR-009 — Update atomicity and feedback**: Save validates all values first, applies and persists atomically, prevents duplicate submission, preserves the draft on failure, reports success only after persistence, and never claims persistence when a write failed.
- **VR-010 — Persistence and restore**: All preference fields and the explicit/implicit language distinction persist locally and are restored in the same browser and device context.
- **VR-011 — Storage integrity**: Stored data is versioned and validated on read; supported older versions migrate safely; unsupported newer versions are preserved; invalid records and fields are isolated without crashing or destroying valid data; unreadable data is not overwritten without explicit save, and newer-version data is not overwritten without explicit confirmation.
- **VR-012 — Storage failure and concurrency**: Unavailable, full, permission-restricted, or externally cleared storage does not block in-memory use, never produces a false persistence claim, and stale multi-tab writes never silently overwrite newer data.
- **VR-013 — Accessibility**: Keyboard-only journeys pass; focus is visible and managed; labels and errors are associated; updates are announced; selected values are communicated in text; targets, contrast, zoom, text resizing, and reduced motion meet the stated requirements.
- **VR-014 — Localization and formatting**: All user-facing text exists in English and Spanish or has verified English fallback; no raw keys or hardcoded text appear; language changes preserve data and drafts; dates, times, numbers, and units follow the active locale and preferences; document language matches the effective language.
- **VR-015 — Non-mutation and privacy**: Preference changes never modify task, commitment, weather, or other feature data; user content is not translated; location is used only for weather and is not logged with precise coordinates; no secrets or authentication tokens are stored.
- **VR-016 — Migration readiness**: Preferences use stable semantic values and an explicit version; no authentication, cloud synchronization, or migration behavior is implemented; local preferences remain available for a future explicit migration.

### 4.13 Key Entities

- **User Preferences**: The complete set of configurable presentation choices for a guest context: language, date and time presentation, weather units, and weather location. Preferences are independent of feature data and are never a source of truth for tasks, commitments, or weather observations.
- **Explicit Language Preference**: A language intentionally selected and saved by the user. It takes precedence over browser locale and persists until the user saves a different language or saves the "Use browser language" choice.
- **Browser-Language Choice**: The saved user choice to return language selection to browser resolution. It clears any stored explicit language and does not itself store a language value; the resulting effective language remains implicit and follows the resolution order in FR-009.
- **Implicit Language Resolution**: A browser-derived effective language used when no explicit preference exists. It is re-evaluated on each load and is not persisted as an explicit choice.
- **Effective Language and Locale Context**: The language currently applied to the interface and the locale context used for formatting dates, times, numbers, and units. It includes the device timezone as the formatting timezone.
- **Date and Time Presentation Preference**: The user-selected, locale-aware style used for date and time display. It applies to date-time values and to the date portion of date-only values, which never display a time. It controls presentation only and never changes stored timestamps or date-only values.
- **Weather Unit Preference**: The selected metric or imperial measurement system used for weather display. It is independent of language and location and never mutates stored weather data. Displayed measurements are rounded to the documented per-measurement precision without changing stored values.
- **Weather Location Preference**: An optional, explicitly selected place used for weather information, with a human-readable label and enough reference data for retrieval. It is independent of language and may be unset, changed, or cleared. Its label is retained as stored and is not re-localized when the interface language changes.
- **Preference Draft**: The in-progress set of changes in the preferences surface before an explicit save. It can be validated, corrected, discarded, or retried without partially applying preferences. A differing draft also triggers the browser's standard unsaved-changes confirmation on reload, tab close, or page unload.
- **Guest Preference Store**: The local, browser-and-device-scoped persistence of guest preferences. It has an explicit schema version, is validated on read, migrates supported older shapes safely, preserves unsupported newer data, and prevents stale writes from silently overwriting newer values.
- **Preference Consumer Contract**: The consistent application-level interface through which features read current preferences and react to changes. Consumers receive validated values, never read storage directly, and never mutate preferences.

## 5. Success Criteria

### 5.1 Measurable Outcomes

- **SC-001**: A guest can review and save all supported preferences in under 2 minutes without assistance, account creation, or sign-in.
- **SC-002**: In 100% of tested cases, language resolution follows explicit preference, then supported browser preferred language, then English, including regional variants, unsupported browser languages, invalid stored languages, browser-locale changes after an explicit choice, and returning to browser language.
- **SC-003**: 100% of tested saved guest preferences are restored after a later session in the same browser and device context when storage remains available.
- **SC-004**: 100% of tested changes to language, date and time presentation, weather units, or location leave task, commitment, and stored weather data unchanged.
- **SC-005**: 100% of tested preference changes are reflected consistently in every consuming surface in the same session without a full reload and without stale values.
- **SC-006**: 100% of tested invalid values are rejected with localized, accessible field feedback, no partial save, and preserved input.
- **SC-007**: 100% of tested save successes are reported only after persistence; 100% of tested persistence failures state that the change applies only to the current session and never claim that it was saved.
- **SC-008**: All preference journeys are completable with a keyboard only; automated checks report zero critical or serious WCAG 2.2 AA violations; manual VoiceOver with Safari journeys pass; selected values, errors, and status changes are announced.
- **SC-009**: All user-facing preference text is available in English and Spanish or has verified English fallback; switching language updates the interface, document language, and formatting without reload and without losing preferences or drafts.
- **SC-010**: In 100% of tested locales and timezones, date and time presentation follows the effective locale and device timezone, date-only values such as task due dates use the selected presentation without a time and do not shift across timezone changes.
- **SC-011**: Weather unit conversion is presentation-only, reversible, and uses the documented per-measurement display precision; location selection is independent of language and units; changing any one preference leaves the other three unchanged in 100% of tested cases.
- **SC-012**: Unavailable, corrupt, partially invalid, quota-limited, externally cleared, and unsupported-version storage scenarios complete without an application crash, without silent data loss, and with valid fields recovered and failures communicated.
- **SC-013**: In tested multi-tab scenarios, newer saved preferences are reflected or surfaced as a conflict, and no newer saved preference is silently overwritten by stale state.
- **SC-014**: The preferences surface exposes the guest-storage warning, and 100% of tested guest sessions show no false claim that locally stored preferences survive cleared storage or a device change.
- **SC-015**: Preference management remains fully usable with weather, authentication, backend, and network services unavailable, except for location resolution that genuinely requires an external service, which degrades with an accessible explanation.
- **SC-016**: The interface is usable at 360, 768, 1024, and 1440 pixel widths and with 200% text resizing and 400% zoom, without clipping, lost functionality, or horizontal scrolling.

## 6. Assumptions and Dependencies

- Guest users are the primary audience for this feature. No account, authentication, cloud synchronization, or cross-device availability is included.
- Browser preferred-language detection is in scope for the user-preferences feature, as anticipated by the foundation specification. The foundation's temporary English-only startup behavior MUST be reconciled when this feature is implemented.
- The device's current timezone is the formatting timezone. A user-selectable timezone is deferred to a future specification, and timezone must remain independent of language.
- The supported languages are English and Spanish. English is the canonical source language and the fallback. Both are left to right. Additional languages may be added later without structural changes.
- Supported date and time presentation options are compact, standard, and full, with standard as the default. Exact labels, documented default regional variants, and whether additional options are offered are planning decisions within the behavior defined here.
- Supported weather unit systems are metric and imperial, with metric as the default. Display precision is defined per measurement and unit system; exact labels and symbols are localized where required.
- Weather location is optional and unset by default. The system does not request device geolocation or infer a location. The exact search and resolution mechanism is a planning decision.
- Guest preferences are stored in browser-local storage. Capacity is finite, private browsing modes may restrict or reject storage, and users may clear storage at any time.
- Core preference management works without a network connection. New location search or resolution may require an external service and must degrade gracefully when unavailable.
- The application does not own or mutate weather observations. Weather data remains external contextual data; preference changes only affect how it is presented or which location is requested.
- The exact preference surface, control types, confirmation patterns, storage key, storage envelope, migration code, and component structure are deferred to planning.
- Test coverage MUST include resolution order, explicit versus implicit language, return to browser language, defaults, validation, atomic save, unsaved-draft exit behavior, persistence and restoration, corrupt and partial data, unsupported versions, storage failures, multi-tab behavior, non-mutation, units and display precision, location, accessibility, localization, responsive behavior, and reduced motion.
- Existing companion artifacts (`plan.md`, `tasks.md`, research, data model, quickstart, contracts) and current source code may predate this specification. This specification is authoritative for product behavior, and those artifacts and code MUST be reconciled during planning and implementation.
- User-entered task, commitment, and location content is user content and is not translated by the application.
- The performance reference environment is a modern evergreen browser on a mid-range desktop using the production build without network throttling. Preference interactions should complete within 1 second after user action, excluding genuine external location-resolution latency.

## 7. Constitution Alignment

| Principle | Applicability | How this specification addresses it |
| --- | --- | --- |
| **I. Clean Code, SOLID, and Simplicity** | Applies | Defines one cohesive preference feature with explicit rules, avoids speculative personalization, and separates preference configuration from consuming feature data. |
| **II. Strict TypeScript and Type Safety** | Applies | Requires validated domain values for language, presentation, units, and location; stored preferences are untrusted and validated at the boundary. |
| **III. Frontend Architecture: Feature-Sliced Design** | Applies | Preference behavior, storage, and presentation MUST respect FSD layers and public APIs during planning. |
| **IV. Backend Architecture and Modular Design** | Not applicable | No backend, endpoint, or server-side preference store is introduced; FR-006 preserves the boundary. |
| **V. React Component Design and Reusability** | Applies | Requires controlled preference forms, explicit props, associated validation, and separation of presentation from preference rules. |
| **VI. Styling, Design Tokens, and Visual Consistency** | Applies | Requires semantic tokens, calm light-theme presentation, non-color value communication, and complete loading, success, error, and warning states. |
| **VII. Testing Strategy and Quality Assurance** | Applies | Requires tested resolution, validation, persistence, failure modes, accessibility, localization, and non-mutation behavior. |
| **VIII. Performance and Resource Efficiency** | Applies | Requires immediate preference application, no stale consumer values, and responsive interaction without unnecessary reloads. |
| **IX. Scalability, Resilience, and Fault Isolation** | Applies | FR-002, FR-045 through FR-047, and FR-075 through FR-083 isolate storage and external-service failures and preserve useful operation. |
| **X. API Contracts and Independent Deployment** | Not applicable | No API or cross-service contract is introduced; the preference consumer contract is internal to the frontend. |
| **XI. Constants, Hardcoded Values, and Configuration Management** | Applies | Supported languages, presentation options, unit systems, display precisions, defaults, and location limits are named business constants rather than scattered values. |
| **XII. Security and Data Protection** | Applies | FR-049, FR-082, and VR-015 treat local data as untrusted, prohibit secrets and tokens, minimize location data, and prohibit precise-coordinate logging. |
| **XIII. Accessibility and Inclusive Design** | Applies | FR-084 through FR-099 define keyboard operation, focus, labels, selected values, errors, announcements, targets, contrast, zoom, resizing, and reduced motion. |
| **XIV. Internationalization and Localization** | Applies | FR-007 through FR-019 and FR-100 through FR-108 require English and Spanish, fallback, runtime switching, document language, and locale-aware formatting. |
| **XV. Documentation and Technical Communication** | Applies | Section 2 records product alignment, Section 6 records assumptions, and Section 7.1 records conflicts; planning MUST reconcile companion artifacts. |
| **XVI. Automated Quality Gates and Git Hooks** | Applies | The definition of done remains the canonical `lint`, `typecheck`, `test`, and `build` contract, with tests for the behaviors in this specification. |
| **XVII. Frontend Server State and Async UX** | Applies | Guest preferences are local, not server state; persistence MUST be encapsulated behind a storage boundary, versioned, validated, and never read or written ad hoc by components. |
| **XVIII. Data Integrity and Persistence with Prisma** | Not applicable | No database or Prisma model is introduced; local persistence MUST still satisfy versioning, validation, migration, and no-silent-loss requirements. |
| **XIX. External Integrations and Weather Resilience** | Applies as a boundary | Weather is not consumed directly by this feature; weather unavailability must not block preference management, and location data is minimized and not logged. |
| **XX. Technology Stack Governance and Dependency Discipline** | Applies | The feature introduces no new runtime technology and MUST use the approved stack, including Zod validation and the approved i18n and testing tools. |

### 7.1 Conflicts and Clarifications

- The product overview lists planning-related personal preferences among initial preferences. This feature does not implement them. They are explicitly deferred to a future specification and MUST NOT be invented as part of this feature.
- The product overview includes guest-to-account migration in the MVP. This feature does not implement migration; it preserves migration-ready preference semantics only (FR-109–FR-112). Migration behavior remains a separate specification.
- The foundation specification temporarily defaults to English when no stored preference exists and defers browser-language detection to the user-preferences feature. This specification now defines browser-locale resolution. Once implemented, the foundation behavior and its tests MUST be reconciled with this specification, while the runtime language-change mechanism remains authoritative.
- This specification resolves the previous ambiguity about invalid stored language values: they are treated as absent and the normal resolution order applies, rather than being blindly coerced to English. This is consistent with the product rule that English is the fallback when neither a valid preference nor a supported browser locale is available.
- The preference interaction model is explicitly save-based, not auto-save. This supports atomic validation, truthful feedback, and cancellation. The exact save and unsaved-change presentation is deferred to planning.
- The date and time presentation preference controls presentation only. The device timezone is used, and a user-selectable timezone is explicitly out of scope for this feature.
- No requirement in this specification intentionally contradicts the product overview or the constitution. Any future conflict MUST be identified and resolved explicitly rather than silently reinterpreted.

### 7.2 Traceability from the Previous Draft

The previous draft used a shorter requirement set. This table is informational and helps reconcile companion artifacts that still cite the old identifiers; the new requirements in Section 4 are authoritative.

| Previous requirement | Now covered by |
| --- | --- |
| FR-001 Language selection | FR-007, FR-019 |
| FR-002 English and Spanish support | FR-008, FR-100 through FR-108 |
| FR-003 English fallback | FR-009, FR-012, FR-018 |
| FR-004 User language precedence | FR-010, FR-011 |
| FR-005 Date and time presentation | FR-020 through FR-028 |
| FR-006 Weather units | FR-029 through FR-036 |
| FR-007 Weather location | FR-037 through FR-050 |
| FR-008 Defaults | FR-051 through FR-055 |
| FR-009 Update preferences | FR-056 through FR-067 |
| FR-010 Local persistence and restore | FR-068 through FR-083 |
| FR-011 Consistent application | FR-005, FR-064 |
| FR-012 Language and units independent | FR-003, FR-016, FR-033 |
| FR-013 Location independent of language | FR-003, FR-043 |
| FR-014 Language does not modify task/commitment data | FR-004, FR-014 |
| FR-015 Units do not modify stored weather | FR-004, FR-031, FR-032 |
| FR-016 Feedback | FR-059 through FR-063 |
| FR-017 Selected values communicated | FR-087 |
| FR-018 Keyboard accessibility | FR-084 through FR-099 |
| FR-019 Future migration | FR-109 through FR-112 |

## 8. Feature Readiness Gate

User Preferences and Localization is ready for planning handoff and implementation only when all of the following conditions are satisfied:

1. Every functional requirement in Section 4 and every validation rule in Section 4.12 is implemented and verified.
2. `lint`, `typecheck`, `test`, and `build` pass from a clean install, and tests cover language resolution, explicit versus implicit language, return to browser language, defaults, validation, atomic save, unsaved-draft exit behavior, persistence, restoration, corrupt and partial data, unsupported versions, storage failures, multi-tab behavior, non-mutation, units and display precision, date-only presentation, location including label stability, accessibility, localization, responsive behavior, and reduced motion.
3. Keyboard-only journeys and VoiceOver with Safari journeys pass; automated accessibility checks report zero critical or serious violations; focus management is verified for validation, unsaved-change confirmation, and storage-replacement confirmation.
4. The interface is usable at 360, 768, 1024, and 1440 pixel widths and with 200% text resizing and 400% zoom, without clipping, lost functionality, or horizontal scrolling.
5. All user-facing preference text is externalized and available in English and Spanish or has verified English fallback; language changes preserve preferences, drafts, and context; document language matches the effective language.
6. Storage versioning, validation, migration, corruption recovery, unavailable storage, quota failure, unsupported versions, storage clearing, and multi-tab behavior are verified with no silent data loss and no false persistence claims.
7. Preference changes propagate to every consuming feature without reload and without stale values; no consumer reads storage directly or mutates preferences.
8. No preference change modifies task, commitment, weather, or other feature data; no secrets, credentials, authentication tokens, or precise location data are exposed through storage, logs, analytics, or error output.
9. Preference management operates without a backend, authentication, network connection, or weather service, except for location resolution that genuinely requires an external service and degrades with an accessible explanation.
10. `plan.md`, `tasks.md`, research, data model, quickstart, contracts, and source code are reconciled with this specification or explicitly marked as superseded.
11. No out-of-scope capability has been introduced, and all deferred decisions in Section 1.4 are recorded before implementation begins.
