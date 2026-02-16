

# Fill Availability Gaps with "Available" Default

## Problem

Currently, if a person has even one availability record (e.g., 3 days marked unavailable), only those specific days render on the timeline. The rest of the project period appears as an empty gap instead of showing the green "available" bar.

**Expected behavior:** Assigned personnel are available for the entire project period by default. Only days explicitly marked as partial/unavailable/other override that default.

## What Changes

**One file:** `src/hooks/useProjectTimelineData.ts`

### Replace `mergeAvailabilitySpans` with `fillGapsWithAvailable`

The new function:

1. Creates a day-by-day status map from project start to project end, defaulting every day to "available"
2. Overrides with any explicit availability records from the database
3. Merges consecutive same-status days into spans
4. Filters out "unavailable" spans (they appear as visual gaps in the timeline bar)

### Update `buildPersonnelTimelineData`

- Always call `fillGapsWithAvailable` with the raw records (or empty array), removing the special "no data" branch
- The function handles both cases: no records (full green bar) and partial records (green with gaps)

### Update `useProjectTimelineData` hook

- Store raw records grouped by personnel ID instead of pre-merged spans
- Pass raw records to `buildPersonnelTimelineData` so `fillGapsWithAvailable` can do the day-by-day mapping

## Technical Detail

```text
function fillGapsWithAvailable(records, personnelId, projectStart, projectEnd):
  1. Loop from projectStart to projectEnd, set every day = "available"
  2. For each record, override that day's status
  3. Walk sorted dates, merge consecutive same-status into spans
  4. Filter out "unavailable" spans
  return spans

Hook change:
  - availabilityMap stores Map<string, AvailabilityRecord[]> (raw records)
  - buildPersonnelTimelineData calls fillGapsWithAvailable per person

Result:
  - Person with no records -> full green "available" bar (unchanged)
  - Person with 3 days unavailable -> green bar with a gap where those 3 days are
  - Person with mixed partial/available/unavailable -> correct colored segments with gaps
```

No database changes needed. No other files affected.
