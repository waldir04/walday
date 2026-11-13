# Feature Specification: Daily Commitments

**Feature Branch**: `004-daily-commitments`  
**Created**: 2026-11-10  
**Status**: Draft  
**Input**: User description: "Create a specification for Daily Commitments in Walday. The goal is to allow users to register scheduled activities that occupy specific periods of their day. Commitments are different from tasks because they represent activities with a defined time period."

## Clarifications

### Session 2026-11-12

- Q: When a user starts creating a new commitment, should a type be preselected, or must the user choose fixed or flexible explicitly? → A: No preselection; the user must choose fixed or flexible before saving.
- Q: When a user saves an edit to a commitment that already overlaps other commitments, under what conditions should the app ask for the overlap acknowledgment again? → A: Re-acknowledge only when the edit changes the date or times; title, description, or type edits do not trigger another acknowledgment.
- Q: When a commitment cannot be persisted locally, should the app keep it visible as an unsaved item in the commitment list, or keep the user in the form without adding it to the saved list? → A: Keep the form open with the entered values and an error; do not add the commitment to the saved list until storage succeeds.
- Q: When a user opens a new commitment form while viewing a specific date, should the date field default to that viewed date, today's date, or start empty? → A: Default to the date currently being viewed; the user can still change it.
- Q: When another tab or window has saved newer commitment data, should the current tab block further saves until it is reloaded, or allow the user to continue and overwrite after a warning? → A: Block further saves until the current tab is reloaded; do not allow an overwrite path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture and view commitments for a day as a guest (Priority: P1)

As a guest user, I can create a commitment with a title, optional description, date, start and end times, and a type (fixed or flexible) so that I can record a time-bound activity and see it in the application without creating an account.

**Why this priority**: Capturing time-bound activities is the core value of this feature and the foundation for daily planning and the future Daily Agenda.

**Independent Test**: Can be fully tested by creating fixed and flexible commitments with valid information, viewing them for the relevant dates, confirming their details and type are clearly presented, and verifying they are restored after returning in the same browser/device context without an account.

**Acceptance Scenarios**:

1. **Given** a guest user with no commitments, **When** the user creates a fixed commitment with a title, date, start time, and end time, **Then** the commitment is saved, displayed for that date, and identified as fixed with a visible text label.
2. **Given** a guest user, **When** the user creates a flexible commitment with a title, date, start time, end time, and an optional description, **Then** the commitment is saved, displayed in chronological order, and identified as flexible with a visible text label.
3. **Given** a guest user viewing commitments, **When** the view opens, **Then** the current date is selected by default and commitments for that date are shown in chronological order.
4. **Given** a guest user viewing a date with no commitments, **When** the view loads, **Then** an empty state explains that no commitments exist for that date and offers a clear action to create one.
5. **Given** a guest user with saved commitments, **When** the user returns in a later session on the same browser/device, **Then** previously saved commitments are restored with their details, types, and dates intact.
6. **Given** a guest user, **When** the user creates a commitment for a past or future calendar date, **Then** the commitment is accepted and displayed for that date.
7. **Given** a first-time or returning guest user, **When** the user manages commitments, **Then** no account, sign-in, or cloud service is required.
8. **Given** a user opening a new commitment form, **When** the form first appears, **Then** no commitment type is selected by default, both type options and their explanations are visible, and the user cannot save until choosing one.
9. **Given** a user viewing a specific date, **When** the user opens a new commitment form, **Then** the date field is pre-filled with the viewed date and remains editable.

---

### User Story 2 - Edit and delete commitments with explicit control (Priority: P2)

As a user, I can edit or delete my commitments so that my schedule stays accurate, while the application never changes a commitment's date, time, type, or details without my explicit action.

**Why this priority**: Schedules change, but user control and trust require that every modification be intentional, visible, and reversible until confirmed.

**Independent Test**: Can be tested by opening an existing commitment, saving changes, changing its type explicitly, deleting it through confirmation, and verifying that no commitment is modified by any other action.

**Acceptance Scenarios**:

1. **Given** an existing commitment, **When** the user chooses to edit it, **Then** the form is pre-filled with its current title, description, date, start time, end time, and type.
2. **Given** an existing commitment, **When** the user changes valid details and confirms the change, **Then** the updated commitment is saved, displayed with the new information, and its success is announced.
3. **Given** an existing fixed commitment, **When** the user explicitly changes its type to flexible, **Then** the change is saved without altering its date or times unless the user also changes them.
4. **Given** an existing fixed commitment, **When** the user views it, opens it, or creates another commitment, **Then** its date, start time, end time, and type remain unchanged.
5. **Given** an existing flexible commitment, **When** the user views or edits another commitment, **Then** the flexible commitment is never automatically rescheduled.
6. **Given** an existing commitment, **When** the user chooses to delete it and confirms the action, **Then** the commitment is removed, a success message is announced, and focus moves to a logical place in the remaining view.
7. **Given** an existing commitment, **When** the user chooses to delete it but cancels the confirmation, **Then** the commitment remains unchanged.
8. **Given** an edit form with unsaved changes, **When** the user attempts to leave it, **Then** the user is warned and can either discard the changes or return to the form.

---

### User Story 3 - Validate time ranges and understand conflicts (Priority: P3)

As a user, I receive clear validation and conflict information when creating or editing commitments so that I can correct invalid information and make informed decisions about overlapping activities.

**Why this priority**: Correct time boundaries and visible overlaps prevent confusion and support reliable daily planning.

**Independent Test**: Can be tested by submitting missing, malformed, equal, and reversed time ranges, creating overlapping commitments, saving after acknowledging a conflict, and verifying that invalid data is rejected and overlaps are communicated without silent changes.

**Acceptance Scenarios**:

1. **Given** a user entering commitment times, **When** the start time equals the end time, **Then** the commitment is not saved and an accessible message explains that the start time must be earlier than the end time.
2. **Given** a user entering commitment times, **When** the end time is earlier than the start time, **Then** the commitment is not saved and the invalid range is communicated clearly.
3. **Given** a user saving a commitment with a missing or whitespace-only title, a missing or invalid date, or a missing or malformed time, **Then** the commitment is not saved, each affected field is identified, and an accessible error summary is provided when more than one field is affected.
4. **Given** a user creating or editing a commitment, **When** its period overlaps one or more existing commitments on the same date, **Then** every conflicting commitment is identified by title and time range before saving, and no existing commitment is changed.
5. **Given** an overlap warning, **When** the user declines to acknowledge it, **Then** the commitment is not saved and the user's entered information is preserved.
6. **Given** an overlap warning, **When** the user explicitly acknowledges it and confirms, **Then** the commitment is saved and the overlap remains visible in the list until it no longer exists.
7. **Given** two commitments on the same date that meet exactly at a boundary (one ends when the other starts), **When** either is saved, **Then** they are not treated as overlapping.
8. **Given** a commitment being edited, **When** it overlaps only with its own previously saved period, **Then** it is not reported as conflicting with itself.
9. **Given** a commitment with both an invalid time range and an overlap, **When** the user attempts to save, **Then** the invalid range is reported and the commitment is not saved.
10. **Given** commitments of different types, **When** overlaps or schedules are presented, **Then** fixed and flexible commitments remain distinguishable by visible text, not color alone.
11. **Given** an existing commitment with an acknowledged overlap, **When** the user edits only its title, description, or type and saves, **Then** the app does not require another overlap acknowledgment and the conflict indication remains visible.
12. **Given** a user saving a commitment when local persistence fails, **When** the save is attempted, **Then** the commitment is not added to the saved list, the form remains open with the entered values, an accessible error explains the failure, and the user can retry or cancel.
13. **Given** a tab holding older data while another tab saves newer commitment data, **When** the user attempts to save in the older tab, **Then** the save is blocked, an accessible message explains that newer data exists, and a reload action is provided; saving becomes available after reload.

---

### Edge Cases

- **Equal or reversed times**: A commitment whose start time is not earlier than its end time is invalid and is never saved.
- **Cross-midnight periods**: A commitment must start and end on the same calendar date. Periods that would cross midnight are rejected with a message explaining that the user must split them into separate commitments.
- **All-day or multi-day periods**: The form requires a same-day start and end time and offers no all-day or multi-day input, so such periods are never silently converted. Cross-midnight ranges are rejected with guidance to split them.
- **Invalid calendar dates**: Dates that do not exist (for example, a month without that day) are rejected rather than normalized to another date.
- **Malformed times**: Times outside a valid day or not expressed as a time are rejected with field-level feedback.
- **Title and description boundaries**: A title that is empty or contains only whitespace is rejected. A title over 120 characters or a description over 500 characters is rejected with field-level feedback while the entered text is preserved. An empty or whitespace-only description is treated as no description.
- **Midnight end time**: An end time of 00:00 is treated as the start of the next day and is rejected as a cross-midnight period.
- **Overlap shapes**: Partial overlaps, one period fully containing another, identical periods, and multiple simultaneous overlaps are all identified. All affected commitments are listed.
- **Different dates**: Commitments on different dates are never treated as overlapping, even when their clock times intersect.
- **Editing and self-conflict**: A commitment being edited is excluded from its own conflict check, but extending it into another commitment's period produces a conflict.
- **Title, description, or type edit of an overlapping commitment**: Changing only these fields does not require another acknowledgment, and the conflict indication remains visible.
- **Conflicting commitment deleted or shortened**: Existing overlap warnings update after the conflicting commitment is deleted or changed; no automatic change is made to the remaining commitments.
- **Multiple conflicts**: When a new or edited commitment overlaps several commitments, all conflicts are communicated together, not only the first one found.
- **Storage unavailable, full, or blocked**: The form remains open with the entered values, the commitment is not added to the saved list, the failure is communicated accessibly, and a retry is offered. The user can cancel without creating the commitment.
- **Storage cleared between sessions**: The application starts with an empty list and clearly warns that locally stored commitments can be lost when browser data is cleared or the device changes.
- **Corrupt, partial, or older stored data**: Valid commitments remain available, invalid entries are isolated rather than crashing the application, the user is informed that some data could not be restored, and valid data is not silently overwritten.
- **Simultaneous edits in multiple tabs or windows**: A tab with older data must not silently overwrite newer saved changes. Further saves in that tab are blocked until it is reloaded, and the user is informed with an accessible reload action.
- **Language change while editing**: The visible labels, instructions, validation messages, and conflict messages update to the new language without losing the user's entered information.
- **Device timezone or daylight-saving change**: Commitments retain the calendar date and wall-clock times the user entered. The application must not silently shift them to preserve an absolute instant.
- **Duplicate submission**: Repeated activation of a save or delete action while it is in progress does not create duplicate commitments or duplicate deletions.

## Requirements *(mandatory)*

### Functional Requirements

#### Commitment Management

- **FR-001**: System MUST allow guest users to create, edit, and delete commitments without requiring an account, sign-in, or cloud service.
- **FR-002**: System MUST allow users to create a commitment with a title, an optional description, a date, a start time, an end time, and a type. A new commitment MUST NOT be saved until the user explicitly selects fixed or flexible; no type is preselected.
- **FR-003**: System MUST allow users to edit every user-editable attribute of an existing commitment, including title, description, date, start time, end time, and type, through explicit user action.
- **FR-004**: System MUST allow users to add, change, or clear a commitment's description. A description MUST NOT exceed 500 characters. An empty or whitespace-only description MUST be treated as no description.
- **FR-005**: System MUST allow users to delete a commitment only after a confirmation that identifies the commitment being deleted.
- **FR-006**: System MUST support a **fixed** commitment type for activities that must happen at a specific time. A fixed commitment's date, times, and type MUST NOT be changed automatically; any change requires explicit user action.
- **FR-007**: System MUST support a **flexible** commitment type for activities that can potentially be moved. Flexible commitments MUST never be rescheduled automatically without user approval and MAY be considered by future Planning Suggestions.
- **FR-008**: System MUST present commitment type with a visible text label and a short explanation of the difference between fixed and flexible, both when choosing a type and when viewing a saved commitment.
- **FR-009**: System MUST make edit and delete actions available for each displayed commitment without requiring the user to remember its identifier.
- **FR-010**: System MUST provide visible and assistive-technology-announced success feedback when a commitment is created, updated, or deleted.
- **FR-011**: System MUST show a pending state during a save or delete action and MUST prevent duplicate submissions while that action is in progress.
- **FR-012**: System MUST NOT change any commitment's title, description, date, times, or type as a side effect of viewing, validating, saving another commitment, acknowledging an overlap, changing language, or changing the device timezone.
- **FR-013**: Commitments MUST remain separate from tasks. A commitment MUST NOT be presented as a task, require task completion status, or be silently converted into a task.

#### Validation and Conflicts

- **FR-014**: System MUST require a title that contains at least one non-whitespace character and does not exceed 120 characters.
- **FR-015**: System MUST require the date to be a valid calendar date associated with exactly one day, without inferring or normalizing it to a different day.
- **FR-016**: System MUST require a start time and an end time, specified to the minute, for every commitment.
- **FR-017**: System MUST require the start time to be earlier than the end time on the same calendar date. Equal or reversed times MUST be rejected.
- **FR-018**: System MUST reject periods that cross midnight or span multiple days, and MUST explain that the user must split the period into separate supported same-day commitments. The form does not offer an all-day input.
- **FR-019**: System MUST allow commitments on past, present, and future dates. It MUST NOT reject a commitment solely because its date is in the past.
- **FR-020**: System MUST NOT save a commitment when any required field is missing or invalid, and MUST NOT save a partial record.
- **FR-021**: System MUST validate when the user attempts to save, present field-level messages associated with the affected fields, provide an accessible error summary when more than one error exists, move focus to the summary or first invalid field, and preserve all entered values.
- **FR-022**: System MUST revalidate corrected fields and remove resolved messages while the user continues editing.
- **FR-023**: System MUST identify a conflict when two commitments on the same calendar date have intersecting periods. Periods that only meet at a boundary MUST NOT be treated as conflicting.
- **FR-024**: System MUST identify all conflicting commitments for a candidate commitment, excluding the commitment being edited, and MUST communicate each conflict by title and time range.
- **FR-025**: System MUST present conflicts before saving an otherwise valid commitment that creates an overlap. When creating a commitment, or when an edit changes its date or times and the result still overlaps, System MUST require explicit user acknowledgment. Edits that change only the title, description, or type MUST NOT trigger another acknowledgment while the overlap remains.
- **FR-026**: System MUST NOT block a save solely because of an acknowledged overlap. Declining the acknowledgment MUST cancel the save and preserve the user's entered information.
- **FR-027**: System MUST continue to display an overlap indicator, with accompanying text, for as long as conflicting commitments remain. Saving, editing, or displaying conflicts MUST NOT alter any commitment.
- **FR-028**: System MUST NOT automatically resolve, merge, move, shorten, extend, or discard any commitment in response to a conflict.
- **FR-029**: System MUST present the invalid time range instead of an overlap acknowledgment when a commitment has both an invalid range and one or more overlaps.

#### Display and User Experience States

- **FR-030**: System MUST display commitments by calendar date, defaulting to the current date and allowing the user to reach commitments on other dates. When the user starts creating a commitment from a selected date, the date field MUST default to that viewed date and remain editable.
- **FR-031**: System MUST order commitments for a date chronologically by start time. Commitments with the same start time MUST be ordered by title and then by stable identity, using the active language's alphabetical ordering.
- **FR-032**: System MUST display, for each commitment, its title, date, start and end times, type as visible text, description when present, and any conflict indication with accompanying text.
- **FR-033**: System MUST provide an empty state for a date without commitments that explains the situation and offers a clear action to create a commitment.
- **FR-034**: System MUST NOT display an empty state until locally stored commitments have been checked. If restoration cannot complete immediately, the view MUST expose a layout-stable busy state that avoids avoidable layout shift rather than a false empty state or a loose loading message.
- **FR-035**: System MUST provide a localized error state with a retry action when stored commitments cannot be read and retry is meaningful.
- **FR-036**: System MUST update the displayed list immediately after a successful create, update, or delete without requiring a page reload.
- **FR-037**: System MUST display validation errors, conflict messages, storage warnings, and success feedback in text and through accessible announcements, not through color, icon, or position alone.

#### Local Persistence and Data Availability

- **FR-038**: System MUST persist guest commitments locally on the user's browser/device and restore them when the user returns in the same browser/device context.
- **FR-039**: System MUST clearly warn users that commitments are stored only on the current browser/device, are not synchronized across devices, and can be lost if browser data is cleared or the device changes.
- **FR-040**: If a commitment cannot be written to local storage, System MUST NOT report the save as successful and MUST NOT add the commitment to the saved list. It MUST keep the form open with the entered values, communicate the failure accessibly, offer a retry, and allow the user to cancel the failed save without creating the commitment.
- **FR-041**: If stored commitment data is corrupt, partially invalid, or from an older compatible version, System MUST keep valid commitments available, migrate compatible older entries without requiring re-entry, isolate invalid entries, inform the user that some data could not be restored, and MUST NOT silently overwrite valid data.
- **FR-042**: System MUST prevent an older view in another tab or window from silently overwriting newer saved commitments. When newer data is detected, the current tab MUST block further saves, inform the user accessibly, and provide a reload action. Saving MUST remain unavailable until the tab is reloaded.
- **FR-043**: System MUST make each saved commitment's stable identity, title, description, date, start time, end time, and type available to the future Daily Agenda so it can retrieve commitments by date. This feature does not define the agenda's visual composition.
- **FR-044**: Commitment data MUST remain local to the browser/device in this feature. No commitment data may be sent to a server, external calendar, or third party.

#### Accessibility and Localization

- **FR-045**: System MUST allow all commitment journeys—viewing, creating, editing, deleting, navigating dates, and acknowledging conflicts—to be completed using only a keyboard.
- **FR-046**: System MUST provide visible labels, instructions, and accessible names for the title, description, date, start time, end time, and type controls, and MUST associate every field-level message with its field.
- **FR-047**: System MUST announce validation summaries, conflict warnings, success messages, storage failures, and list changes through assistive technologies without requiring the user to discover them visually.
- **FR-048**: System MUST manage focus when opening and closing forms or confirmation dialogs, when validation fails, and after a commitment is created, updated, or deleted. Focus MUST return to a logical element and MUST NOT become trapped.
- **FR-049**: System MUST NOT distinguish commitment types, conflicts, errors, or success states by color alone. Text, and where useful an accessible icon, MUST convey the same information.
- **FR-050**: System MUST present all user-facing content for this feature in English and Spanish, including labels, instructions, type names, validation messages, conflict messages, confirmations, empty states, error states, success feedback, and storage warnings. User-entered titles and descriptions MUST NOT be translated.
- **FR-051**: System MUST display dates and times according to the active formatting locale and MUST keep the timezone independent from the interface language. Switching the interface language MUST NOT change stored dates or wall-clock times.
- **FR-052**: System MUST update visible labels and messages when the user changes language without losing entered information or requiring a full application reload. The document language MUST reflect the active language.
- **FR-053**: System MUST keep all commitment interactions usable on phone, tablet, and desktop widths and at browser zoom levels up to 200%, with touch targets meeting WCAG 2.2 AA minimum size and without requiring hover, precise pointer movement, or horizontal scrolling.
- **FR-054**: System MUST remain understandable and operable when motion is reduced or animations are disabled.

#### Scope Boundaries

- **FR-055**: System MUST NOT introduce external calendar synchronization, automatic rescheduling, advanced recurring commitments, notifications or reminders, cloud synchronization, team scheduling, or a final scheduling algorithm in this feature.

### Key Entities *(include if feature involves data)*

- **Commitment**: A user-defined activity occupying a specific period of a single calendar day and distinct from a task. It has a stable identity, a required title, an optional description, a required date, a required start time, a required end time, and a required type.
- **Commitment Type**: The scheduling nature of a commitment. **Fixed** means the scheduled period must be respected and only changed by explicit user action. **Flexible** means the activity may be considered for future planning suggestions but must never be rescheduled automatically without user approval.
- **Time Conflict (Overlap)**: A condition where two or more commitments on the same date have intersecting time periods. It is identified and communicated before saving and remains visible while it exists; it never causes automatic changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of first-time guest users can create a valid commitment with an explicitly chosen type, date, and time period without assistance in under 1 minute.
- **SC-002**: 100% of tested invalid inputs—missing or whitespace-only title, missing or invalid date, missing or malformed times, and equal or reversed ranges—are rejected with visible and assistive-technology-announced feedback, with zero saved records.
- **SC-003**: 100% of tested overlap shapes—partial, containment, identical, multiple, and edit-time—are identified before saving with every conflicting commitment's title and time range, and zero existing commitments are changed.
- **SC-004**: 100% of saved commitments are restored after reloading or returning in the same browser/device context; zero failed saves are presented as successful or appear in the saved commitment list.
- **SC-005**: In 100% of tested views, commitment types and conflicts are distinguishable using text in grayscale or forced-color modes, with zero cases relying on color alone.
- **SC-006**: Keyboard-only users can complete create, edit, delete, date navigation, and conflict acknowledgment in 100% of tested critical journeys, with errors and status changes announced and focus managed predictably.
- **SC-007**: 100% of user-facing strings in tested flows are available in English and Spanish, with no missing translations, and dates and times follow the active locale's conventions.
- **SC-008**: For 100% of saved commitments, a future Daily Agenda consumer can retrieve the stable identity, title, description, date, start time, end time, and type by date in an integration check.
- **SC-009**: 100% of dates without commitments show an empty state with a create action, and 100% of create, update, and delete actions show visible success feedback; no false empty state is shown while stored data is still being checked.
- **SC-010**: Zero silent modifications occur across tested conflict acknowledgments, language changes, device timezone changes, and multi-tab scenarios; 100% of tested saves from an outdated tab are blocked until reload with an accessible reload path.
- **SC-011**: 100% of delete actions require confirmation that identifies the commitment; cancelling the confirmation leaves the commitment unchanged.
- **SC-012**: In 100% of tested storage-unavailable, storage-cleared, and corrupt-data scenarios, the application remains usable, informs the user, preserves valid data, and never reports an unsaved commitment as saved.
- **SC-013**: The local-only data-loss warning is present, readable, and accessible in both supported languages before or at the point of the user's first save in 100% of tested first-use flows.
- **SC-014**: 100% of tested core commitment flows remain operable without loss of functionality or horizontal scrolling at phone, tablet, and desktop widths and at browser zoom up to 200%, with touch targets meeting WCAG 2.2 AA minimum size.
- **SC-015**: 100% of tested title, description, or type edits to an overlapping commitment save without a second acknowledgment, while the conflict indication remains visible; edits that change date or times and still overlap require acknowledgment.
- **SC-016**: 100% of new commitment forms opened from a viewed date start with that date pre-filled and allow the user to change it before saving.

## Dependencies

- **Language and locale preferences**: The English/Spanish experience depends on the application's existing language preference and locale context. When no preference exists, English is the fallback.
- **Local browser/device storage**: Guest persistence depends on local storage being available and writable. The feature must degrade safely when it is not.
- **Future Daily Agenda**: The Daily Agenda consumes commitment data by date. This feature must keep that data available but does not own the agenda's timeline presentation.
- **No external services**: Commitment management must remain fully usable offline and when weather or other optional services are unavailable.

## Assumptions

- **No default commitment type**: Every new commitment requires an explicit fixed or flexible choice so the user consciously classifies how the activity may be treated in planning.
- **Viewed-date default**: A new commitment form starts on the date the user is currently viewing, reducing date errors when planning another day. The date remains editable.
- **Outdated-tab protection**: When newer local data is detected, a tab blocks further saves until it reloads rather than offering an overwrite path. Reloading is treated as the safe recovery action.
- **Conflict acknowledgment scope**: Acknowledgment is required for new overlaps and for edits that change the date or times while the result still overlaps. Title, description, and type edits do not repeat the acknowledgment, but the conflict indication remains visible.
- **Overlaps are advisory, not prohibited**: Users may have legitimate double-booked periods, so an acknowledged overlap is allowed and never triggers automatic changes. The acknowledgment exists to make the conflict explicit.
- **Same-day commitments only**: Commitments start and end on the same calendar date. The form has no all-day or multi-day input, and cross-midnight or multi-day requests are rejected rather than converted.
- **Local wall-clock semantics**: A commitment's date and times represent what the user entered in their local calendar context. Changing the device timezone or daylight-saving state does not silently move the commitment.
- **Locale-driven time presentation**: Dates and times follow the active formatting locale. The app does not expose a separate time-format preference in this version; switching the interface language never changes stored dates or wall-clock times.
- **Any valid calendar date is allowed**: Past, present, and future dates are accepted; no restriction is placed on scheduling commitments in the past.
- **Reasonable text limits**: A title is required and limited to 120 characters. A description is optional and limited to 500 characters. Blank descriptions are treated as absent. These limits are product safeguards and must be communicated through validation messages.
- **Text limits use user-perceived characters**: The 120-title and 500-description limits are measured in Unicode grapheme clusters, so emoji and accented characters count as users perceive them.
- **One commitment day view**: Commitments are viewed one date at a time, defaulting to the current date. Week, month, and multi-day views are not required by this feature.
- **Conflict scope**: Conflict identification considers commitments only. Conflicts with tasks, weather, or other future planning data are outside this feature.
- **Commitments are not tasks**: Commitments do not have completion status, priority, or task-specific behavior.
- **Guest-only storage**: This feature targets guest use. Cloud synchronization and authenticated cross-device behavior are separate future work.
- **No scheduling intelligence in this feature**: Fixed and flexible types are recorded and respected, but no suggestions, rescheduling, or scheduling algorithm is implemented here.
- **User content is not localized**: Titles and descriptions are shown exactly as entered and are not translated.

## Constitution Alignment

- **XVII Frontend Server State and Async UX**: This feature introduces no server state. Guest data is local, and the required busy, empty, error, success, and failure states are specified.
- **XVIII Data Integrity and Persistence**: No backend or relational persistence is introduced. Local guest data integrity, recovery, and failure communication are specified.
- **XIX External Integrations**: No weather or other external integration is used. Commitment management remains usable offline and when optional services fail.
- **XX Technology and Dependency Governance**: This feature introduces no new technology or runtime dependency.

## Out of Scope

- External calendar synchronization.
- Automatic rescheduling of any commitment.
- Advanced recurring commitments.
- Notifications and reminders.
- Cloud synchronization and cross-device commitment access.
- Team scheduling or shared commitments.
- Cross-midnight, all-day, and multi-day commitments.
- Conflict detection involving tasks, weather, or available-time calculation.
- Drag-and-drop rescheduling or bulk commitment operations.
- Import, export, search, and filtering of commitments.
- Dashboard and Daily Agenda visual composition; only data availability is in scope.
- Undo or restoration after a confirmed deletion.
- Definition of a final scheduling algorithm or technical data model.
