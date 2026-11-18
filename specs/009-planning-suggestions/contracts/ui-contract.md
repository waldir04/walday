# Contract: Suggestions UI

**Feature**: `009-planning-suggestions` | **Date**: 2026-11-18

Presentational contract for the Home Smart Suggestions surface. This feature exposes no network API;
the contract is between `pages/HomePage`, `widgets/SmartSuggestions`, and the new feature UI.

---

## 1. Component tree

```text
widgets/SmartSuggestions.tsx            (presentational surface; owns no derivation)
├── SuggestionSurfaceSkeleton           (loading)
├── SuggestionUnavailableState          (incomplete/error + retry)
├── SuggestionNoResultsState            (no-suggestion reason + next action)
├── SuggestionCard[]                    (active suggestions)
│   └── SuggestionActions               (Accept / Adjust / Dismiss)
├── SuggestionDismissedReview           (expandable review + Restore)
├── SuggestionAdjustDialog              (native <dialog>)
└── one polite live region              (announcements)
```

`features/suggestions/ui/*` components are controlled and stateless except for the dialog's local
form values. `SmartSuggestions` may keep only presentation-local state (which dialog is open, review
expanded, current adjusted value); it MUST NOT generate candidates or touch storage.

---

## 2. `SmartSuggestions` props

```ts
export interface SmartSuggestionsProps {
  state: SuggestionsSurfaceState
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  weatherUnit: WeatherUnit
  onAccept: (suggestionId: string) => Promise<void>
  onAdjust: (input: {
    suggestionId: string
    startTime: string
    acknowledged: boolean
  }) => Promise<SuggestionApplyOutcome>
  onDismiss: (suggestionId: string) => Promise<void>
  onRestore: (suggestionId: string) => Promise<void>
  onRetry: () => void
}
```

Guarantees:
- Renders nothing when the selected date is not the current local date; the page may also omit the
  prop entirely (existing `showTodaySurfaces` pattern).
- The section heading id remains `suggestions-heading`.
- `aria-busy="true"` only while `status === 'loading'` or an apply is pending.
- Never renders more than three active cards.
- Never renders a card for an incomplete source or an error.
- Never renders a disabled-looking placeholder for hidden candidates.
- A failed apply keeps the card visible with an error message and retry action.
- The `incomplete` and `error` states carry no callback; their retry affordance calls `onRetry`.

### `SuggestionsSurfaceState`

```ts
export type SuggestionsSurfaceState =
  | { status: 'loading' }
  | { status: 'incomplete' }
  | { status: 'error' }
  | {
      status: 'ready'
      suggestions: readonly SuggestionView[]
      dismissed: readonly SuggestionView[]
      noSuggestionReason: NoSuggestionReason | null
      applyingId: string | null
      applyError: { suggestionId: string; code: string } | null
      announcement: string | null
    }
```

Mapping:

| State | Render |
|---|---|
| `loading` | Mint surface with heading, skeleton cards matching final geometry, one sr-only loading status, skeleton `aria-hidden`, `aria-busy="true"` |
| `incomplete` | Heading + localized "recommendations unavailable because the day's plan is incomplete" + Retry |
| `error` | Heading + localized generic error + Retry; no technical detail |
| `ready` + suggestions | Heading + ordered card list; optional review disclosure |
| `ready` + no suggestions | Heading + reason text + relevant next action(s) |
| `ready` + all dismissed | "No recommendations right now" + Review dismissed + next action |
| selected date ≠ today | Nothing |

---

## 3. `SuggestionCard` props and guarantees

```ts
export interface SuggestionCardProps {
  suggestion: SuggestionView
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  weatherUnit: WeatherUnit
  pending: boolean
  onAccept: () => void
  onAdjust: () => void
  onDismiss: () => void
}
```

`SuggestionView` (render projection):

```ts
export interface SuggestionView {
  id: string
  category: SuggestionCategory
  targetTitle: string
  currentLabel: string | null   // localized current state, or null for unscheduled
  proposedLabel: string         // localized resulting state
  reasons: readonly SuggestionReason[]
  weatherEvidence: WeatherEvidence | null
  durationLabel: string | null
}
```

Card content, in reading order:
1. Category text label (`Conflict`, `Find time`, `Adjust flexible time` — localized).
2. Heading naming the activity, e.g. "Move *Write report*".
3. Current → proposed time text, using localized time labels and `tabular-nums`.
4. At least one visible reason paragraph. Conflict reasons name every activity and state that fixed
   commitments are protected; remaining overlaps are named.
5. Weather fact in text when weather influenced the choice; never icon-only.
6. Actions.

Guarantees:
- One `<li>` in the surface's ordered list; no nested landmark.
- Heading is `<h3>` (section heading is `<h2>`).
- Reason paragraph has an `id` referenced by the card/article `aria-describedby`.
- Every action is a `<button>` with a visible label and an accessible name that includes the
  activity and, where relevant, the proposed time.
- `pending` disables all three actions and shows a localized pending label on the clicked action.
- No raw hex, inline styles, or arbitrary spacing.
- Times use `tabular-nums`; durations use the existing localized duration formatter.

### Accessible-name keys

| Action | Key | Pattern |
|---|---|---|
| Accept | `actions.acceptLabel` | `Accept: move {{title}} to {{time}}` |
| Adjust | `actions.adjustLabel` | `Adjust the time for {{title}}` |
| Dismiss | `actions.dismissLabel` | `Dismiss the suggestion for {{title}}` |
| Restore | `actions.restoreLabel` | `Restore the suggestion for {{title}}` |

The visible button text may be shorter (`Accept`, `Adjust`, `Dismiss`, `Restore`), with the full
name provided by `aria-label`; the visible text MUST be contained in the accessible name so voice
control remains usable.

---

## 4. `SuggestionAdjustDialog`

```ts
export interface SuggestionAdjustDialogProps {
  open: boolean
  suggestion: SuggestionView
  locale: string
  dateStyle: Intl.DateTimeFormatOptions['dateStyle']
  conflictsFor: (startTime: string) => SuggestionConflictLink[]
  pending: boolean
  onConfirm: (input: {
    startTime: string
    acknowledged: boolean
  }) => Promise<SuggestionApplyOutcome>
  onClose: () => void
}
```

`SuggestionConflictLink`, `SuggestionApplyOutcome`, and related types are defined in
`data-model.md` §8.2.

Guarantees:
- Native `<dialog>` with `aria-modal="true"`, labelled by its heading, and the existing
  `useDialogFocusTrap` behavior; focus starts in the time input and returns to the invoking button.
- Shows current time, originally proposed time, and adjusted time together.
- Duration is displayed read-only; it cannot be edited.
- For a flexible commitment, only the start time is editable; end time is derived from the preserved
  duration and stays on the same date.
- Validation errors are inline and associated with the input via `aria-describedby`.
- Rejects empty/invalid times, times before now, times whose span leaves the current day, and spans
  ending after 24:00.
- When the adjusted time overlaps another activity, every conflicting title and time range is named
  and an explicit acknowledgment checkbox is required; confirming without it is blocked.
- On confirm failure, the dialog stays open, shows a localized non-technical error, keeps the
  entered time and acknowledgment, and offers retry.
- Cancel changes nothing.

---

## 5. `SuggestionDismissedReview`

```ts
export interface SuggestionDismissedReviewProps {
  dismissed: readonly SuggestionView[]
  pendingId: string | null
  onRestore: (suggestionId: string) => void
}
```

Guarantees:
- A disclosure button with `aria-expanded` and `aria-controls`; hidden entirely when the list is
  empty.
- Lists each dismissed suggestion's activity and proposed change; no Accept/Adjust actions.
- Restore removes the dismissal and returns the card to the active list without applying anything.
- Keyboard operable; focus remains sensible after restore (restored card or next item).
- Does not reveal dismissed suggestions to assistive technology until expanded.

---

## 6. Announcements and focus

One `aria-live="polite"` region owned by `SmartSuggestions`.

| Event | Announcement | Focus target |
|---|---|---|
| Loading completes | Optional: "Suggestions updated" only when the count/order meaningfully changes; avoid churn | Unchanged |
| Applied | "Moved {{title}} to {{time}}." or "Scheduled {{title}} at {{time}}." | Next suggestion's Accept button, else section heading |
| Adjusted + applied | Same applied message plus the applied time | Next suggestion's Accept button, else section heading |
| Dismissed | "Dismissed the suggestion for {{title}}." | Next suggestion's Accept button, else no-suggestion state/heading |
| Restored | "Restored the suggestion for {{title}}." | Restored card's heading |
| Apply failed | "The change did not happen. Try again." | The card's retry/accept button |
| Incomplete/error | Localized unavailable message | Retry button on user request only |

Rules:
- Announce each outcome exactly once; recalculation itself is silent.
- Do not re-announce a removed card as an error.
- Respect `prefers-reduced-motion`; no motion carries meaning.
- Never move focus on a background data refresh.

---

## 7. Copy and i18n

New namespace `suggestions`, registered in `shared/i18n/index.ts`, with full `en`/`es` parity.

Required key families:
- `heading`, `loading`, `error`, `incomplete`
- `categories.conflict`, `categories.slot`, `categories.flexible`
- `actions.accept`, `actions.acceptLabel`, `actions.adjust`, `actions.adjustLabel`,
  `actions.dismiss`, `actions.dismissLabel`, `actions.restore`, `actions.restoreLabel`,
  `actions.retry`, `actions.reviewDismissed`, `actions.hideDismissed`, `actions.pending`
- `states.noSuggestions.heading`
- `states.noSuggestions.allDismissed`
- `states.noSuggestions.dayAlreadyPlanned`
- `states.noSuggestions.missingDurations` + action to Task Management
- `states.noSuggestions.noFreePeriod` + action to the agenda
- `states.noSuggestions.nothingActionable` + action to the agenda
- `reasons.conflict.*`, `reasons.dueDate.*`, `reasons.priority.*`, `reasons.fit.*`,
  `reasons.beneficiary.*`, `reasons.weather.*`, `reasons.protectedFixed.*`
- `adjust.heading`, `adjust.current`, `adjust.proposed`, `adjust.adjusted`,
  `adjust.duration`, `adjust.conflictHeading`, `adjust.conflictAcknowledge`,
  `adjust.invalidTime`, `adjust.pastTime`, `adjust.endsAfterMidnight`, `adjust.outsideDay`
- `feedback.applied`, `feedback.dismissed`, `feedback.restored`, `feedback.applyFailed`,
  `feedback.retry`, `feedback.dismissalNotSaved`
- `weather.influencedBy` interpolation keys for condition, precipitation, time span

Rules:
- No hardcoded user-facing text in components.
- Dates, times, durations, and precipitation use `Intl` via existing formatters and the selected
  preferences; suggestion text never cites temperature. Times use the user's date/time presentation
  style.
- Interpolate titles and values through i18next, never string concatenation.
- Missing keys fall back to English.

---

## 8. Visual and responsive contract

- Mint suggestion surface tokens: `suggestion-surface`, `suggestion-surface-strong`,
  `suggestion-text`, `suggestion-cta`, with semantic `focus` and `border` tokens.
- Cards use `rounded-2xl`, generous padding, 12–16 px vertical gaps, and `rounded-lg` buttons.
- Accept is the primary dark-slate CTA with white text; Adjust and Dismiss are secondary controls
  with AA contrast on the mint surface.
- Category is a fully rounded pill with the `tag-border`/`tag-text` tokens and a text label.
- All times use `tabular-nums`; temperature is never rendered.
- Primary actions remain visible on touch; nothing depends on hover.
- Verified at 360, 768, 1024, and 1440 px and at 200 % zoom with no horizontal page scrolling and
  no clipped action labels.
- Loading skeleton matches the final card height and spacing to avoid layout shift.
- Dark identity only; no pure-black canvas; no new tokens unless a value cannot be expressed by the
  existing design system.

---

## 9. Test obligations

- Every state renders the correct region, heading level, and action set.
- Cards show category, activity, current/proposed state, reason, and weather fact in text.
- Accept only happens on explicit activation; repeated activation applies once.
- Adjust validation, conflict acknowledgment, cancel, failure/retry, and focus return.
- Dismiss removes the card without changing data; restore returns it without applying.
- No more than three cards; no placeholders for hidden candidates.
- Screen-reader names include the activity and time; reason is described.
- One announcement per outcome; focus moves as specified; no churn on recalculation.
- axe reports no serious/critical violations in loading, ready, no-suggestion, dismissed, and
  incomplete states.
- Responsive checks at all four widths and 200 % zoom; no page horizontal scroll.
- Interactive targets meet the project minimum of 24 by 24 CSS pixels (44 recommended), with visible
  focus and no hover-only access.
- en/es key parity and locale-correct time, duration, and precipitation text.
