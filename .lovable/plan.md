

## Fix AI Personnel Search: Wire Up extractConstraints and Role-Prioritise the 50-Cap

🔴 Edge function edit — anchor before publish.

### Problem

`extractConstraints()` (line 100) is defined but never called. The 50-candidate cap (lines 386-391) is role-blind — it sorts purely by `profileCompletionPercentage`, silently dropping role-relevant candidates before the AI ever scores them.

### Changes

**File:** `supabase/functions/suggest-project-personnel/index.ts`

**1. Call `extractConstraints` before the cap logic (after line 384)**

```typescript
const constraints = extractConstraints(prompt);
```

**2. Replace the role-blind cap (lines 386-391) with role-prioritised cap**

Replace:
```typescript
const MAX_CANDIDATES = 50;
const cappedPersonnel = filteredPersonnel.length > MAX_CANDIDATES
  ? [...filteredPersonnel].sort((a, b) => 
      (b.profileCompletionPercentage ?? 0) - (a.profileCompletionPercentage ?? 0)
    ).slice(0, MAX_CANDIDATES)
  : filteredPersonnel;
```

With:
```typescript
const MAX_CANDIDATES = 50;
let cappedPersonnel: PersonnelData[];

if (filteredPersonnel.length <= MAX_CANDIDATES) {
  cappedPersonnel = filteredPersonnel;
} else if (constraints.roles && constraints.roles.length > 0) {
  // Split into role-matched (Group A) and others (Group B)
  const extractedRoles = constraints.roles.map(r => r.toLowerCase());
  const groupA = filteredPersonnel.filter(p => {
    const title = (p.role || '').toLowerCase();
    return extractedRoles.some(r => title.includes(r));
  });
  const groupB = filteredPersonnel.filter(p => {
    const title = (p.role || '').toLowerCase();
    return !extractedRoles.some(r => title.includes(r));
  });

  if (groupA.length >= MAX_CANDIDATES) {
    // Too many role matches — take top 50 by profile completion
    cappedPersonnel = groupA
      .sort((a, b) => (b.profileCompletionPercentage ?? 0) - (a.profileCompletionPercentage ?? 0))
      .slice(0, MAX_CANDIDATES);
  } else {
    // All role matches + fill remaining from Group B by profile completion
    const remaining = MAX_CANDIDATES - groupA.length;
    const fillerB = groupB
      .sort((a, b) => (b.profileCompletionPercentage ?? 0) - (a.profileCompletionPercentage ?? 0))
      .slice(0, remaining);
    cappedPersonnel = [...groupA, ...fillerB];
  }
} else {
  // No role extracted — fall back to original profile-completion sort
  cappedPersonnel = [...filteredPersonnel]
    .sort((a, b) => (b.profileCompletionPercentage ?? 0) - (a.profileCompletionPercentage ?? 0))
    .slice(0, MAX_CANDIDATES);
}
```

**3. No other changes.** Location pre-filter and freelancer/employee toggle remain untouched.

### Files changed
- `supabase/functions/suggest-project-personnel/index.ts` — wire up `extractConstraints`, role-prioritise 50-cap

