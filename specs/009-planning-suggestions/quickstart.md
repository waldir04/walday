# Quickstart Validation: Planning Suggestions

**Feature**: `009-planning-suggestions` | **Date**: 2026-11-18

Runnable scenarios proving the recommendation surface works end-to-end. Domain rules live in
[`contracts/suggestion-domain.md`](./contracts/suggestion-domain.md), field rules in
[`data-model.md`](./data-model.md), storage in
[`contracts/dismissal-storage.md`](./contracts/dismissal-storage.md), and UI behavior in
[`contracts/ui-contract.md`](./contracts/ui-contract.md). This guide does not duplicate them.

---

## Prerequisites

- Node.js 24.x and npm 11+ (repository pin).
- `npm install` at the repository root.
- A clean or known browser profile for the app origin so guest storage can be seeded predictably.
- Optional: a screen reader (VoiceOver on macOS) and axe DevTools for the accessibility scenarios.

---

## 1. Automated gates

From the repository root:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run build
```

Targeted iteration once the implementation exists:

```bash
npm --prefix frontend exec -- vitest run tests/suggestions-model.test.ts
npm --prefix frontend exec -- vitest run tests/suggestions-storage.test.ts
npm --prefix frontend exec -- vitest run tests/suggestions-surface.test.tsx
npm --prefix frontend exec -- vitest run tests/suggestions-a11y.test.tsx
npm --prefix frontend exec -- vitest run tests/suggestions-integration.test.tsx
npm --prefix frontend exec -- vitest run tests/suggestions-i18n.test.ts
```

Expected: all pass; coverage ≥ 90 % for `features/suggestions/model` and ≥ 80 % global; axe reports
no serious or critical violations in every suggestion state; i18n parity includes every
`suggestions` key.

**Not automated**: SC-009 (five-participant usability check) and the manual screen-reader review in
SC-010 are post-implementation validations. Record them separately; do not treat green tests as
evidence for those outcomes.

---

## 2. Run the app

```bash
npm run dev
```

Open Home (`/`). The Smart Suggestions region appears in the mint surface for today. It must show
one of: cards, a no-suggestion explanation with an action, an incomplete-data notice with retry, or a
loading skeleton while task/commitment sources initialize. Selecting another date hides the region.

---

## 3. Conflict suggestion

1. Create a fixed commitment today from 09:00 to 10:00.
2. Create a pending task with an estimated duration (for example 60 minutes) and schedule it today
   from 09:30 to 10:30 through the agenda.
3. Return to Home.

Expected:
- Exactly one conflict card names both activities, the overlap, and the task as the activity that can
  move; the fixed commitment is described as protected.
- The proposed time does not overlap any activity and is not in the past.
- The reason is visible text and is exposed to assistive technology.
- The agenda still shows the original times and the conflict before any action.

Then activate **Accept**. Expected: only the task's planned time changes, the fixed commitment keeps
its saved times, the agenda updates immediately, the card disappears, one announcement states the
activity and applied time, and focus moves to the next suggestion or the section heading.

Repeat with **Dismiss**. Expected: no data changes, the card disappears for the rest of the local
day on this device, and the agenda keeps reporting the conflict.

---

## 4. Slot ordering and fit

Seed several unscheduled pending tasks with estimated durations:

| Task | Due | Priority |
|---|---|---|
| A | overdue | low |
| B | today | low |
| C | future (earlier) | low |
| D | future (later) | high |
| E | none | high |
| F | none | low |

Ensure at least one presented period fits each. Expected order follows overdue → today → earlier
future → later future → no due date, with priority only among equal due status. No proposed start is
in the past or ends after midnight, and no task without a duration receives a slot suggestion.

Then remove all durations. Expected: no slot cards; the no-suggestion text names missing durations and
offers a path to Task Management.

---

## 5. Weather influence

Prepare two free periods long enough for the same task with clearly different forecast conditions
(for example rain in the earlier span and clear in the later span).

Expected:
- With current weather available for both spans and a material difference, the later clear period is
  chosen and the reason states the factual condition in the selected units.
- With weather unavailable, outdated, or missing hours for one span, the earliest fitting period is
  chosen, no weather is cited, and no weather error replaces the surface.
- With only one period long enough, that period is chosen regardless of weather.
- Switching units or language updates the cited values without applying anything.

---

## 6. Flexible adjustment

1. Create a flexible commitment today that blocks the only period long enough for a pending task.
2. Make sure a valid alternative period exists for the commitment.

Expected:
- A flexible-adjustment card names the commitment to move and the beneficiary task, and states that
  the task will fit afterward.
- The proposed change moves only the commitment, preserving its duration and date.
- Accepting moves only the commitment; the beneficiary task is **not** scheduled by that action.
- After the move, recalculation offers a separate slot suggestion for the task.
- If no valid alternative exists, no card is produced and the agenda remains the source of the
  reported conflict/blockage.

---

## 7. Three-way overlap

Create a connected group of three overlapping activities, including at least one movable activity
that can be fully removed from its overlaps while the other two still overlap.

Expected:
- One card addresses the group, names all activities, and changes at most one activity.
- The chosen activity no longer overlaps anything; the explanation names the overlap that remains
  between the other two.
- The agenda continues to show that remaining conflict.
- If no movable activity can be fully removed, no card is produced for the group.

Fixed-only overlap: no card proposes moving either fixed commitment; the agenda remains the place
where the conflict is described.

---

## 8. Dismissal, review, restore, and day scope

1. Dismiss a card, reload Home on the same device and day.
2. Repeat until all cards are dismissed.
3. Open **Review dismissed**, restore one, then reload.
4. Change the device date to the next day (or run the clock-controlled test equivalent).

Expected:
- The dismissed change does not return after reload on the same device for the rest of the local day.
- The no-suggestion state explains "no recommendations right now", offers review, and offers a
  relevant next action.
- Restore returns the card without applying anything.
- A different proposal for the same activity is still shown; a different activity/change is not
  suppressed.
- The next local day starts with no dismissals.
- A second browser profile/device is unaffected; nothing is tied to the account.
- If storage is unavailable or full, the card still disappears for the session and the UI does not
  claim it was permanently recorded.

---

## 9. Adjust before accepting

Open **Adjust** on a card.

| Action | Expected |
|---|---|
| Choose a different free time on the same day | Current, originally proposed, and adjusted times are shown; confirm applies only the adjusted change and announces it |
| Choose a time overlapping another activity | Every conflicting activity and time range is named; apply is blocked until explicit acknowledgment |
| Decline acknowledgment | No data changes; the dialog can be cancelled without side effects |
| Choose a past time, another date, or a span ending after midnight | Inline error; no data changes |
| Adjust a flexible commitment | Only start time is editable; duration and date are preserved; type stays flexible |
| Cancel | No data changes; focus returns to the invoking button |
| Simulate a save failure | No data changes, the card remains, the entered time is kept, a non-technical error appears, and retry is offered |

---

## 10. Incomplete data and errors

- Corrupt or partially unreadable task storage. Expected: no suggestion is presented as complete; the
  surface states that recommendations are unavailable because the day's plan is incomplete and
  offers retry. Other Home content still works.
- Corrupt or partially unreadable commitment storage. Expected: same incomplete behavior.
- Weather failure. Expected: suggestions still appear from tasks, commitments, and available time;
  no weather is cited; no weather error replaces the surface.
- Suggestion calculation error (injected in a test). Expected: localized generic error with retry; no
  technical details; no other Home content blocked.
- Task completed, deleted, or scheduled elsewhere while a card is displayed. Expected: the card is
  withdrawn on recalculation or refused at application with an explanation and no data change.
- Task duration increased or commitment changed to fixed while displayed. Expected: stale proposal is
  never applied.

---

## 11. Accessibility, localization, and responsiveness

- Keyboard only: reach every card and all three actions, open/operate/cancel the dialog, review and
  restore dismissals, with visible focus and no trap.
- Screen reader: the reason is part of the card description; accept/dismiss/restore announcements
  happen once; focus lands on a meaningful next element.
- Language: switch between English and Spanish while cards are displayed. All labels, reasons,
  dialogs, announcements, and dates/times update without applying anything or losing the cards.
- Units/location: changing weather units or location updates weather reasoning without applying.
- Widths: verify 360, 768, 1024, and 1440 px and 200 % zoom. No page-level horizontal scrolling, no
  clipped action labels, primary actions visible on touch, and no hover-only access.
- Reduced motion: state changes remain understandable with motion removed.

---

## 12. Success-criteria spot checks

| Criterion | Scenario |
|---|---|
| SC-001 | Every card in scenarios 3–6 states activity, current, change, result, and a concrete reason |
| SC-002 | Accepting changes only the intended task time or intended flexible commitment times |
| SC-003 | Every proposed span contains the full duration, avoids all other activities, and stays in the current day |
| SC-004 | Unavailable/outdated/partial weather never removes non-weather suggestions or shows an error |
| SC-005 | Dismissing changes no data and suppresses only the same activity/change on the same device/day |
| SC-006 | At most three cards; identical inputs produce identical order across reloads |
| SC-007 | Every no-suggestion day states a reason and offers at least one action |
| SC-008 | No conflict shape proposes a fixed-commitment change |
| SC-010 | Keyboard and screen-reader journeys complete; axe has no serious/critical violations |
| SC-011 | Agenda reflects an applied change without reload |
| SC-012 | Failed/stale applications change nothing and offer recovery |
| SC-013 | Repeated accept activation produces exactly one change |
| SC-014 | Suggestions render with the rest of Home without delaying it on a 50-task/20-commitment day |
| SC-015 | Every string and value is available in English and Spanish with locale-correct formatting |
