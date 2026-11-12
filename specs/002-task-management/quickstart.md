# Quickstart: Task Management Validation

**Feature**: `002-task-management` | **Date**: 2026-11-12

This guide validates the feature end to end against [spec.md](./spec.md). It is a run and verification guide, not an implementation plan; details live in [plan.md](./plan.md), [data-model.md](./data-model.md), and [contracts/](./contracts/).

## 1. Prerequisites

- Node.js 24 LTS (the repository pins it in `.nvmrc`).
- npm 11.
- A modern evergreen browser.
- No backend, database, account, or network connection is required.

## 2. Setup and run

From the repository root:

```bash
npm install
npm run dev
```

Open the task surface at `/tasks` (for example `http://localhost:5173/tasks`). The route is lazy-loaded and uses a task-specific skeleton that matches the final heading, guest notice, form, and list layout.

## 3. Quality gates

Run each command from the repository root:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:coverage
npm run build
```

Expected:

- All commands pass from a clean install.
- Coverage remains at or above 80% globally and 90% for `entities/task`.
- No `any`, unjustified type assertion, or suppressed error is introduced.
- The build completes without bundle-size warnings attributable to this feature; no new runtime dependency is present.

## 4. Core validation scenarios

Each scenario states the observable outcome. Record pass/fail and the requirement or success criterion it covers.

### 4.1 Create and view (US1, FR-007–FR-013, SC-001, SC-002)

1. Open `/tasks` with no stored tasks. Verify the empty state explains the feature and provides a primary action. Confirm a first-time guest can create a valid title-only task in under 30 seconds without assistance (SC-001).
2. Activate the empty-state action. Verify focus moves to the title field.
3. Submit a valid title only. Verify:
   - a pending task appears in the pending group;
   - priority is Medium, description/date/duration are absent;
   - the creation is announced and the form resets;
   - focus returns to the title field.
4. Create a task with description, High priority, due date, and `1 h 30 min`. Verify all values display and the duration reads as 90 minutes in localized form.
5. Create a title with leading/trailing spaces. Verify the stored/displayed title is trimmed.
6. Submit titles of 2, 3, 200, and 201 grapheme clusters. Verify 2 and 201 are rejected; 3 and 200 are accepted.
7. Submit an emoji or combined character as one grapheme at the boundaries. Verify it counts as one.
8. Submit whitespace-only and >2000-grapheme descriptions. Verify the title/description rules behave as specified.
9. Rapidly activate Create twice. Verify only one task is created.
10. Enter HTML-like text. Verify it renders as literal text and is never executed.

### 4.2 Edit and cancel (US2, FR-014–FR-019)

1. Edit a task's title, description, priority, due date, and duration, then save. Verify all changes display and persist.
2. Verify the task keeps its identity and position within its group.
3. Reopen the edit form, change fields, then cancel. Verify the original values remain and focus returns to a logical control.
4. Submit invalid values (empty/too-short title, nonexistent date, zero/fractional/out-of-range duration). Verify:
   - no field is partially applied;
   - field errors are associated with their inputs;
   - the input is preserved;
   - a summary appears when multiple errors exist.
5. Verify changing non-status fields never changes completion status.
6. Verify no edit is committed on blur, keystroke, or navigation without Save.

### 4.3 Delete (US3, FR-020–FR-026, SC-004)

1. Request deletion. Verify no task is removed and the confirmation identifies the task by title.
2. Cancel. Verify the task is unchanged and focus returns to the delete control.
3. Request deletion again, press Escape. Verify cancellation is safe and focus returns.
4. Confirm deletion. Verify the task is permanently removed, the removal is announced, the write succeeds, and focus moves to the next logical element.
5. Delete the last task. Verify the empty state appears with a primary action.
6. Mark a task completed. Verify no deletion confirmation appears and the task remains.
7. Delete a completed task. Verify the same confirmation behavior applies.

### 4.4 Persist and restore (US4, FR-054–FR-065, SC-003, SC-008)

1. Create, edit, complete, and delete tasks.
2. Reload the application. Verify all valid tasks, statuses, metadata, and ordering are restored exactly.
3. Close the tab and reopen `/tasks`. Verify the same result.
4. Open DevTools → Application → Local Storage. Verify the `walday:tasks` value is a v1 envelope with `version`, `revision`, `updatedAt`, and `tasks`; it is not a bare array.
5. Verify the guest-storage notice is visible and explains loss on storage clear or device change.

### 4.5 Completion and focus (US5, FR-027–FR-031)

1. Toggle a pending task to completed. Verify it remains visible in the completed group with all metadata, and focus remains on that task's completion control after the move.
2. Toggle it back to pending. Verify it returns to the pending group and focus remains on the control.
3. Verify status is exposed by text and semantics, not color alone, and is announced.
4. Reload. Verify the status persists.

### 4.6 Priority, due date, duration, and ordering (US6, FR-032–FR-053, SC-005, SC-012)

1. Create tasks with Low, Medium, and High priorities. Verify each shows a localized text label.
2. Set due dates for today, a past date, a future date, and then clear one. Verify clearing leaves the task valid.
3. Verify a pending task with a past due date is marked past due by text, not color only.
4. Complete that task. Verify the due date remains but the past-due label disappears.
5. Enter `30 min`, `1h`, `90 min`, `1 h 30 min`, and `24h`. Verify each resolves consistently, `24h` resolves to 1440 minutes, and each displays in localized form.
6. Enter `30`, `0`, `-5`, `1.5h`, `25h`, and `soon`. Verify each is rejected with an accessible field error; bare numbers are ambiguous.
7. Create tasks in both statuses. Verify all pending tasks precede all completed tasks, and within each group the newest-created task is first.
8. Edit a task's priority/date/duration. Verify its position does not change solely because of the edit.
9. Create two tasks with equal `createdAt` (use the automated test for determinism). Verify the order is stable across reloads.
10. Verify that when only completed tasks exist, the completed group remains visible and the global empty state does not appear.
11. Verify long titles/descriptions and Spanish copy wrap without clipping or horizontal scrolling at 360 px.

### 4.7 Accessibility and localization (US7, FR-066–FR-085, SC-006, SC-007, SC-014)

1. Complete create, edit, delete, completion, and restore journeys with the keyboard only. Verify logical order, visible focus, no traps, and Escape behavior in dialogs.
2. Verify each dialog moves focus into it, contains focus, and returns focus to the invoking control on close.
3. Verify each repeated edit/delete/completion control has an accessible name that includes the task title.
4. Verify invalid fields have programmatically associated labels and errors; multiple errors produce an accessible summary.
5. Verify create, edit, delete, completion, restore, and persistence-failure updates are announced through a live region without unexpected focus movement.
6. Switch the language to Spanish from Settings. Verify:
   - all task copy, labels, errors, dialogs, empty states, and announcements are Spanish;
   - the document `lang` becomes `es`;
   - dates and durations format for the locale;
   - user-entered task titles and descriptions are unchanged;
   - unsaved form input and an open edit/confirmation context are preserved;
   - no raw keys, blank labels, or untranslated English copy appear for keys that exist in Spanish.
7. Switch back to English. Verify the same behavior.
8. Run axe-core checks through the test suite. Expect zero critical or serious violations. Automated contrast measurement is disabled in jsdom; rely on the design-token contrast tests and a manual contrast spot check.
9. Verify every interactive control has at least a 24 by 24 CSS pixel target (44 px recommended), including the completion checkbox and icon-like actions.
10. Verify the always-visible guest-storage notice is readable in normal mode and remains visible alongside persistence warnings.
11. Trigger a slow lazy-chunk load and verify the task skeleton matches the final layout, marks the region `aria-busy`, and does not expose decorative shapes to assistive technology.
12. Perform a VoiceOver with Safari pass on macOS and iOS for the critical journeys.
13. Verify 200% text resizing, 400% browser zoom, and widths of 360, 768, 1024, and 1440 px without loss of content, control, or horizontal scrolling.
14. Enable `prefers-reduced-motion`. Verify no essential state change depends on animation.

## 5. Storage failure drills

Use the browser console on `/tasks`. These snippets simulate boundary conditions; they are validation tooling, not application code.

### 5.1 Reset to a clean state

```js
localStorage.removeItem('walday:tasks')
location.reload()
```

### 5.2 Corrupt payload

```js
localStorage.setItem('walday:tasks', '{not valid json')
location.reload()
```

Expected: the application does not crash, shows a recovery/error state rather than the empty state, preserves the raw value, and blocks writes until the guest explicitly confirms discarding the unreadable data. Cancel enters protected read-only mode: the raw value stays untouched, tasks remain usable in memory, and no later write overwrites the stored payload. Confirm discard: a fresh v1 envelope is written and the feature returns to normal mode.

### 5.3 Partial corruption and duplicate identities

Seed an envelope containing the valid record from [data-model.md](./data-model.md) §2.1 plus:

- an invalid record (for example a missing title or an invalid priority);
- two records sharing the same `id`.

Expected: valid unique records are restored; invalid and duplicate-identity records are quarantined; the guest is told how many tasks could not be restored (with correct pluralization); writes are blocked until explicit confirmation. Canceling enters protected read-only mode and preserves the raw payload; confirming writes a fresh v1 envelope containing only the restored valid records.

### 5.4 Unsupported newer version

```js
localStorage.setItem(
  'walday:tasks',
  JSON.stringify({
    version: 99,
    revision: 'future',
    updatedAt: new Date().toISOString(),
    tasks: [],
  }),
)
location.reload()
```

Expected: the payload is preserved untouched, the guest is informed that the data cannot be read safely, task management remains usable in unsupported read-only mode, and no write overwrites the newer data.

### 5.5 Unavailable storage

To test the retry path without reloading, capture the original methods before overriding them:

```js
const originalStorage = {
  getItem: Storage.prototype.getItem,
  setItem: Storage.prototype.setItem,
}

Storage.prototype.getItem = () => {
  throw new DOMException('denied', 'SecurityError')
}
Storage.prototype.setItem = () => {
  throw new DOMException('denied', 'SecurityError')
}
```

Expected: task operations remain usable in memory, a persistent accessible warning states that changes may not be saved, and success feedback says the change applies only to the current session. Restore the original methods with `Storage.prototype.getItem = originalStorage.getItem` and `Storage.prototype.setItem = originalStorage.setItem`, then retry: if the stored task set was non-empty, verify a conflict is surfaced instead of overwriting it; if it was empty, the retry may save.

### 5.6 Quota failure

```js
Storage.prototype.setItem = () => {
  throw new DOMException('quota', 'QuotaExceededError')
}
```

Expected: the in-memory change is retained, the failure is announced, success feedback does not claim persistence, and retry is available when meaningful. Reload restores the last successfully persisted state.

### 5.7 Legacy v0 migration

```js
localStorage.setItem(
  'walday:tasks',
  JSON.stringify([
    {
      id: crypto.randomUUID(),
      title: 'Legacy task',
      priority: 'medium',
      completed: false,
      createdAt: Date.now(),
    },
  ]),
)
location.reload()
```

Expected: the legacy record is migrated to the v1 shape, the task is usable, and the stored value becomes a v1 envelope after the next write. A migration that cannot complete safely is covered by the automated test: the original payload remains, the UI enters protected read-only mode, and no partial result is presented as authoritative.

### 5.8 Storage cleared while open

Clear the key in DevTools while the application is open. Expected: with no draft, pending write, or degraded persistence mode, the empty store is applied, the empty state appears, and the user is told local data was cleared. With local work or a non-normal persistence mode, the work is preserved, the conflict is surfaced, and no cleared data is silently resurrected.

## 6. Multi-tab scenarios (FR-062, SC-013)

1. Open `/tasks` in two tabs.
2. Create a task in tab A while tab B is idle. Verify tab B reflects the change or explicitly indicates newer data exists.
3. Start editing in tab B, then change the same task in tab A. Save in tab B. Verify tab B does not silently overwrite tab A's newer data; it surfaces a conflict and preserves the draft.
4. Clear storage in tab A. Verify tab B applies the empty store only when idle and in normal persistence; otherwise it preserves local work and surfaces a conflict. In both cases, tab B informs the user and does not claim its current changes are saved.
5. In a browser without Web Locks support, verify the read-verify-write fallback still aborts stale writes.

## 7. Large-list validation (FR-053, FR-092, SC-010)

1. Use the automated 500-task test for rendering and ordering. Perform the SC-010 action-budget measurement against the production build (`npm run build` then `npm run preview`) on the documented reference environment.
2. For a manual check, seed 500 records in a v1 envelope with distinct `createdAt` values, then reload.
3. Verify:
   - ordering and grouping are correct;
   - create, edit, delete, and completion actions remain responsive;
   - actions complete within 1 second on the reference environment using the production build;
   - dragging the window to 360 px does not introduce horizontal scrolling.
4. If the measured budget fails, record the result and evaluate virtualization before changing the design.

## 8. Expected artifacts

After validation, the following must be true:

- `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, and `tasks.md` match the implemented behavior.
- Every functional requirement and validation rule in the specification has a corresponding passing test or a documented manual check.
- The feature works with the network disabled and with no backend running.
- No task content appears in logs or error output.
- ADR 0006 records the task domain placement decision and ADR 0003's follow-up note is updated.
