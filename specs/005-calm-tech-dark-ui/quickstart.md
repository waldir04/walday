# Quickstart Validation: Calm Tech Dark UI Redesign

**Feature**: `005-calm-tech-dark-ui`

This guide proves the redesigned UI works end to end. It is a validation runbook, not an implementation script. All work happens in `frontend/`.

## Prerequisites

- Node.js 24 LTS and npm 11 (matches `frontend/package.json` engines).
- No backend or weather provider credentials are required for this feature.
- A browser with native `<dialog>` support and `prefers-reduced-motion` emulation (current Chrome, Firefox, Safari, or Edge).

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open the printed local URL. The app loads the guest-mode UI with empty local stores on a fresh profile.

## Automated verification

Run from `frontend/`:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Expected: all commands exit successfully. The test suite must include the existing task, commitment, preference, storage, security, route-error, loading, and accessibility suites, plus the new tests listed below.

Optional coverage check:

```bash
npm run test:coverage
```

Expected: global thresholds at or above the configured 80% statements/branches/functions/lines and the higher `entities` thresholds.

### New tests that must exist and pass

| File | Proves |
|---|---|
| `tests/navigation-drawer.test.tsx` | Mobile trigger, drawer mount, focus entry/return, Escape, route close, resize close, scroll lock, no duplicate nav |
| `tests/walday-logo.test.tsx` | Inline SVG monogram, mint token inheritance, wordmark visibility, `showText={false}` |
| `tests/a11y-tokens.test.tsx` (updated) | Canonical token values, `border-strong` control contrast, decorative border distinction, focus ring |
| `tests/home-dashboard.test.tsx` | Read-only task collection, task counts, today's commitments, empty CTAs, no edit/delete actions |
| `tests/weather-card.test.tsx` | no-location CTA, loading, ready, stale, unavailable, error, unit formatting, tabular numerals |
| `tests/smart-suggestions.test.tsx` | Empty renders nothing, loading/ready/error, mint token treatment, reasons are text, no actions |
| `tests/row-actions.test.tsx` | Desktop opacity/focus reveal without shift, touch disclosure, accessible action names |
| `tests/dark-surfaces.test.tsx` | Home, Tasks, Commitments, and Settings share the dark canvas/surfaces with one heading and main landmark per route |
| i18n parity tests (updated/near existing) | English and Spanish keys for navigation, Home, weather, suggestions |

## Manual validation matrix

Run these checks at **360, 768, 1024, and 1440 px** widths and at **200% browser zoom**.

### 1. Brand and shell

1. Open `/`.
2. Confirm the sticky header shows the inline geometric `W` monogram in mint and the `Walday` wordmark.
3. Confirm the logo remains crisp at 200% zoom.
4. Confirm the header stays at the top while scrolling, uses a translucent dark canvas with blur, and has a subtle bottom border.
5. Confirm the page canvas is obsidian slate and no pure-black or light page background appears.

Expected: one banner, one named navigation landmark, one main region, and one page-level `h1`.

### 2. Desktop navigation

At **768 px and above**:

1. Confirm Home, Tasks, Commitments, and Settings appear as a horizontal row.
2. Confirm no hamburger trigger is visible.
3. Hover each destination: muted cool gray transitions to mint text on an elevated slate surface.
4. Focus each destination with the keyboard: a visible focus ring appears.
5. Navigate to each section: the active destination has mint text, an elevated surface, and a non-color underline/indicator plus `aria-current="page"`.

### 3. Mobile navigation drawer

Below **768 px**:

1. Confirm the horizontal row is absent and one menu button is visible.
2. Activate it with pointer and keyboard: a full-width blurred drawer appears with four stacked, large, rounded destinations; confirm the open transition completes within 200 ms.
3. Confirm focus moves into the drawer and remains there while tabbing.
4. Press Escape: the drawer closes within 200 ms and focus returns to the menu button.
5. Reopen, select a destination: the drawer closes and the destination loads.
6. Reopen, then widen the viewport past 768 px: the drawer closes and the desktop row appears.
7. While open, attempt to scroll the page behind the drawer: background scrolling is locked.
8. Use a screen reader: the drawer is announced as a dialog with a name; background content is not announced as part of it.
9. With `prefers-reduced-motion` enabled: the drawer appears immediately with no essential animation.

### 4. Home without a location

1. Clear the saved weather location (or use a fresh guest profile).
2. Open `/`.

Expected: a calm weather card explains that a location is needed and offers an action to Settings. The action opens `/settings` at the weather location field. Tasks and commitments remain fully usable, and no fake temperature is shown.

### 5. Home dashboard with data

1. Add three tasks (one completed) and two commitments for today.
2. Open `/`.

Expected:

- The heading and date are visible.
- A read-only task summary shows pending/completed counts.
- The same task collection as the Tasks page appears, grouped pending then completed.
- Only today's commitments appear, in chronological order.
- Home rows have no edit, delete, or completion controls.
- Empty task or commitment regions show a calm dark empty card with a working link to `/tasks` or `/commitments`.
- All list gaps are 12–16 px and all times use tabular numerals.

### 6. Weather states (component-level and future wiring)

Use the component tests or a temporary harness outside committed code to render each state. Do not add fake weather data to the running production UI.

- `no-location`: Settings action, no values.
- `loading`: busy announcement and layout-matched skeleton.
- `ready`: location, condition label, large temperature, high/low, precipitation/wind, updated time; numbers align.
- `stale`: ready data plus an explicit stale label.
- `unavailable`: calm explanatory text, no values, no blocking of other content.
- `error`: calm localized unexpected-error text with a retry affordance when meaningful; no raw error.

Expected: changing the preference unit between metric and imperial changes the formatted values and unit labels consistently through the existing preference helper.

### 7. Smart Suggestions

1. Open `/` with no suggestion data.
2. Confirm no suggestion area, placeholder, sample content, or empty decorated shell appears.
3. In component tests, render representative suggestion data.

Expected: a high-contrast light mint card with deep slate text, a heading, and a text reason per suggestion. It reads as system-generated guidance, not as a task. No accept, dismiss, or adjust controls are present.

### 8. Editable row actions

On `/tasks` and `/commitments` at desktop width:

1. Hover a row: edit and delete actions fade in without changing the row height or position.
2. Move the pointer away: actions fade out, and the row never appears stuck.
3. Tab to a row action: it becomes visible through focus and remains keyboard operable.
4. Confirm the accessible names match `Edit <title>`, `Delete <title>`, `Edit commitment: <title>`, and `Delete commitment: <title>`.
5. On a narrow/touch viewport, and on a wide coarse-pointer tablet at 1024 px, confirm each row has one persistent compact actions control with 44 px targets; open it and use edit/delete without hover.
6. Confirm delete still opens the existing confirmation dialog and focus returns correctly.

### 9. Dark surface consistency

Visit `/tasks`, `/commitments`, `/settings`, the retained `/foundation` route, and a nonexistent route.

Expected:

- The canvas, cards, borders, text hierarchy, and focus rings use the shared dark tokens.
- Forms, selects, date navigation, notices, skeletons, empty states, and dialogs use `border-strong` for interactive boundaries.
- No light-theme card, table, notice, or dialog remains.
- Category/priority/type pills use `tag-border`/`tag-text` and a text label; state is never color-only.
- Conflict, past-due, success, warning, and error states include text or an icon.

### 10. Localization and reflow

1. Switch the interface language to Spanish in Settings.
2. Repeat the shell, navigation, Home, and row checks at 360 px.
3. Confirm navigation labels, Home copy, weather states, suggestion states, and row-action labels are translated.
4. Confirm long Spanish location labels wrap and no horizontal scrollbar appears.
5. Confirm the document language changes and route announcements still occur.

### 11. Token and raw-hex audit

From `frontend/`:

```bash
rg -n "#[0-9a-fA-F]{6}" src --glob '!index.css'
```

Expected: no matches in components. The canonical hex values appear only in `src/index.css` and any `index.html` metadata. The logo uses `currentColor` with `text-primary`.

```bash
rg -n "bg-\[#|text-\[#|border-\[#" src
```

Expected: no matches.

```bash
rg -n "text-gray-100|bg-white|text-black|color-scheme: light" src
```

Expected: no matches.

### 12. Regression smoke check

1. Create, edit, complete, and delete a task.
2. Create, edit, and delete a commitment; trigger and acknowledge an overlap.
3. Change language, units, date style, and weather location.
4. Clear or corrupt guest storage and confirm the existing recovery/session-only notices still appear.
5. Navigate directly to `/tasks`, `/commitments`, `/settings`, `/foundation`, and an unknown route.

Expected: all existing behavior is unchanged; only presentation differs.

### 13. Usability and design review

1. With at least five participants, run the SC-009 mobile task: from Home, locate Commitments and Settings within two taps. Record the success rate; target is 90%.
2. With representative suggestion content, run the SC-011 design review: ask reviewers to classify the card as system-generated guidance versus user-owned content. Target is 100% correct classification.
3. Record both outcomes in this file or the feature notes before considering the feature complete.


## Validation Record — 2026-11-13

Automated and static checks executed in this environment:

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS (no errors or warnings) |
| `npm run test` | PASS — 77 files, 495 tests |
| `npm run build` | PASS — 2382 modules transformed |
| `npm run format:check` | PASS |
| Raw hex scan (`src`, excluding `index.css`) | PASS — no matches |
| Arbitrary color class scan (`bg-[#`, `text-[#`, `border-[#`) | PASS — no matches |
| Forbidden light token scan (`bg-white`, `text-black`, `color-scheme: light`) | PASS — no matches |
| Remote font request scan (`dist`) | PASS — none; 7 self-hosted Inter subsets emitted |
| Route chunk review | PASS — separate `TasksPage`, `CommitmentsPage`, and `SettingsPage` chunks; Home stays in the initial chunk through the narrow controller entries |
| Interactive boundary audit | PASS — inputs, selects, textareas, checkboxes, radios, secondary buttons, and the compact disclosure use `border-border-strong`; decorative card borders keep `border-border` |

### Manual browser matrix (section 1–12 above)

Not executed in this environment: it requires a real browser at 360/768/1024/1440 px, 200% zoom, reduced-motion emulation, touch and screen-reader spot checks. The DOM-level equivalents covered by the automated suite are:

- Sticky header, four destinations, `aria-current` plus a non-color indicator: `tests/shell.test.tsx`, `tests/shell-responsive.test.tsx`
- Drawer open/close, focus entry/return, Escape, route change, resize, scroll lock, no duplicated navigation: `tests/navigation-drawer.test.tsx`
- Dark canvas, surfaces, one heading, one main landmark per route: `tests/dark-surfaces.test.tsx`
- Home read-only rows, counts, today-only commitments, empty CTAs, storage notice, no-location action: `tests/home-dashboard.test.tsx`
- Weather states, units, tabular numerals, error retry: `tests/weather-card.test.tsx`
- Suggestion states, empty omission, mint treatment, no action controls: `tests/smart-suggestions.test.tsx`
- Row-action reveal, compact disclosure, exact accessible names: `tests/row-actions.test.tsx`

### SC-009 usability check and SC-011 design review

Not executed. Both require human participants or a facilitated design review (at least five participants locating Commitments and Settings within two taps on mobile, and representative suggestion content being identified as system-generated), which cannot be run in this automated environment. They remain open follow-ups for the product/design review.
