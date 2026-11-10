# Quickstart: User Preferences and Localization

**Feature**: 003-user-preferences | **Branch**: `003-user-preferences`

## Prerequisites

- Repository at `/Users/waldir/Sites/walday`
- Node.js and package manager installed (per `frontend/` project)
- Dependencies installed: `cd frontend && npm install`

## Run the application

```bash
cd frontend
npm run dev
```

Open the local URL shown by Vite and navigate to **Settings** (`/settings`).

## Validation scenarios

### 1. Defaults and first-time guest
- Clear site storage (or use a fresh browser profile).
- Open Settings/preferences.
- **Expect**: sensible defaults shown; language resolves to user choice if set, else supported browser locale (`en`/`es`), else English.

### 2. Language selection and precedence
- Set language to Spanish.
- **Expect**: UI text (nav/settings/tasks/not-found surfaces) updates to Spanish in the same session; choice saved locally and restored after reload.
- Confirm user-selected language overrides browser locale.

### 3. Independent settings
- Change language, weather units, and weather location independently.
- **Expect**: each persists and displays correctly; changing one does not alter others.

### 4. Date/time formatting
- Configure date/time presentation.
- **Expect**: formatting helpers render dates/times respecting selected locale and appropriate timezone (see `frontend/src/shared/lib/dateTimeFormat.ts`); preference is stored and restored.

### 5. Persistence and restore
- Set preferences, reload the app (same browser/device).
- **Expect**: preferences restored. With storage cleared/unavailable or corrupt data, app falls back to defaults gracefully.

### 6. Non-mutation guarantees
- With existing tasks/commitments or stored weather info present (when applicable), change language and weather units.
- **Expect**: underlying task/commitment content (`walday:tasks`) and stored weather data remain unchanged (preferences stored separately under `walday:preferences`).

### 7. Accessibility
- Operate all preference controls via keyboard only.
- **Expect**: visible focus, clear labels/selected values, perceivable save feedback announced via status (not color-only), no blocking issues (WCAG 2.2 AA oriented).

### 8. Automated checks

```bash
cd frontend
npm test
npm run lint
npm run typecheck
```

Run any configured accessibility checks (e.g., axe/Lighthouse) for the preferences UI as defined by project tooling.

## Implementation notes (validated)

- Automated coverage added: `tests/preferences-model.test.ts`, `tests/preferences-storage.test.ts`, `tests/preferences-ui.test.tsx`, `tests/preferences-localization.test.ts`, `tests/preferences-formatting.test.ts`, `tests/preferences-feedback.test.tsx`, `tests/preferences-non-mutation.test.ts`.
- Core implementation: `src/entities/preferences/model/*`, `src/shared/lib/preferencesStorage.ts`, `src/shared/lib/dateTimeFormat.ts`, `src/features/user-preferences/*`, `src/shared/i18n/*`, `src/pages/SettingsPage.tsx`, `src/app/App.tsx`.

## References

- [spec.md](./spec.md) — requirements and acceptance scenarios
- [data-model.md](./data-model.md) — preference model and invariants
- [research.md](./research.md) — design decisions
- [contracts/README.md](./contracts/README.md) — no external contracts for this scope