

## Prompt Risk Assessment: 🟢 Anchor Optional
Purely UI styling change -- adding selection circles to list items.

---

## Overview
Add clickable radio-style selection circles to the Worker Groups right-side list, matching the pattern already used in the TypeMergingPane and IssuerMergingPane merged-types list.

---

## Change

**File:** `src/components/WorkerGroupMergingPane.tsx` (lines ~267-278)

Update the group list items to include a radio-circle indicator before the group name, matching the TypeMergingPane pattern:

- Wrap content in a `flex items-start gap-3` layout
- Add a `w-4 h-4 rounded-full border-2` circle div that fills purple when selected
- Show a Check icon inside the circle when selected
- Update the ring style to `ring-2 ring-primary ring-inset` (matching TypeMergingPane)
- Move the group name and member count badge inside the flex layout

**Before:**
```
<div class="flex items-center justify-between">
  <span>Offshore</span>
  <Badge>2 members</Badge>
</div>
```

**After:**
```
<div class="flex items-start gap-3">
  <div class="w-4 h-4 rounded-full border-2 ...">  <!-- purple circle -->
    {isSelected && <Check />}
  </div>
  <div class="flex-1 min-w-0">
    <div class="flex items-center justify-between">
      <span>Offshore</span>
      <Badge>2 members</Badge>
    </div>
  </div>
</div>
```

---

## Technical Details

- The `Check` icon is already imported in `WorkerGroupMergingPane.tsx`
- Selection circle classes: `w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center`, with `border-primary bg-primary` when selected and `border-muted-foreground/30` when not
- Ring highlight on selected row changes from `ring-1 ring-primary/30` to `ring-2 ring-primary ring-inset` for consistency with TypeMergingPane

