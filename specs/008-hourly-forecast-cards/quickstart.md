# Quickstart Validation: Hourly Forecast Cards

**Feature**: `008-hourly-forecast-cards` | **Date**: 2026-11-17

Runnable scenarios proving the redesigned hourly forecast works end-to-end. Component contracts and
field rules live in [`contracts/ui-contract.md`](./contracts/ui-contract.md) and
[`data-model.md`](./data-model.md); do not duplicate them here.

---

## Prerequisites

- Node.js 24.x (`.nvmrc`) and npm 11+.
- Dependencies installed: `npm install` at the repository root (and `npm --prefix frontend install`
  if run separately).
- A saved weather location and known hourly forecast data for the current device-local day. In
  development the existing backend proxy supplies Open-Meteo data; no new endpoint is needed.
- Optional: a screen reader (VoiceOver on macOS) for the assistive-technology scenario.

---

## 1. Automated gates

Run from the repository root:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run test
npm --prefix frontend run build
```

Targeted iteration while developing the forecast:

```bash
npm --prefix frontend exec -- vitest run tests/hourly-forecast-cards.test.tsx
npm --prefix frontend exec -- vitest run tests/weather-forecast.test.tsx tests/weather-card.test.tsx
npm --prefix frontend exec -- vitest run tests/weather-a11y.test.tsx tests/weather-responsive.test.tsx
npm --prefix frontend exec -- vitest run tests/weather-i18n.test.ts
```

Expected: all pass; i18n parity includes the two new `home.weather` keys; axe reports no serious
violations in every weather state including loading.

---

## 2. Run the app

```bash
npm run dev
```

Open the Home page (`/`) with a saved location and units. Confirm the current conditions summary is
byte-for-byte the same content/order as before this feature, with the hourly section below it now
rendered as cards.

---

## 3. Responsive and overflow scenarios

Use browser device emulation at exactly 360, 768, 1024, and 1440 CSS pixels, and separately at 200 %
browser zoom.

| Scenario | Steps | Expected |
|---|---|---|
| Narrow 360 px | Open Home with ≥ 4 remaining hours | At least two complete cards visible; next card partially visible; static hint visible; only the forecast row scrolls; `document.documentElement.scrollWidth` equals viewport width |
| Wide 1440 px | Same data | Cards keep the same 96 px width; more complete cards visible; no card stretched; hint appears only if hours remain off-screen |
| No overflow | Use a location/time with one remaining hour | One card, no hint, no empty scroll area |
| Long Spanish labels | Switch language to Spanish, choose a condition like "Parcialmente nublado" | Text wraps inside the card; no clipping, overlap, truncation, or card widening; row still contained |
| 200 % zoom | Zoom to 200 % at 360-equivalent width | Cards remain readable; values not truncated; page does not scroll horizontally |
| Page containment | Try to swipe/drag the page body sideways at each width | Page does not move horizontally; only the forecast row scrolls |

Expected: zero page-level horizontal overflow at all widths; every card measures the same width.

---

## 4. Value and gap scenarios

Use fixture-backed data where possible; otherwise pick a day/hour producing each condition.

| Scenario | Steps | Expected |
|---|---|---|
| Unit preference | Switch Settings units between metric and imperial while Home is open | Every card updates to °C/°F together, with localized unit labels, whole degrees, no mixed units, no reload |
| Zero probability | Find an hour with 0 % probability | Card shows an explicit localized `0 %`; it is not hidden and not treated as unavailable |
| Missing probability | Use a fixture/test snapshot with `precipitationProbability: null` | Card shows the localized unavailable probability text, never `0 %` |
| Missing temperature | Fixture with `temperatureCelsius: null` | Temperature area shows localized "Unavailable"; no `0`, dash, blank, or invented value |
| Unknown condition | Fixture with `condition: 'unknown'` | Card shows the localized unknown condition text with a neutral icon/tone; meaning is in text |
| Fractional values | Fixture with e.g. `21.4 °C` and `12.5 %` | Card shows `21 °C` and `13 %`-style whole values consistent with the summary's rounding; never decimals |
| Partial coverage | Snapshot with fewer hours than the remaining day | Only covered hours render as cards; the existing partial-coverage text appears; no fabricated hours |
| Empty forecast | Snapshot with `hourly: []` | No row and no hint; existing "no hourly forecast" text; current summary still usable |
| Outdated data | Simulate offline/last-known-good weather | Cards render under the existing outdated framing; outdated status stated in text; cards not presented as current |

---

## 5. Keyboard and assistive-technology scenarios

| Scenario | Steps | Expected |
|---|---|---|
| Single tab stop | Tab from the refresh button toward the forecast | Focus lands once on the card row; further Tab leaves it; individual cards never receive focus |
| Visible focus | Focus the row | Clear focus ring visible against the dark surface |
| Arrow scrolling | With the row focused press `ArrowRight` repeatedly, then `ArrowLeft` | Row scrolls one card at a time; focus stays on the row; `Tab` still exits; no keyboard trap |
| End/Home | Press `End`, then `Home` | Row scrolls to the last / first hour |
| Vertical page scroll | Press `ArrowDown` / `PageDown` with the row focused | Page scrolls normally (not intercepted) |
| Screen reader | VoiceOver: navigate to the forecast heading, then the list | Section announced as a labeled region with the "Hourly forecast" heading; list announced with item count in chronological order; each card announces hour, temperature with unit, condition text, and probability once; icons not announced |
| Current hour | Inspect the first relevant card | Marked with visible "Now" text and announced as the current hour; exactly one such card |
| Reduced motion | Enable "Reduce motion" in OS/browser, then focus/scroll the row | Scrolling is immediate without smooth animation; all information and focus behavior unchanged |
| Loading | Reload Home with a throttled network | Exactly one busy state announced; card-shaped placeholders visible but hidden from AT; no layout jump when cards arrive |

---

## 6. Live-update scenarios

| Scenario | Steps | Expected |
|---|---|---|
| Language switch | Change language in Settings while Home is visible (or via the app's language control) | Hour labels, condition text, percentages, and accessibility labels update without reload; layout tolerates longer labels; scroll position does not jump |
| Unit switch | Change units while scrolled mid-row | All cards update together; scroll offset is preserved; no mixed units |
| Background refresh | Stay on Home until the weather refetches, while scrolled partway | Values replace without resetting the row to the start; focus is not lost |
| Location change | Switch location in Settings | Cards reflect the new location's hours only; no stale values from the previous location; current hour/first available hour visible |

---

## 7. Contract checklist

- [ ] One card per forecast hour, chronological, no duplicates or invented hours.
- [ ] Card shows hour, condition icon **and** text, temperature with unit, probability.
- [ ] Current hour marked in text exactly once.
- [ ] `0 %` explicit; missing probability/temperature labeled unavailable.
- [ ] Identical compact card width at 360/768/1024/1440 and 200 % zoom; no stretching/clipping.
- [ ] Exactly one contained scroller; page horizontal overflow measures zero.
- [ ] Hint visible only when hours are off-screen; no new interactive controls.
- [ ] Row is one tab stop, arrow/Home/End scroll, visible focus, no trap; cards not focusable.
- [ ] Loading uses the single surface skeleton with hidden card placeholders.
- [ ] Current weather summary content, order, and behavior unchanged.
- [ ] New strings exist in `en` and `es`; no hardcoded user-facing text.
- [ ] No new dependency, endpoint, storage key, cache rule, or retrieval change.
