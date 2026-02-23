

# Per-Person Invite/Assign Toggle + Info Hint

## Risk: GREEN
Pure UI change in a single component. No database, RLS, auth, or edge function changes.

## Single file changed
`src/components/AddProjectDialog.tsx`

## Changes

### 1. Remove global Mode section (lines 821-843)
Delete the entire `bg-primary/10` bar containing the ToggleGroup for "Mode: Invite | Assign".

### 2. Add info hint between FreelancerFilters and Search bar (after line 852)
Insert a small hint row with a lightbulb emoji:

```text
[lightbulb] Invite sends the person an invitation to accept or decline. Assign adds them directly to the project.
```

Styled as: `text-xs text-muted-foreground` with a subtle `bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5` container. The lightbulb is a plain emoji character.

### 3. Replace per-person mode button (lines 1203-1226) with always-visible toggle
Currently only shows a single button when selected. Replace with a two-button toggle group visible on every selectable row:

```
[Invite | Assign]
```

- Both buttons always visible, side by side, flush (shared border, outer corners rounded)
- **Active button**: `bg-white text-[#7c3aed] border-[#7c3aed] font-medium`
- **Inactive button**: `bg-[#7c3aed] text-white`
- Size: `h-6 text-[10px] px-2`
- Default mode when first selecting a person: `'invite'`

Clicking either button on an unselected person will both select them AND set their mode. On an already-selected person, it switches the mode.

### 4. New handler: `setPersonnelMode`
```typescript
const setPersonnelMode = (personnelId: string, mode: PersonnelMode) => {
  setPersonnelSelections(prev => {
    const existing = prev.find(s => s.id === personnelId);
    if (existing) {
      return prev.map(s => s.id === personnelId ? { ...s, mode } : s);
    }
    return [...prev, { id: personnelId, mode }];
  });
};
```

### 5. Update `togglePersonnel` default mode
Change line 280 from `mode: globalMode` to `mode: 'invite'` (since there is no global mode anymore).

### 6. Update `selectAllPersonnel` and `selectSuggestedPersonnel`
Replace `globalMode` references with `'invite'` as the default mode for bulk selections.

### 7. Optionally remove `globalMode` state and `handleGlobalModeChange`
These become unused after the global section is removed. Clean up to avoid dead code.

## Visual layout per personnel row

```text
[x] [Avatar] Name  Role  [badges...]  [Invite|Assign]
                                        ^^^^^^^^^^^^^^
                                        always visible
```

The toggle sits on the far right of each row. When a person is not yet selected and the user clicks "Invite" or "Assign", the person gets selected with that mode. The checkbox still works as before (defaults to invite mode).

