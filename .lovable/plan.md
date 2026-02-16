

# Make Location Suggestions Feel Almost Instant

## Problem
Even with the 80ms debounce and caching, the Photon API still requires a network round-trip (~200-500ms) for every new query. Users notice this delay while typing.

## Solution: Two-Tier Instant Suggestions

Show **existing database locations** immediately as the user types (zero latency), while the Photon API results load in the background and merge in when ready.

### Changes

#### 1. `src/hooks/useGeoSearch.ts` -- Reduce debounce + add prefix cache matching
- Drop debounce from 80ms to **30ms** -- the abort controller protects against request spam
- Add **prefix cache matching**: if the user types "Berg" and we already have cached results for "Ber", show those filtered results instantly while the "Berg" fetch runs in the background
- This means results appear on every keystroke from cached prefixes

#### 2. `src/components/ui/geo-location-input.tsx` -- Prioritize DB matches during loading
- While the Photon API is still loading, **show matching `existingLocations` immediately** as suggestions (these are already in memory, zero latency)
- When Photon results arrive, merge them in (geo results first, then DB matches, as it works today)
- This ensures the dropdown opens with relevant suggestions on the very first keystroke, before any network call completes

### How It Feels

```text
User types "B"
  -> Instantly shows matching DB locations ("Bergen, Norway", "Berlin, Germany")
  -> 30ms later, Photon fetch starts in background

User types "Be"
  -> Instantly shows filtered DB locations
  -> Prefix cache from "B" results shown immediately
  -> Photon fetch for "Be" starts

User types "Ber"
  -> DB matches + prefix-cached results shown instantly
  -> Photon results merge in ~200ms later
```

The user always sees suggestions within milliseconds because existing locations are already loaded in memory. The Photon results just enrich the list when they arrive.

### Technical Details

**`useGeoSearch.ts` prefix matching:**
```text
// Before fetching, check if any cached key is a prefix of the current query
// e.g., cached "ber" results can be shown while "berg" is fetching
for (const [cachedKey, cachedResults] of geoCache) {
  if (cacheKey.startsWith(cachedKey)) {
    setResults(cachedResults); // show immediately as interim
    break;
  }
}
```

**`geo-location-input.tsx` immediate DB display:**
```text
// Show DB matches right away, even while geoLoading is true
const suggestions = useMemo(() => {
  // Always include matching existingLocations (instant)
  // Merge geoResults on top when available
});
```

### Files changed
- `src/hooks/useGeoSearch.ts` -- reduce debounce to 30ms, add prefix cache matching
- `src/components/ui/geo-location-input.tsx` -- show existingLocations immediately while Photon loads

