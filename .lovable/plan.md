

## Plan: Clickable Stat Cards + Applicant Count Fix

### 1. Clickable stat cards in `DashboardStats.tsx`

**Props change**: Add `onStatClick?: (status: 'valid' | 'expiring' | 'expired') => void` to `DashboardStatsProps`.

**Card rendering**: For the 3 status stat cards, add `onClick={() => onStatClick?.(status)}` and conditional hover classes: `cursor-pointer hover:shadow-md hover:border-primary/30 transition-all`. Add a small `ChevronRight` icon (muted, 4x4) on the far right of each clickable card. Employees/Freelancers card stays unchanged.

### 2. Wire click handler in `AdminDashboard.tsx`

Pass `onStatClick` to `<DashboardStats>`. The handler:
- Sets `activeTab` to `'personnel'`
- Sets `complianceStatusFilter` to the matching value (`'valid'`, `'expiring'`, `'expired'`)

```tsx
onStatClick={(status) => {
  setActiveTab('personnel');
  setComplianceStatusFilter(status);
}}
```

### 3. Fix applicant count in `ProjectsTab.tsx`

Replace the local `useState`/`useEffect` pattern in `ProjectCard` with a React Query hook so it can be invalidated.

- Add a `useQuery` call with key `['project-applicant-count', project.id]` that fetches the count from `project_applications` (same query, excluding rejected).
- In `useProjectApplications.ts`, after `updateApplicationStatus` succeeds, invalidate `['project-applicant-count']` via `queryClient.invalidateQueries`.

### Files changed
- `src/components/DashboardStats.tsx` — add click handlers, hover styles, chevron icon
- `src/pages/AdminDashboard.tsx` — pass `onStatClick` prop
- `src/components/ProjectsTab.tsx` — replace local state with React Query for applicant count
- `src/hooks/useProjectApplications.ts` — invalidate applicant count query on status update

