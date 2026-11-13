# Research: Daily Commitments

**Feature**: 004-daily-commitments | **Date**: 2026-11-12 | **Plan**: [plan.md](./plan.md)

## Resolved Clarifications

| # | Question (2026-11-12) | Resolution | Implemented in design |
|---|---|---|---|
| 1 | Preselect a type or require an explicit choice? | No preselection. The draft starts with `type: ''`; save is rejected until the user chooses fixed or flexible, with both explanations visible (FR-002, SC-001) | Draft type, validation `TYPE_REQUIRED`, form radios unchecked |
| 2 | When must an existing overlapping commitment re-ask for acknowledgment? | Only when an edit changes `date`, `startTime`, or `endTime` and the result still overlaps. Title/description/type edits never re-ask; the conflict indication stays visible (FR-025, SC-015) | Schedule comparison + derived acknowledgment rule |
| 3 | Where does a commitment live when local persistence fails? | It is not added to the saved list. The form stays open with the entered values, an accessible error is shown, and retry/cancel are offered (FR-040) | Explicit write-failure results; no optimistic list entry |
| 4 | What date does a new form default to when viewing a specific date? | The viewed date, still editable (FR-030, SC-016) | URL date state seeds the draft |
| 5 | Outdated tab: block or warn-and-overwrite? | Block further saves until reload; no overwrite path; accessible message and reload action (FR-042, SC-010) | Revision baseline + storage event → blocked mode |

## Decisions

### 1. Scope and stack applicability

- **Decision**: Keep the feature guest-local with no backend, HTTP API, TanStack Query usage, Prisma schema, or PostgreSQL migration. Use only the approved frontend stack plus Zod and Vitest.
- **Rationale**: FR-044 forbids sending commitment data to a server and SC-008 requires in-app retrieval only. Constitution XVII explicitly places guest local data outside server state, and XVIII requires a versioned local schema rather than Prisma for guest data. TanStack Query is present at the app root for future server features but is not the mechanism for this data.
- **Alternatives considered**: (a) Persisting commitments in PostgreSQL through Express/Prisma — rejected as a direct contradiction of the specification; (b) using TanStack Query as a local-state cache — rejected because it duplicates a store and misuses the server-state boundary; (c) adding a second client store — prohibited by XVII.

### 2. Versioned envelope and revision-based concurrency

- **Decision**: Store `{ version, revision, updatedAt, commitments }` under `walday:commitments`. Regenerate `revision` on each successful write and compare the caller's baseline before writing. Serialize writes and use the Web Locks API when available.
- **Rationale**: The task and preference stores already prove this design; it satisfies FR-041/FR-042 and Principle XVIII's versioning requirement, and prevents an older tab from silently overwriting newer data. The envelope also gives the future agenda a stable, self-describing payload.
- **Alternatives considered**: (a) Raw array with last-write-wins — rejected, violates FR-042; (b) `updatedAt` timestamps on records as the concurrency token — rejected because whole-store writes need a store-level token; (c) IndexedDB — unnecessary for this data size and outside the approved, established pattern.

### 3. Newer-tab behavior: block until reload

- **Decision**: On a revision mismatch or a relevant `storage` event, enter a blocked state: keep the current list visible, disable saves, announce that newer data exists, and offer an accessible reload action. Do not auto-adopt newer data.
- **Rationale**: The spec is explicit that saving must remain unavailable until reload and that no overwrite path is allowed. This intentionally diverges from the task store's idle auto-adoption.
- **Alternatives considered**: (a) Auto-merge — rejected, no conflict-resolution strategy is specified and silent modification is prohibited; (b) warn-and-overwrite — explicitly rejected by the clarification.

### 4. Read recovery: preserve, quarantine, never fabricate

- **Decision**: Classify reads as `empty`, `restored`, `partial`, `legacy`, `corrupt`, `migration-failed`, `unsupported`, or `unavailable`. Preserve valid records, quarantine invalid ones with stable reason codes, migrate the current raw-array shape in memory, and block automatic writes while unreadable data is protected.
- **Rationale**: FR-041 requires keeping valid data, isolating invalid entries, informing the user, and never silently overwriting. Generating replacement IDs on read (the current behavior) breaks stable identity and is prohibited.
- **Alternatives considered**: (a) Reset the store on parse failure — rejected, destroys recoverable data; (b) auto-write migrated data at load — rejected, can overwrite data the user has not seen; (c) ignore invalid records silently — rejected, FR-041 requires informing the user.

### 5. Atomic save failure behavior

- **Decision**: A write either replaces the whole envelope or leaves the prior envelope untouched. On failure, return a typed error, do not update the in-memory list, keep the form open with the draft, and offer retry/cancel.
- **Rationale**: FR-040 and SC-004 forbid presenting an unsaved commitment as saved. Whole-envelope `setItem` is atomic, so there is no partial-write state.
- **Alternatives considered**: (a) Optimistic list insertion with rollback — rejected, the spec requires the form to stay open and the list to remain unchanged; (b) in-memory "session-only success" like the task store — rejected for this feature because it would show a commitment that is not persisted.

### 6. Overlap model and acknowledgment scope

- **Decision**: Use half-open intervals `[start, end)` on the same local date; exclude the edited commitment; list every conflict; require acknowledgment only on create-with-overlap or on a date/time-changing edit that still overlaps. Derive the requirement by comparing the submitted schedule with the original schedule.
- **Rationale**: Implements FR-023–FR-029 and the clarification exactly, without persisting an acknowledgment flag that could become stale or contradict the rule. Boundary-touching periods are naturally excluded by the strict comparisons.
- **Alternatives considered**: (a) Persisted acknowledgment signature — rejected as unnecessary state and a source of re-ask bugs; (b) blocking all overlaps — rejected, overlaps are advisory and may be legitimate; (c) auto-resolving conflicts — prohibited by FR-028.

### 7. Validation limits and text length

- **Decision**: Count Unicode grapheme clusters (reusing the existing preference helper extracted to `shared/lib`) for the 120-title and 500-description limits; validate dates by real calendar fields, not by `Date` normalization; validate times with a strict `HH:mm` pattern.
- **Rationale**: Grapheme counting matches how users perceive characters and aligns with the task model; strict parsing prevents silent date shifts and malformed time values. Reusing one counter avoids divergent behavior.
- **Alternatives considered**: (a) JavaScript `String.length` — rejected, counts UTF-16 units and rejects valid emoji/accented text early; (b) `new Date(value)` validation — rejected, normalizes invalid dates and introduces timezone ambiguity; (c) relying on native input constraints only — rejected, constraints are not guaranteed for programmatic values or stored records and cannot provide the required messages.

### 8. Local wall-clock semantics and display formatting

- **Decision**: Treat `date` and times as user-entered local calendar values. Do not parse `YYYY-MM-DD` as UTC or convert periods between timezones. Format dates with the active formatting locale/date-time presentation using `Intl`; format `HH:mm` values through `Intl.DateTimeFormat` on a fixed reference date so the locale's hour cycle applies. Switching the interface language must never change stored dates or wall-clock times; this version adds no separate time-format preference.
- **Rationale**: FR-051 and the spec assume wall-clock stability across timezone/DST changes. Reusing the preferences formatting path keeps presentation consistent and avoids a date library (prohibited by XX).
- **Alternatives considered**: (a) Storing instants — rejected, would move commitments on timezone/DST changes; (b) a date library — rejected by the stack policy; (c) hardcoded 24-hour display — rejected because the active formatting locale must govern presentation.

### 9. Date view and URL state

- **Decision**: Keep the selected date in the route search string (`/commitments?date=YYYY-MM-DD`), default to today when absent/invalid, and provide previous/next/today controls plus a native date input. Filter the list to that date and seed new drafts with it.
- **Rationale**: FR-030/FR-031 require one-date viewing and a viewed-date default; URL state makes reloads and links deterministic and is native to React Router 7. It also removes the current dead edit link.
- **Alternatives considered**: (a) Component-only state — rejected, reload loses the viewed date; (b) a separate route per date — rejected, unnecessary routing surface for the same page.

### 10. Save/delete UX and focus

- **Decision**: Use the shared `ConfirmDialog` for deletion, naming the commitment. Prevent duplicate submissions while pending. After create/update, announce success and return focus to the list or the edited item; after delete, focus the next item or the empty-state action.
- **Rationale**: FR-005, FR-010, FR-011, FR-047, FR-048 and Principle XIII require explicit confirmation, announced results, and predictable focus. The shared dialog already implements focus trapping and return.
- **Alternatives considered**: (a) `window.confirm` — rejected, untranslatable and inaccessible; (b) silent removal — rejected by FR-005.

### 11. Reuse versus refactor of the existing implementation

- **Decision**: Keep the FSD slice layout, Zod direction, overlap predicate, shared UI primitives, route, and EN/ES namespace. Replace the storage adapter, controller, and page composition; refactor schemas, validation, sanitization, form, list, and item styling. Adopt the task store's proven design and extract only the generic envelope/lock/baseline primitive to `shared/lib/guestStore`.
- **Rationale**: The existing structure is sound and matches the constitution; the behavioral gaps are concentrated in persistence and state orchestration. Reusing the task storage design avoids inventing a second concurrency model.
- **Alternatives considered**: (a) Rewrite the entire slice — rejected, discards working overlap logic, route wiring, and primitives; (b) patch the current hook with more `useEffect`s — rejected, cannot express pending/failure/blocked states reliably; (c) copy the task storage code verbatim into commitments — rejected as a third copy of the same logic.

### 12. Testing strategy

- **Decision**: Test pure model rules, storage outcome matrices (including quota, conflict, corruption, and legacy migration), form validation and error summary, overlap acknowledgment paths, date navigation/ordering, multi-tab blocking, a11y roles/keyboard behavior, EN/ES parity, and the absence of network calls. Use injected `now`, `randomId`, and storage adapters for determinism.
- **Rationale**: Principle VII and the Definition of Done require behavior-focused coverage of critical journeys and boundaries; storage and concurrency are the highest-risk areas.
- **Alternatives considered**: (a) Snapshot-only component tests — rejected by VII; (b) tests that assert implementation internals — rejected, brittle and not evidence of correctness.

## Open Questions

None. All technical context and previously identified `NEEDS CLARIFICATION` items are resolved within the specification and constitution constraints.
