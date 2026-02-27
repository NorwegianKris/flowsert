

## Plan: Remove unused completion fields and filter zero-score results

### Change 1 — `src/hooks/useSuggestPersonnel.ts`

**Remove `calculateProfileCompletion` function** (lines 48-68) and its call (lines 92-93).

**Remove `profileCompletionPercentage` and `profileCompletionStatus`** from `PersonnelForAI` interface (lines 44-45) and from the returned object (lines 125-126).

### Change 2 — `src/hooks/useSuggestPersonnel.ts`

After line 162 (`const result = data as SuggestionResult;`), add:
```typescript
result.suggestedPersonnel = result.suggestedPersonnel.filter(p => p.matchScore > 0);
```

### Change 3 — `supabase/functions/suggest-project-personnel/index.ts`

After line 508 (`- confirmedCountry is authoritative...`), add:
```
- Never return a person with a matchScore of 0. If a person does not meet enough of the queried criteria to score above 0, exclude them from the response entirely. A returned result implies a meaningful match.
```

### Risk
- 🔴 Edge function prompt change → anchor required (Q2)

