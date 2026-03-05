

## Batch A (trimmed): Two Quick Fixes

### #65 — Personnel hover in project view should match admin dashboard
**File:** `src/components/ProjectDetail.tsx` — line 397

Replace `transition-colors` with the hover effect from `PersonnelCard.tsx`:
```
hover:shadow-lg hover:-translate-y-0.5 hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all duration-200
```

### #112 — Scroll to top when opening project from worker profile
**File:** `src/components/WorkerProjectDetail.tsx`

Add `useEffect` on mount:
```ts
useEffect(() => { window.scrollTo(0, 0); }, []);
```

No schema changes. Pure UI — anchor optional.

