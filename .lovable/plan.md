

# Internal Posted Projects -- Phase 1 (Two Additional Refinements)

## Overview

Two more refinements to the finalized plan before implementation begins.

---

## Refinement 1: Normalize personnel backfill values

The current backfill stores raw casing (e.g. "Norway", "Stavanger"). Since all visibility matching uses `LOWER(TRIM(...))`, this works -- but DISTINCT queries for the admin country/city selectors would show duplicates if some records have "Norway" and others "norway".

Updated backfill SQL:

```text
UPDATE personnel
SET city = NULLIF(LOWER(TRIM(split_part(location, ',', 1))), ''),
    country = NULLIF(LOWER(TRIM(split_part(location, ',', 2))), '')
WHERE location IS NOT NULL
  AND location NOT IN ('Not specified', 'Not Specified', '')
  AND position(',' IN location) > 0;
```

This stores `country = 'norway'` and `city = 'stavanger'` instead of mixed case. The original `location` field ("Stavanger, Norway") remains untouched for display purposes.

The `GeoLocationInput` structured save must also normalize before writing:

```text
country: result.country.toLowerCase().trim()
city: result.city.toLowerCase().trim()
```

The admin visibility selectors will display prettified labels (title-cased) but store and match in normalized form. Since both personnel and visibility data are now consistently lowercase, DISTINCT queries produce clean, deduplicated lists without extra processing.

---

## Refinement 2: Add updated_at trigger on project_applications

Reuse the existing `update_updated_at_column()` function (already defined in the database) by attaching it to the new table:

```text
CREATE TRIGGER update_project_applications_updated_at
  BEFORE UPDATE ON project_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

This ensures `updated_at` is always correct when status changes (accept/reject), without relying on application code to set it.

---

## No Other Changes

Everything else from the previously approved plan remains identical:

- Personnel table: add `country` and `city` columns (backfill now normalized)
- Projects table: add `visibility_all`, `visibility_countries`, `visibility_cities` with NOT VALID CHECK constraint
- `project_applications` table with RLS + updated_at trigger
- Security definer function with NULLIF city guard and ARRAY pattern
- GeoLocationInput structured data changes (saves normalized)
- Admin UI: visibility controls + applications tab
- Worker UI: split top segment + PostedProjects component
- All file lists (new and modified) unchanged

