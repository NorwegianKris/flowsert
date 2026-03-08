

## Restructure Invitation Card Layout

**File:** `src/components/WorkerInvitations.tsx` (lines 85–127)

**What changes:**

Replace the current card inner structure (top row with name+buttons side-by-side, bottom row with date) with:

1. **Top row**: Icon + full-width name/location (no buttons competing, no `truncate`)
2. **Bottom row**: Date left, Decline/Accept buttons right (using `justify-between`)

Specifically, lines 85–127 become:

```tsx
<div
  key={invitation.id}
  onClick={() => setSelectedInvitation(invitation)}
  className="flex flex-col gap-2 p-3 rounded-lg bg-background border border-border/50 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
>
  {/* Top row: icon + full name/location */}
  <div className="flex items-start gap-3">
    <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
      <FolderOpen className="h-4 w-4 text-primary" />
    </div>
    <div className="flex flex-col min-w-0">
      <p className="font-medium text-sm">
        {invitation.projectName || 'Project Invitation'}
      </p>
      {invitation.projectLocation && (
        <p className="text-xs text-muted-foreground">
          {invitation.projectLocation}
        </p>
      )}
    </div>
  </div>
  {/* Bottom row: date left, buttons right */}
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>Invited {new Date(invitation.invitedAt).toLocaleDateString()}</span>
    </div>
    <div className="flex items-center gap-2">
      {/* Decline + Accept buttons — unchanged handlers/colors, size="sm" */}
    </div>
  </div>
</div>
```

**No changes to:** button handlers, colors, disabled logic, dialog, or any other file.

