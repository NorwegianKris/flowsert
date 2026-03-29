

## Plan: Pass `allProjects` prop to `ProjectDetail` in AdminDashboard

### Root cause
`ProjectDetail` accepts an optional `allProjects` prop and uses it to find siblings via `shiftGroupId`. However, `AdminDashboard.tsx` (line 514-528) never passes this prop — so `siblings` is always `[]` and the shift selector tab bar never renders.

### Fix

**File: `src/pages/AdminDashboard.tsx` (line ~514-528)**

Add `allProjects={projects}` to the `<ProjectDetail>` call:

```tsx
<ProjectDetail
  project={selectedProject}
  personnel={personnel}
  allProjects={projects}          // ← add this line
  onBack={() => { ... }}
  onUpdateProject={handleUpdateProject}
  onPersonnelClick={...}
  businessName={business?.name}
/>
```

The `projects` variable is already available from the `useProjects()` hook (line 146).

### No other changes needed
The `ProjectDetail` component already has all the sibling/shift logic — it just needs the data.

### Risk
Q5 — single prop addition, no backend or permission changes.

