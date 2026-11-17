# ADR 0012: Contained Horizontal Scrolling for the Hourly Forecast

- **Status**: Accepted
- **Date**: 2026-11-17
- **Related**: Constitution Principle VI (Styling, Design Tokens, Visual Consistency) and the Walday Dark UI identity; specification 008 (`specs/008-hourly-forecast-cards/spec.md`)

## Context

Constitution Principle VI states: "No horizontal scrolling may be introduced at supported widths."
Specification 008 requires the hourly forecast to become compact, horizontally scrollable forecast
cards so the remaining hours of the day can be scanned side by side on mobile, tablet, and desktop.
A vertical list (the current implementation) cannot deliver the requested card row, and a paged
carousel would add interactive controls the specification explicitly forbids.

The specification's 2026-11-17 clarification resolved the conflict narrowly: only the forecast region
may scroll horizontally, inside its own contained box; the page must never scroll horizontally at any
supported width; and the row must be keyboard- and assistive-technology accessible as an intentional
component rather than page-level overflow.

## Decision

### Contained, forecast-only scroller

- The hourly row is a native overflow container on the ordered list:
  `overflow-x-auto` + `overscroll-behavior-x: contain` + `min-w-0`, inside the existing weather
  surface. Cards are `shrink-0` at one fixed token width (`--spacing-forecast-card: 6rem`, 96 px) at
  every viewport.
- No negative margins, no `100vw` sizing, no inline pixel widths, and no transform-based carousel.
  The page-level horizontal scroll width must equal the viewport at 360, 768, 1024, and 1440 px and
  at 200 % zoom.
- No scroll snap and no new interactive controls (no arrows, paging, drag-handlers, or buttons).
  Touch, trackpad, and wheel scrolling use native behavior.

### Accessible by construction

- The `<ol>` is the single tab stop (`tabIndex={0}`), labelled by the section heading, with a
  `focus-visible` ring on the `focus` token. Cards are plain `<li>` elements: never focusable, never
  interactive.
- `ArrowLeft`/`ArrowRight` scroll by one card, `Home`/`End` jump to the ends; only those keys are
  intercepted, so vertical page scrolling and Tab order are unaffected and no keyboard trap exists.
  Smooth scrolling is used only when `prefers-reduced-motion` does not request reduction.
- Overflow is announced visually by a partially visible next card plus a static, non-hover-only hint
  that is rendered only when the row actually overflows; it is referenced with `aria-describedby`
  when present. The hours remain a chronological ordered list for assistive technology.

### Inherited surface states

- The section has no independent loading, busy, retry, or failure state. The existing surface
  skeleton gains card-shaped placeholders hidden from assistive technology, and gaps/outdated status
  keep their existing surface-level text and actions.

## Consequences

- Users get a scannable hourly row on every supported width without the page drifting sideways.
- The exception is limited to this row; it does not authorize horizontal scrolling elsewhere and
  must not be cited as precedent for page-level overflow.
- Keyboard and screen-reader users gain one additional focus stop on Home; the ordered list is
  announced with its item count in chronological order.
- Geometry is fixed by a theme token, so wider screens reveal more complete cards rather than
  stretching cards; long localized labels must wrap inside the card, never widen it.
- Automated tests verify the containment scope (exactly one scroller, no inline widths, no ancestor
  overflow), focusability, key handling, hint visibility, and loading placeholders; jsdom cannot
  measure real layout, so visual containment is verified manually per `quickstart.md`.
- If usability research shows the partial-card affordance is missed, the remediation path is to
  strengthen the static hint copy or adjust the card-width token — not to add scroll controls or
  page-level overflow.

## Alternatives considered

- **Vertical stacked rows (status quo)**: Rejected — fails the approved redesign and the compact
  card presentation requirement.
- **Paged carousel with arrow buttons**: Rejected — adds interactive controls forbidden by
  specification 008 and increases keyboard/ARIA surface without product value.
- **Responsive/fluid card widths or wrapping grid**: Rejected — violates the identical-width rule and
  removes the consistent partial-next-card cue; wrapping hides hours vertically instead of scrolling.
- **Page-level horizontal scroll**: Rejected — violates Principle VI, SC-004, and the clarification.
- **Scroll snap**: Deferred/rejected — not required, and mandatory snapping can move the row against
  the user's intent.

## Verification

- `frontend/tests/hourly-forecast-cards.test.tsx` — card content, missing values, single tab stop,
  arrow/Home/End handling, hint visibility, placeholders hidden from AT.
- `frontend/tests/weather-responsive.test.tsx` — exactly one contained scroller, no inline widths,
  all hours rendered at 360/768/1024/1440.
- `frontend/tests/weather-a11y.test.tsx` — axe coverage for the scroll region and every weather
  state, plus loading-placeholder exposure.
- Manual: `specs/008-hourly-forecast-cards/quickstart.md` responsive, keyboard, screen-reader,
  reduced-motion, and page-overflow checks.
