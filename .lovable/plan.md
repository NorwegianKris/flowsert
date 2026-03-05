

## Add Hover Nudge to All Button Variants

Cosmetic change. 🟢

### What

The hover lift effect (`hover:shadow-md hover:-translate-y-0.5`) currently only exists on the `default` variant. Move the transition and hover-lift classes into the **base** cva string so every variant gets the nudge, except `link` and `ghost` which should stay flat.

### Changes — `src/components/ui/button.tsx`

1. **Base string (line 8)**: Add `transition-[background-color,box-shadow,transform] duration-200 hover:shadow-md hover:-translate-y-0.5` to the shared base classes.

2. **Per-variant cleanup**:
   - `default` (line 12): Remove the duplicated transition/hover-lift classes (keep only color/bg classes).
   - `ghost` (line 16): Add `hover:shadow-none hover:translate-y-0` to opt out of the nudge.
   - `link` (line 17): Add `hover:shadow-none hover:translate-y-0` to opt out of the nudge.

Result: `default`, `destructive`, `outline`, `secondary`, `active`, `completed` all get the nudge. `ghost` and `link` stay flat.

### File
- `src/components/ui/button.tsx`

