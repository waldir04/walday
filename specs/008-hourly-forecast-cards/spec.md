# Feature Specification: Hourly Forecast Redesign

**Feature Branch**: `008-hourly-forecast-cards`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Redesign the existing hourly weather forecast section using compact, horizontally scrollable forecast cards. The current weather summary is already implemented and must remain unchanged. The application already receives hourly forecast data. Each card must display the hour, weather condition icon, temperature in Celsius, and precipitation probability. The layout must work consistently across mobile, tablet, and desktop devices."

## Relationship to Existing Features

- **Weather Integration (spec 007)**: This feature is presentation-only. It changes how the already-retrieved hourly forecast is displayed, not what is retrieved or how it is validated. Forecast coverage, freshness, unit handling, incomplete-value handling, and the rule that the forecast covers the remaining hours of the current device-local day remain exactly as defined in spec 007.
- **User Preferences (spec 003)**: The selected weather measurement unit continues to govern displayed temperatures. The user confirmed that cards follow the saved unit preference, with Celsius as the default when metric units are selected. No new preference is introduced.
- **Home and visual identity (spec 005)**: The dark visual identity, token usage, typography hierarchy, tabular numerals, focus behavior, motion rules, and responsive verification widths remain authoritative. This feature applies those rules to the hourly forecast only.
- **Daily Agenda / Home (spec 006)**: The weather surface remains optional contextual information on Home. This feature does not alter its placement, its visibility rules, or any agenda behavior.
- **Product Overview (§4.2, §4.6, §5.1, §5.5, §9.8, §10)**: Weather stays optional context, clearly communicated, accessible, and never a dependency for core planning functionality. The redesign improves scanability without adding new product capability.

## Clarifications

### Session 2026-11-17

- Q: The brief says cards show temperature in Celsius, but Walday already lets users choose metric (°C) or imperial (°F) weather units. Which behavior should the cards follow? → A: Follow the saved unit preference, with Celsius as the default. Always forcing Celsius would override an existing product preference and is rejected.
- Q: The constitution prohibits introducing horizontal scrolling at supported widths, while this feature requires horizontally scrollable cards. How should this be resolved? → A: Only the forecast region scrolls horizontally, within its own contained area. The page itself must never scroll horizontally at any supported width. Keyboard and assistive-technology access must be provided, so the scroller is an intentional, accessible component rather than a page-level overflow.
- Q: When a keyboard user tabs into the hourly forecast, what exactly should receive focus? → A: The card row is a single focusable region — one tab stop with arrow-key scrolling and a visible focus indicator. Individual cards are never focusable, and the hours remain exposed as an ordered list to assistive technology.
- Q: How should the section show that more hours are hidden off-screen? → A: A partially visible next card plus a static, non-hover-only hint. No arrow buttons or other new interactive controls are added, so the section stays display-only.
- Q: Does the hourly section own its own loading and failure states, or does it inherit the existing weather surface state? → A: It inherits the surface. The section has no independent loading, busy, or retry state; the surface's single loading skeleton includes card-shaped placeholders, and gaps and failures are communicated at surface level with the existing retry action.
- Q: How many complete forecast cards must be visible at the smallest supported width of 360px? → A: At least two complete cards, with the next card partially visible as the overflow cue. Wider viewports show as many complete cards as fit without stretching any card.
- Q: How should temperature and precipitation probability be formatted on each card? → A: Whole degrees in both units and whole percentages, rounded consistently with the current weather summary, so values never show decimals on cards.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan the rest of the day at a glance (Priority: P1)

A person checking Home wants to see how temperature, sky condition, and the chance of precipitation change over the remaining hours, so they can decide when to go out or rearrange flexible activities themselves.

**Why this priority**: The forecast already exists as data; presenting it as compact, scannable cards is the core value of this feature. Without this, nothing else in the feature is meaningful.

**Independent Test**: Can be fully tested by saving a location and units, opening Home on a day with forecast data, and confirming that the hourly section presents one compact card per forecasted hour, each showing its hour, condition, temperature, and precipitation probability, without altering the current weather summary.

**Acceptance Scenarios**:

1. **Given** forecast data exists for the remaining hours of the current device-local day, **When** the hourly section is displayed, **Then** each covered hour appears as its own compact card identified by its localized hour label.
2. **Given** a forecast hour with a known condition, **When** its card is displayed, **Then** the card shows that condition's icon together with a text label for the same condition, so the meaning is never conveyed by the icon or color alone.
3. **Given** a forecast hour with a known temperature and the metric unit preference, **When** its card is displayed, **Then** the temperature appears in degrees Celsius with a localized unit label and aligned numerals.
4. **Given** the imperial unit preference is selected, **When** cards are displayed, **Then** temperatures appear in degrees Fahrenheit consistently across every card.
5. **Given** a forecast hour with a precipitation probability, **When** its card is displayed, **Then** the card shows a labeled percentage, including an explicit 0% when the probability is zero.
6. **Given** the hourly section is displayed, **When** it is compared with the current weather summary, **Then** the current weather summary is unchanged in content, ordering, and behavior.

---

### User Story 2 - Read the forecast comfortably on any device (Priority: P2)

A person uses Walday on a phone, tablet, or desktop and expects the same hourly information to remain readable and reachable, with the page itself never drifting sideways.

**Why this priority**: A horizontally scrolling design succeeds only if it behaves predictably across screen sizes and input methods. Responsive behavior is part of the requested outcome, not a refinement.

**Independent Test**: Can be fully tested by viewing the hourly section at 360, 768, 1024, and 1440 pixel widths and at 200% zoom, confirming that cards remain legible, the page never scrolls horizontally, and every forecast hour is reachable by touch, mouse, and keyboard.

**Acceptance Scenarios**:

1. **Given** a narrow viewport, **When** the hourly section is displayed, **Then** at least two complete cards are visible with the next card partially visible, cards remain compact and legible, a static visible hint indicates that more hours are available off-screen, and only the forecast region scrolls horizontally.
2. **Given** a wide viewport, **When** the hourly section is displayed, **Then** the cards use the available width to show as many complete cards as fit without stretching a card beyond a readable compact size.
3. **Given** any supported width or 200% zoom, **When** the section is displayed, **Then** the page never overflows horizontally, no card content is clipped, and values such as temperature or percentage are never truncated.
4. **Given** a touch device, **When** the user swipes across the cards, **Then** the row scrolls smoothly and each interactive target still meets the minimum touch target size.
5. **Given** a keyboard user, **When** focus reaches the hourly section, **Then** the row is a single tab stop, arrow keys scroll it, the region shows a visible focus indicator, individual cards are not tab stops, and focus is never trapped.
6. **Given** the current hour is part of the forecast, **When** the section first appears, **Then** the current hour is visible in the initial scroll position and clearly marked as current in text, not by color alone.

---

### User Story 3 - Understand and navigate the forecast with assistive technology (Priority: P3)

A person using a screen reader or keyboard needs the forecast to be understandable as an ordered sequence of hours and to hear each hour's information in a predictable order.

**Why this priority**: Accessibility is a non-negotiable product requirement, and a horizontal visual layout is the most likely place for content to become unreachable or duplicated for assistive technology.

**Independent Test**: Can be fully tested with keyboard-only navigation and a screen reader, confirming that the section is announced with a heading, the hours are announced in chronological order, each card exposes hour, temperature, condition, and precipitation probability once, and every covered hour can be reached.

**Acceptance Scenarios**:

1. **Given** a screen reader user, **When** the hourly section is reached, **Then** it is announced as a labeled forecast region with a heading, and its hours are announced in chronological order.
2. **Given** a forecast card, **When** it is read, **Then** the hour, temperature with unit, condition text, and precipitation probability are each announced with a meaningful label, and decorative icons are not announced.
3. **Given** a condition icon, **When** the card is read visually, **Then** a visible text label carries the same meaning, so color and iconography are never the only signal.
4. **Given** the current hour, **When** it is read, **Then** its current status is announced in text as well as shown visually.
5. **Given** a user who prefers reduced motion, **When** the row reveals or scrolls, **Then** the same information becomes available without essential animation.

---

### User Story 4 - Trust incomplete or degraded forecast information (Priority: P3)

A person opens Home when only part of the day has forecast data, when a value is missing, or when the weather information is outdated, and needs the design to avoid inventing values or implying more certainty than exists.

**Why this priority**: A compact card layout increases the risk of hiding gaps; the redesign must preserve the existing honesty rules for missing and stale weather data.

**Independent Test**: Can be fully tested by simulating partial forecast coverage, missing temperature, missing precipitation probability, an unknown condition, and outdated information, confirming that gaps are stated rather than filled and the current summary remains usable.

**Acceptance Scenarios**:

1. **Given** forecast data covers only part of the remaining day, **When** the section is displayed, **Then** only covered hours appear as cards and a text message states that part of the day has no forecast information.
2. **Given** a card has no temperature, **When** it is displayed, **Then** the temperature is labeled as unavailable and no placeholder number, zero, or dash-only value is shown.
3. **Given** a card has no precipitation probability, **When** it is displayed, **Then** the probability is labeled as unavailable and is not shown as 0%.
4. **Given** a card has an unknown condition, **When** it is displayed, **Then** the condition is described as unknown in text and uses a non-misleading neutral presentation.
5. **Given** the weather information is outdated but still displayed, **When** the hourly section is shown, **Then** the same outdated context as the current conditions is stated in text, and the cards are not presented as current observations.
6. **Given** no forecast hours are available at all, **When** the section is displayed, **Then** it communicates the gap in text without an empty scrollable row, and current conditions remain unaffected.

---

### Edge Cases

- Only one forecast hour remains in the day: the row shows that card without a misleading empty scroll area or a scroll hint that implies hidden content.
- The current hour is also the last hour of the day: the card is marked current and the section does not invent hours from the following day.
- The device-local day is affected by a daylight-saving transition: hours follow the device clock and no duplicated or missing clock hour is fabricated or merged.
- The selected location is in a different timezone from the device: cards continue to use the device-local hour labels and mark the device's current hour, consistent with the existing forecast definition.
- The interface language changes while the section is visible: hour labels, condition text, precipitation wording, and accessibility labels update without a reload, and the scroll position does not jump unexpectedly.
- The unit preference changes while the section is visible: every card updates to the new unit without mixed units and without a reload.
- A localized condition label or hour label is unusually long in Spanish: the text wraps inside the fixed card width without clipping, truncating, overlapping other content, or widening the card.
- The user enlarges text to 200%: cards remain readable, values are not truncated, and the page still does not overflow horizontally.
- A background refresh completes while the user is scrolled partway through the row: the refreshed values replace the old ones without resetting the user's position unnecessarily or losing focus.
- The user is offline with acceptable last-known forecast data: the cards remain readable, and the section is labeled as outdated rather than current.
- The forecast contains a precipitation probability of 0 for every hour: every card still shows an explicit 0%, which is not hidden as if it were missing.
- A forecast hour arrives with a fractional temperature or probability (for example 21.4 °C or 12.5%): the card shows the rounded whole value, never a decimal, and remains consistent with the current summary for the same hour.
- The forecast contains a very large number of remaining hours (for example, a full day at hourly resolution): the row remains responsive and the user can reach the final hour without degrading the rest of Home.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The existing current weather summary MUST remain unchanged in content, ordering, visual hierarchy, and behavior.
- **FR-002**: The hourly forecast MUST be presented as a chronological sequence of compact forecast cards inside the existing weather surface, using only forecast information the application already receives.
- **FR-003**: Each forecast card MUST display the hour label, condition icon, temperature, and precipitation probability for its hour.
- **FR-004**: Hour labels MUST follow the device-local clock and the active interface language, and the current hour MUST be marked as current in text.
- **FR-005**: Each card MUST pair its condition icon with a text condition label, so condition meaning is never conveyed by icon or color alone.
- **FR-006**: Temperatures MUST follow the saved weather unit preference, defaulting to Celsius, MUST include a localized unit label, MUST be rounded to whole degrees in both units using the same rounding as the current weather summary, and MUST use aligned numerals.
- **FR-007**: Precipitation probability MUST be shown as a labeled localized whole-number percentage, MUST show an explicit 0% when the probability is zero, and MUST be labeled unavailable when the value is missing.
- **FR-008**: Missing temperature or condition data MUST be labeled unavailable in text and MUST NOT be rendered as zero, a dash alone, a blank, or an invented value.
- **FR-009**: The hourly cards MUST be arranged in a single horizontally scrollable row whose scrolling is contained to the forecast region; the page MUST NOT scroll horizontally at any supported width.
- **FR-010**: The layout MUST remain legible and complete at 360, 768, 1024, and 1440 pixel widths and at 200% browser zoom, with no clipped or truncated forecast values.
- **FR-011**: Card width MUST be the same compact width for every card at every supported viewport, so wider screens reveal more complete cards instead of widening cards; at 360 pixels at least two complete cards MUST be visible with the next card partially visible, and no card may be stretched to fill the row.
- **FR-012**: The section MUST provide a visible, non-hover-only affordance that additional hours are available off-screen when the row overflows, implemented as a partially visible next card plus a static hint; the affordance MUST NOT introduce interactive scroll controls, and MUST NOT be shown when no hours are hidden.
- **FR-013**: The card row MUST be a single keyboard tab stop that scrolls with arrow keys, MUST show a visible focus indicator, and MUST NOT create a keyboard trap; individual cards MUST NOT be focusable controls. Hours MUST still be exposed as an ordered list to assistive technology.
- **FR-014**: The card row MUST support touch and pointer scrolling, and its focusable scroll region MUST meet the project's minimum touch target size of at least 24 by 24 CSS pixels (44 pixels recommended); no other interactive targets are introduced by this feature.
- **FR-015**: The hourly section MUST be exposed as a labeled region with a heading, and its hours MUST be exposed as an ordered sequence in chronological order.
- **FR-016**: Each card's hour, temperature with unit, condition text, and precipitation probability MUST each be announced once, with meaningful labels, and decorative icons MUST be hidden from assistive technology.
- **FR-017**: When forecast data is present, the initial scroll position MUST make the current hour visible; when the current hour is not part of the forecast, the first available hour MUST be visible.
- **FR-018**: Loading MUST use the weather surface's single skeleton state, which MUST include card-shaped placeholders that match the final card row, expose one busy state to assistive technology, and avoid layout shift; placeholder cards MUST NOT be announced as forecast content. The hourly section MUST NOT introduce a second, independent loading state.
- **FR-019**: When forecast hours are missing, partial, or entirely unavailable, the section MUST communicate the gap in text at surface level, MUST NOT fabricate hours or values, MUST leave current conditions unaffected, and MUST NOT present its own separate retry action; retry remains the existing surface-level action.
- **FR-020**: The hourly section MUST reflect the same outdated or last-known status as the existing weather surface and MUST NOT present outdated cards as current.
- **FR-021**: All user-facing text introduced or changed by this feature MUST exist in both supported languages, and the layout MUST accommodate longer localized labels.
- **FR-022**: Motion used when revealing or scrolling the row MUST be minimal and MUST respect the user's reduced-motion preference, without removing access to any information.
- **FR-023**: The feature MUST use the existing visual identity, spacing, radius, typography, and semantic color tokens; it MUST NOT introduce raw colors, new visual styles, or a parallel design scale.
- **FR-024**: The feature MUST NOT introduce new weather data sources, new data contracts, new API integrations, or additional runtime dependencies, and MUST NOT change forecast retrieval, caching, or freshness rules.
- **FR-025**: Changing location, units, or language while the section is visible MUST update the cards consistently, without a page reload, mixed units, stale values from a previous location, or content becoming unreachable.
- **FR-026**: Refreshing the forecast MUST preserve the user's reading position and focus when practical, and MUST NOT cause a disruptive jump to the start of the row.

### Key Entities

- **Forecast hour**: One hour of the remaining device-local day, with its device-local time, condition, temperature, and precipitation probability; missing values may be individually absent.
- **Forecast card**: The compact presentation of one forecast hour, carrying the hour label, condition icon and text, temperature with unit, precipitation probability, and current-hour status.
- **Hourly forecast section**: The labeled, horizontally scrollable region inside the existing weather surface that orders forecast cards chronologically and communicates coverage gaps, unavailable values, and outdated status.
- **Weather unit preference**: The user-controlled measurement system that determines the temperature unit shown on each card, with Celsius as the metric default.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of forecasted hours for the remaining day are represented by exactly one card each, with no duplicated or artificially added hours.
- **SC-002**: A user can read the hour, condition, temperature, and precipitation probability for any covered hour from Home without opening another screen or interacting with a card.
- **SC-003**: In usability testing, at least 90% of participants can identify the next hour with the highest chance of precipitation within 10 seconds of the forecast becoming visible.
- **SC-004**: No supported viewport (360, 768, 1024, 1440 pixels) and no 200% zoom state produces horizontal page overflow or clipped forecast values; measured overflow is zero.
- **SC-005**: 100% of forecast hours are reachable by keyboard and announced by a screen reader in chronological order, with each card's four required data points announced once.
- **SC-006**: 0% of missing forecast values are rendered as zero, a blank, or an invented number; every missing value is labeled unavailable instead.
- **SC-007**: The current weather summary shows no regression: all content and behaviors present before the redesign remain present and unchanged.
- **SC-008**: 100% of new or changed user-facing strings are available in English and Spanish, and no user-facing text is hardcoded in the interface.
- **SC-009**: The feature introduces no new external data source, third-party capability, or additional weather retrieval; verified by confirming that forecast inputs and installed capabilities are unchanged.
- **SC-010**: At every supported width, all cards measure the same compact width with no stretching; at 360 pixels, at least two complete cards and one partially visible next card are measurable in every supported state.

## Assumptions

- The hourly forecast continues to cover the remaining hours of the current device-local day, as defined by the existing weather feature; switching to a rolling 24-hour window is out of scope.
- The unit behavior follows the existing weather preference, with Celsius as the metric default; the brief's "Celsius" is treated as the default metric presentation rather than a command to override the user's saved unit.
- Forecast cards are display-only. Selecting, expanding, or opening a detailed view for an hour is not part of this feature.
- The redesign is limited to the hourly forecast section. The current conditions summary, location label, freshness indicators, attribution, refresh action, and every other Home surface are unchanged.
- The existing weather presentation states (loading, ready, outdated, unavailable, no location, invalid location, partial coverage) remain the source of truth; this feature redesigns the hourly forecast portion inside the ready and outdated states and adds card-shaped placeholders to the existing surface loading skeleton, without introducing a separate section-level loading, busy, or retry state.
- The existing forecast data already provides hour labels, condition, temperature, and precipitation probability, including the ability to represent missing individual values.
- The horizontal scrolling resolution confirmed for this feature applies only to the forecast row. Page-level horizontal scrolling remains prohibited.
- The supported languages remain English and Spanish; right-to-left layouts are out of scope.
- Verification uses the project's standard quality gates and responsive widths, and no new testing or tooling capability is required.
