

## Fix AI Personnel Search Accuracy — 3 Changes

🔴 Edge function edit — anchor before publish.

### 1. Fix role keyword extraction order (bug fix)

**File:** `supabase/functions/suggest-project-personnel/index.ts`, lines 131-148

The `roleKeywords` map iterates in insertion order. `'diver'` appears before `'dive supervisor'`, so "find dive supervisors" matches `'diver'` first and stops.

**Fix:** Sort the entries by descending key length before iterating:

```typescript
const roleKeywords: Record<string, string[]> = {
  'diver': ['Diver'],
  'dive supervisor': ['Dive Supervisor'],
  'supervisor': ['Dive Supervisor'],
  'rigger': ['Rigger'],
  'mechanic': ['Mechanic'],
  'project manager': ['Project Manager'],
  'project coordinator': ['Project Coordinator'],
  'coordinator': ['Project Coordinator'],
  'manager': ['Project Manager'],
};
let roles: string[] | null = null;
// Sort by descending key length so "dive supervisor" is checked before "diver"
const sortedRoleEntries = Object.entries(roleKeywords).sort((a, b) => b[0].length - a[0].length);
for (const [keyword, matchRoles] of sortedRoleEntries) {
  if (lower.includes(keyword)) {
    roles = matchRoles;
    break;
  }
}
```

### 2. Tighten role scoring in system prompt

**File:** `supabase/functions/suggest-project-personnel/index.ts`, lines 499-502

Replace the ROLE scoring block with:

```
ROLE:
  Exact title match → 100% of role points
  Same role family, different seniority (e.g. "Junior Diver" for "Diver") → 60% of role points
  Different role in same domain (e.g. "Diver" for "Dive Supervisor" query) → 20% of role points
  Unrelated role → 0

  CRITICAL: A Diver and a Dive Supervisor are DIFFERENT roles — one works underwater, the other manages dive operations. Scoring a Diver against a Dive Supervisor query should be 20% at most. Similarly, an Electrician and an Electrical Supervisor are different roles. Do not give high scores for partial word overlap — score based on whether the person can actually perform the queried role.
```

### 3. Raise frontend display threshold + suppress noise

**File:** `src/hooks/useSuggestPersonnel.ts`, line 154

Replace the current filter:
```typescript
result.suggestedPersonnel = result.suggestedPersonnel.filter(p => p.matchScore > 0);
```

With:
```typescript
// Raise minimum display threshold to 40%
result.suggestedPersonnel = result.suggestedPersonnel.filter(p => p.matchScore >= 40);
// If any result scores 90%+, suppress everything below 50%
const hasStrongMatch = result.suggestedPersonnel.some(p => p.matchScore >= 90);
if (hasStrongMatch) {
  result.suggestedPersonnel = result.suggestedPersonnel.filter(p => p.matchScore >= 50);
}
```

### Files changed
- `supabase/functions/suggest-project-personnel/index.ts` — role extraction sort + prompt tightening
- `src/hooks/useSuggestPersonnel.ts` — display threshold logic

