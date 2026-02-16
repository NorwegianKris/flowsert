

# Redesign: Location Standardization Tool

## Current Problem
The tool automatically groups cities using string similarity, which causes false merges (e.g., grouping different cities that happen to have similar names). It also makes dozens of Photon API calls on load, making it slow and unreliable.

## New Design

A two-panel layout where the admin has full control:

```text
+----------------------------------+-----------------------------------+
| USER-INPUTTED LOCATIONS          | STANDARDIZE TO                    |
| (multi-select list)              | (OpenStreetMap search)             |
|                                  |                                   |
| [ ] Bergen (12)                  | [Search for a city...        ]    |
| [x] Bergan (2)                   |                                   |
| [x] bergen (1)                   |   > Bergen, Norway                |
| [ ] Haugesund (5)                |   > Bergen op Zoom, Netherlands   |
| [x] haugesnd (1)                 |                                   |
| [ ] Kopervik (3)                 |                                   |
| ...                              |  [Apply to 2 selected]            |
+----------------------------------+-----------------------------------+
```

### How it works
1. On load, fetch all unique location values from the database with their counts -- no Photon API calls, instant load
2. Left panel: scrollable list of all locations with checkboxes, showing the personnel count next to each. Admin multi-selects the ones that should be merged
3. Right panel: a single GeoLocationInput where the admin types and picks the correct standardized city from OpenStreetMap suggestions
4. "Apply" button updates all selected locations to the chosen standard value
5. After applying, those locations disappear from the list (or show as completed)

### Benefits
- No automatic grouping or "hallucinated" merges -- the admin decides which cities belong together
- No API calls on load -- the list appears instantly
- Only one GeoLocationInput rendered at a time instead of 50+
- Simple, clear workflow

## Technical Changes

### `src/components/LocationStandardizationTool.tsx` -- Full rewrite
- Remove all auto-grouping logic (`groupSimilarLocations`, `fetchPhotonSuggestion`, background fetching)
- Remove the `stringSimilarity` import
- New state: `locations` (array of `{value, count}`), `selected` (Set of strings), `standardValue` (string from GeoLocationInput)
- Left panel: `ScrollArea` with `Checkbox` + label for each location, sorted alphabetically with count badges
- Right panel: single `GeoLocationInput` + "Apply" button
- On apply: update all personnel records matching selected locations to the new standard value, then remove those entries from the list
- Add a "Select All" / "Deselect All" toggle for convenience
- Keep the Refresh button

### `src/hooks/useGeoSearch.ts` -- Reduce debounce
- Change debounce from 300ms to 150ms for snappier typing feel

### No other files need changes
The component is already imported and used in `AdminDashboard.tsx` in the Settings tab -- that stays the same.

