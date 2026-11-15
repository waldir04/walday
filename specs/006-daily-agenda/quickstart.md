# Quickstart Validation: Daily Agenda

**Feature**: `006-daily-agenda` | **Date**: 2026-11-15

Runnable validation guide. It proves the feature end to end without duplicating implementation detail; contracts live in `contracts/`, entities in `data-model.md`.

## Prerequisites

- Node.js 24 LTS and npm 11 (pinned by `frontend/package.json`).
- A clean browser profile or an empty guest store for the empty-state scenarios.
- No backend, database, or weather credentials are needed; the entire feature is local.

## Setup

```bash
cd frontend
npm ci
npm run dev        # http://localhost:5173
```

Quality gates (must pass before the feature is considered done):

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

Focused runs while iterating:

```bash
cd frontend
npx vitest run tests/agenda-model.test.ts
npx vitest run tests/agenda-storage-migration.test.ts
npx vitest run tests/agenda-scheduling.test.tsx
npx vitest run tests/agenda-a11y.test.tsx
```

## Seed data

Use the Tasks and Commitments pages (no console or storage editing):

1. Commitments for today: `09:00–10:00` fixed "Team sync"; `12:00–12:45` flexible "Grocery shopping"; `15:00–16:00` fixed "Dentist".
2. Tasks: "Write report" (medium, duration 60), "Call bank" (high, duration 30), "Read article" (low, no duration), plus one completed task.

## Scenario 1 — Chronological composition (User Story 1, SC-001, SC-002)

1. Open Home.
2. Schedule "Write report" at `10:30`, "Call bank" at `13:00`; give "Read article" a 40-minute duration when prompted and schedule it at `10:30`.

Expected:

- Timeline order: `09:00` Team sync, `10:30` Read article (ends `11:10`), `10:30` Write report (ends `11:30`), `12:00` Grocery shopping, `13:00` Call bank, `15:00` Dentist — each exactly once. The two same-start tasks share a category, so the documented end-minute tie-break puts the earlier end first.
- Every row shows title, `tabular-nums` time range, and a text category label; task rows also state their priority.
- "Read article" left the unscheduled area and shows an end derived from its duration.
- Remaining pending tasks with no slot appear only in the unscheduled area, in Task Management order, labeled as having no assigned time.
- The completed task appears nowhere in the unscheduled area.
- The ordering hint is visible above the entries.

## Scenario 2 — Conflicts and available time (User Story 2, SC-003, SC-004)

1. Move "Call bank" to `09:30` (overlaps Team sync) and confirm the acknowledgment.
2. Move it back to `13:00`.
3. Create a commitment ending exactly when another starts (`10:00–11:00` after `09:00–10:00`).

Expected:

- Step 1 reports a conflict naming each counterpart with its range, the summary counts one conflict with two activities, and no activity moved.
- Step 3 reports no conflict for the boundary-touching pair.
- Availability lists only gaps of at least 30 minutes with start and end times; the total equals the sum of the listed periods; a 29-minute gap produces no period.
- For today, availability starts at the current time, not at 00:00; a past date shows no availability.
- A three-way overlap shows one conflict with three activities, and each row names the other two.
- Flexible commitments involved in a conflict are labeled adjustable in text.

## Scenario 3 — Explicit scheduling round trip (User Story 3, SC-005, SC-006, SC-008)

1. Schedule a pending task with a duration from the unscheduled area.
2. Move its start time.
3. Remove its schedule.
4. Try a start time of `23:30` with a 60-minute duration.
5. Complete a scheduled task on the Tasks page, then return to Home.

Expected:

- Create and move each take at most four interactions and removal at most two (SC-006), announce success, and leave every other activity unchanged.
- Removal returns the task to the unscheduled area with title, priority, due date, and status intact.
- Step 4 is rejected with a clear explanation and no data changed.
- The completed task stays at its time position with a text completion indicator and no scheduling action.
- Viewing, navigating dates, and changing language change zero records (SC-008).

## Scenario 4 — Conflict acknowledgment and decline (FR-021–FR-023)

1. Schedule a task at a time that overlaps a fixed commitment.
2. Confirm without checking the acknowledgment; then decline.
3. Repeat and acknowledge.

Expected:

- Confirm is blocked until acknowledgment is given; the dialog lists every conflicting activity with its range.
- Declining closes without writing, and the entered values are preserved if the dialog is reopened.
- Acknowledged save succeeds, the conflict remains visible afterwards, and nothing was rescheduled.

## Scenario 5 — Date navigation and empty states (User Story 4, SC-005, SC-007)

1. Open Home and confirm today is selected.
2. Navigate to the previous day, then to a far future date, then use the today action.
3. Open a date with no data at all; then a date with only unscheduled tasks; then a date with only scheduled entries.
4. Select a date other than today and check weather and suggestions.

Expected:

- The URL gains `?date=YYYY-MM-DD`; reloading keeps the date.
- Each navigation announces the new date and its activity count.
- Empty day explains nothing is scheduled and offers create-commitment and create-task actions in the same view.
- Unscheduled-only day explains nothing is scheduled while tasks stay visible.
- Scheduled-only day explains there are no pending tasks and links to Tasks.
- Weather and Smart Suggestions are absent for non-today dates and present for today.

## Scenario 6 — Degraded storage (FR-052, FR-053, SC-014)

1. In a test build, seed a v1 task envelope and reload.
2. Simulate an unreadable commitments store (corrupt value) and reload.
3. Compare scheduling availability with what the Tasks page allows in the same state.

Expected:

- v1 data loads with no task lost and no slot invented; the envelope is rewritten as v2 on the next task write.
- A corrupt commitments store leaves readable tasks visible, states the overview is incomplete, and withholds conflict and availability results instead of showing partial totals.
- Scheduling is offered exactly when Task Management would allow the equivalent task change; in session-only mode the same warning is shown and the change is not presented as durable.

## Scenario 7 — Accessibility (SC-009)

1. Keyboard only: navigate dates, open the schedule dialog, submit, acknowledge a conflict, remove a schedule, close with Escape.
2. With a screen reader (VoiceOver on macOS, NVDA on Windows): read the timeline, the conflict summary, the availability list, and the unscheduled region.
3. Zoom to 200% and set the viewport to 360, 768, 1024, and 1440 px.

Expected:

- Focus is always visible; focus enters the dialog and returns to the invoking control; no keyboard trap.
- Each row's announcement includes category, title, time range, completion status, and conflict names.
- Available periods announce as available and unassigned.
- Timeline and unscheduled regions announce as separate labeled regions.
- One announcement per change; no duplicate or chatty live-region output.
- No horizontal scrolling at any width or zoom; chronological order is preserved; reduced motion removes animation without losing information.

## Scenario 8 — Localization (FR-015, SC-009)

1. Switch to Spanish in Settings, then back to English.
2. Review every agenda label, dialog, empty state, notice, error, and announcement.

Expected:

- All copy is translated in both languages; no English leakage in Spanish and no hardcoded string in components.
- Dates and times follow the selected locale and date-style preference.
- Switching language mutates no task or commitment.

## Manual audit checklist

- No raw hex colors in agenda components; token-only pills.
- Every time uses `tabular-nums`.
- Timeline entries are ordered by start time with the documented category and end-minute tie-breaks.
- Task rows state priority in text, and the priority never changes chronological order.
- One conflict per connected group; boundary-touching periods never conflict.
- Available total equals the sum of listed periods; nothing under 30 minutes is listed.
- No automatic scheduling, rescheduling, or duration change occurs from viewing or navigating.
- `walday:tasks` reads as version 2 after a write, and a version 1 envelope still loads.
