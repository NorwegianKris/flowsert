
# Replace Visibility Model: Location-Based with Same-Country Default

## What this replaces

The current `ProjectVisibilityControls` uses a country/city checkbox list tied to `visibilityAll`, `visibilityCountries`, and `visibilityCities`. These fields still exist in the DB and in all hooks/dialogs. This plan replaces the entire model in one pass.

---

## 1. Database Migration (single migration, safe ordering)

Execution order within the migration:

1. Drop old constraint: `projects_visibility_check`
2. Drop old columns: `visibility_all`, `visibility_countries`, `visibility_cities`
3. Add new columns:
   - `project_country text` (nullable; required by constraint when `is_posted = true`)
   - `project_location_label text`
   - `visibility_mode text NOT NULL DEFAULT 'same_country'`
   - `include_countries text[]`
   - `exclude_countries text[]`
4. Replace `can_worker_see_posted_project` function with corrected version
5. Add `CHECK` constraints (`NOT VALID` then `VALIDATE`)
6. `NOTIFY pgrst, 'reload schema'`

### Final `can_worker_see_posted_project` function

Incorporates all feedback:
- `LOWER(TRIM(COALESCE(p.project_country, '')))` on the project side (DB-level normalization guard)
- `COALESCE(p.exclude_countries, ARRAY[]::text[])` for NULL-safe array ops on both include and exclude
- `<> ALL(...)` pattern for the exclude check (evaluates `true` against empty array)
- `COALESCE(p.visibility_mode, 'same_country')` with `ELSE false` to prevent NULL collapse
- Workers with `NULL` country: match nothing in `same_country` mode (they only see `all` mode projects — consistent, pragmatic, documented in code comment)
- Freelancers included with no additional filter

```text
CREATE OR REPLACE FUNCTION can_worker_see_posted_project(
  _user_id uuid, _project_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  -- Workers with NULL country are treated as "unknown location":
  -- they only see projects when visibility_mode = 'all'.
  SELECT EXISTS (
    SELECT 1
    FROM projects p
    JOIN personnel per ON per.business_id = p.business_id
    WHERE p.id = _project_id
      AND p.is_posted = true
      AND per.user_id = _user_id
      AND NOT (
        LOWER(TRIM(COALESCE(per.country, '')))
        = ANY(
          ARRAY(SELECT LOWER(TRIM(x))
                FROM unnest(COALESCE(p.exclude_countries, ARRAY[]::text[])) x)
        )
      )
      AND (
        CASE COALESCE(p.visibility_mode, 'same_country')
          WHEN 'all' THEN true
          WHEN 'same_country' THEN
            LOWER(TRIM(COALESCE(per.country, '')))
              = LOWER(TRIM(COALESCE(p.project_country, '')))
            OR LOWER(TRIM(COALESCE(per.country, '')))
              = ANY(
                ARRAY(SELECT LOWER(TRIM(x))
                      FROM unnest(COALESCE(p.include_countries, ARRAY[]::text[])) x)
              )
          ELSE false
        END
      )
  );
$$;
```

Note: the `NULL` country / empty-string guard is consistent — `LOWER(TRIM(COALESCE(per.country, '')))` produces `''`, which will not equal any real country value and will not be in include/exclude lists. So workers with no country stored will only see `all`-mode projects where they are not excluded. Since their country is empty string, they won't be excluded either, so they do see `all`-mode projects. This is the correct pragmatic behavior.

---

## 2. Update `useProjects.ts`

### Remove from `Project` interface:
- `visibilityAll?: boolean`
- `visibilityCountries?: string[]`
- `visibilityCities?: Record<string, string[]>`

### Add to `Project` interface:
- `projectCountry?: string`
- `projectLocationLabel?: string`
- `visibilityMode?: 'same_country' | 'all'`
- `includeCountries?: string[]`
- `excludeCountries?: string[]`

### Remove from `DbProject` interface:
- `visibility_all: boolean`
- `visibility_countries: string[] | null`
- `visibility_cities: Record<string, string[]> | null`

### Add to `DbProject` interface:
- `project_country: string | null`
- `project_location_label: string | null`
- `visibility_mode: string`
- `include_countries: string[] | null`
- `exclude_countries: string[] | null`

### Update `fetchProjects` mapping:
Map new DB columns → new frontend fields (removing old ones).

### Update `addProject` and `updateProject` payloads:
Normalize on write:
- `project_country: project.projectCountry?.toLowerCase().trim() || null`
- `project_location_label: project.projectLocationLabel || null`
- `visibility_mode: project.visibilityMode || 'same_country'`
- `include_countries`: deduplicated, each `.toLowerCase().trim()`
- `exclude_countries`: same

Remove all `visibility_all`, `visibility_countries`, `visibility_cities` payload fields.

---

## 3. Rewrite `ProjectVisibilityControls`

### New props interface:
```text
interface ProjectVisibilityControlsProps {
  projectCountry: string;
  projectLocationLabel: string;
  visibilityMode: 'same_country' | 'all';
  includeCountries: string[];
  excludeCountries: string[];
  onProjectLocationChange: (country: string, label: string) => void;
  onChange: (data: {
    visibilityMode: 'same_country' | 'all';
    includeCountries: string[];
    excludeCountries: string[];
  }) => void;
}
```

### Available countries source (fixed for null/empty):
```text
SELECT DISTINCT country FROM personnel
WHERE business_id = ? AND country IS NOT NULL AND TRIM(country) <> ''
ORDER BY country
```
This prevents empty strings or null from appearing in include/exclude dropdowns.

### UI layout:

**Section 1 — Project Location (required)**
- `GeoLocationInput` with `onStructuredSelect`
- On select: call `onProjectLocationChange(result.country.toLowerCase().trim(), label)`
- On project country change: filter out the new `projectCountry` from both `includeCountries` and `excludeCountries` (dedup guard when location is switched)
- Shows current label or placeholder "Search for a project location..."

**Section 2 — Default visibility text**
- When `projectCountry` is set: `"By default, visible to workers in {titleCase(projectCountry)}"`

**Section 3 — "Visible to all workers (fly-in)" Switch**
- ON → `visibilityMode = 'all'`
- OFF → `visibilityMode = 'same_country'`
- Label change: when `'all'`, show "All workers can see this project"

**Section 4 — Advanced (collapsible Accordion, collapsed by default)**
- "Include additional countries": multi-select badges from available countries (excluding `projectCountry`)
- "Exclude countries": multi-select badges from same list
- Deduplicate arrays before emitting via `onChange`
- Display title-cased labels, store/emit normalized values

**Section 5 — Worker count preview**
- Badge: "X workers can see this"
- Computed client-side using same logic as the DB function:
  - Fetch `personnel` rows with `country` for the business
  - Apply exclude, then visibility_mode check
  - Only includes workers with non-null/non-empty country for `same_country` check; `all` mode includes everyone (minus excluded)

---

## 4. Update `AddProjectDialog`

### State changes:
**Remove:**
- `visibilityAll` state
- `visibilityCountries` state
- `visibilityCities` state

**Add:**
- `projectCountry` (string, default `''`)
- `projectLocationLabel` (string, default `''`)
- `visibilityMode` (`'same_country' | 'all'`, default `'same_country'`)
- `includeCountries` (`string[]`, default `[]`)
- `excludeCountries` (`string[]`, default `[]`)

### Validation:
If `isPosted` is true and `projectCountry` is empty, show `toast.error('Please set a project location before posting')` and block submission.

### Build payload:
Pass new fields to `onProjectAdded(...)`, with normalization applied.

### Reset form:
Reset all five new state variables to their defaults.

### Pass new props to `ProjectVisibilityControls`:
```tsx
<ProjectVisibilityControls
  projectCountry={projectCountry}
  projectLocationLabel={projectLocationLabel}
  visibilityMode={visibilityMode}
  includeCountries={includeCountries}
  excludeCountries={excludeCountries}
  onProjectLocationChange={(country, label) => {
    setProjectCountry(country);
    setProjectLocationLabel(label);
  }}
  onChange={(data) => {
    setVisibilityMode(data.visibilityMode);
    setIncludeCountries(data.includeCountries);
    setExcludeCountries(data.excludeCountries);
  }}
/>
```

---

## 5. Update `EditProjectDialog`

Same state swap as `AddProjectDialog`.

Initialize from project:
- `projectCountry` ← `project.projectCountry || ''`
- `projectLocationLabel` ← `project.projectLocationLabel || ''`
- `visibilityMode` ← `project.visibilityMode || 'same_country'`
- `includeCountries` ← `project.includeCountries || []`
- `excludeCountries` ← `project.excludeCountries || []`

Same validation, normalization, and `ProjectVisibilityControls` prop pass.

---

## 6. Update `usePostedProjects`

Add to `PostedProject` interface:
- `projectLocationLabel?: string`
- `projectCountry?: string`

Map from DB in the loop:
- `projectLocationLabel: p.project_location_label || undefined`
- `projectCountry: p.project_country || undefined`

---

## 7. Update `PostedProjects` component

Replace `project.location` display with:
```tsx
{project.projectLocationLabel || (project.projectCountry ? titleCase(project.projectCountry) : null)}
```

---

## Files changed

| File | Change |
|---|---|
| New migration SQL | Drop old columns/constraint, add new, replace function |
| `src/hooks/useProjects.ts` | Replace visibility fields in types + CRUD |
| `src/hooks/usePostedProjects.ts` | Add `projectLocationLabel`, `projectCountry` |
| `src/components/ProjectVisibilityControls.tsx` | Full rewrite — new props + UI |
| `src/components/AddProjectDialog.tsx` | Replace visibility state + validation |
| `src/components/EditProjectDialog.tsx` | Replace visibility state + initialization |
| `src/components/PostedProjects.tsx` | Show `projectLocationLabel` |

## What does NOT change

- `project_applications` table, RLS policies, hooks
- Worker dashboard layout (already split)
- `GeoLocationInput` component (reused as-is via `onStructuredSelect`)
- Personnel `country`/`city` fields
- Invitation system
- All other dialogs, pages, edge functions
