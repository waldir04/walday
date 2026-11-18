# Phase 0 Research: Planning Suggestions

**Feature**: `009-planning-suggestions` | **Date**: 2026-11-18

All unknowns from the plan's Technical Context are resolved below. The five specification
clarifications from 2026-11-18 are treated as fixed inputs. No `NEEDS CLARIFICATION` remains.

---

## R1. Where does suggestion logic live, and how does it consume the agenda without violating FSD?

**Decision**: Add a `features/suggestions` slice with pure model modules, a controller hook, and
feature-local UI. `pages/HomePage` remains the composition root: it builds the existing `AgendaDay`,
derives a small weather port from `useWeather`, and passes three plain inputs to `useSuggestions` —
the agenda snapshot, the weather port, and mutation adapters (`applyTaskSlot`,
`applyCommitmentMove`). The feature imports only **types** from the agenda public API; it never
imports agenda runtime modules. `widgets/SmartSuggestions` becomes a presentational surface that
renders the controller's discriminated state and forwards callbacks.

**Rationale**: Suggestion generation is a use case composed from several entities, so it belongs in
`features`, not `shared` or `entities`. The agenda is another feature at the same layer; passing its
snapshot through Home keeps runtime coupling at the page, matching the FSD rule that higher layers
compose slices. Type-only imports are erased and expose the agreed contract without pulling agenda UI
or runtime code into the suggestions bundle. The existing ESLint rule already restricts deep imports
to public APIs, so no lint exception is needed.

**Alternatives considered**:
- *Put generation in `entities/task` or `entities/commitment`*: rejected — the rules span both
  domains plus agenda and weather, so a single entity would become a cross-domain god module.
- *Import `buildAgendaDay` inside the feature and rebuild the day*: rejected — duplicates the
  agenda's source of truth and can disagree about conflicts or availability.
- *Move agenda interval types into a new `entities/agenda` slice*: rejected for this feature — a
  broad refactor with no user-visible benefit; only the types are needed.
- *Generate on the backend*: rejected — tasks and commitments are guest-local device data, the spec
  requires immediate recalculation on local changes, and FR-007 prohibits nothing client-side while
  adding a network dependency would hurt resilience.

---

## R2. How are conflicts grouped and how is the movable activity chosen?

**Decision**: Consume the agenda's `TimeConflict[]` connected components (already derived) as the
conflict groups. For each group, choose exactly one candidate in this order:

1. **Flexible commitment with a valid alternative period.** A flexible commitment is eligible when
   there is an open interval on the same date, after the current minute, long enough for its existing
   duration, that does not intersect any other entry. If several flexible commitments qualify, pick
   the earliest original start, then the stable agenda entry key.
2. **Scheduled task by least deadline urgency.** Comparator, first match wins:
   no due date → latest future due date → due today → overdue; then lowest priority
   (`low` < `medium` < `high`); then latest original start; then stable source order (index in the
   `tasks` input, then task ID). A task must have an estimated duration and a valid alternative
   period.
3. If no movable activity can be placed conflict-free, **no suggestion** is produced for that group;
   the agenda continues to report it (FR-005, FR-021).

Fixed commitments are never candidates, and a group containing only fixed commitments yields no
suggestion.

**Rationale**: Reusing the already-derived connected components guarantees that suggestions and the
agenda describe the same conflict. The clarification explicitly prefers flexible commitments and
then the least deadline-urgent task, so the comparator encodes the same urgency model used for slots
in reverse. Deterministic tie-breakers prevent order changes between reloads (FR-006, FR-027).

**Alternatives considered**:
- *Pick the shortest activity first*: rejected — contradicts the approved clarification.
- *Move multiple activities to resolve a 3+ group*: rejected — FR-013 permits at most one change.
- *Treat touching boundaries as conflicts*: rejected — agenda semantics already exclude them, and
  the spec's edge case agrees.
- *Pick the latest-starting task first*: rejected as the primary rule; original start is only a
  late tie-breaker after urgency and priority.

---

## R3. How is a valid alternative start computed for a movable activity?

**Decision**: Implement a local pure `openPeriodsExcluding(entries, targetKey, nowMinutes)`:

- Clip all entries except the target to `[currentMinute, 1440]`.
- Merge overlapping and touching occupied intervals.
- Invert them into open intervals.
- A candidate start must satisfy `start + activityDuration <= openEnd`.
- Choose the earliest candidate start that differs from the activity's current start and produces a
  different resulting change.
- Do **not** apply the agenda's 30-minute presentation threshold; the requirement is only that the
  whole activity fits and avoids every other entry (FR-015). The activity's duration is preserved.

For conflict suggestions, the moved activity must have zero intersections with every other entry
after the move, which the open interval guarantees. Other members of the connected group may still
overlap; the explanation names the remaining pairs.

**Rationale**: The agenda's presented availability excludes the interval currently occupied by the
activity being moved, so it cannot answer "where could this activity go if it were removed?" A local
inversion over the same minute model is small, pure, and testable. The 30-minute threshold is a
presentation rule for "available time" on the agenda, not a fit rule for relocating an activity; the
spec requires only full containment and no overlap.

**Alternatives considered**:
- *Try each minute 0–1440*: rejected — 1 441 iterations per candidate is unnecessary; interval
  inversion is exact and cheaper.
- *Use `day.availability.periods` directly*: rejected — it omits gaps hidden by the target activity,
  producing false "no alternative" results.
- *Move to the next activity's end only*: rejected — misses gaps before an activity and can fail
  even when a valid earlier placement exists.

---

## R4. How are slot suggestions generated, ordered, and limited?

**Decision**: For every unscheduled pending task selected by the agenda (`day.unscheduledTasks`) with
an estimated duration, consider only `day.availability.periods` whose length is at least the
duration. Propose the period's start minute. Tasks without a duration are never proposed and never
receive a default duration.

Selection and ordering follow FR-022/FR-023:
overdue → due today → earliest future due date → no due date; within equal due status
`high` → `medium` → `low`; then earliest proposed start; then stable source order.

Category order is conflict → deadline-driven slot (task has any due date) → other slot (no due date)
→ flexible adjustment. Deduplicate by activity and resulting change, filter dismissed candidates,
then take the first three. Hidden candidates are never rendered as placeholders or counts.

**Rationale**: Using the agenda's presented periods for slots guarantees that the proposal fits what
the user can see and respects elapsed-time trimming, day end, and the 30-minute minimum. The ordering
is exactly the clarified due-date model, including "future due date outranks no due date."

**Alternatives considered**:
- *Schedule at any gap not presented by the agenda*: rejected — would contradict the agenda and
  FR-014/FR-015.
- *Merge tasks into one "busy day" suggestion*: rejected — one change per suggestion and one reason
  per activity are required.
- *Show more than three or add a "+N more"*: rejected — FR-041/FR-044 forbid both.

---

## R5. When does weather change the chosen slot?

**Decision**: Home maps `useWeather` into a weather port only when the surface is `ready` and
`freshness.isOutdated === false`. Each forecast hour becomes
`{ startMinutes, endMinutes, condition, precipitationProbability }` in device-local minutes, with
`endMinutes` derived from the next hour's timestamp so DST transitions are preserved. A candidate
period is weather-eligible only when every hour of the **proposed activity span**
(`start → start + duration`) is covered by forecast data.

Weather may change the choice only among periods that already fit every non-weather constraint. The
chosen period is:

- the earliest fitting period when weather is unavailable, outdated, partial for any compared span,
  or shows no material difference; otherwise
- the fitting period with the best weather when it is **materially better** than the earliest fitting
  period. Materially better means at least one of: a condition severity difference of 2 or more
  ranks (`clear` 0, `partly-cloudy` 1, `cloudy` 2, `fog` 3, `rain` 4, `snow` 5, `storm` 6), either
  span containing `storm` or `snow` while the other does not, or a precipitation-probability
  difference of at least 30 percentage points. Ties resolve to the earliest period.

The explanation cites the factual condition and the covered span in the user's units, and never
claims guaranteed completion. Temperature is not used as evidence or as a deciding basis. Weather
never withholds a suggestion and is never cited when stale, unavailable, incomplete, or not decisive.

**Rationale**: FR-026/FR-029 require weather to be a tie-breaker only after fit is satisfied, and
FR-030/FR-034 require silence when the data is not usable. Requiring complete coverage of the actual
activity span prevents cherry-picking a sunny hour that does not contain the work. Severity and
precipitation are objectively comparable and explainable in text.

**Alternatives considered**:
- *Change the choice on any temperature difference*: rejected — "better" temperature depends on the
  activity and the product does not classify indoor/outdoor work; temperature is not used as evidence
  at all.
- *Use weather to reject outdoor-looking tasks*: rejected — FR-031 and the spec's out-of-scope list.
- *Use a numeric score without a threshold*: rejected — any tiny difference would silently reorder
  suggestions, contradicting the "meaningful difference" requirement.
- *Use weather for conflict/flexible alternative selection*: rejected for this iteration — US3
  defines weather influence for otherwise equally suitable task periods; movement alternatives are
  chosen by earliest valid fit and remain explainable without weather.

---

## R6. How does a flexible-adjustment suggestion work without scheduling the beneficiary?

**Decision**: Build the list of beneficiary tasks: unscheduled pending tasks with a duration that no
current presented period can fit. Iterate beneficiaries in the same urgency/priority order as slot
selection. For each beneficiary, iterate flexible commitments on the current date by earliest
original start then stable key, and iterate their valid alternative starts from
`openPeriodsExcluding` in ascending order. A candidate is valid only when, after simulating the move
and excluding the beneficiary's not-yet-existing slot, the agenda's presented availability would
contain a period at least as long as the beneficiary's duration.

The suggestion's `ProposedChange` moves only the flexible commitment (same date, same duration).
The beneficiary task ID and title are used only in the explanation. Applying never schedules the
task; after the commitment move lands, the normal recalculation may produce a separate slot
suggestion.

If the chosen flexible commitment already carries a conflict suggestion, the conflict suggestion
wins and the flexible-adjustment candidate is dropped (one suggestion per activity).

**Rationale**: FR-017 and the clarification require exactly this separation, and the benefit must be
stated in the explanation. Simulating the move against the same interval model keeps the promise
truthful. Iterating in the established urgency order keeps the output deterministic.

**Alternatives considered**:
- *Move the commitment and schedule the task atomically*: rejected — explicitly forbidden by the
  clarification and would make one suggestion change two records.
- *Propose any flexible move and claim it "may help"*: rejected — FR-018 requires a stateable
  planning benefit.
- *Choose the move with the largest resulting gap*: rejected — not explainable in user terms and not
  required; earliest valid benefit is deterministic and sufficient.

---

## R7. How is dismissal memory stored and scoped?

**Decision**: Use one device-local key, `walday:suggestion-dismissals`, with a strict versioned
payload:

```ts
{
  version: 1,
  localDate: 'YYYY-MM-DD',
  entries: Array<{
    suggestionId: string
    activityKey: string
    changeSignature: string
    dismissedAt: string
  }>
}
```

- Validate with Zod on read; invalid or unsupported data is treated as empty and replaced on the next
  write.
- Load only when `localDate` equals the current local date; otherwise return empty and do not show
  the old day.
- On dismiss, re-read and merge by `suggestionId`, prune entries older than the current date, cap the
  list (100 entries), then write through `enqueueWrite`.
- On restore, remove the matching entry and write. Restoring never applies anything.
- If storage is unavailable, corrupt, or quota-limited, keep the decision in memory for the session,
  show the existing storage notice/status, and never claim it was permanently recorded.
- Dismissals are never sent to the backend and are not part of the account.

**Rationale**: The clarification mandates device-local, day-scoped dismissal memory for guests and
authenticated users alike. A tiny validated payload avoids coupling dismissal state to task or
commitment stores and cannot corrupt user plan data. Merging on write is enough for the low-stakes
multi-tab case without a lock.

**Alternatives considered**:
- *Store dismissals in the task or commitment store*: rejected — mixes a display decision with
  authoritative plan data and risks versioning or write conflicts.
- *Sync dismissals through the account*: rejected — explicitly clarified as not synchronized.
- *Store only suggestion IDs and rebuild everything else*: accepted in spirit — the stored activity
  and change signature make the scope explicit and let stale records be pruned safely.

---

## R8. How is a suggestion applied atomically and safely against stale state?

**Decision**: Home supplies two adapters:

- `applyTaskSlot(taskId, startTime, durationMinutes, acknowledged)` — runs the existing agenda
  `validateScheduleDraft` and then `tasks.scheduleTask`, preserving agenda conflict acknowledgment.
- `applyCommitmentMove(commitmentId, startTime, endTime, acknowledged)` — calls the existing
  commitments `update`, preserving overlap validation and its acknowledgment flag.

Before calling an adapter, the controller:

1. Recomputes the current candidate list from the latest inputs, but retains an already-presented
   suggestion whose proposed change still satisfies every non-weather constraint when weather becomes
   unavailable or outdated (FR-033).
2. Verifies the target still exists and is eligible and that the proposed change still satisfies every
   non-weather constraint; a weather-driven change does not invalidate an already-presented change.
3. Verifies the proposed or adjusted start is not in the past, stays within the current local day,
   ends by 24:00, and keeps the activity's duration.
4. For an adjusted overlapping time, requires explicit conflict acknowledgment and names every
   conflicting activity.
5. Sets a single pending suggestion ID, disables repeated activation, and calls exactly one adapter.

A success recalculates from the updated data, removes the applied suggestion, announces the exact
change, and leaves the agenda to reflect the new data immediately through the existing controllers.
A failure leaves all data unchanged, preserves the suggestion and adjusted values where practical,
and offers retry. Exactly one store write occurs, so no cross-store transaction is needed.

**Rationale**: The adapters keep every existing validation as the single source of truth and satisfy
FR-051/FR-053/FR-071. Re-deriving instead of trusting a stale card handles target completion,
deletion, duration edits, commitment type changes, and weather changes.

**Alternatives considered**:
- *Write tasks/commitments from the suggestions feature*: rejected — duplicates storage logic,
  bypasses agenda acknowledgment, and violates FSD ownership.
- *Trust the suggestion snapshot without revalidation*: rejected — explicitly forbidden by FR-047
  and FR-051.
- *Optimistically update the agenda before persistence*: rejected — the feature must not show a
  change that did not happen.

---

## R9. How are identity, ordering stability, and no-suggestion reasons made deterministic?

**Decision**: A suggestion ID is a stable string built from category, target, and resulting change
using minute values, for example `slot:task:<id>:<date>:<start>`,
`conflict:task:<id>:<from>-<to>`, `conflict:commitment:<id>:<from>-<to>`, and
`flex:commitment:<id>:<date>:<from>-<to>:task:<beneficiary>`. It never includes localized text,
weather, or a timestamp. The generated list is sorted by the category and task comparators, then by
ID as the final stable tie-breaker; duplicate activity/change pairs keep the higher-precedence one.

No-suggestion reason precedence (the `incomplete` surface state is separate and is **not** a
`NoSuggestionReason`):

1. `all-dismissed` — candidates exist but all are dismissed (offer review).
2. `day-already-planned` — there are no pending unscheduled tasks and no conflicts, so the day is
   already planned or there is nothing to place.
3. `missing-durations` — pending unscheduled tasks exist but none that could be placed has a
   duration.
4. `no-free-period` — pending unscheduled tasks with durations exist but none fits and no flexible
   move helps.
5. `nothing-actionable` — only fixed-only conflicts or no permitted improvement exists (link to the
   agenda).

**Rationale**: IDs based only on domain values survive re-renders, language changes, and weather
refreshes, which is required for dismissal memory and FR-068's calm announcements. A fixed reason
precedence prevents different explanations for the same day.

**Alternatives considered**:
- *Random UUIDs per render*: rejected — breaks dismissal memory and causes repeated live-region
  churn.
- *Include the reason text in the ID*: rejected — language changes would resurrect dismissed cards.
- *Return the first applicable reason in generation order*: rejected — generation order is not a
  user-facing concept and would be unstable.

---

## R10. How are the surface states, accessibility, and localization implemented?

**Decision**: Model the surface as a discriminated union:
`loading | incomplete | error | ready` where `ready` contains up to three active suggestions,
dismissed candidates, and an optional `noSuggestionReason`. The widget renders:

- **Loading**: a card-shaped skeleton matching the final layout, `aria-busy="true"`, one sr-only
  status, decorative skeleton hidden from assistive technology.
- **Incomplete/error**: mint surface with a localized explanation and a retry action; never presents
  partial suggestions as complete.
- **Ready with suggestions**: an ordered list of cards. Each card has a heading naming the activity,
  visible current → proposed text, a reason paragraph referenced by `aria-describedby`, a category
  text label, and Accept / Adjust / Dismiss buttons with names that include the activity and time.
- **Ready with no suggestions**: the reason text plus a relevant action (review dismissed, open
  agenda, or open Task Management), never fabricated cards.
- **Dismissed review**: an expandable region listing dismissed candidates for the day with Restore;
  restoring is not applying.
- **Adjust dialog**: native `<dialog>` with the existing focus trap, a required start-time input,
  read-only duration, visible current/original-proposed/adjusted values, conflict names and an
  explicit acknowledgment checkbox when needed, inline errors, and focus return to the invoking
  button.

One polite live region owned by the surface announces applied, dismissed, restored, and failure
outcomes once, then focus moves to the next suggestion action, the section heading, or the
no-suggestion state. Pending actions expose a busy/disabled state. All colors are semantic tokens;
category, weather influence, conflict status, and outcome always have text. Motion is limited to the
existing 150 ms ease-out affordances and respects `prefers-reduced-motion`.

**Rationale**: This satisfies FR-064 through FR-080 and Principle XIII while keeping announcements
centralized. A dialog with explicit values supports the user-controlled adjustment requirement
without adding a second scheduling form.

**Alternatives considered**:
- *Inline time editing in each card*: rejected — more error-prone and harder to announce; the
  dialog presents current/proposed/adjusted together.
- *Per-card live regions*: rejected — produces duplicate announcements as data recalcs.
- *Icon-only category or weather badges*: rejected — forbidden by FR-076 and the constitution.
- *Hide the region when empty (spec 005 FR-025)*: rejected — explicitly superseded by this feature.
