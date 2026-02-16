

# Fix Checkbox Double-Toggle Bug

## Problem
When clicking directly on the checkbox square, both the checkbox's `onCheckedChange` and the parent div's `onClick` fire, causing the toggle to run twice (check then immediately uncheck = no visible change). Clicking elsewhere on the card only fires the parent `onClick`, which works correctly.

## Fix
Remove `onCheckedChange` from the Checkbox components and add `pointer-events-none` so clicks pass through to the parent div. The checkbox becomes purely visual -- the parent div handles all click logic.

## Files to Change

### 1. `src/components/ExternalSharingDialog.tsx`
- **Line 427**: Remove `onCheckedChange` and add `pointer-events-none` class to the "Export Project Card" checkbox
- **Line 469**: Same fix for the "Export Personnel & Certificates" checkbox

### 2. `src/components/ShareProjectDialog.tsx`
- **Line 322**: Same fix for the "Export Project Card" checkbox
- **Line 345**: Same fix for the "Export Personnel & Certificates" checkbox

## Technical Detail

Before:
```tsx
<div onClick={() => toggleExport('projectCard')}>
  <Checkbox checked={...} onCheckedChange={() => toggleExport('projectCard')} />
</div>
```

After:
```tsx
<div onClick={() => toggleExport('projectCard')}>
  <Checkbox checked={...} className="pointer-events-none" />
</div>
```

This ensures clicking anywhere on the card -- including the checkbox square -- triggers exactly one toggle.

