# Feature Specification: Daily Agenda

**Feature Branch**: `006-daily-agenda`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Create a specification for the Daily Agenda feature of Walday. The goal is to provide users with a chronological overview of their day by combining their tasks and commitments in a single understandable interface. This feature must consume the information established by Task Management and Daily Commitments."

## Clarifications

### Session 2026-11-15

- Q: How does a task become a "scheduled task" on the agenda, given that Task Management assigns no time slots? → A: Through an explicit scheduling action in the agenda. The user places a pending task at a start time on a selected date; the planned slot is stored as optional task scheduling data and the end is derived from the task's estimated duration. No automatic scheduling is introduced, and Task Management's own create/edit operations still never assign a time slot.
- Q: Does the Daily Agenda replace Home's current content or live beside it? → A: It replaces and becomes Home's primary content. Home currently renders a read-only commitments list and a separate task summary; those two sections are replaced by one chronological agenda, while the weather and Walday Smart Suggestions surfaces remain. This explicitly supersedes the agenda prohibition in `specs/005-calm-tech-dark-ui/spec.md` (FR-033) and must be recorded as a refinement, not a silent contradiction.
- Q: Which pending tasks appear in the unscheduled area of a selected day — only those with no planned slot at all, or also tasks already planned on another day? → A: Only pending tasks with no planned slot on any date. A task scheduled on another date is considered scheduled and does not appear in the selected day's unscheduled area.
- Q: If a scheduled task's estimated duration is later increased so its planned period would end after midnight, how should the agenda represent it? → A: Keep the task in the timeline at its start time, display the end as the end of the day with a visible text warning that the planned period exceeds the day, treat it as occupied until the end of the day for conflicts and available time, and offer an explicit adjustment action.
- Q: When three or more activities overlap each other, should the summary count one conflict or several? → A: One conflict per connected group of overlapping activities. A three-way overlap is one conflict involving three activities, and each activity names every other activity it overlaps.
- Q: Should a user be able to schedule a task onto a date that has already passed? → A: Yes. Scheduling is allowed on any valid date, including past dates; past dates remain review-oriented and present no available time.
- Q: When task storage cannot be written in the current session, should scheduling actions remain available? → A: Mirror Task Management's storage-state behavior. Scheduling follows whether task changes are allowed in the current state, the same notices are shown, and scheduling is disabled with a plain explanation only when task writes are blocked.

## Relationship to Existing Features

- **Home (spec 005)**: Home becomes the Daily Agenda surface. The current separate "Today's commitments" list and "Tasks" summary are removed from Home and replaced by the agenda. The existing storage/recovery notices, weather surface, and suggestion surface are retained. All Dark UI tokens, radii, `tabular-nums`, focus, motion, and responsive rules from spec 005 continue to apply.
- **Task Management (spec 002)**: The agenda consumes task identity, title, status, priority, optional due date, and optional estimated duration. This feature refines the rule "task operations must not assign a task to a time slot" by adding one explicit, user-initiated scheduling action that is owned by the agenda. Automatic, implicit, or inferred assignment remains prohibited, and due dates still never create a time slot.
- **Daily Commitments (spec 004)**: The agenda consumes commitment identity, title, date, start time, end time, and type (fixed or flexible). Existing overlap acknowledgment and overlap visibility rules remain authoritative for commitment creation and editing; this feature only presents the resulting conflicts and never changes commitment data.
- **User Preferences (spec 003)**: Selected language and date/time presentation apply to all agenda labels, dates, and times. No new preference is introduced.
- **Product Overview (§5.1, §5.4, §9)**: The agenda is part of the daily dashboard, presents a chronological combination of commitments and planned activities, distinguishes scheduled from unscheduled tasks, never reschedules fixed commitments, and never changes the user's data without explicit authorization.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the whole day in one chronological agenda (Priority: P1)

As a user, I open Home and see my day as a single chronological timeline that combines my fixed commitments, my flexible commitments, and my scheduled tasks, with all remaining pending tasks kept visible in an unscheduled area, so that I understand my day without consulting several lists.

**Why this priority**: A unified, chronological daily overview is the entire value of the feature. Without it, nothing else in the agenda is meaningful.

**Independent Test**: Can be tested by preparing a day with fixed commitments, flexible commitments, scheduled tasks, and unscheduled pending tasks, opening Home, and verifying that every activity appears exactly once, in ascending start-time order, with its type, time range, and task completion status visible, while unscheduled tasks remain visible outside the timeline.

**Acceptance Scenarios**:

1. **Given** a day containing two commitments and two scheduled tasks, **When** the user opens Home, **Then** all four activities appear once each in the timeline in ascending start-time order, and each shows its title, start time, end time, category, and, where applicable, task completion status and priority.
2. **Given** a day with a fixed commitment and a flexible commitment, **When** they are displayed, **Then** each is identified by a visible text category label and neither start nor end time differs from the saved value.
3. **Given** a day with pending tasks that have no planned time slot, **When** the timeline is displayed, **Then** every such task remains visible in a separate unscheduled area that is labeled as having no assigned time.
4. **Given** a pending task with a due date matching the selected day but no planned time slot, **When** the agenda is displayed, **Then** the task remains in the unscheduled area and is not placed in the timeline.
5. **Given** a task with a planned time slot that is marked completed, **When** the agenda is displayed, **Then** the task remains at its time position and its completed status is stated in text, not by color or strike-through alone.
6. **Given** a pending task with an estimated duration and no planned slot, **When** the user schedules it at a start time, **Then** it leaves the unscheduled area and appears in the timeline with an end time derived from its duration.
7. **Given** an agenda displaying activities, **When** the user views previously unscheduled tasks, **Then** the unscheduled area is ordered by the same task ordering used by Task Management and is independent of the timeline's chronological sorting.

---

### User Story 2 - Understand conflicts and available time at a glance (Priority: P2)

As a user, I can see which activities overlap and how much unassigned time remains in my day, so that I can make informed planning decisions without the application changing anything for me.

**Why this priority**: Conflict and availability awareness is what turns a list into a planning aid; it is the agenda's main decision support value after the timeline itself.

**Independent Test**: Can be tested by building days with boundary-touching activities, partial overlaps, full containment, identical periods, and multiple simultaneous overlaps, plus days with clear gaps, and verifying that every conflict and every available slot is reported exactly as calculated, with no automatic change to any activity.

**Acceptance Scenarios**:

1. **Given** two activities on the same date whose periods partially intersect, **When** the agenda is displayed, **Then** both are marked as conflicting, each conflict names the other activity and its time range in text, and a conflict summary is present.
2. **Given** one activity whose period fully contains another, **When** the agenda is displayed, **Then** both are identified as conflicting and neither time is altered.
3. **Given** three activities with two independent overlaps, **When** the agenda is displayed, **Then** all conflicts are reported, not only the first one found.
4. **Given** two activities where one ends exactly when the other starts, **When** the agenda is displayed, **Then** no conflict is reported.
5. **Given** a scheduled task overlapping a fixed commitment, **When** the agenda is displayed, **Then** the conflict is reported and the fixed commitment retains its saved start and end times.
6. **Given** an overlap involving a flexible commitment, **When** the conflict is reported, **Then** the flexible commitment is labeled as adjustable in text and is not moved.
7. **Given** a day with activities separated by gaps, **When** the agenda is displayed, **Then** each gap of at least 30 minutes is presented as an available period with its start and end time, and the total available time equals the sum of the presented periods.
8. **Given** an available period, **When** the user interacts with it, **Then** it is presented as unassigned time and no task is assigned, moved, or implied to occupy it.
9. **Given** a day whose only gap between activities is 20 minutes, **When** the agenda is displayed, **Then** no available period is shown for that gap and the day's available time total reflects only presented periods.
10. **Given** the current date, **When** available time is shown, **Then** only the remaining part of the day is presented as available and elapsed time is never shown as available.

---

### User Story 3 - Place a pending task into the day and take it back out (Priority: P3)

As a user, I can explicitly schedule a pending task at a start time on a date and later remove it from the timeline, so that my agenda reflects how I intend to spend my day, with no automatic scheduling and no change to the task itself beyond the slot I chose.

**Why this priority**: Without explicit scheduling, no task could ever appear as a scheduled activity. It depends on the timeline from Story 1 but is narrower in scope.

**Independent Test**: Can be tested by scheduling a pending task, verifying its derived end time and its timeline position, rescheduling it to a different time, removing the schedule, and confirming the task returns to the unscheduled area with its content and status unchanged.

**Acceptance Scenarios**:

1. **Given** a pending task with an estimated duration, **When** the user chooses to schedule it and confirms a valid start time on the selected date, **Then** the task is placed in the timeline for that date, its end time is derived from its duration, and success is announced.
2. **Given** a pending task without an estimated duration, **When** the user chooses to schedule it, **Then** the user is asked to provide a duration before the schedule can be confirmed, and the confirmed duration is saved to the task explicitly.
3. **Given** a scheduled task, **When** the user changes its planned time and confirms, **Then** the task moves to the new time and no other activity changes.
4. **Given** a scheduled task, **When** the user removes its schedule and confirms, **Then** the task disappears from the timeline, returns to the unscheduled area with its title, priority, due date, and completion status unchanged, and success is announced.
5. **Given** a task scheduled with a start time and duration that would end after midnight, **When** the user attempts to confirm, **Then** the schedule is rejected with a clear explanation and no data is changed.
6. **Given** the user attempts to schedule a task at a time that overlaps existing activities, **When** the conflicts are presented, **Then** the user must explicitly acknowledge them before the schedule is saved, and declining leaves the task unscheduled.
7. **Given** an acknowledged overlapping schedule, **When** the agenda is displayed afterwards, **Then** the scheduled task and the conflicting activities remain visibly in conflict and no activity was moved automatically.
8. **Given** a completed task, **When** the user views it, **Then** it cannot be newly scheduled and no scheduling action is offered for it.

---

### User Story 4 - Navigate to any day, including days with nothing planned (Priority: P4)

As a user, I can move to the previous day, the next day, back to today, or jump directly to a date, so that I can review or plan any day and always receive a useful explanation when a day has no activities.

**Why this priority**: Date navigation expands the agenda beyond a single view but is not required to validate the core chronological and conflict behavior.

**Independent Test**: Can be tested by opening Home, confirming today is selected, navigating across dates in both directions, jumping to a distant date, returning to today, and verifying each date's data and empty states.

**Acceptance Scenarios**:

1. **Given** the user opens Home, **When** the agenda is first displayed, **Then** the current local date is selected and its date is shown in a readable, localized label.
2. **Given** a selected date, **When** the user selects the previous or next day, **Then** the agenda displays that date's activities, its conflicts, and its availability, and the change is announced to assistive technologies.
3. **Given** a date other than today, **When** the user chooses the "today" action, **Then** the agenda returns to the current date.
4. **Given** any date, **When** the user enters or selects a specific date directly, **Then** the agenda displays that date.
5. **Given** a date with no activities of any kind, **When** the agenda is displayed, **Then** an empty state explains that nothing is scheduled for that date and offers a clear action to create a commitment and an action to create a task.
6. **Given** a date with scheduled activities but no pending tasks, **When** the agenda is displayed, **Then** the unscheduled area explains that there are no pending tasks and offers a clear action to open Tasks.
7. **Given** a date with pending tasks but no scheduled activities, **When** the agenda is displayed, **Then** the timeline explains that nothing is scheduled for that date while all pending tasks remain visible.
8. **Given** the user is viewing a date other than today, **When** the agenda is displayed, **Then** today-only contextual surfaces such as weather and smart suggestions are not shown for that date rather than being shown as if they belonged to it.

---

### Edge Cases

- Two activities start and end at identical times: both are conflicting, and each conflict names the other.
- Three activities that all overlap each other: they are counted as one conflict involving three activities, and each activity names both of the others.
- An activity chain where the first ends when the second starts and the second ends when the third starts: no conflicts are reported for any pair.
- A single activity spanning most of the day: available periods are limited to the gaps before and after it that meet the minimum duration.
- A gap of exactly 30 minutes: it is presented as available; a gap of 29 minutes is not.
- A scheduled task is completed after being scheduled: it stays in the timeline with a text completion indicator and still occupies its period for conflict and availability purposes.
- A scheduled task is rescheduled to another date: it appears only on the destination date and does not appear in the origin date's unscheduled area.
- A scheduled task is deleted in Task Management: it disappears from the agenda, and the day's conflicts, available time, and unscheduled list update accordingly.
- A task is scheduled on a different date than the one being viewed: it is absent from both the timeline and the unscheduled area of the viewed date.
- A commitment is edited or deleted in Daily Commitments: the agenda reflects the change and recomputes conflicts and available time without altering anything else.
- A task's estimated duration is changed after it was scheduled: the displayed end time reflects the current duration, and any resulting conflict is reported. If the new duration pushes the end past midnight, the task remains in the timeline with an end-of-day display and an explicit warning, and no slot data is changed automatically.
- Overlapping commitments that were previously saved with acknowledgment: the agenda reports the overlap as a conflict and does not require or trigger re-acknowledgment.
- The agenda is opened on a date in the past: activities are shown for review, conflicts are shown, scheduling remains available, and no available time is presented because the day has elapsed.
- The current date is opened very late in the day with no remaining gap of at least 30 minutes: no available periods are presented, and the summary states that little or no time remains.
- Only one of the two data sources can be read: the agenda still presents the readable source, states that the overview is incomplete, and does not present conflict or availability results as complete.
- A day with many activities: every activity remains reachable and readable without horizontal scrolling.
- The device timezone changes: stored local dates and times are not shifted, and the selected date remains a local calendar date.
- The user is a guest with no stored data of either kind: the agenda presents the empty state rather than an error.
- Task changes are blocked by the current storage state: the agenda stays readable, explains that scheduling is unavailable in this session, and offers a way to reach Task Management.
- Task changes are possible only for the current session: scheduling remains available and the existing warning that changes may not be preserved is shown.

## Requirements *(mandatory)*

### Agenda Composition

- **FR-001**: Home MUST present a single daily agenda for one selected local date, replacing the separate commitments list and task summary previously rendered there.
- **FR-002**: The agenda timeline MUST contain every fixed commitment, every flexible commitment, and every task with a planned time slot for the selected date, each displayed exactly once.
- **FR-003**: Timeline activities MUST be ordered by ascending start time. Activities sharing a start time MUST be ordered deterministically and consistently across displays: first by category order (fixed commitments, then flexible commitments, then tasks), then by ascending end time, then by locale-aware title, then by a stable source key. The category portion of that ordering MUST be stated in a visible hint.
- **FR-004**: Each timeline activity MUST display its title, start time, end time, and a visible text category label identifying it as a fixed commitment, a flexible commitment, or a task.
- **FR-005**: Each scheduled task MUST display its completion status in text, and completed scheduled tasks MUST remain in their time position rather than being removed or moved.
- **FR-006**: Scheduled tasks MUST also display their priority, and their priority MUST NOT affect chronological ordering.
- **FR-007**: Fixed commitments MUST display the start and end times saved in Daily Commitments, unmodified.
- **FR-008**: Flexible commitments MUST display the start and end times saved in Daily Commitments, unmodified, and MUST NOT be moved by any agenda behavior.
- **FR-009**: The agenda MUST display every pending task that has no planned time slot on any date in a separate unscheduled area that states these tasks have no assigned time. A task with a slot on another date MUST NOT appear in the selected date's unscheduled area.
- **FR-010**: The unscheduled area MUST remain visible when the timeline contains activities and MUST remain visible when the timeline is empty.
- **FR-011**: An unscheduled task's due date MUST NOT place it in the timeline and MUST NOT assign it a time.
- **FR-012**: The unscheduled area MUST be ordered by the existing Task Management task ordering and MUST NOT be sorted by time.
- **FR-013**: The agenda MUST NOT display completed tasks in the unscheduled area.
- **FR-014**: The agenda MUST reflect changes made to tasks and commitments, including creations, edits, deletions, completion changes, type changes, and estimated duration changes, without requiring the user to restart the application.
- **FR-015**: The agenda MUST show which date is selected, using the user's selected language and date presentation preference.

### Explicit Task Scheduling

- **FR-016**: The agenda MUST allow the user to explicitly place a pending task at a start time on the selected date, storing an optional planned date and start time for that task. Scheduling MUST be available for any valid date, including past dates.
- **FR-017**: A planned time slot MUST be owned by exactly one task and one date; scheduling a task that already has a slot MUST move that slot rather than create an additional one.
- **FR-018**: A scheduled task's end time MUST be derived from its planned start time and its estimated duration. When a duration change made outside the agenda causes the derived end to fall after the end of the selected date, the agenda MUST keep the task at its start time, display its end as the end of the day with a visible text warning that the planned period exceeds the day, treat the task as occupied until the end of the day for conflict and available-time calculations, and offer an explicit action to adjust its time or duration.
- **FR-019**: Scheduling MUST require an estimated duration; when a pending task has none, the user MUST be asked for a duration before the schedule can be confirmed, and the confirmed value MUST be saved to the task.
- **FR-020**: Scheduling MUST reject a start time that is not a valid local time, an end time that is not after the start time, or a period that would end after midnight on the selected date, with a clear explanation and without changing any data.
- **FR-021**: When a proposed schedule or reschedule would create one or more overlaps, the agenda MUST identify every conflicting activity with its title and time range before saving and MUST require explicit acknowledgment.
- **FR-022**: Declining the conflict acknowledgment MUST cancel the schedule and MUST preserve the user's entered values and the task's previous state.
- **FR-023**: Acknowledging a conflict MUST NOT block the save and MUST NOT change any other activity; the conflict MUST remain visible afterwards.
- **FR-024**: The agenda MUST allow the user to remove an existing scheduled slot through an explicit action; the task MUST remain in Task Management, unchanged except for the removed slot, and MUST return to the unscheduled area.
- **FR-025**: Completed tasks MUST NOT be schedulable, and no scheduling action MUST be offered for them.
- **FR-026**: The agenda MUST NOT schedule, reschedule, or unschedule any task automatically, infer a slot from a due date or availability, or change a slot as a side effect of viewing, navigating dates, changing language, or displaying conflicts.
- **FR-027**: The agenda MUST announce success when a schedule is created, moved, or removed, and MUST announce failure without losing the user's input when a schedule cannot be saved.

### Conflict Identification

- **FR-028**: The agenda MUST identify a time conflict whenever two or more activities on the selected date have intersecting periods, regardless of their category.
- **FR-029**: A conflict MUST NOT be reported when one activity ends at exactly the start time of another.
- **FR-030**: A conflict MUST NOT be reported between activities on different dates, even when their clock times intersect.
- **FR-031**: Every conflicting activity MUST show a text conflict indicator that names every other activity it overlaps and the overlapping period for each of them.
- **FR-032**: When an activity conflicts with several activities, all conflicting activities MUST be identified, and each conflict MUST be individually understandable.
- **FR-033**: The agenda MUST present a conflict summary for the selected date that counts one conflict per connected group of overlapping activities, states how many activities are involved in each conflict, and identifies those activities.
- **FR-034**: A conflict involving a flexible commitment MUST state in text that the flexible commitment is adjustable, and MUST NOT move or suggest a specific new time as an applied change.
- **FR-035**: Conflict identification MUST be presentational only and MUST NOT alter any task, commitment, or schedule.
- **FR-036**: Conflicts MUST be communicated by text and not by color, icons, or visual overlap alone.

### Available Time

- **FR-037**: The agenda MUST present each unoccupied period of the selected date that lasts at least 30 minutes as an available period with its start and end time.
- **FR-038**: The total available time presented for a date MUST equal the sum of the presented available periods.
- **FR-039**: Available periods MUST be labeled as unassigned time and MUST NOT be presented as task assignments, reserved slots, or confirmed plans.
- **FR-040**: Available periods MUST NOT offer any action that assigns, moves, or creates an activity.
- **FR-041**: For the current date, available periods MUST be limited to the remaining part of the day; elapsed intervals MUST NOT be presented as available.
- **FR-042**: For a past date, the agenda MUST NOT present available periods.
- **FR-043**: Overlapping activities MUST be treated as a single occupied period when calculating available time.
- **FR-044**: Available-time results MUST be recalculated from current data whenever activities, schedules, or the selected date change.

### Date Navigation and States

- **FR-045**: The agenda MUST select the current local date when the user opens Home.
- **FR-046**: The agenda MUST provide previous-day and next-day navigation, a direct action to return to the current date, and a way to select a specific date directly.
- **FR-047**: Date navigation MUST be available to keyboard users, MUST keep the selected date visible after navigation, and MUST announce the newly selected date and the number of activities it contains.
- **FR-048**: A date with no activities of any kind MUST present an empty state that explains nothing is scheduled, offers an action to create a commitment, and offers an action to create a task.
- **FR-049**: A date whose timeline is empty but which has pending tasks MUST explain that nothing is scheduled while keeping the unscheduled tasks visible.
- **FR-050**: When the unscheduled area has no pending tasks, it MUST explain that there are no pending tasks and offer an action that opens Task Management.
- **FR-051**: The agenda MUST present a loading state that reflects the final layout, an error state with a localized message and a retry action when reading fails, and explicit feedback for successful schedule changes.
- **FR-052**: When only one data source is readable, the agenda MUST present the readable data, state clearly that the overview is incomplete, and MUST NOT present conflict or availability results as complete.
- **FR-053**: The agenda MUST reuse the existing storage and recovery notices when task or commitment data cannot be fully trusted, and MUST NOT present incomplete data as current. Scheduling MUST follow the same storage-state policy that Task Management applies to task changes: when task writes are blocked, scheduling actions MUST be unavailable with a plain explanation and a way to reach Task Management, and when changes are allowed only for the current session, scheduling MUST remain available with the existing warning that changes may not be preserved.
- **FR-054**: Today-only contextual surfaces such as weather and smart suggestions MUST be shown only when the selected date is the current date, and MUST NOT be presented as belonging to another date.

### Data Integrity and User Control

- **FR-055**: The agenda MUST NOT modify any commitment's title, description, date, start time, end time, or type under any circumstance.
- **FR-056**: The agenda MUST NOT modify a task's title, description, priority, due date, or completion status.
- **FR-057**: The only data the agenda may modify are a task's planned date, planned start time, and, when the user is prompted for it during scheduling, its estimated duration; each modification requires an explicit user confirmation.
- **FR-058**: Every agenda modification MUST be atomic: a failed schedule change MUST leave the task and all activities as they were before the attempt.
- **FR-059**: The agenda MUST NOT delete tasks or commitments, and MUST NOT create tasks or commitments itself.
- **FR-060**: The agenda MUST derive its content from the existing task and commitment records and MUST NOT maintain a separate editable copy of activity data.

### Accessibility

- **FR-061**: The reading and focus order of the agenda MUST follow the chronological order of activities, so that chronological relationships never depend on visual positioning alone.
- **FR-062**: Each activity MUST expose an accessible name that includes its category, title, time range, completion status when it is a task, and conflict information when it conflicts.
- **FR-063**: Available periods MUST expose an accessible name that states the period is available and unassigned.
- **FR-064**: Conflicts MUST be conveyed through accessible text, including which activities conflict and over which period, and the conflict summary MUST be announced when the selected date changes.
- **FR-065**: The unscheduled area and the timeline MUST be distinguishable as separate labeled regions, and the unscheduled area MUST NOT be announced as part of the chronological timeline.
- **FR-066**: Category, completion status, conflict status, and availability MUST NOT be conveyed by color alone.
- **FR-067**: Date navigation and scheduling actions MUST be operable by keyboard with a visible focus indicator, and MUST NOT rely on hover or pointer precision.
- **FR-068**: Changes to the selected date, conflicts, availability, and schedule results MUST be announced through appropriate live regions without excessive or duplicate announcements.
- **FR-069**: The agenda MUST respect reduced-motion preferences and MUST remain fully understandable when motion is suppressed.
- **FR-070**: The agenda MUST remain usable at 200% browser zoom without loss of information.

### Presentation and Responsiveness

- **FR-071**: The agenda MUST present a clear distinction between fixed commitments, flexible commitments, and scheduled tasks using text labels in addition to visual treatment.
- **FR-072**: The agenda MUST use the approved dark visual identity, semantic tokens, radii, spacing, and tabular numerals for all times.
- **FR-073**: The agenda MUST be usable without horizontal scrolling at 360, 768, 1024, and 1440 pixel widths.
- **FR-074**: The agenda MUST preserve chronological meaning on narrow viewports, where a compressed presentation is acceptable but reordering is not.
- **FR-075**: Activity rows MUST show at most three primary data points: a leading status indicator where applicable, the activity title with its time, and a trailing category label.
- **FR-076**: The agenda MUST NOT expose edit or delete actions for commitments or tasks; only scheduling actions defined in this specification are permitted.

### Key Entities

- **Agenda Day**: The selected local calendar date and the derived collection of its timeline activities, unscheduled tasks, conflicts, and available periods.
- **Agenda Entry**: A derived, read-only representation of one fixed commitment, flexible commitment, or scheduled task on the selected date, carrying its source identity, category, title, start and end time, optional task completion status and priority, and any conflict associations. It is never edited directly.
- **Scheduled Task Slot**: Optional task scheduling data consisting of a planned date and planned start time; the end is derived from the task's estimated duration. At most one slot exists per task. A slot whose derived end falls past the end of its date is displayed as ending at the end of the day with an explicit warning and is never changed automatically.
- **Unscheduled Task**: A pending task with no planned slot on any date, presented outside the timeline for the selected date.
- **Time Conflict**: A connected group of two or more agenda entries on the same date whose periods intersect, with the overlapping period and the involved entries. A group is counted once regardless of how many pairs intersect inside it.
- **Available Period**: A derived, unassigned interval of at least 30 minutes within the remaining part of the selected date where no activity is scheduled; it is informational and cannot be claimed as a task assignment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of audited days, every fixed commitment, flexible commitment, and scheduled task for the selected date appears exactly once in the timeline in ascending start-time order.
- **SC-002**: In 100% of audited days, every pending task with no planned slot on any date is visible in the unscheduled area, and no pending task appears both in the timeline and in the unscheduled area.
- **SC-003**: Conflict identification is correct for 100% of tested shapes: partial overlap, containment, identical periods, multiple simultaneous overlaps, connected three-way overlap counted as one conflict, task-against-commitment, and boundary-touching periods that must not be reported.
- **SC-004**: Available time matches an independent manual calculation for 100% of tested days, including the 30-minute threshold boundary, overlapping activities, current-date trimming, and past dates where no availability is shown.
- **SC-005**: A user can reach any calendar date from Home in at most three interactions, and a keyboard-only user can perform the same navigation without a pointer.
- **SC-006**: A user with a task that already has an estimated duration can schedule it in at most four interactions and under 30 seconds, and can remove the schedule in at most two interactions.
- **SC-007**: A day with no activities shows an explanation and at least two available actions in the same view, without requiring the user to leave the agenda to discover what to do.
- **SC-008**: Viewing, navigating, changing language, and displaying conflicts cause zero changes to commitments, tasks, or schedules in 100% of audit checks.
- **SC-009**: 100% of entries communicate category, completion status, conflict status, and availability through text that is exposed to assistive technologies, verified by keyboard and screen-reader review.
- **SC-010**: The agenda presents no horizontal scrolling at 360, 768, 1024, or 1440 pixel widths, or at 200% browser zoom.
- **SC-011**: Changes made to a task or commitment are visible in the agenda without restarting the application in 100% of tested changes.
- **SC-012**: In a usability check with at least five participants, 90% can correctly state which activities conflict and how much time remains available for a prepared day.
- **SC-013**: In 100% of tested cases where a duration change made outside the agenda pushes a scheduled task past midnight, the task remains visible with an end-of-day warning, occupies time until the end of the day in conflict and available-time results, and no task or schedule data is changed.
- **SC-014**: In 100% of tested storage states, the availability of scheduling matches Task Management's ability to change tasks in that same state, and no scheduling action is offered that can only fail.

## Assumptions

- The scheduling model follows the clarification above: tasks gain an optional planned date and start time, populated only through an explicit agenda action. Task Management's own create, edit, and complete operations still never assign or infer a time slot.
- Scheduling requires an estimated duration. When a task has none, the user is prompted during scheduling and the value is saved to the task with explicit confirmation.
- The agenda covers the full local day, from 00:00 to 24:00. No all-day activities, overnight activities, or activities crossing midnight are supported, consistent with Daily Commitments. A stored task slot whose duration later pushes it past midnight is presented with an end-of-day warning instead of being hidden or changed.
- Available periods shorter than 30 minutes are not presented, and the available-time total counts only presented periods. The threshold is a product default and may be revisited without changing the agenda's meaning.
- Available time is informational future time: for the current date it starts at the current local time, and for past dates it is not presented. Availability updates when the user navigates, edits data, or reopens the agenda; continuous ticking is not required.
- Scheduling is available for any valid date, including past dates, consistent with the existing acceptance of past dates in Task Management and Daily Commitments. Past dates present no available time but keep scheduling and conflict reporting.
- Task completion changes continue to happen in Task Management; the agenda displays completion status and does not provide a completion control.
- Editing commitments and deleting activities remain the responsibility of Daily Commitments and Task Management. The agenda links to those surfaces rather than duplicating them.
- Dates and times are local calendar values, consistent with Task Management and Daily Commitments. Device timezone changes do not shift stored dates or times.
- Weather and Walday Smart Suggestions remain today-only surfaces from spec 005 and are omitted for other dates. Their existing loading, unavailable, stale, and error presentations are unchanged.
- Guest-mode storage and any future authenticated synchronization are inherited from the existing task and commitment data sources; the agenda introduces no new persistence mechanism of its own beyond the task scheduling slot.
- Storage availability and recovery states are defined by Task Management and Daily Commitments. The agenda mirrors them and does not introduce a separate storage policy.
- The agenda is part of Home, not a separate destination. No new navigation entry is introduced.
- A conflict is advisory, as established by Daily Commitments. Users may keep an acknowledged overlap, and the agenda always reports it.
- English and Spanish, the user's date/time presentation preference, and the approved dark visual identity apply to all new interface text and presentation.

## Dependencies

- **Task Management (spec 002)**: Task identity, title, status, priority, optional due date, optional estimated duration, ordering, storage and recovery behavior, and validation rules. Requires a documented refinement to permit the explicit planned slot and a specification update so the two documents do not contradict each other.
- **Daily Commitments (spec 004)**: Commitment identity, title, date, start and end times, type, ordering, overlap definitions, and acknowledgment rules.
- **User Preferences (spec 003)**: Selected language and date/time presentation.
- **Home and visual identity (spec 005)**: Dark UI tokens, row density, focus, motion, responsive and accessibility conventions, plus the storage notices reused by the agenda.
- **Product Overview (§5.1, §5.4, §9)**: Dashboard composition, agenda scope, and general business rules.

## Out of Scope

- Weekly and monthly calendar views, or any multi-day view.
- External calendar synchronization and imports.
- Automatic scheduling, automatic rescheduling, and availability-based assignment.
- Drag-and-drop scheduling or rescheduling.
- Applying planning suggestions to the agenda.
- Recurring activities or advanced recurrence rules.
- Reminders, notifications, and alarms.
- Editing, deleting, or completing tasks and commitments from the agenda.
- All-day activities, overnight activities, and activities crossing midnight.
- Working-hours or preferred-hours windows, and preferences for availability boundaries.
- Timezone conversion, travel planning, or cross-timezone views.
- Conflict resolution assistance, suggested alternative times, or automatic conflict fixes.
