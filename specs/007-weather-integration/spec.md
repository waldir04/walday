# Feature Specification: Weather Integration

**Feature Branch**: `007-weather-integration`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Create a specification for Weather Integration in Walday. The goal is to provide weather information as contextual information that helps users understand the conditions expected during their day. Weather is an optional supporting feature and must never prevent users from managing their tasks, commitments, or agenda."

## Relationship to Existing Features

- **Daily Agenda / Home (spec 006)**: Weather remains a today-only contextual surface on Home. It is omitted for dates other than the current local date and never becomes part of the agenda timeline, conflicts, or available time. This feature defines the weather data behavior behind that surface and does not change the agenda's composition, ordering, or calculations.
- **Home and visual identity (spec 005)**: The existing weather presentation states (ready, loading, stale, unavailable, no-location, error), dark visual identity, tabular numerals, focus, motion, and responsive rules remain authoritative. Spec 005 delivered presentation only; this feature supplies the weather information those states display. Spec 005's stale state is referred to as outdated here, and its generic error state is realized as either the unavailable state (with retry) or the invalid-location state when the saved place itself is unusable. Spec 005's six states therefore map onto this feature's seven presentation states (ready, outdated, loading, unavailable, no location, invalid location, and incomplete forecast coverage), which extend rather than contradict spec 005.
- **User Preferences (spec 003)**: Selected weather location, metric/imperial measurement units, display precision, language, and date/time presentation are owned by User Preferences. This feature consumes those preferences and introduces no new preference. It also hosts the backend implementation of spec 003's already-defined `GET /api/weather/locations` search contract; it adds no new preference, search behavior, or location-resolution rule.
- **Task Management (spec 002) and Daily Commitments (spec 004)**: Weather never reads, writes, gates, or reorders task or commitment data. Weather availability has no effect on those features.
- **Product Overview (§4.6, §5.1, §5.5, §5.7, §9.8)**: Weather is optional context on the dashboard, complete for a selected location and configured units, with unavailable or outdated information communicated clearly, and never a dependency for core functionality.

## Clarifications

### Session 2026-11-16

- Q: When the selected weather location is in a different timezone than the user's device, which clock defines the "current local day" and the "remaining hours" the forecast covers? → A: The user's device timezone defines the current local day, the remaining hours, and the marked current hour; the selected location supplies weather data only.
- Q: Which timestamp should decide whether displayed weather is current or outdated: when the app fetched it, or the observation time the provider reports for current conditions? → A: The provider's observation time when supplied, falling back to fetch time when it is not; a freshly fetched but old observation is outdated.
- Q: At device-local midnight, what should happen to a retained last-known-good snapshot that is still inside the retention window? → A: Discard the entire previous-day snapshot at the date change and retrieve for the new day; no entry from the previous day is shown.
- Q: When the selected location is valid and saved but the provider has no weather data for that place, which state should the surface show? → A: The unavailable state with a retry action, because the preference is valid and Settings cannot fix a provider coverage limit.
- Q: Should the automatic periodic weather refresh announce its success to assistive technologies, or should routine periodic updates stay silent while announcements are reserved for meaningful state changes? → A: Announce loading, outdated, unavailable, recovery, and manual-refresh outcomes; successful automatic periodic refreshes stay silent.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See current conditions for the day (Priority: P1)

A person opens Home to plan their day and wants to understand, at a glance, the weather conditions they can expect right now at the location they chose.

**Why this priority**: Current conditions are the minimum useful weather context. Without them, no other weather capability delivers value.

**Independent Test**: Can be fully tested by saving a location and measurement units in Settings, opening Home, and verifying that current conditions are displayed for that location in those units, and that changing either preference updates the display without a page reload.

**Acceptance Scenarios**:

1. **Given** a saved location, available weather information, and today selected on Home, **When** the weather surface is displayed, **Then** it presents the location label, a current temperature with its unit, a text description of the current condition, and a freshness indicator stating when the information was last updated.
2. **Given** metric units are selected, **When** current conditions are displayed, **Then** temperature and any other displayed measurements use metric units and localized unit labels; **Given** imperial units are selected, **Then** the same measurements use imperial units and localized labels.
3. **Given** a condition such as rain, clear sky, or fog, **When** it is displayed, **Then** its meaning is communicated through localized text, not through an icon or color alone.
4. **Given** current conditions and a forecast are both displayed, **When** the surface is read, **Then** the current conditions are explicitly labeled as current and are visually and textually distinguishable from forecast information.
5. **Given** no location is configured, **When** Home is displayed, **Then** the surface explains that a location is required, offers a clear action to open Settings, and does not show conditions for any guessed, default, or previous location.
6. **Given** any weather state, **When** the user manages tasks, commitments, or the agenda, **Then** no weather condition changes, blocks, reorders, or delays those actions.

---

### User Story 2 - Plan the remaining hours with an hourly forecast (Priority: P2)

A person checks how conditions and the chance of precipitation will change during the rest of their day, so they can decide when to go out, run errands, or adjust flexible activities themselves.

**Why this priority**: Hourly context converts current conditions into planning value, but current conditions alone remain a viable first release.

**Independent Test**: Can be fully tested by opening Home with a saved location and verifying that every remaining hour of the current device-local day exposes its time, temperature, condition text, and precipitation probability, and that incomplete or missing values are labeled instead of fabricated.

**Acceptance Scenarios**:

1. **Given** a saved location, available forecast information, and today selected, **When** the forecast is displayed, **Then** each forecasted hour presents its hour label in the user's device timezone, temperature in the selected units, condition text, and precipitation probability as a labeled percentage.
2. **Given** the current time in the user's device timezone, **When** the forecast is displayed, **Then** it covers the remaining hours of the current device-local day, marks the current hour, and does not present hours that have already elapsed as upcoming.
3. **Given** precipitation probability is 0 for an hour, **When** that hour is displayed, **Then** it shows a labeled 0%; **Given** precipitation probability is unavailable for an hour, **Then** it is described as unavailable and is not shown as 0%.
4. **Given** forecast information exists for only part of the remaining day, **When** the forecast is displayed, **Then** the available hours are shown and the surface states in text that part of the day has no forecast information, without filling the gaps with invented values.
5. **Given** current conditions are available but forecast information is not, **When** the surface is displayed, **Then** current conditions remain visible and the forecast area communicates its own unavailability.

---

### User Story 3 - Keep weather context current and trustworthy (Priority: P3)

A person returns to Home after time away or after changing their location or units, and needs the weather context to refresh appropriately or to say clearly that it may be outdated.

**Why this priority**: Freshness and recovery protect users from acting on misleading information, but they refine a feature that is already useful once displayed.

**Independent Test**: Can be fully tested by loading Home, changing location and units, waiting for the surface to become outdated, simulating successful and failed refreshes, and returning to Home to confirm updated, outdated, and recovered states.

**Acceptance Scenarios**:

1. **Given** the user changes the selected location, **When** Home is displayed again or already visible, **Then** weather information for the new location appears without a page reload and no values from the previous location remain visible.
2. **Given** the weather information currently displayed has exceeded its acceptable freshness window, **When** the surface is displayed, **Then** the existing information is labeled as outdated with the time of its last successful update and a retry action, rather than presented as current.
3. **Given** a refresh succeeds after an outdated, failed, or unavailable state, **When** the new information arrives, **Then** the surface replaces the previous state, updates the freshness indicator, and announces the recovery.
4. **Given** the user opens Home again after a long absence, **When** the surface is displayed with acceptable last-known information, **Then** it is shown immediately as outdated while a refresh is attempted in the background, and the surface does not blank or block the rest of Home.
5. **Given** the user requests a manual refresh, **When** the request is in progress, **Then** the existing information remains readable, the pending state is announced, and duplicate refresh requests are not started.

---

### User Story 4 - Stay informed when weather cannot be shown (Priority: P3)

A person opens Home while weather is loading, the provider fails, the network is down, the location is invalid, or no data exists, and needs a clear explanation without losing access to their day.

**Why this priority**: Failure handling is a constitutional and product requirement for optional context, and it completes the feature's promise that weather never blocks core work.

**Independent Test**: Can be fully tested by simulating each degraded state on Home and confirming that the state is explained in text, recovery actions are offered where meaningful, and all task, commitment, and agenda actions remain fully usable.

**Acceptance Scenarios**:

1. **Given** weather information is loading, **When** the surface is displayed, **Then** a labeled loading state preserves the final layout, is announced accessibly, and does not block any content below or around it.
2. **Given** the weather service is unreachable or returns an error, **When** no acceptable last-known information exists, **Then** the surface presents a localized unavailable message with a retry action and does not expose technical error details.
3. **Given** a weather failure of any kind, **When** the user continues using Walday, **Then** tasks, commitments, the agenda, and preferences remain fully usable and no core action is blocked, delayed, or altered.
4. **Given** the selected location is invalid, unresolvable, or no longer usable as a place, **When** the surface is displayed, **Then** it explains the problem in text, offers a clear action to review the location in Settings, and does not show conditions for another place.
5. **Given** a valid saved location for which the provider has no weather data, **When** the surface is displayed, **Then** it presents the unavailable state with a retry action, does not send the user to Settings to fix a correct preference, and shows no values for another place.
6. **Given** the user is offline with acceptable last-known weather information, **When** Home is displayed, **Then** that information is shown and clearly labeled as outdated, with the last successful update time.
7. **Given** the weather information is entirely unavailable and no last-known information exists, **When** the surface is displayed, **Then** it states that weather is unavailable and shows no temperature, condition, or forecast values that could be mistaken for current data.

---

### Edge Cases

- The selected location is cleared while weather is displayed: the surface switches immediately to the no-location state and no previous location's values remain visible.
- The selected location is changed while a refresh for the previous location is in flight: the previous result is discarded and cannot overwrite the new location's state.
- Units are changed while weather is displayed: all displayed measurements update without a reload, stored weather data is unchanged, and no mixed-unit display remains.
- The interface language is changed: weather labels and condition descriptions localize, while the selected location's saved label and the selected unit system remain unchanged.
- The weather provider returns only some of the expected measurements: available values are shown; each missing required measurement is labeled unavailable, unavailable optional supporting measurements are omitted, and no missing value is rendered as zero, blank, or a default.
- The forecast covers fewer hours than remain in the day: the surface shows the covered hours and states the remaining coverage gap in text.
- The current device-local hour is the last hour of the day: the forecast presents that hour and its end-of-day boundary without inventing hours from the next day.
- The current local day is shorter or longer because of a daylight-saving transition: hours follow the device's local clock, and no duplicated or missing clock hour is fabricated or silently merged.
- The selected location is in a different timezone from the user's device: the forecast still covers the remaining hours of the device's local day, the device's current hour is the one marked current, and hours from the location's own day are not added, dropped, or relabeled to fill the difference.
- The user opens Home just before midnight and again just after midnight: the selected date becomes the new current date, any snapshot from the previous day is discarded even if it is inside the retention window, and weather is presented for the new day rather than the previous day's forecast; if retrieval for the new day has not completed, the surface shows its loading state and then the unavailable state if retrieval fails.
- A scheduled refresh completes after the user leaves Home: it updates the stored context without disrupting the current screen or triggering unrelated announcements.
- Repeated refresh attempts fail: the surface settles into an unavailable state with retry, avoids continuous retrying, and does not degrade the rest of the application.
- Weather information has been cached far beyond its acceptable freshness window: it is not presented as current, and the unavailable state is used when nothing sufficiently recent exists.
- The provider response contains an implausible or out-of-range value: the affected value is treated as unavailable rather than displayed as valid weather.
- The selected location is valid but the provider has no weather data for that place: the surface shows the unavailable state with retry, may state that coverage is unavailable for this place, and does not send the user to Settings to fix a correct preference.
- A retrieval succeeds but the provider's observation time for current conditions is outside the acceptable freshness window but still within the maximum staleness: the values are labeled outdated with their observation age, never presented as current, even though the retrieval itself just succeeded; if the observation is beyond the maximum staleness, the unavailable state is used and no values are shown.
- The application is used as a guest without a network connection and without any stored weather information: the surface presents the unavailable state, and all core functionality remains usable.
- The weather surface is displayed at a narrow viewport: every required piece of information remains reachable and readable without page-level horizontal scrolling.

## Requirements *(mandatory)*

### Placement and Scope

- **FR-001**: Weather information MUST be presented as an optional contextual surface on the Daily Agenda / Home surface when the selected date is the current local date.
- **FR-002**: Weather MUST NOT be presented as belonging to any date other than the current local date, consistent with the today-only contextual surfaces rule in spec 006.
- **FR-003**: Weather MUST NOT appear as a timeline activity, MUST NOT affect conflict detection, and MUST NOT affect available-time calculation.
- **FR-004**: Weather MUST NOT create, modify, delete, complete, schedule, reschedule, or reorder any task, commitment, planned activity, or preference.
- **FR-005**: No task, commitment, agenda, preference, or navigation action MUST require weather information to be available, and no such action MUST be blocked, delayed, or altered by a weather failure.
- **FR-006**: Weather MUST NOT introduce a separate navigation destination; it is presented within the existing Home surface.
- **FR-007**: Weather information MUST clearly distinguish current conditions from forecast information in both text and structure.

### Current Conditions

- **FR-008**: When a location is selected and sufficiently recent weather information is available, the surface MUST present the selected location's label, the current condition as localized text, and the current temperature in the selected unit system.
- **FR-009**: Current conditions MUST be labeled as current and MUST carry a freshness indicator stating when the information was last successfully updated and, when the provider supplies an observation time, how old that observation is.
- **FR-010**: Supporting measurements such as apparent temperature, humidity, wind, or current precipitation MAY be presented, but each MUST use the selected unit system and a localized label, and MUST NOT be presented with a fabricated value. When a supporting measurement is unavailable, it MUST be omitted rather than displayed with a blank, zero, or substitute.
- **FR-011**: A required displayed measurement that is missing or unusable MUST be described as unavailable. No measurement, required or optional, may be displayed as zero, a blank value, a default, or a plausible-looking substitute.
- **FR-012**: All displayed temperatures and other measurements MUST use the display precision and unit conventions defined by User Preferences.
- **FR-013**: Current conditions MUST describe the same location and observation context consistently within a single display; the surface MUST NOT mix values from different locations or different observation times as if they were one reading.
- **FR-014**: When current conditions are displayed and the provider supplies an observation time, the surface MUST communicate how recent the observation is in user-understandable terms.

### Hourly Forecast and Precipitation

- **FR-015**: When forecast information is available, the surface MUST present hourly forecast entries covering the remaining hours of the current local day, where "local" means the user's device timezone and not the selected location's timezone.
- **FR-016**: Each hourly entry MUST present its hour expressed in the user's device timezone, temperature in the selected units, condition as localized text, and precipitation probability.
- **FR-017**: The current hour in the user's device timezone MUST be identified as the current hour, and its values MUST NOT be presented as a future forecast.
- **FR-018**: Hours that have already elapsed on the current day MUST NOT be presented as upcoming forecast hours.
- **FR-019**: Precipitation probability MUST be presented as a labeled percentage between 0 and 100 inclusive.
- **FR-020**: A precipitation probability of zero MUST be displayed as zero; an unavailable precipitation probability MUST be described as unavailable and MUST NOT be displayed as zero.
- **FR-021**: When forecast information covers only part of the remaining day, the surface MUST show the covered hours and MUST state in text that no forecast information is available for the uncovered part; it MUST NOT fabricate, interpolate, or repeat values to fill the gap.
- **FR-022**: Current conditions and forecast information MUST fail independently: the unavailability of one MUST NOT hide the other when the other is available.
- **FR-023**: Forecast entries MUST remain in chronological order and MUST NOT be reordered by preference changes, language changes, or responsive layout.

### Location and Units

- **FR-024**: Weather information MUST be retrieved for the location currently selected in User Preferences and MUST display that location's saved label.
- **FR-025**: The application MUST NOT infer, guess, default, or automatically detect a weather location, and MUST NOT reuse a previously selected location after it has been cleared.
- **FR-026**: When no location is selected, the surface MUST present a no-location state that explains a location is required and offers a clear action to open Settings.
- **FR-027**: When the selected location is invalid, unresolvable, or no longer usable as a place, the surface MUST present an invalid-location state with a localized explanation and a clear action to review the location in Settings. A valid saved location for which the provider has no weather data MUST NOT be classified as an invalid location; instead it MUST use the unavailable state with a retry action defined in FR-046, and MUST NOT direct the user to fix the location in Settings. Invalid location applies when the saved place cannot yield a usable coordinate pair for retrieval; provider coverage limits are always the unavailable state.
- **FR-028**: A change to the selected location MUST invalidate previously displayed weather from the old location, and no value from the old location may remain visible as if it belonged to the new one.
- **FR-029**: All weather measurements MUST be displayed in the unit system currently selected in User Preferences, and changing units MUST update the display without a reload or new weather retrieval while leaving stored weather data unchanged.
- **FR-030**: Metric display MUST use degrees Celsius, kilometers per hour for wind, and millimeters for precipitation; imperial display MUST use degrees Fahrenheit, miles per hour for wind, and inches for precipitation, following the precision rules in User Preferences.
- **FR-031**: Unit symbols and labels MUST be localized and MUST NOT be conveyed solely by position or styling.
- **FR-032**: Weather units MUST remain independent of interface language, and changing language MUST NOT change the unit system or the selected location.
- **FR-033**: The weather surface MUST NOT introduce location resolution, geocoding, or unit-conversion behavior beyond what User Preferences defines; it consumes the resolved location and the applied unit system. The only location-lookup behavior this feature delivers is the backend hosting of the `/api/weather/locations` contract already owned by spec 003 (see Dependencies); the weather surface MUST NOT resolve, geocode, or infer a location itself.

### Freshness, Refresh, and Recovery

- **FR-034**: Weather information MUST be considered current only within an acceptable freshness window defined during planning, measured from the provider's observation time when it is supplied and from the last successful retrieval time otherwise; information outside that window MUST be labeled outdated. A response retrieved moments ago whose observation time is outside the window MUST NOT be presented as current. Information older than the maximum staleness defined in FR-044 MUST NOT be displayed at all, even though it is also outside the freshness window; that case uses the unavailable state instead of an outdated label.
- **FR-035**: Outdated information MUST be accompanied by a text label and the time of the last successful update, and MUST state the observation age when it differs materially from the last successful update time.
- **FR-036**: Displayed information MUST be refreshed when the surface is first opened, when the selected location changes, when the device-local date changes, when existing information has become outdated and the surface is shown again, and at the defined cadence while the surface remains visible.
- **FR-037**: The surface MUST provide an explicit manual refresh action whenever weather information is displayed or recoverable.
- **FR-038**: Refresh behavior MUST avoid redundant concurrent requests for the same context and MUST NOT create repeated request storms after failures.
- **FR-039**: A refresh MUST NOT blank, shift, or block the rest of Home, and existing readable information MUST remain visible while a refresh is in progress.
- **FR-040**: When sufficiently recent last-known information exists and a refresh is not yet complete, the surface MUST continue to show that information labeled as outdated rather than switching to an empty state.
- **FR-041**: No weather request MUST be made while no location is selected.
- **FR-042**: Successful refresh MUST update the displayed context and freshness indicator without a page reload. A manual refresh MUST announce its outcome, and a refresh that changes the presentation state (to ready, outdated, unavailable, invalid location, or no location) MUST announce that change; a successful automatic periodic refresh that leaves the presentation state unchanged MUST NOT produce an announcement.
- **FR-043**: Weather results that arrive for a location that is no longer selected MUST be discarded.
- **FR-044**: Weather information MUST NOT be retained or displayed beyond an acceptable maximum staleness defined during planning, and any retained snapshot MUST be discarded when the device-local date changes even if it is still within that limit; when nothing sufficiently recent exists for the current day, the unavailable state MUST be used. The maximum staleness MUST be measured from the same reference as the freshness window in FR-034, so a retrieval that just completed does not make an old observation displayable.

### Availability, Failure, and Recovery

- **FR-045**: The surface MUST present a distinct loading state that preserves the final layout, communicates pending weather information in text, and is announced to assistive technologies.
- **FR-046**: When weather information cannot be obtained because of a service or network failure, or because the provider has no data for an otherwise valid selected location, the surface MUST present a localized unavailable state with a retry action and MUST NOT expose technical error details, provider internals, or raw diagnostic output.
- **FR-047**: When the provider returns incomplete, malformed, or implausible data, affected values MUST be treated as unavailable, and available values MAY still be displayed.
- **FR-048**: The surface MUST distinguish, in text, between loading, no location, invalid location, unavailable information, outdated information, incomplete forecast coverage, and successfully displayed information.
- **FR-049**: Weather failures MUST NOT prevent tasks, commitments, the agenda, preferences, or the rest of the dashboard from loading or functioning.
- **FR-050**: After a successful recovery, the surface MUST replace the degraded state with the recovered information and MUST announce the recovery accessibly.
- **FR-051**: The unavailable state MUST NOT present placeholders, examples, or previous values that could be mistaken for current weather.

### Accessibility and Localization

- **FR-052**: Weather conditions and states MUST be communicated through localized text and MUST NOT be conveyed only through icons, colors, shapes, or animation.
- **FR-053**: Every weather value MUST have an accessible description that includes its meaning and unit, so temperature, wind, and precipitation values are understandable without interpreting layout or symbols alone.
- **FR-054**: Hourly forecast entries MUST expose their hour, temperature, condition, and precipitation probability in a reading order that preserves chronological sequence.
- **FR-055**: Temperature, condition, precipitation, unit labels, state messages, and freshness labels MUST be available in English and Spanish and MUST follow the selected interface language.
- **FR-056**: Numbers, percentages, dates, and times MUST be formatted for the active language and locale, and the underlying weather values MUST NOT be altered by localization.
- **FR-057**: Loading, outdated, unavailable, invalid-location, no-location, and recovery changes MUST be announced through an appropriate live region without duplicate announcements for the same state. A successful automatic periodic refresh that does not change the presentation state MUST NOT announce, while a manual refresh MUST announce its outcome.
- **FR-058**: The weather surface MUST be operable and understandable with a keyboard and assistive technologies, MUST respect reduced-motion preferences, and MUST remain usable at 200% browser zoom.
- **FR-059**: Text and non-text contrast in every weather state MUST meet the product's accessibility target.
- **FR-060**: When weather is unavailable, the surface MUST remain understandable and navigable, and surrounding content MUST remain unaffected in order and focus flow.

### Presentation and Responsiveness

- **FR-061**: Weather information MUST follow the approved dark visual identity, semantic tokens, spacing, radii, and tabular numerals for numeric values.
- **FR-062**: Current conditions MUST be presented before or above forecast details in the information hierarchy.
- **FR-063**: The weather surface MUST communicate all required information at 360, 768, 1024, and 1440 pixel widths without page-level horizontal scrolling, and every forecast hour MUST remain reachable.
- **FR-064**: Weather state changes MUST NOT cause layout instability that displaces task, commitment, or agenda content.
- **FR-065**: If provider usage terms require visible attribution, the surface MUST present it in a localized, non-intrusive form that does not obscure weather information or core content.

### Key Entities

- **Selected Weather Location**: The user-owned place preference used for all weather retrieval, carrying a stable place identity and a saved human-readable label. It is optional, can be unset, and is owned by User Preferences.
- **Measurement Preference**: The user-selected metric or imperial system, owned by User Preferences, applied to weather only at display time and independent of language.
- **Current Conditions**: The weather state at the selected location at or near the current time, carrying temperature, a condition descriptor, optional supporting measurements, and an observation context. Individual measurements may be missing.
- **Hourly Forecast Entry**: One hour of the current device-local day, carrying its hour, temperature, condition descriptor, and precipitation probability. An entry's values may be partially missing and are never fabricated.
- **Precipitation Probability**: The forecast chance of precipitation for an hour, expressed as a percentage from 0 to 100; it may be unavailable, which is distinct from zero.
- **Weather Snapshot**: The set of current conditions and forecast entries retrieved for one location and unit context, together with its last successful update time, the provider observation time when supplied, and freshness status.
- **Last-Known-Good Weather**: The most recent successfully retrieved snapshot for the current device-local date, retained for continuity, usable only within the acceptable staleness limit, and always labeled outdated when not current.
- **Weather Presentation State**: One of loading, ready, outdated, unavailable, no location, invalid location, or incomplete coverage, each with distinct user-facing text and behavior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of audits of a ready weather surface, the selected location label, current temperature with its unit, condition text, and an explicit current-versus-forecast distinction are present.
- **SC-002**: In 100% of tested metric and imperial configurations, every displayed weather measurement uses the selected unit system, and changing the interface language never changes the unit system.
- **SC-003**: In 100% of audited current-day forecasts with complete provider coverage, every remaining hour of the current device-local day is presented, no elapsed hour appears as upcoming, and entries remain in chronological order.
- **SC-004**: In 100% of audited forecast hours, precipitation probability is shown as a labeled percentage, and an unavailable probability is never rendered as 0%.
- **SC-005**: In 100% of audited degraded conditions (loading, failure, offline, no location, invalid location, missing data, extreme staleness), the state is identified in text, and tasks, commitments, the agenda, and preferences remain fully operable.
- **SC-006**: In 100% of audited weather failures, no task, commitment, agenda, or preference record changes, and no core action is blocked or delayed by weather.
- **SC-007**: In 100% of audited location and unit changes, weather updates without a page reload, and no value from the previous location or unit system remains visible.
- **SC-008**: In 100% of audited outdated states, the last successful update time and an outdated label are present, and no outdated data is presented as current.
- **SC-009**: Users see current conditions within 3 seconds of opening Home in at least 95% of monitored loads on a typical broadband connection when weather information is available.
- **SC-010**: A user can recover from a transient weather failure within one retry action or one automatic refresh cycle in at least 95% of tested recoveries, without reloading the page.
- **SC-011**: Zero weather requests are observed when no location is selected, verified in 100% of audited no-location sessions.
- **SC-012**: In a usability check with at least five participants, 90% can correctly state the current condition, the warmest or coolest remaining hour, and the hour with the highest chance of precipitation for a prepared day.
- **SC-013**: 100% of weather states and values are understandable through text and accessible names in keyboard and screen-reader review, with no state or condition conveyed by icon or color alone.
- **SC-014**: 100% of audited weather displays present no page-level horizontal scrolling at 360, 768, 1024, or 1440 pixel widths or at 200% browser zoom, and every forecast hour remains reachable.
- **SC-015**: Weather surface state changes cause zero layout shifts that move task, commitment, or agenda content, verified across all seven presentation states.
- **SC-016**: In 100% of audited device-local date changes, no weather value or hourly entry from the previous day remains visible, and information for the new day is requested.
- **SC-017**: In 100% of audited automatic periodic refreshes that leave the presentation state unchanged, no live-region announcement is emitted, and every manual refresh announces its outcome.

## External Integration Considerations

Open-Meteo is the initial candidate weather provider. This specification defines required user-facing weather information and MUST remain satisfiable by any provider that meets those needs; no requirement in this document depends on provider-specific identifiers, field names, or response shapes.

The planning phase MUST evaluate the candidate provider's capabilities, usage conditions, attribution requirements, rate limits, quota behavior, geographic coverage, forecast horizon and granularity, precipitation-probability availability, timezone handling, and reliability characteristics before committing to integration. Planning MUST also define the acceptable freshness window, the maximum retention period for last-known information, and the refresh cadence referenced by this specification.

Regardless of provider, integration MUST preserve the following user-facing guarantees: weather is optional context, failures are isolated from core functionality, outdated information is never presented as current, missing values are never fabricated, and no per-user weather data beyond the selected location is exposed or logged.

## Assumptions

- The weather surface appears only on the current-day Daily Agenda / Home surface, following spec 006. There is no separate weather page, no multi-day forecast, and no forecast for other selected dates.
- The hourly forecast horizon is the remaining hours of the current local day, measured in the user's device timezone, which is the planning-relevant scope for a daily planning product. A multi-day forecast is excluded.
- The selected location and measurement units come from User Preferences and are already validated there. This feature neither redefines nor extends their validation rules.
- An acceptable freshness window (30 minutes), maximum staleness/retention period (6 hours), and refresh cadence (10 minutes) are product-configurable defaults defined in `plan.md` and `data-model.md`; a snapshot becomes outdated once it is no longer recent enough to be safely presented as current, and it is never presented as current past that point.
- Last-known information is retained locally for continuity and is shown only when it is within the maximum retention period and belongs to the current device-local date, always labeled outdated when not current.
- Weather data is read-only context. Weather-based planning suggestions and any use of weather to propose or perform schedule changes are outside this feature.
- The provider supplies condition descriptions that can be mapped to localized user-facing text; where a condition cannot be mapped, a generic localized condition description is shown instead of an invented specific condition.
- Measurements that the provider does not supply are treated as unavailable rather than derived from other values, except where the planning phase explicitly documents a supported, provider-consistent derivation.
- The application is a responsive web experience with optional PWA capabilities; weather works for guests and authenticated users alike, without weather data being required for either mode.
- English and Spanish are supported from the initial release, and the approved dark visual identity applies to every weather state.
- Weather requests occur in the background of the normal application experience; no blocking permission prompt or external setup step is introduced.

## Dependencies

- **User Preferences (spec 003)**: Selected location with its saved label, metric/imperial unit system, display precision, language, and date/time presentation. Spec 003 also owns the `GET /api/weather/locations` search contract that this feature's backend hosts unchanged.
- **Home and visual identity (spec 005)**: Weather surface placement, ready/loading/stale/unavailable/no-location/error presentations (stale = outdated; error = unavailable or invalid location), dark visual identity, tabular numerals, focus, motion, responsive and accessibility conventions.
- **Daily Agenda (spec 006)**: Today-only contextual surface rule, dashboard composition, and the guarantee that weather never affects timeline, conflicts, or available time.
- **Product Overview (§4.6, §5.1, §5.5, §5.7, §9.8)**: Weather scope, resilience expectations, preference independence, and the rule that weather never blocks core functionality.
- **Constitution (Principles XIII, XIV, XVII, XIX)**: Accessibility and inclusive design, internationalization, asynchronous UX, and external-integration resilience requirements.

## Out of Scope

- Historical weather analysis, archives, and comparisons.
- Severe weather alert systems, warnings, and notifications.
- Multiple saved locations, location history, favorites, and automatic location switching.
- Device geolocation, implicit location inference, and travel detection.
- Advanced weather analytics, trends, charts, and long-range outlooks.
- Weather-based automatic rescheduling or any automatic changes to tasks, commitments, or the agenda.
- Weather-driven planning suggestions and recommendation generation.
- Paid weather subscriptions, premium data tiers, and monetization.
- Multi-day and weekly weather forecasts.
- Air quality, pollen, sunrise/sunset, moon phase, and other non-essential data.
- Reminders, notifications, widgets, and background alerts based on weather.
- Native mobile applications and platform-specific weather integrations.
