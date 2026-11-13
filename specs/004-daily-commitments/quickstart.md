# Quickstart: Daily Commitments

**Feature**: 004-daily-commitments | **Branch**: `004-daily-commitments` | **Date**: 2026-11-12

This is a validation guide. It proves the feature end to end; it does not include implementation code, schemas, or test suites. See [data-model.md](./data-model.md) and [contracts/commitment-storage.md](./contracts/commitment-storage.md) for the rules referenced here.

## Prerequisites

- Node.js `>=24 <25` and npm `>=11` (see `frontend/package.json`).
- Repository root: `/Users/waldir/Sites/walday`.
- No database, backend server, or environment file is required for this feature. Commitment data is browser-local.
- Install dependencies:

```bash
cd frontend
npm install
```

## Run

```bash
cd frontend
npm run dev
```

Open the URL printed by Vite and navigate to `/commitments`. The route is also reachable from the main navigation.

## Automated checks

Run from `frontend/`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Coverage (Constitution VII: at least 80% global, about 90% for critical logic):

```bash
npm run test:coverage
```

Expected: all commands pass; the commitments suites cover validation, storage outcomes, overlap/acknowledgment, date view, multi-tab blocking, a11y, i18n, and the no-network guarantee.

## Validation scenarios

### 1. Create fixed and flexible commitments (US1)

1. Open a date with no commitments. Expect an empty state with an explanation and a create action.
2. Open the create form. Expect:
   - The date is pre-filled with the currently viewed date and can be changed.
   - **No type is selected**; both fixed and flexible are visible with their explanations.
3. Press save without choosing a type. Expect the save to be blocked and the type field to be identified accessibly.
4. Choose **Fixed**, enter a title, date, `09:00`–`10:00`, and save. Expect success feedback, the commitment in the list, and a visible "Fixed" text label.
5. Choose **Flexible**, add an optional description, and save. Expect a "Flexible" label and chronological placement.
6. Reload the page in the same browser. Expect both commitments restored with all fields intact.
7. Create a commitment on a past date and on a future date. Expect both accepted and visible on those dates.

### 2. Date navigation and ordering (US1, FR-030/FR-031)

1. Use previous/next/today and the date input. Expect the URL to reflect `?date=YYYY-MM-DD` and the list to show only that date.
2. Add commitments at `09:00`, `09:00`, and `17:00` with different titles. Expect start-time order, then alphabetical title order for the tie.
3. Reload on a non-today date. Expect the viewed date to be preserved.
4. Open a new form while viewing another date. Expect that date pre-filled (SC-016).

### 3. Edit and delete with explicit control (US2)

1. Edit a commitment; change the title and description; save. Expect updated values, success announcement, and unchanged date/times/type.
2. Edit a fixed commitment and explicitly change it to flexible. Expect the type change saved without altering date or times.
3. View or edit other commitments. Expect no automatic change to fixed or flexible schedules.
4. Delete a commitment. Expect a confirmation dialog that names the commitment.
5. Cancel the dialog. Expect the commitment unchanged and focus returned to the delete control.
6. Confirm deletion. Expect removal, a success announcement, and focus on the next item or the empty-state action.
7. With unsaved edits, attempt to leave the form. Expect a warning offering discard or return.

### 4. Validation (US3)

Verify each case is rejected, not saved, and communicated accessibly:

1. Missing or whitespace-only title.
2. Title over 120 characters.
3. Description over 500 characters (entered text preserved).
4. Missing date, malformed date, and a non-existent calendar date (for example `2026-02-30`).
5. Missing or malformed times.
6. Equal start and end times.
7. End time earlier than start time.
8. End time `00:00` (cross-midnight) and any period that would cross midnight.
9. Several invalid fields at once: expect a summary, field messages associated with inputs, and focus moved to the summary or first invalid field.
10. Correct a field after a failed submit. Expect its message to disappear without another submit.

An invalid range plus an overlap must show the range error, not the overlap acknowledgment (FR-029).

### 5. Overlaps and acknowledgment (US3)

1. Create a commitment that partially overlaps an existing one. Expect every conflict listed by title and time range before saving.
2. Decline the acknowledgment. Expect no save and the draft preserved.
3. Acknowledge and save. Expect the save to succeed, an overlap indication with text to remain, and no other commitment changed.
4. Test containment, identical periods, multiple simultaneous conflicts, and boundary-touching periods. Expect boundary-touching periods **not** to conflict; all others to list every affected commitment.
5. Edit a commitment into another commitment's period. Expect an acknowledgment. Verify the commitment is not reported as conflicting with itself.
6. Edit only the title, description, or type of an overlapping commitment. Expect **no** second acknowledgment and the conflict indication still visible (SC-015).
7. Edit the date or times and keep an overlap. Expect a new acknowledgment.
8. Delete or shorten the conflicting commitment. Expect warnings to update without changing the remaining commitments.

### 6. Save failure and storage resilience (FR-038–FR-042)

1. Visit `/commitments` for the first time. Expect the local-only data-loss warning before or at the first save, in the active language.
2. Force a write failure without changing code by overriding storage in the browser console:

```js
const originalSetItem = Storage.prototype.setItem
Storage.prototype.setItem = function (key, value) {
  if (key === 'walday:commitments') {
    throw new DOMException('Quota exceeded', 'QuotaExceededError')
  }
  return originalSetItem.call(this, key, value)
}
```

   Then attempt a save. Expect:
   - No success message and no entry in the list.
   - The form still open with all entered values.
   - An accessible error and a retry option.
   - Cancel closes the failed save without creating the commitment.

   Restore storage with `Storage.prototype.setItem = originalSetItem` and retry; expect success.

3. Block storage entirely (for example, disable site data in browser settings). Expect the app to remain usable, the storage warning to be visible, and no false empty-success state.
4. Store invalid JSON under `walday:commitments`, reload. Expect the app to stay usable, valid data (if any) preserved, an explanation that some data could not be restored, and no automatic overwrite.
5. Clear browser storage and reload. Expect the empty state plus the data-loss warning; no fabricated commitments.

### 7. Multi-tab protection (FR-042)

1. Open `/commitments` in two tabs on the same origin.
2. Save a commitment in tab A.
3. Attempt to save in tab B without reloading. Expect the save to be blocked, an accessible message that newer data exists, and a reload action.
4. Reload tab B. Expect newer data visible and saving available again.

### 8. Accessibility and responsive behavior

1. Complete create, edit, delete, date navigation, and acknowledgment using only the keyboard, with a visible focus indicator and no traps.
2. Confirm dialog focus enters the dialog and returns to the invoking control on close.
3. Check validation summaries, field errors, conflict warnings, success, and storage notices with a screen reader or the accessibility tree.
4. View type labels and conflict indications in grayscale/forced-colors mode. Expect text to carry the meaning.
5. Test at 360, 768, 1024, and 1440 px and at 200% browser zoom. Expect no horizontal scrolling, no hover-only behavior, and touch targets of at least 24×24 CSS px.
6. Enable reduced motion. Expect no essential animation.

### 9. Internationalization

1. Switch between English and Spanish while the form has entered values. Expect labels, instructions, validation, conflict, storage, and success messages to update without losing input or reloading the page.
2. Confirm the document `lang` reflects the active language.
3. Confirm dates and times follow the active formatting locale and date-time presentation preference, and that switching the interface language never changes stored dates or wall-clock times.
4. Confirm titles and descriptions are never translated.

## Expected outcomes

- All scenarios above pass with no false success, no silent modification, and no cross-date or self-conflict.
- `lint`, `typecheck`, `test`, and `build` pass.
- No network request is made by commitment flows.

## Implementation status and validation evidence (2026-11-12)

Implementation is complete. The scenarios above are covered by the automated suite, and the quality gates pass:

| Evidence | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 70 files, 452 tests pass |
| `npm run build` | Pass |
| `npm run test:coverage` | Statements 89.87%, branches 81.31%, functions 93.83%, lines 91.98%; all thresholds pass |

| Quickstart scenario | Automated coverage |
|---|---|
| 1. Create fixed/flexible | `tests/commitments-ui.test.tsx`, `tests/commitments-validation.test.tsx` |
| 2. Date navigation and ordering | `tests/commitments-date-view.test.tsx`, `tests/commitment-ordering.test.ts` |
| 3. Edit and delete | `tests/commitments-edit.test.tsx`, `tests/commitments-delete.test.tsx`, `tests/commitments-unsaved-guard.test.tsx` |
| 4. Validation | `tests/commitments-validation.test.tsx`, `tests/commitment-model.test.ts` |
| 5. Overlaps and acknowledgment | `tests/commitments-overlap.test.tsx`, `tests/commitment-ordering.test.ts` |
| 6. Save failure and recovery | `tests/commitments-save-failure.test.tsx`, `tests/commitments-persistence.test.tsx`, `tests/commitments-storage.test.ts`, `tests/commitments-storage-write.test.ts` |
| 7. Multi-tab protection | `tests/commitments-multitab.test.tsx`, `tests/commitments-hook.test.tsx` |
| 8. Accessibility and responsive | `tests/commitments-a11y.test.tsx`, `tests/commitments-responsive.test.tsx` |
| 9. Internationalization | `tests/commitments-i18n-parity.test.tsx` |

The storage-failure console recipe and the two-tab scenario are exercised with injected storage and simulated `StorageEvent`s. Screen-reader, forced-colors, and 200% browser-zoom checks remain manual assistive-technology validations; the automated suites verify the underlying roles, focus management, non-color text, target sizing classes, and responsive rendering at 360/768/1024/1440 px.

## References

- [spec.md](./spec.md) — requirements, clarifications, and acceptance scenarios
- [plan.md](./plan.md) — architecture, audit, and implementation decisions
- [data-model.md](./data-model.md) — entities, validation codes, overlap and lifecycle rules
- [research.md](./research.md) — resolved decisions and alternatives
- [contracts/commitment-storage.md](./contracts/commitment-storage.md) — local store contract

## Out of scope

External calendar sync, cloud/cross-device access, recurring commitments, reminders, notifications, team scheduling, all-day/multi-day/cross-midnight commitments, drag-and-drop or bulk operations, import/export/search/filter, undo after deletion, and any scheduling algorithm.
