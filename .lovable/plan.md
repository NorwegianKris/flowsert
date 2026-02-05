

# Plan: Backfill Missing Certificate Title Data

## The Problem

You're seeing 5 CSWIP variations in the dropdown:
- `3.2 CSWIP Inspection`
- `3.2U`
- `3.2U Inspection`
- `3.2u`
- `3.2u inspection`

However, only 1 certificate appears in the "Inputted Types" merging list because the other certificates are missing the `title_raw` and `title_normalized` data that the merging UI requires.

| Certificate Name | title_raw | title_normalized | Status |
|-----------------|-----------|------------------|--------|
| 3.2U | 3.2U | 3 2u | Already mapped |
| 3.2u inspection | NULL | NULL | Invisible in merging UI |
| 3.2 CSWIP Inspection | NULL | NULL | Invisible in merging UI |
| Cswip 3.2u | NULL | NULL | Invisible in merging UI |
| 3.2U Inspection | NULL | NULL | Invisible in merging UI |
| 3.2u | NULL | NULL | Invisible in merging UI |
| CSWIP 3.2U | NULL | NULL | Invisible in merging UI |
| CSWIP 3.1 U | NULL | NULL | Invisible in merging UI |

## Solution

Create a one-time "Backfill Tool" that populates `title_raw` and `title_normalized` for all certificates where these fields are NULL, using the certificate `name` as the source value.

After backfilling:
1. All 7+ variations will appear in the "Inputted Types" list
2. You can select them all and merge them into "CSWIP 3.2U Inspector"
3. Aliases will be created for each variation for future auto-matching

## Technical Changes

### 1. Database Migration

Add a function to backfill missing title data:

```sql
-- Backfill title_raw and title_normalized from certificate name
UPDATE certificates
SET 
  title_raw = name,
  title_normalized = lower(regexp_replace(name, '[^a-zA-Z0-9\s]', ' ', 'g'))
WHERE title_raw IS NULL
  AND title_normalized IS NULL
  AND name IS NOT NULL;
```

### 2. Modify Backfill Tool UI

Update the existing `CertificateBackfillTool.tsx` to include a "Backfill Titles" action that:
- Counts certificates missing `title_raw`/`title_normalized`
- Shows a preview of what will be updated
- Executes the backfill with confirmation
- Refreshes the Inputted Types list

### 3. Update useInputtedTypes Hook

Add an alternative query path that can also group by certificate `name` for certificates where `title_normalized` is null. This ensures all certificates appear in the list even if they lack normalized titles.

## Files to Modify

| File | Change |
|------|--------|
| Database migration | Add SQL to backfill NULL title_raw/title_normalized from name |
| `src/components/CertificateBackfillTool.tsx` | Add "Backfill Titles" action |
| `src/hooks/useInputtedTypes.ts` | Include certificates with NULL title_normalized using name as fallback |

## Workflow After Implementation

1. Go to **Settings > Certificates > Types > Advanced Tools > Backfill Tool**
2. Click "Backfill Titles" to populate missing data
3. The 7+ CSWIP variations will now appear in the Inputted Types list
4. Select all variations
5. Select "CSWIP 3.2U Inspector" on the right
6. Click "Group into selected" to merge them all

## Safety Considerations

- The backfill only affects certificates where `title_raw IS NULL`
- Existing mappings are not affected
- The normalization uses the same algorithm as the main application
- All changes can be reviewed before confirmation

