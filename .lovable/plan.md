

# Fix: Location Standardization Tool Loading Forever

## Problem
The `LocationStandardizationTool` keeps `loading = true` (showing "Analyzing locations...") until every single Photon API call completes. With ~65 unique locations and 500ms delays between calls, the spinner runs for 30+ seconds, making it appear broken.

The root cause is in `fetchLocations()` — it groups the data, then loops through groups making API calls one-by-one, and only sets `loading = false` in the `finally` block after ALL calls finish.

## Solution
Split into two phases:

1. **Phase 1 (instant)**: Query database, group similar entries, set `loading = false`, render the table immediately
2. **Phase 2 (background)**: Only for groups with 2+ entries, fetch Photon suggestions progressively, updating each row as results arrive

For single-entry groups, add a small "Suggest" button so the admin can request a Photon lookup on demand.

## Changes

### `src/components/LocationStandardizationTool.tsx`
- Refactor `fetchLocations` to split into two phases:
  - Phase 1: DB query + grouping + `setLoading(false)` + render table
  - Phase 2: Background async loop that only targets multi-entry groups, updating state per-row as suggestions arrive
- Remove the broad `!e.includes(',')` filter that was triggering API calls for nearly every group
- Add a per-row "Suggest" button (MapPin icon) for single-entry groups to fetch on demand
- Add a background progress indicator ("Fetching suggestions... 3/8") shown as a small badge
- Reduce inter-request delay from 500ms to 300ms
- Use an `AbortController` / ref to cancel background fetching if the component unmounts or user clicks Refresh

