
# Add Purple Hover Border to Project Cards and Personnel Cards

**Risk: GREEN** -- purely UI styling, no database or backend changes.

## Changes

### 1. `src/components/ProjectsTab.tsx` (ProjectCard)

Update the `<Card>` className to add the lift effect and purple hover ring:

**Current:**
```
hover:shadow-md transition-shadow cursor-pointer
```

**New:**
```
hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20
```

### 2. `src/components/PersonnelCard.tsx`

Add `hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20` to the existing Card className (which already has the lift and shadow effects).

**Current (line 132):**
```
cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group relative
```

**New:**
```
cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 group relative
```

### 3. `src/components/RecentRegistrations.tsx`

The recent registrations cards (inside the collapsible) also show personnel -- add the same purple hover ring there for consistency.

**Current (line ~117):**
```
cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative
```

**New:**
```
cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 relative
```

## Summary

| File | Change |
|------|--------|
| `src/components/ProjectsTab.tsx` | Add lift effect + purple hover ring to ProjectCard |
| `src/components/PersonnelCard.tsx` | Add purple hover ring to existing card |
| `src/components/RecentRegistrations.tsx` | Add purple hover ring for consistency |
