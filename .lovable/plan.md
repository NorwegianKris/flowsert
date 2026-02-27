

## Plan: Replace pre-filter with location-intent hard filter

Single file: `supabase/functions/suggest-project-personnel/index.ts`

### What changes

**Lines 227-247** — Replace the freelancer toggle filter and the `extractConstraints`-based hard filter (`countryConstraint` / `roleConstraint`) with:

1. `parseLocationIntent(query)` — parses city, country, or region from the prompt string
2. `locationMatches(personLocation, intent)` — checks if a person's location matches the parsed intent using alias maps
3. A combined pre-filter that applies both the freelancer/employee toggle and the location hard filter

The `extractConstraints` function (defined earlier in the file around lines 100-140) stays in place — it is no longer called in this block, but removing it is out of scope. The `hardFilteredPersonnel` variable is removed; the existing `filteredPersonnel` now carries both filters, and the downstream `cappedPersonnel` (line 249) will reference `filteredPersonnel` instead of `hardFilteredPersonnel`.

### Line 250 reference update

`hardFilteredPersonnel` → `filteredPersonnel` in the capping block (lines 249-254), since the intermediate variable is gone.

### Risk

- 🔴 Edge function logic change → anchor required per checklist Q2

