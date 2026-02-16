

# Separate Standardized vs User-Inputted Locations

## What Changes

The left panel of the Standardize Locations tool currently shows all locations mixed together. We will split them into two groups based on format, and add a tab on the right "Standardize to" box to browse already-standardized locations.

## How We Detect Standardized Locations

OpenStreetMap locations from the GeoLocationInput are always formatted as **"City, Country"** (e.g., "Bergen, Norway"). Locations without a comma are treated as user-inputted free-text (e.g., "bergen", "Bergan", "Oslo area").

## UI Changes to `LocationStandardizationTool.tsx`

### Left panel
- Only show **non-standardized** locations (those without a comma pattern matching "City, Country")
- Update the header to say "User-inputted locations" with the filtered count

### Right panel -- add Tabs
- **Tab 1: "Standardize to"** (default) -- the existing GeoLocationInput search + apply button, unchanged
- **Tab 2: "Standardized locations"** -- a scrollable list showing all locations that match the "City, Country" format, with their personnel count badges. This is read-only, just for reference so you can see what's already clean.

## Technical Detail

**Splitting logic** (inside the component, after fetching):
```text
const isStandardized = (loc: string) => /^.+,\s*.+$/.test(loc);

const userInputted = locations.filter(l => !isStandardized(l.value));
const standardized = locations.filter(l => isStandardized(l.value));
```

**Files changed:**
- `src/components/LocationStandardizationTool.tsx` -- add the splitting logic, wrap right panel content in Tabs (using existing `@radix-ui/react-tabs`), add a "Standardized locations" tab showing the clean entries

No database changes needed.
