# Feature Specification: Task Management

**Feature Branch**: `002-task-management`

**Created**: 2026-11-05

**Updated**: 2026-11-12

**Status**: Draft

**Input**: User description: "Create a specification for the Task Management feature of Walday. The goal is to allow users to manage their daily tasks through a simple and intuitive experience, initially without requiring an account."

## 1. Purpose and Scope

### 1.1 Purpose

Define the product behavior of Walday's first core business feature: guest task management. This specification establishes the task lifecycle, validation, organization, accessibility, localization, and local persistence behavior that future features, especially Daily Agenda and Planning Suggestions, MUST consume.

This specification defines observable product behavior and business rules. It does not define the final database schema, API contracts, backend architecture, or the implementation of local persistence.

This specification is governed by:

- `docs/product-overview.md` for product vision, MVP scope, business rules, accessibility, and localization.
- `.specify/memory/constitution.md` for engineering standards and constitutionally protected behavior.

### 1.2 In Scope

| Area                     | Included capability                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Guest access             | Full task lifecycle without an account, authenticated session, or backend.                                             |
| Task creation            | Required meaningful title, optional description, sensible defaults, and explicit validation.                           |
| Task editing             | Editable task details with explicit save and cancel behavior.                                                          |
| Task deletion            | Explicit deletion with meaningful confirmation and safe cancellation.                                                  |
| Completion status        | Toggle between pending and completed without deleting the task.                                                        |
| Priority                 | Low, medium, and high priority with a default and text-based presentation.                                             |
| Due date                 | Optional calendar date that does not assign a time slot.                                                               |
| Estimated duration       | Optional positive duration in canonical minutes for planning context.                                                  |
| Display and organization | Pending and completed grouping, deterministic ordering, metadata display, empty and all-completed states.              |
| Validation and errors    | Field-level and form-level validation with localized, accessible feedback.                                             |
| Feedback                 | Success, pending, failure, retry, and status announcements for all mutations.                                          |
| Local persistence        | Versioned, validated guest task storage and restoration in the same browser and device context.                        |
| Resilience               | Graceful behavior for unavailable, corrupt, incompatible, or full local storage; multi-tab changes; no lost updates.   |
| Accessibility            | Keyboard operation, focus management, screen-reader semantics, target sizes, zoom, and non-color status communication. |
| Localization             | English and Spanish user-facing text, runtime language switching, and locale-aware date and duration presentation.     |
| Future consumption       | Stable task identity, status, priority, due date, and duration semantics for Daily Agenda and Planning Suggestions.    |

### 1.3 Out of Scope

The following are explicitly out of scope for this feature:

- Authentication, account creation, sign-in, session management, and guest-to-account migration.
- Cloud synchronization, cross-device synchronization, collaboration, sharing, and public tasks.
- Backend implementation, API endpoints, database schema, Prisma models, and server-side persistence.
- Recurring tasks, subtasks, dependencies, projects, tags, labels, and task templates.
- Calendar integrations, external calendar synchronization, automatic scheduling, and time-slot assignment.
- AI-based recommendations, predictive planning, optimization algorithms, and automatic agenda changes.
- Notifications, reminders, push messages, email, and background alerts.
- Search, filtering, custom sorting controls, bulk actions, drag-and-drop reordering, undo history, and trash recovery.
- Attachments, images, rich-text descriptions, and file uploads.
- Analytics, productivity reports, streaks, gamification, and usage tracking.
- PWA installation, service workers, background synchronization, and offline queueing beyond browser-local persistence.
- Dark theme, advanced animations, branding assets, and detailed visual design.
- Final storage keys, storage envelope shape, migration code, and component structure.

### 1.4 Deferred to Planning

The following decisions MUST be evaluated during planning and MUST NOT be treated as fixed by this specification:

- Whether task creation, editing, and deletion are presented inline, in a dialog, in a drawer, or on a dedicated route, provided all requirements in this specification are met.
- Whether the task list uses simple sections, cards, or another presentation, provided pending/completed grouping and ordering rules are satisfied.
- The exact accessible confirmation pattern for deletion, provided it identifies the task, requires explicit confirmation, and manages focus correctly.
- The exact presentation and wording of the confirmation shown before unreadable stored records would be discarded, provided it identifies the data at risk, requires explicit confirmation, and allows cancellation.
- The exact mechanism for accepting friendly duration input while resolving it to canonical minutes.
- The exact visual treatment of priority, past-due status, completion, and metadata, provided information is conveyed by more than color.
- The versioned guest storage envelope, migration implementation, and multi-tab conflict-detection mechanism, provided no silent data loss is possible.
- The virtualization or windowing threshold for large lists, provided the stated performance outcome is met.
- Whether optional task counts or summary indicators are displayed.
- Test organization, coverage exclusions, and accessibility tooling details.
- The future contract by which Daily Agenda and Planning Suggestions consume task data.

## Clarifications

### Session 2026-11-06

- Q: What priority levels should tasks support? -> A: Low, medium, and high, with medium as the default.
- Q: Should a task title have a minimum length? -> A: At least 3 user-perceived characters after trimming.
- Q: How should tasks be organized by default? -> A: Pending tasks first, then completed tasks; newest first within each group.
- Q: What unit should estimated task duration use? -> A: Free-text input such as "30 min" or "1h". **Superseded by Session 2026-11-12** so that planning features can consume a reliable canonical value.

### Session 2026-11-12

- Q: How must estimated duration be represented so future planning features can consume it? -> A: A positive whole number of minutes, displayed in a localized human-readable form. Friendly input such as "1h" or "30 min" MAY be accepted only when it resolves to that canonical value; unparseable input MUST be rejected. This supersedes the free-text decision from Session 2026-11-06.
- Q: Does a due date assign a time of day? -> A: No. A due date is an optional calendar date only. It does not assign a time slot, does not shift with timezone changes, and remains valid without a due date or estimated duration.
- Q: What does "newest first" mean? -> A: The most recently created task appears first within its group. Editing a task does not change its position. Completing a task moves it to the completed group. Equal creation times MUST produce a deterministic, stable order.
- Q: Are duplicate task titles allowed? -> A: Yes. Each task is a distinct item and title uniqueness is not required.
- Q: How are edits committed? -> A: Editing uses explicit save and cancel actions. Changes MUST NOT be persisted on blur, keystroke, or navigation without an explicit save.
- Q: What must deletion confirmation do? -> A: It MUST identify the affected task, require explicit confirmation, and allow cancellation. After confirmation, deletion is permanent; undo and trash recovery are out of scope.
- Q: What happens when local storage is unavailable? -> A: The user can continue working in the current session in memory, but the application MUST show an accessible warning that changes may not be saved and MUST NOT claim that persistence succeeded.
- Q: What happens when stored task data is corrupt or partially invalid? -> A: Valid records MUST be restored, invalid records MUST be isolated without crashing the application or destroying the raw stored data, and the user MUST be informed that some tasks could not be restored.
- Q: What happens when multiple tabs or windows are open? -> A: Changes made in another tab MUST be reflected or explicitly surfaced as newer data. A stale tab MUST NOT silently overwrite newer task data.
- Q: What are the maximum field lengths and duration bounds? -> A: Title 3 to 200 user-perceived characters after trimming, description up to 2000 user-perceived characters after trimming, and estimated duration 1 to 1440 minutes when provided.
- Q: When all tasks are completed, should the empty state appear? -> A: No. The empty state applies only when no tasks exist. Completed tasks remain visible in their group.
- Q: What accessibility baseline applies? -> A: Keyboard-only completion of every task journey, VoiceOver with Safari on macOS and iOS, 200% text resizing, 400% zoom, and supported viewport widths.
- Q: When a task with a due date in the past is marked completed, should it still be shown as past due? -> A: No. Past-due status applies only to pending tasks; completed tasks display their due date without an overdue label.
- Q: When a task action succeeds in memory but cannot be saved to local storage, what should the success feedback tell the guest? -> A: The action is announced as completed for the current session only, together with a statement that it was not saved and the persistent storage warning.
- Q: When some stored task records could not be restored, what must happen before a later save replaces the stored data that contains them? -> A: Persistence is blocked until the guest explicitly confirms discarding the unreadable records; canceling keeps the session in memory only and leaves the stored data untouched.
- Q: After a task's completion is toggled and it moves to the other status group, where should keyboard focus go? -> A: Focus remains on that task's completion control after the task moves, so the user can verify or reverse the change immediately.
- Q: How should the title and description length limits count emoji and combined Unicode characters? -> A: In user-perceived characters (grapheme clusters), so one emoji or combined character counts as one; trimming is applied before counting.

## 2. User Scenarios & Testing

Priority indicates implementation order, not optionality. Every requirement in Section 3 is mandatory regardless of story priority.

### User Story 1 - Create and view tasks as a guest (Priority: P1)

As a guest user, I can create tasks with a meaningful title and optional details, and see them in my task list, so that I can track what I need to do without creating an account.

**Why this priority**: Capturing tasks is the core value of the feature and the foundation for every later task interaction.

**Independent Test**: Open the task surface with no tasks, create a task using only a title, then create another with all optional fields, and verify both appear with the correct defaults, values, and localized feedback.

**Acceptance Scenarios**:

1. **Given** a guest with no tasks, **When** the guest submits a valid title, **Then** a pending task is created with medium priority, no description, no due date, and no estimated duration, and it appears in the pending group.
2. **Given** a guest creating a task, **When** the guest provides a description, priority, due date, and estimated duration, **Then** the task is saved with exactly those values and all provided metadata is visible.
3. **Given** a title with leading or trailing whitespace, **When** the task is saved, **Then** the stored and displayed title is trimmed and remains valid.
4. **Given** a title shorter than 3 user-perceived characters, whitespace only, or longer than 200 user-perceived characters, **When** the guest submits, **Then** the task is not created, a localized and accessible error identifies the title field, the input remains available, and focus remains usable.
5. **Given** an existing task title, **When** the guest creates another task with the same title, **Then** both tasks are created as distinct items.
6. **Given** a successful creation, **When** the form completes, **Then** the form resets to its default values, focus returns to the title field, and the creation is announced to assistive technologies.
7. **Given** a guest using the feature, **When** any task action is performed, **Then** no account, sign-in, backend, or network connection is required.

---

### User Story 2 - Edit tasks safely (Priority: P1)

As a user, I can edit a task's title, description, priority, due date, and estimated duration, then either save or cancel, so that I can correct information without accidental changes.

**Why this priority**: The task lifecycle is incomplete without safe correction of existing tasks.

**Independent Test**: Edit every editable field on an existing task, save and verify persistence, then reopen editing, change values, cancel, and verify the original values remain unchanged.

**Acceptance Scenarios**:

1. **Given** an existing task, **When** the user edits one or more fields and explicitly saves, **Then** the updated values are displayed, persisted, and announced while the task identity and creation order remain unchanged.
2. **Given** an existing task, **When** the user changes fields and cancels, **Then** no change is saved, the original values remain visible, and focus returns to a logical control.
3. **Given** an edit with an invalid title, due date, or duration, **When** the user attempts to save, **Then** no field is partially applied, the original task remains intact, localized field errors are shown, and the user's input is preserved.
4. **Given** a pending or completed task, **When** the user edits non-status fields, **Then** the completion status does not change.
5. **Given** an edited task, **When** the edit is saved, **Then** the task does not change position within its group solely because it was edited.
6. **Given** a task deleted or changed in another tab, **When** the user saves an edit based on stale data, **Then** the user is informed of the conflict and the newer data is not silently overwritten.

---

### User Story 3 - Delete tasks with explicit confirmation (Priority: P1)

As a user, I can delete a task only after an explicit confirmation that identifies the task, so that destructive actions are intentional and recoverable by cancellation.

**Why this priority**: User control and trust require that destructive actions never occur accidentally.

**Independent Test**: Request deletion, cancel once, then request deletion and confirm; verify the task remains after cancellation and disappears after confirmation, including persistence after reload.

**Acceptance Scenarios**:

1. **Given** an existing task, **When** the user requests deletion, **Then** the task is not removed until the user explicitly confirms, and the confirmation identifies the task by its title.
2. **Given** a pending deletion confirmation, **When** the user cancels or dismisses it, **Then** the task remains unchanged, no data is written or removed, and focus returns to the invoking control.
3. **Given** a pending deletion confirmation, **When** the user confirms, **Then** the task is permanently removed, the list updates immediately, and the deletion is persisted and announced.
4. **Given** a completed task, **When** the user deletes and confirms, **Then** it is removed using the same confirmation behavior as a pending task.
5. **Given** the last remaining task, **When** the user confirms its deletion, **Then** the localized empty state appears with a primary action to create a task.
6. **Given** any task, **When** the user marks it completed, **Then** completion MUST NOT delete the task or trigger deletion confirmation.
7. **Given** a deletion that cannot be persisted, **When** the operation fails, **Then** the task is not falsely reported as deleted, the failure is communicated, and retry is available when meaningful.

---

### User Story 4 - Persist and restore guest tasks (Priority: P1)

As a guest, I can leave Walday and return in the same browser and device to find my tasks, statuses, and ordering restored, so that my planning survives application sessions.

**Why this priority**: Guest persistence is a core promise of the product and a prerequisite for daily planning.

**Independent Test**: Create, edit, complete, and delete tasks, reload the application, and verify the remaining tasks and their values are restored exactly; then test unavailable, corrupt, cleared, and incompatible storage states.

**Acceptance Scenarios**:

1. **Given** saved guest tasks, **When** the guest returns in a later session on the same browser and device, **Then** all valid tasks and their titles, descriptions, priorities, due dates, durations, completion statuses, and ordering are restored.
2. **Given** local storage is unavailable, **When** the guest uses task management, **Then** task operations remain usable in the current session, an accessible warning states that changes may not be saved, success feedback identifies the change as applying only to the current session, and the application does not claim successful persistence.
3. **Given** stored data that is corrupt or partially invalid, **When** the application loads, **Then** all valid tasks are restored, invalid records are isolated without crashing the application, raw stored data is not silently destroyed, and the guest is informed that some tasks could not be restored; a later write that would replace the unreadable records is blocked until the guest explicitly confirms discarding them.
4. **Given** storage was cleared or the guest changes devices or browsers, **When** the application loads, **Then** no tasks are restored, a localized empty state is shown, and the guest is informed that local data is limited to the original browser and device.
5. **Given** stored data written by an older supported schema version, **When** the application loads, **Then** valid data is migrated safely and remains usable.
6. **Given** stored data written by an unsupported newer schema version, **When** the application loads, **Then** the data is not silently downgraded, overwritten, or deleted, and the guest is informed that the data cannot be read safely.
7. **Given** a storage write fails because of quota, permissions, or another recoverable error, **When** the guest performs a task action, **Then** the in-memory change is retained, success feedback states that the change applies only to the current session and was not saved, the persistence failure is communicated accessibly, and the guest can retry when meaningful.
8. **Given** the same guest data is open in more than one tab or window, **When** one tab changes a task, **Then** other tabs reflect the change or explicitly indicate that newer data exists, and no tab silently overwrites newer data.

---

### User Story 5 - Mark tasks complete or pending (Priority: P2)

As a user, I can mark a task completed or return it to pending, so that I can track progress without losing the task or its details.

**Why this priority**: Completion is central to daily progress tracking and must preserve planning history for future features.

**Independent Test**: Toggle a pending task to completed and back to pending, verifying that it remains visible, moves between groups, keeps its metadata, persists, and announces the state change.

**Acceptance Scenarios**:

1. **Given** a pending task, **When** the user marks it completed, **Then** it remains in the task list within the completed group, is not deleted, the change is persisted, and keyboard focus remains on that task's completion control after it moves.
2. **Given** a completed task, **When** the user marks it pending, **Then** it returns to the pending group with all details and metadata intact, and keyboard focus remains on that task's completion control after it moves.
3. **Given** any completion change, **When** it occurs, **Then** the status is exposed through semantic state and text, is not communicated by color alone, and is announced to assistive technologies.
4. **Given** a completed task, **When** it is viewed, **Then** its title, description, priority, due date, and estimated duration remain available.
5. **Given** a completion change that cannot be persisted, **When** the operation fails, **Then** the failure is communicated and the interface does not falsely claim that the change was saved.

---

### User Story 6 - Prioritize, set a due date and effort estimate, and organize tasks (Priority: P2)

As a user, I can assign priority, an optional due date, and an optional estimated duration, and I can see pending and completed tasks organized predictably, so that I can understand what matters and what is urgent.

**Why this priority**: These attributes supply the planning context that later agenda and suggestion features depend on, without assigning tasks to a time slot.

**Independent Test**: Create tasks with different priorities, due dates, and durations, verify their display and grouping, clear optional values, and confirm the deterministic order after edits and completion changes.

**Acceptance Scenarios**:

1. **Given** a new task, **When** no priority is chosen, **Then** the task uses medium priority, and the priority is shown as a localized text label rather than by color alone.
2. **Given** a task, **When** the user sets a due date, **Then** the task is associated with that calendar date only, no time slot is assigned, and the date is displayed according to locale and user preferences where available.
3. **Given** a task without a due date, **When** it is viewed or edited, **Then** it remains valid and is not treated as incomplete or invalid.
4. **Given** a pending task whose due date is before the current local date, **When** it is displayed, **Then** it is identifiable as past due through text, not color alone; a completed task with the same due date is not marked past due.
5. **Given** a task with a due date, **When** the user clears the date, **Then** the due date is removed and the task remains valid.
6. **Given** a task, **When** the user provides a friendly duration such as "30 min" or "1h", **Then** it is resolved to a positive whole number of minutes, displayed in a localized human-readable form, and remains optional.
7. **Given** a duration of zero, a negative value, an unparseable value, or a value above the allowed maximum, **When** the user attempts to save, **Then** the task is not saved with that value and an accessible field error explains the requirement.
8. **Given** tasks in both statuses, **When** the list is displayed, **Then** all pending tasks appear before completed tasks, and within each group the most recently created task appears first.
9. **Given** two tasks with indistinguishable creation times, **When** the list is displayed or reloaded, **Then** their relative order is deterministic and stable.
10. **Given** a task whose priority, due date, or duration is edited, **When** the edit is saved, **Then** the task does not change position solely because of the edit.
11. **Given** a task marked completed, **When** the list updates, **Then** it moves to the completed group while all metadata remains intact.
12. **Given** only completed tasks, **When** the list is displayed, **Then** the completed group remains visible and the global empty state is not shown.
13. **Given** a task with a long title or description, **When** it is displayed on a narrow viewport, **Then** content wraps without clipping or horizontal scrolling and the full content remains available.

---

### User Story 7 - Manage tasks accessibly and in English or Spanish (Priority: P2)

As a keyboard, screen-reader, English-speaking, or Spanish-speaking user, I can complete every task journey with clear labels, announcements, focus behavior, and localized formatting.

**Why this priority**: Accessibility and English/Spanish support are mandatory product and constitutional requirements from the initial release.

**Independent Test**: Complete create, edit, delete, completion, and restore journeys using only a keyboard and VoiceOver with Safari; repeat in English and Spanish; verify labels, errors, announcements, focus, formatting, zoom, and responsive behavior.

**Acceptance Scenarios**:

1. **Given** a keyboard-only user, **When** the user creates, edits, completes, and deletes tasks, **Then** every action is reachable and operable without a pointer, with a logical focus order and visible focus.
2. **Given** a deletion confirmation or other modal interaction, **When** it opens and closes, **Then** focus moves into it, is contained while it is open, Escape cancels when safe, and focus returns to the invoking control when it closes.
3. **Given** a form with validation errors, **When** submission fails, **Then** each field has a programmatically associated label and error, invalid fields are marked, a summary is provided when multiple errors exist, and the user's input is preserved.
4. **Given** a create, edit, delete, completion, restore, or persistence failure, **When** the state changes, **Then** the change is announced through an appropriate live region without moving focus unexpectedly.
5. **Given** repeated controls for multiple tasks, **When** a screen reader enumerates them, **Then** each control's accessible name includes the relevant task context, such as its title.
6. **Given** any task status or priority, **When** it is displayed, **Then** meaning is conveyed through text and semantics, not color alone, and text and interface elements meet WCAG 2.2 AA contrast.
7. **Given** English or Spanish, **When** the language is active, **Then** all user-facing task text, labels, validation messages, confirmations, empty states, and announcements appear in that language, with English fallback for missing translations.
8. **Given** a language change while tasks exist or a form has unsaved input, **When** the language changes, **Then** the interface updates without a full reload, tasks are unchanged, and unsaved input is preserved.
9. **Given** a locale and available user preferences, **When** due dates and durations are displayed, **Then** formatting follows the locale and preferences, while the underlying due date remains the same calendar date across timezone changes.
10. **Given** 200% text resizing, 400% zoom, or a 360-pixel-wide viewport, **When** tasks are managed, **Then** content reflows without loss of information, control, or horizontal scrolling.
11. **Given** a user who prefers reduced motion, **When** task states change, **Then** no non-essential motion is required to understand the change.

---

### Edge Cases

- **Title boundaries**: A title of 2 trimmed user-perceived characters is rejected; a title of exactly 3 trimmed user-perceived characters is accepted; a title of exactly 200 trimmed user-perceived characters is accepted; a title of 201 trimmed user-perceived characters is rejected.
- **Whitespace-only input**: Title, description, and optional text fields containing only whitespace are treated as empty; an empty title is invalid, and an empty optional value is stored as absent.
- **Unicode and emoji**: Titles and descriptions accept Unicode content without corruption; length limits are counted in user-perceived characters after trimming, so one emoji or combined character counts as one.
- **HTML or script content**: Titles and descriptions containing HTML-like or script-like text are displayed as plain text and are never executed or interpreted as markup.
- **Duplicate titles**: Duplicate titles are valid and produce distinct tasks with distinct identities.
- **Double submission**: A repeated or rapid submission creates exactly one task and does not produce duplicate records.
- **Invalid priority**: A priority outside low, medium, or high is rejected from user input and never silently coerced in stored data.
- **Nonexistent calendar dates**: Invalid dates such as a nonexistent day of the month are rejected, including on edit.
- **Date boundaries**: Today, past dates, and future dates are valid due dates; a date before today is displayed as past due while the task is pending and is not marked past due once the task is completed; a due date does not create a time slot.
- **Timezone changes**: Changing the device timezone does not shift a stored due date to another calendar day.
- **Clearing optional values**: Clearing a due date or duration removes the value and leaves the task valid.
- **Zero, negative, fractional, or excessive duration**: These values are rejected when they cannot be resolved to a positive whole number of minutes within the allowed range.
- **Friendly duration input**: Input such as "1h", "90 min", or "1 h 30 min" resolves to the same canonical minutes when parseable; ambiguous or unparseable text is rejected with an accessible explanation.
- **Task without time metadata**: A task with no due date and no estimated duration remains fully valid and usable.
- **Completed tasks**: Completion never deletes a task, never removes metadata, and never prevents editing or deletion; when a toggled task moves between groups, keyboard focus stays on that task's completion control.
- **All tasks completed**: The completed group remains visible and the global empty state does not appear.
- **Last task deleted**: The empty state appears with an action that returns focus to the task-creation control.
- **Edit conflict**: Saving an edit after another tab changed or deleted the same task does not silently overwrite or resurrect newer data.
- **Delete while editing**: If a task is deleted while being edited in another tab, saving the stale edit does not recreate or overwrite the task without informing the user.
- **Storage unavailable**: The feature remains usable in memory, with a visible, accessible warning; success feedback states that the change applies only to the current session, and no message claims that persistence succeeded.
- **Storage quota exceeded**: In-memory changes are preserved, success feedback states that the change was not saved, the failure is reported, and the user can retry after freeing space.
- **Storage cleared while open**: Clearing browser storage while the application is open does not crash the application or falsely claim that current changes are safely persisted; the user is informed.
- **Corrupt storage**: Malformed JSON, a non-array value, wrong field types, missing required fields, and invalid records do not crash the application; valid records are recovered.
- **Duplicate stored identities**: Records with duplicate task identities are invalid and are isolated so that task actions never target ambiguous records.
- **Partial corruption**: Valid tasks are restored even when other records are invalid, and the user is informed that some tasks could not be restored; a write that would replace the unreadable records requires explicit confirmation, and canceling it leaves the stored data untouched and the session usable in memory.
- **Unsupported storage version**: Data from a newer unsupported version is preserved and not overwritten; the user is informed that it cannot be read safely.
- **Migration failure**: A failed migration does not destroy the original stored data and does not present partially migrated data as authoritative.
- **Multi-tab updates**: Changes in one tab are reflected in others or surfaced as a conflict; no tab silently loses another tab's newer changes.
- **Long content**: Long titles, descriptions, and Spanish translations wrap or reflow without clipping, overlap, or horizontal scrolling.
- **Locale switch during unsaved editing**: Switching language does not discard unsaved form input or change task content.
- **Missing translation**: A missing Spanish key falls back to English and never renders a raw key, blank label, or runtime error.
- **Screen-reader repetition**: Repeated edit, delete, and completion controls are distinguishable by accessible names that include the task title.
- **External service outage**: Weather, authentication, and backend outages have no effect on task management.
- **Large list**: A list of 500 stored tasks remains usable, ordering remains correct, and task actions respond without blocking the interface.

## 3. Requirements

### 3.1 Guest Access and Feature Independence

- **FR-001**: The system MUST allow a guest to create, view, edit, delete, complete, and reopen tasks without an account, authenticated session, or backend service.
- **FR-002**: Task management MUST remain fully usable when the network, weather service, authentication service, or backend is unavailable.
- **FR-003**: Task operations MUST NOT assign a task to a time slot, schedule a task automatically, reschedule a task, or modify commitments. *Refined by `specs/006-daily-agenda/spec.md`: tasks gain an optional planned slot that only the Daily Agenda may set through an explicit user action. Automatic or inferred scheduling remains prohibited, and task create/edit/complete operations still never assign or change a time slot.*
- **FR-004**: Every task MUST expose stable identity and validated status, priority, optional due date, optional estimated duration, and creation-order information so future Daily Agenda and Planning Suggestions features can consume it.
- **FR-005**: Guest task data MUST remain local to the browser and device context; the feature MUST NOT share data, synchronize it across devices, or require cross-device availability.
- **FR-006**: Future guest-to-account migration MUST be explicit and MUST NOT be implemented or simulated by this feature; local and account data MUST NOT be silently mixed.

### 3.2 Task Creation

- **FR-007**: The system MUST require a meaningful title to create a task.
- **FR-008**: The system MUST allow an optional description.
- **FR-009**: A newly created task MUST default to pending status, medium priority, no description, no due date, and no estimated duration.
- **FR-010**: A title MUST contain at least 3 and at most 200 user-perceived characters (grapheme clusters) after trimming; whitespace-only titles MUST be rejected.
- **FR-011**: Invalid task input MUST prevent creation, preserve the user's input, associate localized errors with the affected field, and MUST NOT create partial data. Length limits count user-perceived characters, so an emoji or combined character counts as one.
- **FR-012**: A successful submission MUST create exactly one task, even under repeated or rapid activation, and duplicate titles MUST remain valid distinct tasks.
- **FR-013**: After successful creation, the form MUST reset to its defaults, focus MUST return to the title field, and the creation MUST be announced to assistive technologies.

### 3.3 Task Editing

- **FR-014**: The system MUST allow the title, description, priority, due date, and estimated duration of an existing task to be edited.
- **FR-015**: Editing MUST require an explicit save action; changes MUST NOT be committed on blur, on keystroke, or on navigation without a save.
- **FR-016**: Editing MUST provide an explicit cancel action that discards unsaved changes and leaves the original task intact.
- **FR-017**: Edit validation MUST apply the same rules as creation; an invalid edit MUST NOT partially update a task.
- **FR-018**: Editing non-status fields MUST NOT change completion status; completion status changes only through an explicit completion action.
- **FR-019**: A saved edit MUST persist, be announced, preserve the task's identity and creation-order position, and MUST NOT reorder the task solely because it was edited.

### 3.4 Task Deletion

- **FR-020**: The system MUST allow deletion of pending and completed tasks only through an explicit user action followed by an explicit confirmation.
- **FR-021**: Deletion confirmation MUST identify the affected task by its title, be keyboard operable, and allow cancellation without changing data.
- **FR-022**: Confirming deletion MUST permanently remove the task and persist the removal; undo, trash, and recovery are not part of this feature.
- **FR-023**: After cancellation, focus MUST return to the control that requested deletion. After confirmed deletion, focus MUST move to a logical next element, such as the next task or the empty-state action.
- **FR-024**: Marking a task completed MUST NOT delete it and MUST NOT open or imply deletion confirmation.
- **FR-025**: A deletion that cannot be persisted MUST NOT be reported as successful; the task MUST remain available and the failure MUST be communicated.
- **FR-026**: When the last task is deleted, the localized empty state MUST appear with a primary action to create a task.

### 3.5 Completion Status

- **FR-027**: The system MUST allow a task to be marked completed and returned to pending; when the task moves between status groups, keyboard focus MUST remain on that task's completion control.
- **FR-028**: Completion changes MUST persist and MUST NOT remove any task data.
- **FR-029**: Completion status MUST be conveyed through semantic state and text, MUST NOT rely on color alone, and MUST be announced to assistive technologies.
- **FR-030**: Completed tasks MUST retain title, description, priority, due date, estimated duration, and identity.
- **FR-031**: Changing completion status MUST update the task's group and position according to the ordering rules in FR-044 through FR-047.

### 3.6 Priority, Due Date, and Estimated Duration

- **FR-032**: Priority MUST be one of low, medium, or high, with medium as the default for new tasks.
- **FR-033**: Priority MUST be displayed with a localized text label and MUST NOT be communicated by color alone.
- **FR-034**: A due date MUST be optional and MUST be a valid calendar date without a time of day.
- **FR-035**: A due date MUST NOT assign a time slot, shift with timezone changes, or become required to create, edit, or complete a task.
- **FR-036**: Users MUST be able to set, change, and clear a due date; a pending task with a due date before the current local date MUST be identifiable as past due through text rather than color alone, and a completed task MUST NOT be marked past due.
- **FR-037**: Estimated duration MUST be optional and MUST be represented canonically as a positive whole number of minutes between 1 and 1440 when provided.
- **FR-038**: The interface MAY accept friendly duration input only when it resolves to the canonical minutes value; ambiguous, unparseable, zero, negative, fractional, or out-of-range values MUST be rejected with localized field feedback.
- **FR-039**: Due dates and durations MUST be displayed in a localized human-readable form consistent with the active locale and user preferences where available.
- **FR-040**: Users MUST be able to change or clear priority, due date, and estimated duration through editing.
- **FR-041**: Invalid priority, due date, or duration values MUST prevent the affected save without modifying the existing task.
- **FR-042**: Estimated duration and due date MUST be treated as planning context, not as a guaranteed execution time or an assigned schedule.

### 3.7 Display and Organization

- **FR-043**: The task list MUST display every task with its title, completion status, and priority, and MUST display description, due date, and estimated duration when present.
- **FR-044**: The task list MUST display all pending tasks before completed tasks.
- **FR-045**: Within each status group, the most recently created task MUST appear first.
- **FR-046**: Tasks with equal creation times MUST have a deterministic, stable relative order across reloads.
- **FR-047**: Editing a task MUST NOT change its position within its group; changing completion status MUST move it to the corresponding group.
- **FR-048**: The empty state MUST appear only when no tasks exist and task restoration has completed successfully; it MUST provide a primary action to create a task.
- **FR-049**: When tasks exist but all are completed, the completed group MUST remain visible and the empty state MUST NOT appear.
- **FR-050**: The interface MUST NOT display an empty state while restoration is pending or while a restoration error is unresolved; a distinct loading or error state MUST be shown instead.
- **FR-051**: Long titles, descriptions, and localized text MUST wrap or reflow without clipping, overlap, loss of content, or horizontal scrolling at supported widths.
- **FR-052**: Completion status, priority, and past-due status MUST be understandable without color alone; past-due status applies only while a task is pending.
- **FR-053**: The task list MUST remain usable with at least 500 tasks, with correct ordering and responsive interactions.

### 3.8 Guest Persistence and Restoration

- **FR-054**: Guest task data MUST persist locally between application sessions in the same browser and device context.
- **FR-055**: All task fields, completion status, and ordering information MUST be restored after a later session.
- **FR-056**: Stored guest data MUST have an explicit schema version, MUST be validated when read, and MUST be migrated safely when a supported older shape is encountered; a failed migration MUST NOT destroy the original data or present partially migrated data as authoritative.
- **FR-057**: Stored records MUST be validated individually so that invalid records do not prevent valid tasks from being restored and do not crash the application; duplicate task identities MUST be treated as invalid.
- **FR-058**: When some records cannot be restored, the system MUST inform the user that some tasks could not be restored and MUST NOT silently destroy the underlying stored data; a write that would replace unreadable records MUST be blocked until the user explicitly confirms discarding them, and canceling that confirmation MUST keep the stored data untouched and the session usable in memory only.
- **FR-059**: When stored data belongs to an unsupported newer schema version, the system MUST NOT overwrite, downgrade, or delete it, MUST inform the user that it cannot be read safely, and MUST keep task management usable without writing over the unreadable data.
- **FR-060**: When local storage is unavailable, the system MUST keep task management usable in memory for the session and MUST show an accessible warning that changes may not be saved.
- **FR-061**: When a storage write fails because of quota, permissions, or another recoverable error, the system MUST retain the in-memory change, communicate the failure accessibly, and offer retry when meaningful.
- **FR-062**: When the same guest data is open in multiple tabs or windows, the system MUST reflect external changes or explicitly surface newer data, and MUST NOT silently overwrite newer data with stale state.
- **FR-063**: When local storage has been cleared or the user changes browsers or devices, the system MUST present an empty state without crashing and MUST inform the user that local data cannot be restored in the new context.
- **FR-064**: The task surface MUST provide an accessible guest-storage notice explaining that locally stored data may be lost if browser storage is cleared or if the user changes devices.
- **FR-065**: Locally stored task data MUST be treated as untrusted external input, validated before use, and MUST NOT contain secrets, credentials, authentication tokens, or sensitive personal data beyond the task content the user enters.

### 3.9 Accessibility

- **FR-066**: Every task action MUST be available through keyboard interaction, with a logical focus order and no keyboard traps.
- **FR-067**: Focus MUST be visible and consistent on every interactive element.
- **FR-068**: Confirmation, edit, and other modal interactions MUST manage focus on open and close, support Escape when cancellation is safe, and return focus to the invoking element.
- **FR-069**: Every form field MUST have a visible, programmatically associated label and accessible instructions where needed.
- **FR-070**: Validation errors MUST be associated with their fields, identify the problem in text, mark invalid fields programmatically, and be summarized accessibly when multiple errors exist.
- **FR-071**: User input MUST be preserved after validation failures whenever the data remains valid to retain.
- **FR-072**: Create, edit, delete, completion, restore, and persistence-failure updates MUST be announced through appropriate live regions without unexpected focus movement.
- **FR-073**: Repeated controls for multiple tasks MUST have accessible names that include the relevant task title, so edit, delete, and completion actions are distinguishable.
- **FR-074**: Interactive targets MUST meet the WCAG 2.2 minimum target size, and essential interactions MUST NOT depend on hover or precise pointer movement.
- **FR-075**: The interface MUST support 200% text resizing and 400% zoom without loss of content or functionality.
- **FR-076**: Text and interface elements MUST meet WCAG 2.2 AA contrast requirements.
- **FR-077**: Motion MUST be minimal and MUST respect `prefers-reduced-motion`; no task state may depend on animation to be understood.

### 3.10 Localization and Formatting

- **FR-078**: All user-facing task text MUST be available in English and Spanish, with English as the fallback for missing translations and for unsupported or unavailable language settings.
- **FR-079**: Labels, instructions, validation messages, confirmations, empty states, errors, success messages, and accessibility text MUST be localized; raw keys, blank labels, and hardcoded user-facing text MUST NOT appear.
- **FR-080**: Users MUST be able to change the interface language without a full application reload and without losing tasks, unsaved form input, or the current task context, including an open edit form or deletion confirmation.
- **FR-081**: Due dates and durations MUST be formatted according to the active locale and user preferences where available.
- **FR-082**: Priority labels, completion status, and all task metadata MUST be presented in the active language.
- **FR-083**: The document language MUST reflect the active locale and MUST update when the language changes.
- **FR-084**: User-entered task content MUST NOT be translated, altered, or normalized beyond the specified trimming rules.
- **FR-085**: Longer Spanish text MUST wrap or reflow without clipping, overlap, or horizontal scrolling at supported viewport widths.

### 3.11 Feedback and Asynchronous UX

- **FR-086**: Every mutation that changes user-visible task data MUST provide accessible success feedback; when the change cannot be persisted, that feedback MUST state that it applies only to the current session and was not saved, and MUST NOT claim persistence.
- **FR-087**: Every operation MUST expose a pending state where processing can be perceived, prevent duplicate submission while pending, and report failure explicitly.
- **FR-088**: Failures MUST NOT be silent; an error MUST provide a localized explanation and a retry action when retry is meaningful.
- **FR-089**: If task restoration is asynchronous, the interface MUST show a layout-matching loading state, mark the region busy, and avoid avoidable layout shift.
- **FR-090**: Empty, loading, error, and success states MUST be distinguishable from one another and MUST NOT misrepresent missing or unreadable data as an empty task list.
- **FR-091**: Task operations MUST NOT depend on network requests or external services.

### 3.12 Performance and Resilience

- **FR-092**: With at least 500 stored tasks, the list MUST render, group, and order tasks correctly, and create, edit, delete, and completion actions MUST remain responsive without blocking the interface.
- **FR-093**: Storage validation, migration, and failure handling MUST be isolated so that a storage problem does not crash the application or prevent in-memory task use.
- **FR-094**: Task data exposed to future features MUST be validated domain data, not raw storage payloads or presentation-layer state.
- **FR-095**: If local storage is cleared or becomes unavailable while the application is open, task management MUST continue without crashing, MUST NOT claim that current changes are safely persisted, and MUST inform the user.
- **FR-096**: Task titles and descriptions MUST be treated as plain text, MUST NOT be interpreted as HTML or executable markup, and MUST NOT be exposed through logs, analytics, or error output.

### 3.13 Validation Rules

- **VR-001 — Guest access**: Every task journey is fully operable without an account, session, backend, or network connection, and no task operation is blocked by weather availability.
- **VR-002 — Title**: After trimming, the title is 3 to 200 user-perceived characters (grapheme clusters), is not whitespace only, is trimmed before storage and display, and invalid titles prevent creation or save.
- **VR-003 — Description**: The description is optional, is trimmed, is stored as absent when empty, and does not exceed 2000 user-perceived characters after trimming when provided.
- **VR-004 — Priority**: Priority is low, medium, or high; new tasks default to medium; invalid values are rejected from input and never silently coerced from stored data.
- **VR-005 — Due date**: The due date is optional, is a valid calendar date without a time of day, does not create a time slot, does not shift across timezones, can be cleared, and may be today, past, or future; past due is indicated only while the task is pending.
- **VR-006 — Estimated duration**: The duration is optional, resolves to a positive whole number of minutes from 1 to 1440, rejects zero, negative, fractional, unparseable, and out-of-range values, can be cleared, and displays in a localized human-readable form.
- **VR-007 — Creation defaults and identity**: A new task is pending with medium priority, no description, no due date, no estimated duration, a stable unique identity, and a creation-order value.
- **VR-008 — Edit integrity**: Edit validation matches creation validation, cancel preserves the original task, invalid edits are never partially applied, non-status edits do not change completion status, and edits do not change creation-order position.
- **VR-009 — Deletion**: Deletion requires explicit confirmation that identifies the task, cancellation preserves the task, confirmed deletion is permanent and persisted, and completion never deletes a task.
- **VR-010 — Ordering**: Pending tasks precede completed tasks; within each group the most recently created task precedes older tasks; equal creation times produce a deterministic stable order; completion moves a task between groups.
- **VR-011 — Empty and status states**: The empty state appears only when no tasks exist and restoration has completed; the all-completed state keeps the completed group visible; loading and error states are never presented as empty.
- **VR-012 — Persistence and restore**: Every task field and status persists locally and is restored in the same browser and device context; restoration completes before the empty state is shown.
- **VR-013 — Storage integrity**: Stored data is versioned and validated on read; supported older versions migrate safely; unsupported newer versions are preserved and reported; invalid records, including records with duplicate identities, are isolated without crashing or destroying valid data; a write that would replace unreadable records requires explicit confirmation and is blocked otherwise.
- **VR-014 — Storage failure and concurrency**: Unavailable, full, permission-restricted, or externally cleared storage does not block in-memory use and never produces a false persistence claim; success feedback for a change that could not be persisted states that it applies only to the current session; multi-tab stale writes never silently overwrite newer data.
- **VR-015 — Accessibility**: Keyboard-only journeys pass; focus is visible and managed, including retention on a task's completion control when it moves between status groups; labels and errors are associated; updates are announced; accessible names include task context; status and priority are not color-only; targets, contrast, zoom, text resizing, and reduced motion meet the stated requirements.
- **VR-016 — Localization and formatting**: All user-facing text exists in English and Spanish or has verified English fallback; no raw keys or hardcoded text appear; language changes preserve data, unsaved input, and the current task context; dates, durations, priorities, and statuses follow the active locale and preferences; document language matches the active locale.
- **VR-017 — Feedback**: Every mutation exposes success, pending, and failure behavior; duplicate submission is prevented; persistence failures and conflicts are communicated; success feedback never claims persistence when the write failed and instead states that the change applies only to the current session; no failure is silent.
- **VR-018 — Performance and responsive behavior**: At least 500 tasks remain usable and correctly ordered; supported widths, 200% text resizing, and 400% zoom show no clipping, overlap, lost functionality, or horizontal scrolling.
- **VR-019 — Scope and security**: Task operations never schedule tasks, modify commitments, require external services, share data, or store secrets, credentials, authentication tokens, or sensitive data beyond the task content entered by the user; task content is rendered as plain text and is not exposed through logs or error output.

### 3.14 Key Entities

- **Task**: A user-defined activity that does not require a time slot. Key attributes: stable identity, title (required), description (optional), priority, optional due date, optional estimated duration, completion status, and creation-order information. Edits preserve identity and creation-order position.
- **Task Status**: The completion state of a task, either pending or completed. Completing a task preserves the task and its metadata; it never deletes it.
- **Priority**: The importance level of a task, one of low, medium, or high, with medium as the default. Priority is presented with localized text and is never conveyed by color alone.
- **Due Date**: An optional calendar date associated with a task. It is date-only, does not assign a time of day or time slot, does not shift across timezones, and may be in the past, present, or future. Past-due status is shown only while the task is pending; completed tasks retain the date without an overdue label.
- **Estimated Duration**: An optional positive whole number of minutes from 1 to 1440 that represents planning context, not a guaranteed execution time. Friendly input is permitted only when it resolves to this canonical value.
- **Guest Task Store**: The local, browser-and-device-scoped persistence of guest tasks. It has an explicit schema version, is validated on read, migrates supported older shapes safely, preserves unsupported newer data, and prevents stale writes from silently overwriting newer data.
- **Task List View**: The presentation of all tasks grouped with pending before completed and newest-created first within each group, including empty, all-completed, loading, error, and large-list states.

## 4. Success Criteria

### 4.1 Measurable Outcomes

- **SC-001**: A guest can create a valid task using only a title in under 30 seconds without assistance, account creation, or sign-in.
- **SC-002**: 100% of tested invalid titles, due dates, durations, and priorities are rejected with localized, accessible field feedback, no partial task change, and preserved input.
- **SC-003**: 100% of tested guest tasks, statuses, metadata, and ordering are restored after a later session in the same browser and device context when storage remains available.
- **SC-004**: 100% of tested deletions require explicit confirmation that identifies the task; cancellation preserves the task; confirmed deletion persists; and no tested completion action deletes a task.
- **SC-005**: 100% of tested lists display every pending task before every completed task, with the most recently created task first within each group and a deterministic order for equal creation times.
- **SC-006**: All task journeys are completable with a keyboard only; automated checks report zero critical or serious WCAG 2.2 AA violations; manual VoiceOver with Safari journeys pass; and focus remains on a task's completion control after it moves between status groups.
- **SC-007**: All user-facing task text is available in English and Spanish or has verified English fallback; switching language updates the interface, document language, and formatting without reload and without losing tasks or unsaved input.
- **SC-008**: Unavailable, corrupt, partially invalid, quota-limited, and unsupported-version storage scenarios complete without an application crash, without silent data loss, and with valid records recovered and failures communicated; any write that would discard unreadable records requires explicit confirmation.
- **SC-009**: Task management remains fully usable with weather, authentication, backend, and network services unavailable, with zero required external requests.
- **SC-010**: A list of 500 tasks renders and remains usable, with task actions completing within 1 second on a modern evergreen browser on a mid-range desktop using the production build without network throttling, and no horizontal scrolling at 360, 768, 1024, or 1440 pixel widths.
- **SC-011**: The empty state never appears before restoration completes or while a restoration error is unresolved; the all-completed state keeps completed tasks visible and does not show the empty state.
- **SC-012**: Completion status, priority, and past-due status for pending tasks are understandable without color in 100% of tested displays, no completed task is marked past due, and text and controls meet WCAG 2.2 AA contrast.
- **SC-013**: In tested multi-tab scenarios, changes made in one tab are reflected or surfaced as a conflict, and no newer task data is silently overwritten by stale state.
- **SC-014**: 100% of user-facing task strings are externalized and localized; no raw keys, blank labels, or hardcoded user-facing text appear.

## 5. Assumptions and Dependencies

- The application foundation from `001-initial-app-foundation` provides the responsive shell, design tokens, localization mechanism, routing, configuration, and quality gates. This feature depends on those foundations and MUST NOT duplicate them.
- When available, `003-user-preferences` supplies language, date presentation, and related formatting preferences. When preferences are unavailable, the active locale and safe defaults apply.
- Guest tasks are stored in browser-local storage. The available capacity is finite, private browsing modes may restrict or reject storage, and users may clear storage at any time.
- No backend, API, authentication, database, cloud synchronization, collaboration, or cross-device availability exists in this feature.
- A due date is a calendar date without a time of day. The user's local calendar date determines whether a pending task is past due, but the stored date itself does not change with timezone. Completed tasks are never marked past due.
- Estimated duration is stored as whole minutes. The 1-to-1440-minute range is a business constant that may be adjusted without changing the surrounding behavior.
- Title and description limits are business constants: 3 to 200 trimmed user-perceived characters for titles and up to 2000 trimmed user-perceived characters for descriptions, where one emoji or combined character counts as one.
- English and Spanish are the only initial locales and are left to right. English is the canonical source and fallback language. Additional locales may be added without structural changes.
- VoiceOver with Safari on macOS and iOS is the manual screen-reader baseline. Keyboard-only testing, automated accessibility checks, 200% text resizing, 400% zoom, and viewport widths of 360, 768, 1024, and 1440 pixels are required.
- "Responsive" performance is measured on a modern evergreen browser on a mid-range desktop using the production build without network throttling; the 1-second action budget applies to the stated 500-task scenario.
- PWA installation, service workers, background synchronization, notifications, and offline queueing are not part of this feature. Local task management works without a network connection.
- Users may accumulate at least 500 guest tasks. No hard task-count cap is specified; storage capacity and the stated performance behavior govern.
- The exact form, list, and confirmation presentation is deferred to planning, provided every behavioral, accessibility, and localization requirement is met.
- Existing companion artifacts (`plan.md`, `tasks.md`, research, data model, quickstart, contracts) and current source code may predate this specification. This specification is authoritative for product behavior, and those artifacts MUST be reconciled during planning and implementation.
- User-entered task titles and descriptions are user content and are not translated by the application.

## 6. Constitution Alignment

| Principle                                                         | Applicability         | How this specification addresses it                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Clean Code, SOLID, and Simplicity**                          | Applies               | Defines one cohesive feature with explicit product rules, avoids speculative scheduling or collaboration behavior, and keeps persistence and presentation responsibilities separate.                                                                  |
| **II. Strict TypeScript and Type Safety**                         | Applies               | Requires validated domain data, rejects untrusted stored input, and requires canonical duration and priority values at the boundary.                                                                                                                  |
| **III. Frontend Architecture: Feature-Sliced Design**             | Applies               | Task behavior, validation, and persistence belong to the task domain and MUST respect FSD layers and public APIs during planning.                                                                                                                     |
| **IV. Backend Architecture and Modular Design**                   | Not applicable        | No backend is implemented or required; FR-002, FR-005, and FR-006 preserve the boundary.                                                                                                                                                              |
| **V. React Component Design and Reusability**                     | Applies               | Requires controlled forms, explicit props, associated validation, and separation of presentation from task rules.                                                                                                                                     |
| **VI. Styling, Design Tokens, and Visual Consistency**            | Applies               | Requires semantic tokens, calm presentation, non-color status communication, responsive behavior, and complete loading, empty, error, and success states.                                                                                             |
| **VII. Testing Strategy and Quality Assurance**                   | Applies               | Requires tested business rules, critical journeys, validation, loading, empty, error, storage, accessibility, localization, and boundary states.                                                                                                      |
| **VIII. Performance and Resource Efficiency**                     | Applies               | FR-053 and FR-092 define large-list usability and responsive actions without premature optimization.                                                                                                                                                  |
| **IX. Scalability, Resilience, and Fault Isolation**              | Applies               | FR-002, FR-060 through FR-063, and FR-093 isolate storage and external-service failures and preserve useful operation.                                                                                                                                |
| **X. API Contracts and Independent Deployment**                   | Not applicable        | No API is introduced; FR-094 requires future consumers to receive validated domain data rather than raw persistence payloads.                                                                                                                         |
| **XI. Constants, Hardcoded Values, and Configuration Management** | Applies               | Title, description, duration, priority, and ordering defaults are named business constants rather than scattered values.                                                                                                                              |
| **XII. Security and Data Protection**                             | Applies               | FR-065 treats local storage as untrusted, validates it on read, prohibits secrets and authentication tokens, and requires no personal data beyond user-entered task content; FR-096 requires plain-text rendering and prohibits logging task content. |
| **XIII. Accessibility and Inclusive Design**                      | Applies               | FR-066 through FR-077 and FR-085 define keyboard operation, focus, forms, announcements, non-color status, targets, contrast, zoom, resizing, and reduced motion.                                                                                     |
| **XIV. Internationalization and Localization**                    | Applies               | FR-078 through FR-085 require English and Spanish, externalized text, fallback, runtime switching, document language, and locale-aware date and duration formatting.                                                                                  |
| **XV. Documentation and Technical Communication**                 | Applies               | Section 5 records dependencies and assumptions; planning MUST reconcile companion artifacts and record durable decisions.                                                                                                                             |
| **XVI. Automated Quality Gates and Git Hooks**                    | Applies               | The definition of done remains the canonical `lint`, `typecheck`, `test`, and `build` contract, with tests for the behaviors in this specification.                                                                                                   |
| **XVII. Frontend Server State and Async UX**                      | Applies               | Guest tasks are local, not server state; persistence MUST be encapsulated behind a storage boundary, versioned, validated, migrated, and never read or written ad hoc by components.                                                                  |
| **XVIII. Data Integrity and Persistence with Prisma**             | Not applicable        | No database or Prisma model is introduced; local persistence MUST still satisfy versioning, validation, migration, and no-silent-loss requirements.                                                                                                   |
| **XIX. External Integrations and Weather Resilience**             | Applies as a boundary | Weather is not consumed; FR-002 requires weather unavailability to have no effect on task management.                                                                                                                                                 |
| **XX. Technology Stack Governance and Dependency Discipline**     | Applies               | The feature introduces no new runtime technology and MUST use the approved stack, including Zod validation and the approved i18n and testing tools.                                                                                                   |

**Conflicts and clarifications**: This specification intentionally adds no product capability outside the Task Management MVP scope. The estimated-duration decision from Session 2026-11-06 was revised because free-text duration cannot reliably serve the planning context required by the product overview. No requirement intentionally contradicts the product overview or the constitution. Decisions that require product or technical analysis are listed in Section 1.4.

## 7. Feature Readiness Gate

Task Management is ready for planning handoff and implementation only when all of the following conditions are satisfied:

1. Every functional requirement in Section 3 and every validation rule in Section 3.13 is implemented and verified.
2. `lint`, `typecheck`, `test`, and `build` pass from a clean install, and tests cover creation, editing, deletion, completion, ordering, validation, empty and all-completed states, persistence and restoration, storage failure modes, multi-tab conflicts, accessibility, and English/Spanish behavior.
3. Keyboard-only journeys and VoiceOver with Safari journeys pass, automated accessibility checks report zero critical or serious violations, and focus management is verified for forms and deletion confirmation.
4. The interface is usable at 360, 768, 1024, and 1440 pixel widths and with 200% text resizing and 400% zoom, without clipping, lost functionality, or horizontal scrolling.
5. All user-facing task text is externalized and available in English and Spanish or has verified English fallback; language changes preserve tasks, unsaved input, and the current task context.
6. Storage versioning, validation, migration, corruption recovery, unavailable storage, quota failure, unsupported versions, and multi-tab behavior are verified with no silent data loss.
7. The 500-task performance outcome is measured on the defined reference environment, and no task interaction blocks the interface.
8. Task management operates without a backend, authentication, network connection, weather service, or other external dependency; no secrets, credentials, authentication tokens, or task content are exposed through logs or error output.
9. `plan.md`, `tasks.md`, research, data model, quickstart, contracts, and source code are reconciled with this specification or explicitly marked as superseded.
10. No out-of-scope capability has been introduced, and all deferred decisions in Section 1.4 are recorded before implementation begins.
