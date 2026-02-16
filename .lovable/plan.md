

# Geo-Suggested Location Field with Existing Data Cleanup

## Overview
Implement a live geocoding search for the location field using the Photon API (OpenStreetMap), and provide an admin tool to standardize existing location entries across all personnel profiles.

## Part 1: Photon API — Is It Safe?
Yes. Photon is:
- Open-source, maintained by Komoot (a well-known outdoor navigation company)
- Powered by OpenStreetMap — the same data behind millions of apps
- Free, no API key required, no tracking
- Used by thousands of applications worldwide
- Falls back gracefully — if the API is down, users can still type freely

The only consideration is rate limiting (~1-2 requests/second), which the 300ms debounce handles easily.

## Part 2: Live Geo Search Implementation

### New files:
- **`src/hooks/useGeoSearch.ts`** — Debounced hook that calls `https://photon.komoot.io/api/?q={query}&limit=5&lang=en` with a Norway/Europe bias. Parses results into "City, Country" format.
- **`src/components/ui/geo-location-input.tsx`** — New input component that merges live API suggestions (priority) with existing DB locations from `useLocations`. Shows a subtle "Powered by OpenStreetMap" note.

### Updated files:
- **`src/components/EditPersonnelDialog.tsx`** — Replace location `AutocompleteInput` with `GeoLocationInput`

## Part 3: Smooth Cleanup of Existing Data

Rather than a one-time SQL migration (which could incorrectly standardize entries), the approach is an **admin-facing bulk cleanup tool**:

### How it works:
1. A new section in the admin settings (or a button on the Personnel page) called **"Standardize Locations"**
2. It groups all unique location values currently in the database (e.g., "Bergen", "Bergen, Norway", "bergen", "Bergen, Norge")
3. For each unique value, it suggests a standardized version from Photon (e.g., all three become "Bergen, Norway")
4. The admin reviews and approves each mapping, then clicks "Apply" to bulk-update all personnel records with that location
5. This ensures no data is changed without human review

### New files:
- **`src/components/LocationStandardizationTool.tsx`** — Admin tool that:
  - Fetches all unique locations from the database
  - Groups similar ones using fuzzy matching
  - For each group, calls Photon to suggest the standardized form
  - Shows a review table: "Current values" -> "Suggested standard" with approve/skip per group
  - On approve, runs a bulk update on the `personnel` table

### Technical flow:
```text
1. Fetch unique locations from personnel table
2. Group similar entries (fuzzy match)
3. For each group, query Photon for best match
4. Present admin with: [Current entries] -> [Suggested standard]
5. Admin approves/edits each suggestion
6. Bulk UPDATE personnel SET location = 'Bergen, Norway' WHERE location IN ('Bergen', 'bergen', 'Bergen, Norge')
```

## No Database Changes Required
This is purely a UI/UX improvement. The `location` column stays as a text field. Over time, as users pick from the standardized Photon suggestions, the data naturally stays clean. The cleanup tool handles the historical mess.

## Summary of Changes
| File | Change |
|------|--------|
| `src/hooks/useGeoSearch.ts` | New — Photon API search hook |
| `src/components/ui/geo-location-input.tsx` | New — Location input with live geo suggestions |
| `src/components/EditPersonnelDialog.tsx` | Update — Use GeoLocationInput for location field |
| `src/components/LocationStandardizationTool.tsx` | New — Admin tool to bulk-standardize existing locations |
| `src/pages/AdminDashboard.tsx` | Update — Add access to the standardization tool (e.g., in Settings tab) |

