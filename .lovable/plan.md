

## Hide Rejected Applications from Project Applications View

**Risk: GREEN** -- purely UI filtering change, no backend or data changes.

### What Changes

In `ProjectApplicationsList.tsx`, rejected applications will be filtered out of the displayed list so they no longer appear. The data still exists in the database -- it's just hidden from the admin's view.

### Technical Detail

**File: `src/components/ProjectApplicationsList.tsx`** (line 60)

Add a filter before mapping to exclude rejected applications:

```tsx
// Before
{applications.map(app => {

// After
{applications.filter(app => app.status !== 'rejected').map(app => {
```

Also update the empty-state check (line 42) to account for filtered results -- if all applications are rejected, show the "No applications yet" message. This will be handled by filtering early and checking the filtered array length instead.

One file, one filter addition.

