# Quickstart: Daily Commitments

**Feature**: 004-daily-commitments | **Branch**: `004-daily-commitments`

## Prerequisites

- Repository at `/Users/waldir/Sites/walday`
- Node.js and package manager installed (per `frontend/` project)
- Dependencies installed: `cd frontend && npm install`

## Run the application

```bash
cd frontend
npm run dev
```

Open the local URL shown by Vite and navigate to the commitments management surface (implementation path per tasks/plan).

## Validation scenarios

### 1. Create and view commitments (guest, no account)
- Create a **fixed** commitment with title, date, start time, end time.
- **Expect**: saved, displayed, clearly identified as fixed (not by color alone).
- Create a **flexible** commitment with title, optional description, date, start/end.
- **Expect**: saved, displayed, clearly identified as flexible.
- Reload (same browser/device).
- **Expect**: commitments restored.

### 2. Edit and delete with explicit control
- Edit an existing commitment and confirm.
- **Expect**: updated values saved/displayed; no silent changes.
- View fixed and flexible commitments without editing time.
- **Expect**: times unchanged; flexible items not auto-rescheduled.
- Delete a commitment and confirm.
- **Expect**: removed from display and local persistence.

### 3. Time validation
- Attempt to save with end time equal to or earlier than start time.
- **Expect**: rejected, not saved, clear accessible message explaining invalid range.
- Attempt to save with missing required fields or no clear date.
- **Expect**: rejected with clear communication until valid.

### 4. Overlap identification
- Create/edit commitments on the same date with intersecting time periods.
- **Expect**: overlap identified and communicated clearly and accessibly; no commitment silently modified.
- Create multiple overlapping commitments.
- **Expect**: affected overlaps communicated.

### 5. Type distinction and accessibility
- View fixed and flexible commitments and any conflict indicators.
- **Expect**: types and conflicts distinguishable without relying on color alone; time inputs and messages accessible (keyboard/labels/perceivable feedback).
- Switch application language to English and Spanish (per preferences/i18n).
- **Expect**: all user-facing commitment content available in both languages.

### 6. Persistence resilience and agenda readiness
- Clear/unavailable storage scenario.
- **Expect**: graceful handling; no restored records from cleared storage, no fabricated data.
- Inspect stored/loaded commitment data shape.
- **Expect**: data available/consumable for future Daily Agenda feature.

### 7. Automated checks

```bash
cd frontend
npm test
npm run lint
npm run typecheck
```

## References

- [spec.md](./spec.md) — requirements and acceptance scenarios
- [data-model.md](./data-model.md) — commitment model, validation, overlap rules
- [research.md](./research.md) — design decisions
- [contracts/README.md](./contracts/README.md) — no external contracts for this scope

## Implementation notes (validated)

- Automated coverage added: `tests/commitment-model.test.ts`, `tests/commitments-storage.test.ts`, `tests/commitments-ui.test.tsx`, `tests/commitments-edit-delete.test.ts`, `tests/commitments-control.test.tsx`, `tests/commitments-validation.test.ts`, `tests/commitments-overlap.test.tsx`, `tests/commitments-a11y-i18n.test.tsx`.
- Core implementation: `src/entities/commitment/model/*`, `src/shared/lib/commitmentsStorage.ts`, `src/shared/config/commitments.ts`, `src/features/commitments/*`, `src/shared/i18n/locales/{en,es}/commitments.json`, `src/shared/i18n/index.ts`, `src/pages/CommitmentsPage.tsx`, `src/app/router.tsx`, `src/widgets/Navigation.tsx`.
