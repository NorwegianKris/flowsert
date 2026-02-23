

## Make Entire Row Clickable in Activation List

**Risk: GREEN** -- UI-only styling change.

### Change

**File: `src/components/ActivationOverview.tsx`**

Make the entire row (`div` with class `flex items-center gap-3 p-3 rounded-lg ...`) act as a clickable area that opens the profile preview sheet, while keeping the edit, delete, and toggle buttons functional via `stopPropagation`.

1. Add `cursor-pointer` to the outer row `div` and attach an `onClick` handler that sets `previewPerson` and opens the sheet.
2. The existing `e.stopPropagation()` calls on the edit button, delete button, and switch already prevent event bubbling, so those controls will continue to work independently.
3. The name `<button>` can remain styled with `hover:underline` for visual affordance, but the click now also works anywhere on the row.

### Technical Detail

On the row container (around line 217):

```
// Before
<div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">

// After
<div
  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer"
  onClick={() => { setPreviewPerson(person); setPreviewOpen(true); }}
>
```

No other files changed.

