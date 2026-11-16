# Contract: Last-Known-Good Weather Snapshot Storage

**Owner**: `entities/weather/model/storage.ts` | **Consumer**: `features/weather/model/useWeather.ts`

Guest-only, versioned, single-record cache of the most recent successfully validated weather
response. It exists to satisfy FR-040/FR-044 (continuity while outdated, offline starts) and
constitution Principle XIX (prefer last-known-good, clearly marked). It is **not** a source of truth:
it seeds the query and is overwritten by every success. It is disposable derived data covered by the
application's existing guest-storage notice from User Preferences (spec 003); no weather-specific
warning is added, and no user-authored content is stored here.

## 1. Location and version

| Item | Value |
|---|---|
| Storage key | `walday:weather` |
| Envelope version | `1` |
| Backend | `localStorage` (falls back to no persistence when unavailable) |
| Records | exactly one |

No second key, index, or history is written. Coordinates are **not** stored here (they already live
in preferences); the record references the place by `providerPlaceId`.

## 2. Envelope

```json
{
  "version": 1,
  "providerPlaceId": "3117735",
  "localDate": "2026-11-16",
  "fetchedAt": "2026-11-16T05:18:07.120Z",
  "snapshot": {
    "units": "metric",
    "retrievedAt": "2026-11-16T05:18:06.900Z",
    "observedAt": "2026-11-16T05:00:00.000Z",
    "current": { "…": "…" },
    "hourly": []
  }
}
```

| Field | Rules |
|---|---|
| `version` | literal `1`; any other value is unusable (no migration in this feature) |
| `providerPlaceId` | 1…128 trimmed characters |
| `localDate` | `yyyy-mm-dd`, the **device-local** date at fetch time |
| `fetchedAt` | ISO instant when the client completed and persisted the fetch; used only for the future-clock guard and diagnostics, not displayed and not the freshness reference |
| `snapshot` | exact validated `WeatherSnapshot` from `contracts/weather-api.md` §1 |

The envelope contains no coordinates, no converted/display values, no language, no unit preference,
and no user identifier.

## 3. Read algorithm

```
readSnapshot({ now, providerPlaceId, localDate, maxRetentionMs }):
  raw = storage.getItem(KEY)
  if raw is null -> null
  parsed = try JSON.parse(raw)                     -> on failure: delete, null
  if !isStoredWeatherSnapshot(parsed)              -> delete, null   (Zod)
  if parsed.version !== 1                          -> delete, null
  if parsed.localDate !== localDate                -> delete, null   (midnight rule)
  fetched = Date.parse(parsed.fetchedAt)
  if !finite(fetched) or fetched - now > 60_000    -> delete, null   (future clock)
  reference = parsed.snapshot.observedAt ?? parsed.snapshot.retrievedAt
  if now - reference > maxRetentionMs              -> delete, null   (FR-044, data age)
  if parsed.providerPlaceId !== providerPlaceId    -> null           (keep record)
  return parsed
```

Rules:
- All storage access is try/catch-wrapped; a throwing or unavailable `localStorage` degrades to
  "no snapshot" and never fails Home.
- Deleting is best-effort; a failed delete still returns `null`.
- Values are re-validated on every read; nothing is trusted because it was written earlier
  (Principle XII).
- A record for a different place is ignored but retained so a rapid place switch back can reuse it.

## 4. Write algorithm

```
writeSnapshot(record):
  if record.snapshot fails API schema -> do not write
  if record.providerPlaceId !== current place at completion time -> do not write   (FR-043)
  if record.localDate !== current device-local date -> do not write
  storage.setItem(KEY, JSON.stringify({ version: 1, ...record }))   // single atomic envelope
```

Rules:
- Written only after the API adapter's Zod validation and after confirming the response still matches
  the active `(place, date)` query context.
- A storage write failure (quota, privacy mode) is non-fatal: the in-memory query result remains
  visible for the session and no UI warning is shown (weather is optional context).
- The record is replaced, never appended.

## 5. Retention interaction with the query

- The snapshot is offered as `initialData` only when it passes the read algorithm and no successful
  fetch has completed for the current query.
- It is rendered as **outdated** until the first successful fetch for the current query replaces it,
  even when `now − reference ≤ 30 min`, because a last-known-good snapshot is unverified until a
  refresh completes (FR-040, US3/US4). The 30-minute window then governs the live query result.
- If that reference crosses the 6 h maximum staleness while the surface is visible, the snapshot becomes
  unusable immediately: the surface shows the unavailable state with retry and no weather values. The
  read algorithm deletes an over-age stored record the next time it runs (FR-044).
- The query owns the data after hydration; a later automatic or manual refresh overwrites the record
  on success.
- At the device-local date change, the new query key makes the old record ineligible; the read
  algorithm also deletes it (SC-016).

## 6. Contract tests

- Valid record restores for matching place and date.
- Missing key, unparseable JSON, wrong type, unknown version → no snapshot and record removed.
- `localDate` mismatch, future `fetchedAt`, or freshness reference (`observedAt ?? retrievedAt`) older
  than 6 h → no snapshot and record removed.
- An old finite `observedAt` is preserved: it yields `isOutdated: true` between 30 min and 6 h, and an
  unavailable presentation beyond 6 h.
- Place mismatch → no snapshot, record retained.
- Write is skipped for a stale place/date and for a response that fails the API schema.
- Storage throwing on read/write leaves the surface functional.
- No coordinates appear in the serialized record.
