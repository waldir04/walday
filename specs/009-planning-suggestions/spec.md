# Feature Specification: Planning Suggestions

**Feature Branch**: `009-planning-suggestions`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "Create a specification for Planning Suggestions in Walday. The goal is to provide useful and explainable recommendations that help users organize their day based on their tasks, commitments, available time, priorities, and relevant weather conditions."

## Clarifications

### Session 2026-11-18

- Q: When a conflict group contains more than one movable activity, which activity should the suggestion propose to move? → A: Prefer the flexible commitment when a valid alternative period exists; otherwise move the least deadline-urgent scheduled task (no due date, then latest future due date, then due today, then overdue), then lowest priority, then the latest original start, then stable source order. Fixed commitments are never candidates.
- Q: Among pending tasks that are not overdue or due today, does an earlier future due date outrank a task with no due date? → A: Yes. The order is overdue, due today, earliest future due date, then no due date; priority ranks tasks only when due status is equal, meaning the same future date or both without a due date.
- Q: When a flexible-adjustment suggestion is accepted, is the beneficiary task scheduled by that same action? → A: No. Only the flexible commitment moves. The beneficiary task is re-evaluated afterward and, if it now fits a presented available period, a separate slot suggestion is offered.
- Q: In a group of three or more overlapping activities, should a suggestion be presented when moving one activity would still leave the others overlapping? → A: Yes, when the chosen activity can be fully removed from every overlap it participates in. The explanation names the overlap that remains, and the agenda continues to report it.
- Q: For a signed-in user on more than one device, does a dismissal stay dismissed on the other devices for that day? → A: No. Dismissal memory is device-local for guests and authenticated users and is never synchronized to the account; it survives reloads on the same device for the rest of the local day.

## Relationship to Existing Features

- **Home and visual identity (spec 005)**: The Walday Smart Suggestions surface introduced there becomes a working recommendation surface. Its high-contrast mint treatment, typography, radii, motion, focus, and responsive rules remain authoritative. Two earlier rules are explicitly refined: spec 005 FR-024 prohibited accept, dismiss, and adjust controls because no suggestion logic existed, and spec 005 FR-025 omitted the region entirely when no suggestion data was supplied. This feature supersedes both for the current-date Home surface: suggestions now carry actions, and a date with no recommendations shows a useful no-suggestion state instead of hiding the region. The presentation states defined in spec 005 (data, loading, empty, error) continue to apply and are extended below.
- **Daily Agenda (spec 006)**: Suggestions consume the agenda's definition of scheduled tasks, unscheduled tasks, time conflicts, and available periods. Applying a suggestion uses the agenda's explicit scheduling semantics and its conflict-acknowledgment behavior; it never bypasses them. Spec 006 listed "applying planning suggestions to the agenda" as out of scope; this feature supersedes that exclusion and becomes the only path by which a suggestion can change an agenda.
- **Task Management (spec 002)**: Suggestions consume task identity, title, pending status, priority, optional due date, optional estimated duration, and planned slot. They never create, edit, complete, or delete tasks, and never schedule a task without explicit approval. The rule that a due date does not assign a time slot remains in force.
- **Daily Commitments (spec 004)**: Suggestions consume commitment identity, title, date, start and end times, and fixed or flexible type. Fixed commitments are never proposed for change. Flexible commitments may be proposed for a new start time on the same date, only as a change the user explicitly approves.
- **Weather Integration (spec 007)/(spec 003)**: Weather is optional context. Suggestions read the already-displayed current conditions and hourly forecast for the current local day in the user's selected location and units. Weather availability never gates any suggestion, and this feature introduces no weather retrieval or preference of its own.
- **Product Overview (§4.1, §4.3, §4.4, §5.6, §9)**: Suggestions are contextual, rule-based, explainable, and advisory; the user always decides; nothing changes without explicit authorization; fixed commitments are never automatically modified.
- **Constitution (Principles VI, IX, XIII, XIV, XIX)**: Every suggestion communicates its reasoning through text and accessible labels, never by color or icon alone; weather stays optional; English and Spanish are both required; optional-service failure cannot degrade the planning experience.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand a conflict suggestion and decide what happens (Priority: P1)

As a user, I open Home, see that two activities overlap, and receive a suggestion that explains the overlap and proposes a specific change to the activity that may be moved, so that I can resolve the conflict myself while fixed commitments stay untouched.

**Why this priority**: Explainable, approval-driven recommendation is the core of the feature. Without a suggestion that names the problem, proposes a concrete change, and applies only on approval, no other suggestion category is meaningful.

**Independent Test**: Can be tested by preparing a day with a fixed commitment overlapping a scheduled task, opening Home, and verifying that a single suggestion describes the overlap, proposes a new time for the task only, names the fixed commitment as protected, and changes nothing until the user explicitly accepts it.

**Acceptance Scenarios**:

1. **Given** a scheduled task overlapping a fixed commitment, **When** the suggestion surface is displayed, **Then** it presents one suggestion stating the overlap in text, identifying the task as the activity that can move, naming the fixed commitment as fixed, and proposing a specific start time that does not overlap any activity.
2. **Given** a suggestion proposing a new time for a task, **When** the user reviews it before acting, **Then** the suggestion states the current time range, the proposed time range, and at least one concrete reason drawn from the displayed activities, such as the conflict with the named commitment.
3. **Given** a conflict suggestion is displayed, **When** no user action is taken, **Then** no task, commitment, or planned slot is changed, and the agenda continues to show the original times.
4. **Given** a conflict suggestion, **When** the user accepts it, **Then** only that task's planned time is updated to the proposed time, the fixed commitment keeps its saved times, the agenda updates immediately, and a confirmation states exactly what changed.
5. **Given** a conflict suggestion, **When** the user dismisses it, **Then** the suggestion is removed, no data changes, and the conflict remains visible in the agenda.
6. **Given** a day whose only conflicts involve two or more fixed commitments, **When** suggestions are displayed, **Then** no suggestion proposes moving or rescheduling any fixed commitment, and the agenda's own conflict reporting remains the place where that conflict is described.

---

### User Story 2 - Find time for an unscheduled task (Priority: P2)

As a user, I can receive a suggestion that places a pending unscheduled task into a period that is actually free and long enough for its estimated duration, so that I spend less time scanning the agenda for somewhere to fit my work.

**Why this priority**: Placing unscheduled work is the everyday planning value users expect, and it depends on the agenda's availability and scheduling semantics already being in place.

**Independent Test**: Can be tested by creating pending tasks with different priorities, due dates, and durations alongside fixed and flexible commitments, then verifying that each slot proposal starts inside a presented available period and fits the full duration, that any flexible-adjustment proposal moves only a flexible commitment to a non-overlapping same-day period and names the beneficiary task, that both avoid every other activity, and that the documented precedence is followed.

**Acceptance Scenarios**:

1. **Given** a pending task with no planned slot on any date, an estimated duration, and an available period at least as long as that duration, **When** suggestions are displayed, **Then** a suggestion proposes a specific start time inside that period and states the task, its duration, the period, and the reason it was chosen.
2. **Given** a pending task with a duration longer than every presented available period, **When** suggestions are displayed, **Then** no time-slot suggestion is made for that task, and nothing is proposed that would require shrinking its duration.
3. **Given** a pending task with no estimated duration, **When** suggestions are displayed, **Then** no time-slot suggestion is proposed for it, and the no-suggestion explanation identifies missing durations as the reason and offers a way to open Task Management.
4. **Given** several pending unscheduled tasks competing for the same available period, **When** suggestions are displayed, **Then** an overdue task is considered before a task due today, a due-today task before a task with a future due date or no due date, a task with a future due date before one with no due date, and within equal due status a high-priority task before medium before low.
5. **Given** a pending task whose due date is today and an available period later in the day, **When** the suggestion is accepted, **Then** the task's planned start time is saved with an end time derived from its estimated duration and the task leaves the unscheduled area.
6. **Given** the current date and time, **When** suggestions are displayed, **Then** no proposed start time is in the past or inside an elapsed part of the day.
7. **Given** a task proposed at a time chosen for it, **When** the user reviews the reason, **Then** it references the actual fit, such as the free period boundaries, its due date, its priority, or the protection of existing activities, and does not claim a guaranteed completion.
8. **Given** a flexible commitment blocks the only period long enough for a pending unscheduled task, and a valid alternative period exists for that commitment, **When** suggestions are displayed, **Then** one suggestion names the commitment to move and the beneficiary task, proposes only the commitment's new start on the same date with its duration preserved, and applying it moves only the commitment; the beneficiary task is then re-evaluated and offered as a separate slot suggestion.

---

### User Story 3 - Let weather influence the choice only when it matters (Priority: P2)

As a user planning a day with changing conditions, I can see weather used as one clear factor when two candidate periods would otherwise be equally suitable, so that the recommendation reflects the weather I can actually see on Home without weather ever blocking planning.

**Why this priority**: Weather is a product differentiator and a stated reason for Walday's unified experience, but it is optional context; planning must remain useful without it.

**Independent Test**: Can be tested by preparing two equally suitable free periods with clearly different forecast conditions, then simulating available, outdated, and unavailable weather and verifying that the chosen period and the explanation change only in the first case and that every other suggestion still appears in the latter two.

**Acceptance Scenarios**:

1. **Given** an otherwise equally suitable choice between two free periods, and available weather information showing meaningfully different conditions in those periods, **When** the suggestion is displayed, **Then** the period with the better conditions is proposed and the explanation states the weather fact that influenced the choice.
2. **Given** weather information is outdated or unavailable, **When** suggestions are displayed, **Then** the same suggestions are still generated from tasks, commitments, and available time, weather is not cited in any explanation, and no weather error replaces or blocks the suggestions.
3. **Given** a proposed period with expected precipitation and an alternative period without it, **When** the weather-influenced suggestion is displayed, **Then** the suggestion states the expected precipitation in text and does not rely on an icon or color to carry that meaning.
4. **Given** weather information differs between candidate periods but only one period actually fits the task's duration, **When** suggestions are displayed, **Then** the fitting period is proposed regardless of weather, and weather is not used to justify an unfitting choice.
5. **Given** a suggestion that was influenced by weather, **When** the weather later changes before the user accepts it, **Then** no data changes automatically and the suggestion is re-evaluated against current information; when the presented period still satisfies every non-weather constraint, it remains applicable and is not refused or altered merely because weather became unavailable or outdated.

---

### User Story 4 - Adjust a suggestion before accepting it (Priority: P3)

As a user, I can change the proposed time before applying a suggestion, so that the recommendation becomes my decision rather than a take-it-or-leave-it offer.

**Why this priority**: Adjustment completes user control and is required by the product, but the feature remains viable when suggestions can be accepted or dismissed as proposed.

**Independent Test**: Can be tested by opening a suggestion, choosing a different valid start time, applying it, and confirming the adjusted values were saved; then repeating with an invalid or conflicting time and confirming that nothing is saved without explicit conflict acknowledgment.

**Acceptance Scenarios**:

1. **Given** a suggestion proposing a start time, **When** the user chooses to adjust it, **Then** the user can select a different start time for the same activity and the surface shows the current time, the originally proposed time, and the adjusted time before applying.
2. **Given** an adjusted time that is valid and free, **When** the user confirms, **Then** only the adjusted change is applied, and a confirmation names the activity and the applied time.
3. **Given** an adjusted time that overlaps another activity, **When** the user attempts to apply, **Then** every conflicting activity and its time range are named and explicit acknowledgment is required, exactly as in agenda scheduling, and declining leaves all data unchanged.
4. **Given** an adjusted time in the past, outside the current day, or ending after midnight, **When** the user attempts to apply, **Then** the application is rejected with a clear explanation and no data changes.
5. **Given** the user is adjusting a suggestion, **When** the user chooses to dismiss instead, **Then** no change is applied and the suggestion is dismissed.
6. **Given** a suggestion for a flexible commitment, **When** the user adjusts it, **Then** only the start time can be changed, the commitment keeps its duration, remains on the same date, and remains flexible.
7. **Given** the user confirms an application that cannot be saved, **When** the failure is reported, **Then** no task, commitment, or slot changes, the suggestion remains, the failure is explained without technical detail, and a retry action is offered.

---

### User Story 5 - Keep suggestions calm, limited, and recoverable (Priority: P3)

As a user, I see a small number of relevant suggestions, they do not repeat after I dismiss them, and when there is nothing useful to suggest I get a clear explanation instead of an empty or noisy region.

**Why this priority**: Restraint is what makes suggestions feel helpful rather than nagging, and the no-recommendation state is a required part of the experience, but both refine behavior that is already useful.

**Independent Test**: Can be tested by building an overloaded day, verifying the number and order of suggestions, dismissing one and reloading, dismissing all, and then checking the no-suggestion explanations for planned, unplanned, duration-less, and unavailable-data days.

**Acceptance Scenarios**:

1. **Given** more candidate suggestions than the display limit, **When** suggestions are displayed, **Then** no more than three suggestions appear at once, ordered by the documented precedence, and the rest are not shown as placeholders.
2. **Given** a suggestion is dismissed, **When** the user reloads Home during the same local day, **Then** that same suggested change is not presented again, and no task, commitment, or slot is changed.
3. **Given** all suggestions are dismissed or resolved, **When** the surface is displayed, **Then** it explains that there are no recommendations right now, offers a way to review dismissed suggestions for the day, and offers a relevant next action without fabricating content.
4. **Given** a day with no pending tasks and no conflicts, **When** suggestions are displayed, **Then** the no-suggestion explanation says the day is already planned or has nothing to place, rather than showing an error.
5. **Given** a day with pending tasks but no available period long enough for any of them, **When** suggestions are displayed, **Then** the explanation says no free period fits the pending work and offers a way to review the agenda.
6. **Given** task or commitment data cannot be read completely, **When** suggestions are requested, **Then** no suggestion is presented as complete, the surface explains that recommendations are unavailable because the day's plan is incomplete, and a retry action is offered.
7. **Given** the current date is not selected on Home, **When** the agenda displays another date, **Then** no planning suggestions are shown for that date.
8. **Given** a suggestion is being applied, **When** the user activates accept more than once, **Then** exactly one change is applied and duplicate submissions are prevented.
9. **Given** a suggestion was dismissed earlier in the day, **When** the user opens the dismissed suggestions for review, **Then** the activity and the proposed change are shown, and restoring the suggestion returns it to the presented list without applying anything.

---

### Edge Cases

- Two suggestions would propose changes to the same task or the same flexible commitment: only one is presented at a time.
- A conflict involves one fixed commitment, one flexible commitment, and one scheduled task: the suggestion proposes moving at most one movable activity and never the fixed commitment, preferring the flexible commitment when it has a valid alternative period.
- A conflict group contains a flexible commitment whose only free alternative would create a new conflict: the suggestion falls back to the least deadline-urgent movable task, or produces no suggestion when no movable activity can be fully removed from its overlaps.
- A flexible-adjustment suggestion is accepted: only the flexible commitment moves, and the beneficiary task is proposed separately in a later recalculation rather than being scheduled by the same action.
- A conflict involves only movable activities: the suggestion prefers the change that resolves the conflict without creating a new one, and explains which activity it chose.
- Three or more activities overlap as a connected group: the suggestion addresses the group as one conflict, names every activity, changes at most one activity, removes that activity from every overlap it participates in, and names any overlap that remains among the other activities.
- Activities touch exactly at a boundary and do not overlap: no conflict suggestion is generated for them.
- A proposed time would end after midnight: it is never proposed, and the available period is treated as ending at the end of the day.
- The only free period begins before the current time on the current date: it is not proposed as available; the remaining useful part is considered only if it still fits the activity.
- A task's estimated duration is edited to a longer value while a suggestion for it is displayed: the suggestion is re-evaluated before display or application, and the old time is not applied if it no longer fits.
- A task is completed, deleted, or scheduled elsewhere while a suggestion for it is displayed: the suggestion is withdrawn or refused at application, with an explanation and no data change.
- A fixed commitment is edited to a new period while a suggestion is displayed: the suggestion is re-evaluated against the new period; no stale proposal is applied.
- A flexible commitment proposed for moving is changed to fixed by the user: the pending suggestion is withdrawn and never applied.
- Weather becomes unavailable between presentation and acceptance: the change can still be applied, weather is no longer cited, and the user is not blocked.
- Weather is available for only part of the day: only the covered candidate periods use weather as a factor, and uncovered periods are not described with invented conditions.
- The display limit hides a higher-precedence suggestion that appears after the user resolves another one: the newly relevant suggestion becomes visible on recomputation without a reload.
- Dismissal memory cannot be saved in the current storage state: the suggestion can still be dismissed for the current session, the existing storage notice applies, and the user is not told the dismissal was permanently recorded.
- The user changes language while suggestions are displayed: all suggestion text, reasons, actions, dates, and times update without losing the suggestion or applying anything.
- The user changes weather units or location: suggestion reasoning that cites weather updates without applying anything.
- A guest has no tasks and no commitments: the surface presents a calm explanation and creation actions, not an error.
- A day is fully booked with fixed commitments: no slot suggestions are made, and any conflict-only suggestions name the fixed activities as protected.
- The current time is very late in the day with no usable free period: no slot suggestion is made, and the explanation states that little or no time remains.
- The selected date is in the past: no suggestions are presented, consistent with today-only contextual surfaces.
- The same day's data produces the same inputs after a reload: the same suggestions and order are produced.
- Assistive technology is used while a suggestion is applied: the result is announced once, the removed suggestion is not re-announced as an error, and focus lands on a meaningful next element.

## Requirements *(mandatory)*

### Suggestion Generation and Scope

- **FR-001**: Planning suggestions MUST be generated only for the current local date and presented within the existing Walday Smart Suggestions surface on Home.
- **FR-002**: No planning suggestions MUST be presented for any date other than the current local date.
- **FR-003**: Suggestions MUST be derived exclusively from the user's pending tasks, scheduled task slots, fixed and flexible commitments, the agenda's conflicts and available periods, the user's selected language and date/time presentation, and weather information already available for the current day.
- **FR-004**: Suggestions MUST NOT invent activities, times, durations, due dates, priorities, weather conditions, or conflicts that are not present in the user's data.
- **FR-005**: A suggestion MUST NOT be generated unless it proposes a concrete, permitted change that improves the day's plan. A conflict suggestion MAY be generated when the chosen activity can be fully removed from every overlap it currently participates in, even if other activities in the same connected group still overlap each other; in that case the explanation MUST state that the remaining overlap persists. When no permitted change fully removes any movable activity from its overlaps, the conflict is reported only by the agenda and MUST NOT produce a suggestion.
- **FR-006**: Recommendation logic MUST be deterministic and rule-based: identical inputs MUST produce the same suggestions, the same order, and the same substantive reasoning.
- **FR-007**: Suggestion generation MUST NOT use artificial intelligence, machine learning, predictive modeling, inferred productivity patterns, or optimization algorithms beyond direct rule evaluation.
- **FR-008**: Suggestions MUST be recalculated from current data whenever tasks, commitments, planned slots, the selected date, the current time, the interface language, or relevant weather information changes.
- **FR-009**: Suggestion generation and presentation MUST NOT block, delay, or alter task management, commitment management, agenda navigation, weather presentation, or preferences.
- **FR-010**: When task or commitment data cannot be read completely, suggestions MUST NOT be presented as complete, and the surface MUST state that recommendations are unavailable because the day's plan is incomplete, with a retry action.

### Suggestion Categories and Triggers

- **FR-011**: Walday MUST generate a conflict suggestion when two or more activities on the current date overlap and at least one participating activity is permitted to move.
- **FR-012**: A conflict suggestion MUST identify every activity in the overlapping group, the overlapping period, and which activity is proposed to move. When an overlap remains in the group after the proposed change, the explanation MUST name the activities that still conflict.
- **FR-013**: A conflict suggestion MUST propose at most one change to one movable activity and MUST NOT propose changing more than one activity at a time. When more than one participating activity may move, Walday MUST prefer the flexible commitment if a valid alternative period exists; otherwise it MUST choose the least deadline-urgent scheduled task (no due date, then the latest future due date, then due today, then overdue), then the lowest priority, then the latest original start time, then stable source order. A fixed commitment is never a candidate.
- **FR-014**: Walday MUST generate a slot suggestion for a pending task that has no planned slot on any date, has an estimated duration, and fits entirely inside a presented available period.
- **FR-015**: Every proposed period MUST fully contain the activity's existing duration and MUST NOT overlap any other fixed commitment, flexible commitment, or scheduled task, elapsed time, or the end of the day.
- **FR-016**: Walday MUST NOT propose fitting a task by shortening its estimated duration, changing its due date, or changing its priority.
- **FR-017**: Walday MUST generate a flexible-adjustment suggestion only when moving a flexible commitment to a specific alternative period on the same date creates or preserves a usable period for a pending task that otherwise cannot be placed, and the suggestion MUST name the task that benefits. The alternative period MUST satisfy FR-015 for the commitment being moved. Applying a flexible-adjustment suggestion MUST move only the flexible commitment and MUST NOT schedule the beneficiary task in the same action; after the change is applied, the beneficiary task MUST be re-evaluated and, when it now fits a presented available period, a separate slot suggestion MUST be offered.
- **FR-018**: Walday MUST NOT generate a suggestion whose only effect would be to move an activity without a planning benefit that can be stated in the explanation.
- **FR-019**: Walday MUST NOT propose any change to a fixed commitment, including its title, description, date, start time, end time, or type.
- **FR-020**: Walday MUST NOT propose changing a task's title, description, priority, due date, completion status, or planned date, beyond placing it at a start time on the current date.
- **FR-021**: When a conflict involves only fixed commitments, Walday MUST NOT generate a suggestion for it and MUST NOT propose moving any fixed commitment; the agenda's own conflict reporting remains responsible for describing that conflict.

### Prioritization and Selection

- **FR-022**: When choosing among pending tasks, Walday MUST consider an overdue task before a task due today, a task due today before a task with a future due date or no due date, and a task with a future due date before a pending task with no due date. Among tasks with future due dates, the earliest due date MUST be considered first.
- **FR-023**: Among tasks with equal due-date urgency (both overdue, both due today, the same future due date, or both without a due date), Walday MUST consider a high-priority task before a medium-priority task, and medium before low.
- **FR-024**: Walday MUST consider estimated duration only as a constraint on whether a period fits, not as a claim about how long the activity will actually take.
- **FR-025**: Walday MUST consider task priorities and due dates only as selection factors, and MUST NOT present either as a guaranteed outcome.
- **FR-026**: When more than one candidate period fits, Walday MUST prefer the earliest period that satisfies all constraints, except where weather relevance under FR-029 changes the choice.
- **FR-027**: Ties between otherwise equal candidates MUST be resolved deterministically using stable, explainable factors such as due date, priority, earliest proposed time, and a stable source order.

### Weather Context

- **FR-028**: Weather MUST influence a suggestion only when weather information for the current local day at the user's selected location is available, current, and usable for the relevant hours.
- **FR-029**: Weather MUST be used only to choose among candidate periods that already satisfy every non-weather constraint.
- **FR-030**: When weather information is unavailable, outdated, incomplete for the relevant hours, or has no meaningful difference between candidates, suggestions MUST still be generated and MUST NOT cite weather.
- **FR-031**: Weather MUST NOT be the sole reason to withhold a suggestion, mark a task as unsuitable, or classify an activity as indoor or outdoor.
- **FR-032**: When weather influenced a choice, the explanation MUST state the factual condition and period in text, in the user's selected units, and MUST NOT imply a guaranteed outcome.
- **FR-033**: A weather-influenced suggestion MUST remain valid for application when weather later becomes unavailable, and the applied change MUST NOT be reversed or altered automatically because conditions changed. When weather becomes unavailable or outdated between presentation and application, a still-valid suggestion MUST remain presented and applicable, with weather no longer cited.
- **FR-034**: Weather MUST NOT be cited in a suggestion when it is outdated, unavailable, or incomplete, and such weather MUST NOT replace the suggestion surface with an error.

### Explainability

- **FR-035**: Every suggestion MUST state the activity or activities it concerns, the proposed change, the current state, and the resulting state in text before the user acts.
- **FR-036**: Every suggestion MUST include at least one concrete reason grounded in the displayed data, such as a named conflict, a due date, a priority, a free period and its boundaries, the task's duration, or a weather condition.
- **FR-037**: Suggestion reasons MUST be truthful, specific, and understandable without technical vocabulary; vague claims about productivity, mood, or predicted success MUST NOT be used.
- **FR-038**: A conflict suggestion MUST state that fixed commitments are protected when a fixed commitment participates in the conflict.
- **FR-039**: Suggestions MUST NOT claim that accepting them is required, that the resulting plan is optimal, or that the user will certainly complete the activity at the proposed time.
- **FR-040**: The reason for a suggestion MUST be available as visible text and to assistive technologies, not only through an icon, color, tooltip, or expandable element that hides it from the accessibility tree.

### Ordering, Limitation, and Repetition

- **FR-041**: No more than three suggestions MUST be presented at the same time.
- **FR-042**: Suggestions MUST be ordered by precedence: conflict suggestions first, then deadline-driven pending-task suggestions, then other pending-task suggestions, then flexible-adjustment suggestions; within a category, the ordering rules of FR-022, FR-023, FR-026, and FR-027 apply.
- **FR-043**: Walday MUST present at most one suggestion for the same activity and at most one suggestion that would produce the same resulting change at the same time.
- **FR-044**: Suggestions hidden by the display limit MUST NOT be represented by placeholders or counts that imply more changes were applied.
- **FR-045**: A dismissed suggestion MUST NOT be presented again during the same local day for the same activity and the same resulting change.
- **FR-046**: A suggestion that was accepted MUST NOT be presented again once its change is reflected in the data.
- **FR-047**: Suggestions MUST be withdrawn when their target activity is completed, deleted, made ineligible, or already changed by the user, rather than being shown or applied against stale state.
- **FR-048**: When a previously hidden suggestion becomes relevant after another suggestion is resolved, it MUST become visible on recalculation without requiring an application reload.

### Accept, Adjust, and Dismiss

- **FR-049**: Users MUST be able to accept a suggestion, adjust its proposed time before accepting it, or dismiss it without applying anything.
- **FR-050**: Accepting a suggestion MUST require an explicit user action after the proposed change and its reason have been presented; no suggestion may be applied automatically or as a side effect of viewing, reloading, changing language, or changing date.
- **FR-051**: Accepting a suggestion MUST re-validate the target, its eligibility, the proposed period, and the current conflicts immediately before applying, and MUST refuse the change with an explanation if any condition no longer holds.
- **FR-052**: Applying a suggestion MUST modify only the intended target: a task's planned start time on the current date, or a flexible commitment's start and end time on the current date, preserving its duration.
- **FR-053**: Applying a suggestion MUST be atomic: a failure MUST leave every task, commitment, and planned slot exactly as it was.
- **FR-054**: Applying a suggestion MUST NOT create, delete, or complete any task or commitment, MUST NOT change task ordering in Task Management or commitment ordering in Daily Commitments, and MUST NOT modify a fixed commitment, an unrelated activity, or any preference.
- **FR-055**: A user-adjusted time that overlaps existing activities MUST name every conflicting activity and its time range and MUST require explicit acknowledgment before applying, consistent with agenda scheduling; declining MUST leave all data unchanged.
- **FR-056**: A user-adjusted time that is in the past, outside the current local day, or would end after midnight MUST be rejected with a clear explanation and no data change.
- **FR-057**: While a suggestion is being applied, the accept action MUST prevent duplicate submission and MUST expose a pending state; exactly one change MUST result from repeated activation.
- **FR-058**: After a successful application, the surface MUST state what changed, including the activity and the applied time, announce the result, remove the applied suggestion, and reflect the change in the agenda immediately without a reload.
- **FR-059**: After a failed application, the surface MUST state that the change did not happen, preserve the suggestion and the user's adjusted values where practical, and offer a retry action.
- **FR-060**: Dismissing a suggestion MUST NOT change any task, commitment, planned slot, or preference, and MUST remove the suggestion from the presented list with an accessible confirmation.
- **FR-061**: Dismissals MUST be remembered for the remainder of the current local day on the device where they were made and across reloads on that device when storage is available; dismissal memory MUST NOT be synchronized across devices or tied to the user's account. When dismissal memory cannot be saved, the existing storage notice applies and the dismissal MUST still take effect for the current session.
- **FR-062**: Users MUST be able to review the suggestions they dismissed during the current day and restore one for reconsideration; restoring MUST NOT apply anything.
- **FR-063**: Dismissing a suggestion MUST NOT hide the agenda's conflict information or any other information or warning the application is required to display.

### Feedback, States, and Recovery

- **FR-064**: The suggestion surface MUST present a loading state that matches the final card layout and exposes a busy state to assistive technologies.
- **FR-065**: When there are no suggestions, the surface MUST present a no-suggestion state that explains the applicable reason in text using exactly one of the defined reasons: the day is already planned or there are no pending tasks to place, no free period fits the pending work, pending tasks lack estimated durations, all suggestions were dismissed, or no permitted improvement remains (for example, only fixed commitments conflict). It MUST offer a relevant next action and MUST NOT show sample or fabricated suggestions.
- **FR-066**: When suggestion calculation fails, the surface MUST present a localized error state with a retry action, MUST NOT expose technical details, and MUST NOT block any other Home content.
- **FR-067**: When weather is unavailable or outdated, the suggestions MUST remain available and MUST NOT present weather as a cause of failure.
- **FR-068**: When suggestions are recalculated, removed, or replaced, the surface MUST avoid duplicate announcements and excessive live-region updates, while still announcing meaningful changes such as an applied result, a dismissed suggestion, or a newly available recommendation.

### Data Integrity and User Control

- **FR-069**: The application MUST NOT silently modify existing user data at any point in suggestion generation, presentation, adjustment, dismissal, recalculation, or failure handling.
- **FR-070**: Every suggestion-driven change MUST require explicit user approval and MUST be attributable to exactly one suggestion and one user action.
- **FR-071**: Suggestions MUST NOT weaken or bypass existing validation in Task Management, Daily Commitments, or the Daily Agenda.
- **FR-072**: The user's existing data MUST remain authoritative: when the user changes a task or commitment directly, the resulting plan MUST take precedence over any earlier suggestion.

### Accessibility

- **FR-073**: Every suggestion and every suggest action MUST be reachable and operable with a keyboard alone, in a logical reading order, with a visible focus indicator and no keyboard trap.
- **FR-074**: Accept, adjust, and dismiss actions MUST have accessible names that identify the action and its target activity and, where relevant, the proposed time.
- **FR-075**: Each suggestion MUST expose an accessible name and description that include the proposed change and its reason, so assistive technology users receive the same explanation as sighted users.
- **FR-076**: Suggestion type, weather influence, conflict status, and applied or dismissed state MUST NOT be conveyed by color or icon alone.
- **FR-077**: Applying or dismissing a suggestion MUST be announced once through an appropriate live region, and focus MUST move to a meaningful element such as the next suggestion, the surface heading, or the no-suggestion state.
- **FR-078**: Suggestion cards and actions MUST meet the project's minimum target size, remain fully usable at 200% browser zoom, and avoid hover-only access.
- **FR-079**: Loading, no-suggestion, error, and applied states MUST be understandable to assistive technologies, and decorative visuals MUST be hidden from them.
- **FR-080**: Motion MUST be minimal and MUST respect reduced-motion preferences without removing any information or state change.

### Localization and Presentation

- **FR-081**: All suggestion text, reasons, actions, confirmations, and states MUST be available in English and Spanish, with no hardcoded user-facing text.
- **FR-082**: Dates, times, durations, temperatures, and precipitation MUST be presented according to the selected language, date/time presentation, and weather unit preferences, using the user's locale conventions.
- **FR-083**: Suggestions MUST use the approved dark visual identity, semantic tokens, spacing, radii, and tabular numerals, and MUST remain clearly distinguishable from user-owned tasks and commitments.
- **FR-084**: Suggestions MUST be usable without horizontal scrolling at 360, 768, 1024, and 1440 pixel widths, and MUST preserve readable priority of information on narrow viewports.

### Key Entities

- **Planning Suggestion**: A derived, explainable recommendation for the current local day. It carries a stable identity, a category (conflict, pending-task slot, or flexible adjustment), the target activity, the proposed change, its reasons, any weather evidence used, and its presentation state. It is never a stored user record.
- **Proposed Change**: The exact permitted modification carried by a suggestion: scheduling a pending task at a start time, moving a scheduled task to a start time, or moving a flexible commitment to a new start and end time on the same date. It records the current state and the resulting state.
- **Suggestion Reason**: A user-facing, data-grounded explanation component such as a conflict, due-date urgency, priority, available-period fit, duration constraint, or weather condition. One suggestion carries one or more reasons.
- **Suggestion Decision**: The user's explicit treatment of a suggestion: accepted and applied, dismissed for the current day on the current device, or restored after dismissal. Dismissals are retained for the local day on that device and are never synchronized to the user's account; accepted changes live in the underlying task or commitment data.
- **Candidate Period**: A presented available period on the current day, after elapsed time and end-of-day boundaries are applied, that is evaluated for fit with an activity's duration.
- **Suggestion Surface State**: The presentation state of the recommendation region: loading, suggestions present, no suggestions with a reason, incomplete data, error with retry, or applied/dismissed feedback.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of audited suggestions, the surface states the target activity, the current state, the proposed change, the resulting state, and at least one concrete reason drawn from displayed data.
- **SC-002**: In 100% of tested applications, only the intended task's planned time or the intended flexible commitment's times change; zero fixed commitments, unrelated activities, and preferences change.
- **SC-003**: In 100% of tested generated proposals, the proposed period contains the activity's full duration, avoids every other fixed commitment, flexible commitment, and scheduled task, and lies within the remaining current day.
- **SC-004**: In 100% of tested cases with unavailable, outdated, or partial weather, non-weather suggestions are still generated and no error state replaces the suggestion surface.
- **SC-005**: In 100% of tested dismissals, zero data changes occur, the suggestion disappears, and the same activity and resulting change are not presented again on that device during that local day.
- **SC-006**: No more than three suggestions are visible at once in 100% of checks, and identical inputs produce the identical suggestion order across reloads.
- **SC-007**: In 100% of tested no-suggestion days, the surface states one of the defined reasons and offers at least one relevant action.
- **SC-008**: In 100% of tested conflict shapes, no suggestion proposes any change to a fixed commitment.
- **SC-009**: In a usability check with at least five participants, 90% can explain why a displayed suggestion was made and can predict what will change before accepting it.
- **SC-010**: Keyboard-only users can accept, adjust, and dismiss a suggestion in 100% of tested journeys, automated checks report zero critical or serious WCAG 2.2 AA violations, and screen-reader review confirms that the reason and the applied result are announced.
- **SC-011**: After applying a suggestion, the agenda reflects the change in the same view without a reload in 100% of tested cases.
- **SC-012**: In 100% of tested failed applications and stale-context cases, no data changes and the user receives an explanation with a recovery action.
- **SC-013**: In 100% of tested repeated activations of accept, exactly one change is applied.
- **SC-014**: On a typical day with up to 50 tasks and 20 commitments, suggestions appear together with the rest of Home within 2 seconds on a mid-range device, and recommendation display never delays other Home content.
- **SC-015**: 100% of tested suggestions, reasons, actions, and feedback are available in English and Spanish, with locale-correct dates, times, durations, temperatures, and precipitation values.

## Assumptions

- Planning suggestions cover the current local date only, consistent with the today-only suggestion surface established in spec 006 and the daily focus of the product. Multi-day or weekly planning is out of scope.
- The surface presents at most three suggestions at a time. The limit is a product default chosen to keep recommendations calm and scannable.
- A slot suggestion requires an estimated duration because the agenda requires one for scheduling. Tasks without a duration are never assigned an inferred or default duration; the no-suggestion state explains the gap and links to Task Management.
- Slot suggestions use only the periods the agenda already presents as available, including its 30-minute minimum and its exclusion of elapsed time on the current date. Conflict and flexible-adjustment relocations use a local open-interval scan that excludes the activity being moved, because a presented period omits the gap currently occupied by that activity; this scan applies no 30-minute presentation minimum and requires only that the activity fully fit and avoid every other activity.
- Walday does not classify activities as indoor or outdoor in the MVP, and no new task or commitment attribute is introduced. Weather relevance is evaluated by comparing candidate periods; current weather can break an otherwise equal tie and is cited in the explanation when it did, but it never overrides fit, conflicts, or the user's plan. Activity-level weather sensitivity would require a future product decision.
- Weather differences count as meaningful only when the available information shows a materially different condition between candidate periods, such as a materially different expected precipitation probability or a marked condition-severity difference such as a storm. Temperature is never used as evidence or as a deciding factor, because the product does not classify activities as indoor or outdoor. Specific numeric thresholds are product defaults and are not user-configurable in the MVP.
- Flexible-adjustment suggestions move a flexible commitment on the same date and preserve its duration. Changing a commitment's date or type is never proposed.
- A conflict between fixed commitments cannot be resolved by the application. It remains described by the agenda; suggestions do not propose moving either activity.
- Applying a suggestion reuses the agenda's existing scheduling operation and its conflict-acknowledgment rules, so the two features cannot disagree about what a valid or acknowledged schedule is.
- Dismissals are scoped to the current local day and the same activity plus resulting change. They are device-local for guests and authenticated users, are remembered across reloads on that device when user data can be stored, and follow the existing storage and recovery policy otherwise. A dismissal does not follow the account to another device. Dismissal is a display decision, not a change to the user's plan.
- Suggestions are computed for the visible Home surface and do not run as background notifications or reminders. No new navigation destination, alert, or preference is introduced.
- Guest and authenticated storage behavior, including the existing storage notices, applies to suggestion data and dismissal memory without introducing a new persistence mechanism.
- Existing task ordering, commitment rules, agenda calculations, and conflict definitions remain authoritative; this feature consumes them and refines none of them except the explicit supersessions recorded above.
- English and Spanish, the user's date/time presentation preference, weather units, and the approved dark visual identity apply to every suggestion label, reason, action, and confirmation.

## Dependencies

- **Task Management (spec 002)**: Pending task identity, title, priority, optional due date, optional estimated duration, ordering, and storage states.
- **Daily Commitments (spec 004)**: Commitment identity, title, date, start and end times, fixed or flexible type, overlap semantics, and acknowledgment rules.
- **Daily Agenda (spec 006)**: Scheduled task slots, unscheduled task definition, conflict detection, available-period calculation, explicit scheduling and conflict acknowledgment. Requires the recorded refinement so the agenda's "applying suggestions" exclusion no longer contradicts this feature.
- **Weather Integration (spec 007)**: Current conditions, hourly forecast, precipitation, freshness and unavailable states, and location and unit preferences.
- **User Preferences (spec 003)**: Language, date/time presentation, weather location, and weather units.
- **Home and visual identity (spec 005)**: Suggestion surface placement, mint presentation, tokens, focus, motion, responsive and accessibility conventions. Requires the recorded refinements to FR-024 and FR-025 for actionable suggestions and the no-suggestion state.
- **Product Overview (§4.1, §4.4, §5.6, §9)**: User control, explainability, suggestion scope, and general business rules.

## Out of Scope

- AI-generated recommendations, machine learning, predictive models, and predictive productivity analytics.
- Automatic scheduling, automatic rescheduling, automatic conflict resolution, and autonomous agenda changes.
- Advanced optimization algorithms, scoring that cannot be explained in user terms, or inferred user habits.
- Multi-day, weekly, or monthly planning suggestions.
- Suggesting changes to task content, priority, due date, duration, or completion status.
- Moving, rescheduling, or otherwise changing fixed commitments, including proposing a date change.
- Changing the date of a flexible commitment, or changing a commitment's type.
- Suggesting new tasks or commitments the user did not create.
- An indoor/outdoor or weather-sensitivity attribute on tasks or commitments.
- User-configurable planning aggressiveness, suggestion thresholds, or weather sensitivity.
- Background suggestions, notifications, reminders, alarms, or push delivery.
- Editing, deleting, completing, or creating tasks and commitments from the suggestion surface.
- External calendar synchronization, imports, or third-party planning data.
- Team, shared, or collaborative planning suggestions.
