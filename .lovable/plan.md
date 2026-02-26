

## Plan: Add deterministic pre-filter to suggest-project-personnel

Single file change: `supabase/functions/suggest-project-personnel/index.ts`

### Change 1 — Add `extractConstraints` function (before line 100, after `logUsage`)

Insert the full `extractConstraints` function as specified by the user, returning `{ country, roles }`.

### Change 2 — Add hard filtering after employment type filter (after line 181)

```ts
const { country: countryConstraint, roles: roleConstraint } = extractConstraints(prompt);

const hardFilteredPersonnel = filteredPersonnel.filter((p: PersonnelData) => {
  if (countryConstraint && p.country?.toLowerCase().trim() !== countryConstraint) {
    return false;
  }
  if (roleConstraint && !roleConstraint.some(r => 
    p.role?.toLowerCase().trim() === r.toLowerCase()
  )) {
    return false;
  }
  return true;
});
```

### Change 3 — Replace `filteredPersonnel` → `hardFilteredPersonnel` in two places

- **Line 184**: `personnelSummary` map uses `hardFilteredPersonnel`
- **Line 405**: `validPersonnelIds` set uses `hardFilteredPersonnel`

### Change 4 — Update system prompt geographic + employment sections (lines 229–266)

Replace the geographic location matching and employment type matching blocks with a streamlined message:

```
IMPORTANT - Pre-filtered Candidates:
You will receive a pre-filtered list of candidates who already meet location and role constraints extracted from the query. Your job is to rank them by quality of match — certificates, experience, profile completeness, and any other soft criteria in the query. Do not exclude candidates based on country or role — that filtering has already been done deterministically.
```

Keep all other prompt sections (profile completion, nationality, certificates, bio, department, strict vs flexible) unchanged.

### Risk
- 🔴 Edge function prompt + logic change → anchor required per checklist Q2
- Requires redeployment of `suggest-project-personnel`

