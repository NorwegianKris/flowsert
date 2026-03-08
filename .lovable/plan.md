

## Fix: Show Project Name & Location in WorkerInvitations Card

### Change

**File:** `WorkerInvitations.tsx`, lines 91-93

Replace the single `<p>` with a `<div className="min-w-0">` containing two lines: project name and conditionally-rendered location.

```tsx
// Current (lines 91-93):
<p className="font-medium text-sm truncate">
  {invitation.projectName || 'Project Invitation'}
</p>

// New:
<div className="min-w-0">
  <p className="font-medium text-sm truncate">
    {invitation.projectName || 'Project Invitation'}
  </p>
  {invitation.projectLocation && (
    <p className="text-xs text-muted-foreground truncate">
      {invitation.projectLocation}
    </p>
  )}
</div>
```

No other changes. Layout structure, buttons, handlers, colours, and logic remain untouched.

### Risk
Single UI addition. No logic change. 🟢

