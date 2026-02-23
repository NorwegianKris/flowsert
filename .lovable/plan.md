

# Match Invite/Assign Toggle to Roles/Groups Style

## Risk: GREEN
Pure UI styling change in a single component. No database, RLS, auth, or edge function changes.

## Single file changed
`src/components/AddProjectDialog.tsx`

## What changes

### Replace the raw button pair (lines 1176-1199) with a ToggleGroup

The current Invite/Assign toggle uses two raw `<button>` elements with manual class switching. Replace with the same `ToggleGroup` + `ToggleGroupItem` pattern used in the Roles/Groups filter.

**Current style** (raw buttons with `bg-[hsl(var(--primary))]` / `bg-white` toggling):
```
<div class="border border-primary rounded overflow-hidden">
  <button class="bg-white text-primary ...">Invite</button>
  <button class="bg-primary text-white ...">Assign</button>
</div>
```

**New style** (matching Roles/Groups toggle):
```
<ToggleGroup
  type="single"
  value={selected ? mode : undefined}
  onValueChange={(val) => { if (val) setPersonnelMode(person.id, val as PersonnelMode); }}
  className="bg-primary p-0.5 rounded-md flex-shrink-0"
>
  <ToggleGroupItem
    value="invite"
    className="h-5 px-2 text-[10px] text-primary-foreground data-[state=on]:bg-primary-foreground data-[state=on]:text-primary"
  >
    Invite
  </ToggleGroupItem>
  <ToggleGroupItem
    value="assign"
    className="h-5 px-2 text-[10px] text-primary-foreground data-[state=on]:bg-primary-foreground data-[state=on]:text-primary"
  >
    Assign
  </ToggleGroupItem>
</ToggleGroup>
```

Key differences from the Roles/Groups toggle (kept intentionally smaller for row context):
- `p-0.5` instead of `p-1` (tighter padding -- fits in a row)
- `h-5 text-[10px]` instead of default height (compact for inline use)
- No icons (just text labels)

The wrapper `<div>` with the border is removed since `ToggleGroup` with `bg-primary rounded-md` provides the same purple container appearance.

### Add import
Add `ToggleGroup, ToggleGroupItem` from `@/components/ui/toggle-group` to the imports (if not already present).

### Behavior preserved
- Clicking Invite/Assign on an unselected person still selects them with that mode
- The `onClick stopPropagation` wrapper stays to prevent row checkbox toggling
- When no mode is selected (person not yet chosen), neither item appears active (both show as white text on purple background)

