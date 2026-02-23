

## Fix Project Timeline Availability Bar Logic and Colors

**Risk: GREEN** -- purely UI logic changes, no backend/schema/RLS modifications.

---

### Current Problems

1. **Unavailable spans are hidden:** In `fillGapsWithAvailable()` (lines 50 and 64 of `useProjectTimelineData.ts`), spans with status `'unavailable'` are explicitly skipped and never added to the output array. This means red "unavailable" days simply vanish from the bar.

2. **Colors don't match the calendar:** The calendar uses green for available, amber for partial, red for unavailable, and blue for other. But the timeline bar uses sky-blue for available, a hatched sky-blue for partial, and blue for other -- making them visually inconsistent and confusing.

3. **"No availability data" message is misleading:** When a person has no calendar entries at all, they should be shown as fully available (one green bar spanning the whole project), not "No availability data."

---

### Fix

**File 1: `src/hooks/useProjectTimelineData.ts`**

- Remove the two `if (curStatus !== 'unavailable')` guards on lines 50 and 64. All statuses (available, partial, unavailable, other) should produce visible spans.
- When a person has zero records in the database, the function already defaults every day to "available", which produces a single green span across the project -- this is correct per the new rules.

**File 2: `src/components/project-timeline/AvailabilityLane.tsx`**

- Update `statusColor()` to match the calendar colors:
  - `available` = green (`bg-emerald-500/80`)
  - `partial` = amber (`bg-amber-500/80`)
  - `unavailable` = red (`bg-red-500/80`)
  - `other` = blue (`bg-blue-500/70`)
- Update `statusLabel()` to include "Unavailable" for the `unavailable` case.
- Remove the "No availability data" empty-state message (since gaps are now always filled with "available", this state should never occur; but as a fallback, show one green bar instead of a text message).

---

### Summary of Rules After Fix

| Calendar status | Timeline bar color | When shown |
|---|---|---|
| No entries at all | Green (available) | Person hasn't defined anything -- assumed available |
| Available (green) | Green | Explicitly marked available |
| Partial (amber) | Amber | Explicitly marked partial |
| Unavailable (red) | Red | Explicitly marked unavailable |
| Other (blue) | Blue | Explicitly marked other |

### Files Changed (2)

1. `src/hooks/useProjectTimelineData.ts` -- stop filtering out unavailable spans
2. `src/components/project-timeline/AvailabilityLane.tsx` -- update colors to match calendar, add unavailable label

