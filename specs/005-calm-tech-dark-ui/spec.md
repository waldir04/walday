# Feature Specification: Calm Tech Dark UI Redesign

**Feature Branch**: `005-calm-tech-dark-ui`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Refactor and redesign the complete user interface layer of Walday into the new 'Calm Tech Dark Mode' layout, implementing unified branding and a responsive navigation system across Home, Tasks, Commitments, and Settings, with a distinct Walday Smart Suggestions surface and polished weather, list, and row presentations, while preserving all existing business logic."

## Clarifications

### Session 2026-11-13

- Q: With Home currently a placeholder, what should this redesign deliver on the Home screen? → A: Compose a read-only daily dashboard from existing task and commitment data, plus weather and suggestion presentation slots, without agenda, conflict, or planning logic.
- Q: The application has no suggestion engine yet; what should the Smart Suggestions area show to real users on Home? → A: Mount the suggestions region only when real suggestion data is supplied; otherwise omit it entirely, while the component still implements data, loading, empty, and error presentations for tests and future wiring.
- Q: Weather location is unset by default; what should the Home weather block show when no location has been configured? → A: Show a calm dark card explaining that weather needs a location, with a clear action linking to Settings.
- Q: How should edit and delete actions remain reachable on touch and narrow viewports without hover? → A: Show one persistent compact actions control per row that opens edit/delete on touch and narrow viewports, while wide pointer screens keep hover-to-reveal.
- Q: Which tasks should the new read-only Home dashboard display? → A: The same task collection shown on the Tasks page, with pending/completed counts and no new due-date relevance filtering.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate a Branded, Responsive Shell (Priority: P1)

A person opens Walday on any device and sees one consistent application frame: a restrained dark header carrying the Walday brand mark and exactly four destinations — Home, Tasks, Commitments, and Settings. On a desktop the destinations sit in a quiet horizontal row; on a phone the row collapses into a single menu control that opens a full-width drawer of large, easy-to-tap destinations. The current section is always obvious, and every destination is reachable without hunting.

**Why this priority**: Navigation and brand are the frame every other screen depends on. Without a reliable shell, the redesigned content surfaces cannot be evaluated or used. This story alone delivers a coherent, usable application skeleton.

**Independent Test**: At 360 px and 1440 px widths, load any page, confirm the brand mark is present, reach all four destinations, open and close the mobile drawer with pointer and keyboard, and confirm the active destination is identifiable without relying on color alone.

**Acceptance Scenarios**:

1. **Given** a desktop viewport at least 768 px wide, **When** the user views the header, **Then** Home, Tasks, Commitments, and Settings appear as an inline horizontal row and no menu control is shown.
2. **Given** a mobile viewport narrower than 768 px, **When** the user views the header, **Then** the horizontal row is absent and a single menu control is shown.
3. **Given** the mobile menu control, **When** the user activates it, **Then** a full-width overlay drawer mounts smoothly with the four destinations stacked vertically as large touch targets and the control changes to a close affordance.
4. **Given** the open mobile drawer, **When** the user selects a destination, presses Escape, or activates the close affordance, **Then** the drawer closes, the chosen page is shown when applicable, and focus returns to the menu control.
5. **Given** any page, **When** the user scrolls, **Then** the header remains visible at the top with a translucent dark surface and a subtle lower boundary.
6. **Given** a keyboard-only user, **When** they tab through the header, **Then** every destination and the menu control receive a clearly visible focus indicator.

---

### User Story 2 - Read Every Screen in One Calm Dark Visual Language (Priority: P2)

A person moves between Home, Tasks, Commitments, and Settings and experiences one continuous visual system: an obsidian-slate canvas, elevated deep-slate cards with soft borders and rounded corners, off-white primary content, and muted cool-gray supporting text. The interface feels restful, scannable, and deliberate rather than a collection of differently styled pages.

**Why this priority**: The application already has the four working sections; this story re-skins them consistently. It converts the shell into the intended product experience and is independent of the richer dashboard-suggestion behaviors.

**Independent Test**: Visit each of the four sections at 360, 768, 1024, and 1440 px widths and confirm that every page, card, control, empty state, and error state uses the same dark canvas, surface, border, typography, radius, and spacing system, with no light-theme surface remaining.

**Acceptance Scenarios**:

1. **Given** any of the four sections, **When** it finishes loading, **Then** the page background is the obsidian-slate canvas and no page presents a pure-black or light background.
2. **Given** a card, panel, or content wrapper, **When** it is shown, **Then** it uses the elevated deep-slate surface, subtle border, generous rounded corners, and comfortable internal padding.
3. **Given** headings, task titles, and active content, **When** they render, **Then** they use off-white primary text; timestamps, metadata, and supporting labels use muted cool gray.
4. **Given** a page in loading, empty, error, or success state, **When** it renders, **Then** the state uses the same dark visual language rather than a default light component.
5. **Given** any interactive element, **When** it receives keyboard focus, **Then** a visible focus ring appears that meets contrast requirements against its surface.

---

### User Story 3 - Scan the Day with Clear Priorities and Calm Detail (Priority: P3)

A person reviews their day on Home: weather context, automated planning suggestions, and scheduled activities. The weather reads as a quiet dark block with aligned numbers and soft contextual badges. Automated suggestions are unmistakably separated from user content. Home activity rows breathe and align their times; on the editable task and commitment lists, destructive actions stay out of sight until the row is hovered or focused.

**Why this priority**: This is the information-clarity layer that makes the redesign feel purposeful. It refines high-value dashboard surfaces while remaining independent of the shell and global re-skin.

**Independent Test**: On a Home screen containing weather, representative suggestion content, and scheduled activities, verify number alignment, suggestion separation, row spacing, and that Home rows are read-only; on an editable Tasks or Commitments list, verify destructive actions remain hidden until hover or keyboard focus and reveal without shifting layout, at both desktop and mobile widths.

**Acceptance Scenarios**:

1. **Given** weather information, **When** the weather block renders, **Then** temperature and related numeric metrics align in tabular columns and contextual labels appear as soft tinted badges that do not rely on color alone.
2. **Given** one or more Walday Smart Suggestions, **When** they render, **Then** they are isolated in a distinctly high-contrast light mint container that reads immediately as system-generated guidance and never as a user-owned task.
3. **Given** a suggestion container, **When** the user reviews it, **Then** the reason for the recommendation is presented in text, and no control implies that a change can be applied because suggestion actions are outside this feature.
4. **Given** a list of scheduled activities, **When** it renders, **Then** rows are separated by comfortable gaps and every time value uses aligned numerals.
5. **Given** a row with edit or delete actions, **When** the row is not hovered or focused, **Then** those actions are visually hidden; **When** the row is hovered or a control receives keyboard focus, **Then** the actions fade in smoothly without changing the row height or position.
6. **Given** a touch or narrow viewport on an editable task or commitment list, **When** the user needs row actions, **Then** one persistent compact actions control per row opens the edit and delete actions without a hover gesture.
7. **Given** weather is unavailable, stale, or in an error state, **When** the block renders, **Then** it communicates the condition in text without blocking task or commitment management.
8. **Given** no weather location is configured, **When** Home renders, **Then** the weather block explains that a location is required and offers a clear action to open Settings, while tasks and commitments remain fully usable.

---

### Edge Cases

- The mobile drawer is open and the viewport is widened past the mobile breakpoint: the drawer must close or otherwise leave no duplicate navigation exposed to assistive technology.
- A user enables reduced-motion preferences: drawer and hover transitions must resolve immediately with the same end states.
- Spanish labels and 200% browser zoom make navigation labels wider: the header must not clip, overlap the brand, or introduce horizontal scrolling.
- The current page is not one of the four primary destinations (for example, a not-found page or the existing foundation placeholder): the shell must still render and no primary destination should be falsely marked active.
- A pointer user leaves a row without moving to another control: revealed actions must not remain visually stuck in a way that misrepresents the row state.
- Weather is loading, unavailable, stale, in an error state, has no configured location, or refers to a location the user has since changed: the weather block must show a calm, labeled state and must never become a prerequisite for tasks.
- No suggestions are available or supplied: the suggestions region is omitted entirely; no placeholder, sample, or empty decorated shell is shown.
- The drawer is opened with a screen reader active: focus must enter the drawer, background content must not be scrollable or announced as part of the drawer, and closing must restore focus to the menu control.

## Requirements *(mandatory)*

### Functional Requirements

**Application shell and navigation**

- **FR-001**: Every application page MUST render inside one shared shell containing the brand mark, the primary navigation, and the main content region.
- **FR-002**: The header MUST remain visible while the page scrolls, using the obsidian-slate canvas at high opacity with background blur and a subtle bottom border.
- **FR-003**: The primary navigation MUST expose exactly four destinations — Home (`/`), Tasks, Commitments, and Settings — in that order, and MUST NOT expose Foundation or any other placeholder destination.
- **FR-004**: At widths of 768 px and above, the four destinations MUST render as an inline horizontal row; below 768 px they MUST be replaced by a single menu control.
- **FR-005**: The menu control MUST toggle between an open-menu icon and a close icon, and MUST expose an accessible name and expanded state.
- **FR-006**: Activating the menu control on a narrow viewport MUST mount a full-width overlay drawer on the dark canvas with background blur, presenting the four destinations vertically with generous padding and fully rounded touch targets of at least 44 px height.
- **FR-007**: The drawer MUST close when a destination is selected, when Escape is pressed, or when a close affordance is activated; focus MUST move into the drawer when it opens, remain within the drawer while it is open, and return to the menu control when it closes.
- **FR-008**: While the drawer is open, background page content MUST NOT scroll, and the desktop navigation MUST NOT be duplicated in the accessibility tree.
- **FR-009**: The active destination MUST be visually distinguishable, and that distinction MUST include a non-color cue in addition to color.
- **FR-010**: The brand mark MUST be an inline vector rendering of a geometric "W" monogram formed by two rounded mint strokes, paired with the off-white "Walday" wordmark; it MUST remain crisp at 200% zoom and MUST NOT use a raster or externally loaded image.
- **FR-011**: The navigation and shell redesign MUST preserve existing routes, deep links, route announcements, skip-to-content behavior, language selection, and all page-level business behavior.

**Visual system**

- **FR-012**: The application canvas MUST use obsidian slate (`#0B1215`) on every page; pure black MUST NOT be used as the canvas or as a primary surface.
- **FR-013**: Cards, containers, and content wrappers MUST use elevated deep slate (`#131D22`), a one-pixel border in `#23323A`, a 16 px corner radius, and internal padding between 20 px and 24 px.
- **FR-014**: Primary headings, task titles, and active content MUST use off-white (`#F3F4F6`); timestamps, metadata, and secondary labels MUST use muted cool gray (`#8B9BA3`).
- **FR-015**: The mint accent (`#34D399`) MUST be used for the brand mark, primary indicators, active controls, and primary actions, with a clearly related hover or active treatment.
- **FR-016**: Navigation destinations MUST rest at muted cool gray and transition on hover or focus to mint text on the elevated deep-slate surface.
- **FR-017**: All surfaces, borders, and accents in the four sections MUST derive from the shared dark palette rather than one-off component colors.
- **FR-018**: Text and interactive elements MUST meet WCAG AA contrast against the surface they actually appear on.
- **FR-019**: Every interactive element MUST show a visible focus indicator, and all state changes MUST remain perceivable without depending on color alone.
- **FR-020**: The four sections MUST remain fully usable without horizontal scrolling at 360, 768, 1024, and 1440 px widths and at 200% browser zoom.

**Dashboard information surfaces**

- **FR-021**: The weather block MUST present a calm dark surface, aligned tabular numerals for temperature and related metrics, and soft tinted contextual badges with accompanying text or icons.
- **FR-022**: Weather loading, unavailable, stale, no-location, and error conditions MUST be communicated explicitly in text and MUST NOT prevent users from viewing or managing tasks and commitments. The no-location state MUST offer a clear action that opens Settings.
- **FR-023**: Automated Walday Smart Suggestions MUST render in a container visually distinct from ordinary user content, using the high-contrast light mint surface (`#A7F3D0`) with deep slate text (`#064E3B`) and a dark call-to-action surface reserved for future suggestion actions; no action control is rendered in this feature. This treatment clearly denotes system-generated guidance and meets WCAG AA contrast.
- **FR-024**: Each suggestion MUST present its explanation in text. This feature MUST NOT introduce accept, dismiss, or adjust controls because no suggestion-generation or apply behavior exists yet; when such behavior is added later, it MUST require explicit user confirmation and MUST NOT silently change unrelated activities or fixed commitments.
- **FR-025**: The suggestion region MUST be omitted entirely when no real suggestion data is supplied, and MUST NOT show placeholder, sample, or decorative suggestion content. When data is present, the region MUST remain visually separated from user-owned cards and lists.
- **FR-026**: Scheduled activity rows MUST use consistent vertical gaps between 12 px and 16 px and MUST use tabular numerals for all displayed times.
- **FR-027**: Activity rows MUST show at most three primary data points: a leading status control, the activity title with its time, and a trailing category pill. The compact actions control from FR-029 is a secondary affordance and MUST NOT displace or visually compete with these three data points.
- **FR-028**: Destructive row actions, where a list is editable, MUST be hidden by default and revealed smoothly on row hover or keyboard focus, without shifting row layout.
- **FR-029**: On editable rows in the Tasks and Commitments sections, touch and narrow viewports MUST expose one persistent compact actions control of at least 44 px that reveals edit and delete actions. Hover-to-reveal MAY be used only on wide pointer screens, and hover MUST NOT be the only access path on any viewport. Home's read-only rows MUST NOT expose edit or delete actions.
- **FR-030**: Loading, empty, error, and success presentation for the four sections MUST use the dark surface system and MUST retain the existing accessible announcements, retry affordances, and skeleton behavior.

- **FR-031**: The suggestion surface MUST use the high-contrast mint treatment required by project governance rather than a dark emerald tint; the dark emerald variant from the original request is explicitly not adopted.
- **FR-032**: Weather and Walday Smart Suggestions MUST be delivered as presentation-first surfaces. The weather block MUST implement ready/data-present, loading, stale, unavailable, no-location, and error presentations. The suggestion presentation MUST implement data-present, loading, empty, and error presentations for tests and future wiring, while production mounting remains governed by FR-025. This feature MUST NOT add external weather retrieval or planning-suggestion generation logic.
- **FR-033**: Home MUST render a read-only daily overview composed from existing data: the same task collection shown on the Tasks page with its pending and completed counts, and the commitments for the current local day, alongside the weather and suggestion presentation slots. Home rows MUST remain read-only and MUST NOT expose edit or delete actions. It MUST NOT add due-date relevance filtering, agenda conflict detection, available-time calculation, automatic scheduling, or planning logic. *Superseded for agenda composition by `specs/006-daily-agenda/spec.md`: Home becomes the Daily Agenda surface, replacing the separate commitments list and task summary with one chronological timeline. This feature's visual identity, accessibility, focus, motion, and responsive rules continue to apply to that agenda.*
- **FR-034**: Weather presentation MUST display measurements in the user's configured measurement unit using the existing preference conversion and formatting behavior, and MUST show the configured location label. It MUST NOT introduce additional location resolution, geocoding, or unit logic.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any page, a user can reach each of the four primary destinations in one action on both desktop and mobile.
- **SC-002**: The mobile drawer opens and closes within 200 ms and never leaves navigation unreachable or background content scrollable.
- **SC-003**: 100% of audited screens in Home, Tasks, Commitments, and Settings use the obsidian dark canvas and deep-slate surfaces; zero legacy light-theme surfaces remain in those sections.
- **SC-004**: Users experience no horizontal scrolling at 360, 768, 1024, or 1440 px widths, or at 200% browser zoom.
- **SC-005**: 100% of text and interactive elements pass WCAG AA contrast checks against their rendered backgrounds.
- **SC-006**: A keyboard-only user can reach all four destinations, open and close the mobile drawer, reveal row actions, and return focus without using a pointer.
- **SC-007**: All times and temperatures across Home, Tasks, and Commitments render with vertically aligned digits, verified in side-by-side list and weather comparisons.
- **SC-008**: Existing task, commitment, preference, and navigation flows continue to pass their current automated tests after the visual rewrite, with no regression in behavior.
- **SC-009**: In a usability check with at least five participants, 90% locate Commitments and Settings from a mobile viewport within two taps.
- **SC-010**: The header remains sticky while scrolling with no perceptible layout shift in the main content region.
- **SC-011**: In a design review using representative suggestion content, 100% of reviewers identify the Smart Suggestions card as system-generated guidance rather than user-owned content.

## Assumptions

- The rewrite is presentation-only: existing state machines, contexts, API connections, storage behavior, routing, validation, and business rules are preserved unchanged.
- Home is currently a placeholder and will become a read-only daily dashboard that mirrors the existing task collection from the Tasks page and shows commitments for the current local day; no new planning, due-date relevance, or agenda logic is introduced.
- Suggestion accept, dismiss, and adjust behavior is deferred to the future suggestions feature. Until then, the presentation surface exposes no actionable control that would imply agenda changes.
- Home, Tasks, Commitments, and Settings already exist as routes; Foundation is a temporary placeholder and will be removed from primary navigation. Its route may remain reachable until a later cleanup, but it is not a section of this feature.
- Dark mode is the only approved theme; no theme switch or light-theme preservation is in scope.
- Weather and suggestion data models do not yet exist; this feature delivers their presentation surfaces and state coverage only, without inventing business logic or external integrations.
- The light mint suggestion card follows the constitution's mandated high-contrast treatment; adopting the darker emerald variant would require a separate constitutional amendment.
- English and Spanish remain supported; navigation and new interface text must be translated rather than hardcoded.
- The existing accessible route announcer, skip link, focus management, and async skeleton/empty/error conventions are retained and re-skinned.
- Touch targets follow the project minimum of 44 px where the design calls for comfortable mobile interaction, and never fall below 24 px.
- Motion is limited to short fades and drawer mounting, and must respect reduced-motion preferences.
