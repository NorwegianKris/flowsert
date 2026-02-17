

## Fix: Scroll to Top When Entering a Project

### Problem
When you click a project card, the page stays at whatever scroll position you were at (or jumps to newly rendered content at the bottom). This happens because the dashboard uses in-component state switching rather than URL-based routing, so the browser does not auto-scroll to top.

### Solution
Add a `window.scrollTo(0, 0)` call whenever a project is selected, so the page always starts at the top of the project detail view.

### Technical Details

**File: `src/pages/AdminDashboard.tsx`**

Wrap the `setSelectedProject` calls with a scroll-to-top side effect. Specifically:

1. Create a small helper or add a `useEffect` that watches `selectedProject` -- when it changes from `null` to a project, scroll the window to the top.

```typescript
useEffect(() => {
  if (selectedProject) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
}, [selectedProject]);
```

This single change (roughly 3 lines) will fix the scroll issue for all project detail entries without affecting any other behavior. The same pattern will also be applied for `selectedPersonnel` to keep things consistent.

