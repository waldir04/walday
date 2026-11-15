# Contract: Agenda UI

**Feature**: `006-daily-agenda` | **Date**: 2026-11-15

Presentation contract for the Home agenda. It defines regions, component props, accessible names, states, and the i18n surface. Tokens, radii, focus, and motion come from the Walday Dark UI contract (spec 005) and are not restated here.

## 1. Region layout

Home renders, in this order:

1. Storage and recovery notices reused from Task Management and Daily Commitments, plus an incomplete-overview notice when a source is unavailable (owned by `HomePage`, above the dashboard).
2. Page heading with the localized selected date and the agenda description (owned by `HomeDashboard`, and the route's `h1`).
3. Weather card and Smart Suggestions — **only** when the selected date is today.
4. Agenda (`DailyAgenda`):
   a. Date navigation.
   b. Conflict summary (when conflicts exist).
   c. Timeline region with ordering hint and entries.
   d. Availability region.
   e. Unscheduled region.
5. One polite live region owned by the agenda.

Region roles:

| Region | Element | Accessible name source |
|---|---|---|
| Timeline | `<section aria-labelledby>` | "Timeline for {date}" heading |
| Conflict summary | `<section aria-labelledby>` | "Conflicts for {date}" heading |
| Availability | `<section aria-labelledby>` | "Available time for {date}" heading |
| Unscheduled | `<section aria-labelledby>` | "Unscheduled tasks" heading |
| Live region | `<div role="status" aria-live="polite" aria-atomic="true">` | Not focusable; announces on change only |

The unscheduled region must never be nested inside, or announced as part of, the timeline region (FR-065).

## 2. `DailyAgenda`

```ts
interface DailyAgendaProps {
  day: AgendaDay
  selectedDate: LocalDate
  today: LocalDate
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  scheduling: {
    enabled: boolean
    reasonKey: string | null       // explanation when disabled
  }
  pending: boolean                 // a task mutation is in flight
  onSelectDate: (date: LocalDate) => void
  onSchedule: (taskId: string) => void
  onAdjust: (taskId: string) => void
  onUnschedule: (taskId: string) => void
  onOpenTasks: () => void
  onOpenCommitments: () => void
  onCreateTask: () => void
  onCreateCommitment: () => void
  liveMessage: string | null     // page-owned announcement text; null renders no message
}
```

Behavior:

- Renders date navigation, conflict summary, timeline, availability, unscheduled list, and the single live region. It does not render the page heading or the storage/recovery notices.
- Renders `liveMessage` in the one polite live region. `HomePage` owns every message, so `DailyAgenda` never announces on its own and nothing is announced twice.
- Never renders an edit or delete control for a task or commitment (FR-076).

## 3. `AgendaDateNav`

```ts
interface AgendaDateNavProps {
  date: LocalDate
  today: LocalDate
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  onChange: (date: LocalDate) => void
}
```

- Uses `shared/ui/DateNav` with agenda labels: previous day, next day, today, and a labeled date input.
- Every control is keyboard operable with a visible `focus-visible` ring; the date input is a native `type="date"`.
- Buttons use `rounded-lg`, minimum 44 px touch targets, secondary variant.
- Changing the date updates `?date=` and moves focus nowhere; the live region announces the result. The announced activity count is the number of timeline entries for the selected date, not the unscheduled tasks.

## 4. `AgendaTimeline` and `AgendaEntryRow`

```ts
interface AgendaSchedulingState {
  enabled: boolean
  reasonKey: string | null       // explanation when disabled
}

interface AgendaTimelineProps {
  entries: AgendaEntry[]
  locale: string
  dateLabel: string             // localized selected date for the region name
  empty: boolean
  pending: boolean
  scheduling: AgendaSchedulingState
  onSchedule: (taskId: string) => void
  onAdjust: (taskId: string) => void
  onUnschedule: (taskId: string) => void
}

interface AgendaEntryRowProps {
  entry: AgendaEntry
  locale: string
  pending: boolean
  scheduling: AgendaSchedulingState
  onSchedule: () => void
  onAdjust: () => void
  onUnschedule: () => void
}
```

Row content:

- Title (breaks on words, never truncated without accessible full text).
- Time range with `tabular-nums`, e.g. `09:00 – 10:30`; an oversized task renders the localized end-of-day label plus its warning.
- Trailing token-only category pill: Fixed commitment, Flexible commitment, or Task.
- Muted secondary line with, as applicable: completion status ("Completed" / "Pending"), priority for task entries, oversize warning, and one entry per conflict ("Conflicts with {title}, {start} – {end}").
- Task rows only: scheduling actions. A pending, unscheduled-on-this-date task is not shown in the timeline at all; a scheduled entry offers "Change time" and "Remove schedule"; an oversized entry also offers "Adjust time or duration".
- When `scheduling.enabled` is false, task scheduling actions are disabled and the plain reason from `scheduling.reasonKey` is rendered next to them.

Accessible name of a row (FR-062):

```text
{Category}: {title}, {start} to {end}, {completion status if task}, conflicts with {titles and ranges}, planned period exceeds the end of the day {if applicable}
```

Ordering hint (FR-003), rendered above the entries and always visible:

```text
Ordered by start time. Activities that start at the same time appear as fixed commitments, then flexible commitments, then tasks.
```

Actions use the existing `RowActions` behavior: revealed on hover and keyboard focus without layout shift, and persistently available on coarse pointers and narrow viewports (44 px targets). Scheduling actions are never the only way to reach information.

## 5. `AgendaConflictSummary`

```ts
interface AgendaConflictSummaryProps {
  conflicts: TimeConflict[]
  entries: AgendaEntry[]
  locale: string
  dateLabel: string             // localized selected date for the region name
}
```

- Renders one line per group: "Conflict {n}: {count} activities — {title list with ranges}".
- States in text when a member is a flexible commitment and therefore adjustable (FR-034).
- Shows a total count of conflicts and involved activities.
- Renders nothing when `conflicts` is empty.
- Renders no announcement itself; the page announces the summary through the single live region when the selected date changes (FR-064).
- Provides no action that resolves, moves, or applies a change.

## 6. `AgendaAvailability`

```ts
interface AgendaAvailabilityProps {
  availability: AvailabilityResult
  locale: string
  isToday: boolean
  dateLabel: string             // localized selected date for the region name
}

interface AvailablePeriodRowProps {
  period: AvailablePeriod
  locale: string
}
```

States:

| State | Rendering |
|---|---|
| `available` with periods | A list of "Available {start} – {end}" rows plus "Total available: {duration}" |
| `available` with no periods, today | "No gap of at least 30 minutes remains today." plus the zero total |
| `available` with no periods, future date | "No free period of at least 30 minutes on this date." plus the zero total |
| `none` / `past-date` | "Available time is not shown for past dates." |
| `none` / `incomplete-sources` | "Available time cannot be calculated because not all data could be read." |

- Periods are informational: no button, no link, no assignment affordance (FR-040).
- Accessible name: "Available and unassigned: {start} to {end}" (FR-063).
- Duration is formatted with the existing duration formatter and `tabular-nums` times.

## 7. `AgendaUnscheduledList`

```ts
interface AgendaUnscheduledListProps {
  tasks: Task[]
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  onOpenTasks: () => void
  onSchedule: (taskId: string) => void
  scheduling: AgendaSchedulingState
  pending: boolean
}
```

- Heading states that these tasks have no assigned time (FR-009).
- Rows show title, priority, and optional due date in Task Management order; no time is displayed or implied.
- Empty state: "No pending tasks without a scheduled time." plus an action to open Tasks (FR-050).
- Each row offers "Schedule" (opens the dialog at the selected date). When `scheduling.enabled` is false the action is disabled and the plain reason from `scheduling.reasonKey` is rendered.
- Always rendered, including when the timeline is empty (FR-010).

## 7.1 `AgendaEmptyState`, `AgendaIncompleteNotice`, `AgendaLiveRegion`

```ts
interface AgendaEmptyStateProps {
  dateLabel: string             // localized selected date
  onCreateCommitment: () => void
  onCreateTask: () => void
}

interface AgendaIncompleteNoticeProps {
  locale: string
}

interface AgendaLiveRegionProps {
  message: string | null
}
```

- `AgendaEmptyState` renders only when a date has no entries and no unscheduled tasks, explains that nothing is scheduled, and offers both create actions in the same view (FR-048, SC-007). Both actions navigate to the existing creation surfaces; the agenda does not create records itself (FR-059).
- `AgendaIncompleteNotice` states the overview is incomplete because not all data could be read and never presents conflicts or availability as complete (FR-052).
- `AgendaLiveRegion` is the single polite, atomic status region; it is not focusable and renders nothing when `message` is `null` (FR-068).

## 8. `ScheduleTaskDialog`

```ts
interface ScheduleTaskDialogProps {
  open: boolean
  mode: 'create' | 'move'
  task: Task
  date: LocalDate
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  initialStartTime: LocalTime | null
  initialDurationInput: string
  conflictsFor: (startTime: string) => ConflictLink[]
  pending: boolean
  onConfirm: (draft: ScheduleDraft) => Promise<boolean>
  onClose: () => void
}
```

- Native `<dialog>` with `showModal()`, focus trap, Escape and explicit cancel, focus returned to the invoking control.
- Fields: date (read-only text; the date is chosen by navigation), start time (`type="time"`), duration (only when the task has none), and a derived end-time preview.
- Validation errors are associated with their fields through `aria-describedby` and summarized in a visible error region.
- When `conflictsFor(startTime)` is non-empty, the dialog lists each conflicting activity and its range and shows an explicit "I understand these activities overlap" checkbox; confirm is disabled until it is checked.
- `conflictsFor` must apply the same overlap rule as `deriveConflicts` to the proposed span against the current `day.entries`, so the live preview and `validateScheduleDraft` cannot disagree.
- Confirm calls `onConfirm` once, prevents duplicate submission while `pending`, closes only on success, and preserves the draft plus shows the error when it returns `false`.
- Changing the start time recomputes conflicts and clears the acknowledgment, so a moved slot must be re-acknowledged.

## 9. `RemoveScheduleDialog`

```ts
interface RemoveScheduleDialogProps {
  open: boolean
  taskTitle: string
  pending: boolean
  onConfirm: () => Promise<boolean>
  onClose: () => void
}
```

- Confirms removal in plain language, states that the task itself is kept, closes on success only, and returns focus to the row action.

## 10. States

| State | Trigger | Presentation |
|---|---|---|
| Initial loading | Home route chunk loading | `AgendaSkeleton` with the final layout; timeline region `aria-busy="true"`; skeleton `aria-hidden` |
| Empty day | No entries and no unscheduled tasks | "Nothing is scheduled for {date}." with actions to create a commitment and create a task (FR-048) |
| Empty timeline, tasks present | No entries, unscheduled tasks exist | "Nothing is scheduled for this date" inside the timeline; unscheduled tasks remain visible (FR-049) |
| Empty unscheduled | No unscheduled tasks | Explanation plus "Open Tasks" action (FR-050) |
| Incomplete overview | Either source unreadable | Notice explaining the overview is incomplete; readable entries still shown; conflict and availability withheld (FR-052) |
| Scheduling unavailable | `scheduling.enabled === false` | Scheduling actions disabled with the plain reason from `scheduling.reasonKey` and a link to Task Management (FR-053) |
| Mutation pending | Any schedule write in flight | Row actions disabled; dialog confirm shows its pending label |
| Mutation failure | Write refused | Live-region failure message; draft and previous slot preserved (FR-027, FR-058) |
| Past date | Selected date before today | Entries and conflicts shown; availability replaced by the past-date explanation; scheduling still available (FR-042, clarification) |

## 11. Responsive and visual contract

- No horizontal scrolling at 360, 768, 1024, or 1440 px, or at 200% zoom (FR-073, SC-010).
- Below 768 px each row becomes a stacked card: title and time first, category pill and actions on their own line; chronological order is preserved and never re-ordered (FR-074).
- Rows use `rounded-2xl border border-border bg-surface p-5`, vertical gaps `space-y-3`, times `tabular-nums`.
- Category pills use `tag-border`/`tag-text`; conflict and oversize text use `warning` while retaining text; no state is color-only.
- Transitions use `150ms ease-out` and respect `prefers-reduced-motion`.
- At most three primary data points per row: status/leading indicator (when applicable), title with time, trailing category pill. Secondary metadata stays muted and compact (FR-075).

## 12. i18n surface (`agenda` namespace)

Required keys in both `en` and `es`:

- Date navigation: previous, next, today, date label, selected-date label.
- Headings: timeline, conflicts, availability, unscheduled, ordering hint.
- Categories: fixed commitment, flexible commitment, task.
- Entry metadata: completed, pending, time range separator, end-of-day label, oversize warning, conflict line, adjustable label.
- Task priority labels are reused from the existing `tasks` namespace (`priorityOptions`) rather than duplicated in `agenda`.
- Conflict summary: group line, totals, announcement.
- Availability: period label, total label, no-gap states, past-date state, incomplete state, unassigned label.
- Unscheduled: heading, empty explanation, schedule action.
- Dialogs: titles, field labels, duration hint, derived end label, conflict acknowledgment, confirm, cancel, pending, failure.
- Empty day: heading, explanation, create-commitment action, create-task action.
- Incomplete overview notice, scheduling-unavailable explanation.
- Announcements: date changed, conflicts changed, availability changed, schedule created/moved/removed, schedule failed.

All times and dates are formatted with `Intl` through `formatLocalTime`/`formatLocalDate` and the user's date-style preference. No user-facing string is hardcoded in a component.
