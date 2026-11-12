# Walday Frontend

React + TypeScript + Vite frontend (FSD-oriented).

## Setup
```bash
npm install
npm run dev
```

## Quality
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Features

### Tasks
Task management (create, edit, delete, toggle, priority, due date, estimated duration) persisted locally under `walday:tasks`. Surface: `/tasks`.

### User Preferences & Localization (003)
Guest preferences (language `en`/`es`, date/time presentation, weather units, weather location) persisted locally under `walday:preferences`. Surface: `/settings`. Language is applied immediately in-session; unsupported values fall back to English.

### Daily Commitments (004)
Scheduled activities that occupy a specific period of a day (distinct from tasks). Each commitment has a title (required), optional description, clear date, start/end times, and a type (`fixed` or `flexible`).

- **Fixed**: must happen at the scheduled time; changed only by explicit user action.
- **Flexible**: may be moved by the user; never auto-rescheduled without approval.
- Validation: start time must be earlier than end time; invalid ranges and missing fields are rejected with clear, accessible feedback.
- Overlaps: intersecting time periods on the same date are identified and communicated without silently modifying any commitment.
- Persistence: guest commitments stored locally under `walday:commitments` and restored on return in the same browser/device context.
- Data is structured for consumption by the future Daily Agenda feature.
- All user-facing content is available in English and Spanish; type/conflict distinctions are not color-only.
- Surface: `/commitments`.

## User Preferences & Localization (003)
- **Location**: Settings page (`/settings`) via `src/features/user-preferences`.
- **Guest persistence**: stored locally under key `walday:preferences` (`src/shared/config/preferences.ts`); restored on return in same browser/device. Unavailable/cleared/corrupt storage falls back to defaults.
- **Language**: `en`/`es`. Resolution: user-selected > supported browser locale (`en`/`es`) > English fallback. Applied immediately in-session via i18n.
- **Date/time**: locale-aware presentation (`locale-short|medium|long`) respecting selected locale and timezone context (`src/shared/lib/dateTimeFormat.ts`).
- **Weather**: units (`metric`/`imperial`) and location (optional) are independent settings; changes are presentation/config only.
- **Invariants**: preference updates do not mutate task/commitment data (`walday:tasks`) or stored weather information. Stored values are sanitized on read.
- **Accessibility**: labeled, keyboard-operable native controls and perceivable save feedback (WCAG 2.2 AA oriented). 
