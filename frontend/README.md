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

## User Preferences & Localization (003)
- **Location**: Settings page (`/settings`) via `src/features/user-preferences`.
- **Guest persistence**: stored locally under key `walday:preferences` (`src/shared/config/preferences.ts`); restored on return in same browser/device. Unavailable/cleared/corrupt storage falls back to defaults.
- **Language**: `en`/`es`. Resolution: user-selected > supported browser locale (`en`/`es`) > English fallback. Applied immediately in-session via i18n.
- **Date/time**: locale-aware presentation (`locale-short|medium|long`) respecting selected locale and timezone context (`src/shared/lib/dateTimeFormat.ts`).
- **Weather**: units (`metric`/`imperial`) and location (optional) are independent settings; changes are presentation/config only.
- **Invariants**: preference updates do not mutate task/commitment data (`walday:tasks`) or stored weather information. Stored values are sanitized on read.
- **Accessibility**: labeled, keyboard-operable native controls and perceivable save feedback (WCAG 2.2 AA oriented). 
