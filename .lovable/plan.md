

## Fix Location Casing in Project View Personnel List

Cosmetic only. No schema changes. 🟢

### Problem
The `city` and `country` columns in the database are intentionally stored in lowercase for geographic matching. The project view personnel list displays these raw lowercase values. The PersonnelCard on the admin dashboard uses `personnel.location` which has proper casing (e.g., "Haugesund, Norway").

### Solution
Capitalize the displayed `city` and `country` values using a simple capitalize helper, or fall back to parsing `person.location` which already has proper casing.

### Files to Update

**`src/components/ProjectDetail.tsx`** (lines 422-424)
- Capitalize city/country display values using a helper like `word.charAt(0).toUpperCase() + word.slice(1)`
- Apply to both city and country spans

**`src/components/WorkerProjectDetail.tsx`** (same pattern, lines ~282-284)
- Identical fix

### Code Pattern
```tsx
// Helper or inline
const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

// Display
<span>{capitalize(person.city || '') || person.location?.split(',')[0]?.trim() || '—'}</span>
<span>{capitalize(person.country || '') || person.location?.split(',')[1]?.trim() || ''}</span>
```

