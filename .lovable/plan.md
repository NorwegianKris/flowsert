

## Update Project Applications List: White Rows + Inline Accept/Decline Buttons

**Risk: GREEN** -- purely UI styling and layout, no DB/auth/RLS changes.

### Single file: `src/components/ProjectApplicationsList.tsx`

### Changes

**1. White background for application rows (line 68)**

Replace `bg-muted/50 hover:bg-muted` with `bg-white dark:bg-card border border-border hover:shadow-sm` to give each row a clean white card appearance.

**2. Add inline Accept / Decline buttons for pending applications (lines 81-89)**

After the Pending badge, add two small icon buttons:
- **Accept** (green): small `CheckCircle` button with green styling
- **Decline** (red): small `XCircle` button with red/destructive styling

These buttons call `updateApplicationStatus` directly from the row (no dialog needed), with `e.stopPropagation()` so the row click still opens the detail popup.

For accepted applications, only the "Accepted" badge shows (no buttons). The row remains clickable to open the detail dialog.

**3. Update handleStatusUpdate to work without dialog**

Add a new `handleInlineStatusUpdate` function that accepts the application ID and status directly, so it can be called from the row buttons without needing `selectedApp` to be set.

### Layout

```text
[ Avatar ]  Name          Date   [Pending badge] [✓] [✗]
            Role
```

For accepted rows:
```text
[ Avatar ]  Name          Date   [Accepted badge]
            Role
```

### Technical detail

```tsx
// Inline buttons for pending apps (with stopPropagation)
{app.status === 'pending' && (
  <>
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
      onClick={(e) => { e.stopPropagation(); handleInlineStatusUpdate(app.id, 'accepted'); }}
    >
      <CheckCircle className="h-4 w-4" />
    </Button>
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-destructive hover:bg-red-50 hover:text-red-700"
      onClick={(e) => { e.stopPropagation(); handleInlineStatusUpdate(app.id, 'rejected'); }}
    >
      <XCircle className="h-4 w-4" />
    </Button>
  </>
)}
```

