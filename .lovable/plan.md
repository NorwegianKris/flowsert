

# Speed Up OpenStreetMap Location Search

## Problem
The Photon API (photon.komoot.io) is a free service hosted in Europe. Network latency from the user's browser to that server adds noticeable delay on top of the 150ms debounce. There's no way to make the external API faster, but we can reduce perceived slowness.

## Changes

### 1. Reduce debounce to 80ms (`src/hooks/useGeoSearch.ts`)
- Drop from 150ms to 80ms -- still enough to avoid spamming on fast typing, but shaves ~70ms off every keystroke
- The abort controller already cancels in-flight requests, so rapid typing won't cause issues

### 2. Add a simple in-memory cache (`src/hooks/useGeoSearch.ts`)
- Cache previous query results in a `Map<string, string[]>` (kept as a module-level variable so it persists across re-renders)
- If the user types a query they already searched for (e.g., backspaces and retypes), results appear instantly without an API call
- Cache is bounded to the last 50 queries to avoid memory bloat

### 3. Show results immediately when cached, skip loading state
- If a cache hit exists, set results directly and skip the debounce/fetch entirely
- This makes repeat searches feel instant

## Technical Detail

```text
User types "Ber"
  -> 80ms debounce -> fetch from Photon -> cache result
User types "Berg"
  -> 80ms debounce -> fetch from Photon -> cache result
User clears and types "Ber" again
  -> cache hit -> instant results, no fetch, no spinner
```

### Files changed
- `src/hooks/useGeoSearch.ts` -- reduce debounce, add cache lookup before fetch

No other files need changes.
