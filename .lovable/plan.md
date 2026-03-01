

## Plan: Add Lat/Lon Columns and Store Coordinates on Geocoding

**Risk**: 🔴 Migration adds columns to `certificates` table → anchor required.

### 1. Database Migration

Add two nullable columns to `certificates`:

```sql
ALTER TABLE public.certificates
  ADD COLUMN place_of_issue_lat double precision,
  ADD COLUMN place_of_issue_lon double precision;
```

GREEN migration — additive only, no data changes, no RLS impact.

### 2. Update `geocodeWithNominatim` return type

**File: `src/components/CertificateLocationNormalizationTool.tsx`**

- Change return type from `string | null` to `{ displayName: string; lat: number; lon: number } | null`
- Extract `lat` and `lon` from Nominatim response (already present in the JSON)
- Update `LocationMapping` interface to include `lat` and `lon` fields
- In the processing loop, store lat/lon in the mapping alongside the display name
- In `handleApplyAll`, include `place_of_issue_lat` and `place_of_issue_lon` in the certificate update alongside `place_of_issue`
- In `handleApplyCountries`, no lat/lon (country-only normalization uses a hardcoded map, not Nominatim)

### 3. Update upload geocoding

**File: `src/components/AddCertificateDialog.tsx`**

- In the Nominatim fire-and-forget block (lines 233–256), extract `lat` and `lon` from `cityResult`
- Store them in the certificate form state (add `placeOfIssueLat` / `placeOfIssueLon` fields to the local cert state)
- When the certificate is saved to the database, include `place_of_issue_lat` and `place_of_issue_lon` in the insert payload

This requires checking the save handler to see where the INSERT happens.

### Files changed

| File | Action |
|---|---|
| Migration | ADD `place_of_issue_lat`, `place_of_issue_lon` to `certificates` |
| `src/components/CertificateLocationNormalizationTool.tsx` | Return and store lat/lon from Nominatim |
| `src/components/AddCertificateDialog.tsx` | Store lat/lon on upload geocoding |

