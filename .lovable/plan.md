

## Plan: Add candidate cap to suggest-project-personnel

Single file: `supabase/functions/suggest-project-personnel/index.ts`

### Change 1 — Insert cap after hardFilteredPersonnel (after line 247)

```ts
const MAX_CANDIDATES = 50;
const cappedPersonnel = hardFilteredPersonnel.length > MAX_CANDIDATES
  ? [...hardFilteredPersonnel].sort((a, b) => 
      (b.profileCompletionPercentage ?? 0) - (a.profileCompletionPercentage ?? 0)
    ).slice(0, MAX_CANDIDATES)
  : hardFilteredPersonnel;
```

### Change 2 — Line 250: `hardFilteredPersonnel` → `cappedPersonnel` in personnelSummary map

### Change 3 — Line 344: Update user prompt line to:
```
Available Personnel (${personnelSummary.length} shown, ${hardFilteredPersonnel.length} total matched):
```

### Change 4 — Line 462: `hardFilteredPersonnel` → `cappedPersonnel` in validPersonnelIds set

### Risk
- 🔴 Edge function logic change → anchor required per checklist Q2
- Requires redeployment

